import json
import logging
import os
from typing import Dict, List

from neo4j import AsyncGraphDatabase

from backend.graph.models import Edge, Rule


logger = logging.getLogger("vektra.neo4j")

ALLOWED_EDGE_TYPES = {
    "CONFLICTS_WITH",
    "ESCALATES_TO",
    "BYPASSES",
    "SHADOWS",
    "EXPOSES",
    "GRANTS_ADMIN",
    "ASSUMES",
    "REDUNDANT_WITH",
    "INHERITS_FROM",
}

PLACEHOLDER_MARKERS = ("your-", "xxxxxxxx", "example", "placeholder", "-here")


def is_usable_setting(value: str | None) -> bool:
    cleaned = (value or "").strip()
    if not cleaned:
        return False
    lowered = cleaned.lower()
    return not any(marker in lowered for marker in PLACEHOLDER_MARKERS)


class Neo4jClient:
    def __init__(self):
        self.uri = os.getenv("NEO4J_URI")
        self.username = os.getenv("NEO4J_USERNAME", "neo4j")
        self.password = os.getenv("NEO4J_PASSWORD")
        self.driver = None
        self.connected = False

    async def connect(self) -> bool:
        if self.connected and self.driver:
            return True
        if not all(
            [
                is_usable_setting(self.uri),
                is_usable_setting(self.username),
                is_usable_setting(self.password),
            ]
        ):
            self.connected = False
            return False

        try:
            self.driver = AsyncGraphDatabase.driver(self.uri, auth=(self.username, self.password))
            await self.driver.verify_connectivity()
            self.connected = True
            logger.info("Connected to Neo4j AuraDB.")
            return True
        except Exception as exc:
            logger.warning("Neo4j AuraDB connection failed; using offline graph mode: %s", exc)
            if self.driver:
                await self.driver.close()
            self.driver = None
            self.connected = False
            return False

    async def close(self):
        if self.driver:
            await self.driver.close()
        self.driver = None
        self.connected = False

    async def ping(self) -> bool:
        if not await self.connect():
            return False
        try:
            await self.driver.verify_connectivity()
            self.connected = True
            return True
        except Exception as exc:
            logger.warning("Neo4j ping failed: %s", exc)
            self.connected = False
            return False

    async def clear_session(self, session_id: str):
        if not await self.connect():
            return
        try:
            async with self.driver.session() as session:
                result = await session.run(
                    "MATCH (n:Rule {session_id: $session_id}) DETACH DELETE n",
                    session_id=session_id,
                )
                await result.consume()
        except Exception as exc:
            logger.error("Neo4j clear_session failed: %s", exc)

    def _rule_payload(self, rule: Rule, session_id: str) -> Dict:
        return {
            "id": rule.id,
            "session_id": session_id,
            "effect": rule.effect,
            "actions": rule.actions,
            "resources": rule.resources,
            "principals": rule.principals,
            "conditions": json.dumps(rule.conditions or {}),
            "raw": json.dumps(rule.raw or {}),
            "severity": rule.severity,
            "centrality_score": rule.centrality_score,
            "source_file": rule.source_file,
            "namespace": rule.namespace,
            "role_type": rule.role_type,
            "role_name": rule.role_name,
            "owner_account": rule.owner_account,
            "binding_kind": rule.binding_kind,
        }

    async def write_rules(self, rules: List[Rule], session_id: str):
        if not rules or not await self.connect():
            return
        payload = [self._rule_payload(rule, session_id) for rule in rules]
        try:
            async with self.driver.session() as session:
                result = await session.run(
                    """
                    UNWIND $rules AS rule
                    MERGE (r:Rule {id: rule.id, session_id: rule.session_id})
                    SET r.effect = rule.effect,
                        r.actions = rule.actions,
                        r.resources = rule.resources,
                        r.principals = rule.principals,
                        r.conditions = rule.conditions,
                        r.raw = rule.raw,
                        r.severity = rule.severity,
                        r.centrality_score = rule.centrality_score,
                        r.source_file = rule.source_file,
                        r.namespace = rule.namespace,
                        r.role_type = rule.role_type,
                        r.role_name = rule.role_name,
                        r.owner_account = rule.owner_account,
                        r.binding_kind = rule.binding_kind
                    """,
                    rules=payload,
                )
                await result.consume()
        except Exception as exc:
            logger.error("Neo4j write_rules failed: %s", exc)

    async def write_vulnerability_edge(
        self,
        rule_a: str,
        rule_b: str,
        edge_type: str,
        severity: str,
        vuln_id: str,
        session_id: str,
    ):
        if not await self.connect():
            return
        safe_type = edge_type if edge_type in ALLOWED_EDGE_TYPES else "CONFLICTS_WITH"
        try:
            query = f"""
                MATCH (a:Rule {{id: $source, session_id: $session_id}})
                MATCH (b:Rule {{id: $target, session_id: $session_id}})
                MERGE (a)-[r:{safe_type} {{session_id: $session_id, vulnerability_id: $vulnerability_id}}]->(b)
                SET r.severity = $severity
            """
            async with self.driver.session() as session:
                result = await session.run(
                    query,
                    source=rule_a,
                    target=rule_b,
                    session_id=session_id,
                    vulnerability_id=vuln_id,
                    severity=severity,
                )
                await result.consume()
        except Exception as exc:
            logger.error("Neo4j write_vulnerability_edge failed: %s", exc)

    async def write_edge(self, edge: Edge, session_id: str):
        await self.write_vulnerability_edge(
            edge.source,
            edge.target,
            edge.type,
            edge.severity,
            edge.vulnerability_id,
            session_id,
        )

    async def write_edges(self, edges: List[Edge], session_id: str):
        if not edges or not await self.connect():
            return
        for edge in edges:
            await self.write_edge(edge, session_id)

    async def find_critical_paths(self, session_id: str):
        if not await self.connect():
            return []
        try:
            async with self.driver.session() as session:
                result = await session.run(
                    """
                    MATCH path = (a:Rule {session_id: $session_id})
                      -[:CONFLICTS_WITH|ESCALATES_TO|BYPASSES|ASSUMES*1..5]->
                      (b:Rule {session_id: $session_id})
                    WHERE length(path) > 1
                    RETURN [node IN nodes(path) | node.id] AS rules,
                           [rel IN relationships(path) | type(rel)] AS relationships,
                           length(path) AS depth
                    ORDER BY depth DESC
                    LIMIT 5
                    """,
                    session_id=session_id,
                )
                return await result.data()
        except Exception as exc:
            logger.error("Neo4j critical path query failed: %s", exc)
            return []
