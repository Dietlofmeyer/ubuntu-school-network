import React, { useEffect, useState } from "react";
import {
  collection,
  query,
  where,
  getDocs,
  deleteDoc,
  doc,
} from "firebase/firestore";
import { db } from "../../firebase";
import { useAuth } from "../../AuthContext";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import "./AdminDashboard.css";

const UserManagement: React.FC = () => {
  const { profile } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUsers = async () => {
      if (!profile?.schoolId) return;
      const q = query(
        collection(db, "users"),
        where("schoolId", "==", profile.schoolId)
      );
      const snap = await getDocs(q);
      setUsers(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    };
    fetchUsers();
  }, [profile?.schoolId]);

  const handleRemove = async (id: string) => {
    if (!window.confirm("Are you sure you want to remove this user?")) return;
    await deleteDoc(doc(db, "users", id));
    setUsers((prev) => prev.filter((u) => u.id !== id));
  };

  return (
    <div className="admin-dashboard-container">
      {/* Header Section */}
      <div className="admin-header">
        <div className="admin-header-content">
          <button className="admin-back-btn" onClick={() => navigate(-1)}>
            ← Back to Dashboard
          </button>
          <div className="admin-header-main">
            <div className="admin-header-icon">👥</div>
            <div className="admin-header-text">
              <h1 className="admin-header-title">User Management</h1>
              <p className="admin-header-subtitle">
                Manage all user accounts across your school
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* User Statistics */}
      <div className="admin-section">
        <div className="admin-stats-grid">
          <div className="admin-stat-card">
            <div className="admin-stat-icon">👨‍💼</div>
            <div className="admin-stat-content">
              <div className="admin-stat-value">
                {users.filter((u) => u.role === "admin").length}
              </div>
              <div className="admin-stat-label">Administrators</div>
            </div>
          </div>
          <div className="admin-stat-card">
            <div className="admin-stat-icon">👨‍🏫</div>
            <div className="admin-stat-content">
              <div className="admin-stat-value">
                {users.filter((u) => u.role === "teacher").length}
              </div>
              <div className="admin-stat-label">Teachers</div>
            </div>
          </div>
          <div className="admin-stat-card">
            <div className="admin-stat-icon">🎓</div>
            <div className="admin-stat-content">
              <div className="admin-stat-value">
                {users.filter((u) => u.role === "student").length}
              </div>
              <div className="admin-stat-label">Students</div>
            </div>
          </div>
          <div className="admin-stat-card">
            <div className="admin-stat-icon">👨‍👩‍👧</div>
            <div className="admin-stat-content">
              <div className="admin-stat-value">
                {users.filter((u) => u.role === "guardian").length}
              </div>
              <div className="admin-stat-label">Guardians</div>
            </div>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="admin-section">
        <div className="admin-card">
          <div className="admin-card-header">
            <h3 className="admin-card-title">All Users</h3>
            <p className="admin-card-subtitle">
              Complete list of all user accounts in your school
            </p>
          </div>
          <div className="admin-table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={4} className="admin-table-loading">
                      <div className="admin-loading">
                        <div className="admin-loading-spinner"></div>
                        <div className="admin-loading-text">
                          Loading users...
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="admin-table-empty">
                      <div className="admin-empty-state">
                        <div className="admin-empty-icon">👥</div>
                        <div className="admin-empty-title">No Users Found</div>
                        <div className="admin-empty-subtitle">
                          Users will appear here once they register
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  users.map((user) => (
                    <tr key={user.id}>
                      <td>
                        <div className="admin-user-info">
                          <div className="admin-user-avatar">
                            {user.name
                              ? user.name
                                  .split(" ")
                                  .map((n: string) => n[0])
                                  .join("")
                                  .slice(0, 2)
                                  .toUpperCase()
                              : "??"}
                          </div>
                          <div className="admin-user-details">
                            <div className="admin-user-name">
                              {user.name || "No Name"}
                            </div>
                            <div className="admin-user-email">{user.email}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className={`admin-role-badge role-${user.role}`}>
                          {user.role}
                        </span>
                      </td>
                      <td>
                        <span
                          className={`admin-status-badge ${
                            user.registered ? "status-active" : "status-pending"
                          }`}
                        >
                          {user.registered ? "Active" : "Pending"}
                        </span>
                      </td>
                      <td>
                        <div className="admin-action-buttons">
                          <button
                            className="admin-action-btn admin-danger"
                            onClick={() => handleRemove(user.id)}
                          >
                            Remove
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserManagement;
