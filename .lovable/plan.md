## Wave 2 — Commerce Core Refactor

Context: Deal Group is the middleman. **Wholesalers = suppliers** (we source from them). **Retailers = customers** (we sell to them). A "deal" becomes a **sales_order** from a customer, fulfilled with line items sourced from one or more suppliers, with agent commissions tracked per line.

### 1. Schema Refactor (additive, non-destructive)

Create new ERP-normalized tables alongside existing ones. Legacy tables (`clients`, `deals`, `order_items`, `wholesaler_locations`) stay for now with a compatibility view; new UI writes to new tables.

**New tables:**

- `parties` — single source of truth for any org/person we transact with
  - `party_type` (`customer` | `supplier` | `both`), `legal_name`, `display_name`, `tax_id`, `registration_number`, `email`, `phone`, `website`, `address`, `latitude`, `longitude`, `status`, `notes`
- `customers` — retailer-specific fields
  - `party_id` FK, `retailer_tier`, `credit_limit`, `payment_terms`, `default_delivery_address`, `assigned_agent_id`, `verification_status`, `verified_by`, `verified_at`
- `suppliers` — wholesaler-specific fields
  - `party_id` FK, `company_type`, `year_established`, `product_categories jsonb`, `minimum_order_value`, `payment_terms`, `credit_period_days`, `delivery_options`, `delivery_coverage_areas`, `operating_hours jsonb`, `bank_name`, `bank_account_name`, `bank_account_number`, `bank_branch`, `default_commission_rate`, `bulk_discount_available`, `storage_facilities_available`, `cold_storage_available`, `certifications text[]`, `special_services text[]`, `document urls`, `verification_status`, `verified_by`, `verified_at`, `added_by`
- `supplier_locations` — replaces `wholesaler_locations` (branches)
- `sales_orders` — replaces `deals`
  - `order_number` (auto), `customer_id` FK, `agent_id`, `status` (draft/pending_approval/approved/fulfilled/cancelled), `subtotal`, `total`, `agent_commission_total`, `supervisor_commission_total`, `manager_commission_total`, `delivery_address`, `delivery_date`, `notes`, `approved_by`, `approved_at`
- `sales_order_items` — replaces `order_items`
  - `sales_order_id`, `product_id`, `supplier_id`, `supplier_location_id`, `product_name`, `quantity`, `unit_price`, `subtotal`, `commission_rate`, `commission_amount`
- `commissions` gets `sales_order_id`, `sales_order_item_id`, keeps existing shape.

**RLS + GRANTs** for every new public table (authenticated + service_role). Policies:
- Admins/managers full access via `has_permission()`
- Agents: read/write their own orders, read customers assigned to them, read all suppliers
- Finance: read all, write commissions/invoices
- Auditors: read-only via `has_role('internal_auditor')`

**Triggers:** `tg_set_updated_at`, `tg_write_audit`, `generate_order_number` (reuses pattern from `generate_deal_number`).

**Backfill:** insert existing `clients` rows into `parties` + (`customers` if retailer / `suppliers` if wholesaler), map `wholesaler_locations` → `supplier_locations`, `deals` → `sales_orders`, `order_items` → `sales_order_items`. Preserve IDs where possible.

### 2. Frontend Refactor

- `src/lib/erp-entities.ts` — typed helpers to fetch customers/suppliers via joined `parties`.
- **Wholesaler wizard** (`WholesalerModal.tsx`) → writes to `parties` + `suppliers` + `supplier_locations`. Split `handleSave` into `upsertParty()` + `upsertSupplier()` + `upsertBranches()`. Keep the 7-tab UX.
- **Retailer/Client screen** (`Clients.tsx`) → writes to `parties` + `customers`. Rename UI label to "Customers (Retailers)". Add supplier list section pointing to Wholesalers page.
- **Orders** (`Orders.tsx`) → reads/writes `sales_orders` + `sales_order_items`. Update queries, keep the multi-supplier line-item structure (each line references a supplier). Rename "Deal" → "Sales Order" in UI copy but keep the deal_number-style order number.
- **New pages** for modules that are currently stubs:
  - `/customers` (retailers list) — first-class page
  - `/suppliers` (redirect to existing wholesalers page or rename)
- Update `src/lib/erp-modules.ts` groupings to reflect Customers vs Suppliers.

### 3. Compatibility

- Keep `deals`, `clients`, `order_items`, `wholesaler_locations` in place for Wave 2. New reads/writes go to the new tables. A future Wave will drop legacy tables once mobile app is migrated.
- Create SQL views `deals_v` / `clients_v` from new tables so any lingering reads keep working during the transition.

### 4. Deliverables (this wave)

1. Migration: new tables, GRANTs, RLS, triggers, backfill, compatibility views.
2. Refactored wholesaler wizard writing to `suppliers`.
3. Refactored Clients page writing to `customers`, renamed to "Customers".
4. Refactored Orders page reading/writing `sales_orders`.
5. Updated module registry + sidebar labels (Suppliers / Customers / Sales Orders).

### Technical Notes

- `parties.party_type='both'` handles entities that are simultaneously a customer and supplier.
- Order number generator: `SO-YYYYMM-NNNN` sequence per month.
- All new tables use `uuid` PKs, `created_at`/`updated_at` with trigger, audit trigger attached.
- No destructive drops this wave — safe to iterate.

### Out of Scope (later waves)

- Inventory movements & stock ledger (Wave 3)
- Invoicing, payments, double-entry GL (Wave 4)
- Mobile app cutover from `deals` → `sales_orders`
- Dropping legacy tables

Shall I proceed with the migration + code changes?
