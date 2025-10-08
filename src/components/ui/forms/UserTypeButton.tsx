import React from "react";
import { motion } from "framer-motion";

type UserTypeButtonProps = {
  type: string;
  currentType: string;
  onClick: () => void;
};

export function UserTypeButton({
  type,
  currentType,
  onClick,
}: UserTypeButtonProps) {
  const label = type.charAt(0).toUpperCase() + type.slice(1);

  return (
    <motion.button
      type="button"
      onClick={onClick}
      className={`flex-1 py-3.5 px-4 text-sm font-medium transition-all duration-300 relative overflow-hidden ${
        currentType === type
          ? "text-white shadow-md"
          : "text-gray-600 bg-gray-50 hover:bg-gray-100"
      }`}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      {currentType === type && (
        <motion.div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(45deg, #10b981, #34d399, #6ee7b7, #10b981)",
            backgroundSize: "300% 300%",
          }}
          animate={{
            backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            repeatType: "mirror",
            ease: "easeInOut",
          }}
        />
      )}
      <span className="relative z-10">{label}</span>
    </motion.button>
  );
}
