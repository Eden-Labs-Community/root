import { randomBytes } from "node:crypto";

const MAGIC_COOKIE = 0x2112a442;
const MSG_BINDING_REQUEST = 0x0001;
const MSG_BINDING_RESPONSE = 0x0101;
const ATTR_XOR_MAPPED_ADDRESS = 0x0020;

export interface StunEndpoint {
  ip: string;
  port: number;
}

export function buildBindingRequest(): { message: Buffer; transactionId: Buffer } {
  const transactionId = randomBytes(12);
  const message = Buffer.alloc(20);

  message.writeUInt16BE(MSG_BINDING_REQUEST, 0);
  message.writeUInt16BE(0, 2);
  message.writeUInt32BE(MAGIC_COOKIE, 4);
  transactionId.copy(message, 8);

  return { message, transactionId };
}

export function parseBindingResponse(buf: Buffer): StunEndpoint | null {
  if (buf.length < 20) return null;

  const msgType = buf.readUInt16BE(0);
  if (msgType !== MSG_BINDING_RESPONSE) return null;

  const msgLen = buf.readUInt16BE(2);
  const magic = buf.readUInt32BE(4);
  if (magic !== MAGIC_COOKIE) return null;

  let offset = 20;
  const end = 20 + msgLen;

  while (offset + 4 <= end && offset + 4 <= buf.length) {
    const attrType = buf.readUInt16BE(offset);
    const attrLen = buf.readUInt16BE(offset + 2);

    if (attrType === ATTR_XOR_MAPPED_ADDRESS && offset + 4 + attrLen <= buf.length) {
      const family = buf.readUInt8(offset + 5);
      if (family !== 0x01) return null; // IPv6 not supported yet

      const xorPort = buf.readUInt16BE(offset + 6);
      const port = xorPort ^ (MAGIC_COOKIE >>> 16);

      const xorIp = buf.readUInt32BE(offset + 8);
      const ipInt = (xorIp ^ MAGIC_COOKIE) >>> 0;
      const ip = [
        (ipInt >>> 24) & 0xff,
        (ipInt >>> 16) & 0xff,
        (ipInt >>> 8) & 0xff,
        ipInt & 0xff,
      ].join(".");

      return { ip, port };
    }

    // advance past attribute + padding to 4-byte boundary
    offset += 4 + attrLen + ((4 - (attrLen % 4)) % 4);
  }

  return null;
}
