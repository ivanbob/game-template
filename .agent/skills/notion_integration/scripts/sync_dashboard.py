import requests
import json
import os
import re
import notion_client
from datetime import datetime

DASHBOARD_TITLE = "Indie Studio Master Dashboard"

def get_project_state():
    state_path = os.path.join(os.getcwd(), 'project_state.json')
    if not os.path.exists(state_path):
        notion_client.fail(f"project_state.json not found at {state_path}")
    with open(state_path, 'r') as f:
        return json.load(f)

def find_dashboard(headers):
    import create_dashboard
    return create_dashboard.find_page(headers, DASHBOARD_TITLE)

def get_gdd_details():
    """Extract deep info from GDD file."""
    gdd_path = os.path.join(os.getcwd(), 'TheDailyCipher_GDD.md')
    if not os.path.exists(gdd_path):
        return None
    
    with open(gdd_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # 1. High-Level Concept
    concept_match = re.search(r'1\.2 High-Level Concept\s*\n\s*(.*?)(?=\n\n|\n1\.3|\n2\.)', content, re.DOTALL)
    concept = concept_match.group(1).strip() if concept_match else ""
    
    # 2. Pillars
    pillars_match = re.search(r'2\.1 Pillars\s*\n\s*(.*?)(?=\n\n|\n3\.)', content, re.DOTALL)
    pillars = [p.strip() for p in (pillars_match.group(1).split('\n') if pillars_match else []) if p.strip()]
    
    # 3. Core Loop
    loop_match = re.search(r'4\. CORE GAME LOOP\s*\n\s*(.*?)(?=\n\n|\n5\.)', content, re.DOTALL)
    loop = [l.strip() for l in (loop_match.group(1).split('\n') if loop_match else []) if l.strip()]

    # 4. Planned Features from GDD
    roadmap = []
    if "TON (optional)" in content: roadmap.append("TON Blockchain Integration (symbolic rewards split weekly/monthly)")
    if "13. ADS" in content: roadmap.append("Post-game Ad integration (revenue to prize pool)")
    if "Smart Contract" in content: roadmap.append("Transparent prize pool management via Smart Contract")

    return {
        "concept": concept.replace('\n', ' '),
        "pillars": pillars[:5],
        "loop": loop[:5],
        "roadmap": roadmap
    }

def get_specs_rich_summary():
    """Scan specs folder and extract functional descriptions."""
    specs_path = os.path.join(os.getcwd(), 'specs')
    if not os.path.exists(specs_path): return []
    
    specs = []
    for filename in sorted(os.listdir(specs_path)):
        if filename.endswith('.md') and (filename.startswith('TDC-SPEC-') or filename.startswith('TDC-ARCH-')):
            filepath = os.path.join(specs_path, filename)
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Extract header
            title_match = re.match(r'^#\s*(.+)', content)
            title = title_match.group(1).strip() if title_match else filename
            
            # Extract status
            status_match = re.search(r'Status:\s*(\w+)', content)
            status = status_match.group(1) if status_match else "UNKNOWN"
            
            # Extract functional summary (Motivation or first para)
            summary = ""
            motiv_match = re.search(r'Motivation:\s*(.+)', content)
            if motiv_match:
                summary = motiv_match.group(1).strip()
            else:
                # Get the first paragraph after metadata/header
                clean_content = re.sub(r'#.*?\n', '', content)
                clean_content = re.sub(r'```yaml.*?```', '', clean_content, flags=re.DOTALL)
                clean_content = re.sub(r'---\n', '', clean_content)
                summary_match = re.search(r'\n\n(.*?)\n\n', clean_content, re.DOTALL)
                if summary_match:
                    summary = summary_match.group(1).strip().replace('\n', ' ')
            
            # Trim summary
            summary = (summary[:80] + '...') if len(summary) > 80 else summary

            specs.append({
                "id": filename.replace('.md', ''),
                "title": title,
                "summary": summary,
                "status": status
            })
    
    return specs

def get_arch_details():
    arch_path = os.path.join(os.getcwd(), 'specs', 'TDC-ARCH-001.md')
    if not os.path.exists(arch_path): return None
    
    with open(arch_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Prod details
    prod_match = re.search(r'### 2\.1 Production.*?\*\*URL\*\*:\s*`([^`]+)`.*?\*\*Bot\*\*:\s*`([^`]+)`', content, re.DOTALL)
    prod_url = prod_match.group(1) if prod_match else "N/A"
    prod_bot = prod_match.group(2) if prod_match else "N/A"
    
    # Staging details
    stage_match = re.search(r'### 2\.2 Staging.*?\*\*URL\*\*:\s*`([^`]+)`.*?\*\*Bot\*\*:\s*`([^`]+)`', content, re.DOTALL)
    stage_url = stage_match.group(1) if stage_match else "N/A"
    stage_bot = stage_match.group(2) if stage_match else "N/A"
    
    return {
        "production": {"url": prod_url, "bot": prod_bot, "branch": "main"},
        "staging": {"url": stage_url, "bot": stage_bot, "branch": "staging"}
    }

def create_blocks(state):
    gdd = get_gdd_details()
    specs = get_specs_rich_summary()
    arch = get_arch_details()
    
    lifecycle = state.get("lifecycle", {})
    release = state.get("release", {})
    build = state.get("build", {})
    qa = state.get("qa", {})
    history = state.get("history", [])
    blockers = state.get("blockers", [])
    
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    blocks = [
        {"object": "block", "type": "heading_1", "heading_1": {"rich_text": [{"text": {"content": "🚀 Indie Studio Master Dashboard"}}]}},
        {"object": "block", "type": "quote", "quote": {"rich_text": [{"text": {"content": f"Sync Date: {now}"}}]}},
    ]

    # SECTION: GAME CONCEPT
    if gdd:
        blocks.append({"object": "block", "type": "heading_2", "heading_2": {"rich_text": [{"text": {"content": "🎮 Game Vision"}}]}})
        blocks.append({"object": "block", "type": "callout", "callout": {
            "rich_text": [{"text": {"content": f"{gdd['concept']}"}}],
            "icon": {"emoji": "💡"}
        }})
        blocks.append({"object": "block", "type": "paragraph", "paragraph": {"rich_text": [{"type": "text", "text": {"content": "Core Pillars: "}}]}})
        for p in gdd['pillars']:
            blocks.append({"object": "block", "type": "bulleted_list_item", "bulleted_list_item": {"rich_text": [{"text": {"content": p}}]}})

    # SECTION: CURRENT STATUS
    blocks.append({"object": "block", "type": "heading_2", "heading_2": {"rich_text": [{"text": {"content": "📊 Current Health"}}]}})
    blocks.append({"object": "block", "type": "table", "table": {
        "table_width": 2, "has_column_header": True, "children": [
            {"type": "table_row", "table_row": {"cells": [[{"text": {"content": "Metric"}}], [{"text": {"content": "Value"}}]]}},
            {"type": "table_row", "table_row": {"cells": [[{"text": {"content": "Current Phase"}}], [{"text": {"content": f"{lifecycle.get('current_phase')} (v{release.get('version')})"}}]]}},
            {"type": "table_row", "table_row": {"cells": [[{"text": {"content": "Build Status"}}], [{"text": {"content": f"{build.get('status')} ({build.get('build_id')})"}}]]}},
            {"type": "table_row", "table_row": {"cells": [[{"text": {"content": "QA Verdict"}}], [{"text": {"content": f"{qa.get('verdict')} – {qa.get('notes')}"}}]]}}
        ]
    }})

    # SECTION: ENVIRONMENTS
    if arch:
        blocks.append({"object": "block", "type": "heading_2", "heading_2": {"rich_text": [{"text": {"content": "🌐 Infrastructure"}}]}})
        blocks.append({"object": "block", "type": "table", "table": {
            "table_width": 3, "has_column_header": True, "children": [
                {"type": "table_row", "table_row": {"cells": [[{"text": {"content": "Env"}}], [{"text": {"content": "Branch"}}], [{"text": {"content": "Endpoint / Bot"}}]]}},
                {"type": "table_row", "table_row": {"cells": [[{"text": {"content": "Production"}}], [{"text": {"content": "main"}}], [{"text": {"content": f"{arch['production']['bot']} ({arch['production']['url']})"}}]]}},
                {"type": "table_row", "table_row": {"cells": [[{"text": {"content": "Staging"}}], [{"text": {"content": "staging"}}], [{"text": {"content": f"{arch['staging']['bot']} ({arch['staging']['url']})"}}]]}}
            ]
        }})

    # SECTION: FEATURE SPECS (DEEP DETAILS)
    if specs:
        blocks.append({"object": "block", "type": "heading_2", "heading_2": {"rich_text": [{"text": {"content": f"📋 Specification Repository ({len(specs)} entries)"}}]}})
        for s in specs:
            icon = "✅" if s['status'] in ['IMPLEMENTED', 'APPROVED'] else "🛠️"
            blocks.append({"object": "block", "type": "paragraph", "paragraph": {"rich_text": [
                {"type": "text", "text": {"content": f"{icon} {s['id']}: "}},
                {"type": "text", "text": {"content": f"{s['summary']}"}}
            ]}})

    # SECTION: FIXED BUGS & HISTORY
    blocks.append({"object": "block", "type": "heading_2", "heading_2": {"rich_text": [{"text": {"content": "📜 Recent history & fixed bugs"}}]}})
    if history:
        for item in reversed(history[-5:]):
            blocks.append({"object": "block", "type": "numbered_list_item", "numbered_list_item": {"rich_text": [{"text": {"content": f"{item.get('phase')}: {item.get('note')}"}}]}})
    else:
        blocks.append({"object": "block", "type": "paragraph", "paragraph": {"rich_text": [{"text": {"content": "No history records found."}}]}})

    # SECTION: PLANNED IMPROVEMENTS
    blocks.append({"object": "block", "type": "heading_2", "heading_2": {"rich_text": [{"text": {"content": "🗺️ Roadmap & Improvements"}}]}})
    planned = gdd['roadmap'] if gdd else []
    planned.append("Anonymous Stats API: Community fails/solves tracking & percentiles")
    for p in planned:
        blocks.append({"object": "block", "type": "to_do", "to_do": {"rich_text": [{"text": {"content": p}}], "checked": False}})

    return blocks

def update_page_content(headers, page_id, blocks):
    # Clear existing blocks
    url = f"https://api.notion.com/v1/blocks/{page_id}/children"
    response = requests.get(url, headers=headers)
    if response.status_code == 200:
        for block in response.json().get("results", []):
            requests.delete(f"https://api.notion.com/v1/blocks/{block['id']}", headers=headers)
    
    # Append new blocks in chunks of 50 to avoid API limits if needed (though we're likely below)
    payload = {"children": blocks}
    response = requests.patch(url, json=payload, headers=headers)
    if response.status_code != 200:
        notion_client.fail(f"Update failed: {response.text}")
    else:
        print("[OK] Dashboard updated with rich content.")

def main():
    headers = notion_client.get_notion_headers()
    state = get_project_state()
    page_id = find_dashboard(headers)
    
    if not page_id:
        import create_dashboard
        page_id = create_dashboard.create_page(headers, create_dashboard.PARENT_PAGE_ID, DASHBOARD_TITLE)
    
    update_page_content(headers, page_id, create_blocks(state))

if __name__ == "__main__":
    main()
