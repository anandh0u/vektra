import React, { useState } from "react";
import Sidebar from "../components/Sidebar";
import TopBar from "../components/TopBar";
import { CheckCircle, XCircle, AlertTriangle, ShieldCheck, BarChart2 } from "lucide-react";

const COMPLIANCE_ITEMS = {
  cis: {
    name: "CIS AWS Foundations Benchmark v1.4.0",
    score: 68,
    checks: [
      { id: "1.1", title: "Avoid the use of the 'root' user account", status: "PASS", desc: "No API calls or active access keys registered for the primary root administrator account." },
      { id: "1.2", title: "Ensure MFA is enabled for all IAM users with console access", status: "FAIL", desc: "Found 3 users with console passwords that lack multi-factor authentication devices." },
      { id: "1.16", title: "Ensure IAM policies that allow full '*:*' administrative privileges are not created", status: "FAIL", desc: "Active wildcard AdministratorAccess policy attached directly to 'analyst-user'." },
      { id: "2.1", title: "Ensure CloudTrail is enabled in all regions", status: "PASS", desc: "Multi-region organizational trail successfully created and logging to encrypted S3 bucket." },
      { id: "1.22", title: "Ensure IAM policies are attached only to groups or roles", status: "FAIL", desc: "Policy attached directly to user 'dev-operator-1'. Policies should be group-scoped." }
    ]
  },
  soc2: {
    name: "SOC 2 Type II - Trust Services Criteria",
    score: 80,
    checks: [
      { id: "CC6.1", title: "Access Credentials Rotation", status: "PASS", desc: "All user console passwords and API access keys successfully rotated within 90 days." },
      { id: "CC6.2", title: "User Registration & Authorization", status: "PASS", desc: "All new operators added via centralized Okta SAML role federation pathways." },
      { id: "CC6.3", title: "Least Privilege Access Boundaries", status: "FAIL", desc: "Excessive delete permissions found on production archive DynamoDB tables." }
    ]
  },
  hipaa: {
    name: "HIPAA Security Rule § 164.312",
    score: 75,
    checks: [
      { id: "164.312(a)(1)", title: "Unique User Identification Control", status: "PASS", desc: "No shared developer credentials found. All access keys map to individual user identities." },
      { id: "164.312(a)(2)(iv)", title: "Encryption of Health Information in Transit", status: "PASS", desc: "Enforce HTTPS bucket policy rules attached on all primary public-facing assets." },
      { id: "164.312(c)(1)", title: "Access Alteration and Deletion Auditing", status: "FAIL", desc: "S3 Object Versioning and MFA Delete configs disabled on production-data assets." }
    ]
  }
};

export default function CompliancePage() {
  const [activeFramework, setActiveFramework] = useState("cis");
  const current = COMPLIANCE_ITEMS[activeFramework];

  const totalChecks = current.checks.length;
  const passedChecks = current.checks.filter((c) => c.status === "PASS").length;
  const failedChecks = totalChecks - passedChecks;

  return (
    <div className="flex h-screen bg-pageBg text-textMain overflow-hidden font-sans select-none">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar />
        <main className="flex-1 overflow-y-auto p-4 sm:p-8">
          <div className="mx-auto max-w-5xl space-y-6">
            
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-xl font-bold text-textMain flex items-center gap-2 uppercase tracking-tight">
                  <ShieldCheck className="h-5 w-5 text-primary" />
                  Cloud Compliance Benchmarks
                </h1>
                <p className="mt-0.5 text-xs text-muted">
                  Audit your IAM configurations against industry security benchmarks.
                </p>
              </div>
            </div>

            {/* Framework Selectors Row */}
            <div className="flex bg-cardSurface p-1 rounded-[6px] border border-cardBorder max-w-md text-xs font-semibold">
              {[
                { id: "cis", label: "CIS Benchmark" },
                { id: "soc2", label: "SOC 2 Type II" },
                { id: "hipaa", label: "HIPAA Control" }
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setActiveFramework(f.id)}
                  className={`flex-1 px-4 py-2 rounded-[6px] transition-fast text-center ${
                    activeFramework === f.id ? "bg-activeNav text-textMain border border-cardBorder shadow-sm" : "text-muted hover:text-textMain"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Compliance Statistics Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="glass-card rounded-lg p-5 space-y-2 flex flex-col justify-between">
                <span className="text-[10px] text-muted block uppercase tracking-wider font-semibold">Framework Score</span>
                <div className="flex items-baseline gap-1 mt-2">
                  <span className={`text-4xl font-extrabold font-mono ${current.score >= 80 ? "text-primary" : "text-warning"}`}>
                    {current.score}%
                  </span>
                  <span className="text-xs text-muted">compliance pass</span>
                </div>
              </div>

              <div className="glass-card rounded-lg p-5 space-y-2 flex flex-col justify-between">
                <span className="text-[10px] text-muted block uppercase tracking-wider font-semibold">Passed Checks</span>
                <div className="flex items-baseline gap-1 mt-2">
                  <span className="text-4xl font-extrabold font-mono text-primary">{passedChecks}</span>
                  <span className="text-xs text-muted">out of {totalChecks} rules</span>
                </div>
              </div>

              <div className="glass-card rounded-lg p-5 space-y-2 flex flex-col justify-between">
                <span className="text-[10px] text-muted block uppercase tracking-wider font-semibold">Failed Controls</span>
                <div className="flex items-baseline gap-1 mt-2">
                  <span className="text-4xl font-extrabold font-mono text-[#FF5C4D]">{failedChecks}</span>
                  <span className="text-xs text-muted">vulnerabilities found</span>
                </div>
              </div>
            </div>

            {/* Rules Checklists */}
            <div className="space-y-3">
              <h2 className="text-xs font-bold text-muted uppercase tracking-wider">{current.name} Checklist</h2>
              <div className="space-y-3">
                {current.checks.map((check) => (
                  <div key={check.id} className="bg-cardSurface border border-cardBorder rounded-[6px] p-4 space-y-2 hover:border-muted/30 transition-fast">
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1">
                        <span className="text-[10px] font-mono text-primary font-bold uppercase tracking-wider">Control {check.id}</span>
                        <h3 className="text-xs font-bold text-textMain">{check.title}</h3>
                      </div>
                      <span className={`px-2 py-0.5 rounded-[6px] text-[8px] font-bold border uppercase tracking-wider font-mono shrink-0 ${
                        check.status === "PASS"
                          ? "bg-primary/10 text-primary border-primary/20"
                          : "bg-danger/10 text-danger border-danger/20"
                      }`}>
                        {check.status === "PASS" ? "Compliant" : "Failed"}
                      </span>
                    </div>
                    <p className="text-xs text-muted leading-relaxed font-normal">{check.desc}</p>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </main>
      </div>
    </div>
  );
}
