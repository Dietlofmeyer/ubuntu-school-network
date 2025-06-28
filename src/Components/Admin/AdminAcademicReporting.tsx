import React, { useState, useEffect } from "react";
import { useAuth } from "../../AuthContext";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../../firebase";
import { GRADES } from "../../data/constants";
import {
  getAvailableSubjects,
  getTeachersWithoutSubjects,
  getStudentsWithoutSubjects,
} from "../../utils/academic";
import "./AdminAcademicReporting.css";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  grade?: string;
  subjects?: string[];
  selectedSubjects?: string[];
  approvedSubjects?: string[];
  teachingSubjects?: string[];
  maxStudentsPerSubject?: number;
  homeroomClass?: string;
  schoolId?: string;
}

interface SubjectStats {
  subject: string;
  totalStudents: number;
  teachersOffering: number;
  avgStudentsPerTeacher: number;
  popularity: number; // percentage of total students
}

interface GradeStats {
  grade: string;
  totalStudents: number;
  studentsWithSubjects: number;
  studentsWithoutSubjects: number;
  completionRate: number;
}

interface TeacherStats {
  id: string;
  name: string;
  email: string;
  subjects: string[];
  totalStudents: number;
  maxCapacity: number;
  utilizationRate: number;
  homeroomClass?: string;
}

interface AcademicReport {
  totalStudents: number;
  totalTeachers: number;
  totalSubjects: number;
  overallCompletionRate: number;
  subjectStats: SubjectStats[];
  gradeStats: GradeStats[];
  teacherStats: TeacherStats[];
  pendingSelections: number;
  pendingApprovals: number;
  teachersWithoutSubjects: User[];
  studentsWithoutSubjects: User[];
}

const AdminAcademicReporting: React.FC = () => {
  const { t } = useTranslation();
  const { profile } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<AcademicReport | null>(null);
  const [selectedView, setSelectedView] = useState<
    "overview" | "subjects" | "grades" | "teachers" | "pending"
  >("overview");
  const [selectedGrade, setSelectedGrade] = useState<string>("");
  const [selectedSubject, setSelectedSubject] = useState<string>("");
  const [error, setError] = useState<string>("");

  useEffect(() => {
    if (profile?.schoolId) {
      generateReport();
    }
  }, [profile?.schoolId]);

  const generateReport = async () => {
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
      const students: User[] = [];
      const teachers: User[] = [];

      usersSnapshot.forEach((doc) => {
        const userData = { id: doc.id, ...doc.data() } as User;
        if (userData.role === "student") {
          students.push(userData);
        } else if (userData.role === "teacher") {
          teachers.push(userData);
        }
      });

      // Fetch subject selections
      const selectionsQuery = query(
        collection(db, "subjectSelections"),
        where("schoolId", "==", profile.schoolId)
      );

      const selectionsSnapshot = await getDocs(selectionsQuery);
      const pendingSelections = selectionsSnapshot.docs.filter(
        (doc) => doc.data().status === "pending"
      ).length;

      // Get available subjects and problem data
      const availableSubjects = await getAvailableSubjects(profile.schoolId);
      const teachersWithoutSubjects = await getTeachersWithoutSubjects(
        profile.schoolId
      );
      const studentsWithoutSubjects = await getStudentsWithoutSubjects(
        profile.schoolId
      );

      // Generate comprehensive report
      const academicReport = await generateComprehensiveReport(
        students,
        teachers,
        availableSubjects,
        pendingSelections,
        teachersWithoutSubjects,
        studentsWithoutSubjects
      );

      setReport(academicReport);
    } catch (err) {
      console.error("Error generating report:", err);
      setError(t("failed_to_generate_report"));
    } finally {
      setLoading(false);
    }
  };

  const generateComprehensiveReport = async (
    students: User[],
    teachers: User[],
    availableSubjects: string[],
    pendingSelections: number,
    teachersWithoutSubjects: User[],
    studentsWithoutSubjects: User[]
  ): Promise<AcademicReport> => {
    // Calculate subject statistics
    const subjectStats: SubjectStats[] = availableSubjects
      .map((subject) => {
        const studentsWithSubject = students.filter(
          (s) =>
            s.selectedSubjects?.includes(subject) ||
            s.approvedSubjects?.includes(subject)
        ).length;

        const teachersOffering = teachers.filter((t) =>
          t.teachingSubjects?.includes(subject)
        ).length;

        return {
          subject,
          totalStudents: studentsWithSubject,
          teachersOffering,
          avgStudentsPerTeacher:
            teachersOffering > 0 ? studentsWithSubject / teachersOffering : 0,
          popularity:
            students.length > 0
              ? (studentsWithSubject / students.length) * 100
              : 0,
        };
      })
      .sort((a, b) => b.totalStudents - a.totalStudents);

    // Calculate grade statistics
    const gradeStats: GradeStats[] = GRADES.map((grade) => {
      const gradeStudents = students.filter((s) => s.grade === grade);
      const studentsWithSubjects = gradeStudents.filter(
        (s) =>
          (s.selectedSubjects && s.selectedSubjects.length > 0) ||
          (s.approvedSubjects && s.approvedSubjects.length > 0)
      ).length;

      return {
        grade,
        totalStudents: gradeStudents.length,
        studentsWithSubjects,
        studentsWithoutSubjects: gradeStudents.length - studentsWithSubjects,
        completionRate:
          gradeStudents.length > 0
            ? (studentsWithSubjects / gradeStudents.length) * 100
            : 0,
      };
    })
      .filter((g) => g.totalStudents > 0)
      .sort((a, b) => a.grade.localeCompare(b.grade));

    // Calculate teacher statistics
    const teacherStats: TeacherStats[] = teachers
      .map((teacher) => {
        const teachingSubjects = teacher.teachingSubjects || [];
        const maxCapacity =
          (teacher.maxStudentsPerSubject || 30) * teachingSubjects.length;

        // Count current students assigned to this teacher across all subjects
        let totalStudents = 0;
        teachingSubjects.forEach((subject) => {
          totalStudents += students.filter(
            (s) =>
              s.selectedSubjects?.includes(subject) ||
              s.approvedSubjects?.includes(subject)
          ).length;
        });

        return {
          id: teacher.id,
          name: teacher.name,
          email: teacher.email,
          subjects: teachingSubjects,
          totalStudents,
          maxCapacity,
          utilizationRate:
            maxCapacity > 0 ? (totalStudents / maxCapacity) * 100 : 0,
          homeroomClass: teacher.homeroomClass,
        };
      })
      .sort((a, b) => b.utilizationRate - a.utilizationRate);

    // Calculate overall metrics
    const studentsWithAnySubjects = students.filter(
      (s) =>
        (s.selectedSubjects && s.selectedSubjects.length > 0) ||
        (s.approvedSubjects && s.approvedSubjects.length > 0)
    ).length;

    const overallCompletionRate =
      students.length > 0
        ? (studentsWithAnySubjects / students.length) * 100
        : 0;

    return {
      totalStudents: students.length,
      totalTeachers: teachers.length,
      totalSubjects: availableSubjects.length,
      overallCompletionRate,
      subjectStats,
      gradeStats,
      teacherStats,
      pendingSelections,
      pendingApprovals: pendingSelections, // Simplified for now
      teachersWithoutSubjects,
      studentsWithoutSubjects,
    };
  };

  const exportToCSV = (data: any[], filename: string) => {
    if (!data.length) return;

    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(","),
      ...data.map((row) =>
        headers
          .map((header) =>
            typeof row[header] === "string" ? `"${row[header]}"` : row[header]
          )
          .join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${filename}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const filteredSubjectStats =
    selectedGrade && report
      ? report.subjectStats.filter((stat) => {
          // This would need more complex logic to filter by grade
          return true; // Simplified for now
        })
      : report?.subjectStats || [];

  const filteredTeacherStats =
    selectedSubject && report
      ? report.teacherStats.filter((stat) =>
          stat.subjects.includes(selectedSubject)
        )
      : report?.teacherStats || [];

  if (loading) {
    return (
      <div className="admin-academic-reporting-container">
        <div className="academic-reporting-loading">
          <div className="loading-spinner"></div>
          <p>{t("generating_academic_report")}</p>
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="admin-academic-reporting-container">
        <div className="academic-reporting-error">
          <h3>{t("failed_to_load_report")}</h3>
          <button onClick={generateReport} className="retry-btn">
            {t("retry")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-academic-reporting-container">
      {/* Header */}
      <div className="academic-reporting-header">
        <button className="admin-back-btn" onClick={() => navigate(-1)}>
          ← {t("back_to_dashboard")}
        </button>
        <div className="academic-reporting-header-main">
          <div className="academic-reporting-header-icon">📊</div>
          <div className="academic-reporting-header-text">
            <h1>{t("academic_reporting_analytics")}</h1>
            <p>{t("comprehensive_academic_insights")}</p>
          </div>
          <button
            onClick={generateReport}
            className="refresh-btn"
            disabled={loading}
          >
            🔄 {t("refresh_data")}
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="reporting-nav-tabs">
        {[
          { key: "overview", label: t("overview"), icon: "📋" },
          { key: "subjects", label: t("subjects"), icon: "📚" },
          { key: "grades", label: t("grades"), icon: "🎓" },
          { key: "teachers", label: t("teachers"), icon: "👨‍🏫" },
          { key: "pending", label: t("pending"), icon: "⏳" },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setSelectedView(tab.key as any)}
            className={`nav-tab ${selectedView === tab.key ? "active" : ""}`}
          >
            <span className="tab-icon">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Overview */}
      {selectedView === "overview" && (
        <div className="reporting-section">
          <div className="overview-stats-grid">
            <div className="overview-stat-card">
              <div className="stat-icon">👥</div>
              <div className="stat-content">
                <div className="stat-number">{report.totalStudents}</div>
                <div className="stat-label">{t("total_students")}</div>
                <div className="stat-sub">
                  {report.studentsWithoutSubjects.length}{" "}
                  {t("without_subjects")}
                </div>
              </div>
            </div>

            <div className="overview-stat-card">
              <div className="stat-icon">👨‍🏫</div>
              <div className="stat-content">
                <div className="stat-number">{report.totalTeachers}</div>
                <div className="stat-label">{t("total_teachers")}</div>
                <div className="stat-sub">
                  {report.teachersWithoutSubjects.length}{" "}
                  {t("without_subjects")}
                </div>
              </div>
            </div>

            <div className="overview-stat-card">
              <div className="stat-icon">📚</div>
              <div className="stat-content">
                <div className="stat-number">{report.totalSubjects}</div>
                <div className="stat-label">{t("available_subjects")}</div>
                <div className="stat-sub">
                  {
                    report.subjectStats.filter((s) => s.teachersOffering > 0)
                      .length
                  }{" "}
                  {t("actively_taught")}
                </div>
              </div>
            </div>

            <div className="overview-stat-card completion-rate">
              <div className="stat-icon">📈</div>
              <div className="stat-content">
                <div className="stat-number">
                  {report.overallCompletionRate.toFixed(1)}%
                </div>
                <div className="stat-label">
                  {t("subject_selection_completion")}
                </div>
                <div className="completion-bar">
                  <div
                    className="completion-fill"
                    style={{ width: `${report.overallCompletionRate}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Insights */}
          <div className="quick-insights">
            <h3>{t("quick_insights")}</h3>
            <div className="insights-grid">
              <div className="insight-card">
                <h4>{t("most_popular_subject")}</h4>
                <p>
                  {report.subjectStats[0]?.subject} (
                  {report.subjectStats[0]?.totalStudents} {t("students")})
                </p>
              </div>
              <div className="insight-card">
                <h4>{t("highest_completion_grade")}</h4>
                <p>
                  {
                    report.gradeStats.sort(
                      (a, b) => b.completionRate - a.completionRate
                    )[0]?.grade
                  }
                  (
                  {report.gradeStats
                    .sort((a, b) => b.completionRate - a.completionRate)[0]
                    ?.completionRate.toFixed(1)}
                  %)
                </p>
              </div>
              <div className="insight-card">
                <h4>{t("busiest_teacher")}</h4>
                <p>
                  {report.teacherStats[0]?.name} (
                  {report.teacherStats[0]?.totalStudents} {t("students")})
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Subject Analytics */}
      {selectedView === "subjects" && (
        <div className="reporting-section">
          <div className="section-header">
            <h2>{t("subject_analytics")}</h2>
            <button
              onClick={() =>
                exportToCSV(report.subjectStats, "subject-analytics")
              }
              className="export-btn"
            >
              📊 {t("export_csv")}
            </button>
          </div>

          <div className="subjects-analytics-grid">
            {filteredSubjectStats.map((subject, index) => (
              <div key={subject.subject} className="subject-analytics-card">
                <div className="subject-header">
                  <h3>{subject.subject}</h3>
                  <span className="subject-rank">#{index + 1}</span>
                </div>

                <div className="subject-metrics">
                  <div className="metric">
                    <span className="metric-label">
                      {t("students_enrolled")}
                    </span>
                    <span className="metric-value">
                      {subject.totalStudents}
                    </span>
                  </div>
                  <div className="metric">
                    <span className="metric-label">
                      {t("teachers_offering")}
                    </span>
                    <span className="metric-value">
                      {subject.teachersOffering}
                    </span>
                  </div>
                  <div className="metric">
                    <span className="metric-label">
                      {t("avg_students_per_teacher")}
                    </span>
                    <span className="metric-value">
                      {subject.avgStudentsPerTeacher.toFixed(1)}
                    </span>
                  </div>
                  <div className="metric">
                    <span className="metric-label">{t("popularity")}</span>
                    <span className="metric-value">
                      {subject.popularity.toFixed(1)}%
                    </span>
                  </div>
                </div>

                <div className="popularity-bar">
                  <div
                    className="popularity-fill"
                    style={{ width: `${subject.popularity}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Grade Analytics */}
      {selectedView === "grades" && (
        <div className="reporting-section">
          <div className="section-header">
            <h2>{t("grade_analytics")}</h2>
            <button
              onClick={() => exportToCSV(report.gradeStats, "grade-analytics")}
              className="export-btn"
            >
              📊 {t("export_csv")}
            </button>
          </div>

          <div className="grades-analytics-grid">
            {report.gradeStats.map((grade) => (
              <div key={grade.grade} className="grade-analytics-card">
                <div className="grade-header">
                  <h3>{grade.grade}</h3>
                  <span
                    className="completion-badge"
                    data-rate={grade.completionRate}
                  >
                    {grade.completionRate.toFixed(1)}%
                  </span>
                </div>

                <div className="grade-metrics">
                  <div className="metric-row">
                    <span>{t("total_students")}</span>
                    <span>{grade.totalStudents}</span>
                  </div>
                  <div className="metric-row">
                    <span>{t("with_subjects")}</span>
                    <span className="positive">
                      {grade.studentsWithSubjects}
                    </span>
                  </div>
                  <div className="metric-row">
                    <span>{t("without_subjects")}</span>
                    <span className="negative">
                      {grade.studentsWithoutSubjects}
                    </span>
                  </div>
                </div>

                <div className="completion-bar">
                  <div
                    className="completion-fill"
                    style={{ width: `${grade.completionRate}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Teacher Analytics */}
      {selectedView === "teachers" && (
        <div className="reporting-section">
          <div className="section-header">
            <h2>{t("teacher_analytics")}</h2>
            <div className="section-controls">
              <select
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                className="subject-filter"
              >
                <option value="">{t("all_subjects")}</option>
                {report.subjectStats.map((subject) => (
                  <option key={subject.subject} value={subject.subject}>
                    {subject.subject}
                  </option>
                ))}
              </select>
              <button
                onClick={() =>
                  exportToCSV(filteredTeacherStats, "teacher-analytics")
                }
                className="export-btn"
              >
                📊 {t("export_csv")}
              </button>
            </div>
          </div>

          <div className="teachers-analytics-table">
            <table>
              <thead>
                <tr>
                  <th>{t("teacher_name")}</th>
                  <th>{t("subjects_taught")}</th>
                  <th>{t("current_students")}</th>
                  <th>{t("max_capacity")}</th>
                  <th>{t("utilization_rate")}</th>
                  <th>{t("homeroom")}</th>
                </tr>
              </thead>
              <tbody>
                {filteredTeacherStats.map((teacher) => (
                  <tr key={teacher.id}>
                    <td>
                      <div className="teacher-info">
                        <strong>{teacher.name}</strong>
                        <small>{teacher.email}</small>
                      </div>
                    </td>
                    <td>
                      <div className="subjects-list">
                        {teacher.subjects.length > 0 ? (
                          teacher.subjects.map((subject) => (
                            <span key={subject} className="subject-tag">
                              {subject}
                            </span>
                          ))
                        ) : (
                          <span className="no-subjects">
                            {t("no_subjects")}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="number-cell">{teacher.totalStudents}</td>
                    <td className="number-cell">{teacher.maxCapacity}</td>
                    <td className="utilization-cell">
                      <div className="utilization-info">
                        <span className="utilization-text">
                          {teacher.utilizationRate.toFixed(1)}%
                        </span>
                        <div className="utilization-bar">
                          <div
                            className="utilization-fill"
                            style={{
                              width: `${Math.min(
                                teacher.utilizationRate,
                                100
                              )}%`,
                              backgroundColor:
                                teacher.utilizationRate > 90
                                  ? "#f44336"
                                  : teacher.utilizationRate > 70
                                  ? "#ff9800"
                                  : "#4caf50",
                            }}
                          ></div>
                        </div>
                      </div>
                    </td>
                    <td>
                      {teacher.homeroomClass ? (
                        <span className="homeroom-badge">
                          {teacher.homeroomClass}
                        </span>
                      ) : (
                        <span className="no-homeroom">{t("none")}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pending Items */}
      {selectedView === "pending" && (
        <div className="reporting-section">
          <h2>{t("pending_items")}</h2>

          <div className="pending-cards-grid">
            <div className="pending-card urgent">
              <div className="pending-header">
                <h3>{t("students_without_subjects")}</h3>
                <span className="pending-count">
                  {report.studentsWithoutSubjects.length}
                </span>
              </div>
              <div className="pending-list">
                {report.studentsWithoutSubjects.slice(0, 5).map((student) => (
                  <div key={student.id} className="pending-item">
                    <span className="item-name">{student.name}</span>
                    <span className="item-meta">{student.grade}</span>
                  </div>
                ))}
                {report.studentsWithoutSubjects.length > 5 && (
                  <div className="more-items">
                    +{report.studentsWithoutSubjects.length - 5} {t("more")}
                  </div>
                )}
              </div>
            </div>

            <div className="pending-card warning">
              <div className="pending-header">
                <h3>{t("teachers_without_subjects")}</h3>
                <span className="pending-count">
                  {report.teachersWithoutSubjects.length}
                </span>
              </div>
              <div className="pending-list">
                {report.teachersWithoutSubjects.slice(0, 5).map((teacher) => (
                  <div key={teacher.id} className="pending-item">
                    <span className="item-name">{teacher.name}</span>
                    <span className="item-meta">{teacher.email}</span>
                  </div>
                ))}
                {report.teachersWithoutSubjects.length > 5 && (
                  <div className="more-items">
                    +{report.teachersWithoutSubjects.length - 5} {t("more")}
                  </div>
                )}
              </div>
            </div>

            <div className="pending-card info">
              <div className="pending-header">
                <h3>{t("pending_selections")}</h3>
                <span className="pending-count">
                  {report.pendingSelections}
                </span>
              </div>
              <p className="pending-description">
                {t("subject_selections_awaiting_guardian_approval")}
              </p>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="academic-reporting-error">
          <span className="error-icon">⚠️</span>
          {error}
        </div>
      )}
    </div>
  );
};

export default AdminAcademicReporting;
