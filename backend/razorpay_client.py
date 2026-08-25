"""Minimal, server-only Razorpay integration for VEKTRA billing."""

import hashlib
import hmac
import os

import httpx


API_URL = "https://api.razorpay.com/v1"


def is_configured() -> bool:
    return bool(os.getenv("RAZORPAY_KEY_ID") and os.getenv("RAZORPAY_KEY_SECRET"))


def public_key_id() -> str:
    return os.getenv("RAZORPAY_KEY_ID", "")


def _auth() -> tuple[str, str]:
    key_id = os.getenv("RAZORPAY_KEY_ID", "")
    key_secret = os.getenv("RAZORPAY_KEY_SECRET", "")
    if not key_id or not key_secret:
        raise RuntimeError("Razorpay is not configured.")
    return key_id, key_secret


async def create_order(*, amount: int, currency: str, receipt: str, notes: dict) -> dict:
    async with httpx.AsyncClient(timeout=15) as client:
        response = await client.post(
            f"{API_URL}/orders",
            auth=_auth(),
            json={"amount": amount, "currency": currency, "receipt": receipt[:40], "notes": notes},
        )
        response.raise_for_status()
        return response.json()


async def fetch_payment(payment_id: str) -> dict:
    async with httpx.AsyncClient(timeout=15) as client:
        response = await client.get(f"{API_URL}/payments/{payment_id}", auth=_auth())
        response.raise_for_status()
        return response.json()


def verify_payment_signature(order_id: str, payment_id: str, signature: str) -> bool:
    expected = hmac.new(
        _auth()[1].encode("utf-8"),
        f"{order_id}|{payment_id}".encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()
    return hmac.compare_digest(expected, signature)


def verify_webhook_signature(raw_body: bytes, signature: str) -> bool:
    secret = os.getenv("RAZORPAY_WEBHOOK_SECRET", "")
    if not secret or not signature:
        return False
    expected = hmac.new(secret.encode("utf-8"), raw_body, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, signature)
