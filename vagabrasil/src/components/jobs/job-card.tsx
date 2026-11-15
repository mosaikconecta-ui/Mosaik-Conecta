import Link from "next/link";
import { BadgeCheck, Banknote, Clock, MapPin } from "lucide-react";
import { Avatar, Badge } from "@/components/ui/misc";
import { CONTRACT_TYPES, WORK_MODES } from "@/lib/constants";
import { formatSalary, timeAgo } from "@/lib/format";
import { publicStorageUrl } from "@/lib/env";
import type { JobCard as JobCardData } from "@/lib/jobs";
import { cn } from "@/lib/cn";

export function summarize(text: string, max = 170) {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length > max ? clean.slice(0, max).replace(/\s+\S*$/, "") + "…" : clean;
}

export function JobCard({ job, compact }: { job: JobCardData; compact?: boolean }) {
  const salary = formatSalary(job.salary_min, job.salary_max);
  return (
    <article className={cn("card group relative p-5 transition-shadow hover:shadow-(--shadow-raised)", job.is_featured && "border-brand-200 ring-1 ring-brand-100")}>
      <div className="flex gap-4">
        <Avatar name={job.company_name} src={publicStorageUrl("company-logos", job.company_logo)} size={48} square />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            {job.is_featured && <Badge tone="brand">Destaque</Badge>}
            {job.is_demo && <Badge tone="warning">Demonstração</Badge>}
          </div>
          <h3 className={cn("font-display text-base font-semibold leading-snug text-navy-900", (job.is_featured || job.is_demo) && "mt-1.5")}>
            <Link href={`/vaga/${job.slug}`} className="after:absolute after:inset-0 hover:text-brand-700">{job.title}</Link>
          </h3>
          <p className="mt-0.5 flex items-center gap-1 text-sm text-navy-600">
            {job.company_name}
            {job.company_verified && <BadgeCheck className="size-4 text-brand-600" aria-label="Empresa verificada" />}
          </p>
          <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-[13px] text-muted">
            <li className="flex items-center gap-1"><MapPin className="size-3.5" aria-hidden />{job.city} – {job.state}</li>
            {salary && <li className="flex items-center gap-1"><Banknote className="size-3.5" aria-hidden />{salary}</li>}
            <li className="flex items-center gap-1"><Clock className="size-3.5" aria-hidden /><time dateTime={job.published_at ?? undefined}>{timeAgo(job.published_at)}</time></li>
          </ul>
          {!compact && <p className="mt-3 text-sm leading-relaxed text-navy-600">{summarize(job.description)}</p>}
          <div className="mt-3 flex flex-wrap gap-1.5">
            <Badge>{WORK_MODES[job.work_mode]}</Badge>
            <Badge>{CONTRACT_TYPES[job.contract_type]}</Badge>
          </div>
        </div>
      </div>
    </article>
  );
}
