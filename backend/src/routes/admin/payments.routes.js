import { Router } from "express";
import * as ctrl from "../../controllers/admin/payments.controller.js";

// Mounted at /api/admin/students/:id/...
export const paymentsRouter = Router({ mergeParams: true });

paymentsRouter.get("/payments", ctrl.list);
paymentsRouter.post("/payments", ctrl.mark);
paymentsRouter.delete("/payments", ctrl.unmark);
