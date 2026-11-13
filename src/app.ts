import "dotenv/config";
import cors from "cors";
import express from "express";
import { DatabaseModel } from "./model/DatabaseModel.js";
import { createCatalogRouter } from "./routes/catalogRoutes.js";

const app = express();
const port = Number(process.env.PORT) || 3000;

app.use(cors());
app.use(express.json());

app.get("/", (_request, response) => {
  response.json({
    name: "Loja Online Skin Care API",
    version: "1.0.0",
    endpoints: ["/health", "/api/products", "/api/categories", "/api/brands"],
  });
});

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

    app.get("/health", async (_request, response, next) => {
      try {
        await database!.pool.query("SELECT 1");
        response.json({ status: "ok", database: "connected" });
      } catch (error) {
        next(error);
      }
    });
    app.use("/api", createCatalogRouter(database.pool));
    app.use((error: unknown, _request: express.Request, response: express.Response, _next: express.NextFunction) => {
      console.error("Request failed:", error);
      response.status(500).json({ error: "Erro interno do servidor." });
    });

    const server = app.listen(port, () => {
      console.log(`Server running at http://localhost:${port}`);
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