import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../AuthContext";
import {
  getAvailableSubjects,
  submitSubjectSelection,
} from "../../utils/academic";
import {
  doc,
  getDoc,
  query,
  where,
  collection,
  getDocs,
} from "firebase/firestore";
import { db } from "../../firebase";
import "./StudentSubjectSelection.css";

interface StudentSubjectSelectionProps {
  onComplete?: () => void;
  onClose?: () => void;
  isModal?: boolean;
}

const StudentSubjectSelection: React.FC<StudentSubjectSelectionProps> = ({
  onComplete,
  onClose,
  isModal = false,
}) => {
  const { t } = useTranslation();
  const { profile, user } = useAuth();
  const [availableSubjects, setAvailableSubjects] = useState<string[]>([]);
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [guardianUid, setGuardianUid] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [loadingSubjects, setLoadingSubjects] = useState(true);
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");
  const [step, setStep] = useState<"selection" | "confirmation">("selection");

  useEffect(() => {
    const loadSubjects = async () => {
      if (!profile?.schoolId) {
        return;
      }

      try {
        setLoadingSubjects(true);

        // Get available subjects
        const subjects = await getAvailableSubjects(profile.schoolId);
        setAvailableSubjects(subjects);

        // Get guardian UID - try both linking approaches
        // 1. Check student document for guardians array
        const studentDocRef = doc(db, "users", user?.uid || "");
        const studentDoc = await getDoc(studentDocRef);

        if (studentDoc.exists()) {
          const studentData = studentDoc.data();

          // Check for guardians array in student document
          if (studentData.guardians && studentData.guardians.length > 0) {
            setGuardianUid(studentData.guardians[0]);
          } else if (studentData.guardianUid) {
            // Check for direct guardian UID field
            setGuardianUid(studentData.guardianUid);
          } else {
            // 2. Fallback: Search for guardian by looking for guardians with this student
            const guardiansQuery = query(
              collection(db, "users"),
              where("role", "==", "guardian"),
              where("schoolId", "==", profile.schoolId)
            );

            const guardiansSnapshot = await getDocs(guardiansQuery);

            let foundGuardian = false;
            guardiansSnapshot.forEach((guardianDoc) => {
              const guardianData = guardianDoc.data();
              if (
                guardianData.students &&
                guardianData.students.includes(user?.uid)
              ) {
                setGuardianUid(guardianDoc.id);
                foundGuardian = true;
              }
            });

            if (!foundGuardian) {
              // No guardian found for student
            }
          }
        }
      } catch (error) {
        setError("Failed to load available subjects. Please try again.");
      } finally {
        setLoadingSubjects(false);
      }
    };

    if (user?.uid && profile?.schoolId) {
      loadSubjects();
    }
  }, [user?.uid, profile?.schoolId, profile?.grade]);

  const handleSubjectToggle = (subject: string) => {
    setSelectedSubjects((prev) => {
      if (prev.includes(subject)) {
        return prev.filter((s) => s !== subject);
      } else {
        if (prev.length >= 10) {
          setError(t("select_max_ten_subjects"));
          return prev;
        }
        setError("");
        return [...prev, subject];
      }
    });
  };

  const handleRemoveSubject = (subject: string) => {
    setSelectedSubjects((prev) => prev.filter((s) => s !== subject));
    setError("");
  };

  const handleNext = () => {
    if (selectedSubjects.length === 0) {
      setError(t("select_at_least_one_subject"));
      return;
    }
    if (selectedSubjects.length > 10) {
      setError(t("select_max_ten_subjects"));
      return;
    }
    setError("");
    setStep("confirmation");
  };

  const handleBack = () => {
    setStep("selection");
  };

  const handleSubmit = async () => {
    if (!user?.uid || !profile?.schoolId || !guardianUid) {
      const missingFields = [];
      if (!user?.uid) missingFields.push("Student UID");
      if (!profile?.schoolId) missingFields.push("School ID");
      if (!guardianUid) missingFields.push("Guardian UID");

      // For development/testing: Allow submission without guardian if needed
      if (!guardianUid && process.env.NODE_ENV === "development") {
        // Use a placeholder guardian UID for development
        const tempGuardianUid = "dev-guardian-" + Date.now();

        // Continue with submission using temp guardian UID
        if (user?.uid && profile?.schoolId) {
          setLoading(true);
          setError("");
          setSuccess("");

          try {
            await submitSubjectSelection(
              user.uid,
              tempGuardianUid,
              profile.schoolId,
              selectedSubjects,
              "2025" // Current academic year
            );

            setSuccess("Subject selection submitted successfully!");

            // Wait a moment to show success message
            setTimeout(() => {
              if (onComplete) {
                onComplete();
              }
            }, 1500);
          } catch (err) {
            setError("Failed to submit subject selection. Please try again.");
          } finally {
            setLoading(false);
          }
          return;
        }
      }

      setError(
        `Missing required information: ${missingFields.join(
          ", "
        )}. Please contact admin to link a guardian to your account.`
      );
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      await submitSubjectSelection(
        user.uid,
        guardianUid,
        profile.schoolId,
        selectedSubjects,
        "2025" // Current academic year
      );
      setSuccess("Subject selection submitted successfully!");

      // Wait a moment to show success message
      setTimeout(() => {
        if (onComplete) {
          onComplete();
        }
      }, 1500);
    } catch (err) {
      setError(t("failed_submit_subject_selection"));
    } finally {
      setLoading(false);
    }
  };

  const containerClass = isModal
    ? "student-subject-selection-modal"
    : "student-subject-selection-container";

  if (loadingSubjects) {
    return (
      <div className={containerClass}>
        <div className="student-subject-content">
          <div className="student-subject-loading">
            <div className="loading-spinner"></div>
            <p>{t("loading_subjects")}...</p>
          </div>
        </div>
      </div>
    );
  }

  if (availableSubjects.length === 0) {
    return (
      <div className={containerClass}>
        <div className="student-subject-content">
          <div className="student-subject-error">
            <span className="error-icon">⚠️</span>
            <h3>{t("no_subjects_available")}</h3>
            <p>{t("contact_admin_subjects")}</p>
            {onClose && (
              <button onClick={onClose} className="student-subject-close-btn">
                {t("close")}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={containerClass}>
      <div className="student-subject-content">
        {step === "selection" ? (
          <>
            <div className="student-subject-header">
              <h2>{t("select_your_subjects")}</h2>
              <p>{t("choose_subjects_description")}</p>
              {onClose && (
                <button
                  onClick={onClose}
                  className="student-subject-close-btn"
                  aria-label={t("close")}
                >
                  ×
                </button>
              )}
            </div>

            {error && (
              <div className="student-subject-error">
                <span className="error-icon">⚠️</span>
                {error}
              </div>
            )}

            {success && (
              <div className="student-subject-success">
                <span className="success-icon">✅</span>
                {success}
              </div>
            )}

            <div className="student-subject-info">
              <div className="info-item">
                <span className="info-icon">👨‍🎓</span>
                <span>{t("select_subjects_recommendation")}</span>
              </div>
              <div className="info-item">
                <span className="info-icon">👨‍👩‍👧‍👦</span>
                <span>{t("guardian_approval_required")}</span>
              </div>
              <div className="info-item">
                <span className="info-icon">👨‍🏫</span>
                <span>{t("teachers_assigned_after_approval")}</span>
              </div>
            </div>

            <div className="student-subject-grid">
              <h3>
                {t("available_subjects")} ({availableSubjects.length})
              </h3>
              <div className="subjects-grid">
                {availableSubjects.map((subject) => (
                  <label key={subject} className="subject-checkbox">
                    <input
                      type="checkbox"
                      checked={selectedSubjects.includes(subject)}
                      onChange={() => handleSubjectToggle(subject)}
                    />
                    <span className="subject-label">
                      <span className="subject-icon">📖</span>
                      {subject}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div className="student-subject-selected">
              <h4>
                {t("selected_subjects")} ({selectedSubjects.length})
              </h4>
              {selectedSubjects.length > 0 ? (
                <div className="selected-subjects-list">
                  {selectedSubjects.map((subject) => (
                    <div key={subject} className="selected-subject-item">
                      <span className="subject-name">{subject}</span>
                      <button
                        onClick={() => handleRemoveSubject(subject)}
                        className="remove-subject-btn"
                        aria-label={t("remove_subject", { subject })}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="no-subjects-message">
                  {t("no_subjects_selected")}
                </p>
              )}
            </div>

            <div className="student-subject-actions">
              {onClose && (
                <button
                  onClick={onClose}
                  className="student-subject-cancel-btn"
                  type="button"
                >
                  <span className="cancel-icon">✕</span>
                  {t("cancel")}
                </button>
              )}
              <button
                onClick={handleNext}
                disabled={selectedSubjects.length === 0}
                className="student-subject-next-btn"
                type="button"
              >
                <span className="next-icon">→</span>
                {t("continue")}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="student-subject-header">
              <h2>{t("confirm_subject_selection")}</h2>
              <p>{t("confirm_selection_description")}</p>
            </div>

            {error && (
              <div className="student-subject-error">
                <span className="error-icon">⚠️</span>
                {error}
              </div>
            )}

            {success && (
              <div className="student-subject-success">
                <span className="success-icon">✅</span>
                {success}
              </div>
            )}

            <div className="confirmation-summary">
              <h3>
                {t("your_selected_subjects")} ({selectedSubjects.length})
              </h3>
              <div className="confirmation-subjects">
                {selectedSubjects.map((subject, index) => (
                  <div key={subject} className="confirmation-subject">
                    <span className="subject-number">{index + 1}</span>
                    <span className="subject-name">{subject}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="confirmation-info">
              <div className="info-box">
                <h4>{t("what_happens_next")}</h4>
                <ol>
                  <li>{t("guardian_notification_step")}</li>
                  <li>{t("guardian_review_step")}</li>
                  <li>{t("teacher_assignment_step")}</li>
                  <li>{t("confirmation_step")}</li>
                </ol>
              </div>
            </div>

            <div className="student-subject-actions">
              <button
                onClick={handleBack}
                className="student-subject-back-btn"
                disabled={loading}
                type="button"
              >
                <span className="back-icon">←</span>
                {t("back")}
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="student-subject-submit-btn"
                type="button"
              >
                {loading ? (
                  <>
                    <span className="loading-spinner"></span>
                    {t("submitting")}...
                  </>
                ) : (
                  <>
                    <span className="submit-icon">✅</span>
                    {t("submit_for_approval")}
                  </>
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default StudentSubjectSelection;
