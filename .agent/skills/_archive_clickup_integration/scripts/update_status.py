import argparse
import os
import sys
import requests

CLICKUP_API_URL = "https://api.clickup.com/api/v2"
CLICKUP_TOKEN = os.getenv("CLICKUP_API_KEY")

def fail(msg):
    print(f"[ERROR] {msg}")
    sys.exit(1)

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--task_id", required=True)
    parser.add_argument("--status", required=True)

    args = parser.parse_args()

    if not CLICKUP_TOKEN:
        fail("CLICKUP_API_KEY is not set")

    headers = {
        "Authorization": CLICKUP_TOKEN,
        "Content-Type": "application/json"
    }

    payload = {
        "status": args.status
    }

    url = f"{CLICKUP_API_URL}/task/{args.task_id}"

    response = requests.put(url, json=payload, headers=headers)

    if response.status_code != 200:
        fail(f"ClickUp API error: {response.status_code} - {response.text}")

    print(f"[OK] Task {args.task_id} updated to '{args.status}'")

if __name__ == "__main__":
    main()
