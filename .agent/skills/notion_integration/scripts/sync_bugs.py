import requests
import json
import notion_client
import sync_dashboard # Share get_project_state

DB_TITLE = "Indie Studio Bugs"

def find_database(headers):
    url = "https://api.notion.com/v1/search"
    payload = {
        "query": DB_TITLE,
        "filter": {
            "value": "database",
            "property": "object"
        },
        "sort": {
            "direction": "descending",
            "timestamp": "last_edited_time"
        }
    }
    response = requests.post(url, json=payload, headers=headers)
    if response.status_code != 200:
        return None
    
    results = response.json().get("results", [])
    if results:
        return results[0].get("id")
    return None

def sync_issues(headers, db_id, issues):
    # This is a one-way sync from State -> Notion for now.
    # To truly sync, we'd need to query existing items and update or add new ones.
    # For MVP: We just print what we WOULLD do, or add new items.
    
    print(f"Syncing {len(issues)} issues to Database {db_id}...")
    
    for issue in issues:
        # Check if issue already exists (by title usually)
        # This requires querying the DB.
        # MVP: Just create one to test, or skip if complex.
        # Let's just create one generic item for testing.
        create_issue_item(headers, db_id, issue)

def create_issue_item(headers, db_id, issue):
    url = "https://api.notion.com/v1/pages"
    payload = {
        "parent": { "database_id": db_id },
        "properties": {
            "Name": {
                "title": [
                    {
                        "text": {
                            "content": issue.get("description", "Unnamed Issue")
                        }
                    }
                ]
            },
            "Status": {
                "select": {
                    "name": "To Do"
                }
            },
           "Priority": {
                "select": {
                    "name": issue.get("priority", "MED")
                }
            }
        }
    }
    # Note: This will fail if "Status" or "Priority" properties don't exist in the DB schema.
    # So we should be careful. 
    # Safety: Only try to set Name first.
    payload["properties"] = {
        "Name": {
            "title": [
                {
                    "text": {
                        "content": issue.get("description", "Unnamed Issue")
                    }
                }
            ]
        }
    }
    
    requests.post(url, json=payload, headers=headers)

def main():
    headers = notion_client.get_notion_headers()
    state = sync_dashboard.get_project_state()
    issues = state.get("issues", [])
    
    if not issues:
        print("No issues to sync.")
        return

    print("Finding bugs database...")
    db_id = find_database(headers)
    
    if not db_id:
        print(f"[WARN] Database '{DB_TITLE}' not found. Please create it manually.")
        return
        
    sync_issues(headers, db_id, issues)

if __name__ == "__main__":
    main()
