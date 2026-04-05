import { DataSource, QueryRunner } from "typeorm";

export class TransactionHelper {
  static async run<T>(
    dataSource: DataSource,
    work: (queryRunner: QueryRunner) => Promise<T>,
  ): Promise<T> {
    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const result = await work(queryRunner);
      await queryRunner.commitTransaction();
      return result;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}
