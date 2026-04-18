/**
 * Winston Logger Configuration
 *
 * WHY: Structured logging provides:
 * 1. Consistent log format across all environments
 * 2. JSON output for production (machine parsable)
 * 3. Pretty printing for development (human readable)
 * 4. Automatic metadata inclusion (timestamp, correlation ID, service name)
 */

import { utilities as nestWinstonModuleUtilities } from 'nest-winston';
import { WinstonModuleOptions } from 'nest-winston';
import * as winston from 'winston';

const { timestamp, json, errors } = winston.format;

/**
 * Get log level based on environment
 */
function getLogLevel(): string {
  const nodeEnv = process.env.NODE_ENV ?? 'development';
  const logLevel = process.env.LOG_LEVEL;

  if (logLevel) return logLevel;

  // Production defaults to 'info', development to 'debug'
  return nodeEnv === 'production' ? 'info' : 'debug';
}

/**
 * Get service name for log metadata
 */
function getServiceName(): string {
  return process.env.SERVICE_NAME ?? 'greengrass-api';
}

/**
 * Development format: Human readable with colors
 */
const developmentFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
  winston.format.align(),
  nestWinstonModuleUtilities.format.nestLike(getServiceName(), {
    colors: true,
    prettyPrint: true,
  }),
);

/**
 * Production format: JSON for log aggregation systems
 */
const productionFormat = winston.format.combine(
  timestamp({ format: 'ISOString' }),
  errors({ stack: true }), // Include stack traces in error logs
  json(),
);

/**
 * Default metadata added to every log
 */
const defaultMeta = {
  service: getServiceName(),
  version: process.env.npm_package_version ?? 'unknown',
  environment: process.env.NODE_ENV ?? 'development',
};

/**
 * Winston configuration factory
 */
export function createWinstonConfig(): WinstonModuleOptions {
  const isProduction = process.env.NODE_ENV === 'production';
  const logLevel = getLogLevel();

  return {
    level: logLevel,
    defaultMeta,
    format: isProduction ? productionFormat : developmentFormat,
    transports: [
      // Console transport (always enabled)
      new winston.transports.Console({
        level: logLevel,
        handleExceptions: true,
        handleRejections: true, // Handle unhandled promise rejections
      }),
    ],
    // Additional transports can be added here:
    // - File transport for local logs
    // - HTTP transport for external log aggregation
    // - CloudWatch transport for AWS
    exitOnError: false, // Don't crash on logging errors
  };
}

/**
 * Add file transport for persistent logging (optional)
 */
export function addFileTransport(
  config: WinstonModuleOptions,
): WinstonModuleOptions {
  if (process.env.LOG_FILE_PATH) {
    const fileTransport = new winston.transports.File({
      filename: process.env.LOG_FILE_PATH,
      level: 'info',
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
      format: productionFormat,
    });

    if (Array.isArray(config.transports)) {
      config.transports.push(fileTransport);
    }
  }

  return config;
}
