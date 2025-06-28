import React, { useEffect, useState } from "react";
import { Routes, Route, useNavigate, Navigate } from "react-router-dom";
import StudentDash from "./Components/Student/studentDash";
import TeacherDashboard from "./Components/Teacher/TeacherDashboard";
import Login from "./Components/Auth/Login";
import Register from "./Components/Auth/Register";
import ParentDash from "./Components/Parent/ParentDash";
import SchoolRegistration from "./Components/Auth/SchoolRegistration";
import AdminDashboard from "./Components/Admin/AdminDashboard";
import AdminPersonnel from "./Components/Admin/AdminPersonnel";
import UserManagement from "./Components/Admin/UserManagement";
import AdminHomeroomManagement from "./Components/Admin/AdminHomeroomManagement";
import AdminTeacherGradeAssignment from "./Components/Admin/AdminTeacherGradeAssignment";
import AdminAcademicReporting from "./Components/Admin/AdminAcademicReporting";
import AdminAwardManagement from "./Components/Admin/AdminAwardManagement";
import { AuthProvider, useAuth } from "./AuthContext";
import { ThemeProvider } from "./ThemeContext";
import StaffDash from "./Components/Staff/StaffDash";
import GuardianDash from "./Components/Guardian/GuardianDash";
import GuardiansStudentsDashboard from "./Components/Admin/GuardiansStudentsDashboard";
import AdminLayout from "./Components/Admin/AdminLayout";
import StudentAwards from "./Components/Student/StudentAwards";
import StudentActivities from "./Components/Student/StudentActivities";
import ActivitySessions from "./Components/Student/ActivitySessions";
import AdminActivityManagement from "./Components/Admin/AdminActivityManagement";
import ErrorBoundary from "./Components/ErrorReporting/ErrorBoundary";
import FloatingBugButton from "./Components/ErrorReporting/FloatingBugButton";
import DeveloperDashboard from "./Components/ErrorReporting/DeveloperDashboard";
import { setupConsoleErrorLogging } from "./utils/consoleErrorLogger";
import "./App.css";
import "./theme.css";
import "./i18n";
import { useTranslation } from "react-i18next";
import DevDash from "./Components/Dev/DevDash";
import AuditLogs from "./Components/Dev/AuditLogs";
import UserSignupsAnalytics from "./Components/Dev/UserSignupsAnalytics";
import SchoolRegistrationReview from "./Components/Dev/SchoolRegistrationReview";
import SettingsModal from "./Components/Modal/SettingsModal";

function HomeButtons() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [showSettings, setShowSettings] = useState(false);

  return (
    <div className="app-shell">
      <button
        className="settings-button"
        onClick={() => setShowSettings(true)}
        aria-label={t("settings") || "Settings"}
      >
        <span className="settings-icon">⚙️</span>
      </button>

      <main className="main-content">
        <div className="home-content">
          <h1>{t("welcome_portal")}</h1>
          <p>{t("please_login_or_register")}</p>
          <div className="home-btn-row">
            <button className="nav-btn" onClick={() => navigate("/login")}>
              {t("login")}
            </button>
            <button className="nav-btn" onClick={() => navigate("/register")}>
              {t("register")}
            </button>
            <button
              className="nav-btn secondary"
              onClick={() => navigate("/school-registration")}
            >
              {t("school_registration") || "School Registration"}
            </button>
          </div>
        </div>
      </main>

      <SettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
      />
    </div>
  );
}

// Protected route component
function ProtectedRoute({
  children,
  role,
}: {
  children: React.ReactNode;
  role?: string | string[];
}) {
  const { user, profile, loading } = useAuth();
  const { t } = useTranslation();
  if (loading) return <div>{t("loading")}</div>;
  if (!user) return <Navigate to="/login" />;
  if (role) {
    const allowedRoles = Array.isArray(role) ? role : [role];
    if (!profile || !allowedRoles.includes(profile.role))
      return <Navigate to="/" />;
  }
  return <>{children}</>;
}

function App() {
  const [theme] = useState("dark");

  useEffect(() => {
    document.body.setAttribute("data-theme", theme);
    // Setup console error logging for error reporting
    setupConsoleErrorLogging();
  }, [theme]);

  return (
    <AuthProvider>
      <ThemeProvider>
        <ErrorBoundary>
          <div className="app-shell">
            <Routes>
              <Route path="/" element={<HomeButtons />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route
                path="/school-registration"
                element={<SchoolRegistration />}
              />

              {/* Student dashboard, protected */}
              <Route
                path="/students"
                element={
                  <ProtectedRoute role="student">
                    <StudentDash />
                  </ProtectedRoute>
                }
              />

              {/* Student awards, protected */}
              <Route
                path="/student-awards"
                element={
                  <ProtectedRoute role="student">
                    <StudentAwards showAll={true} />
                  </ProtectedRoute>
                }
              />

              {/* Student activities, protected */}
              <Route
                path="/student-activities"
                element={
                  <ProtectedRoute role="student">
                    <StudentActivities />
                  </ProtectedRoute>
                }
              />

              {/* Student activity sessions, protected */}
              <Route
                path="/activity-sessions"
                element={
                  <ProtectedRoute role="student">
                    <ActivitySessions />
                  </ProtectedRoute>
                }
              />

              {/* Teacher dashboard, protected */}
              <Route
                path="/teachers"
                element={
                  <ProtectedRoute role="teacher">
                    <TeacherDashboard />
                  </ProtectedRoute>
                }
              />

              {/* Parent dashboard, protected */}
              <Route
                path="/parents"
                element={
                  <ProtectedRoute role="parent">
                    <ParentDash />
                  </ProtectedRoute>
                }
              />

              {/* Admin dashboard, protected for admin and principal */}
              <Route
                path="/admin-dashboard/*"
                element={
                  <ProtectedRoute role={["admin", "principal"]}>
                    <AdminLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<AdminDashboard />} />
                <Route path="personnel" element={<AdminPersonnel />} />
                <Route path="users" element={<UserManagement />} />
                <Route
                  path="guardians"
                  element={<GuardiansStudentsDashboard />}
                />
                <Route path="homeroom" element={<AdminHomeroomManagement />} />
                <Route
                  path="teacher-grades"
                  element={<AdminTeacherGradeAssignment />}
                />
                <Route
                  path="academic-reporting"
                  element={<AdminAcademicReporting />}
                />
                <Route path="awards" element={<AdminAwardManagement />} />
                <Route
                  path="activities"
                  element={<AdminActivityManagement />}
                />
              </Route>

              {/* Staff dashboard, protected */}
              <Route
                path="/staff"
                element={
                  <ProtectedRoute role="staff">
                    <StaffDash />
                  </ProtectedRoute>
                }
              />

              {/* Guardian dashboard, protected */}
              <Route
                path="/guardians"
                element={
                  <ProtectedRoute role="guardian">
                    <GuardianDash />
                  </ProtectedRoute>
                }
              />

              {/* Developer dashboard, protected */}
              <Route
                path="/developer-dashboard"
                element={
                  <ProtectedRoute role="developer">
                    <DevDash />
                  </ProtectedRoute>
                }
              />
              <Route path="/audit-logs" element={<AuditLogs />} />
              <Route
                path="/user-signups-analytics"
                element={
                  <ProtectedRoute role="developer">
                    <UserSignupsAnalytics />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/school-registration-review"
                element={
                  <ProtectedRoute role="developer">
                    <SchoolRegistrationReview />
                  </ProtectedRoute>
                }
              />

              {/* Error Reporting Dashboard */}
              <Route
                path="/error-reports"
                element={
                  <ProtectedRoute role={["admin", "staff"]}>
                    <DeveloperDashboard />
                  </ProtectedRoute>
                }
              />

              {/* Catch-all route - redirects to home */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>

            {/* Floating Bug Report Button */}
            <FloatingBugButton />
          </div>
        </ErrorBoundary>
      </ThemeProvider>
    </AuthProvider>
  );
}

export default App;
