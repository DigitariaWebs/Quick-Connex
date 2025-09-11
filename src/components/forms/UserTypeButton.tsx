import React from 'react';

type UserTypeButtonProps = {
  type: string;
  currentType: string;
  onClick: () => void;
};

export function UserTypeButton({ type, currentType, onClick }: UserTypeButtonProps) {
  const label = type.charAt(0).toUpperCase() + type.slice(1);
  
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 py-3 px-4 text-sm font-medium transition-all duration-200 ${
        currentType === type
          ? 'bg-blue-600 text-white shadow-md'
          : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
      }`}
    >
      {label}
    </button>
  );
}
