import React, { useState, useEffect } from "react";
import Modal from "../../../Modal/Modal";

type StudentProfile = {
  name: string;
  uid: string;
  email?: string;
  grade?: string;
};

type BulkMarkEntry = {
  student: StudentProfile;
  score: number;
  selected: boolean;
  notes?: string;
};

interface EnhancedBulkMarkModalProps {
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

const EnhancedBulkMarkModal: React.FC<EnhancedBulkMarkModalProps> = ({
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
  const [enhancedScores, setEnhancedScores] = useState<BulkMarkEntry[]>([]);
  const [category, setCategory] = useState<string>("");
  const [searchFilter, setSearchFilter] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "grade" | "score">("name");
  const [quickFillValue, setQuickFillValue] = useState<number>(0);
  const [showValidation, setShowValidation] = useState(false);
  const [progressStats, setProgressStats] = useState({
    completed: 0,
    total: 0,
  });

  const markCategories = [
    { value: "test", label: t("test") },
    { value: "quiz", label: t("quiz") },
    { value: "assignment", label: t("assignment") },
    { value: "project", label: t("project") },
    { value: "homework", label: t("homework") },
    { value: "participation", label: t("participation") },
    { value: "other", label: t("other") },
  ];

  // Initialize enhanced scores when modal opens
  useEffect(() => {
    if (open && scores.length > 0) {
      setEnhancedScores(
        scores.map((entry) => ({
          ...entry,
          selected: true,
          notes: "",
        }))
      );
    }
  }, [open, scores]);

  // Update progress stats
  useEffect(() => {
    const completed = enhancedScores.filter(
      (entry) => entry.selected && entry.score >= 0 && entry.score <= total
    ).length;
    setProgressStats({ completed, total: enhancedScores.length });
  }, [enhancedScores, total]);

  // Filter and sort students
  const filteredAndSortedScores = enhancedScores
    .filter(
      (entry) =>
        entry.student.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
        (entry.student.email &&
          entry.student.email
            .toLowerCase()
            .includes(searchFilter.toLowerCase()))
    )
    .sort((a, b) => {
      switch (sortBy) {
        case "name":
          return a.student.name.localeCompare(b.student.name);
        case "grade":
          return (a.student.grade || "").localeCompare(b.student.grade || "");
        case "score":
          return b.score - a.score;
        default:
          return 0;
      }
    });

  // Update score
  const updateScore = (idx: number, value: number) => {
    const actualIndex = enhancedScores.findIndex(
      (entry) => entry.student.uid === filteredAndSortedScores[idx].student.uid
    );
    if (actualIndex >= 0) {
      const newScores = [...enhancedScores];
      newScores[actualIndex].score = value;
      setEnhancedScores(newScores);
      setScore(actualIndex, value);
    }
  };

  // Toggle student selection
  const toggleSelection = (idx: number) => {
    const actualIndex = enhancedScores.findIndex(
      (entry) => entry.student.uid === filteredAndSortedScores[idx].student.uid
    );
    if (actualIndex >= 0) {
      const newScores = [...enhancedScores];
      newScores[actualIndex].selected = !newScores[actualIndex].selected;
      setEnhancedScores(newScores);
    }
  };

  // Quick fill functions
  const quickFillSelected = () => {
    const newScores = enhancedScores.map((entry) => ({
      ...entry,
      score: entry.selected ? quickFillValue : entry.score,
    }));
    setEnhancedScores(newScores);
    // Update parent scores
    newScores.forEach((entry, idx) => {
      setScore(idx, entry.score);
    });
  };

  const selectAll = () => {
    setEnhancedScores(
      enhancedScores.map((entry) => ({ ...entry, selected: true }))
    );
  };

  const selectNone = () => {
    setEnhancedScores(
      enhancedScores.map((entry) => ({ ...entry, selected: false }))
    );
  };

  // Validation
  const getValidationIssues = () => {
    const issues: string[] = [];
    if (!description.trim()) issues.push(t("description_required"));
    if (!total || total <= 0) issues.push(t("total_must_be_positive"));

    const selectedEntries = enhancedScores.filter((entry) => entry.selected);
    if (selectedEntries.length === 0)
      issues.push(t("select_at_least_one_student"));

    const invalidScores = selectedEntries.filter(
      (entry) => entry.score < 0 || entry.score > total
    );
    if (invalidScores.length > 0) {
      issues.push(t("some_scores_invalid", { count: invalidScores.length }));
    }

    return issues;
  };

  const validationIssues = getValidationIssues();
  const isFormValid = validationIssues.length === 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setShowValidation(true);
    if (isFormValid) {
      onSubmit();
    }
  };

  const getScoreColor = (score: number, total: number) => {
    if (total <= 0) return "#6c757d";
    const percentage = (score / total) * 100;
    if (percentage >= 80) return "#28a745";
    if (percentage >= 70) return "#17a2b8";
    if (percentage >= 60) return "#ffc107";
    if (percentage >= 50) return "#fd7e14";
    return "#dc3545";
  };

  return (
    <Modal open={open} onClose={onClose} ariaLabel={t("add_marks_bulk")}>
      <div style={{ minWidth: "800px", maxWidth: "1000px", maxHeight: "90vh" }}>
        <h2
          style={{
            marginTop: 0,
            display: "flex",
            alignItems: "center",
            gap: 8,
            color: "var(--color-text)",
          }}
        >
          <span>📊</span>
          {t("bulk_mark_assignment")} - {t(subject)}
        </h2>

        {/* Progress Indicator */}
        <div
          style={{
            background: "var(--color-bg-card-alt)",
            border: "1px solid var(--color-muted)",
            borderRadius: "8px",
            padding: "12px",
            marginBottom: "16px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div style={{ color: "var(--color-text)" }}>
            <strong>
              {progressStats.completed}/{progressStats.total}
            </strong>{" "}
            {t("students_ready")}
          </div>
          <div
            style={{
              background: "var(--color-primary)",
              color: "var(--color-btn-text)",
              padding: "4px 8px",
              borderRadius: "6px",
              fontSize: "0.9rem",
            }}
          >
            {progressStats.total > 0
              ? Math.round(
                  (progressStats.completed / progressStats.total) * 100
                )
              : 0}
            % {t("complete")}
          </div>
        </div>

        {/* Validation Issues */}
        {showValidation && validationIssues.length > 0 && (
          <div
            style={{
              background: "var(--color-danger)",
              color: "var(--color-btn-text)",
              border: "1px solid var(--color-danger)",
              borderRadius: "8px",
              padding: "12px",
              marginBottom: "16px",
              opacity: 0.9,
            }}
          >
            <strong>⚠️ {t("validation_errors")}:</strong>
            <ul style={{ margin: "4px 0 0 20px" }}>
              {validationIssues.map((issue, idx) => (
                <li key={idx}>{issue}</li>
              ))}
            </ul>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Assessment Details */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: "16px",
              marginBottom: "16px",
              padding: "16px",
              background: "var(--color-bg-card-alt)",
              border: "1px solid var(--color-muted)",
              borderRadius: "8px",
            }}
          >
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
                  background: "var(--color-bg-card)",
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
                  border: "1px solid var(--color-muted)",
                  borderRadius: "8px",
                  background: "var(--color-bg-card)",
                  color: "var(--color-text)",
                }}
                required
              />
            </div>

            <div>
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
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t("assessment_description")}
                style={{
                  width: "100%",
                  fontSize: "1rem",
                  padding: "0.5em",
                  border: "1px solid var(--color-muted)",
                  borderRadius: "8px",
                  background: "var(--color-bg-card)",
                  color: "var(--color-text)",
                }}
                required
              />
            </div>
          </div>

          {/* Bulk Actions */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "16px",
              padding: "12px",
              background: "#e9ecef",
              borderRadius: "8px",
              flexWrap: "wrap",
              gap: "8px",
            }}
          >
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <button
                type="button"
                onClick={selectAll}
                style={{
                  padding: "6px 12px",
                  background: "#007bff",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontSize: "0.9rem",
                }}
              >
                {t("select_all")}
              </button>
              <button
                type="button"
                onClick={selectNone}
                style={{
                  padding: "6px 12px",
                  background: "#6c757d",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontSize: "0.9rem",
                }}
              >
                {t("select_none")}
              </button>
            </div>

            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <span style={{ fontSize: "0.9rem" }}>{t("quick_fill")}:</span>
              <input
                type="number"
                min={0}
                max={total || undefined}
                value={quickFillValue}
                onChange={(e) => setQuickFillValue(Number(e.target.value))}
                style={{
                  width: "80px",
                  padding: "4px 8px",
                  border: "1px solid #ced4da",
                  borderRadius: "4px",
                }}
              />
              <button
                type="button"
                onClick={quickFillSelected}
                style={{
                  padding: "6px 12px",
                  background: "#28a745",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontSize: "0.9rem",
                }}
              >
                {t("fill_selected")}
              </button>
            </div>
          </div>

          {/* Search and Sort */}
          <div
            style={{
              display: "flex",
              gap: "12px",
              marginBottom: "16px",
              alignItems: "center",
            }}
          >
            <input
              type="text"
              placeholder={t("search_students")}
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              style={{
                flex: 1,
                padding: "8px 12px",
                border: "1px solid var(--color-muted)",
                borderRadius: "8px",
                fontSize: "1rem",
                background: "var(--color-bg-card-alt)",
                color: "var(--color-text)",
              }}
            />
            <select
              value={sortBy}
              onChange={(e) =>
                setSortBy(e.target.value as "name" | "grade" | "score")
              }
              style={{
                padding: "8px 12px",
                border: "1px solid var(--color-muted)",
                borderRadius: "8px",
                fontSize: "1rem",
                background: "var(--color-bg-card-alt)",
                color: "var(--color-text)",
              }}
            >
              <option value="name">{t("sort_by_name")}</option>
              <option value="grade">{t("sort_by_grade")}</option>
              <option value="score">{t("sort_by_score")}</option>
            </select>
          </div>

          {/* Students List */}
          <div
            style={{
              maxHeight: "400px",
              overflowY: "auto",
              border: "1px solid var(--color-muted)",
              borderRadius: "8px",
              marginBottom: "16px",
              background: "var(--color-bg-card)",
            }}
          >
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr
                  style={{
                    background: "var(--color-bg-card-alt)",
                    borderBottom: "2px solid var(--color-muted)",
                  }}
                >
                  <th
                    style={{
                      padding: "12px",
                      textAlign: "left",
                      width: "40px",
                      color: "var(--color-text)",
                    }}
                  >
                    ✓
                  </th>
                  <th
                    style={{
                      padding: "12px",
                      textAlign: "left",
                      color: "var(--color-text)",
                    }}
                  >
                    {t("student")}
                  </th>
                  <th
                    style={{
                      padding: "12px",
                      textAlign: "left",
                      width: "80px",
                      color: "var(--color-text)",
                    }}
                  >
                    {t("grade")}
                  </th>
                  <th
                    style={{
                      padding: "12px",
                      textAlign: "left",
                      width: "120px",
                      color: "var(--color-text)",
                    }}
                  >
                    {t("score")}
                  </th>
                  <th
                    style={{
                      padding: "12px",
                      textAlign: "left",
                      width: "80px",
                      color: "var(--color-text)",
                    }}
                  >
                    %
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredAndSortedScores.map((entry, idx) => {
                  const percentage =
                    total > 0 ? (entry.score / total) * 100 : 0;
                  return (
                    <tr
                      key={entry.student.uid}
                      style={{
                        borderBottom: "1px solid var(--color-muted)",
                        background: entry.selected
                          ? "var(--color-bg-card-alt)"
                          : "var(--color-bg-card)",
                        color: "var(--color-text)",
                      }}
                    >
                      <td style={{ padding: "8px 12px" }}>
                        <input
                          type="checkbox"
                          checked={entry.selected}
                          onChange={() => toggleSelection(idx)}
                          style={{ transform: "scale(1.2)" }}
                        />
                      </td>
                      <td style={{ padding: "8px 12px" }}>
                        <div
                          style={{
                            fontWeight: entry.selected ? "600" : "normal",
                            color: "var(--color-text)",
                          }}
                        >
                          {entry.student.name}
                        </div>
                        {entry.student.email && (
                          <div
                            style={{
                              fontSize: "0.8rem",
                              color: "var(--color-muted)",
                            }}
                          >
                            {entry.student.email}
                          </div>
                        )}
                      </td>
                      <td
                        style={{
                          padding: "8px 12px",
                          color: "var(--color-text)",
                        }}
                      >
                        {entry.student.grade || "-"}
                      </td>
                      <td style={{ padding: "8px 12px" }}>
                        <input
                          type="number"
                          min={0}
                          max={total || undefined}
                          value={entry.score}
                          onChange={(e) =>
                            updateScore(idx, Number(e.target.value))
                          }
                          disabled={!entry.selected}
                          style={{
                            width: "100%",
                            padding: "6px",
                            border: "1px solid var(--color-muted)",
                            borderRadius: "6px",
                            fontSize: "1rem",
                            background: entry.selected
                              ? "var(--color-bg-card)"
                              : "var(--color-bg-card-alt)",
                            color: "var(--color-text)",
                          }}
                        />
                      </td>
                      <td
                        style={{
                          padding: "8px 12px",
                          fontWeight: "bold",
                          color: getScoreColor(entry.score, total),
                        }}
                      >
                        {total > 0 ? `${percentage.toFixed(1)}%` : "-%"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Actions */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              paddingTop: "16px",
              borderTop: "1px solid #dee2e6",
            }}
          >
            <div style={{ fontSize: "0.9rem", color: "var(--color-muted)" }}>
              {enhancedScores.filter((e) => e.selected).length}{" "}
              {t("students_selected")}
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                style={{
                  padding: "10px 20px",
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
                  padding: "10px 20px",
                  border: "none",
                  background: isFormValid
                    ? "var(--color-primary)"
                    : "var(--color-muted)",
                  color: "var(--color-btn-text)",
                  borderRadius: "8px",
                  cursor: isFormValid ? "pointer" : "not-allowed",
                  fontWeight: "600",
                  transition: "all 0.2s ease",
                }}
              >
                {loading
                  ? t("assigning_marks")
                  : t("assign_marks_to_selected", {
                      count: enhancedScores.filter((e) => e.selected).length,
                    })}
              </button>
            </div>
          </div>
        </form>
      </div>
    </Modal>
  );
};

export default EnhancedBulkMarkModal;
