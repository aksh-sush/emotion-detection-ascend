
import json, time, requests
from pathlib import Path

BASE = "http://localhost:5000"
for event in json.loads(Path("dummy_events.json").read_text()):
    r = requests.post(f"{BASE}/events", json=event)
    print(r.status_code, r.json())
    time.sleep(.3)

time.sleep(1)
print("\nSTATE:", requests.get(f"{BASE}/state").json())
print("\nRECOMMENDATION:", requests.post(f"{BASE}/recommendation", json={"audience":"demo-user"}).json())
