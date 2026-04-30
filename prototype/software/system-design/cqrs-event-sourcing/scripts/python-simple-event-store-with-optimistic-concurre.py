# Input:  Domain events as dictionaries with aggregate_id and version
# Output: Persisted events with concurrency protection

import json
import uuid
from datetime import datetime, timezone
import psycopg2
from psycopg2.extras import RealDictCursor

class EventStore:
    """Append-only event store with optimistic concurrency control."""

    def __init__(self, dsn: str):
        self.conn = psycopg2.connect(dsn)

    def append(self, aggregate_id: str, events: list[dict],
               expected_version: int) -> None:
        """Append events. Raises on version conflict."""
        with self.conn.cursor() as cur:
            for i, event in enumerate(events):
                version = expected_version + i + 1
                cur.execute(
                    """INSERT INTO events
                       (event_id, aggregate_id, aggregate_type,
                        event_type, version, data, metadata)
                       VALUES (%s, %s, %s, %s, %s, %s, %s)""",
                    (str(uuid.uuid4()), aggregate_id,
                     event["aggregate_type"], event["event_type"],
                     version, json.dumps(event["data"]),
                     json.dumps(event.get("metadata", {})))
                )
        self.conn.commit()

    def load(self, aggregate_id: str,
             from_version: int = 0) -> list[dict]:
        """Load events for an aggregate, optionally from a version."""
        with self.conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """SELECT * FROM events
                   WHERE aggregate_id = %s AND version > %s
                   ORDER BY version""",
                (aggregate_id, from_version)
            )
            return cur.fetchall()

    def load_all(self, from_position: int = 0,
                 batch_size: int = 1000) -> list[dict]:
        """Load all events globally (for projections)."""
        with self.conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """SELECT * FROM events
                   WHERE event_id > %s
                   ORDER BY created_at
                   LIMIT %s""",
                (from_position, batch_size)
            )
            return cur.fetchall()


class Order:
    """Event-sourced aggregate example."""

    def __init__(self):
        self.id = None
        self.status = None
        self.items = []
        self.total = 0.0
        self.version = 0
        self._pending_events = []

    def apply(self, event: dict) -> None:
        """Replay a historical event to rebuild state."""
        handler = getattr(self, f"_on_{event['event_type']}", None)
        if handler:
            handler(event["data"])
        self.version = event["version"]

    def create(self, order_id: str, customer_id: str,
               items: list) -> list[dict]:
        """Command: create a new order."""
        if self.status is not None:
            raise ValueError("Order already exists")
        total = sum(i["price"] * i["quantity"] for i in items)
        event = {
            "aggregate_type": "Order",
            "event_type": "OrderCreated",
            "data": {"customer_id": customer_id,
                     "items": items, "total": total}
        }
        self._apply_new(event, {"order_id": order_id})
        return self._pending_events

    def confirm(self) -> list[dict]:
        """Command: confirm the order."""
        if self.status != "pending":
            raise ValueError(f"Cannot confirm order in '{self.status}' state")
        event = {
            "aggregate_type": "Order",
            "event_type": "OrderConfirmed",
            "data": {"confirmed_at": datetime.now(timezone.utc).isoformat()}
        }
        self._apply_new(event)
        return self._pending_events

    def _apply_new(self, event: dict, extra_data: dict = None) -> None:
        if extra_data:
            event["data"].update(extra_data)
        fake_event = {**event, "version": self.version + 1}
        self.apply(fake_event)
        self._pending_events.append(event)

    def _on_OrderCreated(self, data: dict) -> None:
        self.id = data.get("order_id")
        self.status = "pending"
        self.items = data["items"]
        self.total = data["total"]

    def _on_OrderConfirmed(self, data: dict) -> None:
        self.status = "confirmed"
