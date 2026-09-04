import { Router } from "express";
import * as boardController from "../../controllers/admin/board.controller.js";

export const boardRouter = Router();

boardRouter.get("/", boardController.list);
boardRouter.post("/", boardController.create);
boardRouter.put("/:id", boardController.update);
boardRouter.delete("/:id", boardController.remove);