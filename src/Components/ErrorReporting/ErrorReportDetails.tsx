import React from "react";
import { useTranslation } from "react-i18next";
import type { ErrorReport } from "../../types/errorReporting";
import "./ErrorReportDetails.css";

interface ErrorReportDetailsProps {
  report: ErrorReport;
  onStatusUpdate: (reportId: string, status: ErrorReport["status"]) => void;
  onClose: () => void;
}

const ErrorReportDetails: React.FC<ErrorReportDetailsProps> = ({
  report,
  onStatusUpdate,
  onClose,
}) => {
  const { t } = useTranslation();

  const handleCopyToClipboard = (text: string, label: string) => {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        alert(`${label} ${t("errorReporting.copiedToClipboard")}`);
      })
      .catch((err) => {
        console.error("Failed to copy text: ", err);
        alert(t("errorReporting.copyFailed"));
      });
  };

  const handleCopyFullReport = () => {
    const fullReport = `
Error Report: ${report.title}
ID: ${report.id}
Created: ${new Date(report.createdAt).toLocaleString()}
Type: ${report.type}
Severity: ${report.severity}
Status: ${report.status}
User Role: ${report.userRole || "Anonymous"}
URL: ${report.url}
User Agent: ${report.userAgent}
Viewport: ${report.viewport.width}x${report.viewport.height}

Description:
${report.description}

${
  report.errorMessage
    ? `Error Message:
${report.errorMessage}

`
    : ""
}${
      report.stackTrace
        ? `Stack Trace:
${report.stackTrace}

`
        : ""
    }${
      report.consoleErrors && report.consoleErrors.length > 0
        ? `Console Errors:
${report.consoleErrors.join("\n")}

`
        : ""
    }${report.contactEmail ? `Contact: ${report.contactEmail}` : ""}${
      report.adminNotes
        ? `Admin Notes:
${report.adminNotes}`
        : ""
    }
    `.trim();

    handleCopyToClipboard(fullReport, t("errorReporting.fullReport"));
  };

  const getStatusColor = (status: ErrorReport["status"]) => {
    switch (status) {
      case "open":
        return "var(--danger-color, #dc3545)";
      case "in-progress":
        return "var(--warning-color, #ffc107)";
      case "resolved":
        return "var(--success-color, #28a745)";
      case "rejected":
        return "var(--secondary-color, #6c757d)";
      default:
        return "var(--text-secondary, #666)";
    }
  };

  const getSeverityColor = (severity: ErrorReport["severity"]) => {
    switch (severity) {
      case "critical":
        return "var(--danger-color, #dc3545)";
      case "high":
        return "var(--warning-color, #fd7e14)";
      case "medium":
        return "var(--info-color, #17a2b8)";
      case "low":
        return "var(--success-color, #28a745)";
      default:
        return "var(--text-secondary, #666)";
    }
  };

  return (
    <div className="error-report-details">
      <div className="details-header">
        <div className="header-top">
          <h2>{report.title}</h2>
          <button className="close-details-button" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="header-badges">
          <span
            className="severity-badge"
            style={{ backgroundColor: getSeverityColor(report.severity) }}
          >
            {t(
              `errorReporting.severity${
                report.severity.charAt(0).toUpperCase() +
                report.severity.slice(1)
              }`
            )}
          </span>
          <span
            className="status-badge"
            style={{ backgroundColor: getStatusColor(report.status) }}
          >
            {t(
              `errorReporting.status${
                report.status.charAt(0).toUpperCase() +
                report.status.slice(1).replace("-", "")
              }`
            )}
          </span>
        </div>

        <div className="header-actions">
          <button
            className="copy-button"
            onClick={handleCopyFullReport}
            title={t("errorReporting.copyFullReport")}
          >
            📋 {t("errorReporting.copyReport")}
          </button>
        </div>
      </div>

      <div className="details-content">
        <div className="detail-section">
          <h3>{t("errorReporting.basicInfo")}</h3>
          <div className="detail-grid">
            <div className="detail-item">
              <label>{t("errorReporting.reportId")}:</label>
              <span className="selectable-text">{report.id}</span>
              <button
                className="mini-copy-button"
                onClick={() =>
                  handleCopyToClipboard(report.id, t("errorReporting.reportId"))
                }
              >
                📋
              </button>
            </div>

            <div className="detail-item">
              <label>{t("errorReporting.created")}:</label>
              <span>{new Date(report.createdAt).toLocaleString()}</span>
            </div>

            <div className="detail-item">
              <label>{t("errorReporting.type")}:</label>
              <span>
                {t(
                  `errorReporting.type${
                    report.type.charAt(0).toUpperCase() + report.type.slice(1)
                  }`
                )}
              </span>
            </div>

            <div className="detail-item">
              <label>{t("errorReporting.userRole")}:</label>
              <span>
                {report.userRole
                  ? t(`roles.${report.userRole}`)
                  : t("common.anonymous")}
              </span>
            </div>

            <div className="detail-item">
              <label>{t("errorReporting.url")}:</label>
              <span className="selectable-text">{report.url}</span>
              <button
                className="mini-copy-button"
                onClick={() =>
                  handleCopyToClipboard(report.url, t("errorReporting.url"))
                }
              >
                📋
              </button>
            </div>

            <div className="detail-item">
              <label>{t("errorReporting.viewport")}:</label>
              <span>
                {report.viewport.width}×{report.viewport.height}
              </span>
            </div>
          </div>
        </div>

        <div className="detail-section">
          <h3>{t("errorReporting.description")}</h3>
          <div className="description-content">
            <p>{report.description}</p>
            <button
              className="mini-copy-button"
              onClick={() =>
                handleCopyToClipboard(
                  report.description,
                  t("errorReporting.description")
                )
              }
            >
              📋
            </button>
          </div>
        </div>

        {report.errorMessage && (
          <div className="detail-section">
            <h3>{t("errorReporting.errorMessage")}</h3>
            <div className="code-content">
              <pre>{report.errorMessage}</pre>
              <button
                className="mini-copy-button"
                onClick={() =>
                  handleCopyToClipboard(
                    report.errorMessage!,
                    t("errorReporting.errorMessage")
                  )
                }
              >
                📋
              </button>
            </div>
          </div>
        )}

        {report.stackTrace && (
          <div className="detail-section">
            <h3>{t("errorReporting.stackTrace")}</h3>
            <div className="code-content">
              <pre>{report.stackTrace}</pre>
              <button
                className="mini-copy-button"
                onClick={() =>
                  handleCopyToClipboard(
                    report.stackTrace!,
                    t("errorReporting.stackTrace")
                  )
                }
              >
                📋
              </button>
            </div>
          </div>
        )}

        {report.consoleErrors && report.consoleErrors.length > 0 && (
          <div className="detail-section">
            <h3>{t("errorReporting.consoleErrors")}</h3>
            <div className="console-errors-list">
              {report.consoleErrors.map((error, index) => (
                <div key={index} className="console-error-item">
                  <code>{error}</code>
                  <button
                    className="mini-copy-button"
                    onClick={() =>
                      handleCopyToClipboard(
                        error,
                        `${t("errorReporting.consoleError")} ${index + 1}`
                      )
                    }
                  >
                    📋
                  </button>
                </div>
              ))}
              <button
                className="copy-all-button"
                onClick={() =>
                  handleCopyToClipboard(
                    report.consoleErrors!.join("\n"),
                    t("errorReporting.allConsoleErrors")
                  )
                }
              >
                📋 {t("errorReporting.copyAllErrors")}
              </button>
            </div>
          </div>
        )}

        <div className="detail-section">
          <h3>{t("errorReporting.technicalDetails")}</h3>
          <div className="detail-grid">
            <div className="detail-item">
              <label>{t("errorReporting.userAgent")}:</label>
              <span className="selectable-text small-text">
                {report.userAgent}
              </span>
              <button
                className="mini-copy-button"
                onClick={() =>
                  handleCopyToClipboard(
                    report.userAgent,
                    t("errorReporting.userAgent")
                  )
                }
              >
                📋
              </button>
            </div>

            <div className="detail-item">
              <label>{t("errorReporting.sessionId")}:</label>
              <span className="selectable-text">{report.sessionId}</span>
              <button
                className="mini-copy-button"
                onClick={() =>
                  handleCopyToClipboard(
                    report.sessionId,
                    t("errorReporting.sessionId")
                  )
                }
              >
                📋
              </button>
            </div>

            {report.buildVersion && (
              <div className="detail-item">
                <label>{t("errorReporting.buildVersion")}:</label>
                <span>{report.buildVersion}</span>
              </div>
            )}

            {report.contactEmail && (
              <div className="detail-item">
                <label>{t("errorReporting.contactEmail")}:</label>
                <span className="selectable-text">{report.contactEmail}</span>
                <button
                  className="mini-copy-button"
                  onClick={() =>
                    handleCopyToClipboard(
                      report.contactEmail!,
                      t("errorReporting.contactEmail")
                    )
                  }
                >
                  📋
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="detail-section">
          <h3>{t("errorReporting.statusManagement")}</h3>
          <div className="status-actions">
            <button
              className={`status-button ${
                report.status === "open" ? "active" : ""
              }`}
              onClick={() => onStatusUpdate(report.id, "open")}
              disabled={report.status === "open"}
            >
              {t("errorReporting.markAsOpen")}
            </button>
            <button
              className={`status-button ${
                report.status === "in-progress" ? "active" : ""
              }`}
              onClick={() => onStatusUpdate(report.id, "in-progress")}
              disabled={report.status === "in-progress"}
            >
              {t("errorReporting.markAsInProgress")}
            </button>
            <button
              className={`status-button ${
                report.status === "resolved" ? "active" : ""
              }`}
              onClick={() => onStatusUpdate(report.id, "resolved")}
              disabled={report.status === "resolved"}
            >
              {t("errorReporting.markAsResolved")}
            </button>
            <button
              className={`status-button ${
                report.status === "rejected" ? "active" : ""
              }`}
              onClick={() => onStatusUpdate(report.id, "rejected")}
              disabled={report.status === "rejected"}
            >
              {t("errorReporting.markAsRejected")}
            </button>
          </div>
        </div>

        {report.resolvedBy && (
          <div className="detail-section">
            <div className="detail-item">
              <label>{t("errorReporting.resolvedBy")}:</label>
              <span>{report.resolvedBy}</span>
            </div>
            {report.resolvedAt && (
              <div className="detail-item">
                <label>{t("errorReporting.resolvedAt")}:</label>
                <span>{new Date(report.resolvedAt).toLocaleString()}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ErrorReportDetails;
