import React, { useState } from "react";
import Modal from "../../../Modal/Modal";

type StudentProfile = {
  name: string;
  email: string;
  grade?: string;
  subjects?: string[];
  uid: string;
  homeroomClass?: string;
  demerits?: any[];
  marks?: any[];
  reports?: any[];
};

interface AddMarkModalProps {
  open: boolean;
  onClose: () => void;
  student: StudentProfile | null;
  subject: string;
  setSubject: (subject: string) => void;
  score: number;
  setScore: (score: number) => void;
  total: number;
  setTotal: (total: number) => void;
  description: string;
  setDescription: (desc: string) => void;
  onSubmit: () => void;
  loading: boolean;
  t: (key: string, options?: any) => string;
  availableSubjects: string[];
}

const AddMarkModal: React.FC<AddMarkModalProps> = ({
  open,
  onClose,
  student,
  subject,
  setSubject,
  score,
  setScore,
  total,
  setTotal,
  description,
  setDescription,
  onSubmit,
  loading,
  t,
  availableSubjects,
}) => {
  return (
    <Modal open={open} onClose={onClose} ariaLabel={t("add_marks")}>
      <h2 style={{ marginTop: 0 }}>
        {t("add_marks")} {student ? `- ${student.name}` : ""}
      </h2>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit();
        }}
      >
        <div style={{ marginBottom: 12 }}>
          <label style={{ display: "block", fontWeight: 600, marginBottom: 4 }}>
            {t("subject")}
          </label>
          <select
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            style={{
              width: "100%",
              fontSize: "1rem",
              padding: "0.5em",
              marginBottom: 8,
            }}
            required
          >
            <option value="">{t("select_subject")}</option>
            {availableSubjects.map((subj) => (
              <option value={subj} key={subj}>
                {t(subj)}
              </option>
            ))}
          </select>
          <label style={{ display: "block", fontWeight: 600, marginBottom: 4 }}>
            {t("score")}
          </label>
          <input
            type="number"
            min={0}
            value={score}
            onChange={(e) => setScore(Number(e.target.value))}
            style={{
              width: "100%",
              fontSize: "1rem",
              padding: "0.5em",
              marginBottom: 8,
            }}
            required
          />
          <label style={{ display: "block", fontWeight: 600, marginBottom: 4 }}>
            {t("out_of")}
          </label>
          <input
            type="number"
            min={1}
            value={total}
            onChange={(e) => setTotal(Number(e.target.value))}
            style={{
              width: "100%",
              fontSize: "1rem",
              padding: "0.5em",
              marginBottom: 8,
            }}
            required
          />
          <label style={{ display: "block", fontWeight: 600, marginBottom: 4 }}>
            {t("description")}
          </label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
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
            disabled={
              !subject ||
              score < 0 ||
              total <= 0 ||
              !description.trim() ||
              loading
            }
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
export default AddMarkModal;
