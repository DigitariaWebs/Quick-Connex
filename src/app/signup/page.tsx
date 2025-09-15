"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useSignUpForm } from "@/hooks/useSignUpForm";
import { FormInput } from "@/components/forms/FormInput";
import { FileUpload } from "@/components/forms/FileUpload";
import { SelectInput } from "@/components/forms/SelectInput";
import { UserTypeButton } from "@/components/forms/UserTypeButton";
import { RoleSpecificFields } from "@/components/forms/RoleSpecificFields";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { Icon } from "@/components/forms/Icon";
import { CLASS_OPTIONS } from "@/components/forms/formConfig";

export default function SignUpPage() {
  const { userType, setUserType, isLoading, message, handleSubmit } =
    useSignUpForm();

  return (
    <div className="min-h-screen flex relative">
      {/* Animated Gradient Background */}
      <motion.div
        className="absolute inset-0 z-0"
        style={{
          background:
            "linear-gradient(135deg, #d4fce8 0%, #88f5c3 50%, #c7fce0 100%)",
          backgroundSize: "400% 400%",
        }}
        animate={{
          backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
        }}
        transition={{
          duration: 20,
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
          className="max-w-lg text-white"
        >
          <h1 className="text-4xl lg:text-5xl font-bold mb-6 leading-tight">
            Fast, Efficient and Productive
          </h1>
          <p className="text-lg lg:text-xl text-white/80 leading-relaxed">
            Join our patient management platform and streamline your healthcare
            workflow
          </p>
        </motion.div>
      </div>

      {/* Right Side - Signup Form */}
      <div className="flex items-center justify-center px-8 lg:px-16 z-10">
        <motion.div
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
          className="w-full max-w-md"
        >
          <div className="bg-white rounded-3xl p-8 shadow-2xl max-h-[90vh] min-h-[600px] overflow-y-auto">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Sign Up</h2>
              <p className="text-gray-600">Your Patient Management Platform</p>
            </div>

            {/* User Type Selection */}
            <div className="flex rounded-lg overflow-hidden bg-gray-50 mb-6">
              <UserTypeButton
                type="employee"
                currentType={userType}
                onClick={() => setUserType("employee")}
              />
              <UserTypeButton
                type="manager"
                currentType={userType}
                onClick={() => setUserType("manager")}
              />
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

            <form className="space-y-4" onSubmit={handleSubmit}>
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
                  placeholder="Enter your email"
                />
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type="password"
                    required
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200 pr-10"
                    placeholder="Enter your password"
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                  >
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
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Use 8 or more characters with a mix of letters, numbers &
                  symbols
                </p>
              </div>

              <div>
                <label
                  htmlFor="repeat-password"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Repeat Password
                </label>
                <input
                  id="repeat-password"
                  name="repeat-password"
                  type="password"
                  required
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
                  placeholder="Repeat your password"
                />
              </div>

              <div className="flex items-center text-sm">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    required
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-gray-600">
                    I accept the{" "}
                    <Link href="#" className="text-green-600 hover:underline">
                      Terms
                    </Link>
                  </span>
                </label>
              </div>

              {/* Name Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="firstName"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    First Name
                  </label>
                  <input
                    id="firstName"
                    name="firstName"
                    type="text"
                    required
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
                    placeholder="John"
                  />
                </div>
                <div>
                  <label
                    htmlFor="lastName"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Last Name
                  </label>
                  <input
                    id="lastName"
                    name="lastName"
                    type="text"
                    required
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
                    placeholder="Doe"
                  />
                </div>
              </div>

              {/* Phone Field */}
              <div>
                <label
                  htmlFor="phone"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Phone Number
                </label>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  required
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
                  placeholder="(123) 456-7890"
                />
              </div>

              {/* Employee Specific Fields */}
              {userType === "employee" && (
                <>
                  <div>
                    <label
                      htmlFor="cv"
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      CV Document
                    </label>
                    <input
                      id="cv"
                      name="cv"
                      type="file"
                      accept=".pdf,.doc,.docx"
                      required
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="opiqPermit"
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      OPIQ Permit
                    </label>
                    <input
                      id="opiqPermit"
                      name="opiqPermit"
                      type="file"
                      accept=".pdf,.doc,.docx"
                      required
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="rcr"
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      RCR Document
                    </label>
                    <input
                      id="rcr"
                      name="rcr"
                      type="file"
                      accept=".pdf,.doc,.docx"
                      required
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
                    />
                  </div>
                </>
              )}

              {/* Manager Specific Fields */}
              {userType === "manager" && (
                <>
                  <div>
                    <label
                      htmlFor="post"
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      Post
                    </label>
                    <input
                      id="post"
                      name="post"
                      type="text"
                      required
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
                      placeholder="Head of Department"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="class"
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      Class
                    </label>
                    <div className="relative">
                      <select
                        id="class"
                        name="class"
                        required
                        className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200 appearance-none bg-white pr-10"
                      >
                        <option value="">Select Class</option>
                        <option value="A">Class A</option>
                        <option value="B">Class B</option>
                        <option value="C">Class C</option>
                      </select>
                      <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                        <svg
                          className="h-5 w-5 text-gray-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 9l-7 7-7-7"
                          />
                        </svg>
                      </div>
                    </div>
                  </div>
                </>
              )}

              <div className="pt-4">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-green-500 hover:bg-green-600 text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? "Creating Account..." : "Sign Up"}
                </button>
              </div>
            </form>

            <p className="text-center text-sm text-gray-600 mt-6">
              Already have an account?{" "}
              <Link
                href="/login"
                className="font-medium text-green-600 hover:text-green-500 transition-colors duration-200"
              >
                Sign In
              </Link>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
