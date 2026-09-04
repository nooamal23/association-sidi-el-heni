// Per-course groups store. Fetched on demand for a specific course.
import { useEffect, useState } from "react";
import { HAS_API, apiFetch } from "./api";

export type CourseGroup = {
  id: string;
  courseId: string;
  number: number;
  hizbCount: number;
  memberIds: string[];
  membersCount: number;
};

async function toastError(msg: string) {
  const { toast } = await import("sonner");
  toast.error(msg);
}

export function useCourseGroups(courseId: string | null) {
  const [groups, setGroups] = useState<CourseGroup[]>([]);
  const [loading, setLoading] = useState(false);

  async function reload() {
    if (!courseId || !HAS_API) { setGroups([]); return; }
    setLoading(true);
    try {
      const rows = await apiFetch<CourseGroup[]>(`/api/admin/courses/${courseId}/groups`);
      setGroups(rows);
    } catch (e) {
      console.warn("groups: load failed", e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void reload(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [courseId]);

  return { groups, loading, reload };
}

export const groupsActions = {
  async create(courseId: string, payload: { number?: number; hizbCount?: number }) {
    try {
      await apiFetch(`/api/admin/courses/${courseId}/groups`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
    } catch (e) {
      await toastError(`تعذّر إنشاء المجموعة: ${(e as Error).message}`);
      throw e;
    }
  },
  async update(courseId: string, groupId: string, patch: { number?: number; hizbCount?: number }) {
    try {
      await apiFetch(`/api/admin/courses/${courseId}/groups/${groupId}`, {
        method: "PUT",
        body: JSON.stringify(patch),
      });
    } catch (e) {
      await toastError(`تعذّر تحديث المجموعة: ${(e as Error).message}`);
    }
  },
  async remove(courseId: string, groupId: string) {
    try {
      await apiFetch(`/api/admin/courses/${courseId}/groups/${groupId}`, { method: "DELETE" });
    } catch (e) {
      await toastError(`تعذّر حذف المجموعة: ${(e as Error).message}`);
    }
  },
  async assign(courseId: string, studentId: string, groupId: string | null) {
    try {
      await apiFetch(`/api/admin/courses/${courseId}/assign-group`, {
        method: "POST",
        body: JSON.stringify({ studentId, groupId }),
      });
    } catch (e) {
      await toastError(`تعذّر تعيين المجموعة: ${(e as Error).message}`);
    }
  },
  async bulkAssign(courseId: string, studentIds: string[], groupId: string | null) {
    if (studentIds.length === 0) return;
    try {
      await apiFetch(`/api/admin/courses/${courseId}/assign-group/bulk`, {
        method: "POST",
        body: JSON.stringify({ studentIds, groupId }),
      });
    } catch (e) {
      await toastError(`تعذّر تعيين المجموعة: ${(e as Error).message}`);
    }
  },
};
