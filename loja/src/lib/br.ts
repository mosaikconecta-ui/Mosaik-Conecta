export const UFS = ["AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO"] as const;
export type UF = (typeof UFS)[number];
export type Region = "N" | "NE" | "CO" | "SE" | "S";

export const REGION_BY_UF: Record<UF, Region> = {
  AC: "N", AP: "N", AM: "N", PA: "N", RO: "N", RR: "N", TO: "N",
  AL: "NE", BA: "NE", CE: "NE", MA: "NE", PB: "NE", PE: "NE", PI: "NE", RN: "NE", SE: "NE",
  DF: "CO", GO: "CO", MT: "CO", MS: "CO",
  ES: "SE", MG: "SE", RJ: "SE", SP: "SE",
  PR: "S", RS: "S", SC: "S",
};

/** Faixas de CEP por UF (primeiros 5 dígitos), usadas para estimar o frete antes do endereço completo. */
const CEP_RANGES: [number, number, UF][] = [
  [1000, 19999, "SP"], [20000, 28999, "RJ"], [29000, 29999, "ES"], [30000, 39999, "MG"],
  [40000, 48999, "BA"], [49000, 49999, "SE"], [50000, 56999, "PE"], [57000, 57999, "AL"],
  [58000, 58999, "PB"], [59000, 59999, "RN"], [60000, 63999, "CE"], [64000, 64999, "PI"],
  [65000, 65999, "MA"], [66000, 68899, "PA"], [68900, 68999, "AP"], [69000, 69299, "AM"],
  [69300, 69399, "RR"], [69400, 69899, "AM"], [69900, 69999, "AC"], [70000, 73699, "DF"],
  [72800, 76799, "GO"], [76800, 76999, "RO"], [77000, 77999, "TO"], [78000, 78899, "MT"],
  [79000, 79999, "MS"], [80000, 87999, "PR"], [88000, 89999, "SC"], [90000, 99999, "RS"],
];

export function ufFromCEP(cep: string): UF | null {
  const d = onlyDigits(cep);
  if (d.length !== 8) return null;
  const p = Number(d.slice(0, 5));
  for (const [a, b, uf] of CEP_RANGES) if (p >= a && p <= b) return uf;
  return null;
}

export const onlyDigits = (v: string) => (v ?? "").replace(/\D/g, "");

export function isValidCPF(value: string): boolean {
  const cpf = onlyDigits(value);
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
  const calc = (len: number) => {
    let sum = 0;
    for (let i = 0; i < len; i++) sum += Number(cpf[i]) * (len + 1 - i);
    const r = (sum * 10) % 11;
    return r === 10 ? 0 : r;
  };
  return calc(9) === Number(cpf[9]) && calc(10) === Number(cpf[10]);
}

export const formatCPF = (v: string) =>
  onlyDigits(v).slice(0, 11).replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d{1,2})$/, "$1-$2");
export const formatCEP = (v: string) => onlyDigits(v).slice(0, 8).replace(/(\d{5})(\d)/, "$1-$2");
export function formatPhone(v: string) {
  const d = onlyDigits(v).slice(0, 11);
  if (d.length <= 10) return d.replace(/(\d{2})(\d)/, "($1) $2").replace(/(\d{4})(\d)/, "$1-$2");
  return d.replace(/(\d{2})(\d)/, "($1) $2").replace(/(\d{5})(\d)/, "$1-$2");
}
export const isValidCEP = (v: string) => onlyDigits(v).length === 8;
export const isValidPhone = (v: string) => {
  const d = onlyDigits(v);
  return d.length === 10 || d.length === 11;
};

/** Mascara dados pessoais em listagens (LGPD: minimização). */
export function maskCPF(v?: string | null) {
  const d = onlyDigits(v ?? "");
  return d.length === 11 ? `***.${d.slice(3, 6)}.***-${d.slice(9)}` : "—";
}
export function maskEmail(v: string) {
  const [u, dom] = v.split("@");
  if (!dom) return "***";
  return `${u.slice(0, 2)}***@${dom}`;
}
