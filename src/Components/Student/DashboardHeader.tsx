import { useTranslation } from "react-i18next";

interface DashboardHeaderProps {
  dateString: string;
}

function DashboardHeader({ dateString }: DashboardHeaderProps) {
  const { t } = useTranslation();

  return (
    <div className="sdash-header">
      <div className="sdash-title">{t("student_dashboard")}</div>
      <div className="sdash-date">{dateString}</div>
    </div>
  );
}

export default DashboardHeader;
