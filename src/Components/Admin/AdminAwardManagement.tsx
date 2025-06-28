import React, { useState, useEffect } from "react";
import { useAuth } from "../../AuthContext";
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
} from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import { db } from "../../firebase";
import type { AwardTemplate } from "../../types/awards";
import { AwardCategory } from "../../types/awards";
import "./AdminAwardManagement.css";

const AdminAwardManagement: React.FC = () => {
  const { user, profile } = useAuth();

  const [awardTemplates, setAwardTemplates] = useState<AwardTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<AwardTemplate | null>(
    null
  );

  // Form state
  const [formData, setFormData] = useState<{
    title: string;
    description: string;
    category: AwardCategory;
    criteria: string;
    icon: string;
    color: string;
    points: number;
    isActive: boolean;
  }>({
    title: "",
    description: "",
    category: AwardCategory.ACADEMIC,
    criteria: "",
    icon: "🏆",
    color: "#FFD700",
    points: 10,
    isActive: true,
  });

  useEffect(() => {
    if (profile?.schoolId) {
      fetchAwardTemplates();
    }
  }, [profile?.schoolId]);

  const fetchAwardTemplates = async () => {
    try {
      const q = query(
        collection(db, "awardTemplates"),
        where("schoolId", "==", profile?.schoolId)
      );
      const snapshot = await getDocs(q);
      const templates: AwardTemplate[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as AwardTemplate[];
      setAwardTemplates(templates);
    } catch (error) {
      console.error("Error fetching award templates:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTemplate = async () => {
    if (!formData.title.trim() || !user || !profile?.schoolId) return;

    setSaving(true);
    try {
      const templateData = {
        ...formData,
        schoolId: profile.schoolId,
        createdBy: user.uid,
        createdAt: new Date().toISOString(),
      };

      if (editingTemplate) {
        // Update existing template
        await updateDoc(
          doc(db, "awardTemplates", editingTemplate.id),
          templateData
        );

        // Log the template edit for POPIA compliance
        try {
          const functions = getFunctions();
          const logUserEdit = httpsCallable(functions, "logUserEdit");
          await logUserEdit({
            userId: user.uid,
            changes: {
              awardTemplate: {
                action: "updated",
                templateId: editingTemplate.id,
                title: formData.title,
              },
            },
            editorId: user.uid,
            reason: `Admin updated award template: ${formData.title}`,
          });
        } catch (logError) {
          console.warn("Failed to log award template update:", logError);
        }
      } else {
        // Create new template
        const docRef = await addDoc(
          collection(db, "awardTemplates"),
          templateData
        );

        // Log the template creation for POPIA compliance
        try {
          const functions = getFunctions();
          const logUserEdit = httpsCallable(functions, "logUserEdit");
          await logUserEdit({
            userId: user.uid,
            changes: {
              awardTemplate: {
                action: "created",
                templateId: docRef.id,
                title: formData.title,
              },
            },
            editorId: user.uid,
            reason: `Admin created award template: ${formData.title}`,
          });
        } catch (logError) {
          console.warn("Failed to log award template creation:", logError);
        }
      }

      await fetchAwardTemplates();
      handleCloseModal();
    } catch (error) {
      console.error("Error saving award template:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTemplate = async (template: AwardTemplate) => {
    if (!window.confirm(`Are you sure you want to delete "${template.title}"?`))
      return;
    if (!user) return;

    try {
      await deleteDoc(doc(db, "awardTemplates", template.id));

      // Log the template deletion for POPIA compliance
      try {
        const functions = getFunctions();
        const logUserEdit = httpsCallable(functions, "logUserEdit");
        await logUserEdit({
          userId: user.uid,
          changes: {
            awardTemplate: {
              action: "deleted",
              templateId: template.id,
              title: template.title,
            },
          },
          editorId: user.uid,
          reason: `Admin deleted award template: ${template.title}`,
        });
      } catch (logError) {
        console.warn("Failed to log award template deletion:", logError);
      }

      await fetchAwardTemplates();
    } catch (error) {
      console.error("Error deleting award template:", error);
    }
  };

  const handleEditTemplate = (template: AwardTemplate) => {
    setEditingTemplate(template);
    setFormData({
      title: template.title,
      description: template.description,
      category: template.category,
      criteria: template.criteria || "",
      icon: template.icon || "🏆",
      color: template.color || "#FFD700",
      points: template.points || 10,
      isActive: template.isActive,
    });
    setShowCreateModal(true);
  };

  const handleCloseModal = () => {
    setShowCreateModal(false);
    setEditingTemplate(null);
    setFormData({
      title: "",
      description: "",
      category: AwardCategory.ACADEMIC,
      criteria: "",
      icon: "🏆",
      color: "#FFD700",
      points: 10,
      isActive: true,
    });
  };

  const getCategoryIcon = (category: AwardCategory) => {
    const icons = {
      [AwardCategory.ACADEMIC]: "📚",
      [AwardCategory.SPORTS]: "⚽",
      [AwardCategory.LEADERSHIP]: "👑",
      [AwardCategory.COMMUNITY_SERVICE]: "🤝",
      [AwardCategory.ATTENDANCE]: "📅",
      [AwardCategory.BEHAVIOR]: "😊",
      [AwardCategory.CREATIVITY]: "🎨",
      [AwardCategory.TEAMWORK]: "👥",
      [AwardCategory.IMPROVEMENT]: "📈",
      [AwardCategory.OTHER]: "⭐",
    };
    return icons[category] || "🏆";
  };

  if (loading) {
    return (
      <div className="admin-award-loading">Loading award templates...</div>
    );
  }

  return (
    <div className="admin-award-management">
      <div className="admin-award-header">
        <h2>Award Template Management</h2>
        <button
          className="btn-primary"
          onClick={() => setShowCreateModal(true)}
        >
          Create Award Template
        </button>
      </div>

      <div className="award-templates-grid">
        {awardTemplates.map((template) => (
          <div key={template.id} className="award-template-card">
            <div className="award-template-header">
              <span className="award-icon" style={{ color: template.color }}>
                {template.icon}
              </span>
              <div className="award-template-info">
                <h3>{template.title}</h3>
                <span className="award-category">
                  {getCategoryIcon(template.category)} {template.category}
                </span>
              </div>
              <div className="award-points">{template.points} pts</div>
            </div>

            <p className="award-description">{template.description}</p>

            {template.criteria && (
              <div className="award-criteria">
                <strong>Criteria:</strong> {template.criteria}
              </div>
            )}

            <div className="award-template-actions">
              <span
                className={`award-status ${
                  template.isActive ? "active" : "inactive"
                }`}
              >
                {template.isActive ? "Active" : "Inactive"}
              </span>
              <div className="award-actions">
                <button
                  className="btn-secondary"
                  onClick={() => handleEditTemplate(template)}
                >
                  Edit
                </button>
                <button
                  className="btn-danger"
                  onClick={() => handleDeleteTemplate(template)}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {awardTemplates.length === 0 && (
        <div className="no-templates">
          <p>No award templates created yet.</p>
          <button
            className="btn-primary"
            onClick={() => setShowCreateModal(true)}
          >
            Create Your First Award Template
          </button>
        </div>
      )}

      {/* Create/Edit Modal */}
      {showCreateModal && (
        <div className="modal-overlay">
          <div className="modal-content award-modal">
            <div className="modal-header">
              <h3>
                {editingTemplate
                  ? "Edit Award Template"
                  : "Create Award Template"}
              </h3>
              <button className="modal-close" onClick={handleCloseModal}>
                ×
              </button>
            </div>

            <div className="modal-body">
              <div className="form-group">
                <label>Title *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  placeholder="Award title"
                />
              </div>

              <div className="form-group">
                <label>Description *</label>
                <textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="Award description"
                  rows={3}
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        category: e.target.value as AwardCategory,
                      })
                    }
                  >
                    {Object.values(AwardCategory).map((category) => (
                      <option key={category} value={category}>
                        {getCategoryIcon(category)} {category.replace("_", " ")}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Points</label>
                  <input
                    type="number"
                    value={formData.points}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        points: parseInt(e.target.value) || 0,
                      })
                    }
                    min="1"
                    max="100"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Icon</label>
                  <input
                    type="text"
                    value={formData.icon}
                    onChange={(e) =>
                      setFormData({ ...formData, icon: e.target.value })
                    }
                    placeholder="🏆"
                  />
                </div>

                <div className="form-group">
                  <label>Color</label>
                  <input
                    type="color"
                    value={formData.color}
                    onChange={(e) =>
                      setFormData({ ...formData, color: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Criteria (Optional)</label>
                <textarea
                  value={formData.criteria}
                  onChange={(e) =>
                    setFormData({ ...formData, criteria: e.target.value })
                  }
                  placeholder="Specific criteria for earning this award"
                  rows={2}
                />
              </div>

              <div className="form-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) =>
                      setFormData({ ...formData, isActive: e.target.checked })
                    }
                  />
                  Active (available for assignment)
                </label>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn-secondary" onClick={handleCloseModal}>
                Cancel
              </button>
              <button
                className="btn-primary"
                onClick={handleSaveTemplate}
                disabled={
                  saving ||
                  !formData.title.trim() ||
                  !formData.description.trim()
                }
              >
                {saving
                  ? "Saving..."
                  : editingTemplate
                  ? "Update Template"
                  : "Create Template"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminAwardManagement;
