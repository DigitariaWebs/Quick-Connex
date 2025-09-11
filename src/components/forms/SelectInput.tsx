import React from 'react';

type SelectInputProps = {
  id: string;
  name: string;
  label: string;
  options: Array<{ value: string; label: string }>;
  required?: boolean;
};

export function SelectInput({ id, name, label, options, required = true }: SelectInputProps) {
  return (
    <div>
      <label 
        htmlFor={id}
        className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
      >
        {label}
      </label>
      <select
        id={id}
        name={name}
        required={required}
        className="w-full px-4 py-2 rounded-md border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors dark:bg-gray-700 dark:border-gray-600 dark:text-white"
      >
        <option value="">Select {label.toLowerCase()}</option>
        {options.map(option => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
