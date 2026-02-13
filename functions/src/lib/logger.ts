import pino from "pino";

const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  base: {
    service: "hktech-functions",
    env: process.env.NODE_ENV || "development",
  },
  redact: {
    paths: ["req.headers.authorization", "req.headers.cookie"],
    remove: true,
  },
});

export default logger;
