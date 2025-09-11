'use client';

import { motion } from 'framer-motion';
import { useSignUpForm } from '@/hooks/useSignUpForm';
import { FormInput } from '@/components/forms/FormInput';
import { FileUpload } from '@/components/forms/FileUpload';
import { SelectInput } from '@/components/forms/SelectInput';
import { UserTypeButton } from '@/components/forms/UserTypeButton';
import { RoleSpecificFields } from '@/components/forms/RoleSpecificFields';
import { SubmitButton } from '@/components/forms/SubmitButton';
import { Icon } from '@/components/forms/Icon';
import { CLASS_OPTIONS } from '@/components/forms/formConfig';

export default function SignUpPage() {
  const { userType, setUserType, isLoading, message, handleSubmit } = useSignUpForm();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-8 px-4 sm:px-6 lg:px-8 flex flex-col items-center justify-center">
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="bg-white dark:bg-gray-800 shadow-2xl rounded-xl overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 py-6 px-8">
            <h1 className="text-2xl font-bold text-white text-center">
              Create Your Account
            </h1>
            <p className="text-blue-100 text-center text-sm mt-2">
              Join our patient management platform
            </p>
          </div>

          <div className="p-6">
            {/* User Type Selection */}
            <div className="flex rounded-md overflow-hidden bg-gray-100 dark:bg-gray-700 mb-6">
              <UserTypeButton 
                type="employee"
                currentType={userType}
                onClick={() => setUserType('employee')}
              />
              <UserTypeButton 
                type="manager"
                currentType={userType}
                onClick={() => setUserType('manager')}
              />
            </div>

            {/* Status Message */}
            {message.text && (
              <div className={`rounded-md p-3 mb-4 ${
                message.type === 'success' 
                  ? 'bg-green-50 text-green-700 dark:bg-green-900 dark:text-green-100' 
                  : 'bg-red-50 text-red-700 dark:bg-red-900 dark:text-red-100'
              }`}>
                {message.text}
              </div>
            )}

            <form className="space-y-5" onSubmit={handleSubmit}>
              {/* Name Fields */}
              <div className="grid grid-cols-2 gap-4">
                <FormInput
                  id="firstName"
                  name="firstName"
                  label="First Name"
                  placeholder="John"
                />
                <FormInput
                  id="lastName"
                  name="lastName"
                  label="Last Name"
                  placeholder="Doe"
                />
              </div>

              {/* Contact Fields */}
              <FormInput
                id="email"
                name="email"
                label="Email Address"
                type="email"
                placeholder="you@example.com"
                icon={<Icon name="email" />}
              />
              <FormInput
                id="phone"
                name="phone"
                label="Phone Number"
                type="tel"
                placeholder="(123) 456-7890"
                icon={<Icon name="phone" />}
              />

              {/* Employee Specific Fields */}
              <RoleSpecificFields
                role="employee"
                currentRole={userType}
              >
                <FileUpload
                  id="opiqPermit"
                  name="opiqPermit"
                  label="OPIQ Permit"
                />
                <FileUpload
                  id="rcr"
                  name="rcr"
                  label="RCR Document"
                />
              </RoleSpecificFields>

              {/* Manager Specific Fields */}
              <RoleSpecificFields
                role="manager"
                currentRole={userType}
              >
                <FormInput
                  id="post"
                  name="post"
                  label="Post"
                  placeholder="Head of Department"
                />
                <SelectInput
                  id="class"
                  name="class"
                  label="Class"
                  options={CLASS_OPTIONS}
                />
              </RoleSpecificFields>

              <div className="pt-4">
                <SubmitButton isLoading={isLoading} />
              </div>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Already have an account?{' '}
                <a href="/login" className="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400">
                  Sign in
                </a>
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}