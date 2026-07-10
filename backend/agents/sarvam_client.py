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


async def chat_json(system_prompt: str, user_prompt: str, api_key: Optional[str] = None) -> Optional[Dict[str, Any]]:
    resolved_key = get_api_key(api_key)
    if not resolved_key:
        return None

    try:
        async with httpx.AsyncClient(timeout=30) as client:
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
