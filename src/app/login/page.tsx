"use client";

import { motion } from "framer-motion";
import { useLoginForm } from "@/hooks/useLoginForm";
import { FormInput } from "@/components/forms/FormInput";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { Icon } from "@/components/forms/Icon";

export default function LoginPage() {
  const { isLoading, message, handleSubmit } = useLoginForm();

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8 flex flex-col items-center justify-center relative">
      <div className="wave-bottom"></div>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: "easeOut" }}
        className="w-full max-w-md relative z-10"
      >
        <div className="glass-morphism rounded-xl overflow-hidden shadow-2xl">
          <motion.div
            className="bg-gradient-to-r from-green-500 to-emerald-600 py-6 px-8"
            initial={{ backgroundPosition: "0% 0%" }}
            animate={{ backgroundPosition: "100% 0%" }}
            transition={{
              duration: 15,
              repeat: Infinity,
              repeatType: "reverse",
              ease: "linear",
            }}
            style={{ backgroundSize: "200% 100%" }}
          >
            <h1 className="text-2xl font-bold text-white text-center">
              Sign In
            </h1>
            <p className="text-green-100 text-center text-sm mt-2">
              Access your patient management account
            </p>
          </motion.div>

          <div className="p-6">
            {/* Status Message */}
            {message.text && (
              <div
                className={`rounded-md p-3 mb-4 ${
                  message.type === "success"
                    ? "bg-green-50 text-green-700 dark:bg-green-900 dark:text-green-100"
                    : "bg-red-50 text-red-700 dark:bg-red-900 dark:text-red-100"
                }`}
              >
                {message.text}
              </div>
            )}

            <form className="space-y-5" onSubmit={handleSubmit}>
              <FormInput
                id="email"
                name="email"
                label="Email Address"
                type="email"
                placeholder="you@example.com"
                icon={<Icon name="email" />}
              />
              <FormInput
                id="password"
                name="password"
                label="Password"
                type="password"
                placeholder="••••••••"
                icon={<Icon name="lock" />}
              />

              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <input
                    id="remember-me"
                    name="remember-me"
                    type="checkbox"
                    className="h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
                  />
                  <label
                    htmlFor="remember-me"
                    className="ml-2 block text-sm text-gray-700 dark:text-gray-300"
                  >
                    Remember me
                  </label>
                </div>

                <div className="text-sm">
                  <a
                    href="#"
                    className="font-medium text-green-600 hover:text-green-500 dark:text-green-400 transition-colors duration-300 hover:underline"
                  >
                    Forgot password?
                  </a>
                </div>
              </div>

              <div className="pt-4">
                <SubmitButton isLoading={isLoading} label="Sign In" />
              </div>
            </form>

            <motion.div
              className="mt-8 text-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.5 }}
            >
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Don't have an account?{" "}
                <a
                  href="/signup"
                  className="font-medium text-green-600 hover:text-green-500 dark:text-green-400 transition-colors duration-300 hover:underline"
                >
                  Create one
                </a>
              </p>
            </motion.div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
