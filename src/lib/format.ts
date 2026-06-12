import { APP_CURRENCY, APP_LOCALE } from "@/lib/config";

export function formatCurrency(value: number, currency: string = APP_CURRENCY) {
  return new Intl.NumberFormat(APP_LOCALE, {
    style: "currency",
    currency,
  }).format(value);
}

export function formatNumber(value: number) {
  return new Intl.NumberFormat(APP_LOCALE).format(value);
}

export function formatDate(date: Date | string | null | undefined) {
  if (!date) return "—";
  return new Intl.DateTimeFormat(APP_LOCALE, { dateStyle: "medium" }).format(
    new Date(date),
  );
}
