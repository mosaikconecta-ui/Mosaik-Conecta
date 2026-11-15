"use client";

import { submitWith } from "@/components/ui/submit";
import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { addAddressAction, deleteAccountAction, deleteAddressAction, setDefaultAddressAction, submitReviewAction, updateProfileAction } from "@/actions/account";
import { Button } from "@/components/ui/button";
import { Alert, FieldError } from "@/components/ui/misc";
import { UFS, formatCEP, formatCPF, formatPhone, onlyDigits } from "@/lib/br";

function F({ id, label, error, className, ...p }: { id: string; label: string; error?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className={className}>
      <label htmlFor={id} className="label">{label}</label>
      <input id={id} name={id} className="field" aria-invalid={!!error} {...p} />
      <FieldError message={error} />
    </div>
  );
}

export function ProfileForm({ user }: { user: { name: string; email: string; phone: string | null; cpf: string | null; marketingOptIn: boolean } }) {
  const [state, action, pending] = useActionState(updateProfileAction, null);
  const [phone, setPhone] = useState(user.phone ? formatPhone(user.phone) : "");
  const [cpf, setCpf] = useState(user.cpf ? formatCPF(user.cpf) : "");
  return (
    <form onSubmit={submitWith(action)} className="grid max-w-xl gap-4" noValidate>
      {state?.message && <Alert tone={state.ok ? "ok" : "bad"}>{state.message}</Alert>}
      <F id="name" label="Nome completo" defaultValue={user.name} error={state?.errors?.name} autoComplete="name" />
      <F id="email-ro" label="E-mail" value={user.email} readOnly disabled />
      <div className="grid gap-4 sm:grid-cols-2">
        <F id="phone" label="Celular" value={phone} onChange={(e) => setPhone(formatPhone(e.target.value))} error={state?.errors?.phone} inputMode="tel" />
        <F id="cpf" label="CPF" value={cpf} onChange={(e) => setCpf(formatCPF(e.target.value))} error={state?.errors?.cpf} inputMode="numeric" />
      </div>
      <label className="flex items-center gap-2.5 text-sm"><input type="checkbox" name="marketingOptIn" defaultChecked={user.marketingOptIn} className="size-4 accent-[#191816]" /> Receber novidades e ofertas por e-mail</label>
      <div><Button type="submit" loading={pending}>Salvar dados</Button></div>
    </form>
  );
}

export function AddressForm() {
  const [state, action, pending] = useActionState(addAddressAction, null);
  const [cep, setCep] = useState("");
  const [addr, setAddr] = useState({ street: "", district: "", city: "", state: "" });
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok) { formRef.current?.reset(); setCep(""); setAddr({ street: "", district: "", city: "", state: "" }); }
  }, [state]);
  const lookup = async (v: string) => {
    const d = onlyDigits(v);
    if (d.length !== 8) return;
    try {
      const r = await fetch(`https://viacep.com.br/ws/${d}/json/`, { signal: AbortSignal.timeout(5000) }).then((x) => x.json());
      if (!r.erro) setAddr({ street: r.logradouro ?? "", district: r.bairro ?? "", city: r.localidade ?? "", state: r.uf ?? "" });
    } catch { /* preenchimento manual */ }
  };
  return (
    <form ref={formRef} onSubmit={submitWith(action)} className="grid grid-cols-6 gap-4" noValidate>
      {state?.message && <Alert tone={state.ok ? "ok" : "bad"} className="col-span-6">{state.message}</Alert>}
      <F id="label" label="Apelido" placeholder="Casa, Trabalho…" className="col-span-6 sm:col-span-2" />
      <F id="recipient" label="Destinatário" className="col-span-6 sm:col-span-4" error={state?.errors?.recipient} />
      <F id="cep" label="CEP" value={cep} onChange={(e) => { setCep(formatCEP(e.target.value)); lookup(e.target.value); }} inputMode="numeric" className="col-span-6 sm:col-span-2" error={state?.errors?.cep} />
      <F id="street" label="Endereço" value={addr.street} onChange={(e) => setAddr({ ...addr, street: e.target.value })} className="col-span-6 sm:col-span-4" error={state?.errors?.street} />
      <F id="number" label="Número" className="col-span-2" error={state?.errors?.number} />
      <F id="complement" label="Complemento" className="col-span-4" />
      <F id="district" label="Bairro" value={addr.district} onChange={(e) => setAddr({ ...addr, district: e.target.value })} className="col-span-6 sm:col-span-2" error={state?.errors?.district} />
      <F id="city" label="Cidade" value={addr.city} onChange={(e) => setAddr({ ...addr, city: e.target.value })} className="col-span-4 sm:col-span-3" error={state?.errors?.city} />
      <div className="col-span-2 sm:col-span-1">
        <label htmlFor="state" className="label">UF</label>
        <select id="state" name="state" className="field" value={addr.state} onChange={(e) => setAddr({ ...addr, state: e.target.value })}>
          <option value="">—</option>{UFS.map((u) => <option key={u}>{u}</option>)}
        </select>
        <FieldError message={state?.errors?.state} />
      </div>
      <label className="col-span-6 flex items-center gap-2.5 text-sm"><input type="checkbox" name="isDefault" className="size-4 accent-[#191816]" /> Usar como endereço principal</label>
      <div className="col-span-6"><Button type="submit" loading={pending}>Salvar endereço</Button></div>
    </form>
  );
}

export function AddressActions({ id, isDefault }: { id: string; isDefault: boolean }) {
  const [pending, start] = useTransition();
  return (
    <div className="flex gap-4 text-sm">
      {!isDefault && <button disabled={pending} onClick={() => start(() => setDefaultAddressAction(id))} className="link-draw">Tornar principal</button>}
      <button disabled={pending} onClick={() => { if (confirm("Excluir este endereço?")) start(() => deleteAddressAction(id)); }} className="link-draw text-danger">Excluir</button>
    </div>
  );
}

export function DeleteAccountForm() {
  const [state, action, pending] = useActionState(deleteAccountAction, null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  if (!confirmOpen) return <Button variant="danger" onClick={() => setConfirmOpen(true)}>Excluir minha conta</Button>;
  return (
    <form onSubmit={submitWith(action)} className="max-w-sm space-y-3">
      <Alert tone="warn">Esta ação é permanente. Seus dados pessoais serão anonimizados; registros de pedidos são mantidos apenas pelo prazo exigido pela legislação fiscal.</Alert>
      <F id="password" label="Confirme sua senha" type="password" autoComplete="current-password" error={state?.errors?.password} />
      <div className="flex gap-2"><Button variant="danger" type="submit" loading={pending}>Confirmar exclusão</Button><Button type="button" variant="ghost" onClick={() => setConfirmOpen(false)}>Cancelar</Button></div>
    </form>
  );
}

export function ReviewForm({ orderItemId }: { orderItemId: string }) {
  const [state, action, pending] = useActionState(submitReviewAction, null);
  const [rating, setRating] = useState(5);
  if (state?.ok) return <Alert tone="ok">{state.message}</Alert>;
  return (
    <form onSubmit={submitWith(action)} className="max-w-xl space-y-4">
      <input type="hidden" name="orderItemId" value={orderItemId} />
      <input type="hidden" name="rating" value={rating} />
      {state?.message && <Alert tone="bad">{state.message}</Alert>}
      <fieldset>
        <legend className="label">Nota</legend>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} type="button" onClick={() => setRating(n)} aria-label={`${n} estrela${n > 1 ? "s" : ""}`} aria-pressed={rating === n} className="grid size-11 place-items-center text-2xl">{n <= rating ? "★" : "☆"}</button>
          ))}
        </div>
      </fieldset>
      <F id="title" label="Título (opcional)" maxLength={80} />
      <div>
        <label htmlFor="body" className="label">Sua avaliação</label>
        <textarea id="body" name="body" className="field" maxLength={2000} aria-invalid={!!state?.errors?.body} />
        <FieldError message={state?.errors?.body} />
      </div>
      <Button type="submit" loading={pending}>Enviar avaliação</Button>
    </form>
  );
}
