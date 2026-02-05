"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { NextIntlClientProvider } from "next-intl";
import { LOCALES, isValidLocale, type Locale } from "@/i18n/locales";
import { fetchWithRetry } from "@/lib/safe-fetch";

type Messages = Record<string, unknown>;

type LocaleOverrideContextValue = {
  effectiveLocale: Locale;
  setLocaleOverride: (locale: Locale, organizationId?: string) => void;
};

const LocaleOverrideContext = createContext<LocaleOverrideContextValue | null>(
  null,
);

export function useLocaleOverride() {
  const ctx = useContext(LocaleOverrideContext);
  return ctx;
}

function serverLocaleToLocale(serverLocale: string): Locale {
  return isValidLocale(serverLocale) ? serverLocale : "en";
}

export function LocaleOverrideProvider({
  serverLocale,
  serverMessages,
  children,
}: {
  serverLocale: string;
  serverMessages: Messages;
  children: ReactNode;
}) {
  const [override, setOverride] = useState<{
    locale: Locale;
    messages: Messages;
  } | null>(null);
  const [cache, setCache] = useState<Partial<Record<Locale, Messages>>>({});

  const effectiveLocale: Locale = override?.locale ?? serverLocaleToLocale(serverLocale);

  const fetchMessages = useCallback(async (locale: Locale): Promise<Messages> => {
    const cached = cache[locale];
    if (cached) return cached;
    const res = await fetchWithRetry(`/api/messages/${locale}`);
    if (!res.ok) throw new Error("Failed to load messages");
    const messages = (await res.json()) as Messages;
    setCache((prev) => ({ ...prev, [locale]: messages }));
    return messages;
  }, [cache]);

  const setLocaleOverride = useCallback(
    async (locale: Locale, organizationId?: string) => {
      if (!isValidLocale(locale)) return;
      const messages = await fetchMessages(locale);
      setOverride({ locale, messages });

      if (organizationId) {
        fetchWithRetry("/api/profile", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ organizationId, locale }),
        }).catch(() => {
          // UI already updated; persist failed, will retry on next change or load
        });
      }
    },
    [fetchMessages],
  );

  const value = useMemo(
    () => ({ effectiveLocale, setLocaleOverride }),
    [effectiveLocale, setLocaleOverride],
  );

  useEffect(() => {
    const initial: Locale = serverLocaleToLocale(serverLocale);
    setCache((prev) => ({ ...prev, [initial]: serverMessages }));

    void Promise.all(
      LOCALES.filter((l) => l !== initial).map(async (locale) => {
        const res = await fetchWithRetry(`/api/messages/${locale}`);
        if (res.ok) {
          const messages = (await res.json()) as Messages;
          setCache((prev) => ({ ...prev, [locale]: messages }));
        }
      }),
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps -- seed once on mount
  }, []);

  return (
    <LocaleOverrideContext.Provider value={value}>
      {override ? (
        <NextIntlClientProvider
          locale={override.locale}
          messages={override.messages}
        >
          {children}
        </NextIntlClientProvider>
      ) : (
        children
      )}
    </LocaleOverrideContext.Provider>
  );
}
