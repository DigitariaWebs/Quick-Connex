"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { useLoginForm } from "@/hooks/useLoginForm";
import { FormInput } from "@/components/forms/FormInput";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { Icon } from "@/components/forms/Icon";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isLoading, message, handleSubmit } = useLoginForm();
  const [showPassword, setShowPassword] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  // Check for success message from signup
  useEffect(() => {
    const message = searchParams.get("message");
    if (message === "account-created") {
      setSuccessMessage(
        "Account created successfully! Please log in with your credentials."
      );
      // Clear the URL parameter after showing the message
      const url = new URL(window.location.href);
      url.searchParams.delete("message");
      window.history.replaceState({}, "", url.toString());
    } else if (message === "account-pending-approval") {
      setSuccessMessage(
        "Account created successfully! Your registration is pending approval. You will receive an email notification once approved."
      );
      // Clear the URL parameter after showing the message
      const url = new URL(window.location.href);
      url.searchParams.delete("message");
      window.history.replaceState({}, "", url.toString());
    }
  }, [searchParams]);

  // Redirect if already authenticated
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch("/api/auth/verify", {
          method: "GET",
          credentials: "include",
        });

        if (response.ok) {
          router.push("/dashboard");
        }
      } catch (error) {
        // User is not authenticated, stay on login page
        console.log("User not authenticated");
      }
    };

    checkAuth();
  }, [router]);

  return (
    <div className="min-h-screen flex relative">
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

      {/* Left Side Content */}
      <div className="flex-1 flex items-center justify-center px-8 lg:px-16 z-10">
        <motion.div
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="max-w-lg text-black"
        >
          <h1 className="text-4xl lg:text-5xl font-bold mb-6 leading-tight">
            Fast, Efficient and Productive
          </h1>
          <p className="text-lg lg:text-xl text-black/80 leading-relaxed">
            Access your patient management account with our secure and
            streamlined platform
          </p>
        </motion.div>
      </div>

      {/* Right Side - Login Form */}
      <div className="w-1/2 flex items-center justify-center px-8 lg:px-16 z-10">
        <motion.div
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
          className="w-full max-w-2xl"
        >
          <div className="bg-white rounded-3xl p-12 shadow-2xl max-h-[90vh] min-h-[700px] overflow-y-auto">
            <div className="text-center mb-10">
              <h2 className="text-3xl font-bold text-gray-900 mb-3">Sign In</h2>
              <p className="text-lg text-gray-600">
                Access your patient management account
              </p>
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

            <form className="space-y-6" onSubmit={handleSubmit}>
              <div>
                <label
                  htmlFor="email"
                  className="block text-base font-medium text-gray-700 mb-3"
                >
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  className="w-full px-5 py-4 text-lg border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200 placeholder:text-gray-500 text-black"
                  placeholder="Enter your email"
                />
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="block text-base font-medium text-gray-700 mb-3"
                >
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    required
                    className="w-full px-5 py-4 text-lg border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200 pr-12 placeholder:text-gray-500 text-black"
                    placeholder="Enter your password"
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

              <div className="pt-6">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-green-500 hover:bg-green-600 text-white font-semibold py-4 px-6 text-lg rounded-xl transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? "Signing In..." : "Sign In"}
                </button>
              </div>
            </form>

            <p className="text-center text-base text-gray-600 mt-8">
              Don't have an account?{" "}
              <Link
                href="/signup"
                className="font-medium text-green-600 hover:text-green-500 transition-colors duration-200"
              >
                Sign Up
              </Link>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
