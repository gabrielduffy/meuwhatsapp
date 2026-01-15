import requests
import os

BASE_URL = "http://localhost:3000"
TIMEOUT = 30
HEADERS = {"Content-Type": "application/json"}

# Using an existing test user for authentication

def test_message_sending_endpoints():
    user_data = {
        "email": "existing_test_user@example.com",
        "password": "StrongP@ssword123"
    }

    auth_url = f"{BASE_URL}/api/autenticacao/entrar"
    message_url = f"{BASE_URL}/api/mensagens"

    jwt_token = None
    
    # Use a valid WhatsApp phone number format for recipient
    recipient_phone = "+5511999999999"  # Example: Brazil phone number in E.164 format
    
    # Authenticate user to get JWT token
    auth_payload = {
        "email": user_data["email"],
        "password": user_data["password"]
    }

    r_auth = requests.post(auth_url, json=auth_payload, headers=HEADERS, timeout=TIMEOUT)
    assert r_auth.status_code == 200, f"Authentication failed: {r_auth.text}"
    jwt_token = r_auth.json().get("token")
    assert jwt_token, "JWT token missing in authentication response"

    auth_headers = {**HEADERS, "Authorization": f"Bearer {jwt_token}"}

    # 1. Send text message
    text_message = {
        "type": "text",
        "to": recipient_phone,
        "content": "Hello from test - text message"
    }
    r_text = requests.post(message_url, json=text_message, headers=auth_headers, timeout=TIMEOUT)
    assert r_text.status_code == 200, f"Text message send failed: {r_text.text}"
    resp_text = r_text.json()
    assert resp_text.get("status") == "sent" or resp_text.get("success") is True, "Text message not sent successfully"

    # 2. Send image media message
    image_message = {
        "type": "image",
        "to": recipient_phone,
        "content": {
            "url": "https://via.placeholder.com/150",
            "caption": "Test image"
        }
    }
    r_image = requests.post(message_url, json=image_message, headers=auth_headers, timeout=TIMEOUT)
    assert r_image.status_code == 200, f"Image message send failed: {r_image.text}"
    resp_image = r_image.json()
    assert resp_image.get("status") == "sent" or resp_image.get("success") is True, "Image message not sent successfully"

    # 3. Send video media message
    video_message = {
        "type": "video",
        "to": recipient_phone,
        "content": {
            "url": "https://sample-videos.com/video123/mp4/240/big_buck_bunny_240p_1mb.mp4",
            "caption": "Test video"
        }
    }
    r_video = requests.post(message_url, json=video_message, headers=auth_headers, timeout=TIMEOUT)
    assert r_video.status_code == 200, f"Video message send failed: {r_video.text}"
    resp_video = r_video.json()
    assert resp_video.get("status") == "sent" or resp_video.get("success") is True, "Video message not sent successfully"

    # 4. Send audio media message
    audio_message = {
        "type": "audio",
        "to": recipient_phone,
        "content": {
            "url": "https://sample-videos.com/audio/mp3/crowd-cheering.mp3"
        }
    }
    r_audio = requests.post(message_url, json=audio_message, headers=auth_headers, timeout=TIMEOUT)
    assert r_audio.status_code == 200, f"Audio message send failed: {r_audio.text}"
    resp_audio = r_audio.json()
    assert resp_audio.get("status") == "sent" or resp_audio.get("success") is True, "Audio message not sent successfully"

    # 5. Send document message
    document_message = {
        "type": "document",
        "to": recipient_phone,
        "content": {
            "url": "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
            "fileName": "dummy.pdf"
        }
    }
    r_document = requests.post(message_url, json=document_message, headers=auth_headers, timeout=TIMEOUT)
    assert r_document.status_code == 200, f"Document message send failed: {r_document.text}"
    resp_document = r_document.json()
    assert resp_document.get("status") == "sent" or resp_document.get("success") is True, "Document message not sent successfully"

    # 6. Send bot message (assuming bot message type 'bot' with content key)
    bot_message = {
        "type": "bot",
        "to": recipient_phone,
        "content": {
            "botId": "bot_test_id",
            "message": "Hello from bot"
        }
    }
    r_bot = requests.post(message_url, json=bot_message, headers=auth_headers, timeout=TIMEOUT)
    assert r_bot.status_code in [200, 400, 404], f"Unexpected status code for bot message: {r_bot.status_code}"
    if r_bot.status_code == 200:
        resp_bot = r_bot.json()
        assert resp_bot.get("status") == "sent" or resp_bot.get("success") is True, "Bot message not sent successfully"
    else:
        err = r_bot.json().get("error") or r_bot.text
        assert err is not None, "Expected error message on bot message failure"


test_message_sending_endpoints()
