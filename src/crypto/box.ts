import nacl from "tweetnacl";

const NONCE_LENGTH = 24;

export function encrypt(
  plaintext: Uint8Array,
  theirPublicKey: Uint8Array,
  mySecretKey: Uint8Array,
): Uint8Array {
  const nonce = nacl.randomBytes(NONCE_LENGTH);
  const ciphertext = nacl.box(plaintext, nonce, theirPublicKey, mySecretKey);
  const result = new Uint8Array(NONCE_LENGTH + ciphertext.length);
  result.set(nonce, 0);
  result.set(ciphertext, NONCE_LENGTH);
  return result;
}

export function decrypt(
  box: Uint8Array,
  theirPublicKey: Uint8Array,
  mySecretKey: Uint8Array,
): Uint8Array | null {
  if (box.length < NONCE_LENGTH) return null;

  const nonce = box.slice(0, NONCE_LENGTH);
  const ciphertext = box.slice(NONCE_LENGTH);
  const result = nacl.box.open(ciphertext, nonce, theirPublicKey, mySecretKey);
  return result;
}
