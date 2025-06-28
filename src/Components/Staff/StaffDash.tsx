import React, { useEffect, useState } from "react";
import { signOut } from "firebase/auth";
import { auth, db } from "../../firebase";
import { useAuth } from "../../AuthContext";
import { useTranslation } from "react-i18next";
import { collection, query, where, getDocs } from "firebase/firestore";
import "./StaffDash.css";

type UserProfile = {
  id: string;
  name: string;
  email: string;
  role: string;
  grade?: string;
  phone?: string;
  registered?: boolean;
  guardians?: string[];
  subjects?: string[];
  createdAt?: { seconds: number; nanoseconds: number } | null;
};

const StaffDash: React.FC = () => {
  const { profile } = useAuth();
  const { t } = useTranslation();

  // State for user data
  const [students, setStudents] = useState<UserProfile[]>([]);
  const [guardians, setGuardians] = useState<UserProfile[]>([]);
  const [teachers, setTeachers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  // State for search and filters
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRole, setSelectedRole] = useState("all");
  const [selectedGrade, setSelectedGrade] = useState("all");

  // State for analytics
  const [analytics, setAnalytics] = useState({
    totalUsers: 0,
    totalStudents: 0,
    totalGuardians: 0,
    totalTeachers: 0,
    recentSignups: [] as UserProfile[],
  });

  // State for selected user (read-only view)
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [showUserModal, setShowUserModal] = useState(false);

  // Fetch all users data
  useEffect(() => {
    const fetchData = async () => {
      if (!profile?.schoolId) return;

      setLoading(true);
      try {
        const usersQuery = query(
          collection(db, "users"),
          where("schoolId", "==", profile.schoolId)
        );
        const usersSnap = await getDocs(usersQuery);

        const allUsers: UserProfile[] = [];
        const studentsData: UserProfile[] = [];
        const guardiansData: UserProfile[] = [];
        const teachersData: UserProfile[] = [];

        usersSnap.forEach((doc) => {
          const data = doc.data();
          const user: UserProfile = {
            id: doc.id,
            name: data.name || "N/A",
            email: data.email || "N/A",
            role: data.role || "unknown",
            grade: data.grade,
            phone: data.phone,
            registered: data.registered,
            guardians: data.guardians,
            subjects: data.subjects,
            createdAt: data.createdAt,
          };

          allUsers.push(user);

          if (data.role === "student") studentsData.push(user);
          else if (data.role === "guardian") guardiansData.push(user);
          else if (data.role === "teacher") teachersData.push(user);
        });

        setStudents(studentsData);
        setGuardians(guardiansData);
        setTeachers(teachersData);

        // Calculate analytics
        const recentSignups = allUsers
          .filter((u) => u.createdAt && typeof u.createdAt.seconds === "number")
          .sort(
            (a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0)
          )
          .slice(0, 5);

        setAnalytics({
          totalUsers: allUsers.length,
          totalStudents: studentsData.length,
          totalGuardians: guardiansData.length,
          totalTeachers: teachersData.length,
          recentSignups,
        });
      } catch (error) {
        console.error("Error fetching users:", error);
      }
      setLoading(false);
    };

    fetchData();
  }, [profile?.schoolId]);

  // Filter users based on search and filters
  const getFilteredUsers = () => {
    let users: UserProfile[] = [];

    if (selectedRole === "all") {
      users = [...students, ...guardians, ...teachers];
    } else if (selectedRole === "student") {
      users = students;
    } else if (selectedRole === "guardian") {
      users = guardians;
    } else if (selectedRole === "teacher") {
      users = teachers;
    }

    // Apply search filter
    if (searchTerm) {
      users = users.filter(
        (user) =>
          user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply grade filter (only for students)
    if (selectedGrade !== "all") {
      users = users.filter((user) => user.grade === selectedGrade);
    }

    return users;
  };

  const handleLogout = async () => {
    await signOut(auth);
  };

  const handleViewUser = (user: UserProfile) => {
    setSelectedUser(user);
    setShowUserModal(true);
  };

  if (loading) {
    return (
      <div className="staff-dashboard">
        <div className="staff-loading">Loading...</div>
      </div>
    );
  }

  return (
    <div className="staff-dashboard">
      {/* Header */}
      <header className="staff-header">
        <h1>{t("staff_dashboard") || "Staff Dashboard"}</h1>
        <p>
          {t("welcome_personnel", { name: profile?.name || profile?.email }) ||
            `Welcome, ${profile?.name || profile?.email}!`}
        </p>
        <button className="staff-logout-btn" onClick={handleLogout}>
          {t("logout") || "Logout"}
        </button>
      </header>

      {/* Analytics Section */}
      <section className="staff-analytics">
        <h2>{t("school_analytics") || "School Analytics"}</h2>
        <div className="analytics-cards">
          <div className="analytics-card">
            <div className="analytics-value">{analytics.totalUsers}</div>
            <div className="analytics-label">
              {t("total_users") || "Total Users"}
            </div>
          </div>
          <div className="analytics-card">
            <div className="analytics-value">{analytics.totalStudents}</div>
            <div className="analytics-label">
              {t("total_students") || "Total Students"}
            </div>
          </div>
          <div className="analytics-card">
            <div className="analytics-value">{analytics.totalGuardians}</div>
            <div className="analytics-label">
              {t("total_guardians") || "Total Guardians"}
            </div>
          </div>
          <div className="analytics-card">
            <div className="analytics-value">{analytics.totalTeachers}</div>
            <div className="analytics-label">
              {t("total_teachers") || "Total Teachers"}
            </div>
          </div>
        </div>

        {/* Recent Signups */}
        <div className="recent-signups">
          <h3>{t("recent_signups") || "Recent Signups"}</h3>
          <div className="signups-list">
            {analytics.recentSignups.map((user) => (
              <div key={user.id} className="signup-item">
                <span className="signup-name">{user.name}</span>
                <span className={`role-badge role-${user.role}`}>
                  {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                </span>
                <span className="signup-date">
                  {user.createdAt
                    ? new Date(
                        user.createdAt.seconds * 1000
                      ).toLocaleDateString()
                    : "N/A"}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Search and Filters */}
      <section className="staff-filters">
        <h2>{t("user_management") || "User Management"}</h2>
        <div className="filters-row">
          <input
            type="text"
            placeholder={t("search_users") || "Search users..."}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            className="filter-select"
          >
            <option value="all">{t("all_roles") || "All Roles"}</option>
            <option value="student">{t("students") || "Students"}</option>
            <option value="guardian">{t("guardians") || "Guardians"}</option>
            <option value="teacher">{t("teachers") || "Teachers"}</option>
          </select>
          {selectedRole === "student" && (
            <select
              value={selectedGrade}
              onChange={(e) => setSelectedGrade(e.target.value)}
              className="filter-select"
            >
              <option value="all">{t("all_grades") || "All Grades"}</option>
              <option value="R">Grade R</option>
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i + 1} value={String(i + 1)}>
                  Grade {i + 1}
                </option>
              ))}
            </select>
          )}
        </div>
      </section>

      {/* Users List */}
      <section className="staff-users">
        <div className="users-table-container">
          <table className="users-table">
            <thead>
              <tr>
                <th>{t("name") || "Name"}</th>
                <th>{t("email") || "Email"}</th>
                <th>{t("role") || "Role"}</th>
                <th>{t("grade") || "Grade"}</th>
                <th>{t("status") || "Status"}</th>
                <th>{t("actions") || "Actions"}</th>
              </tr>
            </thead>
            <tbody>
              {getFilteredUsers().map((user) => (
                <tr key={user.id}>
                  <td>{user.name}</td>
                  <td>{user.email}</td>
                  <td>
                    <span className={`role-badge role-${user.role}`}>
                      {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                    </span>
                  </td>
                  <td>{user.grade || "N/A"}</td>
                  <td>
                    <span
                      className={`status-badge ${
                        user.registered ? "registered" : "pending"
                      }`}
                    >
                      {user.registered
                        ? t("registered") || "Registered"
                        : t("pending") || "Pending"}
                    </span>
                  </td>
                  <td>
                    <button
                      className="view-btn"
                      onClick={() => handleViewUser(user)}
                    >
                      {t("view") || "View"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* User Details Modal (Read-only) */}
      {showUserModal && selectedUser && (
        <div className="modal-overlay" onClick={() => setShowUserModal(false)}>
          <div className="user-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{t("user_details") || "User Details"}</h3>
              <button
                className="modal-close"
                onClick={() => setShowUserModal(false)}
              >
                ×
              </button>
            </div>
            <div className="modal-content">
              <div className="user-detail-row">
                <strong>{t("name") || "Name"}:</strong>
                <span>{selectedUser.name}</span>
              </div>
              <div className="user-detail-row">
                <strong>{t("email") || "Email"}:</strong>
                <span>{selectedUser.email}</span>
              </div>
              <div className="user-detail-row">
                <strong>{t("role") || "Role"}:</strong>
                <span className={`role-badge role-${selectedUser.role}`}>
                  {selectedUser.role.charAt(0).toUpperCase() +
                    selectedUser.role.slice(1)}
                </span>
              </div>
              {selectedUser.grade && (
                <div className="user-detail-row">
                  <strong>{t("grade") || "Grade"}:</strong>
                  <span>{selectedUser.grade}</span>
                </div>
              )}
              {selectedUser.phone && (
                <div className="user-detail-row">
                  <strong>{t("phone") || "Phone"}:</strong>
                  <span>{selectedUser.phone}</span>
                </div>
              )}
              {selectedUser.subjects && selectedUser.subjects.length > 0 && (
                <div className="user-detail-row">
                  <strong>{t("subjects") || "Subjects"}:</strong>
                  <span>{selectedUser.subjects.join(", ")}</span>
                </div>
              )}
              <div className="user-detail-row">
                <strong>{t("status") || "Status"}:</strong>
                <span
                  className={`status-badge ${
                    selectedUser.registered ? "registered" : "pending"
                  }`}
                >
                  {selectedUser.registered
                    ? t("registered") || "Registered"
                    : t("pending") || "Pending"}
                </span>
              </div>
              {selectedUser.createdAt && (
                <div className="user-detail-row">
                  <strong>{t("created_at") || "Created"}:</strong>
                  <span>
                    {new Date(
                      selectedUser.createdAt.seconds * 1000
                    ).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffDash;
