import React, { useState } from "react";
import Modal from "../Modal/Modal";
import "./Sidebar.css";
import { useTranslation } from "react-i18next";

type Award = {
  title: string;
  description?: string;
  date: string;
};

type Activity = {
  id: string;
  name: string;
  description?: string;
  teacher?: string;
  createdAt?: string;
};

type Profile = {
  name?: string;
};

type Props = {
  profile: Profile | null;
  homeroomTeacher: string;
  totalDemeritPoints: number;
  onShowDemeritHistory: () => void;
  awards: Award[];
  activities?: Activity[];
  onSignOut: () => Promise<void>;
  onOpenSettings: () => void;
};

const Sidebar: React.FC<Props> = ({
  profile,
  homeroomTeacher,
  totalDemeritPoints,
  onShowDemeritHistory,
  awards,
  activities = [],
  onSignOut,
  onOpenSettings,
}) => {
  const { t } = useTranslation();

  return (
    <aside className="sdash-sidebar">
      {/* Avatar */}
      <div className="sdash-avatar">
        <span>
          {profile?.name
            ? profile.name
                .split(" ")
                .map((n: string) => n[0])
                .join("")
                .slice(0, 2)
                .toUpperCase()
            : "ST"}
        </span>
      </div>
      {/* Name and role */}
      <div className="sdash-student-name">{profile?.name || t("student")}</div>
      <div className="sdash-student-role">{t("student")}</div>
      {/* Homeroom teacher */}
      <div className="sdash-homeroom">
        {t("homeroom_teacher")}:{" "}
        <span className="sdash-homeroom-name">
          {homeroomTeacher || t("n_a")}
        </span>
      </div>
      {/* Demerit points */}
      <div className="sdash-demerit-points-main">
        {t("demerit_points")}: {totalDemeritPoints}
      </div>
      <button
        className="sdash-demerit-history-btn"
        onClick={onShowDemeritHistory}
      >
        {t("demerit_history")}
      </button>
      {/* Awards */}
      <div className="sdash-awards-section">
        <div className="sdash-section-title sdash-awards-title">
          {t("awards")}
        </div>
        {awards.length === 0 ? (
          <div className="sdash-muted">{t("no_awards_yet")}</div>
        ) : (
          <ul className="sdash-awards-list">
            {awards.map((award, idx) => (
              <li key={idx} className="sdash-awards-item">
                <span className="sdash-awards-name">{award.title}</span>
                {award.date ? (
                  <span className="sdash-awards-date">({award.date})</span>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>
      {/* Activities */}
      <div className="sdash-activities-section">
        <div className="sdash-section-title sdash-activities-title">
          {t("my_activities")}
        </div>
        {activities && activities.length === 0 ? (
          <div className="sdash-muted">{t("no_activities_joined")}</div>
        ) : (
          <ul className="sdash-activities-list">
            {activities &&
              activities.map((activity, idx) => (
                <li key={activity.id || idx} className="sdash-activities-item">
                  <span className="sdash-activities-name">{activity.name}</span>
                  {activity.createdAt ? (
                    <span className="sdash-activities-date">
                      ({activity.createdAt})
                    </span>
                  ) : null}
                  {activity.description ? (
                    <div className="sdash-activities-desc">
                      {activity.description}
                    </div>
                  ) : null}
                </li>
              ))}
          </ul>
        )}
      </div>
      {/* Settings button just before logout */}
      <button className="sdash-settings-btn" onClick={onOpenSettings}>
        {t("settings")}
      </button>
      {/* Logout button */}
      <button className="sdash-logout" onClick={onSignOut}>
        {t("logout")}
      </button>
    </aside>
  );
};

export default Sidebar;
