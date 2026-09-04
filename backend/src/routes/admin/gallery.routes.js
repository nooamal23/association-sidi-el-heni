import { Router } from "express";
import * as galleryController from "../../controllers/admin/gallery.controller.js";

export const galleryRouter = Router();

galleryRouter.get("/", galleryController.list);
galleryRouter.post("/", galleryController.create);
galleryRouter.put("/:id", galleryController.update);
galleryRouter.delete("/:id", galleryController.remove);