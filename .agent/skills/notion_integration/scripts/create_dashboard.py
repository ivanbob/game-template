import requests
import json
import notion_client

# Configuration
DASHBOARD_TITLE = "Indie Studio Master Dashboard"
PARENT_PAGE_TITLE = "The Daily Cipher" # Fallback parent title
PARENT_PAGE_ID = "56ee8af7-2a1a-4ab0-9a10-e8730e0d7fb9" # Hardcoded ID from user chat

def find_page(headers, title):
    url = "https://api.notion.com/v1/search"
    payload = {
        "query": title,
        "filter": {
            "value": "page",
            "property": "object"
        },
        "sort": {
            "direction": "descending",
            "timestamp": "last_edited_time"
        }
    }
    response = requests.post(url, json=payload, headers=headers)
    if response.status_code != 200:
        notion_client.fail(f"Search failed: {response.text}")
    
    results = response.json().get("results", [])
    for page in results:
        # Check if title matches exactly (Notion search is fuzzy)
        props = page.get("properties", {})
        title_prop = props.get("title", {}).get("title", [])
        if title_prop and title_prop[0].get("plain_text") == title:
            return page.get("id")
    return None

def create_page(headers, parent_id, title):
    url = "https://api.notion.com/v1/pages"
    payload = {
        "parent": { "page_id": parent_id },
        "properties": {
            "title": [
                {
                    "text": {
                        "content": title
                    }
                }
            ]
        },
        "children": [
            {
                "object": "block",
                "type": "heading_1",
                "heading_1": {
                    "rich_text": [{ "text": { "content": "🚀 Project Dashboard" } }]
                }
            }
        ]
    }
    
    response = requests.post(url, json=payload, headers=headers)
    if response.status_code != 200:
        notion_client.fail(f"Create page failed: {response.text}")
        
    return response.json().get("id")

def main():
    headers = notion_client.get_notion_headers()
    
    print(f"Searching for existing '{DASHBOARD_TITLE}'...")
    page_id = find_page(headers, DASHBOARD_TITLE)
    
    if page_id:
        print(f"[OK] Dashboard found: {page_id}")
        return
    
    print(f"Dashboard not found. Creating under parent ID: {PARENT_PAGE_ID}...")
    try:
        new_id = create_page(headers, PARENT_PAGE_ID, DASHBOARD_TITLE)
        print(f"[OK] Dashboard created: {new_id}")
    except Exception as e:
        notion_client.fail(str(e))

if __name__ == "__main__":
    main()
