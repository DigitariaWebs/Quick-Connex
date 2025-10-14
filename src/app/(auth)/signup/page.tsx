"use client";

import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { useSignUpForm } from "@/hooks/auth/useSignUpForm";
import { FormInput } from "@/components/ui/forms/FormInput";
import { FileUpload } from "@/components/ui/forms/FileUpload";
import { SelectInput } from "@/components/ui/forms/SelectInput";
import { UserTypeButton } from "@/components/ui/forms/UserTypeButton";
import { RoleSpecificFields } from "@/components/ui/forms/RoleSpecificFields";
import { SubmitButton } from "@/components/ui/forms/SubmitButton";
import { Icon } from "@/components/ui/icons/Icon";
// Remove CIUSSS_OPTIONS import as we'll fetch from API
import { TermsModal } from "@/components/ui/modals/TermsModal";

export default function SignUpPage() {
  const {
    userType,
    setUserType,
    isLoading,
    message,
    fieldErrors,
    handleSubmit,
  } = useSignUpForm();
  const [isTermsModalOpen, setIsTermsModalOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showRepeatPassword, setShowRepeatPassword] = useState(false);
  const [managerHospitalId, setManagerHospitalId] = useState<string>("");
  const [hospitals, setHospitals] = useState<
    Array<{ _id: string; name: string }>
  >([]);
  const [hospitalSearchTerm, setHospitalSearchTerm] = useState<string>("");
  const [filteredHospitals, setFilteredHospitals] = useState<
    Array<{ _id: string; name: string }>
  >([]);
  const [isHospitalOpen, setIsHospitalOpen] = useState<boolean>(false);
  const [isHospitalLoading, setIsHospitalLoading] = useState<boolean>(false);
  const hospitalInputRef = useRef<HTMLInputElement>(null);
  const hospitalDropdownRef = useRef<HTMLDivElement>(null);
  const [ciusssSearchTerm, setCiusssSearchTerm] = useState<string>("");
  const [selectedCiusssId, setSelectedCiusssId] = useState<string>("");
  const [ciusssOptions, setCiusssOptions] = useState<
    Array<{ _id: string; code: string; name: string }>
  >([]);
  const [filteredCiusss, setFilteredCiusss] = useState<
    Array<{ _id: string; code: string; name: string }>
  >([]);
  const [isCiusssOpen, setIsCiusssOpen] = useState<boolean>(false);
  const [isCiusssLoading, setIsCiusssLoading] = useState<boolean>(false);
  const ciusssInputRef = useRef<HTMLInputElement>(null);
  const ciusssDropdownRef = useRef<HTMLDivElement>(null);
  const [postSearchTerm, setPostSearchTerm] = useState<string>("");
  const [filteredPosts, setFilteredPosts] = useState<
    Array<{ value: string; label: string }>
  >([]);
  const [isPostOpen, setIsPostOpen] = useState<boolean>(false);
  const postInputRef = useRef<HTMLInputElement>(null);
  const postDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadHospitals = async () => {
      try {
        setIsHospitalLoading(true);
        const response = await fetch("/api/hospitals?limit=100");
        const data = await response.json();
        if (data.success && Array.isArray(data.hospitals)) {
          setHospitals(data.hospitals);
          setFilteredHospitals(data.hospitals);
        }
      } catch (e) {
        console.error("Failed to load hospitals", e);
      } finally {
        setIsHospitalLoading(false);
      }
    };

    loadHospitals();

    // Load CIUSSS options from API
    const loadCiusss = async () => {
      try {
        setIsCiusssLoading(true);
        const response = await fetch("/api/ciusss?isActive=true");
        const data = await response.json();
        if (data.success && Array.isArray(data.ciusss)) {
          setCiusssOptions(data.ciusss);
          setFilteredCiusss(data.ciusss);
        }
      } catch (e) {
        console.error("Failed to load CIUSSS", e);
      } finally {
        setIsCiusssLoading(false);
      }
    };

    loadCiusss();

    // Initialize Post options
    const postOptions = [
      { value: "coordinateur", label: "Coordinateur" },
      { value: "assistant-chef", label: "Assistant-chef" },
      { value: "gestionnaire", label: "Gestionnaire" },
    ];
    setFilteredPosts(postOptions);

    function handleClickOutside(event: MouseEvent) {
      if (
        hospitalDropdownRef.current &&
        !hospitalDropdownRef.current.contains(event.target as Node) &&
        hospitalInputRef.current &&
        !hospitalInputRef.current.contains(event.target as Node)
      ) {
        setIsHospitalOpen(false);
      }
      if (
        ciusssDropdownRef.current &&
        !ciusssDropdownRef.current.contains(event.target as Node) &&
        ciusssInputRef.current &&
        !ciusssInputRef.current.contains(event.target as Node)
      ) {
        setIsCiusssOpen(false);
      }
      if (
        postDropdownRef.current &&
        !postDropdownRef.current.contains(event.target as Node) &&
        postInputRef.current &&
        !postInputRef.current.contains(event.target as Node)
      ) {
        setIsPostOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Helper function to get field errors
  const getFieldErrors = (fieldName: string) => {
    return fieldErrors[fieldName] || [];
  };

  // Helper function to check if field has errors
  const hasFieldError = (fieldName: string) => {
    return fieldErrors[fieldName] && fieldErrors[fieldName].length > 0;
  };

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
            Join our patient management platform and streamline your healthcare
            workflow
          </p>
        </motion.div>
      </div>

      {/* Right Side - Signup Form */}
      <div className="w-1/2 flex items-center justify-center px-8 lg:px-16 z-10">
        <motion.div
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
          className="w-full max-w-2xl"
        >
          <div className="bg-white rounded-3xl p-12 shadow-2xl max-h-[90vh] min-h-[700px] overflow-y-auto hide-scrollbar">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-3">Sign Up</h2>
              <p className="text-lg text-gray-600">
                Your Patient Management Platform
              </p>
            </div>

            {/* User Type Selection */}
            <div className="flex rounded-xl overflow-hidden bg-gray-50 mb-8">
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
                  className={`w-full px-5 py-4 text-lg border rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200 placeholder:text-gray-500 text-black ${
                    hasFieldError("email")
                      ? "border-red-300 bg-red-50"
                      : "border-gray-200"
                  }`}
                  placeholder="Enter your email"
                />
                {hasFieldError("email") && (
                  <div className="mt-2">
                    {getFieldErrors("email").map((error, index) => (
                      <p key={index} className="text-sm text-red-600">
                        {error}
                      </p>
                    ))}
                  </div>
                )}
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
                    className={`w-full px-5 py-4 text-lg border rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200 pr-12 placeholder:text-gray-500 text-black ${
                      hasFieldError("password")
                        ? "border-red-300 bg-red-50"
                        : "border-gray-200"
                    }`}
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
                {hasFieldError("password") ? (
                  <div className="mt-2">
                    {getFieldErrors("password").map((error, index) => (
                      <p key={index} className="text-sm text-red-600">
                        {error}
                      </p>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 mt-2">
                    Use 8 or more characters with a mix of letters, numbers &
                    symbols
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="repeat-password"
                  className="block text-base font-medium text-gray-700 mb-3"
                >
                  Repeat Password
                </label>
                <div className="relative">
                  <input
                    id="repeat-password"
                    name="repeat-password"
                    type={showRepeatPassword ? "text" : "password"}
                    required
                    className="w-full px-5 py-4 text-lg border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200 pr-12 placeholder:text-gray-500 text-black"
                    placeholder="Repeat your password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowRepeatPassword(!showRepeatPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors duration-200"
                  >
                    {showRepeatPassword ? (
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

              <div className="flex items-center text-base">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    required
                    className="h-5 w-5 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                  />
                  <span className="ml-3 text-gray-600">
                    I accept the{" "}
                    <button
                      type="button"
                      onClick={() => setIsTermsModalOpen(true)}
                      className="text-green-600 hover:underline cursor-pointer"
                    >
                      Terms
                    </button>
                  </span>
                </label>
              </div>

              {/* Name Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label
                    htmlFor="firstName"
                    className="block text-base font-medium text-gray-700 mb-3"
                  >
                    First Name
                  </label>
                  <input
                    id="firstName"
                    name="firstName"
                    type="text"
                    required
                    className={`w-full px-5 py-4 text-lg border rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200 placeholder:text-gray-500 text-black ${
                      hasFieldError("firstName")
                        ? "border-red-300 bg-red-50"
                        : "border-gray-200"
                    }`}
                    placeholder="John"
                  />
                  {hasFieldError("firstName") && (
                    <div className="mt-2">
                      {getFieldErrors("firstName").map((error, index) => (
                        <p key={index} className="text-sm text-red-600">
                          {error}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <label
                    htmlFor="lastName"
                    className="block text-base font-medium text-gray-700 mb-3"
                  >
                    Last Name
                  </label>
                  <input
                    id="lastName"
                    name="lastName"
                    type="text"
                    required
                    className={`w-full px-5 py-4 text-lg border rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200 placeholder:text-gray-500 text-black ${
                      hasFieldError("lastName")
                        ? "border-red-300 bg-red-50"
                        : "border-gray-200"
                    }`}
                    placeholder="Doe"
                  />
                  {hasFieldError("lastName") && (
                    <div className="mt-2">
                      {getFieldErrors("lastName").map((error, index) => (
                        <p key={index} className="text-sm text-red-600">
                          {error}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Phone Field */}
              <div>
                <label
                  htmlFor="phone"
                  className="block text-base font-medium text-gray-700 mb-3"
                >
                  Phone Number
                </label>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  required
                  className={`w-full px-5 py-4 text-lg border rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200 placeholder:text-gray-500 text-black ${
                    hasFieldError("phone")
                      ? "border-red-300 bg-red-50"
                      : "border-gray-200"
                  }`}
                  placeholder="(123) 456-7890"
                />
                {hasFieldError("phone") && (
                  <div className="mt-2">
                    {getFieldErrors("phone").map((error, index) => (
                      <p key={index} className="text-sm text-red-600">
                        {error}
                      </p>
                    ))}
                  </div>
                )}
              </div>

              {/* Employee Specific Fields */}
              {userType === "employee" && (
                <>
                  <div>
                    <label
                      htmlFor="cv"
                      className="block text-base font-medium text-gray-700 mb-3"
                    >
                      CV Document
                    </label>
                    <input
                      id="cv"
                      name="cv"
                      type="file"
                      accept=".pdf,.doc,.docx"
                      required
                      className={`w-full px-5 py-4 text-lg border rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200 placeholder:text-gray-500 text-black ${
                        hasFieldError("cv")
                          ? "border-red-300 bg-red-50"
                          : "border-gray-200"
                      }`}
                    />
                    {hasFieldError("cv") && (
                      <div className="mt-2">
                        {getFieldErrors("cv").map((error, index) => (
                          <p key={index} className="text-sm text-red-600">
                            {error}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <label
                      htmlFor="opiqPermit"
                      className="block text-base font-medium text-gray-700 mb-3"
                    >
                      OPIQ Permit
                    </label>
                    <input
                      id="opiqPermit"
                      name="opiqPermit"
                      type="file"
                      accept=".pdf,.doc,.docx"
                      required
                      className={`w-full px-5 py-4 text-lg border rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200 placeholder:text-gray-500 text-black ${
                        hasFieldError("opiqPermit")
                          ? "border-red-300 bg-red-50"
                          : "border-gray-200"
                      }`}
                    />
                    {hasFieldError("opiqPermit") && (
                      <div className="mt-2">
                        {getFieldErrors("opiqPermit").map((error, index) => (
                          <p key={index} className="text-sm text-red-600">
                            {error}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <label
                      htmlFor="rcr"
                      className="block text-base font-medium text-gray-700 mb-3"
                    >
                      RCR Document
                    </label>
                    <input
                      id="rcr"
                      name="rcr"
                      type="file"
                      accept=".pdf,.doc,.docx"
                      required
                      className={`w-full px-5 py-4 text-lg border rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200 placeholder:text-gray-500 text-black ${
                        hasFieldError("rcr")
                          ? "border-red-300 bg-red-50"
                          : "border-gray-200"
                      }`}
                    />
                    {hasFieldError("rcr") && (
                      <div className="mt-2">
                        {getFieldErrors("rcr").map((error, index) => (
                          <p key={index} className="text-sm text-red-600">
                            {error}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* Manager Specific Fields */}
              {userType === "manager" && (
                <>
                  <div>
                    <label
                      htmlFor="managerHospital"
                      className="block text-base font-medium text-gray-700 mb-3"
                    >
                      Hospital
                    </label>
                    <div className="relative">
                      <input
                        ref={hospitalInputRef}
                        type="text"
                        id="managerHospital"
                        name="managerHospital"
                        value={hospitalSearchTerm}
                        onChange={(e) => {
                          setHospitalSearchTerm(e.target.value);
                          const term = e.target.value.toLowerCase();
                          setFilteredHospitals(
                            !term
                              ? hospitals
                              : hospitals.filter((h) =>
                                  h.name.toLowerCase().includes(term)
                                )
                          );
                          setIsHospitalOpen(true);
                        }}
                        onFocus={() => setIsHospitalOpen(true)}
                        placeholder="Select hospital"
                        className={`w-full px-5 py-4 text-lg border rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200 placeholder:text-gray-500 text-black ${
                          hasFieldError("managerHospitalId")
                            ? "border-red-300 bg-red-50"
                            : "border-gray-200"
                        }`}
                        autoComplete="off"
                      />
                      {isHospitalOpen && (
                        <div
                          ref={hospitalDropdownRef}
                          className="absolute z-50 w-full mt-1 bg-white rounded-xl border border-gray-200 shadow-lg max-h-60 overflow-y-auto"
                        >
                          {isHospitalLoading ? (
                            <div className="p-3 text-center text-gray-500">
                              Loading hospitals...
                            </div>
                          ) : filteredHospitals.length === 0 ? (
                            <div className="p-3 text-center text-gray-500">
                              No hospitals found
                            </div>
                          ) : (
                            <div className="py-1">
                              {filteredHospitals.map((h) => (
                                <button
                                  key={h._id}
                                  type="button"
                                  onClick={() => {
                                    setManagerHospitalId(h._id);
                                    setHospitalSearchTerm(h.name);
                                    setIsHospitalOpen(false);
                                  }}
                                  className="w-full px-3 py-2 text-left hover:bg-gray-50 focus:bg-gray-50 focus:outline-none"
                                >
                                  <div className="flex items-start space-x-3">
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-medium text-gray-900 truncate">
                                        {h.name}
                                      </p>
                                    </div>
                                  </div>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    <input
                      type="hidden"
                      name="managerHospitalId"
                      value={managerHospitalId}
                    />
                    {hasFieldError("managerHospitalId") && (
                      <div className="mt-2">
                        {getFieldErrors("managerHospitalId").map(
                          (error, index) => (
                            <p key={index} className="text-sm text-red-600">
                              {error}
                            </p>
                          )
                        )}
                      </div>
                    )}
                  </div>
                  <div>
                    <label
                      htmlFor="post"
                      className="block text-base font-medium text-gray-700 mb-3"
                    >
                      Post
                    </label>
                    <div className="relative">
                      <input
                        ref={postInputRef}
                        type="text"
                        id="post"
                        name="post"
                        value={postSearchTerm}
                        onChange={(e) => {
                          setPostSearchTerm(e.target.value);
                          const term = e.target.value.toLowerCase();
                          const postOptions = [
                            { value: "coordinateur", label: "Coordinateur" },
                            {
                              value: "assistant-chef",
                              label: "Assistant-chef",
                            },
                            { value: "gestionnaire", label: "Gestionnaire" },
                          ];
                          setFilteredPosts(
                            !term
                              ? postOptions
                              : postOptions.filter((opt) =>
                                  opt.label.toLowerCase().includes(term)
                                )
                          );
                          setIsPostOpen(true);
                        }}
                        onFocus={() => setIsPostOpen(true)}
                        placeholder="Select post"
                        className={`w-full px-5 py-4 text-lg border rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200 placeholder:text-gray-500 text-black ${
                          hasFieldError("post")
                            ? "border-red-300 bg-red-50"
                            : "border-gray-200"
                        }`}
                        autoComplete="off"
                      />
                      {isPostOpen && (
                        <div
                          ref={postDropdownRef}
                          className="absolute z-50 w-full mt-1 bg-white rounded-xl border border-gray-200 shadow-lg max-h-60 overflow-y-auto"
                        >
                          {filteredPosts.length === 0 ? (
                            <div className="p-3 text-center text-gray-500">
                              No post found
                            </div>
                          ) : (
                            <div className="py-1">
                              {filteredPosts.map((opt) => (
                                <button
                                  key={opt.value}
                                  type="button"
                                  onClick={() => {
                                    setPostSearchTerm(opt.label);
                                    setIsPostOpen(false);
                                  }}
                                  className="w-full px-3 py-2 text-left hover:bg-gray-50 focus:bg-gray-50 focus:outline-none"
                                >
                                  <div className="flex items-start space-x-3">
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-medium text-gray-900 truncate">
                                        {opt.label}
                                      </p>
                                    </div>
                                  </div>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    <input type="hidden" name="post" value={postSearchTerm} />
                    {hasFieldError("post") && (
                      <div className="mt-2">
                        {getFieldErrors("post").map((error, index) => (
                          <p key={index} className="text-sm text-red-600">
                            {error}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <label
                      htmlFor="ciusss"
                      className="block text-base font-medium text-gray-700 mb-3"
                    >
                      CIUSSS
                    </label>
                    <div className="relative">
                      <input
                        ref={ciusssInputRef}
                        type="text"
                        id="ciusss"
                        name="ciusssDisplay"
                        value={ciusssSearchTerm}
                        onChange={(e) => {
                          setCiusssSearchTerm(e.target.value);
                          // Clear selected ID if user is typing (not selecting from dropdown)
                          if (
                            e.target.value !==
                            ciusssOptions.find(
                              (opt) => opt._id === selectedCiusssId
                            )?.name
                          ) {
                            setSelectedCiusssId("");
                          }
                          const term = e.target.value.toLowerCase();
                          setFilteredCiusss(
                            !term
                              ? ciusssOptions
                              : ciusssOptions.filter((opt) =>
                                  opt.name.toLowerCase().includes(term)
                                )
                          );
                          setIsCiusssOpen(true);
                        }}
                        onFocus={() => setIsCiusssOpen(true)}
                        placeholder="Select CIUSSS"
                        className={`w-full px-5 py-4 text-lg border rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200 placeholder:text-gray-500 text-black ${
                          hasFieldError("ciusss")
                            ? "border-red-300 bg-red-50"
                            : "border-gray-200"
                        }`}
                        autoComplete="off"
                      />
                      {isCiusssOpen && (
                        <div
                          ref={ciusssDropdownRef}
                          className="absolute z-50 w-full mt-1 bg-white rounded-xl border border-gray-200 shadow-lg max-h-60 overflow-y-auto"
                        >
                          {filteredCiusss.length === 0 ? (
                            <div className="p-3 text-center text-gray-500">
                              No CIUSSS found
                            </div>
                          ) : (
                            <div className="py-1">
                              {filteredCiusss.map((opt) => (
                                <button
                                  key={opt._id}
                                  type="button"
                                  onClick={() => {
                                    setCiusssSearchTerm(opt.name);
                                    setSelectedCiusssId(opt._id);
                                    setIsCiusssOpen(false);
                                  }}
                                  className="w-full px-3 py-2 text-left hover:bg-gray-50 focus:bg-gray-50 focus:outline-none"
                                >
                                  <div className="flex items-start space-x-3">
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-medium text-gray-900 truncate">
                                        {opt.name}
                                      </p>
                                    </div>
                                  </div>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    <input
                      type="hidden"
                      name="ciusss"
                      value={selectedCiusssId}
                    />
                    {hasFieldError("ciusss") && (
                      <div className="mt-2">
                        {getFieldErrors("ciusss").map((error, index) => (
                          <p key={index} className="text-sm text-red-600">
                            {error}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}

              <div className="pt-6">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-green-500 hover:bg-green-600 text-white font-semibold py-4 px-6 text-lg rounded-xl transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? "Creating Account..." : "Sign Up"}
                </button>
              </div>
            </form>

            <p className="text-center text-base text-gray-600 mt-8">
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

      {/* Terms Modal */}
      <TermsModal
        isOpen={isTermsModalOpen}
        onClose={() => setIsTermsModalOpen(false)}
      />
    </div>
  );
}
