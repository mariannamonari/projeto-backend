import { Router } from "express";
import type { Pool } from "pg";
import { AuthController } from "../controller/AuthController.js";
import { ClientController } from "../controller/ClientController.js";
import { WorkController } from "../controller/WorkController.js";
import { requireSession } from "../middleware/requireSession.js";

export function createAssistanceRouter(pool: Pool): Router {
  const router = Router();
  const auth = new AuthController(pool);
  const clients = new ClientController(pool);
  const work = new WorkController(pool);
  const authenticated = requireSession(pool);

  router.post("/auth/login", auth.login);
  router.get("/auth/me", authenticated, auth.me);
  router.post("/auth/logout", authenticated, auth.logout);

  router.use(authenticated);
  router.get("/clients", clients.list);
  router.post("/clients", clients.create);
  router.put("/clients/:id", clients.update);
  router.delete("/clients/:id", clients.remove);
  router.get("/equipment", work.listEquipment);
  router.post("/equipment", work.createEquipment);
  router.get("/appointments", work.listAppointments);
  router.patch("/appointments/:id/date", work.updateAppointmentDate);

  return router;
}