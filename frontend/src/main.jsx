import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import PitchDeck from "./PitchDeck";
import "./styles.css";

const API = "/api";

function App() {
  const [viewMode, setViewMode] = useState("deck"); // Default to pitch deck first
  const [state, setState] = useState(null);
  const [events, setEvents] = useState([]);
  const [recommendation, setRecommendation] = useState(null);
  const [replayResult, setReplayResult] = useState(null);
  const [selectedEventIds, setSelectedEventIds] = useState([]);
  const [form, setForm] = useState({ type: "camera", emotion: "happy", heart_rate: 72, explicit_mood: "joyful", custom_id: "" });
  const [message, setMessage] = useState("");
  const [isConnected, setIsConnected] = useState(true);

  async function refresh() {
    try {
      const [s, e] = await Promise.all([
        fetch(`${API}/state`),
        fetch(`${API}/events`)
      ]);
      if (s.ok && e.ok) {
        setState(await s.json());
        setEvents(await e.json());
        setIsConnected(true);
      } else {
        setIsConnected(false);
      }
    } catch (err) {
      setIsConnected(false);
    }
  }

  useEffect(() => {
    refresh();
    const timer = setInterval(refresh, 1000);
    return () => clearInterval(timer);
  }, []);

  async function sendEvent(event) {
    try {
      const r = await fetch(`${API}/events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(event)
      });
      const data = await r.json();
      if (r.ok) {
        setMessage(data.duplicate ? `Duplicate Event Detected (${data.event.id})` : `Accepted ${data.event.type} event`);
      } else {
        setMessage(`Error: ${data.error}`);
      }
      await refresh();
    } catch (err) {
      setMessage(`Connection error: ${err.message}`);
    }
  }

  function submit(e) {
    e.preventDefault();
    const data = form.type === "camera"
      ? { emotion: form.emotion }
      : form.type === "sensor"
        ? { heart_rate: Number(form.heart_rate) }
        : { explicit_mood: form.explicit_mood };

    const payload = {
      type: form.type,
      timestamp: new Date().toISOString(),
      data
    };
    if (form.custom_id.trim()) {
      payload.id = form.custom_id.trim();
    }
    sendEvent(payload);
  }

  async function recommend() {
    try {
      const r = await fetch(`${API}/recommendation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ audience: "demo-user" })
      });
      if (r.ok) setRecommendation(await r.json());
    } catch (err) {
      setMessage(`Recommendation error: ${err.message}`);
    }
  }

  async function runReplay() {
    if (selectedEventIds.length === 0) {
      setMessage("Please select at least one event from the Audit Trail to replay.");
      return;
    }
    try {
      const r = await fetch(`${API}/replay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event_ids: selectedEventIds, audience: "replay-user" })
      });
      const data = await r.json();
      if (r.ok) {
        setReplayResult(data);
        setMessage(`Successfully replayed ${data.replayed_event_ids.length} event(s).`);
      } else {
        setMessage(`Replay error: ${data.error}`);
      }
    } catch (err) {
      setMessage(`Replay connection error: ${err.message}`);
    }
  }

  async function loadEdgeCases() {
    const edgeCases = [
      { id: "evt_001", type: "camera", timestamp: "2026-08-15T12:00:00Z", data: { emotion: "happy" } },
      { id: "evt_002", type: "sensor", timestamp: "2026-08-15T12:00:05Z", data: { heart_rate: 110 } },
      { id: "evt_002", type: "sensor", timestamp: "2026-08-15T12:00:05Z", data: { heart_rate: 110 } }, // duplicate
      { id: "evt_004", type: "label", timestamp: "2026-08-15T11:59:50Z", data: { explicit_mood: "tired" } }, // late / out-of-order
      { id: "evt_005", type: "label", timestamp: "2026-08-15T12:00:10Z", data: { explicit_mood: "calm" } }  // weighted mood
    ];
    for (const event of edgeCases) {
      await sendEvent(event);
      await new Promise(r => setTimeout(r, 150));
    }
    await recommend();
  }

  async function demo() {
    const now = Date.now();
    const sequence = [
      { type: "camera", timestamp: new Date(now).toISOString(), data: { emotion: "happy" } },
      { type: "sensor", timestamp: new Date(now + 5000).toISOString(), data: { heart_rate: 92 } },
      { type: "label", timestamp: new Date(now + 8000).toISOString(), data: { explicit_mood: "joyful" } }
    ];
    for (const event of sequence) {
      await sendEvent(event);
      await new Promise(r => setTimeout(r, 200));
    }
    await recommend();
  }

  async function reset() {
    await fetch(`${API}/reset`, { method: "POST" });
    setRecommendation(null);
    setReplayResult(null);
    setSelectedEventIds([]);
    setMessage("State reset successfully");
    refresh();
  }

  const latest = useMemo(() => [...events].sort((a, b) => b.timestamp.localeCompare(a.timestamp)), [events]);

  const toggleEventSelect = (id) => {
    setSelectedEventIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedEventIds.length === events.length) {
      setSelectedEventIds([]);
    } else {
      setSelectedEventIds(events.map(e => e.id));
    }
  };

  if (viewMode === "deck") {
    return <PitchDeck onMoveToDashboard={() => setViewMode("dashboard")} />;
  }

  return (
    <main className="page">
      <header>
        <div>
          <p className="eyebrow">REAL-TIME MULTI-MODAL MVP</p>
          <h1>Emotion Synthesis Engine</h1>
          <p className="subtitle">Camera + heart rate + user label → deterministic emotional state</p>
        </div>
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <button className="deck-toggle-btn" onClick={() => setViewMode("deck")}>
            ← Pitch Deck
          </button>
          <span className={isConnected ? "status-online" : "status-offline"}>
            {isConnected ? "● Backend Connected" : "○ Disconnected"}
          </span>
          <button className="secondary" onClick={reset}>Reset</button>
        </div>
      </header>

      <section className="grid">
        {/* State Card */}
        <div className="card">
          <div className="title">
            <h2>Unified State</h2>
            <span className="live">● LIVE</span>
          </div>
          <div className="emotion">
            <div className={`orb ${state?.primary_emotion || "neutral"}`}>
              {state?.primary_emotion || "neutral"}
            </div>
            <div>
              <div className="big">{Math.round((state?.confidence || 0) * 100)}%</div>
              <div className="muted">confidence</div>
            </div>
          </div>
          <div className="meta">
            <span>Version <b>{state?.version || 0}</b></span>
            <span>Source <b>{state?.source || "—"}</b></span>
            <span>Updated <b>{state?.timestamp || "—"}</b></span>
          </div>
        </div>

        {/* Send Event Card */}
        <div className="card">
          <h2>Send Event</h2>
          <form onSubmit={submit}>
            <label>
              Modality
              <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                <option value="camera">Camera</option>
                <option value="sensor">Sensor</option>
                <option value="label">User label</option>
              </select>
            </label>
            {form.type === "camera" && (
              <label>
                Emotion
                <select value={form.emotion} onChange={e => setForm({ ...form, emotion: e.target.value })}>
                  <option>happy</option>
                  <option>sad</option>
                  <option>angry</option>
                  <option>neutral</option>
                </select>
              </label>
            )}
            {form.type === "sensor" && (
              <label>
                Heart rate (BPM)
                <input type="number" value={form.heart_rate} onChange={e => setForm({ ...form, heart_rate: e.target.value })} />
              </label>
            )}
            {form.type === "label" && (
              <label>
                Explicit mood
                <select value={form.explicit_mood} onChange={e => setForm({ ...form, explicit_mood: e.target.value })}>
                  <option>joyful</option>
                  <option>tired</option>
                  <option>stressed</option>
                  <option>calm</option>
                </select>
              </label>
            )}
            <label>
              Optional Event ID (for testing duplicate idempotency)
              <input type="text" placeholder="e.g. evt_001" value={form.custom_id} onChange={e => setForm({ ...form, custom_id: e.target.value })} />
            </label>
            <button type="submit">Send event</button>
          </form>
          <div style={{ display: "flex", gap: "8px", marginTop: "12px" }}>
            <button className="demo" onClick={demo}>▶ Run Demo</button>
            <button className="demo" onClick={loadEdgeCases}>⚡ Load 5 Edge Cases</button>
          </div>
          {message && <p className="message">{message}</p>}
        </div>

        {/* Recommendation Card */}
        <div className="card">
          <div className="title">
            <h2>Music Recommendation</h2>
            <button className="small" onClick={recommend}>Generate</button>
          </div>
          {recommendation ? (
            <>
              <div className="playlist">Playlist ID: {recommendation.music_playlist}</div>
              <div className="svg" dangerouslySetInnerHTML={{ __html: recommendation.visualization }} />
            </>
          ) : (
            <div className="empty">Generate a recommendation after sending events.</div>
          )}
        </div>

        {/* Replay Result Card */}
        <div className="card">
          <div className="title">
            <h2>Determinism & Event Replay</h2>
            <button className="small" onClick={runReplay}>Replay Selected ({selectedEventIds.length})</button>
          </div>
          {replayResult ? (
            <div style={{ marginTop: "14px" }}>
              <p className="muted" style={{ fontSize: "12px", margin: "0 0 8px 0" }}>
                Replayed {replayResult.replayed_event_ids.length} event(s). Primary emotion: <strong>{replayResult.deterministic_result?.state?.primary_emotion}</strong>
              </p>
              <div className="playlist">Playlist: {replayResult.deterministic_result?.music_playlist}</div>
              <div className="svg" dangerouslySetInnerHTML={{ __html: replayResult.deterministic_result?.visualization }} />
            </div>
          ) : (
            <div className="empty">Select events from the audit trail below and click "Replay Selected".</div>
          )}
        </div>

        {/* Audit Trail Card */}
        <div className="card events">
          <div className="title">
            <h2>Audit Trail ({events.length} events)</h2>
            {events.length > 0 && (
              <button className="small" onClick={toggleSelectAll}>
                {selectedEventIds.length === events.length ? "Deselect All" : "Select All for Replay"}
              </button>
            )}
          </div>
          <div className="event-list">
            {latest.length === 0 ? (
              <div className="empty">No events ingested yet.</div>
            ) : (
              latest.map(e => (
                <div key={e.id} className={`event ${selectedEventIds.includes(e.id) ? "selected" : ""}`}>
                  <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                    <input
                      type="checkbox"
                      checked={selectedEventIds.includes(e.id)}
                      onChange={() => toggleEventSelect(e.id)}
                    />
                    <div>
                      <strong>{e.type}</strong>
                      <span>{e.timestamp}</span>
                      <span className="muted" style={{ fontSize: "10px" }}>ID: {e.id}</span>
                    </div>
                  </div>
                  <code>{JSON.stringify(e.data)}</code>
                </div>
              ))
            )}
          </div>
        </div>
      </section>
    </main>
  );
}

createRoot(document.getElementById("root")).render(<App />);
