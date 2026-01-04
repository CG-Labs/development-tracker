import { useState, useRef, useCallback } from "react";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { doc, setDoc } from "firebase/firestore";
import { db } from "../config/firebase";
import app from "../config/firebase";

interface LogoUploadModalProps {
  onClose: () => void;
  onUpload: (url: string) => void;
  currentLogo?: string;
}

const MAX_FILE_SIZE = 500 * 1024; // 500KB
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/jpg"];

export function LogoUploadModal({ onClose, onUpload, currentLogo }: LogoUploadModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(currentLogo || null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): string | null => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return "Please upload a PNG or JPG image";
    }
    if (file.size > MAX_FILE_SIZE) {
      return `File size must be less than ${MAX_FILE_SIZE / 1024}KB`;
    }
    return null;
  };

  const handleFile = (file: File) => {
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    setSelectedFile(file);

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFile(files[0]);
    }
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploading(true);
    setError(null);

    try {
      const storage = getStorage(app);
      const storageRef = ref(storage, `company-logo/logo-${Date.now()}`);

      await uploadBytes(storageRef, selectedFile);
      const downloadURL = await getDownloadURL(storageRef);

      // Save URL to Firestore settings
      await setDoc(doc(db, "settings", "company"), {
        logoUrl: downloadURL,
        updatedAt: new Date(),
      }, { merge: true });

      onUpload(downloadURL);
      onClose();
    } catch (err) {
      console.error("Upload error:", err);
      setError("Failed to upload logo. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveLogo = async () => {
    setUploading(true);
    try {
      await setDoc(doc(db, "settings", "company"), {
        logoUrl: null,
        updatedAt: new Date(),
      }, { merge: true });

      onUpload("");
      onClose();
    } catch (err) {
      console.error("Remove error:", err);
      setError("Failed to remove logo. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 modal-backdrop animate-fade-in" />

      <div
        className="relative card-elevated max-w-md w-full animate-fade-in-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-subtle)]">
          <h2 className="font-display text-xl font-bold text-[var(--text-primary)]">
            Company Logo
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg border border-[var(--border-subtle)] hover:border-[var(--accent-cyan)] hover:bg-[rgba(6,214,214,0.1)] transition-all"
          >
            <svg className="w-5 h-5 text-[var(--text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Drop Zone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all ${
              isDragging
                ? "border-[var(--accent-cyan)] bg-[var(--accent-cyan)]/10"
                : "border-[var(--border-default)] hover:border-[var(--accent-cyan)]"
            }`}
          >
            {preview ? (
              <div className="flex flex-col items-center">
                <div className="w-24 h-24 rounded-lg overflow-hidden bg-[var(--bg-deep)] flex items-center justify-center mb-4">
                  <img
                    src={preview}
                    alt="Logo preview"
                    className="max-w-full max-h-full object-contain"
                  />
                </div>
                <p className="text-sm text-[var(--text-secondary)]">
                  Click or drag to replace
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <svg className="w-12 h-12 text-[var(--text-muted)] mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p className="text-[var(--text-primary)] font-medium mb-1">
                  Drop your logo here
                </p>
                <p className="text-sm text-[var(--text-muted)]">
                  or click to browse
                </p>
              </div>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".png,.jpg,.jpeg"
            onChange={handleFileInput}
            className="hidden"
          />

          {/* File Requirements */}
          <div className="text-xs text-[var(--text-muted)] space-y-1">
            <p>• PNG or JPG format</p>
            <p>• Maximum 500KB</p>
            <p>• Square aspect ratio recommended</p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-[var(--accent-rose)]/10 border border-[var(--accent-rose)]/20 rounded-lg">
              <p className="text-[var(--accent-rose)] text-sm">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 border-t border-[var(--border-subtle)]">
          {currentLogo && (
            <button
              onClick={handleRemoveLogo}
              disabled={uploading}
              className="px-4 py-2 text-sm rounded-lg border border-[var(--accent-rose)]/30 text-[var(--accent-rose)] hover:bg-[var(--accent-rose)]/10 transition-colors disabled:opacity-50"
            >
              Remove Logo
            </button>
          )}
          <div className="flex-1" />
          <button
            onClick={onClose}
            className="btn-secondary text-sm py-2"
            disabled={uploading}
          >
            Cancel
          </button>
          <button
            onClick={handleUpload}
            disabled={!selectedFile || uploading}
            className="btn-primary text-sm py-2 disabled:opacity-50"
          >
            {uploading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Uploading...
              </span>
            ) : (
              "Upload Logo"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
