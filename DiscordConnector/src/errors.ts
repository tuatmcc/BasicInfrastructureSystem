export class AuthenticationError extends Error {
  readonly name: string = "AuthenticationError";
}

export class AuthorizationError extends Error {
  readonly name: string = "AuthorizationError";
}

export class NotFoundError extends Error {
  readonly name: string = "NotFoundError";
}

export class ValidationError extends Error {
  readonly name: string = "ValidationError";

  constructor(
    message: string,
    readonly issues: string[] = [message],
  ) {
    super(message);
  }
}

export class DiscordError extends Error {
  readonly name: string = "DiscordError";
}

export class DiscordConnectionError extends DiscordError {
  readonly name: string = "DiscordConnectionError";
}

export class DatabaseError extends Error {
  readonly name: string = "DatabaseError";
}
