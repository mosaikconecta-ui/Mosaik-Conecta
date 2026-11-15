import { describe, expect, it } from "vitest";
import { isValidCPF, ufFromCEP, formatCEP, formatPhone, maskCPF } from "@/lib/br";
import { formatBRL, installmentPlan, marginPct, parseBRLToCents, slugify } from "@/lib/format";
import { hashPassword, hmacSha256Hex, verifyPassword } from "@/lib/crypto";
import { mapMercadoPagoStatus, verifyMercadoPagoSignature } from "@/lib/payments/mercadopago";
import { parseInventoryCsv } from "@/lib/suppliers";
import { checkoutSchema } from "@/lib/validation";

describe("documentos e endereços", () => {
  it("valida CPF", () => {
    expect(isValidCPF("529.982.247-25")).toBe(true);
    expect(isValidCPF("111.111.111-11")).toBe(false);
    expect(isValidCPF("529.982.247-24")).toBe(false);
  });
  it("UF a partir do CEP", () => {
    expect(ufFromCEP("01310-100")).toBe("SP");
    expect(ufFromCEP("30140071")).toBe("MG");
    expect(ufFromCEP("69900000")).toBe("AC");
    expect(ufFromCEP("123")).toBeNull();
  });
  it("máscaras", () => {
    expect(formatCEP("01310100")).toBe("01310-100");
    expect(formatPhone("11987654321")).toBe("(11) 98765-4321");
    expect(maskCPF("52998224725")).toBe("***.982.***-25");
  });
});

describe("dinheiro", () => {
  it("formata BRL", () => expect(formatBRL(123456)).toBe("R$ 1.234,56"));
  it("converte entradas", () => {
    expect(parseBRLToCents("1.234,56")).toBe(123456);
    expect(parseBRLToCents("99,9")).toBe(9990);
    expect(parseBRLToCents("12.50")).toBe(1250);
    expect(parseBRLToCents("")).toBe(0);
  });
  it("parcelamento respeita parcela mínima", () => {
    expect(installmentPlan(18900, 6, 3000)).toEqual({ count: 6, valueCents: 3150 });
    expect(installmentPlan(4900, 6, 3000)).toEqual({ count: 1, valueCents: 4900 });
  });
  it("margem", () => expect(marginPct(10000, 4000)).toBe(60));
  it("slug", () => expect(slugify("Vaso Duna — Argila Média!")).toBe("vaso-duna-argila-media"));
});

describe("senhas", () => {
  it("hash e verificação", async () => {
    const h = await hashPassword("senhaForte123");
    expect(h.startsWith("scrypt$")).toBe(true);
    expect(await verifyPassword("senhaForte123", h)).toBe(true);
    expect(await verifyPassword("errada", h)).toBe(false);
    expect(await verifyPassword("x", "lixo")).toBe(false);
  });
});

describe("webhook Mercado Pago", () => {
  const secret = "segredo-teste";
  const now = 1_763_200_000_000;
  const ts = String(Math.floor(now / 1000));
  const sign = (id: string, req: string) => hmacSha256Hex(secret, `id:${id};request-id:${req};ts:${ts};`);
  it("aceita assinatura válida", () => {
    const r = verifyMercadoPagoSignature({ secret, xSignature: `ts=${ts},v1=${sign("123", "abc")}`, xRequestId: "abc", dataId: "123", now });
    expect(r.valid).toBe(true);
  });
  it("normaliza id alfanumérico para minúsculas", () => {
    const r = verifyMercadoPagoSignature({ secret, xSignature: `ts=${ts},v1=${sign("abc9", "r")}`, xRequestId: "r", dataId: "ABC9", now });
    expect(r.valid).toBe(true);
  });
  it("rejeita assinatura adulterada, ausente, sem segredo ou expirada", () => {
    expect(verifyMercadoPagoSignature({ secret, xSignature: `ts=${ts},v1=${sign("123", "abc")}`, xRequestId: "abc", dataId: "999", now }).valid).toBe(false);
    expect(verifyMercadoPagoSignature({ secret, xSignature: null, xRequestId: "abc", dataId: "123", now }).valid).toBe(false);
    expect(verifyMercadoPagoSignature({ secret: "", xSignature: `ts=${ts},v1=x`, xRequestId: "abc", dataId: "123", now }).valid).toBe(false);
    expect(verifyMercadoPagoSignature({ secret, xSignature: `ts=${ts},v1=${sign("123", "abc")}`, xRequestId: "abc", dataId: "123", now: now + 3600_000 }).valid).toBe(false);
  });
  it("mapeia status", () => {
    expect(mapMercadoPagoStatus("approved")).toBe("APPROVED");
    expect(mapMercadoPagoStatus("in_process")).toBe("PENDING");
    expect(mapMercadoPagoStatus("charged_back")).toBe("CHARGED_BACK");
  });
});

describe("planilha de fornecedor", () => {
  it("lê CSV com ; e custo em reais", () => {
    const { rows, errors } = parseInventoryCsv("supplier_sku;stock;cost\nA-1;10;12,90\nB-2;0;\n;5;1");
    expect(rows).toEqual([{ supplierSku: "A-1", stock: 10, costCents: 1290 }, { supplierSku: "B-2", stock: 0, costCents: null }]);
    expect(errors.length).toBe(1);
  });
  it("exige coluna de SKU", () => expect(parseInventoryCsv("x,y\n1,2").errors[0]).toMatch(/supplier_sku/));
  it("rejeita estoque negativo", () => expect(parseInventoryCsv("sku,estoque\nA,-3").errors.length).toBe(1));
});

describe("validação do checkout", () => {
  const base = {
    name: "Maria Silva", email: "MARIA@EXEMPLO.COM", phone: "(11) 98765-4321", cpf: "", cep: "01310-100", street: "Av. Paulista", number: "1000",
    complement: "", district: "Bela Vista", city: "São Paulo", state: "SP", shippingMethodId: "pac", notes: "", acceptTerms: true,
  };
  it("aceita dados válidos e normaliza e-mail", () => {
    const r = checkoutSchema.safeParse(base);
    expect(r.success).toBe(true);
    expect(r.success && r.data.email).toBe("maria@exemplo.com");
  });
  it("rejeita CPF inválido, nome sem sobrenome e termos não aceitos", () => {
    expect(checkoutSchema.safeParse({ ...base, cpf: "123" }).success).toBe(false);
    expect(checkoutSchema.safeParse({ ...base, name: "Maria" }).success).toBe(false);
    expect(checkoutSchema.safeParse({ ...base, acceptTerms: false }).success).toBe(false);
    expect(checkoutSchema.safeParse({ ...base, state: "XX" }).success).toBe(false);
  });
});
