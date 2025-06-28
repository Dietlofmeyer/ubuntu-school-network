import { useEffect, useState } from "react";
import { useAuth } from "../../AuthContext";
import { db, auth } from "../../firebase";
import {
  doc,
  getDoc,
  updateDoc,
  collection,
  getDocs,
  arrayUnion,
  arrayRemove,
} from "firebase/firestore";
import { signOut } from "firebase/auth";
import { subjectIcons } from "../../data/constants";
import "./studentDash.css";
import DemeritHistoryContent from "./DemeritHistoryContent";
import ReportCardModal from "./ReportCardModal";
import LatestMarks from "./LatestMarks";
import CoursesGrid from "./CoursesGrid";
import ReportCardsTable from "./ReportCardsTable";
import StudentExtracurricularModal from "./StudentExtracurricularModal";
import StudentSubjectSelection from "./StudentSubjectSelection";
import Sidebar from "./Sidebar";
import { useTranslation } from "react-i18next";
import Modal from "../Modal/Modal";
import { useTheme } from "../../ThemeContext";

type Mark = {
  subject: string;
  score: number;
  total: number;
  description: string;
  date: string;
  teacher: string;
};

type Activity = {
  id: string;
  name: string;
  description: string;
  teacher: string;
  createdAt: string;
};

type Award = {
  title: string;
  description?: string;
  date: string;
};

type DemeritRecord = {
  points: number;
  reason: string;
  date: string;
  teacher: string;
};

type Profile = {
  name?: string;
  language?: string;
};

export type ReportCard = {
  term: number;
  year: number;
  issuedAt: string;
  subjects: { subject: string; average: number | null; comment: string }[];
  demerits: number;
  teacher: string;
  grade?: string;
  homeroomClass?: string;
};

function getSubjectIcon(subject: string) {
  for (const key in subjectIcons) {
    if (
      subject.toLowerCase() === key.toLowerCase() ||
      subject.toLowerCase().includes(key.toLowerCase())
    ) {
      return subjectIcons[key];
    }
  }
  return subjectIcons.Default;
}

function StudentDash() {
  const { t, i18n } = useTranslation();
  const { user, profile } = useAuth();
  const { theme, setTheme, themeOptions } = useTheme();
  const [marks, setMarks] = useState<Mark[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [awards, setAwards] = useState<Award[]>([]);
  const [subjects, setSubjects] = useState<string[]>([]);
  const [homeroomClass, setHomeroomClass] = useState<string>("");
  const [homeroomTeacher, setHomeroomTeacher] = useState<string>("");
  const [demerits, setDemerits] = useState<DemeritRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDemeritHistory, setShowDemeritHistory] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // --- Report Cards ---
  const [reports, setReports] = useState<ReportCard[]>([]);
  const [viewReport, setViewReport] = useState<ReportCard | null>(null);

  // --- Extracurriculars ---
  const [allExtracurriculars, setAllExtracurriculars] = useState<Activity[]>(
    []
  );
  const [signedUpIds, setSignedUpIds] = useState<string[]>([]);
  const [extracurricularModalOpen, setExtracurricularModalOpen] =
    useState(false);

  // --- Academic Management Features ---
  const [showSubjectSelection, setShowSubjectSelection] = useState(false);
  const [needsSubjectSelection, setNeedsSubjectSelection] = useState(false);

  // --- Language state ---
  const [language, setLanguage] = useState<string>(i18n.language);

  // --- Mobile sidebar state ---
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  useEffect(() => {
    document.body.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  useEffect(() => {
    if (!user) return;
    const fetchStudentData = async () => {
      setLoading(true);
      try {
        const ref = doc(db, "students", user.uid);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          const data = snap.data();
          setMarks(data.marks || []);
          setActivities(data.activities || []);
          setAwards(data.awards || []);
        } else {
          setMarks([]);
          setActivities([]);
          setAwards([]);
        }
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);
        let homeroom = "";
        if (userSnap.exists()) {
          setSubjects(userSnap.data().subjects || []);
          homeroom = userSnap.data().homeroomClass || "";
          setHomeroomClass(homeroom);
          setDemerits(userSnap.data().demerits || []);
          if (userSnap.data().marks) {
            setMarks(userSnap.data().marks);
          }
          setReports(userSnap.data().reports || []);
          setSignedUpIds(userSnap.data().extracurriculars || []);

          // Check if student needs subject selection
          const selectedSubjects = userSnap.data().selectedSubjects || [];
          const approvedSubjects = userSnap.data().approvedSubjects || [];
          if (selectedSubjects.length === 0 && approvedSubjects.length === 0) {
            setNeedsSubjectSelection(true);
          }

          // Set language from user profile if available
          if (
            userSnap.data().language &&
            userSnap.data().language !== i18n.language
          ) {
            i18n.changeLanguage(userSnap.data().language);
            setLanguage(userSnap.data().language);
          }
        } else {
          setSubjects([]);
          setHomeroomClass("");
          setDemerits([]);
          setReports([]);
          setSignedUpIds([]);
        }
        if (homeroom) {
          const homeroomRef = doc(db, "homerooms", homeroom);
          const homeroomSnap = await getDoc(homeroomRef);
          let teacherId = "";
          if (homeroomSnap.exists()) {
            teacherId = homeroomSnap.data().teacherId;
          }
          if (teacherId) {
            const teacherRef = doc(db, "users", teacherId);
            const teacherSnap = await getDoc(teacherRef);
            if (teacherSnap.exists()) {
              setHomeroomTeacher(teacherSnap.data().name || "");
            } else {
              setHomeroomTeacher("");
            }
          } else {
            setHomeroomTeacher("");
          }
        } else {
          setHomeroomTeacher("");
        }
      } catch (error) {
        console.error("Error fetching student data:", error);
      }
      setLoading(false);
    };
    fetchStudentData();
  }, [user]);

  // Fetch all extracurriculars from DB
  useEffect(() => {
    const fetchExtracurriculars = async () => {
      const snap = await getDocs(collection(db, "extracurriculars"));
      const list: Activity[] = [];
      snap.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.available !== false) {
          let createdAt: string = "";
          if (data.createdAt?.toDate) {
            createdAt = data.createdAt.toDate().toLocaleString();
          } else if (typeof data.createdAt === "string") {
            createdAt = data.createdAt;
          } else {
            createdAt = "";
          }
          list.push({
            id: docSnap.id,
            name: data.name,
            description: data.description ?? "",
            teacher: data.teacher ?? "",
            createdAt,
          });
        }
      });
      setAllExtracurriculars(list);
    };
    fetchExtracurriculars();
  }, []);

  const handleSignOut = async () => {
    await signOut(auth);
    window.location.reload();
  };

  const totalDemeritPoints = demerits.reduce((sum, d) => sum + d.points, 0);

  // Group marks by subject
  const marksBySubject: { [subject: string]: Mark[] } = {};
  marks.forEach((mark) => {
    if (!marksBySubject[mark.subject]) marksBySubject[mark.subject] = [];
    marksBySubject[mark.subject].push(mark);
  });

  // Calculate average grade per subject
  const averageBySubject: { [subject: string]: number | null } = {};
  Object.keys(marksBySubject).forEach((subject) => {
    const subjectMarks = marksBySubject[subject];
    const validMarks = subjectMarks.filter((m) => m.total > 0);
    if (validMarks.length === 0) {
      averageBySubject[subject] = null;
    } else {
      const totalScore = validMarks.reduce((sum, m) => sum + m.score, 0);
      const totalOutOf = validMarks.reduce((sum, m) => sum + m.total, 0);
      averageBySubject[subject] =
        totalOutOf > 0 ? (totalScore / totalOutOf) * 100 : null;
    }
  });

  // Get today's date
  const today = new Date();
  const dateString = today.toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // Get latest marks (sorted by date descending)
  const latestMarks = [...marks]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 6);

  // Demerit history sorted newest first
  const sortedDemerits = [...demerits].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  function formatDate(dateStr: string) {
    const d = new Date(dateStr);
    return (
      d.toLocaleDateString() +
      " " +
      d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    );
  }

  const handleSignUp = async (activityId: string) => {
    if (!user) return;
    const userRef = doc(db, "users", user.uid);
    await updateDoc(userRef, {
      extracurriculars: arrayUnion(activityId),
    });
    setSignedUpIds((prev) => [...prev, activityId]);
  };

  const handleWithdraw = async (activityId: string) => {
    if (!user) return;
    const userRef = doc(db, "users", user.uid);
    await updateDoc(userRef, {
      extracurriculars: arrayRemove(activityId),
    });
    setSignedUpIds((prev) => prev.filter((id) => id !== activityId));
  };

  // Handle language change and save to Firestore
  const handleLanguageChange = async (
    e: React.ChangeEvent<HTMLSelectElement>
  ) => {
    const newLang = e.target.value;
    setLanguage(newLang);
    i18n.changeLanguage(newLang);
    if (user) {
      await updateDoc(doc(db, "users", user.uid), { language: newLang });
    }
  };

  const signedUpActivities = allExtracurriculars.filter((a) =>
    signedUpIds.includes(a.id)
  );

  return loading ? (
    <div className="sdash-loading">{t("loading_dashboard")}</div>
  ) : (
    <div className="sdash-root">
      {/* Demerit History Modal */}
      <Modal
        open={showDemeritHistory}
        onClose={() => setShowDemeritHistory(false)}
        ariaLabel={t("demerit_history")}
      >
        <DemeritHistoryContent demerits={demerits} />
      </Modal>

      {/* Settings Modal */}
      <Modal
        open={showSettings}
        onClose={() => setShowSettings(false)}
        ariaLabel={t("settings")}
      >
        <h2 style={{ marginTop: 0 }}>{t("settings")}</h2>
        <p>{t("settings_placeholder")}</p>
        {/* Language dropdown */}
        <label
          htmlFor="language-select"
          style={{ fontWeight: 600, marginTop: 16 }}
        >
          {t("language")}
        </label>
        <select
          id="language-select"
          value={language}
          onChange={handleLanguageChange}
          style={{
            margin: "0.5rem 0 1rem 0",
            padding: "0.3rem",
            width: "100%",
          }}
        >
          <option value="en">English</option>
          <option value="af">Afrikaans</option>
        </select>
        {/* Theme dropdown */}
        <label
          htmlFor="theme-select"
          style={{ fontWeight: 600, marginTop: 16 }}
        >
          Theme
        </label>
        <select
          id="theme-select"
          value={theme}
          onChange={(e) => setTheme(e.target.value)}
          style={{
            margin: "0.5rem 0 1rem 0",
            padding: "0.3rem",
            width: "100%",
          }}
        >
          {themeOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <button onClick={() => setShowSettings(false)}>{t("close")}</button>
      </Modal>

      {/* Report Card Modal */}
      {viewReport && (
        <ReportCardModal
          report={viewReport}
          studentName={profile?.name || ""}
          onClose={() => setViewReport(null)}
        />
      )}

      {/* Extracurricular Modal */}
      {extracurricularModalOpen && (
        <StudentExtracurricularModal
          allExtracurriculars={allExtracurriculars}
          signedUpIds={signedUpIds}
          onSignUp={handleSignUp}
          onWithdraw={handleWithdraw}
          onClose={() => setExtracurricularModalOpen(false)}
        />
      )}

      {/* Subject Selection Modal - NEW ACADEMIC FEATURE */}
      {showSubjectSelection && (
        <StudentSubjectSelection
          isModal={true}
          onComplete={() => {
            setShowSubjectSelection(false);
            setNeedsSubjectSelection(false);
            // Simply close the modal - the profile state should update automatically
            // through the auth context when the subject selection is saved
            console.log("Subject selection completed successfully");
          }}
        />
      )}

      <div className="sdash-mainwrap">
        {/* Hamburger Menu Button for Mobile */}
        <button
          className="sdash-sidebar-hamburger"
          onClick={() => setIsMobileSidebarOpen(true)}
          aria-label={t("open_menu")}
        >
          <span></span>
          <span></span>
          <span></span>
        </button>

        {/* Mobile Sidebar Overlay */}
        {isMobileSidebarOpen && (
          <div
            className="sdash-sidebar-overlay"
            onClick={() => setIsMobileSidebarOpen(false)}
          />
        )}

        {/* Desktop Sidebar */}
        <div className="sdash-sidebar sdash-sidebar-desktop">
          <Sidebar
            profile={profile}
            homeroomTeacher={homeroomTeacher}
            totalDemeritPoints={totalDemeritPoints}
            onShowDemeritHistory={() => setShowDemeritHistory(true)}
            awards={awards}
            activities={signedUpActivities}
            onSignOut={handleSignOut}
            onOpenSettings={() => setShowSettings(true)}
          />
        </div>

        {/* Mobile Sidebar */}
        {isMobileSidebarOpen && (
          <div className="sdash-sidebar sdash-sidebar-mobile">
            <button
              className="sdash-sidebar-close"
              onClick={() => setIsMobileSidebarOpen(false)}
              aria-label={t("close_menu")}
            >
              ×
            </button>
            <Sidebar
              profile={profile}
              homeroomTeacher={homeroomTeacher}
              totalDemeritPoints={totalDemeritPoints}
              onShowDemeritHistory={() => {
                setShowDemeritHistory(true);
                setIsMobileSidebarOpen(false);
              }}
              awards={awards}
              activities={signedUpActivities}
              onSignOut={handleSignOut}
              onOpenSettings={() => {
                setShowSettings(true);
                setIsMobileSidebarOpen(false);
              }}
            />
          </div>
        )}

        <div className="sdash-main">
          {/* Spacer for hamburger menu on mobile */}
          <div className="sdash-hamburger-spacer"></div>

          {/* Hero Header with Modern Design */}
          <div className="sdash-header">
            <div className="sdash-title">{t("student_dashboard")}</div>
            <div className="sdash-date">{dateString}</div>
          </div>

          {/* Subject Selection Notification Banner - NEW ACADEMIC FEATURE */}
          {needsSubjectSelection && (
            <div className="sdash-notification-banner">
              <div className="sdash-notification-content">
                <div className="sdash-notification-icon">📚</div>
                <div className="sdash-notification-text">
                  <h3>
                    {t("subject_selection_required") ||
                      "Subject Selection Required"}
                  </h3>
                  <p>
                    {t("please_select_your_subjects_for_this_academic_year") ||
                      "Please select your subjects for this academic year"}
                  </p>
                </div>
                <button
                  className="sdash-notification-btn"
                  onClick={() => setShowSubjectSelection(true)}
                >
                  {t("select_subjects") || "Select Subjects"}
                </button>
              </div>
            </div>
          )}

          {/* Quick Stats Overview */}
          <div className="sdash-quick-stats">
            <div className="sdash-stat-card">
              <div className="sdash-stat-value">{subjects.length}</div>
              <div className="sdash-stat-label">{t("total_subjects")}</div>
            </div>
            <div className="sdash-stat-card">
              <div className="sdash-stat-value">{latestMarks.length}</div>
              <div className="sdash-stat-label">{t("recent_marks")}</div>
            </div>
            <div className="sdash-stat-card">
              <div className="sdash-stat-value">
                {signedUpActivities.length}
              </div>
              <div className="sdash-stat-label">{t("my_activities")}</div>
            </div>
            <div className="sdash-stat-card">
              <div className="sdash-stat-value">{totalDemeritPoints}</div>
              <div className="sdash-stat-label">{t("demerit_points")}</div>
            </div>
          </div>

          {/* Main Content Grid */}
          <div className="sdash-content-grid">
            <div className="sdash-section-container">
              {/* Latest Marks Section */}
              <LatestMarks marks={latestMarks} />

              {/* Courses Grid Section */}
              <CoursesGrid
                subjects={subjects}
                getSubjectIcon={getSubjectIcon}
                averageBySubject={averageBySubject}
              />
            </div>

            <div className="sdash-sidebar-content">
              {/* Quick Actions */}
              <div className="sdash-section sdash-fade-in">
                <div className="sdash-section-header">
                  <div className="sdash-section-title">
                    🚀 {t("quick_actions") || "Quick Actions"}
                  </div>
                </div>
                <div className="sdash-section-content">
                  <div className="sdash-action-buttons">
                    {/* Subject Selection Button - NEW ACADEMIC FEATURE */}
                    <button
                      className="sdash-action-btn"
                      onClick={() => setShowSubjectSelection(true)}
                    >
                      <span>📚</span>
                      {t("select_subjects") || "Select Subjects"}
                    </button>
                    <button
                      className="sdash-action-btn"
                      onClick={() => setExtracurricularModalOpen(true)}
                    >
                      <span>🎯</span>
                      {t("extracurriculars") || "Extracurriculars"}
                    </button>
                    <button
                      className="sdash-action-btn secondary"
                      onClick={() => setShowDemeritHistory(true)}
                    >
                      <span>📋</span>
                      {t("demerit_history") || "Demerit History"}
                    </button>
                    <button
                      className="sdash-action-btn secondary"
                      onClick={() => setShowSettings(true)}
                    >
                      <span>⚙️</span>
                      {t("settings") || "Settings"}
                    </button>
                  </div>
                </div>
              </div>

              {/* Awards & Activities */}
              {(awards.length > 0 || signedUpActivities.length > 0) && (
                <div className="sdash-section sdash-fade-in">
                  <div className="sdash-section-header">
                    <div className="sdash-section-title">
                      🏆 {t("achievements") || "Achievements"}
                    </div>
                  </div>
                  <div className="sdash-section-content">
                    {awards.length > 0 && (
                      <div className="sdash-mb-2">
                        <h4>{t("awards") || "Awards"}</h4>
                        {awards.slice(0, 3).map((award, idx) => (
                          <div key={idx} className="sdash-mark-card">
                            <div className="sdash-mark-info">
                              <div className="sdash-mark-subject">
                                {award.title}
                              </div>
                              <div className="sdash-mark-details">
                                {award.description}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    {signedUpActivities.length > 0 && (
                      <div>
                        <h4>{t("my_activities") || "My Activities"}</h4>
                        {signedUpActivities.slice(0, 3).map((activity, idx) => (
                          <div key={idx} className="sdash-mark-card">
                            <div className="sdash-mark-info">
                              <div className="sdash-mark-subject">
                                {activity.name}
                              </div>
                              <div className="sdash-mark-details">
                                {activity.teacher}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Report Cards Section */}
          <ReportCardsTable
            reports={reports}
            formatDate={formatDate}
            onView={setViewReport}
          />
        </div>
      </div>
    </div>
  );
}

export default StudentDash;
