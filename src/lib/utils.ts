import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const STATUS_CONFIG = {
  unedited:   { label: 'Unedited',    color: 'bg-slate-700 text-slate-300' },
  needs_edit: { label: 'Needs Edit',  color: 'bg-yellow-900 text-yellow-300' },
  edited:     { label: 'Edited',      color: 'bg-blue-900 text-blue-300' },
  posted:     { label: 'Posted',      color: 'bg-purple-900 text-purple-300' },
  portfolio:  { label: 'Portfolio',   color: 'bg-emerald-900 text-emerald-300' },
} as const;

/** Returns today's date as YYYY-MM-DD in the device's local timezone. */
export function localDateStr(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export const COMMON_TAGS = [
  'urban', 'mountain', 'coastal', 'desert', 'forest',
  'industrial', 'rooftop', 'tunnel', 'bridge', 'runway',
  'garage', 'track', 'scenic', 'night', 'golden-hour',
];
