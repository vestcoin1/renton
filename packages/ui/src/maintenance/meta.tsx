import {
  AirVent,
  Bug,
  Droplets,
  Fuel,
  House,
  KeyRound,
  Refrigerator,
  Wrench,
  Zap,
  type LucideIcon,
} from "lucide-react";
import type { MaintenanceCategory, MaintenanceStatus, MaintenanceUrgency } from "renton-shared/types";
import type { BadgeProps } from "../ui/badge";

type Variant = NonNullable<BadgeProps["variant"]>;

export const MAINTENANCE_STATUS: Record<MaintenanceStatus, { label: string; tenantLabel: string; variant: Variant }> = {
  submitted: { label: "New", tenantLabel: "Submitted", variant: "info" },
  investigating: { label: "Investigating", tenantLabel: "Under investigation", variant: "violet" },
  awaiting_approval: { label: "Awaiting landlord", tenantLabel: "Awaiting landlord approval", variant: "warning" },
  approved: { label: "Approved Â· dispatch", tenantLabel: "Approved, assigning technician", variant: "success" },
  declined: { label: "Declined", tenantLabel: "Declined by landlord", variant: "destructive" },
  in_progress: { label: "Technician dispatched", tenantLabel: "Technician on the way", variant: "info" },
  completed: { label: "Completed", tenantLabel: "Fixed", variant: "success" },
};

export const URGENCY: Record<MaintenanceUrgency, { label: string; hint: string; variant: Variant; dot: string }> = {
  low: { label: "Low", hint: "Cosmetic or can wait a few weeks", variant: "neutral", dot: "bg-slate-400" },
  medium: { label: "Medium", hint: "Inconvenient, fix within a week", variant: "info", dot: "bg-primary" },
  high: { label: "High", hint: "Affects daily living, fix in 48h", variant: "warning", dot: "bg-amber-500" },
  emergency: { label: "Emergency", hint: "Safety risk or major damage", variant: "destructive", dot: "bg-destructive" },
};

export const CATEGORIES: { value: MaintenanceCategory; icon: LucideIcon }[] = [
  { value: "Plumbing", icon: Droplets },
  { value: "Electrical", icon: Zap },
  { value: "Power / Generator", icon: Fuel },
  { value: "Air Conditioning", icon: AirVent },
  { value: "Roof / Leak", icon: House },
  { value: "Doors & Security", icon: KeyRound },
  { value: "Appliances", icon: Refrigerator },
  { value: "Pest Control", icon: Bug },
  { value: "Other", icon: Wrench },
];

export const categoryIcon = (c: MaintenanceCategory) => CATEGORIES.find((x) => x.value === c)?.icon ?? Wrench;

/** Requests where someone still has to act. */
export const OPEN_STATUSES: MaintenanceStatus[] = ["submitted", "investigating", "awaiting_approval", "approved", "in_progress"];


