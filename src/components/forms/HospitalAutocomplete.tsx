"use client";

import { useState, useEffect, useRef } from "react";
import { Search, MapPin, Building2, ChevronDown } from "lucide-react";

interface Hospital {
  _id: string;
  name: string;
  address: string;
  organization: {
    type: "CIUSSS" | "CISSS" | "CUSM";
    name: string;
    region: string;
  };
  specialties?: string[];
}

interface HospitalAutocompleteProps {
  id: string;
  name: string;
  label: string;
  placeholder?: string;
  required?: boolean;
  value?: string;
  onChange?: (value: string, hospital?: Hospital) => void;
  error?: string;
  className?: string;
}

export default function HospitalAutocomplete({
  id,
  name,
  label,
  placeholder = "Search hospitals...",
  required = false,
  value = "",
  onChange,
  error,
  className = "",
}: HospitalAutocompleteProps) {
  const [searchTerm, setSearchTerm] = useState(value);
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [filteredHospitals, setFilteredHospitals] = useState<Hospital[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedHospital, setSelectedHospital] = useState<Hospital | null>(
    null
  );
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(
    null
  );

  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load all hospitals on component mount
  useEffect(() => {
    loadHospitals();
  }, []);

  // Update search term when value prop changes
  useEffect(() => {
    setSearchTerm(value);
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

  const loadHospitals = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/hospitals?limit=100");
      const data = await response.json();

      if (data.success) {
        setHospitals(data.hospitals);
        setFilteredHospitals(data.hospitals);
      }
    } catch (error) {
      console.error("Error loading hospitals:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = (term: string) => {
    setSearchTerm(term);

    // Clear existing timeout
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }

    // Set new timeout for debounced search
    const timeout = setTimeout(() => {
      if (term.trim() === "") {
        setFilteredHospitals(hospitals);
      } else {
        const filtered = hospitals.filter(
          (hospital) =>
            hospital.name.toLowerCase().includes(term.toLowerCase()) ||
            hospital.address.toLowerCase().includes(term.toLowerCase()) ||
            hospital.organization.name
              .toLowerCase()
              .includes(term.toLowerCase()) ||
            hospital.organization.region
              .toLowerCase()
              .includes(term.toLowerCase())
        );
        setFilteredHospitals(filtered);
      }
      setIsOpen(true);
    }, 300);

    setSearchTimeout(timeout);
  };

  const handleHospitalSelect = (hospital: Hospital) => {
    setSelectedHospital(hospital);
    setSearchTerm(hospital.name);
    setIsOpen(false);

    if (onChange) {
      onChange(hospital.name, hospital);
    }
  };

  const handleInputFocus = () => {
    setIsOpen(true);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const term = e.target.value;
    handleSearch(term);

    // Clear selection if user is typing
    if (selectedHospital && term !== selectedHospital.name) {
      setSelectedHospital(null);
      if (onChange) {
        onChange(term);
      }
    }
  };

  const getOrganizationColor = (type: string) => {
    switch (type) {
      case "CIUSSS":
        return "text-blue-600 bg-blue-100";
      case "CISSS":
        return "text-green-600 bg-green-100";
      case "CUSM":
        return "text-purple-600 bg-purple-100";
      default:
        return "text-gray-600 bg-gray-100";
    }
  };

  return (
    <div className={`relative ${className}`}>
      <label
        htmlFor={id}
        className="block text-sm font-medium text-gray-700 mb-1"
      >
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>

      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search size={16} className="text-gray-400" />
        </div>

        <input
          ref={inputRef}
          type="text"
          id={id}
          name={name}
          value={searchTerm}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          placeholder={placeholder}
          className={`w-full pl-10 pr-10 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
            error ? "border-red-500" : "border-gray-300"
          }`}
          autoComplete="off"
        />

        <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
          <ChevronDown
            size={16}
            className={`text-gray-400 transition-transform ${
              isOpen ? "rotate-180" : ""
            }`}
          />
        </div>
      </div>

      {error && <p className="text-red-600 text-xs mt-1">{error}</p>}

      {/* Dropdown */}
      {isOpen && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto"
        >
          {isLoading ? (
            <div className="p-3 text-center text-gray-500">
              Loading hospitals...
            </div>
          ) : filteredHospitals.length === 0 ? (
            <div className="p-3 text-center text-gray-500">
              No hospitals found
            </div>
          ) : (
            <div className="py-1">
              {filteredHospitals.map((hospital) => (
                <button
                  key={hospital._id}
                  type="button"
                  onClick={() => handleHospitalSelect(hospital)}
                  className="w-full px-3 py-2 text-left hover:bg-gray-50 focus:bg-gray-50 focus:outline-none"
                >
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 mt-1">
                      <Building2 size={16} className="text-gray-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {hospital.name}
                        </p>
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getOrganizationColor(
                            hospital.organization.type
                          )}`}
                        >
                          {hospital.organization.type}
                        </span>
                      </div>
                      <div className="flex items-center mt-1 text-xs text-gray-500">
                        <MapPin size={12} className="mr-1 flex-shrink-0" />
                        <span className="truncate">{hospital.address}</span>
                      </div>
                      <p className="text-xs text-gray-400 mt-1 truncate">
                        {hospital.organization.name}
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
