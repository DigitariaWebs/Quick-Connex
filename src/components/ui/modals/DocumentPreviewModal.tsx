"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createPortal } from "react-dom";
import {
  X,
  Download,
  FileText,
  Image,
  File,
  Loader2,
  AlertTriangle,
  Eye,
  Maximize2,
  Minimize2,
} from "lucide-react";

interface DocumentPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: {
    fileId: string;
    documentType: string;
    originalName: string;
    size: number;
    uploadedAt: string;
    downloadUrl: string;
  } | null;
}

/**
 * Document Preview Modal
 *
 * Secure document preview with:
 * - PDF viewer for PDF documents
 * - Image viewer for image documents
 * - Download functionality
 * - Full-screen mode
 */
export default function DocumentPreviewModal({
  isOpen,
  onClose,
  document,
}: DocumentPreviewModalProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [documentUrl, setDocumentUrl] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  // Set mounted state for SSR compatibility
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Generate secure document URL
  useEffect(() => {
    if (isOpen && document) {
      setLoading(true);
      setError(null);

      // Create a secure URL with timestamp to prevent caching
      const secureUrl = `${document.downloadUrl}?t=${Date.now()}`;
      setDocumentUrl(secureUrl);
      setLoading(false);
    }
  }, [isOpen, document]);

  // Handle fullscreen toggle
  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  // Handle download
  const handleDownload = () => {
    if (document) {
      const link = document.createElement("a");
      link.href = document.downloadUrl;
      link.download = document.originalName;
      link.target = "_blank";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  // Get file type icon
  const getFileIcon = (fileName: string) => {
    const extension = fileName.split(".").pop()?.toLowerCase();

    if (["pdf"].includes(extension || "")) {
      return <FileText className="w-8 h-8 text-red-500" />;
    } else if (
      ["jpg", "jpeg", "png", "gif", "webp"].includes(extension || "")
    ) {
      return <Image className="w-8 h-8 text-blue-500" />;
    } else {
      return <File className="w-8 h-8 text-gray-500" />;
    }
  };

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  // Check if document is an image
  const isImage = (fileName: string) => {
    const extension = fileName.split(".").pop()?.toLowerCase();
    return ["jpg", "jpeg", "png", "gif", "webp"].includes(extension || "");
  };

  // Check if document is a PDF
  const isPDF = (fileName: string) => {
    const extension = fileName.split(".").pop()?.toLowerCase();
    return extension === "pdf";
  };

  if (!isOpen || !document || !isMounted) return null;

  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className={`fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 ${
          isFullscreen ? "p-0" : ""
        }`}
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.2 }}
          onClick={(e) => e.stopPropagation()}
          className={`bg-white rounded-2xl shadow-2xl overflow-hidden ${
            isFullscreen
              ? "w-full h-full rounded-none"
              : "w-full max-w-6xl max-h-[90vh]"
          }`}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center space-x-3">
              {getFileIcon(document.originalName)}
              <div>
                <h3 className="font-semibold text-gray-900 truncate max-w-md">
                  {document.originalName}
                </h3>
                <div className="flex items-center space-x-4 text-sm text-gray-500">
                  <span>{document.documentType}</span>
                  <span>•</span>
                  <span>{formatFileSize(document.size)}</span>
                  <span>•</span>
                  <span>
                    {new Date(document.uploadedAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              {/* Download Button */}
              <button
                onClick={handleDownload}
                className="flex items-center space-x-2 px-3 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
              >
                <Download className="w-4 h-4" />
                <span>Download</span>
              </button>

              {/* Fullscreen Toggle */}
              <button
                onClick={toggleFullscreen}
                className="flex items-center space-x-2 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                {isFullscreen ? (
                  <Minimize2 className="w-4 h-4" />
                ) : (
                  <Maximize2 className="w-4 h-4" />
                )}
                <span>{isFullscreen ? "Exit" : "Fullscreen"}</span>
              </button>

              {/* Close Button */}
              <button
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div
            className={`relative ${
              isFullscreen ? "h-[calc(100vh-80px)]" : "h-[70vh]"
            }`}
          >
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
                  <p className="text-gray-600">Loading document...</p>
                </div>
              </div>
            ) : error ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Error Loading Document
                  </h3>
                  <p className="text-gray-600 mb-4">{error}</p>
                  <button
                    onClick={handleDownload}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Download Instead
                  </button>
                </div>
              </div>
            ) : (
              <div className="h-full">
                {isPDF(document.originalName) ? (
                  <iframe
                    src={documentUrl || ""}
                    className="w-full h-full border-0"
                    title={document.originalName}
                    onError={() => setError("Failed to load PDF document")}
                  />
                ) : isImage(document.originalName) ? (
                  <div className="flex items-center justify-center h-full bg-gray-100">
                    <img
                      src={documentUrl || ""}
                      alt={document.originalName}
                      className="max-w-full max-h-full object-contain"
                      onError={() => setError("Failed to load image")}
                    />
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <File className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        Preview Not Available
                      </h3>
                      <p className="text-gray-600 mb-4">
                        This file type cannot be previewed in the browser.
                      </p>
                      <button
                        onClick={handleDownload}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        Download File
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
}
