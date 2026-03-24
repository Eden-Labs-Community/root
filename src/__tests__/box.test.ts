import nacl from "tweetnacl";
import { encrypt, decrypt } from "../crypto/box.js";

describe("encrypt / decrypt", () => {
  const alice = nacl.box.keyPair();
  const bob = nacl.box.keyPair();

  it("decrypt of encrypt returns the original buffer", () => {
    const plaintext = Buffer.from("hello eden");
    const cipher = encrypt(plaintext, bob.publicKey, alice.secretKey);
    const result = decrypt(cipher, alice.publicKey, bob.secretKey);
    expect(result).not.toBeNull();
    expect(Buffer.from(result!).toString()).toBe("hello eden");
  });

  it("decrypt with wrong key returns null", () => {
    const plaintext = Buffer.from("secret");
    const cipher = encrypt(plaintext, bob.publicKey, alice.secretKey);
    const eve = nacl.box.keyPair();
    const result = decrypt(cipher, eve.publicKey, bob.secretKey);
    expect(result).toBeNull();
  });

  it("decrypt with corrupted buffer returns null", () => {
    const plaintext = Buffer.from("data");
    const cipher = encrypt(plaintext, bob.publicKey, alice.secretKey);
    const corrupted = Buffer.from(cipher);
    corrupted[corrupted.length - 1]! ^= 0xff;
    const result = decrypt(corrupted, alice.publicKey, bob.secretKey);
    expect(result).toBeNull();
  });

  it("decrypt with buffer < 24 bytes returns null", () => {
    const short = Buffer.alloc(23);
    const result = decrypt(short, alice.publicKey, bob.secretKey);
    expect(result).toBeNull();
  });

  it("nonce is different on each call", () => {
    const plaintext = Buffer.from("same input");
    const c1 = encrypt(plaintext, bob.publicKey, alice.secretKey);
    const c2 = encrypt(plaintext, bob.publicKey, alice.secretKey);
    const nonce1 = c1.slice(0, 24);
    const nonce2 = c2.slice(0, 24);
    expect(Buffer.from(nonce1).equals(Buffer.from(nonce2))).toBe(false);
  });

  it("output format is [nonce (24 bytes) | ciphertext]", () => {
    const plaintext = Buffer.from("test");
    const cipher = encrypt(plaintext, bob.publicKey, alice.secretKey);
    expect(cipher.length).toBeGreaterThan(24);
  });
});
