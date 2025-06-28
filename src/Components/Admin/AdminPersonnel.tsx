import React, { useEffect, useState } from "react";
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  deleteDoc,
  doc,
} from "firebase/firestore";
import { db } from "../../firebase";
import { useAuth } from "../../AuthContext";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import "./AdminDashboard.css";
import "./AdminPersonnel.css";
import { getFunctions, httpsCallable } from "firebase/functions";
import Modal from "../Modal/Modal";
import ManageUserModal from "./ManageUserModal";

type Personnel = {
  id: string;
  name?: string;
  email: string;
  role: string;
  registered?: boolean;
  phone?: string;
  address?: string;
  address2?: string;
  address3?: string;
};

const ROLE_OPTIONS = [
  { value: "admin", label: "Admin" },
  { value: "staff", label: "Staff" },
  { value: "teacher", label: "Teacher" },
  { value: "guardian", label: "Guardian" }, // <-- Add this line
];

const functions = getFunctions();

const AdminPersonnel: React.FC = () => {
  const { profile } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [personnel, setPersonnel] = useState<Personnel[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [addName, setAddName] = useState("");
  const [addEmail, setAddEmail] = useState("");
  const [addRole, setAddRole] = useState("admin");
  const [addLoading, setAddLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState<Personnel | null>(null);
  const [showManageModal, setShowManageModal] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // When fetching personnel, filter out users without a name (invite docs should be deleted now)
  useEffect(() => {
    const fetchPersonnel = async () => {
      if (!profile?.schoolId) return;
      setLoading(true);
      const q = query(
        collection(db, "users"),
        where("schoolId", "==", profile.schoolId)
      );
      const snapshot = await getDocs(q);
      const personnelList: Personnel[] = snapshot.docs
        .map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            name: data.name || "",
            email: data.email || "",
            role: data.role || "",
            registered: data.registered ?? false,
            phone: data.phone || "",
            address: data.address || "",
            address2: data.address2 || "",
            address3: data.address3 || "",
          };
        })
        .filter((person) => person.name && person.email && person.role); // Only show complete users
      setPersonnel(personnelList);
      setLoading(false);
    };
    fetchPersonnel();
  }, [profile?.schoolId, refreshKey]);

  const handleRemove = async (id: string) => {
    if (!window.confirm("Are you sure you want to remove this person?")) return;
    try {
      // Call your secure Cloud Function for full deletion
      const deleteUserAndData = httpsCallable(functions, "deleteUserAndData");
      await deleteUserAndData({ uid: id });
      setPersonnel((prev) => prev.filter((p) => p.id !== id));
    } catch (err: any) {
      alert("Failed to remove user: " + (err.message || err));
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addEmail || !addRole) return;
    setAddLoading(true);
    const docRef = await addDoc(collection(db, "users"), {
      name: addName,
      email: addEmail,
      role: addRole,
      schoolId: profile?.schoolId,
      registered: false, // New users are not registered yet
    });
    setPersonnel((prev) => [
      ...prev,
      {
        id: docRef.id,
        name: addName,
        email: addEmail,
        role: addRole,
        registered: false,
      },
    ]);
    setAddName("");
    setAddEmail("");
    setAddRole("admin");
    setShowAdd(false);
    setAddLoading(false);
  };

  const handleAddTeacher = async () => {
    setAddLoading(true);
    try {
      await addDoc(collection(db, "users"), {
        name: addName,
        email: addEmail.trim().toLowerCase(),
        role: "teacher",
        schoolId: profile?.schoolId,
        registered: false,
        subjects: [],
        achievements: [],
        awards: [],
      });
      setAddName("");
      setAddEmail("");
      setAddLoading(false);
      setShowAdd(false);
      // Optionally refresh personnel list
    } catch (err) {
      setAddLoading(false);
      alert("Failed to add teacher: " + err);
    }
  };

  const handleManage = (user: Personnel) => {
    setSelectedUser(user);
    setShowManageModal(true);
  };

  const handleSaveUser = (updated: Personnel) => {
    setPersonnel((prev) =>
      prev.map((p) => (p.id === updated.id ? { ...p, ...updated } : p))
    );
    setRefreshKey((k) => k + 1); // This will trigger a re-fetch
  };

  if (loading) {
    return (
      <div className="admin-dashboard-container">
        <div className="admin-loading">
          <div className="admin-loading-spinner"></div>
          <div className="admin-loading-text">Loading personnel...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-dashboard-container">
      {/* Header Section */}
      <div className="admin-header">
        <div className="admin-header-content">
          <button
            className="admin-back-btn"
            onClick={() => navigate("/admin-dashboard")}
          >
            ← Back to Dashboard
          </button>
          <div className="admin-header-main">
            <div className="admin-header-icon">👥</div>
            <div className="admin-header-text">
              <h1 className="admin-header-title">Personnel Management</h1>
              <p className="admin-header-subtitle">
                Manage school staff, teachers, and administrators
              </p>
            </div>
          </div>
          <button
            className="admin-action-btn admin-primary"
            onClick={() => setShowAdd(!showAdd)}
          >
            {showAdd ? "Cancel" : "+ Add Personnel"}
          </button>
        </div>
      </div>

      {/* Add Personnel Form */}
      {showAdd && (
        <div className="admin-section">
          <div className="admin-card">
            <div className="admin-card-header">
              <h3 className="admin-card-title">Add New Personnel</h3>
              <p className="admin-card-subtitle">
                Add a new staff member to your school
              </p>
            </div>
            <form className="admin-form" onSubmit={handleAdd}>
              <div className="admin-form-row">
                <div className="admin-form-group">
                  <label className="admin-form-label">Full Name</label>
                  <input
                    type="text"
                    placeholder="Enter full name"
                    value={addName}
                    onChange={(e) => setAddName(e.target.value)}
                    className="admin-form-input"
                  />
                </div>
                <div className="admin-form-group">
                  <label className="admin-form-label">Email Address</label>
                  <input
                    type="email"
                    placeholder="Enter email address"
                    value={addEmail}
                    onChange={(e) => setAddEmail(e.target.value)}
                    required
                    className="admin-form-input"
                  />
                </div>
              </div>
              <div className="admin-form-row">
                <div className="admin-form-group">
                  <label className="admin-form-label">Role</label>
                  <select
                    value={addRole}
                    onChange={(e) => setAddRole(e.target.value)}
                    className="admin-form-select"
                  >
                    {ROLE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="admin-form-group">
                  <label className="admin-form-label">Action</label>
                  <button
                    type="submit"
                    className="admin-action-btn admin-primary"
                    disabled={addLoading}
                  >
                    {addLoading ? "Adding..." : "Add Personnel"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Personnel Overview */}
      <div className="admin-section">
        <div className="admin-stats-grid">
          <div className="admin-stat-card">
            <div className="admin-stat-icon">👨‍💼</div>
            <div className="admin-stat-content">
              <div className="admin-stat-value">
                {personnel.filter((p) => p.role === "admin").length}
              </div>
              <div className="admin-stat-label">Administrators</div>
            </div>
          </div>
          <div className="admin-stat-card">
            <div className="admin-stat-icon">👨‍🏫</div>
            <div className="admin-stat-content">
              <div className="admin-stat-value">
                {personnel.filter((p) => p.role === "teacher").length}
              </div>
              <div className="admin-stat-label">Teachers</div>
            </div>
          </div>
          <div className="admin-stat-card">
            <div className="admin-stat-icon">👷‍♂️</div>
            <div className="admin-stat-content">
              <div className="admin-stat-value">
                {personnel.filter((p) => p.role === "staff").length}
              </div>
              <div className="admin-stat-label">Staff Members</div>
            </div>
          </div>
          <div className="admin-stat-card">
            <div className="admin-stat-icon">👥</div>
            <div className="admin-stat-content">
              <div className="admin-stat-value">{personnel.length}</div>
              <div className="admin-stat-label">Total Personnel</div>
            </div>
          </div>
        </div>
      </div>

      {/* Personnel Table */}
      <div className="admin-section">
        <div className="admin-card">
          <div className="admin-card-header">
            <h3 className="admin-card-title">Personnel Directory</h3>
            <p className="admin-card-subtitle">
              All registered staff members and their details
            </p>
          </div>
          <div className="admin-table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Personnel</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {personnel.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="admin-table-empty">
                      <div className="admin-empty-state">
                        <div className="admin-empty-icon">👥</div>
                        <div className="admin-empty-title">
                          No Personnel Found
                        </div>
                        <div className="admin-empty-subtitle">
                          Add your first staff member to get started
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  personnel.map((person) => (
                    <tr key={person.id}>
                      <td>
                        <div className="admin-user-info">
                          <div className="admin-user-avatar">
                            {person.name
                              ? person.name
                                  .split(" ")
                                  .map((n: string) => n[0])
                                  .join("")
                                  .slice(0, 2)
                                  .toUpperCase()
                              : "??"}
                          </div>
                          <div className="admin-user-details">
                            <div className="admin-user-name">
                              {person.name || "No Name"}
                            </div>
                            <div className="admin-user-email">
                              {person.email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span
                          className={`admin-role-badge role-${person.role}`}
                        >
                          {person.role.charAt(0).toUpperCase() +
                            person.role.slice(1)}
                        </span>
                      </td>
                      <td>
                        <span
                          className={`admin-status-badge ${
                            person.registered
                              ? "status-active"
                              : "status-pending"
                          }`}
                        >
                          {person.registered ? "Active" : "Pending"}
                        </span>
                      </td>
                      <td>
                        <div className="admin-action-buttons">
                          <button
                            className="admin-action-btn admin-secondary"
                            onClick={() => handleManage(person)}
                          >
                            Manage
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

      {/* Manage User Modal */}
      {showManageModal && selectedUser && (
        <Modal open={showManageModal} onClose={() => setShowManageModal(false)}>
          <ManageUserModal
            user={selectedUser}
            onClose={() => setShowManageModal(false)}
            onRemove={handleRemove}
            onSave={handleSaveUser}
          />
        </Modal>
      )}
    </div>
  );
};

export default AdminPersonnel;
