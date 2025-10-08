"use client";

import HospitalAutocomplete from '@/components/ui/forms/HospitalAutocomplete';
import { useState } from "react";

export default function TestAutocompletePage() {
  const [selectedHospital, setSelectedHospital] = useState<any>(null);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">
          Hospital Autocomplete Test
        </h1>

        <div className="bg-white rounded-lg shadow-md p-6">
          <HospitalAutocomplete
            id="testHospital"
            name="testHospital"
            label="Test Hospital Selection"
            placeholder="Search hospitals..."
            onChange={(value, hospital) => {
              setSelectedHospital(hospital);
              console.log("Selected hospital:", hospital);
            }}
          />

          {selectedHospital && (
            <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
              <h3 className="font-semibold text-green-800">
                Selected Hospital:
              </h3>
              <p className="text-green-700">
                <strong>Name:</strong> {selectedHospital.name}
              </p>
              <p className="text-green-700">
                <strong>Address:</strong> {selectedHospital.address}
              </p>
              <p className="text-green-700">
                <strong>Organization:</strong>{" "}
                {selectedHospital.organization.name} (
                {selectedHospital.organization.type})
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
