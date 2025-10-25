"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { User, Package, Stethoscope, CheckCircle } from "lucide-react";
import { TransferCategory } from "@/lib/transfers/constants";

interface TransferCategorySelectorProps {
  selectedCategory: TransferCategory | null;
  onCategoryChange: (category: TransferCategory) => void;
  error?: string;
}

const categoryOptions = [
  {
    value: TransferCategory.PATIENT,
    label: "Patient Transfer",
    icon: User,
    color: "blue",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
    textColor: "text-blue-800",
    iconColor: "text-blue-600",
  },
  {
    value: TransferCategory.ENVELOPE,
    label: "Envelope Transfer",
    icon: Package,
    color: "orange",
    bgColor: "bg-orange-50",
    borderColor: "border-orange-200",
    textColor: "text-orange-800",
    iconColor: "text-orange-600",
  },
  {
    value: TransferCategory.MEDICAL_INSTRUMENTS,
    label: "Medical Instruments Transfer",
    icon: Stethoscope,
    color: "purple",
    bgColor: "bg-purple-50",
    borderColor: "border-purple-200",
    textColor: "text-purple-800",
    iconColor: "text-purple-600",
  },
];

export default function TransferCategorySelector({
  selectedCategory,
  onCategoryChange,
  error,
}: TransferCategorySelectorProps) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-semibold text-gray-800 mb-3">
          Select Transfer Type
        </label>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {categoryOptions.map((option) => {
            const Icon = option.icon;
            const isSelected = selectedCategory === option.value;

            return (
              <motion.button
                key={option.value}
                type="button"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => onCategoryChange(option.value)}
                className={`
                  relative p-4 rounded-xl border-2 transition-all duration-200
                  ${
                    isSelected
                      ? `${option.bgColor} ${option.borderColor} border-2 shadow-md`
                      : "bg-white border-gray-200 hover:border-gray-300"
                  }
                `}
              >
                <div className="flex items-center space-x-3">
                  <div
                    className={`
                    flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center
                    ${isSelected ? option.bgColor : "bg-gray-100"}
                  `}
                  >
                    <Icon
                      size={20}
                      className={
                        isSelected ? option.iconColor : "text-gray-600"
                      }
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3
                        className={`
                        text-sm font-semibold
                        ${isSelected ? option.textColor : "text-gray-900"}
                      `}
                      >
                        {option.label}
                      </h3>
                      {isSelected && (
                        <CheckCircle
                          size={16}
                          className={`${option.iconColor} flex-shrink-0`}
                        />
                      )}
                    </div>
                  </div>
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>

      {error && <p className="text-red-600 text-sm mt-2">{error}</p>}
    </div>
  );
}
