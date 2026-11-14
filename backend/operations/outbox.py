import json
import logging
import urllib.error
import urllib.request
from datetime import timedelta

from django.conf import settings
from django.db import IntegrityError, transaction
from django.utils import timezone

from .models import OutboxDeliveryReceipt, OutboxEvent

logger = logging.getLogger("operations.outbox")

DEFAULT_BATCH_SIZE = 50
DEFAULT_MAX_ATTEMPTS = 5
DEFAULT_BASE_BACKOFF_SECONDS = 5
MAX_BACKOFF_SECONDS = 3600
DEFAULT_STALE_LOCK_SECONDS = 300
DEFAULT_BACKLOG_ALERT_THRESHOLD = 100


class TransientDispatchError(Exception):
    """Retryable delivery failure (network timeout, HTTP 429/5xx, temporary downstream outage)."""

    def __init__(self, code="transient_error", detail=""):
        super().__init__(detail or code)
        self.code = str(code)[:100]


class PermanentDispatchError(Exception):
    """Non-retryable failure (malformed target, HTTP 4xx validation error)."""

    def __init__(self, code="permanent_error", detail=""):
        super().__init__(detail or code)
        self.code = str(code)[:100]


def compute_backoff_seconds(attempts: int, base_seconds: int = DEFAULT_BASE_BACKOFF_SECONDS) -> int:
    exponent = max(0, int(attempts) - 1)
    return min(MAX_BACKOFF_SECONDS, int(base_seconds) * (2 ** exponent))


def _default_destination() -> str:
    webhook_url = getattr(settings, "OUTBOX_WEBHOOK_URL", "") or ""
    if webhook_url:
        # Never expose query/credentials from a webhook URL in receipts or logs.
        scheme_split = webhook_url.split("?")[0].split("@")[-1]
        return scheme_split[:120]
    return "local://noop"


def default_outbox_handler(event: OutboxEvent) -> str:
    """Deliver an outbox event to an optional configured webhook or local no-op sink."""
    webhook_url = getattr(settings, "OUTBOX_WEBHOOK_URL", "") or ""
    if not webhook_url:
        return "local://noop"

    body = json.dumps(
        {
            "event_key": str(event.event_key),
            "topic": event.topic,
            "aggregate_id": event.aggregate_id,
            "payload": event.payload,
        }
    ).encode("utf-8")
    req = urllib.request.Request(
        webhook_url,
        data=body,
        headers={
            "Content-Type": "application/json",
            "Idempotency-Key": str(event.event_key),
            "X-Outbox-Topic": str(event.topic)[:100],
        },
        method="POST",
    )
    timeout_seconds = float(getattr(settings, "OUTBOX_WEBHOOK_TIMEOUT", 5.0))
    try:
        with urllib.request.urlopen(req, timeout=timeout_seconds) as resp:
            code = getattr(resp, "status", 200)
            if code >= 500 or code == 429:
                raise TransientDispatchError(f"http_{code}")
            if code >= 400:
                raise PermanentDispatchError(f"http_{code}")
    except urllib.error.HTTPError as exc:
        if exc.code >= 500 or exc.code == 429:
            raise TransientDispatchError(f"http_{exc.code}") from exc
        raise PermanentDispatchError(f"http_{exc.code}") from exc
    except (urllib.error.URLError, TimeoutError, OSError) as exc:
        raise TransientDispatchError("network_error") from exc
    return _default_destination()


def recover_stale_locks(
    *,
    stale_seconds: int = DEFAULT_STALE_LOCK_SECONDS,
    max_attempts: int = DEFAULT_MAX_ATTEMPTS,
    now=None,
) -> dict:
    """Recover events stuck in PROCESSING after a worker crash."""
    now = now or timezone.now()
    cutoff = now - timedelta(seconds=max(1, int(stale_seconds)))
    requeued = 0
    dead_lettered = 0

    with transaction.atomic():
        stale_events = list(
            OutboxEvent.objects.select_for_update(skip_locked=True)
            .filter(status=OutboxEvent.Status.PROCESSING, locked_at__lte=cutoff)
            .order_by("locked_at", "id")
        )
        for event in stale_events:
            event.locked_at = None
            if event.attempts >= max_attempts:
                event.status = OutboxEvent.Status.FAILED
                event.last_error_code = "stale_lock_max_attempts"
                event.save(update_fields=["status", "locked_at", "last_error_code"])
                dead_lettered += 1
            else:
                event.status = OutboxEvent.Status.PENDING
                event.available_at = now
                event.last_error_code = "stale_lock_recovered"
                event.save(update_fields=["status", "locked_at", "available_at", "last_error_code"])
                requeued += 1

    if requeued or dead_lettered:
        logger.warning(
            "outbox_stale_locks_recovered requeued=%s dead_lettered=%s",
            requeued,
            dead_lettered,
        )
    return {"requeued": requeued, "dead_lettered": dead_lettered}


def _claim_due_events(batch_size: int, now) -> list[int]:
    with transaction.atomic():
        rows = list(
            OutboxEvent.objects.select_for_update(skip_locked=True)
            .filter(status=OutboxEvent.Status.PENDING, available_at__lte=now)
            .order_by("available_at", "id")[: max(1, int(batch_size))]
        )
        claimed_ids = []
        for event in rows:
            event.status = OutboxEvent.Status.PROCESSING
            event.locked_at = now
            event.attempts = int(event.attempts) + 1
            event.save(update_fields=["status", "locked_at", "attempts"])
            claimed_ids.append(event.id)
        return claimed_ids


def _mark_sent(event_id: int, event_key, topic: str, destination: str, now) -> bool:
    """Persist idempotency receipt and transition event to SENT.

    Returns True if newly delivered, False if receipt already existed (idempotent skip).
    """
    with transaction.atomic():
        event = OutboxEvent.objects.select_for_update().get(id=event_id)
        try:
            with transaction.atomic():
                _, created = OutboxDeliveryReceipt.objects.get_or_create(
                    event_key=event_key,
                    defaults={
                        "event": event,
                        "topic": topic,
                        "destination": (destination or "local")[:120],
                        "delivered_at": now,
                    },
                )
        except IntegrityError:
            created = False
        event.status = OutboxEvent.Status.SENT
        event.processed_at = now
        event.locked_at = None
        event.last_error_code = None
        event.save(update_fields=["status", "processed_at", "locked_at", "last_error_code"])
        return created


def _mark_failure(
    event_id: int,
    *,
    error_code: str,
    permanent: bool,
    max_attempts: int,
    base_backoff_seconds: int,
    now,
) -> str:
    with transaction.atomic():
        event = OutboxEvent.objects.select_for_update().get(id=event_id)
        event.locked_at = None
        event.last_error_code = (error_code or "dispatch_error")[:100]
        if permanent or event.attempts >= max_attempts:
            event.status = OutboxEvent.Status.FAILED
            event.save(update_fields=["status", "locked_at", "last_error_code"])
            return OutboxEvent.Status.FAILED

        backoff = compute_backoff_seconds(event.attempts, base_seconds=base_backoff_seconds)
        event.status = OutboxEvent.Status.PENDING
        event.available_at = now + timedelta(seconds=backoff)
        event.save(update_fields=["status", "locked_at", "available_at", "last_error_code"])
        return OutboxEvent.Status.PENDING


def dispatch_due_events(
    *,
    batch_size: int = DEFAULT_BATCH_SIZE,
    max_attempts: int = DEFAULT_MAX_ATTEMPTS,
    base_backoff_seconds: int = DEFAULT_BASE_BACKOFF_SECONDS,
    stale_seconds: int = DEFAULT_STALE_LOCK_SECONDS,
    handler=None,
    now=None,
) -> dict:
    """Recover stale locks, claim due outbox rows using SKIP LOCKED, and dispatch safely."""
    now = now or timezone.now()
    recovery = recover_stale_locks(
        stale_seconds=stale_seconds,
        max_attempts=max_attempts,
        now=now,
    )
    handler = handler or default_outbox_handler
    claimed_ids = _claim_due_events(batch_size=batch_size, now=now)

    sent = 0
    deduped = 0
    retried = 0
    failed = 0

    for event_id in claimed_ids:
        event = OutboxEvent.objects.get(id=event_id)
        if OutboxDeliveryReceipt.objects.filter(event_key=event.event_key).exists():
            _mark_sent(event.id, event.event_key, event.topic, "duplicate-skip", now)
            deduped += 1
            logger.info(
                "outbox_dedup_skipped event_id=%s event_key=%s topic=%s aggregate_id=%s",
                event.id,
                event.event_key,
                event.topic,
                event.aggregate_id,
            )
            continue

        try:
            destination = handler(event) or _default_destination()
        except PermanentDispatchError as exc:
            outcome = _mark_failure(
                event.id,
                error_code=exc.code,
                permanent=True,
                max_attempts=max_attempts,
                base_backoff_seconds=base_backoff_seconds,
                now=now,
            )
            failed += 1
            logger.error(
                "outbox_dead_letter event_id=%s event_key=%s topic=%s aggregate_id=%s attempts=%s error_code=%s status=%s",
                event.id,
                event.event_key,
                event.topic,
                event.aggregate_id,
                event.attempts,
                exc.code,
                outcome,
            )
        except TransientDispatchError as exc:
            outcome = _mark_failure(
                event.id,
                error_code=exc.code,
                permanent=False,
                max_attempts=max_attempts,
                base_backoff_seconds=base_backoff_seconds,
                now=now,
            )
            if outcome == OutboxEvent.Status.FAILED:
                failed += 1
            else:
                retried += 1
            logger.warning(
                "outbox_dispatch_retry event_id=%s event_key=%s topic=%s aggregate_id=%s attempts=%s error_code=%s status=%s",
                event.id,
                event.event_key,
                event.topic,
                event.aggregate_id,
                event.attempts,
                exc.code,
                outcome,
            )
        except Exception as exc:
            error_code = type(exc).__name__[:100]
            outcome = _mark_failure(
                event.id,
                error_code=error_code,
                permanent=False,
                max_attempts=max_attempts,
                base_backoff_seconds=base_backoff_seconds,
                now=now,
            )
            if outcome == OutboxEvent.Status.FAILED:
                failed += 1
            else:
                retried += 1
            logger.warning(
                "outbox_dispatch_unexpected_error event_id=%s event_key=%s topic=%s aggregate_id=%s attempts=%s error_code=%s status=%s",
                event.id,
                event.event_key,
                event.topic,
                event.aggregate_id,
                event.attempts,
                error_code,
                outcome,
            )
        else:
            created = _mark_sent(event.id, event.event_key, event.topic, str(destination), now)
            if created:
                sent += 1
            else:
                deduped += 1
            logger.info(
                "outbox_dispatched event_id=%s event_key=%s topic=%s aggregate_id=%s attempts=%s",
                event.id,
                event.event_key,
                event.topic,
                event.aggregate_id,
                event.attempts,
            )

    return {
        "claimed": len(claimed_ids),
        "sent": sent,
        "deduped": deduped,
        "retried": retried,
        "failed": failed,
        "requeued_stale": recovery["requeued"],
        "dead_lettered_stale": recovery["dead_lettered"],
    }


def outbox_metrics(*, backlog_alert_threshold: int = DEFAULT_BACKLOG_ALERT_THRESHOLD, now=None) -> dict:
    """Return status counts and oldest pending backlog age without emitting PII."""
    now = now or timezone.now()
    pending_count = OutboxEvent.objects.filter(status=OutboxEvent.Status.PENDING).count()
    due_backlog = OutboxEvent.objects.filter(
        status=OutboxEvent.Status.PENDING,
        available_at__lte=now,
    ).count()
    processing_count = OutboxEvent.objects.filter(status=OutboxEvent.Status.PROCESSING).count()
    sent_count = OutboxEvent.objects.filter(status=OutboxEvent.Status.SENT).count()
    failed_count = OutboxEvent.objects.filter(status=OutboxEvent.Status.FAILED).count()

    oldest_pending = (
        OutboxEvent.objects.filter(status=OutboxEvent.Status.PENDING)
        .order_by("created_at")
        .values_list("created_at", flat=True)
        .first()
    )
    oldest_pending_age_seconds = (
        max(0, int((now - oldest_pending).total_seconds())) if oldest_pending is not None else 0
    )
    alert = due_backlog >= int(backlog_alert_threshold) or failed_count > 0
    if due_backlog >= int(backlog_alert_threshold):
        logger.warning(
            "outbox_backlog_threshold_exceeded due_backlog=%s threshold=%s oldest_age_seconds=%s",
            due_backlog,
            backlog_alert_threshold,
            oldest_pending_age_seconds,
        )

    return {
        "pending": pending_count,
        "due_backlog": due_backlog,
        "processing": processing_count,
        "sent": sent_count,
        "failed": failed_count,
        "oldest_pending_age_seconds": oldest_pending_age_seconds,
        "backlog_alert_threshold": int(backlog_alert_threshold),
        "alert": alert,
    }
