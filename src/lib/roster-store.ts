// Part 27: course roster (which student belongs to which group of a course).
import { ApiError, apiFetch } from "./api";
import { noticeToast } from "./notice-toast";

export type RosterStudent = {
  enrollmentId: string;
  id: string;
  fullName: string;
  username: string;
  phone: string | null;
  /** Part 39 — frozen member number of the student (STU-000001). */
  memberId: string | null;
};

export type RosterGroup = {
  id: string;
  number: number;
  room: string | null;
  capacity: number;
  hizbCount: number;
  days: number[];
  timeFrom: string | null;
  timeTo: string | null;
  instructorId: string | null;
  instructorName: string | null;
  levelId: string | null;
  levelName: string | null;
  students: RosterStudent[];
};

export type CourseRoster = {
  id: string;
  title: string;
  category: "children" | "women" | "men" | "training" | "summer";
  type: "quran" | "fiqh" | "training" | "summer" | null;
  level: string | null;
  groups: RosterGroup[];
};

export type AvailableStudent = {
  id: string;
  fullName: string;
  username: string;
  phone: string | null;
};

/** Part 28/2 — advisory student-level schedule conflict info from the API. */
export type StudentScheduleConflict = {
  studentId: string;
  fullName: string;
  conflicts: string[];
};

export type AddStudentsResult =
  | { status: "done"; count: number; skipped: number }
  | { status: "conflict"; message: string; conflicts: StudentScheduleConflict[] };

export type ConflictMode = "check" | "force" | "skipConflicting";

// Business-rule rejections (409) must be impossible to miss: large centered
// notice dialog, dismissed manually by the admin.
async function reportError(e: unknown, fallbackPrefix: string) {
  const err = e as ApiError;
  if (err instanceof ApiError && err.status === 409) {
    noticeToast({ variant: "warning", title: "تعذّرت العملية", message: err.message });
    return;
  }
  const { toast } = await import("sonner");
  toast.error(`${fallbackPrefix}: ${(e as Error).message}`);
}

export const rosterActions = {
  getRoster(courseId: string) {
    return apiFetch<CourseRoster>(`/api/admin/courses/${courseId}/roster`);
  },
  availableStudents(courseId: string, search = "") {
    const qs = search ? `?search=${encodeURIComponent(search)}` : "";
    return apiFetch<AvailableStudent[]>(`/api/admin/courses/${courseId}/available-students${qs}`);
  },
  async addStudents(groupId: string, studentIds: string[]) {
    return rosterActions.addStudentsWithMode(groupId, studentIds, "check");
  },
  async addStudentsWithMode(
    groupId: string,
    studentIds: string[],
    conflictMode: ConflictMode,
  ): Promise<AddStudentsResult> {
    if (studentIds.length === 0) return { status: "done", count: 0, skipped: 0 };
    try {
      const res = await apiFetch<{ count: number; skipped?: number }>(
        `/api/admin/course-groups/${groupId}/enrollments`,
        { method: "POST", body: JSON.stringify({ studentIds, conflictMode }) },
      );
      return { status: "done", count: res.count ?? 0, skipped: res.skipped ?? 0 };
    } catch (e) {
      const err = e as ApiError;
      // Student schedule conflicts are advisory: hand them back to the caller
      // so the admin can choose between "add everyone" and "add the rest".
      if (err instanceof ApiError && err.status === 409 && err.body?.code === "STUDENT_SCHEDULE_CONFLICT") {
        return {
          status: "conflict",
          message: err.message,
          conflicts: (err.body.conflicts as StudentScheduleConflict[]) ?? [],
        };
      }
      await reportError(e, "تعذّر إضافة التلاميذ");
      throw e;
    }
  },
  async removeEnrollment(enrollmentId: string) {
    try {
      await apiFetch(`/api/admin/enrollments/${enrollmentId}`, { method: "DELETE" });
    } catch (e) { await reportError(e, "تعذّر إزالة التلميذ"); throw e; }
  },
};
