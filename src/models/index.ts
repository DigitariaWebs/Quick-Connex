// Central models export file
// This ensures all models are registered with Mongoose before they're used
// Import this file in places that need models to ensure proper registration

import { CIUSSS } from "./CIUSSS";
import Hospital from "./Hospital";
import User from "./User";
import Transfer from "./Transfer";
import Patient from "./Patient";
import Notification from "./Notification";
import Session from "./Session";
import EmailVerification from "./EmailVerification";
import PhoneVerification from "./PhoneVerification";
import AuditLog from "./AuditLog";

// Export all models
export {
  CIUSSS,
  Hospital,
  User,
  Transfer,
  Patient,
  Notification,
  Session,
  EmailVerification,
  PhoneVerification,
  AuditLog,
};

// Default export for convenience
export default {
  CIUSSS,
  Hospital,
  User,
  Transfer,
  Patient,
  Notification,
  Session,
  EmailVerification,
  PhoneVerification,
  AuditLog,
};
