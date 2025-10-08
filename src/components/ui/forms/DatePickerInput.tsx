"use client";

import React, { useState, forwardRef } from "react";
import DatePicker from "react-datepicker";
import { Calendar } from "lucide-react";
import "react-datepicker/dist/react-datepicker.css";

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
      className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm dark:border-gray-600 dark:text-white shadow-sm hover:shadow-md text-left flex items-center justify-between"
    >
      <span className={`${!value ? "text-gray-400" : "text-gray-800"}`}>
        {value || "Select date"}
      </span>
      <Calendar size={18} className="text-blue-500" />
    </button>
  ));

  // Get today's date for min date
  const today = new Date();

  return (
    <div>
      <label
        htmlFor={id}
        className="block text-sm font-semibold text-black dark:text-black mb-1"
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
          calendarClassName="shadow-lg border border-gray-100 rounded-lg"
          required={required}
        />
        <input
          type="hidden"
          name={name}
          value={selectedDate?.toISOString() || ""}
        />
      </div>
      {error && <p className="text-red-600 text-xs mt-1">{error}</p>}
    </div>
  );
}
