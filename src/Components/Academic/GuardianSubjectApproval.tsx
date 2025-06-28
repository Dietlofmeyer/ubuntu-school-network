import React, { useState, useEffect } from "react";
import { useAuth } from "../../AuthContext";
import {
  getPendingSubjectSelections,
  approveSubjectSelection,
} from "../../utils/academic";
import type { SubjectSelection } from "../../types/academic";

const GuardianSubjectApproval: React.FC = () => {
  const { user } = useAuth();
  const [pendingSelections, setPendingSelections] = useState<
    SubjectSelection[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string>("");

  useEffect(() => {
    const fetchPendingSelections = async () => {
      if (!user?.uid) return;

      try {
        const selections = await getPendingSubjectSelections(user.uid);
        setPendingSelections(selections);
      } catch (error) {
        console.error("Error fetching pending selections:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPendingSelections();
  }, [user]);

  const handleApprove = async (selectionId: string) => {
    if (!user?.uid) return;

    setProcessing(selectionId);
    try {
      await approveSubjectSelection(selectionId, user.uid);
      setPendingSelections((prev) => prev.filter((s) => s.id !== selectionId));
    } catch (error) {
      console.error("Error approving selection:", error);
    } finally {
      setProcessing("");
    }
  };

  if (loading) {
    return (
      <div className="academic-dashboard-container">
        <div className="academic-dashboard-loading">
          <div className="loading-spinner"></div>
          <p>Loading pending approvals...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="academic-dashboard-container">
      <div className="academic-header">
        <h2>Subject Approvals</h2>
        <p>Review and approve your child's subject selections</p>
      </div>

      {pendingSelections.length === 0 ? (
        <div className="academic-card">
          <div className="empty-state">
            <span className="empty-icon">✅</span>
            <h3>No Pending Approvals</h3>
            <p>All subject selections have been processed</p>
          </div>
        </div>
      ) : (
        <div className="academic-content">
          {pendingSelections.map((selection) => (
            <div key={selection.id} className="academic-card">
              <h3>Subject Selection Request</h3>
              <div className="selection-details">
                <h4>Selected Subjects ({selection.subjects.length})</h4>
                <div className="subject-list">
                  {selection.subjects.map((subject) => (
                    <span key={subject} className="subject-tag">
                      {subject}
                    </span>
                  ))}
                </div>
                <div className="approval-actions">
                  <button
                    onClick={() => handleApprove(selection.id)}
                    disabled={processing === selection.id}
                    className="approve-btn"
                  >
                    {processing === selection.id ? "Approving..." : "Approve"}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default GuardianSubjectApproval;
