import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import cors from "cors";
import cookieParser from "cookie-parser";
import fileUpload from "express-fileupload";
import compressionMiddleware from "./src/common/middlewares/compression.middleware.js";
import cleanRequestData from "./src/common/middlewares/cleanRequestData.middleware.js";
import errorMiddleware from "./src/common/middlewares/error.middleware.js";
import mainRoutes from "./src/modules/main.routes.js";
import morgan from "morgan";
import { testConnection } from "./src/common/configs/db.config.js";
import { startAllCrons } from "./src/tasks/main.tasks.js";
// import helmetMiddleware from "./src/common/middlewares/helmet.middleware.js";
// import httpLogger from "./src/common/middlewares/httpLogger.middleware.js";
// import defaultRateLimit from "./src/common/middlewares/rateLimit.middleware.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

// Testear conexión a la DB
testConnection();

startAllCrons();

// Middlewares
app.use(morgan("dev")); // Logging HTTP
// app.use(httpLogger);
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cors({
  origin: (origin, callback) => {
    const allowed = (process.env.CORS_ORIGINS || "http://localhost:3000")
      .split(",")
      .map((o) => o.trim());
    if (!origin || allowed.includes(origin)) return callback(null, true);
    callback(new Error(`CORS: origen no permitido → ${origin}`));
  },
  credentials: true,
}));
app.use(cookieParser());
// app.use(helmetMiddleware); // Seguridad headers
app.use(compressionMiddleware);
app.use(cleanRequestData);
// app.use(defaultRateLimit);

// app.use(
//   fileUpload({
//     createParentPath: true,
//     safeFileNames: true,
//     preserveExtension: true,
//   })
// );

// Rutas y estáticos
app.use("/", express.static(path.join(__dirname, "../build")));
app.get("/", (req, res) => res.send("Servidor corriendo correctamente"));

app.use("/api", mainRoutes);
app.use(errorMiddleware);

export { app };
