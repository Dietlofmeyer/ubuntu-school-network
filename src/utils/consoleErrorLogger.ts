// Console Error Logger for Error Reporting
// This sets up global error capturing for the error reporting system

export const setupConsoleErrorLogging = () => {
  // Store console errors in session storage for error reporting
  const storeConsoleError = (message: string) => {
    try {
      const errors = JSON.parse(
        sessionStorage.getItem("consoleErrors") || "[]"
      );
      const timestamp = new Date().toISOString();
      const errorEntry = `${timestamp} - ${message}`;

      errors.push(errorEntry);

      // Keep only the last 20 errors to prevent storage overflow
      if (errors.length > 20) {
        errors.shift();
      }

      sessionStorage.setItem("consoleErrors", JSON.stringify(errors));
    } catch (e) {
      // Silently fail if session storage is not available
    }
  };

  // Override console.error to capture errors
  const originalConsoleError = console.error;
  console.error = (...args: any[]) => {
    originalConsoleError.apply(console, args);

    // Convert arguments to string and store
    const message = args
      .map((arg) =>
        typeof arg === "object" ? JSON.stringify(arg, null, 2) : String(arg)
      )
      .join(" ");

    storeConsoleError(`ERROR: ${message}`);
  };

  // Override console.warn to capture warnings
  const originalConsoleWarn = console.warn;
  console.warn = (...args: any[]) => {
    originalConsoleWarn.apply(console, args);

    const message = args
      .map((arg) =>
        typeof arg === "object" ? JSON.stringify(arg, null, 2) : String(arg)
      )
      .join(" ");

    storeConsoleError(`WARN: ${message}`);
  };

  // Global error handler for unhandled errors
  window.addEventListener("error", (event) => {
    const errorMessage = `Unhandled Error: ${
      event.error?.message || event.message
    } at ${event.filename}:${event.lineno}:${event.colno}`;
    storeConsoleError(errorMessage);
  });

  // Global handler for unhandled promise rejections
  window.addEventListener("unhandledrejection", (event) => {
    const errorMessage = `Unhandled Promise Rejection: ${event.reason}`;
    storeConsoleError(errorMessage);
  });

  // Clean up old errors on page load
  const cleanOldErrors = () => {
    try {
      const errors = JSON.parse(
        sessionStorage.getItem("consoleErrors") || "[]"
      );
      const oneHourAgo = Date.now() - 60 * 60 * 1000;

      const recentErrors = errors.filter((error: string) => {
        const timestamp = error.split(" - ")[0];
        try {
          return new Date(timestamp).getTime() > oneHourAgo;
        } catch {
          return false;
        }
      });

      sessionStorage.setItem("consoleErrors", JSON.stringify(recentErrors));
    } catch (e) {
      // Silently fail
    }
  };

  // Clean on setup
  cleanOldErrors();

  // Clean every 10 minutes
  setInterval(cleanOldErrors, 10 * 60 * 1000);
};

export const getStoredConsoleErrors = (): string[] => {
  try {
    return JSON.parse(sessionStorage.getItem("consoleErrors") || "[]");
  } catch {
    return [];
  }
};

export const clearStoredConsoleErrors = () => {
  try {
    sessionStorage.removeItem("consoleErrors");
  } catch {
    // Silently fail
  }
};
