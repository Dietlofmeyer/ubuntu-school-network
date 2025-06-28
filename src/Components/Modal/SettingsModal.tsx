import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useTheme } from "../../ThemeContext";
import { useAuth } from "../../AuthContext";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../../firebase";
import "./SettingsModal.css";

type Props = {
  isOpen: boolean;
  onClose: () => void;
};

const SettingsModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { t, i18n } = useTranslation();
  const { theme, setTheme, themeOptions } = useTheme();
  const { user, profile } = useAuth();

  const [selectedLanguage, setSelectedLanguage] = useState(i18n.language);
  const [selectedTheme, setSelectedTheme] = useState(theme);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  const languages = [
    { code: "en", name: "English", flag: "🇺🇸" },
    { code: "af", name: "Afrikaans", flag: "🇿🇦" },
  ];

  useEffect(() => {
    if (isOpen) {
      setSelectedLanguage(i18n.language);
      setSelectedTheme(theme);
      setSuccess(false);
    }
  }, [isOpen, i18n.language, theme]);

  const handleSave = async () => {
    setSaving(true);
    setSuccess(false);

    try {
      // Update language
      if (selectedLanguage !== i18n.language) {
        await i18n.changeLanguage(selectedLanguage);
        localStorage.setItem("language", selectedLanguage);
      }

      // Update theme
      if (selectedTheme !== theme) {
        setTheme(selectedTheme);
      }

      // Save preferences to user profile if logged in
      if (user && profile) {
        const userRef = doc(db, "users", user.uid);
        await updateDoc(userRef, {
          preferences: {
            language: selectedLanguage,
            theme: selectedTheme,
            updatedAt: new Date().toISOString(),
          },
        });
      }

      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 1500);
    } catch (error) {
      console.error("Error saving settings:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setSelectedLanguage(i18n.language);
    setSelectedTheme(theme);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="settings-modal-overlay" onClick={onClose}>
      <div className="settings-modal" onClick={(e) => e.stopPropagation()}>
        <div className="settings-modal-header">
          <h2 className="settings-modal-title">
            <span className="settings-icon">⚙️</span>
            {t("settings")}
          </h2>
          <button className="settings-close-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="settings-modal-content">
          {/* Language Selection */}
          <div className="setting-section">
            <h3 className="setting-title">
              <span className="setting-icon">🌐</span>
              {t("language")}
            </h3>
            <div className="language-options">
              {languages.map((lang) => (
                <label key={lang.code} className="language-option">
                  <input
                    type="radio"
                    name="language"
                    value={lang.code}
                    checked={selectedLanguage === lang.code}
                    onChange={(e) => setSelectedLanguage(e.target.value)}
                  />
                  <span className="language-flag">{lang.flag}</span>
                  <span className="language-name">{lang.name}</span>
                  {selectedLanguage === lang.code && (
                    <span className="language-check">✓</span>
                  )}
                </label>
              ))}
            </div>
          </div>

          {/* Theme Selection */}
          <div className="setting-section">
            <h3 className="setting-title">
              <span className="setting-icon">🎨</span>
              {t("theme")}
            </h3>
            <div className="theme-options">
              {Object.entries(themeOptions).map(([key, themeData]) => (
                <label key={key} className="theme-option">
                  <input
                    type="radio"
                    name="theme"
                    value={key}
                    checked={selectedTheme === key}
                    onChange={(e) => setSelectedTheme(e.target.value)}
                  />
                  <div className="theme-preview" data-theme={key}>
                    <div className="theme-preview-header"></div>
                    <div className="theme-preview-content">
                      <div className="theme-preview-card"></div>
                      <div className="theme-preview-text"></div>
                    </div>
                  </div>
                  <span className="theme-name">{themeData.label}</span>
                  {selectedTheme === key && (
                    <span className="theme-check">✓</span>
                  )}
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="settings-modal-footer">
          {success && (
            <div className="settings-success">
              <span className="success-icon">✅</span>
              {t("settings_saved_successfully")}
            </div>
          )}
          <div className="settings-actions">
            <button
              className="settings-cancel-btn"
              onClick={handleCancel}
              disabled={saving}
            >
              {t("cancel")}
            </button>
            <button
              className="settings-save-btn"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? (
                <>
                  <span className="loading-spinner"></span>
                  {t("saving")}
                </>
              ) : (
                <>
                  <span className="save-icon">💾</span>
                  {t("save_settings")}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
