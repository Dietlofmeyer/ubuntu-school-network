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
  writeBatch,
} from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import { db } from "../../firebase";
import { GRADES } from "../../data/constants";
import "./AdminHomeroomManagement.css";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  grade?: string;
  homeroomClass?: string;
  schoolId?: string;
}

interface HomeroomAssignment {
  teacherId: string;
  teacherName: string;
  teacherEmail: string;
  homeroomClass: string;
  students: User[];
}

const AdminHomeroomManagement: React.FC = () => {
  const { t } = useTranslation();
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [teachers, setTeachers] = useState<User[]>([]);
  const [students, setStudents] = useState<User[]>([]);
  const [homeroomAssignments, setHomeroomAssignments] = useState<
    HomeroomAssignment[]
  >([]);
  const [unassignedStudents, setUnassignedStudents] = useState<User[]>([]);
  const [selectedGrade, setSelectedGrade] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");

  useEffect(() => {
    if (profile?.schoolId) {
      fetchData();
    }
  }, [profile?.schoolId]);

  const fetchData = async () => {
    if (!profile?.schoolId) return;

    setLoading(true);
    setError("");

    try {
      // Fetch all users from the school
      const usersQuery = query(
        collection(db, "users"),
        where("schoolId", "==", profile.schoolId)
      );

      const usersSnapshot = await getDocs(usersQuery);
      const allTeachers: User[] = [];
      const allStudents: User[] = [];

      usersSnapshot.forEach((doc) => {
        const userData = { id: doc.id, ...doc.data() } as User;
        if (userData.role === "teacher") {
          allTeachers.push(userData);
        } else if (userData.role === "student") {
          allStudents.push(userData);
        }
      });

      setTeachers(allTeachers);
      setStudents(allStudents);

      // Process homeroom assignments
      processHomeroomAssignments(allTeachers, allStudents);
    } catch (err) {
      console.error("Error fetching data:", err);
      setError(t("failed_to_load_data"));
    } finally {
      setLoading(false);
    }
  };

  const processHomeroomAssignments = (
    teacherList: User[],
    studentList: User[]
  ) => {
    const assignments: HomeroomAssignment[] = [];
    const assignedStudentIds = new Set<string>();

    // Group students by homeroom class and find their teachers
    const homeroomGroups: { [key: string]: User[] } = {};

    studentList.forEach((student) => {
      if (student.homeroomClass) {
        if (!homeroomGroups[student.homeroomClass]) {
          homeroomGroups[student.homeroomClass] = [];
        }
        homeroomGroups[student.homeroomClass].push(student);
        assignedStudentIds.add(student.id);
      }
    });

    // Create assignments for each homeroom
    Object.entries(homeroomGroups).forEach(
      ([homeroomClass, studentsInClass]) => {
        const teacher = teacherList.find(
          (t) => t.homeroomClass === homeroomClass
        );

        if (teacher) {
          assignments.push({
            teacherId: teacher.id,
            teacherName: teacher.name,
            teacherEmail: teacher.email,
            homeroomClass,
            students: studentsInClass.sort((a, b) =>
              a.name.localeCompare(b.name)
            ),
          });
        } else {
          // Homeroom class exists but no teacher assigned
          assignments.push({
            teacherId: "",
            teacherName: t("no_teacher_assigned"),
            teacherEmail: "",
            homeroomClass,
            students: studentsInClass.sort((a, b) =>
              a.name.localeCompare(b.name)
            ),
          });
        }
      }
    );

    // Find unassigned students
    const unassigned = studentList.filter(
      (student) => !assignedStudentIds.has(student.id)
    );

    setHomeroomAssignments(
      assignments.sort((a, b) => a.homeroomClass.localeCompare(b.homeroomClass))
    );
    setUnassignedStudents(
      unassigned.sort((a, b) => a.name.localeCompare(b.name))
    );
  };

  const handleAssignTeacherToHomeroom = async (
    homeroomClass: string,
    teacherId: string
  ) => {
    if (!teacherId) return;

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const batch = writeBatch(db);

      // Update the teacher's homeroom class
      const teacherRef = doc(db, "users", teacherId);
      batch.update(teacherRef, { homeroomClass });

      // Remove homeroom assignment from any other teacher who had this class
      const currentTeacher = teachers.find(
        (t) => t.homeroomClass === homeroomClass && t.id !== teacherId
      );
      if (currentTeacher) {
        const currentTeacherRef = doc(db, "users", currentTeacher.id);
        batch.update(currentTeacherRef, { homeroomClass: "" });
      }

      await batch.commit();

      // Log the changes for POPIA compliance
      try {
        const functions = getFunctions();
        const logUserEdit = httpsCallable(functions, "logUserEdit");

        // Log assignment to new teacher
        await logUserEdit({
          userId: teacherId,
          changes: { homeroomClass: { new: homeroomClass } },
          editorId: user?.uid || "unknown",
          reason:
            "Admin assigned homeroom class via Homeroom Management interface",
        });

        // Log removal from previous teacher if applicable
        if (currentTeacher) {
          await logUserEdit({
            userId: currentTeacher.id,
            changes: { homeroomClass: { previous: homeroomClass, new: "" } },
            editorId: user?.uid || "unknown",
            reason:
              "Admin removed homeroom class (reassigned to another teacher)",
          });
        }
      } catch (logError) {
        console.warn("Failed to log homeroom assignment:", logError);
      }

      setSuccess(t("teacher_assigned_successfully"));
      await fetchData(); // Refresh data
    } catch (err) {
      console.error("Error assigning teacher:", err);
      setError(t("failed_to_assign_teacher"));
    } finally {
      setSaving(false);
    }
  };

  const handleAssignStudentToHomeroom = async (
    studentId: string,
    homeroomClass: string
  ) => {
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const studentRef = doc(db, "users", studentId);
      await updateDoc(studentRef, { homeroomClass });

      setSuccess(t("student_assigned_successfully"));
      await fetchData(); // Refresh data
    } catch (err) {
      console.error("Error assigning student:", err);
      setError(t("failed_to_assign_student"));
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveStudentFromHomeroom = async (studentId: string) => {
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const studentRef = doc(db, "users", studentId);
      await updateDoc(studentRef, { homeroomClass: "" });

      setSuccess(t("student_removed_successfully"));
      await fetchData(); // Refresh data
    } catch (err) {
      console.error("Error removing student:", err);
      setError(t("failed_to_remove_student"));
    } finally {
      setSaving(false);
    }
  };

  const getAvailableTeachers = (excludeTeacherId?: string) => {
    return teachers.filter(
      (t) => !t.homeroomClass || t.id === excludeTeacherId
    );
  };

  const filteredAssignments = selectedGrade
    ? homeroomAssignments.filter((assignment) =>
        assignment.students.some((student) => student.grade === selectedGrade)
      )
    : homeroomAssignments;

  const filteredUnassigned = selectedGrade
    ? unassignedStudents.filter((student) => student.grade === selectedGrade)
    : unassignedStudents;

  if (loading) {
    return (
      <div className="admin-homeroom-container">
        <div className="admin-homeroom-loading">
          <div className="loading-spinner"></div>
          <p>{t("loading_homeroom_data")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-homeroom-container">
      {/* Header */}
      <div className="admin-homeroom-header">
        <button className="admin-back-btn" onClick={() => navigate(-1)}>
          ← {t("back_to_dashboard")}
        </button>
        <div className="admin-homeroom-header-main">
          <div className="admin-homeroom-header-icon">🏠</div>
          <div className="admin-homeroom-header-text">
            <h1>{t("homeroom_management")}</h1>
            <p>{t("manage_homeroom_assignments")}</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="admin-homeroom-stats">
        <div className="homeroom-stat-card">
          <div className="stat-icon">👥</div>
          <div className="stat-content">
            <div className="stat-number">{homeroomAssignments.length}</div>
            <div className="stat-label">{t("homeroom_classes")}</div>
          </div>
        </div>
        <div className="homeroom-stat-card">
          <div className="stat-icon">👨‍🏫</div>
          <div className="stat-content">
            <div className="stat-number">
              {teachers.filter((t) => t.homeroomClass).length}
            </div>
            <div className="stat-label">{t("assigned_teachers")}</div>
          </div>
        </div>
        <div className="homeroom-stat-card">
          <div className="stat-icon">👨‍🎓</div>
          <div className="stat-content">
            <div className="stat-number">
              {students.length - unassignedStudents.length}
            </div>
            <div className="stat-label">{t("assigned_students")}</div>
          </div>
        </div>
        <div className="homeroom-stat-card urgent">
          <div className="stat-icon">⚠️</div>
          <div className="stat-content">
            <div className="stat-number">{unassignedStudents.length}</div>
            <div className="stat-label">{t("unassigned_students")}</div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="admin-homeroom-filters">
        <select
          value={selectedGrade}
          onChange={(e) => setSelectedGrade(e.target.value)}
          className="grade-filter"
        >
          <option value="">{t("all_grades")}</option>
          {GRADES.map((grade) => (
            <option key={grade} value={grade}>
              {grade}
            </option>
          ))}
        </select>
      </div>

      {/* Messages */}
      {error && (
        <div className="admin-homeroom-error">
          <span className="error-icon">⚠️</span>
          {error}
        </div>
      )}

      {success && (
        <div className="admin-homeroom-success">
          <span className="success-icon">✅</span>
          {success}
        </div>
      )}

      <div className="admin-homeroom-content">
        {/* Homeroom Assignments */}
        <div className="homeroom-assignments-section">
          <h2>{t("homeroom_assignments")}</h2>

          {filteredAssignments.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🏠</div>
              <h3>{t("no_homeroom_assignments")}</h3>
              <p>{t("no_homeroom_assignments_description")}</p>
            </div>
          ) : (
            <div className="homeroom-assignments-grid">
              {filteredAssignments.map((assignment) => (
                <div
                  key={assignment.homeroomClass}
                  className="homeroom-assignment-card"
                >
                  <div className="homeroom-card-header">
                    <h3>{assignment.homeroomClass}</h3>
                    <span className="student-count">
                      {assignment.students.length} {t("students")}
                    </span>
                  </div>

                  <div className="teacher-assignment">
                    <label>{t("homeroom_teacher")}:</label>
                    {assignment.teacherId ? (
                      <div className="assigned-teacher">
                        <span className="teacher-name">
                          {assignment.teacherName}
                        </span>
                        <select
                          value={assignment.teacherId}
                          onChange={(e) =>
                            handleAssignTeacherToHomeroom(
                              assignment.homeroomClass,
                              e.target.value
                            )
                          }
                          disabled={saving}
                          className="teacher-select"
                        >
                          <option value={assignment.teacherId}>
                            {assignment.teacherName}
                          </option>
                          <option value="">{t("remove_teacher")}</option>
                          {getAvailableTeachers(assignment.teacherId).map(
                            (teacher) => (
                              <option key={teacher.id} value={teacher.id}>
                                {teacher.name}
                              </option>
                            )
                          )}
                        </select>
                      </div>
                    ) : (
                      <select
                        value=""
                        onChange={(e) =>
                          handleAssignTeacherToHomeroom(
                            assignment.homeroomClass,
                            e.target.value
                          )
                        }
                        disabled={saving}
                        className="teacher-select empty"
                      >
                        <option value="">{t("select_teacher")}</option>
                        {getAvailableTeachers().map((teacher) => (
                          <option key={teacher.id} value={teacher.id}>
                            {teacher.name}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  <div className="students-list">
                    <h4>{t("students_in_homeroom")}:</h4>
                    {assignment.students.length === 0 ? (
                      <p className="no-students">{t("no_students_assigned")}</p>
                    ) : (
                      <div className="student-items">
                        {assignment.students.map((student) => (
                          <div key={student.id} className="student-item">
                            <div className="student-info">
                              <span className="student-name">
                                {student.name}
                              </span>
                              <span className="student-grade">
                                {student.grade}
                              </span>
                            </div>
                            <button
                              onClick={() =>
                                handleRemoveStudentFromHomeroom(student.id)
                              }
                              disabled={saving}
                              className="remove-student-btn"
                              title={t("remove_from_homeroom")}
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Unassigned Students */}
        {filteredUnassigned.length > 0 && (
          <div className="unassigned-students-section">
            <h2>
              {t("unassigned_students")} ({filteredUnassigned.length})
            </h2>
            <div className="unassigned-students-grid">
              {filteredUnassigned.map((student) => (
                <div key={student.id} className="unassigned-student-card">
                  <div className="student-info">
                    <h4>{student.name}</h4>
                    <p>{student.grade}</p>
                    <p className="student-email">{student.email}</p>
                  </div>
                  <div className="assign-actions">
                    <label>{t("assign_to_homeroom")}:</label>
                    <select
                      onChange={(e) => {
                        if (e.target.value) {
                          handleAssignStudentToHomeroom(
                            student.id,
                            e.target.value
                          );
                          e.target.value = ""; // Reset selection
                        }
                      }}
                      disabled={saving}
                      className="homeroom-select"
                    >
                      <option value="">{t("select_homeroom")}</option>
                      {homeroomAssignments.map((assignment) => (
                        <option
                          key={assignment.homeroomClass}
                          value={assignment.homeroomClass}
                        >
                          {assignment.homeroomClass} (
                          {assignment.teacherName || t("no_teacher")})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminHomeroomManagement;
