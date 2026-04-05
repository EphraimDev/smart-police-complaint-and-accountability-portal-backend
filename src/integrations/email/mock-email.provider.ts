import { Injectable, Logger } from "@nestjs/common";
import { EmailProvider } from "./email-provider.interface";

@Injectable()
export class MockEmailProvider implements EmailProvider {
  private readonly logger = new Logger(MockEmailProvider.name);

  async send(
    to: string,
    subject: string,
    body: string,
    html?: string,
  ): Promise<void> {
    this.logger.log(
      `[MOCK EMAIL] To: ${to} | Subject: ${subject} | Body length: ${body.length}`,
    );
  }
}
