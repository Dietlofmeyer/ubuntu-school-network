import React, { useState, useEffect } from "react";
import { useAuth } from "../../AuthContext";
import { useTranslation } from "react-i18next";
import {
  collection,
  getDocs,
  addDoc,
  query,
  where,
  orderBy,
} from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import { db } from "../../firebase";
import type { AwardTemplate, AssignedAward } from "../../types/awards";
import { AwardCategory, AwardStatus } from "../../types/awards";
import { triggerAchievementCheck } from "../../utils/achievementEngine";
import "./TeacherAwardAssignment.css";

interface Student {
  id: string;
  name: string;
  email: string;
  grade?: string;
  homeroomClass?: string;
}

interface TeacherAwardAssignmentProps {
  onBack?: () => void;
}

const TeacherAwardAssignment: React.FC<TeacherAwardAssignmentProps> = ({
  onBack,
}) => {
  const { user, profile } = useAuth();
  const { t } = useTranslation();

  const [awardTemplates, setAwardTemplates] = useState<AwardTemplate[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [recentAwards, setRecentAwards] = useState<AssignedAward[]>([]);
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] =
    useState<AwardTemplate | null>(null);

  // Assignment form state
  const [selectedStudent, setSelectedStudent] = useState("");
  const [reason, setReason] = useState("");
  const [evidence, setEvidence] = useState("");

  // Filters
  const [categoryFilter, setCategoryFilter] = useState<AwardCategory | "all">(
    "all"
  );
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    if (profile?.schoolId) {
      Promise.all([
        fetchAwardTemplates(),
        fetchStudents(),
        fetchRecentAwards(),
      ]).finally(() => setLoading(false));
    }
  }, [profile?.schoolId]);

  const fetchAwardTemplates = async () => {
    try {
      const q = query(
        collection(db, "awardTemplates"),
        where("schoolId", "==", profile?.schoolId),
        where("isActive", "==", true)
      );
      const snapshot = await getDocs(q);
      const templates: AwardTemplate[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as AwardTemplate[];
      setAwardTemplates(templates);
    } catch (error) {
      console.error("Error fetching award templates:", error);
    }
  };

  const fetchStudents = async () => {
    try {
      const q = query(
        collection(db, "users"),
        where("role", "==", "student"),
        where("schoolId", "==", profile?.schoolId)
      );
      const snapshot = await getDocs(q);
      const studentData: Student[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Student[];
      setStudents(studentData);
    } catch (error) {
      console.error("Error fetching students:", error);
    }
  };

  const fetchRecentAwards = async () => {
    try {
      const q = query(
        collection(db, "assignedAwards"),
        where("assignedBy", "==", user?.uid),
        orderBy("assignedAt", "desc")
      );
      const snapshot = await getDocs(q);
      const awards: AssignedAward[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as AssignedAward[];
      setRecentAwards(awards.slice(0, 10)); // Show last 10 awards
    } catch (error) {
      console.error("Error fetching recent awards:", error);
    }
  };

  const handleAssignAward = async () => {
    if (
      !selectedTemplate ||
      !selectedStudent ||
      !reason.trim() ||
      !user ||
      !profile
    )
      return;

    setAssigning(true);
    try {
      const student = students.find((s) => s.id === selectedStudent);
      if (!student) return;

      const assignedAward: Omit<AssignedAward, "id"> = {
        templateId: selectedTemplate.id,
        studentId: selectedStudent,
        assignedBy: user.uid,
        assignedAt: new Date().toISOString(),
        reason: reason.trim(),
        evidence: evidence.trim() || undefined,
        status: AwardStatus.APPROVED, // Teachers can directly approve
        // Cache template data
        title: selectedTemplate.title,
        description: selectedTemplate.description,
        category: selectedTemplate.category,
        icon: selectedTemplate.icon,
        color: selectedTemplate.color,
        points: selectedTemplate.points,
      };

      await addDoc(collection(db, "assignedAwards"), assignedAward);

      // Log the award assignment for POPIA compliance
      try {
        const functions = getFunctions();
        const logUserEdit = httpsCallable(functions, "logUserEdit");
        await logUserEdit({
          userId: selectedStudent,
          changes: {
            award: {
              action: "assigned",
              title: selectedTemplate.title,
              category: selectedTemplate.category,
              points: selectedTemplate.points,
              reason: reason.trim(),
            },
          },
          editorId: user.uid,
          reason: `Teacher assigned award: ${selectedTemplate.title}`,
        });
      } catch (logError) {
        console.warn("Failed to log award assignment:", logError);
      }

      // Refresh recent awards
      await fetchRecentAwards();
      handleCloseModal();

      // Trigger achievement check for the student
      try {
        await triggerAchievementCheck.onAwardReceived(selectedStudent);
      } catch (achievementError) {
        console.error("Error checking achievements:", achievementError);
        // Don't fail the award assignment if achievement check fails
      }

      // Show success message
      alert(
        `Successfully assigned "${selectedTemplate.title}" to ${student.name}!`
      );
    } catch (error) {
      console.error("Error assigning award:", error);
      alert("Failed to assign award. Please try again.");
    } finally {
      setAssigning(false);
    }
  };

  const handleOpenAssignModal = (template: AwardTemplate) => {
    setSelectedTemplate(template);
    setShowAssignModal(true);
  };

  const handleCloseModal = () => {
    setShowAssignModal(false);
    setSelectedTemplate(null);
    setSelectedStudent("");
    setReason("");
    setEvidence("");
  };

  const filteredTemplates = awardTemplates.filter((template) => {
    const matchesCategory =
      categoryFilter === "all" || template.category === categoryFilter;
    const matchesSearch =
      template.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      template.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

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

  const getStatusColor = (status: AwardStatus) => {
    switch (status) {
      case AwardStatus.APPROVED:
        return "var(--color-success)";
      case AwardStatus.PENDING:
        return "var(--color-warning)";
      case AwardStatus.REJECTED:
        return "var(--color-error)";
      default:
        return "var(--color-text-secondary)";
    }
  };

  if (loading) {
    return <div className="teacher-award-loading">Loading awards...</div>;
  }

  return (
    <div className="teacher-award-assignment">
      <div className="teacher-award-header">
        {onBack && (
          <button className="teacher-award-back-btn" onClick={onBack}>
            ← {t("back")}
          </button>
        )}
        <h2>{t("award_students")}</h2>
        <p>{t("award_students_description")}</p>
      </div>

      {/* Filters */}
      <div className="award-filters">
        <div className="filter-group">
          <label>Search Awards:</label>
          <input
            type="text"
            placeholder="Search by title or description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>

        <div className="filter-group">
          <label>Category:</label>
          <select
            value={categoryFilter}
            onChange={(e) =>
              setCategoryFilter(e.target.value as AwardCategory | "all")
            }
            className="category-filter"
          >
            <option value="all">All Categories</option>
            {Object.values(AwardCategory).map((category) => (
              <option key={category} value={category}>
                {getCategoryIcon(category)} {category.replace("_", " ")}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Award Templates Grid */}
      <div className="award-templates-section">
        <h3>Available Awards ({filteredTemplates.length})</h3>
        <div className="award-templates-grid">
          {filteredTemplates.map((template) => (
            <div key={template.id} className="award-template-card">
              <div className="award-template-header">
                <span className="award-icon" style={{ color: template.color }}>
                  {template.icon}
                </span>
                <div className="award-template-info">
                  <h4>{template.title}</h4>
                  <span className="award-category">
                    {getCategoryIcon(template.category)}{" "}
                    {template.category.replace("_", " ")}
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

              <button
                className="btn-assign"
                onClick={() => handleOpenAssignModal(template)}
              >
                Assign Award
              </button>
            </div>
          ))}
        </div>

        {filteredTemplates.length === 0 && (
          <div className="no-awards-found">
            <p>No awards found matching your criteria.</p>
            {searchTerm && (
              <button
                className="btn-secondary"
                onClick={() => setSearchTerm("")}
              >
                Clear Search
              </button>
            )}
          </div>
        )}
      </div>

      {/* Recent Awards */}
      {recentAwards.length > 0 && (
        <div className="recent-awards-section">
          <h3>Recently Assigned Awards</h3>
          <div className="recent-awards-list">
            {recentAwards.map((award) => {
              const student = students.find((s) => s.id === award.studentId);
              return (
                <div key={award.id} className="recent-award-item">
                  <span className="award-icon" style={{ color: award.color }}>
                    {award.icon}
                  </span>
                  <div className="award-details">
                    <strong>{award.title}</strong>
                    <span>to {student?.name || "Unknown Student"}</span>
                    <small>
                      {typeof award.assignedAt === "string"
                        ? new Date(award.assignedAt).toLocaleDateString()
                        : award.assignedAt.toDate().toLocaleDateString()}
                    </small>
                  </div>
                  <span
                    className="award-status-badge"
                    style={{ color: getStatusColor(award.status) }}
                  >
                    {award.status}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Assignment Modal */}
      {showAssignModal && selectedTemplate && (
        <div className="modal-overlay">
          <div className="modal-content assign-modal">
            <div className="modal-header">
              <h3>Assign Award: {selectedTemplate.title}</h3>
              <button className="modal-close" onClick={handleCloseModal}>
                ×
              </button>
            </div>

            <div className="modal-body">
              <div className="award-preview">
                <span
                  className="award-icon large"
                  style={{ color: selectedTemplate.color }}
                >
                  {selectedTemplate.icon}
                </span>
                <div>
                  <h4>{selectedTemplate.title}</h4>
                  <p>{selectedTemplate.description}</p>
                  <span className="award-points">
                    {selectedTemplate.points} points
                  </span>
                </div>
              </div>

              <div className="form-group">
                <label>Select Student *</label>
                <select
                  value={selectedStudent}
                  onChange={(e) => setSelectedStudent(e.target.value)}
                >
                  <option value="">Choose a student...</option>
                  {students.map((student) => (
                    <option key={student.id} value={student.id}>
                      {student.name}{" "}
                      {student.grade && `(Grade ${student.grade})`}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Reason for Award *</label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Explain why this student deserves this award..."
                  rows={3}
                />
              </div>

              <div className="form-group">
                <label>Additional Evidence (Optional)</label>
                <textarea
                  value={evidence}
                  onChange={(e) => setEvidence(e.target.value)}
                  placeholder="Any additional evidence or details..."
                  rows={2}
                />
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn-secondary" onClick={handleCloseModal}>
                Cancel
              </button>
              <button
                className="btn-primary"
                onClick={handleAssignAward}
                disabled={assigning || !selectedStudent || !reason.trim()}
              >
                {assigning ? "Assigning..." : "Assign Award"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeacherAwardAssignment;
