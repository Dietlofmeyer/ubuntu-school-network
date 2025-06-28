import { useTranslation } from "react-i18next";
import "./StudentExtracurricularModal.css";

type Extracurricular = {
  id: string;
  name: string;
  description: string;
  teacher: string;
  createdAt: string;
};

type Props = {
  allExtracurriculars: Extracurricular[];
  signedUpIds: string[];
  onSignUp: (id: string) => void;
  onWithdraw: (id: string) => void;
  onClose: () => void;
};

function StudentExtracurricularModal({
  allExtracurriculars,
  signedUpIds,
  onSignUp,
  onWithdraw,
  onClose,
}: Props) {
  const { t } = useTranslation();

  return (
    <div className="student-extracurricular-modal-bg">
      <div className="student-extracurricular-modal">
        <div className="student-extracurricular-modal-title">
          {t("extracurricular_activities")}
        </div>
        <button
          className="student-extracurricular-modal-close"
          onClick={onClose}
          aria-label={t("close_modal")}
        >
          ×
        </button>
        {allExtracurriculars.length === 0 ? (
          <div className="student-extracurricular-empty">
            {t("no_extracurricular_available")}
          </div>
        ) : (
          <div className="student-extracurricular-list">
            {allExtracurriculars.map((activity) => {
              const isSignedUp = signedUpIds.includes(activity.id);
              return (
                <div className="student-extracurricular-card" key={activity.id}>
                  <div className="student-extracurricular-header">
                    <div className="student-extracurricular-name">
                      {activity.name}
                    </div>
                    <div className="student-extracurricular-teacher">
                      <span>
                        {t("by_teacher", { teacher: activity.teacher })}
                      </span>
                    </div>
                  </div>
                  <div className="student-extracurricular-desc">
                    {activity.description}
                  </div>
                  <div className="student-extracurricular-footer">
                    <span className="student-extracurricular-date">
                      {t("created")}: {activity.createdAt}
                    </span>
                    {isSignedUp ? (
                      <button
                        className="student-extracurricular-btn withdraw"
                        onClick={() => onWithdraw(activity.id)}
                      >
                        {t("withdraw")}
                      </button>
                    ) : (
                      <button
                        className="student-extracurricular-btn signup"
                        onClick={() => onSignUp(activity.id)}
                      >
                        {t("sign_up")}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default StudentExtracurricularModal;
