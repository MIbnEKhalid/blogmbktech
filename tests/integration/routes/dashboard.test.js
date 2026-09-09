import { describe, test, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { createTestApp } from "../../helpers/createTestApp.js";
import { createTestDb, cleanupTestDb } from "../../helpers/createTestDb.js";
import { TaxonomyRepository } from "../../../src/repositories/taxonomy.repository.js";

describe("Dashboard Route Integration Tests", () => {
  let app;
  let adapter;
  let taxonomyRepo;

  beforeAll(async () => {
    adapter = await createTestDb();
    taxonomyRepo = new TaxonomyRepository(adapter);
    app = createTestApp({ user: { username: "admin", role: "superadmin" } });
  });

  afterAll(async () => {
    await cleanupTestDb();
  });

  describe("Dashboard Endpoints (with Authenticated Session)", () => {
    test("GET /dashboard renders overview with stats", async () => {
      const res = await request(app).get("/dashboard");
      expect(res.status).toBe(200);
    });

    test("POST /dashboard/api/categories creates a new category", async () => {
      const res = await request(app)
        .post("/dashboard/api/categories")
        .send({ name: "DevOps & Cloud", description: "All things cloud" });

      expect([200, 201]).toContain(res.status);

      const found = await taxonomyRepo.findCategoryByName("DevOps & Cloud");
      expect(found.rows.length).toBeGreaterThanOrEqual(1);
    });

    test("POST /dashboard/api/tags creates a new tag", async () => {
      const res = await request(app)
        .post("/dashboard/api/tags")
        .send({ name: "kubernetes" });

      expect([200, 201]).toContain(res.status);

      const found = await taxonomyRepo.findTagByName("kubernetes");
      expect(found.rows.length).toBeGreaterThanOrEqual(1);
    });
  });
});
