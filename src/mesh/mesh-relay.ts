import { Deduplicator } from "../deduplicator/deduplicator.js";
import type { EdenTransport } from "../transports/transport.js";

const DEFAULT_MAX_TTL = 10;

export interface MeshRelayOptions {
  transport: EdenTransport;
  peerId: string;
  maxTtl?: number;
  onMessage: (msg: Buffer) => void;
}

export class MeshRelay {
  private readonly transport: EdenTransport;
  private readonly peerId: string;
  private readonly maxTtl: number;
  private readonly onMessage: (msg: Buffer) => void;
  private readonly deduplicator = new Deduplicator();

  constructor(options: MeshRelayOptions) {
    this.transport = options.transport;
    this.peerId = options.peerId;
    this.maxTtl = options.maxTtl ?? DEFAULT_MAX_TTL;
    this.onMessage = options.onMessage;
  }

  bind(): void {
    this.transport.bind(0, (msg: Buffer) => this.handleIncoming(msg));
  }

  emit(msg: Buffer): void {
    let envelope: Record<string, unknown>;
    try {
      envelope = JSON.parse(msg.toString()) as Record<string, unknown>;
    } catch {
      this.transport.send(msg);
      return;
    }

    if (envelope["ttl"] === undefined) {
      envelope["ttl"] = this.maxTtl;
    }
    if (envelope["origin"] === undefined) {
      envelope["origin"] = this.peerId;
    }

    const id = envelope["id"] as string | undefined;
    if (id) {
      this.deduplicator.seen(id);
    }

    this.transport.send(Buffer.from(JSON.stringify(envelope)));
  }

  private handleIncoming(msg: Buffer): void {
    let envelope: Record<string, unknown>;
    try {
      envelope = JSON.parse(msg.toString()) as Record<string, unknown>;
    } catch {
      this.onMessage(msg);
      return;
    }

    const id = envelope["id"] as string | undefined;
    const type = envelope["type"] as string | undefined;
    const ttl = envelope["ttl"] as number | undefined;

    // ACKs pass through to app but are never forwarded
    if (type === "__ack__") {
      this.onMessage(msg);
      return;
    }

    // Deduplicate
    if (id && this.deduplicator.seen(id)) {
      return;
    }

    // TTL check
    if (ttl !== undefined && ttl <= 0) {
      return;
    }

    // Deliver to app
    this.onMessage(msg);

    // Forward with decremented TTL
    const newTtl = (ttl ?? this.maxTtl) - 1;
    if (newTtl <= 0) return;

    envelope["ttl"] = newTtl;
    this.transport.send(Buffer.from(JSON.stringify(envelope)));
  }
}
