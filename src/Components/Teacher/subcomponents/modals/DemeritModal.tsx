import React, { useState } from "react";
import Modal from "../../../Modal/Modal";

type StudentProfile = {
  name: string;
  uid: string;
};

interface DemeritModalProps {
  open: boolean;
  onClose: () => void;
  student: StudentProfile | null;
  mode: "add" | "remove";
  points: number;
  setPoints: (points: number) => void;
  reason: string;
  setReason: (reason: string) => void;
  onSubmit: () => void;
  loading: boolean;
  t: (key: string, options?: any) => string;
}

const DemeritModal: React.FC<DemeritModalProps> = ({
  open,
  onClose,
  student,
  mode,
  points,
  setPoints,
  reason,
  setReason,
  onSubmit,
  loading,
  t,
}) => {
  return (
    <Modal open={open} onClose={onClose} ariaLabel={t("demerit")}>
      <h2 style={{ marginTop: 0 }}>
        {mode === "add" ? t("add_demerit") : t("remove_points")}
        {student ? ` - ${student.name}` : ""}
      </h2>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit();
        }}
      >
        <div style={{ marginBottom: 12 }}>
          <label style={{ display: "block", fontWeight: 600, marginBottom: 4 }}>
            {t("points")}
          </label>
          <input
            type="number"
            min={1}
            value={points}
            onChange={(e) => setPoints(Number(e.target.value))}
            style={{
              width: "100%",
              fontSize: "1rem",
              padding: "0.5em",
              marginBottom: 8,
            }}
            required
          />
          <label style={{ display: "block", fontWeight: 600, marginBottom: 4 }}>
            {t("reason")}
          </label>
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            style={{
              width: "100%",
              fontSize: "1rem",
              padding: "0.5em",
              marginBottom: 8,
            }}
            required
          />
        </div>
        <div className="tdash-modal-actions">
          <button
            type="submit"
            className="tdash-primary"
            disabled={points <= 0 || !reason.trim() || loading}
          >
            {loading ? t("saving") : t("save")}
          </button>
          <button type="button" onClick={onClose} disabled={loading}>
            {t("cancel")}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default DemeritModal;
