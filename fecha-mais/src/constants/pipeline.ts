/**
 * Estágios do funil comercial. A ordem aqui define a ordem na tela.
 * O campo `key` é o valor que será salvo no banco (Supabase) — não traduzir/alterar
 * depois que houver dados, pois isso quebraria registros existentes.
 */
export const PIPELINE_STAGES = [
  { key: 'new', label: 'Novo lead', icon: 'sparkles-outline' },
  { key: 'contacted', label: 'Contato realizado', icon: 'call-outline' },
  { key: 'proposal', label: 'Proposta enviada', icon: 'document-text-outline' },
  { key: 'negotiation', label: 'Em negociação', icon: 'swap-horizontal-outline' },
  { key: 'won', label: 'Venda ganha', icon: 'trophy-outline' },
  { key: 'lost', label: 'Venda perdida', icon: 'close-circle-outline' },
] as const;

export type PipelineStageKey = (typeof PIPELINE_STAGES)[number]['key'];
