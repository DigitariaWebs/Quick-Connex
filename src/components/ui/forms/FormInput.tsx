import React from "react";

type FormInputProps = {
  id: string;
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
  icon?: React.ReactNode;
  step?: string;
  min?: string;
};

export function FormInput({
  id,
  name,
  label,
  type = "text",
  required = true,
  placeholder = "",
  icon,
  step,
  min,
}: FormInputProps) {
  return (
    <div>
      <label
        htmlFor={id}
        className="block text-base font-medium text-gray-700 mb-3"
      >
        {label}
      </label>
      <div className="relative">
        {icon && (
          <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
            {icon}
          </div>
        )}
        <input
          id={id}
          name={name}
          type={type}
          required={required}
          step={step}
          min={min}
          className={`w-full ${
            icon ? "pl-12" : "px-5"
          } py-4 text-lg border rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200 placeholder:text-gray-500 text-black ${"border-gray-200"}`}
          placeholder={placeholder}
        />
      </div>
    </div>
  );
}
