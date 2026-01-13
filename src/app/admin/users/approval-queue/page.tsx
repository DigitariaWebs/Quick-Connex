"use client";

import { useTranslations } from "next-intl";

/**
 * User Approval Queue
 *
 * Manage pending user registrations:
 * - Pending approval list
 * - Document verification
 * - Bulk approval/rejection
 * - Priority sorting
 * - Assignment to reviewers
 */

export default function ApprovalQueue() {
  const t = useTranslations("adminApprovalQueue");

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {t("title")}
          </h1>
          <p className="text-gray-600">{t("loading")}</p>
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
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <p className="text-gray-500 text-sm">{t("noApprovals")}</p>
            <p className="text-gray-400 text-xs mt-2">
              TODO: Implement approval queue
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
