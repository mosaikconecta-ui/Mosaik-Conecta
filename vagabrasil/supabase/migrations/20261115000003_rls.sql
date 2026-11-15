-- =====================================================================
-- VagaBrasil — Row Level Security, permissões e storage
-- Princípio: negar por padrão; cada política libera o mínimo necessário.
-- =====================================================================

alter table public.profiles enable row level security;
alter table public.candidates enable row level security;
alter table public.companies enable row level security;
alter table public.company_members enable row level security;
alter table public.company_invites enable row level security;
alter table public.company_verifications enable row level security;
alter table public.job_categories enable row level security;
alter table public.jobs enable row level security;
alter table public.resumes enable row level security;
alter table public.applications enable row level security;
alter table public.application_events enable row level security;
alter table public.application_notes enable row level security;
alter table public.saved_jobs enable row level security;
alter table public.plans enable row level security;
alter table public.subscriptions enable row level security;
alter table public.payments enable row level security;
alter table public.webhook_events enable row level security;
alter table public.notifications enable row level security;
alter table public.reports enable row level security;
alter table public.admin_logs enable row level security;
alter table public.platform_settings enable row level security;
alter table public.testimonials enable row level security;
alter table public.rate_limits enable row level security;

-- ---------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------
create policy profiles_select on public.profiles for select to authenticated
  using (
    id = auth.uid()
    or public.is_admin()
    or exists (
      select 1 from public.company_members me
      join public.company_members other on other.company_id = me.company_id
      where me.profile_id = auth.uid() and other.profile_id = profiles.id
    )
  );
create policy profiles_update on public.profiles for update to authenticated
  using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

-- ---------------------------------------------------------------------
-- candidates (empresas acessam pela view company_applicants)
-- ---------------------------------------------------------------------
create policy candidates_select on public.candidates for select to authenticated
  using (id = auth.uid() or public.is_admin());
create policy candidates_update on public.candidates for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- ---------------------------------------------------------------------
-- companies (o público acessa pela view public_companies)
-- ---------------------------------------------------------------------
create policy companies_select on public.companies for select to authenticated
  using (public.is_member_of(id) or public.is_admin());
create policy companies_insert on public.companies for insert to authenticated
  with check (owner_id = auth.uid());
create policy companies_update on public.companies for update to authenticated
  using (public.is_company_owner(id) or public.is_admin())
  with check (public.is_company_owner(id) or public.is_admin());

create policy members_select on public.company_members for select to authenticated
  using (public.is_member_of(company_id) or public.is_admin());
create policy members_delete on public.company_members for delete to authenticated
  using (public.is_company_owner(company_id) and role <> 'owner');

create policy invites_select on public.company_invites for select to authenticated
  using (public.is_company_owner(company_id));
create policy invites_insert on public.company_invites for insert to authenticated
  with check (public.is_company_owner(company_id) and invited_by = auth.uid());
create policy invites_delete on public.company_invites for delete to authenticated
  using (public.is_company_owner(company_id));

create policy verifications_select on public.company_verifications for select to authenticated
  using (public.is_member_of(company_id) or public.is_admin());
create policy verifications_insert on public.company_verifications for insert to authenticated
  with check (
    public.is_company_owner(company_id) and status = 'pending'
    and reviewed_by is null and reviewed_at is null and submitted_by = auth.uid()
  );

-- ---------------------------------------------------------------------
-- Categorias, planos, configurações (leitura pública)
-- ---------------------------------------------------------------------
create policy categories_select on public.job_categories for select to anon, authenticated using (true);
create policy plans_select on public.plans for select to anon, authenticated using (is_active or public.is_admin());
create policy settings_select on public.platform_settings for select to anon, authenticated using (true);
create policy settings_update on public.platform_settings for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy settings_insert on public.platform_settings for insert to authenticated
  with check (public.is_admin());

-- ---------------------------------------------------------------------
-- jobs
-- ---------------------------------------------------------------------
create policy jobs_select on public.jobs for select to anon, authenticated
  using (
    (status in ('active', 'paused', 'closed') and public.company_is_public(company_id))
    or public.is_member_of(company_id)
    or public.is_admin()
  );
create policy jobs_insert on public.jobs for insert to authenticated
  with check (public.is_member_of(company_id));
create policy jobs_update on public.jobs for update to authenticated
  using (public.is_member_of(company_id) or public.is_admin())
  with check (public.is_member_of(company_id) or public.is_admin());
create policy jobs_delete on public.jobs for delete to authenticated
  using ((public.is_member_of(company_id) and status = 'draft') or public.is_admin());

-- ---------------------------------------------------------------------
-- Currículos
-- ---------------------------------------------------------------------
create policy resumes_select on public.resumes for select to authenticated
  using (candidate_id = auth.uid() or public.is_admin());
create policy resumes_insert on public.resumes for insert to authenticated
  with check (candidate_id = auth.uid() and storage_path like auth.uid()::text || '/%');
create policy resumes_update on public.resumes for update to authenticated
  using (candidate_id = auth.uid()) with check (candidate_id = auth.uid());
create policy resumes_delete on public.resumes for delete to authenticated
  using (candidate_id = auth.uid());

-- ---------------------------------------------------------------------
-- Candidaturas
-- ---------------------------------------------------------------------
create policy applications_select on public.applications for select to authenticated
  using (
    candidate_id = auth.uid()
    or exists (select 1 from public.jobs j where j.id = job_id and public.is_member_of(j.company_id))
    or public.is_admin()
  );
create policy applications_insert on public.applications for insert to authenticated
  with check (
    candidate_id = auth.uid()
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'candidate' and p.status = 'active'
    )
  );
create policy applications_update on public.applications for update to authenticated
  using (
    candidate_id = auth.uid()
    or exists (select 1 from public.jobs j where j.id = job_id and public.is_member_of(j.company_id))
  )
  with check (
    candidate_id = auth.uid()
    or exists (select 1 from public.jobs j where j.id = job_id and public.is_member_of(j.company_id))
  );

create policy application_events_select on public.application_events for select to authenticated
  using (
    exists (
      select 1 from public.applications a join public.jobs j on j.id = a.job_id
      where a.id = application_id and (a.candidate_id = auth.uid() or public.is_member_of(j.company_id))
    )
    or public.is_admin()
  );

create policy application_notes_select on public.application_notes for select to authenticated
  using (exists (
    select 1 from public.applications a join public.jobs j on j.id = a.job_id
    where a.id = application_id and public.is_member_of(j.company_id)
  ));
create policy application_notes_insert on public.application_notes for insert to authenticated
  with check (
    author_id = auth.uid() and exists (
      select 1 from public.applications a join public.jobs j on j.id = a.job_id
      where a.id = application_id and public.is_member_of(j.company_id)
    )
  );
create policy application_notes_delete on public.application_notes for delete to authenticated
  using (author_id = auth.uid());

create policy saved_jobs_all on public.saved_jobs for all to authenticated
  using (candidate_id = auth.uid()) with check (candidate_id = auth.uid());

-- ---------------------------------------------------------------------
-- Assinaturas e pagamentos (escrita SOMENTE pelo servidor / webhooks)
-- ---------------------------------------------------------------------
create policy subscriptions_select on public.subscriptions for select to authenticated
  using (public.is_member_of(company_id) or public.is_admin());
create policy payments_select on public.payments for select to authenticated
  using (public.is_member_of(company_id) or public.is_admin());

-- ---------------------------------------------------------------------
-- Notificações, denúncias, auditoria, depoimentos
-- ---------------------------------------------------------------------
create policy notifications_select on public.notifications for select to authenticated
  using (user_id = auth.uid());
create policy notifications_update on public.notifications for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy notifications_delete on public.notifications for delete to authenticated
  using (user_id = auth.uid());

create policy reports_insert on public.reports for insert to authenticated
  with check (reporter_id = auth.uid() and status = 'open' and resolved_by is null);
create policy reports_select on public.reports for select to authenticated
  using (reporter_id = auth.uid() or public.is_admin());
create policy reports_update on public.reports for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy admin_logs_select on public.admin_logs for select to authenticated
  using (public.is_admin());

create policy testimonials_select on public.testimonials for select to anon, authenticated
  using (approved or author_id = auth.uid() or public.is_admin());
create policy testimonials_insert on public.testimonials for insert to authenticated
  with check (author_id = auth.uid() and approved = false);
create policy testimonials_update on public.testimonials for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------
-- Permissões de colunas e funções
-- ---------------------------------------------------------------------
-- Views públicas
grant select on public.public_jobs, public.public_companies to anon, authenticated;
grant select on public.company_applicants to authenticated;
revoke all on public.company_applicants from anon;

-- Funções internas: somente servidor
revoke execute on function public.check_rate_limit(text, integer, integer) from public, anon, authenticated;
revoke execute on function public.notify(uuid, text, text, text, text) from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.handle_user_email_change() from public, anon, authenticated;
revoke execute on function public.after_company_insert() from public, anon, authenticated;
revoke execute on function public.after_application_change() from public, anon, authenticated;
revoke execute on function public.admin_dashboard_stats() from anon;
revoke execute on function public.set_job_featured(uuid, boolean) from anon;
revoke execute on function public.company_dashboard_stats(uuid) from anon;
revoke execute on function public.company_job_report(uuid) from anon;

-- ---------------------------------------------------------------------
-- Storage
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('resumes', 'resumes', false, 5242880, array['application/pdf']),
  ('company-logos', 'company-logos', true, 2097152, array['image/png', 'image/jpeg', 'image/webp']),
  ('company-documents', 'company-documents', false, 10485760, array['application/pdf', 'image/png', 'image/jpeg'])
on conflict (id) do nothing;

-- Currículos: pasta = id do candidato. Empresas recebem apenas URLs assinadas e temporárias geradas pelo servidor.
create policy resumes_storage_select on storage.objects for select to authenticated
  using (bucket_id = 'resumes' and (storage.foldername(name))[1] = auth.uid()::text);
create policy resumes_storage_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'resumes' and (storage.foldername(name))[1] = auth.uid()::text);
create policy resumes_storage_delete on storage.objects for delete to authenticated
  using (bucket_id = 'resumes' and (storage.foldername(name))[1] = auth.uid()::text);

-- Logotipos: pasta = id da empresa
create policy logos_storage_select on storage.objects for select to anon, authenticated
  using (bucket_id = 'company-logos');
create policy logos_storage_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'company-logos' and (storage.foldername(name))[1] = public.my_company_id()::text);
create policy logos_storage_update on storage.objects for update to authenticated
  using (bucket_id = 'company-logos' and (storage.foldername(name))[1] = public.my_company_id()::text);
create policy logos_storage_delete on storage.objects for delete to authenticated
  using (bucket_id = 'company-logos' and (storage.foldername(name))[1] = public.my_company_id()::text);

-- Documentos de verificação
create policy docs_storage_select on storage.objects for select to authenticated
  using (bucket_id = 'company-documents' and ((storage.foldername(name))[1] = public.my_company_id()::text or public.is_admin()));
create policy docs_storage_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'company-documents' and (storage.foldername(name))[1] = public.my_company_id()::text);
