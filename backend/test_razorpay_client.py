import hashlib
import hmac

from backend import razorpay_client


def test_payment_signature_verification(monkeypatch):
    monkeypatch.setenv("RAZORPAY_KEY_ID", "rzp_test_public")
    monkeypatch.setenv("RAZORPAY_KEY_SECRET", "server-secret")
    expected = hmac.new(
        b"server-secret", b"order_123|pay_456", hashlib.sha256
    ).hexdigest()

    assert razorpay_client.verify_payment_signature("order_123", "pay_456", expected)
    assert not razorpay_client.verify_payment_signature("order_123", "pay_999", expected)


def test_webhook_signature_uses_raw_body(monkeypatch):
    monkeypatch.setenv("RAZORPAY_WEBHOOK_SECRET", "webhook-secret")
    raw_body = b'{"event":"payment.captured"}'
    expected = hmac.new(b"webhook-secret", raw_body, hashlib.sha256).hexdigest()

    assert razorpay_client.verify_webhook_signature(raw_body, expected)
    assert not razorpay_client.verify_webhook_signature(raw_body + b" ", expected)
