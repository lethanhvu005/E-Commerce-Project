import json
import signal
import time

from django.core.management.base import BaseCommand

from operations.outbox import (
    DEFAULT_BACKLOG_ALERT_THRESHOLD,
    DEFAULT_BASE_BACKOFF_SECONDS,
    DEFAULT_BATCH_SIZE,
    DEFAULT_MAX_ATTEMPTS,
    DEFAULT_STALE_LOCK_SECONDS,
    dispatch_due_events,
    outbox_metrics,
)


class Command(BaseCommand):
    help = "Dispatch pending OutboxEvent rows with SKIP LOCKED, retry backoff, and stale lock recovery."

    def add_arguments(self, parser):
        parser.add_argument("--batch-size", type=int, default=DEFAULT_BATCH_SIZE)
        parser.add_argument("--max-attempts", type=int, default=DEFAULT_MAX_ATTEMPTS)
        parser.add_argument("--base-backoff", type=int, default=DEFAULT_BASE_BACKOFF_SECONDS)
        parser.add_argument("--stale-seconds", type=int, default=DEFAULT_STALE_LOCK_SECONDS)
        parser.add_argument("--backlog-alert-threshold", type=int, default=DEFAULT_BACKLOG_ALERT_THRESHOLD)
        parser.add_argument("--loop", action="store_true", help="Keep polling continuously until stopped.")
        parser.add_argument("--once", action="store_true", help="Run a single batch and exit (default).")
        parser.add_argument("--interval", type=float, default=5.0, help="Sleep seconds between loop polls.")

    def handle(self, *args, **options):
        stop_requested = False

        def _handle_stop(signum, frame):
            nonlocal stop_requested
            stop_requested = True

        signal.signal(signal.SIGTERM, _handle_stop)
        signal.signal(signal.SIGINT, _handle_stop)

        loop_mode = bool(options["loop"]) and not bool(options["once"])
        while True:
            summary = dispatch_due_events(
                batch_size=options["batch_size"],
                max_attempts=options["max_attempts"],
                base_backoff_seconds=options["base_backoff"],
                stale_seconds=options["stale_seconds"],
            )
            metrics = outbox_metrics(backlog_alert_threshold=options["backlog_alert_threshold"])
            self.stdout.write(json.dumps({"dispatch": summary, "metrics": metrics}))

            if not loop_mode or stop_requested:
                break
            time.sleep(max(0.2, float(options["interval"])))
