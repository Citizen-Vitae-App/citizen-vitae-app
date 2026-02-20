import { format as dateFnsFormat, formatDistance, formatRelative } from 'date-fns';
import { fr, enUS } from 'date-fns/locale';
import i18n from '../config';
import type { SupportedLanguage } from '../config';

/**
 * Get the date-fns locale based on the current i18n language
 */
export const getDateLocale = (): typeof fr | typeof enUS => {
  const lang = i18n.language?.substring(0, 2) as SupportedLanguage;
  return lang === 'en' ? enUS : fr;
};

/**
 * Format a date using the current i18n locale
 * @param date - The date to format
 * @param formatStr - The format string (date-fns format)
 * @param options - Additional options
 */
export const formatDate = (
  date: Date | number | string,
  formatStr: string = 'PPP',
  options?: { locale?: typeof fr | typeof enUS }
): string => {
  const parsedDate = typeof date === 'string' ? new Date(date) : date;
  const locale = options?.locale || getDateLocale();
  return dateFnsFormat(parsedDate, formatStr, { locale });
};

/**
 * Format a date relative to now (e.g., "3 days ago")
 * @param date - The date to format
 * @param baseDate - The base date to compare to (defaults to now)
 */
export const formatDateDistance = (
  date: Date | number | string,
  baseDate: Date = new Date()
): string => {
  const parsedDate = typeof date === 'string' ? new Date(date) : date;
  return formatDistance(parsedDate, baseDate, { 
    locale: getDateLocale(),
    addSuffix: true 
  });
};

/**
 * Format a date relative to today (e.g., "yesterday at 3:00 PM")
 * @param date - The date to format
 * @param baseDate - The base date to compare to (defaults to now)
 */
export const formatDateRelative = (
  date: Date | number | string,
  baseDate: Date = new Date()
): string => {
  const parsedDate = typeof date === 'string' ? new Date(date) : date;
  return formatRelative(parsedDate, baseDate, { locale: getDateLocale() });
};

/**
 * Format a number using the current i18n locale
 * @param value - The number to format
 * @param options - Intl.NumberFormatOptions
 */
export const formatNumber = (
  value: number,
  options?: Intl.NumberFormatOptions
): string => {
  const lang = i18n.language?.substring(0, 2) || 'fr';
  const locale = lang === 'en' ? 'en-US' : 'fr-FR';
  return new Intl.NumberFormat(locale, options).format(value);
};

/**
 * Format currency using the current i18n locale
 * @param value - The number to format
 * @param currency - The currency code (default: EUR)
 */
export const formatCurrency = (
  value: number,
  currency: string = 'EUR'
): string => {
  const lang = i18n.language?.substring(0, 2) || 'fr';
  const locale = lang === 'en' ? 'en-US' : 'fr-FR';
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
  }).format(value);
};

/**
 * Format a percentage using the current i18n locale
 * @param value - The number to format (0-1 for percentages)
 * @param options - Additional options
 */
export const formatPercent = (
  value: number,
  options?: { minimumFractionDigits?: number; maximumFractionDigits?: number }
): string => {
  const lang = i18n.language?.substring(0, 2) || 'fr';
  const locale = lang === 'en' ? 'en-US' : 'fr-FR';
  return new Intl.NumberFormat(locale, {
    style: 'percent',
    minimumFractionDigits: options?.minimumFractionDigits ?? 0,
    maximumFractionDigits: options?.maximumFractionDigits ?? 2,
  }).format(value);
};

/**
 * Get a compact date format string based on language
 * e.g., "29 janv." for French, "Jan 29" for English
 */
export const getCompactDateFormat = (): string => {
  const lang = i18n.language?.substring(0, 2) as SupportedLanguage;
  return lang === 'en' ? 'MMM d' : 'd MMM';
};

/**
 * Format a date in compact format (e.g., "29 janv." or "Jan 29")
 */
export const formatDateCompact = (date: Date | string): string => {
  const parsedDate = typeof date === 'string' ? new Date(date) : date;
  return formatDate(parsedDate, getCompactDateFormat());
};
