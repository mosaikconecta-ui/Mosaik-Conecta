"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { updateApplicationStatusAction } from "@/actions/company";
import { APPLICATION_STATUS, APPLICATION_STATUS_KEYS, type ApplicationStatus } from "@/lib/constants";
import { Select } from "@/components/ui/form";

export function StatusSelect({ applicationId, status, compact }: { applicationId: string; status: ApplicationStatus; compact?: boolean }) {
  const [value, setValue] = useState(status);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  return (
    <div className="flex items-center gap-2">
      <label className="sr-only" htmlFor={`st-${applicationId}`}>Status da candidatura</label>
      <Select id={`st-${applicationId}`} value={value} disabled={pending} className={compact ? "h-8 w-44 text-[13px]" : "w-56"}
        onChange={(e) => {
          const next = e.target.value as ApplicationStatus;
          const prev = value;
          setValue(next);
          start(async () => {
            const r = await updateApplicationStatusAction(applicationId, next);
            if (!r.ok) { setValue(prev); setError(r.error); } else { setError(null); router.refresh(); }
          });
        }}>
        {APPLICATION_STATUS_KEYS.map((k) => <option key={k} value={k}>{APPLICATION_STATUS[k].label}</option>)}
      </Select>
      {pending && <Loader2 className="size-4 animate-spin text-muted" aria-label="Salvando" />}
      {error && <span className="text-xs text-red-600" role="alert">{error}</span>}
    </div>
  );
}
