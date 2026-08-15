
from flask import Flask, request, jsonify
from flask_cors import CORS
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from pathlib import Path
import json, threading, uuid, math

BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
DATA_DIR.mkdir(exist_ok=True)
EVENTS_FILE = DATA_DIR / "events.jsonl"
TRANSITIONS_FILE = DATA_DIR / "state_transitions.jsonl"

app = Flask(__name__)
CORS(app)
executor = ThreadPoolExecutor(max_workers=2)
lock = threading.RLock()

events = []
event_by_id = {}
state = {
    "version": 0, "primary_emotion": "neutral", "confidence": 0.0,
    "timestamp": None, "source": None, "signals": {}
}

RELIABILITY = {"sensor": 1.00, "camera": 0.90, "label": 0.80}
CAMERA_CONFIDENCE = {"happy": .85, "sad": .85, "angry": .82, "neutral": .75}
LABEL_TO_EMOTION = {"joyful": "happy", "tired": "sad", "stressed": "angry", "calm": "neutral"}

def parse_timestamp(value):
    if not isinstance(value, str) or not value.strip():
        raise ValueError("timestamp must be an ISO 8601 string")
    raw = value.strip().replace("Z", "+00:00")
    dt = datetime.fromisoformat(raw)
    if dt.tzinfo is None:
        raise ValueError("timestamp must include a timezone")
    return dt.astimezone(timezone.utc)

def iso(dt):
    return dt.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")

def append_jsonl(path, obj):
    with path.open("a", encoding="utf-8") as f:
        f.write(json.dumps(obj, sort_keys=True, separators=(",", ":")) + "\n")

def infer_signal(event):
    t, d = event["type"], event["data"]

    if t == "camera":
        emotion = d.get("emotion")
        if emotion not in CAMERA_CONFIDENCE:
            raise ValueError("camera event requires a valid emotion")
        return {"emotion": emotion, "confidence": float(d.get("confidence", CAMERA_CONFIDENCE[emotion])), "source": "camera"}

    if t == "sensor":
        hr = d.get("heart_rate")
        if not isinstance(hr, (int, float)) or isinstance(hr, bool) or not math.isfinite(hr):
            raise ValueError("sensor event requires numeric heart_rate")
        if hr >= 100:
            emotion = "angry"
        elif hr >= 85:
            emotion = "happy"
        elif hr < 60:
            emotion = "sad"
        else:
            emotion = "neutral"
        confidence = round(.72 + .18 * min(abs(hr - 72) / 40.0, 1.0), 4)
        return {"emotion": emotion, "confidence": confidence, "source": "sensor", "heart_rate": hr}

    if t == "label":
        mood = d.get("explicit_mood")
        if mood not in LABEL_TO_EMOTION:
            raise ValueError("label event requires explicit_mood")
        return {"emotion": LABEL_TO_EMOTION[mood], "confidence": float(d.get("confidence", .95)),
                "source": "label", "explicit_mood": mood}

    raise ValueError("type must be camera, sensor, or label")

def score_signal(event, signal, newest_time):
    dt = parse_timestamp(event["timestamp"])
    age = max(0.0, (newest_time - dt).total_seconds())
    recency = 1.0 / (1.0 + age / 30.0)
    score = signal["confidence"] * RELIABILITY[signal["source"]] * recency
    if signal["source"] == "label" and age <= 30:
        score *= 1.20
    return score + dt.timestamp() * 1e-12

def synthesize(event_list):
    if not event_list:
        return {"version": 0, "primary_emotion": "neutral", "confidence": 0.0,
                "timestamp": None, "source": None, "signals": {}}

    ordered = sorted(event_list, key=lambda e: (e["timestamp"], e["id"]))
    newest = parse_timestamp(ordered[-1]["timestamp"])
    candidates, signals = [], {}

    for event in ordered:
        sig = infer_signal(event)
        item = {
            "event_id": event["id"], "type": event["type"], "timestamp": event["timestamp"],
            "emotion": sig["emotion"], "confidence": sig["confidence"],
            "score": round(score_signal(event, sig, newest), 8)
        }
        candidates.append(item)
        signals[event["id"]] = item

    winner = max(candidates, key=lambda x: (x["score"], x["timestamp"], x["event_id"]))
    return {
        "version": len(ordered),
        "primary_emotion": winner["emotion"],
        "confidence": round(min(winner["confidence"], 1.0), 4),
        "timestamp": winner["timestamp"], "source": winner["type"], "signals": signals
    }

def make_svg(emotion, confidence):
    palette = {
        "happy": ("#f5c542", "Happy"), "sad": ("#4c8bf5", "Sad"),
        "angry": ("#ef5350", "Angry"), "neutral": ("#9e9e9e", "Neutral")
    }
    color, label = palette.get(emotion, palette["neutral"])
    pct = round(max(0, min(confidence, 1)) * 100)
    width = 320 * pct / 100
    return f'''<svg xmlns="http://www.w3.org/2000/svg" width="520" height="230" viewBox="0 0 520 230">
<rect width="520" height="230" rx="18" fill="#111827"/>
<text x="260" y="52" text-anchor="middle" font-family="Arial" font-size="25" fill="white">Unified Emotional State</text>
<circle cx="260" cy="120" r="55" fill="{color}"/>
<text x="260" y="128" text-anchor="middle" font-family="Arial" font-size="22" font-weight="bold" fill="white">{label}</text>
<rect x="100" y="188" width="320" height="12" rx="6" fill="#374151"/>
<rect x="100" y="188" width="{width:.1f}" height="12" rx="6" fill="{color}"/>
<text x="260" y="218" text-anchor="middle" font-family="Arial" font-size="14" fill="#d1d5db">Confidence: {pct}%</text>
</svg>'''

def recommend(emotion):
    return {
        "happy": "playlist_happy_energy", "sad": "playlist_gentle_comfort",
        "angry": "playlist_calm_release", "neutral": "playlist_focus_flow"
    }.get(emotion, "playlist_focus_flow")

def recommendation_for(event_list, audience="demo-user"):
    result = synthesize(event_list)
    log = []
    for event in sorted(event_list, key=lambda e: (e["timestamp"], e["id"])):
        sig = infer_signal(event)
        item = {"event": event["type"], "event_id": event["id"],
                "timestamp": event["timestamp"], "confidence": round(sig["confidence"], 4)}
        if event["type"] == "camera":
            item["emotion"] = sig["emotion"]
        elif event["type"] == "sensor":
            item["heart_rate"] = sig["heart_rate"]
            item["emotion"] = sig["emotion"]
        else:
            item["explicit_mood"] = sig["explicit_mood"]
            item["emotion"] = sig["emotion"]
        log.append(item)
    return {
        "music_playlist": recommend(result["primary_emotion"]),
        "visualization": make_svg(result["primary_emotion"], result["confidence"]),
        "audience": audience, "state": result, "decision_log": log
    }

def process_event_async(event):
    global state
    with lock:
        ordered = sorted(events, key=lambda e: (e["timestamp"], e["id"]))
        state = synthesize(ordered)
        append_jsonl(TRANSITIONS_FILE, {
            "version": state["version"], "event_id": event["id"], "state": state
        })

def validate_event(payload):
    if not isinstance(payload, dict):
        raise ValueError("JSON body must be an object")
    t = payload.get("type")
    if t not in {"camera", "sensor", "label"}:
        raise ValueError("type must be camera, sensor, or label")
    timestamp = parse_timestamp(payload.get("timestamp"))
    data = payload.get("data", {})
    if not isinstance(data, dict):
        raise ValueError("data must be an object")
    if t == "camera" and data.get("emotion") not in CAMERA_CONFIDENCE:
        raise ValueError("camera data.emotion is invalid")
    if t == "sensor":
        hr = data.get("heart_rate")
        if not isinstance(hr, (int, float)) or isinstance(hr, bool) or not math.isfinite(hr):
            raise ValueError("sensor data.heart_rate must be numeric")
    if t == "label" and data.get("explicit_mood") not in LABEL_TO_EMOTION:
        raise ValueError("label data.explicit_mood is invalid")
    
    event_id = str(payload.get("id")).strip() if payload.get("id") else str(uuid.uuid4())
    return {"id": event_id, "type": t, "timestamp": iso(timestamp), "data": data}

@app.get("/favicon.ico")
@app.get("/api/favicon.ico")
def favicon():
    return "", 204

@app.get("/health")
@app.get("/api/health")
def health():
    return jsonify({"status": "ok"})

@app.get("/events")
@app.get("/api/events")
def get_events():
    with lock:
        return jsonify(sorted(events, key=lambda e: (e["timestamp"], e["id"])))

@app.post("/events")
@app.post("/api/events")
def ingest_event():
    try:
        event = validate_event(request.get_json(silent=True))
    except (ValueError, TypeError) as exc:
        return jsonify({"error": str(exc)}), 400
    with lock:
        if event["id"] in event_by_id:
            return jsonify({
                "accepted": True,
                "duplicate": True,
                "event": event_by_id[event["id"]],
                "message": "Duplicate event detected. State unchanged (idempotent)."
            }), 200
        events.append(event)
        event_by_id[event["id"]] = event
        events.sort(key=lambda e: (e["timestamp"], e["id"]))
        if len(events) > 100:
            del events[0]
        append_jsonl(EVENTS_FILE, event)
    executor.submit(process_event_async, event)
    return jsonify({"accepted": True, "event": event,
                    "message": "Event queued for asynchronous reconciliation."}), 202

@app.get("/state")
@app.get("/api/state")
def get_state():
    with lock:
        return jsonify(state)

@app.post("/recommendation")
@app.post("/api/recommendation")
def get_recommendation():
    payload = request.get_json(silent=True) or {}
    with lock:
        snapshot = list(events)
    return jsonify(recommendation_for(snapshot, payload.get("audience", "demo-user")))

@app.post("/replay")
@app.post("/api/replay")
def replay():
    payload = request.get_json(silent=True)
    if not isinstance(payload, dict) or not isinstance(payload.get("event_ids"), list):
        return jsonify({"error": 'Body must be {"event_ids": ["id1", "id2"]}'}), 400

    selected, missing = [], []
    with lock:
        for event_id in payload["event_ids"]:
            event = event_by_id.get(str(event_id))
            if event: selected.append(event)
            else: missing.append(event_id)

    if missing:
        return jsonify({"error": "Some event IDs were not found", "missing": missing}), 404

    return jsonify({
        "replayed_event_ids": payload["event_ids"],
        "deterministic_result": recommendation_for(selected, payload.get("audience", "replay-user"))
    })

@app.post("/reset")
@app.post("/api/reset")
def reset():
    global state
    with lock:
        events.clear()
        event_by_id.clear()
        state = {"version": 0, "primary_emotion": "neutral", "confidence": 0.0,
                 "timestamp": None, "source": None, "signals": {}}
        for p in (EVENTS_FILE, TRANSITIONS_FILE):
            if p.exists(): p.unlink()
    return jsonify({"reset": True})

def load_existing_events():
    if not EVENTS_FILE.exists(): return
    with EVENTS_FILE.open("r", encoding="utf-8") as f:
        for line in f:
            if line.strip():
                e = json.loads(line)
                events.append(e)
                event_by_id[e["id"]] = e
    events.sort(key=lambda e: (e["timestamp"], e["id"]))

load_existing_events()
state = synthesize(events)

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True, threaded=True)
