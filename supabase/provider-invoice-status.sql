-- Provider invoice payment status. Run once in the Supabase SQL editor. Re-runnable.
alter table invoices add column if not exists status text default 'unpaid';   -- unpaid | paid
alter table invoices add column if not exists paid_date date;
