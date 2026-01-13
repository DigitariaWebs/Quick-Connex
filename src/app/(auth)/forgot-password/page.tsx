"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { LOGO_PATH, ASSETS } from "@/constants";
import { LanguageSwitcher } from "@/components/shared/LanguageSwitcher";

export default function ForgotPasswordPage() {
  const t = useTranslations();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "" });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage({ text: "", type: "" });

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({
          text: data.message,
          type: "success",
        });
        setEmail(""); // Clear the form
      } else {
        setMessage({
          text: data.message || t("messages.serverError"),
          type: "error",
        });
      }
    } catch (error) {
      console.error("Error:", error);
      setMessage({
        text: t("messages.serverError"),
        type: "error",
      });
    } finally {
      setIsLoading(false);
    }
  };

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
            {t("forgotPassword.title")}
          </h1>
          <p className="text-lg lg:text-xl text-white/90 leading-relaxed drop-shadow-md">
            {t("forgotPassword.subtitle")}
          </p>
        </motion.div>
      </div>

      {/* Forgot Password Form - Full width on mobile, half width on desktop */}
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
                {t("forgotPassword.title")}
              </h2>
              <p className="text-sm lg:text-base text-gray-600">
                {t("forgotPassword.subtitle")}
              </p>
              <div className="flex justify-center mt-4">
                <LanguageSwitcher />
              </div>
            </div>

            {/* Status Message */}
            {message.text && (
              <div
                className={`rounded-lg p-3 mb-6 text-sm ${
                  message.type === "success"
                    ? "bg-green-50 text-green-700 border border-green-200"
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
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 lg:px-5 py-3 lg:py-4 text-base lg:text-lg border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200 placeholder:text-gray-500 text-black"
                  placeholder={t("auth.enterEmail")}
                />
              </div>

              <div className="pt-4 lg:pt-6">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-green-500 hover:bg-green-600 text-white font-semibold py-3 lg:py-4 px-6 text-base lg:text-lg rounded-xl transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
                >
                  {isLoading
                    ? t("forgotPassword.sending")
                    : t("forgotPassword.sendInstructions")}
                </button>
              </div>
            </form>

            <div className="text-center mt-6 lg:mt-8 space-y-4">
              <p className="text-sm lg:text-base text-gray-600">
                {t("forgotPassword.backToLogin")}{" "}
                <Link
                  href="/login"
                  className="font-medium text-green-600 hover:text-green-500 transition-colors duration-200"
                >
                  {t("auth.signIn")}
                </Link>
              </p>

              <p className="text-sm lg:text-base text-gray-600">
                {t("auth.dontHaveAccount")}{" "}
                <Link
                  href="/signup"
                  className="font-medium text-green-600 hover:text-green-500 transition-colors duration-200"
                >
                  {t("auth.signUp")}
                </Link>
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
