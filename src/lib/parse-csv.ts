export function parseInit(csv: string, config: ParseConfig): ParseResult {
  if (csv.charAt(csv.length-1) != '\n') {
    csv = csv + '\n';
  }
  return parse(csv, config);  
}

export function parseMore(proc: ParseProcess): ParseResult {
  return parse(proc.remain, proc.config, proc.headers)
}

function parse(csv: string, config: ParseConfig, header?: string[]): ParseResult {
  const delimiter = config.delimiter || ',';
  const lines = [];
  let fields = [];
  let curr = '';
  let quote = false;
  let i = 0
  for (; i < csv.length; i++) {
    const char = csv.charAt(i);
    if (char === '"') {
      quote = !quote
    }
    else if (char === delimiter && !quote) {
      fields.push(curr);
      curr = '';
    }
    else if (char === '\n' && !quote) {
      fields.push(curr);
      curr = '';
      if (config.toObject) {
        if (!header) {
          header = fields;
        } else {
          const object: {[key: string]: string} = {};
          for (let j = 0; j < header.length; j++) {
            object[header[j]] = fields[j];
          }
          lines.push(object);
        }
      } else {
        lines.push(fields);
      }
      fields = [];

      if (lines.length >= config.batchSize) {
        break;
      }
    } else if (char !== '\n' && char !== '\r') {
      curr += char;
    }
  }
  return {
    result: lines,
    proc: {
      headers: header,
      remain: csv.slice(i+1),
      config: config,
    }
  }
}

export type ParseConfig = {
  delimiter?: string,
  toObject?: boolean,
  batchSize: number,
}

export type ParseProcess = {
  headers?: string[],
  remain: string,
  config: ParseConfig,
}

export type ParseResult = {
  proc: ParseProcess,
  result: any[],
}