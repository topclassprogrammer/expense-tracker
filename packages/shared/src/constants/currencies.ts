/** Поддерживаемые валюты (ISO 4217). */
export const CURRENCIES = ['RUB', 'USD', 'EUR', 'GBP', 'KZT', 'BYN', 'UAH'] as const;

export type Currency = (typeof CURRENCIES)[number];

export const DEFAULT_CURRENCY: Currency = 'RUB';

/** Локали для Intl.NumberFormat по умолчанию. */
export const CURRENCY_LOCALES: Record<Currency, string> = {
  RUB: 'ru-RU',
  USD: 'en-US',
  EUR: 'de-DE',
  GBP: 'en-GB',
  KZT: 'kk-KZ',
  BYN: 'be-BY',
  UAH: 'uk-UA',
};
