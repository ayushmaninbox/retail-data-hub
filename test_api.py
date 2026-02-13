import urllib.request
import json

try:
    with urllib.request.urlopen("http://localhost:8000/api/operations") as response:
        data = json.loads(response.read().decode())
        by_carrier = data.get("delivery_times", {}).get("by_carrier", [])
        if by_carrier:
            print(f"Number of carriers: {len(by_carrier)}")
            print(f"First carrier data: {json.dumps(by_carrier[0], indent=2)}")
            if "in_transit" in by_carrier[0]:
                print("SUCCESS: in_transit found in carrier data")
            else:
                print("FAILURE: in_transit NOT found in carrier data")
        else:
            print("FAILURE: No carrier data found")
except Exception as e:
    print(f"ERROR: {e}")
