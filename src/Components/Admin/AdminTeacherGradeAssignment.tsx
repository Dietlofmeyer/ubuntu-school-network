import React, { useState, useEffect } from "react";
import { useAuth } from "../../AuthContext";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  query,
  where,
} from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import { db } from "../../firebase";
import { GRADES, SUBJECTS } from "../../data/constants";
import type { Teacher, SubjectGradeAssignment } from "../../types/Teacher";
import "./AdminTeacherGradeAssignment.css";

const AdminTeacherGradeAssignment: React.FC = () => {
  const { t } = useTranslation();
  const { profile, user } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");
  const [editingTeacher, setEditingTeacher] = useState<string | null>(null);
  const [editingSubjects, setEditingSubjects] = useState<string | null>(null);
  const [tempSubjects, setTempSubjects] = useState<string[]>([]);
  const [tempSubjectGrades, setTempSubjectGrades] = useState<
    SubjectGradeAssignment[]
  >([]);

  useEffect(() => {
    if (profile?.schoolId) {
      fetchTeachers();
    }
  }, [profile?.schoolId]);

  const fetchTeachers = async () => {
    if (!profile?.schoolId) return;

    setLoading(true);
    setError("");

    try {
      const teachersQuery = query(
        collection(db, "users"),
        where("schoolId", "==", profile.schoolId),
        where("role", "==", "teacher")
      );

      const teachersSnapshot = await getDocs(teachersQuery);
      const teacherList: Teacher[] = [];

      teachersSnapshot.forEach((doc) => {
        const teacherData = { id: doc.id, ...doc.data() } as Teacher;
        teacherList.push(teacherData);
      });

      setTeachers(teacherList);
    } catch (err) {
      console.error("Error fetching teachers:", err);
      setError(t("failed_to_load_teachers"));
    } finally {
      setLoading(false);
    }
  };

  // Get subjects that a teacher actually teaches (intersection of their subjects and standardized subjects)
  const getTeacherAvailableSubjects = (teacher: Teacher): string[] => {
    if (!teacher.subjects || teacher.subjects.length === 0) {
      return [];
    }

    // Filter to only include subjects that exist in our standardized SUBJECTS list
    // This handles cases where teacher might have old/invalid subject names
    return teacher.subjects.filter(
      (subject) =>
        SUBJECTS.includes(subject) ||
        // Also check for common variations/typos that might exist in the database
        SUBJECTS.some(
          (standardSubject) =>
            standardSubject.toLowerCase() === subject.toLowerCase()
        )
    );
  };

  const handleEditSubjectGrades = (teacher: Teacher) => {
    setEditingTeacher(teacher.id);
    // Initialize temp assignments from existing data or create empty structure
    const existingAssignments = teacher.subjectGradeAssignments || [];
    setTempSubjectGrades([...existingAssignments]);
  };

  const handleSubjectGradeToggle = (subject: string, grade: string) => {
    setTempSubjectGrades((prev) => {
      const existingIndex = prev.findIndex(
        (assignment) => assignment.subject === subject
      );

      if (existingIndex >= 0) {
        // Subject already exists, toggle the grade
        const updatedAssignments = [...prev];
        const assignment = updatedAssignments[existingIndex];

        if (assignment.grades.includes(grade)) {
          // Remove grade
          assignment.grades = assignment.grades.filter((g) => g !== grade);
          // Remove subject if no grades left
          if (assignment.grades.length === 0) {
            updatedAssignments.splice(existingIndex, 1);
          }
        } else {
          // Add grade
          assignment.grades.push(grade);
        }

        return updatedAssignments;
      } else {
        // New subject, add with this grade
        return [...prev, { subject, grades: [grade] }];
      }
    });
  };

  const isSubjectGradeAssigned = (subject: string, grade: string): boolean => {
    const assignment = tempSubjectGrades.find(
      (assignment) => assignment.subject === subject
    );
    return assignment ? assignment.grades.includes(grade) : false;
  };

  const handleSaveSubjectGrades = async (teacherId: string) => {
    setSaving(true);
    setError("");

    try {
      const teacherRef = doc(db, "users", teacherId);
      await updateDoc(teacherRef, {
        subjectGradeAssignments: tempSubjectGrades,
        // Keep backward compatibility for now
        assignedGrades: [
          ...new Set(
            tempSubjectGrades.flatMap((assignment) => assignment.grades)
          ),
        ],
      });

      // Update local state
      setTeachers((prev) =>
        prev.map((teacher) =>
          teacher.id === teacherId
            ? {
                ...teacher,
                subjectGradeAssignments: tempSubjectGrades,
                assignedGrades: [
                  ...new Set(
                    tempSubjectGrades.flatMap((assignment) => assignment.grades)
                  ),
                ],
              }
            : teacher
        )
      );

      setEditingTeacher(null);
      setTempSubjectGrades([]);
      setSuccess(t("subject_grades_assigned_successfully"));
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      console.error("Error updating teacher subject-grade assignments:", err);
      setError(t("failed_to_assign_subject_grades"));
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditingTeacher(null);
    setTempSubjectGrades([]);
  };

  // Subject editing functions
  const handleEditSubjects = (teacher: Teacher) => {
    setEditingSubjects(teacher.id);
    setTempSubjects([...(teacher.subjects || [])]);
  };

  const handleSubjectToggle = (subject: string) => {
    setTempSubjects((prev) =>
      prev.includes(subject)
        ? prev.filter((s) => s !== subject)
        : [...prev, subject]
    );
  };

  const handleSaveSubjects = async (teacherId: string) => {
    setSaving(true);
    setError("");

    try {
      const teacherRef = doc(db, "users", teacherId);

      // Get the previous subjects for logging
      const currentTeacher = teachers.find((t) => t.id === teacherId);
      const previousSubjects = currentTeacher?.subjects || [];

      await updateDoc(teacherRef, {
        subjects: tempSubjects,
      });

      // Log the edit for POPIA compliance
      try {
        const functions = getFunctions();
        const logUserEdit = httpsCallable(functions, "logUserEdit");
        await logUserEdit({
          userId: teacherId,
          changes: {
            subjects: {
              previous: previousSubjects,
              new: tempSubjects,
            },
          },
          editorId: user?.uid || "unknown",
          reason:
            "Admin updated teacher subjects via Teacher Assignment interface",
        });
      } catch (logError) {
        // Log locally if Cloud Function fails - don't block the operation
        console.warn("Failed to log subject change:", logError);
      }

      // Update local state
      setTeachers((prev) =>
        prev.map((teacher) =>
          teacher.id === teacherId
            ? { ...teacher, subjects: tempSubjects }
            : teacher
        )
      );

      setEditingSubjects(null);
      setTempSubjects([]);
      setSuccess(t("teacher_subjects_updated_successfully"));
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(t("failed_to_update_teacher_subjects"));
    } finally {
      setSaving(false);
    }
  };

  const handleCancelSubjects = () => {
    setEditingSubjects(null);
    setTempSubjects([]);
  };

  if (!profile || profile.role !== "admin") {
    return (
      <div className="admin-unauthorized">
        <p>{t("unauthorized_access")}</p>
      </div>
    );
  }

  return (
    <div className="admin-teacher-grades">
      <div className="admin-teacher-grades-header">
        <button
          onClick={() => navigate("/admin-dashboard")}
          className="back-btn"
        >
          ← {t("back_to_dashboard")}
        </button>
        <h1>{t("teacher_subject_grade_assignment")}</h1>
        <p>{t("assign_subject_grades_to_teachers_description")}</p>
      </div>

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      {loading ? (
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>{t("loading_teachers")}</p>
        </div>
      ) : (
        <div className="teachers-grid">
          {teachers.map((teacher) => (
            <div key={teacher.id} className="teacher-grade-card">
              <div className="teacher-info">
                <h3>{teacher.name}</h3>
                <p className="teacher-email">{teacher.email}</p>

                {/* Teacher Subjects Section with Editing */}
                <div className="teacher-subjects-section">
                  <div className="subjects-header">
                    <span className="label">{t("subjects")}:</span>
                    {editingSubjects !== teacher.id && (
                      <button
                        onClick={() => handleEditSubjects(teacher)}
                        className={`edit-subjects-btn ${
                          !teacher.subjects || teacher.subjects.length === 0
                            ? "edit-subjects-btn--urgent"
                            : ""
                        }`}
                        title={t("edit_teacher_subjects")}
                      >
                        <span className="edit-icon">✏️</span>
                        <span className="edit-text">{t("edit_subjects")}</span>
                      </button>
                    )}
                  </div>

                  {editingSubjects === teacher.id ? (
                    <div className="subjects-editor">
                      <div className="subjects-selection-grid">
                        {SUBJECTS.map((subject) => (
                          <label
                            key={subject}
                            className="subject-checkbox-item"
                          >
                            <input
                              type="checkbox"
                              checked={tempSubjects.includes(subject)}
                              onChange={() => handleSubjectToggle(subject)}
                            />
                            <span className="subject-label">
                              {t(subject) || subject}
                            </span>
                          </label>
                        ))}
                      </div>
                      <div className="subjects-actions">
                        <button
                          onClick={() => handleSaveSubjects(teacher.id)}
                          disabled={saving || tempSubjects.length === 0}
                          className="save-subjects-btn"
                        >
                          {saving ? t("saving") : t("save")}
                        </button>
                        <button
                          onClick={handleCancelSubjects}
                          className="cancel-subjects-btn"
                        >
                          {t("cancel")}
                        </button>
                      </div>
                      {tempSubjects.length === 0 && (
                        <p className="subjects-warning">
                          {t("teacher_must_have_at_least_one_subject")}
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="subjects-display">
                      {teacher.subjects && teacher.subjects.length > 0 ? (
                        <div className="current-subjects">
                          {teacher.subjects.map((subject, index) => (
                            <span key={index} className="subject-tag">
                              {t(subject) || subject}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="no-subjects-assigned">
                          {t("no_subjects_assigned")}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {teacher.homeroomClass && (
                  <div className="teacher-homeroom">
                    <span className="label">{t("homeroom_class")}:</span>
                    <span className="homeroom-tag">
                      {teacher.homeroomClass}
                    </span>
                  </div>
                )}
              </div>

              <div className="subject-grade-assignments-section">
                <h4>{t("subject_grade_assignments")}</h4>

                {editingTeacher === teacher.id ? (
                  <div className="subject-grade-editor">
                    {getTeacherAvailableSubjects(teacher).length > 0 ? (
                      <>
                        <div className="teacher-subjects-info">
                          <p className="info-text">
                            {t("assign_grades_for_teacher_subjects")}{" "}
                            <strong>{teacher.name}</strong>
                          </p>
                        </div>
                        <div className="subjects-grid">
                          {getTeacherAvailableSubjects(teacher).map(
                            (subject) => (
                              <div key={subject} className="subject-section">
                                <h5 className="subject-name">
                                  {t(subject) || subject}
                                </h5>
                                <div className="grade-checkboxes">
                                  {GRADES.map((grade) => (
                                    <label
                                      key={`${subject}-${grade}`}
                                      className="grade-checkbox"
                                    >
                                      <input
                                        type="checkbox"
                                        checked={isSubjectGradeAssigned(
                                          subject,
                                          grade
                                        )}
                                        onChange={() =>
                                          handleSubjectGradeToggle(
                                            subject,
                                            grade
                                          )
                                        }
                                      />
                                      <span>{grade}</span>
                                    </label>
                                  ))}
                                </div>
                              </div>
                            )
                          )}
                        </div>
                      </>
                    ) : (
                      <div className="no-subjects-warning">
                        <h5>{t("no_subjects_registered")}</h5>
                        <p>{t("teacher_needs_subjects_first")}</p>
                        <p className="suggestion-text">
                          {t("contact_teacher_to_update_subjects")}
                        </p>
                      </div>
                    )}
                    <div className="assignment-actions">
                      <button
                        onClick={() => handleSaveSubjectGrades(teacher.id)}
                        disabled={saving}
                        className="save-btn"
                      >
                        {saving ? t("saving") : t("save")}
                      </button>
                      <button onClick={handleCancel} className="cancel-btn">
                        {t("cancel")}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="assignments-display">
                    {teacher.subjectGradeAssignments &&
                    teacher.subjectGradeAssignments.length > 0 ? (
                      <div className="current-assignments">
                        {teacher.subjectGradeAssignments.map(
                          (assignment, index) => (
                            <div key={index} className="assignment-item">
                              <span className="subject-name">
                                {assignment.subject}
                              </span>
                              <div className="grades-list">
                                {assignment.grades.map((grade, gradeIndex) => (
                                  <span key={gradeIndex} className="grade-tag">
                                    {grade}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )
                        )}
                      </div>
                    ) : (
                      <p className="no-assignments">
                        {t("no_subject_grades_assigned")}
                      </p>
                    )}
                    <button
                      onClick={() => handleEditSubjectGrades(teacher)}
                      className="edit-assignments-btn"
                    >
                      {t("edit_subject_grades")}
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}

          {teachers.length === 0 && (
            <div className="no-teachers">
              <p>{t("no_teachers_found")}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminTeacherGradeAssignment;
