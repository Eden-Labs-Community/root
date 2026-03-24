import { v4 as uuid } from "uuid";
import { EdenInvalidEventTypeError } from "../errors/errors.js";

const EVENT_TYPE_REGEX = /^[^:]+:[^:]+:[^:]+$/;

export interface EventEnvelope {
  id: string;
  type: string;
  payload: unknown;
  timestamp: number;
  version: string;
  room?: string;
  ttl?: number;
  origin?: string;
}

export function createEnvelope(
  input: Pick<EventEnvelope, "type" | "payload" | "room" | "ttl" | "origin">
): EventEnvelope {
  if (!EVENT_TYPE_REGEX.test(input.type)) {
    throw new EdenInvalidEventTypeError(input.type);
  }

  const envelope: EventEnvelope = {
    id: uuid(),
    type: input.type,
    payload: input.payload,
    timestamp: Date.now(),
    version: "1.0.0",
  };

  if (input.room !== undefined) {
    envelope.room = input.room;
  }

  if (input.ttl !== undefined) {
    envelope.ttl = input.ttl;
  }

  if (input.origin !== undefined) {
    envelope.origin = input.origin;
  }

  return envelope;
}
