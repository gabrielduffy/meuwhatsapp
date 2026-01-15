import requests
import json

BASE_URL = "http://localhost:3000"
TIMEOUT = 30
HEADERS_JSON = {"Content-Type": "application/json"}


def test_user_authentication_endpoints():
    session = requests.Session()
    session.headers.update(HEADERS_JSON)

    # 1) Test registration (/api/usuarios) with valid input - expect success 201 or 200
    valid_registration_payload = {
        "nome": "Test User",
        "email": "testuser@example.com",
        "senha": "StrongPassw0rd!"
    }

    # 2) Test registration (/api/usuarios) with invalid input - Zod validation error expected (400)
    invalid_registration_payload = {
        "nome": "",  # likely invalid empty name
        "email": "not-an-email",
        "senha": "123"  # likely invalid due to password policy
    }

    # 3) Test login (/api/autenticacao/entrar) with valid credentials - expect 200 with JWT token
    # 4) Test login (/api/autenticacao/entrar) with invalid payload - Zod validation error expected (400)
    # 5) Test login (/api/autenticacao/entrar) with wrong credentials - expect 401 Unauthorized

    # 6) Test password recovery (/api/autenticacao/recuperar-senha) - send email, expect 200 or 204
    # Since endpoint path is not explicitly mentioned in PRD, guessing the route

    # Helper function to check for Winston error log on 500
    def check_winston_logging(resp):
        # Since we can't access server logs from test, simulate by checking status_code == 500
        # In real scenario, we would verify logs separately or via exposed log endpoint.
        assert resp.status_code != 500, "Server error 500 occurred, expected Winston to log this."

    # Register user (valid)
    try:
        response = session.post(f"{BASE_URL}/api/usuarios", json=valid_registration_payload, timeout=TIMEOUT)
        check_winston_logging(response)
        assert response.status_code in (200, 201), f"Expected 200 or 201 on valid registration, got {response.status_code}"
        resp_json = response.json()
        assert "id" in resp_json or "usuario" in resp_json, "Response missing user id"
        user_id = resp_json.get("id") or (resp_json.get("usuario") and resp_json["usuario"].get("id"))
        assert user_id is not None
    except requests.RequestException as e:
        assert False, f"Request failed during valid registration: {e}"

    # Register user (invalid payload - Zod validation)
    try:
        response = session.post(f"{BASE_URL}/api/usuarios", json=invalid_registration_payload, timeout=TIMEOUT)
        # Expecting 400 Bad Request due to Zod validation error
        assert response.status_code == 400, f"Expected 400 on invalid registration payload, got {response.status_code}"
        check_winston_logging(response)
        error_json = response.json()
        assert "errors" in error_json or "message" in error_json, "Expected validation error details in response"
    except requests.RequestException as e:
        assert False, f"Request failed during invalid registration test: {e}"

    # Login with valid credentials
    login_payload = {
        "email": valid_registration_payload["email"],
        "senha": valid_registration_payload["senha"]
    }
    try:
        response = session.post(f"{BASE_URL}/api/autenticacao/entrar", json=login_payload, timeout=TIMEOUT)
        check_winston_logging(response)
        assert response.status_code == 200, f"Expected 200 on valid login, got {response.status_code}"
        resp_json = response.json()
        assert "token" in resp_json, "Response missing JWT token"
        jwt_token = resp_json["token"]
        assert isinstance(jwt_token, str) and len(jwt_token) > 0
    except requests.RequestException as e:
        assert False, f"Request failed during valid login: {e}"

    # Login with invalid payload (Zod validation)
    invalid_login_payload = {
        "email": "invalid-email-format",
        "senha": ""
    }
    try:
        response = session.post(f"{BASE_URL}/api/autenticacao/entrar", json=invalid_login_payload, timeout=TIMEOUT)
        assert response.status_code == 400, f"Expected 400 on invalid login payload, got {response.status_code}"
        check_winston_logging(response)
        error_json = response.json()
        assert "errors" in error_json or "message" in error_json
    except requests.RequestException as e:
        assert False, f"Request failed during invalid login payload test: {e}"

    # Login with wrong credentials (incorrect password)
    wrong_login_payload = {
        "email": valid_registration_payload["email"],
        "senha": "WrongPassword123!"
    }
    try:
        response = session.post(f"{BASE_URL}/api/autenticacao/entrar", json=wrong_login_payload, timeout=TIMEOUT)
        assert response.status_code == 401, f"Expected 401 on wrong credentials login, got {response.status_code}"
        check_winston_logging(response)
    except requests.RequestException as e:
        assert False, f"Request failed during wrong credentials login test: {e}"

    # Password recovery endpoint test (guess route /api/autenticacao/recuperar-senha)
    recovery_payload = {
        "email": valid_registration_payload["email"]
    }
    try:
        response = session.post(f"{BASE_URL}/api/autenticacao/recuperar-senha", json=recovery_payload, timeout=TIMEOUT)
        check_winston_logging(response)
        assert response.status_code in (200, 204), f"Expected 200 or 204 on password recovery, got {response.status_code}"
    except requests.RequestException as e:
        assert False, f"Request failed during password recovery test: {e}"

    # JWT token management verification: verify token usability by accessing a protected route
    # Choose /api/usuarios with Authorization header Bearer token (GET)
    try:
        auth_headers = {
            "Authorization": f"Bearer {jwt_token}"
        }
        response = session.get(f"{BASE_URL}/api/usuarios", headers=auth_headers, timeout=TIMEOUT)
        check_winston_logging(response)
        assert response.status_code == 200, f"Expected 200 accessing /api/usuarios with valid JWT, got {response.status_code}"
    except requests.RequestException as e:
        assert False, f"Request failed during JWT token validation test: {e}"

    # Clean up: delete created user if supported
    # Assuming a DELETE endpoint /api/usuarios/{id} and JWT auth required:
    if user_id is not None:
        try:
            auth_headers = {
                "Authorization": f"Bearer {jwt_token}"
            }
            del_response = session.delete(f"{BASE_URL}/api/usuarios/{user_id}", headers=auth_headers, timeout=TIMEOUT)
            check_winston_logging(del_response)
            assert del_response.status_code in (200, 204), f"Expected 200 or 204 on user deletion, got {del_response.status_code}"
        except requests.RequestException as e:
            # Log but don't fail cleanup
            pass


test_user_authentication_endpoints()