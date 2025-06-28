import LatestMarks from "./LatestMarks";
import CoursesGrid from "./CoursesGrid";
import type { Mark } from "./types";

interface AcademicSectionProps {
  latestMarks: Mark[];
  subjects: string[];
  getSubjectIcon: (subject: string) => string;
  averageBySubject: { [subject: string]: number | null };
}

function AcademicSection({
  latestMarks,
  subjects,
  getSubjectIcon,
  averageBySubject,
}: AcademicSectionProps) {
  return (
    <div className="sdash-section-container">
      {/* Latest Marks Section */}
      <LatestMarks marks={latestMarks} />

      {/* Courses Grid Section */}
      <CoursesGrid
        subjects={subjects}
        getSubjectIcon={getSubjectIcon}
        averageBySubject={averageBySubject}
      />
    </div>
  );
}

export default AcademicSection;
