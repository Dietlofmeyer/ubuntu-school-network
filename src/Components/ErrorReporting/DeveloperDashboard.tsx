import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../AuthContext";
import { useErrorReporting } from "../../hooks/useErrorReporting";
import type { ErrorReport } from "../../types/errorReporting";
import ErrorReportDetails from "./ErrorReportDetails";
import "./DeveloperDashboard.css";

const DeveloperDashboard: React.FC = () => {
  const { t } = useTranslation();
  const { profile } = useAuth();
  const { getAllReports, updateReportStatus } = useErrorReporting();

  const [reports, setReports] = useState<ErrorReport[]>([]);
  const [selectedReport, setSelectedReport] = useState<ErrorReport | null>(
    null
  );
  const [filter, setFilter] = useState<
    "all" | "open" | "in-progress" | "resolved"
  >("all");
  const [severityFilter, setSeverityFilter] = useState<
    "all" | "low" | "medium" | "high" | "critical"
  >("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Only show to admin/staff roles
  if (!profile || !["admin", "staff"].includes(profile.role)) {
    return (
      <div className="access-denied">
        <h2>{t("common.accessDenied")}</h2>
        <p>{t("errorReporting.developerAccessRequired")}</p>
      </div>
    );
  }

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    try {
      setLoading(true);
      const allReports = await getAllReports();
      setReports(
        allReports.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      );
    } catch (err) {
      console.error("Failed to load error reports:", err);
      setError(t("errorReporting.loadReportsError"));
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (
    reportId: string,
    status: ErrorReport["status"]
  ) => {
    try {
      await updateReportStatus(reportId, status, profile?.name);
      await loadReports(); // Refresh list

      // Update selected report if it's the one being updated
      if (selectedReport?.id === reportId) {
        const updatedReport = reports.find((r) => r.id === reportId);
        if (updatedReport) {
          setSelectedReport({ ...updatedReport, status });
        }
      }
    } catch (err) {
      console.error("Failed to update report status:", err);
      alert(t("errorReporting.updateStatusError"));
    }
  };

  const filteredReports = reports.filter((report) => {
    if (filter !== "all" && report.status !== filter) return false;
    if (severityFilter !== "all" && report.severity !== severityFilter)
      return false;
    return true;
  });

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

  if (loading) {
    return (
      <div className="developer-dashboard">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>{t("common.loading")}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="developer-dashboard">
        <div className="error-state">
          <h2>{t("common.error")}</h2>
          <p>{error}</p>
          <button onClick={loadReports} className="retry-button">
            {t("common.tryAgain")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="developer-dashboard">
      <div className="dashboard-header">
        <h1>{t("errorReporting.developerDashboard")}</h1>
        <div className="dashboard-stats">
          <div className="stat-item">
            <span className="stat-number">{reports.length}</span>
            <span className="stat-label">
              {t("errorReporting.totalReports")}
            </span>
          </div>
          <div className="stat-item">
            <span className="stat-number">
              {reports.filter((r) => r.status === "open").length}
            </span>
            <span className="stat-label">
              {t("errorReporting.openReports")}
            </span>
          </div>
          <div className="stat-item">
            <span className="stat-number">
              {reports.filter((r) => r.severity === "critical").length}
            </span>
            <span className="stat-label">
              {t("errorReporting.criticalReports")}
            </span>
          </div>
        </div>
      </div>

      <div className="dashboard-filters">
        <div className="filter-group">
          <label htmlFor="statusFilter">
            {t("errorReporting.filterByStatus")}:
          </label>
          <select
            id="statusFilter"
            value={filter}
            onChange={(e) => setFilter(e.target.value as any)}
          >
            <option value="all">{t("common.all")}</option>
            <option value="open">{t("errorReporting.statusOpen")}</option>
            <option value="in-progress">
              {t("errorReporting.statusInProgress")}
            </option>
            <option value="resolved">
              {t("errorReporting.statusResolved")}
            </option>
          </select>
        </div>

        <div className="filter-group">
          <label htmlFor="severityFilter">
            {t("errorReporting.filterBySeverity")}:
          </label>
          <select
            id="severityFilter"
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value as any)}
          >
            <option value="all">{t("common.all")}</option>
            <option value="critical">
              {t("errorReporting.severityCritical")}
            </option>
            <option value="high">{t("errorReporting.severityHigh")}</option>
            <option value="medium">{t("errorReporting.severityMedium")}</option>
            <option value="low">{t("errorReporting.severityLow")}</option>
          </select>
        </div>

        <button onClick={loadReports} className="refresh-button">
          {t("common.refresh")}
        </button>
      </div>

      <div className="dashboard-content">
        <div className="reports-list">
          {filteredReports.length === 0 ? (
            <div className="empty-state">
              <p>{t("errorReporting.noReports")}</p>
            </div>
          ) : (
            filteredReports.map((report) => (
              <div
                key={report.id}
                className={`report-item ${
                  selectedReport?.id === report.id ? "selected" : ""
                }`}
                onClick={() => setSelectedReport(report)}
              >
                <div className="report-header">
                  <h3 className="report-title">{report.title}</h3>
                  <div className="report-badges">
                    <span
                      className="severity-badge"
                      style={{
                        backgroundColor: getSeverityColor(report.severity),
                      }}
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
                </div>

                <div className="report-meta">
                  <span className="report-date">
                    {new Date(report.createdAt).toLocaleDateString()}{" "}
                    {new Date(report.createdAt).toLocaleTimeString()}
                  </span>
                  <span className="report-type">
                    {t(
                      `errorReporting.type${
                        report.type.charAt(0).toUpperCase() +
                        report.type.slice(1)
                      }`
                    )}
                  </span>
                  {report.userRole && (
                    <span className="report-role">
                      {t(`roles.${report.userRole}`)}
                    </span>
                  )}
                </div>

                <p className="report-description">
                  {report.description.length > 100
                    ? `${report.description.substring(0, 100)}...`
                    : report.description}
                </p>
              </div>
            ))
          )}
        </div>

        {selectedReport && (
          <div className="report-details">
            <ErrorReportDetails
              report={selectedReport}
              onStatusUpdate={handleStatusUpdate}
              onClose={() => setSelectedReport(null)}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default DeveloperDashboard;
