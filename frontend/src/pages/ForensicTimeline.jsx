import React, { useEffect, useMemo, useState } from "react";
import { Calendar, Clock, FileSearch, Menu, Search, User } from "lucide-react";
import Sidebar from "../components/Sidebar";
import TopBar from "../components/TopBar";
import { getAuthHeaders, useVektraStore } from "../store/vektraStore";

const API_BASE = import.meta.env.VITE_API_URL ||
  (typeof window !== "undefined" && !["localhost", "127.0.0.1"].includes(window.location.hostname) ? "" : "http://localhost:8000");

export default function ForensicTimeline() {
  const { activeCaseId, setMobileSidebarOpen } = useVektraStore();
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!activeCaseId) {
      setEvents([]);
      return;
    }
    setLoading(true);
    setError("");
    fetch(`${API_BASE}/api/cases/${encodeURIComponent(activeCaseId)}/activity`, { headers: getAuthHeaders() })
      .then(async response => {
        if (!response.ok) throw new Error((await response.json()).detail || "Unable to load case activity.");
        return response.json();
      })
      .then(data => setEvents(Array.isArray(data) ? data : []))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [activeCaseId]);

  const filteredEvents = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return events;
    return events.filter(event => [event.action, event.actor, event.details].some(value => String(value || "").toLowerCase().includes(query)));
  }, [events, searchQuery]);

  return (
    <div className="flex min-h-screen bg-pageBg text-textMain">
      <Sidebar />
      <main className="min-w-0 flex-1">
        <TopBar />
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary"><Clock className="h-4 w-4" /> Verified case activity</div>
              <h1 className="text-2xl sm:text-3xl">Forensic timeline</h1>
              <p className="mt-2 text-sm text-muted">Only events persisted for your selected investigation case are shown. Vektra does not generate placeholder evidence.</p>
            </div>
            <button onClick={() => setMobileSidebarOpen(true)} className="rounded-lg border border-cardBorder bg-cardSurface p-2 text-muted lg:hidden" aria-label="Open navigation"><Menu className="h-5 w-5" /></button>
          </div>

          {!activeCaseId ? (
            <div className="rounded-xl border border-cardBorder bg-cardSurface p-10 text-center"><FileSearch className="mx-auto h-9 w-9 text-muted" /><h2 className="mt-4 text-base">Select a case first</h2><p className="mt-2 text-sm text-muted">Open the Cases or Forensic Ingestion page and choose a case to view its verified activity.</p></div>
          ) : <>
            <div className="mb-5 rounded-xl border border-cardBorder bg-cardSurface p-4">
              <label className="relative block"><Search className="absolute left-3 top-2.5 h-4 w-4 text-muted" /><input value={searchQuery} onChange={event => setSearchQuery(event.target.value)} placeholder="Search actions, actors, or details" className="w-full rounded-lg border border-cardBorder bg-pageBg py-2 pl-10 pr-4 text-sm outline-none focus:border-primary" /></label>
            </div>
            {error && <div className="mb-5 rounded-lg border border-danger/30 bg-danger/10 p-3 text-sm text-danger">{error}</div>}
            {loading ? <p className="text-sm text-muted">Loading verified case activity…</p> : filteredEvents.length === 0 ? <div className="rounded-xl border border-cardBorder bg-cardSurface p-10 text-center text-sm text-muted">No activity has been recorded for this case.</div> :
              <div className="grid gap-5 lg:grid-cols-[1.5fr_1fr]">
                <div className="space-y-3 border-l border-cardBorder pl-5">{filteredEvents.map(event => <button key={event.id} onClick={() => setSelectedEvent(event)} className="relative block w-full rounded-xl border border-cardBorder bg-cardSurface p-4 text-left hover:border-primary/50"><span className="absolute -left-[27px] top-5 h-3 w-3 rounded-full border-2 border-primary bg-pageBg" /><div className="flex flex-wrap items-center justify-between gap-2"><span className="font-mono text-[11px] text-muted">{event.timestamp}</span><span className="rounded border border-cardBorder px-2 py-0.5 font-mono text-[10px] text-primary">{event.action}</span></div><p className="mt-3 text-sm">{event.details}</p><p className="mt-2 flex items-center gap-1.5 text-xs text-muted"><User className="h-3 w-3" />{event.actor}</p></button>)}</div>
                <div>{selectedEvent ? <div className="sticky top-5 rounded-xl border border-cardBorder bg-cardSurface p-5"><div className="flex items-center gap-2 text-xs font-bold uppercase text-primary"><Calendar className="h-4 w-4" /> Event evidence</div><h2 className="mt-3 text-lg">{selectedEvent.action}</h2><dl className="mt-5 space-y-4 text-sm"><div><dt className="text-xs text-muted">Timestamp</dt><dd className="mt-1 font-mono">{selectedEvent.timestamp}</dd></div><div><dt className="text-xs text-muted">Actor</dt><dd className="mt-1 break-all">{selectedEvent.actor}</dd></div><div><dt className="text-xs text-muted">Recorded details</dt><dd className="mt-1 leading-6">{selectedEvent.details}</dd></div></dl></div> : <div className="rounded-xl border border-cardBorder bg-cardSurface p-8 text-center text-sm text-muted">Select an event to inspect its stored evidence.</div>}</div>
              </div>}
          </>}
        </div>
      </main>
    </div>
  );
}
