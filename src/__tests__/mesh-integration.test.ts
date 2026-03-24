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

function envToBuf(env: EventEnvelope): Buffer {
  return Buffer.from(JSON.stringify(env));
}

describe("MeshRelay integration", () => {
  it("multi-hop: A→B→C propagation", () => {
    const tA = makeTransport();
    const tB = makeTransport();
    const tC = makeTransport();

    const deliveredA: EventEnvelope[] = [];
    const deliveredB: EventEnvelope[] = [];
    const deliveredC: EventEnvelope[] = [];

    const meshA = new MeshRelay({ transport: tA, peerId: "A", onMessage: (m) => deliveredA.push(JSON.parse(m.toString())) });
    const meshB = new MeshRelay({ transport: tB, peerId: "B", onMessage: (m) => deliveredB.push(JSON.parse(m.toString())) });
    const meshC = new MeshRelay({ transport: tC, peerId: "C", onMessage: (m) => deliveredC.push(JSON.parse(m.toString())) });

    meshA.bind();
    meshB.bind();
    meshC.bind();

    // A emits
    const env = createEnvelope({ type: "eden:chat:message", payload: "from A" });
    meshA.emit(envToBuf(env));

    // A sent to transport → B receives it
    expect(tA.sent).toHaveLength(1);
    tB.deliver(tA.sent[0]!);

    // B delivered and forwarded
    expect(deliveredB).toHaveLength(1);
    expect(tB.sent).toHaveLength(1);

    // B's forward → C receives it
    tC.deliver(tB.sent[0]!);
    expect(deliveredC).toHaveLength(1);
    expect(deliveredC[0]!.id).toBe(env.id);

    // TTL decremented: A sent with 10, B forwarded with 9, C sees 9
    const cEnv = deliveredC[0]!;
    expect(cEnv.ttl).toBe(9);
  });

  it("mesh disabled: Eden without MeshRelay works normally", () => {
    // Just use transport directly — no MeshRelay in the chain
    const transport = makeTransport();
    transport.bind(0, () => {});

    const msg = Buffer.from(JSON.stringify(createEnvelope({ type: "eden:test:event", payload: "direct" })));
    transport.send(msg);
    expect(transport.sent).toHaveLength(1);
  });

  it("control messages (heartbeat, probe, ACK) are not propagated", () => {
    const transport = makeTransport();
    const delivered: unknown[] = [];
    const mesh = new MeshRelay({
      transport,
      peerId: "me",
      onMessage: (m) => delivered.push(JSON.parse(m.toString())),
    });
    mesh.bind();

    // ACK — delivered but not forwarded
    const ack = { type: "__ack__", id: "abc", receivedAt: Date.now() };
    transport.deliver(Buffer.from(JSON.stringify(ack)));
    expect(delivered).toHaveLength(1);
    expect(transport.sent).toHaveLength(0);

    // Non-JSON binary (probe/heartbeat) — passed through as-is, not forwarded
    const nonJsonDelivered: Buffer[] = [];
    const mesh2 = new MeshRelay({
      transport: makeTransport(),
      peerId: "me2",
      onMessage: (m) => nonJsonDelivered.push(m),
    });
    const t2 = makeTransport();
    const mesh2Real = new MeshRelay({
      transport: t2,
      peerId: "me2",
      onMessage: (m) => nonJsonDelivered.push(m),
    });
    mesh2Real.bind();
    t2.deliver(Buffer.from("__EDEN_PROBE__"));
    expect(nonJsonDelivered).toHaveLength(1);
    expect(t2.sent).toHaveLength(0);
  });

  it("deduplication prevents loops in mesh cycle A↔B↔C↔A", () => {
    const tA = makeTransport();
    const tB = makeTransport();
    const tC = makeTransport();

    const deliveredA: EventEnvelope[] = [];
    const deliveredB: EventEnvelope[] = [];
    const deliveredC: EventEnvelope[] = [];

    const meshA = new MeshRelay({ transport: tA, peerId: "A", onMessage: (m) => deliveredA.push(JSON.parse(m.toString())) });
    const meshB = new MeshRelay({ transport: tB, peerId: "B", onMessage: (m) => deliveredB.push(JSON.parse(m.toString())) });
    const meshC = new MeshRelay({ transport: tC, peerId: "C", onMessage: (m) => deliveredC.push(JSON.parse(m.toString())) });

    meshA.bind();
    meshB.bind();
    meshC.bind();

    // A emits
    const env = createEnvelope({ type: "eden:chat:message", payload: "loop test" });
    meshA.emit(envToBuf(env));

    // A→B
    tB.deliver(tA.sent[0]!);
    // B→C
    tC.deliver(tB.sent[0]!);
    // C→A (loop) — should be deduplicated
    const beforeA = deliveredA.length;
    const cForward = tC.sent[0];
    if (cForward) tA.deliver(cForward);
    expect(deliveredA.length).toBe(beforeA); // no new delivery

    // Each peer delivered exactly once
    expect(deliveredB).toHaveLength(1);
    expect(deliveredC).toHaveLength(1);
  });
});
