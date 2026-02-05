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
    parser.add_argument("--spec_id", required=True)
    parser.add_argument("--title", required=True)
    parser.add_argument("--description", required=True)
    parser.add_argument("--status", required=True)
    parser.add_argument("--list_id", required=True)

    args = parser.parse_args()

    if not CLICKUP_TOKEN:
        fail("CLICKUP_API_KEY is not set")

    headers = {
        "Authorization": CLICKUP_TOKEN,
        "Content-Type": "application/json"
    }

    payload = {
        "name": f"[{args.spec_id}] {args.title}",
        "description": args.description,
        "status": args.status
    }

    url = f"{CLICKUP_API_URL}/list/{args.list_id}/task"

    response = requests.post(url, json=payload, headers=headers)

    if response.status_code != 200:
        fail(f"ClickUp API error: {response.status_code} - {response.text}")

    data = response.json()
    print(f"[OK] Task created: {data.get('id')}")

if __name__ == "__main__":
    main()
