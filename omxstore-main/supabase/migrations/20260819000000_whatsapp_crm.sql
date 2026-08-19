-- OMEX WhatsApp CRM
-- Phase 1: WhatsApp contacts, devices, conversations and messages

create extension if not exists pgcrypto;

-- =========================================================
-- WhatsApp devices
-- =========================================================

create table if not exists public.whatsapp_devices (
  id uuid primary key default gen_random_uuid(),
  device_id text not null unique,
  name text,
  phone text,
  status text not null default 'disconnected'
    check (status in ('connected', 'disconnected', 'connecting', 'logged_out')),
  provider text not null default 'gowa',
  last_seen_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- =========================================================
-- WhatsApp contacts
-- =========================================================

create table if not exists public.whatsapp_contacts (
  id uuid primary key default gen_random_uuid(),

  phone text not null unique,
  wa_jid text unique,

  full_name text,
  profile_name text,

  customer_id uuid references public.profiles(id) on delete set null,

  governorate text,
  city text,
  address text,

  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),

  total_conversations integer not null default 0,
  total_messages integer not null default 0,
  total_orders integer not null default 0,
  total_spent numeric(12,2) not null default 0,

  is_blocked boolean not null default false,
  notes text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_whatsapp_contacts_customer_id
  on public.whatsapp_contacts(customer_id);

create index if not exists idx_whatsapp_contacts_last_seen
  on public.whatsapp_contacts(last_seen_at desc);

-- =========================================================
-- WhatsApp conversations
-- =========================================================

create table if not exists public.whatsapp_conversations (
  id uuid primary key default gen_random_uuid(),

  contact_id uuid not null
    references public.whatsapp_contacts(id)
    on delete cascade,

  device_id uuid
    references public.whatsapp_devices(id)
    on delete set null,

  status text not null default 'open'
    check (status in ('open', 'pending', 'resolved', 'closed')),

  assigned_to uuid
    references public.profiles(id)
    on delete set null,

  unread_count integer not null default 0,

  last_message_at timestamptz,
  last_message_preview text,

  ai_enabled boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_whatsapp_conversations_contact
  on public.whatsapp_conversations(contact_id);

create index if not exists idx_whatsapp_conversations_status
  on public.whatsapp_conversations(status);

create index if not exists idx_whatsapp_conversations_last_message
  on public.whatsapp_conversations(last_message_at desc);

-- =========================================================
-- WhatsApp messages
-- =========================================================

create table if not exists public.whatsapp_messages (
  id uuid primary key default gen_random_uuid(),

  conversation_id uuid not null
    references public.whatsapp_conversations(id)
    on delete cascade,

  contact_id uuid not null
    references public.whatsapp_contacts(id)
    on delete cascade,

  device_id uuid
    references public.whatsapp_devices(id)
    on delete set null,

  external_message_id text,

  direction text not null
    check (direction in ('inbound', 'outbound')),

  sender_type text not null default 'customer'
    check (sender_type in ('customer', 'agent', 'ai', 'system')),

  message_type text not null default 'text'
    check (
      message_type in (
        'text',
        'image',
        'video',
        'audio',
        'document',
        'sticker',
        'location',
        'contact',
        'reaction',
        'unknown'
      )
    ),

  body text,

  media_url text,
  media_mime_type text,

  quoted_message_id uuid
    references public.whatsapp_messages(id)
    on delete set null,

  is_read boolean not null default false,

  ai_generated boolean not null default false,
  ai_model text,

  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),

  unique(device_id, external_message_id)
);

create index if not exists idx_whatsapp_messages_conversation
  on public.whatsapp_messages(conversation_id, created_at desc);

create index if not exists idx_whatsapp_messages_contact
  on public.whatsapp_messages(contact_id, created_at desc);

create index if not exists idx_whatsapp_messages_external_id
  on public.whatsapp_messages(external_message_id);

-- =========================================================
-- AI settings
-- =========================================================

create table if not exists public.whatsapp_ai_settings (
  id uuid primary key default gen_random_uuid(),

  enabled boolean not null default true,

  system_prompt text,

  welcome_message text,

  fallback_message text,

  business_hours_enabled boolean not null default false,

  business_hours_start time,
  business_hours_end time,

  auto_create_orders boolean not null default false,

  auto_answer_product_questions boolean not null default true,

  auto_answer_order_questions boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Keep a single global AI configuration.
create unique index if not exists idx_whatsapp_ai_settings_singleton
  on public.whatsapp_ai_settings ((true));

insert into public.whatsapp_ai_settings (
  enabled,
  auto_answer_product_questions,
  auto_answer_order_questions
)
values (
  true,
  true,
  true
)
on conflict do nothing;

-- =========================================================
-- Webhook event deduplication
-- =========================================================

create table if not exists public.whatsapp_webhook_events (
  id uuid primary key default gen_random_uuid(),

  device_id text,

  external_event_id text,

  event_type text not null,

  payload jsonb not null default '{}'::jsonb,

  processed boolean not null default false,

  processed_at timestamptz,

  error_message text,

  created_at timestamptz not null default now(),

  unique(device_id, external_event_id)
);

create index if not exists idx_whatsapp_webhook_events_processed
  on public.whatsapp_webhook_events(processed, created_at);

-- =========================================================
-- Updated-at helper
-- =========================================================

create or replace function public.set_whatsapp_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_whatsapp_devices_updated_at
  on public.whatsapp_devices;

create trigger trg_whatsapp_devices_updated_at
before update on public.whatsapp_devices
for each row
execute function public.set_whatsapp_updated_at();

drop trigger if exists trg_whatsapp_contacts_updated_at
  on public.whatsapp_contacts;

create trigger trg_whatsapp_contacts_updated_at
before update on public.whatsapp_contacts
for each row
execute function public.set_whatsapp_updated_at();

drop trigger if exists trg_whatsapp_conversations_updated_at
  on public.whatsapp_conversations;

create trigger trg_whatsapp_conversations_updated_at
before update on public.whatsapp_conversations
for each row
execute function public.set_whatsapp_updated_at();

drop trigger if exists trg_whatsapp_ai_settings_updated_at
  on public.whatsapp_ai_settings;

create trigger trg_whatsapp_ai_settings_updated_at
before update on public.whatsapp_ai_settings
for each row
execute function public.set_whatsapp_updated_at();

-- =========================================================
-- RLS
-- =========================================================

alter table public.whatsapp_devices enable row level security;
alter table public.whatsapp_contacts enable row level security;
alter table public.whatsapp_conversations enable row level security;
alter table public.whatsapp_messages enable row level security;
alter table public.whatsapp_ai_settings enable row level security;
alter table public.whatsapp_webhook_events enable row level security;
