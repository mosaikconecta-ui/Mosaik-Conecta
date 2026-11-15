import type { ApplicationStatus, ContractType, EducationLevel, ExperienceLevel, JobStatus, WorkMode } from "./constants";

export type Role = "candidate" | "company" | "admin";

export interface Profile {
  id: string;
  role: Role;
  status: "active" | "suspended";
  full_name: string;
  email: string;
  phone: string | null;
  city: string | null;
  state: string | null;
  privacy_consent_at: string | null;
  marketing_consent: boolean;
  suspended_reason: string | null;
  created_at: string;
}

export interface Experience {
  company: string;
  role: string;
  start: string; // AAAA-MM
  end?: string | null;
  current?: boolean;
  description?: string | null;
}

export interface Education {
  institution: string;
  course: string;
  level: EducationLevel;
  start?: string | null;
  end?: string | null;
  status: "completo" | "cursando" | "trancado";
}

export interface Candidate {
  id: string;
  headline: string | null;
  summary: string | null;
  experiences: Experience[];
  education: Education[];
  skills: string[];
  languages: string[];
  linkedin_url: string | null;
  desired_role: string | null;
  desired_salary: number | null;
  preferred_work_modes: WorkMode[];
  preferred_contract_types: ContractType[];
  preferred_category_ids: number[];
  preferred_states: string[];
  available_to_relocate: boolean;
  share_contact_with_companies: boolean;
  job_alerts_enabled: boolean;
  email_notifications: boolean;
}

export interface Company {
  id: string;
  owner_id: string | null;
  legal_name: string;
  trade_name: string;
  slug: string;
  cnpj: string;
  email: string;
  phone: string | null;
  website: string | null;
  address: string | null;
  city: string;
  state: string;
  description: string | null;
  logo_path: string | null;
  verification_status: "pending" | "verified" | "rejected";
  status: "active" | "suspended";
  is_demo: boolean;
  created_at: string;
}

export interface Plan {
  id: "starter" | "profissional" | "empresarial";
  name: string;
  price_cents: number;
  max_active_jobs: number;
  max_recruiters: number;
  featured_slots: number;
  candidate_filters: boolean;
  reports: boolean;
  pipeline: boolean;
  advanced_metrics: boolean;
  team_management: boolean;
  features: string[];
  sort_order: number;
}

export interface Job {
  id: string;
  company_id: string;
  category_id: number;
  slug: string;
  title: string;
  openings: number;
  description: string;
  responsibilities: string | null;
  requirements: string | null;
  benefits: string | null;
  schedule: string | null;
  salary_min: number | null;
  salary_max: number | null;
  city: string;
  city_slug: string;
  state: string;
  work_mode: WorkMode;
  contract_type: ContractType;
  education_level: EducationLevel;
  experience_level: ExperienceLevel;
  application_deadline: string | null;
  status: JobStatus;
  is_featured: boolean;
  featured_until: string | null;
  moderation_note: string | null;
  published_at: string | null;
  closed_at: string | null;
  views_count: number;
  is_demo: boolean;
  created_at: string;
  updated_at: string;
}

/** Linha da view public_jobs */
export interface PublicJob extends Omit<Job, "is_featured" | "featured_until" | "moderation_note" | "views_count" | "created_at"> {
  is_featured: boolean;
  is_closed: boolean;
  company_name: string;
  company_slug: string;
  company_logo: string | null;
  company_verified: boolean;
  category_slug: string;
  category_name: string;
}

export interface JobCategory {
  id: number;
  slug: string;
  name: string;
  description: string | null;
  icon: string | null;
  total?: number;
}

export interface Application {
  id: string;
  job_id: string;
  candidate_id: string;
  resume_id: string | null;
  cover_letter: string | null;
  status: ApplicationStatus;
  status_changed_at: string;
  created_at: string;
}

export interface Applicant {
  application_id: string;
  job_id: string;
  job_title: string;
  company_id: string;
  status: ApplicationStatus;
  created_at: string;
  status_changed_at: string;
  cover_letter: string | null;
  resume_id: string | null;
  candidate_id: string;
  full_name: string;
  email: string;
  phone: string | null;
  city: string | null;
  state: string | null;
  headline: string | null;
  summary: string | null;
  experiences: Experience[];
  education: Education[];
  skills: string[];
  languages: string[];
  linkedin_url: string | null;
  desired_salary: number | null;
  available_to_relocate: boolean;
}

export interface Subscription {
  id: string;
  company_id: string;
  plan_id: Plan["id"];
  status: "pending" | "active" | "past_due" | "cancelled" | "expired";
  provider: "mercadopago" | "dev";
  provider_subscription_id: string | null;
  checkout_url: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  cancelled_at: string | null;
  created_at: string;
}

export interface Payment {
  id: string;
  company_id: string;
  subscription_id: string | null;
  job_id: string | null;
  kind: "subscription" | "featured_job";
  provider: "mercadopago" | "dev";
  provider_payment_id: string | null;
  amount_cents: number;
  status: "pending" | "approved" | "rejected" | "refunded" | "cancelled" | "in_process";
  status_detail: string | null;
  description: string | null;
  paid_at: string | null;
  created_at: string;
}

export interface Notification {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  read_at: string | null;
  created_at: string;
}
