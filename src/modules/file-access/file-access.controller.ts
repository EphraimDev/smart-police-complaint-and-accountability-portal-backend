import {
  BadRequestException,
  Controller,
  Get,
  NotFoundException,
  Query,
  Res,
} from "@nestjs/common";
import { ApiExcludeController } from "@nestjs/swagger";
import { Response } from "express";
import * as mime from "mime-types";
import * as path from "path";
import { Public } from "@common/decorators";
import { LocalStorageProvider } from "@integrations/storage";

@ApiExcludeController()
@Public()
@Controller("files")
export class FileAccessController {
  constructor(private readonly storageProvider: LocalStorageProvider) {}

  @Get()
  async getFile(
    @Query("path") filePath: string | undefined,
    @Query("expires") expires: string | undefined,
    @Query("signature") signature: string | undefined,
    @Res() res: Response,
  ): Promise<void> {
    if (!filePath || !expires || !signature) {
      throw new BadRequestException("Missing signed file URL parameters");
    }

    const expiresAt = Number(expires);
    if (!Number.isFinite(expiresAt)) {
      throw new BadRequestException("Invalid file URL expiry");
    }

    if (
      !this.storageProvider.isSignedUrlValid(filePath, expiresAt, signature)
    ) {
      throw new BadRequestException("Invalid or expired file URL");
    }

    try {
      const fileBuffer = await this.storageProvider.download(filePath);
      const contentType = mime.lookup(filePath) || "application/octet-stream";
      const fileName = path.basename(filePath);

      res.setHeader("Content-Type", contentType);
      res.setHeader("Content-Length", fileBuffer.length.toString());
      res.setHeader("Content-Disposition", `inline; filename="${fileName}"`);
      res.send(fileBuffer);
    } catch (error) {
      throw new NotFoundException("File not found");
    }
  }
}
