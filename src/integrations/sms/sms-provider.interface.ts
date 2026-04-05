export interface SmsProvider {
  send(to: string, message: string): Promise<void>;
}

export const SMS_PROVIDER = Symbol("SMS_PROVIDER");
