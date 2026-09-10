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

export const Permissions = definePermissions(MANIFEST, { fallbackAppKey: "blog" });

/**
 * Register this app's permissions in the catalog (idempotent, best-effort).
 * Never throws so a startup catalog hiccup cannot take the server down.
 */
export async function syncBlogPermissions() {
  try {
    const result = await syncAppPermissions(Permissions, { fallbackAppKey: "blog" });
    console.log(`[blogmbktech] Permission catalog synced (${result.synced} permissions)`);
    return result;
  } catch (err) {
    console.warn("[blogmbktech] Permission catalog sync skipped:", err?.message || err);
    return null;
  }
}

export default Permissions;
