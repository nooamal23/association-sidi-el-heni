import { Router } from "express";
import * as ctrl from "../../controllers/admin/seasons.controller.js";

export const seasonsRouter = Router();

seasonsRouter.get("/", ctrl.list);
seasonsRouter.post("/", ctrl.create);
seasonsRouter.put("/:id", ctrl.update);
seasonsRouter.delete("/:id", ctrl.remove);
seasonsRouter.post("/:id/activate", ctrl.activate);
