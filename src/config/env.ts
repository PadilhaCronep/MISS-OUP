const optional = (key: string, fallback: string): string => {
  const source = import.meta.env as Record<string, string | undefined>;
  return source[key] ?? fallback;
};

export const env = {
  API_URL: optional('VITE_API_URL', ''),
  NODE_ENV: optional('MODE', 'development'),
  IS_DEV: optional('MODE', 'development') === 'development',
  IS_PROD: optional('MODE', 'development') === 'production',
} as const;
