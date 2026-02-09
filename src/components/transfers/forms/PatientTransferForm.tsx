"use client";

import { FormInput } from "@/components/shared/forms/FormInput";
import { User } from "lucide-react";
import { useTranslations } from "next-intl";

interface PatientTransferFormProps {
  validationErrors: Record<string, string>;
}

export default function PatientTransferForm({
  validationErrors,
}: PatientTransferFormProps) {
  const t = useTranslations("transfersPage");
  return (
    <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
      <h3 className="text-md font-semibold text-blue-800 mb-3 flex items-center">
        <User size={18} className="mr-2" />
        {t("patientInformation")}
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div>
          <FormInput
            id="patientFirstName"
            name="patientFirstName"
            label={t("firstName")}
            required
            placeholder={t("patientsFirstName")}
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
            label={t("lastName")}
            required
            placeholder={t("patientsLastName")}
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
            label={t("age")}
            type="number"
            required
            placeholder={t("patientsAge")}
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
            label={t("dossierNumber")}
            required
            placeholder={t("patientsDossierNumber")}
          />
          {validationErrors.patientDossierNumber && (
            <p className="text-red-600 text-xs mt-1">
              {validationErrors.patientDossierNumber}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
