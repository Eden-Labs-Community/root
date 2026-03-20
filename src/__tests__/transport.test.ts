import { EdenTransport, Endpoint } from "../transports/transport.js";

// TASK-001: EdenTransport interface contract
describe("EdenTransport", () => {
  it("accepts a minimal compliant implementation", () => {
    const transport: EdenTransport = {
      send: (_msg: Buffer) => {},
      bind: (_port: number, _onMessage: (msg: Buffer) => void) => {},
      close: () => {},
    };
    expect(transport).toBeDefined();
  });

  it("Endpoint has host and port", () => {
    const endpoint: Endpoint = { host: "127.0.0.1", port: 4000 };
    expect(endpoint.host).toBe("127.0.0.1");
    expect(endpoint.port).toBe(4000);
  });

  it("EdenTransport is structurally compatible with Emitter fakeSocket", () => {
    const sent: Buffer[] = [];
    const transport: EdenTransport = {
      send: (msg: Buffer) => sent.push(msg),
      bind: () => {},
      close: () => {},
    };
    transport.send(Buffer.from("hello"));
    expect(sent).toHaveLength(1);
    expect(sent[0]!.toString()).toBe("hello");
  });
});
