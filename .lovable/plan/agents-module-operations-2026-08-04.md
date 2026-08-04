# Agents Module (Operations)

Replace the `/agents` placeholder with a real page for managing field agents and supervisors.

## What it does

**Directory** — table of all agents and supervisors from the `profiles` table: avatar, name, role badge, phone, email, supervisor, status (active/suspended), and their assigned customer count.

**Summary cards** — total agents, active agents, suspended, supervisors.

**Filters** — search by name/email/phone, filter by role (agent / supervisor), status, and supervisor.

**Actions**
- Add agent (creates the login account via the existing `admin-create-user` edge function, same flow the Users page uses)
- Edit agent details (name, phone, role, supervisor, status)
- Suspend / reactivate
- Assign or change supervisor

**Agent detail panel** — click a row to open a side sheet showing profile info, assigned customers, their sales orders, and commission totals. These sections read from `sales_orders`, `sales_order_items` and `commissions`; all three are currently empty, so they will render friendly empty states until orders start flowing.

Live updates via the existing realtime refresh hook so the list stays in sync.

## Not in this step

Territories, GPS attendance tracking, agent wallet and rankings need new tables and a mobile-side data feed — those come in a later wave. The page is structured so they slot in as extra tabs.

## Technical notes

- New `src/pages/Agents.tsx`, registered in `src/App.tsx` under `REAL_ROUTES` with `<ProtectedRoute module="agents">`.
- New `src/components/agents/AgentModal.tsx` (add/edit form) and `src/components/agents/AgentDetailSheet.tsx`.
- Data: `profiles` filtered to `role in ('agent','supervisor')`; assigned customers via `customers.assigned_agent_id`; orders via `sales_orders.agent_id`; commissions via `commissions.profile_id`.
- No database migration required.
- Note: role data currently lives in two places — legacy `profiles.role` text and the newer `user_roles` table (`sales_agent`). This page reads `profiles.role` to match the existing Users page; consolidating the two is a separate cleanup.
