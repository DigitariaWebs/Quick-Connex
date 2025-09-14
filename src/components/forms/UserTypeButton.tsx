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
      className={`flex-1 py-3.5 px-4 text-sm font-medium transition-all duration-300 ${
        currentType === type
          ? 'bg-green-600 text-white shadow-md scale-105'
          : 'text-gray-600 dark:text-gray-300 hover:bg-white/50 dark:hover:bg-gray-700/50 backdrop-blur-sm'
      }`}
    >
      {label}
    </button>
  );
}
