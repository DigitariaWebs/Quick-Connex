import { motion } from 'framer-motion';
import React from 'react';

type RoleSpecificFieldsProps = {
  role: string;
  currentRole: string;
  children: React.ReactNode;
};

export function RoleSpecificFields({ role, currentRole, children }: RoleSpecificFieldsProps) {
  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ 
        opacity: currentRole === role ? 1 : 0,
        height: currentRole === role ? 'auto' : 0
      }}
      transition={{ duration: 0.3 }}
      className="overflow-hidden"
    >
      {currentRole === role && (
        <div className="space-y-5 pt-2">
          {children}
        </div>
      )}
    </motion.div>
  );
}
