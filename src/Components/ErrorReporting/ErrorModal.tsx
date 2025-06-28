import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useErrorReporting } from "../../hooks/useErrorReporting";
import "./ErrorModal.css";

interface ErrorModalProps {
  isOpen: boolean;
  onClose: () => void;
  error: {
    title: string;
    message: string;
    technical?: string;
    stackTrace?: string;
    context?: string;
  };
}

const ErrorModal: React.FC<ErrorModalProps> = ({ isOpen, onClose, error }) => {
  const { t } = useTranslation();
  const { submitErrorReport } = useErrorReporting();
  const [isReporting, setIsReporting] = useState(false);
  const [reportSent, setReportSent] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Reset report state when modal opens
  useEffect(() => {
    if (isOpen) {
      setReportSent(false);
      setSubmitError(null);
    }
  }, [isOpen]);

  const handleReport = async () => {
    if (isReporting) return;

    setIsReporting(true);
    setSubmitError(null); // Clear previous errors

    try {
      // Get console errors from session storage
      const consoleErrors = JSON.parse(
        sessionStorage.getItem("consoleErrors") || "[]"
      );

      await submitErrorReport({
        type: "automatic",
        severity: "medium",
        title: error.title,
        description: `${error.message}${
          error.context ? `\n\nContext: ${error.context}` : ""
        }`,
        errorMessage: error.technical || error.message,
        stackTrace: error.stackTrace,
        consoleErrors: consoleErrors.slice(-10), // Last 10 console errors
      });

      setReportSent(true);
    } catch (reportError) {
      console.error("Failed to submit error report:", reportError);
      // Show error state instead of alert
      setSubmitError(t("errorReporting.submitError"));
      setReportSent(false);
    } finally {
      setIsReporting(false);
    }
  };

  const handleClose = () => {
    if (!isReporting) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="error-modal-overlay" onClick={handleClose}>
      <div className="error-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="error-modal-header">
          <div className="error-icon">⚠️</div>
          <h2>{error.title}</h2>
          <button
            className="error-modal-close"
            onClick={handleClose}
            disabled={isReporting}
            aria-label={t("common.close")}
          >
            ×
          </button>
        </div>

        <div className="error-modal-body">
          <div className="error-message">
            <p>{error.message}</p>
          </div>

          {error.context && (
            <div className="error-context">
              <h4>{t("errorReporting.context")}</h4>
              <p>{error.context}</p>
            </div>
          )}

          {error.technical && error.technical !== error.message && (
            <details className="error-technical">
              <summary>{t("errorReporting.technicalDetails")}</summary>
              <div className="technical-details">
                <pre>{error.technical}</pre>
                {error.stackTrace && (
                  <div className="stack-trace">
                    <h5>{t("errorReporting.stackTrace")}</h5>
                    <pre>{error.stackTrace}</pre>
                  </div>
                )}
              </div>
            </details>
          )}

          <div className="error-help">
            <h4>{t("errorReporting.whatNext")}</h4>
            <ul>
              <li>{t("errorReporting.tryRefresh")}</li>
              <li>{t("errorReporting.checkConnection")}</li>
              <li>{t("errorReporting.reportToDevs")}</li>
            </ul>
          </div>
        </div>

        <div className="error-modal-actions">
          <button
            className="error-close-button"
            onClick={handleClose}
            disabled={isReporting}
          >
            {t("common.close")}
          </button>

          <button
            className="error-report-button"
            onClick={handleReport}
            disabled={isReporting || reportSent}
          >
            {isReporting
              ? t("errorReporting.reporting")
              : reportSent
              ? t("errorReporting.reported")
              : submitError
              ? t("errorReporting.retry") || "Retry"
              : t("errorReporting.reportError")}
          </button>
        </div>

        {reportSent && (
          <div className="error-report-success">
            <p>✅ {t("errorReporting.reportSentSuccess")}</p>
          </div>
        )}

        {submitError && (
          <div className="error-report-failure">
            <p>❌ {submitError}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ErrorModal;
