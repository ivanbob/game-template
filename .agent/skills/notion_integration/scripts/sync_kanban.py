import os
import re
import hashlib
import notion_client 
import requests

# DB Configuration
DB_TITLE = "Indie Studio Tasks"

STATUS_MAP = {
    '[ ]': 'To Do',
    '[/]': 'In Progress',
    '[x]': 'Done'
}

COLORS = {
    'To Do': 'gray',
    'In Progress': 'blue',
    'Done': 'green'
}

import argparse

def parse_task_md(task_path):
    if not os.path.exists(task_path):
        print(f"File not found: {task_path}")
        return []
    
    with open(task_path, 'r', encoding='utf-8') as f:
        lines = f.readlines()
        
    tasks = []
    hierarchy = {} # indent -> task_key
    
    for i, line in enumerate(lines):
        line_stripped = line.strip()
        if not line_stripped.startswith('- ['):
            continue
            
        # Parse Intent/Indent
        indent = len(line) - len(line.lstrip())
        
        # Regex to extract status and content
        # Matches "- [x] Task Name <!-- id: 123 -->"
        match = re.match(r'-\s*\[([\s/xX])\]\s*(.*?)(?:\s*<!--\s*id:\s*(\w+)\s*-->)?$', line_stripped)
        
        if not match:
            continue
            
        status_char = f"[{match.group(1)}]"
        content = match.group(2).strip()
        manual_id = match.group(3)
        
        status = STATUS_MAP.get(status_char.lower().replace('x', 'x'), 'To Do')
        
        # Create a unique key for tracking (Name + Index to handle duplicates, though duplicates are bad)
        # Using hash of content for stability if moved slightly? 
        # Actually, let's use the content as the key for now.
        task_key = content
        
        # Determine Parent
        parent_key = None
        # Find the nearest parent with indent < current indent
        for lvl in range(indent - 1, -1, -1):
            if lvl in hierarchy:
                parent_key = hierarchy[lvl]
                break
                
        hierarchy[indent] = task_key
        
        tasks.append({
            "name": content,
            "status": status,
            "parent": parent_key,
            "manual_id": manual_id,
            "indent": indent
        })
        
    return tasks

def find_database(headers):
    url = "https://api.notion.com/v1/search"
    payload = {
        "query": DB_TITLE,
        "filter": {
            "value": "database",
            "property": "object"
        }
    }
    response = requests.post(url, json=payload, headers=headers)
    if response.status_code == 200:
        for res in response.json().get('results', []):
            if res['title'][0]['text']['content'] == DB_TITLE:
                return res['id']
    return None

def create_database(headers, parent_page_id):
    url = "https://api.notion.com/v1/databases"
    payload = {
        "parent": {"type": "page_id", "page_id": parent_page_id},
        "title": [{"type": "text", "text": {"content": DB_TITLE}}],
        "properties": {
            "Task Name": {"title": {}},
            "Status": {
                "select": {
                    "options": [
                        {"name": "To Do", "color": "gray"},
                        {"name": "In Progress", "color": "blue"},
                        {"name": "Done", "color": "green"}
                    ]
                }
            },
            "Original ID": {"rich_text": {}},
            # Self-referencing relation for Sub-items
            "Parent Task": {
                "relation": {
                    "database_id": "REPLACE_ME_WITH_SELF_ID", # Tricky in creation, usually done in 2 steps
                    "type": "dual_property",
                    "dual_property": {}
                }
            }
        }
    }
    # Relation creation in one go is hard without ID. 
    # Let's create without Relation first, then update schema.
    del payload['properties']['Parent Task']
    
    response = requests.post(url, json=payload, headers=headers)
    if response.status_code != 200:
        notion_client.fail(f"Failed to create database: {response.text}")
        
    db_id = response.json()['id']
    print(f"Created Database: {db_id}")
    
    # Update schema to add Parent Relation
    update_url = f"https://api.notion.com/v1/databases/{db_id}"
    update_payload = {
        "properties": {
            "Parent Task": {
                "relation": {
                    "database_id": db_id,
                    "type": "dual_property",
                    "dual_property": {}
                }
            },
            "Sub-Tasks": { # The other side of the relation
                "relation": {
                    "database_id": db_id,
                    "type": "dual_property",
                    "dual_property": {}
                }
             }
        }
    }
    # Simplified relation update (Notion API infers the dual property name if not specified or self-ref)
    # Actually, simpler to just add "Parent Item" and "Sub-item" to mimic Notion's native sub-items
    
    requests.patch(update_url, json=update_payload, headers=headers)
    return db_id

def get_existing_pages(headers, db_id):
    url = f"https://api.notion.com/v1/databases/{db_id}/query"
    has_more = True
    next_cursor = None
    pages = {} # Name -> ID
    
    while has_more:
        payload = {"start_cursor": next_cursor} if next_cursor else {}
        response = requests.post(url, json=payload, headers=headers)
        data = response.json()
        
        for result in data['results']:
            props = result['properties']
            name_prop = props.get('Task Name', {}).get('title', [])
            if name_prop:
                name = name_prop[0]['text']['content']
                pages[name] = result['id']
                
        has_more = data.get('has_more', False)
        next_cursor = data.get('next_cursor')
        
    return pages

def sync_tasks(headers, db_id, tasks):
    print("Fetching existing Notion tasks...")
    existing_pages = get_existing_pages(headers, db_id)
    
    # 1. Upsert Tasks
    print(f"Syncing {len(tasks)} tasks...")
    
    # We need to map Name -> Notion Page ID to handle parents
    # Re-build map as we create/update
    current_page_map = existing_pages.copy()
    
    for task in tasks:
        name = task['name']
        status = task['status']
        manual_id = task.get('manual_id', '')
        
        props = {
            "Task Name": {"title": [{"text": {"content": name}}]},
            "Status": {"select": {"name": status}},
        }
        if manual_id:
             props["Original ID"] = {"rich_text": [{"text": {"content": manual_id}}]}
             
        # Resolve Parent (must exist)
        parent_name = task.get('parent')
        if parent_name and parent_name in current_page_map:
            parent_id = current_page_map[parent_name]
            props["Parent Task"] = {"relation": [{"id": parent_id}]}
        
        if name in current_page_map:
            # Update
            page_id = current_page_map[name]
            # Optimization: Check if update needed? For now, we update.
            # Notion API is rate limited (3 requests/sec average). 
            # We'll rely on small task list or just sequential requests.
            
            # Don't overwrite Parent Task if it wasn't specified in our hierarchy (preserve manual edits?)
            # No, we want strict sync for hierarchy.
            
            requests.patch(
                f"https://api.notion.com/v1/pages/{page_id}",
                json={"properties": props},
                headers=headers
            )
            # print(f"Updated: {name}")
        else:
            # Create
            payload = {
                "parent": {"database_id": db_id},
                "properties": props
            }
            res = requests.post("https://api.notion.com/v1/pages", json=payload, headers=headers)
            if res.status_code == 200:
                new_id = res.json()['id']
                current_page_map[name] = new_id
                print(f"Created: {name}")
            else:
                print(f"Failed to create {name}: {res.text}")

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("task_path", help="Path to task.md file")
    args = parser.parse_args()

    headers = notion_client.get_notion_headers()
    
    print(f"Parsing tasks from {args.task_path}...")
    tasks = parse_task_md(args.task_path)
    if not tasks:
        print("No tasks found.")
        return

    print("Locating database...")
    db_id = find_database(headers)
    if not db_id:
        print("Database not found. Finding Dashboard parent to create it in...")
        # Find Dashboard Page to put the DB in
        import sync_dashboard
        parent_id = sync_dashboard.find_dashboard(headers)
        if not parent_id:
            print("Dashboard not found. Creating orphan database? Better to create Dashboard first.")
            sync_dashboard.main() # Ensure content exists
            parent_id = sync_dashboard.find_dashboard(headers)
            
        db_id = create_database(headers, parent_id)
        
    sync_tasks(headers, db_id, tasks)
    print("Sync Complete.")

if __name__ == "__main__":
    main()
