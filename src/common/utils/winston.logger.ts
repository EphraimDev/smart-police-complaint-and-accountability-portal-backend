import { Injectable, LoggerService } from "@nestjs/common";
import * as winston from "winston";
import "winston-daily-rotate-file";import * as rTracer from 'cls-rtracer';

@Injectable()
export class WinstonLogger implements LoggerService {
  private readonly logger: winston.Logger;

  constructor(logLevel: string = "info", logDir: string = "./logs") {
    const logFormat = winston.format.combine(
      winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss.SSS" }),
      winston.format.errors({ stack: true }),
      winston.format.json(),
      winston.format.printf((info) => {
        const rid = rTracer.id();
        const lineInfo = this.getCallerInfo();
        return rid
          ? `| ${info.timestamp} | ${rid} | ${info.label}${lineInfo} | ${info.message} |`
          : `| ${info.timestamp} | ${info.label}${lineInfo} | ${info.message} |`;
      }),
    );

    const consoleFormat = winston.format.combine(
      winston.format.colorize(),
      winston.format.timestamp({ format: "HH:mm:ss.SSS" }),
      winston.format.printf(
        ({ timestamp, level, message, context, ...meta }) => {
          const ctx = context ? `[${context}]` : "";
          const metaStr = Object.keys(meta).length
            ? ` ${JSON.stringify(meta)}`
            : "";
          return `${timestamp} ${level} ${ctx} ${message}${metaStr}`;
        },
      ),
    );

    this.logger = winston.createLogger({
      level: logLevel,
      format: logFormat,
      defaultMeta: { service: "complaint-portal" },
      transports: [
        new winston.transports.Console({
          format: consoleFormat,
        }),
        new winston.transports.DailyRotateFile({
          dirname: logDir,
          filename: "application-%DATE%.log",
          datePattern: "YYYY-MM-DD",
          maxSize: "5m",
          maxFiles: "30d",
          level: "info",
        }),
        new winston.transports.DailyRotateFile({
          dirname: logDir,
          filename: "error-%DATE%.log",
          datePattern: "YYYY-MM-DD",
          maxSize: "5m",
          maxFiles: "90d",
          level: "error",
        }),
      ],
    });
  }

  private getCallerInfo = (): string => {
    const stack = new Error().stack;
    if (!stack) return "";

    const stackLines = stack.split("\n");
    // Skip Error, getCallerInfo, printf, and internal winston calls to find the actual caller
    for (const line of stackLines) {
      if (
        line.includes("logger.util") ||
        line.includes("node_modules") ||
        line.includes("Error")
      ) {
        continue;
      }
      // Match patterns like "at functionName (/path/file.ts:123:45)" or "at /path/file.ts:123:45"
      const match = line.match(/:(\d+):\d+\)?$/);
      if (match) {
        return `:${match[1]}`;
      }
    }
    return "";
  };

  log(message: string, context?: string): void {
    this.logger.info(message, { context });
  }

  error(message: string, trace?: string, context?: string): void {
    this.logger.error(message, { trace, context });
  }

  warn(message: string, context?: string): void {
    this.logger.warn(message, { context });
  }

  debug(message: string, context?: string): void {
    this.logger.debug(message, { context });
  }

  verbose(message: string, context?: string): void {
    this.logger.verbose(message, { context });
  }
}
