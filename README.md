# Real-Time Multi-Modal Emotion Synthesis Engine MVP

A real-time emotion synthesis pipeline with replayable state and audit trail, built with **Flask (Python)** backend and **React (Vite)** frontend.

## Features & PRD Scope Compliance

1. **Real-time Event Ingestion (`POST /events`, `POST /api/events`)**:
   - Ingests multi-modal inputs: `camera` (facial emotion), `sensor` (heart rate BPM), and `label` (explicit user mood).
   - Validates timestamps (ISO 8601) and handles missing non-critical fields.
   - **Idempotency & Duplicate Prevention**: Accepts client-supplied `id` or generates UUID; duplicate event submissions return HTTP 200 with the existing record without duplicating state transitions.

2. **State Reconciliation Engine**:
   - Maintains a time-ordered, versioned emotional state using deterministic evidence weighting:
     $$\text{Score} = \text{Confidence} \times \text{Reliability} \times \text{Recency} \ (\times 1.20 \text{ bonus for recent user labels})$$
   - Handles out-of-order and late events by temporal re-sorting.

3. **Audio-Visual Synthesis & Output (`POST /recommendation`, `POST /api/recommendation`)**:
   - Generates playlist recommendations and an inline SVG visualization showing state and confidence level.
   - Returns structured `decision_log` tracing all modality inputs.

4. **Audit Trail & Replayability (`POST /replay`, `POST /api/replay`)**:
   - Logs events to `backend/data/events.jsonl` and state transitions to `backend/data/state_transitions.jsonl`.
   - Supports deterministic replay by event IDs.
   - React UI includes audit trail inspection and interactive event selection for instant replay.

---

## Getting Started

### 1. Backend Setup (Flask)

```bash
cd backend
# Activate virtual environment if not active
# Windows:
.\.venv\Scripts\python.exe app.py
# macOS/Linux:
# source .venv/bin/activate && python app.py
```
Backend runs on `http://localhost:5000`.

### 2. Frontend Setup (React / Vite)

In a separate terminal:

```bash
cd frontend
npm install
npm run dev
```
Open `http://localhost:5173` in your browser.

---

## Running Automated Tests

Run the test suite (covering duplicate events, out-of-order timestamps, conflicting inputs, replay consistency, missing data, and malformed payload rejection):

```bash
cd backend
.\.venv\Scripts\python.exe -m unittest test_app.py
```

---

## Edge Case Fixture & Replay Demo

A sample fixture containing $\ge 5$ interacting edge cases is located at `backend/edge_cases_fixture.json`:
- `evt_001`: Initial camera event (`happy`)
- `evt_002`: High heart rate sensor event (`110 BPM` $\rightarrow$ angry conflict)
- `evt_003` (Duplicate `evt_002`): Idempotent rejection test
- `evt_004`: Out-of-order / late user label event (`tired`)
- `evt_005`: Recent explicit user label event (`calm` mood override)

You can load these 5 edge cases directly into the system using the **⚡ Load 5 Edge Cases** button in the frontend dashboard.
