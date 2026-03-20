import { StunClient } from "../../stun/stun-client.js";

// Testes de integração real — requerem internet
// Não rodam em CI. Use: npm run test:integration
describe("StunClient @integration", () => {
  it(
    "descobre endpoint público real via stun.l.google.com",
    async () => {
      const client = new StunClient([{ host: "stun.l.google.com", port: 19302 }], {
        timeoutMs: 5000,
      });

      const endpoint = await client.discover();

      expect(endpoint.host).toMatch(/^\d+\.\d+\.\d+\.\d+$/);
      expect(endpoint.port).toBeGreaterThan(0);
      expect(endpoint.port).toBeLessThanOrEqual(65535);
    },
    10000
  );

  it(
    "retorna o mesmo IP público em duas chamadas consecutivas",
    async () => {
      const client = new StunClient([{ host: "stun.l.google.com", port: 19302 }], {
        timeoutMs: 5000,
      });

      const a = await client.discover();
      const b = await client.discover();

      expect(a.host).toBe(b.host);
    },
    20000
  );

  it(
    "funciona com servidor alternativo stun.cloudflare.com",
    async () => {
      const client = new StunClient([{ host: "stun.cloudflare.com", port: 3478 }], {
        timeoutMs: 5000,
      });

      const endpoint = await client.discover();

      expect(endpoint.host).toMatch(/^\d+\.\d+\.\d+\.\d+$/);
      expect(endpoint.port).toBeGreaterThan(0);
    },
    10000
  );

  it(
    "usa o mais rápido entre múltiplos servidores STUN",
    async () => {
      const client = new StunClient(
        [
          { host: "stun.l.google.com", port: 19302 },
          { host: "stun1.l.google.com", port: 19302 },
          { host: "stun.cloudflare.com", port: 3478 },
        ],
        { timeoutMs: 5000 }
      );

      const endpoint = await client.discover();

      expect(endpoint.host).toMatch(/^\d+\.\d+\.\d+\.\d+$/);
      expect(endpoint.port).toBeGreaterThan(0);
    },
    10000
  );
});
