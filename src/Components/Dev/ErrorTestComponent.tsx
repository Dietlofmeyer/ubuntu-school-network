import React from "react";
import { useErrorModal } from "../../hooks/useErrorModal";
import { ErrorModal } from "../ErrorReporting";

const ErrorTestComponent: React.FC = () => {
  const {
    errorModal,
    isErrorModalOpen,
    showCustomError,
    showErrorFromException,
    hideError,
  } = useErrorModal();

  const simulateCustomError = () => {
    showCustomError(
      "Test Custom Error",
      "This is a test custom error to demonstrate the error modal functionality.",
      "User clicked 'Test Custom Error' button"
    );
  };

  const simulateExceptionError = () => {
    try {
      // Intentionally cause an error
      throw new Error("This is a test exception error with stack trace");
    } catch (err) {
      showErrorFromException(
        err,
        "Test Exception Error",
        "User clicked 'Test Exception Error' button"
      );
    }
  };

  const simulateConsoleError = () => {
    // Generate console errors for testing
    console.error("Test console error message");
    console.error("Test console error with object:", {
      test: true,
      value: 123,
    });
    console.warn("Test console warning message");

    showCustomError(
      "Console Errors Generated",
      "Console errors have been generated and should be included in the error report.",
      "User clicked 'Generate Console Errors' button"
    );
  };

  return (
    <div
      style={{
        padding: "20px",
        border: "2px solid #orange",
        borderRadius: "8px",
        margin: "20px",
      }}
    >
      <h3>🧪 Error Modal Testing Component</h3>
      <p>This component allows you to test the error modal functionality:</p>

      <div
        style={{
          display: "flex",
          gap: "10px",
          flexWrap: "wrap",
          marginTop: "15px",
        }}
      >
        <button
          onClick={simulateCustomError}
          style={{
            padding: "10px 15px",
            backgroundColor: "#ff6b6b",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          Test Custom Error
        </button>

        <button
          onClick={simulateExceptionError}
          style={{
            padding: "10px 15px",
            backgroundColor: "#ffa726",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          Test Exception Error
        </button>

        <button
          onClick={simulateConsoleError}
          style={{
            padding: "10px 15px",
            backgroundColor: "#66bb6a",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          Generate Console Errors
        </button>
      </div>

      {/* Error Modal */}
      {isErrorModalOpen && errorModal && (
        <ErrorModal
          isOpen={isErrorModalOpen}
          onClose={hideError}
          error={errorModal}
        />
      )}
    </div>
  );
};

export default ErrorTestComponent;
