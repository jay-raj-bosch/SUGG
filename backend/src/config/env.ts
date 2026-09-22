import dotenv from "dotenv";
dotenv.config();

function require_env(key: string): string {
  const val = process.env[key];
  if (!val) throw new Error(`Missing required environment variable: ${key}`);
  return val;
}

const NODE_ENV = process.env.NODE_ENV || "development";
const IS_PROD = NODE_ENV === "production";

function jwt_secret(): string {
  const val = process.env.JWT_SECRET;
  if (!val || val === "change_this_secret") {
    if (IS_PROD) throw new Error("JWT_SECRET must be set to a strong unique value in production");
    console.warn("[env] JWT_SECRET is using the insecure development default. Set JWT_SECRET in .env for production.");
    return "dev_only_change_this_secret";
  }
  return val;
}

function cors_origin(): string {
  const val = process.env.CORS_ORIGIN;
  if (!val) {
    if (IS_PROD) throw new Error("CORS_ORIGIN must be set in production (no wildcard allowed)");
    return "http://localhost:8080";
  }
  return val;
}

export const env = {
  PORT: parseInt(process.env.PORT || "4000", 10),
  NODE_ENV,

  DB_HOST: process.env.DB_HOST || "localhost",
  DB_PORT: parseInt(process.env.DB_PORT || "5432", 10),
  DB_NAME: process.env.DB_NAME || "suggestion_db",
  DB_USER: process.env.DB_USER || "postgres",
  DB_PASSWORD: process.env.DB_PASSWORD || "",

  JWT_SECRET: jwt_secret(),
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "8h",

  CORS_ORIGIN: cors_origin(),
  UPLOAD_DIR: process.env.UPLOAD_DIR || "uploads",
  MAX_FILE_SIZE_BYTES: parseInt(process.env.MAX_FILE_SIZE_BYTES || "4194304", 10),
};
