import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../AuthContext";
import { useErrorReporting } from "../../hooks/useErrorReporting";
import type { BugReportFormData } from "../../types/errorReporting";
import "./BugReportModal.css";

interface BugReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  prefilledError?: {
    title: string;
    description: string;
    errorMessage?: string;
    stackTrace?: string;
  };
}

const BugReportModal: React.FC<BugReportModalProps> = ({
  isOpen,
  onClose,
  prefilledError,
}) => {
  const { t } = useTranslation();
  const { profile } = useAuth();
  const { submitBugReport, settings } = useErrorReporting();

  const [formData, setFormData] = useState<BugReportFormData>({
    title: prefilledError?.title || "",
    description: prefilledError?.description || "",
    steps: [""],
    expectedBehavior: "",
    actualBehavior: "",
    severity: "medium",
    contactEmail: "",
    allowContact: false,
  });

  const [consoleErrors, setConsoleErrors] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConsoleErrors, setShowConsoleErrors] = useState(false);
  const [agreedToPrivacy, setAgreedToPrivacy] = useState(false);

  // Capture console errors when modal opens
  useEffect(() => {
    if (isOpen) {
      // Get recent console errors from session storage or capture new ones
      const errors = JSON.parse(
        sessionStorage.getItem("consoleErrors") || "[]"
      );
      setConsoleErrors(errors.slice(-10)); // Last 10 errors

      // Prefill if error provided
      if (prefilledError) {
        setFormData((prev) => ({
          ...prev,
          title: prefilledError.title,
          description:
            prefilledError.description +
            (prefilledError.errorMessage
              ? `\n\nError: ${prefilledError.errorMessage}`
              : ""),
          severity: "high",
        }));
      }
    }
  }, [isOpen, prefilledError]);

  const handleInputChange = (field: keyof BugReportFormData, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleStepChange = (index: number, value: string) => {
    const newSteps = [...formData.steps];
    newSteps[index] = value;
    setFormData((prev) => ({
      ...prev,
      steps: newSteps,
    }));
  };

  const addStep = () => {
    setFormData((prev) => ({
      ...prev,
      steps: [...prev.steps, ""],
    }));
  };

  const removeStep = (index: number) => {
    if (formData.steps.length > 1) {
      const newSteps = formData.steps.filter((_, i) => i !== index);
      setFormData((prev) => ({
        ...prev,
        steps: newSteps,
      }));
    }
  };

  const isFormValid = () => {
    const hasTitle = formData.title.trim().length > 0;
    const hasDescription = formData.description.trim().length > 0;
    const hasValidSteps = formData.steps.some((step) => step.trim().length > 0);
    const hasAgreedToPrivacy = agreedToPrivacy;
    const hasValidContact =
      !settings.requireContactForStudents ||
      profile?.role !== "student" ||
      (formData.allowContact &&
        formData.contactEmail &&
        formData.contactEmail.includes("@"));

    return (
      hasTitle &&
      hasDescription &&
      hasValidSteps &&
      hasAgreedToPrivacy &&
      hasValidContact
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isFormValid()) {
      return;
    }

    setIsSubmitting(true);

    try {
      await submitBugReport(
        {
          ...formData,
          steps: formData.steps.filter((step) => step.trim().length > 0),
        },
        consoleErrors,
        prefilledError?.stackTrace
      );

      onClose();
      alert(t("errorReporting.reportSubmitted"));
    } catch (error) {
      console.error("Failed to submit bug report:", error);
      alert(t("errorReporting.submitError"));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="bug-report-modal-overlay" onClick={onClose}>
      <div
        className="bug-report-modal-content"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bug-report-modal-header">
          <h2>{t("errorReporting.reportBug")}</h2>
          <button
            className="close-button"
            onClick={onClose}
            aria-label={t("common.close")}
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="bug-report-form">
          <div className="form-group">
            <label htmlFor="title">{t("errorReporting.title")} *</label>
            <input
              id="title"
              type="text"
              value={formData.title}
              onChange={(e) => handleInputChange("title", e.target.value)}
              placeholder={t("errorReporting.titlePlaceholder")}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="description">
              {t("errorReporting.description")} *
            </label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange("description", e.target.value)}
              placeholder={t("errorReporting.descriptionPlaceholder")}
              rows={4}
              required
            />
          </div>

          <div className="form-group">
            <label>{t("errorReporting.stepsToReproduce")} *</label>
            {formData.steps.map((step, index) => (
              <div key={index} className="step-input-group">
                <span className="step-number">{index + 1}.</span>
                <input
                  type="text"
                  value={step}
                  onChange={(e) => handleStepChange(index, e.target.value)}
                  placeholder={t("errorReporting.stepPlaceholder")}
                />
                {formData.steps.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeStep(index)}
                    className="remove-step-button"
                    aria-label={t("common.remove")}
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
            <button type="button" onClick={addStep} className="add-step-button">
              + {t("errorReporting.addStep")}
            </button>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="expectedBehavior">
                {t("errorReporting.expectedBehavior")}
              </label>
              <textarea
                id="expectedBehavior"
                value={formData.expectedBehavior}
                onChange={(e) =>
                  handleInputChange("expectedBehavior", e.target.value)
                }
                placeholder={t("errorReporting.expectedBehaviorPlaceholder")}
                rows={2}
              />
            </div>

            <div className="form-group">
              <label htmlFor="actualBehavior">
                {t("errorReporting.actualBehavior")}
              </label>
              <textarea
                id="actualBehavior"
                value={formData.actualBehavior}
                onChange={(e) =>
                  handleInputChange("actualBehavior", e.target.value)
                }
                placeholder={t("errorReporting.actualBehaviorPlaceholder")}
                rows={2}
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="severity">{t("errorReporting.severity")}</label>
            <select
              id="severity"
              value={formData.severity}
              onChange={(e) =>
                handleInputChange("severity", e.target.value as any)
              }
            >
              <option value="low">{t("errorReporting.severityLow")}</option>
              <option value="medium">
                {t("errorReporting.severityMedium")}
              </option>
              <option value="high">{t("errorReporting.severityHigh")}</option>
              <option value="critical">
                {t("errorReporting.severityCritical")}
              </option>
            </select>
          </div>

          {consoleErrors.length > 0 && (
            <div className="console-errors-section">
              <button
                type="button"
                onClick={() => setShowConsoleErrors(!showConsoleErrors)}
                className="toggle-console-errors"
              >
                {showConsoleErrors ? "▼" : "▶"}{" "}
                {t("errorReporting.consoleErrors")} ({consoleErrors.length})
              </button>

              {showConsoleErrors && (
                <div className="console-errors-list">
                  {consoleErrors.map((error, index) => (
                    <div key={index} className="console-error">
                      <code>{error}</code>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="contact-section">
            <div className="checkbox-group">
              <input
                id="allowContact"
                type="checkbox"
                checked={formData.allowContact}
                onChange={(e) =>
                  handleInputChange("allowContact", e.target.checked)
                }
              />
              <label htmlFor="allowContact">
                {t("errorReporting.allowContact")}
              </label>
            </div>

            {formData.allowContact && (
              <div className="form-group">
                <label htmlFor="contactEmail">
                  {t("errorReporting.contactEmail")}
                  {settings.requireContactForStudents &&
                    profile?.role === "student" &&
                    " *"}
                </label>
                <input
                  id="contactEmail"
                  type="email"
                  value={formData.contactEmail}
                  onChange={(e) =>
                    handleInputChange("contactEmail", e.target.value)
                  }
                  placeholder={t("errorReporting.contactEmailPlaceholder")}
                  required={
                    settings.requireContactForStudents &&
                    profile?.role === "student"
                  }
                />
              </div>
            )}
          </div>

          <div className="privacy-section">
            <div className="checkbox-group">
              <input
                id="agreedToPrivacy"
                type="checkbox"
                checked={agreedToPrivacy}
                onChange={(e) => setAgreedToPrivacy(e.target.checked)}
                required
              />
              <label htmlFor="agreedToPrivacy">
                {t("errorReporting.privacyAgreement")} *
              </label>
            </div>
            <p className="privacy-note">{t("errorReporting.privacyNote")}</p>
          </div>

          <div className="modal-actions">
            <button type="button" onClick={onClose} className="cancel-button">
              {t("common.cancel")}
            </button>
            <button
              type="submit"
              disabled={!isFormValid() || isSubmitting}
              className="submit-button"
            >
              {isSubmitting
                ? t("common.submitting")
                : t("errorReporting.submit")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BugReportModal;
