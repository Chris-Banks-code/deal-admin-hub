# AGENTS.md

## Architecture rules

- Order and commission math lives in `src/lib/sales-metrics.ts`, `src/lib/finance.ts` and `src/lib/commissions.ts`. Pages and components read those results; they never recompute totals from raw rows.
- Commission split percentages live in the `commission_rules` table and are read with `useCommissionRules()`. Code must not hardcode a split when computing or displaying commission.
- Every time-sensitive view uses `PeriodPicker` with `periodWindow` / `inWindow` from `src/lib/finance.ts`, so Overall / Monthly / Weekly behave the same on every page.
- New modules are registered in `src/lib/erp-modules.ts`, added to `REAL_ROUTES` in `src/App.tsx`, and wrapped in `ProtectedRoute` with the matching module key.
- Database changes go through the Supabase migration tool only; every new `public` table gets `GRANT`s, `ENABLE ROW LEVEL SECURITY` and policies in the same migration.
