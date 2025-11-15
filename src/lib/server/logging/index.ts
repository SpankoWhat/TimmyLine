/**
 * Simple logging utility for server-side logging with different log levels and context support.
 */
type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';
type supportedLogDetails = string | number | boolean | null | undefined;

// Log context can hold any key-value pairs with supported types
// This is mainly used by the interface LogDetails below
interface LogContextDetails {
    [key: string]: supportedLogDetails;
}

interface LogDetails {
    timestamp: number;
    level: LogLevel;
    message: string;
    service?: string;
    logContext?: LogContextDetails;
}

class Logger {
    private loggingService?: string;
    private logContextDetails?: LogContextDetails;
    private colors = {
      debug: '\x1b[36m',    // Cyan
      info: '\x1b[32m',     // Green
      warn: '\x1b[33m',     // Yellow
      error: '\x1b[31m',    // Red
      fatal: '\x1b[35m'     // Magenta
    };
    private reset = '\x1b[0m';

    constructor(loggingService?: string, additionalDetails?: LogContextDetails) {
        this.loggingService = loggingService;
        this.logContextDetails = additionalDetails;
    }

    /**
     * Logs a message with the specified log level and additional context.
     * @param {LogLevel} level the desired log level
     * @param {string} message the message to log
     * @param {LogContextDetails} details any additional details
     */
    private log(level: LogLevel, message: string, details?: LogContextDetails) {
        const timestamp = Date.now();

        const { level: __, service: ___, message: ____, ...rest} = details || {};
        const logEntry: LogDetails = {
            timestamp,
            level: level,
            service: this.loggingService || '',
            message: message,
            ...this.logContextDetails,
            ...details
        };

        const logString = this.formatLogString(logEntry); 
        console.log(logString);
    };

    /**
     * Formats a log entry into a string. Handles color coding based on log level.
     * Handles x additional details as JSON string.
     * @param logEntry the log to format
     * @returns {string} the formatted log string
     */
    private formatLogString(logEntry: LogDetails): string {
        const color = this.colors[logEntry.level] || this.reset;

        const { timestamp, level, service, message, ...details } = logEntry;
        const timestampStr = new Date(timestamp).toISOString();
        const serviceInfo = service ? `[${service}] ` : '';
        const detailsInfo = Object.keys(details).length ? JSON.stringify(details) : '';

        return (`${color}${timestampStr} ${level.toUpperCase()} ${serviceInfo}- ${message} ${detailsInfo}${this.reset}`);
    }

    /**
     * Create a child logger with additional context details.
     * @param {LogContextDetails} logContext Additional context to be included in all logs from the child logger
     * @return {Logger} A new Logger instance with the combined context
     * 
     * @example
     * const childLogger = logger.child({ requestId: '12345' });
     * childLogger.info('This log will include the requestId in its context');
     */
    child(logContext: LogContextDetails): Logger {
        return new Logger(this.loggingService, { ...this.logContextDetails, ...logContext });
    }

    /**
     * Logs a debug level message.
     * @param message The message to pass
     * @param data dictionary data to encode as json in the log
     */
    debug(message: string, data?: LogContextDetails) {
        this.log('debug', message, data);
    }

    /**
     * Logs a info level message.
     * @param message The message to pass
     * @param data dictionary data to encode as json in the log
     */
    info(message: string, data?: LogContextDetails) {
        this.log('info', message, data);
    }

    /**
     * Logs a warn level message.
     * @param message The message to pass
     * @param data dictionary data to encode as json in the log
     */
    warn(message: string, data?: LogContextDetails) {
        this.log('warn', message, data);
    }

    /**
     * Logs a error level message.
     * @param message The message to pass
     * @param data dictionary data to encode as json in the log
     */
    error(message: string, data?: LogContextDetails) {
        this.log('error', message, data);
    }

    /**
     * Logs a fatal level message.
     * @param message The message to pass
     * @param data dictionary data to encode as json in the log
     */
    fatal(message: string, data?: LogContextDetails) {
        this.log('fatal', message, data);
    }

}

export const logger = new Logger();
export const dbLogger = new Logger('database');
export const socketLogger = new Logger('socket');
export const apiLogger = new Logger('api');