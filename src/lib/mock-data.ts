// Type definitions + shared labels for the public space.
// The runtime data now lives in the real database (see backend/src/routes/public.js);
// the stores in src/lib/*-store.ts fetch it on demand and cache in localStorage.

export type Course = {
  id: string;
  title: string;
  category: "children" | "women" | "men" | "training" | "summer";
  level: string;
  schedule: string;
  instructor: string | null;
  capacity: number;
  enrolled: number;
  startDate?: string | null;
  endDate?: string | null;
};

export type NewsItem = {
  id: string;
  title: string;
  excerpt: string;
  body: string;
  dateGregorian: string;
  dateHijri: string;
  tag: "خبر" | "مناسبة دينية" | "إعلان" | string;
  /** Part 29/3 — real sortable date (yyyy-MM-dd) used by the dashboard. */
  eventDate?: string | null;
};

export type CompetitionResult = {
  id: string;
  name: string;
  level: "محلية" | "جهوية" | "وطنية" | string;
  year: number;
  participants: number;
  passed: number;
  passRate: number;
  topThree: { rank: number; name: string; category: string }[];
};

export type GalleryItem = {
  id: string;
  title: string;
  date: string;
  url: string;
  imageSeed?: number;
};

export type BoardMember = {
  name: string;
  role: string;
  initials: string;
};

export const CATEGORY_LABEL: Record<Course["category"], string> = {
  children: "أطفال",
  women: "نساء",
  men: "رجال",
  training: "تكوين معلمين",
  summer: "دورة صيفية",
};

// Empty defaults — kept to avoid breaking any straggling imports.
// Real data comes from the backend via the stores in src/lib/*-store.ts.
export const COURSES: Course[] = [];
export const NEWS: NewsItem[] = [];
export const COMPETITIONS: CompetitionResult[] = [];
export const GALLERY: GalleryItem[] = [];
export const BOARD: BoardMember[] = [];
