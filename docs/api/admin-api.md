# Admin API

All endpoints require `Authorization: Bearer <access_token>`. Being authenticated is not sufficient: the account must be staff and have every listed Django permission.

## Dashboard

### `GET /api/admin/dashboard/`

Required permissions:

- `orders.view_order`
- `catalog.view_product`
- `inventory.view_inventorybalance`
- `accounts.view_user`

Returns:

- `revenue`: sum of payments whose status is `succeeded` only.
- `revenue_definition`: human-readable accounting rule used by this endpoint.
- `orders_count`, `products_count`, `customers_count`, `low_stock_count`.
- `orders_by_status`: grouped system-wide order counts.
- `recent_orders`: latest eight orders with public ID, number, customer email, status, total and timestamp.

`403` is returned for customers, non-staff users, or staff missing any required permission.

## Inventory

### `GET /api/admin/inventory/`

Requires `inventory.view_inventorybalance`. Returns current on-hand, reserved and available quantities per variant.

### `POST /api/admin/inventory/`

Requires `inventory.change_inventorybalance`.

Request body:

```json
{
  "variant_id": 1,
  "quantity_delta": 10,
  "reason": "Nhập kho",
  "event_key": "7b0e58e7-b334-47ae-aad8-54ed5d477f4c"
}
```

The event key makes retries idempotent. Adjustments that would make `on_hand` negative or lower than `reserved` are rejected.

### `GET /api/admin/inventory/movements/`

Requires `inventory.view_inventorymovement`. Returns the latest inventory movements. Pagination is still required; the current endpoint is limited to 100 rows.

## Audit logs

### `GET /api/admin/audit-logs/`

Requires `operations.view_auditlog`. Returns the latest audit records. Pagination is still required; the current endpoint is limited to 100 rows.

## Not implemented yet

The following required Admin contracts remain open and must not be simulated by the frontend: product/variant/image/category/brand/collection CRUD, system-wide orders and transitions, customers, vouchers, moderation, banners, and paginated audit APIs.
