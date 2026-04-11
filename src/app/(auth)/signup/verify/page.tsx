"use client";

import {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
  Suspense,
} from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { isValidEmail } from "@/lib/utils/string-helpers";
import { COUNTRY_CODES } from "@/lib/constants/country-codes";

function VerifyPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const t = useTranslations("verification");
  const tCommon = useTranslations("common");

  const [email, setEmail] = useState<string>(searchParams.get("email") || "");
  const [phone, setPhone] = useState<string>(searchParams.get("phone") || "");
  const countryCode = searchParams.get("countryCode") || "+1";

  // Email verification state
  const [emailCode, setEmailCode] = useState<string>("");
  const [isEmailVerified, setIsEmailVerified] = useState<boolean>(false);
  const [isSendingEmailCode, setIsSendingEmailCode] = useState<boolean>(false);
  const [isVerifyingEmailCode, setIsVerifyingEmailCode] =
    useState<boolean>(false);
  const [emailCodeExpirationTime, setEmailCodeExpirationTime] =
    useState<Date | null>(null);
  const [emailTimeRemaining, setEmailTimeRemaining] = useState<number>(0);
  const [emailError, setEmailError] = useState<string>("");
  const [emailVerificationStatus, setEmailVerificationStatus] = useState<{
    canRequestNewCode: boolean;
    codesRemaining: number;
  }>({ canRequestNewCode: true, codesRemaining: 3 });

  // Phone verification state
  const [phoneCode, setPhoneCode] = useState<string>("");
  const [isPhoneVerified, setIsPhoneVerified] = useState<boolean>(false);
  const [isSendingPhoneCode, setIsSendingPhoneCode] = useState<boolean>(false);
  const [isVerifyingPhoneCode, setIsVerifyingPhoneCode] =
    useState<boolean>(false);
  const [phoneCodeExpirationTime, setPhoneCodeExpirationTime] =
    useState<Date | null>(null);
  const [phoneTimeRemaining, setPhoneTimeRemaining] = useState<number>(0);
  const [phoneError, setPhoneError] = useState<string>("");
  const [phoneVerificationStatus, setPhoneVerificationStatus] = useState<{
    canRequestNewCode: boolean;
    codesRemaining: number;
  }>({ canRequestNewCode: true, codesRemaining: 3 });

  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [isEditingPhone, setIsEditingPhone] = useState(false);
  const [tempEmail, setTempEmail] = useState("");
  const [tempPhone, setTempPhone] = useState("");
  const [tempCountryCode, setTempCountryCode] = useState("+1");
  const [updateEmailError, setUpdateEmailError] = useState("");
  const [updatePhoneError, setUpdatePhoneError] = useState("");
  const [isUpdatingEmail, setIsUpdatingEmail] = useState(false);
  const [isUpdatingPhone, setIsUpdatingPhone] = useState(false);
  const [isEditCountryCodeOpen, setIsEditCountryCodeOpen] = useState(false);
  const [editCountryCodeSearch, setEditCountryCodeSearch] = useState("");
  const editCountryCodeInputRef = useRef<HTMLInputElement>(null);
  const editCountryCodeDropdownRef = useRef<HTMLDivElement>(null);

  const filteredEditCountryCodes = useMemo(
    () =>
      editCountryCodeSearch
        ? COUNTRY_CODES.filter(
            (cc) =>
              cc.code.includes(editCountryCodeSearch) ||
              cc.country
                .toLowerCase()
                .includes(editCountryCodeSearch.toLowerCase()),
          )
        : COUNTRY_CODES,
    [editCountryCodeSearch],
  );

  // Format phone for display
  const formatPhoneForDisplay = useCallback(
    (phone: string, countryCodeParam?: string) => {
      if (!phone) return "";

      // If phone already starts with +, extract country code from it
      let phoneDigits = phone.replace(/\D/g, "");
      let extractedCountryCode = "";

      // Check if phone starts with a known country code
      if (phone.startsWith("+")) {
        // Find the country code in the phone number (longest match first)
        const knownCountryCodes = [
          "+213",
          "+971",
          "+351",
          "+358",
          "+33",
          "+44",
          "+49",
          "+34",
          "+39",
          "+31",
          "+32",
          "+41",
          "+45",
          "+46",
          "+47",
          "+61",
          "+64",
          "+81",
          "+86",
          "+91",
          "+1",
        ];
        for (const code of knownCountryCodes) {
          const codeDigits = code.replace(/\D/g, "");
          if (phoneDigits.startsWith(codeDigits)) {
            extractedCountryCode = code;
            phoneDigits = phoneDigits.substring(codeDigits.length);
            break;
          }
        }
      }

      // Use extracted country code if phone already had it, otherwise use parameter
      const countryCodeToUse = extractedCountryCode || countryCodeParam;

      // For US/Canada (+1)
      if (countryCodeToUse === "+1" && phoneDigits.length === 10) {
        return `(${phoneDigits.slice(0, 3)}) ${phoneDigits.slice(
          3,
          6,
        )}-${phoneDigits.slice(6)}`;
      }

      // For other countries, show the country code and the remaining digits
      if (countryCodeToUse && phoneDigits) {
        return `${countryCodeToUse} ${phoneDigits}`;
      }

      // Fallback: return formatted phone if it's valid
      if (phoneDigits.length >= 10) {
        return phone.startsWith("+") ? phone : `+${phoneDigits}`;
      }

      return phone;
    },
    [],
  );

  // Normalize phone number
  const normalizePhoneNumber = useCallback(
    (phone: string, countryCode: string): string => {
      // If phone already starts with +, it's already in international format
      if (phone.startsWith("+")) {
        // Remove all non-digit characters except +
        let cleaned = phone.replace(/[^\d+]/g, "");
        // Ensure it starts with +
        if (!cleaned.startsWith("+")) {
          cleaned = "+" + cleaned;
        }

        // Check if country code is duplicated at the start
        const countryCodeDigits = countryCode.replace(/\D/g, "");
        const phoneDigits = cleaned.substring(1); // Remove the +

        // If phone starts with country code twice, remove the duplicate
        if (phoneDigits.startsWith(countryCodeDigits + countryCodeDigits)) {
          // Remove one instance of the country code
          const withoutDuplicate = phoneDigits.substring(
            countryCodeDigits.length,
          );
          return `+${withoutDuplicate}`;
        }

        return cleaned;
      }

      // Otherwise, normalize and add country code
      let normalized = phone.replace(/\D/g, "");
      const countryCodeDigits = countryCode.replace(/\D/g, "");

      // Remove country code from normalized if it's already there
      if (normalized.startsWith(countryCodeDigits)) {
        normalized = normalized.substring(countryCodeDigits.length);
      }

      const fullPhone = `${countryCodeDigits}${normalized}`;
      return `+${fullPhone}`;
    },
    [],
  );

  const handleSaveContact = async (type: "email" | "phone") => {
    if (type === "email") {
      if (!isValidEmail(tempEmail)) {
        setUpdateEmailError(t("edit.invalidEmail"));
        return;
      }
      setIsUpdatingEmail(true);
      setUpdateEmailError("");
    } else {
      const normalized = normalizePhoneNumber(tempPhone, tempCountryCode);
      if (!normalized || normalized.replace(/\D/g, "").length < 7) {
        setUpdatePhoneError(t("edit.invalidPhone"));
        return;
      }
      setIsUpdatingPhone(true);
      setUpdatePhoneError("");
    }

    const newValue =
      type === "email"
        ? tempEmail
        : normalizePhoneNumber(tempPhone, tempCountryCode);

    try {
      const response = await fetch("/api/auth/update-contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, currentEmail: email, newValue }),
      });
      const data = await response.json();
      if (data.success) {
        if (type === "email") {
          setEmail(tempEmail);
          setIsEditingEmail(false);
          setEmailCode("");
          setEmailCodeExpirationTime(null);
          setEmailTimeRemaining(0);
          setEmailError("");
          router.replace(
            `/signup/verify?email=${encodeURIComponent(tempEmail)}&phone=${encodeURIComponent(phone)}&countryCode=${encodeURIComponent(countryCode)}`,
          );
        } else {
          setPhone(newValue);
          setIsEditingPhone(false);
          setPhoneCode("");
          setPhoneCodeExpirationTime(null);
          setPhoneTimeRemaining(0);
          setPhoneError("");
          router.replace(
            `/signup/verify?email=${encodeURIComponent(email)}&phone=${encodeURIComponent(newValue)}&countryCode=${encodeURIComponent(countryCode)}`,
          );
        }
      } else {
        if (type === "email") {
          setUpdateEmailError(data.error || t("edit.updateEmailFailed"));
        } else {
          setUpdatePhoneError(data.error || t("edit.updatePhoneFailed"));
        }
      }
    } catch {
      if (type === "email") {
        setUpdateEmailError(t("edit.updateEmailRetry"));
      } else {
        setUpdatePhoneError(t("edit.updatePhoneRetry"));
      }
    } finally {
      if (type === "email") {
        setIsUpdatingEmail(false);
      } else {
        setIsUpdatingPhone(false);
      }
    }
  };

  useEffect(() => {
    if (!isEditCountryCodeOpen) return;
    function handleClickOutside(event: MouseEvent) {
      if (
        editCountryCodeDropdownRef.current &&
        !editCountryCodeDropdownRef.current.contains(event.target as Node) &&
        editCountryCodeInputRef.current &&
        !editCountryCodeInputRef.current.contains(event.target as Node)
      ) {
        setIsEditCountryCodeOpen(false);
        setEditCountryCodeSearch("");
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isEditCountryCodeOpen]);

  // Countdown timer for email code expiration
  useEffect(() => {
    if (!emailCodeExpirationTime) return;

    const interval = setInterval(() => {
      const now = new Date();
      const remaining = Math.max(
        0,
        Math.floor((emailCodeExpirationTime.getTime() - now.getTime()) / 1000),
      );
      setEmailTimeRemaining(remaining);

      if (remaining === 0) {
        setEmailCodeExpirationTime(null);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [emailCodeExpirationTime]);

  // Countdown timer for phone code expiration
  useEffect(() => {
    if (!phoneCodeExpirationTime) return;

    const interval = setInterval(() => {
      const now = new Date();
      const remaining = Math.max(
        0,
        Math.floor((phoneCodeExpirationTime.getTime() - now.getTime()) / 1000),
      );
      setPhoneTimeRemaining(remaining);

      if (remaining === 0) {
        setPhoneCodeExpirationTime(null);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [phoneCodeExpirationTime]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Email verification handlers
  const handleSendEmailCode = async () => {
    if (!email) {
      setEmailError(t("email.sending"));
      return;
    }

    setIsSendingEmailCode(true);
    setEmailError("");

    try {
      const response = await fetch("/api/auth/email-verification/send-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (data.success) {
        const expiration = new Date(Date.now() + 5 * 60 * 1000);
        setEmailCodeExpirationTime(expiration);
        setEmailTimeRemaining(300);
        setEmailVerificationStatus({
          canRequestNewCode: data.codesRemaining > 0,
          codesRemaining: data.codesRemaining || 3,
        });
      } else {
        setEmailError(data.error || "Failed to send verification code");
      }
    } catch (error) {
      setEmailError("Failed to send verification code. Please try again.");
    } finally {
      setIsSendingEmailCode(false);
    }
  };

  const handleVerifyEmailCode = async () => {
    if (!email) {
      setEmailError("Email is required");
      return;
    }

    if (!emailCode || emailCode.length !== 6) {
      setEmailError("Please enter a valid 6-digit verification code");
      return;
    }

    setIsVerifyingEmailCode(true);
    setEmailError("");

    try {
      const response = await fetch("/api/auth/email-verification/verify-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code: emailCode }),
      });

      const data = await response.json();

      if (data.success && data.verified) {
        setIsEmailVerified(true);
        setEmailError("");
        setEmailCodeExpirationTime(null);
        setEmailTimeRemaining(0);
        // Update user record
        await updateUserVerification("email", true);
      } else {
        setEmailError(data.error || "Invalid verification code");
      }
    } catch (error) {
      setEmailError("Failed to verify code. Please try again.");
    } finally {
      setIsVerifyingEmailCode(false);
    }
  };

  // Phone verification handlers
  const handleSendPhoneCode = async () => {
    if (!phone) {
      setPhoneError(t("phone.sending"));
      return;
    }

    const normalizedPhone = normalizePhoneNumber(phone, countryCode);

    setIsSendingPhoneCode(true);
    setPhoneError("");

    try {
      const response = await fetch("/api/auth/phone-verification/send-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: normalizedPhone }),
      });

      const data = await response.json();

      if (data.success) {
        const expiration = new Date(Date.now() + 5 * 60 * 1000);
        setPhoneCodeExpirationTime(expiration);
        setPhoneTimeRemaining(300);
        setPhoneVerificationStatus({
          canRequestNewCode: data.codesRemaining > 0,
          codesRemaining: data.codesRemaining || 3,
        });
      } else {
        setPhoneError(data.error || "Failed to send verification code");
      }
    } catch (error) {
      setPhoneError("Failed to send verification code. Please try again.");
    } finally {
      setIsSendingPhoneCode(false);
    }
  };

  const handleVerifyPhoneCode = async () => {
    if (!phone) {
      setPhoneError("Phone number is required");
      return;
    }

    const normalizedPhone = normalizePhoneNumber(phone, countryCode);

    if (!phoneCode || phoneCode.length !== 6) {
      setPhoneError("Please enter a valid 6-digit verification code");
      return;
    }

    setIsVerifyingPhoneCode(true);
    setPhoneError("");

    try {
      const response = await fetch("/api/auth/phone-verification/verify-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: normalizedPhone, code: phoneCode }),
      });

      const data = await response.json();

      if (data.success && data.verified) {
        setIsPhoneVerified(true);
        setPhoneError("");
        setPhoneCodeExpirationTime(null);
        setPhoneTimeRemaining(0);
        // Update user record
        await updateUserVerification("phone", true);
      } else {
        setPhoneError(data.error || "Invalid verification code");
      }
    } catch (error) {
      setPhoneError("Failed to verify code. Please try again.");
    } finally {
      setIsVerifyingPhoneCode(false);
    }
  };

  // Update user verification status in database
  const updateUserVerification = async (
    type: "email" | "phone",
    verified: boolean,
  ) => {
    try {
      const normalizedEmail = email.toLowerCase().trim();
      const normalizedPhone = normalizePhoneNumber(phone, countryCode);

      const response = await fetch("/api/auth/update-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: type === "email" ? normalizedEmail : undefined,
          phone: type === "phone" ? normalizedPhone : undefined,
          type,
          verified,
        }),
      });

      if (!response.ok) {
        console.error(`Failed to update ${type} verification status`);
      }
    } catch (error) {
      console.error(`Failed to update ${type} verification status:`, error);
    }
  };

  // Check verification status once on mount. Re-running after email/phone
  // changes would be redundant — the edit flow always resets the field to
  // unverified server-side, so a refetch would just confirm what we know.
  useEffect(() => {
    if (isEmailVerified && isPhoneVerified) return;
    if (!email && !phone) return;

    const checkVerificationStatus = async () => {
      try {
        const response = await fetch("/api/auth/check-verification-status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: email.toLowerCase().trim(),
            phone: normalizePhoneNumber(phone, countryCode),
          }),
        });

        if (response.ok) {
          const data = await response.json();
          if (data.emailVerified) setIsEmailVerified(true);
          if (data.phoneVerified) setIsPhoneVerified(true);
        }
      } catch (error) {
        console.error("Failed to check verification status:", error);
      }
    };

    checkVerificationStatus();
    // Intentionally mount-only: the edit flow manages verified state locally.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Redirect if no email or phone
  useEffect(() => {
    if (!email || !phone) {
      router.replace("/signup");
    }
  }, [email, phone, router]);

  // Auto-verify email code when 6 digits are entered
  useEffect(() => {
    if (
      emailCode.length === 6 &&
      !isEmailVerified &&
      !isVerifyingEmailCode &&
      emailCodeExpirationTime &&
      emailTimeRemaining > 0 &&
      email
    ) {
      // Small delay to ensure user finished typing
      const timer = setTimeout(async () => {
        if (!email) {
          setEmailError("Email is required");
          return;
        }

        if (emailCode.length !== 6) {
          setEmailError("Please enter a valid 6-digit verification code");
          return;
        }

        setIsVerifyingEmailCode(true);
        setEmailError("");

        try {
          const response = await fetch(
            "/api/auth/email-verification/verify-code",
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ email, code: emailCode }),
            },
          );

          const data = await response.json();

          if (data.success && data.verified) {
            setIsEmailVerified(true);
            setEmailError("");
            setEmailCodeExpirationTime(null);
            setEmailTimeRemaining(0);
            // Update user record
            await updateUserVerification("email", true);
          } else {
            setEmailError(data.error || "Invalid verification code");
          }
        } catch (error) {
          setEmailError("Failed to verify code. Please try again.");
        } finally {
          setIsVerifyingEmailCode(false);
        }
      }, 300);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    emailCode,
    isEmailVerified,
    isVerifyingEmailCode,
    emailCodeExpirationTime,
    emailTimeRemaining,
    email,
  ]);

  // Auto-verify phone code when 6 digits are entered
  useEffect(() => {
    if (
      phoneCode.length === 6 &&
      !isPhoneVerified &&
      !isVerifyingPhoneCode &&
      phoneCodeExpirationTime &&
      phoneTimeRemaining > 0 &&
      phone
    ) {
      // Small delay to ensure user finished typing
      const timer = setTimeout(async () => {
        if (!phone) {
          setPhoneError("Phone number is required");
          return;
        }

        const normalizedPhone = normalizePhoneNumber(phone, countryCode);

        if (phoneCode.length !== 6) {
          setPhoneError("Please enter a valid 6-digit verification code");
          return;
        }

        setIsVerifyingPhoneCode(true);
        setPhoneError("");

        try {
          const response = await fetch(
            "/api/auth/phone-verification/verify-code",
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ phone: normalizedPhone, code: phoneCode }),
            },
          );

          const data = await response.json();

          if (data.success && data.verified) {
            setIsPhoneVerified(true);
            setPhoneError("");
            setPhoneCodeExpirationTime(null);
            setPhoneTimeRemaining(0);
            // Update user record
            await updateUserVerification("phone", true);
          } else {
            setPhoneError(data.error || "Invalid verification code");
          }
        } catch (error) {
          setPhoneError("Failed to verify code. Please try again.");
        } finally {
          setIsVerifyingPhoneCode(false);
        }
      }, 300);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    phoneCode,
    isPhoneVerified,
    isVerifyingPhoneCode,
    phoneCodeExpirationTime,
    phoneTimeRemaining,
    phone,
    countryCode,
  ]);

  const displayPhone = formatPhoneForDisplay(phone, countryCode);
  const canContinue = isEmailVerified && isPhoneVerified;
  const isBothVerified = isEmailVerified && isPhoneVerified;

  return (
    <div className="min-h-screen flex flex-col lg:flex-row relative">
      {/* Animated Gradient Background */}
      <motion.div
        className="absolute inset-0 z-0"
        style={{
          background:
            "linear-gradient(135deg, #dbeafe 0%, #88f5c3 25%, #a7f3d0 50%, #bfdbfe 75%, #d4fce8 100%)",
          backgroundSize: "400% 400%",
        }}
        animate={{
          backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          repeatType: "mirror",
          ease: "easeInOut",
        }}
      />

      {/* Left Side Content - Hidden on mobile, shown on desktop */}
      <div className="hidden lg:flex flex-1 items-center justify-center px-8 lg:px-16 z-10">
        <motion.div
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="max-w-lg text-black"
        >
          <h1 className="text-4xl lg:text-5xl font-bold mb-6 leading-tight">
            {t("title")}
          </h1>
          <p className="text-lg lg:text-xl text-black/80 leading-relaxed">
            {t("subtitle")}
          </p>
        </motion.div>
      </div>

      {/* Verification Form - Full width on mobile, half width on desktop */}
      <div className="w-full lg:w-1/2 flex items-center justify-center px-4 lg:px-8 xl:px-16 z-10 min-h-screen lg:min-h-0">
        <motion.div
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
          className="w-full max-w-2xl"
        >
          <div className="bg-white rounded-2xl lg:rounded-3xl p-6 lg:p-12 shadow-2xl max-h-[90vh] min-h-screen lg:min-h-[700px] overflow-y-auto hide-scrollbar">
            <div className="text-center mb-6 lg:mb-8">
              <h2 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-2 lg:mb-3">
                {t("title")}
              </h2>
              <p className="text-base lg:text-lg text-gray-600">
                {t("subtitle")}
              </p>
            </div>

            {/* Success Message - When email is verified */}
            {canContinue && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-green-50 border-2 border-green-200 rounded-xl p-6 mb-6"
              >
                <div className="flex items-center justify-center mb-4">
                  <svg
                    className="w-16 h-16 text-green-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-green-800 text-center mb-2">
                  {isBothVerified ? t("bothVerified") : t("email.verified")}
                </h3>
                <p className="text-center text-green-700">
                  {tCommon("messages.createdSuccessfully")}{" "}
                  {isBothVerified ? "" : t("subtitle") + ". "}
                  {tCommon("messages.info")}
                </p>
                <div className="mt-6 text-center">
                  <Link
                    href="/login"
                    className="inline-block px-6 py-3 bg-green-600 text-white font-semibold rounded-xl hover:bg-green-700 transition-colors duration-200"
                  >
                    {tCommon("back")} {tCommon("auth.signIn")}
                  </Link>
                </div>
              </motion.div>
            )}

            {/* Email Verification Section */}
            <div className="mb-6">
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">
                      {t("email.title")}
                    </h3>
                    {!isEditingEmail ? (
                      <div className="flex items-center gap-2">
                        <p className="text-sm text-gray-600 truncate">
                          {email
                            ? `${t("email.verify")} ${email}`
                            : tCommon("auth.email")}
                        </p>
                        {!isEmailVerified && (
                          <button
                            type="button"
                            onClick={() => {
                              setTempEmail(email);
                              setIsEditingEmail(true);
                              setUpdateEmailError("");
                            }}
                            className="shrink-0 text-xs text-blue-600 hover:text-blue-700 underline"
                          >
                            {t("edit.edit")}
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="mt-3 space-y-3">
                        <input
                          type="email"
                          value={tempEmail}
                          onChange={(e) => {
                            setTempEmail(e.target.value);
                            setUpdateEmailError("");
                          }}
                          className="w-full px-4 py-3 text-base border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent text-black placeholder:text-gray-500"
                          placeholder={t("edit.newEmailPlaceholder")}
                          autoComplete="off"
                        />
                        {updateEmailError && (
                          <p className="text-sm text-red-600">
                            {updateEmailError}
                          </p>
                        )}
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => handleSaveContact("email")}
                            disabled={isUpdatingEmail}
                            className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-xl hover:bg-green-700 disabled:opacity-50 transition-colors"
                          >
                            {isUpdatingEmail
                              ? t("edit.saving")
                              : t("edit.save")}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setIsEditingEmail(false);
                              setUpdateEmailError("");
                            }}
                            className="px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-200 transition-colors"
                          >
                            {t("edit.cancel")}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                  {isEmailVerified && (
                    <div className="flex items-center justify-center w-10 h-10 bg-green-500 rounded-full">
                      <svg
                        className="w-6 h-6 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    </div>
                  )}
                </div>

                {!isEmailVerified && (
                  <>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleSendEmailCode}
                        disabled={
                          isSendingEmailCode ||
                          !emailVerificationStatus.canRequestNewCode
                        }
                        className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-colors"
                      >
                        {isSendingEmailCode
                          ? t("email.sending")
                          : t("email.sendCode")}
                      </button>
                      {emailTimeRemaining > 0 && (
                        <div className="flex items-center px-4 text-sm text-gray-600">
                          {t("email.timeRemaining")}{" "}
                          {formatTime(emailTimeRemaining)}
                        </div>
                      )}
                    </div>

                    {!emailVerificationStatus.canRequestNewCode && (
                      <p className="text-xs text-gray-600">
                        {emailVerificationStatus.codesRemaining === 0
                          ? t("email.cannotRequest")
                          : `${emailVerificationStatus.codesRemaining} ${t("email.codesRemaining")}`}
                      </p>
                    )}

                    {emailCodeExpirationTime && (
                      <div className="space-y-3">
                        <input
                          type="text"
                          maxLength={6}
                          value={emailCode}
                          onChange={(e) => {
                            const value = e.target.value
                              .replace(/\D/g, "")
                              .slice(0, 6);
                            setEmailCode(value);
                            setEmailError("");
                          }}
                          placeholder={t("email.enterCode")}
                          className="w-full px-4 py-3 text-lg border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-center tracking-widest font-mono text-black placeholder:text-gray-500"
                        />
                        {isVerifyingEmailCode && (
                          <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
                            <svg
                              className="animate-spin h-4 w-4"
                              xmlns="http://www.w3.org/2000/svg"
                              fill="none"
                              viewBox="0 0 24 24"
                            >
                              <circle
                                className="opacity-25"
                                cx="12"
                                cy="12"
                                r="10"
                                stroke="currentColor"
                                strokeWidth="4"
                              ></circle>
                              <path
                                className="opacity-75 animate-spin"
                                fill="currentColor"
                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                              ></path>
                            </svg>
                            <span>{t("email.verifying")}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {emailError && (
                      <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
                        {emailError}
                      </div>
                    )}
                  </>
                )}

                {isEmailVerified && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <p className="text-sm text-green-700 font-medium flex items-center gap-2">
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      {t("email.verified")}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Phone Verification Section */}
            <div className="mb-6">
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">
                      {t("phone.title")}
                    </h3>
                    {!isEditingPhone ? (
                      <div className="flex items-center gap-2">
                        <p className="text-sm text-gray-600 truncate">
                          {displayPhone
                            ? `${t("phone.verify")} ${displayPhone}`
                            : tCommon("auth.phoneNumber")}
                        </p>
                        {!isPhoneVerified && (
                          <button
                            type="button"
                            onClick={() => {
                              const ccDigits = countryCode.replace(/\D/g, "");
                              const allDigits = phone.replace(/\D/g, "");
                              const local = allDigits.startsWith(ccDigits)
                                ? allDigits.slice(ccDigits.length)
                                : allDigits;
                              setTempPhone(local);
                              setTempCountryCode(countryCode);
                              setIsEditingPhone(true);
                              setUpdatePhoneError("");
                            }}
                            className="shrink-0 text-xs text-blue-600 hover:text-blue-700 underline"
                          >
                            {t("edit.edit")}
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="mt-3 space-y-3">
                        <div className="flex gap-2">
                          <div className="relative">
                            <input
                              ref={editCountryCodeInputRef}
                              type="text"
                              value={
                                isEditCountryCodeOpen
                                  ? editCountryCodeSearch
                                  : tempCountryCode
                              }
                              onChange={(e) => {
                                setEditCountryCodeSearch(e.target.value);
                                setIsEditCountryCodeOpen(true);
                              }}
                              onFocus={() => {
                                setEditCountryCodeSearch(tempCountryCode);
                                setIsEditCountryCodeOpen(true);
                              }}
                              placeholder="+1"
                              className="w-24 px-3 py-3 text-base border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent text-black placeholder:text-gray-500"
                              autoComplete="off"
                            />
                            {isEditCountryCodeOpen && (
                              <div
                                ref={editCountryCodeDropdownRef}
                                className="absolute z-50 w-56 mt-1 bg-white rounded-xl border border-gray-200 shadow-lg max-h-52 overflow-y-auto"
                              >
                                <div className="py-1">
                                  {filteredEditCountryCodes.map((cc) => (
                                    <button
                                      key={cc.code}
                                      type="button"
                                      onClick={() => {
                                        setTempCountryCode(cc.code);
                                        setIsEditCountryCodeOpen(false);
                                        setEditCountryCodeSearch("");
                                      }}
                                      className="w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center gap-2"
                                    >
                                      <span>{cc.flag}</span>
                                      <span className="text-sm text-gray-900">
                                        {cc.code} {cc.country}
                                      </span>
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                          <input
                            type="tel"
                            value={tempPhone}
                            onChange={(e) => {
                              setTempPhone(e.target.value);
                              setUpdatePhoneError("");
                            }}
                            className="flex-1 px-4 py-3 text-base border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent text-black placeholder:text-gray-500"
                            placeholder={t("edit.phonePlaceholder")}
                          />
                        </div>
                        {updatePhoneError && (
                          <p className="text-sm text-red-600">
                            {updatePhoneError}
                          </p>
                        )}
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => handleSaveContact("phone")}
                            disabled={isUpdatingPhone}
                            className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-xl hover:bg-green-700 disabled:opacity-50 transition-colors"
                          >
                            {isUpdatingPhone
                              ? t("edit.saving")
                              : t("edit.save")}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setIsEditingPhone(false);
                              setUpdatePhoneError("");
                            }}
                            className="px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-200 transition-colors"
                          >
                            {t("edit.cancel")}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                  {isPhoneVerified && (
                    <div className="flex items-center justify-center w-10 h-10 bg-green-500 rounded-full">
                      <svg
                        className="w-6 h-6 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    </div>
                  )}
                </div>

                {!isPhoneVerified && (
                  <>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleSendPhoneCode}
                        disabled={
                          isSendingPhoneCode ||
                          !phoneVerificationStatus.canRequestNewCode
                        }
                        className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-colors"
                      >
                        {isSendingPhoneCode
                          ? t("phone.sending")
                          : t("phone.sendCode")}
                      </button>
                      {phoneTimeRemaining > 0 && (
                        <div className="flex items-center px-4 text-sm text-gray-600">
                          {t("phone.timeRemaining")}{" "}
                          {formatTime(phoneTimeRemaining)}
                        </div>
                      )}
                    </div>

                    {!phoneVerificationStatus.canRequestNewCode && (
                      <p className="text-xs text-gray-600">
                        {phoneVerificationStatus.codesRemaining === 0
                          ? t("phone.cannotRequest")
                          : `${phoneVerificationStatus.codesRemaining} ${t("phone.codesRemaining")}`}
                      </p>
                    )}

                    {phoneCodeExpirationTime && (
                      <div className="space-y-3">
                        <input
                          type="text"
                          maxLength={6}
                          value={phoneCode}
                          onChange={(e) => {
                            const value = e.target.value
                              .replace(/\D/g, "")
                              .slice(0, 6);
                            setPhoneCode(value);
                            setPhoneError("");
                          }}
                          placeholder={t("phone.enterCode")}
                          className="w-full px-4 py-3 text-lg border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-center tracking-widest font-mono text-black placeholder:text-gray-500"
                        />
                        {isVerifyingPhoneCode && (
                          <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
                            <svg
                              className="animate-spin h-4 w-4"
                              xmlns="http://www.w3.org/2000/svg"
                              fill="none"
                              viewBox="0 0 24 24"
                            >
                              <circle
                                className="opacity-25"
                                cx="12"
                                cy="12"
                                r="10"
                                stroke="currentColor"
                                strokeWidth="4"
                              ></circle>
                              <path
                                className="opacity-75 animate-spin"
                                fill="currentColor"
                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                              ></path>
                            </svg>
                            <span>{t("phone.verifying")}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {phoneError && (
                      <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
                        {phoneError}
                      </div>
                    )}
                  </>
                )}

                {isPhoneVerified && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <p className="text-sm text-green-700 font-medium flex items-center gap-2">
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      {t("phone.verified")}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

export default function VerifyPage() {
  const tCommon = useTranslations("common");

  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">{tCommon("loading")}</p>
          </div>
        </div>
      }
    >
      <VerifyPageContent />
    </Suspense>
  );
}
