/**
 * blogmbktech — permission manifest.
 *
 * Declares the blog's permission surface. App key resolution, permission
 * prefixing and catalog sync are handled by mbkauthe's helpers
 * (`definePermissions` / `syncAppPermissions`) — this file only defines the
 * manifest and a thin, never-throwing sync wrapper for startup.
 *
 * Categories and tags share a single `taxonomy` service, and route actions are
 * folded into core create/edit/delete/moderate actions so the manifest stays
 * small and meaningful.
 *
 * Ownership scope: `edit`/`delete` apply to the user's OWN resources; the
 * matching `*_any` action grants the same over other users' resources
 * (e.g. `blog:posts:edit_any`).
 */
import { definePermissions, syncAppPermissions } from "mbkauthe";

const MANIFEST = {
  storage: {
    view: "View bucket files",
    upload: "Upload bucket files",
    delete: "Delete bucket files",
  },
  dashboard: {
    view: "View the blog dashboard",
    settings: "Manage blog settings",
    seo: "Manage SEO / generate sitemaps",
  },
  posts: {
    view: "View posts",
    create: "Create posts",
    edit: "Edit own posts",
    edit_any: "Edit other users' posts",
    delete: "Delete own posts",
    publish: "Publish posts",
  },
  comments: {
    view: "View comments",
    moderate: "Moderate, reply to and bulk-manage comments",
    delete: "Delete comments",
  },
  taxonomy: {
    view: "View categories and tags",
    create: "Create categories and tags",
    edit: "Edit categories and tags",
    delete: "Delete categories and tags",
  },
  media: {
    upload: "Upload images",
    list: "List media library",
    preview: "Render markdown preview",
  },
  ai: {
    use: "Use the AI assistant",
  },
};

const ROLES = {
  admin: {
    label: "Blog Administrator",
    description: "Full blog administration excluding destructive storage deletion",
    permissions: [
      "posts:*", "comments:*", "taxonomy:*", "media:*", "ai:*", "dashboard:*", "storage:view", "storage:upload"
    ],
  },
  author: {
    label: "Blog Author",
    description: "Create and edit own posts, upload media and view taxonomy",
    permissions: [
      "posts:view", "posts:create", "posts:edit", "comments:view", "taxonomy:view", "media:*", "ai:use", "dashboard:view"
    ],
  },
  normaluser: {
    label: "Blog Reader",
    description: "View published posts and comments",
    permissions: [
      "posts:view", "comments:view", "taxonomy:view"
    ],
  },
};

export const Permissions = definePermissions(MANIFEST, { fallbackAppKey: "blog", roles: ROLES });

/**
 * Register this app's permissions & roles in the catalog (idempotent, best-effort).
 * Never throws so a startup catalog hiccup cannot take the server down.
 */
export async function syncBlogPermissions() {
  try {
    const result = await syncAppPermissions(Permissions, { fallbackAppKey: "blog" });
    console.log(`[blogmbktech] Permissions & roles synced (${result.synced} permissions, ${result.rolesSynced} roles)`);
    return result;
  } catch (err) {
    console.warn("[blogmbktech] Permission catalog sync skipped:", err?.message || err);
    return null;
  }
}

export default Permissions;

