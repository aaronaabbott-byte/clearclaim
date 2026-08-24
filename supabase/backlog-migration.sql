-- ClearClaim backlog migration.
-- Run once in Supabase → SQL Editor. Safe to re-run.

-- #3 Invoice auto-tax: a provider's local sales-tax rate (percent, e.g. 9.500),
-- used to pre-fill invoice tax on the subtotal. Nullable — providers who don't
-- set it just keep entering tax manually.
alter table profiles add column if not exists sales_tax_rate numeric(5,3);
