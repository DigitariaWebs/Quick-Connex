"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { useLoginForm } from "@/hooks/auth/useLoginForm";
import { FormInput } from "@/components/shared/forms/FormInput";
import { SubmitButton } from "@/components/shared/forms/SubmitButton";
import { Icon } from "@/components/shared/ui/icons/Icon";
import { LOGO_PATH, ASSETS } from "@/constants";
import { LanguageSwitcher } from "@/components/shared/LanguageSwitcher";

function LoginForm() {
  const t = useTranslations();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isLoading, message, handleSubmit } = useLoginForm();
  const [showPassword, setShowPassword] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  // Authentication check is handled by middleware
  // If user is already authenticated, middleware will redirect them

  // Check for success message from signup
  useEffect(() => {
    const message = searchParams.get("message");
    if (message === "account-created") {
      setSuccessMessage(t("auth.accountCreated"));
      // Clear the URL parameter after showing the message
      const url = new URL(window.location.href);
      url.searchParams.delete("message");
      window.history.replaceState({}, "", url.toString());
    } else if (message === "account-pending-approval") {
      setSuccessMessage(t("auth.accountPendingApproval"));
      // Clear the URL parameter after showing the message
      const url = new URL(window.location.href);
      url.searchParams.delete("message");
      window.history.replaceState({}, "", url.toString());
    } else if (message === "password-reset-success") {
      setSuccessMessage(t("auth.passwordResetSuccess"));
      // Clear the URL parameter after showing the message
      const url = new URL(window.location.href);
      url.searchParams.delete("message");
      window.history.replaceState({}, "", url.toString());
    }
  }, [searchParams]);

  // Authentication check is handled by middleware
  // If user is already authenticated, middleware will redirect them

  return (
    <div className="min-h-screen flex flex-col lg:flex-row relative">
      {/* Background Image */}
      <div
        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: `url(${ASSETS.images.background})`,
        }}
      />
      {/* Dark Overlay for better text readability */}
      <div className="absolute inset-0 z-0 bg-black/40" />

      {/* Left Side Content - Hidden on mobile, shown on desktop */}
      <div className="hidden lg:flex flex-1 items-center justify-center px-8 lg:px-16 z-10">
        <motion.div
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="max-w-lg text-white"
        >
          <h1 className="text-4xl lg:text-5xl font-bold mb-6 leading-tight drop-shadow-lg">
            {t("auth.motto")}
          </h1>
          <p className="text-lg lg:text-xl text-white/90 leading-relaxed drop-shadow-md">
            {t("auth.tagline")}
          </p>
        </motion.div>
      </div>

      {/* Login Form - Full width on mobile, half width on desktop */}
      <div className="w-full lg:w-1/2 flex items-center justify-center px-4 lg:px-8 xl:px-16 z-10 min-h-screen lg:min-h-0">
        <motion.div
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
          className="w-full max-w-2xl"
        >
          <div className="bg-white rounded-2xl lg:rounded-3xl p-6 lg:p-12 shadow-2xl max-h-[90vh] min-h-screen lg:min-h-[700px] overflow-y-auto">
            <div className="text-center mb-6 lg:mb-10">
              <div className="flex justify-center mb-4 lg:mb-6">
                <img
                  src={LOGO_PATH}
                  alt="Quick Connex Logo"
                  className="h-auto w-auto max-w-[200px]"
                />
              </div>
              <h2 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-2 lg:mb-3">
                {t("auth.signIn")}
              </h2>
              <div className="flex justify-center mt-4">
                <LanguageSwitcher />
              </div>
            </div>

            {/* Success Message from Signup */}
            {successMessage && (
              <div className="rounded-lg p-3 mb-6 text-sm bg-green-50 text-green-700 border border-green-200">
                {successMessage}
              </div>
            )}

            {/* Status Message */}
            {message.text && (
              <div
                className={`rounded-lg p-3 mb-6 text-sm ${
                  message.type === "success"
                    ? "bg-green-50 text-green-700 border border-green-200"
                    : message.type === "warning"
                      ? "bg-yellow-50 text-yellow-700 border border-yellow-200"
                      : "bg-red-50 text-red-700 border border-red-200"
                }`}
              >
                {message.text}
              </div>
            )}

            <form className="space-y-4 lg:space-y-6" onSubmit={handleSubmit}>
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm lg:text-base font-medium text-gray-700 mb-2 lg:mb-3"
                >
                  {t("auth.email")}
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  className="w-full px-4 lg:px-5 py-3 lg:py-4 text-base lg:text-lg border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200 placeholder:text-gray-500 text-black"
                  placeholder={t("auth.enterEmail")}
                />
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="block text-sm lg:text-base font-medium text-gray-700 mb-2 lg:mb-3"
                >
                  {t("auth.password")}
                </label>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    required
                    className="w-full px-4 lg:px-5 py-3 lg:py-4 text-base lg:text-lg border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200 pr-12 placeholder:text-gray-500 text-black"
                    placeholder={t("auth.enterPassword")}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors duration-200"
                  >
                    {showPassword ? (
                      <svg
                        className="h-5 w-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21"
                        />
                      </svg>
                    ) : (
                      <svg
                        className="h-5 w-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                        />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <div className="pt-4 lg:pt-6">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-green-500 hover:bg-green-600 text-white font-semibold py-3 lg:py-4 px-6 text-base lg:text-lg rounded-xl transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
                >
                  {isLoading ? t("auth.signingIn") : t("auth.signIn")}
                </button>
              </div>
            </form>

            <div className="text-center mt-4">
              <button
                type="button"
                onClick={() => {
                  console.log("Forgot password button clicked!");
                  console.log("Current URL:", window.location.href);
                  try {
                    router.push("/forgot-password");
                  } catch (error) {
                    console.error("Router error:", error);
                    window.location.href = "/forgot-password";
                  }
                }}
                className="text-sm text-green-600 hover:text-green-500 transition-colors duration-200 cursor-pointer underline bg-transparent border-none p-2 min-h-[44px] flex items-center justify-center"
              >
                {t("auth.forgotPassword")}
              </button>
            </div>

            <p className="text-center text-sm lg:text-base text-gray-600 mt-6 lg:mt-8">
              {t("auth.dontHaveAccount")}{" "}
              <Link
                href="/signup"
                className="font-medium text-green-600 hover:text-green-500 transition-colors duration-200"
              >
                {t("auth.signUp")}
              </Link>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  const t = useTranslations("common");

  return (
    <Suspense fallback={<div>{t("loading")}</div>}>
      <LoginForm />
    </Suspense>
  );
}
