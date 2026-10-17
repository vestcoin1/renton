import { ApiError } from "./errors.js";

/**
 * Files live in object storage; the database stores a reference `storage:<bucket>/<path>`.
 * Clients upload directly to storage with a short-lived signed URL, then send the reference.
 * Paths always start with the owner's profile id, so a user can only attach their own uploads.
 */
export const BUCKETS = {
  identity: { name: "identity-documents", public: false, maxMb: 10, types: ["image/jpeg", "image/png", "image/webp", "image/heic", "application/pdf"] },
  receipt: { name: "payment-receipts", public: false, maxMb: 10, types: ["image/jpeg", "image/png", "image/webp", "image/heic", "application/pdf"] },
  maintenance: { name: "maintenance-media", public: false, maxMb: 50, types: ["image/jpeg", "image/png", "image/webp", "image/heic", "video/mp4", "video/quicktime", "video/webm"] },
  property_image: { name: "property-images", public: true, maxMb: 10, types: ["image/jpeg", "image/png", "image/webp"] },
  verification_document: { name: "verification-documents", public: false, maxMb: 15, types: ["image/jpeg", "image/png", "image/webp", "application/pdf"] },
} as const;

export type UploadPurpose = keyof typeof BUCKETS;

export interface Storage {
  createUploadUrl(bucket: string, path: string): Promise<{ uploadUrl: string }>;
  createDownloadUrl(bucket: string, path: string, expiresInSeconds: number): Promise<string>;
  publicUrl(bucket: string, path: string): string;
}

const REF_PREFIX = "storage:";

export const toStorageRef = (bucket: string, path: string) => `${REF_PREFIX}${bucket}/${path}`;

export function parseStorageRef(url: string): { bucket: string; path: string } | null {
  if (!url.startsWith(REF_PREFIX)) return null;
  const rest = url.slice(REF_PREFIX.length);
  const slash = rest.indexOf("/");
  if (slash <= 0) return null;
  return { bucket: rest.slice(0, slash), path: rest.slice(slash + 1) };
}

/**
 * Checks a file URL a user wants to attach.
 * With storage configured: must be a reference into the purpose's bucket under the user's own folder.
 * Without storage (local development): data URLs and https URLs are accepted, as in the prototype.
 */
export function assertOwnFile(storage: Storage | null, purpose: UploadPurpose, ownerId: string, url: string) {
  const ref = parseStorageRef(url);
  if (storage) {
    if (!ref || ref.bucket !== BUCKETS[purpose].name || !ref.path.startsWith(`${ownerId}/`) || ref.path.includes("..")) {
      throw ApiError.badRequest("Upload the file first, then attach the reference returned by POST /v1/uploads.");
    }
    return;
  }
  if (ref || url.startsWith("data:") || url.startsWith("https://")) return;
  throw ApiError.badRequest("Unsupported file URL.");
}

/** Turns a stored reference into a URL the viewer can open (signed for private buckets). Other URLs pass through. */
export async function viewUrl(storage: Storage | null, url: string, expiresInSeconds = 600) {
  const ref = parseStorageRef(url);
  if (!ref || !storage) return url;
  const bucket = Object.values(BUCKETS).find((b) => b.name === ref.bucket);
  return bucket?.public ? storage.publicUrl(ref.bucket, ref.path) : storage.createDownloadUrl(ref.bucket, ref.path, expiresInSeconds);
}

/** Supabase Storage over its REST API, authenticated with the service-role key (server only). */
export function supabaseStorage(supabaseUrl: string, serviceRoleKey: string): Storage {
  const base = `${supabaseUrl.replace(/\/$/, "")}/storage/v1`;
  const headers = { Authorization: `Bearer ${serviceRoleKey}`, apikey: serviceRoleKey, "Content-Type": "application/json" };
  const encodePath = (path: string) => path.split("/").map(encodeURIComponent).join("/");

  async function post<T>(url: string, body: unknown): Promise<T> {
    const res = await fetch(url, { method: "POST", headers, body: JSON.stringify(body) });
    if (!res.ok) throw new Error(`Supabase Storage ${res.status}: ${await res.text()}`);
    return (await res.json()) as T;
  }

  return {
    async createUploadUrl(bucket, path) {
      const { url } = await post<{ url: string }>(`${base}/object/upload/sign/${bucket}/${encodePath(path)}`, {});
      return { uploadUrl: `${base}${url}` };
    },
    async createDownloadUrl(bucket, path, expiresIn) {
      const { signedURL } = await post<{ signedURL: string }>(`${base}/object/sign/${bucket}/${encodePath(path)}`, { expiresIn });
      return `${base}${signedURL}`;
    },
    publicUrl(bucket, path) {
      return `${base}/object/public/${bucket}/${encodePath(path)}`;
    },
  };
}
