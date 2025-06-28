import React, { useState, useEffect } from "react";
import { useAuth } from "../../AuthContext";
import {
  getStudentsWithoutSubjects,
  getTeachersWithoutSubjects,
} from "../../utils/academic";

const AdminAcademicOverview: React.FC = () => {
  const { profile } = useAuth();
  const [studentsWithoutSubjects, setStudentsWithoutSubjects] = useState<any[]>(
    []
  );
  const [teachersWithoutSubjects, setTeachersWithoutSubjects] = useState<any[]>(
    []
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!profile?.schoolId) return;

      try {
        const [students, teachers] = await Promise.all([
          getStudentsWithoutSubjects(profile.schoolId),
          getTeachersWithoutSubjects(profile.schoolId),
        ]);

        setStudentsWithoutSubjects(students);
        setTeachersWithoutSubjects(teachers);
      } catch (error) {
        console.error("Error fetching academic data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [profile]);

  if (loading) {
    return (
      <div className="academic-dashboard-container">
        <div className="academic-dashboard-loading">
          <div className="loading-spinner"></div>
          <p>Loading academic overview...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="academic-dashboard-container">
      <div className="academic-header">
        <h2>Academic Management Overview</h2>
        <p>Monitor subject selections and assignments</p>
      </div>

      <div className="academic-content">
        <div className="academic-card">
          <h3>Pending Setup</h3>

          {teachersWithoutSubjects.length > 0 && (
            <div className="pending-section">
              <h4>
                Teachers Without Subjects ({teachersWithoutSubjects.length})
              </h4>
              <div className="user-list">
                {teachersWithoutSubjects.map((teacher) => (
                  <div key={teacher.id} className="user-item">
                    <span className="user-name">{teacher.name}</span>
                    <span className="user-email">{teacher.email}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {studentsWithoutSubjects.length > 0 && (
            <div className="pending-section">
              <h4>
                Students Without Subjects ({studentsWithoutSubjects.length})
              </h4>
              <div className="user-list">
                {studentsWithoutSubjects.map((student) => (
                  <div key={student.id} className="user-item">
                    <span className="user-name">{student.name}</span>
                    <span className="user-grade">
                      {student.grade || "No grade"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {teachersWithoutSubjects.length === 0 &&
            studentsWithoutSubjects.length === 0 && (
              <div className="empty-state">
                <span className="empty-icon">✅</span>
                <h4>All Setup Complete</h4>
                <p>
                  All teachers and students have completed their subject setup
                </p>
              </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default AdminAcademicOverview;
