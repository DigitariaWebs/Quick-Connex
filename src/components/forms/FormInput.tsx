import React from 'react';

type FormInputProps = {
  id: string;
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
  icon?: React.ReactNode;
};

export function FormInput({ 
  id, 
  name, 
  label, 
  type = 'text', 
  required = true, 
  placeholder = '', 
  icon 
}: FormInputProps) {
  return (
    <div>
      <label
        htmlFor={id}
        className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
      >
        {label}
      </label>
      <div className="relative">
        {icon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            {icon}
          </div>
        )}
        <input
          id={id}
          name={name}
          type={type}
          required={required}
          className={`w-full ${icon ? 'pl-10' : 'px-4'} pr-4 py-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-300 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm dark:border-gray-600 dark:text-white shadow-sm hover:shadow-md`}
          placeholder={placeholder}
        />
      </div>
    </div>
  );
}
