import json
import logging
import os
import socket
from urllib.error import HTTPError, URLError
from urllib.parse import urlparse
from urllib.request import Request, urlopen

from django.conf import settings
from django.core.mail import EmailMessage, get_connection

logger = logging.getLogger(__name__)
HTTPS_MAIL_TIMEOUT_SECONDS = 8


def _get_setting(name: str, default: str = "") -> str:
    return (getattr(settings, name, None) or os.getenv(name) or default).strip()


def https_mail_provider_configured() -> bool:
    return bool(
        _get_setting("BREVO_API_KEY")
        or _get_setting("RESEND_API_KEY")
        or _get_setting("EMAIL_WEBHOOK_URL")
    )


def smtp_credentials_configured() -> bool:
    return bool(_get_setting("EMAIL_HOST_USER") and _get_setting("EMAIL_HOST_PASSWORD"))


def email_transport_configured() -> bool:
    return https_mail_provider_configured() or smtp_credentials_configured()


def _post_json(url: str, payload: dict, headers: dict | None = None) -> None:
    parsed = urlparse(url)
    if parsed.scheme != "https" or not parsed.netloc:
        raise ValueError("URL dịch vụ gửi email phải sử dụng giao thức HTTPS hợp lệ.")
    req_headers = {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "User-Agent": "NEXA-CommerceOS/1.0",
        **(headers or {}),
    }
    data = json.dumps(payload).encode("utf-8")
    req = Request(url, data=data, headers=req_headers, method="POST")  # nosec B310
    with urlopen(req, timeout=HTTPS_MAIL_TIMEOUT_SECONDS) as resp:  # nosec B310
        if resp.status >= 400:
            raise RuntimeError(f"Email API returned HTTP {resp.status}")


def _send_via_brevo(*, subject: str, message: str, recipient_email: str, reply_to: str = "") -> None:
    api_key = _get_setting("BREVO_API_KEY")
    sender_email = (
        _get_setting("BREVO_SENDER_EMAIL")
        or _get_setting("DEFAULT_FROM_EMAIL")
        or _get_setting("EMAIL_HOST_USER")
        or "noreply@nexa.vn"
    )
    payload = {
        "sender": {"name": "NEXA Gear", "email": sender_email},
        "to": [{"email": recipient_email}],
        "subject": subject,
        "textContent": message,
    }
    if reply_to:
        payload["replyTo"] = {"email": reply_to}
    _post_json(
        "https://api.brevo.com/v3/smtp/email",
        payload,
        headers={"api-key": api_key},
    )


def _send_via_resend(*, subject: str, message: str, recipient_email: str, reply_to: str = "") -> None:
    api_key = _get_setting("RESEND_API_KEY")
    sender_email = _get_setting("RESEND_FROM_EMAIL") or "NEXA Gear <onboarding@resend.dev>"
    payload = {
        "from": sender_email,
        "to": [recipient_email],
        "subject": subject,
        "text": message,
    }
    if reply_to:
        payload["reply_to"] = reply_to
    _post_json(
        "https://api.resend.com/emails",
        payload,
        headers={"Authorization": f"Bearer {api_key}"},
    )


def _send_via_webhook(*, subject: str, message: str, recipient_email: str, reply_to: str = "") -> None:
    webhook_url = _get_setting("EMAIL_WEBHOOK_URL")
    webhook_secret = _get_setting("EMAIL_WEBHOOK_SECRET")
    payload = {
        "to": recipient_email,
        "subject": subject,
        "message": message,
    }
    if reply_to:
        payload["reply_to"] = reply_to
    if webhook_secret:
        payload["secret"] = webhook_secret
    _post_json(webhook_url, payload)


def _probe_smtp_reachable(host: str, port: int, timeout_seconds: float = 2.5) -> None:
    """Fail fast on firewalled SMTP hosts (e.g. Render Free blocks 25/465/587)
    before smtplib iterates all IPv4/IPv6 DNS entries and stalls Gunicorn."""
    addr_list = socket.getaddrinfo(host, port, socket.AF_INET, socket.SOCK_STREAM)
    if not addr_list:
        addr_list = socket.getaddrinfo(host, port, 0, socket.SOCK_STREAM)
    target = addr_list[0]
    with socket.socket(target[0], target[1], target[2]) as sock:
        sock.settimeout(timeout_seconds)
        sock.connect(target[4])


def deliver_email(
    *,
    subject: str,
    message: str,
    recipient_email: str,
    reply_to: str = "",
    from_email: str = "",
) -> bool:
    backend_path = (getattr(settings, "EMAIL_BACKEND", "") or "").lower()
    is_test_or_local_memory = any(token in backend_path for token in ("locmem", "dummy"))

    if not is_test_or_local_memory:
        if _get_setting("BREVO_API_KEY"):
            _send_via_brevo(
                subject=subject,
                message=message,
                recipient_email=recipient_email,
                reply_to=reply_to,
            )
            return True
        if _get_setting("RESEND_API_KEY"):
            _send_via_resend(
                subject=subject,
                message=message,
                recipient_email=recipient_email,
                reply_to=reply_to,
            )
            return True
        if _get_setting("EMAIL_WEBHOOK_URL"):
            _send_via_webhook(
                subject=subject,
                message=message,
                recipient_email=recipient_email,
                reply_to=reply_to,
            )
            return True

    smtp_timeout = min(float(getattr(settings, "EMAIL_TIMEOUT", 5) or 5), 5.0)
    if "smtp" in backend_path:
        host = _get_setting("EMAIL_HOST", "smtp.gmail.com")
        port = int(getattr(settings, "EMAIL_PORT", 587) or 587)
        _probe_smtp_reachable(host, port, timeout_seconds=min(smtp_timeout, 2.5))
        connection = get_connection(timeout=smtp_timeout)
    else:
        connection = get_connection()

    sender = from_email or getattr(settings, "DEFAULT_FROM_EMAIL", "noreply@nexa.vn")
    email_msg = EmailMessage(
        subject=subject,
        body=message,
        from_email=sender,
        to=[recipient_email],
        reply_to=[reply_to] if reply_to else None,
        connection=connection,
    )
    email_msg.send(fail_silently=False)
    return True


def is_smtp_blocked_error(exc: Exception) -> bool:
    return isinstance(exc, (TimeoutError, socket.timeout, OSError, HTTPError, URLError))
