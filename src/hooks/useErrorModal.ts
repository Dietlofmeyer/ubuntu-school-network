import { useState } from "react";

interface ErrorInfo {
  title: string;
  message: string;
  technical?: string;
  stackTrace?: string;
  context?: string;
}

export const useErrorModal = () => {
  const [errorModal, setErrorModal] = useState<{
    isOpen: boolean;
    error: ErrorInfo | null;
  }>({
    isOpen: false,
    error: null,
  });

  const showError = (error: ErrorInfo) => {
    setErrorModal({
      isOpen: true,
      error,
    });
  };

  const hideError = () => {
    setErrorModal({
      isOpen: false,
      error: null,
    });
  };

  // Helper function to show error from caught exception
  const showErrorFromException = (
    err: any,
    title: string,
    context?: string
  ) => {
    const error = err as Error;
    showError({
      title,
      message: error.message || "An unexpected error occurred",
      technical: error.message,
      stackTrace: error.stack,
      context,
    });
  };

  // Helper function to show custom error
  const showCustomError = (
    title: string,
    message: string,
    context?: string
  ) => {
    showError({
      title,
      message,
      context,
    });
  };

  return {
    errorModal: errorModal.isOpen ? errorModal.error : null,
    isErrorModalOpen: errorModal.isOpen,
    showError,
    showErrorFromException,
    showCustomError,
    hideError,
  };
};
