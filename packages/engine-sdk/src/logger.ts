/**
 * Logging utilities for the ACE Platform
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogContext {
  [key: string]: unknown
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development'

  private log(level: LogLevel, message: string, context?: LogContext) {
    const timestamp = new Date().toISOString()
    const logData = {
      timestamp,
      level,
      message,
      ...context,
    }

    if (this.isDevelopment) {
      // Pretty print in development
      const emoji = {
        debug: '🔍',
        info: 'ℹ️',
        warn: '⚠️',
        error: '❌',
      }[level]

      console[level === 'debug' ? 'log' : level](
        `${emoji} [${level.toUpperCase()}] ${message}`,
        context ? context : '',
      )
    } else {
      // JSON in production for log aggregation
      console.log(JSON.stringify(logData))
    }
  }

  debug(message: string, context?: LogContext) {
    this.log('debug', message, context)
  }

  info(message: string, context?: LogContext) {
    this.log('info', message, context)
  }

  warn(message: string, context?: LogContext) {
    this.log('warn', message, context)
  }

  error(message: string, error?: Error | unknown, context?: LogContext) {
    const errorContext =
      error instanceof Error
        ? {
            error: {
              name: error.name,
              message: error.message,
              stack: error.stack,
            },
            ...context,
          }
        : { error, ...context }

    this.log('error', message, errorContext)
  }
}

export const logger = new Logger()
