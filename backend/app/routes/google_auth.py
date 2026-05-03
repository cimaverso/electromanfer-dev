from fastapi import APIRouter, Request
from fastapi.responses import RedirectResponse, JSONResponse
from google_auth_oauthlib.flow import Flow
from app.core.config import settings
import os
import json

os.environ["OAUTHLIB_INSECURE_TRANSPORT"] = "1"

router = APIRouter(prefix="/auth/google", tags=["Google OAuth"])

SCOPES = [
    "https://www.googleapis.com/auth/gmail.readonly",
    "https://www.googleapis.com/auth/gmail.send",
    "https://www.googleapis.com/auth/gmail.modify",
]

CLIENT_CONFIG = {
    "web": {
        "client_id": settings.GOOGLE_CLIENT_ID,
        "client_secret": settings.GOOGLE_CLIENT_SECRET,
        "auth_uri": "https://accounts.google.com/o/oauth2/auth",
        "token_uri": "https://oauth2.googleapis.com/token",
        "redirect_uris": [settings.GOOGLE_REDIRECT_URI],
    }
}

# Guardamos el flow en memoria entre login y callback
_flow_store = {}

@router.get("/login")
def login():
    flow = Flow.from_client_config(
        CLIENT_CONFIG,
        scopes=SCOPES,
        redirect_uri=settings.GOOGLE_REDIRECT_URI,
    )
    auth_url, state = flow.authorization_url(
        prompt="consent",
        access_type="offline",
    )
    _flow_store[state] = flow
    return RedirectResponse(auth_url)

@router.get("/callback")
def callback(request: Request):
    state = request.query_params.get("state")
    flow = _flow_store.pop(state, None)

    if not flow:
        return JSONResponse({"error": "Estado inválido o expirado"}, status_code=400)

    auth_response = str(request.url).replace("https://", "http://")
    flow.fetch_token(authorization_response=auth_response)
    creds = flow.credentials

    token_data = {
        "token": creds.token,
        "refresh_token": creds.refresh_token,
        "token_uri": creds.token_uri,
        "client_id": creds.client_id,
        "client_secret": creds.client_secret,
        "scopes": list(creds.scopes),
    }

    token_path = os.path.join(os.path.dirname(__file__), "..", "gmail_token.json")
    with open(token_path, "w") as f:
        json.dump(token_data, f)

    return JSONResponse({"ok": True, "mensaje": "Gmail autorizado correctamente ✅"})