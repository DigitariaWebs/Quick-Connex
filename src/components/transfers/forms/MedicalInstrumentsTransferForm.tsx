"use client";

import { FormInput } from "@/components/shared/forms/FormInput";
import { Stethoscope, ChevronDown } from "lucide-react";
import { useState, useEffect, useRef } from "react";

interface MedicalInstrumentsTransferFormProps {
  validationErrors: Record<string, string>;
}

export default function MedicalInstrumentsTransferForm({
  validationErrors,
}: MedicalInstrumentsTransferFormProps) {
  const [isConditionOpen, setIsConditionOpen] = useState(false);
  const [selectedCondition, setSelectedCondition] = useState("");
  const [conditionSearchTerm, setConditionSearchTerm] = useState("");

  const conditionInputRef = useRef<HTMLInputElement>(null);
  const conditionDropdownRef = useRef<HTMLDivElement>(null);

  const conditionOptions = [
    { value: "excellent", label: "Excellent" },
    { value: "good", label: "Good" },
    { value: "fair", label: "Fair" },
    { value: "poor", label: "Poor" },
  ];

  const [filteredConditionOptions, setFilteredConditionOptions] =
    useState(conditionOptions);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        conditionDropdownRef.current &&
        !conditionDropdownRef.current.contains(event.target as Node) &&
        conditionInputRef.current &&
        !conditionInputRef.current.contains(event.target as Node)
      ) {
        setIsConditionOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleConditionInputChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const term = e.target.value;
    setConditionSearchTerm(term);

    // Filter options based on search term
    const filtered = conditionOptions.filter((opt) =>
      opt.label.toLowerCase().includes(term.toLowerCase())
    );
    setFilteredConditionOptions(filtered);
    setIsConditionOpen(true);
  };

  const handleConditionSelect = (option: { value: string; label: string }) => {
    setSelectedCondition(option.value);
    setConditionSearchTerm(option.label);
    setIsConditionOpen(false);
  };

  const handleConditionInputFocus = () => {
    setIsConditionOpen(true);
  };

  return (
    <div className="bg-purple-50 p-4 rounded-lg border border-purple-100">
      <h3 className="text-md font-semibold text-purple-800 mb-3 flex items-center">
        <Stethoscope size={18} className="mr-2" />
        Medical Instruments Information
      </h3>
      <div className="space-y-4">
        <div>
          <FormInput
            id="equipmentName"
            name="equipmentName"
            label="Equipment Name"
            required
            placeholder="Name of the medical equipment"
          />
          {validationErrors.equipmentName && (
            <p className="text-red-600 text-xs mt-1">
              {validationErrors.equipmentName}
            </p>
          )}
        </div>

        <div>
          <FormInput
            id="serialNumber"
            name="serialNumber"
            label="Serial Number"
            required
            placeholder="Equipment serial number"
          />
          {validationErrors.serialNumber && (
            <p className="text-red-600 text-xs mt-1">
              {validationErrors.serialNumber}
            </p>
          )}
        </div>

        <div className="relative">
          <label
            htmlFor="condition"
            className="block text-base font-medium text-gray-700 mb-3"
          >
            Condition
            <span className="text-red-500 ml-1">*</span>
          </label>

          <div className="relative">
            <input
              ref={conditionInputRef}
              type="text"
              id="condition"
              value={conditionSearchTerm}
              onChange={handleConditionInputChange}
              onFocus={handleConditionInputFocus}
              placeholder="Select condition"
              className={`w-full px-5 py-4 text-lg border rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200 placeholder:text-gray-500 text-black ${
                validationErrors.condition
                  ? "border-red-300 bg-red-50"
                  : "border-gray-200"
              }`}
              autoComplete="off"
            />

            <div className="absolute inset-y-0 right-0 pr-5 flex items-center">
              <ChevronDown
                size={16}
                className={`text-gray-400 transition-transform ${
                  isConditionOpen ? "rotate-180" : ""
                }`}
              />
            </div>
          </div>

          {validationErrors.condition && (
            <p className="text-sm text-red-600 mt-2">
              {validationErrors.condition}
            </p>
          )}

          {/* Hidden input for form submission */}
          <input type="hidden" name="condition" value={selectedCondition} />

          {/* Dropdown */}
          {isConditionOpen && (
            <div
              ref={conditionDropdownRef}
              className="absolute z-50 w-full mt-1 bg-white rounded-xl border border-gray-200 shadow-lg max-h-60 overflow-y-auto"
            >
              {filteredConditionOptions.length === 0 ? (
                <div className="p-3 text-center text-gray-500">
                  No condition found
                </div>
              ) : (
                <div className="py-1">
                  {filteredConditionOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => handleConditionSelect(option)}
                      className="w-full px-3 py-2 text-left hover:bg-gray-50 focus:bg-gray-50 focus:outline-none"
                    >
                      <div className="flex items-start space-x-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {option.label}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div>
          <label
            htmlFor="specialInstructions"
            className="block text-sm font-semibold text-gray-800 mb-1"
          >
            Special Instructions
          </label>
          <textarea
            id="specialInstructions"
            name="specialInstructions"
            rows={3}
            className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300 bg-white shadow-sm hover:shadow-md placeholder:text-gray-500 text-gray-900"
            placeholder="Any special handling instructions or notes"
          />
          {validationErrors.specialInstructions && (
            <p className="text-red-600 text-xs mt-1">
              {validationErrors.specialInstructions}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
