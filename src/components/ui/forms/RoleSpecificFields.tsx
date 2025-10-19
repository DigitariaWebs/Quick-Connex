import { motion } from "framer-motion";
import React from "react";

type RoleSpecificFieldsProps = {
  userType: string;
  currentUserType: string;
  children: React.ReactNode;
};

export function RoleSpecificFields({
  userType,
  currentUserType,
  children,
}: RoleSpecificFieldsProps) {
  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{
        opacity: currentUserType === userType ? 1 : 0,
        height: currentUserType === userType ? "auto" : 0,
      }}
      transition={{ duration: 0.3 }}
      className="overflow-hidden"
    >
      {currentUserType === userType && (
        <div className="space-y-5 pt-2">{children}</div>
      )}
    </motion.div>
  );
}
