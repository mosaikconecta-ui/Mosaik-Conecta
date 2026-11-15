import { z } from "zod";
import { UF_CODES } from "@/lib/constants";
import { isValidCnpj } from "@/lib/cnpj";

export const emptyToNull = (v: unknown) => (typeof v === "string" && v.trim() === "" ? null : v);
export const optionalText = (max: number) =>
  z.preprocess(emptyToNull, z.string().trim().max(max, `Máximo de ${max} caracteres`).nullable().optional());
export const requiredText = (min: number, max: number, label = "Campo") =>
  z.string().trim().min(min, `${label}: mínimo de ${min} caracteres`).max(max, `${label}: máximo de ${max} caracteres`);

export const ufSchema = z.enum(UF_CODES, { message: "Selecione o estado" });
export const email = z.string().trim().toLowerCase().email("Informe um e-mail válido").max(160);
export const password = z
  .string()
  .min(8, "A senha deve ter pelo menos 8 caracteres")
  .max(72, "Máximo de 72 caracteres")
  .regex(/[A-Za-z]/, "Inclua ao menos uma letra")
  .regex(/[0-9]/, "Inclua ao menos um número");
export const phone = z.preprocess(
  emptyToNull,
  z.string().trim().regex(/^[0-9()+\-\s]{10,20}$/, "Telefone inválido").nullable().optional(),
);
export const cnpj = z
  .string()
  .transform((v) => v.replace(/\D/g, ""))
  .refine(isValidCnpj, "CNPJ inválido");
export const city = requiredText(2, 80, "Cidade");
export const url = z.preprocess(
  emptyToNull,
  z.string().trim().url("URL inválida").max(300).refine((v) => /^https?:\/\//.test(v), "Use http(s)://").nullable().optional(),
);
export const money = z.preprocess(
  (v) => (v === "" || v === null || v === undefined ? null : Number(String(v).replace(/\./g, "").replace(",", "."))),
  z.number({ message: "Valor inválido" }).int("Use valores inteiros").min(0).max(1_000_000).nullable(),
);
