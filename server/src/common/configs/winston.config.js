import winston from "winston";
import moment from "moment-timezone";

const customFormat = winston.format.printf(
  ({ level, message, timestamp, stack }) => {
    const localTime = moment(timestamp)
      .tz("America/Bogota")
      .format("YYYY-MM-DD HH:mm:ss");
    return `[${localTime}] ${level.toUpperCase()}: ${message} ${
      stack ? `\nStack Trace: ${stack}` : ""
    }`;
  }
);

const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    customFormat
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(winston.format.colorize(), customFormat),
    }),
    // Transportes de archivo sin colorize
    new winston.transports.File({
      filename: "logs/error-api.log",
      level: "error",
      format: winston.format.uncolorize(),
    }),
    new winston.transports.File({
      filename: "logs/api.log",
      format: winston.format.uncolorize(),
    }),
  ],
});

export default logger;
