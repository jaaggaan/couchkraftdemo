-- Customer registration stores the verification-token expiry separately from
-- the token hash. This is additive and preserves all existing customer data.
alter table public.customers
  add column if not exists verify_expires bigint;
