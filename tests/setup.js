/**
 * Global test setup for blogmbktech — runs before every test file.
 */
import { vi } from "vitest";

// Force SQLite in-memory mode for all tests
process.env.NODE_ENV = "test";
process.env.DB_TYPE = "sqlite";
process.env.SQLITE_PATH = ":memory:";

// Test secrets
process.env.SESSION_SECRET = "test-session-secret-blog";
process.env.MAIN_SECRET_TOKEN = "test-main-secret-token-blog";
process.env.GEMINI_API_KEY = "test-gemini-key";

// Mock validateSessionAndRole for route tests
vi.mock("mbkauthe", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    validateSessionAndRole: (role = "Any") => (req, res, next) => {
      if (!req.session?.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      if (role && role !== "Any" && req.session.user.role !== role && req.session.user.role !== "superadmin") {
        return res.status(403).json({ message: "Forbidden" });
      }
      next();
    },
  };
});