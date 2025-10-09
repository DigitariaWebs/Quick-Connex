"use client";

import { FormInput } from "./FormInput";
import { Package, Ruler, Weight } from "lucide-react";
import { useState } from "react";

interface EnvelopeTransferFormProps {
  validationErrors: Record<string, string>;
}

export default function EnvelopeTransferForm({
  validationErrors,
}: EnvelopeTransferFormProps) {
  const [measurementUnit, setMeasurementUnit] = useState<"cm" | "inch">("cm");
  const [weightUnit, setWeightUnit] = useState<"kg" | "pound">("kg");

  // Conversion functions
  const convertToCm = (value: number, unit: "cm" | "inch"): number => {
    return unit === "inch" ? value * 2.54 : value;
  };

  const convertToKg = (value: number, unit: "kg" | "pound"): number => {
    return unit === "pound" ? value * 0.453592 : value;
  };
  return (
    <div className="bg-orange-50 p-4 rounded-lg border border-orange-100">
      <h3 className="text-md font-semibold text-orange-800 mb-3 flex items-center">
        <Package size={18} className="mr-2" />
        Envelope/Box Information
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
            Comment
          </label>
          <textarea
            id="contents"
            name="contents"
            rows={3}
            required
            className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-300 bg-white shadow-sm hover:shadow-md placeholder:text-gray-500 text-gray-900"
            placeholder="Add any comments or notes about the transfer"
          />
          {validationErrors.contents && (
            <p className="text-red-600 text-xs mt-1">
              {validationErrors.contents}
            </p>
          )}
        </div>

        {/* Unit Selection */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-black dark:text-black mb-1">
              <Ruler size={16} className="inline mr-1" />
              Measurement Unit
            </label>
            <div className="relative">
              <select
                value={measurementUnit}
                onChange={(e) =>
                  setMeasurementUnit(e.target.value as "cm" | "inch")
                }
                className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-300 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-sm hover:shadow-md appearance-none"
              >
                <option value="cm">Centimeters (cm)</option>
                <option value="inch">Inches (in)</option>
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                <svg
                  className="w-4 h-4 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-black dark:text-black mb-1">
              <Weight size={16} className="inline mr-1" />
              Weight Unit
            </label>
            <div className="relative">
              <select
                value={weightUnit}
                onChange={(e) =>
                  setWeightUnit(e.target.value as "kg" | "pound")
                }
                className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-300 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-sm hover:shadow-md appearance-none"
              >
                <option value="kg">Kilograms (kg)</option>
                <option value="pound">Pounds (lb)</option>
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                <svg
                  className="w-4 h-4 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <FormInput
              id="dimensionsLength"
              name="dimensionsLength"
              label={`Length (${measurementUnit})`}
              type="number"
              step="0.1"
              placeholder={`Length in ${
                measurementUnit === "cm" ? "centimeters" : "inches"
              }`}
            />
            {validationErrors.dimensionsLength && (
              <p className="text-red-600 text-xs mt-1">
                {validationErrors.dimensionsLength}
              </p>
            )}
          </div>

          <div>
            <FormInput
              id="dimensionsWidth"
              name="dimensionsWidth"
              label={`Width (${measurementUnit})`}
              type="number"
              step="0.1"
              placeholder={`Width in ${
                measurementUnit === "cm" ? "centimeters" : "inches"
              }`}
            />
            {validationErrors.dimensionsWidth && (
              <p className="text-red-600 text-xs mt-1">
                {validationErrors.dimensionsWidth}
              </p>
            )}
          </div>

          <div>
            <FormInput
              id="dimensionsHeight"
              name="dimensionsHeight"
              label={`Height (${measurementUnit})`}
              type="number"
              step="0.1"
              placeholder={`Height in ${
                measurementUnit === "cm" ? "centimeters" : "inches"
              }`}
            />
            {validationErrors.dimensionsHeight && (
              <p className="text-red-600 text-xs mt-1">
                {validationErrors.dimensionsHeight}
              </p>
            )}
          </div>

          <div>
            <FormInput
              id="weight"
              name="weight"
              label={`Weight (${weightUnit})`}
              type="number"
              step="0.1"
              placeholder={`Weight in ${
                weightUnit === "kg" ? "kilograms" : "pounds"
              }`}
            />
            {validationErrors.weight && (
              <p className="text-red-600 text-xs mt-1">
                {validationErrors.weight}
              </p>
            )}
          </div>
        </div>

        {/* Hidden fields to store unit information */}
        <input type="hidden" name="measurementUnit" value={measurementUnit} />
        <input type="hidden" name="weightUnit" value={weightUnit} />
      </div>
    </div>
  );
}
