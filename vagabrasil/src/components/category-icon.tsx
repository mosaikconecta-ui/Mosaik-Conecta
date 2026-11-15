import {
  Briefcase, Calculator, Factory, GraduationCap, HardHat, Headset, HeartPulse, Laptop, Layers,
  Megaphone, Sparkles, Store, TrendingUp, Truck, Users, Utensils, type LucideIcon,
} from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  store: Store, truck: Truck, headset: Headset, briefcase: Briefcase, calculator: Calculator,
  "trending-up": TrendingUp, laptop: Laptop, factory: Factory, "heart-pulse": HeartPulse,
  utensils: Utensils, sparkles: Sparkles, users: Users, megaphone: Megaphone,
  "graduation-cap": GraduationCap, "hard-hat": HardHat, layers: Layers,
};

export function CategoryIcon({ name, className }: { name?: string | null; className?: string }) {
  const Icon = ICONS[name ?? ""] ?? Layers;
  return <Icon className={className} aria-hidden />;
}
