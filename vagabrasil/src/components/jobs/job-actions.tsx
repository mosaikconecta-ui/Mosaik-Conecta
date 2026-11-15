"use client";
import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import { Bookmark, BookmarkCheck, CheckCircle2, Flag, Loader2 } from "lucide-react";
import { applyToJobAction, toggleSavedJobAction } from "@/actions/candidate";
import { reportJobAction } from "@/actions/report";
import { Button, ButtonLink } from "@/components/ui/button";
import { Alert } from "@/components/ui/misc";
import { Field, Select, Textarea } from "@/components/ui/form";
import { APPLICATION_STATUS, REPORT_REASONS, type ApplicationStatus } from "@/lib/constants";

type Viewer = "anonymous" | "candidate" | "company" | "admin";

export function ApplyPanel({ jobId, slug, viewer, closed, isDemo, existingStatus, resumes, profileComplete }: {
  jobId: string; slug: string; viewer: Viewer; closed: boolean; isDemo: boolean;
  existingStatus: ApplicationStatus | null; resumes: { id: string; file_name: string }[]; profileComplete: boolean;
}) {
  const [pending, start] = useTransition();
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);
  const [status, setStatus] = useState(existingStatus);
  const [open, setOpen] = useState(false);

  if (closed) return <Alert tone="warning" title="Inscrições encerradas">Esta vaga não está mais recebendo candidaturas.</Alert>;
  if (isDemo) return <Alert tone="warning" title="Vaga de demonstração">Esta vaga é fictícia e serve apenas para demonstrar a plataforma.</Alert>;
  if (status) {
    return (
      <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
        <p className="flex items-center gap-2 font-semibold"><CheckCircle2 className="size-4" aria-hidden />Você já se candidatou</p>
        <p className="mt-1">Status: <strong>{APPLICATION_STATUS[status].label}</strong></p>
        <Link href="/candidato/candidaturas" className="mt-2 inline-block font-semibold text-emerald-800 underline">Acompanhar candidatura</Link>
      </div>
    );
  }
  if (viewer === "anonymous") {
    return (
      <div className="space-y-2">
        <ButtonLink href={`/entrar?redirect=/vaga/${slug}`} size="lg" className="w-full">Candidatar-se</ButtonLink>
        <p className="text-center text-[13px] text-muted">Não tem conta? <Link href={`/cadastro?redirect=/vaga/${slug}`} className="font-semibold text-brand-700">Cadastre-se grátis</Link></p>
      </div>
    );
  }
  if (viewer !== "candidate") {
    return <Alert tone="info">Candidaturas são feitas por contas de candidato.</Alert>;
  }
  if (!profileComplete) {
    return (
      <div className="space-y-2">
        <Alert tone="info" title="Complete seu currículo">Para se candidatar, preencha seu currículo digital ou envie um PDF.</Alert>
        <ButtonLink href="/candidato/curriculo" className="w-full">Completar currículo</ButtonLink>
      </div>
    );
  }

  if (!open) return <Button size="lg" className="w-full" onClick={() => setOpen(true)}>Candidatar-se</Button>;

  return (
    <form className="space-y-3" onSubmit={(e) => {
      e.preventDefault();
      const fd = new FormData(e.currentTarget);
      start(async () => {
        const r = await applyToJobAction({ job_id: jobId, resume_id: fd.get("resume_id"), cover_letter: fd.get("cover_letter") });
        if (r.ok) { setStatus("received"); setResult({ ok: true, text: r.message ?? "Candidatura enviada." }); }
        else setResult({ ok: false, text: r.error });
      });
    }}>
      {resumes.length > 0 && (
        <Field label="Currículo em PDF" htmlFor="resume_id">
          <Select id="resume_id" name="resume_id" defaultValue={resumes[0]!.id}>
            {resumes.map((r) => <option key={r.id} value={r.id}>{r.file_name}</option>)}
            <option value="">Enviar apenas o currículo digital</option>
          </Select>
        </Field>
      )}
      <Field label="Mensagem para a empresa (opcional)" htmlFor="cover_letter">
        <Textarea id="cover_letter" name="cover_letter" rows={4} maxLength={3000} placeholder="Conte brevemente por que você tem interesse na vaga." />
      </Field>
      {result && !result.ok && <Alert tone="danger">{result.text}</Alert>}
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending && <Loader2 className="size-4 animate-spin" aria-hidden />} Enviar candidatura
      </Button>
      <p className="text-center text-xs text-muted">A empresa terá acesso ao seu currículo e dados de contato.</p>
    </form>
  );
}

export function SaveJobButton({ jobId, initialSaved, viewer, slug }: { jobId: string; initialSaved: boolean; viewer: Viewer; slug: string }) {
  const [saved, setSaved] = useState(initialSaved);
  const [pending, start] = useTransition();
  if (viewer === "anonymous") {
    return <ButtonLink href={`/entrar?redirect=/vaga/${slug}`} variant="outline" className="w-full"><Bookmark className="size-4" aria-hidden />Salvar vaga</ButtonLink>;
  }
  if (viewer !== "candidate") return null;
  return (
    <Button variant="outline" className="w-full" disabled={pending} aria-pressed={saved}
      onClick={() => start(async () => { const r = await toggleSavedJobAction(jobId, !saved); if (r.ok) setSaved(!saved); })}>
      {saved ? <BookmarkCheck className="size-4 text-brand-600" aria-hidden /> : <Bookmark className="size-4" aria-hidden />}
      {saved ? "Vaga salva" : "Salvar vaga"}
    </Button>
  );
}

export function ReportJob({ jobId, viewer, slug }: { jobId: string; viewer: Viewer; slug: string }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  if (viewer === "anonymous") {
    return <Link href={`/entrar?redirect=/vaga/${slug}`} className="inline-flex items-center gap-1.5 text-[13px] text-muted hover:text-red-700"><Flag className="size-3.5" aria-hidden />Denunciar vaga</Link>;
  }
  return (
    <>
      <button type="button" onClick={() => ref.current?.showModal()} className="inline-flex items-center gap-1.5 text-[13px] text-muted hover:text-red-700">
        <Flag className="size-3.5" aria-hidden />Denunciar vaga
      </button>
      <dialog ref={ref} className="m-auto w-[min(32rem,calc(100%-2rem))] rounded-xl border border-line p-0 shadow-xl backdrop:bg-navy-950/50">
        <form className="space-y-4 p-6" onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          start(async () => {
            const r = await reportJobAction({ job_id: jobId, reason: fd.get("reason"), details: fd.get("details") });
            setMsg(r.ok ? { ok: true, text: r.message! } : { ok: false, text: r.error });
          });
        }}>
          <h2 className="text-lg font-semibold">Denunciar vaga</h2>
          {msg?.ok ? (
            <Alert tone="success">{msg.text}</Alert>
          ) : (
            <>
              <Field label="Motivo" htmlFor="reason" required>
                <Select id="reason" name="reason" required defaultValue="">
                  <option value="" disabled>Selecione</option>
                  {Object.entries(REPORT_REASONS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </Select>
              </Field>
              <Field label="Detalhes (opcional)" htmlFor="details">
                <Textarea id="details" name="details" rows={3} maxLength={2000} />
              </Field>
              {msg && !msg.ok && <Alert tone="danger">{msg.text}</Alert>}
            </>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => { ref.current?.close(); setMsg(null); }}>Fechar</Button>
            {!msg?.ok && <Button type="submit" variant="danger" disabled={pending}>{pending && <Loader2 className="size-4 animate-spin" />}Enviar denúncia</Button>}
          </div>
        </form>
      </dialog>
    </>
  );
}
