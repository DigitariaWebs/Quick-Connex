"use client";

import { TransferReportData } from "@/types/reports/report.types";
import {
  ArrowRightLeft,
  User,
  MapPin,
  Clock,
  FileText,
  Calendar,
} from "lucide-react";

interface TransferReportViewProps {
  data: TransferReportData;
}

export default function TransferReportView({ data }: TransferReportViewProps) {
  return (
    <div className="space-y-6">
      {/* Transfer Information */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <ArrowRightLeft className="w-5 h-5 mr-2 text-purple-600" />
          Transfer Information
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div>
            <p className="text-sm text-gray-600 mb-1">Transfer ID</p>
            <p className="text-base font-semibold text-gray-900">
              {data.transferId}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600 mb-1">Category</p>
            <p className="text-base font-semibold text-gray-900 capitalize">
              {data.transferCategory}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600 mb-1">Status</p>
            <p className="text-base font-semibold text-gray-900 capitalize">
              {data.status}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600 mb-1">Priority</p>
            <p className="text-base font-semibold text-gray-900 capitalize">
              {data.priority}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600 mb-1">Requested Date</p>
            <p className="text-base font-semibold text-gray-900">
              {new Date(data.requestedDate).toLocaleString()}
            </p>
          </div>
          {data.completedDate && (
            <div>
              <p className="text-sm text-gray-600 mb-1">Completed Date</p>
              <p className="text-base font-semibold text-gray-900">
                {new Date(data.completedDate).toLocaleString()}
              </p>
            </div>
          )}
        </div>
        <div className="mt-4">
          <p className="text-sm text-gray-600 mb-1">Reason</p>
          <p className="text-base text-gray-900">{data.reason}</p>
        </div>
        {data.notes && (
          <div className="mt-4">
            <p className="text-sm text-gray-600 mb-1">Notes</p>
            <p className="text-base text-gray-900">{data.notes}</p>
          </div>
        )}
      </div>

      {/* Category-specific Information */}
      {data.patientInfo && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <User className="w-5 h-5 mr-2 text-blue-600" />
            Patient Information
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-600 mb-1">Name</p>
              <p className="text-base font-semibold text-gray-900">
                {data.patientInfo.firstName} {data.patientInfo.lastName}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Age</p>
              <p className="text-base font-semibold text-gray-900">
                {data.patientInfo.age}
              </p>
            </div>
            {data.patientInfo.dossierNumber && (
              <div>
                <p className="text-sm text-gray-600 mb-1">Dossier Number</p>
                <p className="text-base font-semibold text-gray-900">
                  {data.patientInfo.dossierNumber}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {data.envelopeInfo && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <FileText className="w-5 h-5 mr-2 text-orange-600" />
            Envelope Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600 mb-1">Sender</p>
              <p className="text-base font-semibold text-gray-900">
                {data.envelopeInfo.senderName}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Recipient</p>
              <p className="text-base font-semibold text-gray-900">
                {data.envelopeInfo.recipientName}
              </p>
            </div>
            <div className="md:col-span-2">
              <p className="text-sm text-gray-600 mb-1">Contents</p>
              <p className="text-base text-gray-900">
                {data.envelopeInfo.contents}
              </p>
            </div>
            {data.envelopeInfo.envelopeNumber && (
              <div>
                <p className="text-sm text-gray-600 mb-1">Envelope Number</p>
                <p className="text-base font-semibold text-gray-900">
                  {data.envelopeInfo.envelopeNumber}
                </p>
              </div>
            )}
            {data.envelopeInfo.weight && (
              <div>
                <p className="text-sm text-gray-600 mb-1">Weight</p>
                <p className="text-base font-semibold text-gray-900">
                  {data.envelopeInfo.weight} kg
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {data.equipmentInfo && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Equipment Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600 mb-1">Equipment Name</p>
              <p className="text-base font-semibold text-gray-900">
                {data.equipmentInfo.equipmentName}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Model</p>
              <p className="text-base font-semibold text-gray-900">
                {data.equipmentInfo.model}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Condition</p>
              <p className="text-base font-semibold text-gray-900 capitalize">
                {data.equipmentInfo.condition}
              </p>
            </div>
            {data.equipmentInfo.serialNumber && (
              <div>
                <p className="text-sm text-gray-600 mb-1">Serial Number</p>
                <p className="text-base font-semibold text-gray-900">
                  {data.equipmentInfo.serialNumber}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Hospital Information */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <MapPin className="w-5 h-5 mr-2 text-green-600" />
          Hospital Information
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <p className="text-sm font-semibold text-gray-700 mb-2">
              From Hospital
            </p>
            <p className="text-base font-bold text-gray-900">
              {data.fromHospital.name}
            </p>
            {data.fromHospital.address && (
              <p className="text-sm text-gray-600 mt-1">
                {data.fromHospital.address}
              </p>
            )}
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-700 mb-2">
              To Hospital
            </p>
            <p className="text-base font-bold text-gray-900">
              {data.toHospital.name}
            </p>
            {data.toHospital.address && (
              <p className="text-sm text-gray-600 mt-1">
                {data.toHospital.address}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Involved People */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <User className="w-5 h-5 mr-2 text-indigo-600" />
          Involved People
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <p className="text-sm font-semibold text-gray-700 mb-2">
              Requested By
            </p>
            <p className="text-base font-bold text-gray-900">
              {data.requestedBy.firstName} {data.requestedBy.lastName}
            </p>
            <p className="text-sm text-gray-600 mt-1">
              {data.requestedBy.email}
            </p>
            {data.requestedBy.phone && (
              <p className="text-sm text-gray-600">{data.requestedBy.phone}</p>
            )}
            <p className="text-xs text-gray-500 mt-1 capitalize">
              {data.requestedBy.userType}
            </p>
          </div>
          {data.assignedTo && (
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-2">
                Assigned To
              </p>
              <p className="text-base font-bold text-gray-900">
                {data.assignedTo.firstName} {data.assignedTo.lastName}
              </p>
              <p className="text-sm text-gray-600 mt-1">
                {data.assignedTo.email}
              </p>
              {data.assignedTo.phone && (
                <p className="text-sm text-gray-600">{data.assignedTo.phone}</p>
              )}
              <p className="text-xs text-gray-500 mt-1 capitalize">
                {data.assignedTo.userType}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Timeline */}
      {data.timeline.length > 0 && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Clock className="w-5 h-5 mr-2 text-amber-600" />
            Transfer Timeline
          </h3>
          <div className="space-y-4">
            {data.timeline.map((event) => (
              <div
                key={event.id}
                className="border-l-4 border-purple-500 pl-4 py-2"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-900">
                      {event.action}
                    </p>
                    <p className="text-sm text-gray-600 mt-1">
                      {event.description}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      by {event.actor.name} ({event.actor.userType})
                    </p>
                  </div>
                  <p className="text-xs text-gray-500 ml-4">
                    {new Date(event.timestamp).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
