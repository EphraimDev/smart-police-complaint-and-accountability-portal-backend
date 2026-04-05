import { Module } from "@nestjs/common";
import { FileAccessController } from "./file-access.controller";
import { LocalStorageProvider } from "@integrations/storage";

@Module({
  controllers: [FileAccessController],
  providers: [LocalStorageProvider],
})
export class FileAccessModule {}
