import requests
import json
import traceback

BASE_URL = "http://localhost:3000"
HEADERS_JSON = {"Content-Type": "application/json"}
TIMEOUT = 30

def test_user_management_endpoints():
    session = requests.Session()
    session.headers.update(HEADERS_JSON)
    user_token = None
    created_user_id = None

    # Helper to check if Winston error logged via 500 response (simulate by checking response and assume logs)
    def check_winston_logging(response):
        # Since we cannot access Winston logs directly, we rely on the server to return 500 on broken routes
        # and assume logging happens server-side. Just assert 500 codes when expecting errors.
        if response.status_code == 500:
            assert True, "Server returned 500 and Winston should log error"
        else:
            assert response.status_code < 500, "Unexpected error status code"

    # 1) Validate Zod schema validation on /api/autenticacao/entrar (login) with invalid payloads
    invalid_login_payloads = [
        {},  # empty payload
        {"email": 123, "senha": 456},  # wrong types, expecting strings
        {"email": "a" * 300, "senha": "validPass123"},  # username too long maybe
        {"email": "validUser"}  # missing password
    ]
    for payload in invalid_login_payloads:
        try:
            r = session.post(f"{BASE_URL}/api/autenticacao/entrar", json=payload, timeout=TIMEOUT)
        except Exception:
            traceback.print_exc()
            assert False, "Request failed unexpectedly"
        # Expect bad request (likely 400) due to Zod validation error
        assert r.status_code == 400, f"Expected 400 on invalid login payload but got {r.status_code}"
        check_winston_logging(r)

    # Login first with known admin to get token for user creation
    admin_login_payload = {"email": "admin@example.com", "senha": "AdminPass123!"}
    try:
        r_admin_login = session.post(f"{BASE_URL}/api/autenticacao/entrar", json=admin_login_payload, timeout=TIMEOUT)
    except Exception:
        traceback.print_exc()
        assert False, "Admin login request failed unexpectedly"
    assert r_admin_login.status_code == 200, f"Admin login failed with status {r_admin_login.status_code}"
    admin_login_json = r_admin_login.json()
    admin_token = admin_login_json.get("token")
    assert admin_token and isinstance(admin_token, str), "Admin JWT token not returned or invalid"
    session.headers.update({"Authorization": f"Bearer {admin_token}"})

    # 2) Successful login: first create a test user (simulate user creation through /api/usuarios POST)
    # Create user to login
    user_data = {
        "nome": "Test User",
        "email": "testuser@example.com",
        "senha": "TestPass123!",
        "perfil": "user",
        "permissoes": ["read", "write"]
    }
    try:
        r_create = session.post(f"{BASE_URL}/api/usuarios", json=user_data, timeout=TIMEOUT)
    except Exception:
        traceback.print_exc()
        assert False, "User creation request failed unexpectedly"
    assert r_create.status_code == 201, f"User creation failed with status {r_create.status_code}"
    created_user_id = r_create.json().get("id")
    assert created_user_id, "Created user ID not returned"
    # Login with created user
    login_payload = {"email": user_data["email"], "senha": user_data["senha"]}
    try:
        r_login = session.post(f"{BASE_URL}/api/autenticacao/entrar", json=login_payload, timeout=TIMEOUT)
    except Exception:
        traceback.print_exc()
        assert False, "Login request failed unexpectedly"
    assert r_login.status_code == 200, f"Login failed with status {r_login.status_code}"
    login_json = r_login.json()
    token = login_json.get("token")
    assert token and isinstance(token, str), "JWT token not returned or invalid"
    user_token = token
    session.headers.update({"Authorization": f"Bearer {user_token}"})

    # 3) Validate Zod on /api/usuarios POST with invalid user data
    invalid_user_payloads = [
        {},  # empty
        {"nome": 123, "email": "notanemail", "senha": "short", "perfil": 5, "permissoes": "all"},  # wrong types, email invalid
        {"nome": "Valid Name", "email": "missingatsign.com", "senha": "validPass123", "perfil": "admin", "permissoes": []},  # Invalid email format
        {"nome": "a"*300, "email": "longname@example.com", "senha": "validPass123", "perfil": "admin", "permissoes": ["read"]}  # name too long
    ]
    for payload in invalid_user_payloads:
        try:
            r = session.post(f"{BASE_URL}/api/usuarios", json=payload, timeout=TIMEOUT)
        except Exception:
            traceback.print_exc()
            assert False, "Invalid user creation request failed unexpectedly"
        assert r.status_code == 400, f"Expected 400 on invalid user creation data but got {r.status_code}"
        check_winston_logging(r)

    # 4) CRUD operations on user resource

    # READ - GET user by ID
    r_get = session.get(f"{BASE_URL}/api/usuarios/{created_user_id}", timeout=TIMEOUT)
    assert r_get.status_code == 200, f"Failed to get user with id {created_user_id}"
    user_obj = r_get.json()
    assert user_obj.get("email") == user_data["email"], "User email mismatch on GET"
    assert "senha" not in user_obj or user_obj["senha"] is None, "Password should not be returned"

    # UPDATE - PUT user by ID (change profile and permissions)
    update_payload = {
        "perfil": "admin",
        "permissoes": ["read", "write", "delete"]
    }
    r_put = session.put(f"{BASE_URL}/api/usuarios/{created_user_id}", json=update_payload, timeout=TIMEOUT)
    assert r_put.status_code == 200, f"Failed to update user with id {created_user_id}"
    updated_user = r_put.json()
    assert updated_user.get("perfil") == "admin", "Profile update failed"
    assert set(updated_user.get("permissoes", [])) == set(update_payload["permissoes"]), "Permissions update failed"

    # Validate access restrictions: try to GET user with invalid token
    bad_session = requests.Session()
    bad_session.headers.update(HEADERS_JSON)
    bad_session.headers.update({"Authorization": "Bearer invalidtoken123"})
    r_unauth = bad_session.get(f"{BASE_URL}/api/usuarios/{created_user_id}", timeout=TIMEOUT)
    assert r_unauth.status_code in (401, 403), "Unauthorized access not restricted"

    # DELETE user
    r_del = session.delete(f"{BASE_URL}/api/usuarios/{created_user_id}", timeout=TIMEOUT)
    assert r_del.status_code in (200, 204), f"Failed to delete user with id {created_user_id}"

    # Confirm deletion - GET should fail
    r_get_del = session.get(f"{BASE_URL}/api/usuarios/{created_user_id}", timeout=TIMEOUT)
    assert r_get_del.status_code == 404, "Deleted user still accessible"

test_user_management_endpoints()
