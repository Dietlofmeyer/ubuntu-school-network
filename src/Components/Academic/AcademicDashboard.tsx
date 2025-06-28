import React, { useState, useEffect } from "react";
import { useAuth } from "../../AuthContext";
import TeacherSubjectSelection from "../Teacher/TeacherSubjectSelection";
import StudentSubjectSelection from "../Student/StudentSubjectSelection";
import GuardianSubjectApproval from "./GuardianSubjectApproval";
import AdminAcademicOverview from "./AdminAcademicOverview";
import "./AcademicDashboard.css";

const AcademicDashboard: React.FC = () => {
  const { profile, user } = useAuth();
  const [showSubjectSelection, setShowSubjectSelection] = useState(false);

  // Check if user needs to complete academic setup
  useEffect(() => {
    if (!profile || !user) return;

    const needsSetup =
      (profile.role === "teacher" &&
        (!profile.teachingSubjects || profile.teachingSubjects.length === 0)) ||
      (profile.role === "student" &&
        (!profile.selectedSubjects || profile.selectedSubjects.length === 0));

    if (needsSetup) {
      setShowSubjectSelection(true);
    }
  }, [profile, user]);

  if (!profile || !user) {
    return (
      <div className="academic-dashboard-loading">
        <div className="loading-spinner"></div>
        <p>Loading academic dashboard...</p>
      </div>
    );
  }

  const renderContent = () => {
    switch (profile.role) {
      case "teacher":
        if (
          showSubjectSelection ||
          !profile.teachingSubjects ||
          profile.teachingSubjects.length === 0
        ) {
          return (
            <TeacherSubjectSelection
              onComplete={() => setShowSubjectSelection(false)}
            />
          );
        }
        return (
          <div className="academic-dashboard-container">
            <div className="academic-header">
              <h2>Academic Management</h2>
              <p>Manage your teaching subjects and students</p>
            </div>
            <div className="academic-content">
              <div className="academic-card">
                <h3>Your Teaching Subjects</h3>
                <div className="subject-list">
                  {profile.teachingSubjects?.map((subject) => (
                    <span key={subject} className="subject-tag">
                      {subject}
                    </span>
                  ))}
                </div>
                <button
                  onClick={() => setShowSubjectSelection(true)}
                  className="edit-subjects-btn"
                >
                  Edit Subjects
                </button>
              </div>
            </div>
          </div>
        );

      case "student":
        if (
          showSubjectSelection ||
          !profile.selectedSubjects ||
          profile.selectedSubjects.length === 0
        ) {
          return (
            <StudentSubjectSelection
              onComplete={() => setShowSubjectSelection(false)}
            />
          );
        }
        return (
          <div className="academic-dashboard-container">
            <div className="academic-header">
              <h2>My Subjects</h2>
              <p>Your selected subjects and assigned teachers</p>
            </div>
            <div className="academic-content">
              <div className="academic-card">
                <h3>Selected Subjects</h3>
                <div className="subject-list">
                  {profile.selectedSubjects?.map((subject) => (
                    <div key={subject} className="student-subject-item">
                      <span className="subject-name">{subject}</span>
                      {profile.currentTeachers?.[subject] && (
                        <span className="teacher-assigned">
                          ✓ Teacher Assigned
                        </span>
                      )}
                    </div>
                  ))}
                </div>
                {profile.approvedSubjects?.length === 0 && (
                  <div className="pending-approval">
                    <span className="pending-icon">⏳</span>
                    Waiting for guardian approval
                  </div>
                )}
              </div>
            </div>
          </div>
        );

      case "guardian":
        return <GuardianSubjectApproval />;

      case "admin":
      case "principal":
        return <AdminAcademicOverview />;

      default:
        return (
          <div className="academic-dashboard-container">
            <div className="academic-header">
              <h2>Academic Management</h2>
              <p>Academic features not available for your role</p>
            </div>
          </div>
        );
    }
  };

  return renderContent();
};

export default AcademicDashboard;
