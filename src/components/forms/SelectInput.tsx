import React from "react";
import { ChevronDown } from "lucide-react";

type SelectInputProps = {
  id: string;
  name: string;
  label: string;
  options: Array<{ value: string; label: string }>;
  required?: boolean;
  variant?: "default" | "priority" | "transfer-type";
};

export function SelectInput({
  id,
  name,
  label,
  options,
  required = true,
  variant = "default",
}: SelectInputProps) {
  // Custom styling based on variant
  const getSelectStyle = () => {
    const baseStyle =
      "w-full px-4 py-3 rounded-lg border focus:outline-none focus:ring-2 transition-all duration-300 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-sm hover:shadow-md appearance-none";

    switch (variant) {
      case "priority":
        return `${baseStyle} border-indigo-200 focus:ring-indigo-500 focus:border-transparent`;
      case "transfer-type":
        return `${baseStyle} border-blue-200 focus:ring-blue-500 focus:border-transparent`;
      default:
        return `${baseStyle} border-gray-200 focus:ring-green-500 focus:border-transparent`;
    }
  };

  return (
    <div>
      <label
        htmlFor={id}
        className="block text-sm font-semibold text-black dark:text-black mb-1"
      >
        {label}
      </label>
      <div className="relative">
        <select
          id={id}
          name={name}
          required={required}
          className={getSelectStyle()}
        >
          <option value="">Select {label.toLowerCase()}</option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
          <ChevronDown size={18} className="text-gray-400" />
        </div>
      </div>
    </div>
  );
}
