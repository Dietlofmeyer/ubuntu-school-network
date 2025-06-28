export type Mark = {
  subject: string;
  score: number;
  total: number;
  description: string;
  date: string;
  teacher: string;
};

export type Activity = {
  id: string;
  name: string;
  description: string;
  teacher: string;
  createdAt: string;
};

export type Award = {
  title: string;
  description?: string;
  date: string;
};

export type DemeritRecord = {
  points: number;
  reason: string;
  date: string;
  teacher: string;
};

export type Profile = {
  name?: string;
  language?: string;
};

export type ReportCard = {
  term: number;
  year: number;
  issuedAt: string;
  subjects: { subject: string; average: number | null; comment: string }[];
  demerits: number;
  teacher: string;
  grade?: string;
  homeroomClass?: string;
};
