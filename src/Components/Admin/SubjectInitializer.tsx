import React, { useState } from "react";
import { useAuth } from "../../AuthContext";
import { initializeAvailableSubjects } from "../../utils/initializeSubjects";

const SubjectInitializer: React.FC = () => {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string>("");

  const handleInitialize = async () => {
    if (!profile?.schoolId) {
      setMessage("❌ No school ID found in profile");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      await initializeAvailableSubjects(profile.schoolId);
      setMessage("✅ Successfully initialized available subjects!");
    } catch (error) {
      setMessage("❌ Error initializing subjects.");
    } finally {
      setLoading(false);
    }
  };

  const handleCheck = async () => {
    if (!profile?.schoolId) {
      setMessage("❌ No school ID found in profile");
      return;
    }

    setMessage("✅ Check functionality has been removed for production.");
  };

  return (
    <div
      style={{
        padding: "20px",
        border: "2px solid #007bff",
        borderRadius: "8px",
        margin: "20px 0",
        backgroundColor: "#f8f9fa",
      }}
    >
      <h3>🔧 Subject System Setup</h3>
      <p>Use these tools to set up the POPIA-compliant subject system:</p>

      <div style={{ marginBottom: "10px" }}>
        <button
          onClick={handleCheck}
          disabled={loading}
          style={{
            padding: "10px 15px",
            marginRight: "10px",
            backgroundColor: "#17a2b8",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: loading ? "not-allowed" : "pointer",
          }}
        >
          {loading ? "Checking..." : "1. Check Teacher Subjects"}
        </button>

        <button
          onClick={handleInitialize}
          disabled={loading}
          style={{
            padding: "10px 15px",
            backgroundColor: "#28a745",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: loading ? "not-allowed" : "pointer",
          }}
        >
          {loading ? "Initializing..." : "2. Initialize Subject Collection"}
        </button>
      </div>

      {message && (
        <div
          style={{
            padding: "10px",
            borderRadius: "4px",
            backgroundColor: message.startsWith("✅") ? "#d4edda" : "#f8d7da",
            color: message.startsWith("✅") ? "#155724" : "#721c24",
            border: `1px solid ${
              message.startsWith("✅") ? "#c3e6cb" : "#f5c6cb"
            }`,
          }}
        >
          {message}
        </div>
      )}

      <div style={{ marginTop: "15px", fontSize: "14px", color: "#666" }}>
        <strong>Instructions:</strong>
        <ol>
          <li>First, assign subjects to teachers in the admin dashboard</li>
          <li>
            Click "Check Teacher Subjects" to see what subjects teachers have
          </li>
          <li>
            Click "Initialize Subject Collection" to create the
            availableSubjects collection
          </li>
          <li>Students will now be able to see available subjects</li>
        </ol>
        <p>
          <strong>Note:</strong> This component can be removed after setup is
          complete.
        </p>
      </div>
    </div>
  );
};

export default SubjectInitializer;
