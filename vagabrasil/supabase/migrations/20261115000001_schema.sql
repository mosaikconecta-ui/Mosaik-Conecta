-- =====================================================================
-- VagaBrasil — Schema principal
-- Tabelas, tipos, relacionamentos e índices.
-- =====================================================================

create schema if not exists extensions;
create extension if not exists unaccent with schema extensions;
create extension if not exists pg_trgm with schema extensions;
create extension if not exists pgcrypto with schema extensions;

-- Remoção de acentos IMUTÁVEL (necessária para colunas geradas / índices)
create or replace function public.f_unaccent(text)
returns text
language sql
immutable
parallel safe
strict
set search_path = ''
as $$
  select extensions.unaccent('extensions.unaccent'::regdictionary, $1)
$$;

-- ---------------------------------------------------------------------
-- Tipos
-- ---------------------------------------------------------------------
create type public.user_role as enum ('candidate', 'company', 'admin');
create type public.account_status as enum ('active', 'suspended');
create type public.verification_status as enum ('pending', 'verified', 'rejected');
create type public.member_role as enum ('owner', 'recruiter');
create type public.job_status as enum ('draft', 'pending_review', 'active', 'paused', 'closed', 'removed');
create type public.work_mode as enum ('presencial', 'hibrido', 'remoto');
create type public.contract_type as enum ('clt', 'pj', 'estagio', 'temporario', 'aprendiz', 'freelancer', 'trainee');
create type public.education_level as enum ('nenhuma', 'fundamental', 'medio', 'tecnico', 'superior_cursando', 'superior', 'pos_graduacao');
create type public.experience_level as enum ('sem_experiencia', 'ate_1_ano', '1_a_3_anos', '3_a_5_anos', 'mais_5_anos');
create type public.application_status as enum ('received', 'in_review', 'in_process', 'approved', 'rejected', 'closed');
create type public.subscription_status as enum ('pending', 'active', 'past_due', 'cancelled', 'expired');
create type public.payment_status as enum ('pending', 'approved', 'rejected', 'refunded', 'cancelled', 'in_process');
create type public.payment_kind as enum ('subscription', 'featured_job');
create type public.payment_provider as enum ('mercadopago', 'dev');
create type public.report_status as enum ('open', 'reviewing', 'resolved', 'dismissed');
create type public.email_status as enum ('pending', 'sent', 'skipped', 'failed');

-- ---------------------------------------------------------------------
-- Perfis (1:1 com auth.users)
-- ---------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role public.user_role not null default 'candidate',
  status public.account_status not null default 'active',
  full_name text not null check (char_length(full_name) between 2 and 120),
  email text not null,
  phone text check (phone is null or char_length(phone) <= 20),
  city text check (city is null or char_length(city) <= 80),
  state char(2),
  privacy_consent_at timestamptz,
  terms_version text,
  marketing_consent boolean not null default false,
  suspended_reason text,
  last_seen_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index profiles_role_idx on public.profiles (role);
create index profiles_email_idx on public.profiles (lower(email));

-- ---------------------------------------------------------------------
-- Candidatos (dados profissionais)
-- ---------------------------------------------------------------------
create table public.candidates (
  id uuid primary key references public.profiles (id) on delete cascade,
  headline text check (headline is null or char_length(headline) <= 120),
  summary text check (summary is null or char_length(summary) <= 3000),
  experiences jsonb not null default '[]'::jsonb,
  education jsonb not null default '[]'::jsonb,
  skills text[] not null default '{}',
  languages text[] not null default '{}',
  linkedin_url text,
  desired_role text,
  desired_salary integer check (desired_salary is null or desired_salary >= 0),
  preferred_work_modes public.work_mode[] not null default '{}',
  preferred_contract_types public.contract_type[] not null default '{}',
  preferred_category_ids integer[] not null default '{}',
  preferred_states char(2)[] not null default '{}',
  available_to_relocate boolean not null default false,
  -- Privacidade
  share_contact_with_companies boolean not null default true,
  job_alerts_enabled boolean not null default true,
  email_notifications boolean not null default true,
  last_alert_sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint experiences_is_array check (jsonb_typeof(experiences) = 'array'),
  constraint education_is_array check (jsonb_typeof(education) = 'array')
);

-- ---------------------------------------------------------------------
-- Empresas
-- ---------------------------------------------------------------------
create table public.companies (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references public.profiles (id) on delete set null,
  legal_name text not null check (char_length(legal_name) between 2 and 160),
  trade_name text not null check (char_length(trade_name) between 2 and 120),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  cnpj char(14) not null unique check (cnpj ~ '^[0-9]{14}$'),
  email text not null,
  phone text,
  website text,
  address text,
  city text not null,
  state char(2) not null,
  description text check (description is null or char_length(description) <= 4000),
  logo_path text,
  verification_status public.verification_status not null default 'pending',
  status public.account_status not null default 'active',
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index companies_owner_idx on public.companies (owner_id);
create index companies_verification_idx on public.companies (verification_status);

create table public.company_members (
  company_id uuid not null references public.companies (id) on delete cascade,
  profile_id uuid not null unique references public.profiles (id) on delete cascade,
  role public.member_role not null default 'recruiter',
  created_at timestamptz not null default now(),
  primary key (company_id, profile_id)
);

create table public.company_invites (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  email text not null,
  token text not null unique default encode(extensions.gen_random_bytes(24), 'hex'),
  invited_by uuid references public.profiles (id) on delete set null,
  accepted_at timestamptz,
  expires_at timestamptz not null default now() + interval '7 days',
  created_at timestamptz not null default now()
);
create index company_invites_company_idx on public.company_invites (company_id);

create table public.company_verifications (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  status public.verification_status not null default 'pending',
  document_path text,
  submitted_by uuid references public.profiles (id) on delete set null,
  notes text,
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);
create index company_verifications_company_idx on public.company_verifications (company_id, created_at desc);
create index company_verifications_status_idx on public.company_verifications (status);

-- ---------------------------------------------------------------------
-- Categorias e vagas
-- ---------------------------------------------------------------------
create table public.job_categories (
  id serial primary key,
  slug text not null unique,
  name text not null,
  description text,
  icon text,
  sort_order integer not null default 0
);

create table public.jobs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  category_id integer not null references public.job_categories (id),
  slug text not null unique,
  title text not null check (char_length(title) between 3 and 120),
  openings integer not null default 1 check (openings between 1 and 999),
  description text not null check (char_length(description) between 30 and 10000),
  responsibilities text check (responsibilities is null or char_length(responsibilities) <= 5000),
  requirements text check (requirements is null or char_length(requirements) <= 5000),
  benefits text check (benefits is null or char_length(benefits) <= 3000),
  schedule text check (schedule is null or char_length(schedule) <= 200),
  salary_min integer check (salary_min is null or salary_min >= 0),
  salary_max integer check (salary_max is null or salary_max >= 0),
  city text not null,
  city_slug text not null,
  state char(2) not null,
  work_mode public.work_mode not null,
  contract_type public.contract_type not null,
  education_level public.education_level not null default 'nenhuma',
  experience_level public.experience_level not null default 'sem_experiencia',
  application_deadline date,
  status public.job_status not null default 'draft',
  is_featured boolean not null default false,
  featured_until timestamptz,
  moderation_note text,
  published_at timestamptz,
  closed_at timestamptz,
  views_count integer not null default 0,
  created_by uuid references public.profiles (id) on delete set null,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  search tsvector generated always as (
    setweight(to_tsvector('portuguese', public.f_unaccent(coalesce(title, ''))), 'A') ||
    setweight(to_tsvector('portuguese', public.f_unaccent(coalesce(city, ''))), 'B') ||
    setweight(to_tsvector('portuguese', public.f_unaccent(coalesce(requirements, ''))), 'C') ||
    setweight(to_tsvector('portuguese', public.f_unaccent(coalesce(description, ''))), 'D')
  ) stored,
  constraint salary_range check (salary_min is null or salary_max is null or salary_max >= salary_min)
);
create index jobs_search_idx on public.jobs using gin (search);
create index jobs_public_idx on public.jobs (status, published_at desc);
create index jobs_company_idx on public.jobs (company_id, status);
create index jobs_category_idx on public.jobs (category_id) where status = 'active';
create index jobs_location_idx on public.jobs (state, city_slug) where status = 'active';
create index jobs_featured_idx on public.jobs (is_featured, featured_until) where status = 'active';
create index jobs_title_trgm_idx on public.jobs using gin (public.f_unaccent(lower(title)) extensions.gin_trgm_ops);

-- ---------------------------------------------------------------------
-- Currículos, candidaturas e vagas salvas
-- ---------------------------------------------------------------------
create table public.resumes (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references public.candidates (id) on delete cascade,
  storage_path text not null unique,
  file_name text not null,
  size_bytes integer not null check (size_bytes > 0 and size_bytes <= 5242880),
  mime_type text not null default 'application/pdf' check (mime_type = 'application/pdf'),
  is_primary boolean not null default true,
  created_at timestamptz not null default now()
);
create index resumes_candidate_idx on public.resumes (candidate_id);

create table public.applications (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs (id) on delete cascade,
  candidate_id uuid not null references public.candidates (id) on delete cascade,
  resume_id uuid references public.resumes (id) on delete set null,
  cover_letter text check (cover_letter is null or char_length(cover_letter) <= 3000),
  status public.application_status not null default 'received',
  status_changed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (job_id, candidate_id)
);
create index applications_job_idx on public.applications (job_id, created_at desc);
create index applications_candidate_idx on public.applications (candidate_id, created_at desc);
create index applications_status_idx on public.applications (status);

-- Histórico de status (visível ao candidato e à empresa)
create table public.application_events (
  id bigserial primary key,
  application_id uuid not null references public.applications (id) on delete cascade,
  from_status public.application_status,
  to_status public.application_status not null,
  changed_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);
create index application_events_app_idx on public.application_events (application_id, created_at);

-- Anotações internas da empresa (nunca visíveis ao candidato)
create table public.application_notes (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications (id) on delete cascade,
  author_id uuid references public.profiles (id) on delete set null,
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);
create index application_notes_app_idx on public.application_notes (application_id);

create table public.saved_jobs (
  candidate_id uuid not null references public.candidates (id) on delete cascade,
  job_id uuid not null references public.jobs (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (candidate_id, job_id)
);
create index saved_jobs_job_idx on public.saved_jobs (job_id);

-- ---------------------------------------------------------------------
-- Planos, assinaturas e pagamentos
-- ---------------------------------------------------------------------
create table public.plans (
  id text primary key,
  name text not null,
  price_cents integer not null check (price_cents >= 0),
  currency char(3) not null default 'BRL',
  max_active_jobs integer not null,
  max_recruiters integer not null default 1,
  featured_slots integer not null default 0,
  candidate_filters boolean not null default false,
  reports boolean not null default false,
  pipeline boolean not null default false,
  advanced_metrics boolean not null default false,
  team_management boolean not null default false,
  features text[] not null default '{}',
  sort_order integer not null default 0,
  is_active boolean not null default true
);

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  plan_id text not null references public.plans (id),
  status public.subscription_status not null default 'pending',
  provider public.payment_provider not null,
  provider_subscription_id text unique,
  checkout_url text,
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  cancelled_at timestamptz,
  last_payment_failed_at timestamptz,
  expiry_notice_sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index subscriptions_company_idx on public.subscriptions (company_id, created_at desc);
create index subscriptions_status_idx on public.subscriptions (status);
-- Apenas uma assinatura "viva" por empresa
create unique index subscriptions_one_live_per_company
  on public.subscriptions (company_id)
  where status in ('active', 'past_due');

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  subscription_id uuid references public.subscriptions (id) on delete set null,
  job_id uuid references public.jobs (id) on delete set null,
  kind public.payment_kind not null,
  provider public.payment_provider not null,
  provider_payment_id text,
  amount_cents integer not null check (amount_cents >= 0),
  currency char(3) not null default 'BRL',
  status public.payment_status not null default 'pending',
  status_detail text,
  description text,
  checkout_url text,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, provider_payment_id)
);
create index payments_company_idx on public.payments (company_id, created_at desc);
create index payments_status_idx on public.payments (status, paid_at);

-- Idempotência de webhooks
create table public.webhook_events (
  id bigserial primary key,
  provider text not null,
  event_key text not null,
  topic text,
  payload jsonb,
  processed_at timestamptz,
  error text,
  created_at timestamptz not null default now(),
  unique (provider, event_key)
);

-- ---------------------------------------------------------------------
-- Notificações, denúncias, auditoria, configurações
-- ---------------------------------------------------------------------
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  type text not null,
  title text not null,
  body text,
  link text,
  read_at timestamptz,
  email_status public.email_status not null default 'pending',
  email_sent_at timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on public.notifications (user_id, created_at desc);
create index notifications_email_queue_idx on public.notifications (created_at) where email_status = 'pending';

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid references public.profiles (id) on delete set null,
  job_id uuid references public.jobs (id) on delete cascade,
  company_id uuid references public.companies (id) on delete cascade,
  reason text not null check (reason in ('fraude', 'cobranca_candidato', 'discriminacao', 'conteudo_improprio', 'vaga_inexistente', 'outro')),
  details text check (details is null or char_length(details) <= 2000),
  status public.report_status not null default 'open',
  resolution text,
  resolved_by uuid references public.profiles (id) on delete set null,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  constraint report_target check (job_id is not null or company_id is not null)
);
create index reports_status_idx on public.reports (status, created_at desc);

create table public.admin_logs (
  id bigserial primary key,
  admin_id uuid references public.profiles (id) on delete set null,
  action text not null,
  target_type text not null,
  target_id text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index admin_logs_created_idx on public.admin_logs (created_at desc);

create table public.platform_settings (
  key text primary key,
  value jsonb not null,
  updated_by uuid references public.profiles (id) on delete set null,
  updated_at timestamptz not null default now()
);

-- Depoimentos reais (exibidos somente quando aprovados)
create table public.testimonials (
  id uuid primary key default gen_random_uuid(),
  author_id uuid references public.profiles (id) on delete set null,
  author_name text not null,
  author_role text,
  body text not null check (char_length(body) between 20 and 600),
  approved boolean not null default false,
  created_at timestamptz not null default now()
);

-- Rate limiting (janela fixa)
create table public.rate_limits (
  key text not null,
  window_start timestamptz not null,
  hits integer not null default 1,
  primary key (key, window_start)
);
