// Locale-aware number formatting.
// Maps our app language codes to BCP-47 tags Intl understands, then uses
// Intl.NumberFormat. Falls back to the raw number on environments where
// Intl is unavailable (older Hermes builds without ICU).

const LOCALE_MAP = {
  en:      'en-US',
  es:      'es-ES',
  'pt-BR': 'pt-BR',
  fil:     'fil-PH',
  hi:      'hi-IN',
  id:      'id-ID',
};

const cache = new Map();

const getFormatter = (lang) => {
  if (cache.has(lang)) return cache.get(lang);
  const tag = LOCALE_MAP[lang] ?? 'en-US';
  let fmt;
  try {
    fmt = new Intl.NumberFormat(tag);
  } catch {
    fmt = { format: (n) => String(n) };
  }
  cache.set(lang, fmt);
  return fmt;
};

// Integer with grouping (e.g. 1,234 in en, 1.234 in pt-BR, 1,234 in fil/id).
export const formatInt = (n, lang) => {
  if (n == null || Number.isNaN(n)) return '';
  return getFormatter(lang).format(n);
};

// Decimal — uses locale's decimal separator (comma in pt-BR/es, dot in en/fil).
// `digits` = max fractional digits to show.
export const formatDecimal = (n, lang, digits = 2) => {
  if (n == null || Number.isNaN(n)) return '';
  const tag = LOCALE_MAP[lang] ?? 'en-US';
  try {
    return new Intl.NumberFormat(tag, {
      maximumFractionDigits: digits,
      minimumFractionDigits: 0,
    }).format(n);
  } catch {
    return String(n);
  }
};
