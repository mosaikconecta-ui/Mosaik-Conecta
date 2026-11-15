const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const brlInt = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

export const formatCents = (cents: number) => brl.format(cents / 100);
export const formatBRL = (value: number) => brlInt.format(value);

export function formatSalary(min?: number | null, max?: number | null) {
  if (min && max && min !== max) return `${formatBRL(min)} – ${formatBRL(max)}`;
  if (min || max) return formatBRL((min || max)!);
  return null;
}

const dateFmt = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric", timeZone: "America/Sao_Paulo" });
const dateTimeFmt = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" });

export const formatDate = (d?: string | Date | null) => (d ? dateFmt.format(new Date(d)) : "—");
export const formatDateTime = (d?: string | Date | null) => (d ? dateTimeFmt.format(new Date(d)) : "—");

/** Datas no formato AAAA-MM-DD (colunas date) sem deslocamento de fuso. */
export function formatDay(d?: string | null) {
  if (!d) return "—";
  const [y, m, day] = d.slice(0, 10).split("-");
  return `${day}/${m}/${y}`;
}

export function timeAgo(d?: string | null) {
  if (!d) return "";
  const diff = (Date.now() - new Date(d).getTime()) / 1000;
  if (diff < 3600) return "agora há pouco";
  if (diff < 86400) return `há ${Math.floor(diff / 3600)} h`;
  const days = Math.floor(diff / 86400);
  if (days === 1) return "ontem";
  if (days < 30) return `há ${days} dias`;
  return formatDate(d);
}

export function formatCnpj(cnpj: string) {
  const d = cnpj.replace(/\D/g, "");
  return d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
}

export function initials(name?: string | null) {
  return (name ?? "?").split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join("");
}
