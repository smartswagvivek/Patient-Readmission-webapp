import "dotenv/config";

import express from "express";
import cors from "cors";
import pino from "pino";

import { errorHandler } from "./middleware/errorHandler.js";
import { notFoundHandler } from "./middleware/notFoundHandler.js";
import { router as predictRouter } from "./routes/predictRoutes.js";
import { testDatabaseConnection } from "./models/db.js";

const logger = pino({ level: process.env.LOG_LEVEL || "info" });

const app = express();

app.use(cors({ origin: process.env.CORS_ORIGIN || "*", credentials: false }));
app.use(express.json());

app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "backend" });
});

app.use("/api/predict", predictRouter);

app.use(notFoundHandler);
app.use(errorHandler(logger));

const port = process.env.PORT || 4000;

async function startServer() {
  try {
    await testDatabaseConnection();
    console.log("Database connected successfully");
    logger.info("Database connected successfully");
  } catch (error) {
    console.error("Database connection failed");
    logger.error({ err: error }, "Database connection failed");
    process.exit(1);
  }

  app.listen(port, () => {
    logger.info(`Backend API listening on port ${port}`);
  });
}

startServer();

