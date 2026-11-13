# CommerceOS Admin API

All endpoints require `Authorization: Bearer <access_token>`, `is_staff=True`, and the matching Django model permission. Superusers have all permissions.

## Products

### `GET /api/admin/products/`

Permission: `catalog.view_product`.

Query parameters: `search`, `status`, `page`, `page_size` (maximum 100). Returns DRF page-number pagination with product, nested variant, image and feature data.

### `POST /api/admin/products/`

Permission: `catalog.add_product`. Creates a product and writes an audit event.

Required fields: `category_id`, `brand_id`, `name`, `slug`, `short_name`. Optional fields follow the Product model, including `status`, `summary`, `description`, `specifications`, and `warranty_months`.

### `GET/PATCH /api/admin/products/<product_id>/`

Permissions: `catalog.view_product` or `catalog.change_product`. `PATCH` updates only supplied fields and writes an audit event. Products are archived by setting `status=archived`; this API does not permanently delete products.

### Variant endpoints

- `GET/POST /api/admin/products/<product_id>/variants/`
- `GET/PATCH /api/admin/products/<product_id>/variants/<variant_id>/`

Permissions use `catalog.view_productvariant`, `add_productvariant`, and `change_productvariant`. SKU is normalized to uppercase. Use `is_active=false` instead of deleting a variant that may be referenced by order history.

### Image endpoints

- `GET/POST /api/admin/products/<product_id>/images/`
- `GET/PATCH/DELETE /api/admin/products/<product_id>/images/<image_id>/`

Permissions use the corresponding ProductImage model permission. Image metadata uses the existing storage `object_key`; this endpoint does not pretend that an object key is an uploaded file. A variant image must reference a variant belonging to the same product. Setting a cover image clears the previous cover inside a transaction.

## Existing operations APIs

- `GET /api/admin/dashboard/`
- `GET/POST /api/admin/inventory/`
- `GET /api/admin/inventory/movements/`
- `GET /api/admin/audit-logs/`

Inventory adjustment requires `variant_id`, non-zero `quantity_delta`, `reason`, and UUID `event_key`. A replay with the same payload returns the original movement. Reusing the key with different payload or actor returns HTTP `409`.

Dashboard requires all of `orders.view_order`, `catalog.view_product`, `inventory.view_inventorybalance`, and `accounts.view_user`. Its revenue is the sum of payments whose status is `succeeded`; pending, failed, cancelled and refunded payments are excluded.

Inventory permissions:

- `GET /api/admin/inventory/`: `inventory.view_inventorybalance`.
- `POST /api/admin/inventory/`: `inventory.change_inventorybalance`.
- `GET /api/admin/inventory/movements/`: `inventory.view_inventorymovement`.
- `GET /api/admin/audit-logs/`: `operations.view_auditlog`.

The movement and audit endpoints currently return at most 100 rows and still require pagination.

## Remaining Admin contracts

System-wide orders and transitions, customer administration, voucher administration, moderation, date-range analytics, support tickets and safe store settings remain open. The frontend must not simulate successful mutations for these modules.
