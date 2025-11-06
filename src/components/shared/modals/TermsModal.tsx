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
            onClick={onClose}
            className="fixed inset-0 bg-black/20 backdrop-blur-md z-50 flex items-center justify-center p-4"
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
                  Conditions d'utilisation
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
                  <div className="mb-6 space-y-2">
                    <p className="text-lg font-semibold text-gray-900">
                      Employés exécutant les transferts
                    </p>
                    <p className="text-gray-600">
                      <strong>Entreprise :</strong> Groupe BZ Service inc.
                      Quickconnex
                    </p>
                    <p className="text-gray-600">
                      <strong>Champ d'application :</strong> Employés et
                      sous-traitants autorisés à utiliser la plateforme et à
                      effectuer les transferts de patients.
                    </p>
                  </div>

                  <section className="mb-8">
                    <h3 className="text-xl font-semibold text-gray-900 mb-4">
                      1. Objet
                    </h3>
                    <p className="text-gray-700 leading-relaxed mb-4">
                      Ces conditions définissent les règles et responsabilités
                      des employés utilisant l'application et le site Phénix
                      Transfert (ou le nom que tu choisiras) pour exécuter des
                      missions de transfert de patients entre les établissements
                      de santé.
                    </p>
                  </section>

                  <section className="mb-8">
                    <h3 className="text-xl font-semibold text-gray-900 mb-4">
                      2. Inscription et accès
                    </h3>
                    <p className="text-gray-700 leading-relaxed mb-4">
                      L'accès à la plateforme est réservé aux employés autorisés
                      et formés de l'Entreprise.
                    </p>
                    <p className="text-gray-700 leading-relaxed mb-4">
                      Chaque employé reçoit un identifiant personnel ; il est
                      responsable de la confidentialité de son mot de passe.
                    </p>
                    <p className="text-gray-700 leading-relaxed mb-4">
                      Il est interdit de partager son compte ou d'utiliser celui
                      d'un autre employé.
                    </p>
                  </section>

                  <section className="mb-8">
                    <h3 className="text-xl font-semibold text-gray-900 mb-4">
                      3. Utilisation autorisée
                    </h3>
                    <p className="text-gray-700 leading-relaxed mb-4">
                      L'application doit être utilisée exclusivement pour
                      accepter, gérer et exécuter les missions de transfert
                      confiées par l'Entreprise.
                    </p>
                    <p className="text-gray-700 leading-relaxed mb-4">
                      Toute utilisation à des fins personnelles, commerciales ou
                      non autorisées est interdite.
                    </p>
                    <p className="text-gray-700 leading-relaxed mb-4">
                      Les employés doivent respecter les protocoles cliniques,
                      les normes de sécurité et la confidentialité des données
                      des patients (Loi 25 au Québec, LPRPDE au Canada).
                    </p>
                  </section>

                  <section className="mb-8">
                    <h3 className="text-xl font-semibold text-gray-900 mb-4">
                      4. Responsabilités de l'employé
                    </h3>
                    <p className="text-gray-700 leading-relaxed mb-4">
                      <strong>Compétence et conformité :</strong> maintenir ses
                      certifications professionnelles à jour (ex. : Membre OPIQ,
                      RCR, etc.).
                    </p>
                    <p className="text-gray-700 leading-relaxed mb-4">
                      <strong>Respect des directives :</strong> suivre les
                      procédures cliniques et les protocoles de l'Entreprise
                      pour le transfert des patients.
                    </p>
                    <p className="text-gray-700 leading-relaxed mb-4">
                      <strong>Protection des données :</strong> ne pas divulguer
                      d'informations médicales ou personnelles obtenues durant
                      les missions.
                    </p>
                    <p className="text-gray-700 leading-relaxed mb-4">
                      <strong>Signalement :</strong> informer immédiatement le
                      gestionnaire en cas d'incident, de défaillance technique
                      ou d'urgence médicale.
                    </p>
                  </section>

                  <section className="mb-8">
                    <h3 className="text-xl font-semibold text-gray-900 mb-4">
                      5. Comportement et éthique
                    </h3>
                    <p className="text-gray-700 leading-relaxed mb-4">
                      Respecter les principes de dignité, de sécurité et de
                      confidentialité envers les patients et leurs familles.
                    </p>
                    <p className="text-gray-700 leading-relaxed mb-4">
                      Interdiction de consommer de l'alcool, des drogues ou tout
                      produit pouvant altérer les capacités de jugement durant
                      le service.
                    </p>
                    <p className="text-gray-700 leading-relaxed mb-4">
                      Toute forme de discrimination, harcèlement ou violence
                      verbale ou physique est strictement interdite.
                    </p>
                  </section>

                  <section className="mb-8">
                    <h3 className="text-xl font-semibold text-gray-900 mb-4">
                      6. Sécurité et conformité
                    </h3>
                    <p className="text-gray-700 leading-relaxed mb-4">
                      Respecter les lois et règlements applicables au transport
                      des patients et des dispositifs médicaux.
                    </p>
                    <p className="text-gray-700 leading-relaxed mb-4">
                      Maintenir les équipements (véhicules, dispositifs
                      respiratoires, matériel d'urgence) en bon état et signaler
                      tout problème.
                    </p>
                    <p className="text-gray-700 leading-relaxed mb-4">
                      Porter l'équipement de protection individuelle (EPI)
                      requis selon le type de transfert et la condition du
                      patient.
                    </p>
                  </section>

                  <section className="mb-8">
                    <h3 className="text-xl font-semibold text-gray-900 mb-4">
                      7. Suspension ou révocation d'accès
                    </h3>
                    <p className="text-gray-700 leading-relaxed mb-4">
                      L'Entreprise se réserve le droit de suspendre ou révoquer
                      l'accès à la plateforme pour tout employé :
                    </p>
                    <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
                      <li>en cas de non-respect des présentes conditions,</li>
                      <li>de comportement inapproprié ou dangereux,</li>
                      <li>
                        ou de violation de la confidentialité des données.
                      </li>
                    </ul>
                  </section>

                  <section className="mb-8">
                    <h3 className="text-xl font-semibold text-gray-900 mb-4">
                      8. Modifications des conditions
                    </h3>
                    <p className="text-gray-700 leading-relaxed mb-4">
                      L'Entreprise peut mettre à jour ces conditions pour
                      respecter les nouvelles lois, réglementations ou
                      procédures internes.
                    </p>
                    <p className="text-gray-700 leading-relaxed mb-4">
                      Les employés seront informés et devront accepter les
                      nouvelles conditions pour continuer à utiliser la
                      plateforme.
                    </p>
                  </section>

                  <section className="mb-8">
                    <h3 className="text-xl font-semibold text-gray-900 mb-4">
                      9. Acceptation
                    </h3>
                    <p className="text-gray-700 leading-relaxed mb-4">
                      En s'inscrivant sur la plateforme et en acceptant une
                      mission, l'employé reconnaît avoir lu, compris et accepté
                      les présentes conditions d'utilisation.
                    </p>
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
