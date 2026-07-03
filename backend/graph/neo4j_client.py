import json
import logging
import os
from typing import List

from neo4j import GraphDatabase

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


class Neo4jClient:
    def __init__(self):
        self.uri = os.getenv("NEO4J_URI")
        self.username = os.getenv("NEO4J_USERNAME", "neo4j")
        self.password = os.getenv("NEO4J_PASSWORD")
        self.driver = None
        self.connected = False

        if self.uri and self.username and self.password:
            try:
                self.driver = GraphDatabase.driver(self.uri, auth=(self.username, self.password))
                self.driver.verify_connectivity()
                self.connected = True
                logger.info("Connected to Neo4j AuraDB.")
            except Exception as exc:
                logger.warning("Neo4j AuraDB connection failed; using offline graph mode: %s", exc)
        else:
            logger.info("Neo4j environment variables are incomplete; using offline graph mode.")

    def close(self):
        if self.driver:
            self.driver.close()

    def clear_session(self, session_id: str):
        if not self.connected or not self.driver:
            return
        try:
            with self.driver.session() as session:
                session.run("MATCH (n:Rule {session_id: $session_id}) DETACH DELETE n", session_id=session_id)
        except Exception as exc:
            logger.error("Neo4j clear_session failed: %s", exc)

    def write_rules(self, rules: List[Rule], session_id: str):
        if not self.connected or not self.driver:
            return
        try:
            with self.driver.session() as session:
                for rule in rules:
                    session.run(
                        """
                        MERGE (r:Rule {id: $id, session_id: $session_id})
                        SET r.effect = $effect,
                            r.actions = $actions,
                            r.resources = $resources,
                            r.principals = $principals,
                            r.conditions = $conditions,
                            r.severity = $severity,
                            r.centrality_score = $centrality_score,
                            r.source_file = $source_file,
                            r.namespace = $namespace,
                            r.role_type = $role_type,
                            r.role_name = $role_name
                        """,
                        id=rule.id,
                        session_id=session_id,
                        effect=rule.effect,
                        actions=rule.actions,
                        resources=rule.resources,
                        principals=rule.principals,
                        conditions=json.dumps(rule.conditions),
                        severity=rule.severity,
                        centrality_score=rule.centrality_score,
                        source_file=rule.source_file,
                        namespace=rule.namespace,
                        role_type=rule.role_type,
                        role_name=rule.role_name,
                    )
        except Exception as exc:
            logger.error("Neo4j write_rules failed: %s", exc)

    def write_edge(self, edge: Edge, session_id: str):
        if not self.connected or not self.driver:
            return
        edge_type = edge.type if edge.type in ALLOWED_EDGE_TYPES else "CONFLICTS_WITH"
        try:
            query = f"""
                MATCH (a:Rule {{id: $source, session_id: $session_id}})
                MATCH (b:Rule {{id: $target, session_id: $session_id}})
                MERGE (a)-[r:{edge_type} {{session_id: $session_id, vulnerability_id: $vulnerability_id}}]->(b)
                SET r.severity = $severity
            """
            with self.driver.session() as session:
                session.run(
                    query,
                    source=edge.source,
                    target=edge.target,
                    session_id=session_id,
                    vulnerability_id=edge.vulnerability_id,
                    severity=edge.severity,
                )
        except Exception as exc:
            logger.error("Neo4j write_edge failed: %s", exc)

    def write_edges(self, edges: List[Edge], session_id: str):
        if not self.connected or not self.driver:
            return
        for edge in edges:
            self.write_edge(edge, session_id)

    def find_critical_paths(self, session_id: str):
        if not self.connected or not self.driver:
            return []
        try:
            with self.driver.session() as session:
                result = session.run(
                    """
                    MATCH path = (a:Rule {session_id: $session_id})
                      -[:CONFLICTS_WITH|ESCALATES_TO|BYPASSES|ASSUMES*1..5]->
                      (b:Rule {session_id: $session_id})
                    WHERE length(path) > 1
                    RETURN length(path) AS depth
                    ORDER BY depth DESC
                    LIMIT 5
                    """,
                    session_id=session_id,
                )
                return result.data()
        except Exception as exc:
            logger.error("Neo4j critical path query failed: %s", exc)
            return []
