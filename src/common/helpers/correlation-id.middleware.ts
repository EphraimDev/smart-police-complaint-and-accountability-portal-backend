import { Injectable, NestMiddleware } from "@nestjs/common";
import { Request, Response, NextFunction } from "express";
import { v4 as uuidv4 } from "uuid";
import { APP_CONSTANTS } from "@common/constants";

@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  use(req: Request, _res: Response, next: NextFunction): void {
    const correlationId =
      (req.headers[APP_CONSTANTS.CORRELATION_ID_HEADER] as string) || uuidv4();
    req.headers[APP_CONSTANTS.CORRELATION_ID_HEADER] = correlationId;
    next();
  }
}
