import React, { useState, useEffect } from "react";
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
} from "firebase/firestore";
import { db } from "../../../../firebase";

type MarkTemplate = {
  id: string;
  name: string;
  category: string;
  total: number;
  description: string;
  subject?: string;
  teacherId: string;
  createdAt: string;
  isGlobal?: boolean;
};

interface MarkTemplateManagerProps {
  teacherId: string;
  onTemplateSelect?: (template: MarkTemplate) => void;
  t: (key: string, options?: any) => string;
}

const MarkTemplateManager: React.FC<MarkTemplateManagerProps> = ({
  teacherId,
  onTemplateSelect,
  t,
}) => {
  const [templates, setTemplates] = useState<MarkTemplate[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<MarkTemplate | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: "",
    category: "",
    total: 0,
    description: "",
    subject: "",
    isGlobal: false,
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

  const predefinedTemplates = [
    {
      name: t("weekly_quiz"),
      category: "quiz",
      total: 10,
      description: t("weekly_subject_quiz"),
    },
    {
      name: t("unit_test"),
      category: "test",
      total: 50,
      description: t("end_of_unit_assessment"),
    },
    {
      name: t("homework_assignment"),
      category: "homework",
      total: 20,
      description: t("regular_homework"),
    },
    {
      name: t("class_project"),
      category: "project",
      total: 100,
      description: t("major_class_project"),
    },
    {
      name: t("participation_grade"),
      category: "participation",
      total: 5,
      description: t("daily_participation"),
    },
  ];

  useEffect(() => {
    fetchTemplates();
  }, [teacherId]);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      // Fetch teacher's personal templates
      const personalQuery = query(
        collection(db, "markTemplates"),
        where("teacherId", "==", teacherId)
      );
      const personalSnap = await getDocs(personalQuery);

      // Fetch global templates
      const globalQuery = query(
        collection(db, "markTemplates"),
        where("isGlobal", "==", true)
      );
      const globalSnap = await getDocs(globalQuery);

      const fetchedTemplates: MarkTemplate[] = [];

      personalSnap.forEach((doc) => {
        fetchedTemplates.push({ id: doc.id, ...doc.data() } as MarkTemplate);
      });

      globalSnap.forEach((doc) => {
        fetchedTemplates.push({ id: doc.id, ...doc.data() } as MarkTemplate);
      });

      setTemplates(fetchedTemplates);
    } catch (error) {
      console.error("Error fetching templates:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.description.trim() || form.total <= 0)
      return;

    setSaving(true);
    try {
      const templateData = {
        ...form,
        teacherId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      if (editingTemplate) {
        // Update existing template
        await updateDoc(
          doc(db, "markTemplates", editingTemplate.id),
          templateData
        );
      } else {
        // Create new template
        await addDoc(collection(db, "markTemplates"), templateData);
      }

      await fetchTemplates();
      resetForm();
    } catch (error) {
      console.error("Error saving template:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (template: MarkTemplate) => {
    setEditingTemplate(template);
    setForm({
      name: template.name,
      category: template.category,
      total: template.total,
      description: template.description,
      subject: template.subject || "",
      isGlobal: template.isGlobal || false,
    });
    setIsCreating(true);
  };

  const handleDelete = async (templateId: string) => {
    if (window.confirm(t("confirm_delete_template"))) {
      try {
        await deleteDoc(doc(db, "markTemplates", templateId));
        await fetchTemplates();
      } catch (error) {
        console.error("Error deleting template:", error);
      }
    }
  };

  const resetForm = () => {
    setForm({
      name: "",
      category: "",
      total: 0,
      description: "",
      subject: "",
      isGlobal: false,
    });
    setIsCreating(false);
    setEditingTemplate(null);
  };

  const createFromPredefined = async (predefined: any) => {
    setSaving(true);
    try {
      const templateData = {
        ...predefined,
        teacherId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isGlobal: false,
      };

      await addDoc(collection(db, "markTemplates"), templateData);
      await fetchTemplates();
    } catch (error) {
      console.error("Error creating predefined template:", error);
    } finally {
      setSaving(false);
    }
  };

  const groupedTemplates = templates.reduce((groups, template) => {
    const category = template.category || "other";
    if (!groups[category]) groups[category] = [];
    groups[category].push(template);
    return groups;
  }, {} as Record<string, MarkTemplate[]>);

  return (
    <div className="template-manager-container">
      <div className="template-manager-header">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "1rem",
          }}
        >
          <div>
            <h2 className="category-title" style={{ fontSize: "1.75rem" }}>
              📋 {t("your_templates")}
            </h2>
            <p className="templates-subtitle">
              {t("manage_your_marking_templates_efficiently")}
            </p>
          </div>
          <button
            onClick={() => setIsCreating(!isCreating)}
            className={`create-template-btn ${isCreating ? "danger" : ""}`}
            style={{
              background: isCreating ? "var(--color-danger)" : undefined,
              boxShadow: isCreating
                ? "0 4px 15px rgba(255, 107, 107, 0.3)"
                : undefined,
            }}
          >
            {isCreating ? `✕ ${t("cancel")}` : `+ ${t("create_template")}`}
          </button>
        </div>
      </div>

      {/* Quick Templates */}
      {templates.length === 0 && !isCreating && (
        <div className="empty-state">
          <div className="empty-state-icon">🚀</div>
          <h3 className="empty-state-title">
            {t("get_started_with_templates")}
          </h3>
          <p className="empty-state-text">{t("quick_templates_description")}</p>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: "1.5rem",
              marginTop: "2rem",
            }}
          >
            {predefinedTemplates.map((template, idx) => (
              <div
                key={idx}
                onClick={() => createFromPredefined(template)}
                className="template-card"
                style={{
                  cursor: saving ? "wait" : "pointer",
                  opacity: saving ? 0.6 : 1,
                }}
              >
                <h4 className="card-title">{template.name}</h4>
                <p className="card-description">{template.description}</p>
                <div className="card-footer">
                  <span className="category-badge">{template.category}</span>
                  <span className="points-badge">{template.total} pts</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Create/Edit Form */}
      {isCreating && (
        <div className="template-form">
          <h3 className="form-title">
            {editingTemplate ? t("edit_template") : t("create_new_template")}
          </h3>

          <form onSubmit={handleSubmit}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
                gap: "16px",
                marginBottom: "16px",
              }}
            >
              <div>
                <label className="form-label">{t("template_name")} *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                  placeholder={t("template_name_placeholder")}
                  className="form-input"
                  required
                />
              </div>

              <div>
                <label className="form-label">{t("category")} *</label>
                <select
                  value={form.category}
                  onChange={(e) =>
                    handleInputChange("category", e.target.value)
                  }
                  className="form-select"
                  required
                >
                  <option value="">{t("select_category")}</option>
                  {markCategories.map((cat) => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
                gap: "16px",
                marginBottom: "16px",
              }}
            >
              <div>
                <label className="form-label">{t("total_points")} *</label>
                <input
                  type="number"
                  min="1"
                  value={form.total}
                  onChange={(e) =>
                    handleInputChange("total", Number(e.target.value))
                  }
                  className="form-input"
                  required
                />
              </div>

              <div>
                <label className="form-label">
                  {t("subject")} ({t("optional")})
                </label>
                <input
                  type="text"
                  value={form.subject}
                  onChange={(e) => handleInputChange("subject", e.target.value)}
                  placeholder={t("specific_subject")}
                  className="form-input"
                />
              </div>
            </div>

            <div style={{ marginBottom: "16px" }}>
              <label className="form-label">{t("description")} *</label>
              <textarea
                value={form.description}
                onChange={(e) =>
                  handleInputChange("description", e.target.value)
                }
                placeholder={t("template_description_placeholder")}
                className="form-textarea"
                required
              />
            </div>

            <div style={{ marginBottom: "16px" }}>
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  color: "var(--color-text)",
                }}
              >
                <input
                  type="checkbox"
                  checked={form.isGlobal}
                  onChange={(e) =>
                    handleInputChange("isGlobal", e.target.checked)
                  }
                />
                {t("make_global_template")}
                <span
                  style={{ fontSize: "0.8rem", color: "var(--color-muted)" }}
                >
                  ({t("visible_to_all_teachers")})
                </span>
              </label>
            </div>

            <div className="template-actions">
              <button
                type="submit"
                disabled={saving}
                className="action-btn primary"
              >
                {saving
                  ? t("saving")
                  : editingTemplate
                  ? t("update_template")
                  : t("create_template")}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="action-btn"
                style={{
                  background: "var(--color-muted)",
                  color: "var(--color-btn-text)",
                }}
              >
                {t("cancel")}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Templates List */}
      {loading ? (
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <div className="loading-text">{t("loading_templates")}</div>
        </div>
      ) : templates.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-content">
            <div className="empty-state-icon">📋</div>
            <h3 className="empty-state-title">{t("no_templates_yet")}</h3>
            <p className="empty-state-text">
              {t("create_your_first_template")}
            </p>
          </div>
        </div>
      ) : (
        <div>
          {Object.entries(groupedTemplates).map(
            ([category, categoryTemplates]) => (
              <div key={category} style={{ marginBottom: "24px" }}>
                <div className="category-header">
                  <h3 className="category-title">
                    {markCategories.find((c) => c.value === category)?.label ||
                      category}
                  </h3>
                  <span className="category-count">
                    {categoryTemplates.length}
                  </span>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(auto-fill, minmax(300px, 1fr))",
                    gap: "12px",
                  }}
                >
                  {categoryTemplates.map((template) => (
                    <div key={template.id} className="template-card">
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "flex-start",
                          marginBottom: "8px",
                        }}
                      >
                        <h4 className="card-title">{template.name}</h4>
                        {template.isGlobal && (
                          <span className="global-badge">{t("global")}</span>
                        )}
                      </div>

                      <p className="card-description">{template.description}</p>

                      <div className="card-info">
                        <span className="points-badge">
                          {template.total} {t("points")}
                        </span>
                        {template.subject && (
                          <span className="subject-badge">
                            {template.subject}
                          </span>
                        )}
                      </div>

                      <div className="template-actions">
                        {onTemplateSelect && (
                          <button
                            onClick={() => onTemplateSelect(template)}
                            className="action-btn primary"
                          >
                            {t("use_template")}
                          </button>
                        )}

                        {template.teacherId === teacherId && (
                          <>
                            <button
                              onClick={() => handleEdit(template)}
                              className="action-btn warning"
                            >
                              {t("edit")}
                            </button>
                            <button
                              onClick={() => handleDelete(template.id)}
                              className="action-btn danger"
                            >
                              {t("delete")}
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
};

export default MarkTemplateManager;
