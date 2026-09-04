// Derive public-facing Course objects from the admin CourseLite store.
import {
  LEVEL_LABEL,
  WEEKDAYS,
  type CourseLite,
  type Person,
} from "./people-store";
import type { Course } from "./mock-data";

function categoryOf(c: CourseLite): Course["category"] {
  if (c.type === "training") return "training";
  if (c.type === "summer") return "summer";
  return (c.audience ?? "children") as Course["category"];
}

function scheduleOf(c: CourseLite): string {
  const dayLabels = (c.days ?? [])
    .map((d) => WEEKDAYS.find((w) => w.value === d)?.label)
    .filter(Boolean) as string[];
  const days = dayLabels.length ? dayLabels.join("، ") : "—";
  const time =
    c.timeFrom && c.timeTo ? ` — ${c.timeFrom} إلى ${c.timeTo}` : "";
  return `${days}${time}`;
}

export function toPublicCourse(c: CourseLite, people: Person[]): Course {
  const instructor = c.instructorId
    ? people.find((p) => p.id === c.instructorId)?.fullName ?? "—"
    : "—";
  const enrolled = people.filter(
    (p) => p.role === "student" && p.courseIds.includes(c.id),
  ).length;
  return {
    id: c.id,
    title: c.title,
    category: categoryOf(c),
    level: c.level ? LEVEL_LABEL[c.level] : "—",
    schedule: scheduleOf(c),
    instructor,
    capacity: c.capacity ?? 25,
    enrolled,
  };
}
