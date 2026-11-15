"use client";
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { addApplicationNoteAction } from "@/actions/company";
import { Textarea } from "@/components/ui/form";
import { Button } from "@/components/ui/button";

export function NoteForm({ applicationId }: { applicationId: string }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  return (
    <form className="space-y-2" onSubmit={(e) => {
      e.preventDefault();
      const body = ref.current?.value ?? "";
      start(async () => {
        const r = await addApplicationNoteAction(applicationId, body);
        if (r.ok) { if (ref.current) ref.current.value = ""; setError(null); router.refresh(); } else setError(r.error);
      });
    }}>
      <label htmlFor="note" className="sr-only">Nova anotação</label>
      <Textarea id="note" ref={ref} rows={3} maxLength={2000} placeholder="Anotação interna (não visível ao candidato)" />
      {error && <p className="text-xs text-red-600" role="alert">{error}</p>}
      <Button type="submit" size="sm" disabled={pending}>{pending && <Loader2 className="size-3.5 animate-spin" />}Adicionar anotação</Button>
    </form>
  );
}
