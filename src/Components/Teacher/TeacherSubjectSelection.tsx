import React, { useState, useEffect } from "react";
import { useAuth } from "../../AuthContext";
import { doc, updateDoc } from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import { db } from "../../firebase";
import { SUBJECTS } from "../../data/constants";
import "./TeacherSubjectSelection.css";

interface TeacherSubjectSelectionProps {
  onComplete?: () => void;
  isModal?: boolean;
}

const TeacherSubjectSelection: React.FC<TeacherSubjectSelectionProps> = ({
  onComplete,
  isModal = false,
}) => {
  const { profile, user } = useAuth();
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [maxStudentsPerSubject, setMaxStudentsPerSubject] =
    useState<number>(30);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    if (profile?.teachingSubjects) {
      setSelectedSubjects(profile.teachingSubjects);
    }
    if (profile?.maxStudentsPerSubject) {
      setMaxStudentsPerSubject(profile.maxStudentsPerSubject);
    }
  }, [profile]);

  const handleSubjectToggle = (subject: string) => {
    setSelectedSubjects((prev) =>
      prev.includes(subject)
        ? prev.filter((s) => s !== subject)
        : [...prev, subject]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedSubjects.length === 0) {
      setError("Please select at least one subject you can teach.");
      return;
    }

    if (!user?.uid) {
      setError("User not authenticated.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const userRef = doc(db, "users", user.uid);
      const previousSubjects = profile?.teachingSubjects || [];

      await updateDoc(userRef, {
        teachingSubjects: selectedSubjects,
        maxStudentsPerSubject: maxStudentsPerSubject,
        updatedAt: new Date(),
      });

      // Log the changes for POPIA compliance
      try {
        const functions = getFunctions();
        const logUserEdit = httpsCallable(functions, "logUserEdit");
        await logUserEdit({
          userId: user.uid,
          changes: {
            teachingSubjects: {
              previous: previousSubjects,
              new: selectedSubjects,
            },
            maxStudentsPerSubject: maxStudentsPerSubject,
          },
          editorId: user.uid,
          reason: "Teacher updated their own teaching subjects and capacity",
        });
      } catch (logError) {
        console.warn("Failed to log teaching subjects update:", logError);
      }

      if (onComplete) {
        onComplete();
      }
    } catch (err) {
      console.error("Error updating teaching subjects:", err);
      setError("Failed to update teaching subjects. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const containerClass = isModal
    ? "teacher-subject-selection-modal"
    : "teacher-subject-selection-container";

  return (
    <div className={containerClass}>
      <div className="teacher-subject-selection-content">
        <div className="teacher-subject-header">
          <h2>Select Teaching Subjects</h2>
          <p>
            Choose the subjects you are qualified to teach. Students will only
            see subjects that have at least one teacher assigned.
          </p>
        </div>

        {error && (
          <div className="teacher-subject-error">
            <span className="error-icon">⚠️</span>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="teacher-subject-form">
          <div className="teacher-subject-capacity">
            <label htmlFor="maxStudents">Maximum Students Per Subject</label>
            <input
              id="maxStudents"
              type="number"
              min="1"
              max="50"
              value={maxStudentsPerSubject}
              onChange={(e) =>
                setMaxStudentsPerSubject(parseInt(e.target.value))
              }
              className="teacher-subject-input"
            />
            <small>Recommended: 25-30 students per subject</small>
          </div>

          <div className="teacher-subject-grid">
            <h3>Available Subjects</h3>
            <div className="subjects-grid">
              {SUBJECTS.map((subject) => (
                <label key={subject} className="subject-checkbox">
                  <input
                    type="checkbox"
                    checked={selectedSubjects.includes(subject)}
                    onChange={() => handleSubjectToggle(subject)}
                  />
                  <span className="subject-label">
                    <span className="subject-icon">
                      {/* You can add subject icons here */}
                      📚
                    </span>
                    {subject}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div className="teacher-subject-selected">
            <h4>Selected Subjects ({selectedSubjects.length})</h4>
            {selectedSubjects.length > 0 ? (
              <div className="selected-subjects-list">
                {selectedSubjects.map((subject) => (
                  <span key={subject} className="selected-subject-tag">
                    {subject}
                    <button
                      type="button"
                      onClick={() => handleSubjectToggle(subject)}
                      className="remove-subject-btn"
                      aria-label={`Remove ${subject}`}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            ) : (
              <p className="no-subjects-selected">No subjects selected</p>
            )}
          </div>

          <div className="teacher-subject-actions">
            <button
              type="submit"
              disabled={loading || selectedSubjects.length === 0}
              className="teacher-subject-submit-btn"
            >
              {loading ? (
                <>
                  <span className="loading-spinner"></span>
                  Saving...
                </>
              ) : (
                <>
                  <span className="save-icon">💾</span>
                  Save Teaching Subjects
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TeacherSubjectSelection;
