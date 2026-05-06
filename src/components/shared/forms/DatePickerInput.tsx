"use client";

import React, { useState, forwardRef } from "react";
import DatePicker from "react-datepicker";
import { Calendar } from "lucide-react";
import "react-datepicker/dist/react-datepicker.css";

// Custom styles for modern calendar
const customStyles = `
  .react-datepicker {
    font-family: inherit;
    border: none !important;
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25) !important;
  }
  
  .react-datepicker__header {
    background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%) !important;
    border-bottom: 1px solid #e5e7eb !important;
    border-radius: 12px 12px 0 0 !important;
    padding: 16px !important;
  }
  
  .react-datepicker__current-month,
  .react-datepicker__current-year {
    color: #1f2937 !important;
    font-weight: 600 !important;
    font-size: 16px !important;
  }
  
  .react-datepicker__day-names {
    margin-bottom: 8px !important;
  }
  
  .react-datepicker__day-name {
    color: #6b7280 !important;
    font-weight: 500 !important;
    font-size: 12px !important;
    text-transform: uppercase !important;
    letter-spacing: 0.5px !important;
  }
  
  .react-datepicker__day {
    border-radius: 8px !important;
    margin: 2px !important;
    font-weight: 500 !important;
    transition: all 0.2s ease !important;
  }
  
  .react-datepicker__day:hover {
    background-color: #dcfce7 !important;
    color: #166534 !important;
    transform: scale(1.05) !important;
  }
  
  .react-datepicker__day--selected {
    background-color: #10b981 !important;
    color: white !important;
    font-weight: 600 !important;
    box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3) !important;
  }
  
  .react-datepicker__day--today {
    background-color: #dcfce7 !important;
    color: #166534 !important;
    font-weight: 600 !important;
  }
  
  .react-datepicker__day--disabled {
    color: #d1d5db !important;
    background-color: transparent !important;
  }
  
  .react-datepicker__navigation {
    top: 16px !important;
    width: 32px !important;
    height: 32px !important;
    border-radius: 8px !important;
    background-color: white !important;
    border: 1px solid #e5e7eb !important;
    transition: all 0.2s ease !important;
  }
  
  .react-datepicker__navigation:hover {
    background-color: #f9fafb !important;
    border-color: #10b981 !important;
    transform: scale(1.05) !important;
  }
  
  .react-datepicker__navigation-icon::before {
    border-color: #6b7280 !important;
    border-width: 2px 2px 0 0 !important;
  }
  
  .react-datepicker__navigation:hover .react-datepicker__navigation-icon::before {
    border-color: #10b981 !important;
  }
`;

type DatePickerInputProps = {
  id: string;
  name: string;
  label: string;
  required?: boolean;
  selectedDate: Date | null;
  onChange: (date: Date | null) => void;
  error?: string;
};

export function DatePickerInput({
  id,
  name,
  label,
  required = true,
  selectedDate,
  onChange,
  error,
}: DatePickerInputProps) {
  // Custom input component for the DatePicker
  const CustomInput = forwardRef<
    HTMLButtonElement,
    { value?: string; onClick?: () => void }
  >(({ value, onClick }, ref) => (
    <button
      type="button"
      onClick={onClick}
      ref={ref}
      className="w-full px-4 py-3 text-base border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200 placeholder:text-gray-500 text-black border-gray-200 text-left flex items-center justify-between"
    >
      <span className={`${!value ? "text-gray-500" : "text-black"}`}>
        {value || "Select date"}
      </span>
      <Calendar size={18} className="text-gray-400" />
    </button>
  ));

  // Min date = start of today (avoid blocking today's selection when current time > 00:00)
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <div>
      <style dangerouslySetInnerHTML={{ __html: customStyles }} />
      <label
        htmlFor={id}
        className="block text-base font-medium text-gray-700 mb-3"
      >
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <div className="relative">
        <DatePicker
          id={id}
          name={name}
          selected={selectedDate}
          onChange={onChange}
          customInput={<CustomInput />}
          dateFormat="MMMM d, yyyy"
          minDate={today}
          showPopperArrow={false}
          wrapperClassName="w-full"
          className="w-full"
          calendarClassName="modern-datepicker"
          required={required}
        />
        <input
          type="hidden"
          name={name}
          value={selectedDate?.toISOString() || ""}
        />
      </div>
      {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
    </div>
  );
}
