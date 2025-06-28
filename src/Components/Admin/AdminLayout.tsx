import React, { useState, useEffect } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import "./AdminDashboard.css";

const navLinks = [
  { to: "/admin-dashboard", label: "Dashboard" },
  { to: "/admin-dashboard/personnel", label: "Admin Personnel" },
  { to: "/admin-dashboard/guardians", label: "Guardians & Students" },
  { to: "/admin-dashboard/users", label: "User Management" },
  { to: "/admin-dashboard/homeroom", label: "Homeroom Management" },
  { to: "/admin-dashboard/academic-reporting", label: "Academic Reports" },
  { to: "/admin-dashboard/awards", label: "Award Management" },
  { to: "/admin-dashboard/activities", label: "Activity Management" },
];

const AdminLayout: React.FC = () => {
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkScreenSize = () => {
      const mobile = window.innerWidth <= 900;
      setIsMobile(mobile);
      // Close mobile menu when switching to desktop
      if (!mobile) {
        setIsMobileMenuOpen(false);
      }
    };

    checkScreenSize();
    window.addEventListener("resize", checkScreenSize);
    return () => window.removeEventListener("resize", checkScreenSize);
  }, []);

  // Close mobile menu when navigation occurs
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  return (
    <div className="admin-layout">
      {/* Mobile Header with Hamburger Menu */}
      {isMobile && (
        <div className="admin-mobile-header">
          <h2 className="admin-mobile-title">Admin Dashboard</h2>
          <button
            className={`admin-hamburger ${isMobileMenuOpen ? "active" : ""}`}
            onClick={toggleMobileMenu}
            aria-label="Toggle navigation menu"
          >
            <span></span>
            <span></span>
            <span></span>
          </button>
        </div>
      )}

      {/* Sidebar - Desktop always visible, Mobile toggleable */}
      <aside
        className={`admin-sidebar ${
          isMobile ? (isMobileMenuOpen ? "mobile-open" : "mobile-closed") : ""
        }`}
      >
        <h2 className="admin-sidebar-title">Admin</h2>
        <nav>
          <ul>
            {navLinks.map((link) => (
              <li key={link.to}>
                <Link
                  to={link.to}
                  className={
                    location.pathname === link.to
                      ? "admin-nav-link active"
                      : "admin-nav-link"
                  }
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </aside>

      {/* Overlay for mobile menu */}
      {isMobile && isMobileMenuOpen && (
        <div
          className="admin-mobile-overlay"
          onClick={() => setIsMobileMenuOpen(false)}
        ></div>
      )}

      <main className={`admin-main-content ${isMobile ? "mobile-layout" : ""}`}>
        <Outlet />
      </main>
    </div>
  );
};

export default AdminLayout;
