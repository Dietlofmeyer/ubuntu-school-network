import React, { useState, useEffect } from "react";
import Modal from "../../../Modal/Modal";

export type SettingsModalProps = {
  open: boolean;
  onClose: () => void;
  homeroomEdit: string;
  setHomeroomEdit: React.Dispatch<React.SetStateAction<string>>;
  homeroomSaving: boolean;
  onSaveHomeroom: () => Promise<void>;
  language: string;
  setLanguage: (lang: string) => void;
  availableLanguages: { code: string; label: string }[];
  t: (key: string) => string;
  theme: string;
  setTheme: (theme: string) => void;
  themeOptions: { value: string; label: string }[];
};

const SettingsModal: React.FC<SettingsModalProps> = ({
  open,
  onClose,
  homeroomEdit,
  setHomeroomEdit,
  homeroomSaving,
  onSaveHomeroom,
  language,
  setLanguage,
  availableLanguages,
  t,
  theme,
  setTheme,
  themeOptions,
}) => {
  return (
    <Modal open={open} onClose={onClose} ariaLabel={t("settings")}>
      <h2 style={{ marginTop: 0 }}>{t("settings")}</h2>
      <div style={{ marginBottom: 16 }}>
        <label style={{ fontWeight: 600 }}>{t("homeroom_class")}</label>
        <input
          type="text"
          value={homeroomEdit}
          onChange={(e) => setHomeroomEdit(e.target.value)}
          style={{
            width: "100%",
            fontSize: "1rem",
            padding: "0.5em",
            marginBottom: 8,
          }}
        />
        <button
          onClick={onSaveHomeroom}
          disabled={homeroomSaving}
          style={{
            background: "#7bb0ff",
            color: "#232946",
            border: "none",
            borderRadius: 8,
            padding: "0.5rem 1.2rem",
            fontWeight: 600,
            fontSize: "1rem",
            cursor: "pointer",
            width: "100%",
            marginBottom: 8,
          }}
        >
          {homeroomSaving ? t("saving") : t("save")}
        </button>
      </div>
      <div style={{ marginBottom: 16 }}>
        <label style={{ fontWeight: 600 }}>{t("language")}</label>
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          style={{
            width: "100%",
            fontSize: "1rem",
            padding: "0.5em",
            marginBottom: 8,
          }}
        >
          {availableLanguages.map((lang) => (
            <option key={lang.code} value={lang.code}>
              {lang.label}
            </option>
          ))}
        </select>
      </div>
      <div style={{ marginBottom: 16 }}>
        <label style={{ fontWeight: 600 }}>Theme</label>
        <select
          value={theme}
          onChange={(e) => setTheme(e.target.value)}
          style={{
            width: "100%",
            fontSize: "1rem",
            padding: "0.5em",
            marginBottom: 8,
          }}
        >
          {themeOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
      <button onClick={onClose} style={{ width: "100%" }}>
        {t("close")}
      </button>
    </Modal>
  );
};

export default SettingsModal;
