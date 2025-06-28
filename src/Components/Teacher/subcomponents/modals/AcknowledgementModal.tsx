import React from "react";
import Modal from "../../../Modal/Modal";

type ParentAcknowledgement = {
  parentName: string;
  acknowledged: boolean;
};

interface AcknowledgementModalProps {
  open: boolean;
  onClose: () => void;
  acknowledgements: ParentAcknowledgement[];
  loading: boolean;
  t: (key: string, options?: any) => string;
}

const AcknowledgementModal: React.FC<AcknowledgementModalProps> = ({
  open,
  onClose,
  acknowledgements,
  loading,
  t,
}) => {
  return (
    <Modal
      open={open}
      onClose={onClose}
      ariaLabel={t("parent_acknowledgements")}
    >
      <h2 style={{ marginTop: 0 }}>{t("parent_acknowledgements")}</h2>
      {loading ? (
        <div>{t("loading")}</div>
      ) : (
        <ul style={{ paddingLeft: 0, listStyle: "none" }}>
          {acknowledgements.map((ack, idx) => (
            <li key={idx} style={{ marginBottom: 8 }}>
              <span style={{ fontWeight: 600 }}>{ack.parentName}</span>
              <span
                style={{
                  marginLeft: 12,
                  color: ack.acknowledged
                    ? "var(--color-success, #4caf50)"
                    : "var(--color-danger, #e74c3c)",
                  fontWeight: 600,
                }}
              >
                {ack.acknowledged ? t("acknowledged") : t("not_acknowledged")}
              </span>
            </li>
          ))}
        </ul>
      )}
      <button
        style={{
          marginTop: 16,
          background: "var(--color-primary, #7bb0ff)",
          color: "var(--color-btn-text, #232946)",
          border: "none",
          borderRadius: 8,
          padding: "0.5rem 1.2rem",
          fontWeight: 600,
          fontSize: "1rem",
          cursor: "pointer",
        }}
        onClick={onClose}
      >
        {t("close")}
      </button>
    </Modal>
  );
};

export default AcknowledgementModal;
