"use client";

import { useTranslations } from "next-intl";

/**
 * Custom hook that provides commonly used translations across the application.
 * This hook pre-loads multiple translation namespaces for convenience.
 *
 * @example
 * ```tsx
 * const { common, auth, messages } = useCommonTranslations();
 *
 * return (
 *   <div>
 *     <button>{common("submit")}</button>
 *     <h1>{auth("signIn")}</h1>
 *     <p>{messages("success")}</p>
 *   </div>
 * );
 * ```
 */
export function useCommonTranslations() {
  const common = useTranslations("common");
  const auth = useTranslations("auth");
  const navigation = useTranslations("navigation");
  const dashboard = useTranslations("dashboard");
  const transfers = useTranslations("transfers");
  const messages = useTranslations("messages");
  const validation = useTranslations("validation");

  return {
    common,
    auth,
    navigation,
    dashboard,
    transfers,
    messages,
    validation,
  };
}

/**
 * Hook specifically for form-related translations
 */
export function useFormTranslations() {
  const common = useTranslations("common");
  const validation = useTranslations("validation");
  const messages = useTranslations("messages");

  return {
    common,
    validation,
    messages,
    /**
     * Get common form button labels
     */
    buttons: {
      submit: common("submit"),
      cancel: common("cancel"),
      save: common("save"),
      delete: common("delete"),
      edit: common("edit"),
      close: common("close"),
    },
  };
}

/**
 * Hook for navigation-related translations
 */
export function useNavigationTranslations() {
  const nav = useTranslations("navigation");

  return {
    nav,
    /**
     * Get all main navigation items
     */
    mainNav: {
      dashboard: nav("dashboard"),
      transfers: nav("transfers"),
      myTransfers: nav("myTransfers"),
      nurses: nav("nurses"),
      calendar: nav("calendar"),
      profile: nav("profile"),
    },
    /**
     * Get all admin navigation items
     */
    adminNav: {
      admin: nav("admin"),
      users: nav("users"),
      analytics: nav("analytics"),
      settings: nav("settings"),
      auditLogs: nav("auditLogs"),
      monitoring: nav("monitoring"),
      system: nav("system"),
    },
  };
}

/**
 * Hook for authentication-related translations
 */
export function useAuthTranslations() {
  const auth = useTranslations("auth");
  const validation = useTranslations("validation");
  const messages = useTranslations("messages");

  return {
    auth,
    validation,
    messages,
    /**
     * Get all auth form labels
     */
    labels: {
      email: auth("email"),
      password: auth("password"),
      confirmPassword: auth("confirmPassword"),
      firstName: auth("firstName"),
      lastName: auth("lastName"),
      phoneNumber: auth("phoneNumber"),
    },
    /**
     * Get all auth placeholders
     */
    placeholders: {
      email: auth("enterEmail"),
      password: auth("enterPassword"),
      firstName: auth("enterFirstName"),
      lastName: auth("enterLastName"),
      phoneNumber: auth("enterPhoneNumber"),
    },
    /**
     * Get all auth actions
     */
    actions: {
      signIn: auth("signIn"),
      signUp: auth("signUp"),
      signOut: auth("signOut"),
      forgotPassword: auth("forgotPassword"),
      resetPassword: auth("resetPassword"),
    },
  };
}
