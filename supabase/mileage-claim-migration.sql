-- Mileage Log → travel claims. The Mileage Log saves a Transportation (or
-- field-trip Extracurricular) claim so it counts against the student's 25% cap
-- like any other claim. These two columns carry the mileage detail:
--   miles         = total miles on the log (lets admin sum miles across families)
--   mileage_trips = the trip rows (date, start/end, round-trip, miles) as JSON
-- Idempotent — safe to run more than once.
alter table claims add column if not exists miles numeric;
alter table claims add column if not exists mileage_trips jsonb;
