import React, { useState, useEffect } from "react";
import { useAuth } from "../../AuthContext";
import { useTranslation } from "react-i18next";
import {
  collection,
  getDocs,
  query,
  where,
  doc,
  updateDoc,
} from "firebase/firestore";
import { db } from "../../firebase";
import { signOut } from "firebase/auth";
import { auth } from "../../firebase";
import { useNavigate } from "react-router-dom";
import { triggerAchievementCheck } from "../../utils/achievementEngine";

// Import components
import EnhancedAddMarkModal from "./subcomponents/modals/EnhancedAddMarkModal";
import EnhancedBulkMarkModal from "./subcomponents/modals/EnhancedBulkMarkModal";
import DemeritModal from "./subcomponents/modals/DemeritModal";
import MarkTemplatesPage from "./subcomponents/pages/MarkTemplatesPage";
import MarkAnalytics from "./subcomponents/components/MarkAnalytics";
import TeacherAwardAssignment from "./TeacherAwardAssignment";

// CSS
import "./TeacherDashboard.css";

// Types
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

type TeacherProfile = {
  name: string;
  email: string;
  subjects?: string[];
  homeroomClass?: string;
  assignedGrades?: string[];
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
  teacherId: string;
  createdAt: string;
  isGlobal?: boolean;
};

const TeacherDashboard: React.FC = () => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();

  // Page state
  const [currentPage, setCurrentPage] = useState<
    "dashboard" | "templates" | "analytics" | "awards"
  >("dashboard");

  // Teacher and students data
  const [teacher, setTeacher] = useState<TeacherProfile | null>(null);
  const [students, setStudents] = useState<StudentProfile[]>([]);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [studentSearch, setStudentSearch] = useState("");

  // Modal states
  const [markModalOpen, setMarkModalOpen] = useState(false);
  const [bulkMarkModalOpen, setBulkMarkModalOpen] = useState(false);
  const [demeritModalOpen, setDemeritModalOpen] = useState(false);
  const [analyticsModalOpen, setAnalyticsModalOpen] = useState(false);

  // Form states for marking
  const [markStudent, setMarkStudent] = useState<StudentProfile | null>(null);
  const [markSubject, setMarkSubject] = useState("");
  const [markScore, setMarkScore] = useState(0);
  const [markTotal, setMarkTotal] = useState(0);
  const [markDesc, setMarkDesc] = useState("");
  const [markLoading, setMarkLoading] = useState(false);

  // Form states for demerits
  const [demeritStudent, setDemeritStudent] = useState<StudentProfile | null>(
    null
  );
  const [demeritReason, setDemeritReason] = useState("");
  const [demeritPoints, setDemeritPoints] = useState(1);
  const [demeritLoading, setDemeritLoading] = useState(false);

  // Templates and analytics
  const [markTemplates, setMarkTemplates] = useState<MarkTemplate[]>([]);
  const [recentMarks] = useState<Mark[]>([]);

  // Stats
  const [stats, setStats] = useState({
    totalStudents: 0,
    marksThisWeek: 0,
    demaritsThisWeek: 0,
    averageGrade: 0,
  });

  // Load teacher profile
  useEffect(() => {
    if (!user?.uid) return;

    const loadTeacherProfile = async () => {
      try {
        const teachersCollection = collection(db, "users");
        const teacherQuery = query(
          teachersCollection,
          where("uid", "==", user.uid),
          where("role", "==", "teacher")
        );
        const teacherSnapshot = await getDocs(teacherQuery);

        if (!teacherSnapshot.empty) {
          const teacherData = teacherSnapshot.docs[0].data() as TeacherProfile;
          setTeacher(teacherData);
        }
      } catch (error) {
        console.error("Error loading teacher profile:", error);
      }
    };

    loadTeacherProfile();
  }, [user?.uid]);

  // Load students
  useEffect(() => {
    if (!teacher?.homeroomClass && !teacher?.subjects) return;

    const loadStudents = async () => {
      setStudentsLoading(true);
      try {
        const studentsCollection = collection(db, "users");
        const studentsQuery = query(
          studentsCollection,
          where("role", "==", "student")
        );
        const studentsSnapshot = await getDocs(studentsQuery);

        const studentsData: StudentProfile[] = [];
        studentsSnapshot.forEach((doc) => {
          const studentData = doc.data() as StudentProfile;
          studentsData.push(studentData);
        });

        setStudents(studentsData);

        // Filter students for homeroom class
        if (teacher.homeroomClass) {
          const homeroomStudents = studentsData.filter(
            (student) => student.homeroomClass === teacher.homeroomClass
          );
          setStudents(homeroomStudents);
        }

        // Calculate stats
        setStats({
          totalStudents: studentsData.length,
          marksThisWeek: calculateMarksThisWeek(studentsData),
          demaritsThisWeek: calculateDemaritsThisWeek(studentsData),
          averageGrade: calculateAverageGrade(studentsData),
        });
      } catch (error) {
        console.error("Error loading students:", error);
      } finally {
        setStudentsLoading(false);
      }
    };

    loadStudents();
  }, [teacher]);

  // Helper functions
  const calculateMarksThisWeek = (students: StudentProfile[]): number => {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    return students.reduce((total, student) => {
      if (!student.marks) return total;
      return (
        total +
        student.marks.filter((mark) => new Date(mark.date) >= oneWeekAgo).length
      );
    }, 0);
  };

  const calculateDemaritsThisWeek = (students: StudentProfile[]): number => {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    return students.reduce((total, student) => {
      if (!student.demerits) return total;
      return (
        total +
        student.demerits.filter(
          (demerit) => new Date(demerit.date) >= oneWeekAgo
        ).length
      );
    }, 0);
  };

  const calculateAverageGrade = (students: StudentProfile[]): number => {
    let totalMarks = 0;
    let totalPossible = 0;

    students.forEach((student) => {
      if (!student.marks) return;
      student.marks.forEach((mark) => {
        totalMarks += mark.score;
        totalPossible += mark.total;
      });
    });

    return totalPossible > 0
      ? Math.round((totalMarks / totalPossible) * 100)
      : 0;
  };

  // Filter students based on search
  const filteredStudents = students.filter(
    (student) =>
      student.name.toLowerCase().includes(studentSearch.toLowerCase()) ||
      student.email.toLowerCase().includes(studentSearch.toLowerCase())
  );

  // Handlers
  const handleMarkStudent = (student: StudentProfile) => {
    setMarkStudent(student);
    setMarkSubject("");
    setMarkScore(0);
    setMarkTotal(0);
    setMarkDesc("");
    setMarkModalOpen(true);
  };

  const handleDemeritStudent = (student: StudentProfile) => {
    setDemeritStudent(student);
    setDemeritReason("");
    setDemeritModalOpen(true);
  };

  const handleSubmitMark = async () => {
    if (!markStudent || !markSubject || markTotal <= 0) return;

    setMarkLoading(true);
    try {
      const userRef = doc(db, "users", markStudent.uid);
      const newMark: Mark = {
        subject: markSubject,
        score: markScore,
        total: markTotal,
        description: markDesc,
        date: new Date().toISOString(),
        teacher: teacher?.name || user?.email || t("unknown"),
        category: t("assignment"),
      };

      await updateDoc(userRef, {
        marks: [...(markStudent.marks || []), newMark],
      });

      // Update local state
      const updatedStudents = students.map((student) =>
        student.uid === markStudent.uid
          ? { ...student, marks: [...(student.marks || []), newMark] }
          : student
      );
      setStudents(updatedStudents);

      // Trigger achievement check for the student
      try {
        await triggerAchievementCheck.onMarkAdded(markStudent.uid);
      } catch (achievementError) {
        console.error("Error checking achievements:", achievementError);
        // Don't fail the mark submission if achievement check fails
      }

      setMarkModalOpen(false);
    } catch (error) {
      console.error("Error submitting mark:", error);
    } finally {
      setMarkLoading(false);
    }
  };

  const handleSubmitDemerit = async () => {
    if (!demeritStudent || !demeritReason.trim()) return;

    setDemeritLoading(true);
    try {
      const userRef = doc(db, "users", demeritStudent.uid);
      const newDemerit = {
        reason: demeritReason,
        date: new Date().toISOString(),
        teacher: teacher?.name || user?.email || t("unknown"),
      };

      await updateDoc(userRef, {
        demerits: [...(demeritStudent.demerits || []), newDemerit],
      });

      // Update local state
      const updatedStudents = students.map((student) =>
        student.uid === demeritStudent.uid
          ? { ...student, demerits: [...(student.demerits || []), newDemerit] }
          : student
      );
      setStudents(updatedStudents);

      setDemeritModalOpen(false);
    } catch (error) {
      console.error("Error submitting demerit:", error);
    } finally {
      setDemeritLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      navigate("/");
    } catch (error) {
      console.error("Error signing out:", error);
      // Fallback to home page even if sign out fails
      navigate("/");
    }
  };

  const getStudentInitials = (name: string) => {
    return name
      .split(" ")
      .map((word) => word.charAt(0))
      .join("")
      .toUpperCase();
  };

  const getTeacherInitials = (name: string) => {
    return name
      .split(" ")
      .map((word) => word.charAt(0))
      .join("")
      .toUpperCase();
  };

  // Render different pages
  if (currentPage === "templates") {
    return (
      <MarkTemplatesPage
        teacherId={user?.uid || ""}
        onTemplateSelect={(template) => {
          setMarkTemplates([...markTemplates, template]);
          setCurrentPage("dashboard");
        }}
        t={t}
        onBack={() => setCurrentPage("dashboard")}
      />
    );
  }

  if (currentPage === "awards") {
    return (
      <TeacherAwardAssignment onBack={() => setCurrentPage("dashboard")} />
    );
  }

  return (
    <div className="teacher-dashboard">
      <div className="teacher-dashboard-container">
        {/* Header */}
        <header className="teacher-header">
          <div className="teacher-header-content">
            <div className="teacher-header-left">
              <div className="teacher-avatar">
                {teacher?.name ? getTeacherInitials(teacher.name) : "T"}
              </div>
              <div className="teacher-header-info">
                <h1>
                  {t("welcome_teacher", {
                    name: teacher?.name || t("teacher"),
                  })}
                </h1>
                <p>{teacher?.email || user?.email}</p>
                {teacher?.homeroomClass && (
                  <p>
                    {t("homeroom_class")}: {teacher.homeroomClass}
                  </p>
                )}
              </div>
            </div>
            <div className="teacher-header-right">
              <button
                className="teacher-header-btn"
                onClick={() => setCurrentPage("templates")}
              >
                📋 {t("mark_templates")}
              </button>
              <button
                className="teacher-header-btn"
                onClick={() => setCurrentPage("awards")}
              >
                🏆 {t("assign_awards")}
              </button>
              <button
                className="teacher-header-btn"
                onClick={() => setAnalyticsModalOpen(true)}
              >
                📊 {t("mark_analytics")}
              </button>
              <button className="teacher-header-btn" onClick={handleSignOut}>
                🚪 {t("logout")}
              </button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="teacher-main">
          {/* Stats Grid */}
          <div className="teacher-stats-grid">
            <div className="teacher-stat-card primary">
              <div className="teacher-stat-header">
                <div className="teacher-stat-icon primary">👥</div>
              </div>
              <h2 className="teacher-stat-value">{stats.totalStudents}</h2>
              <p className="teacher-stat-label">{t("total_students")}</p>
            </div>

            <div className="teacher-stat-card accent">
              <div className="teacher-stat-header">
                <div className="teacher-stat-icon accent">📝</div>
              </div>
              <h2 className="teacher-stat-value">{stats.marksThisWeek}</h2>
              <p className="teacher-stat-label">{t("marks_this_week")}</p>
            </div>

            <div className="teacher-stat-card accent2">
              <div className="teacher-stat-header">
                <div className="teacher-stat-icon accent2">📊</div>
              </div>
              <h2 className="teacher-stat-value">{stats.averageGrade}%</h2>
              <p className="teacher-stat-label">{t("average_grade")}</p>
            </div>

            <div className="teacher-stat-card warning">
              <div className="teacher-stat-header">
                <div className="teacher-stat-icon warning">⚠️</div>
              </div>
              <h2 className="teacher-stat-value">{stats.demaritsThisWeek}</h2>
              <p className="teacher-stat-label">{t("demerits_this_week")}</p>
            </div>
          </div>

          {/* Quick Actions */}
          <section className="teacher-quick-actions">
            <h2 className="teacher-section-title">{t("quick_actions")}</h2>
            <div className="teacher-actions-grid">
              <div
                className="teacher-action-card"
                onClick={() => setBulkMarkModalOpen(true)}
              >
                <div className="teacher-action-header">
                  <div className="teacher-action-icon">📊</div>
                  <h3 className="teacher-action-title">
                    {t("bulk_mark_assignment")}
                  </h3>
                </div>
                <p className="teacher-action-desc">
                  {t("bulk_mark_description")}
                </p>
              </div>

              <div
                className="teacher-action-card"
                onClick={() => setCurrentPage("templates")}
              >
                <div className="teacher-action-header">
                  <div className="teacher-action-icon">📋</div>
                  <h3 className="teacher-action-title">
                    {t("manage_templates")}
                  </h3>
                </div>
                <p className="teacher-action-desc">
                  {t("templates_description")}
                </p>
              </div>

              <div
                className="teacher-action-card"
                onClick={() => setCurrentPage("awards")}
              >
                <div className="teacher-action-header">
                  <div className="teacher-action-icon">🏆</div>
                  <h3 className="teacher-action-title">{t("assign_awards")}</h3>
                </div>
                <p className="teacher-action-desc">{t("awards_description")}</p>
              </div>

              <div
                className="teacher-action-card"
                onClick={() => setAnalyticsModalOpen(true)}
              >
                <div className="teacher-action-header">
                  <div className="teacher-action-icon">📈</div>
                  <h3 className="teacher-action-title">
                    {t("view_analytics")}
                  </h3>
                </div>
                <p className="teacher-action-desc">
                  {t("analytics_description")}
                </p>
              </div>
            </div>
          </section>

          {/* Students Section */}
          <section className="teacher-students-section">
            <div className="teacher-students-header">
              <h2 className="teacher-section-title">{t("my_students")}</h2>
              <input
                type="text"
                className="teacher-search-bar"
                placeholder={t("search_students")}
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
              />
            </div>

            {studentsLoading ? (
              <div style={{ textAlign: "center", padding: "2rem" }}>
                <p>{t("loading_students")}</p>
              </div>
            ) : (
              <div className="teacher-students-grid">
                {filteredStudents.map((student) => (
                  <div key={student.uid} className="teacher-student-card">
                    <div className="teacher-student-header">
                      <div className="teacher-student-avatar">
                        {getStudentInitials(student.name)}
                      </div>
                      <div className="teacher-student-info">
                        <h3>{student.name}</h3>
                        <p>
                          {student.grade} • {student.homeroomClass}
                        </p>
                      </div>
                    </div>

                    <div className="teacher-student-stats">
                      <div className="teacher-student-stat">
                        <div className="teacher-student-stat-icon marks">
                          📝
                        </div>
                        <span>
                          {student.marks?.length || 0} {t("marks")}
                        </span>
                      </div>
                      <div className="teacher-student-stat">
                        <div className="teacher-student-stat-icon demerits">
                          ⚠️
                        </div>
                        <span>
                          {student.demerits?.length || 0} {t("demerits")}
                        </span>
                      </div>
                    </div>

                    <div className="teacher-student-actions">
                      <button
                        className="teacher-student-btn mark"
                        onClick={() => handleMarkStudent(student)}
                      >
                        📝 {t("add_mark")}
                      </button>
                      <button
                        className="teacher-student-btn demerit"
                        onClick={() => handleDemeritStudent(student)}
                      >
                        ⚠️ {t("add_demerit")}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </main>
      </div>

      {/* Modals */}
      <EnhancedAddMarkModal
        open={markModalOpen}
        onClose={() => setMarkModalOpen(false)}
        student={markStudent}
        subject={markSubject}
        setSubject={setMarkSubject}
        score={markScore}
        setScore={setMarkScore}
        total={markTotal}
        setTotal={setMarkTotal}
        description={markDesc}
        setDescription={setMarkDesc}
        onSubmit={handleSubmitMark}
        loading={markLoading}
        t={t}
        availableSubjects={teacher?.subjects || []}
        markTemplates={markTemplates}
        recentMarks={recentMarks}
      />

      <EnhancedBulkMarkModal
        open={bulkMarkModalOpen}
        onClose={() => setBulkMarkModalOpen(false)}
        subject=""
        scores={[]}
        setScore={() => {}}
        description=""
        setDescription={() => {}}
        total={0}
        setTotal={() => {}}
        onSubmit={() => setBulkMarkModalOpen(false)}
        loading={false}
        t={t}
      />

      <DemeritModal
        open={demeritModalOpen}
        onClose={() => setDemeritModalOpen(false)}
        student={demeritStudent}
        mode="add"
        points={demeritPoints}
        setPoints={setDemeritPoints}
        reason={demeritReason}
        setReason={setDemeritReason}
        onSubmit={handleSubmitDemerit}
        loading={demeritLoading}
        t={t}
      />

      {/* Analytics Modal */}
      {analyticsModalOpen && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.5)",
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
          }}
        >
          <div
            style={{
              background: "var(--color-bg-card)",
              borderRadius: "16px",
              maxWidth: "90vw",
              maxHeight: "90vh",
              overflow: "auto",
              position: "relative",
              border: "1px solid rgba(255, 255, 255, 0.1)",
            }}
          >
            <button
              onClick={() => setAnalyticsModalOpen(false)}
              style={{
                position: "absolute",
                top: "15px",
                right: "20px",
                background: "none",
                border: "none",
                fontSize: "24px",
                cursor: "pointer",
                color: "var(--color-text)",
                zIndex: 1001,
              }}
            >
              ×
            </button>
            <MarkAnalytics teacherId={user?.uid || ""} t={t} />
          </div>
        </div>
      )}
    </div>
  );
};

export default TeacherDashboard;
