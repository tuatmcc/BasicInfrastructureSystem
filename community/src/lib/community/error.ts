export class CommunityProviderError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly provider: string,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = 'CommunityProviderError';
  }
}
