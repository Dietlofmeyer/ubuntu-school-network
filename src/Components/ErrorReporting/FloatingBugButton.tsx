import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../AuthContext";
import { useErrorReporting } from "../../hooks/useErrorReporting";
import { useErrorModal } from "../../hooks/useErrorModal";
import { BugReportModal, ErrorModal } from "./";
import "./FloatingBugButton.css";

const FloatingBugButton: React.FC = () => {
  const { t } = useTranslation();
  const { profile } = useAuth();
  const { settings, canReport } = useErrorReporting();
  const { errorModal, isErrorModalOpen, showCustomError, hideError } =
    useErrorModal();
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Don't show if error reporting is disabled
  if (!settings.enabled) {
    return null;
  }

  // Check if user role is allowed to report bugs
  const isAllowedRole =
    profile?.role && settings.minimumRoleForReporting.includes(profile.role);

  if (!isAllowedRole) {
    return null;
  }

  const handleOpenModal = () => {
    if (!canReport()) {
      showCustomError(
        t("errorReporting.rateLimitTitle") || "Rate Limit Exceeded",
        t("errorReporting.rateLimitExceeded") ||
          "You have exceeded the rate limit for bug reports. Please wait before submitting another report."
      );
      return;
    }
    setIsModalOpen(true);
  };

  return (
    <>
      <button
        className="floating-bug-button"
        onClick={handleOpenModal}
        title={t("errorReporting.reportBug")}
        aria-label={t("errorReporting.reportBug")}
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M20 8h-2.81c-.45-.78-1.07-1.45-1.82-1.96L17 4.41 15.59 3l-2.17 2.17C12.96 5.06 12.49 5 12 5s-.96.06-1.42.17L8.41 3 7 4.41l1.62 1.63C7.88 6.55 7.26 7.22 6.81 8H4v2h2.09c-.05.33-.09.66-.09 1v1H4v2h2v1c0 .34.04.67.09 1H4v2h2.81c1.04 1.79 2.97 3 5.19 3s4.15-1.21 5.19-3H20v-2h-2.09c.05-.33.09-.66.09-1v-1h2v-2h-2v-1c0-.34-.04-.67-.09-1H20V8zm-6 8h-4v-2h4v2zm0-4h-4v-2h4v2z"
            fill="currentColor"
          />
        </svg>
      </button>

      {isModalOpen && (
        <BugReportModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
        />
      )}

      {/* Error Modal for rate limiting */}
      {isErrorModalOpen && errorModal && (
        <ErrorModal
          isOpen={isErrorModalOpen}
          onClose={hideError}
          error={errorModal}
        />
      )}
    </>
  );
};

export default FloatingBugButton;
