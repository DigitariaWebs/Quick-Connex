import React from "react";
import { ChevronDown } from "lucide-react";

type SelectInputProps = {
  id: string;
  name: string;
  label: string;
  options: Array<{ value: string; label: string }>;
  required?: boolean;
  variant?: "default" | "priority" | "transfer-type" | "issuer" | "condition";
  onChange?: (value: string) => void;
};

export function SelectInput({
  id,
  name,
  label,
  options,
  required = true,
  variant = "default",
  onChange,
}: SelectInputProps) {
  // Custom styling based on variant
  const getSelectStyle = () => {
    const baseStyle =
      "w-full px-5 py-4 text-lg border rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200 placeholder:text-gray-500 text-black appearance-none";

    switch (variant) {
      case "priority":
        return `${baseStyle} border-indigo-200 focus:ring-indigo-500`;
      case "transfer-type":
        return `${baseStyle} border-blue-200 focus:ring-blue-500`;
      case "issuer":
        return `${baseStyle} border-purple-200 focus:ring-purple-500`;
      case "condition":
        return `${baseStyle} border-orange-200 focus:ring-orange-500`;
      default:
        return `${baseStyle} border-gray-200`;
    }
  };

  return (
    <div>
      <label
        htmlFor={id}
        className="block text-base font-medium text-gray-700 mb-3"
      >
        {label}
      </label>
      <div className="relative">
        <select
          id={id}
          name={name}
          required={required}
          className={getSelectStyle()}
          onChange={(e) => onChange?.(e.target.value)}
        >
          <option value="">Select {label.toLowerCase()}</option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <div className="absolute inset-y-0 right-0 flex items-center pr-5 pointer-events-none">
          <ChevronDown size={18} className="text-gray-400" />
        </div>
      </div>
    </div>
  );
}
