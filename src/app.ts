import "dotenv/config";
import cors from "cors";
import express from "express";
import path from "node:path";
import { DatabaseModel } from "./model/DatabaseModel.js";
import { createAssistanceRouter } from "./routes/assistanceRoutes.js";
import { HttpError } from "./shared/HttpError.js";

const app = express();
const port = Number(process.env.PORT) || 3000;

app.use(cors());
app.use(express.json({ limit: "32kb" }));

async function startServer(): Promise<void> {
  let database: DatabaseModel | undefined;

  try {
    database = new DatabaseModel();
    const connected = await database.testeConexao();

    if (!connected) {
      await database.pool.end();
      console.error("Could not connect to the database; server was not started.");
      process.exitCode = 1;
      return;
    }

    app.get("/api/health", async (_request, response, next) => {
      try {
        await database!.pool.query("SELECT 1");
        response.json({ status: "ok", database: "connected" });
      } catch (error) {
        next(error);
      }
    });
    app.use("/api", createAssistanceRouter(database.pool));
    app.use(express.static(path.resolve(process.cwd(), "sistema")));
    app.use((error: unknown, _request: express.Request, response: express.Response, _next: express.NextFunction) => {
      const databaseError = error as { code?: string };
      if (error instanceof HttpError) {
        response.status(error.status).json({ error: error.message });
        return;
      }
      if (databaseError.code === "23505") {
        response.status(409).json({ error: "Já existe um registro com esses dados (e-mail, CPF ou número de série)." });
        return;
      }
      if (databaseError.code === "23503") {
        response.status(409).json({ error: "Não é possível excluir este registro: existem equipamentos ou agendamentos vinculados." });
        return;
      }
      console.error("Request failed:", error);
      response.status(500).json({ error: "Erro interno do servidor." });
    });

    const server = app.listen(port, () => {
      console.log(`Sistema de assistência técnica em http://localhost:${port}`);
    });

    const shutdown = (): void => {
      server.close(() => {
        void database?.pool.end();
      });
    };
    process.once("SIGINT", shutdown);
    process.once("SIGTERM", shutdown);
  } catch (error) {
    if (database) {
      await database.pool.end();
    }
    console.error("Could not start the server:", error);
    process.exitCode = 1;
  }
}

void startServer();