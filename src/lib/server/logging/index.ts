type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';
type supportedLogDetails = string | number | boolean | null | undefined;

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

    // Figuring the best way to pass in logs here
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

    private formatLogString(logEntry: LogDetails) : string{
        const color = this.colors[logEntry.level] || this.reset;
        const { timestamp, level, service, message, ...details } = logEntry;
        const serviceInfo = service ? `[${service}] ` : '';

        const detailsInfo = Object.keys(details).length ? JSON.stringify(details) : '';
        return(`${color}${timestamp} ${level.toUpperCase()} ${serviceInfo}- ${message} ${detailsInfo}${this.reset}`);
    }

    // Create a child logger with additional context specific to a component or module (factory pattern)
    child(logContext: LogContextDetails): Logger {
        return new Logger(this.loggingService, { ...this.logContextDetails, ...logContext });
    }

    debug(message: string, data?: LogContextDetails) {
        this.log('debug', message, data);
    }

    info(message: string, data?: LogContextDetails) {
        this.log('info', message, data);
    }

    warn(message: string, data?: LogContextDetails) {
        this.log('warn', message, data);
    }

    error(message: string, data?: LogContextDetails) {
        this.log('error', message, data);
    }

    fatal(message: string, data?: LogContextDetails) {
        this.log('fatal', message, data);
    }

}

export const logger = new Logger();
export const dbLogger = new Logger('database');
export const socketLogger = new Logger('socket');
export const apiLogger = new Logger('api');