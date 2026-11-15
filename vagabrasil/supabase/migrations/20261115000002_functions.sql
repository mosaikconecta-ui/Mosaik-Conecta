-- =====================================================================
-- VagaBrasil — Funções auxiliares, regras de negócio e triggers
-- Todas as funções SECURITY DEFINER usam search_path vazio.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Utilitários
-- ---------------------------------------------------------------------
create or replace function public.slugify(value text)
returns text
language sql
immutable
set search_path = ''
as $$
  select trim(both '-' from regexp_replace(lower(public.f_unaccent(coalesce(value, ''))), '[^a-z0-9]+', '-', 'g'))
$$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- Chamadas feitas pela service_role (servidor), pelo dono do banco (migrations)
-- ou por funções SECURITY DEFINER são consideradas privilegiadas.
create or replace function public.is_privileged()
returns boolean
language sql
stable
set search_path = ''
as $$
  select current_user in ('service_role', 'postgres', 'supabase_admin')
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin' and status = 'active'
  )
$$;

create or replace function public.is_member_of(p_company uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.company_members m
    join public.profiles p on p.id = m.profile_id
    where m.company_id = p_company and m.profile_id = auth.uid() and p.status = 'active'
  )
$$;

create or replace function public.is_company_owner(p_company uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.company_members
    where company_id = p_company and profile_id = auth.uid() and role = 'owner'
  )
$$;

create or replace function public.my_company_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select company_id from public.company_members where profile_id = auth.uid() limit 1
$$;

create or replace function public.company_is_public(p_company uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.companies where id = p_company and status = 'active')
$$;

create or replace function public.setting_bool(p_key text, p_default boolean)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select (value)::text::boolean from public.platform_settings where key = p_key), p_default)
$$;

-- Plano vigente da empresa (null quando não há assinatura válida)
create or replace function public.company_plan(p_company uuid)
returns public.plans
language sql
stable
security definer
set search_path = ''
as $$
  select pl.*
  from public.subscriptions s
  join public.plans pl on pl.id = s.plan_id
  where s.company_id = p_company
    and (
      (s.status = 'active' and (s.current_period_end is null or s.current_period_end > now() - interval '3 days'))
      or (s.status = 'past_due' and s.current_period_end > now() - interval '5 days')
      or (s.status = 'cancelled' and s.current_period_end > now())
    )
  order by pl.price_cents desc
  limit 1
$$;

-- ---------------------------------------------------------------------
-- Rate limiting (janela fixa). Executado apenas pelo servidor.
-- ---------------------------------------------------------------------
create or replace function public.check_rate_limit(p_key text, p_max integer, p_window_seconds integer)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_window timestamptz := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);
  v_hits integer;
begin
  insert into public.rate_limits (key, window_start, hits)
  values (p_key, v_window, 1)
  on conflict (key, window_start) do update set hits = public.rate_limits.hits + 1
  returning hits into v_hits;
  return v_hits <= p_max;
end;
$$;

-- ---------------------------------------------------------------------
-- Novo usuário → perfil (+ candidato)
-- O papel 'admin' NUNCA pode ser definido pelo cadastro.
-- ---------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_role public.user_role := case when meta ->> 'role' = 'company' then 'company'::public.user_role else 'candidate'::public.user_role end;
  v_state text := upper(nullif(meta ->> 'state', ''));
begin
  insert into public.profiles (id, role, full_name, email, phone, city, state, privacy_consent_at, terms_version, marketing_consent)
  values (
    new.id,
    v_role,
    coalesce(nullif(trim(meta ->> 'full_name'), ''), split_part(new.email, '@', 1)),
    new.email,
    nullif(meta ->> 'phone', ''),
    nullif(meta ->> 'city', ''),
    case when v_state ~ '^[A-Z]{2}$' then v_state else null end,
    case when (meta ->> 'privacy_consent')::boolean is true then now() else null end,
    meta ->> 'terms_version',
    coalesce((meta ->> 'marketing_consent')::boolean, false)
  );

  if v_role = 'candidate' then
    insert into public.candidates (id) values (new.id);
  end if;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Mantém o e-mail do perfil sincronizado com o auth
create or replace function public.handle_user_email_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.email is distinct from old.email then
    update public.profiles set email = new.email where id = new.id;
  end if;
  return new;
end;
$$;

create trigger on_auth_user_email_changed
  after update of email on auth.users
  for each row execute function public.handle_user_email_change();

-- ---------------------------------------------------------------------
-- Proteção de campos sensíveis do perfil
-- ---------------------------------------------------------------------
create or replace function public.guard_profile_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if public.is_privileged() or public.is_admin() then
    return new;
  end if;
  new.id := old.id;
  new.role := old.role;
  new.status := old.status;
  new.email := old.email;
  new.suspended_reason := old.suspended_reason;
  new.created_at := old.created_at;
  return new;
end;
$$;

create trigger profiles_guard before update on public.profiles
  for each row execute function public.guard_profile_update();

-- ---------------------------------------------------------------------
-- Empresas
-- ---------------------------------------------------------------------
create or replace function public.guard_company()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_role public.user_role;
begin
  new.cnpj := regexp_replace(new.cnpj, '[^0-9]', '', 'g');
  new.state := upper(new.state);

  if public.is_privileged() or public.is_admin() then
    if tg_op = 'INSERT' and (new.slug is null or new.slug = '') then
      new.slug := public.slugify(new.trade_name) || '-' || substr(replace(new.id::text, '-', ''), 1, 6);
    end if;
    return new;
  end if;

  if tg_op = 'INSERT' then
    select role into v_role from public.profiles where id = auth.uid() and status = 'active';
    if v_role is distinct from 'company' then
      raise exception 'ONLY_COMPANY_ACCOUNTS' using errcode = '42501';
    end if;
    if exists (select 1 from public.company_members where profile_id = auth.uid()) then
      raise exception 'ALREADY_MEMBER' using errcode = '23505';
    end if;
    new.owner_id := auth.uid();
    new.verification_status := 'pending';
    new.status := 'active';
    new.is_demo := false;
    new.slug := public.slugify(new.trade_name) || '-' || substr(replace(new.id::text, '-', ''), 1, 6);
  else
    new.id := old.id;
    new.owner_id := old.owner_id;
    new.slug := old.slug;
    new.status := old.status;
    new.is_demo := old.is_demo;
    new.created_at := old.created_at;
    -- Alterar CNPJ ou razão social exige nova verificação
    if new.cnpj <> old.cnpj or new.legal_name <> old.legal_name then
      new.verification_status := 'pending';
    else
      new.verification_status := old.verification_status;
    end if;
  end if;
  return new;
end;
$$;

create trigger companies_guard before insert or update on public.companies
  for each row execute function public.guard_company();

create or replace function public.after_company_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.owner_id is not null then
    insert into public.company_members (company_id, profile_id, role)
    values (new.id, new.owner_id, 'owner')
    on conflict do nothing;
  end if;
  insert into public.company_verifications (company_id, status, submitted_by)
  values (new.id, case when new.verification_status = 'verified' then 'verified'::public.verification_status else 'pending'::public.verification_status end, new.owner_id);
  return new;
end;
$$;

create trigger companies_after_insert after insert on public.companies
  for each row execute function public.after_company_insert();

-- Limite de recrutadores por plano
create or replace function public.guard_company_member()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_plan public.plans;
  v_count integer;
begin
  if new.role = 'owner' then
    return new;
  end if;
  v_plan := public.company_plan(new.company_id);
  select count(*) into v_count from public.company_members where company_id = new.company_id;
  if v_count >= coalesce(v_plan.max_recruiters, 1) then
    raise exception 'PLAN_RECRUITER_LIMIT' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger company_members_guard before insert on public.company_members
  for each row execute function public.guard_company_member();

-- ---------------------------------------------------------------------
-- Vagas
-- ---------------------------------------------------------------------
create or replace function public.guard_job()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_privileged boolean := public.is_privileged() or public.is_admin();
  v_company public.companies;
  v_plan public.plans;
  v_used integer;
  v_target public.job_status := new.status;
  v_needs_review boolean;
begin
  new.state := upper(new.state);
  new.city_slug := public.slugify(new.city);

  if tg_op = 'INSERT' then
    new.slug := public.slugify(new.title) || '-' || public.slugify(new.city) || '-' || substr(replace(new.id::text, '-', ''), 1, 6);
    if not v_privileged then
      new.created_by := auth.uid();
      new.is_featured := false;
      new.featured_until := null;
      new.moderation_note := null;
      new.views_count := 0;
      new.is_demo := false;
      new.published_at := null;
      new.closed_at := null;
    end if;
  else
    new.id := old.id;
    new.company_id := old.company_id;
    new.slug := old.slug;
    new.created_at := old.created_at;
    if not v_privileged then
      new.created_by := old.created_by;
      new.is_featured := old.is_featured;
      new.featured_until := old.featured_until;
      new.moderation_note := old.moderation_note;
      new.views_count := old.views_count;
      new.is_demo := old.is_demo;
      new.published_at := old.published_at;
      new.closed_at := old.closed_at;
      if old.status = 'removed' then
        raise exception 'JOB_REMOVED' using errcode = '42501';
      end if;
    end if;
  end if;

  if not v_privileged then
    if v_target = 'removed' then
      raise exception 'FORBIDDEN_STATUS' using errcode = '42501';
    end if;

    -- Publicação (ou republicação) exige plano, limite e verificação
    if v_target in ('active', 'pending_review')
       and (tg_op = 'INSERT' or old.status not in ('active', 'pending_review')) then
      select * into v_company from public.companies where id = new.company_id;
      if v_company.status <> 'active' then
        raise exception 'COMPANY_SUSPENDED' using errcode = '42501';
      end if;
      if new.application_deadline is not null and new.application_deadline < current_date then
        raise exception 'DEADLINE_PASSED' using errcode = 'P0001';
      end if;
      v_plan := public.company_plan(new.company_id);
      if v_plan.id is null then
        raise exception 'NO_ACTIVE_PLAN' using errcode = 'P0001';
      end if;
      select count(*) into v_used from public.jobs
        where company_id = new.company_id and status in ('active', 'pending_review') and id <> new.id;
      if v_used >= v_plan.max_active_jobs then
        raise exception 'PLAN_JOB_LIMIT' using errcode = 'P0001';
      end if;

      v_needs_review := v_company.verification_status <> 'verified'
        or public.setting_bool('require_job_approval', false)
        or (tg_op = 'UPDATE' and old.status = 'pending_review');
      new.status := case when v_needs_review then 'pending_review'::public.job_status else 'active'::public.job_status end;
    elsif tg_op = 'UPDATE' and old.status = 'pending_review' and v_target = 'active' then
      new.status := 'pending_review';
    end if;
  end if;

  if new.status = 'active' and new.published_at is null then
    new.published_at := now();
  end if;
  if new.status = 'closed' and (tg_op = 'INSERT' or old.status <> 'closed') then
    new.closed_at := now();
  elsif new.status <> 'closed' then
    new.closed_at := null;
  end if;
  if new.status <> 'active' and new.featured_until is null then
    new.is_featured := false;
  end if;
  return new;
end;
$$;

create trigger jobs_guard before insert or update on public.jobs
  for each row execute function public.guard_job();

-- Destaque incluído no plano (Profissional / Empresarial)
create or replace function public.set_job_featured(p_job uuid, p_featured boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_job public.jobs;
  v_plan public.plans;
  v_used integer;
begin
  select * into v_job from public.jobs where id = p_job;
  if v_job.id is null or not public.is_member_of(v_job.company_id) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  if p_featured then
    if v_job.status <> 'active' then
      raise exception 'JOB_NOT_ACTIVE' using errcode = 'P0001';
    end if;
    v_plan := public.company_plan(v_job.company_id);
    select count(*) into v_used from public.jobs
      where company_id = v_job.company_id and is_featured and featured_until is null and status = 'active' and id <> p_job;
    if coalesce(v_plan.featured_slots, 0) <= v_used then
      raise exception 'PLAN_FEATURED_LIMIT' using errcode = 'P0001';
    end if;
    update public.jobs set is_featured = true, featured_until = null where id = p_job;
  else
    update public.jobs set is_featured = false
      where id = p_job and (featured_until is null or featured_until < now());
  end if;
end;
$$;

create or replace function public.increment_job_view(p_job uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.jobs set views_count = views_count + 1 where id = p_job and status = 'active'
$$;

-- ---------------------------------------------------------------------
-- Candidaturas
-- ---------------------------------------------------------------------
create or replace function public.guard_application()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_job public.jobs;
  v_is_member boolean;
begin
  if tg_op = 'INSERT' then
    select * into v_job from public.jobs where id = new.job_id;
    if v_job.id is null or v_job.status <> 'active' or not public.company_is_public(v_job.company_id) then
      raise exception 'JOB_NOT_OPEN' using errcode = 'P0001';
    end if;
    if v_job.application_deadline is not null and v_job.application_deadline < current_date then
      raise exception 'JOB_EXPIRED' using errcode = 'P0001';
    end if;
    if v_job.is_demo and not public.is_privileged() then
      raise exception 'DEMO_JOB' using errcode = 'P0001';
    end if;
    if new.resume_id is not null and not exists (
      select 1 from public.resumes where id = new.resume_id and candidate_id = new.candidate_id
    ) then
      raise exception 'INVALID_RESUME' using errcode = '42501';
    end if;
    if not public.is_privileged() then
      new.status := 'received';
      new.status_changed_at := now();
    end if;
    return new;
  end if;

  -- UPDATE
  if public.is_privileged() or public.is_admin() then
    if new.status is distinct from old.status then
      new.status_changed_at := now();
    end if;
    return new;
  end if;

  select exists (
    select 1 from public.jobs j where j.id = old.job_id and public.is_member_of(j.company_id)
  ) into v_is_member;

  new.id := old.id;
  new.job_id := old.job_id;
  new.candidate_id := old.candidate_id;
  new.created_at := old.created_at;

  if v_is_member then
    -- A empresa altera somente o status
    new.resume_id := old.resume_id;
    new.cover_letter := old.cover_letter;
  elsif old.candidate_id = auth.uid() then
    -- O candidato pode apenas desistir (encerrar) a candidatura
    if new.status is distinct from old.status and new.status <> 'closed' then
      raise exception 'FORBIDDEN_STATUS' using errcode = '42501';
    end if;
    new.resume_id := old.resume_id;
    new.cover_letter := old.cover_letter;
  else
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  if new.status is distinct from old.status then
    new.status_changed_at := now();
  else
    new.status_changed_at := old.status_changed_at;
  end if;
  return new;
end;
$$;

create trigger applications_guard before insert or update on public.applications
  for each row execute function public.guard_application();

-- ---------------------------------------------------------------------
-- Notificações automáticas (fila: o envio de e-mail é feito pelo servidor)
-- ---------------------------------------------------------------------
create or replace function public.notify(p_user uuid, p_type text, p_title text, p_body text, p_link text)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.notifications (user_id, type, title, body, link)
  values (p_user, p_type, p_title, p_body, p_link)
$$;

create or replace function public.application_status_label(p public.application_status)
returns text
language sql
immutable
set search_path = ''
as $$
  select case p
    when 'received' then 'Recebida'
    when 'in_review' then 'Em análise'
    when 'in_process' then 'Em processo seletivo'
    when 'approved' then 'Aprovada'
    when 'rejected' then 'Reprovada'
    when 'closed' then 'Encerrada'
  end
$$;

create or replace function public.after_application_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_job public.jobs;
  v_company_name text;
  v_member record;
begin
  select * into v_job from public.jobs where id = new.job_id;
  select trade_name into v_company_name from public.companies where id = v_job.company_id;

  if tg_op = 'INSERT' then
    insert into public.application_events (application_id, from_status, to_status, changed_by)
    values (new.id, null, new.status, auth.uid());

    perform public.notify(
      new.candidate_id, 'application_received',
      'Candidatura enviada: ' || v_job.title,
      'Sua candidatura para ' || v_job.title || ' em ' || v_company_name || ' foi recebida.',
      '/candidato/candidaturas'
    );

    for v_member in select profile_id from public.company_members where company_id = v_job.company_id loop
      perform public.notify(
        v_member.profile_id, 'new_application',
        'Nova candidatura: ' || v_job.title,
        'Um novo candidato se inscreveu na vaga ' || v_job.title || '.',
        '/empresa/candidatos/' || new.id
      );
    end loop;
  elsif new.status is distinct from old.status then
    insert into public.application_events (application_id, from_status, to_status, changed_by)
    values (new.id, old.status, new.status, auth.uid());

    if auth.uid() is distinct from new.candidate_id then
      perform public.notify(
        new.candidate_id, 'application_status',
        'Atualização da candidatura: ' || v_job.title,
        'O status da sua candidatura em ' || v_company_name || ' mudou para "' || public.application_status_label(new.status) || '".',
        '/candidato/candidaturas'
      );
    end if;
  end if;
  return new;
end;
$$;

create trigger applications_after_change after insert or update of status on public.applications
  for each row execute function public.after_application_change();

-- ---------------------------------------------------------------------
-- updated_at
-- ---------------------------------------------------------------------
create trigger profiles_updated before update on public.profiles for each row execute function public.set_updated_at();
create trigger candidates_updated before update on public.candidates for each row execute function public.set_updated_at();
create trigger companies_updated before update on public.companies for each row execute function public.set_updated_at();
create trigger jobs_updated before update on public.jobs for each row execute function public.set_updated_at();
create trigger applications_updated before update on public.applications for each row execute function public.set_updated_at();
create trigger subscriptions_updated before update on public.subscriptions for each row execute function public.set_updated_at();
create trigger payments_updated before update on public.payments for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- Indicadores
-- ---------------------------------------------------------------------
create or replace function public.company_dashboard_stats(p_company uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v jsonb;
begin
  if not (public.is_member_of(p_company) or public.is_admin()) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  select jsonb_build_object(
    'total_jobs', (select count(*) from public.jobs where company_id = p_company and status <> 'draft'),
    'active_jobs', (select count(*) from public.jobs where company_id = p_company and status = 'active'),
    'pending_jobs', (select count(*) from public.jobs where company_id = p_company and status = 'pending_review'),
    'closed_jobs', (select count(*) from public.jobs where company_id = p_company and status = 'closed'),
    'total_applications', (select count(*) from public.applications a join public.jobs j on j.id = a.job_id where j.company_id = p_company),
    'new_applications', (select count(*) from public.applications a join public.jobs j on j.id = a.job_id where j.company_id = p_company and a.status = 'received'),
    'applications_7d', (select count(*) from public.applications a join public.jobs j on j.id = a.job_id where j.company_id = p_company and a.created_at > now() - interval '7 days'),
    'total_views', (select coalesce(sum(views_count), 0) from public.jobs where company_id = p_company),
    'approved', (select count(*) from public.applications a join public.jobs j on j.id = a.job_id where j.company_id = p_company and a.status = 'approved'),
    'by_status', (
      select coalesce(jsonb_object_agg(status, n), '{}'::jsonb) from (
        select a.status, count(*) n from public.applications a join public.jobs j on j.id = a.job_id
        where j.company_id = p_company group by a.status
      ) s
    ),
    'avg_days_to_decision', (
      select round(avg(extract(epoch from (a.status_changed_at - a.created_at)) / 86400)::numeric, 1)
      from public.applications a join public.jobs j on j.id = a.job_id
      where j.company_id = p_company and a.status in ('approved', 'rejected')
    )
  ) into v;
  return v;
end;
$$;

create or replace function public.company_job_report(p_company uuid)
returns table (
  job_id uuid, title text, status public.job_status, published_at timestamptz, views integer,
  applications bigint, in_process bigint, approved bigint, rejected bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not (public.is_member_of(p_company) or public.is_admin()) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  return query
    select j.id, j.title, j.status, j.published_at, j.views_count,
      count(a.id),
      count(a.id) filter (where a.status in ('in_review', 'in_process')),
      count(a.id) filter (where a.status = 'approved'),
      count(a.id) filter (where a.status = 'rejected')
    from public.jobs j
    left join public.applications a on a.job_id = j.id
    where j.company_id = p_company and j.status <> 'draft'
    group by j.id
    order by j.published_at desc nulls last;
end;
$$;

create or replace function public.admin_dashboard_stats()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not (public.is_admin() or public.is_privileged()) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  return jsonb_build_object(
    'users', (select count(*) from public.profiles),
    'candidates', (select count(*) from public.profiles where role = 'candidate'),
    'companies', (select count(*) from public.companies where not is_demo),
    'companies_pending', (select count(*) from public.companies where verification_status = 'pending'),
    'jobs', (select count(*) from public.jobs),
    'jobs_active', (select count(*) from public.jobs where status = 'active'),
    'jobs_pending', (select count(*) from public.jobs where status = 'pending_review'),
    'applications', (select count(*) from public.applications),
    'applications_30d', (select count(*) from public.applications where created_at > now() - interval '30 days'),
    'subscriptions_active', (select count(*) from public.subscriptions where status in ('active', 'past_due') and provider = 'mercadopago'),
    'subscriptions_test', (select count(*) from public.subscriptions where status in ('active', 'past_due') and provider = 'dev'),
    'mrr_cents', (
      select coalesce(sum(p.price_cents), 0) from public.subscriptions s join public.plans p on p.id = s.plan_id
      where s.status in ('active', 'past_due') and s.provider = 'mercadopago'
    ),
    'revenue_30d_cents', (
      select coalesce(sum(amount_cents), 0) from public.payments
      where status = 'approved' and provider = 'mercadopago' and paid_at > now() - interval '30 days'
    ),
    'reports_open', (select count(*) from public.reports where status in ('open', 'reviewing'))
  );
end;
$$;

-- Cidades com vagas ativas (páginas SEO e filtros)
create or replace function public.active_job_locations(p_limit integer default 200)
returns table (city text, city_slug text, state char(2), total bigint)
language sql
stable
security definer
set search_path = ''
as $$
  select min(j.city), j.city_slug, j.state, count(*)
  from public.jobs j
  where j.status = 'active' and public.company_is_public(j.company_id)
    and (j.application_deadline is null or j.application_deadline >= current_date)
  group by j.city_slug, j.state
  order by count(*) desc
  limit p_limit
$$;

create or replace function public.active_job_categories()
returns table (id integer, slug text, name text, icon text, total bigint)
language sql
stable
security definer
set search_path = ''
as $$
  select c.id, c.slug, c.name, c.icon, count(j.id)
  from public.job_categories c
  left join public.jobs j on j.category_id = c.id and j.status = 'active' and public.company_is_public(j.company_id)
    and (j.application_deadline is null or j.application_deadline >= current_date)
  group by c.id
  order by c.sort_order, c.name
$$;

-- ---------------------------------------------------------------------
-- Views públicas (expõem somente colunas seguras)
-- ---------------------------------------------------------------------
create or replace view public.public_companies as
  select c.id, c.trade_name, c.slug, c.description, c.logo_path, c.city, c.state, c.website,
    (c.verification_status = 'verified') as is_verified, c.is_demo, c.created_at,
    (select count(*) from public.jobs j where j.company_id = c.id and j.status = 'active'
      and (j.application_deadline is null or j.application_deadline >= current_date)) as active_jobs
  from public.companies c
  where c.status = 'active';

create or replace view public.public_jobs as
  select j.id, j.slug, j.title, j.openings, j.description, j.responsibilities, j.requirements, j.benefits,
    j.schedule, j.salary_min, j.salary_max, j.city, j.city_slug, j.state, j.work_mode, j.contract_type,
    j.education_level, j.experience_level, j.application_deadline, j.status, j.published_at, j.closed_at,
    j.updated_at, j.is_demo, j.search, j.company_id, j.category_id,
    (j.is_featured and (j.featured_until is null or j.featured_until > now())) as is_featured,
    (j.status <> 'active' or (j.application_deadline is not null and j.application_deadline < current_date)) as is_closed,
    c.trade_name as company_name, c.slug as company_slug, c.logo_path as company_logo,
    (c.verification_status = 'verified') as company_verified,
    cat.slug as category_slug, cat.name as category_name
  from public.jobs j
  join public.companies c on c.id = j.company_id and c.status = 'active'
  join public.job_categories cat on cat.id = j.category_id
  where j.status in ('active', 'paused', 'closed');

-- Dados dos candidatos SOMENTE para empresas onde houve candidatura
create or replace view public.company_applicants as
  select a.id as application_id, a.job_id, j.title as job_title, j.company_id, a.status, a.created_at,
    a.status_changed_at, a.cover_letter, a.resume_id,
    a.candidate_id, p.full_name, p.email,
    case when c.share_contact_with_companies then p.phone end as phone,
    p.city, p.state, c.headline, c.summary, c.experiences, c.education, c.skills, c.languages,
    c.linkedin_url, c.desired_salary, c.available_to_relocate
  from public.applications a
  join public.jobs j on j.id = a.job_id
  join public.candidates c on c.id = a.candidate_id
  join public.profiles p on p.id = a.candidate_id
  where public.is_member_of(j.company_id) or public.is_admin();
