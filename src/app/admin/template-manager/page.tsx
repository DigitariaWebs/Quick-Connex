"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";

interface Template {
  path: string;
  name: string;
  category: string;
  metadata: {
    variables: string[];
    helpers: string[];
    partials: string[];
    hasConditionals: boolean;
    hasLoops: boolean;
  };
  validation: {
    isValid: boolean;
    errorCount: number;
    warningCount: number;
  };
}

interface ValidationResult {
  isValid: boolean;
  errors: Array<{
    type: string;
    message: string;
    line?: number;
    severity: string;
  }>;
  warnings: Array<{
    type: string;
    message: string;
    line?: number;
    severity: string;
  }>;
  templatePath: string;
  validatedAt: string;
}

interface PreviewResult {
  html: string;
  metadata: {
    templatePath: string;
    variablesUsed: string[];
    renderTime: number;
    dataProvided: string[];
    validationResult?: ValidationResult;
  };
  sampleData: Record<string, any>;
}

export default function TemplateManager() {
  const t = useTranslations("adminTemplates");
  const tCommon = useTranslations("common");
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/templates/list");
      const data = await response.json();

      if (data.success) {
        setTemplates(data.templates);
        if (data.templates.length > 0) {
          setSelectedTemplate(data.templates[0].path);
        }
      } else {
        setError(data.error || t("error"));
      }
    } catch (err) {
      setError(t("error"));
    } finally {
      setLoading(false);
    }
  };

  const validateTemplate = async (templatePath: string) => {
    try {
      setLoading(true);
      const response = await fetch("/api/templates/validate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ templatePath }),
      });

      const data = await response.json();

      if (data.success) {
        setValidation(data.result);
      } else {
        setError(data.error || t("validationFailed"));
      }
    } catch (err) {
      setError(t("validationFailed"));
    } finally {
      setLoading(false);
    }
  };

  const generatePreview = async (templatePath: string) => {
    try {
      setLoading(true);
      const response = await fetch("/api/templates/preview", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ templatePath }),
      });

      const data = await response.json();

      if (data.success) {
        setPreview(data.result);
      } else {
        setError(data.error || t("previewFailed"));
      }
    } catch (err) {
      setError(t("previewFailed"));
    } finally {
      setLoading(false);
    }
  };

  const openPreviewInNewTab = (templatePath: string) => {
    const url = `/api/templates/preview?templatePath=${encodeURIComponent(
      templatePath,
    )}&withValidation=true`;
    window.open(url, "_blank");
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {t("title")}
          </h1>
          <p className="text-gray-600">{t("subtitle")}</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
            <div className="flex">
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">
                  {t("errorOccurred")}
                </h3>
                <div className="mt-2 text-sm text-red-700">{error}</div>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Template List */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4">
                {t("availableTemplates")}
              </h2>

              {loading ? (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                </div>
              ) : (
                <div className="space-y-2">
                  {templates.map((template) => (
                    <div
                      key={template.path}
                      className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedTemplate === template.path
                          ? "border-blue-500 bg-blue-50"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                      onClick={() => setSelectedTemplate(template.path)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-medium text-gray-900">
                            {template.name}
                          </h3>
                          <p className="text-sm text-gray-500">
                            {template.category}
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          {template.validation.isValid ? (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              ✓ {t("valid")}
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                              ✗ {template.validation.errorCount} {t("errors")}
                            </span>
                          )}
                          {template.validation.warningCount > 0 && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                              ⚠ {template.validation.warningCount}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Template Details & Actions */}
          <div className="lg:col-span-2">
            {selectedTemplate && (
              <div className="space-y-6">
                {/* Template Info */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-lg font-semibold mb-4">
                    {t("templateDetails")}
                  </h2>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        {t("path")}
                      </label>
                      <p className="mt-1 text-sm text-gray-900">
                        {selectedTemplate}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        {t("category")}
                      </label>
                      <p className="mt-1 text-sm text-gray-900">
                        {
                          templates.find((t) => t.path === selectedTemplate)
                            ?.category
                        }
                      </p>
                    </div>
                  </div>

                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700">
                      {t("variables")}
                    </label>
                    <div className="mt-1 flex flex-wrap gap-2">
                      {templates
                        .find((t) => t.path === selectedTemplate)
                        ?.metadata.variables.map((variable) => (
                          <span
                            key={variable}
                            className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                          >
                            {variable}
                          </span>
                        ))}
                    </div>
                  </div>

                  <div className="mt-6 flex space-x-4">
                    <button
                      onClick={() => validateTemplate(selectedTemplate)}
                      disabled={loading}
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                    >
                      {t("validateTemplate")}
                    </button>
                    <button
                      onClick={() => generatePreview(selectedTemplate)}
                      disabled={loading}
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
                    >
                      {t("generatePreview")}
                    </button>
                    <button
                      onClick={() => openPreviewInNewTab(selectedTemplate)}
                      className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      {t("openInNewTab")}
                    </button>
                  </div>
                </div>

                {/* Validation Results */}
                {validation && (
                  <div className="bg-white rounded-lg shadow p-6">
                    <h2 className="text-lg font-semibold mb-4">
                      {t("validationResults")}
                    </h2>

                    <div className="mb-4">
                      <span
                        className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                          validation.isValid
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {validation.isValid
                          ? `✓ ${t("valid")}`
                          : `✗ ${t("invalid")}`}
                      </span>
                    </div>

                    {validation.errors.length > 0 && (
                      <div className="mb-4">
                        <h3 className="text-sm font-medium text-red-800 mb-2">
                          {t("errors")}
                        </h3>
                        <div className="space-y-2">
                          {validation.errors.map((error, index) => (
                            <div
                              key={index}
                              className="p-3 bg-red-50 border border-red-200 rounded-md"
                            >
                              <div className="flex items-start">
                                <div className="ml-3">
                                  <p className="text-sm text-red-800">
                                    {error.message}
                                  </p>
                                  {error.line && (
                                    <p className="text-xs text-red-600 mt-1">
                                      {t("line")} {error.line}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {validation.warnings.length > 0 && (
                      <div>
                        <h3 className="text-sm font-medium text-yellow-800 mb-2">
                          {t("warnings")}
                        </h3>
                        <div className="space-y-2">
                          {validation.warnings.map((warning, index) => (
                            <div
                              key={index}
                              className="p-3 bg-yellow-50 border border-yellow-200 rounded-md"
                            >
                              <div className="flex items-start">
                                <div className="ml-3">
                                  <p className="text-sm text-yellow-800">
                                    {warning.message}
                                  </p>
                                  {warning.line && (
                                    <p className="text-xs text-yellow-600 mt-1">
                                      {t("line")} {warning.line}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Preview Results */}
                {preview && (
                  <div className="bg-white rounded-lg shadow p-6">
                    <h2 className="text-lg font-semibold mb-4">
                      {t("previewResults")}
                    </h2>

                    <div className="mb-4 grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="font-medium">{t("renderTime")}:</span>{" "}
                        {preview.metadata.renderTime}ms
                      </div>
                      <div>
                        <span className="font-medium">
                          {t("variablesUsed")}:
                        </span>{" "}
                        {preview.metadata.variablesUsed.length}
                      </div>
                      <div>
                        <span className="font-medium">
                          {t("dataProvided")}:
                        </span>{" "}
                        {preview.metadata.dataProvided.length}
                      </div>
                    </div>

                    <div className="border rounded-lg overflow-hidden">
                      <iframe
                        srcDoc={preview.html}
                        className="w-full h-96 border-0"
                        title="Template Preview"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
