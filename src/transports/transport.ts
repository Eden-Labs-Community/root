export interface Endpoint {
  host: string;
  port: number;
}

export interface EdenTransport {
  send(msg: Buffer): void;
  bind(port: number, onMessage: (msg: Buffer) => void): void;
  close(): void;
}
