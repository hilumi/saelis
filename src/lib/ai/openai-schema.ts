import { SUPPORT_MODES } from "@/lib/constants";

/**
 * JSON Schema for OpenAI structured outputs, mirroring companionResponseSchema.
 *
 * The installed Zod (v3) has no native JSON-schema export, so this is a small
 * explicit schema. Parity with the Zod contract is proven by tests
 * (openai-schema.test.ts). Property order matters for streaming: `message`
 * comes right after `supportMode` so visible text can stream early.
 *
 * OpenAI strict mode requires: additionalProperties:false everywhere, every
 * property listed in `required`, and nullability expressed via type unions.
 */
export const COMPANION_RESPONSE_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "supportMode",
    "message",
    "followUp",
    "closingLine",
    "suggestedStep",
    "proposedMemory",
    "safety",
    "reflection",
    "adaptationNotice",
    "insightCandidate",
  ],
  properties: {
    supportMode: { type: "string", enum: [...SUPPORT_MODES] },
    message: { type: "string" },
    followUp: { type: ["string", "null"] },
    closingLine: { type: ["string", "null"] },
    suggestedStep: {
      anyOf: [
        {
          type: "object",
          additionalProperties: false,
          required: ["title", "description", "estimatedMinutes"],
          properties: {
            title: { type: "string" },
            description: { type: "string" },
            estimatedMinutes: { type: "integer", minimum: 1, maximum: 120 },
          },
        },
        { type: "null" },
      ],
    },
    proposedMemory: {
      anyOf: [
        {
          type: "object",
          additionalProperties: false,
          required: ["category", "content", "reason"],
          properties: {
            category: { type: "string" },
            content: { type: "string" },
            reason: { type: "string" },
          },
        },
        { type: "null" },
      ],
    },
    safety: {
      type: "object",
      additionalProperties: false,
      required: ["level", "message"],
      properties: {
        level: { type: "string", enum: ["none", "support", "urgent"] },
        message: { type: ["string", "null"] },
      },
    },
    reflection: {
      anyOf: [
        {
          type: "object",
          additionalProperties: false,
          required: ["facts", "interpretations", "unknowns", "alternativePerspectives"],
          properties: {
            facts: { type: "array", items: { type: "string" } },
            interpretations: { type: "array", items: { type: "string" } },
            unknowns: { type: "array", items: { type: "string" } },
            alternativePerspectives: { type: "array", items: { type: "string" } },
          },
        },
        { type: "null" },
      ],
    },
    adaptationNotice: {
      anyOf: [
        {
          type: "object",
          additionalProperties: false,
          required: ["summary", "preferenceKey"],
          properties: {
            summary: { type: "string" },
            preferenceKey: { type: "string" },
          },
        },
        { type: "null" },
      ],
    },
    insightCandidate: {
      anyOf: [
        {
          type: "object",
          additionalProperties: false,
          required: ["theme", "observation", "uncertaintyStatement"],
          properties: {
            theme: { type: "string" },
            observation: { type: "string" },
            uncertaintyStatement: { type: "string" },
          },
        },
        { type: "null" },
      ],
    },
  },
} as const;

export const COMPANION_RESPONSE_SCHEMA_NAME = "companion_response";
