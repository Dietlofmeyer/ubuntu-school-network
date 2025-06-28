import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../AuthContext";
import { useTranslation } from "react-i18next";
import { signOut } from "firebase/auth";
import { auth, db } from "../../firebase";
import { collection, getDocs } from "firebase/firestore";
import "./AdminDashboard.css";

const GRADE_LABELS = [
  "R",
  "1",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "10",
  "11",
  "12",
];

const AdminDashboard: React.FC = () => {
  const { profile } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();

  // Analytics state
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalStudents: 0,
    totalGuardians: 0,
    totalTeachers: 0,
    totalAdmins: 0,
    studentsPerGrade: {} as Record<string, number>,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      const usersSnap = await getDocs(collection(db, "users"));
      let totalUsers = 0;
      let totalStudents = 0;
      let totalGuardians = 0;
      let totalTeachers = 0;
      let totalAdmins = 0;
      const studentsPerGrade: Record<string, number> = {};

      usersSnap.forEach((doc) => {
        totalUsers++;
        const data = doc.data();
        const role = data.role;
        if (role === "student") {
          totalStudents++;
          const grade = (data.grade || "").toString();
          if (grade) {
            studentsPerGrade[grade] = (studentsPerGrade[grade] || 0) + 1;
          }
        } else if (role === "guardian") totalGuardians++;
        else if (role === "teacher") totalTeachers++;
        else if (role === "admin" || role === "principal") totalAdmins++;
      });

      setStats({
        totalUsers,
        totalStudents,
        totalGuardians,
        totalTeachers,
        totalAdmins,
        studentsPerGrade,
      });
      setLoading(false);
    };
    fetchStats();
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/");
  };

  if (loading) {
    return (
      <div className="admin-dashboard-loading">
        <div className="admin-loading-content">
          <div className="admin-loading-spinner"></div>
          <div className="admin-loading-text">
            {t("loading") || "Loading Dashboard..."}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-dashboard-root">
      {/* Hero Header with Modern Design */}
      <div className="admin-dashboard-hero">
        <div className="admin-hero-content">
          <div className="admin-hero-welcome">
            <div className="admin-hero-title">
              🏫 {t("admin_dashboard") || "Admin Dashboard"}
            </div>
            <div className="admin-hero-subtitle">
              {t("welcome_admin", { name: profile?.name || profile?.email }) ||
                `Welcome, ${profile?.name || profile?.email}`}
            </div>
            <div className="admin-hero-description">
              {t("admin_dashboard_description") ||
                "Manage your school's users, staff, and analytics"}
            </div>
          </div>
          <div className="admin-hero-actions">
            <button className="admin-logout-btn" onClick={handleLogout}>
              <span>🚪</span>
              {t("logout") || "Logout"}
            </button>
          </div>
        </div>
      </div>

      {/* Quick Stats Overview */}
      <div className="admin-stats-overview">
        <div className="admin-stats-title">
          📊 {t("school_overview") || "School Overview"}
        </div>
        <div className="admin-stats-grid">
          <div className="admin-stat-card">
            <div className="admin-stat-icon">👥</div>
            <div className="admin-stat-value">{stats.totalUsers}</div>
            <div className="admin-stat-label">
              {t("total_users") || "Total Users"}
            </div>
          </div>
          <div className="admin-stat-card">
            <div className="admin-stat-icon">🎓</div>
            <div className="admin-stat-value">{stats.totalStudents}</div>
            <div className="admin-stat-label">
              {t("total_students") || "Students"}
            </div>
          </div>
          <div className="admin-stat-card">
            <div className="admin-stat-icon">👨‍👩‍👧‍👦</div>
            <div className="admin-stat-value">{stats.totalGuardians}</div>
            <div className="admin-stat-label">
              {t("total_guardians") || "Guardians"}
            </div>
          </div>
          <div className="admin-stat-card">
            <div className="admin-stat-icon">👨‍🏫</div>
            <div className="admin-stat-value">{stats.totalTeachers}</div>
            <div className="admin-stat-label">
              {t("total_teachers") || "Teachers"}
            </div>
          </div>
          <div className="admin-stat-card">
            <div className="admin-stat-icon">👔</div>
            <div className="admin-stat-value">{stats.totalAdmins}</div>
            <div className="admin-stat-label">
              {t("total_admins") || "Admins"}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="admin-content-grid">
        <div className="admin-management-section">
          <div className="admin-section-header">
            <div className="admin-section-title">
              🛠️ {t("management_tools") || "Management Tools"}
            </div>
            <div className="admin-section-subtitle">
              {t("manage_school_operations") ||
                "Manage your school's operations and users"}
            </div>
          </div>

          <div className="admin-management-cards">
            <Link
              to="/admin-dashboard/personnel"
              className="admin-management-card admin-fade-in"
            >
              <div className="admin-card-icon">👥</div>
              <div className="admin-card-content">
                <div className="admin-card-title">
                  {t("manage_admin_personnel") || "Admin Personnel"}
                </div>
                <div className="admin-card-description">
                  {t("manage_admin_personnel_desc") ||
                    "Add, view, or remove administrative staff members"}
                </div>
                <div className="admin-card-stats">
                  {stats.totalAdmins} {t("active_admins") || "Active Admins"}
                </div>
              </div>
              <div className="admin-card-arrow">→</div>
            </Link>

            <Link
              to="/admin-dashboard/users"
              className="admin-management-card admin-fade-in"
            >
              <div className="admin-card-icon">🏠</div>
              <div className="admin-card-content">
                <div className="admin-card-title">
                  {t("user_management") || "User Management"}
                </div>
                <div className="admin-card-description">
                  {t("user_management_desc") ||
                    "View and manage all users in your school system"}
                </div>
                <div className="admin-card-stats">
                  {stats.totalUsers} {t("total_users") || "Total Users"}
                </div>
              </div>
              <div className="admin-card-arrow">→</div>
            </Link>

            <Link
              to="/admin-dashboard/guardians"
              className="admin-management-card admin-fade-in"
            >
              <div className="admin-card-icon">👨‍👩‍👧‍👦</div>
              <div className="admin-card-content">
                <div className="admin-card-title">
                  {t("guardians_and_students") || "Guardians & Students"}
                </div>
                <div className="admin-card-description">
                  {t("manage_guardians_and_students_desc") ||
                    "Manage guardians and their linked students"}
                </div>
                <div className="admin-card-stats">
                  {stats.totalGuardians} {t("guardians") || "Guardians"} •{" "}
                  {stats.totalStudents} {t("students") || "Students"}
                </div>
              </div>
              <div className="admin-card-arrow">→</div>
            </Link>

            <Link
              to="/admin-dashboard/homeroom"
              className="admin-management-card admin-fade-in"
            >
              <div className="admin-card-icon">🏠</div>
              <div className="admin-card-content">
                <div className="admin-card-title">
                  {t("homeroom_management") || "Homeroom Management"}
                </div>
                <div className="admin-card-description">
                  {t("homeroom_management_desc") ||
                    "Assign homeroom teachers and manage student homeroom classes"}
                </div>
                <div className="admin-card-stats">
                  {t("manage_homeroom_assignments") || "Manage Assignments"}
                </div>
              </div>
              <div className="admin-card-arrow">→</div>
            </Link>

            <Link
              to="/admin-dashboard/teacher-grades"
              className="admin-management-card admin-fade-in"
            >
              <div className="admin-card-icon">🎓</div>
              <div className="admin-card-content">
                <div className="admin-card-title">
                  {t("teacher_subject_grade_assignment") ||
                    "Teacher Subject & Grade Assignment"}
                </div>
                <div className="admin-card-description">
                  {t("assign_subject_grades_to_teachers_description") ||
                    "Assign specific subjects and grades to teachers for more granular control"}
                </div>
                <div className="admin-card-stats">
                  {t("manage_teacher_grades") || "Manage Grade Assignments"}
                </div>
              </div>
              <div className="admin-card-arrow">→</div>
            </Link>

            <Link
              to="/admin-dashboard/academic-reporting"
              className="admin-management-card admin-fade-in"
            >
              <div className="admin-card-icon">📊</div>
              <div className="admin-card-content">
                <div className="admin-card-title">
                  {t("academic_reporting") || "Academic Reports"}
                </div>
                <div className="admin-card-description">
                  {t("academic_reporting_desc") ||
                    "View comprehensive academic analytics and reporting"}
                </div>
                <div className="admin-card-stats">
                  {t("comprehensive_analytics") || "Analytics & Insights"}
                </div>
              </div>
              <div className="admin-card-arrow">→</div>
            </Link>
          </div>
        </div>

        <div className="admin-analytics-section">
          <div className="admin-section-header">
            <div className="admin-section-title">
              📈 {t("grade_distribution") || "Grade Distribution"}
            </div>
            <div className="admin-section-subtitle">
              {t("students_per_grade") || "Students enrolled per grade level"}
            </div>
          </div>

          <div className="admin-grade-cards">
            {GRADE_LABELS.map((grade) => {
              const count = stats.studentsPerGrade[grade] || 0;
              if (count === 0) return null;

              return (
                <div className="admin-grade-card admin-fade-in" key={grade}>
                  <div className="admin-grade-label">
                    {t("grade") || "Grade"} {grade}
                  </div>
                  <div className="admin-grade-count">{count}</div>
                  <div className="admin-grade-bar">
                    <div
                      className="admin-grade-progress"
                      style={{
                        width: `${Math.max(
                          20,
                          (count /
                            Math.max(
                              ...Object.values(stats.studentsPerGrade)
                            )) *
                            100
                        )}%`,
                      }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>

          {Object.keys(stats.studentsPerGrade).length === 0 && (
            <div className="admin-empty-state">
              <div className="admin-empty-icon">📚</div>
              <div className="admin-empty-title">
                {t("no_grade_data") || "No Grade Data"}
              </div>
              <div className="admin-empty-subtitle">
                {t("grade_data_will_appear") ||
                  "Student grade distribution will appear here once students are enrolled"}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
