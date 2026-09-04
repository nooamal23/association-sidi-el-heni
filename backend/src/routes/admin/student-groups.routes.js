import { Router } from "express";
import * as ctrl from "../../controllers/admin/student-groups.controller.js";

// Flat /api/admin/groups routes for the new Levels-based grouping system.
// (The per-course groups routes are mounted under /courses/:id/groups.)
export const studentGroupsRouter = Router();
studentGroupsRouter.get("/", ctrl.list);
studentGroupsRouter.post("/", ctrl.create);
studentGroupsRouter.put("/:id", ctrl.update);
studentGroupsRouter.delete("/:id", ctrl.remove);
studentGroupsRouter.get("/:id/students", ctrl.listStudents);
studentGroupsRouter.post("/:id/students", ctrl.addStudents);
studentGroupsRouter.delete("/:id/students/:studentId", ctrl.removeStudent);
