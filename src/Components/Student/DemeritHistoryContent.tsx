import React from "react";
import { useTranslation } from "react-i18next";

type DemeritRecord = {
  points: number;
  reason: string;
  date: string;
  teacher: string;
};

type Props = {
  demerits: DemeritRecord[];
};

const DemeritHistoryContent: React.FC<Props> = ({ demerits }) => {
  const { t } = useTranslation();

  return (
    <>
      <h2 className="sdash-popup-title">{t("demerit_history")}</h2>
      {demerits.length === 0 ? (
        <div className="sdash-muted">{t("no_demerits_yet")}</div>
      ) : (
        <ul className="sdash-popup-list">
          {demerits.map((d, idx) => (
            <li key={idx} className="sdash-popup-listitem">
              <div className="sdash-demerit-points">
                {d.points} {d.points === 1 ? t("point") : t("points")}
              </div>
              <div className="sdash-popup-reason">{d.reason}</div>
              <div className="sdash-popup-date">
                {d.date
                  ? new Date(d.date).toLocaleDateString(undefined, {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : ""}
                {d.teacher ? ` — ${d.teacher}` : ""}
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
};

export default DemeritHistoryContent;
