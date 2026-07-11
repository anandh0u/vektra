import React, { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";
import { useVektraStore, getAuthHeaders } from "../store/vektraStore";
import { 
  Briefcase, 
  Folder, 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  User, 
  Tag, 
  FileText, 
  Send, 
  MessageSquare, 
  Plus, 
  Trash2, 
  Activity, 
  Upload, 
  Loader2, 
  ExternalLink,
  ShieldCheck
} from "lucide-react";

export default function CasesPage() {
  const { currentUser, activeCaseId, setActiveCaseId } = useVektraStore();
  const [cases, setCases] = useState([]);
  const [selectedCase, setSelectedCase] = useState(null);
  
  // Loading & Action States
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("overview"); // overview | evidence | comments
  
  // New Case Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newCase, setNewCase] = useState({
    name: "",
    description: "",
    priority: "Medium",
    status: "Open",
    due_date: "",
    tags: "",
    team_members: ""
  });

  // Comments & Evidence States
  const [comments, setComments] = useState([]);
  const [activities, setActivities] = useState([]);
  const [evidenceList, setEvidenceList] = useState([]);
  const [newComment, setNewComment] = useState("");
  
  // Evidence upload form
  const [uploading, setUploading] = useState(false);
  const [uploadFile, setUploadFile] = useState({ filename: "", content: "", content_type: "text/plain" });

  const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

  // Fetch Cases
  const fetchCases = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/cases`, { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        setCases(data);
        // Autoselect first or active case
        if (data.length > 0) {
          const matched = data.find(c => c.id === activeCaseId) || data[0];
          setSelectedCase(matched);
          setActiveCaseId(matched.id);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCases();
  }, []);

  // Fetch linked data when selected case changes
  useEffect(() => {
    if (!selectedCase) return;
    
    // Fetch evidence
    fetch(`${API_BASE}/api/cases/${selectedCase.id}/evidence`, { headers: getAuthHeaders() })
      .then(r => r.json())
      .then(data => setEvidenceList(data || []))
      .catch(console.error);

    // Fetch comments
    fetch(`${API_BASE}/api/cases/${selectedCase.id}/comments`, { headers: getAuthHeaders() })
      .then(r => r.json())
      .then(data => setComments(data || []))
      .catch(console.error);

    // Fetch activity
    fetch(`${API_BASE}/api/cases/${selectedCase.id}/activity`, { headers: getAuthHeaders() })
      .then(r => r.json())
      .then(data => setActivities(data || []))
      .catch(console.error);

  }, [selectedCase]);

  // Create Case
  const handleCreateCase = async (e) => {
    e.preventDefault();
    if (!newCase.name.trim()) return;

    try {
      const res = await fetch(`${API_BASE}/api/cases`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({
          name: newCase.name,
          description: newCase.description,
          priority: newCase.priority,
          status: newCase.status,
          due_date: newCase.due_date,
          tags: newCase.tags.split(",").map(t => t.trim()).filter(Boolean),
          team_members: newCase.team_members.split(",").map(m => m.trim()).filter(Boolean)
        })
      });

      if (res.ok) {
        setIsModalOpen(false);
        setNewCase({ name: "", description: "", priority: "Medium", status: "Open", due_date: "", tags: "", team_members: "" });
        fetchCases();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Update Status / Priority
  const handleUpdateStatus = async (status) => {
    if (!selectedCase) return;
    try {
      const res = await fetch(`${API_BASE}/api/cases/${selectedCase.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        const data = await res.json();
        setSelectedCase(data);
        setCases(cases.map(c => c.id === data.id ? data : c));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdatePriority = async (priority) => {
    if (!selectedCase) return;
    try {
      const res = await fetch(`${API_BASE}/api/cases/${selectedCase.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ priority })
      });
      if (res.ok) {
        const data = await res.json();
        setSelectedCase(data);
        setCases(cases.map(c => c.id === data.id ? data : c));
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Add Comment
  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim() || !selectedCase) return;

    try {
      const res = await fetch(`${API_BASE}/api/cases/${selectedCase.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ text: newComment.trim() })
      });
      if (res.ok) {
        const data = await res.json();
        setComments([...comments, data]);
        setNewComment("");
        
        // Refresh activity
        fetch(`${API_BASE}/api/cases/${selectedCase.id}/activity`, { headers: getAuthHeaders() })
          .then(r => r.json())
          .then(setActivities)
          .catch(console.error);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Upload Evidence File
  const handleEvidenceFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setUploadFile({
        filename: file.name,
        content: event.target.result,
        content_type: file.type || "text/plain"
      });
    };
    reader.readAsText(file);
  };

  const handleUploadEvidence = async (e) => {
    e.preventDefault();
    if (!uploadFile.filename || !selectedCase) return;

    setUploading(true);
    try {
      const res = await fetch(`${API_BASE}/api/cases/${selectedCase.id}/evidence`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({
          filename: uploadFile.filename,
          content: uploadFile.content,
          content_type: uploadFile.content_type
        })
      });

      if (res.ok) {
        const data = await res.json();
        setEvidenceList([data, ...evidenceList]);
        setUploadFile({ filename: "", content: "", content_type: "text/plain" });
        
        // Refresh activity
        fetch(`${API_BASE}/api/cases/${selectedCase.id}/activity`, { headers: getAuthHeaders() })
          .then(r => r.json())
          .then(setActivities)
          .catch(console.error);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setUploading(false);
    }
  };

  const selectCase = (c) => {
    setSelectedCase(c);
    setActiveCaseId(c.id);
  };

  // Format Helper
  const formatSize = (bytes) => {
    if (!bytes) return "0 Bytes";
    const k = 1024;
    const dm = 2;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
  };

  return (
    <div className="flex h-screen bg-[#060813] text-slate-100 font-sans overflow-hidden">
      <Sidebar />

      {/* Main Workspace Area */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* Top Header */}
        <header className="h-14 border-b border-[#1e2240] bg-[#0a0c16] px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Briefcase className="w-5 h-5 text-primary" />
            <h1 className="text-sm font-bold tracking-wider uppercase">Case Management Center</h1>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-primary hover:bg-primary/90 text-white text-xs font-bold uppercase rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" /> New Case
          </button>
        </header>

        {/* Content Pane split in two */}
        <div className="flex-1 flex overflow-hidden">
          
          {/* Left panel: Case Cards List */}
          <div className="w-80 border-r border-[#1e2240] bg-[#0a0d18] flex flex-col flex-shrink-0">
            <div className="p-3 border-b border-[#1e2240]">
              <span className="text-[10px] uppercase tracking-wider text-muted font-bold block">Security Tickets</span>
            </div>
            
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {loading ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : cases.length === 0 ? (
                <div className="text-center py-10">
                  <Folder className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                  <p className="text-[11px] text-muted">No security cases registered yet.</p>
                </div>
              ) : (
                cases.map(c => {
                  const isSelected = selectedCase && selectedCase.id === c.id;
                  const prioColor = c.priority === "Critical" ? "text-danger" : c.priority === "High" ? "text-warning" : "text-primary";
                  
                  return (
                    <div
                      key={c.id}
                      onClick={() => selectCase(c)}
                      className={`p-3 rounded-lg border cursor-pointer transition-all duration-200 ${
                        isSelected 
                          ? "bg-[#141833] border-primary/50 shadow-lg shadow-primary/5" 
                          : "bg-[#0b0e1e] border-[#1e2240] hover:border-slate-700"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <span className="text-[9px] font-mono text-muted uppercase">CASE-{c.id.slice(0,6)}</span>
                        <span className={`text-[9px] font-bold uppercase ${prioColor}`}>
                          {c.priority}
                        </span>
                      </div>
                      <h3 className="text-xs font-bold text-slate-200 line-clamp-1">{c.name}</h3>
                      <p className="text-[10px] text-muted line-clamp-2 mt-1 leading-relaxed">{c.description || "No description provided."}</p>
                      
                      <div className="flex items-center justify-between mt-3 pt-2 border-t border-[#1e2240]/40 text-[9px] text-muted font-medium">
                        <span className="bg-[#191c38] px-1.5 py-0.5 rounded uppercase">{c.status}</span>
                        <span>{new Date(c.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right panel: Active Case details workspace */}
          <div className="flex-1 flex flex-col bg-[#060813] min-w-0">
            {selectedCase ? (
              <div className="flex-1 flex flex-col overflow-hidden">
                
                {/* Case Info Panel */}
                <div className="p-5 border-b border-[#1e2240] bg-[#090b16] flex-shrink-0">
                  <div className="flex flex-wrap items-start justify-between gap-4 mb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-[10px] font-mono text-primary bg-primary/10 px-2 py-0.5 rounded">CASE ID: {selectedCase.id}</span>
                        {selectedCase.due_date && (
                          <span className="flex items-center gap-1 text-[10px] text-muted">
                            <Clock className="w-3 h-3" /> Due {selectedCase.due_date}
                          </span>
                        )}
                      </div>
                      <h2 className="text-base font-bold text-slate-100">{selectedCase.name}</h2>
                    </div>

                    <div className="flex items-center gap-3">
                      <div>
                        <label className="block text-[9px] uppercase tracking-wider text-muted font-bold mb-1">Status</label>
                        <select
                          value={selectedCase.status}
                          onChange={(e) => handleUpdateStatus(e.target.value)}
                          className="bg-[#141628] border border-[#1e2240] rounded px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:border-primary"
                        >
                          <option value="Open">Open</option>
                          <option value="Investigating">Investigating</option>
                          <option value="Contained">Contained</option>
                          <option value="Monitoring">Monitoring</option>
                          <option value="Resolved">Resolved</option>
                          <option value="Closed">Closed</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[9px] uppercase tracking-wider text-muted font-bold mb-1">Priority</label>
                        <select
                          value={selectedCase.priority}
                          onChange={(e) => handleUpdatePriority(e.target.value)}
                          className="bg-[#141628] border border-[#1e2240] rounded px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:border-primary"
                        >
                          <option value="Critical">Critical</option>
                          <option value="High">High</option>
                          <option value="Medium">Medium</option>
                          <option value="Low">Low</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed max-w-4xl">{selectedCase.description || "No description provided."}</p>
                  
                  {/* Meta Tags */}
                  <div className="flex flex-wrap gap-1.5 mt-4">
                    {selectedCase.tags && selectedCase.tags.map((t, idx) => (
                      <span key={idx} className="flex items-center gap-0.5 px-2 py-0.5 bg-[#141628] border border-[#1e2240] text-[9px] text-slate-300 rounded font-mono uppercase">
                        <Tag className="w-2.5 h-2.5 text-muted" /> {t}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Tabs Selector */}
                <div className="h-10 border-b border-[#1e2240] bg-[#090b16] px-5 flex items-center gap-6 flex-shrink-0">
                  <button
                    onClick={() => setActiveTab("overview")}
                    className={`h-full border-b-2 text-xs font-bold uppercase tracking-wider px-1.5 flex items-center gap-1.5 transition-all duration-200 ${
                      activeTab === "overview" ? "border-primary text-primary" : "border-transparent text-muted hover:text-slate-300"
                    }`}
                  >
                    <Activity className="w-3.5 h-3.5" /> Activity Log
                  </button>
                  <button
                    onClick={() => setActiveTab("evidence")}
                    className={`h-full border-b-2 text-xs font-bold uppercase tracking-wider px-1.5 flex items-center gap-1.5 transition-all duration-200 ${
                      activeTab === "evidence" ? "border-primary text-primary" : "border-transparent text-muted hover:text-slate-300"
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5" /> Evidence Vault
                  </button>
                  <button
                    onClick={() => setActiveTab("comments")}
                    className={`h-full border-b-2 text-xs font-bold uppercase tracking-wider px-1.5 flex items-center gap-1.5 transition-all duration-200 ${
                      activeTab === "comments" ? "border-primary text-primary" : "border-transparent text-muted hover:text-slate-300"
                    }`}
                  >
                    <MessageSquare className="w-3.5 h-3.5" /> Discussions
                  </button>
                </div>

                {/* Tab Content Display */}
                <div className="flex-1 overflow-y-auto p-5 min-h-0">
                  
                  {/* OVERVIEW TAB */}
                  {activeTab === "overview" && (
                    <div className="space-y-4 max-w-4xl">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-muted mb-2">Operational Chain of Custody & Activity History</h3>
                      
                      <div className="relative pl-5 border-l border-[#1e2240] space-y-4 py-2">
                        {activities.length === 0 ? (
                          <p className="text-xs text-muted">No forensic actions recorded yet.</p>
                        ) : (
                          activities.map(act => (
                            <div key={act.id} className="relative">
                              <span className="absolute -left-[25px] top-1 w-2.5 h-2.5 rounded-full bg-primary border-4 border-[#060813]" />
                              <div className="text-[10px] text-muted font-mono">{new Date(act.timestamp).toLocaleString()}</div>
                              <div className="text-xs font-bold text-slate-200 mt-0.5">{act.action.replace("_", " ").toUpperCase()}</div>
                              <p className="text-[11px] text-slate-400 mt-0.5">{act.details}</p>
                              <div className="text-[9px] text-muted font-mono mt-1">Investigator: {act.actor}</div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}

                  {/* EVIDENCE TAB */}
                  {activeTab === "evidence" && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      
                      {/* Left: Upload Form */}
                      <div className="bg-[#0b0e1e] border border-[#1e2240] p-4 rounded-xl h-fit">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 mb-3 flex items-center gap-1.5">
                          <Upload className="w-3.5 h-3.5 text-primary" /> Attach Evidence
                        </h3>
                        
                        <form onSubmit={handleUploadEvidence} className="space-y-3.5">
                          <div>
                            <label className="block text-[10px] text-muted font-bold uppercase mb-1">Upload File</label>
                            <input
                              type="file"
                              onChange={handleEvidenceFileChange}
                              className="w-full text-xs text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-[10px] file:font-bold file:uppercase file:bg-primary file:text-white hover:file:bg-primary/90 cursor-pointer"
                            />
                          </div>

                          {uploadFile.filename && (
                            <div className="p-2.5 bg-[#141628] rounded border border-cardBorder text-[10px] space-y-1 font-mono">
                              <div><strong>File:</strong> {uploadFile.filename}</div>
                              <div><strong>Type:</strong> {uploadFile.content_type}</div>
                            </div>
                          )}

                          <button
                            type="submit"
                            disabled={!uploadFile.filename || uploading}
                            className="w-full flex items-center justify-center gap-1.5 py-1.5 bg-primary hover:bg-primary/90 text-white text-xs font-bold uppercase rounded-lg disabled:opacity-40 transition-colors"
                          >
                            {uploading ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <>Upload & Anchor</>
                            )}
                          </button>
                        </form>
                      </div>

                      {/* Right: Evidence List */}
                      <div className="lg:col-span-2 space-y-3">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-muted mb-1">Attached Incidents Proofs ({evidenceList.length})</h3>
                        
                        {evidenceList.length === 0 ? (
                          <div className="p-6 bg-[#0b0e1e] border border-[#1e2240] rounded-xl text-center">
                            <Folder className="w-6 h-6 text-slate-700 mx-auto mb-1.5" />
                            <p className="text-xs text-muted">No evidence files attached to this case.</p>
                          </div>
                        ) : (
                          evidenceList.map(ev => (
                            <div key={ev.id} className="p-3 bg-[#0b0e1e] border border-[#1e2240] rounded-xl space-y-2 font-mono text-[10px] text-slate-300">
                              <div className="flex items-center justify-between gap-3 border-b border-[#1e2240]/40 pb-2">
                                <span className="font-sans font-bold text-xs text-slate-100 flex items-center gap-1.5">
                                  <FileText className="w-3.5 h-3.5 text-primary" /> {ev.filename}
                                </span>
                                <span className="text-muted">{formatSize(ev.size_bytes)}</span>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-muted">
                                <div><strong>SHA256:</strong> <span className="text-slate-200 select-all">{ev.sha256}</span></div>
                                <div><strong>MD5:</strong> <span className="text-slate-200 select-all">{ev.md5}</span></div>
                                <div><strong>Investigator:</strong> <span className="text-slate-200">{ev.investigator}</span></div>
                                <div><strong>Uploaded:</strong> <span className="text-slate-200">{new Date(ev.upload_time).toLocaleString()}</span></div>
                              </div>

                              {ev.stellar_tx_hash && !ev.stellar_tx_hash.startsWith("mock") && (
                                <div className="pt-2 border-t border-[#1e2240]/40 flex items-center justify-between">
                                  <span className="text-primary flex items-center gap-1 font-bold text-[9px] uppercase">
                                    <ShieldCheck className="w-3.5 h-3.5" /> Stellar Blockchain Anchored
                                  </span>
                                  <a
                                    href={`https://stellar.expert/explorer/testnet/tx/${ev.stellar_tx_hash}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="flex items-center gap-1 text-primary hover:underline font-bold text-[9px] uppercase"
                                  >
                                    Verify Ledger <ExternalLink className="w-2.5 h-2.5" />
                                  </a>
                                </div>
                              )}
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}

                  {/* COMMENTS TAB */}
                  {activeTab === "comments" && (
                    <div className="flex flex-col h-[400px] max-w-3xl bg-[#0b0e1e] border border-[#1e2240] rounded-xl overflow-hidden">
                      <div className="p-3 border-b border-[#1e2240] bg-[#090b16]">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-300">Investigator Collaboration Board</span>
                      </div>
                      
                      {/* Messages thread */}
                      <div className="flex-1 p-4 overflow-y-auto space-y-3.5">
                        {comments.length === 0 ? (
                          <div className="h-full flex flex-col items-center justify-center text-center p-4">
                            <MessageSquare className="w-8 h-8 text-slate-700 mb-1" />
                            <p className="text-xs text-muted">No messages posted in this case yet.</p>
                          </div>
                        ) : (
                          comments.map(c => (
                            <div key={c.id} className="flex flex-col space-y-1">
                              <div className="flex items-center gap-2 text-[10px] font-medium text-muted">
                                <span className="text-primary font-bold">{c.author}</span>
                                <span>•</span>
                                <span>{new Date(c.timestamp).toLocaleTimeString()}</span>
                              </div>
                              <div className="bg-[#141628] border border-cardBorder/60 px-3 py-2 rounded-lg text-xs text-slate-200 w-fit max-w-[85%] leading-relaxed">
                                {c.text}
                              </div>
                            </div>
                          ))
                        )}
                      </div>

                      {/* Chat Input */}
                      <form onSubmit={handleAddComment} className="border-t border-[#1e2240] p-2 bg-[#090b16] flex gap-2 items-center">
                        <input
                          type="text"
                          value={newComment}
                          onChange={(e) => setNewComment(e.target.value)}
                          placeholder="Type security briefing note..."
                          className="flex-1 bg-[#141628] border border-[#1e2240] rounded-lg px-3 py-1.5 text-xs text-slate-200 placeholder-muted focus:outline-none focus:border-primary"
                        />
                        <button
                          type="submit"
                          disabled={!newComment.trim()}
                          className="p-1.5 bg-primary text-white rounded-lg hover:bg-primary/80 transition-colors disabled:opacity-50"
                        >
                          <Send className="w-4 h-4" />
                        </button>
                      </form>
                    </div>
                  )}

                </div>

              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
                <Briefcase className="w-12 h-12 text-slate-700 mb-2.5" />
                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">No Active Case Selected</h2>
                <p className="text-xs text-muted mt-1 max-w-[280px]">Select a case from the list or create a new case to start incident tracking.</p>
              </div>
            )}
          </div>

        </div>

      </div>

      {/* NEW CASE MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#0a0c16] border border-[#1e2240] rounded-xl overflow-hidden shadow-2xl">
            <div className="px-5 py-3 border-b border-[#1e2240] bg-[#090b16] flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-200">Register Incident Case</span>
              <button onClick={() => setIsModalOpen(false)} className="text-muted hover:text-slate-200 text-xs font-bold">CANCEL</button>
            </div>

            <form onSubmit={handleCreateCase} className="p-5 space-y-4">
              <div>
                <label className="block text-[10px] uppercase tracking-wider text-muted font-bold mb-1">Case Title *</label>
                <input
                  type="text"
                  required
                  value={newCase.name}
                  onChange={(e) => setNewCase({ ...newCase, name: e.target.value })}
                  placeholder="e.g. AWS Admin Role Leakage"
                  className="w-full bg-[#141628] border border-[#1e2240] rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase tracking-wider text-muted font-bold mb-1">Description</label>
                <textarea
                  value={newCase.description}
                  onChange={(e) => setNewCase({ ...newCase, description: e.target.value })}
                  placeholder="Summarize the compromise vectors..."
                  rows={3}
                  className="w-full bg-[#141628] border border-[#1e2240] rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-primary resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-muted font-bold mb-1">Priority</label>
                  <select
                    value={newCase.priority}
                    onChange={(e) => setNewCase({ ...newCase, priority: e.target.value })}
                    className="w-full bg-[#141628] border border-[#1e2240] rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-primary"
                  >
                    <option value="Critical">Critical</option>
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-muted font-bold mb-1">Due Date</label>
                  <input
                    type="date"
                    value={newCase.due_date}
                    onChange={(e) => setNewCase({ ...newCase, due_date: e.target.value })}
                    className="w-full bg-[#141628] border border-[#1e2240] rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] uppercase tracking-wider text-muted font-bold mb-1">Tags (comma-separated)</label>
                <input
                  type="text"
                  value={newCase.tags}
                  onChange={(e) => setNewCase({ ...newCase, tags: e.target.value })}
                  placeholder="aws, rbac, compromised"
                  className="w-full bg-[#141628] border border-[#1e2240] rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase tracking-wider text-muted font-bold mb-1">Team Members (comma-separated emails)</label>
                <input
                  type="text"
                  value={newCase.team_members}
                  onChange={(e) => setNewCase({ ...newCase, team_members: e.target.value })}
                  placeholder="analyst@vektra.io, ciso@vektra.io"
                  className="w-full bg-[#141628] border border-[#1e2240] rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-primary"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2 bg-primary hover:bg-primary/90 text-white text-xs font-bold uppercase rounded-lg transition-colors"
              >
                Create Case
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
