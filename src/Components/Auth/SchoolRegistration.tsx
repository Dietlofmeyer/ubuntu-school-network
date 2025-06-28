import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { collection, addDoc } from "firebase/firestore";
import { db } from "../../firebase";
import "./SchoolRegistration.css";

type SchoolDetails = {
  name: string;
  type: string;
  address: string;
  address2: string;
  address3: string;
  hasMultipleCampuses: string;
  campuses?: string;
};

type Step = 1 | 2 | 3;

const SchoolRegistration: React.FC = () => {
  const [step, setStep] = useState<Step>(1);
  const [school, setSchool] = useState<SchoolDetails>({
    name: "",
    type: "",
    address: "",
    address2: "",
    address3: "",
    hasMultipleCampuses: "No",
    campuses: "",
  });
  const [principalEmail, setPrincipalEmail] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const navigate = useNavigate();

  const handleSchoolChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setSchool((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handlePrincipalEmailChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setPrincipalEmail(e.target.value);
  };

  const nextStep = () => setStep((s) => (s < 3 ? ((s + 1) as Step) : s));
  const prevStep = () => setStep((s) => (s > 1 ? ((s - 1) as Step) : s));

  const showCampusField = school.hasMultipleCampuses === "Yes";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // Create a new school registration request for developer review
      const schoolDoc = {
        ...school,
        principalEmail: principalEmail.trim().toLowerCase(),
        createdAt: new Date().toISOString(),
        registrationStatus: "pending_developer_approval",
        submittedAt: new Date().toISOString(),
        reviewStatus: "pending",
        reviewNotes: null,
        reviewedBy: null,
        reviewedAt: null,
      };

      await addDoc(collection(db, "schools"), schoolDoc);

      setSuccess(true);
      setTimeout(() => {
        navigate("/"); // Redirect to homepage (App.tsx)
      }, 2500);
    } catch (err: any) {
      setError(err.message || "Registration failed. Please try again.");
    }
    setLoading(false);
  };

  return (
    <div className="school-registration-container dark-theme">
      <form className="school-registration-form" onSubmit={handleSubmit}>
        {/* Step 1: School Details */}
        {step === 1 && (
          <div>
            <h2>School Details</h2>
            <label>
              School Name
              <input
                type="text"
                name="name"
                value={school.name}
                onChange={handleSchoolChange}
                required
              />
            </label>
            <label>
              School Type
              <select
                name="type"
                value={school.type}
                onChange={handleSchoolChange}
                required
              >
                <option value="">Select type</option>
                <option value="Public">Public</option>
                <option value="Private">Private</option>
                <option value="Other">Other</option>
              </select>
            </label>
            <label>
              Address Line 1
              <input
                type="text"
                name="address"
                value={school.address}
                onChange={handleSchoolChange}
                required
              />
            </label>
            <label>
              Address Line 2
              <input
                type="text"
                name="address2"
                value={school.address2}
                onChange={handleSchoolChange}
              />
            </label>
            <label>
              Address Line 3
              <input
                type="text"
                name="address3"
                value={school.address3}
                onChange={handleSchoolChange}
              />
            </label>
            <label>
              Does your school have multiple campuses?
              <select
                name="hasMultipleCampuses"
                value={school.hasMultipleCampuses}
                onChange={handleSchoolChange}
              >
                <option value="No">No</option>
                <option value="Yes">Yes</option>
              </select>
            </label>
            {showCampusField && (
              <label>
                Campus Details
                <input
                  type="text"
                  name="campuses"
                  value={school.campuses}
                  onChange={handleSchoolChange}
                  placeholder="List campus names/locations"
                />
              </label>
            )}
            <div className="form-navigation">
              <button type="button" onClick={nextStep}>
                Next
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Principal Email */}
        {step === 2 && (
          <div>
            <h2>Principal Details</h2>
            <label>
              Principal Email Address
              <input
                type="email"
                name="principalEmail"
                value={principalEmail}
                onChange={handlePrincipalEmailChange}
                required
              />
            </label>
            <div className="form-navigation">
              <button type="button" onClick={prevStep}>
                Back
              </button>
              <button type="button" onClick={nextStep}>
                Next
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Summary/Review */}
        {step === 3 && (
          <div>
            <h2>Review & Submit</h2>
            <div className="summary-section">
              <h3>School Details</h3>
              <p>
                <strong>Name:</strong> {school.name}
              </p>
              <p>
                <strong>Type:</strong> {school.type}
              </p>
              <p>
                <strong>Address:</strong> {school.address}
                {school.address2 && <span>, {school.address2}</span>}
                {school.address3 && <span>, {school.address3}</span>}
              </p>
              <p>
                <strong>Multiple Campuses:</strong> {school.hasMultipleCampuses}
              </p>
              {showCampusField && (
                <p>
                  <strong>Campuses:</strong> {school.campuses}
                </p>
              )}
              <h3>Principal Details</h3>
              <p>
                <strong>Email:</strong> {principalEmail}
              </p>
            </div>
            <label className="terms-checkbox">
              <input
                type="checkbox"
                checked={termsAccepted}
                onChange={(e) => setTermsAccepted(e.target.checked)}
                required
              />
              I agree to the terms and conditions
            </label>
            <div className="form-navigation">
              <button type="button" onClick={prevStep}>
                Back
              </button>
              <button type="submit" disabled={!termsAccepted || loading}>
                {loading ? "Registering..." : "Register School"}
              </button>
            </div>
            {error && <div className="error-message">{error}</div>}
            {success && (
              <div className="success-message">
                <h3>Registration Submitted Successfully!</h3>
                <p>
                  Your school registration has been submitted for review. Our
                  development team will review your application and get back to
                  you within 2-3 business days.
                </p>
                <p>
                  You will receive an email notification once your registration
                  is approved.
                </p>
              </div>
            )}
          </div>
        )}
      </form>
    </div>
  );
};

export default SchoolRegistration;
