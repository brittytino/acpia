/**
 * Utility functions for formatting and data manipulation.
 */

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

export function formatDate(dateString: string): string {
  if (!dateString) return "—";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function formatDateShort(dateString: string): string {
  if (!dateString) return "—";
  const date = new Date(dateString);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
  }).format(date);
}

export function truncateHash(hash: string, chars = 12): string {
  return `${hash.substring(0, chars)}…`;
}

export function getRiskColor(score: number): string {
  if (score >= 90) return "#dc2626";
  if (score >= 70) return "#ea580c";
  if (score >= 40) return "#ca8a04";
  return "#16a34a";
}

export function getRiskLabel(score: number): string {
  if (score >= 90) return "Critical";
  if (score >= 70) return "High";
  if (score >= 40) return "Medium";
  return "Low";
}

export function classNames(...classes: (string | boolean | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}
