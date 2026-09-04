// Part 29/4 — dashboard aggregates, computed server-side by
// GET /api/admin/stats/dashboard. The UI only renders what it receives.
import { useCallback, useEffect, useState } from "react";
import { HAS_API, apiFetch } from "./api";

export type UpcomingActivity = {
  id: string;
  kind: "news" | "competition";
  title: string;
  subtitle: string;
  date: string; // yyyy-MM-dd
  dateHijri: string | null;
};

export type DashboardSeriesPoint = {
  day: string;
  attendanceRate: number;
  attendanceRecorded: number;
  newStudents: number;
  memorized: number;
};

export type DashboardLatestGroup = {
  id: string;
  number: number;
  courseId: string;
  courseTitle: string;
  category: string;
  type: string;
  instructorName: string | null;
  studentCount: number;
};

export type DashboardData = {
  students: number;
  instructors: number;
  activeGroups: number;
  activeSummerCourses: number;
  upcoming: UpcomingActivity[];
  series: DashboardSeriesPoint[];
  memorization: { completed: number; inProgress: number; notStarted: number; total: number };
  topStudents: { id: string; fullName: string; hizbCompleted: number }[];
  latestGroups: DashboardLatestGroup[];
};

export function useDashboardData() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(HAS_API);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!HAS_API) { setLoading(false); return; }
    try {
      const next = await apiFetch<DashboardData>("/api/admin/stats/dashboard");
      setData(next);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void reload(); }, [reload]);

  return { data, loading, error, reload };
}
