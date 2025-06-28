import React from "react";

interface SidebarProps {
  teacherName: string;
  teacherEmail: string;
  onSettings: () => void;
  onLogout: () => void;
  onTemplates?: () => void;
  onAnalytics?: () => void;
  t: (key: string, options?: any) => string;
}

const Sidebar: React.FC<SidebarProps> = ({
  teacherName,
  teacherEmail,
  onSettings,
  onLogout,
  onTemplates,
  onAnalytics,
  t,
}) => {
  return (
    <aside className="tdash-sidebar">
      <div className="tdash-sidebar-avatar">
        {teacherName ? teacherName[0].toUpperCase() : "?"}
      </div>
      <div className="tdash-sidebar-info">
        <div className="tdash-sidebar-name">{teacherName}</div>
        <div className="tdash-sidebar-email">{teacherEmail}</div>
      </div>
      <div className="tdash-sidebar-actions">
        {onTemplates && (
          <button className="tdash-mob-btn" onClick={onTemplates}>
            📋 {t("mark_templates")}
          </button>
        )}
        {onAnalytics && (
          <button className="tdash-mob-btn" onClick={onAnalytics}>
            📊 {t("mark_analytics")}
          </button>
        )}
        <button className="tdash-mob-btn" onClick={onSettings}>
          {t("settings")}
        </button>
        <button className="tdash-mob-btn" onClick={onLogout}>
          {t("logout")}
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
