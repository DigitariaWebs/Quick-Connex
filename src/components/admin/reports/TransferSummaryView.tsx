"use client";

import { TransferSummaryReportData } from "@/types/reports/report.types";
import {
  ArrowRightLeft,
  CheckCircle,
  Clock,
  XCircle,
  AlertCircle,
  Package,
  User,
  Stethoscope,
} from "lucide-react";

interface TransferSummaryViewProps {
  data: TransferSummaryReportData;
}

export default function TransferSummaryView({
  data,
}: TransferSummaryViewProps) {
  return (
    <div className="space-y-6">
      {/* Statistics */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <ArrowRightLeft className="w-5 h-5 mr-2 text-purple-600" />
          Statistics
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-purple-50 rounded-xl p-4">
            <p className="text-sm text-gray-600 mb-1">Total Transfers</p>
            <p className="text-2xl font-bold text-purple-600">
              {data.statistics.total}
            </p>
          </div>
          <div className="bg-green-50 rounded-xl p-4">
            <p className="text-sm text-gray-600 mb-1">Completed</p>
            <p className="text-2xl font-bold text-green-600">
              {data.statistics.byStatus.completed}
            </p>
          </div>
          <div className="bg-amber-50 rounded-xl p-4">
            <p className="text-sm text-gray-600 mb-1">Pending</p>
            <p className="text-2xl font-bold text-amber-600">
              {data.statistics.byStatus.pending}
            </p>
          </div>
          <div className="bg-red-50 rounded-xl p-4">
            <p className="text-sm text-gray-600 mb-1">Cancelled</p>
            <p className="text-2xl font-bold text-red-600">
              {data.statistics.byStatus.cancelled}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div>
            <p className="text-sm font-semibold text-gray-700 mb-2">
              By Status
            </p>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Accepted</span>
                <span className="font-semibold">
                  {data.statistics.byStatus.accepted}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">In Progress</span>
                <span className="font-semibold">
                  {data.statistics.byStatus.in_progress}
                </span>
              </div>
            </div>
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-700 mb-2">
              By Priority
            </p>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Low</span>
                <span className="font-semibold">
                  {data.statistics.byPriority.low}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Urgent</span>
                <span className="font-semibold">
                  {data.statistics.byPriority.urgent}
                </span>
              </div>
            </div>
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-700 mb-2">
              By Category
            </p>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Patient</span>
                <span className="font-semibold">
                  {data.statistics.byCategory.patient}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Envelope</span>
                <span className="font-semibold">
                  {data.statistics.byCategory.envelope}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Medical Instruments</span>
                <span className="font-semibold">
                  {data.statistics.byCategory.medical_instruments}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Transfers List */}
      {data.transfers.length > 0 && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            All Transfers ({data.transfers.length})
          </h3>
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {data.transfers.map((transfer) => (
              <div
                key={transfer.transferId}
                className="border border-gray-200 rounded-xl p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-base font-semibold text-gray-900">
                      {transfer.transferId}
                    </p>
                    <p className="text-sm text-gray-600 capitalize">
                      {transfer.transferCategory} • {transfer.status} •{" "}
                      {transfer.priority}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500">
                      {new Date(transfer.requestedDate).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">From → To</p>
                    <p className="text-sm font-medium text-gray-900">
                      {transfer.fromHospital.name} → {transfer.toHospital.name}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Requested By</p>
                    <p className="text-sm font-medium text-gray-900">
                      {transfer.requestedBy.firstName}{" "}
                      {transfer.requestedBy.lastName}
                    </p>
                    <p className="text-xs text-gray-500">
                      {transfer.requestedBy.email}
                    </p>
                  </div>
                  {transfer.assignedTo && (
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Assigned To</p>
                      <p className="text-sm font-medium text-gray-900">
                        {transfer.assignedTo.firstName}{" "}
                        {transfer.assignedTo.lastName}
                      </p>
                      <p className="text-xs text-gray-500">
                        {transfer.assignedTo.email}
                      </p>
                    </div>
                  )}
                  {transfer.patientInfo && (
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Patient</p>
                      <p className="text-sm font-medium text-gray-900">
                        {transfer.patientInfo.firstName}{" "}
                        {transfer.patientInfo.lastName}
                      </p>
                      <p className="text-xs text-gray-500">
                        Age: {transfer.patientInfo.age}
                      </p>
                    </div>
                  )}
                  {transfer.envelopeInfo && (
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Envelope</p>
                      <p className="text-sm font-medium text-gray-900">
                        {transfer.envelopeInfo.senderName} →{" "}
                        {transfer.envelopeInfo.recipientName}
                      </p>
                    </div>
                  )}
                </div>

                {transfer.completedDate && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <p className="text-xs text-gray-500">
                      Completed:{" "}
                      {new Date(transfer.completedDate).toLocaleString()}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {data.transfers.length === 0 && (
        <div className="bg-white rounded-2xl p-12 shadow-sm border border-gray-100 text-center">
          <ArrowRightLeft className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">
            No transfers found in the selected period
          </p>
        </div>
      )}
    </div>
  );
}
