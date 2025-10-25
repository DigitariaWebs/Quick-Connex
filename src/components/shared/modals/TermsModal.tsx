"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

interface TermsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function TermsModal({ isOpen, onClose }: TermsModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
            onClick={onClose}
          >
            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2 }}
              className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gray-50">
                <h2 className="text-2xl font-bold text-gray-900">
                  Terms and Conditions
                </h2>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-gray-200 rounded-full transition-colors duration-200"
                >
                  <X className="h-6 w-6 text-gray-500" />
                </button>
              </div>

              {/* Content */}
              <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
                <div className="prose prose-lg max-w-none">
                  <p className="text-gray-600 mb-6">
                    Last updated: {new Date().toLocaleDateString()}
                  </p>

                  <section className="mb-8">
                    <h3 className="text-xl font-semibold text-gray-900 mb-4">
                      1. Acceptance of Terms
                    </h3>
                    <p className="text-gray-700 leading-relaxed mb-4">
                      By accessing and using the Patient Management System, you
                      accept and agree to be bound by the terms and provision of
                      this agreement. If you do not agree to abide by the above,
                      please do not use this service.
                    </p>
                  </section>

                  <section className="mb-8">
                    <h3 className="text-xl font-semibold text-gray-900 mb-4">
                      2. Use License
                    </h3>
                    <p className="text-gray-700 leading-relaxed mb-4">
                      Permission is granted to temporarily use the Patient
                      Management System for personal, non-commercial transitory
                      viewing only. This is the grant of a license, not a
                      transfer of title, and under this license you may not:
                    </p>
                    <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
                      <li>Modify or copy the materials</li>
                      <li>
                        Use the materials for any commercial purpose or for any
                        public display
                      </li>
                      <li>
                        Attempt to reverse engineer any software contained on
                        the website
                      </li>
                      <li>
                        Remove any copyright or other proprietary notations from
                        the materials
                      </li>
                    </ul>
                  </section>

                  <section className="mb-8">
                    <h3 className="text-xl font-semibold text-gray-900 mb-4">
                      3. Privacy and Data Protection
                    </h3>
                    <p className="text-gray-700 leading-relaxed mb-4">
                      We are committed to protecting your privacy and the
                      confidentiality of patient information. All data is
                      handled in accordance with applicable healthcare privacy
                      laws and regulations, including but not limited to HIPAA
                      compliance where applicable.
                    </p>
                    <p className="text-gray-700 leading-relaxed mb-4">
                      We collect and process personal information only as
                      necessary to provide our services and in accordance with
                      our Privacy Policy.
                    </p>
                  </section>

                  <section className="mb-8">
                    <h3 className="text-xl font-semibold text-gray-900 mb-4">
                      4. User Responsibilities
                    </h3>
                    <p className="text-gray-700 leading-relaxed mb-4">
                      As a user of this system, you agree to:
                    </p>
                    <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
                      <li>Provide accurate and complete information</li>
                      <li>
                        Maintain the confidentiality of your account credentials
                      </li>
                      <li>Use the system only for lawful purposes</li>
                      <li>Respect patient privacy and confidentiality</li>
                      <li>
                        Report any security breaches or suspicious activity
                        immediately
                      </li>
                    </ul>
                  </section>

                  <section className="mb-8">
                    <h3 className="text-xl font-semibold text-gray-900 mb-4">
                      5. Prohibited Uses
                    </h3>
                    <p className="text-gray-700 leading-relaxed mb-4">
                      You may not use our service:
                    </p>
                    <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
                      <li>
                        For any unlawful purpose or to solicit others to perform
                        unlawful acts
                      </li>
                      <li>
                        To violate any international, federal, provincial, or
                        state regulations, rules, laws, or local ordinances
                      </li>
                      <li>
                        To infringe upon or violate our intellectual property
                        rights or the intellectual property rights of others
                      </li>
                      <li>
                        To harass, abuse, insult, harm, defame, slander,
                        disparage, intimidate, or discriminate
                      </li>
                      <li>To submit false or misleading information</li>
                    </ul>
                  </section>

                  <section className="mb-8">
                    <h3 className="text-xl font-semibold text-gray-900 mb-4">
                      6. Service Availability
                    </h3>
                    <p className="text-gray-700 leading-relaxed mb-4">
                      We strive to maintain high service availability, but we do
                      not guarantee that the service will be available at all
                      times. We may experience hardware, software, or other
                      problems or need to perform maintenance related to the
                      service, resulting in interruptions, delays, or errors.
                    </p>
                  </section>

                  <section className="mb-8">
                    <h3 className="text-xl font-semibold text-gray-900 mb-4">
                      7. Limitation of Liability
                    </h3>
                    <p className="text-gray-700 leading-relaxed mb-4">
                      In no event shall the Patient Management System, nor its
                      directors, employees, partners, agents, suppliers, or
                      affiliates, be liable for any indirect, incidental,
                      special, consequential, or punitive damages, including
                      without limitation, loss of profits, data, use, goodwill,
                      or other intangible losses, resulting from your use of the
                      service.
                    </p>
                  </section>

                  <section className="mb-8">
                    <h3 className="text-xl font-semibold text-gray-900 mb-4">
                      8. Termination
                    </h3>
                    <p className="text-gray-700 leading-relaxed mb-4">
                      We may terminate or suspend your account and bar access to
                      the service immediately, without prior notice or
                      liability, under our sole discretion, for any reason
                      whatsoever and without limitation, including but not
                      limited to a breach of the Terms.
                    </p>
                  </section>

                  <section className="mb-8">
                    <h3 className="text-xl font-semibold text-gray-900 mb-4">
                      9. Changes to Terms
                    </h3>
                    <p className="text-gray-700 leading-relaxed mb-4">
                      We reserve the right, at our sole discretion, to modify or
                      replace these Terms at any time. If a revision is
                      material, we will provide at least 30 days notice prior to
                      any new terms taking effect.
                    </p>
                  </section>

                  <section className="mb-8">
                    <h3 className="text-xl font-semibold text-gray-900 mb-4">
                      10. Contact Information
                    </h3>
                    <p className="text-gray-700 leading-relaxed mb-4">
                      If you have any questions about these Terms and
                      Conditions, please contact us at:
                    </p>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-gray-700">
                        <strong>Email:</strong> legal@patientmanagement.com
                        <br />
                        <strong>Phone:</strong> (555) 123-4567
                        <br />
                        <strong>Address:</strong> 123 Healthcare Ave, Medical
                        City, MC 12345
                      </p>
                    </div>
                  </section>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
