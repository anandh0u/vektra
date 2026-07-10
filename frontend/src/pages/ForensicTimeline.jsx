import React, { useState } from "react";
import { 
  Clock, 
  Search, 
  AlertTriangle, 
  Filter, 
  Eye, 
  FileText, 
  User, 
  Info,
  Calendar,
  Lock
} from "lucide-react";

export default function ForensicTimeline() {
  const [zoom, setZoom] = useState(50);
  const [filterType, setFilterType] = useState("ALL");
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  const events = [
    {
      id: 1,
      timestamp: "2026-07-09T14:30:00Z",
      type: "SYSTEM_ACTION",
      actor: "Operator-Alpha",
      action: "CreateAccessKey",
      details: "Generated new long-term IAM access key: AKIAIOSFODNN7EXAMPLE",
      severity: "LOW",
      anomaly: "Access key generated without multi-factor authentication check.",
      file: "aws_credentials_audit.json"
    },
    {
      id: 2,
      timestamp: "2026-07-09T14:32:15Z",
      type: "API_CALL",
      actor: "DevUser",
      action: "GetCallerIdentity",
      details: "Invoked STS request to fetch current account principal identity context.",
      severity: "LOW",
      anomaly: "Normal validation check from typical office workstation IP.",
      file: "cloudtrail_events.json"
    },
    {
      id: 3,
      timestamp: "2026-07-09T14:35:00Z",
      type: "IDENTITY_SHIFT",
      actor: "DevUser",
      action: "AssumeRole (AdminsRole)",
      details: "Assumed high-privilege executive management role from outside normal ranges.",
      severity: "MEDIUM",
      anomaly: "CRITICAL: IP location resolution points to non-whitelisted VPN provider.",
      file: "cloudtrail_events.json"
    },
    {
      id: 4,
      timestamp: "2026-07-09T14:38:00Z",
      type: "SECURITY_ALERT",
      actor: "AdminsRole",
      action: "CreatePolicyVersion",
      details: "Modified policies to append write rules and administrative actions (*).",
      severity: "HIGH",
      anomaly: "VULNERABILITY: Potential privilege escalation vector established dynamically.",
      file: "iam_policy.json"
    },
    {
      id: 5,
      timestamp: "2026-07-09T14:40:00Z",
      type: "SYSTEM_ACTION",
      actor: "Stellar Compliance Bridge",
      action: "Anchor Hash Proof",
      details: "Mints sha256 checksum footprint verifying incident status to public ledger.",
      severity: "INFO",
      anomaly: "Compliance trace anchored. Transaction ledger block confirmed.",
      file: "stellar_block_receipt"
    }
  ];

  const filteredEvents = events.filter((e) => {
    if (filterType !== "ALL" && e.type !== filterType) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        e.action.toLowerCase().includes(q) ||
        e.actor.toLowerCase().includes(q) ||
        e.details.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const getSeverityStyle = (sev) => {
    switch (sev) {
      case "HIGH":
        return "bg-destructive/15 text-destructive border-destructive/30";
      case "MEDIUM":
        return "bg-yellow-500/15 text-yellow-500 border-yellow-500/30";
      case "LOW":
        return "bg-primary/15 text-primary border-primary/30";
      default:
        return "bg-muted/30 text-text/80 border-border/30";
    }
  };

  const getIconStyle = (type) => {
    switch (type) {
      case "SECURITY_ALERT":
        return "bg-destructive/20 border-destructive text-destructive";
      case "IDENTITY_SHIFT":
        return "bg-yellow-500/20 border-yellow-500 text-yellow-500";
      case "API_CALL":
        return "bg-primary/20 border-primary text-primary";
      default:
        return "bg-accent/20 border-accent text-accent";
    }
  };

  return (
    <div className="min-h-screen bg-background text-text p-6 lg:p-10 transition-colors duration-300">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent flex items-center gap-3">
            <Clock className="h-8 w-8 text-primary" />
            Interactive Incident Timeline
          </h1>
          <p className="text-muted text-sm mt-1">
            Chronological attack sequence mapping. Filter, zoom, and expand anomalies in real time.
          </p>
        </div>
      </div>

      {/* Timeline Anomaly Insights Box */}
      <div className="glass-card p-4 border border-destructive/20 bg-destructive/5 rounded-xl mb-8 flex items-start gap-4">
        <AlertTriangle className="h-6 w-6 text-destructive shrink-0 mt-0.5" />
        <div>
          <h4 className="text-sm font-bold text-destructive">Timeline Anomalies Detected</h4>
          <p className="text-xs text-text/85 mt-1">
            Rapid privilege escalation occurred within 3 minutes of role assumption from an external VPN IP address. Review step 3 and 4 actions.
          </p>
        </div>
      </div>

      {/* Controls Bar */}
      <div className="glass-card p-6 border border-border/40 rounded-xl mb-8 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Filters */}
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted" />
            {["ALL", "SECURITY_ALERT", "IDENTITY_SHIFT", "API_CALL", "SYSTEM_ACTION"].map((type) => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={`px-3 py-1 rounded text-xs font-semibold border transition-all ${
                  filterType === type
                    ? "bg-primary border-primary text-white"
                    : "bg-muted/10 border-border/40 text-muted hover:bg-muted/20"
                }`}
              >
                {type.replace("_", " ")}
              </button>
            ))}
          </div>

          {/* Search bar */}
          <div className="relative w-full md:w-64">
            <input
              type="text"
              placeholder="Search actors/actions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 bg-muted/20 border border-border/60 focus:border-primary focus:outline-none rounded-lg text-xs"
            />
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted" />
          </div>
        </div>

        {/* Zoom Slider */}
        <div className="flex items-center gap-4 pt-2 border-t border-border/20">
          <span className="text-xs text-muted font-bold">Timeline Zoom</span>
          <input
            type="range"
            min="10"
            max="100"
            value={zoom}
            onChange={(e) => setZoom(parseInt(e.target.value))}
            className="flex-1 accent-primary h-1 bg-muted/30 rounded-lg cursor-pointer"
          />
          <span className="text-xs font-mono text-muted">{zoom}%</span>
        </div>
      </div>

      {/* Timeline Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Timeline Stream */}
        <div className="lg:col-span-2 space-y-6 relative pl-6 border-l-2 border-border/40">
          {filteredEvents.map((event) => {
            // Apply scale sizing based on Zoom slider
            const cardPadding = zoom > 70 ? "p-5" : zoom < 30 ? "p-2.5" : "p-4";
            const textClass = zoom > 70 ? "text-sm" : zoom < 30 ? "text-[10px]" : "text-xs";
            
            return (
              <div 
                key={event.id}
                onClick={() => setSelectedEvent(event)}
                className="relative cursor-pointer transition-all hover:-translate-y-0.5"
              >
                {/* Timeline Dot Node */}
                <div className={`absolute -left-[35px] top-4 w-6 h-6 rounded-full border-2 flex items-center justify-center ${getIconStyle(event.type)}`}>
                  <Calendar className="h-3 w-3" />
                </div>

                {/* Card */}
                <div className={`glass-card border border-border/40 rounded-xl bg-card/10 hover:bg-card/25 transition-all ${cardPadding}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-mono text-muted font-bold flex items-center gap-1.5">
                      <Clock className="h-3 w-3" />
                      {event.timestamp}
                    </span>
                    <span className={`px-2 py-0.5 text-[9px] font-bold rounded border ${getSeverityStyle(event.severity)}`}>
                      {event.severity}
                    </span>
                  </div>

                  <h3 className="font-extrabold text-sm text-text flex items-center gap-2">
                    {event.action}
                  </h3>

                  <div className={`mt-2 ${textClass} text-text/80`}>
                    <p className="flex items-center gap-1.5 font-mono mb-1">
                      <User className="h-3.5 w-3.5 text-primary" />
                      Actor: <span className="text-primary font-semibold">{event.actor}</span>
                    </p>
                    <p className="opacity-95">{event.details}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Selected Event Details Panel */}
        <div>
          {selectedEvent ? (
            <div className="glass-card p-6 border border-border/40 rounded-xl space-y-6 sticky top-6">
              <div className="border-b border-border/30 pb-3">
                <span className="px-2 py-0.5 text-[9px] font-bold bg-primary/10 text-primary border border-primary/20 rounded uppercase">
                  {selectedEvent.type.replace("_", " ")}
                </span>
                <h2 className="text-lg font-bold mt-2">{selectedEvent.action}</h2>
                <p className="text-[10px] font-mono text-muted mt-1">{selectedEvent.timestamp}</p>
              </div>

              <div className="space-y-4 text-xs text-text/90">
                <div className="space-y-1">
                  <p className="text-[10px] font-bold uppercase text-muted">Actor Identity</p>
                  <p className="font-mono bg-muted/20 p-2 rounded border border-border/20 break-all">{selectedEvent.actor}</p>
                </div>

                <div className="space-y-1">
                  <p className="text-[10px] font-bold uppercase text-muted">Description</p>
                  <p className="leading-relaxed bg-muted/10 p-2 rounded">{selectedEvent.details}</p>
                </div>

                <div className="space-y-1">
                  <p className="text-[10px] font-bold uppercase text-destructive">Anomaly & Security Impact</p>
                  <p className="leading-relaxed bg-destructive/5 text-destructive p-2.5 rounded border border-destructive/20 italic">
                    "{selectedEvent.anomaly}"
                  </p>
                </div>

                <div className="space-y-1">
                  <p className="text-[10px] font-bold uppercase text-muted">Originating Source Document</p>
                  <p className="font-mono flex items-center gap-1.5 text-primary hover:underline cursor-pointer">
                    <FileText className="h-3.5 w-3.5" />
                    {selectedEvent.file}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="glass-card p-8 border border-border/40 rounded-xl text-center text-muted flex flex-col items-center justify-center sticky top-6 h-64 bg-card/5">
              <Info className="h-8 w-8 text-muted mb-2" />
              <p className="text-xs font-semibold">Select a timeline node to view detailed forensic metrics.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
