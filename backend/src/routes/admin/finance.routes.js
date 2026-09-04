import { Router } from "express";
import * as financeController from "../../controllers/admin/finance.controller.js";
import { requireFinanceUnlock } from "../../middleware/finance.js";

export const financeRouter = Router();

// /unlock exchanges the finance password for a scoped token. It requires the
// admin JWT (enforced upstream in index.js) but NOT the finance token itself.
financeRouter.post("/unlock", financeController.unlock);

// All routes below require the scoped finance token in addition to admin JWT.
financeRouter.use(requireFinanceUnlock);

financeRouter.get("/", financeController.list);
financeRouter.post("/", financeController.create);
financeRouter.put("/:id", financeController.update);
financeRouter.delete("/:id", financeController.remove);