"use client";

import { FormInput } from "@/components/shared/forms/FormInput";
import { Package } from "lucide-react";

interface EnvelopeTransferFormProps {
  validationErrors: Record<string, string>;
}

export default function EnvelopeTransferForm({
  validationErrors,
}: EnvelopeTransferFormProps) {
  return (
    <div className="bg-orange-50 p-4 rounded-lg border border-orange-100">
      <h3 className="text-md font-semibold text-orange-800 mb-3 flex items-center">
        <Package size={18} className="mr-2" />
        Envelope Information
      </h3>
      <div className="space-y-4">
        <div>
          <FormInput
            id="envelopeNumber"
            name="envelopeNumber"
            label="Envelope/Box Number (Optional)"
            placeholder="Reference number if available"
          />
          {validationErrors.envelopeNumber && (
            <p className="text-red-600 text-xs mt-1">
              {validationErrors.envelopeNumber}
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <FormInput
              id="senderName"
              name="senderName"
              label="Sender Name"
              required
              placeholder="Name of person sending"
            />
            {validationErrors.senderName && (
              <p className="text-red-600 text-xs mt-1">
                {validationErrors.senderName}
              </p>
            )}
          </div>

          <div>
            <FormInput
              id="recipientName"
              name="recipientName"
              label="Recipient Name"
              required
              placeholder="Name of person receiving"
            />
            {validationErrors.recipientName && (
              <p className="text-red-600 text-xs mt-1">
                {validationErrors.recipientName}
              </p>
            )}
          </div>
        </div>

        <div>
          <label
            htmlFor="contents"
            className="block text-sm font-semibold text-gray-800 mb-1"
          >
            Content
          </label>
          <textarea
            id="contents"
            name="contents"
            rows={3}
            required
            className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-300 bg-white shadow-sm hover:shadow-md placeholder:text-gray-500 text-gray-900"
            placeholder="Describe the contents of the envelope"
          />
          {validationErrors.contents && (
            <p className="text-red-600 text-xs mt-1">
              {validationErrors.contents}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
