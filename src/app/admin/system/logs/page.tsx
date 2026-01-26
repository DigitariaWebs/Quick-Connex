"use client";

import { useTranslations } from "next-intl";

/**
 * System Logs
 *
 * View and analyze system logs:
 * - Application logs
 * - Server logs
 * - Security logs
 * - Log filtering
 * - Export logs
 */

export default function SystemLogs() {
  const t = useTranslations("adminSystem");

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            {t("systemLogsTitle")}
          </h1>
          <p className="text-gray-600 mt-2">{t("systemLogsDesc")}</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <svg
                className="mx-auto h-12 w-12"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <p className="text-gray-500 text-sm">{t("noLogs")}</p>
            <p className="text-gray-400 text-xs mt-2">
              TODO: {t("applicationLogs")}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
