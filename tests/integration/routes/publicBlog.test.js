import { describe, test, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import app from "../../../src/app.js";
import { createTestDb, cleanupTestDb } from "../../helpers/createTestDb.js";
import { PostRepository } from "../../../src/repositories/PostRepository.js";
import { TaxonomyRepository } from "../../../src/repositories/TaxonomyRepository.js";

describe("Public Blog Route Integration Tests", () => {
  let adapter;
  let postRepo;
  let taxonomyRepo;
  let createdPostId;

  beforeAll(async () => {
    adapter = await createTestDb();
    postRepo = new PostRepository(adapter);
    taxonomyRepo = new TaxonomyRepository(adapter);

    // Create a category
    await taxonomyRepo.createCategory("Tech", "Tech Articles");

    // Create a published test post with relations
    createdPostId = await postRepo.createPostWithRelations({
      title: "Integration Test Post",
      content: "# Hello World\n\nThis is a test post.",
      excerpt: "A test post for integration testing",
      categories: [1],
      tags: ["JavaScript"],
      status: "published",
      preview_image: "/Assets/test.png",
      customSlug: "integration-test-post",
      username: "admin",
    });
  });

  afterAll(async () => {
    await cleanupTestDb();
  });

  describe("Public Blog Pages", () => {
    test("GET / returns 200 and renders home page", async () => {
      const res = await request(app).get("/");
      expect(res.status).toBe(200);
      expect(res.text).toContain("Integration Test Post");
    });

    test("GET /categories returns 200 and lists categories", async () => {
      const res = await request(app).get("/categories");
      expect(res.status).toBe(200);
    });

    test("GET /tags returns 200 and lists tags", async () => {
      const res = await request(app).get("/tags");
      expect(res.status).toBe(200);
    });

    test("GET /bookmarks returns 200 and renders bookmarks page", async () => {
      const res = await request(app).get("/bookmarks");
      expect(res.status).toBe(200);
    });

    test("GET /post/:slug renders single post page", async () => {
      const res = await request(app).get("/post/integration-test-post");
      expect(res.status).toBe(200);
      expect(res.text).toContain("Integration Test Post");
      expect(res.text).toContain("Hello World");
    });

    test("GET /post/:slug returns 404 for non-existent post", async () => {
      const res = await request(app).get("/post/non-existent-slug-xyz");
      expect(res.status).toBe(404);
    });

    test("GET /api/non-existent-blog-endpoint returns standardized JSON 404 envelope", async () => {
      const res = await request(app).get("/api/non-existent-blog-endpoint");
      expect(res.status).toBe(404);
      expect(res.headers["content-type"]).toContain("application/json");
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBeDefined();
      expect(res.body.error.code).toBe("ROUTE_NOT_FOUND");
    });
  });
});
