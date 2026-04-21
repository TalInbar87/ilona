import { differenceInYears, format, parseISO } from "date-fns";
import { he } from "date-fns/locale";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function calcAge(dateOfBirth: string): number {
  return differenceInYears(new Date(), parseISO(dateOfBirth));
}

export function formatDate(date: string | Date, fmt = "dd/MM/yyyy"): string {
  const d = typeof date === "string" ? parseISO(date) : date;
  return format(d, fmt, { locale: he });
}

export function formatDateTime(date: string | Date): string {
  const d = typeof date === "string" ? parseISO(date) : date;
  return format(d, "dd/MM/yyyy HH:mm", { locale: he });
}

/** Validates Israeli ID (teudat zehut) using the Luhn-based checksum */
export function validateIsraeliId(id: string): boolean {
  const cleaned = id.replace(/\D/g, "");
  if (cleaned.length !== 9) return false;

  let sum = 0;
  for (let i = 0; i < 9; i++) {
    let digit = parseInt(cleaned[i], 10) * ((i % 2) + 1);
    if (digit > 9) digit -= 9;
    sum += digit;
  }
  return sum % 10 === 0;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function getFileIcon(mimeType: string): "pdf" | "image" | "file" {
  if (mimeType === "application/pdf") return "pdf";
  if (mimeType.startsWith("image/")) return "image";
  return "file";
}
