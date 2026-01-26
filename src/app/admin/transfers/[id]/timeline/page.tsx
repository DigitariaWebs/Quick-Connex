"use client";

/**
 * Transfer Timeline - Detailed View
 *
 * Detailed timeline visualization for a specific transfer:
 * - All timeline events
 * - System events
 * - User actions
 * - Status changes
 * - Communication history
 */

import { use } from "react";
import { useTranslations } from "next-intl";

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export default function TransferTimeline({ params }: PageProps) {
  const { id } = use(params);
  const t = useTranslations("adminTransfers");

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            {t("transferTimeline")}
          </h1>
          <p className="text-gray-600 mt-2">{t("transferTimelineDesc")}</p>
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
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <p className="text-gray-500 text-sm">
              {t("transferTimeline")}: {id}
            </p>
            <p className="text-gray-400 text-xs mt-2">
              TODO: {t("allTimelineEvents")}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
