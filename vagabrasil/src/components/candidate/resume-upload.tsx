"use client";
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FileText, Loader2, Upload } from "lucide-react";
import { uploadResumeAction } from "@/actions/candidate";
import { Button } from "@/components/ui/button";
import { FormStatus } from "@/components/ui/form-status";
import { MAX_RESUME_BYTES } from "@/lib/constants";

export function ResumeUpload({ disabled }: { disabled?: boolean }) {
  const ref = useRef<HTMLInputElement>(null);
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ error?: string; success?: string }>({});
  const router = useRouter();
  const [name, setName] = useState<string | null>(null);

  return (
    <form className="space-y-3" onSubmit={(e) => {
      e.preventDefault();
      const file = ref.current?.files?.[0];
      if (!file) return setMsg({ error: "Selecione um arquivo PDF." });
      if (file.type !== "application/pdf") return setMsg({ error: "Somente arquivos PDF são aceitos." });
      if (file.size > MAX_RESUME_BYTES) return setMsg({ error: "O arquivo deve ter no máximo 5 MB." });
      const fd = new FormData();
      fd.set("file", file);
      start(async () => {
        const r = await uploadResumeAction(fd);
        setMsg(r.ok ? { success: r.message } : { error: r.error });
        if (r.ok) { if (ref.current) ref.current.value = ""; setName(null); router.refresh(); }
      });
    }}>
      <label className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed border-navy-200 p-6 text-center hover:border-brand-300 hover:bg-brand-50/30">
        {name ? <FileText className="size-6 text-brand-600" aria-hidden /> : <Upload className="size-6 text-navy-400" aria-hidden />}
        <span className="text-sm font-medium text-navy-800">{name ?? "Clique para selecionar seu currículo em PDF"}</span>
        <span className="text-xs text-muted">Apenas PDF, até 5 MB. Armazenado de forma privada.</span>
        <input ref={ref} type="file" accept="application/pdf" className="sr-only" disabled={disabled} onChange={(e) => setName(e.target.files?.[0]?.name ?? null)} />
      </label>
      <FormStatus error={msg.error} success={msg.success} />
      <Button type="submit" disabled={pending || disabled || !name}>{pending && <Loader2 className="size-4 animate-spin" />}Enviar PDF</Button>
    </form>
  );
}
