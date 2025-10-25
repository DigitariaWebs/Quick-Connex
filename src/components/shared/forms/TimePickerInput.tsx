"use client";

import React, { useState, forwardRef } from "react";
import DatePicker from "react-datepicker";
import { Clock } from "lucide-react";
import "react-datepicker/dist/react-datepicker.css";

type TimePickerInputProps = {
  id: string;
  name: string;
  label: string;
  required?: boolean;
  selectedTime: Date | null;
  onChange: (time: Date | null) => void;
  error?: string;
};

export function TimePickerInput({
  id,
  name,
  label,
  required = true,
  selectedTime,
  onChange,
  error,
}: TimePickerInputProps) {
  // Custom input component for the TimePicker
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
        {value || "Select time"}
      </span>
      <Clock size={18} className="text-gray-400" />
    </button>
  ));

  return (
    <div>
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
          selected={selectedTime}
          onChange={onChange}
          customInput={<CustomInput />}
          showTimeSelect
          showTimeSelectOnly
          timeIntervals={15}
          timeCaption="Time"
          dateFormat="h:mm aa"
          wrapperClassName="w-full"
          className="w-full"
          calendarClassName="shadow-lg border border-gray-100 rounded-lg"
          required={required}
        />
        <input
          type="hidden"
          name={name}
          value={
            selectedTime
              ? `${selectedTime
                  .getHours()
                  .toString()
                  .padStart(2, "0")}:${selectedTime
                  .getMinutes()
                  .toString()
                  .padStart(2, "0")}`
              : ""
          }
        />
      </div>
      {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
    </div>
  );
}
