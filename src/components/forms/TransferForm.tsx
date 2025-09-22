"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar,
  Clock,
  Building2,
  ArrowRight,
  User,
  AlertTriangle,
} from "lucide-react";
import { FormInput } from "./FormInput";
import { SelectInput } from "./SelectInput";
import { DatePickerInput } from "./DatePickerInput";
import { TimePickerInput } from "./TimePickerInput";
import HospitalAutocomplete from "./HospitalAutocomplete";

// Validation helpers
const validateRequired = (value: FormDataEntryValue | null): boolean => {
  return !!value && value.toString().trim() !== "";
};

const validateAge = (value: FormDataEntryValue | null): boolean => {
  const age = parseInt(value as string);
  return !isNaN(age) && age > 0 && age < 120;
};

const validateDate = (value: FormDataEntryValue | null): boolean => {
  if (!value) return false;
  const dateStr = value.toString();
  const today = new Date().toISOString().split("T")[0];
  return dateStr >= today;
};

interface TransferFormProps {
  onSuccess?: () => void;
  isModal?: boolean;
}

export default function TransferForm({
  onSuccess,
  isModal = false,
}: TransferFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<Date | null>(null);
  const [user, setUser] = useState<any>(null);
  const [selectedFromHospital, setSelectedFromHospital] = useState<any>(null);
  const [selectedToHospital, setSelectedToHospital] = useState<any>(null);

  const [validationErrors, setValidationErrors] = useState<
    Record<string, string>
  >({});

  // Check user authentication and role
  useEffect(() => {
    const checkUser = async () => {
      try {
        const response = await fetch("/api/auth/verify", {
          method: "GET",
          credentials: "include",
        });

        if (response.ok) {
          const data = await response.json();
          setUser(data.user);

          // Check if user is a manager
          if (data.user.userType !== "manager") {
            setError(
              "Only managers can create transfer requests. Please contact your administrator if you need access."
            );
          }
        } else {
          setError("Authentication required");
        }
      } catch (error) {
        console.error("Auth check failed:", error);
        setError("Authentication failed");
      }
    };

    checkUser();
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setValidationErrors({});

    // Check if user is a manager before proceeding
    if (!user || user.userType !== "manager") {
      setError(
        "Only managers can create transfer requests. Please contact your administrator if you need access."
      );
      setIsSubmitting(false);
      return;
    }

    const formData = new FormData(e.currentTarget);
    const patientFirstName = formData.get("patientFirstName");
    const patientLastName = formData.get("patientLastName");
    const patientAge = formData.get("patientAge");
    const patientDossierNumber = formData.get("patientDossierNumber");
    const transferDate = formData.get("transferDate");
    const transferTime = formData.get("transferTime");
    const transferType = formData.get("transferType");
    const issuer = formData.get("issuer");
    const priority = formData.get("priority");
    const reason = formData.get("reason");

    // Validate form inputs
    let errors: Record<string, string> = {};

    if (!validateRequired(patientFirstName)) {
      errors.patientFirstName = "Patient first name is required";
    }

    if (!validateRequired(patientLastName)) {
      errors.patientLastName = "Patient last name is required";
    }

    if (!validateAge(patientAge)) {
      errors.patientAge = "Valid age is required (1-120)";
    }

    if (!validateRequired(patientDossierNumber)) {
      errors.patientDossierNumber = "Dossier number is required";
    }

    // Validate hospital selection
    if (!selectedFromHospital) {
      errors.fromHospital = "Please select a source hospital from the list";
    }

    if (!selectedToHospital) {
      errors.toHospital = "Please select a destination hospital from the list";
    }

    // Validate that from and to hospitals are different
    if (
      selectedFromHospital &&
      selectedToHospital &&
      selectedFromHospital._id === selectedToHospital._id
    ) {
      errors.toHospital =
        "Destination hospital must be different from source hospital";
    }

    if (!selectedDate) {
      errors.transferDate = "Valid future date is required";
    }

    if (!selectedTime) {
      errors.transferTime = "Transfer time is required";
    }

    if (!validateRequired(transferType)) {
      errors.transferType = "Transfer type is required";
    }

    if (!validateRequired(issuer)) {
      errors.issuer = "Issuer selection is required";
    }

    if (!validateRequired(priority)) {
      errors.priority = "Priority level is required";
    }

    if (!validateRequired(reason)) {
      errors.reason = "Reason for transfer is required";
    }

    // Validate dossier number if provided
    if (patientDossierNumber && patientDossierNumber.toString().trim() !== "") {
      const dossierNumber = patientDossierNumber.toString().trim();

      // Check if dossier number contains only alphanumeric characters and common separators
      if (!/^[A-Za-z0-9\-_\/]+$/.test(dossierNumber)) {
        errors.patientDossierNumber =
          "Dossier number can only contain letters, numbers, hyphens, underscores, and forward slashes";
      }

      // Check length (reasonable limits)
      if (dossierNumber.length < 3) {
        errors.patientDossierNumber =
          "Dossier number seems quite short. Please verify it is correct.";
      }

      if (dossierNumber.length > 50) {
        errors.patientDossierNumber =
          "Dossier number seems quite long. Please verify it is correct.";
      }
    }

    // If there are validation errors, stop submission
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      setIsSubmitting(false);
      setError("Please correct the errors in the form");
      return;
    }

    // Format date and time for submission
    const formattedDate = selectedDate
      ? selectedDate.toISOString().split("T")[0]
      : "";
    const formattedTime = selectedTime
      ? `${selectedTime.getHours().toString().padStart(2, "0")}:${selectedTime
          .getMinutes()
          .toString()
          .padStart(2, "0")}`
      : "";

    // Prepare data for submission
    const transferData = {
      patientFirstName,
      patientLastName,
      patientAge,
      patientDossierNumber,
      fromHospital: selectedFromHospital?.name || "",
      toHospital: selectedToHospital?.name || "",
      fromHospitalId: selectedFromHospital?._id || "",
      toHospitalId: selectedToHospital?._id || "",
      transferDate: formattedDate,
      transferTime: formattedTime,
      transferType,
      issuer,
      priority,
      reason,
      // Simplified scheduling data
      scheduling: {
        transferTime: formattedTime,
      },
    };

    try {
      const response = await fetch("/api/transfers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include", // Add credentials for authentication
        body: JSON.stringify(transferData),
      });

      const data = await response.json();

      if (data.success) {
        // Clear any existing errors first
        setError(null);
        setValidationErrors({});
        setSuccess("Transfer request created successfully");

        // Store form reference before async operations
        const form = e.currentTarget;
        if (form) {
          form.reset();
        }

        setSelectedDate(null);
        setSelectedTime(null);

        // Add a small delay before calling onSuccess to avoid race conditions
        setTimeout(() => {
          try {
            if (onSuccess) {
              onSuccess();
            }
          } catch (refreshError) {
            console.error("Error in onSuccess callback:", refreshError);
            // Don't show this error to the user since the transfer was created successfully
          }
        }, 500);

        setTimeout(() => {
          setSuccess(null);
          setShowForm(false);
        }, 3000);
      } else {
        // Handle validation errors from backend
        if (data.errorCode === "VALIDATION_ERROR" && data.errors) {
          const backendErrors: Record<string, string> = {};

          // Map backend validation errors to form fields
          data.errors.forEach((error: string) => {
            if (error.includes("patientFirstName")) {
              backendErrors.patientFirstName = "Patient first name is required";
            } else if (error.includes("patientLastName")) {
              backendErrors.patientLastName = "Patient last name is required";
            } else if (error.includes("fromHospital")) {
              backendErrors.fromHospital = "Source hospital is required";
            } else if (error.includes("toHospital")) {
              backendErrors.toHospital = "Destination hospital is required";
            } else if (error.includes("transferDate")) {
              backendErrors.transferDate = "Valid transfer date is required";
            } else if (error.includes("reason")) {
              backendErrors.reason = "Reason for transfer is required";
            } else if (error.includes("dossier number")) {
              backendErrors.patientDossierNumber = error;
            } else if (error.includes("same hospitals")) {
              backendErrors.fromHospital =
                "Source and destination hospitals cannot be the same";
              backendErrors.toHospital =
                "Source and destination hospitals cannot be the same";
            } else if (error.includes("past")) {
              backendErrors.transferDate =
                "Transfer date cannot be in the past";
            }
          });

          setValidationErrors(backendErrors);
          setError("Please correct the validation errors below");
        } else {
          setError(data.error || "Failed to create transfer request");
        }
      }
    } catch (err) {
      console.error("Error creating transfer:", err);
      setError(
        `Network error occurred: ${
          err instanceof Error ? err.message : "Unknown error"
        }`
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // If it's in a modal, always show the form
  const shouldShowForm = isModal || showForm;

  // Don't render the form if user is not a manager
  if (user && user.userType !== "manager") {
    return (
      <div className={isModal ? "" : "mb-8"}>
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <AlertTriangle className="w-8 h-8 text-red-500 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-red-800 mb-2">
            Access Restricted
          </h3>
          <p className="text-red-600">
            Only managers can create transfer requests. Please contact your
            administrator if you need access.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={isModal ? "" : "mb-8"}>
      {!isModal && user?.userType === "manager" && (
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => setShowForm(!showForm)}
          className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white px-6 py-3 rounded-xl font-medium transition-all duration-200 shadow-md flex items-center justify-center"
        >
          {showForm ? "Cancel" : "+ Create New Transfer Request"}
        </motion.button>
      )}

      <AnimatePresence>
        {shouldShowForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className={isModal ? "" : "mt-4 overflow-hidden"}
          >
            <div
              className={
                isModal
                  ? ""
                  : "bg-white rounded-xl shadow-md border border-gray-200 p-6"
              }
            >
              {!isModal && (
                <h2 className="text-xl font-bold text-gray-800 mb-4">
                  Create Transfer Request
                </h2>
              )}

              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg flex items-center">
                  <AlertTriangle size={16} className="mr-2 text-red-500" />
                  {error}
                </div>
              )}

              {success && (
                <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg">
                  {success}
                </div>
              )}

              <form onSubmit={handleSubmit}>
                <div className="space-y-6">
                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                    <h3 className="text-md font-semibold text-blue-800 mb-3 flex items-center">
                      <User size={18} className="mr-2" />
                      Patient Information
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div>
                        <FormInput
                          id="patientFirstName"
                          name="patientFirstName"
                          label="First Name"
                          required
                          placeholder="Patient's first name"
                        />
                        {validationErrors.patientFirstName && (
                          <p className="text-red-600 text-xs mt-1">
                            {validationErrors.patientFirstName}
                          </p>
                        )}
                      </div>

                      <div>
                        <FormInput
                          id="patientLastName"
                          name="patientLastName"
                          label="Last Name"
                          required
                          placeholder="Patient's last name"
                        />
                        {validationErrors.patientLastName && (
                          <p className="text-red-600 text-xs mt-1">
                            {validationErrors.patientLastName}
                          </p>
                        )}
                      </div>

                      <div>
                        <FormInput
                          id="patientAge"
                          name="patientAge"
                          label="Age"
                          type="number"
                          required
                          placeholder="Patient's age"
                        />
                        {validationErrors.patientAge && (
                          <p className="text-red-600 text-xs mt-1">
                            {validationErrors.patientAge}
                          </p>
                        )}
                      </div>

                      <div>
                        <FormInput
                          id="patientDossierNumber"
                          name="patientDossierNumber"
                          label="Dossier Number"
                          required
                          placeholder="Patient's dossier number"
                        />
                        {validationErrors.patientDossierNumber && (
                          <p className="text-red-600 text-xs mt-1">
                            {validationErrors.patientDossierNumber}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h3 className="text-md font-semibold text-black mb-3 flex items-center">
                        <Building2 size={18} className="mr-2" />
                        From
                      </h3>
                      <HospitalAutocomplete
                        id="fromHospital"
                        name="fromHospital"
                        label="Source Hospital"
                        required
                        placeholder="Search source hospital..."
                        onChange={(value, hospital) => {
                          setSelectedFromHospital(hospital);
                          // Clear validation error when user selects a hospital
                          if (hospital && validationErrors.fromHospital) {
                            setValidationErrors((prev) => ({
                              ...prev,
                              fromHospital: "",
                            }));
                          }
                        }}
                        error={validationErrors.fromHospital}
                      />
                    </div>
                    <div>
                      <h3 className="text-md font-semibold text-black mb-3 flex items-center">
                        <ArrowRight size={18} className="mr-2" />
                        To
                      </h3>
                      <HospitalAutocomplete
                        id="toHospital"
                        name="toHospital"
                        label="Destination Hospital"
                        required
                        placeholder="Search destination hospital..."
                        onChange={(value, hospital) => {
                          setSelectedToHospital(hospital);
                          // Clear validation error when user selects a hospital
                          if (hospital && validationErrors.toHospital) {
                            setValidationErrors((prev) => ({
                              ...prev,
                              toHospital: "",
                            }));
                          }
                        }}
                        error={validationErrors.toHospital}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h3 className="text-md font-semibold text-black mb-3 flex items-center">
                        <Calendar size={18} className="mr-2" />
                        Date
                      </h3>
                      <DatePickerInput
                        id="transferDate"
                        name="transferDate"
                        label="Transfer Date"
                        required
                        selectedDate={selectedDate}
                        onChange={(date) => setSelectedDate(date)}
                        error={validationErrors.transferDate}
                      />
                    </div>
                    <div>
                      <h3 className="text-md font-semibold text-black mb-3 flex items-center">
                        <Clock size={18} className="mr-2" />
                        Time
                      </h3>
                      <TimePickerInput
                        id="transferTime"
                        name="transferTime"
                        label="Transfer Time"
                        required
                        selectedTime={selectedTime}
                        onChange={(time) => setSelectedTime(time)}
                        error={validationErrors.transferTime}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <SelectInput
                        id="transferType"
                        name="transferType"
                        label="Transfer Type"
                        required
                        variant="transfer-type"
                        options={[
                          { value: "stat", label: "STAT (Immediate)" },
                          {
                            value: "planifier",
                            label: "Planifier (Scheduled)",
                          },
                        ]}
                      />
                      {validationErrors.transferType && (
                        <p className="text-red-600 text-xs mt-1">
                          {validationErrors.transferType}
                        </p>
                      )}
                    </div>

                    <div>
                      <SelectInput
                        id="issuer"
                        name="issuer"
                        label="Issuer"
                        required
                        variant="issuer"
                        options={[
                          { value: "gestionnaire", label: "Gestionnaire" },
                          { value: "assistant_chef", label: "Assistant Chef" },
                          { value: "coordonateur", label: "Coordonateur" },
                        ]}
                      />
                      {validationErrors.issuer && (
                        <p className="text-red-600 text-xs mt-1">
                          {validationErrors.issuer}
                        </p>
                      )}
                    </div>

                    <div>
                      <SelectInput
                        id="priority"
                        name="priority"
                        label="Priority Level"
                        required
                        variant="priority"
                        options={[
                          { value: "low", label: "Low" },
                          { value: "medium", label: "Medium" },
                          { value: "high", label: "High" },
                        ]}
                      />
                      {validationErrors.priority && (
                        <p className="text-red-600 text-xs mt-1">
                          {validationErrors.priority}
                        </p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="reason"
                      className="block text-sm font-semibold text-black dark:text-black mb-1"
                    >
                      Reason for Transfer
                    </label>
                    <textarea
                      id="reason"
                      name="reason"
                      rows={3}
                      required
                      className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-300 bg-white shadow-sm hover:shadow-md placeholder:text-gray-500 text-gray-900"
                      placeholder="Provide details about the reason for the transfer"
                    ></textarea>
                    {validationErrors.reason && (
                      <p className="text-red-600 text-xs mt-1">
                        {validationErrors.reason}
                      </p>
                    )}
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="px-6 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg font-medium hover:from-green-600 hover:to-emerald-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                    >
                      {isSubmitting ? "Creating..." : "Create Transfer"}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
