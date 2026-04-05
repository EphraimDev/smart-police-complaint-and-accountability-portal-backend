import { Injectable, Logger } from "@nestjs/common";
import { SmsProvider } from "./sms-provider.interface";

@Injectable()
export class MockSmsProvider implements SmsProvider {
  private readonly logger = new Logger(MockSmsProvider.name);

  async send(to: string, message: string): Promise<void> {
    this.logger.log(
      `[MOCK SMS] To: ${to} | Message: ${message.substring(0, 50)}...`,
    );
  }
}
