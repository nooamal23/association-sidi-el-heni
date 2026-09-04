import { Router } from "express";
import * as ctrl from "../../controllers/admin/groups.controller.js";
import * as rosterCtrl from "../../controllers/admin/roster.controller.js";

// Mounted at /api/admin/courses/:id/... — needs mergeParams to see :id
export const groupsRouter = Router({ mergeParams: true });

groupsRouter.get("/groups", ctrl.listByCourse);
groupsRouter.get("/roster", rosterCtrl.roster);
groupsRouter.get("/available-students", rosterCtrl.availableStudents);
groupsRouter.post("/groups", ctrl.create);
groupsRouter.put("/groups/:groupId", ctrl.update);
groupsRouter.delete("/groups/:groupId", ctrl.remove);
groupsRouter.post("/assign-group", ctrl.assign);
groupsRouter.post("/assign-group/bulk", ctrl.bulkAssign);
