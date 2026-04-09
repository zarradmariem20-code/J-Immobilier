import type { Visit } from "../../lib/database.types";

export type VisitStatus = "new" | "scheduled" | "completed" | "rejected";

export interface VisitWithProperty extends Visit {
  propertyAddress?: string;
}

export const VISIT_STATUS_LABELS: Record<VisitStatus, string> = {
  new: "Nouvelle demande",
  scheduled: "Programmée",
  completed: "Complétée",
  rejected: "Annulée",
};

export const VISIT_STATUS_COLORS: Record<VisitStatus, string> = {
  new: "bg-amber-100 text-amber-700 border-amber-300",
  scheduled: "bg-blue-100 text-blue-700 border-blue-300",
  completed: "bg-emerald-100 text-emerald-700 border-emerald-300",
  rejected: "bg-rose-100 text-rose-700 border-rose-300",
};

export const VISIT_STATUS_BADGE_COLORS: Record<VisitStatus, string> = {
  new: "bg-amber-50 text-amber-700",
  scheduled: "bg-blue-50 text-blue-700",
  completed: "bg-emerald-50 text-emerald-700",
  rejected: "bg-rose-50 text-rose-700",
};

export function formatVisitDate(date: string | null | undefined): string {
  if (!date) return "-";
  try {
    return new Intl.DateTimeFormat("fr-FR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(new Date(date));
  } catch {
    return date;
  }
}

export function formatVisitDateTime(date: string | null | undefined, time: string | null | undefined): string {
  if (!date) return "-";
  const dateStr = formatVisitDate(date);
  if (time) {
    return `${dateStr} à ${time}`;
  }
  return dateStr;
}

export function isVisitOverdue(scheduledDate: string | null | undefined): boolean {
  if (!scheduledDate) return false;
  const scheduled = new Date(scheduledDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return scheduled < today;
}

export function getVisitStatusIcon(status: VisitStatus): string {
  switch (status) {
    case "new":
      return "⏳";
    case "scheduled":
      return "📅";
    case "completed":
      return "✅";
    case "rejected":
      return "❌";
    default:
      return "";
  }
}
