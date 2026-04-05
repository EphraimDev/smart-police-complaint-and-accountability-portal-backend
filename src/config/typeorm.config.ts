import { DataSource } from "typeorm";
import * as dotenv from "dotenv";

dotenv.config();
console.log(__dirname + "/../database/migrations/*{.ts,.js}");
export default new DataSource({
  type: "postgres",
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || "5432", 10),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : false,
  entities: [__dirname + "/../**/*.entity{.ts,.js}"],
  migrations: [__dirname + "/../migrations/*{.ts,.js}"],
  synchronize: false,
  logging: false,
});
