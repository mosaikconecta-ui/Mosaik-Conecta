-- =====================================================================
-- VagaBrasil — DADOS DE DEMONSTRAÇÃO (opcional)
-- Todos os registros são marcados com is_demo = true e exibidos na interface
-- com o selo "Demonstração". NÃO são empresas nem vagas reais.
-- Para remover: delete from public.companies where is_demo;
-- =====================================================================

do $$
declare
  v_company uuid := '00000000-0000-4000-8000-000000000001';
begin
  insert into public.companies (id, legal_name, trade_name, slug, cnpj, email, city, state, description, verification_status, is_demo)
  values (v_company, 'Empresa Demonstração VagaBrasil LTDA', 'Empresa Demonstração', 'empresa-demonstracao',
    '00000000000191', 'demo@vagabrasil.invalid', 'São Paulo', 'SP',
    'Empresa fictícia criada apenas para demonstrar o funcionamento da plataforma. As vagas desta empresa não são reais e não aceitam candidaturas de verdade.',
    'verified', true)
  on conflict (id) do nothing;

  insert into public.subscriptions (company_id, plan_id, status, provider, current_period_start, current_period_end)
  select v_company, 'empresarial', 'active', 'dev', now(), now() + interval '365 days'
  where not exists (select 1 from public.subscriptions where company_id = v_company);

  insert into public.jobs (company_id, category_id, title, description, responsibilities, requirements, benefits, schedule,
    salary_min, salary_max, city, state, work_mode, contract_type, education_level, experience_level, status, is_featured, is_demo, application_deadline)
  select v_company, c.id, j.title, j.description, j.resp, j.req, j.benefits, j.schedule, j.smin, j.smax, j.city, j.uf,
    j.mode::public.work_mode, j.contract::public.contract_type, j.edu::public.education_level, j.exp::public.experience_level,
    'active', j.featured, true, current_date + 60
  from (values
    ('administrativo', '[DEMO] Auxiliar Administrativo', 'Vaga de demonstração. Rotinas administrativas, organização de documentos, apoio ao financeiro e atendimento interno.', 'Organizar documentos; lançar notas no sistema; atender fornecedores.', 'Ensino médio completo; pacote Office básico.', 'Vale-transporte; vale-refeição; plano de saúde.', 'Segunda a sexta, 8h às 17h', 1900, 2300, 'São Paulo', 'SP', 'presencial', 'clt', 'medio', 'ate_1_ano', true),
    ('logistica', '[DEMO] Auxiliar de Logística', 'Vaga de demonstração. Separação, conferência e expedição de mercadorias em centro de distribuição.', 'Separar pedidos; conferir notas; operar coletor de dados.', 'Ensino médio completo; disponibilidade de horário.', 'Vale-transporte; refeição no local; seguro de vida.', 'Escala 6x1, 6h às 14h20', 1800, 2100, 'Guarulhos', 'SP', 'presencial', 'clt', 'medio', 'sem_experiencia', false),
    ('atendimento', '[DEMO] Atendente de SAC', 'Vaga de demonstração. Atendimento a clientes por telefone, chat e e-mail, registrando solicitações.', 'Atender clientes; registrar chamados; acompanhar soluções.', 'Ensino médio completo; boa comunicação escrita.', 'Home office com equipamento; vale-alimentação.', 'Segunda a sábado, 6h20 diárias', 1600, 1800, 'Belo Horizonte', 'MG', 'remoto', 'clt', 'medio', 'sem_experiencia', true),
    ('comercio-varejo', '[DEMO] Operador de Caixa', 'Vaga de demonstração. Operação de caixa, recebimento de pagamentos e atendimento cordial em loja.', 'Registrar vendas; receber pagamentos; fechar o caixa.', 'Ensino médio completo; experiência com caixa é diferencial.', 'Vale-transporte; desconto em compras.', 'Escala 6x1', 1550, 1700, 'Curitiba', 'PR', 'presencial', 'clt', 'medio', 'sem_experiencia', false)
  ) as j(cat, title, description, resp, req, benefits, schedule, smin, smax, city, uf, mode, contract, edu, exp, featured)
  join public.job_categories c on c.slug = j.cat
  where not exists (select 1 from public.jobs where company_id = v_company);
end $$;
