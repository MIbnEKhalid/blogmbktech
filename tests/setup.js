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

// Mock validateSessionAndRole + the dynamic permission API for route tests
vi.mock("mbkauthe", async (importOriginal) => {
  const actual = await importOriginal();
  const permMatch = (stored, required) => {
    const a = typeof stored === "number" ? stored : actual.resolvePermissionId(stored);
    const b = typeof required === "number" ? required : actual.resolvePermissionId(required);
    return a > 0 && b > 0 && a === b;
  };
  const denyCheck = (user, permission) => {
    const perms = user?.permissions;
    if (!perms) return false;
    const denies = Array.isArray(perms) ? [] : perms.denies || [];
    return denies.some((d) => permMatch(d, permission));
  };
  const allowCheck = (user, permission) => {
    const perms = user?.permissions;
    if (!perms) return false;
    const allows = Array.isArray(perms) ? perms : perms.allows || [];
    return allows.some((a) => permMatch(a, permission));
  };

  return {
    ...actual,
    syncAppPermissions: async () => ({ appKey: "blog", synced: 0, deactivated: 0 }),
    hasPermission: (user, required) => {
      if (user?.role === "superadmin") return true;
      if (denyCheck(user, required)) return false;
      return allowCheck(user, required);
    },
    attachSessionPermissions: async (sessionUser) => {
      if (sessionUser) sessionUser.permissions = sessionUser.permissions || { allows: [], denies: [] };
      return { allows: [], denies: [] };
    },
    sessPerm: (permission) => (req, res, next) => {
      const user = req.session?.user;
      if (!user) return res.status(401).json({ message: "Unauthorized" });
      if (user.role === "superadmin" || allowCheck(user, permission)) return next();
      return res.status(403).json({ message: "Forbidden" });
    },
    permChk: (permission) => (req, res, next) => {
      const user = req.session?.user;
      if (!user) return res.status(401).json({ message: "Unauthorized" });
      if (user.role === "superadmin" || allowCheck(user, permission)) return next();
      return res.status(403).json({ message: "Forbidden" });
    },
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