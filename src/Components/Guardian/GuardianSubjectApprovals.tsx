import React, { useState, useEffect } from "react";
import { useAuth } from "../../AuthContext";
import {
  getPendingSubjectSelections,
  approveSubjectSelection,
  rejectSubjectSelection,
} from "../../utils/academic";
import type { SubjectSelection } from "../../types/academic";

interface GuardianSubjectApprovalsProps {
  onNotificationUpdate?: () => Promise<void>;
}

const GuardianSubjectApprovals: React.FC<GuardianSubjectApprovalsProps> = ({
  onNotificationUpdate,
}) => {
  const { user } = useAuth();
  const [pendingSelections, setPendingSelections] = useState<
    SubjectSelection[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string>("");

  useEffect(() => {
    fetchPendingSelections();
  }, [user]);

  const fetchPendingSelections = async () => {
    if (!user?.uid) return;

    try {
      setLoading(true);
      const selections = await getPendingSubjectSelections(user.uid);
      setPendingSelections(selections);
    } catch (error) {
      // Error handling for fetching pending selections
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (selectionId: string) => {
    if (!user?.uid) return;

    setProcessing(selectionId);
    try {
      await approveSubjectSelection(selectionId, user.uid);
      setPendingSelections((prev) => prev.filter((s) => s.id !== selectionId));

      // Refresh notification count since approval creates notifications
      if (onNotificationUpdate) {
        await onNotificationUpdate();
      }
    } catch (error) {
      // Show user-friendly error message
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      alert(`Error approving selection: ${errorMessage}`);
    } finally {
      setProcessing("");
    }
  };

  const handleReject = async (selectionId: string) => {
    if (!user?.uid) return;

    const reason = prompt("Please provide a reason for rejection (optional):");
    // Allow rejection even if no reason provided

    setProcessing(selectionId);
    try {
      await rejectSubjectSelection(selectionId, user.uid, reason || undefined);
      setPendingSelections((prev) => prev.filter((s) => s.id !== selectionId));

      // Refresh notification count since rejection creates notifications
      if (onNotificationUpdate) {
        await onNotificationUpdate();
      }
    } catch (error) {
      // Show user-friendly error message
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      alert(`Error rejecting selection: ${errorMessage}`);
    } finally {
      setProcessing("");
    }
  };

  if (loading) {
    return (
      <div className="guardian-tab-content">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading subject approvals...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="guardian-tab-content">
      <div className="tab-header">
        <h2>Subject Approvals</h2>
        <p className="tab-description">
          Review and approve your children's subject selections
        </p>
      </div>

      {pendingSelections.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📚</div>
          <h3>No Pending Approvals</h3>
          <p>All subject selections have been reviewed</p>
        </div>
      ) : (
        <div className="approval-list">
          {pendingSelections.map((selection) => (
            <div key={selection.id} className="approval-card">
              <div className="approval-header">
                <div className="student-info">
                  <h3>{selection.studentName}</h3>
                  <span className="grade-badge">Grade {selection.grade}</span>
                </div>
                <div className="selection-date">
                  {selection.createdAt?.toDate?.()?.toLocaleDateString() ||
                    new Date(selection.createdAt).toLocaleDateString()}
                </div>
              </div>

              <div className="subjects-section">
                <h4>Selected Subjects:</h4>
                <div className="subject-grid">
                  {(selection.subjects || []).map((subject, index) => (
                    <div key={index} className="subject-chip">
                      {subject}
                    </div>
                  ))}
                </div>
              </div>

              {selection.reason && (
                <div className="reason-section">
                  <h4>Reason for Changes:</h4>
                  <p className="reason-text">{selection.reason}</p>
                </div>
              )}

              <div className="approval-actions">
                <button
                  className="btn-approve"
                  onClick={() => handleApprove(selection.id)}
                  disabled={processing === selection.id}
                >
                  {processing === selection.id ? (
                    <span className="button-spinner"></span>
                  ) : (
                    "✓"
                  )}
                  Approve
                </button>
                <button
                  className="btn-reject"
                  onClick={() => handleReject(selection.id)}
                  disabled={processing === selection.id}
                >
                  {processing === selection.id ? (
                    <span className="button-spinner"></span>
                  ) : (
                    "✗"
                  )}
                  Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="approval-tips">
        <h3>Approval Tips</h3>
        <ul>
          <li>
            Review each subject carefully to ensure they align with your child's
            academic goals
          </li>
          <li>
            Consider prerequisites and difficulty levels when approving subjects
          </li>
          <li>
            Contact the school if you have questions about specific subjects
          </li>
        </ul>
      </div>
    </div>
  );
};

export default GuardianSubjectApprovals;
