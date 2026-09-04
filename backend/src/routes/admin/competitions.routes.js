import { Router } from "express";
import * as competitionsController from "../../controllers/admin/competitions.controller.js";
import * as registrationsController from "../../controllers/admin/competition-registrations.controller.js";

export const competitionsRouter = Router();

competitionsRouter.get("/", competitionsController.list);
competitionsRouter.post("/", competitionsController.create);
competitionsRouter.put("/:id", competitionsController.update);
competitionsRouter.delete("/:id", competitionsController.remove);

// Part 33 — registrations nested under a competition.
competitionsRouter.get("/:id/registrations", registrationsController.list);
competitionsRouter.post("/:id/registrations", registrationsController.create);

// Part 33 — /api/admin/competition-registrations/:id/...
export const competitionRegistrationsRouter = Router();
competitionRegistrationsRouter.post("/:id/issue-receipt", registrationsController.issueReceipt);
competitionRegistrationsRouter.delete("/:id", registrationsController.remove);
