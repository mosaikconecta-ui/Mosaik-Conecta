export const UFS = [
  ["AC", "Acre", "acre"], ["AL", "Alagoas", "alagoas"], ["AP", "Amapá", "amapa"], ["AM", "Amazonas", "amazonas"],
  ["BA", "Bahia", "bahia"], ["CE", "Ceará", "ceara"], ["DF", "Distrito Federal", "distrito-federal"],
  ["ES", "Espírito Santo", "espirito-santo"], ["GO", "Goiás", "goias"], ["MA", "Maranhão", "maranhao"],
  ["MT", "Mato Grosso", "mato-grosso"], ["MS", "Mato Grosso do Sul", "mato-grosso-do-sul"],
  ["MG", "Minas Gerais", "minas-gerais"], ["PA", "Pará", "para"], ["PB", "Paraíba", "paraiba"],
  ["PR", "Paraná", "parana"], ["PE", "Pernambuco", "pernambuco"], ["PI", "Piauí", "piaui"],
  ["RJ", "Rio de Janeiro", "rio-de-janeiro-estado"], ["RN", "Rio Grande do Norte", "rio-grande-do-norte"],
  ["RS", "Rio Grande do Sul", "rio-grande-do-sul"], ["RO", "Rondônia", "rondonia"], ["RR", "Roraima", "roraima"],
  ["SC", "Santa Catarina", "santa-catarina"], ["SP", "São Paulo", "sao-paulo-estado"], ["SE", "Sergipe", "sergipe"],
  ["TO", "Tocantins", "tocantins"],
] as const;

export type UF = (typeof UFS)[number][0];
export const UF_CODES = UFS.map((u) => u[0]) as unknown as [UF, ...UF[]];
export const ufName = (uf?: string | null) => UFS.find((u) => u[0] === uf)?.[1] ?? uf ?? "";
export const ufBySlug = (slug: string) => UFS.find((u) => u[2] === slug);

export const WORK_MODES = { presencial: "Presencial", hibrido: "Híbrido", remoto: "Remoto" } as const;
export type WorkMode = keyof typeof WORK_MODES;

export const CONTRACT_TYPES = {
  clt: "CLT (Efetivo)",
  pj: "PJ",
  estagio: "Estágio",
  temporario: "Temporário",
  aprendiz: "Jovem Aprendiz",
  trainee: "Trainee",
  freelancer: "Freelancer",
} as const;
export type ContractType = keyof typeof CONTRACT_TYPES;

export const EDUCATION_LEVELS = {
  nenhuma: "Não exigida",
  fundamental: "Ensino fundamental",
  medio: "Ensino médio",
  tecnico: "Curso técnico",
  superior_cursando: "Superior em andamento",
  superior: "Superior completo",
  pos_graduacao: "Pós-graduação",
} as const;
export type EducationLevel = keyof typeof EDUCATION_LEVELS;

export const EXPERIENCE_LEVELS = {
  sem_experiencia: "Sem experiência",
  ate_1_ano: "Até 1 ano",
  "1_a_3_anos": "1 a 3 anos",
  "3_a_5_anos": "3 a 5 anos",
  mais_5_anos: "Mais de 5 anos",
} as const;
export type ExperienceLevel = keyof typeof EXPERIENCE_LEVELS;

export const APPLICATION_STATUS = {
  received: { label: "Recebida", tone: "neutral" },
  in_review: { label: "Em análise", tone: "info" },
  in_process: { label: "Em processo seletivo", tone: "brand" },
  approved: { label: "Aprovada", tone: "success" },
  rejected: { label: "Reprovada", tone: "danger" },
  closed: { label: "Encerrada", tone: "muted" },
} as const;
export type ApplicationStatus = keyof typeof APPLICATION_STATUS;
export const APPLICATION_STATUS_KEYS = Object.keys(APPLICATION_STATUS) as ApplicationStatus[];

export const JOB_STATUS = {
  draft: { label: "Rascunho", tone: "muted" },
  pending_review: { label: "Em análise", tone: "warning" },
  active: { label: "Ativa", tone: "success" },
  paused: { label: "Pausada", tone: "neutral" },
  closed: { label: "Encerrada", tone: "muted" },
  removed: { label: "Removida", tone: "danger" },
} as const;
export type JobStatus = keyof typeof JOB_STATUS;

export const SUBSCRIPTION_STATUS = {
  pending: { label: "Aguardando pagamento", tone: "warning" },
  active: { label: "Ativa", tone: "success" },
  past_due: { label: "Pagamento pendente", tone: "danger" },
  cancelled: { label: "Cancelada", tone: "muted" },
  expired: { label: "Expirada", tone: "muted" },
} as const;

export const PAYMENT_STATUS = {
  pending: { label: "Pendente", tone: "warning" },
  in_process: { label: "Em processamento", tone: "warning" },
  approved: { label: "Aprovado", tone: "success" },
  rejected: { label: "Recusado", tone: "danger" },
  refunded: { label: "Estornado", tone: "muted" },
  cancelled: { label: "Cancelado", tone: "muted" },
} as const;

export const VERIFICATION_STATUS = {
  pending: { label: "Verificação pendente", tone: "warning" },
  verified: { label: "Empresa verificada", tone: "success" },
  rejected: { label: "Verificação recusada", tone: "danger" },
} as const;

export const REPORT_REASONS = {
  fraude: "Vaga falsa ou golpe",
  cobranca_candidato: "Cobrança de taxa do candidato",
  discriminacao: "Conteúdo discriminatório",
  conteudo_improprio: "Conteúdo impróprio",
  vaga_inexistente: "Vaga já preenchida ou inexistente",
  outro: "Outro motivo",
} as const;
export type ReportReason = keyof typeof REPORT_REASONS;

export const PUBLISHED_WITHIN = { "1": "Últimas 24 horas", "3": "Últimos 3 dias", "7": "Últimos 7 dias", "30": "Últimos 30 dias" } as const;

export const SALARY_RANGES = {
  "1500": "A partir de R$ 1.500",
  "2500": "A partir de R$ 2.500",
  "4000": "A partir de R$ 4.000",
  "6000": "A partir de R$ 6.000",
  "10000": "A partir de R$ 10.000",
} as const;

export const PAGE_SIZE = 20;
export const MAX_RESUME_BYTES = 5 * 1024 * 1024;
export const MAX_LOGO_BYTES = 2 * 1024 * 1024;
export const TERMS_VERSION = "2026-11";
