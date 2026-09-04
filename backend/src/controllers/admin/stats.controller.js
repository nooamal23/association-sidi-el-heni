import { prisma } from "../../db/prisma.js";

export async function get(_req, res, next) {
  try {
    const [students, instructors, courses, enrollments, enrolledStudentRows, financeAgg] = await Promise.all([
      prisma.user.count({ where: { role: "student" } }),
      prisma.user.count({ where: { role: "instructor" } }),
      prisma.course.count(),
      prisma.enrollment.count(),
      prisma.enrollment.findMany({ distinct: ["studentId"], select: { studentId: true } }),
      prisma.financeEntry.groupBy({ by: ["kind"], _sum: { amount: true } }),
    ]);
    const enrolledStudents = enrolledStudentRows.length;
    let income = 0, expense = 0;
    for (const row of financeAgg) {
      const val = Number(row._sum.amount ?? 0);
      if (row.kind === "income") income = val;
      else if (row.kind === "expense") expense = val;
    }
    res.json({
      students,
      instructors,
      courses,
      enrollments,
      enrolledStudents,
      financeIncome: income,
      financeExpense: expense,
      financeBalance: income - expense,
    });
  } catch (e) { next(e); }
}

// ---------------------------------------------------------------------------
// Part 29/4 — dashboard aggregates. Everything is computed in Postgres; the
// frontend only renders the numbers it receives (no raw rows shipped out).
// ---------------------------------------------------------------------------

const DAY = 86_400_000;

function isoDay(d) {
  return d.toISOString().slice(0, 10);
}

/** A course counts as "currently active" when today is inside its date range,
 *  or when it has no dates at all but is published. */
function activeCourseWhere(todayIso) {
  const today = new Date(`${todayIso}T00:00:00.000Z`);
  // Part 50 — "active" means the course has not finished yet. Courses whose
  // period starts later this season still count as active (they are running
  // programmes), and undated courses count when published.
  return {
    OR: [
      { endDate: { gte: today } },
      { endDate: null, isPublished: true },
    ],
  };
}

export async function dashboard(_req, res, next) {
  try {
    const todayIso = isoDay(new Date());
    const today = new Date(`${todayIso}T00:00:00.000Z`);
    const from = new Date(today.getTime() - 6 * DAY); // 7-day window, inclusive
    const activeCourse = activeCourseWhere(todayIso);

    const [
      students,
      instructors,
      activeGroups,
      activeSummerCourses,
      upcomingNews,
      upcomingCompetitions,
      attendanceRows,
      newStudentRows,
      memorizationRows,
      quranEnrollments,
      latestGroups,
    ] = await Promise.all([
      prisma.user.count({ where: { role: "student" } }),
      prisma.user.count({ where: { role: "instructor" } }),
      prisma.courseGroup.count({ where: { course: activeCourse } }),
      prisma.course.count({ where: { type: "summer", ...activeCourse } }),
      prisma.news.findMany({
        where: { eventDate: { gte: today } },
        orderBy: { eventDate: "asc" },
        take: 5,
        select: { id: true, title: true, tag: true, eventDate: true, dateGregorian: true, dateHijri: true },
      }),
      prisma.competition.findMany({
        where: { eventDate: { gte: today } },
        orderBy: { eventDate: "asc" },
        take: 5,
        select: { id: true, name: true, level: true, location: true, eventDate: true },
      }),
      prisma.$queryRaw`
        SELECT session_date::text AS day,
               COUNT(*)::int AS total,
               COUNT(*) FILTER (WHERE present)::int AS present
        FROM attendance
        WHERE session_date BETWEEN ${from}::date AND ${today}::date
        GROUP BY session_date`,
      // Part 50 — new students come from the users table only: a student's
      // registration date is what matters, not enrollments or course types.
      prisma.$queryRaw`
        SELECT (created_at AT TIME ZONE 'UTC')::date::text AS day, COUNT(*)::int AS total
        FROM users
        WHERE role = 'student'
          AND (created_at AT TIME ZONE 'UTC')::date BETWEEN ${from}::date AND ${today}::date
        GROUP BY 1`,
      prisma.$queryRaw`
        SELECT logged_on::text AS day, COUNT(*)::int AS total
        FROM memorization_logs
        WHERE logged_on BETWEEN ${from}::date AND ${today}::date
        GROUP BY logged_on`,
      prisma.enrollment.findMany({
        where: { course: { type: "quran" } },
        select: {
          id: true,
          hizbCompleted: true,
          group: { select: { hizbCount: true } },
          student: { select: { id: true, fullName: true } },
        },
      }),
      prisma.courseGroup.findMany({
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          number: true,
          course: { select: { id: true, title: true, category: true, type: true } },
          instructor: { select: { fullName: true } },
          _count: { select: { enrollments: true } },
        },
      }),
    ]);

    // --- 7-day series -------------------------------------------------------
    const attMap = new Map(attendanceRows.map((r) => [r.day, r]));
    const newStudentMap = new Map(newStudentRows.map((r) => [r.day, Number(r.total)]));
    const memMap = new Map(memorizationRows.map((r) => [r.day, Number(r.total)]));
    const series = [];
    for (let i = 0; i < 7; i += 1) {
      const day = isoDay(new Date(from.getTime() + i * DAY));
      const att = attMap.get(day);
      const total = Number(att?.total ?? 0);
      series.push({
        day,
        attendanceRate: total > 0 ? Math.round((Number(att.present) / total) * 100) : 0,
        attendanceRecorded: total,
        newStudents: newStudentMap.get(day) ?? 0,
        memorized: memMap.get(day) ?? 0,
      });
    }

    // --- memorization donut + top students ----------------------------------
    let completed = 0, inProgress = 0, notStarted = 0;
    for (const e of quranEnrollments) {
      const target = e.group?.hizbCount ?? 0;
      if (e.hizbCompleted <= 0) notStarted += 1;
      else if (target > 0 && e.hizbCompleted >= target) completed += 1;
      else inProgress += 1;
    }

    const byStudent = new Map();
    for (const e of quranEnrollments) {
      const prev = byStudent.get(e.student.id);
      const hizb = (prev?.hizbCompleted ?? 0) + e.hizbCompleted;
      byStudent.set(e.student.id, { id: e.student.id, fullName: e.student.fullName, hizbCompleted: hizb });
    }
    const topStudents = [...byStudent.values()]
      .filter((s) => s.hizbCompleted > 0)
      .sort((a, b) => b.hizbCompleted - a.hizbCompleted)
      .slice(0, 5);

    // --- upcoming activities (merged + sorted) ------------------------------
    const upcoming = [
      ...upcomingNews.map((n) => ({
        id: n.id,
        kind: "news",
        title: n.title,
        subtitle: n.tag,
        date: isoDay(n.eventDate),
        dateHijri: n.dateHijri ?? null,
      })),
      ...upcomingCompetitions.map((c) => ({
        id: c.id,
        kind: "competition",
        title: c.name,
        subtitle: [c.level, c.location].filter(Boolean).join(" • "),
        date: isoDay(c.eventDate),
        dateHijri: null,
      })),
    ].sort((a, b) => a.date.localeCompare(b.date)).slice(0, 6);

    res.json({
      students,
      instructors,
      activeGroups,
      activeSummerCourses,
      upcoming,
      series,
      memorization: { completed, inProgress, notStarted, total: quranEnrollments.length },
      topStudents,
      latestGroups: latestGroups.map((g) => ({
        id: g.id,
        number: g.number,
        courseId: g.course.id,
        courseTitle: g.course.title,
        category: g.course.category,
        type: g.course.type,
        instructorName: g.instructor?.fullName ?? null,
        studentCount: g._count.enrollments,
      })),
    });
  } catch (e) { next(e); }
}
