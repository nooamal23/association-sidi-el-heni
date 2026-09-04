import { Router } from "express";
import * as coursesController from "../../controllers/admin/courses.controller.js";

export const coursesRouter = Router();

coursesRouter.get("/", coursesController.list);
coursesRouter.post("/", coursesController.create);
coursesRouter.put("/:id", coursesController.update);
coursesRouter.delete("/:id", coursesController.remove);
coursesRouter.post("/:id/enroll", coursesController.enroll);
coursesRouter.post("/:id/unenroll", coursesController.unenroll);