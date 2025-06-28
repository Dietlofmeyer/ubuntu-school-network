import React from "react";
import { useTranslation } from "react-i18next";

type Activity = {
  name: string;
  description?: string;
  date: string;
};

type Props = {
  activities: Activity[];
};

const ExtracurricularList: React.FC<Props> = ({ activities }) => {
  const { t } = useTranslation();

  return (
    <div className="sdash-section">
      <div className="sdash-section-title">
        {t("extracurricular_activities")}
      </div>
      {activities.length === 0 ? (
        <div className="sdash-muted">{t("no_extracurricular_yet")}</div>
      ) : (
        <ul className="sdash-activity-list">
          {activities.map((activity, idx) => (
            <li key={idx} className="sdash-activity-item">
              <span className="sdash-activity-name">{activity.name}</span>
              {activity.date ? (
                <span className="sdash-activity-date">
                  (
                  {new Date(activity.date).toLocaleDateString(undefined, {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                  )
                </span>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default ExtracurricularList;
