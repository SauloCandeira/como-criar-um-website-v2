type LogLevel = 'info' | 'warn' | 'error';

type LogPayload = {
  message: string;
  data?: Record<string, unknown>;
};

const format = (level: LogLevel, payload: LogPayload) => {
  return {
    level,
    message: payload.message,
    data: payload.data || {},
    timestamp: new Date().toISOString(),
  };
};

const log = (level: LogLevel, payload: LogPayload) => {
  const entry = format(level, payload);
  if (level === 'error') {
    console.error(entry);
    return;
  }
  if (level === 'warn') {
    console.warn(entry);
    return;
  }
  console.info(entry);
};

export const logger = {
  info: (message: string, data?: Record<string, unknown>) => log('info', { message, data }),
  warn: (message: string, data?: Record<string, unknown>) => log('warn', { message, data }),
  error: (message: string, data?: Record<string, unknown>) => log('error', { message, data }),
};
