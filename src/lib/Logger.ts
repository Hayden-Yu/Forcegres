// trimed logger definition from winston
// tslint:disable: interface-name member-access

export interface Logger {
  error: LeveledLogMethod;
  warn: LeveledLogMethod;
  help: LeveledLogMethod;
  data: LeveledLogMethod;
  info: LeveledLogMethod;
  debug: LeveledLogMethod;
  prompt: LeveledLogMethod;
  http: LeveledLogMethod;
  verbose: LeveledLogMethod;
  input: LeveledLogMethod;
  silly: LeveledLogMethod;
}

interface LeveledLogMethod {
  (infoObject: object): Logger;
  (message: string, ...meta: any[]): Logger;
}

type LogCallback = (error?: any, level?: string, message?: string, meta?: any) => void;

class LoggerPlaceHolder {
  error = (message: object | string) => this;
  warn = (message: object | string) => this;
  help = (message: object | string) => this;
  data = (message: object | string) => this;
  info = (message: object | string) => this;
  debug = (message: object | string) => this;
  prompt = (message: object | string) => this;
  http = (message: object | string) => this;
  verbose = (message: object | string) => this;
  input = (message: object | string) => this;
  silly = (message: object | string) => this;
}

export const loggerPlaceHolder = new LoggerPlaceHolder();
