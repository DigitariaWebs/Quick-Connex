"use client";

import { FormInput } from "./FormInput";
import { SelectInput } from "./SelectInput";
import { FileText, AlertTriangle } from "lucide-react";

interface FileTransferFormProps {
  validationErrors: Record<string, string>;
}

export default function FileTransferForm({
  validationErrors,
}: FileTransferFormProps) {
  return (
    <div className="bg-purple-50 p-4 rounded-lg border border-purple-100">
      <h3 className="text-md font-semibold text-purple-800 mb-3 flex items-center">
        <FileText size={18} className="mr-2" />
        Patient File Information
      </h3>
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <FormInput
              id="patientName"
              name="patientName"
              label="Patient Name"
              required
              placeholder="Full patient name"
            />
            {validationErrors.patientName && (
              <p className="text-red-600 text-xs mt-1">
                {validationErrors.patientName}
              </p>
            )}
          </div>

          <div>
            <FormInput
              id="dossierNumber"
              name="dossierNumber"
              label="Dossier Number"
              required
              placeholder="Patient's dossier number"
            />
            {validationErrors.dossierNumber && (
              <p className="text-red-600 text-xs mt-1">
                {validationErrors.dossierNumber}
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <FormInput
              id="fileType"
              name="fileType"
              label="File Type"
              required
              placeholder="e.g., Medical records, X-rays, Lab results"
            />
            {validationErrors.fileType && (
              <p className="text-red-600 text-xs mt-1">
                {validationErrors.fileType}
              </p>
            )}
          </div>

          <div>
            <FormInput
              id="fileCount"
              name="fileCount"
              label="Number of Files"
              type="number"
              required
              min="1"
              placeholder="Number of files to transfer"
            />
            {validationErrors.fileCount && (
              <p className="text-red-600 text-xs mt-1">
                {validationErrors.fileCount}
              </p>
            )}
          </div>
        </div>

        <div>
          <SelectInput
            id="fileUrgency"
            name="fileUrgency"
            label="File Urgency"
            required
            variant="priority"
            options={[
              { value: "low", label: "Low - Standard processing" },
              { value: "medium", label: "Medium - Normal priority" },
              { value: "high", label: "High - Urgent processing" },
              { value: "urgent", label: "Urgent - Immediate attention" },
            ]}
          />
          {validationErrors.fileUrgency && (
            <p className="text-red-600 text-xs mt-1">
              {validationErrors.fileUrgency}
            </p>
          )}
        </div>

        <div className="bg-purple-100 p-3 rounded-lg border border-purple-200">
          <div className="flex items-start space-x-2">
            <AlertTriangle
              size={16}
              className="text-purple-600 mt-0.5 flex-shrink-0"
            />
            <div className="text-sm text-purple-800">
              <p className="font-medium">Important:</p>
              <p>
                Ensure all patient files are properly secured and contain no
                sensitive information that could compromise patient privacy.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
