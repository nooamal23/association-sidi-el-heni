import { Router } from "express";
import * as usersController from "../../controllers/admin/users.controller.js";

export const usersRouter = Router();

usersRouter.get("/", usersController.list);
usersRouter.post("/", usersController.create);
usersRouter.put("/:id", usersController.update);
usersRouter.delete("/:id", usersController.remove);
usersRouter.post("/:id/reset-password", usersController.resetPassword);