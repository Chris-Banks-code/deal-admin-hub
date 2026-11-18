# Per-product commission pool rules (Mineral Water first)

## What changes for you
- Each product gets its own **Commission Rules** card: unit (case/pack/bottle), pool amount per delivered unit, and the eight shares as percentages. DEAL Company always gets the remainder.
- A live preview shows the dollar split for all 5 scenarios. Saving is blocked if any scenario would go over 100%.
- Changing the pool only updates the dollar amounts; percentages stay as entered. Editing one product never touches another.
- Mineral Water is set up with your shares (35 / 10 / 5 / 5 / 6 / 4 / 3 / 9).

## How commission is decided per order
- Who created the order (Remote Agent, Vehicle Agent or Supervisor) and who delivered it decide the scenario automatically.
- Built-in guards: one creator per unit, no delivery share on your own order, no supervisor override on the supervisor's own order, override only for agents on that supervisor's team.
- Commission = pool x quantity **delivered** x share.
- Lifecycle: Pending (created) -> Payable (delivered and confirmed) -> Paid. Cancelled or returned orders reverse pending commission.

## Retailer ownership
- Each retailer has one owner (registering agent); delivering does not change it.
- Reassign button with a required reason (agent inactive, retailer request, management approval, inactive for N days — N is a setting, default 30). Every change is logged with previous/new agent, reason, date and approver.

## Sales record
- Each order stores: retailer, retailer owner, creator, creator type, supervisor, region, vehicle agent, product, qty ordered, qty delivered, dates, status, commission pending / payable / paid, DEAL allocation. Shown on the order details.

## Technical details
- New table `product_commission_rules` (product_id unique, unit, pool_amount, currency, 8 pct columns) with a validation trigger enforcing scenario totals <= 100.
- New table `commission_allocations` (one row per order line x recipient role: profile_id, role, pct, amount, status pending/payable/paid/reversed), filled by a DB trigger on order items/status so the agent app can't bypass it.
- Add to `deals`: creator_type, delivered_by (vehicle agent), region, retailer_owner_id; to `order_items`: quantity_delivered. Add `region` + `agent_type` (remote/vehicle) to profiles.
- New `retailer_ownership_log` table and `app_settings` (reassignment_inactive_days).
- Shared scenario math in `src/lib/commissions.ts` (`allocatePool()`), with tests for all 5 scenarios and the anti-double-payment rules.
- Existing percentage-of-sale products keep working until a pool rule is set; past earnings unchanged.
