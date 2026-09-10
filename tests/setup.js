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
  const appKey = () => (process.env.APP_NAME || "blog").toLowerCase();
  const segmentMatch = (a, b) => a === "*" || b === "*" || a === b;
  const permMatch = (stored, required) => {
    const a = String(stored || "").toLowerCase().split(":");
    const b = String(required || "").toLowerCase().split(":");
    return a.length === 3 && b.length === 3 && segmentMatch(a[0], b[0]) && segmentMatch(a[1], b[1]) && segmentMatch(a[2], b[2]);
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
    definePermissions: (manifest, options = {}) => {
      const key = (options?.appKey || appKey());
      const out = {};
      for (const [service, actions] of Object.entries(manifest || {})) {
        out[service] = {};
        for (const action of Object.keys(actions || {})) out[service][action] = `${key}:${service}:${action}`;
      }
      Object.defineProperty(out, "__appKey", { value: key, enumerable: false });
      Object.defineProperty(out, "__manifest", { value: manifest || {}, enumerable: false });
      return out;
    },
    syncAppPermissions: async () => ({ appKey: appKey(), synced: 0, deactivated: 0 }),
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