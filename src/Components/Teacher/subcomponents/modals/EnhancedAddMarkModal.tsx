import React, { useState, useEffect } from "react";
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

type Mark = {
  subject: string;
  score: number;
  total: number;
  description: string;
  date: string;
  teacher: string;
  category?: string;
};

type MarkTemplate = {
  id: string;
  name: string;
  category: string;
  total: number;
  description: string;
  subject?: string;
};

interface EnhancedAddMarkModalProps {
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
  recentMarks?: Mark[];
  markTemplates?: MarkTemplate[];
}

const EnhancedAddMarkModal: React.FC<EnhancedAddMarkModalProps> = ({
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
  recentMarks = [],
  markTemplates = [],
}) => {
  const [category, setCategory] = useState<string>("");
  const [showTemplates, setShowTemplates] = useState(false);
  const [showRecentMarks, setShowRecentMarks] = useState(false);
  const [validation, setValidation] = useState<{ [key: string]: string }>({});
  const [saveAsDraft, setSaveAsDraft] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const markCategories = [
    { value: "test", label: t("test") },
    { value: "quiz", label: t("quiz") },
    { value: "assignment", label: t("assignment") },
    { value: "project", label: t("project") },
    { value: "homework", label: t("homework") },
    { value: "participation", label: t("participation") },
    { value: "other", label: t("other") },
  ];

  // Validation logic
  useEffect(() => {
    const errors: { [key: string]: string } = {};

    if (score < 0) errors.score = t("score_cannot_be_negative");
    if (total <= 0) errors.total = t("total_must_be_positive");
    if (score > total) errors.score = t("score_cannot_exceed_total");
    if (!description.trim()) errors.description = t("description_required");
    if (!subject) errors.subject = t("subject_required");

    setValidation(errors);
  }, [score, total, description, subject, t]);

  // Apply template
  const applyTemplate = (template: MarkTemplate) => {
    setTotal(template.total);
    setDescription(template.description);
    setCategory(template.category);
    if (template.subject && availableSubjects.includes(template.subject)) {
      setSubject(template.subject);
    }
    setShowTemplates(false);
  };

  // Calculate percentage and grade
  const percentage = total > 0 ? (score / total) * 100 : 0;
  const getGradeColor = (percent: number) => {
    if (percent >= 80) return "#28a745";
    if (percent >= 70) return "#17a2b8";
    if (percent >= 60) return "#ffc107";
    if (percent >= 50) return "#fd7e14";
    return "#dc3545";
  };

  // Get relevant recent marks for context
  const relevantRecentMarks = recentMarks
    .filter((mark) => mark.subject === subject && mark.category === category)
    .slice(0, 3);

  const isFormValid =
    Object.keys(validation).length === 0 && subject && description.trim();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isFormValid) {
      onSubmit();
      setSuccessMessage(t("mark_assigned_successfully"));
      setTimeout(() => setSuccessMessage(""), 3000);
    }
  };

  const handleClose = () => {
    setCategory("");
    setValidation({});
    setSuccessMessage("");
    onClose();
  };

  return (
    <Modal open={open} onClose={handleClose} ariaLabel={t("add_marks")}>
      <div style={{ minWidth: "500px", maxWidth: "600px" }}>
        <h2
          style={{
            marginTop: 0,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <span>📝</span>
          {t("add_marks")} {student ? `- ${student.name}` : ""}
        </h2>

        {successMessage && (
          <div
            style={{
              background: "#d4edda",
              color: "#155724",
              padding: "8px 12px",
              borderRadius: "4px",
              marginBottom: "16px",
              border: "1px solid #c3e6cb",
            }}
          >
            ✅ {successMessage}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Quick Actions */}
          <div
            style={{
              display: "flex",
              gap: 8,
              marginBottom: 16,
              flexWrap: "wrap",
            }}
          >
            <button
              type="button"
              onClick={() => setShowTemplates(!showTemplates)}
              style={{
                background: "var(--color-bg-card-alt)",
                color: "var(--color-primary)",
                border: "1px solid var(--color-primary)",
                borderRadius: "8px",
                padding: "6px 12px",
                fontSize: "0.9rem",
                cursor: "pointer",
                transition: "all 0.2s ease",
              }}
            >
              📋 {t("use_template")}
            </button>
            <button
              type="button"
              onClick={() => setShowRecentMarks(!showRecentMarks)}
              style={{
                background: "var(--color-bg-card-alt)",
                color: "var(--color-accent)",
                border: "1px solid var(--color-accent)",
                borderRadius: "8px",
                padding: "6px 12px",
                fontSize: "0.9rem",
                cursor: "pointer",
                transition: "all 0.2s ease",
              }}
            >
              📊 {t("recent_marks")}
            </button>
          </div>

          {/* Templates Panel */}
          {showTemplates && (
            <div
              style={{
                background: "var(--color-bg-card-alt)",
                border: "1px solid var(--color-muted)",
                borderRadius: "8px",
                padding: "12px",
                marginBottom: "16px",
              }}
            >
              <h4 style={{ margin: "0 0 8px 0", color: "var(--color-text)" }}>
                📋 {t("mark_templates")}
              </h4>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {markTemplates.map((template) => (
                  <button
                    key={template.id}
                    type="button"
                    onClick={() => applyTemplate(template)}
                    style={{
                      background: "var(--color-bg-card)",
                      border: "1px solid var(--color-muted)",
                      borderRadius: "4px",
                      padding: "8px",
                      textAlign: "left",
                      cursor: "pointer",
                      fontSize: "0.9rem",
                      color: "var(--color-text)",
                      transition: "all 0.2s ease",
                    }}
                  >
                    <strong>{template.name}</strong> - {template.description} (
                    {template.total} {t("points")})
                  </button>
                ))}
                {markTemplates.length === 0 && (
                  <p
                    style={{
                      margin: 0,
                      color: "var(--color-muted)",
                      fontSize: "0.9rem",
                    }}
                  >
                    {t("no_templates_available")}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Recent Marks Panel */}
          {showRecentMarks && relevantRecentMarks.length > 0 && (
            <div
              style={{
                background: "var(--color-bg-card-alt)",
                border: "1px solid var(--color-muted)",
                borderRadius: "8px",
                padding: "12px",
                marginBottom: "16px",
              }}
            >
              <h4 style={{ margin: "0 0 8px 0", color: "var(--color-text)" }}>
                📊 {t("recent_similar_marks")}
              </h4>
              <div style={{ fontSize: "0.9rem", color: "var(--color-text)" }}>
                {relevantRecentMarks.map((mark, idx) => (
                  <div key={idx} style={{ marginBottom: "4px" }}>
                    <strong>
                      {mark.score}/{mark.total}
                    </strong>{" "}
                    ({((mark.score / mark.total) * 100).toFixed(1)}%) -{" "}
                    {mark.description}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "16px",
              marginBottom: 16,
            }}
          >
            {/* Subject */}
            <div>
              <label
                style={{
                  display: "block",
                  fontWeight: 600,
                  marginBottom: 4,
                  color: "var(--color-text)",
                }}
              >
                {t("subject")} *
              </label>
              <select
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                style={{
                  width: "100%",
                  fontSize: "1rem",
                  padding: "0.5em",
                  border: validation.subject
                    ? "2px solid var(--color-danger)"
                    : "1px solid var(--color-muted)",
                  borderRadius: "8px",
                  background: "var(--color-bg-card-alt)",
                  color: "var(--color-text)",
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
              {validation.subject && (
                <div
                  style={{
                    color: "var(--color-danger)",
                    fontSize: "0.8rem",
                    marginTop: "2px",
                  }}
                >
                  {validation.subject}
                </div>
              )}
            </div>

            {/* Category */}
            <div>
              <label
                style={{
                  display: "block",
                  fontWeight: 600,
                  marginBottom: 4,
                  color: "var(--color-text)",
                }}
              >
                {t("category")}
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                style={{
                  width: "100%",
                  fontSize: "1rem",
                  padding: "0.5em",
                  border: "1px solid var(--color-muted)",
                  borderRadius: "8px",
                  background: "var(--color-bg-card-alt)",
                  color: "var(--color-text)",
                }}
              >
                <option value="">{t("select_category")}</option>
                {markCategories.map((cat) => (
                  <option value={cat.value} key={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: "16px",
              marginBottom: 16,
            }}
          >
            {/* Score */}
            <div>
              <label
                style={{
                  display: "block",
                  fontWeight: 600,
                  marginBottom: 4,
                  color: "var(--color-text)",
                }}
              >
                {t("score")} *
              </label>
              <input
                type="number"
                min={0}
                max={total || undefined}
                value={score}
                onChange={(e) => setScore(Number(e.target.value))}
                style={{
                  width: "100%",
                  fontSize: "1rem",
                  padding: "0.5em",
                  border: validation.score
                    ? "2px solid var(--color-danger)"
                    : "1px solid var(--color-muted)",
                  borderRadius: "8px",
                  background: "var(--color-bg-card-alt)",
                  color: "var(--color-text)",
                }}
                required
              />
              {validation.score && (
                <div
                  style={{
                    color: "var(--color-danger)",
                    fontSize: "0.8rem",
                    marginTop: "2px",
                  }}
                >
                  {validation.score}
                </div>
              )}
            </div>

            {/* Total */}
            <div>
              <label
                style={{
                  display: "block",
                  fontWeight: 600,
                  marginBottom: 4,
                  color: "var(--color-text)",
                }}
              >
                {t("out_of")} *
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
                  border: validation.total
                    ? "2px solid var(--color-danger)"
                    : "1px solid var(--color-muted)",
                  borderRadius: "8px",
                  background: "var(--color-bg-card-alt)",
                  color: "var(--color-text)",
                }}
                required
              />
              {validation.total && (
                <div
                  style={{
                    color: "var(--color-danger)",
                    fontSize: "0.8rem",
                    marginTop: "2px",
                  }}
                >
                  {validation.total}
                </div>
              )}
            </div>

            {/* Percentage Display */}
            <div>
              <label
                style={{
                  display: "block",
                  fontWeight: 600,
                  marginBottom: 4,
                  color: "var(--color-text)",
                }}
              >
                {t("percentage")}
              </label>
              <div
                style={{
                  height: "42px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "var(--color-bg-card-alt)",
                  border: "1px solid var(--color-muted)",
                  borderRadius: "8px",
                  fontSize: "1.1rem",
                  fontWeight: "bold",
                  color: getGradeColor(percentage),
                }}
              >
                {total > 0 ? `${percentage.toFixed(1)}%` : "-%"}
              </div>
            </div>
          </div>

          {/* Description */}
          <div style={{ marginBottom: 16 }}>
            <label
              style={{
                display: "block",
                fontWeight: 600,
                marginBottom: 4,
                color: "var(--color-text)",
              }}
            >
              {t("description")} *
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("description_placeholder")}
              style={{
                width: "100%",
                fontSize: "1rem",
                padding: "0.5em",
                border: validation.description
                  ? "2px solid var(--color-danger)"
                  : "1px solid var(--color-muted)",
                borderRadius: "8px",
                minHeight: "80px",
                resize: "vertical",
                background: "var(--color-bg-card-alt)",
                color: "var(--color-text)",
              }}
              required
            />
            {validation.description && (
              <div
                style={{
                  color: "var(--color-danger)",
                  fontSize: "0.8rem",
                  marginTop: "2px",
                }}
              >
                {validation.description}
              </div>
            )}
          </div>

          {/* Actions */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              paddingTop: "16px",
              borderTop: "1px solid var(--color-muted)",
            }}
          >
            <div>
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  fontSize: "0.9rem",
                  color: "var(--color-text)",
                }}
              >
                <input
                  type="checkbox"
                  checked={saveAsDraft}
                  onChange={(e) => setSaveAsDraft(e.target.checked)}
                />
                {t("save_as_draft")}
              </label>
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              <button
                type="button"
                onClick={handleClose}
                disabled={loading}
                style={{
                  padding: "8px 16px",
                  border: "1px solid var(--color-muted)",
                  background: "var(--color-bg-card)",
                  color: "var(--color-text)",
                  borderRadius: "8px",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                }}
              >
                {t("cancel")}
              </button>
              <button
                type="submit"
                disabled={!isFormValid || loading}
                style={{
                  padding: "8px 16px",
                  border: "none",
                  background: isFormValid
                    ? "var(--color-success)"
                    : "var(--color-muted)",
                  color: "var(--color-btn-text)",
                  borderRadius: "8px",
                  cursor: isFormValid ? "pointer" : "not-allowed",
                  fontWeight: "600",
                  transition: "all 0.2s ease",
                }}
              >
                {loading ? t("saving") : t("assign_mark")}
              </button>
            </div>
          </div>
        </form>
      </div>
    </Modal>
  );
};

export default EnhancedAddMarkModal;
