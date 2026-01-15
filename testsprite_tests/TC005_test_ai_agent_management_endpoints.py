import requests
import uuid

BASE_URL = "http://localhost:3000"
TIMEOUT = 30
AUTH_HEADERS = {"Content-Type": "application/json"}

def test_ai_agent_management_endpoints():
    # Generate random AI agent data for creation
    agent_data = {
        "name": f"TestAI-{uuid.uuid4()}",
        "personality": "Friendly",
        "voiceTone": "Professional",
        "businessContext": "Customer Support",
        "triggers": [
            {"trigger": "hello", "response": "Hello! How can I assist you today?"},
            {"trigger": "pricing", "response": "Our pricing details can be found on our website."}
        ],
        "active": True
    }
    
    # Step 1: Create AI Agent
    create_resp = requests.post(f"{BASE_URL}/api/ai-agents", json=agent_data, headers=AUTH_HEADERS, timeout=TIMEOUT)
    assert create_resp.status_code == 201, f"Creation failed: {create_resp.text}"
    created_agent = create_resp.json()
    assert "id" in created_agent, "Created agent response missing 'id'"
    agent_id = created_agent["id"]
    
    try:
        # Step 2: Get AI Agent by ID to confirm creation
        get_resp = requests.get(f"{BASE_URL}/api/ai-agents/{agent_id}", headers=AUTH_HEADERS, timeout=TIMEOUT)
        assert get_resp.status_code == 200, f"Failed to get agent: {get_resp.text}"
        agent_info = get_resp.json()
        assert agent_info["name"] == agent_data["name"]
        assert agent_info["personality"] == agent_data["personality"]
        assert agent_info["voiceTone"] == agent_data["voiceTone"]
        assert agent_info["businessContext"] == agent_data["businessContext"]
        assert agent_info["active"] is True
        # Validate triggers
        assert isinstance(agent_info.get("triggers"), list)
        assert any(t["trigger"] == "hello" and t["response"] == "Hello! How can I assist you today?" for t in agent_info["triggers"])

        # Step 3: Update AI Agent to disable it and change personality
        update_data = {
            "personality": "Helpful",
            "voiceTone": "Casual",
            "active": False
        }
        update_resp = requests.put(f"{BASE_URL}/api/ai-agents/{agent_id}", json=update_data, headers=AUTH_HEADERS, timeout=TIMEOUT)
        assert update_resp.status_code == 200, f"Update failed: {update_resp.text}"
        updated_agent = update_resp.json()
        assert updated_agent["personality"] == update_data["personality"]
        assert updated_agent["voiceTone"] == update_data["voiceTone"]
        assert updated_agent["active"] is False

        # Step 4: Validate Zod schema validation on AI Agent creation - send invalid payloads (missing required fields)
        invalid_payloads = [
            {},  # empty
            {"name": ""},  # name empty
            {"name": "AI-Agent", "personality": 123},  # wrong personality type
            {"name": "AI-Agent", "triggers": "not-an-array"}  # invalid triggers
        ]
        for invalid_payload in invalid_payloads:
            resp = requests.post(f"{BASE_URL}/api/ai-agents", json=invalid_payload, headers=AUTH_HEADERS, timeout=TIMEOUT)
            # Expect 400 Bad Request due to Zod validation failure
            assert resp.status_code == 400 or resp.status_code == 422, f"Invalid payload accepted: {resp.text}"

    finally:
        # Step 5: Delete AI Agent to cleanup
        del_resp = requests.delete(f"{BASE_URL}/api/ai-agents/{agent_id}", headers=AUTH_HEADERS, timeout=TIMEOUT)
        assert del_resp.status_code == 200 or del_resp.status_code == 204, f"Failed to delete agent: {del_resp.text}"

test_ai_agent_management_endpoints()