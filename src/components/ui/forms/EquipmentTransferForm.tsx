"use client";

import { FormInput } from "./FormInput";
import { SelectInput } from "./SelectInput";
import { Stethoscope, Wrench, AlertCircle } from "lucide-react";

interface EquipmentTransferFormProps {
  validationErrors: Record<string, string>;
}

export default function EquipmentTransferForm({
  validationErrors,
}: EquipmentTransferFormProps) {
  return (
    <div className="bg-green-50 p-4 rounded-lg border border-green-100">
      <h3 className="text-md font-semibold text-green-800 mb-3 flex items-center">
        <Stethoscope size={18} className="mr-2" />
        Medical Equipment Information
      </h3>
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <FormInput
              id="equipmentName"
              name="equipmentName"
              label="Equipment Name"
              required
              placeholder="e.g., Ventilator, Defibrillator, Monitor"
            />
            {validationErrors.equipmentName && (
              <p className="text-red-600 text-xs mt-1">
                {validationErrors.equipmentName}
              </p>
            )}
          </div>

          <div>
            <FormInput
              id="model"
              name="model"
              label="Model"
              required
              placeholder="Equipment model number"
            />
            {validationErrors.model && (
              <p className="text-red-600 text-xs mt-1">
                {validationErrors.model}
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <FormInput
              id="serialNumber"
              name="serialNumber"
              label="Serial Number (Optional)"
              placeholder="Equipment serial number if available"
            />
            {validationErrors.serialNumber && (
              <p className="text-red-600 text-xs mt-1">
                {validationErrors.serialNumber}
              </p>
            )}
          </div>

          <div>
            <SelectInput
              id="condition"
              name="condition"
              label="Equipment Condition"
              required
              variant="condition"
              options={[
                { value: "excellent", label: "Excellent - Like new" },
                { value: "good", label: "Good - Minor wear" },
                { value: "fair", label: "Fair - Some wear" },
                { value: "poor", label: "Poor - Significant wear" },
              ]}
            />
            {validationErrors.condition && (
              <p className="text-red-600 text-xs mt-1">
                {validationErrors.condition}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="maintenanceRequired"
            name="maintenanceRequired"
            className="w-4 h-4 text-green-600 bg-gray-100 border-gray-300 rounded focus:ring-green-500 focus:ring-2"
          />
          <label
            htmlFor="maintenanceRequired"
            className="text-sm font-medium text-gray-700"
          >
            Maintenance required before transfer
          </label>
        </div>

        <div>
          <label
            htmlFor="specialInstructions"
            className="block text-sm font-semibold text-gray-800 mb-1"
          >
            Special Instructions (Optional)
          </label>
          <textarea
            id="specialInstructions"
            name="specialInstructions"
            rows={3}
            className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-300 bg-white shadow-sm hover:shadow-md placeholder:text-gray-500 text-gray-900"
            placeholder="Any special handling instructions, setup requirements, or notes"
          />
          {validationErrors.specialInstructions && (
            <p className="text-red-600 text-xs mt-1">
              {validationErrors.specialInstructions}
            </p>
          )}
        </div>

        <div className="bg-green-100 p-3 rounded-lg border border-green-200">
          <div className="flex items-start space-x-2">
            <AlertCircle
              size={16}
              className="text-green-600 mt-0.5 flex-shrink-0"
            />
            <div className="text-sm text-green-800">
              <p className="font-medium">Equipment Transfer Guidelines:</p>
              <ul className="mt-1 space-y-1 text-xs">
                <li>• Ensure equipment is properly cleaned and sanitized</li>
                <li>• Include all necessary accessories and documentation</li>
                <li>
                  • Verify equipment is in working condition before transfer
                </li>
                <li>• Include any required maintenance records</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
