import React from "react";
import Modal from "../../../Modal/Modal";

type StudentProfile = {
  name: string;
  uid: string;
};

interface BulkMarkModalProps {
  open: boolean;
  onClose: () => void;
  subject: string;
  scores: { student: StudentProfile; score: number }[];
  setScore: (idx: number, value: number) => void;
  description: string;
  setDescription: (desc: string) => void;
  total: number;
  setTotal: (total: number) => void;
  onSubmit: () => void;
  loading: boolean;
  t: (key: string, options?: any) => string;
}

const BulkMarkModal: React.FC<BulkMarkModalProps> = ({
  open,
  onClose,
  subject,
  scores,
  setScore,
  description,
  setDescription,
  total,
  setTotal,
  onSubmit,
  loading,
  t,
}) => {
  return (
    <Modal open={open} onClose={onClose} ariaLabel={t("add_marks_bulk")}>
      <h2 style={{ marginTop: 0 }}>
        {t("add_marks_bulk_for_subject", { subject: t(subject) })}
      </h2>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit();
        }}
      >
        <div style={{ marginBottom: 12 }}>
          <label style={{ display: "block", fontWeight: 600, marginBottom: 4 }}>
            {t("description")}
          </label>
          <input
            type="text"
            placeholder={t("description")}
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
          <label style={{ display: "block", fontWeight: 600, marginBottom: 4 }}>
            {t("out_of")}
          </label>
          <input
            type="number"
            min={1}
            placeholder={t("out_of")}
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
        </div>
        <div style={{ maxHeight: 350, overflowY: "auto", marginBottom: 12 }}>
          {scores.map((entry, idx) => (
            <div
              key={entry.student.uid}
              style={{
                borderBottom: "1px solid #2d3a5a",
                padding: "8px 0",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <span style={{ minWidth: 90, fontWeight: 600 }}>
                {entry.student.name}
              </span>
              <input
                type="number"
                min={0}
                placeholder={t("score")}
                value={entry.score}
                onChange={(e) => setScore(idx, Number(e.target.value))}
                style={{ width: 120, fontSize: "1rem", padding: "0.4em" }}
                required
              />
            </div>
          ))}
        </div>
        <div className="tdash-modal-actions">
          <button
            type="submit"
            className="tdash-primary"
            disabled={
              scores.length === 0 ||
              !description.trim() ||
              total <= 0 ||
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
export default BulkMarkModal;
