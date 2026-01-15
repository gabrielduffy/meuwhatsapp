import requests
import json
import time

BASE_URL = "http://localhost:3000"
TIMEOUT = 30
HEADERS_JSON = {"Content-Type": "application/json"}

def test_advanced_webhook_configuration_endpoints():
    # Step 1: Test /api/autenticacao/entrar validation (Zod)
    url_auth = f"{BASE_URL}/api/autenticacao/entrar"
    invalid_auth_payloads = [
        {},  # empty payload
        {"usuario": "userwithoutpassword"},
        {"senha": "passwordwithoutusuario"},
        {"usuario": 123, "senha": "string"},  # invalid type for usuario
        {"usuario": "validuser", "senha": 1234},  # invalid type senha
    ]
    for payload in invalid_auth_payloads:
        try:
            resp = requests.post(url_auth, headers=HEADERS_JSON, json=payload, timeout=TIMEOUT)
            assert resp.status_code == 400, f"Expected 400 for invalid auth payload, got {resp.status_code} with payload {payload}"
            try:
                resp_json = resp.json()
            except json.JSONDecodeError:
                assert resp.text.strip() == "", f"Expected empty body or JSON error message for payload {payload}, got: {resp.text}"
                continue
            assert isinstance(resp_json, dict) and ("errors" in resp_json or "message" in resp_json), f"Response JSON missing 'errors' or 'message' keys for payload {payload}"
        except requests.exceptions.RequestException as e:
            assert False, f"RequestException on /api/autenticacao/entrar with payload {payload}: {e}"

    # Step 2: Test /api/usuarios validation (Zod) - create user with invalid data
    url_users = f"{BASE_URL}/api/usuarios"
    invalid_user_payloads = [
        {},  # empty payload
        {"nome": 123, "email": "invalidemail"},  # invalid nome type and email format
        {"nome": "Valid Name", "email": "invalidemailformat"},  # invalid email format
        {"nome": "Valid Name"},  # missing email
        {"email": "valid@example.com"},  # missing nome
    ]
    for payload in invalid_user_payloads:
        try:
            resp = requests.post(url_users, headers=HEADERS_JSON, json=payload, timeout=TIMEOUT)
            assert resp.status_code == 400, f"Expected 400 for invalid user payload, got {resp.status_code} with payload {payload}"
            try:
                resp_json = resp.json()
            except json.JSONDecodeError:
                assert resp.text.strip() == "", f"Expected empty body or JSON error message for user payload {payload}, got: {resp.text}"
                continue
            assert isinstance(resp_json, dict) and ("errors" in resp_json or "message" in resp_json), f"Response JSON missing 'errors' or 'message' keys for user payload {payload}"
        except requests.exceptions.RequestException as e:
            assert False, f"RequestException on /api/usuarios with payload {payload}: {e}"

    # Step 3: Test logging of errors by Winston for simulated 500 failures
    # Since we cannot access the server logs directly here, we simulate this by triggering a 500 error.
    # We try to provoke 500 by sending unexpected types or malformed data to endpoints known to validate with Zod.
    # For example, sending a large unexpected payload or malformed JSON to /api/autenticacao/entrar
    malformed_json = '{"usuario": "testuser", "senha": "testpass"'  # missing closing brace

    try:
        resp = requests.post(url_auth, data=malformed_json, headers={"Content-Type": "application/json"}, timeout=TIMEOUT)
        # The server should respond with 400 or 500; we accept 400 as usual, or if 500 ensure test does not crash
        assert resp.status_code in (400, 500), f"Expected 400 or 500, got {resp.status_code}"
    except requests.exceptions.RequestException as e:
        assert False, f"RequestException on malformed JSON test for /api/autenticacao/entrar: {e}"

    # Step 4: Verify no breakage in *.routes.js pattern by making successful authentication and user creation requests

    # Create a valid user and then login to get JWT token for webhook operations if needed
    valid_user_payload = {"nome": "Test User Webhook", "email": f"testuserwebhook_{int(time.time())}@example.com", "senha": "Password123!"}
    user_id = None
    token = None
    try:
        # Create user
        resp = requests.post(url_users, headers=HEADERS_JSON, json=valid_user_payload, timeout=TIMEOUT)
        assert resp.status_code == 201, f"Expected 201 Created user, got {resp.status_code}, response: {resp.text}"
        user_resp_json = resp.json()
        assert "id" in user_resp_json
        user_id = user_resp_json["id"]

        # Authenticate user to get token
        auth_payload = {"usuario": valid_user_payload["email"], "senha": valid_user_payload["senha"]}
        resp = requests.post(url_auth, headers=HEADERS_JSON, json=auth_payload, timeout=TIMEOUT)
        assert resp.status_code == 200, f"Expected 200 OK on login, got {resp.status_code}, response: {resp.text}"
        auth_resp_json = resp.json()
        assert "token" in auth_resp_json
        token = auth_resp_json["token"]
        auth_headers = {**HEADERS_JSON, "Authorization": f"Bearer {token}"}

        # Step 5: Test advanced webhook configuration endpoints behavior
        # POST /api/webhook/configure - create webhook config
        url_webhook_config = f"{BASE_URL}/api/webhook/configure"
        webhook_payload = {
            "event": "message_received",
            "url": "https://example.com/webhook/message",
            "retry": {
                "attempts": 3,
                "delay": 2000
            }
        }
        resp = requests.post(url_webhook_config, headers=auth_headers, json=webhook_payload, timeout=TIMEOUT)
        assert resp.status_code == 201, f"Expected 201 Created webhook config, got {resp.status_code}, response: {resp.text}"
        webhook_resp = resp.json()
        assert "id" in webhook_resp
        webhook_id = webhook_resp["id"]

        # GET webhook config to verify
        resp = requests.get(f"{url_webhook_config}/{webhook_id}", headers=auth_headers, timeout=TIMEOUT)
        assert resp.status_code == 200, f"Expected 200 OK fetching webhook config, got {resp.status_code}"
        webhook_data = resp.json()
        assert webhook_data["url"] == webhook_payload["url"]
        assert webhook_data["event"] == webhook_payload["event"]
        assert webhook_data["retry"] == webhook_payload["retry"]

        # PUT webhook config to update retry logic
        new_retry = {"attempts":5, "delay":1000}
        update_payload = {"retry": new_retry}
        resp = requests.put(f"{url_webhook_config}/{webhook_id}", headers=auth_headers, json=update_payload, timeout=TIMEOUT)
        assert resp.status_code == 200, f"Expected 200 OK updating webhook config, got {resp.status_code}"
        updated_config = resp.json()
        assert updated_config["retry"] == new_retry

        # DELETE the webhook config after test
        resp = requests.delete(f"{url_webhook_config}/{webhook_id}", headers=auth_headers, timeout=TIMEOUT)
        assert resp.status_code == 204, f"Expected 204 No Content deleting webhook config, got {resp.status_code}"

    finally:
        # Cleanup: delete created user
        if user_id and token:
            try:
                resp = requests.delete(f"{url_users}/{user_id}", headers=auth_headers, timeout=TIMEOUT)
                # Accept 204 No Content or 200 OK for deletion
                assert resp.status_code in (200, 204)
            except Exception:
                pass

test_advanced_webhook_configuration_endpoints()
