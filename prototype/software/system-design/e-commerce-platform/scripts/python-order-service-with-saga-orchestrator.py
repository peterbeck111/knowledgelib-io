# order_service/saga.py — Checkout saga orchestrator
# Input:  Cart contents (user_id, items), payment method token
# Output: Order confirmation or compensated failure

import httpx
import uuid

INVENTORY_URL = "http://inventory-service:8080"
PAYMENT_URL = "http://payment-service:8080"
ORDER_URL = "http://order-service:8080"

async def checkout_saga(user_id: str, items: list, payment_token: str):
    """Execute checkout as an orchestrated saga with compensation."""
    saga_id = str(uuid.uuid4())

    # Step 1: Reserve inventory
    res = await httpx.AsyncClient().post(
        f"{INVENTORY_URL}/reserve",
        json={"saga_id": saga_id, "items": items},
    )
    if res.status_code != 200:
        return {"status": "failed", "reason": "inventory_unavailable"}

    # Step 2: Process payment
    res = await httpx.AsyncClient().post(
        f"{PAYMENT_URL}/charge",
        json={"saga_id": saga_id, "token": payment_token,
              "amount": sum(i["price"] * i["qty"] for i in items)},
    )
    if res.status_code != 200:
        # Compensate: release inventory
        await httpx.AsyncClient().post(
            f"{INVENTORY_URL}/release",
            json={"saga_id": saga_id},
        )
        return {"status": "failed", "reason": "payment_declined"}

    # Step 3: Create order
    order = await httpx.AsyncClient().post(
        f"{ORDER_URL}/create",
        json={"saga_id": saga_id, "user_id": user_id,
              "items": items, "payment_id": res.json()["payment_id"]},
    )
    return {"status": "confirmed", "order_id": order.json()["order_id"]}
