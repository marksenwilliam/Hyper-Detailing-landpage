import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** 2150 → "2 150" (Swedish thousands separator: a space, never a dot). */
export const formatSek = (n: number) => new Intl.NumberFormat("sv-SE").format(n);

/** 2150 → "2 150 kr" */
export const formatKr = (n: number) => `${formatSek(n)} kr`;
