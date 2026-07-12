import json
import logging
import os
from typing import Any, Dict, Optional

import httpx


logger = logging.getLogger("vektra.agents.sarvam")

SARVAM_URL = "https://api.sarvam.ai/v1/chat/completions"
SARVAM_MODEL = "sarvam-30b"


def get_api_key(api_key: Optional[str] = None) -> Optional[str]:
    return api_key or os.getenv("SARVAM_API_KEY")


def parse_json_object(text: str) -> Dict[str, Any]:
    cleaned = (text or "").strip()
    if cleaned.startswith("```"):
        cleaned = cleaned.strip("`")
        if cleaned.lower().startswith("json"):
            cleaned = cleaned[4:].strip()
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        start = cleaned.find("{")
        end = cleaned.rfind("}")
        if start >= 0 and end > start:
            return json.loads(cleaned[start : end + 1])
        raise
_client: Optional[httpx.AsyncClient] = None


def get_async_client() -> httpx.AsyncClient:
    global _client
    if _client is None or _client.is_closed:
        _client = httpx.AsyncClient(
            timeout=30.0,
            limits=httpx.Limits(max_keepalive_connections=20, max_connections=40),
            http2=True
        )
    return _client


async def chat_json(system_prompt: str, user_prompt: str, api_key: Optional[str] = None) -> Optional[Dict[str, Any]]:
    gemini_key = os.getenv("GEMINI_API_KEY")
    if gemini_key:
        try:
            client = get_async_client()
            url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={gemini_key}"
            payload = {
                "systemInstruction": {
                    "parts": [{"text": system_prompt}]
                },
                "contents": [
                    {
                        "parts": [{"text": user_prompt}]
                    }
                ],
                "generationConfig": {
                    "responseMimeType": "application/json",
                    "temperature": 0.2
                }
            }
            response = await client.post(url, json=payload)
            response.raise_for_status()
            res_data = response.json()
            content = res_data["candidates"][0]["content"]["parts"][0]["text"]
            return parse_json_object(content)
        except Exception as exc:
            logger.warning("Gemini agent call failed: %s", exc)
            # Fall back to Sarvam if Gemini fails
            pass

    resolved_key = get_api_key(api_key)
    if not resolved_key:
        return None

    try:
        client = get_async_client()
        response = await client.post(
            SARVAM_URL,
            headers={
                "Authorization": f"Bearer {resolved_key}",
                "Content-Type": "application/json",
            },
            json={
                "model": SARVAM_MODEL,
                "temperature": 0.2,
                "max_tokens": 1024,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
            },
        )
        response.raise_for_status()
        data = response.json()
        content = data["choices"][0]["message"]["content"]
        return parse_json_object(content)
    except Exception as exc:
        logger.warning("Sarvam agent call failed: %s", exc)
        return None

