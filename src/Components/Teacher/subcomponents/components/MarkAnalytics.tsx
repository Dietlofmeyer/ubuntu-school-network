import React, { useState, useEffect } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../../../../firebase";

type Mark = {
  subject: string;
  score: number;
  total: number;
  description: string;
  date: string;
  teacher: string;
  category?: string;
};

type StudentProfile = {
  name: string;
  uid: string;
  email?: string;
  grade?: string;
  marks?: Mark[];
};

type MarkAnalytics = {
  averageScore: number;
  averagePercentage: number;
  totalMarks: number;
  subjectBreakdown: {
    [subject: string]: { avg: number; count: number; latest: number };
  };
  categoryBreakdown: { [category: string]: { avg: number; count: number } };
  trendData: { date: string; percentage: number }[];
  performanceBands: {
    excellent: number;
    good: number;
    average: number;
    poor: number;
  };
  recentActivity: Mark[];
};

interface MarkAnalyticsProps {
  teacherId: string;
  selectedSubject?: string;
  selectedStudent?: string;
  timeRange?: "week" | "month" | "term" | "year";
  t: (key: string, options?: any) => string;
}

const MarkAnalytics: React.FC<MarkAnalyticsProps> = ({
  teacherId,
  selectedSubject,
  selectedStudent,
  timeRange = "term",
  t,
}) => {
  const [analytics, setAnalytics] = useState<MarkAnalytics | null>(null);
  const [students, setStudents] = useState<StudentProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedView, setSelectedView] = useState<
    "overview" | "subjects" | "students" | "trends"
  >("overview");

  useEffect(() => {
    fetchAnalytics();
  }, [teacherId, selectedSubject, selectedStudent, timeRange]);

  const getDateRangeFilter = () => {
    const now = new Date();
    const ranges = {
      week: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
      month: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
      term: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000),
      year: new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000),
    };
    return ranges[timeRange];
  };

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      // Fetch all students with marks
      const studentsQuery = query(
        collection(db, "users"),
        where("role", "==", "student")
      );
      const studentsSnap = await getDocs(studentsQuery);

      const fetchedStudents: StudentProfile[] = [];
      const allMarks: Mark[] = [];
      const dateFilter = getDateRangeFilter();

      studentsSnap.forEach((doc) => {
        const data = doc.data();
        if (data.marks && Array.isArray(data.marks)) {
          const studentMarks = data.marks.filter((mark: Mark) => {
            const markDate = new Date(mark.date);
            const isInDateRange = markDate >= dateFilter;
            const isTeacherMark =
              mark.teacher === teacherId || !selectedStudent;
            const isSelectedSubject =
              !selectedSubject || mark.subject === selectedSubject;
            const isSelectedStudent =
              !selectedStudent || doc.id === selectedStudent;

            return (
              isInDateRange &&
              isTeacherMark &&
              isSelectedSubject &&
              isSelectedStudent
            );
          });

          if (studentMarks.length > 0) {
            fetchedStudents.push({
              name: data.name,
              uid: doc.id,
              email: data.email,
              grade: data.grade,
              marks: studentMarks,
            });
            allMarks.push(...studentMarks);
          }
        }
      });

      setStudents(fetchedStudents);

      // Calculate analytics
      if (allMarks.length > 0) {
        const analytics = calculateAnalytics(allMarks);
        setAnalytics(analytics);
      } else {
        setAnalytics(null);
      }
    } catch (error) {
      console.error("Error fetching analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  const calculateAnalytics = (marks: Mark[]): MarkAnalytics => {
    const totalMarks = marks.length;
    const totalScore = marks.reduce((sum, mark) => sum + mark.score, 0);
    const totalPossible = marks.reduce((sum, mark) => sum + mark.total, 0);

    const averageScore = totalScore / totalMarks;
    const averagePercentage = (totalScore / totalPossible) * 100;

    // Subject breakdown
    const subjectBreakdown: {
      [subject: string]: { avg: number; count: number; latest: number };
    } = {};
    marks.forEach((mark) => {
      if (!subjectBreakdown[mark.subject]) {
        subjectBreakdown[mark.subject] = { avg: 0, count: 0, latest: 0 };
      }
      const percentage = (mark.score / mark.total) * 100;
      subjectBreakdown[mark.subject].avg += percentage;
      subjectBreakdown[mark.subject].count += 1;
      subjectBreakdown[mark.subject].latest = Math.max(
        subjectBreakdown[mark.subject].latest,
        new Date(mark.date).getTime()
      );
    });

    Object.keys(subjectBreakdown).forEach((subject) => {
      subjectBreakdown[subject].avg /= subjectBreakdown[subject].count;
      // Find the most recent mark for this subject
      const recentMark = marks
        .filter((m) => m.subject === subject)
        .sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        )[0];
      subjectBreakdown[subject].latest = recentMark
        ? (recentMark.score / recentMark.total) * 100
        : 0;
    });

    // Category breakdown
    const categoryBreakdown: {
      [category: string]: { avg: number; count: number };
    } = {};
    marks.forEach((mark) => {
      const category = mark.category || "other";
      if (!categoryBreakdown[category]) {
        categoryBreakdown[category] = { avg: 0, count: 0 };
      }
      const percentage = (mark.score / mark.total) * 100;
      categoryBreakdown[category].avg += percentage;
      categoryBreakdown[category].count += 1;
    });

    Object.keys(categoryBreakdown).forEach((category) => {
      categoryBreakdown[category].avg /= categoryBreakdown[category].count;
    });

    // Trend data (last 10 marks chronologically)
    const sortedMarks = marks
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(-10);

    const trendData = sortedMarks.map((mark) => ({
      date: new Date(mark.date).toLocaleDateString(),
      percentage: (mark.score / mark.total) * 100,
    }));

    // Performance bands
    const performanceBands = {
      excellent: marks.filter((m) => (m.score / m.total) * 100 >= 80).length,
      good: marks.filter(
        (m) => (m.score / m.total) * 100 >= 60 && (m.score / m.total) * 100 < 80
      ).length,
      average: marks.filter(
        (m) => (m.score / m.total) * 100 >= 50 && (m.score / m.total) * 100 < 60
      ).length,
      poor: marks.filter((m) => (m.score / m.total) * 100 < 50).length,
    };

    // Recent activity (last 5 marks)
    const recentActivity = marks
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5);

    return {
      averageScore,
      averagePercentage,
      totalMarks,
      subjectBreakdown,
      categoryBreakdown,
      trendData,
      performanceBands,
      recentActivity,
    };
  };

  const getPerformanceColor = (percentage: number) => {
    if (percentage >= 80) return "var(--color-success)";
    if (percentage >= 60) return "var(--color-accent)";
    if (percentage >= 50) return "var(--color-warning)";
    return "var(--color-danger)";
  };

  const renderOverview = () => (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
        gap: "16px",
      }}
    >
      {/* Key Metrics */}
      <div
        style={{
          background: "var(--color-bg-card)",
          border: "1px solid var(--color-muted)",
          borderRadius: "8px",
          padding: "20px",
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontSize: "2rem",
            fontWeight: "bold",
            color: getPerformanceColor(analytics?.averagePercentage || 0),
          }}
        >
          {analytics?.averagePercentage.toFixed(1)}%
        </div>
        <div style={{ color: "var(--color-muted)", marginTop: "4px" }}>
          {t("average_performance")}
        </div>
      </div>

      <div
        style={{
          background: "var(--color-bg-card)",
          border: "1px solid var(--color-muted)",
          borderRadius: "8px",
          padding: "20px",
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontSize: "2rem",
            fontWeight: "bold",
            color: "var(--color-primary)",
          }}
        >
          {analytics?.totalMarks}
        </div>
        <div style={{ color: "var(--color-muted)", marginTop: "4px" }}>
          {t("total_marks_assigned")}
        </div>
      </div>

      <div
        style={{
          background: "var(--color-bg-card)",
          border: "1px solid var(--color-muted)",
          borderRadius: "8px",
          padding: "20px",
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontSize: "2rem",
            fontWeight: "bold",
            color: "var(--color-success)",
          }}
        >
          {analytics?.performanceBands.excellent}
        </div>
        <div style={{ color: "var(--color-muted)", marginTop: "4px" }}>
          {t("excellent_marks")} (80%+)
        </div>
      </div>

      <div
        style={{
          background: "var(--color-bg-card)",
          border: "1px solid var(--color-muted)",
          borderRadius: "8px",
          padding: "20px",
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontSize: "2rem",
            fontWeight: "bold",
            color: "var(--color-danger)",
          }}
        >
          {analytics?.performanceBands.poor}
        </div>
        <div style={{ color: "var(--color-muted)", marginTop: "4px" }}>
          {t("needs_attention")} (&lt;50%)
        </div>
      </div>
    </div>
  );

  const renderSubjectBreakdown = () => (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
        gap: "16px",
      }}
    >
      {Object.entries(analytics?.subjectBreakdown || {}).map(
        ([subject, data]) => (
          <div
            key={subject}
            style={{
              background: "var(--color-bg-card)",
              border: "1px solid var(--color-muted)",
              borderRadius: "8px",
              padding: "20px",
            }}
          >
            <h4 style={{ margin: "0 0 16px 0", color: "var(--color-text)" }}>
              {t(subject)}
            </h4>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: "8px",
              }}
            >
              <span>{t("average_score")}:</span>
              <span
                style={{
                  fontWeight: "bold",
                  color: getPerformanceColor(data.avg),
                }}
              >
                {data.avg.toFixed(1)}%
              </span>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: "8px",
              }}
            >
              <span>{t("total_marks")}:</span>
              <span style={{ fontWeight: "bold" }}>{data.count}</span>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: "16px",
              }}
            >
              <span>{t("latest_performance")}:</span>
              <span
                style={{
                  fontWeight: "bold",
                  color: getPerformanceColor(data.latest),
                }}
              >
                {data.latest.toFixed(1)}%
              </span>
            </div>

            {/* Progress bar */}
            <div
              style={{
                width: "100%",
                height: "8px",
                background: "var(--color-bg-card-alt)",
                borderRadius: "4px",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${Math.min(data.avg, 100)}%`,
                  height: "100%",
                  background: getPerformanceColor(data.avg),
                  transition: "width 0.3s ease",
                }}
              />
            </div>
          </div>
        )
      )}
    </div>
  );

  const renderStudentPerformance = () => (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
        gap: "16px",
      }}
    >
      {students.map((student) => {
        const marks = student.marks || [];
        const avgPercentage =
          marks.length > 0
            ? marks.reduce(
                (sum, mark) => sum + (mark.score / mark.total) * 100,
                0
              ) / marks.length
            : 0;

        const recentMark = marks.sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        )[0];
        const recentPercentage = recentMark
          ? (recentMark.score / recentMark.total) * 100
          : 0;

        return (
          <div
            key={student.uid}
            style={{
              background: "var(--color-bg-card)",
              border: "1px solid var(--color-muted)",
              borderRadius: "8px",
              padding: "20px",
            }}
          >
            <h4 style={{ margin: "0 0 8px 0", color: "var(--color-text)" }}>
              {student.name}
            </h4>
            <div
              style={{
                fontSize: "0.9rem",
                color: "var(--color-muted)",
                marginBottom: "16px",
              }}
            >
              {student.grade && `${t("grade")}: ${student.grade}`}
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: "8px",
              }}
            >
              <span>{t("average")}:</span>
              <span
                style={{
                  fontWeight: "bold",
                  color: getPerformanceColor(avgPercentage),
                }}
              >
                {avgPercentage.toFixed(1)}%
              </span>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: "8px",
              }}
            >
              <span>{t("total_marks")}:</span>
              <span style={{ fontWeight: "bold" }}>{marks.length}</span>
            </div>

            {recentMark && (
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: "16px",
                }}
              >
                <span>{t("latest")}:</span>
                <span
                  style={{
                    fontWeight: "bold",
                    color: getPerformanceColor(recentPercentage),
                  }}
                >
                  {recentPercentage.toFixed(1)}% ({recentMark.subject})
                </span>
              </div>
            )}

            {/* Performance trend indicator */}
            {marks.length >= 2 && (
              <div>
                {(() => {
                  const lastTwo = marks.slice(-2);
                  const trend =
                    (lastTwo[1].score / lastTwo[1].total -
                      lastTwo[0].score / lastTwo[0].total) *
                    100;
                  return (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                        color:
                          trend > 0
                            ? "var(--color-success)"
                            : trend < 0
                            ? "var(--color-danger)"
                            : "var(--color-muted)",
                      }}
                    >
                      <span>{trend > 0 ? "📈" : trend < 0 ? "📉" : "➡️"}</span>
                      <span style={{ fontSize: "0.9rem" }}>
                        {Math.abs(trend).toFixed(1)}%{" "}
                        {trend > 0
                          ? t("improvement")
                          : trend < 0
                          ? t("decline")
                          : t("stable")}
                      </span>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );

  const renderTrends = () => (
    <div
      style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}
    >
      {/* Performance Distribution */}
      <div
        style={{
          background: "white",
          border: "1px solid #dee2e6",
          borderRadius: "8px",
          padding: "20px",
        }}
      >
        <h4 style={{ margin: "0 0 16px 0" }}>
          📊 {t("performance_distribution")}
        </h4>

        {analytics &&
          Object.entries(analytics.performanceBands).map(([band, count]) => {
            const percentage = (count / analytics.totalMarks) * 100;
            const colors = {
              excellent: "#28a745",
              good: "#17a2b8",
              average: "#ffc107",
              poor: "#dc3545",
            };

            return (
              <div key={band} style={{ marginBottom: "12px" }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: "4px",
                  }}
                >
                  <span>{t(band)}:</span>
                  <span style={{ fontWeight: "bold" }}>
                    {count} ({percentage.toFixed(1)}%)
                  </span>
                </div>
                <div
                  style={{
                    width: "100%",
                    height: "8px",
                    background: "#e9ecef",
                    borderRadius: "4px",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: `${percentage}%`,
                      height: "100%",
                      background: colors[band as keyof typeof colors],
                      transition: "width 0.3s ease",
                    }}
                  />
                </div>
              </div>
            );
          })}
      </div>

      {/* Recent Activity */}
      <div
        style={{
          background: "var(--color-bg-card)",
          border: "1px solid var(--color-muted)",
          borderRadius: "8px",
          padding: "20px",
        }}
      >
        <h4 style={{ margin: "0 0 16px 0", color: "var(--color-text)" }}>
          🕒 {t("recent_activity")}
        </h4>

        {analytics?.recentActivity.map((mark, idx) => {
          const percentage = (mark.score / mark.total) * 100;
          return (
            <div
              key={idx}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "8px 0",
                borderBottom:
                  idx < analytics.recentActivity.length - 1
                    ? "1px solid var(--color-muted)"
                    : "none",
              }}
            >
              <div>
                <div
                  style={{
                    fontWeight: "600",
                    fontSize: "0.9rem",
                    color: "var(--color-text)",
                  }}
                >
                  {t(mark.subject)}
                </div>
                <div
                  style={{ fontSize: "0.8rem", color: "var(--color-muted)" }}
                >
                  {new Date(mark.date).toLocaleDateString()}
                </div>
              </div>
              <div
                style={{
                  fontWeight: "bold",
                  color: getPerformanceColor(percentage),
                }}
              >
                {percentage.toFixed(1)}%
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "40px" }}>
        <div style={{ fontSize: "1.2rem", color: "var(--color-muted)" }}>
          {t("loading_analytics")}
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div style={{ textAlign: "center", padding: "40px" }}>
        <div
          style={{
            fontSize: "1.2rem",
            color: "var(--color-muted)",
            marginBottom: "8px",
          }}
        >
          📊 {t("no_data_available")}
        </div>
        <div style={{ color: "var(--color-muted)" }}>
          {t("assign_marks_to_see_analytics")}
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        padding: "20px",
        maxWidth: "1200px",
        margin: "0 auto",
        background: "var(--color-bg)",
        color: "var(--color-text)",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "20px",
        }}
      >
        <h2 style={{ margin: 0, color: "var(--color-text)" }}>
          📊 {t("mark_analytics")}
        </h2>

        <div style={{ display: "flex", gap: "8px" }}>
          {["week", "month", "term", "year"].map((range) => (
            <button
              key={range}
              onClick={() => fetchAnalytics()}
              style={{
                padding: "6px 12px",
                background:
                  timeRange === range
                    ? "var(--color-primary)"
                    : "var(--color-bg-card)",
                color:
                  timeRange === range
                    ? "var(--color-btn-text)"
                    : "var(--color-text)",
                border: "1px solid var(--color-primary)",
                borderRadius: "6px",
                cursor: "pointer",
                fontSize: "0.9rem",
                transition: "all 0.2s ease",
              }}
            >
              {t(range)}
            </button>
          ))}
        </div>
      </div>

      {/* Navigation */}
      <div style={{ marginBottom: "20px" }}>
        <div
          style={{
            display: "flex",
            gap: "4px",
            borderBottom: "1px solid var(--color-muted)",
          }}
        >
          {[
            { key: "overview", label: t("overview"), icon: "📈" },
            { key: "subjects", label: t("subjects"), icon: "📚" },
            { key: "students", label: t("students"), icon: "👥" },
            { key: "trends", label: t("trends"), icon: "📊" },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setSelectedView(tab.key as any)}
              style={{
                padding: "12px 16px",
                background:
                  selectedView === tab.key
                    ? "var(--color-bg-card)"
                    : "transparent",
                border: "none",
                borderBottom:
                  selectedView === tab.key
                    ? "2px solid var(--color-primary)"
                    : "2px solid transparent",
                cursor: "pointer",
                fontSize: "1rem",
                color:
                  selectedView === tab.key
                    ? "var(--color-primary)"
                    : "var(--color-muted)",
                transition: "all 0.2s ease",
              }}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div>
        {selectedView === "overview" && renderOverview()}
        {selectedView === "subjects" && renderSubjectBreakdown()}
        {selectedView === "students" && renderStudentPerformance()}
        {selectedView === "trends" && renderTrends()}
      </div>
    </div>
  );
};

export default MarkAnalytics;
