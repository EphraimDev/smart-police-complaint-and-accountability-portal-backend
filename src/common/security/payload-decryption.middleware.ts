import { Injectable, NestMiddleware } from "@nestjs/common";
import { NextFunction, Request, Response } from "express";
import { PayloadEncryptionService } from "./payload-encryption.service";

@Injectable()
export class PayloadDecryptionMiddleware implements NestMiddleware {
  constructor(
    private readonly payloadEncryptionService: PayloadEncryptionService,
  ) {}

  use(request: Request, _response: Response, next: NextFunction): void {
    if (!this.payloadEncryptionService.shouldDecryptRequest(request)) {
      next();
      return;
    }

    try {
      request.body = this.payloadEncryptionService.decryptRequestBody(
        request.body,
        request,
      );
      next();
    } catch (error) {
      next(error);
    }
  }
}
