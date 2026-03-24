import { MeshRelay } from "../mesh/mesh-relay.js";
import { createEnvelope, EventEnvelope } from "../envelope/envelope.js";

function makeTransport() {
  const sent: Buffer[] = [];
  let handler: ((msg: Buffer) => void) | null = null;
  return {
    send(msg: Buffer) { sent.push(msg); },
    bind(_port: number, onMessage: (msg: Buffer) => void) { handler = onMessage; },
    close() {},
    sent,
    deliver(msg: Buffer) { handler?.(msg); },
  };
}

function envelopeToBuffer(env: EventEnvelope): Buffer {
  return Buffer.from(JSON.stringify(env));
}

describe("MeshRelay", () => {
  it("delivers received message to app", () => {
    const transport = makeTransport();
    const delivered: EventEnvelope[] = [];
    const mesh = new MeshRelay({
      transport,
      peerId: "me",
      onMessage: (msg) => delivered.push(JSON.parse(msg.toString())),
    });
    mesh.bind();

    const env = createEnvelope({ type: "eden:chat:message", payload: "hi", ttl: 5, origin: "other" });
    transport.deliver(envelopeToBuffer(env));

    expect(delivered).toHaveLength(1);
    expect(delivered[0]!.id).toBe(env.id);
  });

  it("discards duplicate message (same id)", () => {
    const transport = makeTransport();
    const delivered: EventEnvelope[] = [];
    const mesh = new MeshRelay({
      transport,
      peerId: "me",
      onMessage: (msg) => delivered.push(JSON.parse(msg.toString())),
    });
    mesh.bind();

    const env = createEnvelope({ type: "eden:chat:message", payload: "hi", ttl: 5, origin: "other" });
    transport.deliver(envelopeToBuffer(env));
    transport.deliver(envelopeToBuffer(env));

    expect(delivered).toHaveLength(1);
  });

  it("discards message with ttl <= 0", () => {
    const transport = makeTransport();
    const delivered: EventEnvelope[] = [];
    const mesh = new MeshRelay({
      transport,
      peerId: "me",
      onMessage: (msg) => delivered.push(JSON.parse(msg.toString())),
    });
    mesh.bind();

    const env = createEnvelope({ type: "eden:chat:message", payload: "hi", ttl: 0, origin: "other" });
    transport.deliver(envelopeToBuffer(env));

    expect(delivered).toHaveLength(0);
    expect(transport.sent).toHaveLength(0);
  });

  it("forwards message with ttl decremented by 1", () => {
    const transport = makeTransport();
    const mesh = new MeshRelay({
      transport,
      peerId: "me",
      onMessage: () => {},
    });
    mesh.bind();

    const env = createEnvelope({ type: "eden:chat:message", payload: "hi", ttl: 5, origin: "other" });
    transport.deliver(envelopeToBuffer(env));

    expect(transport.sent).toHaveLength(1);
    const forwarded = JSON.parse(transport.sent[0]!.toString());
    expect(forwarded.ttl).toBe(4);
  });

  it("does not forward ACKs", () => {
    const transport = makeTransport();
    const delivered: unknown[] = [];
    const mesh = new MeshRelay({
      transport,
      peerId: "me",
      onMessage: (msg) => delivered.push(JSON.parse(msg.toString())),
    });
    mesh.bind();

    const ack = { type: "__ack__", id: "abc", receivedAt: Date.now() };
    transport.deliver(Buffer.from(JSON.stringify(ack)));

    expect(delivered).toHaveLength(1);
    expect(transport.sent).toHaveLength(0);
  });

  it("adds ttl and origin when emitting", () => {
    const transport = makeTransport();
    const mesh = new MeshRelay({
      transport,
      peerId: "me",
      maxTtl: 8,
      onMessage: () => {},
    });
    mesh.bind();

    const env = createEnvelope({ type: "eden:chat:message", payload: "hi" });
    mesh.emit(envelopeToBuffer(env));

    expect(transport.sent).toHaveLength(1);
    const sent = JSON.parse(transport.sent[0]!.toString());
    expect(sent.ttl).toBe(8);
    expect(sent.origin).toBe("me");
  });

  it("marks own emitted message as seen (no echo)", () => {
    const transport = makeTransport();
    const delivered: EventEnvelope[] = [];
    const mesh = new MeshRelay({
      transport,
      peerId: "me",
      onMessage: (msg) => delivered.push(JSON.parse(msg.toString())),
    });
    mesh.bind();

    const env = createEnvelope({ type: "eden:chat:message", payload: "hi" });
    mesh.emit(envelopeToBuffer(env));

    // Simulate receiving own message back
    transport.deliver(envelopeToBuffer({ ...env, ttl: 9, origin: "me" }));

    expect(delivered).toHaveLength(0);
  });

  it("does not forward message with ttl 1 (becomes 0 after decrement)", () => {
    const transport = makeTransport();
    const mesh = new MeshRelay({
      transport,
      peerId: "me",
      onMessage: () => {},
    });
    mesh.bind();

    const env = createEnvelope({ type: "eden:chat:message", payload: "hi", ttl: 1, origin: "other" });
    transport.deliver(envelopeToBuffer(env));

    // Delivered to app but not forwarded (ttl-1 = 0)
    expect(transport.sent).toHaveLength(0);
  });
});
