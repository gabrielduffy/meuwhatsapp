import requests
import time

BASE_URL = "http://localhost:3000"
TIMEOUT = 30

def test_whatsapp_instance_management():
    headers = {"Content-Type": "application/json"}
    instance_id = None

    try:
        # 1. Create a new WhatsApp instance (POST /api/instances)
        create_payload = {
            "name": "TestInstanceTC003",
            "tenantId": "tenant_test_001"
        }
        create_resp = requests.post(f"{BASE_URL}/api/instances", json=create_payload, headers=headers, timeout=TIMEOUT)
        assert create_resp.status_code == 201, f"Instance creation failed: {create_resp.text}"
        instance_data = create_resp.json()
        instance_id = instance_data.get("id")
        assert instance_id, "Created instance ID not returned"

        # 2. Request QR code connection for the created instance (GET /api/instances/{instance_id}/qr)
        qr_resp = requests.get(f"{BASE_URL}/api/instances/{instance_id}/qr", headers=headers, timeout=TIMEOUT)
        assert qr_resp.status_code == 200, f"QR code request failed: {qr_resp.text}"
        qr_data = qr_resp.json()
        assert "qrCode" in qr_data or "qr" in qr_data, "QR code data missing"

        # 3. Simulate real-time connection monitoring (GET /api/instances/{instance_id}/status)
        # Retry status request a few times to catch connection states
        last_status = None
        for _ in range(5):
            status_resp = requests.get(f"{BASE_URL}/api/instances/{instance_id}/status", headers=headers, timeout=TIMEOUT)
            assert status_resp.status_code == 200, f"Status check failed: {status_resp.text}"
            status_data = status_resp.json()
            status = status_data.get("connectionStatus") or status_data.get("status")
            assert status in {"connected", "disconnected", "connecting", "qr", "pairing"}, f"Unexpected status: {status}"
            last_status = status
            if status == "connected":
                break
            time.sleep(2)
        assert last_status is not None, "No status returned"
        # Multi-tenant isolation can be assumed by tenantId but here we trust API

        # 4. Delete the WhatsApp instance (DELETE /api/instances/{instance_id})
        del_resp = requests.delete(f"{BASE_URL}/api/instances/{instance_id}", headers=headers, timeout=TIMEOUT)
        assert del_resp.status_code == 204, f"Instance deletion failed: {del_resp.text}"

    finally:
        # Cleanup if deletion failed or test broken before delete
        if instance_id:
            try:
                requests.delete(f"{BASE_URL}/api/instances/{instance_id}", headers=headers, timeout=TIMEOUT)
            except Exception:
                pass

test_whatsapp_instance_management()