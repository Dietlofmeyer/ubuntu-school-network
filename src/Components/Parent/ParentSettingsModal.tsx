import React, { useState } from "react";
import { db } from "../../firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { useAuth } from "../../AuthContext"; // Adjust path as needed

type ParentSettingsModalProps = {
  open: boolean;
  onClose: () => void;
  t: any;
  profile: any;
  theme: string;
  setTheme: (theme: string) => void;
  themeOptions: { value: string; label: string }[];
  language: string;
  handleLanguageChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
};

const ParentSettingsModal = ({
  open,
  onClose,
  t,
  profile,
  theme,
  setTheme,
  themeOptions,
  language,
  handleLanguageChange,
}: ParentSettingsModalProps) => {
  const { user } = useAuth();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletionRequested, setDeletionRequested] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleRequestAccountDeletion = () => {
    setShowDeleteConfirm(true);
  };

  const handleConfirmAccountDeletion = async () => {
    if (!user) return;
    setLoading(true);
    await addDoc(collection(db, "deletionRequests"), {
      requestType: "parent",
      targetId: user.uid,
      requestedBy: user.uid,
      parentName: profile?.name || "",
      timestamp: serverTimestamp(),
      status: "pending",
    });
    setDeletionRequested(true);
    setLoading(false);
    setShowDeleteConfirm(false);
  };

  if (!open) return null;

  return (
    <div
      className={`parent-settings-modal ${theme}`}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        background: "rgba(0,0,0,0.4)",
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        className="parent-settings-modal-content"
        style={{ position: "relative" }}
      >
        {/* Close X button */}
        <button
          className="parent-settings-modal-x"
          onClick={onClose}
          aria-label={t("close")}
          style={{
            position: "absolute",
            top: 12,
            right: 16,
            background: "none",
            border: "none",
            color: "var(--color-text)",
            fontSize: 24,
            cursor: "pointer",
            fontWeight: 700,
            lineHeight: 1,
            zIndex: 2,
          }}
        >
          ×
        </button>

        <h2>{t("settings")}</h2>

        {/* Theme selection */}
        <div className="parent-settings-modal-row">
          <label>
            {t("theme")}:{" "}
            <select value={theme} onChange={(e) => setTheme(e.target.value)}>
              {themeOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        {/* Language selection */}
        <div className="parent-settings-modal-row">
          <label>
            {t("language")}:{" "}
            <select value={language} onChange={handleLanguageChange}>
              <option value="en">English</option>
              <option value="af">Afrikaans</option>
              {/* Add more languages as needed */}
            </select>
          </label>
        </div>

        <hr className="parent-settings-modal-divider" />

        <div>
          {!deletionRequested && !showDeleteConfirm && (
            <button
              className="parent-settings-modal-delete-btn"
              onClick={handleRequestAccountDeletion}
              style={{
                marginTop: 8,
                background: "var(--color-danger)",
                color: "#fff",
                border: "none",
                borderRadius: 4,
                padding: "8px 16px",
                cursor: "pointer",
              }}
            >
              {t("request_account_deletion")}
            </button>
          )}

          {/* Show confirmation dialog as a new popup */}
          {showDeleteConfirm && !deletionRequested && (
            <div
              className="parent-settings-modal-confirm-overlay"
              style={{
                position: "fixed",
                top: 0,
                left: 0,
                width: "100vw",
                height: "100vh",
                background: "rgba(0,0,0,0.5)",
                zIndex: 1100,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <div
                className="parent-settings-modal-content"
                style={{
                  position: "relative",
                  minWidth: 300,
                  maxWidth: 400,
                  background: "var(--color-bg-card)",
                  color: "var(--color-text)",
                  padding: 24,
                  borderRadius: 8,
                  boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                  textAlign: "center",
                }}
              >
                <p>{t("account_deletion_warning")}</p>
                <button
                  className="parent-settings-modal-delete-btn"
                  onClick={handleConfirmAccountDeletion}
                  disabled={loading}
                  style={{
                    marginRight: 8,
                    marginTop: 8,
                    background: "var(--color-danger)",
                    color: "#fff",
                    border: "none",
                    borderRadius: 4,
                    padding: "8px 16px",
                    cursor: "pointer",
                  }}
                >
                  {loading
                    ? t("processing")
                    : t("confirm_account_deletion") || "Delete Account"}
                </button>
                <button
                  className="parent-settings-modal-delete-btn"
                  onClick={() => setShowDeleteConfirm(false)}
                  style={{
                    marginTop: 8,
                    background: "var(--color-danger)",
                    color: "#fff",
                    border: "none",
                    borderRadius: 4,
                    padding: "8px 16px",
                    cursor: "pointer",
                  }}
                >
                  {t("cancel")}
                </button>
              </div>
            </div>
          )}

          {/* Show after request sent */}
          {deletionRequested && (
            <div style={{ marginTop: 12 }}>
              <span>{t("deletion_request_sent")}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ParentSettingsModal;
