export interface EmailProvider {
  send(to: string, subject: string, body: string, html?: string): Promise<void>;
}

export const EMAIL_PROVIDER = Symbol("EMAIL_PROVIDER");
