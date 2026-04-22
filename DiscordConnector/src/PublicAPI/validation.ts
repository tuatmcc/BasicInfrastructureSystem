import { ValidationError } from "../errors";
import type { RgbColor, Snowflake } from "../types";

type JsonObject = Record<string, unknown>;

export function asObject(value: unknown): JsonObject {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new ValidationError("Request body must be an object");
  }
  return value as JsonObject;
}

export function requiredString(data: JsonObject, key: string): string {
  const value = data[key];
  if (typeof value !== "string") {
    throw new ValidationError(`${key} is required`);
  }
  return value;
}

export function optionalNumber(data: JsonObject, key: string): number | null {
  const value = data[key];
  if (value === undefined || value === null) {
    return null;
  }
  if (typeof value !== "number" || !Number.isInteger(value)) {
    throw new ValidationError(`${key} must be an integer`);
  }
  return value;
}

export function optionalColor(data: JsonObject, key: string): RgbColor | null {
  const value = data[key];
  if (value === undefined || value === null) {
    return null;
  }
  if (!Array.isArray(value) || value.length !== 3) {
    throw new ValidationError(`${key} must be an RGB tuple`);
  }
  const color = value.map((part) => {
    if (typeof part !== "number" || !Number.isInteger(part) || part < 0 || part > 255) {
      throw new ValidationError(`${key} must contain integers from 0 to 255`);
    }
    return part;
  });
  return [color[0]!, color[1]!, color[2]!];
}

export function requiredSnowflake(data: JsonObject, key: string): Snowflake {
  const value = data[key];
  return parseSnowflake(value, key);
}

export function optionalSnowflake(data: JsonObject, key: string): Snowflake | null {
  const value = data[key];
  if (value === undefined || value === null) {
    return null;
  }
  return parseSnowflake(value, key);
}

export function querySnowflake(url: URL, key: string): Snowflake {
  const value = url.searchParams.get(key);
  return parseSnowflake(value, key);
}

function parseSnowflake(value: unknown, key: string): Snowflake {
  if (typeof value !== "string" || !/^\d+$/.test(value)) {
    throw new ValidationError(`${key} must be a Discord snowflake string`);
  }
  return value;
}
