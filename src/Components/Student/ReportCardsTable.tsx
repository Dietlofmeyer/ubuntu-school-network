import React from "react";
import type { ReportCard } from "./studentDash";
import "./ReportCardsTable.css";
import { useTranslation } from "react-i18next";

type Props = {
  reports: ReportCard[];
  formatDate: (dateStr: string) => string;
  onView: (report: ReportCard) => void;
};

const getReportKey = (report: ReportCard) => {
  return `${report.year}-${report.term}-${report.issuedAt}-${report.teacher}`;
};

const useIsMobile = () => window.innerWidth <= 700;

const sortReportsNewestFirst = (a: ReportCard, b: ReportCard) => {
  // Sort by year DESC, then term DESC, then issuedAt DESC
  if (b.year !== a.year) return b.year - a.year;
  if (b.term !== a.term) return b.term - a.term;
  return new Date(b.issuedAt).getTime() - new Date(a.issuedAt).getTime();
};

const ReportCardsTable: React.FC<Props> = ({ reports, formatDate, onView }) => {
  const { t } = useTranslation();
  const [isMobile, setIsMobile] = React.useState(useIsMobile());

  React.useEffect(() => {
    const handleResize = () => setIsMobile(useIsMobile());
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const sortedReports = [...reports].sort(sortReportsNewestFirst);

  if (reports.length === 0) {
    return (
      <div className="sdash-section sdash-fade-in">
        <div className="sdash-section-header">
          <div className="sdash-section-title">📄 {t("my_report_cards")}</div>
          <div className="sdash-section-subtitle">
            {t("academic_performance_reports")}
          </div>
        </div>
        <div className="sdash-section-content">
          <div className="sdash-empty-state">
            <div className="sdash-empty-icon">📑</div>
            <div className="sdash-empty-title">{t("no_report_cards_yet")}</div>
            <div className="sdash-empty-subtitle">
              {t("report_cards_will_appear_here")}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isMobile) {
    return (
      <div className="sdash-section sdash-fade-in">
        <div className="sdash-section-header">
          <div className="sdash-section-title">📄 {t("my_report_cards")}</div>
          <div className="sdash-section-subtitle">
            {t("academic_performance_reports")}
          </div>
        </div>
        <div className="sdash-section-content">
          <div className="report-cards-mobile-list">
            {sortedReports.map((report) => (
              <div className="report-card-mobile" key={getReportKey(report)}>
                <div>
                  <span className="report-label">{t("term")}:</span>{" "}
                  {report.term}
                </div>
                <div>
                  <span className="report-label">{t("year")}:</span>{" "}
                  {report.year}
                </div>
                <div>
                  <span className="report-label">{t("issued")}:</span>{" "}
                  {formatDate(report.issuedAt)}
                </div>
                <div>
                  <span className="report-label">{t("homeroom")}:</span>{" "}
                  {report.homeroomClass || "-"}
                </div>
                <div>
                  <span className="report-label">{t("teacher")}:</span>{" "}
                  {report.teacher}
                </div>
                <button
                  className="tdash-action-btn tdash-primary report-card-mobile-btn"
                  onClick={() => onView(report)}
                >
                  {t("view")}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Desktop/tablet table view
  return (
    <div className="sdash-section sdash-fade-in">
      <div className="sdash-section-header">
        <div className="sdash-section-title">📄 {t("my_report_cards")}</div>
        <div className="sdash-section-subtitle">
          {t("academic_performance_reports")}
        </div>
      </div>
      <div className="sdash-section-content">
        <div className="sdash-reports-table-container">
          <table className="sdash-reports-table">
            <thead>
              <tr>
                <th>{t("term")}</th>
                <th>{t("year")}</th>
                <th>{t("issued")}</th>
                <th>{t("homeroom")}</th>
                <th>{t("teacher")}</th>
                <th>{t("view")}</th>
              </tr>
            </thead>
            <tbody>
              {sortedReports.map((report) => (
                <tr key={getReportKey(report)}>
                  <td>{report.term}</td>
                  <td>{report.year}</td>
                  <td>{formatDate(report.issuedAt)}</td>
                  <td>{report.homeroomClass || "-"}</td>
                  <td>{report.teacher}</td>
                  <td className="report-view-btn-cell">
                    <button
                      className="sdash-view-btn"
                      onClick={() => onView(report)}
                    >
                      {t("view")}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ReportCardsTable;
