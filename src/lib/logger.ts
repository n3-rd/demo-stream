import { writeFile, readFile, appendFile, stat, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join, dirname } from 'path';

interface LoggerConfig {
	logFile?: string;
	maxLines?: number;
	maxSizeMB?: number;
	enableConsole?: boolean;
}

class FileLogger {
	private logFile: string;
	private maxLines: number;
	private maxSizeMB: number;
	private enableConsole: boolean;
	private originalConsole: {
		log: typeof console.log;
		error: typeof console.error;
		warn: typeof console.warn;
		info: typeof console.info;
		debug: typeof console.debug;
	};

	constructor(config: LoggerConfig = {}) {
		this.logFile = config.logFile || join(process.cwd(), 'logs', 'app.log');
		this.maxLines = config.maxLines || 10000;
		this.maxSizeMB = config.maxSizeMB || 10;
		this.enableConsole = config.enableConsole !== false;

		// Store original console methods
		this.originalConsole = {
			log: console.log.bind(console),
			error: console.error.bind(console),
			warn: console.warn.bind(console),
			info: console.info.bind(console),
			debug: console.debug.bind(console)
		};

		this.initialize();
	}

	private async initialize() {
		// Ensure log directory exists
		const logDir = dirname(this.logFile);
		if (!existsSync(logDir)) {
			await mkdir(logDir, { recursive: true });
		}

		// Setup console interception
		this.interceptConsole();
	}

	private interceptConsole() {
		const writeLog = async (level: string, ...args: any[]) => {
			const timestamp = new Date().toISOString();
			const message = args
				.map((arg) => {
					if (typeof arg === 'object') {
						try {
							return JSON.stringify(arg, null, 2);
						} catch {
							return String(arg);
						}
					}
					return String(arg);
				})
				.join(' ');

			const logEntry = `[${timestamp}] [${level}] ${message}\n`;

			// Write to console if enabled
			if (this.enableConsole) {
				this.originalConsole[level as keyof typeof this.originalConsole]?.(...args);
			}

			// Write to file
			await this.writeToFile(logEntry);
		};

		console.log = (...args: any[]) => writeLog('log', ...args);
		console.error = (...args: any[]) => writeLog('error', ...args);
		console.warn = (...args: any[]) => writeLog('warn', ...args);
		console.info = (...args: any[]) => writeLog('info', ...args);
		console.debug = (...args: any[]) => writeLog('debug', ...args);
	}

	private async writeToFile(logEntry: string) {
		try {
			// Check if file exists and get its size
			let shouldRotate = false;
			if (existsSync(this.logFile)) {
				const stats = await stat(this.logFile);
				const sizeMB = stats.size / (1024 * 1024);

				// Rotate if size exceeds limit
				if (sizeMB > this.maxSizeMB) {
					shouldRotate = true;
				}
			}

			if (shouldRotate) {
				await this.rotateLog();
			}

			// Append to file
			await appendFile(this.logFile, logEntry, 'utf8');

			// Check line count and trim if needed
			await this.trimIfNeeded();
		} catch (error) {
			// Fallback to console if file write fails
			this.originalConsole.error('Logger write error:', error);
		}
	}

	private async rotateLog() {
		try {
			if (!existsSync(this.logFile)) return;

			// Read current log
			const content = await readFile(this.logFile, 'utf8');
			const lines = content.split('\n').filter((line) => line.trim());

			// Keep only the most recent lines (half of maxLines to make room)
			const keepLines = Math.floor(this.maxLines / 2);
			const recentLines = lines.slice(-keepLines);

			// Write back the trimmed content
			await writeFile(this.logFile, recentLines.join('\n') + '\n', 'utf8');
		} catch (error) {
			this.originalConsole.error('Log rotation error:', error);
		}
	}

	private async trimIfNeeded() {
		try {
			if (!existsSync(this.logFile)) return;

			const content = await readFile(this.logFile, 'utf8');
			const lines = content.split('\n').filter((line) => line.trim());

			// If we exceed max lines, keep only the most recent ones
			if (lines.length > this.maxLines) {
				const recentLines = lines.slice(-this.maxLines);
				await writeFile(this.logFile, recentLines.join('\n') + '\n', 'utf8');
			}
		} catch (error) {
			this.originalConsole.error('Log trim error:', error);
		}
	}

	// Manual log methods
	async log(...args: any[]) {
		const timestamp = new Date().toISOString();
		const message = args
			.map((arg) => {
				if (typeof arg === 'object') {
					try {
						return JSON.stringify(arg, null, 2);
					} catch {
						return String(arg);
					}
				}
				return String(arg);
			})
			.join(' ');

		const logEntry = `[${timestamp}] [log] ${message}\n`;
		await this.writeToFile(logEntry);

		if (this.enableConsole) {
			this.originalConsole.log(...args);
		}
	}

	async error(...args: any[]) {
		const timestamp = new Date().toISOString();
		const message = args
			.map((arg) => {
				if (typeof arg === 'object') {
					try {
						return JSON.stringify(arg, null, 2);
					} catch {
						return String(arg);
					}
				}
				return String(arg);
			})
			.join(' ');

		const logEntry = `[${timestamp}] [error] ${message}\n`;
		await this.writeToFile(logEntry);

		if (this.enableConsole) {
			this.originalConsole.error(...args);
		}
	}

	async warn(...args: any[]) {
		const timestamp = new Date().toISOString();
		const message = args
			.map((arg) => {
				if (typeof arg === 'object') {
					try {
						return JSON.stringify(arg, null, 2);
					} catch {
						return String(arg);
					}
				}
				return String(arg);
			})
			.join(' ');

		const logEntry = `[${timestamp}] [warn] ${message}\n`;
		await this.writeToFile(logEntry);

		if (this.enableConsole) {
			this.originalConsole.warn(...args);
		}
	}

	// Get log file path
	getLogPath(): string {
		return this.logFile;
	}

	// Restore original console methods
	restoreConsole() {
		console.log = this.originalConsole.log;
		console.error = this.originalConsole.error;
		console.warn = this.originalConsole.warn;
		console.info = this.originalConsole.info;
		console.debug = this.originalConsole.debug;
	}
}

// Create singleton instance
let loggerInstance: FileLogger | null = null;

export function initLogger(config?: LoggerConfig): FileLogger {
	if (loggerInstance) {
		return loggerInstance;
	}

	loggerInstance = new FileLogger(config);
	return loggerInstance;
}

export function getLogger(): FileLogger | null {
	return loggerInstance;
}

// Export the class for custom instances
export { FileLogger };

