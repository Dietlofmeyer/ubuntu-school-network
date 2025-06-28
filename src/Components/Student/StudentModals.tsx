import { useTranslation } from "react-i18next";
import Modal from "../Modal/Modal";
import DemeritHistoryContent from "./DemeritHistoryContent";
import ReportCardModal from "./ReportCardModal";
import StudentExtracurricularModal from "./StudentExtracurricularModal";
import StudentSubjectSelection from "./StudentSubjectSelection";
import type { ReportCard, Activity, DemeritRecord } from "./types";

interface StudentModalsProps {
  // Demerit History Modal
  showDemeritHistory: boolean;
  demerits: DemeritRecord[];
  onCloseDemeritHistory: () => void;

  // Settings Modal
  showSettings: boolean;
  language: string;
  theme: string;
  themeOptions: { value: string; label: string }[];
  onCloseSettings: () => void;
  onLanguageChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  onThemeChange: (theme: string) => void;

  // Report Card Modal
  viewReport: ReportCard | null;
  studentName: string;
  onCloseReportCard: () => void;

  // Extracurricular Modal
  extracurricularModalOpen: boolean;
  allExtracurriculars: Activity[];
  signedUpIds: string[];
  onSignUp: (activityId: string) => void;
  onWithdraw: (activityId: string) => void;
  onCloseExtracurricular: () => void;

  // Subject Selection Modal - Academic Feature
  showSubjectSelection: boolean;
  onCompleteSubjectSelection: () => void;
  onCloseSubjectSelection: () => void;
}

function StudentModals({
  showDemeritHistory,
  demerits,
  onCloseDemeritHistory,
  showSettings,
  language,
  theme,
  themeOptions,
  onCloseSettings,
  onLanguageChange,
  onThemeChange,
  viewReport,
  studentName,
  onCloseReportCard,
  extracurricularModalOpen,
  allExtracurriculars,
  signedUpIds,
  onSignUp,
  onWithdraw,
  onCloseExtracurricular,
  showSubjectSelection,
  onCompleteSubjectSelection,
  onCloseSubjectSelection,
}: StudentModalsProps) {
  const { t } = useTranslation();

  return (
    <>
      {/* Demerit History Modal */}
      <Modal
        open={showDemeritHistory}
        onClose={onCloseDemeritHistory}
        ariaLabel={t("demerit_history")}
      >
        <DemeritHistoryContent demerits={demerits} />
      </Modal>

      {/* Settings Modal */}
      <Modal
        open={showSettings}
        onClose={onCloseSettings}
        ariaLabel={t("settings")}
      >
        <h2 style={{ marginTop: 0 }}>{t("settings")}</h2>
        <p>{t("settings_placeholder")}</p>

        {/* Language dropdown */}
        <label
          htmlFor="language-select"
          style={{ fontWeight: 600, marginTop: 16 }}
        >
          {t("language")}
        </label>
        <select
          id="language-select"
          value={language}
          onChange={onLanguageChange}
          style={{
            margin: "0.5rem 0 1rem 0",
            padding: "0.3rem",
            width: "100%",
          }}
        >
          <option value="en">English</option>
          <option value="af">Afrikaans</option>
        </select>

        {/* Theme dropdown */}
        <label
          htmlFor="theme-select"
          style={{ fontWeight: 600, marginTop: 16 }}
        >
          Theme
        </label>
        <select
          id="theme-select"
          value={theme}
          onChange={(e) => onThemeChange(e.target.value)}
          style={{
            margin: "0.5rem 0 1rem 0",
            padding: "0.3rem",
            width: "100%",
          }}
        >
          {themeOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <button onClick={onCloseSettings}>{t("close")}</button>
      </Modal>

      {/* Report Card Modal */}
      {viewReport && (
        <ReportCardModal
          report={viewReport}
          studentName={studentName}
          onClose={onCloseReportCard}
        />
      )}

      {/* Extracurricular Modal */}
      {extracurricularModalOpen && (
        <StudentExtracurricularModal
          allExtracurriculars={allExtracurriculars}
          signedUpIds={signedUpIds}
          onSignUp={onSignUp}
          onWithdraw={onWithdraw}
          onClose={onCloseExtracurricular}
        />
      )}

      {/* Subject Selection Modal - Academic Feature */}
      {showSubjectSelection && (
        <StudentSubjectSelection
          isModal={true}
          onComplete={onCompleteSubjectSelection}
          onClose={onCloseSubjectSelection}
        />
      )}
    </>
  );
}

export default StudentModals;
