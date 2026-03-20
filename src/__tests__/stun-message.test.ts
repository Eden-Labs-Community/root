import { buildBindingRequest, parseBindingResponse } from "../stun/stun-message.js";

const MAGIC_COOKIE = 0x2112a442;

// TASK-003: STUN message build/parse (RFC 5389)
describe("buildBindingRequest", () => {
  it("returns a 20-byte buffer", () => {
    const { message } = buildBindingRequest();
    expect(message.length).toBe(20);
  });

  it("sets message type to 0x0001 (Binding Request)", () => {
    const { message } = buildBindingRequest();
    expect(message.readUInt16BE(0)).toBe(0x0001);
  });

  it("sets message length to 0 (no attributes)", () => {
    const { message } = buildBindingRequest();
    expect(message.readUInt16BE(2)).toBe(0);
  });

  it("sets magic cookie to 0x2112A442", () => {
    const { message } = buildBindingRequest();
    expect(message.readUInt32BE(4)).toBe(MAGIC_COOKIE);
  });

  it("sets a 12-byte transaction ID at bytes 8-19", () => {
    const { message, transactionId } = buildBindingRequest();
    expect(transactionId.length).toBe(12);
    expect(message.subarray(8, 20).equals(transactionId)).toBe(true);
  });

  it("generates unique transaction IDs", () => {
    const { transactionId: a } = buildBindingRequest();
    const { transactionId: b } = buildBindingRequest();
    expect(a.equals(b)).toBe(false);
  });
});

describe("parseBindingResponse", () => {
  function buildFakeResponse(ip: string, port: number): Buffer {
    // XOR values
    const xorPort = port ^ (MAGIC_COOKIE >>> 16);
    const ipParts = ip.split(".").map(Number);
    const ipInt =
      ((ipParts[0]! << 24) | (ipParts[1]! << 16) | (ipParts[2]! << 8) | ipParts[3]!) >>> 0;
    const xorIp = (ipInt ^ MAGIC_COOKIE) >>> 0;

    // Attribute: XOR-MAPPED-ADDRESS (type=0x0020, len=8)
    const attr = Buffer.alloc(12);
    attr.writeUInt16BE(0x0020, 0); // type
    attr.writeUInt16BE(8, 2);      // length
    attr.writeUInt8(0x00, 4);      // reserved
    attr.writeUInt8(0x01, 5);      // family IPv4
    attr.writeUInt16BE(xorPort, 6);
    attr.writeUInt32BE(xorIp, 8);

    // Header: 20 bytes
    const header = Buffer.alloc(20);
    header.writeUInt16BE(0x0101, 0);      // Binding Success Response
    header.writeUInt16BE(attr.length, 2); // message length
    header.writeUInt32BE(MAGIC_COOKIE, 4);
    // transaction ID: zero for test

    return Buffer.concat([header, attr]);
  }

  it("parses IP and port from XOR-MAPPED-ADDRESS", () => {
    const buf = buildFakeResponse("1.2.3.4", 54321);
    const result = parseBindingResponse(buf);
    expect(result).not.toBeNull();
    expect(result!.ip).toBe("1.2.3.4");
    expect(result!.port).toBe(54321);
  });

  it("parses 127.0.0.1 correctly", () => {
    const buf = buildFakeResponse("127.0.0.1", 19302);
    const result = parseBindingResponse(buf);
    expect(result!.ip).toBe("127.0.0.1");
    expect(result!.port).toBe(19302);
  });

  it("returns null for buffer shorter than 20 bytes", () => {
    expect(parseBindingResponse(Buffer.alloc(10))).toBeNull();
  });

  it("returns null for wrong magic cookie", () => {
    const buf = buildFakeResponse("1.2.3.4", 1234);
    buf.writeUInt32BE(0xdeadbeef, 4); // overwrite magic cookie
    expect(parseBindingResponse(buf)).toBeNull();
  });

  it("returns null for non-response message type", () => {
    const buf = buildFakeResponse("1.2.3.4", 1234);
    buf.writeUInt16BE(0x0001, 0); // overwrite as Binding Request
    expect(parseBindingResponse(buf)).toBeNull();
  });

  it("returns null if no XOR-MAPPED-ADDRESS attribute found", () => {
    const header = Buffer.alloc(20);
    header.writeUInt16BE(0x0101, 0);
    header.writeUInt16BE(0, 2); // no attributes
    header.writeUInt32BE(MAGIC_COOKIE, 4);
    expect(parseBindingResponse(header)).toBeNull();
  });
});
