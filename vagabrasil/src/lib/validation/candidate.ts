import { z } from "zod";
import { CONTRACT_TYPES, EDUCATION_LEVELS, WORK_MODES } from "@/lib/constants";
import { city, money, optionalText, phone, requiredText, ufSchema, url } from "./common";

const month = z.string().regex(/^\d{4}-\d{2}$/, "Use o formato mês/ano");

export const experienceSchema = z
  .object({
    company: requiredText(2, 120, "Empresa"),
    role: requiredText(2, 120, "Cargo"),
    start: month,
    end: z.preprocess((v) => (v === "" ? null : v), month.nullable().optional()),
    current: z.boolean().optional(),
    description: optionalText(1500),
  })
  .refine((e) => e.current || e.end, { path: ["end"], message: "Informe a data de saída ou marque 'Atual'" })
  .refine((e) => !e.end || e.end >= e.start, { path: ["end"], message: "Saída deve ser após a entrada" });

export const educationSchema = z.object({
  institution: requiredText(2, 160, "Instituição"),
  course: requiredText(2, 160, "Curso"),
  level: z.enum(Object.keys(EDUCATION_LEVELS) as [keyof typeof EDUCATION_LEVELS]),
  start: z.preprocess((v) => (v === "" ? null : v), month.nullable().optional()),
  end: z.preprocess((v) => (v === "" ? null : v), month.nullable().optional()),
  status: z.enum(["completo", "cursando", "trancado"]),
});

export const profileSchema = z.object({
  full_name: requiredText(3, 120, "Nome"),
  phone,
  city,
  state: ufSchema,
  headline: optionalText(120),
  summary: optionalText(3000),
  linkedin_url: url,
});

export const resumeSchema = z.object({
  experiences: z.array(experienceSchema).max(30),
  education: z.array(educationSchema).max(20),
  skills: z.array(z.string().trim().min(1).max(40)).max(40),
  languages: z.array(z.string().trim().min(1).max(40)).max(10),
});

export const preferencesSchema = z.object({
  desired_role: optionalText(120),
  desired_salary: money,
  preferred_work_modes: z.array(z.enum(Object.keys(WORK_MODES) as [keyof typeof WORK_MODES])).max(3),
  preferred_contract_types: z.array(z.enum(Object.keys(CONTRACT_TYPES) as [keyof typeof CONTRACT_TYPES])).max(7),
  preferred_category_ids: z.array(z.coerce.number().int().positive()).max(5),
  preferred_states: z.array(ufSchema).max(5),
  available_to_relocate: z.boolean(),
});

export const privacySchema = z.object({
  share_contact_with_companies: z.boolean(),
  job_alerts_enabled: z.boolean(),
  email_notifications: z.boolean(),
  marketing_consent: z.boolean(),
});

export type ProfileInput = z.input<typeof profileSchema>;
export type ResumeInput = z.input<typeof resumeSchema>;
export type PreferencesInput = z.input<typeof preferencesSchema>;
