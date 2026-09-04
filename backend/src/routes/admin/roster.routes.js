import { Router } from "express";
import * as ctrl from "../../controllers/admin/roster.controller.js";
import * as attendance from "../../controllers/admin/attendance.controller.js";
import * as memorization from "../../controllers/admin/memorization.controller.js";

// POST /api/admin/course-groups/:groupId/enrollments
export const courseGroupsRouter = Router();
courseGroupsRouter.post("/:groupId/enrollments", ctrl.bulkEnroll);
// Part 29/1 — attendance (instructor-facing UI comes later; API ready now)
courseGroupsRouter.get("/:groupId/attendance", attendance.getAttendance);
courseGroupsRouter.post("/:groupId/attendance", attendance.upsertAttendance);

// DELETE /api/admin/enrollments/:id
export const enrollmentsRouter = Router();
enrollmentsRouter.delete("/:id", ctrl.removeEnrollment);
// Part 29/2 — memorization progress
enrollmentsRouter.post("/:id/memorization/increment", memorization.increment);
enrollmentsRouter.post("/:id/memorization/decrement", memorization.decrement);
