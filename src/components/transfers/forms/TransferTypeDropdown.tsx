"use client";

import { useState, useEffect, useRef } from "react";
import { ChevronDown } from "lucide-react";

interface TransferTypeOption {
  value: string;
  label: string;
}

interface TransferTypeDropdownProps {
  id: string;
  name: string;
  label: string;
  required?: boolean;
  value?: string;
  onChange?: (value: string) => void;
  error?: string;
}

export default function TransferTypeDropdown({
  id,
  name,
  label,
  required = false,
  value = "",
  onChange,
  error,
}: TransferTypeDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedValue, setSelectedValue] = useState(value);
  const [searchTerm, setSearchTerm] = useState("");

  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const options: TransferTypeOption[] = [
    { value: "stat", label: "STAT (Immediate)" },
    { value: "planifier", label: "Planifier (Scheduled)" },
  ];

  const [filteredOptions, setFilteredOptions] = useState(options);

  // Update search term when value prop changes
  useEffect(() => {
    setSelectedValue(value);
    const selectedOption = options.find((opt) => opt.value === value);
    if (selectedOption) {
      setSearchTerm(selectedOption.label);
    }
  }, [value]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const term = e.target.value;
    setSearchTerm(term);

    // Filter options based on search term
    const filtered = options.filter((opt) =>
      opt.label.toLowerCase().includes(term.toLowerCase())
    );
    setFilteredOptions(filtered);
    setIsOpen(true);
  };

  const handleOptionSelect = (option: TransferTypeOption) => {
    setSelectedValue(option.value);
    setSearchTerm(option.label);
    setIsOpen(false);

    if (onChange) {
      onChange(option.value);
    }
  };

  const handleInputFocus = () => {
    setIsOpen(true);
  };

  return (
    <div className="relative">
      <label
        htmlFor={id}
        className="block text-base font-medium text-gray-700 mb-3"
      >
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>

      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          id={id}
          name={name}
          value={searchTerm}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          placeholder="Select transfer type"
          className={`w-full px-5 py-4 text-lg border rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200 placeholder:text-gray-500 text-black ${
            error ? "border-red-300 bg-red-50" : "border-gray-200"
          }`}
          autoComplete="off"
        />

        <div className="absolute inset-y-0 right-0 pr-5 flex items-center">
          <ChevronDown
            size={16}
            className={`text-gray-400 transition-transform ${
              isOpen ? "rotate-180" : ""
            }`}
          />
        </div>
      </div>

      {error && <p className="text-sm text-red-600 mt-2">{error}</p>}

      {/* Hidden input for form submission */}
      <input type="hidden" name={name} value={selectedValue} />

      {/* Dropdown */}
      {isOpen && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-1 bg-white rounded-xl border border-gray-200 shadow-lg max-h-60 overflow-y-auto"
        >
          {filteredOptions.length === 0 ? (
            <div className="p-3 text-center text-gray-500">
              No transfer type found
            </div>
          ) : (
            <div className="py-1">
              {filteredOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleOptionSelect(option)}
                  className="w-full px-3 py-2 text-left hover:bg-gray-50 focus:bg-gray-50 focus:outline-none"
                >
                  <div className="flex items-start space-x-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {option.label}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
