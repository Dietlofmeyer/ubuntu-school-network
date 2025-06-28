import React, { useState, useEffect } from "react";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
  orderBy,
} from "firebase/firestore";
import { db } from "../../firebase";
import { useAuth } from "../../AuthContext";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { SecureRegistrationService } from "../../utils/secureRegistration";
import "./SchoolRegistrationReview.css";

interface SchoolRegistration {
  id: string;
  name: string;
  type: string;
  address: string;
  address2: string;
  address3: string;
  hasMultipleCampuses: string;
  campuses?: string;
  principalEmail: string;
  createdAt: string;
  submittedAt: string;
  registrationStatus: string;
  reviewStatus: "pending" | "approved" | "rejected";
  reviewNotes?: string;
  reviewedBy?: string;
  reviewedAt?: string;
}

const SchoolRegistrationReview: React.FC = () => {
  const [registrations, setRegistrations] = useState<SchoolRegistration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRegistration, setSelectedRegistration] =
    useState<SchoolRegistration | null>(null);
  const [reviewNotes, setReviewNotes] = useState("");
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [generatedToken, setGeneratedToken] = useState<string | null>(null);
  const [registrationUrl, setRegistrationUrl] = useState<string | null>(null);

  const { profile } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();

  useEffect(() => {
    fetchPendingRegistrations();
  }, []);

  const fetchPendingRegistrations = async () => {
    try {
      setLoading(true);
      let querySnapshot;

      try {
        // Try the optimized query with ordering (requires composite index)
        const q = query(
          collection(db, "schools"),
          where("registrationStatus", "==", "pending_developer_approval"),
          orderBy("submittedAt", "desc")
        );
        querySnapshot = await getDocs(q);
      } catch (indexError: any) {
        // Fallback: If index doesn't exist yet, query without ordering
        // Only log in development, reduce console noise in production
        if (process.env.NODE_ENV === "development") {
          console.info(
            "Using fallback query - Firestore index is still building..."
          );
        }
        const fallbackQuery = query(
          collection(db, "schools"),
          where("registrationStatus", "==", "pending_developer_approval")
        );
        querySnapshot = await getDocs(fallbackQuery);
      }

      const regs: SchoolRegistration[] = [];

      querySnapshot.forEach((doc) => {
        regs.push({ id: doc.id, ...doc.data() } as SchoolRegistration);
      });

      // Sort client-side if we used the fallback query
      if (regs.length > 0 && regs[0].submittedAt) {
        regs.sort(
          (a, b) =>
            new Date(b.submittedAt).getTime() -
            new Date(a.submittedAt).getTime()
        );
      }

      setRegistrations(regs);
    } catch (err: any) {
      console.error("Error fetching registrations:", err);
      setError(
        "Failed to load registrations. Please refresh the page or try again later."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (registration: SchoolRegistration) => {
    if (!profile?.email) return;

    try {
      setProcessingId(registration.id);
      
      // Generate secure token for school admin registration
      const token = await SecureRegistrationService.createSchoolAdminToken(
        registration.id,
        registration.principalEmail,
        registration.name,
        profile.email
      );

      // Generate registration URL
      const regUrl = SecureRegistrationService.generateRegistrationUrl(token);
      
      const docRef = doc(db, "schools", registration.id);

      await updateDoc(docRef, {
        reviewStatus: "approved",
        registrationStatus: "approved",
        reviewNotes,
        reviewedBy: profile.email,
        reviewedAt: new Date().toISOString(),
        adminRegistrationToken: token,
        adminRegistrationUrl: regUrl,
      });

      // Set the token and URL for display
      setGeneratedToken(token);
      setRegistrationUrl(regUrl);

      // Remove from pending list
      setRegistrations((prev) => prev.filter((r) => r.id !== registration.id));
      
      // Don't close the modal immediately - show the token info
      setReviewNotes("");
    } catch (err: any) {
      console.error("Error approving registration:", err);
      
      // Provide more specific error messages
      let errorMessage = "Failed to approve registration";
      
      if (err.message?.includes("Permission denied")) {
        errorMessage = "Permission denied: You don't have the required permissions. Please ensure you have developer privileges.";
      } else if (err.message?.includes("Service temporarily unavailable")) {
        errorMessage = "Service temporarily unavailable. Please try again in a few moments.";
      } else if (err.message) {
        errorMessage = `Failed to approve registration: ${err.message}`;
      }
      
      setError(errorMessage);
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (registration: SchoolRegistration) => {
    if (!profile?.email || !reviewNotes.trim()) {
      setError("Please provide rejection reason in review notes");
      return;
    }

    try {
      setProcessingId(registration.id);
      const docRef = doc(db, "schools", registration.id);

      await updateDoc(docRef, {
        reviewStatus: "rejected",
        registrationStatus: "rejected",
        reviewNotes,
        reviewedBy: profile.email,
        reviewedAt: new Date().toISOString(),
      });

      // Remove from pending list
      setRegistrations((prev) => prev.filter((r) => r.id !== registration.id));
      setSelectedRegistration(null);
      setReviewNotes("");
    } catch (err: any) {
      console.error("Error rejecting registration:", err);
      setError("Failed to reject registration");
    } finally {
      setProcessingId(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const closeModal = () => {
    setSelectedRegistration(null);
    setReviewNotes("");
    setError(null);
    setGeneratedToken(null);
    setRegistrationUrl(null);
  };

  if (loading) {
    return (
      <div className="review-container">
        <div className="loading">Loading school registrations...</div>
      </div>
    );
  }

  return (
    <div className="review-container">
      <div className="review-header">
        <div className="header-top">
          <button
            className="back-button"
            onClick={() => navigate("/developer-dashboard")}
            title="Back to Developer Dashboard"
          >
            ← Back
          </button>
          <h1>School Registration Review</h1>
        </div>
        <p>Review and approve/reject school registration requests</p>
      </div>

      {error && (
        <div className="error-message">
          {error}
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}

      {registrations.length === 0 ? (
        <div className="no-registrations">
          <h3>No Pending Registrations</h3>
          <p>All school registration requests have been processed.</p>
        </div>
      ) : (
        <div className="registrations-grid">
          {registrations.map((registration) => (
            <div key={registration.id} className="registration-card">
              <div className="card-header">
                <h3>{registration.name}</h3>
                <span className="school-type">{registration.type}</span>
              </div>

              <div className="card-content">
                <div className="info-row">
                  <strong>Principal Email:</strong>{" "}
                  {registration.principalEmail}
                </div>
                <div className="info-row">
                  <strong>Address:</strong>
                  <div className="address">
                    {registration.address}
                    <br />
                    {registration.address2 && `${registration.address2}<br/>`}
                    {registration.address3 && `${registration.address3}<br/>`}
                  </div>
                </div>
                {registration.hasMultipleCampuses === "Yes" && (
                  <div className="info-row">
                    <strong>Campuses:</strong> {registration.campuses}
                  </div>
                )}
                <div className="info-row">
                  <strong>Submitted:</strong>{" "}
                  {formatDate(registration.submittedAt)}
                </div>
              </div>

              <div className="card-actions">
                <button
                  className="btn-review"
                  onClick={() => setSelectedRegistration(registration)}
                >
                  Review
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedRegistration && (
        <div className="review-modal">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Review: {selectedRegistration.name}</h2>
              <button className="close-btn" onClick={closeModal}>
                ×
              </button>
            </div>

            <div className="modal-body">
              <div className="registration-details">
                <h3>School Details</h3>
                <div className="detail-grid">
                  <div>
                    <strong>Name:</strong> {selectedRegistration.name}
                  </div>
                  <div>
                    <strong>Type:</strong> {selectedRegistration.type}
                  </div>
                  <div>
                    <strong>Principal Email:</strong>{" "}
                    {selectedRegistration.principalEmail}
                  </div>
                  <div>
                    <strong>Multiple Campuses:</strong>{" "}
                    {selectedRegistration.hasMultipleCampuses}
                  </div>
                  {selectedRegistration.hasMultipleCampuses === "Yes" && (
                    <div>
                      <strong>Campus Details:</strong>{" "}
                      {selectedRegistration.campuses}
                    </div>
                  )}
                </div>

                <div className="address-section">
                  <strong>Address:</strong>
                  <div className="address">
                    {selectedRegistration.address}
                    <br />
                    {selectedRegistration.address2 &&
                      `${selectedRegistration.address2}<br/>`}
                    {selectedRegistration.address3}
                  </div>
                </div>
              </div>

              {!registrationUrl && (
                <div className="review-section">
                  <h3>Review Notes</h3>
                  <textarea
                    value={reviewNotes}
                    onChange={(e) => setReviewNotes(e.target.value)}
                    placeholder="Add notes about this registration (required for rejection)..."
                    rows={4}
                  />
                </div>
              )}

              {/* Show token information after approval */}
              {registrationUrl && (
                <div className="token-section">
                  <h3>✅ School Approved - Admin Registration Ready</h3>
                  <div className="token-info">
                    <p>
                      The school has been approved! Share the secure registration link below with the principal at{" "}
                      <strong>{selectedRegistration?.principalEmail}</strong> to create their admin account:
                    </p>
                    
                    <div className="url-display">
                      <label>Secure Registration URL:</label>
                      <div className="url-container">
                        <input
                          type="text"
                          value={registrationUrl}
                          readOnly
                          className="token-url"
                        />
                        <button
                          className="copy-btn"
                          onClick={() => {
                            navigator.clipboard.writeText(registrationUrl);
                            // Could add a toast notification here
                          }}
                        >
                          Copy
                        </button>
                      </div>
                    </div>

                    <div className="token-instructions">
                      <h4>Instructions:</h4>
                      <ol>
                        <li>Copy the secure registration URL above</li>
                        <li>Send it securely to the principal via email or other secure communication</li>
                        <li>The principal will use this URL to create their admin account</li>
                        <li>The URL expires in 48 hours for security</li>
                        <li>Once the principal completes registration, they can log in and start managing their school</li>
                      </ol>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="modal-actions">
              {!registrationUrl ? (
                <>
                  <button
                    className="btn-approve"
                    onClick={() => handleApprove(selectedRegistration)}
                    disabled={processingId === selectedRegistration.id}
                  >
                    {processingId === selectedRegistration.id
                      ? "Approving..."
                      : "Approve"}
                  </button>
                  <button
                    className="btn-reject"
                    onClick={() => handleReject(selectedRegistration)}
                    disabled={processingId === selectedRegistration.id}
                  >
                    {processingId === selectedRegistration.id
                      ? "Rejecting..."
                      : "Reject"}
                  </button>
                </>
              ) : (
                <button className="btn-primary" onClick={closeModal}>
                  Done
                </button>
              )}
              <button className="btn-cancel" onClick={closeModal}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SchoolRegistrationReview;
