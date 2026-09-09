import express from "express";
import { engine } from "express-handlebars";
import { dashboardRouter, blogRouter } from "../../src/routes/index.js";
import { handlebarsHelpers } from "../../src/utils/handlebars-helpers.js";
import { VIEWS_DIR } from "../../src/config/constants.js";

/**
 * Creates an Express app for testing with mock session support.
 * @param {Object} [options]
 * @param {Object} [options.user] - User session object
 * @returns {express.Application}
 */
export function createTestApp({ user = { username: "admin", role: "superadmin" } } = {}) {
  const app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  app.engine(
    "handlebars",
    engine({
      defaultLayout: "main",
      helpers: handlebarsHelpers,
    })
  );
  app.set("view engine", "handlebars");
  app.set("views", VIEWS_DIR);

  // Session injection middleware
  app.use((req, res, next) => {
    const sessionUser = req.headers["x-test-user"]
      ? JSON.parse(req.headers["x-test-user"])
      : user;
    req.session = { user: sessionUser };
    next();
  });

  app.use("/dashboard", dashboardRouter);
  app.use("/", blogRouter);

  return app;
}
