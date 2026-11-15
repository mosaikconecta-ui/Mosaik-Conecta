-- =====================================================================
-- VagaBrasil — Dados de referência (planos, categorias, configurações)
-- =====================================================================

insert into public.plans (id, name, price_cents, max_active_jobs, max_recruiters, featured_slots,
  candidate_filters, reports, pipeline, advanced_metrics, team_management, features, sort_order)
values
  ('starter', 'Starter', 9990, 3, 1, 0, false, false, false, false, false,
    array['Até 3 vagas ativas', 'Página da empresa', 'Recebimento de candidaturas', 'Painel básico'], 1),
  ('profissional', 'Profissional', 19990, 10, 1, 2, true, true, true, false, false,
    array['Até 10 vagas ativas', '2 vagas em destaque simultâneas', 'Filtros de candidatos', 'Relatórios', 'Gestão de processos seletivos'], 2),
  ('empresarial', 'Empresarial', 39990, 30, 10, 5, true, true, true, true, true,
    array['Até 30 vagas ativas', '5 vagas em destaque simultâneas', 'Até 10 recrutadores', 'Indicadores avançados', 'Gestão de equipe', 'Relatórios completos com exportação'], 3)
on conflict (id) do update set
  name = excluded.name, price_cents = excluded.price_cents, max_active_jobs = excluded.max_active_jobs,
  max_recruiters = excluded.max_recruiters, featured_slots = excluded.featured_slots,
  candidate_filters = excluded.candidate_filters, reports = excluded.reports, pipeline = excluded.pipeline,
  advanced_metrics = excluded.advanced_metrics, team_management = excluded.team_management,
  features = excluded.features, sort_order = excluded.sort_order;

insert into public.job_categories (slug, name, description, icon, sort_order) values
  ('comercio-varejo', 'Comércio e Varejo', 'Vendas, caixa, reposição, atendimento em loja e gerência de varejo.', 'store', 1),
  ('logistica', 'Logística e Distribuição', 'Estoque, expedição, armazenagem, transporte e conferência.', 'truck', 2),
  ('atendimento', 'Atendimento ao Cliente', 'Recepção, SAC, call center, suporte e relacionamento.', 'headset', 3),
  ('administrativo', 'Administrativo', 'Auxiliar e assistente administrativo, secretariado e rotinas de escritório.', 'briefcase', 4),
  ('financeiro', 'Financeiro e Contábil', 'Contas a pagar e receber, faturamento, contabilidade e fiscal.', 'calculator', 5),
  ('vendas', 'Vendas e Comercial', 'Representação comercial, vendas externas, pré-vendas e inside sales.', 'trending-up', 6),
  ('tecnologia', 'Tecnologia da Informação', 'Desenvolvimento, suporte técnico, infraestrutura e dados.', 'laptop', 7),
  ('industria', 'Indústria e Produção', 'Operação de máquinas, linha de produção, qualidade e manutenção.', 'factory', 8),
  ('saude', 'Saúde', 'Enfermagem, farmácia, clínicas, laboratórios e hospitais.', 'heart-pulse', 9),
  ('alimentacao', 'Alimentação e Gastronomia', 'Cozinha, restaurantes, padarias e serviços de alimentação.', 'utensils', 10),
  ('servicos-gerais', 'Serviços Gerais e Limpeza', 'Limpeza, conservação, portaria e manutenção predial.', 'sparkles', 11),
  ('recursos-humanos', 'Recursos Humanos', 'Recrutamento, departamento pessoal e gestão de pessoas.', 'users', 12),
  ('marketing', 'Marketing e Comunicação', 'Marketing digital, conteúdo, design e comunicação.', 'megaphone', 13),
  ('educacao', 'Educação', 'Professores, monitores, coordenação e apoio pedagógico.', 'graduation-cap', 14),
  ('construcao', 'Construção Civil', 'Obras, pedreiros, eletricistas, engenharia e manutenção.', 'hard-hat', 15),
  ('outros', 'Outras áreas', 'Oportunidades em outras áreas profissionais.', 'layers', 99)
on conflict (slug) do nothing;

insert into public.platform_settings (key, value) values
  ('require_job_approval', 'false'::jsonb),
  ('featured_job_price_cents', '4990'::jsonb),
  ('featured_job_days', '30'::jsonb),
  ('signups_enabled', 'true'::jsonb),
  ('support_email', '"contato@vagabrasil.com.br"'::jsonb)
on conflict (key) do nothing;
