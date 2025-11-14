"use client";

import { UserReportData } from "@/types/reports/report.types";
import {
  Users,
  CheckCircle,
  Clock,
  XCircle,
  Shield,
  UserCheck,
  Activity,
} from "lucide-react";

interface UserReportViewProps {
  data: UserReportData;
}

export default function UserReportView({ data }: UserReportViewProps) {
  return (
    <div className="space-y-6">
      {/* Status Breakdown */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Users className="w-5 h-5 mr-2 text-blue-600" />
          User Status Breakdown
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-blue-50 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Total</span>
              <Users className="w-4 h-4 text-blue-600" />
            </div>
            <p className="text-2xl font-bold text-blue-600">
              {data.statusBreakdown.total}
            </p>
          </div>
          <div className="bg-green-50 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Approved</span>
              <CheckCircle className="w-4 h-4 text-green-600" />
            </div>
            <p className="text-2xl font-bold text-green-600">
              {data.statusBreakdown.approved}
            </p>
          </div>
          <div className="bg-amber-50 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Pending</span>
              <Clock className="w-4 h-4 text-amber-600" />
            </div>
            <p className="text-2xl font-bold text-amber-600">
              {data.statusBreakdown.pending}
            </p>
          </div>
          <div className="bg-red-50 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Suspended</span>
              <Shield className="w-4 h-4 text-red-600" />
            </div>
            <p className="text-2xl font-bold text-red-600">
              {data.statusBreakdown.suspended}
            </p>
          </div>
          <div className="bg-gray-50 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Rejected</span>
              <XCircle className="w-4 h-4 text-gray-600" />
            </div>
            <p className="text-2xl font-bold text-gray-600">
              {data.statusBreakdown.rejected}
            </p>
          </div>
        </div>
      </div>

      {/* Role Breakdown */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <UserCheck className="w-5 h-5 mr-2 text-purple-600" />
          Users by Role
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-purple-50 rounded-xl p-4">
            <p className="text-sm text-gray-600 mb-1">Employees</p>
            <p className="text-2xl font-bold text-purple-600">
              {data.roleBreakdown.employee}
            </p>
          </div>
          <div className="bg-indigo-50 rounded-xl p-4">
            <p className="text-sm text-gray-600 mb-1">Managers</p>
            <p className="text-2xl font-bold text-indigo-600">
              {data.roleBreakdown.manager}
            </p>
          </div>
          <div className="bg-pink-50 rounded-xl p-4">
            <p className="text-sm text-gray-600 mb-1">Admins</p>
            <p className="text-2xl font-bold text-pink-600">
              {data.roleBreakdown.admin}
            </p>
          </div>
          <div className="bg-teal-50 rounded-xl p-4">
            <p className="text-sm text-gray-600 mb-1">Super Admins</p>
            <p className="text-2xl font-bold text-teal-600">
              {data.roleBreakdown.super_admin}
            </p>
          </div>
        </div>
      </div>

      {/* New Users */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          New Users in Period
        </h3>
        <p className="text-3xl font-bold text-gray-900">
          {data.newUsersInPeriod}
        </p>
        <p className="text-sm text-gray-500 mt-2">
          Users registered between{" "}
          {new Date(data.period.start).toLocaleDateString()} and{" "}
          {new Date(data.period.end).toLocaleDateString()}
        </p>
      </div>

      {/* Activity Summary */}
      {data.activitySummary.length > 0 && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Activity className="w-5 h-5 mr-2 text-orange-600" />
            User Activity Summary
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                    User
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                    Action
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                    Description
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.activitySummary.map((activity) => (
                  <tr
                    key={activity.userId + activity.timestamp}
                    className="border-b border-gray-100 hover:bg-gray-50"
                  >
                    <td className="py-3 px-4">
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {activity.userName}
                        </p>
                        <p className="text-xs text-gray-500">
                          {activity.userEmail}
                        </p>
                        <p className="text-xs text-gray-400">
                          {activity.userType}
                        </p>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-sm text-gray-700">
                        {activity.action}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-sm text-gray-600">
                        {activity.description}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-sm text-gray-500">
                        {new Date(activity.timestamp).toLocaleString()}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
