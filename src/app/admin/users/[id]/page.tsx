"use client";

/**
 * User Details - Admin View
 *
 * Detailed user profile with admin capabilities:
 * - Complete user information
 * - Activity history
 * - Performance metrics
 * - Document verification
 * - Admin actions
 */

import { use } from "react";
import { useTranslations } from "next-intl";

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export default function UserDetails({ params }: PageProps) {
  const { id } = use(params);
  const t = useTranslations("adminUsers");

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            {t("userDetails")}
          </h1>
          <p className="text-gray-600 mt-2">{t("userDetailsDesc")}</p>
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
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
            </div>
            <p className="text-gray-500 text-sm">
              {t("userDetails")}: {id}
            </p>
            <p className="text-gray-400 text-xs mt-2">
              TODO: {t("completeUserInfo")}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
