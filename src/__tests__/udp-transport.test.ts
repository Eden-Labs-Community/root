import { UdpTransport } from "../transports/udp/udp-transport.js";
import { EdenTransport } from "../transports/transport.js";

// TASK-002: UdpTransport implementa EdenTransport
describe("UdpTransport", () => {
  it("implements EdenTransport interface", () => {
    const t: EdenTransport = new UdpTransport({ host: "127.0.0.1", port: 41300 });
    expect(t).toBeDefined();
    t.close();
  });

  it("sends a message and receives it on loopback", (done) => {
    const transport = new UdpTransport({ host: "127.0.0.1", port: 41301 });

    transport.bind(41301, (msg) => {
      expect(msg.toString()).toBe("hello-transport");
      transport.close();
      done();
    });

    transport.send(Buffer.from("hello-transport"));
  });
});
