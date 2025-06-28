import React from "react";
import Modal from "../../../Modal/Modal";

type StudentProfile = {
  uid: string;
  name: string;
  email: string;
  homeroomClass?: string;
};

interface ManageHomeroomModalProps {
  open: boolean;
  onClose: () => void;
  candidates: StudentProfile[];
  selected: string[];
  setSelected: (uids: string[]) => void;
  loading: boolean;
  search: string;
  setSearch: (val: string) => void;
  onSave: () => void;
  t: (key: string, options?: any) => string;
  teacherHomeroomClass?: string;
}

const ManageHomeroomModal: React.FC<ManageHomeroomModalProps> = ({
  open,
  onClose,
  candidates,
  selected,
  setSelected,
  loading,
  search,
  setSearch,
  onSave,
  t,
  teacherHomeroomClass,
}) => {
  return (
    <Modal open={open} onClose={onClose} ariaLabel={t("manage_homeroom")}>
      <h2 style={{ marginTop: 0 }}>{t("manage_homeroom")}</h2>
      <input
        type="text"
        placeholder={t("search_students")}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{
          width: "100%",
          marginBottom: 12,
          padding: 6,
          fontSize: "1rem",
        }}
      />
      {loading ? (
        <div>{t("loading")}</div>
      ) : (
        <div style={{ maxHeight: 350, overflowY: "auto", marginBottom: 12 }}>
          {candidates
            .filter(
              (s) =>
                s.name.toLowerCase().includes(search.toLowerCase()) ||
                (s.email &&
                  s.email.toLowerCase().includes(search.toLowerCase()))
            )
            .map((s) => (
              <label
                key={s.uid}
                style={{
                  display: "flex",
                  alignItems: "center",
                  marginBottom: 6,
                  fontWeight: 500,
                }}
              >
                <input
                  type="checkbox"
                  checked={selected.includes(s.uid)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelected([...selected, s.uid]);
                    } else {
                      setSelected(selected.filter((uid) => uid !== s.uid));
                    }
                  }}
                  style={{ marginRight: 8 }}
                />
                {s.name}{" "}
                <span
                  style={{
                    color: "#bfc9d1",
                    marginLeft: 8,
                    fontSize: "0.97em",
                  }}
                >
                  {s.email}
                </span>
                {s.homeroomClass &&
                  s.homeroomClass !== teacherHomeroomClass && (
                    <span
                      style={{
                        color: "#e74c3c",
                        marginLeft: 8,
                        fontSize: "0.97em",
                      }}
                    >
                      ({t("already_in_homeroom", { homeroom: s.homeroomClass })}
                      )
                    </span>
                  )}
              </label>
            ))}
        </div>
      )}
      <button
        onClick={onSave}
        disabled={loading}
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
        {loading ? t("saving") : t("save")}
      </button>
      <button onClick={onClose} disabled={loading} style={{ width: "100%" }}>
        {" "}
        {t("close")}{" "}
      </button>
    </Modal>
  );
};

export default ManageHomeroomModal;
