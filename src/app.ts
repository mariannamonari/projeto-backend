import "dotenv/config";
import cors from "cors";
import express from "express";
import { DatabaseModel } from "./model/DatabaseModel.js";

const app = express();
const port = Number(process.env.PORT) || 3000;

app.use(cors());
app.use(express.json());

app.get("/", (_request, response) => {
  response.json({ message: "Backend MVC is running" });
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

    app.listen(port, () => {
      console.log(`Server running at http://localhost:${port}`);
    });
  } catch (error) {
    if (database) {
      await database.pool.end();
    }
    console.error("Could not start the server:", error);
    process.exitCode = 1;
  }
}

void startServer();