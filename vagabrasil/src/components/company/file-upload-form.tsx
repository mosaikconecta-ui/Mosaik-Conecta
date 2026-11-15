"use client";
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormStatus } from "@/components/ui/form-status";
import type { ActionResult } from "@/lib/actions";

export function FileUploadForm({ action, accept, label, hint, maxBytes, button }: {
  action: (fd: FormData) => Promise<ActionResult<never>>; accept: string; label: string; hint: string; maxBytes: number; button: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [name, setName] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ error?: string; success?: string }>({});
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <form className="space-y-3" onSubmit={(e) => {
      e.preventDefault();
      const f = ref.current?.files?.[0];
      if (!f) return setMsg({ error: "Selecione um arquivo." });
      if (f.size > maxBytes) return setMsg({ error: `Tamanho máximo: ${Math.round(maxBytes / 1048576)} MB.` });
      const fd = new FormData(); fd.set("file", f);
      start(async () => {
        const r = await action(fd);
        setMsg(r.ok ? { success: r.message } : { error: r.error });
        if (r.ok) { setName(null); if (ref.current) ref.current.value = ""; router.refresh(); }
      });
    }}>
      <label className="flex cursor-pointer items-center gap-3 rounded-lg border-2 border-dashed border-navy-200 p-4 hover:border-brand-300">
        <Upload className="size-5 text-navy-400" aria-hidden />
        <span className="min-w-0 text-sm"><span className="block font-medium text-navy-800">{name ?? label}</span><span className="text-xs text-muted">{hint}</span></span>
        <input ref={ref} type="file" accept={accept} className="sr-only" onChange={(e) => setName(e.target.files?.[0]?.name ?? null)} />
      </label>
      <FormStatus error={msg.error} success={msg.success} />
      <Button type="submit" size="sm" disabled={pending || !name}>{pending && <Loader2 className="size-3.5 animate-spin" />}{button}</Button>
    </form>
  );
}
