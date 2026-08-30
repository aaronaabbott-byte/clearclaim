-- Per-student scholarship award. Used by states where the award varies by
-- student (Utah's age/setting tiers, Arizona's disability tiers) so caps that
-- are a percentage of the award can be tracked.
alter table kids add column if not exists award_amount numeric;
