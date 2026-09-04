import { Router } from "express";
import { usersRouter } from "./users.routes.js";
import { coursesRouter } from "./courses.routes.js";
import { groupsRouter } from "./groups.routes.js";
import { seasonsRouter } from "./seasons.routes.js";
import { newsRouter } from "./news.routes.js";
import { competitionsRouter, competitionRegistrationsRouter } from "./competitions.routes.js";
import { galleryRouter } from "./gallery.routes.js";
import { boardRouter } from "./board.routes.js";
import { financeRouter } from "./finance.routes.js";
import { statsRouter } from "./stats.routes.js";
import { registrationRequestsRouter } from "./registration-requests.routes.js";
import { paymentsRouter } from "./payments.routes.js";
import { levelsRouter } from "./levels.routes.js";
import { studentGroupsRouter } from "./student-groups.routes.js";
import { courseGroupsRouter, enrollmentsRouter } from "./roster.routes.js";

export const adminRouter = Router();

adminRouter.use("/users", usersRouter);
adminRouter.use("/students/:id", paymentsRouter); // student payments
adminRouter.use("/courses/:id", groupsRouter); // groups nested under a course
adminRouter.use("/courses", coursesRouter);
adminRouter.use("/seasons", seasonsRouter);
adminRouter.use("/news", newsRouter);
adminRouter.use("/competitions", competitionsRouter);
adminRouter.use("/competition-registrations", competitionRegistrationsRouter);
adminRouter.use("/gallery", galleryRouter);
adminRouter.use("/board", boardRouter);
adminRouter.use("/finance", financeRouter);
adminRouter.use("/stats", statsRouter);
adminRouter.use("/registration-requests", registrationRequestsRouter);
adminRouter.use("/levels", levelsRouter);
adminRouter.use("/groups", studentGroupsRouter);
adminRouter.use("/course-groups", courseGroupsRouter);
adminRouter.use("/enrollments", enrollmentsRouter);
