from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class Rule(BaseModel):
    id: str
    effect: str = "Allow"
    actions: List[str] = Field(default_factory=list)
    resources: List[str] = Field(default_factory=list)
    principals: List[str] = Field(default_factory=list)
    conditions: Dict[str, Any] = Field(default_factory=dict)
    severity: str = "SAFE"
    centrality_score: float = 0.0
    source_file: Optional[str] = None

    # Kubernetes RBAC metadata
    verbs: List[str] = Field(default_factory=list)
    api_groups: List[str] = Field(default_factory=list)
    namespace: Optional[str] = None
    role_type: Optional[str] = None
    role_name: Optional[str] = None
    binding_kind: Optional[str] = None
    binding_name: Optional[str] = None

    # AWS role/trust metadata
    owner_account: Optional[str] = None

    raw: Dict[str, Any] = Field(default_factory=dict)


class Edge(BaseModel):
    source: str
    target: str
    type: str
    severity: str = "SAFE"
    vulnerability_id: Optional[str] = None


class Vulnerability(BaseModel):
    id: str
    severity: str
    type: str
    code: str
    title: str
    rule_a: str
    rule_b: Optional[str] = None
    affected_rules: List[str] = Field(default_factory=list)
    actions: List[str] = Field(default_factory=list)
    resources: List[str] = Field(default_factory=list)
    effect_a: Optional[str] = None
    effect_b: Optional[str] = None
    edge_type: str

    # Agent 1: Vulnerability Analyst
    danger_summary: Optional[str] = None
    attack_scenario: Optional[str] = None
    exploitability_score: Optional[int] = None
    attacker_capability_required: Optional[str] = None

    # Agent 2: Fix Engineer
    fix_description: Optional[str] = None
    fixed_policy_block: Optional[str] = None
    what_changed: Optional[str] = None
    confidence: Optional[str] = None
    principle_applied: Optional[str] = None


Conflict = Vulnerability


class AnalysisResult(BaseModel):
    rules: List[Rule]
    edges: List[Edge]
    conflicts: List[Vulnerability]
    most_dangerous_rule: Optional[str] = None

    @property
    def vulnerabilities(self) -> List[Vulnerability]:
        return self.conflicts
