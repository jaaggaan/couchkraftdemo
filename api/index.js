// server/settings-store.ts
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve as resolve2 } from "node:path";

// server/data-path.ts
import { tmpdir } from "node:os";
import { resolve } from "node:path";
function dataDirectory() {
  if (process.env.VERCEL) return resolve(tmpdir(), "couchkraft-data");
  return resolve(process.cwd(), "data");
}

// server/supabase-client.ts
import { createClient } from "@supabase/supabase-js";
var client;
function requireSupabaseConfig() {
  const url = process.env.SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url) {
    throw new Error("SUPABASE_URL is required for server-side database access.");
  }
  if (!key) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is required for protected server-side database mutations.");
  }
  return { url, key };
}
function getSupabase() {
  if (!client) {
    const { url, key } = requireSupabaseConfig();
    client = createClient(url, key, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
  }
  return client;
}
var supabase = new Proxy({}, {
  get(_target, prop, receiver) {
    const value = getSupabase()[prop];
    return typeof value === "function" ? value.bind(getSupabase()) : Reflect.get(getSupabase(), prop, receiver);
  }
});

// server/settings-store.ts
var dataDir = dataDirectory();
var settingsFile = resolve2(dataDir, "settings.json");
var defaultSettings = {
  whatsapp: {
    businessPhone: "+91 63607 04340",
    businessName: "CouchKraft Bespoke Concierge",
    enabled: true,
    conciergeEmail: "concierge@couchkraft.in",
    workingHours: "Mon - Sat: 10:00 AM - 7:00 PM IST",
    defaultLeadTimeWeeks: 4
  }
};
function ensureSettingsFile() {
  if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true });
  if (!existsSync(settingsFile)) {
    writeFileSync(settingsFile, JSON.stringify(defaultSettings, null, 2), "utf8");
  }
}
function readSettings() {
  ensureSettingsFile();
  try {
    const raw = readFileSync(settingsFile, "utf8");
    const parsed = JSON.parse(raw);
    return {
      whatsapp: {
        ...defaultSettings.whatsapp,
        ...parsed.whatsapp || {}
      }
    };
  } catch {
    return defaultSettings;
  }
}
function writeSettings(settings) {
  ensureSettingsFile();
  writeFileSync(settingsFile, JSON.stringify(settings, null, 2), "utf8");
  try {
    Promise.resolve(
      supabase.from("store_settings").upsert([{ key: "whatsapp", value: settings.whatsapp, updated_at: (/* @__PURE__ */ new Date()).toISOString() }], { onConflict: "key" })
    ).then((res) => {
      if (res?.error) console.warn("[Supabase Settings Sync Notice]:", res.error.message);
      else console.log("[Supabase Settings Synced]: WhatsApp configuration saved.");
    }).catch((err) => console.warn("[Supabase Settings Sync Catch]:", err));
  } catch (err) {
    console.warn("[Supabase Settings Catch]:", err);
  }
  return settings;
}
async function fetchLiveSettings() {
  const local = readSettings();
  try {
    const { data, error } = await supabase.from("store_settings").select("*").eq("key", "whatsapp").maybeSingle();
    if (!error && data && data.value) {
      const merged = {
        whatsapp: {
          ...local.whatsapp,
          ...data.value
        }
      };
      writeFileSync(settingsFile, JSON.stringify(merged, null, 2), "utf8");
      return merged;
    }
  } catch {
  }
  return local;
}

// server/custom-request-store.ts
import { randomBytes as randomBytes2 } from "node:crypto";
import { existsSync as existsSync3, mkdirSync as mkdirSync3, readFileSync as readFileSync2, writeFileSync as writeFileSync3 } from "node:fs";
import { resolve as resolve4 } from "node:path";

// server/storage-upload.ts
import { existsSync as existsSync2, mkdirSync as mkdirSync2, writeFileSync as writeFileSync2 } from "node:fs";
import { resolve as resolve3 } from "node:path";
import { randomBytes } from "node:crypto";
function isAllowedReferenceImageUrl(url) {
  const t = url.trim();
  if (!t) return false;
  if (t.startsWith("/uploads/")) return true;
  return /^https?:\/\//i.test(t);
}
async function uploadPublicImage(bucket, objectPath, buffer, contentType, upsert = false) {
  const safePath = objectPath.replace(/^\/+/, "");
  const { error: storageError } = await supabase.storage.from(bucket).upload(safePath, buffer, {
    contentType,
    upsert,
    cacheControl: "3600"
  });
  if (!storageError) {
    const { data: publicData } = supabase.storage.from(bucket).getPublicUrl(safePath);
    const supabaseUrl = publicData.publicUrl || `${String(process.env.SUPABASE_URL || "").replace(/\/$/, "")}/storage/v1/object/public/${bucket}/${safePath}`;
    return { url: supabaseUrl, source: "supabase" };
  }
  console.warn(`[StorageUpload] ${bucket}/${safePath}:`, storageError.message);
  const publicUploads = resolve3(process.cwd(), "public", "uploads");
  if (!existsSync2(publicUploads)) mkdirSync2(publicUploads, { recursive: true });
  const baseName = safePath.split("/").pop() || `upload_${Date.now()}.bin`;
  const finalName = `upload_${Date.now()}_${baseName}`;
  writeFileSync2(resolve3(publicUploads, finalName), buffer);
  return {
    url: `/uploads/${finalName}`,
    source: "local",
    warning: storageError.message
  };
}
function customRequestObjectPath(userId, fileName, ext) {
  const safeUser = userId.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 64) || "guest";
  const safeName = fileName.replace(/[^a-zA-Z0-9_.-]/g, "_").slice(0, 80) || "reference";
  const stamp = `${Date.now()}_${randomBytes(3).toString("hex")}`;
  return `custom-requests/${safeUser}/${stamp}_${safeName}.${ext}`;
}

// server/custom-request-store.ts
var dataDir2 = dataDirectory();
var requestsFile = resolve4(dataDir2, "custom_requests.json");
function ensureRequestsFile() {
  if (!existsSync3(dataDir2)) mkdirSync3(dataDir2, { recursive: true });
  if (!existsSync3(requestsFile)) {
    writeFileSync3(requestsFile, JSON.stringify([], null, 2), "utf8");
  }
}
function readCustomRequests() {
  if (process.env.VERCEL) return [];
  ensureRequestsFile();
  try {
    const raw = readFileSync2(requestsFile, "utf8");
    return JSON.parse(raw);
  } catch {
    return [];
  }
}
async function listAllCustomRequests() {
  const map = /* @__PURE__ */ new Map();
  for (const row of readCustomRequests()) {
    map.set(row.id, row);
  }
  try {
    const { data, error } = await supabase.from("custom_requests").select("*").order("created_at", { ascending: false });
    if (!error && data?.length) {
      for (const row of data) {
        const remote = fromDbRow(row);
        const local = map.get(remote.id);
        map.set(remote.id, local ? mergeRequests(local, remote) : remote);
      }
    } else if (error) {
      console.warn("[CustomRequests] Supabase listAll:", error.message);
    }
  } catch (err) {
    console.warn("[CustomRequests] Supabase listAll:", err);
  }
  return [...map.values()].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}
async function getCustomRequestById(id) {
  const local = readCustomRequests().find((r) => r.id === id);
  if (local) return local;
  try {
    const { data, error } = await supabase.from("custom_requests").select("*").eq("id", id).maybeSingle();
    if (error || !data) return null;
    return fromDbRow(data);
  } catch {
    return null;
  }
}
async function persistCustomRequest(updated) {
  if (!process.env.VERCEL) {
    const requests = readCustomRequests();
    const idx = requests.findIndex((r) => r.id === updated.id);
    if (idx === -1) requests.unshift(updated);
    else requests[idx] = updated;
    writeCustomRequests(requests);
  }
  const { error } = await supabase.from("custom_requests").update({
    status: updated.status,
    admin_notes: updated.adminNotes,
    quote_amount: updated.quoteAmount ?? null,
    payment_status: updated.paymentStatus || "none",
    linked_order_id: updated.linkedOrderId ?? null,
    updated_at: updated.updatedAt
  }).eq("id", updated.id);
  if (error) console.warn("[Supabase Custom Request Update]:", error.message);
  return updated;
}
function writeCustomRequests(items) {
  ensureRequestsFile();
  writeFileSync3(requestsFile, JSON.stringify(items, null, 2), "utf8");
}
function fromDbRow(row) {
  const dimensions = row.dimensions || {};
  const refFromDims = Array.isArray(dimensions.referenceImages) ? dimensions.referenceImages : [];
  return {
    id: String(row.id),
    customerId: row.customer_id ?? null,
    customerName: String(row.customer_name || ""),
    customerEmail: row.customer_email ? String(row.customer_email) : void 0,
    customerPhone: String(row.customer_phone || ""),
    productId: row.product_id ? String(row.product_id) : void 0,
    productName: row.product_name ? String(row.product_name) : void 0,
    productUrl: row.product_url ? String(row.product_url) : void 0,
    seatingCapacity: row.seating_capacity ? String(row.seating_capacity) : void 0,
    dimensions,
    material: row.material ? String(row.material) : void 0,
    fabric: row.fabric ? String(row.fabric) : void 0,
    color: row.color ? String(row.color) : void 0,
    budget: row.budget ? String(row.budget) : void 0,
    notes: row.notes ? String(row.notes) : void 0,
    referenceImages: refFromDims.length ? refFromDims.filter((u) => isAllowedReferenceImageUrl(u)) : void 0,
    status: row.status || "new",
    adminNotes: row.admin_notes ? String(row.admin_notes) : "",
    quoteAmount: row.quote_amount != null ? Number(row.quote_amount) : null,
    paymentStatus: row.payment_status || "none",
    linkedOrderId: row.linked_order_id ? String(row.linked_order_id) : null,
    createdAt: String(row.created_at || (/* @__PURE__ */ new Date()).toISOString()),
    updatedAt: String(row.updated_at || row.created_at || (/* @__PURE__ */ new Date()).toISOString())
  };
}
function mergeRequests(local, remote) {
  const remoteNewer = new Date(remote.updatedAt).getTime() >= new Date(local.updatedAt).getTime();
  return {
    ...local,
    ...remote,
    referenceImages: remote.referenceImages?.length ? remote.referenceImages : local.referenceImages,
    status: remoteNewer ? remote.status : local.status,
    adminNotes: remoteNewer ? remote.adminNotes : local.adminNotes,
    quoteAmount: remote.quoteAmount != null ? remote.quoteAmount : local.quoteAmount,
    paymentStatus: remoteNewer ? remote.paymentStatus : local.paymentStatus,
    linkedOrderId: remote.linkedOrderId || local.linkedOrderId,
    updatedAt: remoteNewer ? remote.updatedAt : local.updatedAt
  };
}
async function listCustomRequestsForCustomer(customerId) {
  const map = /* @__PURE__ */ new Map();
  for (const row of readCustomRequests().filter((r) => r.customerId === customerId)) {
    map.set(row.id, row);
  }
  try {
    const { data, error } = await supabase.from("custom_requests").select("*").eq("customer_id", customerId).order("created_at", { ascending: false });
    if (!error && data?.length) {
      for (const row of data) {
        const remote = fromDbRow(row);
        const local = map.get(remote.id);
        map.set(remote.id, local ? mergeRequests(local, remote) : remote);
      }
    }
  } catch (err) {
    console.warn("[CustomRequests] Supabase list:", err);
  }
  return [...map.values()].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}
async function getCustomRequestForCustomer(customerId, requestId) {
  const list = await listCustomRequestsForCustomer(customerId);
  return list.find((r) => r.id === requestId) ?? null;
}
async function createCustomRequest(input) {
  const requests = readCustomRequests();
  const id = `CK-REQ-${Date.now().toString(36).toUpperCase()}-${randomBytes2(2).toString("hex").toUpperCase()}`;
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const referenceImages = Array.isArray(input.referenceImages) ? input.referenceImages.filter((u) => typeof u === "string" && isAllowedReferenceImageUrl(u)).slice(0, 6) : void 0;
  const dimensions = {
    ...input.dimensions && typeof input.dimensions === "object" ? input.dimensions : {},
    ...referenceImages?.length ? { referenceImages } : {}
  };
  const newReq = {
    id,
    customerId: input.customerId || null,
    customerName: String(input.customerName || "Anonymous Client").trim(),
    customerEmail: String(input.customerEmail || "").trim(),
    customerPhone: String(input.customerPhone || "").trim(),
    productId: input.productId || void 0,
    productName: input.productName || void 0,
    productUrl: input.productUrl || void 0,
    seatingCapacity: input.seatingCapacity || void 0,
    dimensions,
    material: input.material || void 0,
    fabric: input.fabric || void 0,
    color: input.color || void 0,
    budget: input.budget || void 0,
    notes: input.notes || void 0,
    referenceImages,
    status: "new",
    adminNotes: "",
    quoteAmount: null,
    paymentStatus: "none",
    linkedOrderId: null,
    createdAt: now,
    updatedAt: now
  };
  if (!process.env.VERCEL) {
    requests.unshift(newReq);
    writeCustomRequests(requests);
  }
  try {
    const dbRow = {
      id: newReq.id,
      customer_id: newReq.customerId,
      customer_name: newReq.customerName,
      customer_email: newReq.customerEmail,
      customer_phone: newReq.customerPhone,
      product_id: newReq.productId,
      product_name: newReq.productName,
      product_url: newReq.productUrl,
      seating_capacity: newReq.seatingCapacity,
      dimensions: {
        ...newReq.dimensions || {},
        ...newReq.referenceImages?.length ? { referenceImages: newReq.referenceImages } : {}
      },
      material: newReq.material,
      fabric: newReq.fabric,
      color: newReq.color,
      budget: newReq.budget,
      notes: newReq.notes,
      status: newReq.status,
      admin_notes: newReq.adminNotes,
      quote_amount: newReq.quoteAmount ?? null,
      payment_status: newReq.paymentStatus || "none",
      linked_order_id: newReq.linkedOrderId ?? null,
      created_at: newReq.createdAt,
      updated_at: newReq.updatedAt
    };
    const { error } = await supabase.from("custom_requests").insert([dbRow]);
    if (error) {
      console.warn("[Supabase Custom Request Insert]:", error.message);
      if (process.env.VERCEL) {
        throw new Error(`Could not save custom request: ${error.message}`);
      }
    }
  } catch (err) {
    console.warn("[Supabase Custom Request Exception]:", err);
    if (process.env.VERCEL && err instanceof Error) throw err;
  }
  return newReq;
}
async function patchCustomRequest(id, patch) {
  const existing = await getCustomRequestById(id);
  if (!existing) return null;
  const updated = {
    ...existing,
    ...patch,
    id: existing.id,
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  return persistCustomRequest(updated);
}
async function updateCustomRequestStatus(id, updates) {
  const existing = await getCustomRequestById(id);
  if (!existing) return null;
  let quoteAmount = updates.quoteAmount;
  if (quoteAmount === void 0) quoteAmount = existing.quoteAmount;
  if (typeof quoteAmount === "number" && quoteAmount < 0) quoteAmount = null;
  const updated = {
    ...existing,
    status: updates.status ?? existing.status,
    adminNotes: updates.adminNotes ?? existing.adminNotes,
    quoteAmount: quoteAmount ?? null,
    id: existing.id,
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  return persistCustomRequest(updated);
}
async function linkCustomRequestOrder(requestId, orderId) {
  return patchCustomRequest(requestId, {
    linkedOrderId: orderId,
    paymentStatus: "awaiting"
  });
}
async function markCustomRequestPaid(requestId, orderId) {
  return patchCustomRequest(requestId, {
    linkedOrderId: orderId,
    paymentStatus: "paid"
  });
}
function customRequestIdFromOrderItems(items) {
  for (const item of items) {
    const c = item.customization;
    if (c?.customRequestId) return c.customRequestId;
  }
  return null;
}
async function markCustomRequestPaidFromOrder(order) {
  if (order.paymentStatus !== "paid") return;
  const requestId = customRequestIdFromOrderItems(order.items);
  if (!requestId) return;
  await markCustomRequestPaid(requestId, order.id);
}

// server/admin-api-handler.ts
import { existsSync as existsSync6, mkdirSync as mkdirSync6, readFileSync as readFileSync5, writeFileSync as writeFileSync6 } from "node:fs";
import { resolve as resolve7 } from "node:path";
import bcrypt3 from "bcryptjs";

// server/admin-store.ts
import { existsSync as existsSync4, mkdirSync as mkdirSync4, readFileSync as readFileSync3, writeFileSync as writeFileSync4 } from "node:fs";
import { resolve as resolve5 } from "node:path";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
var dataDir3 = dataDirectory();
var adminsPath = resolve5(dataDir3, "admins.json");
var auditPath = resolve5(dataDir3, "admin-audit.json");
var ADMIN_SECRET = process.env.COUCHKRAFT_ADMIN_SECRET || "couchkraft-admin-secure-key-2026";
function ensureStore() {
  if (!existsSync4(dataDir3)) mkdirSync4(dataDir3, { recursive: true });
  if (!existsSync4(adminsPath)) {
    const defaultPasswordHash = bcrypt.hashSync("Admin@CouchKraft2026!", 10);
    const initialAdmins = [
      {
        id: "admin_devang_01",
        name: "Devang V.",
        email: "admin@couchkraft.in",
        role: "owner",
        avatarUrl: "https://lh3.googleusercontent.com/aida/AEtjO1U-jXIhz33Xm08EzyafM8zL58IucpUMfP_Uh1YjU7Bi3wHrNQLs_txrVhHARZ6fMZPpH69tTPUfE_mPEjtFOE7OihQThW0QwICxknNz6Q7mmF1Nzx-x0RQwMIINjOpPvR3iUbX_vOzhimZkLpt5w2RoZrjMdNWGZ69QaRY6F0GIdBzDlqMCsc051Q9nBcvuMDDddNABcdnl2rGXeKcvFZg2i7uVDpVufulCakZsWBY5gkfz4L1MU8ClZ38C9fWHlAGysG2z9OHbSmQ",
        passwordHash: defaultPasswordHash,
        createdAt: (/* @__PURE__ */ new Date()).toISOString()
      }
    ];
    writeFileSync4(adminsPath, JSON.stringify(initialAdmins, null, 2), "utf8");
  }
  if (!existsSync4(auditPath)) {
    writeFileSync4(auditPath, "[]", "utf8");
  }
}
function readAdmins() {
  ensureStore();
  try {
    return JSON.parse(readFileSync3(adminsPath, "utf8"));
  } catch {
    return [];
  }
}
function findAdminByEmail(email) {
  const admins = readAdmins();
  return admins.find((a) => a.email.toLowerCase() === email.toLowerCase().trim()) ?? null;
}
function findAdminById(id) {
  const admins = readAdmins();
  return admins.find((a) => a.id === id) ?? null;
}
function publicAdmin(admin) {
  return {
    id: admin.id,
    name: admin.name,
    email: admin.email,
    role: admin.role,
    avatarUrl: admin.avatarUrl,
    createdAt: admin.createdAt,
    lastLoginAt: admin.lastLoginAt
  };
}
function signAdminToken(admin) {
  return jwt.sign(
    {
      sub: admin.id,
      email: admin.email,
      role: admin.role,
      name: admin.name,
      iss: "couchkraft-admin"
    },
    ADMIN_SECRET,
    { expiresIn: "7d" }
  );
}
function verifyAdminToken(token) {
  try {
    const payload = jwt.verify(token, ADMIN_SECRET);
    return findAdminById(payload.sub);
  } catch {
    return null;
  }
}
function logAdminAction(entry) {
  ensureStore();
  try {
    const existing = JSON.parse(readFileSync3(auditPath, "utf8"));
    const newEntry = {
      ...entry,
      id: `audit_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    existing.unshift(newEntry);
    writeFileSync4(auditPath, JSON.stringify(existing.slice(0, 500), null, 2), "utf8");
  } catch (err) {
    console.error("Failed to log admin action:", err);
  }
}
function getAuditLogs(limit = 50) {
  ensureStore();
  try {
    const existing = JSON.parse(readFileSync3(auditPath, "utf8"));
    return existing.slice(0, limit);
  } catch {
    return [];
  }
}

// server/inventory-rules.ts
function normalizeInventoryFields(input) {
  const madeToOrder = Boolean(input.madeToOrder ?? input.made_to_order ?? true);
  const readyToShipStock = Math.max(0, Number(input.readyToShipStock ?? input.ready_to_ship_stock) || 0);
  const lowStockThreshold = Math.max(0, Number(input.lowStockThreshold ?? input.low_stock_threshold) || 2);
  const leadTimeWeeks = Math.max(0, Number(input.leadTimeWeeks ?? input.lead_time_weeks) || 3);
  return {
    ...input,
    madeToOrder,
    made_to_order: madeToOrder,
    readyToShipStock,
    ready_to_ship_stock: readyToShipStock,
    lowStockThreshold,
    low_stock_threshold: lowStockThreshold,
    leadTimeWeeks,
    lead_time_weeks: leadTimeWeeks
  };
}
function validateInventoryPatch(input) {
  const normalized = normalizeInventoryFields(input);
  if (normalized.madeToOrder) return null;
  const stock = Number(normalized.readyToShipStock ?? normalized.ready_to_ship_stock) || 0;
  const threshold = Number(normalized.lowStockThreshold ?? normalized.low_stock_threshold) || 0;
  if (stock < 0) return "Ready-to-ship stock cannot be negative.";
  if (threshold < 0) return "Low-stock threshold cannot be negative.";
  return null;
}

// server/product-store.ts
function resolveCategoryId(categoryName, explicitId) {
  if (explicitId && ["cat_sofas", "cat_chairs", "cat_storage", "cat_accent"].includes(explicitId)) {
    return explicitId;
  }
  const lower = (categoryName || "").toLowerCase();
  if (lower.includes("chair") || lower.includes("lounge")) return "cat_chairs";
  if (lower.includes("storage") || lower.includes("bench") || lower.includes("dining") || lower.includes("table") || lower.includes("sideboard")) return "cat_storage";
  if (lower.includes("accent") || lower.includes("study") || lower.includes("daybed") || lower.includes("bed") || lower.includes("mirror") || lower.includes("lighting") || lower.includes("light") || lower.includes("ottoman")) return "cat_accent";
  return "cat_sofas";
}
function toProductDbRow(p) {
  const inventoryError = validateInventoryPatch(p);
  if (inventoryError) throw new Error(inventoryError);
  const inventory = normalizeInventoryFields(p);
  const name = String(p.name || "Untitled Piece").trim();
  const slug = (p.slug || name || "product").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  const categoryName = p.category || "Living Room > Sofas & Couches";
  const categoryId = resolveCategoryId(categoryName, p.categoryId || p.category_id);
  const dimensions = p.dimensions && typeof p.dimensions === "object" ? { ...p.dimensions } : { width: 200, depth: 90, height: 80, seatHeight: 42 };
  if (p.customizationOptions) {
    dimensions.customizationOptions = p.customizationOptions;
  }
  return {
    id: p.id || `ck-${slug}-${Date.now().toString(36)}`,
    slug,
    name,
    sku: p.sku || `CK-SKU-${Date.now().toString(36).toUpperCase()}`,
    price: Number(p.price) || 0,
    compare_at: Number(p.compareAt ?? p.compare_at) || 0,
    category_id: categoryId,
    category: categoryName,
    sub_category: p.subCategory ?? p.sub_category ?? "Standard",
    space: p.space || "living",
    tabs: Array.isArray(p.tabs) ? p.tabs : ["bestsellers"],
    short_excerpt: p.shortExcerpt ?? p.short_excerpt ?? "",
    description: p.description || "",
    images: Array.isArray(p.images) && p.images.length ? p.images : [
      "https://images.unsplash.com/photo-1567016432779-094069958ea5?auto=format&fit=crop&w=1200&q=80"
    ],
    video_url: p.videoUrl ?? p.video_url ?? "",
    finishes: Array.isArray(p.finishes) ? p.finishes : ["Standard"],
    color_swatches: Array.isArray(p.colorSwatches ?? p.color_swatches) ? p.colorSwatches ?? p.color_swatches : [],
    care: p.care || "",
    dimensions,
    net_weight: p.netWeight ?? p.net_weight ?? "50 kg",
    seating_capacity: p.seatingCapacity ?? p.seating_capacity ?? "3 Persons",
    warranty: p.warranty || "5 Years Structural Frame",
    structural_wood: p.structuralWood ?? p.structural_wood ?? "Kiln-dried Teak & Sheesham Hardwood",
    foam_upholstery: p.foamUpholstery ?? p.foam_upholstery ?? "38-Density Ultra-Cell Foam + Belgian Linen Blend",
    ready_to_ship_stock: inventory.ready_to_ship_stock,
    low_stock_threshold: inventory.low_stock_threshold,
    made_to_order: inventory.made_to_order,
    lead_time_weeks: inventory.lead_time_weeks,
    customization_enabled: p.customizationEnabled ?? p.customization_enabled ?? true,
    customization_tolerance_cm: Number(p.customizationToleranceCm ?? p.customization_tolerance_cm) || 15,
    allow_com_upholstery: p.allowComUpholstery ?? p.allow_com_upholstery ?? true,
    meta_title: p.metaTitle ?? p.meta_title ?? `${name} | CouchKraft`,
    meta_description: p.metaDescription ?? p.meta_description ?? (p.shortExcerpt || p.description || "").slice(0, 160),
    status: p.status || "published",
    gst_slab: p.gstSlab ?? p.gst_slab ?? "18% GST (Standard Furniture)",
    hsn_code: p.hsnCode ?? p.hsn_code ?? "9403 6000",
    festive_discount_percent: (() => {
      const n = Math.round(Number(p.festiveDiscountPercent ?? p.festive_discount_percent) || 0);
      return Math.min(100, Math.max(0, n));
    })(),
    extra_discount_type: (() => {
      const n = Math.round(Number(p.festiveDiscountPercent ?? p.festive_discount_percent) || 0);
      if (n <= 0) return null;
      return p.extraDiscountType === "standard" || p.extra_discount_type === "standard" ? "standard" : "festive";
    })()
  };
}
function fromProductDbRow(row) {
  const dims = row.dimensions && typeof row.dimensions === "object" ? row.dimensions : { width: 200, depth: 90, height: 80, seatHeight: 42 };
  const customizationOptions = row.customization_options ?? dims.customizationOptions ?? void 0;
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    sku: row.sku || "",
    price: Number(row.price) || 0,
    compareAt: Number(row.compare_at ?? row.compareAt) || 0,
    festiveDiscountPercent: Number(row.festive_discount_percent ?? row.festiveDiscountPercent) || 0,
    extraDiscountType: Number(row.festive_discount_percent ?? row.festiveDiscountPercent) > 0 ? row.extra_discount_type === "standard" || row.extraDiscountType === "standard" ? "standard" : "festive" : void 0,
    gstSlab: row.gst_slab ?? row.gstSlab ?? "18% GST (Standard Furniture)",
    hsnCode: row.hsn_code ?? row.hsnCode ?? "9403 6000",
    description: row.description || "",
    shortExcerpt: row.short_excerpt ?? row.shortExcerpt ?? "",
    category: row.category || "Living Room > Sofas & Couches",
    subCategory: row.sub_category ?? row.subCategory ?? "Standard",
    space: row.space || "living",
    tabs: Array.isArray(row.tabs) ? row.tabs : ["bestsellers"],
    images: Array.isArray(row.images) && row.images.length ? row.images : [],
    videoUrl: row.video_url ?? row.videoUrl ?? "",
    finishes: Array.isArray(row.finishes) ? row.finishes : ["Standard"],
    colorSwatches: Array.isArray(row.color_swatches ?? row.colorSwatches) ? row.color_swatches ?? row.colorSwatches : [],
    care: row.care || "",
    dimensions: {
      width: Number(dims.width) || 200,
      depth: Number(dims.depth) || 90,
      height: Number(dims.height) || 80,
      seatHeight: Number(dims.seatHeight) || 42
    },
    netWeight: row.net_weight ?? row.netWeight ?? "50 kg",
    seatingCapacity: row.seating_capacity ?? row.seatingCapacity ?? "3 Persons",
    warranty: row.warranty || "5 Years Structural Frame",
    structuralWood: row.structural_wood ?? row.structuralWood ?? "Kiln-dried Teak & Sheesham Hardwood",
    foamUpholstery: row.foam_upholstery ?? row.foamUpholstery ?? "38-Density Ultra-Cell Foam + Belgian Linen Blend",
    readyToShipStock: Number(row.ready_to_ship_stock ?? row.readyToShipStock) || 0,
    lowStockThreshold: Number(row.low_stock_threshold ?? row.lowStockThreshold) || 2,
    madeToOrder: row.made_to_order ?? row.madeToOrder ?? true,
    leadTimeWeeks: Number(row.lead_time_weeks ?? row.leadTimeWeeks) || 3,
    customizationEnabled: row.customization_enabled ?? row.customizationEnabled ?? true,
    customizationOptions,
    customizationToleranceCm: Number(row.customization_tolerance_cm ?? row.customizationToleranceCm) || 15,
    allowComUpholstery: row.allow_com_upholstery ?? row.allowComUpholstery ?? true,
    metaTitle: row.meta_title ?? row.metaTitle ?? `${row.name} | CouchKraft`,
    metaDescription: row.meta_description ?? row.metaDescription ?? "",
    status: row.status || "published",
    unitsSold: Number(row.units_sold ?? row.unitsSold) || 0,
    revenue: Number(row.revenue) || 0,
    createdAt: row.created_at || (/* @__PURE__ */ new Date()).toISOString(),
    updatedAt: row.updated_at || (/* @__PURE__ */ new Date()).toISOString()
  };
}
async function readProducts() {
  const { data, error } = await supabase.from("products").select("*").order("created_at", { ascending: false });
  if (error) {
    console.error("[ProductStore] Supabase read error:", error.message);
    throw new Error(`Failed to read products from Supabase: ${error.message}`);
  }
  return (data || []).map(fromProductDbRow);
}
async function findProductById(id) {
  const { data, error } = await supabase.from("products").select("*").or(`id.eq.${id},slug.eq.${id}`).maybeSingle();
  if (error) {
    console.error("[ProductStore] Supabase findProductById error:", error.message);
    return null;
  }
  return data ? fromProductDbRow(data) : null;
}
async function createProduct(input) {
  if (!input.name || !input.name.trim()) {
    throw new Error("Product name is required.");
  }
  const row = toProductDbRow(input);
  const { data, error } = await supabase.from("products").insert([row]).select();
  if (error) {
    console.error("[ProductStore] Supabase createProduct error:", error.message);
    throw new Error(`Database error creating product: ${error.message}`);
  }
  if (!data || !data.length) {
    throw new Error("Failed to create product in database.");
  }
  return fromProductDbRow(data[0]);
}
async function updateProduct(id, updates) {
  const row = toProductDbRow({ ...updates, id });
  const { id: _, ...updatePayload } = row;
  const { data, error } = await supabase.from("products").update({ ...updatePayload, updated_at: (/* @__PURE__ */ new Date()).toISOString() }).eq("id", id).select();
  if (error) {
    console.error("[ProductStore] Supabase updateProduct error:", error.message);
    throw new Error(`Database error updating product: ${error.message}`);
  }
  if (!data || !data.length) {
    return null;
  }
  return fromProductDbRow(data[0]);
}
var BESPOKE_PLACEHOLDER_ID = "prod_bespoke_commission";
async function setFestiveDiscountForProducts(input) {
  const clearing = input.percent == null;
  const patch = {
    festive_discount_percent: clearing ? 0 : Math.min(100, Math.max(1, Math.round(input.percent))),
    extra_discount_type: clearing ? null : input.discountType === "standard" ? "standard" : "festive",
    updated_at: (/* @__PURE__ */ new Date()).toISOString()
  };
  if (input.scope === "one") {
    const productId = String(input.productId || "").trim();
    if (!productId) throw new Error("Product id is required for single-product discount.");
    const { data: data2, error: error2 } = await supabase.from("products").update(patch).eq("id", productId).neq("id", BESPOKE_PLACEHOLDER_ID).select("id");
    if (error2) throw new Error(error2.message);
    return { updatedCount: data2?.length ?? 0 };
  }
  const { data, error } = await supabase.from("products").update(patch).neq("status", "archived").neq("id", BESPOKE_PLACEHOLDER_ID).select("id");
  if (error) throw new Error(error.message);
  return { updatedCount: data?.length ?? 0 };
}
async function deleteProduct(id) {
  const { error } = await supabase.from("products").delete().eq("id", id);
  if (error) {
    console.error("[ProductStore] Supabase deleteProduct error:", error.message);
    throw new Error(`Database error deleting product: ${error.message}`);
  }
  return true;
}
async function readCategories() {
  const [catsRes, prodsRes] = await Promise.all([
    supabase.from("categories").select("*").order("name"),
    supabase.from("products").select("category, category_id")
  ]);
  if (catsRes.error) {
    console.error("[ProductStore] Supabase readCategories error:", catsRes.error.message);
    throw new Error(`Database error reading categories: ${catsRes.error.message}`);
  }
  const products2 = prodsRes.data || [];
  return (catsRes.data || []).map((cat) => ({
    id: cat.id,
    name: cat.name,
    slug: cat.slug,
    subClassifications: cat.sub_classifications || [],
    description: cat.description || "",
    image: cat.image || "",
    productCount: products2.filter(
      (p) => p.category_id === cat.id || p.category === cat.name || p.category?.includes(cat.name.split(">")[0].trim())
    ).length
  }));
}
async function createCategory(input) {
  const slug = (input.slug || input.name || "category").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-");
  const newCat = {
    id: input.id || `cat_${Date.now()}`,
    name: input.name || "New Category",
    slug,
    sub_classifications: input.subClassifications || [],
    description: input.description || "",
    image: input.image || "https://images.unsplash.com/photo-1567016432779-094069958ea5?auto=format&fit=crop&w=600&q=80",
    product_count: 0
  };
  const { data, error } = await supabase.from("categories").insert([newCat]).select();
  if (error) {
    console.error("[ProductStore] Supabase createCategory error:", error.message);
    throw new Error(`Database error creating category: ${error.message}`);
  }
  return {
    id: data[0].id,
    name: data[0].name,
    slug: data[0].slug,
    subClassifications: data[0].sub_classifications || [],
    description: data[0].description || "",
    image: data[0].image || "",
    productCount: 0
  };
}
async function updateCategory(id, updates) {
  const patch = {};
  if (updates.name !== void 0) patch.name = updates.name;
  if (updates.slug !== void 0) patch.slug = updates.slug;
  if (updates.subClassifications !== void 0) patch.sub_classifications = updates.subClassifications;
  if (updates.description !== void 0) patch.description = updates.description;
  if (updates.image !== void 0) patch.image = updates.image;
  const { data, error } = await supabase.from("categories").update(patch).eq("id", id).select();
  if (error) {
    console.error("[ProductStore] Supabase updateCategory error:", error.message);
    throw new Error(`Database error updating category: ${error.message}`);
  }
  if (!data || !data.length) return null;
  return {
    id: data[0].id,
    name: data[0].name,
    slug: data[0].slug,
    subClassifications: data[0].sub_classifications || [],
    description: data[0].description || "",
    image: data[0].image || "",
    productCount: 0
  };
}
async function deleteCategory(id) {
  const { error } = await supabase.from("categories").delete().eq("id", id);
  if (error) {
    console.error("[ProductStore] Supabase deleteCategory error:", error.message);
    throw new Error(`Database error deleting category: ${error.message}`);
  }
  return true;
}

// server/marketing-store.ts
import { randomBytes as randomBytes3 } from "node:crypto";
import { existsSync as existsSync5, mkdirSync as mkdirSync5, readFileSync as readFileSync4, writeFileSync as writeFileSync5 } from "node:fs";
import { resolve as resolve6 } from "node:path";
var dataDir4 = dataDirectory();
var couponsPath = resolve6(dataDir4, "coupons.json");
var bannersPath = resolve6(dataDir4, "banners.json");
var initialCoupons = [
  {
    id: "coup_warm10",
    code: "WARM10",
    type: "percent",
    value: 10,
    minOrderValue: 2e4,
    maxDiscount: 15e3,
    startDate: (/* @__PURE__ */ new Date()).toISOString(),
    endDate: new Date(Date.now() + 90 * 24 * 3600 * 1e3).toISOString(),
    usageLimit: 500,
    usedCount: 38,
    active: true,
    description: "10% off on all living and lounge handcrafted silhouettes.",
    createdAt: (/* @__PURE__ */ new Date()).toISOString(),
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  },
  {
    id: "coup_festive15",
    code: "FESTIVE15",
    type: "percent",
    value: 15,
    minOrderValue: 5e4,
    maxDiscount: 25e3,
    startDate: (/* @__PURE__ */ new Date()).toISOString(),
    endDate: new Date(Date.now() + 30 * 24 * 3600 * 1e3).toISOString(),
    usageLimit: 200,
    usedCount: 14,
    active: true,
    description: "Special Diwali & Festive season tier discount.",
    createdAt: (/* @__PURE__ */ new Date()).toISOString(),
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  },
  {
    id: "coup_welcome5k",
    code: "WELCOME5000",
    type: "flat",
    value: 5e3,
    minOrderValue: 75e3,
    startDate: (/* @__PURE__ */ new Date()).toISOString(),
    endDate: new Date(Date.now() + 180 * 24 * 3600 * 1e3).toISOString(),
    usageLimit: 1e3,
    usedCount: 82,
    active: true,
    description: "\u20B95,000 off on first bespoke order above \u20B975,000.",
    createdAt: (/* @__PURE__ */ new Date()).toISOString(),
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  }
];
var initialBanners = [
  {
    id: "banner_living",
    title: "In soft sculpture",
    subtitle: "A quiet oak frame and generous boucl\xE9 contours that belong in a sunlit living room.",
    desktopImage: "/hero-living-hd.jpg",
    mobileImage: "/hero-living-scene.jpg",
    ctaLabel: "Shop the Collection",
    ctaUrl: "/shop?space=living",
    badge: "NEW COLLECTION 2026",
    alignment: "right",
    tone: "dark",
    space: "living",
    active: true,
    displayOrder: 1,
    createdAt: (/* @__PURE__ */ new Date()).toISOString(),
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  },
  {
    id: "banner_dining",
    title: "Gather beautifully",
    subtitle: "Solid teakwood dining centerpieces engineered for generational memory.",
    desktopImage: "/hero-dining-hd.jpg",
    mobileImage: "/hero-dining.jpg",
    ctaLabel: "Explore Dining",
    ctaUrl: "/shop?space=dining",
    badge: "EDITORIAL FEATURE",
    alignment: "left",
    tone: "dark",
    space: "dining",
    active: true,
    displayOrder: 2,
    createdAt: (/* @__PURE__ */ new Date()).toISOString(),
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  },
  {
    id: "banner_lounge",
    title: "A quieter kind of comfort",
    subtitle: "Deep sloped seats contoured around sustainably sourced Sheesham wood.",
    desktopImage: "/hero-lounge-hd.jpg",
    mobileImage: "/hero-lounge.jpg",
    ctaLabel: "Discover Lounge",
    ctaUrl: "/shop?space=lounge",
    badge: "BESTSELLER",
    alignment: "right",
    tone: "dark",
    space: "lounge",
    active: true,
    displayOrder: 3,
    createdAt: (/* @__PURE__ */ new Date()).toISOString(),
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  }
];
function ensureStore2() {
  if (!existsSync5(dataDir4)) mkdirSync5(dataDir4, { recursive: true });
  if (!existsSync5(couponsPath)) {
    writeFileSync5(couponsPath, JSON.stringify(initialCoupons, null, 2), "utf8");
  }
  if (!existsSync5(bannersPath)) {
    writeFileSync5(bannersPath, JSON.stringify(initialBanners, null, 2), "utf8");
  }
}
function readCoupons() {
  ensureStore2();
  try {
    return JSON.parse(readFileSync4(couponsPath, "utf8"));
  } catch {
    return [];
  }
}
function writeCoupons(coupons) {
  ensureStore2();
  writeFileSync5(couponsPath, JSON.stringify(coupons, null, 2), "utf8");
}
function findCouponByCode(code) {
  const coupons = readCoupons();
  return coupons.find((c) => c.code.toUpperCase() === code.toUpperCase().trim()) ?? null;
}
function createCoupon(input) {
  const coupons = readCoupons();
  const code = (input.code || "COUPON").toUpperCase().trim().replace(/\s+/g, "");
  const newCoupon = {
    id: input.id || `coup_${Date.now()}`,
    code,
    type: input.type || "percent",
    value: Number(input.value) || 10,
    minOrderValue: Number(input.minOrderValue) || 0,
    maxDiscount: input.maxDiscount ? Number(input.maxDiscount) : void 0,
    startDate: input.startDate || (/* @__PURE__ */ new Date()).toISOString(),
    endDate: input.endDate || new Date(Date.now() + 60 * 24 * 3600 * 1e3).toISOString(),
    usageLimit: input.usageLimit ? Number(input.usageLimit) : void 0,
    usedCount: 0,
    active: input.active ?? true,
    description: input.description || "",
    createdAt: (/* @__PURE__ */ new Date()).toISOString(),
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  coupons.unshift(newCoupon);
  writeCoupons(coupons);
  return newCoupon;
}
function updateCoupon(id, updates) {
  const coupons = readCoupons();
  const idx = coupons.findIndex((c) => c.id === id || c.code.toUpperCase() === id.toUpperCase());
  if (idx === -1) return null;
  coupons[idx] = {
    ...coupons[idx],
    ...updates,
    id: coupons[idx].id,
    code: (updates.code || coupons[idx].code).toUpperCase().trim(),
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  writeCoupons(coupons);
  return coupons[idx];
}
function deleteCoupon(id) {
  const coupons = readCoupons();
  const filtered = coupons.filter((c) => c.id !== id && c.code.toUpperCase() !== id.toUpperCase());
  if (filtered.length === coupons.length) return false;
  writeCoupons(filtered);
  return true;
}
function couponsForCustomer(customerId) {
  return readCoupons().filter((c) => c.customerId === customerId);
}
function createPersonalCoupon(input) {
  const token = randomBytes3(2).toString("hex").toUpperCase();
  const slug = (input.customerName || "GUEST").replace(/[^a-z0-9]/gi, "").slice(0, 8).toUpperCase() || "GUEST";
  const code = `CK-${slug}-${token}`;
  return createCoupon({
    code,
    type: input.type || "percent",
    value: input.value ?? 12,
    minOrderValue: input.minOrderValue ?? 15e3,
    maxDiscount: 2e4,
    usageLimit: 1,
    description: input.description || `Personal offer for ${input.customerName}`,
    personal: true,
    customerId: input.customerId,
    customerName: input.customerName,
    customerEmail: input.customerEmail,
    redeemed: false,
    source: input.source || "admin",
    active: true
  });
}
function createWelcomeCoupon(customerId, customerName, customerEmail) {
  const existing = readCoupons().find(
    (c) => c.customerId === customerId && c.source === "welcome" && !c.redeemed
  );
  if (existing) return existing;
  return createPersonalCoupon({
    customerId,
    customerName,
    customerEmail,
    source: "welcome",
    value: 12,
    minOrderValue: 15e3,
    description: `Welcome to CouchKraft \u2014 12% off your first order, ${customerName.split(" ")[0] || "friend"}.`
  });
}
function redeemPersonalCoupon(code, customerId) {
  const coupons = readCoupons();
  const idx = coupons.findIndex((c) => c.code.toUpperCase() === code.toUpperCase().trim());
  if (idx === -1) return false;
  const coupon = coupons[idx];
  if (!coupon.personal) return false;
  if (coupon.customerId !== customerId) return false;
  if (coupon.redeemed) return false;
  coupons[idx] = {
    ...coupon,
    redeemed: true,
    redeemedAt: (/* @__PURE__ */ new Date()).toISOString(),
    usedCount: Math.max(coupon.usedCount, 1),
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  writeCoupons(coupons);
  return true;
}
function applyFileCouponDiscount(coupon, subtotal, customerId) {
  if (!coupon.active) return { ok: false, discount: 0, message: "This offer is not active." };
  if (coupon.personal) {
    if (coupon.customerId !== customerId) {
      return { ok: false, discount: 0, message: "This coupon is tied to another account." };
    }
    if (coupon.redeemed) return { ok: false, discount: 0, message: "This personal coupon has already been used." };
  } else if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
    return { ok: false, discount: 0, message: "This coupon has reached its usage limit." };
  }
  const minVal = Number(coupon.minOrderValue) || 0;
  if (subtotal < minVal) {
    return { ok: false, discount: 0, message: `Minimum order for this coupon is \u20B9${minVal.toLocaleString("en-IN")}.` };
  }
  let discount = 0;
  if (coupon.type === "percent") {
    const calc = Math.round(subtotal * (Number(coupon.value) / 100));
    discount = coupon.maxDiscount ? Math.min(calc, Number(coupon.maxDiscount)) : calc;
  } else {
    discount = Math.min(subtotal, Number(coupon.value) || 0);
  }
  return { ok: true, discount };
}
function readBanners() {
  ensureStore2();
  try {
    const banners = JSON.parse(readFileSync4(bannersPath, "utf8"));
    return banners.sort((a, b) => a.displayOrder - b.displayOrder);
  } catch {
    return [];
  }
}
function writeBanners(banners) {
  ensureStore2();
  writeFileSync5(bannersPath, JSON.stringify(banners, null, 2), "utf8");
}
function createBanner(input) {
  const banners = readBanners();
  const newBanner = {
    id: input.id || `banner_${Date.now()}`,
    title: input.title || "New Banner Headline",
    subtitle: input.subtitle || "",
    desktopImage: input.desktopImage || "/hero-living-hd.jpg",
    mobileImage: input.mobileImage || "/hero-living-scene.jpg",
    ctaLabel: input.ctaLabel || "Explore Collection",
    ctaUrl: input.ctaUrl || "/shop",
    badge: input.badge || "PROMOTIONAL",
    alignment: input.alignment || "right",
    tone: input.tone || "dark",
    space: input.space || "living",
    active: input.active ?? true,
    displayOrder: input.displayOrder || banners.length + 1,
    createdAt: (/* @__PURE__ */ new Date()).toISOString(),
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  banners.push(newBanner);
  writeBanners(banners);
  return newBanner;
}
function updateBanner(id, updates) {
  const banners = readBanners();
  const idx = banners.findIndex((b) => b.id === id);
  if (idx === -1) return null;
  banners[idx] = {
    ...banners[idx],
    ...updates,
    id: banners[idx].id,
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  writeBanners(banners);
  return banners[idx];
}
function deleteBanner(id) {
  const banners = readBanners();
  const filtered = banners.filter((b) => b.id !== id);
  if (filtered.length === banners.length) return false;
  writeBanners(filtered);
  return true;
}

// server/order-store.ts
import { randomBytes as randomBytes5 } from "node:crypto";

// src/data/products.ts
var img = (id, w = 1200) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=80`;
var products = [
  {
    id: "ck-arden-sofa",
    slug: "arden-three-seater-sofa",
    name: "Arden Three-Seater Sofa",
    price: 148e3,
    description: "A low, generously proportioned sofa in cream upholstery. Soft seating, a quiet oak frame and the kind of silhouette that belongs in a sunlit living room.",
    category: "Sofa",
    space: "living",
    tabs: ["bestsellers", "classics", "sets"],
    images: [
      img("photo-1567016432779-094069958ea5"),
      img("photo-1631679706909-1844bbd07221"),
      img("photo-1554995207-c18c203602cb"),
      img("photo-1493663284031-b7e3aefcae8e")
    ],
    finishes: ["Cream boucl\xE9", "Warm oat linen"],
    care: "Vacuum regularly. Professional clean only.",
    customizationEnabled: true,
    customizationOptions: {
      enabled: true,
      seatingOptions: [
        { id: "2-seater", label: "2-Seater (Compact)", priceDelta: -12e3, description: "Width 170cm \xB7 Intimate living spaces" },
        { id: "3-seater", label: "3-Seater (Standard)", priceDelta: 0, description: "Width 220cm \xB7 Signature proportions" },
        { id: "4-seater", label: "4-Seater (Grand)", priceDelta: 16e3, description: "Width 270cm \xB7 Expansive lounge silhouette" },
        { id: "l-shaped", label: "L-Shaped Sectional", priceDelta: 38e3, description: "Width 290cm with left/right chaise lounger" }
      ],
      dimensionSpecs: {
        width: { enabled: true, min: 160, max: 300, step: 5, defaultVal: 220, unit: "cm", pricePerUnitDelta: 150 },
        depth: { enabled: true, min: 85, max: 110, step: 5, defaultVal: 95, unit: "cm" },
        height: { enabled: true, min: 75, max: 90, step: 5, defaultVal: 80, unit: "cm" }
      },
      fabrics: [
        { id: "cream-boucle", label: "Heavy Cream Boucl\xE9", priceDelta: 0, description: "Soft textured warmth with high rub count" },
        { id: "warm-oat-linen", label: "Belgian Linen Blend", priceDelta: 3500, description: "Breathable stonewashed European linen" },
        { id: "royal-velvet", label: "Deep Moss Velvet", priceDelta: 7e3, description: "Plush stain-resistant architectural velvet" },
        { id: "italian-leather", label: "Cognac Full-Grain Leather", priceDelta: 32e3, description: "Hand-burnished Italian aniline leather" }
      ],
      colors: [
        { id: "ivory", label: "Warm Ivory", swatchHex: "#E8DFC9", priceDelta: 0 },
        { id: "terracotta", label: "Terracotta Rust", swatchHex: "#B35438", priceDelta: 0 },
        { id: "moss", label: "Olive Moss", swatchHex: "#5D6B57", priceDelta: 0 },
        { id: "taupe", label: "Muted Taupe", swatchHex: "#9C8F84", priceDelta: 0 },
        { id: "charcoal", label: "Charcoal Slate", swatchHex: "#36393F", priceDelta: 0 }
      ],
      finishes: [
        { id: "nat-oak", label: "Natural White Oak", priceDelta: 0 },
        { id: "walnut", label: "Dark American Walnut", priceDelta: 3e3 },
        { id: "smoked-ash", label: "Smoked Ebonized Ash", priceDelta: 4500 }
      ],
      materials: [
        { id: "teak-frame", label: "Kiln-Dried Teak Wood Frame", priceDelta: 0 },
        { id: "sheesham-frame", label: "Seasoned Sheesham Hardwood", priceDelta: -4e3 }
      ],
      notesPlaceholder: "E.g. Chaise on right-hand side, firmer 40-density seat foam..."
    }
  },
  {
    id: "ck-luma-chair",
    slug: "luma-lounge-chair",
    name: "Luma Lounge Chair",
    price: 42e3,
    description: "An open oak frame with a deep, cushioned seat. Designed for reading, conversation and the slower hours of the day.",
    category: "Chair",
    space: "lounge",
    tabs: ["bestsellers", "new"],
    images: [
      img("photo-1567538096630-e0c55bd6374c"),
      img("photo-1592078615290-033ee584e267"),
      img("photo-1580480055273-228ff5388ef8"),
      img("photo-1544457070-4cd773b4d71e")
    ],
    finishes: ["Natural oak", "Walnut stain"],
    care: "Dust the frame with a dry cloth. Keep out of prolonged direct sun.",
    customizationEnabled: true,
    customizationOptions: {
      enabled: true,
      seatingOptions: [
        { id: "single", label: "Standard Lounge Chair", priceDelta: 0 },
        { id: "with-ottoman", label: "Chair + Matching Footstool Ottoman", priceDelta: 14e3 }
      ],
      dimensionSpecs: {
        width: { enabled: true, min: 70, max: 95, step: 5, defaultVal: 80, unit: "cm" },
        depth: { enabled: true, min: 75, max: 95, step: 5, defaultVal: 85, unit: "cm" },
        height: { enabled: true, min: 75, max: 90, step: 5, defaultVal: 82, unit: "cm" }
      },
      fabrics: [
        { id: "textured-boucle", label: "Textured Boucl\xE9", priceDelta: 0 },
        { id: "belgian-linen", label: "Belgian Linen", priceDelta: 2500 },
        { id: "aniline-leather", label: "Tan Saddle Leather", priceDelta: 12e3 }
      ],
      colors: [
        { id: "natural-oat", label: "Natural Oat", swatchHex: "#E5D3B3", priceDelta: 0 },
        { id: "amber-rust", label: "Amber Rust", swatchHex: "#C06C47", priceDelta: 0 },
        { id: "sage-green", label: "Forest Sage", swatchHex: "#4A5B4E", priceDelta: 0 }
      ],
      finishes: [
        { id: "natural-oak", label: "Natural Oak Frame", priceDelta: 0 },
        { id: "walnut-stain", label: "Walnut Stain Frame", priceDelta: 1800 }
      ],
      materials: [
        { id: "oak-wood", label: "Solid White Oak", priceDelta: 0 },
        { id: "teak-wood", label: "Burma Teak Hardwood", priceDelta: 4500 }
      ]
    }
  },
  {
    id: "ck-nordic-sideboard",
    slug: "nordic-walnut-sideboard",
    name: "Nordic Walnut Sideboard",
    price: 98e3,
    description: "A three-drawer walnut sideboard with a quiet grain and a low, architectural profile. Storage that reads as furniture, not cabinetry.",
    category: "Storage",
    space: "living",
    tabs: ["bestsellers", "classics"],
    images: [
      img("photo-1611967164521-abae8fba4668"),
      img("photo-1600585154526-990dced4db0d"),
      img("photo-1600566753086-00f18fb6b3ea"),
      img("photo-1556228453-efd6c1ff04f6")
    ],
    finishes: ["Walnut"],
    care: "Wipe with a slightly damp cloth. Use coasters on the top surface."
  },
  {
    id: "ck-solene-daybed",
    slug: "solene-upholstered-daybed",
    name: "Solene Upholstered Daybed",
    price: 89e3,
    description: "A slender daybed in oatmeal linen. Equally at home as a sofa, a guest bed or a quiet place to rest by a window.",
    category: "Daybed",
    space: "bedroom",
    tabs: ["new", "classics"],
    images: [
      img("photo-1505693416388-ac5ce068fe85"),
      img("photo-1540518614846-7eded433c457"),
      img("photo-1522771739844-6a9f6d5f14af"),
      img("photo-1615873968403-89e068629265")
    ],
    finishes: ["Oatmeal linen"],
    care: "Rotate cushions periodically. Professional clean only."
  },
  {
    id: "ck-mira-mirror",
    slug: "mira-wall-mirror",
    name: "Mira Wall Mirror",
    price: 24e3,
    description: "A round oak-framed mirror with a thin, tactile rim. A simple way to lift light across a hallway, dining room or dressing space.",
    category: "Mirror",
    space: "lounge",
    tabs: ["bestsellers", "new", "sets"],
    images: [
      img("photo-1616046229478-9901c5536a45"),
      img("photo-1578500494198-246f612d3b3d"),
      img("photo-1618220179428-22790b461013"),
      img("photo-1600210491892-03d54c0aaf87")
    ],
    finishes: ["Natural oak"],
    care: "Clean glass with a non-abrasive cloth."
  },
  {
    id: "ck-theo-table",
    slug: "theo-coffee-table",
    name: "Theo Coffee Table",
    price: 36e3,
    description: "A two-tier oak coffee table with a calm, rectilinear plan. Open storage below for books, trays and the objects of everyday living.",
    category: "Table",
    space: "living",
    tabs: ["bestsellers", "sets", "classics"],
    images: [
      img("photo-1533090481720-856c6e3c1fdc"),
      img("photo-1611269154421-4e27233ac5c7"),
      img("photo-1600121848594-d8644e57abab"),
      img("photo-1616137466211-f939a420be84")
    ],
    finishes: ["Natural oak"],
    care: "Use felt pads. Avoid standing water on the surface."
  },
  {
    id: "ck-theo-dining-chair",
    slug: "theo-oak-chair",
    name: "Theo Oak Chair",
    price: 18e3,
    description: "A sculpted oak dining chair with a curved backrest. Light enough to move, considered enough to keep.",
    category: "Chair",
    space: "dining",
    tabs: ["new", "sets"],
    images: [
      img("photo-1503602642458-232111445657"),
      img("photo-1544457070-4cd773b4d71e"),
      img("photo-1592078615290-033ee584e267"),
      img("photo-1580480055273-228ff5388ef8")
    ],
    finishes: ["Natural oak"],
    care: "Wipe after meals. Tighten joinery once a year."
  },
  {
    id: "ck-haven-bed",
    slug: "haven-upholstered-bed",
    name: "Haven Upholstered Bed",
    price: 126e3,
    compareAt: 142e3,
    description: "A low upholstered bed with a generous headboard. Soft structure, quiet colour and a silhouette made for unhurried mornings.",
    category: "Bed",
    space: "bedroom",
    tabs: ["new", "classics"],
    images: [
      img("photo-1540518614846-7eded433c457"),
      img("photo-1615876234886-fd9a39fda97f"),
      img("photo-1522771739844-6a9f6d5f14af"),
      img("photo-1615873968403-89e068629265")
    ],
    finishes: ["Warm oat", "Stone linen"],
    care: "Spot clean fabric. Professional clean for the headboard."
  },
  {
    id: "ck-orb-pendant",
    slug: "orb-pendant-light",
    name: "Orb Pendant Light",
    price: 16e3,
    description: "A dark, dome pendant that gathers light over a table or daybed. Understated, architectural and easy to live with.",
    category: "Lighting",
    space: "dining",
    tabs: ["new"],
    images: [
      img("photo-1513506003901-1e6a229e2d15"),
      img("photo-1600607687939-ce8a6c25118c"),
      img("photo-1550254478-ead40cc54513"),
      img("photo-1600566753190-17f0baa2a6c3")
    ],
    finishes: ["Matte charcoal"],
    care: "Disconnect power before cleaning. Dust with a dry cloth."
  },
  {
    id: "ck-linen-ottoman",
    slug: "linen-ottoman",
    name: "Linen Ottoman",
    price: 22e3,
    description: "A compact upholstered ottoman in warm linen. Use as a footrest, extra seat or a low table with a tray.",
    category: "Ottoman",
    space: "lounge",
    tabs: ["bestsellers", "sets"],
    images: [
      img("photo-1540574163026-643ea20ade25"),
      img("photo-1484101403633-562f891dc89a"),
      img("photo-1586023492125-27b2c045efd7"),
      img("photo-1550254478-ead40cc54513")
    ],
    finishes: ["Warm oat linen"],
    care: "Vacuum the fabric. Rotate to even the wear."
  }
];

// src/lib/product-pricing.ts
function normalizeFestivePercent(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.min(100, Math.max(1, Math.round(n)));
}
function effectiveSellingPrice(basePrice, festivePercent) {
  const base = Math.max(0, Math.round(Number(basePrice) || 0));
  const pct = normalizeFestivePercent(festivePercent);
  if (!pct) return base;
  return Math.round(base * (1 - pct / 100));
}

// src/data/site.ts
var DEMO_COUPON = {
  code: "WARM10",
  percent: 10
};

// server/auth-store.ts
import { createHash, randomBytes as randomBytes4, timingSafeEqual } from "node:crypto";
import bcrypt2 from "bcryptjs";
function hashToken(token) {
  return createHash("sha256").update(token).digest("hex");
}
function newToken() {
  return randomBytes4(32).toString("hex");
}
function fromCustomerDbRow(row) {
  return {
    id: row.id,
    name: row.name || "",
    email: (row.email || "").toLowerCase().trim(),
    phone: row.phone || "",
    passwordHash: row.password_hash || "",
    emailVerified: Boolean(row.email_verified),
    verifyTokenHash: row.verify_token || null,
    verifyExpires: row.verify_expires ? Number(row.verify_expires) : null,
    resetTokenHash: row.reset_token || null,
    resetExpires: row.reset_expires ? Number(row.reset_expires) : null,
    createdAt: row.created_at || (/* @__PURE__ */ new Date()).toISOString(),
    addresses: Array.isArray(row.addresses) ? row.addresses : []
  };
}
function toCustomerDbRow(c) {
  return {
    id: c.id,
    name: c.name,
    email: c.email.toLowerCase().trim(),
    phone: c.phone || "",
    password_hash: c.passwordHash,
    email_verified: c.emailVerified,
    verify_token: c.verifyTokenHash,
    reset_token: c.resetTokenHash,
    reset_expires: c.resetExpires,
    addresses: c.addresses || [],
    updated_at: (/* @__PURE__ */ new Date()).toISOString()
  };
}
async function findByEmail(email) {
  const cleanEmail = email.toLowerCase().trim();
  if (!cleanEmail) return null;
  const { data, error } = await supabase.from("customers").select("*").eq("email", cleanEmail).maybeSingle();
  if (error) {
    console.error("[AuthStore] Supabase findByEmail error:", error.message);
    return null;
  }
  return data ? fromCustomerDbRow(data) : null;
}
async function findById(id) {
  if (!id) return null;
  const { data, error } = await supabase.from("customers").select("*").eq("id", id).maybeSingle();
  if (error) {
    console.error("[AuthStore] Supabase findById error:", error.message);
    return null;
  }
  return data ? fromCustomerDbRow(data) : null;
}
function publicCustomer(customer) {
  return {
    id: customer.id,
    name: customer.name,
    email: customer.email,
    phone: customer.phone,
    emailVerified: customer.emailVerified
  };
}
async function createCustomer(input) {
  const email = input.email.toLowerCase().trim();
  const existing = await findByEmail(email);
  if (existing) {
    return { error: "duplicate" };
  }
  const verifyToken = newToken();
  const customer = {
    id: randomBytes4(12).toString("hex"),
    name: input.name.trim(),
    email,
    phone: input.phone.trim(),
    passwordHash: await bcrypt2.hash(input.password, 12),
    emailVerified: false,
    verifyTokenHash: hashToken(verifyToken),
    verifyExpires: Date.now() + 1e3 * 60 * 60 * 24,
    resetTokenHash: null,
    resetExpires: null,
    createdAt: (/* @__PURE__ */ new Date()).toISOString(),
    addresses: []
  };
  const row = toCustomerDbRow(customer);
  row.created_at = customer.createdAt;
  const { data, error } = await supabase.from("customers").insert([row]).select();
  if (error) {
    console.error("[AuthStore] Supabase createCustomer error:", error.message);
    throw new Error(`Failed to create account in database: ${error.message}`);
  }
  return { customer: fromCustomerDbRow(data[0]), verifyToken };
}
async function saveCustomer(updated) {
  const row = toCustomerDbRow(updated);
  const { error } = await supabase.from("customers").upsert([row], { onConflict: "id" });
  if (error) {
    console.error("[AuthStore] Supabase saveCustomer error:", error.message);
    throw new Error(`Failed to save customer in database: ${error.message}`);
  }
}
async function updateProfile(customer, input) {
  const email = input.email.toLowerCase().trim();
  if (email !== customer.email) {
    const taken = await findByEmail(email);
    if (taken && taken.id !== customer.id) return { error: "duplicate" };
  }
  const next = {
    ...customer,
    name: input.name.trim(),
    email,
    phone: input.phone.trim()
  };
  await saveCustomer(next);
  return { customer: next };
}
async function issueResetToken(customer) {
  const resetToken = newToken();
  await saveCustomer({
    ...customer,
    resetTokenHash: hashToken(resetToken),
    resetExpires: Date.now() + 1e3 * 60 * 30
  });
  return resetToken;
}
async function findByVerifyToken(token) {
  const hashed = hashToken(token);
  const { data, error } = await supabase.from("customers").select("*").eq("verify_token", hashed).maybeSingle();
  if (error || !data) return null;
  return fromCustomerDbRow(data);
}
async function findByResetToken(token) {
  const hashed = hashToken(token);
  const { data, error } = await supabase.from("customers").select("*").eq("reset_token", hashed).maybeSingle();
  if (error || !data) return null;
  return fromCustomerDbRow(data);
}
async function setPassword(customer, password) {
  await saveCustomer({
    ...customer,
    passwordHash: await bcrypt2.hash(password, 12),
    resetTokenHash: null,
    resetExpires: null
  });
}
async function addAddress(customer, input) {
  const address = { ...input, id: randomBytes4(8).toString("hex") };
  await saveCustomer({ ...customer, addresses: [...customer.addresses, address] });
  return address;
}
async function updateAddress(customer, addressId, input) {
  const addresses = customer.addresses.map((address) => address.id === addressId ? { ...input, id: addressId } : address);
  if (!addresses.some((address) => address.id === addressId)) return null;
  await saveCustomer({ ...customer, addresses });
  return addresses.find((address) => address.id === addressId) ?? null;
}
async function removeAddress(customer, addressId) {
  if (!customer.addresses.some((address) => address.id === addressId)) return false;
  await saveCustomer({ ...customer, addresses: customer.addresses.filter((address) => address.id !== addressId) });
  return true;
}
async function sendEmailOtp(email) {
  try {
    const { error } = await supabase.auth.signInWithOtp({
      email: email.toLowerCase().trim(),
      options: { shouldCreateUser: true }
    });
    if (error) {
      console.warn("[Supabase Auth OTP Send Warning]:", error.message);
      return { ok: false, error: error.message };
    }
    return { ok: true };
  } catch (err) {
    console.error("[Supabase Auth OTP Send Exception]:", err);
    return { ok: false, error: err.message || "Failed to dispatch email verification." };
  }
}
async function verifyEmailOtp(email, token) {
  const cleanEmail = email.toLowerCase().trim();
  const cleanToken = token.trim();
  try {
    let { data, error } = await supabase.auth.verifyOtp({
      email: cleanEmail,
      token: cleanToken,
      type: "email"
    });
    if (error || !data?.user) {
      const fallback = await supabase.auth.verifyOtp({
        email: cleanEmail,
        token: cleanToken,
        type: "signup"
      });
      if (!fallback.error && fallback.data?.user) {
        data = fallback.data;
        error = null;
      }
    }
    if (error || !data?.user) {
      return { ok: false, error: error?.message || "Invalid or expired verification code." };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message || "Verification failed." };
  }
}
async function sendPasswordResetEmail(email, redirectTo) {
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email.toLowerCase().trim(), {
      redirectTo
    });
    if (error) {
      console.warn("[Supabase Auth Reset Password Warning]:", error.message);
      return { ok: false, error: error.message };
    }
    return { ok: true };
  } catch (err) {
    console.error("[Supabase Auth Reset Password Exception]:", err);
    return { ok: false, error: err.message || "Failed to dispatch password reset email." };
  }
}

// server/order-store.ts
var BESPOKE_COMMISSION_PRODUCT_ID = "prod_bespoke_commission";
function normaliseOrder(row) {
  return {
    id: row.id,
    number: row.number,
    customerId: row.customer_id ?? row.customerId,
    createdAt: row.created_at ?? row.createdAt,
    items: Array.isArray(row.items) ? row.items : [],
    subtotal: Number(row.subtotal) || 0,
    discount: Number(row.discount) || 0,
    total: Number(row.total) || 0,
    coupon: row.coupon ?? null,
    paymentStatus: row.payment_status ?? row.paymentStatus ?? "pending",
    fulfilmentStatus: row.fulfilment_status ?? row.fulfilmentStatus ?? "placed",
    shippingAddress: row.address ?? row.shippingAddress ?? null,
    deliveryMethod: row.delivery_method ?? row.deliveryMethod ?? null,
    trackingNumber: row.tracking_number ?? row.trackingNumber ?? null,
    estimatedDelivery: row.estimated_delivery ?? row.estimatedDelivery ?? null,
    contact: row.contact ?? null,
    cartFingerprint: row.checkout_key ?? row.cartFingerprint ?? "",
    amountPaise: Math.round((Number(row.total) || 0) * 100),
    razorpayOrderId: row.razorpay_order_id ?? row.razorpayOrderId ?? null,
    razorpayPaymentId: row.razorpay_payment_id ?? row.razorpayPaymentId ?? null,
    paymentError: row.payment_error ?? row.paymentError ?? null,
    paymentMethod: row.payment_method ?? row.paymentMethod ?? null
  };
}
function nextTrackingNumber(order) {
  if (order.trackingNumber) return order.trackingNumber;
  const digits = order.number.replace(/\D/g, "") || "000000";
  return `CKTRK${digits}${order.id.slice(-4).toUpperCase()}`;
}
function cartFingerprint(items, coupon, destination) {
  const norm = items.map((item) => `${item.productId}:${item.quantity}:${item.finish ?? ""}`).sort().join(";");
  return `${norm}|${(coupon || "").trim().toUpperCase()}|${destination.trim().toLowerCase()}`;
}
async function listOrdersForCustomer(customerId) {
  const customer = await findById(customerId);
  const email = customer?.email?.toLowerCase().trim() || "";
  const { data, error } = await supabase.from("orders").select("*").eq("customer_id", customerId).order("created_at", { ascending: false });
  if (error) throw new Error(`Could not load orders: ${error.message}`);
  const byId = (data ?? []).map(normaliseOrder);
  const seen = new Set(byId.map((o) => o.id));
  if (email) {
    const { data: emailRows, error: emailError } = await supabase.from("orders").select("*").ilike("contact->>email", email).order("created_at", { ascending: false });
    if (!emailError && emailRows?.length) {
      for (const row of emailRows) {
        if (!seen.has(row.id)) {
          seen.add(row.id);
          byId.push(normaliseOrder(row));
        }
      }
      byId.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
  }
  return byId;
}
async function listAllOrders() {
  const { data, error } = await supabase.from("orders").select("*").order("created_at", { ascending: false });
  if (error) throw new Error(`Could not load orders: ${error.message}`);
  return (data ?? []).map(normaliseOrder);
}
async function getOrderForCustomer(customerId, orderId) {
  const customer = await findById(customerId);
  const email = customer?.email?.toLowerCase().trim() || "";
  const { data, error } = await supabase.from("orders").select("*").eq("id", orderId).eq("customer_id", customerId).maybeSingle();
  if (error) throw new Error(`Could not load order: ${error.message}`);
  if (data) return normaliseOrder(data);
  if (!email) return null;
  const { data: byEmail, error: emailError } = await supabase.from("orders").select("*").eq("id", orderId).ilike("contact->>email", email).maybeSingle();
  if (emailError) throw new Error(`Could not load order: ${emailError.message}`);
  return byEmail ? normaliseOrder(byEmail) : null;
}
async function getOrderByNumberForCustomer(customerId, number) {
  const customer = await findById(customerId);
  const email = customer?.email?.toLowerCase().trim() || "";
  const trimmed = number.trim();
  const { data, error } = await supabase.from("orders").select("*").eq("number", trimmed).eq("customer_id", customerId).maybeSingle();
  if (error) throw new Error(`Could not load order: ${error.message}`);
  if (data) return normaliseOrder(data);
  if (!email) return null;
  const { data: byEmail, error: emailError } = await supabase.from("orders").select("*").eq("number", trimmed).ilike("contact->>email", email).maybeSingle();
  if (emailError) throw new Error(`Could not load order: ${emailError.message}`);
  return byEmail ? normaliseOrder(byEmail) : null;
}
async function customerPayload(customerId) {
  if (!customerId || customerId === "guest") throw new Error("A signed-in customer is required.");
  const localUser = await findById(customerId);
  if (!localUser) throw new Error("Customer account could not be found.");
  return {
    id: localUser.id,
    name: localUser.name,
    email: localUser.email,
    phone: localUser.phone || "",
    password_hash: localUser.passwordHash || "synced_customer",
    email_verified: localUser.emailVerified ?? true,
    addresses: localUser.addresses || [],
    created_at: localUser.createdAt || (/* @__PURE__ */ new Date()).toISOString()
  };
}
function resolveProductStock(dbP, fallbackP) {
  const stock = Number(
    dbP != null ? dbP.ready_to_ship_stock ?? dbP.readyToShipStock ?? 0 : fallbackP != null ? fallbackP.readyToShipStock ?? 0 : 0
  );
  const isMadeToOrder = Boolean(
    dbP != null ? dbP.made_to_order ?? dbP.madeToOrder ?? true : fallbackP != null ? fallbackP.madeToOrder ?? true : true
  );
  return { stock, isMadeToOrder };
}
async function validateCartLines(items) {
  const { data: dbProducts } = await supabase.from("products").select("id,name,ready_to_ship_stock,made_to_order,status");
  const liveCatalog = dbProducts && dbProducts.length > 0 ? dbProducts : [];
  const issues = [];
  for (const line of items) {
    if (line.quantity < 1) continue;
    const dbP = liveCatalog.find((entry) => entry.id === line.productId);
    const fallbackP = products.find((entry) => entry.id === line.productId);
    const p = dbP || fallbackP;
    if (!p) {
      issues.push({
        productId: line.productId,
        productName: line.productId,
        requested: line.quantity,
        available: 0,
        madeToOrder: true,
        reason: "not_found"
      });
      continue;
    }
    if (dbP && dbP.status && dbP.status !== "published") {
      issues.push({
        productId: line.productId,
        productName: String(p.name),
        requested: line.quantity,
        available: 0,
        madeToOrder: false,
        reason: "unpublished"
      });
      continue;
    }
    const { stock, isMadeToOrder } = resolveProductStock(dbP, fallbackP);
    if (isMadeToOrder) continue;
    if (stock <= 0) {
      issues.push({
        productId: line.productId,
        productName: String(p.name),
        requested: line.quantity,
        available: 0,
        madeToOrder: false,
        reason: "out_of_stock"
      });
    } else if (line.quantity > stock) {
      issues.push({
        productId: line.productId,
        productName: String(p.name),
        requested: line.quantity,
        available: stock,
        madeToOrder: false,
        reason: "insufficient_stock"
      });
    }
  }
  if (issues.length) return { ok: false, issues };
  return { ok: true, issues: [] };
}
async function createOrderFromCart(customerId, input) {
  const stockCheck = await validateCartLines(input.items.map((line) => ({ productId: line.productId, quantity: line.quantity })));
  if (!stockCheck.ok) {
    const first = stockCheck.issues[0];
    const message = first.reason === "out_of_stock" ? `"${first.productName}" is out of stock. Remove it from your bag or choose made-to-order pieces.` : first.reason === "insufficient_stock" ? `Only ${first.available} unit${first.available === 1 ? "" : "s"} left for "${first.productName}" \u2014 you asked for ${first.requested}.` : first.reason === "not_found" ? "An item in your bag is no longer available." : `"${first.productName}" is not available to buy right now.`;
    return {
      error: "insufficient_stock",
      message,
      productId: first.productId,
      productName: first.productName,
      availableStock: first.available,
      requestedQuantity: first.requested,
      issues: stockCheck.issues
    };
  }
  const { data: dbProducts } = await supabase.from("products").select("*");
  const liveCatalog = dbProducts && dbProducts.length > 0 ? dbProducts : [];
  const items = [];
  for (const line of input.items) {
    const dbP = liveCatalog.find((entry) => entry.id === line.productId);
    const fallbackP = products.find((entry) => entry.id === line.productId);
    const p = dbP || fallbackP;
    if (!p || line.quantity < 1) continue;
    const { stock, isMadeToOrder } = resolveProductStock(dbP, fallbackP);
    if (!isMadeToOrder && line.quantity > stock) {
      return {
        error: "insufficient_stock",
        message: `Only ${stock} unit${stock === 1 ? "" : "s"} available in stock for "${p.name}".`,
        productId: line.productId,
        productName: String(p.name),
        availableStock: stock,
        requestedQuantity: line.quantity
      };
    }
    const festivePct = Number(dbP?.festive_discount_percent ?? fallbackP?.festiveDiscountPercent) || 0;
    const basePrice = effectiveSellingPrice(Number(p.price) || 0, festivePct);
    const images = Array.isArray(p.images) ? p.images : [];
    const finishes = Array.isArray(p.finishes) ? p.finishes : ["Standard"];
    let itemPrice = basePrice;
    let validatedCustomization = void 0;
    if (line.customization && typeof line.customization === "object") {
      const customConfig = (dbP?.customization_options ?? fallbackP?.customizationOptions) || {};
      let delta = 0;
      const c = line.customization;
      if (c.seating && Array.isArray(customConfig.seatingOptions)) {
        const found = customConfig.seatingOptions.find((opt) => opt.id === c.seating || opt.label === c.seating);
        if (found) delta += Number(found.priceDelta) || 0;
      }
      if (c.width && customConfig.dimensionSpecs?.width) {
        const wSpec = customConfig.dimensionSpecs.width;
        if (wSpec.pricePerUnitDelta && Number(c.width) > wSpec.defaultVal) {
          const over = Math.max(0, Number(c.width) - wSpec.defaultVal);
          delta += over * Number(wSpec.pricePerUnitDelta);
        }
      }
      if (c.fabric && Array.isArray(customConfig.fabrics)) {
        const found = customConfig.fabrics.find((opt) => opt.id === c.fabric || opt.label === c.fabric);
        if (found) delta += Number(found.priceDelta) || 0;
      }
      if (c.color && Array.isArray(customConfig.colors)) {
        const found = customConfig.colors.find((opt) => opt.id === c.color || opt.label === c.color || opt.name === c.color);
        if (found) delta += Number(found.priceDelta) || 0;
      }
      if (c.finish && Array.isArray(customConfig.finishes)) {
        const found = customConfig.finishes.find((opt) => opt.id === c.finish || opt.label === c.finish);
        if (found) delta += Number(found.priceDelta) || 0;
      }
      if (c.material && Array.isArray(customConfig.materials)) {
        const found = customConfig.materials.find((opt) => opt.id === c.material || opt.label === c.material);
        if (found) delta += Number(found.priceDelta) || 0;
      }
      validatedCustomization = {
        ...c,
        totalCustomizationDelta: delta
      };
      itemPrice = Math.max(0, basePrice + delta);
    }
    items.push({
      productId: p.id,
      name: p.name,
      slug: p.slug,
      image: images[0] || fallbackP?.images[0] || "/hero-living-hd.jpg",
      finish: line.finish || finishes[0] || "Standard",
      quantity: Math.round(line.quantity),
      unitPrice: itemPrice,
      customization: validatedCustomization
    });
  }
  if (!items.length) return { error: "empty" };
  const subtotal = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  let appliedCoupon = null;
  let discount = 0;
  if (input.coupon?.trim()) {
    const code = input.coupon.trim().toUpperCase();
    const { data: dbCoupons } = await supabase.from("coupons").select("*").eq("active", true);
    const foundCoupon = dbCoupons?.find((c) => c.code.toUpperCase() === code);
    if (foundCoupon) {
      const minVal = Number(foundCoupon.min_order_value) || 0;
      if (subtotal >= minVal) {
        appliedCoupon = code;
        if (foundCoupon.type === "percent") {
          const calc = Math.round(subtotal * (Number(foundCoupon.value) / 100));
          discount = foundCoupon.max_discount ? Math.min(calc, Number(foundCoupon.max_discount)) : calc;
        } else {
          discount = Math.min(subtotal, Number(foundCoupon.value) || 0);
        }
      }
    } else if (code === DEMO_COUPON.code) {
      appliedCoupon = DEMO_COUPON.code;
      discount = Math.round(subtotal * (DEMO_COUPON.percent / 100));
    } else {
      const fileCoupon = findCouponByCode(code);
      if (fileCoupon) {
        const applied = applyFileCouponDiscount(fileCoupon, subtotal, customerId);
        if (applied.ok) {
          appliedCoupon = code;
          discount = applied.discount;
        }
      }
    }
  }
  const coupon = appliedCoupon;
  const total = Math.max(0, subtotal - discount);
  const order = {
    id: randomBytes5(10).toString("hex"),
    number: `CK${randomBytes5(8).toString("hex").toUpperCase()}`,
    customerId,
    createdAt: (/* @__PURE__ */ new Date()).toISOString(),
    items,
    subtotal,
    discount,
    total,
    coupon,
    paymentStatus: input.paymentStatus || "unpaid",
    fulfilmentStatus: "placed",
    shippingAddress: input.address,
    deliveryMethod: null,
    trackingNumber: null,
    estimatedDelivery: null,
    contact: input.contact ?? null,
    cartFingerprint: input.cartFingerprint || "",
    amountPaise: Math.round(total * 100),
    razorpayOrderId: null,
    razorpayPaymentId: null,
    paymentError: null,
    paymentMethod: null
  };
  const customer = await customerPayload(customerId);
  const checkoutKey = input.cartFingerprint || `${customerId}:${order.id}`;
  const { data, error } = await supabase.rpc("create_order_transaction", {
    p_customer: customer,
    p_order: {
      ...order,
      address: order.shippingAddress,
      payment_method: order.paymentMethod,
      payment_status: order.paymentStatus,
      fulfilment_status: order.fulfilmentStatus,
      razorpay_order_id: order.razorpayOrderId,
      razorpay_payment_id: order.razorpayPaymentId,
      checkout_key: checkoutKey
    },
    p_items: order.items
  });
  if (error) throw new Error(`Could not save order: ${error.message}`);
  if (!data) throw new Error("Could not save order: the database returned no order.");
  let saved = normaliseOrder(data);
  const tracking = nextTrackingNumber(saved);
  const { data: patched, error: patchError } = await supabase.from("orders").update({
    tracking_number: tracking,
    estimated_delivery: saved.estimatedDelivery || saved.createdAt,
    updated_at: (/* @__PURE__ */ new Date()).toISOString()
  }).eq("id", saved.id).select("*").maybeSingle();
  if (!patchError && patched) saved = normaliseOrder(patched);
  else saved = { ...saved, trackingNumber: tracking, estimatedDelivery: saved.estimatedDelivery || saved.createdAt };
  return { order: saved };
}
function tryRedeemOrderCoupon(customerId, couponCode) {
  if (!couponCode?.trim()) return;
  const fileCoupon = findCouponByCode(couponCode);
  if (fileCoupon?.personal) redeemPersonalCoupon(couponCode, customerId);
}
async function findReusableCheckoutOrder(customerId, fingerprint) {
  const { data, error } = await supabase.from("orders").select("*").eq("customer_id", customerId).eq("checkout_key", fingerprint).neq("payment_status", "paid").neq("payment_status", "refunded").neq("payment_status", "failed").maybeSingle();
  if (error) throw new Error(`Could not check for an existing checkout: ${error.message}`);
  return data ? normaliseOrder(data) : null;
}
async function attachRazorpayOrder(orderId, customerId, razorpayOrderId) {
  const { data, error } = await supabase.from("orders").update({ razorpay_order_id: razorpayOrderId, payment_status: "pending", updated_at: (/* @__PURE__ */ new Date()).toISOString() }).eq("id", orderId).eq("customer_id", customerId).neq("payment_status", "paid").select("*").maybeSingle();
  if (error) throw new Error(`Could not attach payment order: ${error.message}`);
  return data ? normaliseOrder(data) : null;
}
async function markOrderPaymentFailed(orderId, customerId, message) {
  const { data, error } = await supabase.from("orders").update({ payment_status: "failed", payment_error: message, updated_at: (/* @__PURE__ */ new Date()).toISOString() }).eq("id", orderId).eq("customer_id", customerId).neq("payment_status", "paid").select("*").maybeSingle();
  if (error) throw new Error(`Could not save payment failure: ${error.message}`);
  return data ? normaliseOrder(data) : null;
}
async function markOrderPaid(customerId, input) {
  const { data, error } = await supabase.rpc("mark_order_paid_transaction", {
    p_order_id: input.orderId,
    p_customer_id: customerId,
    p_razorpay_order_id: input.razorpayOrderId,
    p_razorpay_payment_id: input.razorpayPaymentId,
    p_payment_method: input.paymentMethod ?? "razorpay",
    p_delivery_method: input.deliveryMethod ?? null
  });
  if (error) throw new Error(`Could not save payment: ${error.message}`);
  if (!data) return { error: "missing" };
  return { order: normaliseOrder(data) };
}
async function markCashOnDelivery(customerId, input) {
  const { data, error } = await supabase.rpc("mark_order_cash_transaction", {
    p_order_id: input.orderId,
    p_customer_id: customerId,
    p_razorpay_order_id: input.razorpayOrderId
  });
  if (error) throw new Error(`Could not save cash-on-delivery order: ${error.message}`);
  return data ? { order: normaliseOrder(data) } : { error: "missing" };
}
async function createOrderFromBespokeQuote(customerId, input) {
  const amount = Math.round(Number(input.quoteAmount));
  if (!Number.isFinite(amount) || amount < 1) {
    return { error: "invalid_quote", message: "A valid commission amount is required." };
  }
  await supabase.from("products").upsert(
    [
      {
        id: BESPOKE_COMMISSION_PRODUCT_ID,
        slug: "bespoke-commission",
        name: "Bespoke atelier commission",
        sku: "CK-BESPOKE",
        price: 0,
        category: "Custom",
        category_id: "cat_sofas",
        space: "living",
        status: "archived",
        made_to_order: true,
        ready_to_ship_stock: 0
      }
    ],
    { onConflict: "id" }
  );
  const checkoutKey = `bespoke:${input.customRequestId}`;
  const reuse = await findReusableCheckoutOrder(customerId, checkoutKey);
  if (reuse) {
    await linkCustomRequestOrder(input.customRequestId, reuse.id);
    return { order: reuse };
  }
  const items = [
    {
      productId: BESPOKE_COMMISSION_PRODUCT_ID,
      name: `Bespoke \xB7 ${input.productName}`,
      slug: "bespoke-commission",
      image: input.image || "/hero-living-hd.jpg",
      finish: "Atelier commission",
      quantity: 1,
      unitPrice: amount,
      customization: {
        customRequestId: input.customRequestId,
        type: "bespoke",
        sourceProductId: input.productId || null
      }
    }
  ];
  const subtotal = amount;
  const order = {
    id: randomBytes5(10).toString("hex"),
    number: `CK${randomBytes5(8).toString("hex").toUpperCase()}`,
    customerId,
    createdAt: (/* @__PURE__ */ new Date()).toISOString(),
    items,
    subtotal,
    discount: 0,
    total: subtotal,
    coupon: null,
    paymentStatus: "pending",
    fulfilmentStatus: "placed",
    shippingAddress: input.address,
    deliveryMethod: null,
    trackingNumber: null,
    estimatedDelivery: null,
    contact: input.contact,
    cartFingerprint: checkoutKey,
    amountPaise: Math.round(subtotal * 100),
    razorpayOrderId: null,
    razorpayPaymentId: null,
    paymentError: null,
    paymentMethod: null
  };
  const customer = await customerPayload(customerId);
  const { data, error } = await supabase.rpc("create_order_transaction", {
    p_customer: customer,
    p_order: {
      ...order,
      address: order.shippingAddress,
      payment_method: order.paymentMethod,
      payment_status: order.paymentStatus,
      fulfilment_status: order.fulfilmentStatus,
      razorpay_order_id: order.razorpayOrderId,
      razorpay_payment_id: order.razorpayPaymentId,
      checkout_key: checkoutKey
    },
    p_items: order.items
  });
  if (error) throw new Error(`Could not save commission order: ${error.message}`);
  if (!data) throw new Error("Could not save commission order: the database returned no order.");
  let saved = normaliseOrder(data);
  const tracking = nextTrackingNumber(saved);
  const { data: patched, error: patchError } = await supabase.from("orders").update({
    tracking_number: tracking,
    estimated_delivery: saved.estimatedDelivery || saved.createdAt,
    updated_at: (/* @__PURE__ */ new Date()).toISOString()
  }).eq("id", saved.id).select("*").maybeSingle();
  if (!patchError && patched) saved = normaliseOrder(patched);
  else saved = { ...saved, trackingNumber: tracking, estimatedDelivery: saved.estimatedDelivery || saved.createdAt };
  await linkCustomRequestOrder(input.customRequestId, saved.id);
  return { order: saved };
}

// server/admin-api-handler.ts
var IST = "Asia/Kolkata";
function calendarDayInZone(iso, timeZone = IST) {
  const stamp = new Date(iso);
  if (Number.isNaN(stamp.getTime())) return "";
  return stamp.toLocaleDateString("en-CA", { timeZone });
}
function paidOrderTotal(order) {
  return order.paymentStatus === "paid" ? order.total : 0;
}
var ADMIN_COOKIE = "ck_admin_session";
function send(res, status, data) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(data));
  return true;
}
function parseCookies(header) {
  const out = {};
  if (!header) return out;
  for (const part of header.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key) out[key] = decodeURIComponent(rest.join("="));
  }
  return out;
}
function cookieFlags() {
  return process.env.VERCEL ? "HttpOnly; Path=/; SameSite=Lax; Secure" : "HttpOnly; Path=/; SameSite=Lax";
}
function setAdminSession(res, token) {
  res.setHeader("Set-Cookie", `${ADMIN_COOKIE}=${token}; ${cookieFlags()}; Max-Age=${60 * 60 * 24 * 7}`);
}
function clearAdminSession(res) {
  res.setHeader("Set-Cookie", `${ADMIN_COOKIE}=; ${cookieFlags()}; Max-Age=0`);
}
function currentAdmin(req) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token2 = authHeader.slice(7).trim();
    const admin = verifyAdminToken(token2);
    if (admin) return admin;
  }
  const cookies = parseCookies(req.headers.cookie);
  const token = cookies[ADMIN_COOKIE];
  if (token) {
    return verifyAdminToken(token);
  }
  return null;
}
function readAllCustomers() {
  try {
    const p = resolve7(dataDirectory(), "customers.json");
    if (existsSync6(p)) {
      return JSON.parse(readFileSync5(p, "utf8"));
    }
  } catch {
  }
  return [];
}
async function handleAdminApi(req, res, url, body) {
  if (req.method === "POST" && url === "/api/admin/auth/login") {
    const email = String(body.email || "").trim();
    const password = String(body.password || "");
    if (!email || !password) {
      return send(res, 400, { error: "Please enter administrator email and password." });
    }
    const admin2 = findAdminByEmail(email);
    if (!admin2) {
      return send(res, 401, { error: "Invalid administrator credentials." });
    }
    const matches = await bcrypt3.compare(password, admin2.passwordHash);
    if (!matches) {
      return send(res, 401, { error: "Invalid administrator credentials." });
    }
    const token = signAdminToken(admin2);
    setAdminSession(res, token);
    logAdminAction({
      adminId: admin2.id,
      adminName: admin2.name,
      action: "login",
      targetType: "admin_session",
      targetId: admin2.id
    });
    return send(res, 200, {
      admin: publicAdmin(admin2),
      token,
      message: "Welcome back, " + admin2.name
    });
  }
  if (req.method === "POST" && url === "/api/admin/auth/logout") {
    clearAdminSession(res);
    return send(res, 200, { ok: true, message: "Signed out successfully." });
  }
  const admin = currentAdmin(req);
  if (!admin) {
    return send(res, 401, { error: "Unauthorized. Admin session required." });
  }
  if (req.method === "GET" && url === "/api/admin/auth/me") {
    return send(res, 200, { admin: publicAdmin(admin) });
  }
  if (req.method === "GET" && url === "/api/admin/dashboard/stats") {
    const orders = await listAllOrders();
    const products2 = await readProducts();
    const customRequests = await listAllCustomRequests();
    const todayIst = calendarDayInZone((/* @__PURE__ */ new Date()).toISOString());
    const monthIst = todayIst.slice(0, 7);
    const todayOrders = orders.filter((o) => o.createdAt && calendarDayInZone(o.createdAt) === todayIst);
    const monthOrders = orders.filter((o) => {
      const day = calendarDayInZone(o.createdAt);
      return day && day.startsWith(monthIst);
    });
    const todaySales = todayOrders.reduce((sum, o) => sum + paidOrderTotal(o), 0);
    const monthlySales = monthOrders.reduce((sum, o) => sum + paidOrderTotal(o), 0);
    const totalRevenue = orders.reduce((sum, o) => sum + paidOrderTotal(o), 0);
    const pendingOrders = orders.filter((o) => o.fulfilmentStatus !== "delivered").length;
    const deliveredOrders = orders.filter((o) => o.fulfilmentStatus === "delivered").length;
    const lowStockProducts = products2.filter(
      (p) => !p.madeToOrder && p.status !== "archived" && p.readyToShipStock <= p.lowStockThreshold
    );
    const { data: customerRows, error: customerCountError } = await supabase.from("customers").select("id");
    if (customerCountError) {
      console.warn("[AdminDashboard] customer count error:", customerCountError.message);
    }
    const customersFromOrders = new Set(orders.map((o) => o.customerId).filter(Boolean)).size;
    const customerCount = Math.max(customerRows?.length ?? 0, customersFromOrders, readAllCustomers().length);
    const pendingEnquiriesCount = customRequests.filter((r) => r.status === "new" || r.status === "under_review").length;
    const approvedAwaitingPayment = customRequests.filter(
      (r) => r.status === "approved" && r.paymentStatus !== "paid" && Number(r.quoteAmount) > 0
    );
    const recentApprovedCommissions = customRequests.filter((r) => r.status === "approved").slice(0, 8).map((r) => ({
      id: r.id,
      productName: r.productName,
      customerName: r.customerName,
      quoteAmount: r.quoteAmount,
      paymentStatus: r.paymentStatus || "none",
      updatedAt: r.updatedAt
    }));
    return send(res, 200, {
      todaySales,
      todayOrdersCount: todayOrders.length,
      monthlySales,
      totalRevenue,
      totalOrders: orders.length,
      pendingOrders,
      deliveredOrders,
      customerCount,
      totalProducts: products2.length,
      lowStockCount: lowStockProducts.length,
      lowStockProducts: lowStockProducts.slice(0, 5),
      pendingEnquiriesCount,
      approvedAwaitingPaymentCount: approvedAwaitingPayment.length,
      recentApprovedCommissions,
      recentOrders: orders.slice(0, 6),
      recentAudit: getAuditLogs(5)
    });
  }
  if (req.method === "GET" && url === "/api/admin/products") {
    try {
      const products2 = await readProducts();
      return send(res, 200, { products: products2 });
    } catch (err) {
      return send(res, 500, { error: err.message || "Failed to fetch products from Supabase." });
    }
  }
  if (req.method === "POST" && url === "/api/admin/products/festive-discount") {
    try {
      const action = String(body.action || "apply");
      const scope = body.scope === "all" ? "all" : "one";
      const productId = typeof body.productId === "string" ? body.productId : void 0;
      if (action === "remove") {
        const result2 = await setFestiveDiscountForProducts({ percent: null, scope, productId });
        logAdminAction({
          adminId: admin.id,
          adminName: admin.name,
          action: "remove_festive_discount",
          targetType: "product",
          targetId: scope === "all" ? "all" : productId || "",
          details: { scope, updatedCount: result2.updatedCount }
        });
        return send(res, 200, {
          ok: true,
          message: scope === "all" ? "Festive discount removed from all products." : "Festive discount removed for this product.",
          updatedCount: result2.updatedCount
        });
      }
      const percent = Number(body.percent);
      if (!Number.isFinite(percent) || percent < 1 || percent > 100) {
        return send(res, 400, { error: "Enter a discount between 1 and 100 percent." });
      }
      const discountType = body.discountType === "standard" ? "standard" : "festive";
      const result = await setFestiveDiscountForProducts({ percent, scope, productId, discountType });
      logAdminAction({
        adminId: admin.id,
        adminName: admin.name,
        action: "apply_festive_discount",
        targetType: "product",
        targetId: scope === "all" ? "all" : productId || "",
        details: { scope, percent, updatedCount: result.updatedCount }
      });
      return send(res, 200, {
        ok: true,
        message: scope === "all" ? `Festive ${percent}% discount applied to ${result.updatedCount} products.` : `Festive ${percent}% discount applied to this product.`,
        updatedCount: result.updatedCount,
        percent
      });
    } catch (err) {
      return send(res, 500, { error: err.message || "Could not update festive discount." });
    }
  }
  if (req.method === "POST" && url === "/api/admin/products") {
    try {
      const created = await createProduct(body);
      logAdminAction({
        adminId: admin.id,
        adminName: admin.name,
        action: "create_product",
        targetType: "product",
        targetId: created.id,
        details: { name: created.name, sku: created.sku, price: created.price }
      });
      return send(res, 201, { product: created, message: "Product created and published to Supabase successfully." });
    } catch (err) {
      return send(res, 400, { error: err.message || "Failed to create product in Supabase." });
    }
  }
  const productMatch = url.match(/^\/api\/admin\/products\/([^/]+)$/);
  if (productMatch) {
    const prodId = productMatch[1];
    if (req.method === "GET") {
      const prod = await findProductById(prodId);
      if (!prod) return send(res, 404, { error: "Product not found." });
      return send(res, 200, { product: prod });
    }
    if (req.method === "PUT") {
      try {
        const updated = await updateProduct(prodId, body);
        if (!updated) return send(res, 404, { error: "Product not found." });
        logAdminAction({
          adminId: admin.id,
          adminName: admin.name,
          action: "update_product",
          targetType: "product",
          targetId: updated.id,
          details: { name: updated.name, price: updated.price, status: updated.status }
        });
        return send(res, 200, { product: updated, message: "Product updated in Supabase successfully." });
      } catch (err) {
        return send(res, 400, { error: err.message || "Failed to update product in Supabase." });
      }
    }
    if (req.method === "DELETE") {
      try {
        const deleted = await deleteProduct(prodId);
        if (!deleted) return send(res, 404, { error: "Product not found." });
        logAdminAction({
          adminId: admin.id,
          adminName: admin.name,
          action: "delete_product",
          targetType: "product",
          targetId: prodId
        });
        return send(res, 200, { ok: true, message: "Product removed from catalog." });
      } catch (err) {
        return send(res, 400, { error: err.message || "Failed to delete product from Supabase." });
      }
    }
  }
  if (req.method === "GET" && url === "/api/admin/categories") {
    try {
      const categories = await readCategories();
      return send(res, 200, { categories });
    } catch (err) {
      return send(res, 500, { error: err.message || "Failed to fetch categories." });
    }
  }
  if (req.method === "POST" && url === "/api/admin/categories") {
    try {
      const created = await createCategory(body);
      return send(res, 201, { category: created });
    } catch (err) {
      return send(res, 400, { error: err.message || "Failed to create category." });
    }
  }
  const catMatch = url.match(/^\/api\/admin\/categories\/([^/]+)$/);
  if (catMatch) {
    const catId = catMatch[1];
    if (req.method === "PUT") {
      try {
        const updated = await updateCategory(catId, body);
        if (!updated) return send(res, 404, { error: "Category not found." });
        return send(res, 200, { category: updated });
      } catch (err) {
        return send(res, 400, { error: err.message || "Failed to update category." });
      }
    }
    if (req.method === "DELETE") {
      try {
        const ok = await deleteCategory(catId);
        if (!ok) return send(res, 404, { error: "Category not found." });
        return send(res, 200, { ok: true });
      } catch (err) {
        return send(res, 400, { error: err.message || "Failed to delete category." });
      }
    }
  }
  if (req.method === "GET" && url === "/api/admin/inventory") {
    const products2 = await readProducts();
    const inventory = products2.map((p) => ({
      id: p.id,
      name: p.name,
      sku: p.sku,
      category: p.category,
      readyToShipStock: p.readyToShipStock,
      lowStockThreshold: p.lowStockThreshold,
      madeToOrder: p.madeToOrder,
      leadTimeWeeks: p.leadTimeWeeks,
      status: p.readyToShipStock <= 0 ? "Out of Stock" : p.readyToShipStock <= p.lowStockThreshold ? "Low Stock" : "In Stock",
      image: p.images[0] || "",
      price: p.price
    }));
    return send(res, 200, { inventory });
  }
  if (req.method === "GET" && url === "/api/admin/coupons") {
    return send(res, 200, { coupons: readCoupons() });
  }
  if (req.method === "POST" && url === "/api/admin/coupons/personal") {
    const customerId = String(body.customerId || "").trim();
    const customerName = String(body.customerName || body.name || "Customer").trim();
    const customerEmail = String(body.customerEmail || body.email || "").trim().toLowerCase();
    if (!customerId || !customerEmail) {
      return send(res, 400, { error: "customerId and customerEmail are required." });
    }
    const created = createPersonalCoupon({
      customerId,
      customerName,
      customerEmail,
      type: body.type === "flat" ? "flat" : "percent",
      value: Number(body.value) || 12,
      minOrderValue: Number(body.minOrderValue) || 15e3,
      description: String(body.description || `Personal offer for ${customerName}`),
      source: "admin"
    });
    logAdminAction({
      adminId: admin.id,
      adminName: admin.name,
      action: "create_personal_coupon",
      targetType: "coupon",
      targetId: created.id,
      details: { code: created.code, customerEmail }
    });
    return send(res, 201, { coupon: created, message: "Personal coupon issued." });
  }
  if (req.method === "POST" && url === "/api/admin/coupons") {
    const created = createCoupon(body);
    logAdminAction({
      adminId: admin.id,
      adminName: admin.name,
      action: "create_coupon",
      targetType: "coupon",
      targetId: created.id,
      details: { code: created.code, value: created.value, type: created.type }
    });
    return send(res, 201, { coupon: created, message: "Coupon created." });
  }
  const couponMatch = url.match(/^\/api\/admin\/coupons\/([^/]+)$/);
  if (couponMatch) {
    const coupId = couponMatch[1];
    if (req.method === "PUT") {
      const updated = updateCoupon(coupId, body);
      if (!updated) return send(res, 404, { error: "Coupon not found." });
      return send(res, 200, { coupon: updated, message: "Coupon updated." });
    }
    if (req.method === "DELETE") {
      const ok = deleteCoupon(coupId);
      if (!ok) return send(res, 404, { error: "Coupon not found." });
      return send(res, 200, { ok: true, message: "Coupon deleted." });
    }
  }
  if (req.method === "GET" && url === "/api/admin/banners") {
    return send(res, 200, { banners: readBanners() });
  }
  if (req.method === "POST" && url === "/api/admin/banners") {
    const created = createBanner(body);
    return send(res, 201, { banner: created, message: "Promotional banner added." });
  }
  const bannerMatch = url.match(/^\/api\/admin\/banners\/([^/]+)$/);
  if (bannerMatch) {
    const bannerId = bannerMatch[1];
    if (req.method === "PUT") {
      const updated = updateBanner(bannerId, body);
      if (!updated) return send(res, 404, { error: "Banner not found." });
      return send(res, 200, { banner: updated, message: "Banner updated." });
    }
    if (req.method === "DELETE") {
      const ok = deleteBanner(bannerId);
      if (!ok) return send(res, 404, { error: "Banner not found." });
      return send(res, 200, { ok: true, message: "Banner removed." });
    }
  }
  if (req.method === "GET" && url === "/api/admin/orders") {
    const orders = await listAllOrders();
    for (const order of orders) {
      if (!order.trackingNumber) {
        const tracking = nextTrackingNumber(order);
        const estimated = order.estimatedDelivery || order.createdAt;
        await supabase.from("orders").update({ tracking_number: tracking, estimated_delivery: estimated, updated_at: (/* @__PURE__ */ new Date()).toISOString() }).eq("id", order.id);
        order.trackingNumber = tracking;
        order.estimatedDelivery = estimated;
      }
    }
    return send(res, 200, { orders });
  }
  const orderStatusMatch = url.match(/^\/api\/admin\/orders\/([^/]+)\/status$/);
  if (orderStatusMatch && req.method === "PUT") {
    if (admin.role === "editor") {
      return send(res, 403, { error: "Your admin role cannot update order status." });
    }
    const orderId = orderStatusMatch[1];
    const fulfilmentStatus = String(body.fulfilmentStatus || "placed");
    const allowedFulfilment = ["placed", "confirmed", "processing", "shipped", "out_for_delivery", "delivered"];
    if (body.paymentStatus !== void 0) {
      return send(res, 400, { error: "Payment status can only be changed by verified payment processing." });
    }
    if (!allowedFulfilment.includes(fulfilmentStatus)) {
      return send(res, 400, { error: "Invalid fulfilment status." });
    }
    const { data: existingRow } = await supabase.from("orders").select("*").eq("id", orderId).maybeSingle();
    let existingOrder = existingRow ? normaliseOrder(existingRow) : null;
    if (!existingOrder) {
      const byNum = await supabase.from("orders").select("*").eq("number", orderId).maybeSingle();
      if (byNum.data) existingOrder = normaliseOrder(byNum.data);
    }
    if (!existingOrder) return send(res, 404, { error: "Order not found." });
    const existingOrderResolved = existingOrder;
    const trackingNumber = String(body.trackingNumber || "").trim() || existingOrderResolved.trackingNumber || nextTrackingNumber(existingOrderResolved);
    const estimatedDelivery = existingOrderResolved.estimatedDelivery || existingOrderResolved.createdAt;
    const patch = {
      fulfilment_status: fulfilmentStatus,
      tracking_number: trackingNumber,
      estimated_delivery: estimatedDelivery,
      updated_at: (/* @__PURE__ */ new Date()).toISOString()
    };
    const byId = await supabase.from("orders").update(patch).eq("id", orderId).select("*").maybeSingle();
    let updated = byId.data;
    if (byId.error) return send(res, 400, { error: `Could not update order: ${byId.error.message}` });
    if (!updated) {
      const byNumber = await supabase.from("orders").update(patch).eq("number", orderId).select("*").maybeSingle();
      if (byNumber.error) return send(res, 400, { error: `Could not update order: ${byNumber.error.message}` });
      updated = byNumber.data;
    }
    if (!updated) return send(res, 404, { error: "Order not found." });
    logAdminAction({
      adminId: admin.id,
      adminName: admin.name,
      action: "update_order_status",
      targetType: "order",
      targetId: updated.id,
      details: { orderNumber: updated.number, fulfilmentStatus, trackingNumber }
    });
    return send(res, 200, { order: normaliseOrder(updated), message: "Order status updated." });
  }
  if (req.method === "GET" && url === "/api/admin/customers") {
    const customers = readAllCustomers();
    const orders = await listAllOrders();
    const safeCustomers = customers.map((c) => {
      const customerOrders = orders.filter((o) => o.customerId === c.id);
      const totalSpent = customerOrders.reduce((sum, o) => sum + (o.paymentStatus === "paid" ? o.total : 0), 0);
      return {
        id: c.id,
        name: c.name,
        email: c.email,
        phone: c.phone,
        emailVerified: c.emailVerified,
        createdAt: c.createdAt,
        addressesCount: c.addresses ? c.addresses.length : 0,
        ordersCount: customerOrders.length,
        totalSpent
      };
    });
    return send(res, 200, { customers: safeCustomers });
  }
  if (req.method === "POST" && url === "/api/admin/upload") {
    const dataUri = String(body.dataUri || "");
    const fileName = String(body.fileName || `asset_${Date.now()}.png`).replace(/[^a-zA-Z0-9_.-]/g, "_");
    const bucket = String(body.bucket || "products").replace(/[^a-zA-Z0-9_-]/g, "");
    const objectPath = String(body.objectPath || fileName).replace(/^\/+/, "");
    const upsert = body.upsert === true;
    if (!dataUri.startsWith("data:image/")) {
      return send(res, 400, { error: "Invalid image format. Expected base64 data URI." });
    }
    const matches = dataUri.match(/^data:image\/([a-zA-Z+]+);base64,(.+)$/);
    if (!matches) {
      return send(res, 400, { error: "Malformed image data URI." });
    }
    const buffer = Buffer.from(matches[2], "base64");
    if (buffer.length > 10 * 1024 * 1024) {
      return send(res, 400, { error: "Image exceeds 10MB limit." });
    }
    const contentType = matches[1] === "jpeg" ? "image/jpeg" : `image/${matches[1]}`;
    const { error: storageError } = await supabase.storage.from(bucket).upload(objectPath, buffer, {
      contentType,
      upsert,
      cacheControl: "3600"
    });
    if (!storageError) {
      const { data: publicData } = supabase.storage.from(bucket).getPublicUrl(objectPath);
      const supabaseUrl = publicData.publicUrl || `${String(process.env.SUPABASE_URL || "").replace(/\/$/, "")}/storage/v1/object/public/${bucket}/${objectPath}`;
      return send(res, 200, {
        url: supabaseUrl,
        size: buffer.length,
        name: objectPath,
        bucket,
        source: "supabase"
      });
    }
    console.warn("[AdminUpload] Supabase storage upload failed:", storageError.message);
    const publicUploads = resolve7(process.cwd(), "public", "uploads");
    if (!existsSync6(publicUploads)) mkdirSync6(publicUploads, { recursive: true });
    const finalName = `upload_${Date.now()}_${fileName}`;
    writeFileSync6(resolve7(publicUploads, finalName), buffer);
    return send(res, 200, {
      url: `/uploads/${finalName}`,
      size: buffer.length,
      name: finalName,
      source: "local",
      warning: storageError.message
    });
  }
  if (req.method === "GET" && url === "/api/admin/audit") {
    return send(res, 200, { logs: getAuditLogs(100) });
  }
  if (req.method === "GET" && url === "/api/admin/settings") {
    return send(res, 200, { settings: readSettings() });
  }
  if (req.method === "PUT" && url === "/api/admin/settings") {
    const current = readSettings();
    const updated = writeSettings({
      whatsapp: {
        ...current.whatsapp,
        ...body.whatsapp || body
      }
    });
    logAdminAction({
      adminId: admin.id,
      adminName: admin.name,
      action: "update_settings",
      targetType: "settings",
      targetId: "whatsapp",
      details: { businessPhone: updated.whatsapp.businessPhone }
    });
    return send(res, 200, { ok: true, settings: updated, message: "Settings saved successfully." });
  }
  if (req.method === "GET" && url === "/api/admin/custom-requests") {
    return send(res, 200, { requests: await listAllCustomRequests() });
  }
  const reqMatch = url.match(/^\/api\/admin\/custom-requests\/([^/]+)$/);
  if (reqMatch) {
    const reqId = reqMatch[1];
    if (req.method === "PUT") {
      let quoteAmount;
      if (body.quoteAmount === null || body.quoteAmount === "") quoteAmount = null;
      else if (typeof body.quoteAmount === "number") quoteAmount = body.quoteAmount;
      else if (typeof body.quoteAmount === "string" && body.quoteAmount.trim()) {
        const n = Number(body.quoteAmount);
        quoteAmount = Number.isFinite(n) ? n : null;
      }
      const updated = await updateCustomRequestStatus(reqId, {
        status: body.status,
        adminNotes: typeof body.adminNotes === "string" ? body.adminNotes : void 0,
        quoteAmount
      });
      if (!updated) return send(res, 404, { error: "Custom request not found." });
      logAdminAction({
        adminId: admin.id,
        adminName: admin.name,
        action: "update_custom_request",
        targetType: "custom_request",
        targetId: reqId,
        details: { status: updated.status }
      });
      return send(res, 200, { ok: true, request: updated, message: "Request status updated." });
    }
  }
  return send(res, 404, { error: "Admin API route not found." });
}

// server/auth-middleware.ts
import bcrypt4 from "bcryptjs";
import jwt2 from "jsonwebtoken";

// server/razorpay.ts
import { createHmac, timingSafeEqual as timingSafeEqual2 } from "node:crypto";
function razorpayConfigFrom(env) {
  const keyId = (env.RAZORPAY_KEY_ID || "").trim();
  const keySecret = (env.RAZORPAY_KEY_SECRET || "").trim();
  if (!keyId || !keySecret || keyId.includes("yourKeyId") || keySecret.includes("yourKeySecret")) {
    return {
      ok: false,
      error: "Razorpay test keys are not configured. Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET from the Razorpay Dashboard (Test Mode) to a local .env file."
    };
  }
  if (keyId.startsWith("rzp_live_")) {
    return {
      ok: false,
      error: "Live Razorpay keys are blocked. This project only accepts rzp_test_ keys until live payments are approved."
    };
  }
  if (!keyId.startsWith("rzp_test_")) {
    return {
      ok: false,
      error: "Only Razorpay Test Mode key IDs (rzp_test_\u2026) are allowed."
    };
  }
  return { ok: true, config: { keyId, keySecret } };
}
function verifyRazorpaySignature(secret, payload) {
  const expected = createHmac("sha256", secret).update(`${payload.orderId}|${payload.paymentId}`).digest("hex");
  const left = Buffer.from(expected);
  const right = Buffer.from(payload.signature);
  return left.length === right.length && timingSafeEqual2(left, right);
}
async function createRazorpayOrder(config, input) {
  const auth = Buffer.from(`${config.keyId}:${config.keySecret}`).toString("base64");
  const response = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      amount: input.amountPaise,
      currency: "INR",
      receipt: input.receipt.slice(0, 40),
      notes: input.notes || {}
    })
  });
  const data = await response.json();
  if (!response.ok || !data.id) {
    throw new Error(data.error?.description || "Razorpay could not create a test order.");
  }
  return data;
}

// server/auth-middleware.ts
var COOKIE = "ck_session";
function requiredAuthSecret() {
  const secret = process.env.COUCHKRAFT_AUTH_SECRET?.trim();
  if (!secret) {
    throw new Error("COUCHKRAFT_AUTH_SECRET is required for customer session authentication.");
  }
  return secret;
}
var SECRET = requiredAuthSecret();
async function readRawBuffer(req, maxBytes = 5 * 1024 * 1024) {
  if (Buffer.isBuffer(req.body)) return req.body;
  const chunks = [];
  let total = 0;
  for await (const chunk of req) {
    const buf = Buffer.from(chunk);
    total += buf.length;
    if (total > maxBytes) throw new Error("BODY_TOO_LARGE");
    chunks.push(buf);
  }
  return chunks.length ? Buffer.concat(chunks) : Buffer.alloc(0);
}
async function readBody(req) {
  if (req.body && typeof req.body === "object" && !Buffer.isBuffer(req.body)) {
    return req.body;
  }
  const chunks = [];
  for await (const chunk of req) chunks.push(Buffer.from(chunk));
  if (!chunks.length) return {};
  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw) return {};
  return JSON.parse(raw);
}
function text(body, key) {
  return typeof body[key] === "string" ? body[key] : "";
}
function send2(res, status, data) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(data));
  return true;
}
function parseCookies2(header) {
  const out = {};
  if (!header) return out;
  for (const part of header.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key) out[key] = decodeURIComponent(rest.join("="));
  }
  return out;
}
function cookieFlags2() {
  return process.env.VERCEL ? "HttpOnly; Path=/; SameSite=Lax; Secure" : "HttpOnly; Path=/; SameSite=Lax";
}
function setSession(res, customerId) {
  const token = jwt2.sign({ sub: customerId }, SECRET, { expiresIn: "7d" });
  res.setHeader(
    "Set-Cookie",
    `${COOKIE}=${token}; ${cookieFlags2()}; Max-Age=${60 * 60 * 24 * 7}`
  );
}
function clearSession(res) {
  res.setHeader("Set-Cookie", `${COOKIE}=; ${cookieFlags2()}; Max-Age=0`);
}
async function currentUser(req) {
  const token = parseCookies2(req.headers.cookie)[COOKIE];
  if (!token) return null;
  try {
    const payload = jwt2.verify(token, SECRET);
    return await findById(payload.sub);
  } catch {
    return null;
  }
}
function emailOk(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}
function passwordOk(value) {
  return value.length >= 8;
}
function phoneOk(value) {
  if (!value) return true;
  return /^[0-9+\-\s]{8,16}$/.test(value);
}
function parseAddress(body) {
  const label = text(body, "label").trim() || "Home";
  const line1 = text(body, "line1").trim();
  const city = text(body, "city").trim();
  const region = text(body, "region").trim();
  const postalCode = text(body, "postalCode").trim();
  const country = text(body, "country").trim() || "India";
  if (!line1 || !city || !region || !postalCode) {
    return { error: "Address, city, region and postal code are required." };
  }
  return { label, line1, line2: text(body, "line2").trim(), city, region, postalCode, country };
}
function originFrom(req) {
  const forwarded = req.headers["x-forwarded-proto"];
  const proto = (typeof forwarded === "string" ? forwarded.split(",")[0] : "http").trim() || "http";
  const host = req.headers.host || "localhost:5173";
  return `${proto}://${host}`;
}
function demoLoginEnabled(env) {
  return env.COUCHKRAFT_DEMO_LOGIN_ENABLED === "true" || env.VERCEL_ENV === "preview" || env.NODE_ENV !== "production";
}
var checkoutLocks = /* @__PURE__ */ new Set();
function parseCartItems(body) {
  const rawItems = Array.isArray(body.items) ? body.items : [];
  return rawItems.flatMap((line) => {
    if (!line || typeof line !== "object") return [];
    const row = line;
    if (!row.productId) return [];
    return [{
      productId: row.productId,
      quantity: Number(row.quantity) || 0,
      finish: row.finish,
      customization: row.customization || void 0
    }];
  });
}
function requestApiPath(req) {
  const forwarded = req.headers["x-forwarded-uri"];
  if (typeof forwarded === "string" && forwarded.includes("/api/")) {
    return forwarded.split("?")[0];
  }
  const fromQuery = req.query?.__ck;
  if (typeof fromQuery === "string" && fromQuery.startsWith("/api")) return fromQuery.split("?")[0];
  const search = req.url?.includes("?") ? new URL(req.url, "http://localhost").searchParams.get("__ck") : null;
  if (search?.startsWith("/api")) return search.split("?")[0];
  return req.url?.split("?")[0] ?? "";
}
async function handleCouchkraftApi(req, res, runtimeEnv = process.env) {
  const raw = requestApiPath(req);
  const url = raw.startsWith("/api/") || raw === "/api" ? raw : `/api${raw.startsWith("/") ? raw : `/${raw}`}`;
  if (!url.startsWith("/api/auth") && !url.startsWith("/api/orders") && !url.startsWith("/api/addresses") && !url.startsWith("/api/checkout") && !url.startsWith("/api/cart") && !url.startsWith("/api/admin") && !url.startsWith("/api/products") && !url.startsWith("/api/banners") && !url.startsWith("/api/coupons") && !url.startsWith("/api/account") && !url.startsWith("/api/settings") && !url.startsWith("/api/custom-requests") && !url.startsWith("/api/health")) {
    return false;
  }
  try {
    if (req.method === "GET" && url === "/api/health") {
      const missing = [];
      if (!runtimeEnv.SUPABASE_URL?.trim()) missing.push("SUPABASE_URL");
      if (!runtimeEnv.SUPABASE_SERVICE_ROLE_KEY?.trim()) missing.push("SUPABASE_SERVICE_ROLE_KEY");
      if (!runtimeEnv.COUCHKRAFT_AUTH_SECRET?.trim()) missing.push("COUCHKRAFT_AUTH_SECRET");
      let dbOk = false;
      let dbError = "";
      if (missing.length === 0) {
        try {
          const { error } = await supabase.from("products").select("id").limit(1);
          dbOk = !error;
          if (error) dbError = error.message;
        } catch (err) {
          dbError = err instanceof Error ? err.message : "Database check failed";
        }
      }
      const ok = missing.length === 0 && dbOk;
      return send2(res, ok ? 200 : 503, {
        ok,
        missing,
        dbOk,
        dbError: dbError || void 0,
        vercel: Boolean(runtimeEnv.VERCEL)
      });
    }
    if (req.method === "GET" && url === "/api/settings/public") {
      const settings = await fetchLiveSettings();
      return send2(res, 200, {
        whatsapp: {
          businessPhone: settings.whatsapp?.businessPhone || "",
          businessName: settings.whatsapp?.businessName || "CouchKraft Bespoke Concierge",
          enabled: settings.whatsapp?.enabled ?? true,
          leadTimeWeeks: settings.whatsapp?.defaultLeadTimeWeeks || 4
        }
      });
    }
    if (req.method === "POST" && url === "/api/custom-requests/upload") {
      const user = await currentUser(req);
      if (!user) {
        return send2(res, 401, { error: "Please sign in to upload reference photos." });
      }
      const contentType = String(req.headers["content-type"] || "").split(";")[0].trim().toLowerCase();
      if (!contentType.startsWith("image/")) {
        return send2(res, 400, { error: "Please upload an image file (JPG, PNG, or WebP)." });
      }
      let buffer;
      try {
        buffer = await readRawBuffer(req, 5 * 1024 * 1024);
      } catch {
        return send2(res, 413, { error: "Image exceeds 5 MB limit." });
      }
      if (!buffer.length) {
        return send2(res, 400, { error: "Empty upload." });
      }
      const headerName = String(req.headers["x-file-name"] || "reference");
      let fileName = "reference";
      try {
        fileName = decodeURIComponent(headerName).replace(/[^a-zA-Z0-9_.-]/g, "_").slice(0, 80) || "reference";
      } catch {
        fileName = "reference";
      }
      const extFromType = contentType.replace("image/", "").replace("jpeg", "jpg");
      const ext = fileName.includes(".") ? fileName.split(".").pop() : extFromType;
      const objectPath = customRequestObjectPath(user.id, fileName, ext);
      const uploaded = await uploadPublicImage("custom-requests", objectPath, buffer, contentType);
      return send2(res, 200, {
        url: uploaded.url,
        source: uploaded.source,
        warning: uploaded.warning
      });
    }
    if (req.method === "POST" && url === "/api/custom-requests") {
      const user = await currentUser(req);
      if (!user) {
        return send2(res, 401, { error: "Please sign in to submit a custom request." });
      }
      const body = await readBody(req);
      const customerName = text(body, "customerName").trim() || text(body, "name").trim();
      const customerPhone = text(body, "customerPhone").trim() || text(body, "phone").trim();
      if (!customerPhone) {
        return send2(res, 400, { error: "Please enter your phone number so we can follow up." });
      }
      const referenceImages = Array.isArray(body.referenceImages) ? body.referenceImages.filter(
        (v) => typeof v === "string" && isAllowedReferenceImageUrl(v)
      ) : [];
      const created = await createCustomRequest({
        customerId: user ? user.id : null,
        customerName: customerName || (user ? user.name : "Bespoke Client"),
        customerEmail: text(body, "customerEmail").trim() || text(body, "email").trim() || (user ? user.email : ""),
        customerPhone,
        productId: text(body, "productId"),
        productName: text(body, "productName"),
        productUrl: text(body, "productUrl"),
        seatingCapacity: text(body, "seatingCapacity"),
        dimensions: typeof body.dimensions === "object" ? body.dimensions : void 0,
        material: text(body, "material"),
        fabric: text(body, "fabric"),
        color: text(body, "color"),
        budget: text(body, "budget"),
        notes: text(body, "notes"),
        referenceImages
      });
      return send2(res, 201, { ok: true, request: created, message: "Your custom quote request was saved." });
    }
    if (url.startsWith("/api/admin")) {
      const body = req.method !== "GET" && req.method !== "HEAD" ? await readBody(req) : {};
      return await handleAdminApi(req, res, url, body);
    }
    if (req.method === "GET" && url === "/api/products") {
      return send2(res, 200, { products: await readProducts() });
    }
    if (req.method === "GET" && url === "/api/banners") {
      return send2(res, 200, { banners: readBanners() });
    }
    if (req.method === "GET" && url === "/api/coupons") {
      const { data, error } = await supabase.from("coupons").select("id, code, type, value, min_order_value, max_discount, start_date, end_date, active, description").eq("active", true);
      if (error) {
        console.error("[CouponApi] Supabase read error:", error.message);
        return send2(res, 502, { error: "Coupons are temporarily unavailable." });
      }
      return send2(res, 200, { coupons: data ?? [] });
    }
    if (req.method === "GET" && url === "/api/auth/me") {
      const user = await currentUser(req);
      return send2(res, 200, { user: user ? publicCustomer(user) : null });
    }
    if (req.method === "PUT" && url === "/api/auth/profile") {
      const user = await currentUser(req);
      if (!user) return send2(res, 401, { error: "Please sign in." });
      const body = await readBody(req);
      const name = text(body, "name").trim();
      const email = text(body, "email").trim();
      const phone = text(body, "phone").trim();
      if (name.length < 2) return send2(res, 400, { error: "Please enter your full name." });
      if (!emailOk(email)) return send2(res, 400, { error: "Enter a valid email address." });
      if (!phoneOk(phone)) return send2(res, 400, { error: "Enter a valid phone number, or leave it blank." });
      const updated = await updateProfile(user, { name, email, phone });
      if ("error" in updated) return send2(res, 409, { error: "An account with this email already exists." });
      return send2(res, 200, { user: publicCustomer(updated.customer) });
    }
    if (req.method === "POST" && url === "/api/auth/register") {
      const body = await readBody(req);
      const name = text(body, "name").trim();
      const email = text(body, "email").trim();
      const phone = text(body, "phone").trim();
      const password = text(body, "password");
      const confirm = text(body, "confirmPassword");
      if (name.length < 2) return send2(res, 400, { error: "Please enter your full name." });
      if (!emailOk(email)) return send2(res, 400, { error: "Enter a valid email address." });
      if (!phoneOk(phone)) return send2(res, 400, { error: "Enter a valid phone number, or leave it blank." });
      if (!passwordOk(password)) return send2(res, 400, { error: "Password must be at least 8 characters." });
      if (password !== confirm) return send2(res, 400, { error: "Passwords do not match." });
      const created = await createCustomer({ name, email, phone, password });
      if ("error" in created) return send2(res, 409, { error: "An account with this email already exists." });
      const welcomeCoupon = createWelcomeCoupon(created.customer.id, created.customer.name, created.customer.email);
      const otpSend = await sendEmailOtp(email);
      if (!otpSend.ok) console.warn("[Register OTP Send Notice]:", otpSend.error);
      return send2(res, 201, {
        ok: true,
        welcomeCoupon: welcomeCoupon ? {
          code: welcomeCoupon.code,
          description: welcomeCoupon.description,
          value: welcomeCoupon.value,
          type: welcomeCoupon.type
        } : null,
        message: otpSend.ok ? "Account created! A 6-digit verification code has been dispatched to your email." : "Account created! If you do not receive a verification code shortly, click Resend."
      });
    }
    if (req.method === "POST" && url === "/api/auth/demo-login") {
      if (!demoLoginEnabled(runtimeEnv)) {
        return send2(res, 404, { error: "Demo sign-in is not enabled in this environment." });
      }
      const demoEmail = "asha.auth@example.com";
      const customer = await findByEmail(demoEmail);
      if (!customer) {
        return send2(res, 404, { error: "Demo customer account is not configured in Supabase." });
      }
      setSession(res, customer.id);
      return send2(res, 200, {
        ok: true,
        user: publicCustomer(customer),
        message: "Signed in as Demo Client (Asha Rao)."
      });
    }
    if (req.method === "POST" && url === "/api/auth/login") {
      const body = await readBody(req);
      const email = text(body, "email").trim();
      const password = text(body, "password");
      if (!emailOk(email) || !password) return send2(res, 400, { error: "Enter your email and password." });
      const customer = await findByEmail(email);
      const hash = customer?.passwordHash || "$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy";
      const ok = await bcrypt4.compare(password, hash);
      if (!customer || !ok) return send2(res, 401, { error: "Email or password is incorrect." });
      if (!customer.emailVerified) {
        return send2(res, 403, {
          error: "Please verify your email before signing in.",
          needsVerification: true
        });
      }
      setSession(res, customer.id);
      return send2(res, 200, { user: publicCustomer(customer) });
    }
    if (req.method === "POST" && url === "/api/auth/logout") {
      clearSession(res);
      return send2(res, 200, { ok: true });
    }
    if (req.method === "POST" && url === "/api/auth/forgot") {
      const body = await readBody(req);
      const email = text(body, "email").trim();
      if (!emailOk(email)) return send2(res, 400, { error: "Enter a valid email address." });
      const customer = await findByEmail(email);
      if (customer && customer.emailVerified) {
        await issueResetToken(customer);
        await sendPasswordResetEmail(email, `${originFrom(req)}/account/reset`);
      }
      return send2(res, 200, {
        ok: true,
        message: "If an account exists for this email, password reset instructions have been sent."
      });
    }
    if (req.method === "POST" && url === "/api/auth/resend-verification") {
      const body = await readBody(req);
      const email = text(body, "email").trim();
      if (!emailOk(email)) return send2(res, 400, { error: "Enter a valid email address." });
      const customer = await findByEmail(email);
      if (!customer) {
        return send2(res, 200, { message: "If this email needs verification, a new code has been issued." });
      }
      const otpSend = await sendEmailOtp(email);
      if (!otpSend.ok) {
        return send2(res, 400, { error: otpSend.error || "Failed to dispatch verification email. Please try again in a moment." });
      }
      return send2(res, 200, {
        ok: true,
        message: "A fresh 6-digit verification code has been dispatched to your email inbox."
      });
    }
    if (req.method === "POST" && url === "/api/auth/verify-otp") {
      const body = await readBody(req);
      const email = text(body, "email").trim();
      const otp = (text(body, "otp") || text(body, "code")).trim();
      if (!email || !otp) {
        return send2(res, 400, { error: "Please enter your email and verification code." });
      }
      const customer = await findByEmail(email);
      if (!customer) {
        return send2(res, 404, { error: "No account found for this email address." });
      }
      const isDemoAccount = email.toLowerCase() === "asha.auth@example.com";
      if (isDemoAccount && otp === "1234") {
        customer.emailVerified = true;
        customer.verifyTokenHash = null;
        customer.verifyExpires = null;
        await saveCustomer(customer);
        setSession(res, customer.id);
        return send2(res, 200, {
          ok: true,
          message: "Demo client verified successfully.",
          user: publicCustomer(customer)
        });
      }
      if (otp === "1234") {
        return send2(res, 400, {
          error: "Fixed demo OTP is only allowed for the demo account. Please check your inbox for your real verification code."
        });
      }
      const verifyResult = await verifyEmailOtp(email, otp);
      if (!verifyResult.ok) {
        return send2(res, 400, {
          error: verifyResult.error || "Invalid or expired verification code. Please check your email or click Resend code."
        });
      }
      customer.emailVerified = true;
      customer.verifyTokenHash = null;
      customer.verifyExpires = null;
      await saveCustomer(customer);
      setSession(res, customer.id);
      return send2(res, 200, {
        ok: true,
        message: "Email successfully verified.",
        user: publicCustomer(customer)
      });
    }
    if (req.method === "POST" && url === "/api/auth/verify") {
      const body = await readBody(req);
      const token = text(body, "token");
      const customer = await findByVerifyToken(token);
      if (!customer || !customer.verifyExpires || customer.verifyExpires < Date.now()) {
        return send2(res, 400, { error: "This verification link is invalid or has expired." });
      }
      await saveCustomer({
        ...customer,
        emailVerified: true,
        verifyTokenHash: null,
        verifyExpires: null
      });
      return send2(res, 200, { message: "Email verified. You can sign in now." });
    }
    if (req.method === "GET" && url === "/api/addresses") {
      const user = await currentUser(req);
      if (!user) return send2(res, 401, { error: "Please sign in." });
      return send2(res, 200, { addresses: user.addresses });
    }
    if (req.method === "POST" && url === "/api/addresses") {
      const user = await currentUser(req);
      if (!user) return send2(res, 401, { error: "Please sign in." });
      const parsed = parseAddress(await readBody(req));
      if ("error" in parsed) return send2(res, 400, { error: parsed.error });
      return send2(res, 201, { address: await await addAddress(user, parsed) });
    }
    const addressMatch = url.match(/^\/api\/addresses\/([^/]+)$/);
    if (addressMatch && req.method === "PUT") {
      const user = await currentUser(req);
      if (!user) return send2(res, 401, { error: "Please sign in." });
      const parsed = parseAddress(await readBody(req));
      if ("error" in parsed) return send2(res, 400, { error: parsed.error });
      const address = await await updateAddress(user, addressMatch[1], parsed);
      if (!address) return send2(res, 404, { error: "Address not found." });
      return send2(res, 200, { address });
    }
    if (addressMatch && req.method === "DELETE") {
      const user = await currentUser(req);
      if (!user) return send2(res, 401, { error: "Please sign in." });
      if (!await await removeAddress(user, addressMatch[1])) return send2(res, 404, { error: "Address not found." });
      return send2(res, 200, { ok: true });
    }
    if (req.method === "GET" && url === "/api/orders") {
      const user = await currentUser(req);
      if (!user) return send2(res, 401, { error: "Please sign in." });
      return send2(res, 200, { orders: await listOrdersForCustomer(user.id) });
    }
    if (req.method === "POST" && url === "/api/cart/validate") {
      const body = await readBody(req);
      const items = parseCartItems(body);
      if (!items.length) return send2(res, 400, { error: "Your bag is empty." });
      const result = await validateCartLines(items);
      return send2(res, result.ok ? 200 : 409, {
        ok: result.ok,
        issues: result.issues,
        message: result.ok ? null : result.issues[0]?.reason === "insufficient_stock" ? `Only ${result.issues[0].available} left for "${result.issues[0].productName}".` : result.issues[0]?.reason === "out_of_stock" ? `"${result.issues[0].productName}" is out of stock.` : "Some items in your bag are no longer available."
      });
    }
    if (req.method === "GET" && url === "/api/checkout/config") {
      const keys = razorpayConfigFrom(runtimeEnv);
      const upiVpa = runtimeEnv.COUCHKRAFT_UPI_VPA?.trim() || "couchkraft.demo@oksbi";
      const payeeName = runtimeEnv.COUCHKRAFT_UPI_PAYEE_NAME?.trim() || "CouchKraft";
      return send2(res, 200, {
        configured: true,
        gateway: keys.ok ? "razorpay" : "demo",
        mode: keys.ok ? "test" : "demo",
        keyId: keys.ok ? keys.config.keyId : null,
        upiVpa,
        payeeName,
        error: null
      });
    }
    if (req.method === "POST" && url === "/api/checkout/session") {
      const user = await currentUser(req);
      if (!user) return send2(res, 401, { error: "Please sign in to continue to payment." });
      const keys = razorpayConfigFrom(runtimeEnv);
      if (checkoutLocks.has(user.id)) {
        return send2(res, 409, { error: "A payment attempt is already in progress. Please wait a moment." });
      }
      checkoutLocks.add(user.id);
      try {
        const body = await readBody(req);
        const addressId = text(body, "addressId");
        const ownedAddress = addressId ? user.addresses.find((entry) => entry.id === addressId) ?? null : null;
        if (addressId && !ownedAddress) return send2(res, 400, { error: "Choose a saved address that belongs to you." });
        let address = ownedAddress;
        if (!address) {
          const parsedAddress = parseAddress(body);
          if ("error" in parsedAddress) return send2(res, 400, { error: parsedAddress.error });
          address = { ...parsedAddress, id: "checkout" };
        }
        const items = parseCartItems(body);
        const coupon = text(body, "coupon") || null;
        const phone = text(body, "phone").trim() || user.phone;
        if (!phoneOk(phone) || !phone) return send2(res, 400, { error: "Enter a valid phone number for this order." });
        const contact = {
          name: text(body, "name").trim() || user.name,
          email: user.email,
          phone
        };
        const fingerprint = cartFingerprint(items, coupon, `${address.line1}|${address.city}|${address.postalCode}`);
        const checkoutKey = `${user.id}:${fingerprint}`;
        let order = await findReusableCheckoutOrder(user.id, checkoutKey);
        if (!order) {
          const created = await createOrderFromCart(user.id, {
            items,
            address,
            coupon,
            contact,
            paymentStatus: "pending",
            cartFingerprint: checkoutKey
          });
          if ("error" in created) {
            const fail = created;
            if (fail.error === "insufficient_stock") {
              return send2(res, 409, {
                error: fail.message || "Not enough stock.",
                code: "insufficient_stock",
                productId: fail.productId,
                productName: fail.productName,
                availableStock: fail.availableStock,
                requestedQuantity: fail.requestedQuantity,
                issues: fail.issues
              });
            }
            return send2(res, 400, { error: fail.message || "Your bag has no valid pieces to order." });
          }
          order = created.order;
        }
        if (order.paymentStatus === "paid") {
          return send2(res, 200, { order, alreadyPaid: true, gateway: keys.ok ? "razorpay" : "demo" });
        }
        const demoRazorpayId = `order_demo_${order.id}`;
        if (keys.ok) {
          if (!order.razorpayOrderId || order.razorpayOrderId.startsWith("order_demo_")) {
            const razorpayOrder = await createRazorpayOrder(keys.config, {
              amountPaise: order.amountPaise,
              receipt: order.number,
              notes: { couchkraftOrderId: order.id, customerId: user.id }
            });
            order = await attachRazorpayOrder(order.id, user.id, razorpayOrder.id) || order;
          }
        } else if (!order.razorpayOrderId || !order.razorpayOrderId.startsWith("order_demo_")) {
          order = await attachRazorpayOrder(order.id, user.id, demoRazorpayId) || order;
        } else if (order.paymentStatus === "failed") {
          order = await attachRazorpayOrder(order.id, user.id, demoRazorpayId) || order;
        }
        return send2(res, 200, {
          gateway: keys.ok ? "razorpay" : "demo",
          keyId: keys.ok ? keys.config.keyId : null,
          razorpayOrderId: order.razorpayOrderId,
          amount: order.amountPaise,
          currency: "INR",
          order
        });
      } catch (error) {
        return send2(res, 502, {
          error: error instanceof Error ? error.message : "Payment could not be started. Please retry."
        });
      } finally {
        checkoutLocks.delete(user.id);
      }
    }
    if (req.method === "POST" && url === "/api/checkout/demo") {
      const user = await currentUser(req);
      if (!user) return send2(res, 401, { error: "Please sign in." });
      const body = await readBody(req);
      const orderId = text(body, "orderId");
      const method = text(body, "method");
      const action = text(body, "action") || "success";
      const methods = ["card", "cash", "upi", "netbanking"];
      if (!methods.includes(method)) {
        return send2(res, 400, { error: "Choose card, cash, UPI or net banking." });
      }
      const existing = await getOrderForCustomer(user.id, orderId);
      if (!existing) return send2(res, 404, { error: "Order not found." });
      if (!existing.razorpayOrderId) {
        return send2(res, 400, { error: "Payment was not started for this order. Close and tap Continue to payment again." });
      }
      if (action === "fail") {
        const order = await markOrderPaymentFailed(orderId, user.id, "Demo payment failed.");
        return send2(res, 200, { order, failed: true });
      }
      const labels = {
        card: "Card",
        upi: "UPI",
        netbanking: "Net banking",
        cash: "Cash on delivery"
      };
      if (method === "cash") {
        const result2 = await markCashOnDelivery(user.id, {
          orderId,
          razorpayOrderId: existing.razorpayOrderId
        });
        if ("error" in result2) return send2(res, 400, { error: "This payment does not match the order on your account." });
        tryRedeemOrderCoupon(user.id, result2.order.coupon);
        await markCustomRequestPaidFromOrder(result2.order);
        return send2(res, 200, { order: result2.order });
      }
      const result = await markOrderPaid(user.id, {
        orderId,
        razorpayOrderId: existing.razorpayOrderId,
        razorpayPaymentId: `pay_demo_${existing.id}`,
        paymentMethod: method,
        deliveryMethod: labels[method]
      });
      if ("error" in result) return send2(res, 400, { error: "This payment does not match the order on your account." });
      tryRedeemOrderCoupon(user.id, result.order.coupon);
      await markCustomRequestPaidFromOrder(result.order);
      return send2(res, 200, { order: result.order });
    }
    if (req.method === "POST" && url === "/api/checkout/verify") {
      const user = await currentUser(req);
      if (!user) return send2(res, 401, { error: "Please sign in." });
      const keys = razorpayConfigFrom(runtimeEnv);
      if (!keys.ok) return send2(res, 400, { error: "Use the demo gateway until Razorpay test keys are added." });
      const body = await readBody(req);
      const orderId = text(body, "orderId");
      const razorpayOrderId = text(body, "razorpay_order_id");
      const razorpayPaymentId = text(body, "razorpay_payment_id");
      const signature = text(body, "razorpay_signature");
      if (!orderId || !razorpayOrderId || !razorpayPaymentId || !signature) {
        return send2(res, 400, { error: "Payment details are incomplete." });
      }
      const valid = verifyRazorpaySignature(keys.config.keySecret, {
        orderId: razorpayOrderId,
        paymentId: razorpayPaymentId,
        signature
      });
      if (!valid) {
        await markOrderPaymentFailed(orderId, user.id, "Payment signature could not be verified.");
        return send2(res, 400, { error: "Payment could not be verified. This order has not been marked as paid." });
      }
      const result = await markOrderPaid(user.id, { orderId, razorpayOrderId, razorpayPaymentId });
      if ("error" in result) {
        return send2(res, result.error === "missing" ? 404 : 400, {
          error: result.error === "missing" ? "Order not found." : "This payment does not match the order on your account."
        });
      }
      tryRedeemOrderCoupon(user.id, result.order.coupon);
      await markCustomRequestPaidFromOrder(result.order);
      return send2(res, 200, { order: result.order });
    }
    if (req.method === "GET" && url === "/api/account/custom-requests") {
      const user = await currentUser(req);
      if (!user) return send2(res, 401, { error: "Please sign in." });
      const requests = await listCustomRequestsForCustomer(user.id);
      return send2(res, 200, { requests });
    }
    const customReqMatch = url.match(/^\/api\/account\/custom-requests\/([^/]+)$/);
    if (customReqMatch && req.method === "GET") {
      const user = await currentUser(req);
      if (!user) return send2(res, 401, { error: "Please sign in." });
      const request = await getCustomRequestForCustomer(user.id, customReqMatch[1]);
      if (!request) return send2(res, 404, { error: "Custom request not found." });
      return send2(res, 200, { request });
    }
    const bespokePayMatch = url.match(/^\/api\/account\/custom-requests\/([^/]+)\/payment-session$/);
    if (bespokePayMatch && req.method === "POST") {
      const user = await currentUser(req);
      if (!user) return send2(res, 401, { error: "Please sign in to pay." });
      const keys = razorpayConfigFrom(runtimeEnv);
      const request = await getCustomRequestForCustomer(user.id, bespokePayMatch[1]);
      if (!request) return send2(res, 404, { error: "Custom request not found." });
      if (request.status !== "approved") {
        return send2(res, 400, { error: "Payment is available once your commission is approved." });
      }
      if (request.paymentStatus === "paid") {
        return send2(res, 200, { alreadyPaid: true, request });
      }
      const quoteAmount = Number(request.quoteAmount);
      if (!Number.isFinite(quoteAmount) || quoteAmount < 1) {
        return send2(res, 400, { error: "Our atelier has not published your commission amount yet." });
      }
      const phone = user.phone || request.customerPhone;
      if (!phoneOk(phone)) {
        return send2(res, 400, { error: "Add a phone number on your profile before paying." });
      }
      const address = user.addresses[0] || {
        id: "bespoke",
        label: "Commission",
        line1: "Delivery address to be confirmed",
        line2: "",
        city: "Bengaluru",
        region: "Karnataka",
        postalCode: "560001",
        country: "India"
      };
      const contact = {
        name: user.name,
        email: user.email,
        phone
      };
      const thumb = request.referenceImages?.[0] || request.dimensions?.referenceImages?.[0];
      try {
        const created = await createOrderFromBespokeQuote(user.id, {
          customRequestId: request.id,
          productName: request.productName || "Custom furniture",
          productId: request.productId,
          image: thumb,
          quoteAmount,
          contact,
          address
        });
        if ("error" in created) {
          return send2(res, 400, { error: created.message || "Could not start payment." });
        }
        let order = created.order;
        if (order.paymentStatus === "paid") {
          await markCustomRequestPaidFromOrder(order);
          return send2(res, 200, { order, alreadyPaid: true, gateway: keys.ok ? "razorpay" : "demo" });
        }
        const demoRazorpayId = `order_demo_${order.id}`;
        if (keys.ok) {
          if (!order.razorpayOrderId || order.razorpayOrderId.startsWith("order_demo_")) {
            const razorpayOrder = await createRazorpayOrder(keys.config, {
              amountPaise: order.amountPaise,
              receipt: order.number,
              notes: { couchkraftOrderId: order.id, customerId: user.id, customRequestId: request.id }
            });
            order = await attachRazorpayOrder(order.id, user.id, razorpayOrder.id) || order;
          }
        } else if (!order.razorpayOrderId || !order.razorpayOrderId.startsWith("order_demo_")) {
          order = await attachRazorpayOrder(order.id, user.id, demoRazorpayId) || order;
        }
        return send2(res, 200, {
          gateway: keys.ok ? "razorpay" : "demo",
          keyId: keys.ok ? keys.config.keyId : null,
          razorpayOrderId: order.razorpayOrderId,
          amount: order.amountPaise,
          currency: "INR",
          order
        });
      } catch (error) {
        return send2(res, 502, {
          error: error instanceof Error ? error.message : "Payment could not be started."
        });
      }
    }
    if (req.method === "GET" && url === "/api/account/coupons") {
      const user = await currentUser(req);
      if (!user) return send2(res, 401, { error: "Please sign in." });
      const personal = couponsForCustomer(user.id).map((c) => ({
        id: c.id,
        code: c.code,
        description: c.description,
        type: c.type,
        value: c.value,
        minOrderValue: c.minOrderValue,
        redeemed: Boolean(c.redeemed),
        redeemedAt: c.redeemedAt || null,
        source: c.source || "promo"
      }));
      return send2(res, 200, { coupons: personal });
    }
    if (req.method === "POST" && url === "/api/checkout/fail") {
      const user = await currentUser(req);
      if (!user) return send2(res, 401, { error: "Please sign in." });
      const body = await readBody(req);
      const order = await markOrderPaymentFailed(
        text(body, "orderId"),
        user.id,
        text(body, "reason") || "Payment failed or was cancelled."
      );
      if (!order) return send2(res, 404, { error: "Order not found." });
      return send2(res, 200, { order });
    }
    if (req.method === "POST" && url === "/api/orders") {
      const user = await currentUser(req);
      if (!user) return send2(res, 401, { error: "Please sign in." });
      const body = await readBody(req);
      const addressId = text(body, "addressId");
      const address = addressId ? user.addresses.find((entry) => entry.id === addressId) ?? null : null;
      if (addressId && !address) return send2(res, 400, { error: "Choose a saved address that belongs to you." });
      const items = parseCartItems(body);
      const created = await createOrderFromCart(user.id, {
        items,
        address,
        coupon: text(body, "coupon") || null
      });
      if ("error" in created) return send2(res, 400, { error: created.message || "Your bag has no valid pieces to order." });
      return send2(res, 201, { order: created.order });
    }
    if (req.method === "GET" && url === "/api/orders/lookup") {
      const user = await currentUser(req);
      if (!user) return send2(res, 401, { error: "Please sign in." });
      const number = new URL(req.url || "", "http://localhost").searchParams.get("number") || "";
      const order = await getOrderByNumberForCustomer(user.id, number);
      if (!order) return send2(res, 404, { error: "No matching order was found on this account." });
      return send2(res, 200, { order });
    }
    const orderMatch = url.match(/^\/api\/orders\/([^/]+)$/);
    if (orderMatch && req.method === "GET") {
      const user = await currentUser(req);
      if (!user) return send2(res, 401, { error: "Please sign in." });
      const order = await getOrderForCustomer(user.id, orderMatch[1]);
      if (!order) return send2(res, 404, { error: "Order not found." });
      return send2(res, 200, { order });
    }
    if (req.method === "POST" && url === "/api/auth/reset") {
      const body = await readBody(req);
      const token = text(body, "token");
      const password = text(body, "password");
      const confirm = text(body, "confirmPassword");
      if (!passwordOk(password)) return send2(res, 400, { error: "Password must be at least 8 characters." });
      if (password !== confirm) return send2(res, 400, { error: "Passwords do not match." });
      const customer = await findByResetToken(token);
      if (!customer || !customer.resetExpires || customer.resetExpires < Date.now()) {
        return send2(res, 400, { error: "This reset link is invalid or has expired." });
      }
      await setPassword(customer, password);
      return send2(res, 200, { message: "Password updated. You can sign in now." });
    }
    return send2(res, 404, { error: "Not found." });
  } catch (error) {
    console.error("[Couchkraft API]", url, error);
    const message = error instanceof Error && error.message.trim() ? error.message : "Something went wrong. Please try again.";
    return send2(res, 500, { error: message });
  }
}

// server/vercel-handler.ts
async function handler(req, res) {
  try {
    const handled = await handleCouchkraftApi(req, res);
    if (!handled) {
      res.statusCode = 404;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "Not found." }));
    }
  } catch (error) {
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ error: error instanceof Error ? error.message : "Server error." }));
  }
}
export {
  handler as default
};
