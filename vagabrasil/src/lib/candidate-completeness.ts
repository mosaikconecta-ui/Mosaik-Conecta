import type { Candidate, Profile } from "@/lib/types";

export function completeness(profile: Profile, c: Candidate, resumeCount: number) {
  const checks = [
    { label: "Telefone de contato", done: Boolean(profile.phone), href: "/candidato/curriculo" },
    { label: "Título profissional", done: Boolean(c.headline), href: "/candidato/curriculo" },
    { label: "Resumo profissional", done: Boolean(c.summary), href: "/candidato/curriculo" },
    { label: "Experiências", done: c.experiences.length > 0, href: "/candidato/curriculo#experiencias" },
    { label: "Formação", done: c.education.length > 0, href: "/candidato/curriculo#formacao" },
    { label: "Habilidades", done: c.skills.length > 0, href: "/candidato/curriculo#habilidades" },
    { label: "Currículo em PDF", done: resumeCount > 0, href: "/candidato/curriculo#pdf" },
    { label: "Preferências profissionais", done: c.preferred_category_ids.length > 0 || Boolean(c.desired_role), href: "/candidato/preferencias" },
  ];
  const pct = Math.round((checks.filter((x) => x.done).length / checks.length) * 100);
  return { pct, checks };
}
