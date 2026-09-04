import { Router } from "express";
import * as newsController from "../../controllers/admin/news.controller.js";

export const newsRouter = Router();

newsRouter.get("/", newsController.list);
newsRouter.post("/", newsController.create);
newsRouter.put("/:id", newsController.update);
newsRouter.delete("/:id", newsController.remove);