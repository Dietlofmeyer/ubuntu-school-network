import React, { useState } from "react";
import { useTranslation } from "react-i18next";

interface Student {
  id: string;
  name: string;
  grade: string;
  schoolId: string;
  email?: string;
  subjects?: string[];
  recentMarks?: any[];
  demerits?: number;
}

interface GuardianChildrenProps {
  children: Student[];
  stats: any;
  onRefresh: () => void;
}

const GuardianChildren: React.FC<GuardianChildrenProps> = ({
  children,
  onRefresh,
}) => {
  const { t } = useTranslation();
  const [selectedChild, setSelectedChild] = useState<Student | null>(null);

  const handleViewDetails = (child: Student) => {
    setSelectedChild(child);
  };

  const closeModal = () => {
    setSelectedChild(null);
  };

  return (
    <div className="guardian-children">
      {/* Header */}
      <div className="guardian-page-header">
        <div>
          <h1>{t("my_children") || "My Children"}</h1>
          <p>
            {t("children_description") ||
              "Manage and monitor your children's academic journey"}
          </p>
        </div>
        <button onClick={onRefresh} className="guardian-refresh-btn">
          <span>🔄</span>
          {t("refresh") || "Refresh"}
        </button>
      </div>

      {children.length === 0 ? (
        <div className="guardian-card">
          <div className="guardian-empty-state">
            <span className="guardian-empty-icon">👨‍👩‍👧‍👦</span>
            <h3 className="guardian-empty-title">
              {t("no_children_linked") || "No Children Linked"}
            </h3>
            <p className="guardian-empty-description">
              {t("contact_admin_link_children") ||
                "Contact your school administrator to link your children to your account"}
            </p>
            <button className="guardian-card-action">
              {t("contact_support") || "Contact Support"}
            </button>
          </div>
        </div>
      ) : (
        <div className="children-grid">
          {children.map((child) => (
            <div key={child.id} className="child-card">
              <div className="child-card-header">
                <div className="child-avatar-large">
                  <span className="child-avatar-icon">👨‍🎓</span>
                </div>
                <div className="child-header-info">
                  <h3 className="child-name">{child.name}</h3>
                  <p className="child-grade">{child.grade}</p>
                  <span className="child-id">
                    ID: {child.id.substring(0, 8)}
                  </span>
                </div>
              </div>

              <div className="child-card-content">
                <div className="child-stats-grid">
                  <div className="child-stat-item">
                    <span className="child-stat-icon">📚</span>
                    <div>
                      <div className="child-stat-value">
                        {child.subjects?.length || 0}
                      </div>
                      <div className="child-stat-label">
                        {t("subjects") || "Subjects"}
                      </div>
                    </div>
                  </div>

                  <div className="child-stat-item">
                    <span className="child-stat-icon">⚠️</span>
                    <div>
                      <div className="child-stat-value">
                        {child.demerits || 0}
                      </div>
                      <div className="child-stat-label">
                        {t("demerits") || "Demerits"}
                      </div>
                    </div>
                  </div>

                  <div className="child-stat-item">
                    <span className="child-stat-icon">📊</span>
                    <div>
                      <div className="child-stat-value">85%</div>
                      <div className="child-stat-label">
                        {t("average") || "Average"}
                      </div>
                    </div>
                  </div>
                </div>

                {child.subjects && child.subjects.length > 0 && (
                  <div className="child-subjects">
                    <h4>{t("current_subjects") || "Current Subjects"}</h4>
                    <div className="subjects-tags">
                      {child.subjects.slice(0, 3).map((subject) => (
                        <span key={subject} className="subject-tag">
                          {subject}
                        </span>
                      ))}
                      {child.subjects.length > 3 && (
                        <span className="subject-tag more">
                          +{child.subjects.length - 3} {t("more") || "more"}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="child-card-actions">
                <button
                  className="child-action-btn primary"
                  onClick={() => handleViewDetails(child)}
                >
                  {t("view_details") || "View Details"}
                </button>
                <button className="child-action-btn secondary">
                  {t("view_progress") || "View Progress"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Child Details Modal */}
      {selectedChild && (
        <div className="child-modal-overlay" onClick={closeModal}>
          <div className="child-modal" onClick={(e) => e.stopPropagation()}>
            <div className="child-modal-header">
              <h2>{selectedChild.name}</h2>
              <button onClick={closeModal} className="child-modal-close">
                ×
              </button>
            </div>

            <div className="child-modal-content">
              <div className="child-detail-grid">
                <div className="child-detail-item">
                  <label>{t("student_id") || "Student ID"}</label>
                  <span>{selectedChild.id}</span>
                </div>

                <div className="child-detail-item">
                  <label>{t("grade") || "Grade"}</label>
                  <span>{selectedChild.grade}</span>
                </div>

                <div className="child-detail-item">
                  <label>{t("email") || "Email"}</label>
                  <span>
                    {selectedChild.email || t("not_provided") || "Not provided"}
                  </span>
                </div>

                <div className="child-detail-item">
                  <label>{t("school_id") || "School ID"}</label>
                  <span>{selectedChild.schoolId}</span>
                </div>
              </div>

              {selectedChild.subjects && selectedChild.subjects.length > 0 && (
                <div className="child-detail-section">
                  <h3>{t("enrolled_subjects") || "Enrolled Subjects"}</h3>
                  <div className="subjects-list">
                    {selectedChild.subjects.map((subject) => (
                      <div key={subject} className="subject-item">
                        <span className="subject-icon">📖</span>
                        <span className="subject-name">{subject}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="child-detail-actions">
                <button className="child-action-btn primary">
                  {t("view_academic_report") || "View Academic Report"}
                </button>
                <button className="child-action-btn secondary">
                  {t("contact_teachers") || "Contact Teachers"}
                </button>
                <button className="child-action-btn secondary">
                  {t("view_attendance") || "View Attendance"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GuardianChildren;
