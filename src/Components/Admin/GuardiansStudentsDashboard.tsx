import React, { useState, useEffect } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../../firebase";
import { useTranslation } from "react-i18next";
import ManageUserModal from "./ManageUserModal";
import AddStudentModal from "./AddStudentModal";
import AddGuardianModal from "./AddGuardianModal";
import { useAuth } from "../../AuthContext";
import { useNavigate } from "react-router-dom";
import "./AdminDashboard.css";
import "./AdminPersonnel.css";

const GuardiansStudentsDashboard: React.FC = () => {
  const { t } = useTranslation();
  const [guardians, setGuardians] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [searchGuardian, setSearchGuardian] = useState("");
  const [searchStudent, setSearchStudent] = useState("");
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [showManageModal, setShowManageModal] = useState(false);
  const [showAddStudent, setShowAddStudent] = useState(false);
  const [showAddGuardian, setShowAddGuardian] = useState(false);
  const [addStudentGuardianId, setAddStudentGuardianId] = useState<string>("");
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  const fetchGuardians = async () => {
    const q = query(collection(db, "users"), where("role", "==", "guardian"));
    const snap = await getDocs(q);
    setGuardians(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
  };
  const fetchStudents = async () => {
    const q = query(collection(db, "users"), where("role", "==", "student"));
    const snap = await getDocs(q);
    setStudents(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
  };

  useEffect(() => {
    fetchGuardians();
    fetchStudents();
    // eslint-disable-next-line
  }, []);

  const filteredGuardians = guardians.filter(
    (g) =>
      g.name?.toLowerCase().includes(searchGuardian.toLowerCase()) ||
      g.email?.toLowerCase().includes(searchGuardian.toLowerCase())
  );
  const filteredStudents = students.filter(
    (s) =>
      s.name?.toLowerCase().includes(searchStudent.toLowerCase()) ||
      s.email?.toLowerCase().includes(searchStudent.toLowerCase())
  );

  // Helper: get students for a guardian
  const getStudentsForGuardian = (guardianId: string) =>
    students.filter(
      (s) => Array.isArray(s.guardians) && s.guardians.includes(guardianId)
    );

  const getGuardianNames = (student: any) =>
    guardians
      .filter(
        (g) =>
          Array.isArray(student.guardians) && student.guardians.includes(g.id)
      )
      .map((g) => `${g.name} (${g.email})`)
      .join(", ");

  return (
    <div className="admin-dashboard-container">
      {/* Header Section */}
      <div className="admin-header">
        <div className="admin-header-content">
          <button className="admin-back-btn" onClick={() => navigate(-1)}>
            ← Back to Dashboard
          </button>
          <div className="admin-header-main">
            <div className="admin-header-icon">👨‍👩‍👧‍👦</div>
            <div className="admin-header-text">
              <h1 className="admin-header-title">Guardians & Students</h1>
              <p className="admin-header-subtitle">
                Manage student and guardian accounts and relationships
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="admin-section">
        <div className="admin-stats-grid">
          <div className="admin-stat-card">
            <div className="admin-stat-icon">👨‍👩‍👧</div>
            <div className="admin-stat-content">
              <div className="admin-stat-value">{guardians.length}</div>
              <div className="admin-stat-label">Total Guardians</div>
            </div>
          </div>
          <div className="admin-stat-card">
            <div className="admin-stat-icon">🎓</div>
            <div className="admin-stat-content">
              <div className="admin-stat-value">{students.length}</div>
              <div className="admin-stat-label">Total Students</div>
            </div>
          </div>
          <div className="admin-stat-card">
            <div className="admin-stat-icon">✅</div>
            <div className="admin-stat-content">
              <div className="admin-stat-value">
                {students.filter((s) => s.registered).length}
              </div>
              <div className="admin-stat-label">Active Students</div>
            </div>
          </div>
          <div className="admin-stat-card">
            <div className="admin-stat-icon">⏳</div>
            <div className="admin-stat-content">
              <div className="admin-stat-value">
                {students.filter((s) => !s.registered).length}
              </div>
              <div className="admin-stat-label">Pending Students</div>
            </div>
          </div>
        </div>
      </div>

      {/* Guardians Section */}
      <div className="admin-section">
        <div className="admin-card">
          <div className="admin-card-header">
            <div className="admin-card-title-section">
              <h3 className="admin-card-title">👨‍👩‍👧 Guardians</h3>
              <p className="admin-card-subtitle">
                Parent and guardian accounts
              </p>
            </div>
            <button
              className="admin-action-btn admin-primary"
              onClick={() => setShowAddGuardian(true)}
            >
              + Add Guardian
            </button>
          </div>

          <div className="admin-search-container">
            <input
              type="text"
              placeholder="Search guardians by name or email..."
              value={searchGuardian}
              onChange={(e) => setSearchGuardian(e.target.value)}
              className="admin-search-input"
            />
          </div>

          <div className="admin-table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Guardian</th>
                  <th>Contact</th>
                  <th>Students</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredGuardians.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="admin-table-empty">
                      <div className="admin-empty-state">
                        <div className="admin-empty-icon">👨‍👩‍👧</div>
                        <div className="admin-empty-title">
                          No Guardians Found
                        </div>
                        <div className="admin-empty-subtitle">
                          {searchGuardian
                            ? "Try adjusting your search"
                            : "Add your first guardian to get started"}
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredGuardians.map((g) => (
                    <tr key={g.id}>
                      <td>
                        <div className="admin-user-info">
                          <div className="admin-user-avatar">
                            {g.name
                              ? g.name
                                  .split(" ")
                                  .map((n: string) => n[0])
                                  .join("")
                                  .slice(0, 2)
                                  .toUpperCase()
                              : "??"}
                          </div>
                          <div className="admin-user-details">
                            <div className="admin-user-name">
                              {g.name || "No Name"}
                            </div>
                            <div className="admin-user-email">{g.email}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="admin-contact-info">
                          <div className="admin-contact-phone">
                            {g.phone || "No phone"}
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="admin-students-list">
                          {getStudentsForGuardian(g.id).length === 0 ? (
                            <span className="admin-no-students">
                              No students
                            </span>
                          ) : (
                            getStudentsForGuardian(g.id).map((s) => (
                              <div key={s.id} className="admin-student-item">
                                <span className="admin-student-name">
                                  {s.name}
                                </span>
                                <span className="admin-student-grade">
                                  Grade {s.grade}
                                </span>
                              </div>
                            ))
                          )}
                        </div>
                      </td>
                      <td>
                        <div className="admin-action-buttons">
                          <button
                            className="admin-action-btn admin-secondary"
                            onClick={() => {
                              setSelectedUser(g);
                              setShowManageModal(true);
                            }}
                          >
                            Manage
                          </button>
                          <button
                            className="admin-action-btn admin-primary"
                            onClick={() => {
                              setAddStudentGuardianId(g.id);
                              setShowAddStudent(true);
                            }}
                          >
                            + Student
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

      {/* Students Section */}
      <div className="admin-section">
        <div className="admin-card">
          <div className="admin-card-header">
            <div className="admin-card-title-section">
              <h3 className="admin-card-title">🎓 Students</h3>
              <p className="admin-card-subtitle">
                Student accounts and enrollment status
              </p>
            </div>
          </div>

          <div className="admin-search-container">
            <input
              type="text"
              placeholder="Search students by name or email..."
              value={searchStudent}
              onChange={(e) => setSearchStudent(e.target.value)}
              className="admin-search-input"
            />
          </div>

          <div className="admin-table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Grade</th>
                  <th>Status</th>
                  <th>Guardians</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="admin-table-empty">
                      <div className="admin-empty-state">
                        <div className="admin-empty-icon">🎓</div>
                        <div className="admin-empty-title">
                          No Students Found
                        </div>
                        <div className="admin-empty-subtitle">
                          {searchStudent
                            ? "Try adjusting your search"
                            : "Students will appear here once guardians add them"}
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map((s) => (
                    <tr key={s.id}>
                      <td>
                        <div className="admin-user-info">
                          <div className="admin-user-avatar">
                            {s.name
                              ? s.name
                                  .split(" ")
                                  .map((n: string) => n[0])
                                  .join("")
                                  .slice(0, 2)
                                  .toUpperCase()
                              : "??"}
                          </div>
                          <div className="admin-user-details">
                            <div className="admin-user-name">
                              {s.name || "No Name"}
                            </div>
                            <div className="admin-user-email">{s.email}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="admin-grade-badge">
                          Grade {s.grade}
                        </span>
                      </td>
                      <td>
                        <span
                          className={`admin-status-badge ${
                            s.registered ? "status-active" : "status-pending"
                          }`}
                        >
                          {s.registered ? "Active" : "Pending"}
                        </span>
                      </td>
                      <td>
                        <div className="admin-guardians-list">
                          {getGuardianNames(s) || (
                            <span className="admin-no-guardians">
                              No guardians
                            </span>
                          )}
                        </div>
                      </td>
                      <td>
                        <div className="admin-action-buttons">
                          <button
                            className="admin-action-btn admin-secondary"
                            onClick={() => {
                              setSelectedUser(s);
                              setShowManageModal(true);
                            }}
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

      {/* Modals */}
      {showManageModal && selectedUser && (
        <ManageUserModal
          user={selectedUser}
          onClose={() => setShowManageModal(false)}
          onRemove={() => {
            setShowManageModal(false);
            fetchStudents();
            fetchGuardians();
          }}
          onSave={() => {
            setShowManageModal(false);
            fetchStudents();
            fetchGuardians();
          }}
        />
      )}
      {showAddStudent && (
        <AddStudentModal
          guardianId={addStudentGuardianId}
          schoolId={profile?.schoolId || ""}
          adminId={user?.uid || ""}
          onClose={() => {
            setShowAddStudent(false);
            setAddStudentGuardianId("");
          }}
          onStudentAdded={() => {
            // Only refresh the student list, don't close the modal
            // The modal will stay open to show the success state with the registration URL
            fetchStudents();
          }}
        />
      )}
      {showAddGuardian && (
        <AddGuardianModal
          schoolId={profile?.schoolId || ""}
          onClose={() => setShowAddGuardian(false)}
          onGuardianAdded={() => {
            setShowAddGuardian(false);
            fetchGuardians();
          }}
        />
      )}
    </div>
  );
};

export default GuardiansStudentsDashboard;
