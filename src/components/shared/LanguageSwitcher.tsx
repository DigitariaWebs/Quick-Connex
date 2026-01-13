"use client";

import { useTranslations, useLocale } from "next-intl";
import { useTransition } from "react";
import { setUserLocale } from "@/lib/locale";

export function LanguageSwitcher() {
  const t = useTranslations("languageSwitcher");
  const locale = useLocale();
  const [isPending, startTransition] = useTransition();

  const handleLocaleChange = (newLocale: string) => {
    startTransition(async () => {
      await setUserLocale(newLocale);
      // Refresh the page to apply the new locale
      window.location.reload();
    });
  };

  return (
    <div className="relative inline-block">
      <select
        value={locale}
        onChange={(e) => handleLocaleChange(e.target.value)}
        disabled={isPending}
        className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
        aria-label={t("changeLanguage")}
      >
        <option value="en">{t("english")}</option>
        <option value="fr">{t("french")}</option>
      </select>
    </div>
  );
}
