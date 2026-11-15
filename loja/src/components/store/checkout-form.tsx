"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import { CreditCard, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, FieldError } from "@/components/ui/misc";
import { formatBRL } from "@/lib/format";
import { UFS, formatCEP, formatCPF, formatPhone, onlyDigits } from "@/lib/br";
import { track } from "@/lib/analytics";
import { placeOrderAction, saveCheckoutContactAction } from "@/actions/checkout";
import { useCart } from "./cart-provider";

type SavedAddress = { id: string; label: string; recipient: string; cep: string; street: string; number: string; complement: string; district: string; city: string; state: string };

type Form = {
  name: string; email: string; phone: string; cpf: string; cep: string; street: string; number: string; complement: string;
  district: string; city: string; state: string; shippingMethodId: string; notes: string; saveAddress: boolean; acceptTerms: boolean;
};

export function CheckoutForm({ user, addresses, paymentReady }: { user: { name: string; email: string; phone: string; cpf: string } | null; addresses: SavedAddress[]; paymentReady: boolean }) {
  const { cart, loaded, setCep, pending: cartPending } = useCart();
  const first = addresses[0];
  const [f, setF] = useState<Form>({
    name: user?.name ?? "", email: user?.email ?? "", phone: user?.phone ? formatPhone(user.phone) : "", cpf: user?.cpf ? formatCPF(user.cpf) : "",
    cep: first ? formatCEP(first.cep) : cart.cep ? formatCEP(cart.cep) : "", street: first?.street ?? "", number: first?.number ?? "", complement: first?.complement ?? "",
    district: first?.district ?? "", city: first?.city ?? "", state: first?.state ?? "", shippingMethodId: "", notes: "", saveAddress: !!user && !first, acceptTerms: false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [cepLoading, setCepLoading] = useState(false);
  const [cepNote, setCepNote] = useState<string | null>(null);
  const tracked = useRef(false);
  const numberRef = useRef<HTMLInputElement>(null);

  const set = <K extends keyof Form>(k: K, v: Form[K]) => { setF((s) => ({ ...s, [k]: v })); setErrors((e) => ({ ...e, [k]: "" })); };

  useEffect(() => {
    if (loaded && !tracked.current && cart.items.length) {
      tracked.current = true;
      track("begin_checkout", { value: cart.totalCents / 100, items: cart.items.map((i) => ({ item_id: i.variantId, item_name: i.name, price: i.unitCents / 100, quantity: i.quantity })) });
    }
  }, [loaded, cart]);

  // calcula o frete quando o CEP fica completo
  const cepDigits = onlyDigits(f.cep);
  useEffect(() => {
    if (cepDigits.length !== 8) return;
    if (cart.cep !== cepDigits) setCep(cepDigits);
    if (f.street && f.city) return; // endereço já preenchido (salvo)
    let cancelled = false;
    setCepLoading(true);
    setCepNote(null);
    fetch(`https://viacep.com.br/ws/${cepDigits}/json/`, { signal: AbortSignal.timeout(6000) })
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        if (d.erro) { setCepNote("CEP não encontrado. Preencha o endereço manualmente."); return; }
        setF((s) => ({ ...s, street: d.logradouro || s.street, district: d.bairro || s.district, city: d.localidade || s.city, state: d.uf || s.state }));
        setTimeout(() => numberRef.current?.focus(), 50);
      })
      .catch(() => !cancelled && setCepNote("Não foi possível consultar o CEP agora. Preencha o endereço manualmente."))
      .finally(() => !cancelled && setCepLoading(false));
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cepDigits]);

  const quotes = cart.cep === cepDigits ? cart.shippingQuotes : [];
  useEffect(() => {
    if (quotes.length && !quotes.some((q) => q.id === f.shippingMethodId)) setF((s) => ({ ...s, shippingMethodId: quotes[0].id }));
  }, [quotes, f.shippingMethodId]);
  const quote = quotes.find((q) => q.id === f.shippingMethodId);

  const totals = useMemo(() => {
    const goods = cart.subtotalCents - cart.bundleDiscountCents - cart.couponDiscountCents;
    const ship = quote ? quote.priceCents : null;
    return { goods, ship, total: goods + (ship ?? 0) };
  }, [cart, quote]);

  const pickAddress = (a: SavedAddress) => {
    setF((s) => ({ ...s, cep: formatCEP(a.cep), street: a.street, number: a.number, complement: a.complement, district: a.district, city: a.city, state: a.state, saveAddress: false }));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);
    const r = await placeOrderAction({ ...f, cpf: f.cpf || "", complement: f.complement || "", notes: f.notes || "" });
    if (!r.ok) {
      setSubmitting(false);
      setErrors(r.errors ?? {});
      setFormError(r.error ?? null);
      const firstKey = Object.keys(r.errors ?? {})[0];
      if (firstKey) document.getElementById(`co-${firstKey}`)?.focus();
      else window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    window.location.href = r.redirectTo;
  };

  if (!loaded) return <div className="h-96 animate-pulse bg-paper-2" />;

  const field = (k: keyof Form, label: string, { className, ...props }: React.InputHTMLAttributes<HTMLInputElement> = {}, hint?: string) => (
    <div className={className}>
      <label htmlFor={`co-${k}`} className="label">{label}</label>
      <input id={`co-${k}`} name={k} className="field" value={String(f[k])} aria-invalid={!!errors[k]} aria-describedby={errors[k] ? `err-${k}` : undefined}
        {...props} onChange={(e) => set(k, e.target.value as never)} />
      {hint && !errors[k] && <p className="mt-1.5 text-[12px] text-muted">{hint}</p>}
      <FieldError message={errors[k]} id={`err-${k}`} />
    </div>
  );

  return (
    <form onSubmit={submit} noValidate className="grid gap-10 lg:grid-cols-[1fr_420px] lg:gap-16">
      <div className="space-y-12">
        {formError && <Alert tone="bad" title="Não foi possível finalizar">{formError}</Alert>}

        <section aria-labelledby="s1">
          <Step n={1} id="s1" title="Identificação" right={!user && <Link href="/conta/entrar?next=/checkout" className="link-draw text-sm font-semibold">Já tem conta? Entrar</Link>} />
          <div className="grid gap-4 sm:grid-cols-2">
            {field("email", "E-mail", { type: "email", autoComplete: "email", className: "sm:col-span-2", onBlur: () => saveCheckoutContactAction(f.email, f.name, f.phone) }, "Enviaremos a confirmação e as atualizações do pedido para este e-mail.")}
            {field("name", "Nome completo", { autoComplete: "name", className: "sm:col-span-2" })}
            <div>
              <label htmlFor="co-phone" className="label">Celular (WhatsApp)</label>
              <input id="co-phone" className="field" inputMode="tel" autoComplete="tel-national" value={f.phone} aria-invalid={!!errors.phone} onChange={(e) => set("phone", formatPhone(e.target.value))} placeholder="(11) 90000-0000" />
              <FieldError message={errors.phone} />
            </div>
            <div>
              <label htmlFor="co-cpf" className="label">CPF <span className="font-normal text-muted">(opcional)</span></label>
              <input id="co-cpf" className="field" inputMode="numeric" value={f.cpf} aria-invalid={!!errors.cpf} onChange={(e) => set("cpf", formatCPF(e.target.value))} placeholder="000.000.000-00" />
              {!errors.cpf && <p className="mt-1.5 text-[12px] text-muted">Agiliza Pix e boleto e é usado na nota fiscal.</p>}
              <FieldError message={errors.cpf} />
            </div>
          </div>
        </section>

        <section aria-labelledby="s2">
          <Step n={2} id="s2" title="Endereço de entrega" />
          {addresses.length > 0 && (
            <div className="mb-5 flex flex-wrap gap-2">
              {addresses.map((a) => (
                <button key={a.id} type="button" onClick={() => pickAddress(a)}
                  className={clsx("border px-3.5 py-2.5 text-left text-sm transition-colors", onlyDigits(f.cep) === a.cep && f.number === a.number ? "border-ink bg-surface" : "border-line-2 hover:border-ink")}>
                  <span className="font-semibold">{a.label}</span><br /><span className="text-muted">{a.street}, {a.number} — {a.city}/{a.state}</span>
                </button>
              ))}
            </div>
          )}
          <div className="grid grid-cols-6 gap-4">
            <div className="col-span-6 sm:col-span-2">
              <label htmlFor="co-cep" className="label">CEP</label>
              <input id="co-cep" className="field" inputMode="numeric" autoComplete="postal-code" value={f.cep} aria-invalid={!!errors.cep}
                onChange={(e) => { set("cep", formatCEP(e.target.value)); setF((s) => ({ ...s, street: onlyDigits(e.target.value).length === 8 ? s.street : "", city: onlyDigits(e.target.value).length === 8 ? s.city : "" })); }} placeholder="00000-000" />
              <FieldError message={errors.cep} />
            </div>
            <div className="col-span-6 flex items-end text-sm text-muted sm:col-span-4">
              {cepLoading ? "Buscando endereço…" : cepNote ?? <a href="https://buscacepinter.correios.com.br/app/endereco/index.php" target="_blank" rel="noopener noreferrer" className="link-draw mb-3">Não sei meu CEP</a>}
            </div>
            {field("street", "Endereço", { autoComplete: "address-line1", className: "col-span-6 sm:col-span-4" })}
            <div className="col-span-3 sm:col-span-2">
              <label htmlFor="co-number" className="label">Número</label>
              <input id="co-number" ref={numberRef} className="field" value={f.number} aria-invalid={!!errors.number} onChange={(e) => set("number", e.target.value)} />
              <FieldError message={errors.number} />
            </div>
            {field("complement", "Complemento", { autoComplete: "address-line2", className: "col-span-3 sm:col-span-2", placeholder: "Apto, bloco…" })}
            {field("district", "Bairro", { className: "col-span-6 sm:col-span-4" })}
            {field("city", "Cidade", { autoComplete: "address-level2", className: "col-span-4" })}
            <div className="col-span-2">
              <label htmlFor="co-state" className="label">UF</label>
              <select id="co-state" className="field" value={f.state} aria-invalid={!!errors.state} onChange={(e) => set("state", e.target.value)}>
                <option value="">—</option>
                {UFS.map((u) => <option key={u} value={u}>{u}</option>)}
              </select>
              <FieldError message={errors.state} />
            </div>
          </div>
          {user && (
            <label className="mt-4 flex items-center gap-2.5 text-sm"><input type="checkbox" className="size-4 accent-[#191816]" checked={f.saveAddress} onChange={(e) => set("saveAddress", e.target.checked)} /> Salvar endereço na minha conta</label>
          )}
        </section>

        <section aria-labelledby="s3">
          <Step n={3} id="s3" title="Entrega" />
          {cepDigits.length !== 8 ? <p className="text-sm text-muted">Informe o CEP para ver as opções de entrega.</p> : quotes.length === 0 ? <p className="text-sm text-muted">{cartPending ? "Calculando frete…" : "Nenhuma opção de entrega disponível para este CEP."}</p> : (
            <div className="space-y-2.5" role="radiogroup" aria-label="Opções de entrega">
              {quotes.map((q) => (
                <label key={q.id} className={clsx("flex cursor-pointer items-center gap-4 border p-4 transition-colors", f.shippingMethodId === q.id ? "border-ink bg-surface" : "border-line-2 hover:border-ink")}>
                  <input type="radio" name="shipping" className="size-4 accent-[#191816]" checked={f.shippingMethodId === q.id} onChange={() => set("shippingMethodId", q.id)} />
                  <span className="flex-1"><span className="font-semibold">{q.name}</span> <span className="text-sm text-muted">· {q.carrier}</span><br /><span className="text-sm text-muted">{q.daysMin} a {q.daysMax} dias úteis após a aprovação</span></span>
                  <span className={clsx("font-semibold tabular-nums", q.free && "text-moss")}>{q.free ? "Grátis" : formatBRL(q.priceCents)}</span>
                </label>
              ))}
            </div>
          )}
          <FieldError message={errors.shippingMethodId} />
        </section>

        <section aria-labelledby="s4">
          <Step n={4} id="s4" title="Pagamento" />
          <div className="border border-line bg-surface p-5">
            <p className="flex items-center gap-2 font-semibold"><CreditCard size={18} strokeWidth={1.6} /> Mercado Pago</p>
            <p className="mt-2 text-sm leading-relaxed text-ink-2">Ao confirmar, você será levado ao ambiente seguro do Mercado Pago para pagar com <strong>Pix</strong>, <strong>cartão de crédito em até 6× sem juros</strong> ou <strong>boleto</strong>. Seus dados de cartão não passam pela Mosaik.</p>
            {!paymentReady && <Alert tone="warn" className="mt-4" title="Pagamento online ainda não configurado">O pedido será registrado como aguardando pagamento, sem nenhuma cobrança. O administrador precisa configurar as credenciais do Mercado Pago.</Alert>}
          </div>
          <div className="mt-5">
            <label htmlFor="co-notes" className="label">Observações para a entrega <span className="font-normal text-muted">(opcional)</span></label>
            <textarea id="co-notes" className="field min-h-[80px]" maxLength={500} value={f.notes} onChange={(e) => set("notes", e.target.value)} />
          </div>
          <label className="mt-5 flex items-start gap-3 text-sm leading-relaxed">
            <input id="co-acceptTerms" type="checkbox" className="mt-1 size-4 accent-[#191816]" checked={f.acceptTerms} onChange={(e) => set("acceptTerms", e.target.checked)} aria-invalid={!!errors.acceptTerms} />
            <span>Li e aceito os <Link href="/termos-de-uso" target="_blank" className="underline underline-offset-2">Termos de uso</Link>, a <Link href="/politica-de-privacidade" target="_blank" className="underline underline-offset-2">Política de privacidade</Link> e a <Link href="/trocas-e-devolucoes" target="_blank" className="underline underline-offset-2">Política de trocas</Link>.</span>
          </label>
          <FieldError message={errors.acceptTerms} />
        </section>
      </div>

      <aside className="h-fit border border-line bg-surface p-6 lg:sticky lg:top-8" aria-label="Resumo do pedido">
        <h2 className="text-lg font-semibold">Seu pedido</h2>
        <ul className="mt-4 divide-y divide-line">
          {cart.items.filter((i) => !i.unavailable).map((i) => (
            <li key={i.id} className="flex gap-3 py-3">
              <div className="relative aspect-[4/5] w-14 shrink-0 bg-paper-2">
                {i.image && <Image src={i.image} alt="" fill sizes="56px" className="object-cover" />}
                <span className="absolute -right-2 -top-2 grid size-5 place-items-center rounded-full bg-ink text-[11px] font-bold text-paper">{i.quantity}</span>
              </div>
              <div className="min-w-0 flex-1 text-sm"><p className="truncate font-semibold">{i.name}</p>{i.variantName && <p className="text-muted">{i.variantName}</p>}</div>
              <p className="text-sm tabular-nums">{formatBRL(i.lineCents)}</p>
            </li>
          ))}
        </ul>
        <dl className="mt-4 space-y-2 border-t border-line pt-4 text-sm">
          <div className="flex justify-between"><dt>Subtotal</dt><dd className="tabular-nums">{formatBRL(cart.subtotalCents)}</dd></div>
          {cart.bundleDiscountCents > 0 && <div className="flex justify-between text-moss"><dt>Combos</dt><dd>−{formatBRL(cart.bundleDiscountCents)}</dd></div>}
          {cart.couponDiscountCents > 0 && <div className="flex justify-between text-moss"><dt>Cupom {cart.couponCode}</dt><dd>−{formatBRL(cart.couponDiscountCents)}</dd></div>}
          <div className="flex justify-between"><dt>Frete</dt><dd className="tabular-nums">{totals.ship === null ? "—" : totals.ship === 0 ? "Grátis" : formatBRL(totals.ship)}</dd></div>
          <div className="flex justify-between border-t border-line pt-3 text-lg font-semibold"><dt>Total</dt><dd className="tabular-nums" data-testid="checkout-total">{formatBRL(totals.total)}</dd></div>
        </dl>
        {cart.couponError && <p className="mt-2 text-sm text-danger">{cart.couponError}</p>}
        <Button type="submit" size="lg" full className="mt-6" loading={submitting} disabled={!quote || cart.items.length === 0} data-testid="place-order">
          <Lock size={16} /> {paymentReady ? "Ir para o pagamento" : "Registrar pedido"}
        </Button>
        <p className="mt-3 text-center text-[12px] text-muted">Valores recalculados com segurança no servidor.</p>
      </aside>
    </form>
  );
}

function Step({ n, id, title, right }: { n: number; id: string; title: string; right?: React.ReactNode }) {
  return (
    <div className="mb-5 flex items-center justify-between gap-4 border-b border-line pb-3">
      <h2 id={id} className="flex items-center gap-3 text-lg font-semibold"><span className="grid size-7 place-items-center rounded-full bg-ink text-[13px] text-paper">{n}</span>{title}</h2>
      {right}
    </div>
  );
}
