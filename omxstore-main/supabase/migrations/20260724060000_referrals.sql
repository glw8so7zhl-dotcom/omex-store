-- =====================================================================
-- OMEX — Referral program: "ادعُ صديقك — تكسبان معًا".
--
-- Every customer gets a permanent share code (OMX-xxxxxx). A new user
-- who signs up through the invite link claims it once; when their FIRST
-- order is DELIVERED (anti-fraud: reward on delivery, not signup), BOTH
-- sides receive 200 loyalty points (= 2,000 YER) with bell notifications.
-- All movement goes through the audited loyalty_ledger.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Permanent per-user share codes.
-- ---------------------------------------------------------------------
create table if not exists public.referral_codes (
  user_id uuid primary key references auth.users(id) on delete cascade,
  code text not null unique,
  created_at timestamptz not null default now()
);

alter table public.referral_codes enable row level security;

drop policy if exists referral_codes_select_own on public.referral_codes;
create policy referral_codes_select_own on public.referral_codes
  for select to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(), 'admin'::app_role));

-- Get (or lazily create) the caller's code.
create or replace function public.my_referral_code()
returns text
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_code text;
  v_try int := 0;
begin
  if v_uid is null then raise exception 'auth_required'; end if;

  select code into v_code from public.referral_codes where user_id = v_uid;
  if v_code is not null then return v_code; end if;

  loop
    v_try := v_try + 1;
    v_code := 'OMX' || upper(substr(md5(v_uid::text || clock_timestamp()::text), 1, 6));
    begin
      insert into public.referral_codes (user_id, code) values (v_uid, v_code)
      on conflict (user_id) do nothing;
      exit;
    exception when unique_violation then
      if v_try >= 5 then raise; end if; -- code collision: retry with new salt
    end;
  end loop;

  select code into v_code from public.referral_codes where user_id = v_uid;
  return v_code;
end;
$$;

revoke execute on function public.my_referral_code() from public;
grant execute on function public.my_referral_code() to authenticated;

-- ---------------------------------------------------------------------
-- Claims: one referrer per referred user, ever.
-- ---------------------------------------------------------------------
create table if not exists public.referrals (
  referred_user_id uuid primary key references auth.users(id) on delete cascade,
  referrer_user_id uuid not null references auth.users(id) on delete cascade,
  code text not null,
  created_at timestamptz not null default now(),
  rewarded_at timestamptz
);

create index if not exists idx_referrals_referrer on public.referrals (referrer_user_id);

alter table public.referrals enable row level security;

drop policy if exists referrals_select_own_or_admin on public.referrals;
create policy referrals_select_own_or_admin on public.referrals
  for select to authenticated
  using (
    referred_user_id = auth.uid()
    or referrer_user_id = auth.uid()
    or public.has_role(auth.uid(), 'admin'::app_role)
  );

create or replace function public.claim_referral_v1(_code text)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_referrer uuid;
begin
  if v_uid is null then raise exception 'auth_required'; end if;

  select user_id into v_referrer
  from public.referral_codes
  where code = upper(trim(coalesce(_code, '')));

  if v_referrer is null then
    return jsonb_build_object('ok', false, 'reason', 'invalid_code');
  end if;
  if v_referrer = v_uid then
    return jsonb_build_object('ok', false, 'reason', 'self_referral');
  end if;
  if exists (select 1 from public.referrals where referred_user_id = v_uid) then
    return jsonb_build_object('ok', false, 'reason', 'already_claimed');
  end if;
  -- Anti-gaming: existing customers (already had a delivered order) can't
  -- be "referred".
  if exists (select 1 from public.orders where user_id = v_uid and status = 'delivered') then
    return jsonb_build_object('ok', false, 'reason', 'already_customer');
  end if;

  insert into public.referrals (referred_user_id, referrer_user_id, code)
  values (v_uid, v_referrer, upper(trim(_code)));

  return jsonb_build_object('ok', true);
end;
$$;

revoke execute on function public.claim_referral_v1(text) from public;
grant execute on function public.claim_referral_v1(text) to authenticated;

-- ---------------------------------------------------------------------
-- Loyalty reasons: extend the audit vocabulary for referral bonuses.
-- ---------------------------------------------------------------------
alter table public.loyalty_ledger drop constraint if exists loyalty_ledger_reason_check;
alter table public.loyalty_ledger add constraint loyalty_ledger_reason_check
  check (reason in (
    'earn_delivered', 'earn_reversed',
    'redeem_checkout', 'redeem_refunded', 'redeem_retaken',
    'admin_adjust',
    'referral_bonus_referrer', 'referral_bonus_referred'
  ));

-- ---------------------------------------------------------------------
-- Reward: fires once, on the referred user's first DELIVERED order.
-- ---------------------------------------------------------------------
create or replace function public.on_order_referral()
returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_ref public.referrals%rowtype;
begin
  if new.user_id is null or new.status <> 'delivered' or old.status = 'delivered' then
    return new;
  end if;

  select * into v_ref
  from public.referrals
  where referred_user_id = new.user_id and rewarded_at is null;

  if not found then return new; end if;

  update public.referrals set rewarded_at = now()
  where referred_user_id = new.user_id;

  insert into public.loyalty_ledger (user_id, order_id, points, reason) values
    (v_ref.referrer_user_id, new.id, 200, 'referral_bonus_referrer'),
    (v_ref.referred_user_id, new.id, 200, 'referral_bonus_referred');

  insert into public.notifications (user_id, title, body, link) values
    (
      v_ref.referrer_user_id,
      'مكافأة الإحالة 🎉',
      'صديقك أكمل أول طلب له — كسبت 200 نقطة (= 2,000 ر.ي خصم). شارك رابطك مع المزيد!',
      '/account'
    ),
    (
      v_ref.referred_user_id,
      'مكافأة الترحيب 🎁',
      'أكملت أول طلبك عبر دعوة صديق — كسبت 200 نقطة (= 2,000 ر.ي خصم).',
      '/account'
    );

  return new;
end;
$$;

drop trigger if exists trg_order_referral on public.orders;
create trigger trg_order_referral
  after update of status on public.orders
  for each row
  execute function public.on_order_referral();
