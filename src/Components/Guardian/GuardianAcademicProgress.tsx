import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../AuthContext";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  orderBy,
  limit,
} from "firebase/firestore";
import { db } from "../../firebase";

interface AcademicRecord {
  id: string;
  studentId: string;
  studentName: string;
  subject: string;
  mark: number;
  total: number;
  percentage: number;
  grade: string;
  term: string;
  date: Date;
  type: "assignment" | "test" | "exam" | "project";
}

interface StudentProgress {
  studentId: string;
  studentName: string;
  grade: string;
  overallAverage: number;
  subjectAverages: { [subject: string]: number };
  recentMarks: AcademicRecord[];
  attendance: number;
  demerits: number;
}

const GuardianAcademicProgress: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [studentsProgress, setStudentsProgress] = useState<StudentProgress[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState<string>("all");
  const [selectedTerm, setSelectedTerm] = useState<string>("current");

  useEffect(() => {
    fetchAcademicProgress();
  }, [user, selectedTerm]);

  const fetchAcademicProgress = async () => {
    if (!user?.uid) return;

    try {
      setLoading(true);

      // Get linked children
      const childrenData = await getLinkedChildren();

      // Get academic records for each child
      const progressData: StudentProgress[] = [];

      for (const child of childrenData) {
        const records = await getStudentAcademicRecords(child.id);
        const progress = calculateStudentProgress(child, records);
        progressData.push(progress);
      }

      setStudentsProgress(progressData);
    } catch (error) {
      console.error("Error fetching academic progress:", error);
    } finally {
      setLoading(false);
    }
  };

  const getLinkedChildren = async () => {
    if (!user?.uid) return [];

    try {
      // Get guardian's linked students
      const guardianDocRef = doc(db, "users", user.uid);
      const guardianDoc = await getDoc(guardianDocRef);

      let studentIds: string[] = [];

      if (guardianDoc.exists()) {
        const guardianData = guardianDoc.data();
        if (guardianData.students && Array.isArray(guardianData.students)) {
          studentIds = guardianData.students;
        }
      }

      // Get student documents
      const students = [];
      for (const studentId of studentIds) {
        const studentDoc = await getDoc(doc(db, "users", studentId));
        if (studentDoc.exists()) {
          students.push({
            id: studentDoc.id,
            ...studentDoc.data(),
          });
        }
      }

      return students;
    } catch (error) {
      console.error("Error getting linked children:", error);
      return [];
    }
  };

  const getStudentAcademicRecords = async (
    studentId: string
  ): Promise<AcademicRecord[]> => {
    try {
      const recordsQuery = query(
        collection(db, "academicRecords"),
        where("studentId", "==", studentId),
        orderBy("date", "desc"),
        limit(50)
      );

      const recordsSnapshot = await getDocs(recordsQuery);
      return recordsSnapshot.docs.map(
        (doc) =>
          ({
            id: doc.id,
            ...doc.data(),
            date: doc.data().date?.toDate() || new Date(),
          } as AcademicRecord)
      );
    } catch (error) {
      console.error("Error fetching academic records:", error);
      return [];
    }
  };

  const calculateStudentProgress = (
    student: any,
    records: AcademicRecord[]
  ): StudentProgress => {
    const subjectAverages: { [subject: string]: number } = {};
    const subjectCounts: { [subject: string]: number } = {};

    // Calculate subject averages
    records.forEach((record) => {
      if (!subjectAverages[record.subject]) {
        subjectAverages[record.subject] = 0;
        subjectCounts[record.subject] = 0;
      }
      subjectAverages[record.subject] += record.percentage;
      subjectCounts[record.subject]++;
    });

    // Finalize averages
    Object.keys(subjectAverages).forEach((subject) => {
      subjectAverages[subject] =
        subjectAverages[subject] / subjectCounts[subject];
    });

    // Calculate overall average
    const overallAverage =
      Object.values(subjectAverages).length > 0
        ? Object.values(subjectAverages).reduce((sum, avg) => sum + avg, 0) /
          Object.values(subjectAverages).length
        : 0;

    return {
      studentId: student.id,
      studentName: student.name || `${student.firstName} ${student.lastName}`,
      grade: student.grade || "Unknown",
      overallAverage: Math.round(overallAverage * 10) / 10,
      subjectAverages,
      recentMarks: records.slice(0, 10),
      attendance: student.attendance || 95,
      demerits: student.demerits || 0,
    };
  };

  const getGradeColor = (percentage: number) => {
    if (percentage >= 80) return "#4CAF50";
    if (percentage >= 70) return "#FF9800";
    if (percentage >= 60) return "#FFC107";
    return "#F44336";
  };

  const filteredProgress =
    selectedStudent === "all"
      ? studentsProgress
      : studentsProgress.filter((p) => p.studentId === selectedStudent);

  if (loading) {
    return (
      <div className="guardian-tab-content">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>{t("Loading academic progress...")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="guardian-tab-content">
      <div className="tab-header">
        <h2>{t("Academic Progress")}</h2>
        <p className="tab-description">
          {t("Monitor your children's academic performance and progress")}
        </p>
      </div>

      <div className="progress-filters">
        <div className="filter-group">
          <label>{t("Student")}:</label>
          <select
            value={selectedStudent}
            onChange={(e) => setSelectedStudent(e.target.value)}
            className="filter-select"
          >
            <option value="all">{t("All Children")}</option>
            {studentsProgress.map((student) => (
              <option key={student.studentId} value={student.studentId}>
                {student.studentName}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label>{t("Term")}:</label>
          <select
            value={selectedTerm}
            onChange={(e) => setSelectedTerm(e.target.value)}
            className="filter-select"
          >
            <option value="current">{t("Current Term")}</option>
            <option value="term1">{t("Term 1")}</option>
            <option value="term2">{t("Term 2")}</option>
            <option value="term3">{t("Term 3")}</option>
            <option value="term4">{t("Term 4")}</option>
          </select>
        </div>
      </div>

      {filteredProgress.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📊</div>
          <h3>{t("No Academic Records")}</h3>
          <p>{t("Academic records will appear here once marks are entered")}</p>
        </div>
      ) : (
        <div className="progress-container">
          {filteredProgress.map((student) => (
            <div key={student.studentId} className="student-progress-card">
              <div className="student-header">
                <div className="student-info">
                  <h3>{student.studentName}</h3>
                  <span className="grade-badge">
                    {t("Grade")} {student.grade}
                  </span>
                </div>
                <div className="overall-stats">
                  <div className="stat-item">
                    <span className="stat-label">{t("Overall Average")}</span>
                    <span
                      className="stat-value"
                      style={{ color: getGradeColor(student.overallAverage) }}
                    >
                      {student.overallAverage.toFixed(1)}%
                    </span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">{t("Attendance")}</span>
                    <span className="stat-value">{student.attendance}%</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">{t("Demerits")}</span>
                    <span className="stat-value">{student.demerits}</span>
                  </div>
                </div>
              </div>

              <div className="subject-averages">
                <h4>{t("Subject Averages")}</h4>
                <div className="subject-grid">
                  {Object.entries(student.subjectAverages).map(
                    ([subject, average]) => (
                      <div key={subject} className="subject-average-card">
                        <span className="subject-name">{subject}</span>
                        <span
                          className="subject-average"
                          style={{ color: getGradeColor(average) }}
                        >
                          {average.toFixed(1)}%
                        </span>
                      </div>
                    )
                  )}
                </div>
              </div>

              <div className="recent-marks">
                <h4>{t("Recent Marks")}</h4>
                <div className="marks-table">
                  <div className="table-header">
                    <span>{t("Subject")}</span>
                    <span>{t("Type")}</span>
                    <span>{t("Mark")}</span>
                    <span>{t("Percentage")}</span>
                    <span>{t("Date")}</span>
                  </div>
                  {student.recentMarks.slice(0, 5).map((mark) => (
                    <div key={mark.id} className="table-row">
                      <span>{mark.subject}</span>
                      <span className="mark-type">{t(mark.type)}</span>
                      <span>
                        {mark.mark}/{mark.total}
                      </span>
                      <span
                        className="percentage"
                        style={{ color: getGradeColor(mark.percentage) }}
                      >
                        {mark.percentage.toFixed(1)}%
                      </span>
                      <span>{mark.date.toLocaleDateString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default GuardianAcademicProgress;
