
# Deal Group ERP — Master Blueprint

Transform the current 7-page dashboard into a full ERP with 18 modules, a proper role/permission matrix, and an ERP-grade schema. This plan is the deliverable; no code is written yet. Build happens in waves after approval.

## 1. Role & Permission Model

Replace the free-text `profiles.role` column with a strict enum + separate `user_roles` table (security best practice — a user can hold several roles, e.g. Finance Manager + Approver).

New `app_role` enum (12 values):

```text
super_admin        ceo               executive           admin
finance_manager    warehouse_manager procurement_manager product_manager
regional_manager   customer_service  internal_auditor    sales_agent
supervisor         (kept)            operation_manager   (kept)
```

Also introduce a `role_module_permissions` table so admins can toggle per-role access to each of the 18 modules and set `view / create / edit / delete / approve` flags — no code redeploy needed to shift access.

Access is enforced two ways:
- Client: `usePermission(module, action)` hook drives sidebar visibility + route guards.
- Server: `has_role()` and new `has_permission(user, module, action)` security-definer functions used inside every RLS policy.

## 2. Information Architecture (Sidebar)

Sidebar is regrouped into four sections:

```text
OPERATIONS         COMMERCE          FINANCE            ADMIN
- Dashboard        - Sales           - Finance          - Approvals
- Orders           - Products        - Commissions      - Security
- Inventory        - Customers       - Reports          - Documents
- Agents           - Suppliers       - Analytics        - Settings
- Communications                                        - Audit Logs
```

Each module gets a route + landing page. Sub-features (e.g. "Pending Orders", "Sales Returns") are tabs / filtered views inside the module, not separate routes, to keep the URL surface manageable.

## 3. ERP Schema Refactor

Current tables mix concepts (a "deal" is simultaneously order + sale + commission source). We separate them:

### Party model
- `parties` (id, type: customer|supplier|agent|employee, name, contact, status) — single directory
- `customers` (party_id, segment: wholesaler|retailer|individual, credit_limit, wallet_balance, loyalty_points, blacklisted)
- `suppliers` (party_id, contract terms, rating, outstanding)
- `agents` (party_id, territory_id, wallet_balance, commission_balance, rank)

Existing `clients` table is migrated into `customers` (wholesaler segment).

### Commerce
- `sales_orders` (order lifecycle: submitted → approved → processing → packed → dispatched → delivered → cancelled/returned)
- `sales_order_items`
- `sales` (posted sale, links to order; separates order intent from booked revenue)
- `invoices`, `receipts`, `sales_returns`, `refund_requests`
- `promotions`, `discounts`, `sales_targets`
- Existing `deals` → migrated into `sales_orders` (retain `deal_number` as `order_number`).

### Inventory
- `warehouses`, `branches`
- `inventory_items` (product × warehouse, quantity, batch, expiry)
- `stock_movements`, `stock_transfers`, `damaged_goods`, `stock_audits`, `purchase_orders`
- `products` extended: brand, variants, images[], wholesale_price, retail_price, uom, approval_status

### Finance (double-entry)
- `chart_of_accounts` (account_code, name, type: asset|liability|equity|income|expense)
- `journal_entries` + `journal_lines` (debit/credit, balanced)
- `bank_accounts`, `cash_accounts`
- `accounts_receivable`, `accounts_payable`
- `expenses`, `incomes`, `budgets`, `assets`, `tax_records`
- `payment_reconciliations`

### Commissions
- `commission_rules` (per role, per product category, tiered)
- Existing `commissions` extended: bonuses, incentives, referral_bonus, wallet_transactions

### Operations
- `territories`, `agent_attendance`, `agent_gps_pings`
- `approvals` (polymorphic: entity_type, entity_id, requested_by, approver_role, status)
- `documents` (title, category, file_url, version, uploaded_by)
- `audit_logs` (user_id, action, entity, before/after JSON, ip, timestamp) — written via triggers on every business table
- `notifications`, `sms_broadcasts`, `email_broadcasts`, `support_tickets`, `announcements`

### Security tables
- `user_roles` (user_id, role) — canonical role storage
- `role_module_permissions` (role, module, actions[])
- `login_history`, `active_sessions`, `password_policies`, `security_alerts`

RLS is enabled on every table with `has_permission()` policies. All timestamps use `created_at` + `updated_at` triggers.

## 4. Build Waves

Waves are independent, each shippable on its own. Approve wave-by-wave.

**Wave 1 — Foundation (no visible UI change beyond sidebar)**
- Migrate roles → enum + `user_roles` + `role_module_permissions`
- New sidebar IA with all 18 modules (stubbed "Coming soon" pages)
- Permission hook + route guards + `has_permission()` SQL function
- Audit log table + trigger scaffold

**Wave 2 — Commerce core**
- Refactor `clients` → `parties` + `customers` (+ suppliers stub)
- Refactor `deals` → `sales_orders` + `sales_order_items` (data migration)
- Rebuild Orders module against new schema; add Sales module (POS-style entry, sales history, returns, invoices, receipts)
- Products module extended (variants, brand, wholesale/retail pricing, approval queue)

**Wave 3 — Inventory & Suppliers**
- Warehouses, branches, inventory_items, stock movements/transfers, purchase orders
- Suppliers module (list, contracts, PO, payments, ratings)
- Low-stock alerts feeding Dashboard

**Wave 4 — Finance & Commissions**
- Chart of accounts, journal entries, AR/AP, bank/cash, expenses, budgets, tax, reconciliation
- Financial statements (P&L, Balance Sheet, Cash Flow) as report views
- Commissions module rebuilt on `commission_rules` engine; agent wallet + payment history
- Approvals module wired to payments/refunds/expenses/commissions

**Wave 5 — Agents, Customers CRM, Communications**
- Agents module (territory, attendance, GPS, rankings, incentives)
- Customers CRM (wallet, credit, loyalty, complaints, blacklist)
- Communications (SMS/email/push broadcasts, tickets, announcements, feedback)

**Wave 6 — Intelligence & Governance**
- Analytics (revenue/profit/customer/agent/product/regional, forecasting, heat maps)
- Reports module (all report types + PDF/Excel export + scheduled reports)
- Documents repository (policies, contracts, licenses, versioning, search)
- Security module UI (roles, permission matrix editor, sessions, 2FA, IP allow-list)
- Audit Logs UI (filters, export, security events)
- Settings module (company profile, branches, tax, currency, templates, integrations, backups)

## 5. Cross-Cutting Standards

- Every table: RLS on, `has_permission()` policies, `created_at` + `updated_at` + update trigger, audit trigger writing to `audit_logs`.
- Every mutation route: server-side permission check (never trust client).
- Money in `numeric(14,2)`; currency column on every financial table (multi-currency ready).
- Every list view: server-side pagination, search, filter presets, CSV export.
- Every KPI on Dashboard sourced from a single `dashboard_metrics` SQL view for consistency.
- Real-time: Supabase Realtime on `sales_orders`, `notifications`, `approvals`, `audit_logs`.

## 6. Technical Notes (for reference)

- Enum migration is destructive to the current text `role` column; a data migration mapping current roles (`admin`, `operation_manager`, `agent`, `supervisor`) to the new enum runs in the same migration as the `user_roles` backfill.
- `deals` → `sales_orders` migration preserves `deal_number` as `order_number` and keeps the sequence.
- `clients.photo_urls` migrates to `customers.photo_urls` unchanged.
- Existing wholesaler wizard becomes the "New Supplier" flow in Wave 3 (or "New Wholesale Customer" — to confirm during Wave 2).
- Storage: add buckets `product-images`, `documents`, `invoices`, `agent-attendance-photos`. Existing `client-photos` and `wholesaler-documents` retained.

## 7. What I Need From You Next

After you approve this blueprint, confirm:
1. Start with **Wave 1** (foundation + sidebar + roles + permission matrix)?
2. Any of the 12 roles you want renamed, merged, or dropped before I write the enum?
3. Does "wholesaler" in the current app mean **supplier** (we buy from them) or **wholesale customer** (they buy from us)? This decides where the wizard lands in the new schema.
