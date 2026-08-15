import unittest
import json
import time
from app import app, events, event_by_id, state, synthesize, reset

class EmotionSynthesisTestCase(unittest.TestCase):
    def setUp(self):
        self.client = app.test_client()
        self.client.post("/reset")

    def tearDown(self):
        self.client.post("/reset")

    def test_health_check(self):
        res = self.client.get("/health")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.get_json()["status"], "ok")

        res_api = self.client.get("/api/health")
        self.assertEqual(res_api.status_code, 200)

    def test_ingest_and_reconcile(self):
        payload = {
            "type": "camera",
            "timestamp": "2026-08-15T12:00:00Z",
            "data": {"emotion": "happy"}
        }
        res = self.client.post("/events", json=payload)
        self.assertEqual(res.status_code, 202)
        data = res.get_json()
        self.assertTrue(data["accepted"])
        self.assertIn("id", data["event"])

        time.sleep(0.1)

        state_res = self.client.get("/state")
        self.assertEqual(state_res.status_code, 200)
        st = state_res.get_json()
        self.assertEqual(st["primary_emotion"], "happy")
        self.assertEqual(st["version"], 1)

    def test_duplicate_events_idempotency(self):
        payload = {
            "id": "fixed_evt_001",
            "type": "sensor",
            "timestamp": "2026-08-15T12:00:00Z",
            "data": {"heart_rate": 95}
        }
        res1 = self.client.post("/events", json=payload)
        self.assertEqual(res1.status_code, 202)

        res2 = self.client.post("/events", json=payload)
        self.assertEqual(res2.status_code, 200)
        body2 = res2.get_json()
        self.assertTrue(body2.get("duplicate"))

        evts_res = self.client.get("/events")
        evts = evts_res.get_json()
        self.assertEqual(len(evts), 1)

    def test_out_of_order_and_late_events(self):
        e1 = {"type": "camera", "timestamp": "2026-08-15T12:05:00Z", "data": {"emotion": "happy"}}
        e2 = {"type": "camera", "timestamp": "2026-08-15T12:00:00Z", "data": {"emotion": "sad"}}

        self.client.post("/events", json=e1)
        self.client.post("/events", json=e2)

        time.sleep(0.1)

        evts_res = self.client.get("/events")
        evts = evts_res.get_json()
        self.assertEqual(len(evts), 2)
        self.assertEqual(evts[0]["data"]["emotion"], "sad")
        self.assertEqual(evts[1]["data"]["emotion"], "happy")

    def test_conflicting_inputs(self):
        camera = {"type": "camera", "timestamp": "2026-08-15T12:00:00Z", "data": {"emotion": "angry"}}
        label = {"type": "label", "timestamp": "2026-08-15T12:00:02Z", "data": {"explicit_mood": "joyful"}}
        
        self.client.post("/events", json=camera)
        self.client.post("/events", json=label)

        time.sleep(0.1)

        rec_res = self.client.post("/recommendation", json={"audience": "test_user"})
        self.assertEqual(rec_res.status_code, 200)
        rec = rec_res.get_json()
        self.assertIn("music_playlist", rec)
        self.assertEqual(rec["audience"], "test_user")
        self.assertEqual(len(rec["decision_log"]), 2)

    def test_replay_consistency(self):
        e1 = {"id": "rep_1", "type": "camera", "timestamp": "2026-08-15T12:00:00Z", "data": {"emotion": "happy"}}
        e2 = {"id": "rep_2", "type": "sensor", "timestamp": "2026-08-15T12:00:05Z", "data": {"heart_rate": 60}}

        self.client.post("/events", json=e1)
        self.client.post("/events", json=e2)

        time.sleep(0.1)

        replay_res = self.client.post("/replay", json={"event_ids": ["rep_1", "rep_2"]})
        self.assertEqual(replay_res.status_code, 200)
        rep_data = replay_res.get_json()
        self.assertEqual(rep_data["replayed_event_ids"], ["rep_1", "rep_2"])
        self.assertIn("deterministic_result", rep_data)

    def test_reject_malformed_events(self):
        bad_time = {"type": "camera", "timestamp": "invalid-date", "data": {"emotion": "happy"}}
        res1 = self.client.post("/events", json=bad_time)
        self.assertEqual(res1.status_code, 400)

        bad_type = {"type": "unknown", "timestamp": "2026-08-15T12:00:00Z", "data": {}}
        res2 = self.client.post("/events", json=bad_type)
        self.assertEqual(res2.status_code, 400)

if __name__ == "__main__":
    unittest.main()
