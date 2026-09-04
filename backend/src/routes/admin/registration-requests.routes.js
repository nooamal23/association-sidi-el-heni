import { Router } from "express";
import * as registrationRequestsController from "../../controllers/admin/registration-requests.controller.js";

export const registrationRequestsRouter = Router();

registrationRequestsRouter.get("/", registrationRequestsController.list);
registrationRequestsRouter.post("/:id/resolve", registrationRequestsController.resolve);