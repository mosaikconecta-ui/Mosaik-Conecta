import { z } from "zod";
import { CONTRACT_TYPES, EDUCATION_LEVELS, EXPERIENCE_LEVELS, REPORT_REASONS, WORK_MODES } from "@/lib/constants";
import { city, money, optionalText, requiredText, ufSchema } from "./common";

const keys = <T extends object>(o: T) => Object.keys(o) as [Extract<keyof T, string>, ...Extract<keyof T, string>[]];

/** Palavras que indicam critérios discriminatórios (Lei 9.029/95 e CLT art. 373-A). */
const DISCRIMINATORY = [
  /\bboa apar[eê]ncia\b/i,
  /\bsomente (homens|mulheres)\b/i,
  /\bapenas (homens|mulheres)\b/i,
  /\bsexo (masculino|feminino)\b/i,
  /\bidade (m[aá]xima|entre|at[eé])\b/i,
  /\bat[eé] \d{2} anos\b/i,
  /\bsolteir[oa]s?\b/i,
  /\bsem filhos\b/i,
  /\bn[aã]o (pode estar )?gr[aá]vida\b/i,
  /\bcor da pele\b/i,
  /\breligi[aã]o\b/i,
];

export function findDiscriminatoryTerm(...texts: (string | null | undefined)[]) {
  const all = texts.filter(Boolean).join("\n");
  const hit = DISCRIMINATORY.find((re) => re.test(all));
  return hit ? all.match(hit)?.[0] ?? null : null;
}

export const jobSchema = z
  .object({
    title: requiredText(3, 120, "Cargo"),
    category_id: z.coerce.number({ message: "Selecione a categoria" }).int().positive("Selecione a categoria"),
    openings: z.coerce.number().int().min(1, "Mínimo 1").max(999),
    description: requiredText(30, 10000, "Descrição"),
    responsibilities: optionalText(5000),
    requirements: optionalText(5000),
    benefits: optionalText(3000),
    schedule: optionalText(200),
    salary_min: money,
    salary_max: money,
    city,
    state: ufSchema,
    work_mode: z.enum(keys(WORK_MODES)),
    contract_type: z.enum(keys(CONTRACT_TYPES)),
    education_level: z.enum(keys(EDUCATION_LEVELS)),
    experience_level: z.enum(keys(EXPERIENCE_LEVELS)),
    application_deadline: z.preprocess(
      (v) => (v === "" ? null : v),
      z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida").nullable().optional(),
    ),
    publish: z.boolean().optional(),
  })
  .refine((j) => j.salary_min == null || j.salary_max == null || j.salary_max >= j.salary_min, {
    path: ["salary_max"],
    message: "O salário máximo deve ser maior ou igual ao mínimo",
  })
  .refine((j) => !j.application_deadline || j.application_deadline >= new Date().toISOString().slice(0, 10), {
    path: ["application_deadline"],
    message: "O prazo deve ser uma data futura",
  })
  .superRefine((j, ctx) => {
    const term = findDiscriminatoryTerm(j.title, j.description, j.requirements, j.responsibilities);
    if (term) {
      ctx.addIssue({
        code: "custom",
        path: ["requirements"],
        message: `O termo "${term}" pode configurar discriminação na contratação e não é permitido.`,
      });
    }
  });
export type JobInput = z.input<typeof jobSchema>;

export const reportSchema = z.object({
  job_id: z.string().uuid(),
  reason: z.enum(keys(REPORT_REASONS)),
  details: optionalText(2000),
});
