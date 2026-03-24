import { createEnvelope } from "../envelope/envelope.js";
import { EdenInvalidEventTypeError } from "../errors/errors.js";

describe("Envelope", () => {
  it("creates an envelope with a unique id", () => {
    const envelope = createEnvelope({ type: "eden:user:created", payload: {} });
    expect(envelope.id).toBeDefined();
  });

  it("creates two envelopes with different ids", () => {
    const a = createEnvelope({ type: "eden:user:created", payload: {} });
    const b = createEnvelope({ type: "eden:user:created", payload: {} });
    expect(a.id).not.toBe(b.id);
  });

  it("throws EdenInvalidEventTypeError for type without namespace", () => {
    expect(() => createEnvelope({ type: "created", payload: {} }))
      .toThrow(EdenInvalidEventTypeError);
  });

  it("throws EdenInvalidEventTypeError for type with only two parts", () => {
    expect(() => createEnvelope({ type: "eden:created", payload: {} }))
      .toThrow(EdenInvalidEventTypeError);
  });

  it("throws EdenInvalidEventTypeError for empty type", () => {
    expect(() => createEnvelope({ type: "", payload: {} }))
      .toThrow(EdenInvalidEventTypeError);
  });

  it("creates envelope with ttl and origin", () => {
    const envelope = createEnvelope({
      type: "eden:chat:message",
      payload: {},
      ttl: 10,
      origin: "peer-abc",
    });
    expect(envelope.ttl).toBe(10);
    expect(envelope.origin).toBe("peer-abc");
  });

  it("creates envelope without ttl and origin (backward compatible)", () => {
    const envelope = createEnvelope({ type: "eden:chat:message", payload: {} });
    expect(envelope.ttl).toBeUndefined();
    expect(envelope.origin).toBeUndefined();
  });

  it("creates envelope with only ttl", () => {
    const envelope = createEnvelope({
      type: "eden:chat:message",
      payload: {},
      ttl: 5,
    });
    expect(envelope.ttl).toBe(5);
    expect(envelope.origin).toBeUndefined();
  });

  it("creates envelope with only origin", () => {
    const envelope = createEnvelope({
      type: "eden:chat:message",
      payload: {},
      origin: "peer-xyz",
    });
    expect(envelope.ttl).toBeUndefined();
    expect(envelope.origin).toBe("peer-xyz");
  });
});
