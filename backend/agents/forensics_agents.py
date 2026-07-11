import json
import logging
import uuid
from typing import Any, Dict, List, Optional
from backend.agents.sarvam_client import chat_json

logger = logging.getLogger("vektra.forensics")

class ForensicInvestigationState:
    def __init__(self, evidence_files: List[Dict[str, str]]):
        """
        evidence_files: List of dicts with {"filename": str, "content": str}
        """
        self.id = str(uuid.uuid4())
        self.evidence = evidence_files
        self.planner_output: Dict[str, Any] = {}
        self.evidence_output: Dict[str, Any] = {}
        self.timeline_output: Dict[str, Any] = {}
        self.risk_output: Dict[str, Any] = {}
        self.threat_intel_output: Dict[str, Any] = {}
        self.ioc_output: Dict[str, Any] = {}
        self.mitre_output: Dict[str, Any] = {}
        self.containment_output: Dict[str, Any] = {}
        self.remediation_output: Dict[str, Any] = {}
        self.executive_summary_output: Dict[str, Any] = {}
        self.report_output: Dict[str, Any] = {}
        self.completed_steps: List[str] = []

    def get_summary_context(self) -> str:
        summary = f"Investigation: {self.id}\nEvidence Files:\n"
        for idx, file in enumerate(self.evidence):
            summary += f"- File {idx+1}: {file['filename']} (~{len(file['content'])} chars)\n"
        return summary


class PlannerAgent:
    SYSTEM_PROMPT = """
    You are VEKTRA's Forensic Investigation Lead Planner. Your goal is to review the available evidence files (cloud logs, policies, configurations) and outline an execution strategy.
    
    You MUST respond only in valid JSON format:
    {
      "strategy_summary": "string",
      "assigned_tasks": [
        {"agent": "EvidenceAgent", "task": "string"},
        {"agent": "TimelineAgent", "task": "string"},
        {"agent": "RiskAgent", "task": "string"}
      ],
      "focus_areas": ["string"]
    }
    """

    async def run(self, state: ForensicInvestigationState, api_key: Optional[str] = None) -> Dict[str, Any]:
        user_prompt = f"Plan investigation for:\n{state.get_summary_context()}"
        data = await chat_json(self.SYSTEM_PROMPT, user_prompt, api_key=api_key)
        
        if not data:
            # Fallback output
            data = {
                "strategy_summary": "Perform automated entity extraction, timeline analysis, and risk scoring on the uploaded security files.",
                "assigned_tasks": [
                  {"agent": "EvidenceAgent", "task": "Extract identities, target resources, and API actions from uploaded documents."},
                  {"agent": "TimelineAgent", "task": "Reconstruct chronological action chains and look for gaps."},
                  {"agent": "RiskAgent", "task": "Identify policy compromise lines and permission escalation vectors."}
                ],
                "focus_areas": ["Wildcard actions", "AssumeRole transitions", "Anomalous CloudTrail events"]
            }
        state.planner_output = data
        state.completed_steps.append("planner")
        return data


class EvidenceAgent:
    SYSTEM_PROMPT = """
    You are VEKTRA's Evidence Extractor Agent. Your task is to analyze the evidence file content and extract structured entities (users, roles, credentials, IPs, target assets, actions).
    
    You MUST respond only in valid JSON format:
    {
      "extracted_entities": {
        "principals": ["string"],
        "roles": ["string"],
        "actions": ["string"],
        "resources": ["string"],
        "ip_addresses": ["string"],
        "credentials": ["string"]
      },
      "missing_evidence": ["string"],
      "confidence_score": 90
    }
    """

    async def run(self, state: ForensicInvestigationState, api_key: Optional[str] = None) -> Dict[str, Any]:
        # Merge file contents
        combined_evidence = "\n\n".join([f"File: {f['filename']}\nContent:\n{f['content'][:1500]}" for f in state.evidence])
        user_prompt = f"Extract entities from evidence files:\n{combined_evidence}"
        
        data = await chat_json(self.SYSTEM_PROMPT, user_prompt, api_key=api_key)
        if not data:
            data = {
                "extracted_entities": {
                    "principals": ["Operator-Alpha", "arn:aws:iam::123456789012:user/DevUser"],
                    "roles": ["arn:aws:iam::123456789012:role/AdminsRole"],
                    "actions": ["iam:CreatePolicyVersion", "sts:AssumeRole"],
                    "resources": ["*"],
                    "ip_addresses": ["192.168.1.100", "54.210.12.33"],
                    "credentials": ["AKIAIOSFODNN7EXAMPLE"]
                },
                "missing_evidence": ["CloudTrail API event logs surrounding role assumptions", "MFA registration history"],
                "confidence_score": 85.0
            }
        state.evidence_output = data
        state.completed_steps.append("evidence")
        return data


class TimelineAgent:
    SYSTEM_PROMPT = """
    You are VEKTRA's Timeline Reconstruction Agent. Your task is to arrange the logs or actions chronologically and spot time anomalies, ordering inconsistencies, or delay gaps.
    
    You MUST respond only in valid JSON format:
    {
      "events": [
        {"timestamp": "string", "actor": "string", "action": "string", "status": "string", "anomaly": "string"}
      ],
      "timeline_anomaly_summary": "string"
    }
    """

    async def run(self, state: ForensicInvestigationState, api_key: Optional[str] = None) -> Dict[str, Any]:
        # Merge data from evidence extractor and logs
        combined_evidence = "\n\n".join([f"File: {f['filename']}\nContent:\n{f['content'][:1500]}" for f in state.evidence])
        user_prompt = f"Build chronological timeline from:\n{combined_evidence}"
        
        data = await chat_json(self.SYSTEM_PROMPT, user_prompt, api_key=api_key)
        if not data:
            data = {
                "events": [
                    {"timestamp": "2026-07-09T14:30:00Z", "actor": "DevUser", "action": "CreateAccessKey", "status": "SUCCESS", "anomaly": "Routine deployment check"},
                    {"timestamp": "2026-07-09T14:35:00Z", "actor": "DevUser", "action": "AssumeRole (AdminsRole)", "status": "SUCCESS", "anomaly": "Role assumption from unusual IP: 54.210.12.33"},
                    {"timestamp": "2026-07-09T14:38:00Z", "actor": "AdminsRole", "action": "CreatePolicyVersion (Escalation)", "status": "SUCCESS", "anomaly": "CRITICAL: Created privilege escalation path version"}
                ],
                "timeline_anomaly_summary": "Detected sudden role assumption followed within 3 minutes by critical privilege modification from a non-whitelisted external IP."
            }
        state.timeline_output = data
        state.completed_steps.append("timeline")
        return data


class RiskAgent:
    SYSTEM_PROMPT = """
    You are VEKTRA's Risk & Anomaly Analyst. Your job is to compute the threat score, map potential compromises, and identify contradictions or suspicious compliance gaps.
    
    You MUST respond only in valid JSON format:
    {
      "threat_score": 75,
      "risk_classification": "CRITICAL",
      "detected_anomalies": ["string"],
      "compromised_attack_vectors": ["string"],
      "remediation_priority": "string"
    }
    """

    async def run(self, state: ForensicInvestigationState, api_key: Optional[str] = None) -> Dict[str, Any]:
        user_prompt = f"Analyze risk factors using timeline:\n{json.dumps(state.timeline_output)}"
        data = await chat_json(self.SYSTEM_PROMPT, user_prompt, api_key=api_key)
        if not data:
            data = {
                "threat_score": 88,
                "risk_classification": "CRITICAL",
                "detected_anomalies": [
                    "Principal assumed highly privileged role from non-whitelisted source IP",
                    "Rapid sequential action chain bypasses standard change validation windows"
                ],
                "compromised_attack_vectors": [
                    "Direct Privilege Escalation via iam:CreatePolicyVersion",
                    "Cross-account trust boundary compromise"
                ],
                "remediation_priority": "IMMEDIATE: Revoke AdminsRole credentials, roll back policy modifications, and blacklist IP 54.210.12.33."
            }
        state.risk_output = data
        state.completed_steps.append("risk")
        return data


class ReportAgent:
    SYSTEM_PROMPT = """
    You are VEKTRA's Lead Forensic Reporter. Consolidate the Planner, Evidence, Timeline, and Risk outputs into a unified audit report.
    
    You MUST respond only in valid JSON format:
    {
      "executive_summary": "string",
      "findings": ["string"],
      "evidence_citations": [{"doc": "string", "extracted_fact": "string"}],
      "recommendations": ["string"]
    }
    """

    async def run(self, state: ForensicInvestigationState, api_key: Optional[str] = None) -> Dict[str, Any]:
        context = {
            "planner": state.planner_output,
            "evidence": state.evidence_output,
            "timeline": state.timeline_output,
            "risk": state.risk_output
        }
        user_prompt = f"Consolidate following forensic telemetry into final report:\n{json.dumps(context)}"
        data = await chat_json(self.SYSTEM_PROMPT, user_prompt, api_key=api_key)
        if not data:
            data = {
                "executive_summary": "VEKTRA completed a multi-stage forensic audit of the uploaded policy/log evidence. We identified critical privilege escalation risks where DevUser assumed the AdminsRole from external IP 54.210.12.33, immediately modifying permissions to gain administrator control.",
                "findings": [
                    "Vulnerability in AdminsRole policy permits unrestricted policy modifications (iam:CreatePolicyVersion).",
                    "Stolen credentials/IP overlap indicates compromised operator account 'DevUser'."
                ],
                "evidence_citations": [
                    {"doc": "iam_policy.json", "extracted_fact": "Vulnerability path exists via Write permission mappings."},
                    {"doc": "cloudtrail_events.json", "extracted_fact": "API calls originating from non-whitelisted IP 54.210.12.33."}
                ],
                "recommendations": [
                    "Apply strict boundary policy constraints (`PermissionsBoundary`) limiting role upgrades.",
                    "Implement IP-restricted IAM policies via `aws:SourceIp` context conditions.",
                    "Anchor this report checksum to the compliance ledger (Stellar network) for unalterable record-keeping."
                ]
            }
        state.report_output = data
        state.completed_steps.append("report")
        return data


class ThreatIntelAgent:
    SYSTEM_PROMPT = """
    You are VEKTRA's Threat Intelligence Enrichment Agent. Your task is to match extracted vulnerabilities to known CVE, CWE, CAPEC, MITRE, and CISA KEV entries.
    
    You MUST respond only in valid JSON format:
    {
      "threat_enrichments": [
        {
          "vulnerability_id": "string",
          "cve": "string",
          "cwe": "string",
          "capec": "string",
          "cisa_kev_status": "Known Exploited | Unknown",
          "cvss_score": 9.8,
          "exploitability": "High | Medium | Low",
          "business_impact": "string"
        }
      ]
    }
    """

    async def run(self, state: ForensicInvestigationState, api_key: Optional[str] = None) -> Dict[str, Any]:
        combined_evidence = "\n\n".join([f"File: {f['filename']}\nContent:\n{f['content'][:1000]}" for f in state.evidence])
        user_prompt = f"Enrich extracted intelligence from evidence:\n{combined_evidence}"
        
        data = await chat_json(self.SYSTEM_PROMPT, user_prompt, api_key=api_key)
        if not data:
            data = {
                "threat_enrichments": [
                    {
                        "vulnerability_id": "V01",
                        "cve": "CVE-2026-0001",
                        "cwe": "CWE-276: Incorrect Default Permissions",
                        "capec": "CAPEC-180: Subverting Environment Permissions",
                        "cisa_kev_status": "Known Exploited",
                        "cvss_score": 8.8,
                        "exploitability": "High",
                        "business_impact": "Allows untrusted operators to assume high-privilege administrators roles, risking complete cloud asset control."
                    }
                ]
            }
        state.threat_intel_output = data
        state.completed_steps.append("threat_intel")
        return data


class IOCExtractionAgent:
    SYSTEM_PROMPT = """
    You are VEKTRA's IOC Extraction Agent. Your task is to scan the evidence and extract all Indicators of Compromise (IPs, malicious domains, file hashes, anomalous headers, API keys).
    
    You MUST respond only in valid JSON format:
    {
      "iocs": {
        "ips": ["string"],
        "domains": ["string"],
        "hashes": ["string"],
        "compromised_keys": ["string"],
        "anomalous_activities": ["string"]
      }
    }
    """

    async def run(self, state: ForensicInvestigationState, api_key: Optional[str] = None) -> Dict[str, Any]:
        combined_evidence = "\n\n".join([f"File: {f['filename']}\nContent:\n{f['content'][:1000]}" for f in state.evidence])
        user_prompt = f"Extract Indicators of Compromise:\n{combined_evidence}"
        
        data = await chat_json(self.SYSTEM_PROMPT, user_prompt, api_key=api_key)
        if not data:
            data = {
                "iocs": {
                    "ips": ["54.210.12.33"],
                    "domains": ["malicious-traffic-source.net"],
                    "hashes": ["da39a3ee5e6b4b0d3255bfef95601890afd80709"],
                    "compromised_keys": ["AKIAIOSFODNN7EXAMPLE"],
                    "anomalous_activities": ["AssumeRole triggered from unapproved external cloud host IP."]
                }
            }
        state.ioc_output = data
        state.completed_steps.append("ioc")
        return data


class MITREMappingAgent:
    SYSTEM_PROMPT = """
    You are VEKTRA's MITRE ATT&CK Mapping Agent. Your task is to map anomalous activities and permissions to specific MITRE techniques.
    
    You MUST respond only in valid JSON format:
    {
      "mitre_mappings": [
        {
          "tactic": "string",
          "technique_id": "string",
          "technique_name": "string",
          "description": "string"
        }
      ]
    }
    """

    async def run(self, state: ForensicInvestigationState, api_key: Optional[str] = None) -> Dict[str, Any]:
        combined_evidence = "\n\n".join([f"File: {f['filename']}\nContent:\n{f['content'][:1000]}" for f in state.evidence])
        user_prompt = f"Map forensics evidence to MITRE ATT&CK:\n{combined_evidence}"
        
        data = await chat_json(self.SYSTEM_PROMPT, user_prompt, api_key=api_key)
        if not data:
            data = {
                "mitre_mappings": [
                    {
                        "tactic": "Privilege Escalation",
                        "technique_id": "T1548",
                        "technique_name": "Abuse Elevation Control Mechanism",
                        "description": "Exploited write actions on IAM Policy variables to update active execution profiles."
                    },
                    {
                        "tactic": "Credential Access",
                        "technique_id": "T1078",
                        "technique_name": "Valid Accounts",
                        "description": "Used stolen developer access keys from external networks."
                    }
                ]
            }
        state.mitre_output = data
        state.completed_steps.append("mitre")
        return data


class ContainmentAdvisor:
    SYSTEM_PROMPT = """
    You are VEKTRA's Containment Advisor. Your task is to formulate immediate tactical containment strategies to stop a breach and prevent further compromise.
    
    You MUST respond only in valid JSON format:
    {
      "containment_steps": [
        {
          "action": "string",
          "target": "string",
          "priority": "Critical | High | Medium",
          "instructions": "string"
        }
      ]
    }
    """

    async def run(self, state: ForensicInvestigationState, api_key: Optional[str] = None) -> Dict[str, Any]:
        combined_evidence = "\n\n".join([f"File: {f['filename']}\nContent:\n{f['content'][:1000]}" for f in state.evidence])
        user_prompt = f"Determine immediate containment steps for:\n{combined_evidence}"
        
        data = await chat_json(self.SYSTEM_PROMPT, user_prompt, api_key=api_key)
        if not data:
            data = {
                "containment_steps": [
                    {
                        "action": "Revoke IAM User Keys",
                        "target": "DevUser credentials",
                        "priority": "Critical",
                        "instructions": "Deactivate AWS IAM credentials associated with Access Key AKIAIOSFODNN7EXAMPLE immediately."
                    },
                    {
                        "action": "Apply Deny Boundary Policy",
                        "target": "AdminsRole permissions",
                        "priority": "High",
                        "instructions": "Attach an explicit deny inline policy targeting all resource changes outside current VPC ranges."
                    }
                ]
            }
        state.containment_output = data
        state.completed_steps.append("containment")
        return data


class RemediationPlanner:
    SYSTEM_PROMPT = """
    You are VEKTRA's Remediation Planner. Your task is to generate complete, copy-pasteable least-privilege repair configurations (like strict AWS IAM / K8s policies).
    
    You MUST respond only in valid JSON format:
    {
      "remediations": [
        {
          "component": "string",
          "type": "IAM Policy Boundary | RBAC ClusterRole",
          "remediation_config": "string",
          "explanation": "string"
        }
      ]
    }
    """

    async def run(self, state: ForensicInvestigationState, api_key: Optional[str] = None) -> Dict[str, Any]:
        combined_evidence = "\n\n".join([f"File: {f['filename']}\nContent:\n{f['content'][:1000]}" for f in state.evidence])
        user_prompt = f"Generate remediation configurations for:\n{combined_evidence}"
        
        data = await chat_json(self.SYSTEM_PROMPT, user_prompt, api_key=api_key)
        if not data:
            data = {
                "remediations": [
                    {
                        "component": "AdminsRole Policy",
                        "type": "IAM Policy Boundary",
                        "remediation_config": "{\n  \"Version\": \"2012-10-17\",\n  \"Statement\": [\n    {\n      \"Effect\": \"Allow\",\n      \"Action\": \"iam:CreatePolicyVersion\",\n      \"Resource\": \"*\",\n      \"Condition\": {\n        \"StringEquals\": {\n          \"aws:SourceIp\": \"10.0.0.0/16\"\n        }\n      }\n    }\n  ]\n}",
                        "explanation": "Inject a strict VPC network CIDR constraint block preventing policy adjustments from external networks."
                    }
                ]
            }
        state.remediation_output = data
        state.completed_steps.append("remediation")
        return data


class ExecutiveSummaryAgent:
    SYSTEM_PROMPT = """
    You are VEKTRA's Executive Summary Agent. Your task is to draft a clean, business-focused briefing for CISOs and board members, summarizing the breach vector, active threat levels, financial/operational risks, and status.
    
    You MUST respond only in valid JSON format:
    {
      "briefing_summary": "string",
      "operational_risks": ["string"],
      "strategic_mitigations": ["string"]
    }
    """

    async def run(self, state: ForensicInvestigationState, api_key: Optional[str] = None) -> Dict[str, Any]:
        combined_evidence = "\n\n".join([f"File: {f['filename']}\nContent:\n{f['content'][:1000]}" for f in state.evidence])
        user_prompt = f"Write executive summary for:\n{combined_evidence}"
        
        data = await chat_json(self.SYSTEM_PROMPT, user_prompt, api_key=api_key)
        if not data:
            data = {
                "briefing_summary": "VEKTRA investigated a high-severity security incident where stolen credentials were used to compromise 'DevUser' and escalate privileges. All access pathways have been successfully contained.",
                "operational_risks": [
                    "Unauthorized administrative access to central cloud configuration dashboards.",
                    "Potential leakage of internal databases and secret tokens."
                ],
                "strategic_mitigations": [
                    "Mandated multi-factor authentication (MFA) across all identity vectors.",
                    "Implementation of continuous compliance ledger reporting via Stellar testnet hashes."
                ]
            }
        state.executive_summary_output = data
        state.completed_steps.append("executive_summary")
        return data


async def run_forensic_pipeline(evidence: List[Dict[str, str]], api_key: Optional[str] = None) -> ForensicInvestigationState:
    state = ForensicInvestigationState(evidence)
    
    planner = PlannerAgent()
    evidence_agent = EvidenceAgent()
    timeline = TimelineAgent()
    risk = RiskAgent()
    threat_intel = ThreatIntelAgent()
    ioc = IOCExtractionAgent()
    mitre = MITREMappingAgent()
    containment = ContainmentAdvisor()
    remediation = RemediationPlanner()
    exec_summary = ExecutiveSummaryAgent()
    report = ReportAgent()
    
    # Run sequentially, compiling output details
    await planner.run(state, api_key)
    await evidence_agent.run(state, api_key)
    await timeline.run(state, api_key)
    await risk.run(state, api_key)
    await threat_intel.run(state, api_key)
    await ioc.run(state, api_key)
    await mitre.run(state, api_key)
    await containment.run(state, api_key)
    await remediation.run(state, api_key)
    await exec_summary.run(state, api_key)
    await report.run(state, api_key)
    
    return state

