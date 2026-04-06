import { MigrationInterface, QueryRunner } from "typeorm";

export class MakeUserPasswordHashNullable1775491200000
  implements MigrationInterface
{
  name = "MakeUserPasswordHashNullable1775491200000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "users" ALTER COLUMN "passwordHash" DROP NOT NULL',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "users" ALTER COLUMN "passwordHash" SET NOT NULL',
    );
  }
}
