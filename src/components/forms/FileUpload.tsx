import React from 'react';

type FileUploadProps = {
  id: string;
  name: string;
  label: string;
  required?: boolean;
};

export function FileUpload({ id, name, label, required = true }: FileUploadProps) {
  return (
    <div>
      <label
        htmlFor={id}
        className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
      >
        {label}
      </label>
      <div className="relative border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-md p-6 flex justify-center">
        <div className="space-y-1 text-center">
          <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true">
            <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <div className="flex text-sm text-gray-600 dark:text-gray-400">
            <label htmlFor={id} className="relative cursor-pointer rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-blue-500">
              <span>Upload a file</span>
              <input 
                id={id} 
                name={name} 
                type="file" 
                className="sr-only" 
                required={required}
              />
            </label>
            <p className="pl-1">or drag and drop</p>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            PDF, JPG, PNG up to 10MB
          </p>
        </div>
      </div>
    </div>
  );
}
