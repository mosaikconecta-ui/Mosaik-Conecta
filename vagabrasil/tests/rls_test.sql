-- Testes de regras de negócio e RLS. Executado por scripts/test-db.sh
\set ON_ERROR_STOP on
\set QUIET on

create or replace function pg_temp.expect_error(p_sql text, p_msg text) returns void language plpgsql as $$
begin
  begin
    execute p_sql;
  exception when others then
    if sqlerrm not like '%' || p_msg || '%' then
      raise exception 'ERRO INESPERADO em %: % (esperado %)', p_sql, sqlerrm, p_msg;
    end if;
    raise notice 'ok - erro esperado %', p_msg;
    return;
  end;
  raise exception 'ESPERADO ERRO % — mas o comando passou: %', p_msg, p_sql;
end $$;
create or replace function pg_temp.check(p_ok boolean, p_label text) returns void language plpgsql as $$
begin
  if not coalesce(p_ok, false) then raise exception 'FALHOU: %', p_label; end if;
  raise notice 'ok - %', p_label;
end $$;

-- Usuários
insert into auth.users (id, email, raw_user_meta_data) values
  ('aaaaaaaa-0000-4000-8000-000000000001', 'ana@teste.dev', '{"full_name":"Ana Candidata","role":"candidate","city":"São Paulo","state":"sp","privacy_consent":true}'),
  ('aaaaaaaa-0000-4000-8000-000000000002', 'bruno@teste.dev', '{"full_name":"Bruno Candidato","role":"candidate"}'),
  ('cccccccc-0000-4000-8000-000000000001', 'rh@empresa1.dev', '{"full_name":"Carla RH","role":"company"}'),
  ('cccccccc-0000-4000-8000-000000000002', 'rh@empresa2.dev', '{"full_name":"Diego RH","role":"company"}'),
  ('eeeeeeee-0000-4000-8000-000000000001', 'admin@teste.dev', '{"full_name":"Admin","role":"admin"}');

select pg_temp.check((select role from profiles where email = 'admin@teste.dev') = 'candidate', 'cadastro não permite papel admin');
select pg_temp.check((select state from profiles where email = 'ana@teste.dev') = 'SP', 'UF normalizada');
select pg_temp.check((select privacy_consent_at is not null from profiles where email = 'ana@teste.dev'), 'consentimento registrado');
select pg_temp.check((select count(*) from candidates) = 3, 'linhas de candidates criadas para candidatos');
update profiles set role = 'admin' where email = 'admin@teste.dev';
delete from candidates where id = 'eeeeeeee-0000-4000-8000-000000000001';

-- ===================== Empresa 1 (Carla) =====================
set role authenticated;
select set_config('request.jwt.claim.sub', 'cccccccc-0000-4000-8000-000000000001', false);

update profiles set role = 'admin', status = 'active' where id = auth.uid();
select pg_temp.check((select role from profiles where id = auth.uid()) = 'company', 'usuário não altera o próprio papel');

insert into companies (id, legal_name, trade_name, slug, cnpj, email, city, state, verification_status, owner_id)
values ('11111111-0000-4000-8000-000000000001', 'Loja Um Comércio LTDA', 'Loja Um', 'x', '11222333000181', 'rh@empresa1.dev', 'São Paulo', 'sp', 'verified', auth.uid());
select pg_temp.check((select verification_status from companies where id = '11111111-0000-4000-8000-000000000001') = 'pending', 'empresa nasce pendente de verificação');
select pg_temp.check((select slug from companies where id = '11111111-0000-4000-8000-000000000001') like 'loja-um-%', 'slug gerado');
select pg_temp.check(exists (select 1 from company_members where profile_id = auth.uid() and role = 'owner'), 'dono vira membro');
select pg_temp.check(exists (select 1 from company_verifications where company_id = '11111111-0000-4000-8000-000000000001'), 'verificação aberta');
select pg_temp.expect_error($$insert into companies (legal_name, trade_name, slug, cnpj, email, city, state, owner_id) values ('Outra LTDA','Outra','x','11444777000161','a@b.c','Rio','RJ', auth.uid())$$, 'ALREADY_MEMBER');

insert into jobs (id, company_id, category_id, title, description, city, state, work_mode, contract_type, status)
values ('22222222-0000-4000-8000-000000000001', '11111111-0000-4000-8000-000000000001', 4, 'Auxiliar Administrativo',
  'Descrição completa da vaga de auxiliar administrativo com rotinas.', 'São Paulo', 'SP', 'presencial', 'clt', 'draft');
select pg_temp.check((select slug from jobs where id = '22222222-0000-4000-8000-000000000001') like 'auxiliar-administrativo-sao-paulo-%', 'slug da vaga');
select pg_temp.expect_error($$update jobs set status = 'active' where id = '22222222-0000-4000-8000-000000000001'$$, 'NO_ACTIVE_PLAN');
select pg_temp.expect_error($$insert into subscriptions (company_id, plan_id, status, provider) values ('11111111-0000-4000-8000-000000000001','empresarial','active','dev')$$, 'row-level security');

reset role;
insert into subscriptions (company_id, plan_id, status, provider, current_period_start, current_period_end)
values ('11111111-0000-4000-8000-000000000001', 'starter', 'active', 'mercadopago', now(), now() + interval '30 days');

set role authenticated;
select set_config('request.jwt.claim.sub', 'cccccccc-0000-4000-8000-000000000001', false);
update jobs set status = 'active' where id = '22222222-0000-4000-8000-000000000001';
select pg_temp.check((select status from jobs where id = '22222222-0000-4000-8000-000000000001') = 'pending_review', 'empresa não verificada → vaga em análise');

-- ===================== Admin =====================
select set_config('request.jwt.claim.sub', 'eeeeeeee-0000-4000-8000-000000000001', false);
update companies set verification_status = 'verified' where id = '11111111-0000-4000-8000-000000000001';
update jobs set status = 'active' where id = '22222222-0000-4000-8000-000000000001';
select pg_temp.check((select status from jobs where id = '22222222-0000-4000-8000-000000000001') = 'active', 'admin aprova vaga');
select pg_temp.check((admin_dashboard_stats() ->> 'jobs_active')::int = 1, 'estatísticas admin');

-- ===================== Empresa 1: limites do plano =====================
select set_config('request.jwt.claim.sub', 'cccccccc-0000-4000-8000-000000000001', false);
insert into jobs (company_id, category_id, title, description, city, state, work_mode, contract_type, status)
select '11111111-0000-4000-8000-000000000001', 2, 'Vaga ' || g, 'Descrição suficientemente longa para a vaga de teste.', 'Guarulhos', 'SP', 'presencial', 'clt', 'active'
from generate_series(1, 2) g;
select pg_temp.check((select count(*) from jobs where status = 'active' and company_id = '11111111-0000-4000-8000-000000000001') = 3, 'empresa verificada publica direto');
select pg_temp.expect_error($$insert into jobs (company_id, category_id, title, description, city, state, work_mode, contract_type, status) values ('11111111-0000-4000-8000-000000000001', 2, 'Excedente', 'Descrição suficientemente longa para a vaga de teste.', 'Guarulhos', 'SP', 'remoto', 'pj', 'active')$$, 'PLAN_JOB_LIMIT');
update jobs set is_featured = true, views_count = 999 where id = '22222222-0000-4000-8000-000000000001';
select pg_temp.check((select not is_featured and views_count = 0 from jobs where id = '22222222-0000-4000-8000-000000000001'), 'empresa não força destaque nem visualizações');
select pg_temp.expect_error($$select set_job_featured('22222222-0000-4000-8000-000000000001', true)$$, 'PLAN_FEATURED_LIMIT');
select pg_temp.expect_error($$update jobs set status = 'removed' where id = '22222222-0000-4000-8000-000000000001'$$, 'FORBIDDEN_STATUS');
update jobs set status = 'paused' where title = 'Vaga 2';
update jobs set status = 'active' where title = 'Vaga 2';
select pg_temp.check((select status from jobs where title = 'Vaga 2') = 'active', 'pausar e reabrir vaga');

-- ===================== Candidata Ana =====================
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-4000-8000-000000000001', false);
select pg_temp.check((select count(*) from jobs) = 3, 'candidata vê somente vagas públicas');
select pg_temp.check((select count(*) from companies) = 0, 'candidata não lê tabela companies');
select pg_temp.check((select count(*) from public_companies where slug like 'loja-um-%') = 1, 'view pública de empresas');
select pg_temp.expect_error($$insert into companies (legal_name, trade_name, slug, cnpj, email, city, state, owner_id) values ('Fake LTDA','Fake','x','11444777000161','a@b.c','Rio','RJ', auth.uid())$$, 'ONLY_COMPANY_ACCOUNTS');

insert into resumes (id, candidate_id, storage_path, file_name, size_bytes)
values ('33333333-0000-4000-8000-000000000001', auth.uid(), 'aaaaaaaa-0000-4000-8000-000000000001/cv.pdf', 'cv.pdf', 1000);
select pg_temp.expect_error($$insert into resumes (candidate_id, storage_path, file_name, size_bytes) values (auth.uid(), 'aaaaaaaa-0000-4000-8000-000000000002/x.pdf', 'x.pdf', 10)$$, 'row-level security');
insert into storage.objects (bucket_id, name) values ('resumes', 'aaaaaaaa-0000-4000-8000-000000000001/cv.pdf');
select pg_temp.expect_error($$insert into storage.objects (bucket_id, name) values ('resumes', 'aaaaaaaa-0000-4000-8000-000000000002/cv.pdf')$$, 'row-level security');

insert into applications (id, job_id, candidate_id, resume_id, status)
values ('44444444-0000-4000-8000-000000000001', '22222222-0000-4000-8000-000000000001', auth.uid(), '33333333-0000-4000-8000-000000000001', 'approved');
select pg_temp.check((select status from applications where id = '44444444-0000-4000-8000-000000000001') = 'received', 'candidatura sempre começa como Recebida');
select pg_temp.expect_error($$insert into applications (job_id, candidate_id) values ('22222222-0000-4000-8000-000000000001', auth.uid())$$, 'duplicate key');
select pg_temp.expect_error($$update applications set status = 'approved' where id = '44444444-0000-4000-8000-000000000001'$$, 'FORBIDDEN_STATUS');
select pg_temp.check((select count(*) from notifications where type = 'application_received') = 1, 'candidata notificada');
select pg_temp.check((select count(*) from company_applicants) = 0, 'candidata não acessa view de candidatos');
insert into saved_jobs (candidate_id, job_id) values (auth.uid(), '22222222-0000-4000-8000-000000000001');
select pg_temp.expect_error($$select check_rate_limit('x', 1, 60)$$, 'permission denied');

-- ===================== Candidato Bruno =====================
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-4000-8000-000000000002', false);
select pg_temp.check((select count(*) from applications) = 0, 'outro candidato não vê candidatura alheia');
select pg_temp.check((select count(*) from resumes) = 0, 'outro candidato não vê currículo alheio');
select pg_temp.check((select count(*) from storage.objects where bucket_id = 'resumes') = 0, 'storage de currículo é privado');
select pg_temp.check((select count(*) from profiles) = 1, 'perfis alheios invisíveis');
select pg_temp.check((select count(*) from saved_jobs) = 0, 'vagas salvas privadas');

-- ===================== Empresa 2 (Diego) =====================
select set_config('request.jwt.claim.sub', 'cccccccc-0000-4000-8000-000000000002', false);
select pg_temp.check((select count(*) from company_applicants) = 0, 'outra empresa não vê candidatos');
select pg_temp.check((select count(*) from applications) = 0, 'outra empresa não vê candidaturas');
update jobs set title = 'Hackeado' where id = '22222222-0000-4000-8000-000000000001';
select pg_temp.check((select title from jobs where id = '22222222-0000-4000-8000-000000000001') = 'Auxiliar Administrativo', 'outra empresa não edita vaga');
select pg_temp.expect_error($$select company_dashboard_stats('11111111-0000-4000-8000-000000000001')$$, 'FORBIDDEN');

-- ===================== Empresa 1 gerencia candidatura =====================
select set_config('request.jwt.claim.sub', 'cccccccc-0000-4000-8000-000000000001', false);
select pg_temp.check((select full_name from company_applicants) = 'Ana Candidata', 'empresa vê candidata que se inscreveu');
select pg_temp.check((select count(*) from notifications where type = 'new_application') = 1, 'empresa notificada');
update applications set status = 'in_process', cover_letter = 'alterado' where id = '44444444-0000-4000-8000-000000000001';
select pg_temp.check((select status = 'in_process' and cover_letter is null from applications where id = '44444444-0000-4000-8000-000000000001'), 'empresa só altera status');
select pg_temp.check((select (company_dashboard_stats('11111111-0000-4000-8000-000000000001') ->> 'total_applications')::int) = 1, 'estatísticas da empresa');
insert into application_notes (application_id, author_id, body) values ('44444444-0000-4000-8000-000000000001', auth.uid(), 'Boa candidata');
select pg_temp.check((select count(*) from profiles) = 1, 'empresa não lê tabela profiles do candidato');

select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-4000-8000-000000000001', false);
select pg_temp.check((select count(*) from notifications where type = 'application_status') = 1, 'candidata notificada da mudança de status');
select pg_temp.check((select count(*) from application_events) = 2, 'histórico de status');
select pg_temp.check((select count(*) from application_notes) = 0, 'notas internas invisíveis ao candidato');
update applications set status = 'closed' where id = '44444444-0000-4000-8000-000000000001';
select pg_temp.check((select status from applications where id = '44444444-0000-4000-8000-000000000001') = 'closed', 'candidata pode desistir');

-- ===================== Vaga expirada =====================
reset role;
update jobs set application_deadline = current_date - 1 where title = 'Vaga 1';
set role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-4000-8000-000000000002', false);
select pg_temp.expect_error($$insert into applications (job_id, candidate_id) select id, auth.uid() from jobs where title = 'Vaga 1'$$, 'JOB_EXPIRED');
select pg_temp.check((select is_closed from public_jobs where title = 'Vaga 1'), 'view marca vaga expirada');

-- ===================== Anônimo =====================
reset role;
set role anon;
select set_config('request.jwt.claim.sub', '', false);
select pg_temp.check((select count(*) from public_jobs where status = 'active') = 3, 'anônimo vê vagas públicas');
select pg_temp.check((select count(*) from jobs where status = 'draft') = 0, 'anônimo não vê rascunhos');
select pg_temp.expect_error($$select * from company_applicants$$, 'permission denied');
select pg_temp.check((select count(*) from profiles) = 0, 'anônimo não vê perfis');
select pg_temp.check((select count(*) from plans) = 3, 'planos públicos');
reset role;

-- ===================== Seed de demonstração =====================
\ir ../supabase/seed.sql
set role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-4000-8000-000000000002', false);
select pg_temp.expect_error($$insert into applications (job_id, candidate_id) select id, auth.uid() from jobs where is_demo limit 1$$, 'DEMO_JOB');
reset role;
select pg_temp.check((select count(*) from public_jobs where is_demo) = 4, 'vagas de demonstração identificadas');
select pg_temp.check((select count(*) from active_job_locations()) >= 4, 'localizações ativas');

\echo 'TODOS OS TESTES DE BANCO PASSARAM'
