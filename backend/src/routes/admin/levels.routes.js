import { Router } from "express";
import * as ctrl from "../../controllers/admin/levels.controller.js";

export const levelsRouter = Router();
levelsRouter.get("/", ctrl.list);
levelsRouter.post("/", ctrl.create);
levelsRouter.put("/:id", ctrl.update);
levelsRouter.delete("/:id", ctrl.remove);
