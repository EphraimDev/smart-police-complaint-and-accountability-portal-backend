import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import * as request from "supertest";

/**
 * E2E test template for core API flows.
 * Requires a running PostgreSQL and Redis instance.
 * Run via: npm run test:e2e
 */
describe("Health (e2e)", () => {
  let app!: INestApplication;

  beforeAll(async () => {
    // To run full e2e tests, import AppModule and create the application.
    // This requires a running database. Skipping for CI without infra.
    // const moduleFixture: TestingModule = await Test.createTestingModule({
    //   imports: [AppModule],
    // }).compile();
    // app = moduleFixture.createNestApplication();
    // await app.init();
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  it("placeholder — e2e tests require running infrastructure", () => {
    expect(true).toBe(true);
  });

  // Uncomment below when running with docker-compose test infrastructure:
  // it('/api/v1/health (GET)', () => {
  //   return request(app.getHttpServer())
  //     .get('/api/v1/health')
  //     .expect(200);
  // });
  //
  // it('/api/v1/auth/login (POST)', () => {
  //   return request(app.getHttpServer())
  //     .post('/api/v1/auth/login')
  //     .send({ email: 'admin@spcap.gov', password: 'Admin@123456' })
  //     .expect(201)
  //     .expect((res) => {
  //       expect(res.body.data.accessToken).toBeDefined();
  //       expect(res.body.data.refreshToken).toBeDefined();
  //     });
  // });
});
