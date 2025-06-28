import React, { Component, type ErrorInfo, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import BugReportModal from "./BugReportModal";
import "./ErrorBoundary.css";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showReportModal: boolean;
}

class ErrorBoundaryClass extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    showReportModal: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
      showReportModal: false,
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Error caught by boundary:", error, errorInfo);

    this.setState({
      error,
      errorInfo,
      hasError: true,
    });

    // Store error in session storage for error reporting
    const consoleErrors = JSON.parse(
      sessionStorage.getItem("consoleErrors") || "[]"
    );
    consoleErrors.push(
      `${new Date().toISOString()} - ${error.name}: ${error.message}`
    );
    sessionStorage.setItem(
      "consoleErrors",
      JSON.stringify(consoleErrors.slice(-20))
    ); // Keep last 20 errors
  }

  private handleShowReportModal = () => {
    this.setState({ showReportModal: true });
  };

  private handleCloseReportModal = () => {
    this.setState({ showReportModal: false });
  };

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <ErrorFallback
          error={this.state.error}
          errorInfo={this.state.errorInfo}
          onReload={this.handleReload}
          onReport={this.handleShowReportModal}
          showReportModal={this.state.showReportModal}
          onCloseReportModal={this.handleCloseReportModal}
        />
      );
    }

    return this.props.children;
  }
}

interface ErrorFallbackProps {
  error: Error | null;
  errorInfo: ErrorInfo | null;
  onReload: () => void;
  onReport: () => void;
  showReportModal: boolean;
  onCloseReportModal: () => void;
}

const ErrorFallback: React.FC<ErrorFallbackProps> = ({
  error,
  errorInfo,
  onReload,
  onReport,
  showReportModal,
  onCloseReportModal,
}) => {
  const { t } = useTranslation();

  return (
    <div className="error-boundary-container">
      <div className="error-boundary-content">
        <div className="error-icon">⚠️</div>
        <h1>{t("errorReporting.somethingWentWrong")}</h1>
        <p>{t("errorReporting.errorBoundaryMessage")}</p>

        <details className="error-details">
          <summary>{t("errorReporting.technicalDetails")}</summary>
          <div className="error-stack">
            <h3>{t("errorReporting.errorMessage")}:</h3>
            <pre>{error?.message}</pre>

            <h3>{t("errorReporting.stackTrace")}:</h3>
            <pre>{error?.stack}</pre>

            {errorInfo && (
              <>
                <h3>{t("errorReporting.componentStack")}:</h3>
                <pre>{errorInfo.componentStack}</pre>
              </>
            )}
          </div>
        </details>

        <div className="error-actions">
          <button onClick={onReload} className="reload-button">
            {t("errorReporting.reloadPage")}
          </button>
          <button onClick={onReport} className="report-button">
            {t("errorReporting.reportError")}
          </button>
        </div>
      </div>

      {showReportModal && (
        <BugReportModal
          isOpen={showReportModal}
          onClose={onCloseReportModal}
          prefilledError={{
            title: `Application Error: ${error?.name || "Unknown Error"}`,
            description: `An unexpected error occurred in the application.`,
            errorMessage: error?.message,
            stackTrace: error?.stack,
          }}
        />
      )}
    </div>
  );
};

// Wrapper component to use hooks
const ErrorBoundary: React.FC<Props> = ({ children, fallback }) => {
  return (
    <ErrorBoundaryClass fallback={fallback}>{children}</ErrorBoundaryClass>
  );
};

export default ErrorBoundary;
