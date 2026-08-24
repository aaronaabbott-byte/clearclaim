-- ClearClaim paywall — Phase 2 (Stripe) migration.
-- Run once in Supabase → SQL Editor, AFTER paywall-migration.sql.
-- Adds the Stripe customer id to entitlements so the billing portal can find
-- the right customer, and lets the webhook reconcile subscriptions to a user.
-- Still no user-writable policy on entitlements: only the service role (webhook
-- / admin) and redeem_code ever write it.

alter table entitlements add column if not exists stripe_customer_id text;

-- Fast lookup from a Stripe customer back to the app user (webhook path).
create index if not exists entitlements_stripe_customer_idx
  on entitlements (stripe_customer_id);


-- ---------------------------------------------------------------------------
-- Server-side free-tier receipt cap (10 receipts).
-- The UI already stops a free user at 10, but that check runs in the browser
-- and could be bypassed. These make the cap a hard rule enforced by the
-- database itself, so no direct API call can insert an 11th receipt.
-- ---------------------------------------------------------------------------

-- Is the signed-in user on an active Family plan? security definer so it can
-- read entitlements regardless of the caller's row-level-security.
create or replace function is_family_premium()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(
    (select family_until >= current_date from entitlements where user_id = auth.uid()),
    false
  );
$$;

-- How many receipts does the signed-in user already have? security definer so
-- counting inside the receipts policy does not recurse into that same policy.
create or replace function my_receipt_count()
returns integer language sql stable security definer set search_path = public as $$
  select count(*)::int from receipts where user_id = auth.uid();
$$;

-- Restrictive INSERT policy: it is AND-ed with the existing "insert own
-- receipts" policy, so a row is only allowed when the user is premium OR still
-- under 10 receipts. The count reflects rows that exist before this insert, so
-- a free user tops out at exactly 10.
drop policy if exists "free receipt cap" on receipts;
create policy "free receipt cap" on receipts
  as restrictive
  for insert
  to authenticated
  with check ( is_family_premium() or my_receipt_count() < 10 );
