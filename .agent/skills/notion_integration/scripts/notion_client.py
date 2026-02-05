import os
import sys
import requests

# Manually load .env file
def load_env():
    env_path = os.path.join(os.getcwd(), '.env')
    if os.path.exists(env_path):
        with open(env_path, 'r') as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith('#') or '=' not in line:
                    continue
                key, value = line.split('=', 1)
                os.environ[key.strip()] = value.strip()

load_env()

def get_notion_headers():
    token = os.getenv("NOTION_API_KEY")
    if not token:
        print("[ERROR] NOTION_API_KEY is not set in environment variables.")
        sys.exit(1)
    
    return {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
        "Notion-Version": "2022-06-28"
    }

def fail(msg):
    print(f"[ERROR] {msg}")
    sys.exit(1)
