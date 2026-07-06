import asyncio
import json
import logging
import os
import uuid
from datetime import date, datetime
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
        self.uri = os.getenv("NEO4J_URI") or "neo4j+s://a8e8e1ba.databases.neo4j.io"
        self.username = os.getenv("NEO4J_USERNAME") or "a8e8e1ba"
        self.password = os.getenv("NEO4J_PASSWORD") or "gFiaIt6kAEvMAAiDWSmU6GpqktdTPL1N79hYQuwYhwg"
        self.driver = None
        self.connected = False

        if self.uri and self.username and self.password:
            try:
                self.driver = GraphDatabase.driver(
                    self.uri, 
                    auth=(self.username, self.password),
                    connection_timeout=5.0,
                    max_connection_lifetime=60.0
                )
            except Exception as exc:
                logger.warning("Neo4j driver creation failed; using offline graph mode: %s", exc)
        else:
            logger.info("Neo4j environment variables are incomplete; using offline graph mode.")

    async def verify_connection_async(self):
        if not self.driver:
            return False
        try:
            await asyncio.to_thread(self.driver.verify_connectivity)
            self.connected = True
            await asyncio.to_thread(self.ensure_constraints)
            logger.info("Connected to Neo4j AuraDB asynchronously.")
            return True
        except Exception as exc:
            self.connected = False
            logger.warning("Neo4j AuraDB connection verification failed: %s", exc)
            return False

    def close(self):
        if self.driver:
            self.driver.close()

    def ensure_constraints(self):
        if not self.driver:
            return
        try:
            with self.driver.session() as session:
                session.run(
                    """
                    CREATE CONSTRAINT user_email_unique
                    IF NOT EXISTS FOR (u:User) REQUIRE u.email IS UNIQUE
                    """
                )
                session.run(
                    """
                    CREATE CONSTRAINT scan_session_id_unique
                    IF NOT EXISTS FOR (s:ScanSession) REQUIRE s.session_id IS UNIQUE
                    """
                )
        except Exception as exc:
            logger.error("Neo4j constraint setup failed: %s", exc)

    def clear_session(self, session_id: str):
        if not self.driver:
            return
        try:
            with self.driver.session() as session:
                session.run("MATCH (n:Rule {session_id: $session_id}) DETACH DELETE n", session_id=session_id)
        except Exception as exc:
            logger.error("Neo4j clear_session failed: %s", exc)

    def write_rules(self, rules: List[Rule], session_id: str):
        if not self.driver:
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
        if not self.driver:
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
        if not self.driver:
            return
        for edge in edges:
            self.write_edge(edge, session_id)

    def find_critical_paths(self, session_id: str):
        if not self.driver:
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

    async def create_user(self, user: dict) -> dict:
        if not self.driver:
            raise RuntimeError("Neo4j is not connected.")
        user_id = str(uuid.uuid4())
        jwt_secret = str(uuid.uuid4())
        today = date.today().isoformat()
        now = datetime.now().isoformat()
        with self.driver.session() as session:
            result = session.run(
                """
                CREATE (u:User {
                  id: $id,
                  email: $email,
                  name: $name,
                  password_hash: $password_hash,
                  tier: 'free',
                  scans_today: 0,
                  last_scan_date: $today,
                  created_at: $now,
                  jwt_secret: $jwt_secret,
                  stellar_public_key: $stellar_public_key,
                  stellar_secret_key: $stellar_secret_key,
                  credits_balance: $credits_balance,
                  credits_reset_date: $today
                })
                RETURN u
                """,
                id=user_id,
                email=user["email"],
                name=user["name"],
                password_hash=user["password_hash"],
                today=today,
                now=now,
                jwt_secret=jwt_secret,
                stellar_public_key=user.get("stellar_public_key", ""),
                stellar_secret_key=user.get("stellar_secret_key", ""),
                credits_balance=user.get("credits_balance", 0),
            )
            record = result.single()
            return dict(record["u"])

    async def get_user_by_email(self, email: str):
        if not self.driver:
            return None
        with self.driver.session() as session:
            result = session.run(
                "MATCH (u:User {email: $email}) RETURN u",
                email=email,
            )
            record = result.single()
            return dict(record["u"]) if record else None

    async def get_user_by_id(self, user_id: str):
        if not self.driver:
            return None
        with self.driver.session() as session:
            result = session.run(
                "MATCH (u:User {id: $id}) RETURN u",
                id=user_id,
            )
            record = result.single()
            return dict(record["u"]) if record else None

    async def increment_scan_count(self, user_id: str):
        if not self.driver:
            return
        today = date.today().isoformat()
        with self.driver.session() as session:
            session.run(
                """
                MATCH (u:User {id: $id})
                SET u.scans_today =
                  CASE
                    WHEN u.last_scan_date = $today
                    THEN coalesce(u.scans_today, 0) + 1
                    ELSE 1
                  END,
                  u.last_scan_date = $today
                """,
                id=user_id,
                today=today,
            )

    async def get_user_scan_history(self, user_id: str, limit: int = 50):
        if not self.driver:
            return []
        with self.driver.session() as session:
            result = session.run(
                """
                MATCH (u:User {id: $id})-[:HAS_SESSION]->(s:ScanSession)
                RETURN s
                ORDER BY s.scanned_at DESC
                LIMIT $limit
                """,
                id=user_id,
                limit=limit,
            )
            records = result.data()
            return [dict(r["s"]) for r in records]

    async def upsert_scan_session(
        self,
        session_id: str,
        fmt: str,
        stats: dict,
        policy_text: str,
        user_id: str | None = None,
    ):
        if not self.driver:
            return
        with self.driver.session() as session:
            session.run(
                """
                MERGE (s:ScanSession {session_id: $session_id})
                SET s.format = $format,
                    s.user_id = $user_id,
                    s.scanned_at = $scanned_at,
                    s.total_rules = $total_rules,
                    s.critical_count = $critical_count,
                    s.warning_count = $warning_count,
                    s.risk_score = $risk_score,
                    s.risk_label = $risk_label,
                    s.executive_summary = $executive_summary,
                    s.policy_preview = $policy_preview
                """,
                session_id=session_id,
                format=fmt,
                user_id=user_id,
                scanned_at=datetime.now().isoformat(),
                total_rules=stats.get("total_rules", 0),
                critical_count=stats.get("critical_count", 0),
                warning_count=stats.get("warning_count", 0),
                risk_score=stats.get("risk_score", 0),
                risk_label=stats.get("risk_label", "LOW"),
                executive_summary=stats.get("executive_summary", ""),
                policy_preview=policy_text[:200],
            )

    async def link_session_to_user(self, user_id: str, session_id: str):
        if not self.driver:
            return
        with self.driver.session() as session:
            session.run(
                """
                MATCH (u:User {id: $uid})
                MATCH (s:ScanSession {session_id: $sid})
                SET s.user_id = $uid
                MERGE (u)-[:HAS_SESSION]->(s)
                """,
                uid=user_id,
                sid=session_id,
            )

    async def update_user_tier(self, user_id: str, tier: str):
        if tier not in {"free", "pro", "team"}:
            raise ValueError("Invalid tier.")
        if not self.driver:
            return
        with self.driver.session() as session:
            session.run(
                """
                MATCH (u:User {id: $id})
                SET u.tier = $tier
                """,
                id=user_id,
                tier=tier,
            )

    async def reset_user_credits(self, user_id: str, credits: int, today: str):
        if not self.driver:
            return
        with self.driver.session() as session:
            session.run(
                """
                MATCH (u:User {id: $id})
                SET u.credits_balance = $credits,
                    u.credits_reset_date = $today
                """,
                id=user_id,
                credits=credits,
                today=today,
            )

    async def update_credits(self, user_id: str, credits: int):
        if not self.driver:
            return
        with self.driver.session() as session:
            session.run(
                """
                MATCH (u:User {id: $id})
                SET u.credits_balance = $credits
                """,
                id=user_id,
                credits=credits,
            )

    async def update_user_profile(self, user_id: str, name: str):
        if not self.driver:
            return
        with self.driver.session() as session:
            session.run(
                """
                MATCH (u:User {id: $id})
                SET u.name = $name
                """,
                id=user_id,
                name=name,
            )

    async def update_user_password(self, user_id: str, password_hash: str):
        if not self.driver:
            return
        with self.driver.session() as session:
            session.run(
                """
                MATCH (u:User {id: $id})
                SET u.password_hash = $password_hash
                """,
                id=user_id,
                password_hash=password_hash,
            )

    async def delete_user(self, user_id: str):
        if not self.driver:
            return
        with self.driver.session() as session:
            session.run(
                """
                MATCH (u:User {id: $id})
                DETACH DELETE u
                """,
                id=user_id,
            )

    async def update_notifications(self, user_id: str, prefs_json: str):
        if not self.driver:
            return
        with self.driver.session() as session:
            session.run(
                """
                MATCH (u:User {id: $id})
                SET u.notification_preferences = $prefs
                """,
                id=user_id,
                prefs=prefs_json,
            )

    async def save_workflow_state(
        self, session_id: str, step_name: str, status: str, output: dict, duration_ms: int
    ):
        if not self.driver:
            return
        try:
            with self.driver.session() as session:
                session.run(
                    """
                    MERGE (w:WorkflowState {session_id: $session_id, step_name: $step_name})
                    SET w.status = $status,
                        w.output = $output,
                        w.duration_ms = $duration_ms,
                        w.updated_at = $updated_at
                    """,
                    session_id=session_id,
                    step_name=step_name,
                    status=status,
                    output=json.dumps(output),
                    duration_ms=duration_ms,
                    updated_at=datetime.now().isoformat(),
                )
        except Exception as exc:
            logger.error("Neo4j save_workflow_state failed: %s", exc)

    async def get_workflow_state(self, session_id: str) -> dict:
        if not self.driver:
            return {}
        try:
            with self.driver.session() as session:
                result = session.run(
                    """
                    MATCH (w:WorkflowState {session_id: $session_id})
                    RETURN w.step_name AS step_name, w.status AS status, w.output AS output, w.duration_ms AS duration_ms
                    """,
                    session_id=session_id,
                )
                records = result.data()
                state = {}
                for record in records:
                    try:
                        state[record["step_name"]] = {
                            "status": record["status"],
                            "output": json.loads(record["output"]) if record["output"] else {},
                            "duration_ms": record["duration_ms"],
                        }
                    except json.JSONDecodeError:
                        state[record["step_name"]] = {
                            "status": record["status"],
                            "output": {},
                            "duration_ms": record["duration_ms"],
                        }
                return state
        except Exception as exc:
            logger.error("Neo4j get_workflow_state failed: %s", exc)
            return {}

    async def get_step_output(self, session_id: str, step_name: str) -> dict:
        if not self.driver:
            return {}
        try:
            with self.driver.session() as session:
                result = session.run(
                    """
                    MATCH (w:WorkflowState {session_id: $session_id, step_name: $step_name})
                    RETURN w.output AS output
                    """,
                    session_id=session_id,
                    step_name=step_name,
                )
                record = result.single()
                if record and record["output"]:
                    try:
                        return json.loads(record["output"])
                    except json.JSONDecodeError:
                        return {}
                return {}
        except Exception as exc:
            logger.error("Neo4j get_step_output failed: %s", exc)
            return {}
