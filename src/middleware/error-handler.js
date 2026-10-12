import { createNotFoundHandler, createErrorHandler } from "mbkutils";

export const notFoundHandler = createNotFoundHandler({
  appName: "Blog",
  defaultPage: "/",
  defaultPageName: "Home",
});

export const errorHandler = createErrorHandler({
  appName: "Blog",
  defaultPage: "/",
  defaultPageName: "Home",
});

export default {
  notFoundHandler,
  errorHandler,
};
