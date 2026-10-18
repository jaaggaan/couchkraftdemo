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
var SUPABASE_URL = process.env.SUPABASE_URL || "https://qzpnxxlwlphxdcdlbiph.supabase.co";
var SUPABASE_KEY = process.env.SUPABASE_KEY || "sb_publishable_BfUf7XGJyrvhltzbKfq5Zg_zf_EFmnw";
var supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

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
import { randomBytes } from "node:crypto";
import { existsSync as existsSync2, mkdirSync as mkdirSync2, readFileSync as readFileSync2, writeFileSync as writeFileSync2 } from "node:fs";
import { resolve as resolve3 } from "node:path";
var dataDir2 = dataDirectory();
var requestsFile = resolve3(dataDir2, "custom_requests.json");
function ensureRequestsFile() {
  if (!existsSync2(dataDir2)) mkdirSync2(dataDir2, { recursive: true });
  if (!existsSync2(requestsFile)) {
    writeFileSync2(requestsFile, JSON.stringify([], null, 2), "utf8");
  }
}
function readCustomRequests() {
  ensureRequestsFile();
  try {
    const raw = readFileSync2(requestsFile, "utf8");
    return JSON.parse(raw);
  } catch {
    return [];
  }
}
function writeCustomRequests(items) {
  ensureRequestsFile();
  writeFileSync2(requestsFile, JSON.stringify(items, null, 2), "utf8");
}
async function createCustomRequest(input) {
  const requests = readCustomRequests();
  const id = `CK-REQ-${Date.now().toString(36).toUpperCase()}-${randomBytes(2).toString("hex").toUpperCase()}`;
  const now = (/* @__PURE__ */ new Date()).toISOString();
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
    dimensions: input.dimensions || {},
    material: input.material || void 0,
    fabric: input.fabric || void 0,
    color: input.color || void 0,
    budget: input.budget || void 0,
    notes: input.notes || void 0,
    status: "new",
    adminNotes: "",
    createdAt: now,
    updatedAt: now
  };
  requests.unshift(newReq);
  writeCustomRequests(requests);
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
      dimensions: newReq.dimensions,
      material: newReq.material,
      fabric: newReq.fabric,
      color: newReq.color,
      budget: newReq.budget,
      notes: newReq.notes,
      status: newReq.status,
      admin_notes: newReq.adminNotes,
      created_at: newReq.createdAt,
      updated_at: newReq.updatedAt
    };
    Promise.resolve(
      supabase.from("custom_requests").insert([dbRow])
    ).then((res) => {
      if (res?.error) console.warn("[Supabase Custom Request Insert Notice]:", res.error.message);
      else console.log(`[Supabase Custom Request Synced]: ${newReq.id}`);
    }).catch((err) => console.warn("[Supabase Custom Request Error]:", err));
  } catch (err) {
    console.warn("[Supabase Custom Request Exception]:", err);
  }
  return newReq;
}
async function updateCustomRequestStatus(id, updates) {
  const requests = readCustomRequests();
  const idx = requests.findIndex((r) => r.id === id);
  if (idx === -1) return null;
  const existing = requests[idx];
  const updated = {
    ...existing,
    ...updates,
    id: existing.id,
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  requests[idx] = updated;
  writeCustomRequests(requests);
  try {
    supabase.from("custom_requests").update({
      status: updated.status,
      admin_notes: updated.adminNotes,
      updated_at: updated.updatedAt
    }).eq("id", id).then(({ error }) => {
      if (error) console.warn("[Supabase Custom Request Update Notice]:", error.message);
    });
  } catch {
  }
  return updated;
}

// server/admin-api-handler.ts
import { existsSync as existsSync5, mkdirSync as mkdirSync5, readFileSync as readFileSync5, writeFileSync as writeFileSync5 } from "node:fs";
import { resolve as resolve6 } from "node:path";
import bcrypt2 from "bcryptjs";

// server/admin-store.ts
import { existsSync as existsSync3, mkdirSync as mkdirSync3, readFileSync as readFileSync3, writeFileSync as writeFileSync3 } from "node:fs";
import { resolve as resolve4 } from "node:path";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
var dataDir3 = dataDirectory();
var adminsPath = resolve4(dataDir3, "admins.json");
var auditPath = resolve4(dataDir3, "admin-audit.json");
var ADMIN_SECRET = process.env.COUCHKRAFT_ADMIN_SECRET || "couchkraft-admin-secure-key-2026";
function ensureStore() {
  if (!existsSync3(dataDir3)) mkdirSync3(dataDir3, { recursive: true });
  if (!existsSync3(adminsPath)) {
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
    writeFileSync3(adminsPath, JSON.stringify(initialAdmins, null, 2), "utf8");
  }
  if (!existsSync3(auditPath)) {
    writeFileSync3(auditPath, "[]", "utf8");
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
    writeFileSync3(auditPath, JSON.stringify(existing.slice(0, 500), null, 2), "utf8");
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
    ready_to_ship_stock: Number(p.readyToShipStock ?? p.ready_to_ship_stock) || 0,
    low_stock_threshold: Number(p.lowStockThreshold ?? p.low_stock_threshold) || 2,
    made_to_order: p.madeToOrder ?? p.made_to_order ?? true,
    lead_time_weeks: Number(p.leadTimeWeeks ?? p.lead_time_weeks) || 3,
    customization_enabled: p.customizationEnabled ?? p.customization_enabled ?? true,
    customization_tolerance_cm: Number(p.customizationToleranceCm ?? p.customization_tolerance_cm) || 15,
    allow_com_upholstery: p.allowComUpholstery ?? p.allow_com_upholstery ?? true,
    meta_title: p.metaTitle ?? p.meta_title ?? `${name} | CouchKraft`,
    meta_description: p.metaDescription ?? p.meta_description ?? (p.shortExcerpt || p.description || "").slice(0, 160),
    status: p.status || "published",
    gst_slab: p.gstSlab ?? p.gst_slab ?? "18% GST (Standard Furniture)",
    hsn_code: p.hsnCode ?? p.hsn_code ?? "9403 6000"
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
import { existsSync as existsSync4, mkdirSync as mkdirSync4, readFileSync as readFileSync4, writeFileSync as writeFileSync4 } from "node:fs";
import { resolve as resolve5 } from "node:path";
var dataDir4 = dataDirectory();
var couponsPath = resolve5(dataDir4, "coupons.json");
var bannersPath = resolve5(dataDir4, "banners.json");
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
  if (!existsSync4(dataDir4)) mkdirSync4(dataDir4, { recursive: true });
  if (!existsSync4(couponsPath)) {
    writeFileSync4(couponsPath, JSON.stringify(initialCoupons, null, 2), "utf8");
  }
  if (!existsSync4(bannersPath)) {
    writeFileSync4(bannersPath, JSON.stringify(initialBanners, null, 2), "utf8");
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
  writeFileSync4(couponsPath, JSON.stringify(coupons, null, 2), "utf8");
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
  writeFileSync4(bannersPath, JSON.stringify(banners, null, 2), "utf8");
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

// server/admin-api-handler.ts
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
function readAllOrders() {
  try {
    const p = resolve6(dataDirectory(), "orders.json");
    if (existsSync5(p)) {
      return JSON.parse(readFileSync5(p, "utf8"));
    }
  } catch {
  }
  return [];
}
function writeAllOrders(orders) {
  const p = resolve6(dataDirectory(), "orders.json");
  writeFileSync5(p, JSON.stringify(orders, null, 2), "utf8");
}
function readAllCustomers() {
  try {
    const p = resolve6(dataDirectory(), "customers.json");
    if (existsSync5(p)) {
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
    const matches = await bcrypt2.compare(password, admin2.passwordHash);
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
    const orders = readAllOrders();
    const customers = readAllCustomers();
    const products2 = await readProducts();
    const todayStr = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
    const todayOrders = orders.filter((o) => o.createdAt && o.createdAt.startsWith(todayStr));
    const todaySales = todayOrders.reduce((sum, o) => sum + (o.paymentStatus === "paid" ? o.total : 0), 0);
    const thisMonthStr = todayStr.slice(0, 7);
    const monthOrders = orders.filter((o) => o.createdAt && o.createdAt.startsWith(thisMonthStr));
    const monthSales = monthOrders.reduce((sum, o) => sum + (o.paymentStatus === "paid" ? o.total : 0), 0);
    const totalRevenue = orders.reduce((sum, o) => sum + (o.paymentStatus === "paid" ? o.total : 0), 0);
    const pendingOrders = orders.filter((o) => o.fulfilmentStatus !== "delivered").length;
    const deliveredOrders = orders.filter((o) => o.fulfilmentStatus === "delivered").length;
    const lowStockProducts = products2.filter((p) => p.readyToShipStock <= p.lowStockThreshold);
    return send(res, 200, {
      todaySales,
      todayOrdersCount: todayOrders.length,
      monthlySales: monthSales,
      totalRevenue,
      totalOrders: orders.length,
      pendingOrders,
      deliveredOrders,
      customerCount: customers.length,
      totalProducts: products2.length,
      lowStockCount: lowStockProducts.length,
      lowStockProducts: lowStockProducts.slice(0, 5),
      pendingEnquiriesCount: 3,
      // Customization inquiries telemetry
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
    const orders = readAllOrders();
    return send(res, 200, { orders });
  }
  const orderStatusMatch = url.match(/^\/api\/admin\/orders\/([^/]+)\/status$/);
  if (orderStatusMatch && req.method === "PUT") {
    const orderId = orderStatusMatch[1];
    const orders = readAllOrders();
    const idx = orders.findIndex((o) => o.id === orderId || o.number === orderId);
    if (idx === -1) return send(res, 404, { error: "Order not found." });
    const fulfilmentStatus = String(body.fulfilmentStatus || orders[idx].fulfilmentStatus);
    const paymentStatus = String(body.paymentStatus || orders[idx].paymentStatus);
    const trackingNumber = body.trackingNumber !== void 0 ? String(body.trackingNumber) : orders[idx].trackingNumber;
    orders[idx] = {
      ...orders[idx],
      fulfilmentStatus,
      paymentStatus,
      trackingNumber
    };
    writeAllOrders(orders);
    logAdminAction({
      adminId: admin.id,
      adminName: admin.name,
      action: "update_order_status",
      targetType: "order",
      targetId: orders[idx].id,
      details: { orderNumber: orders[idx].number, fulfilmentStatus, paymentStatus }
    });
    return send(res, 200, { order: orders[idx], message: "Order status updated." });
  }
  if (req.method === "GET" && url === "/api/admin/customers") {
    const customers = readAllCustomers();
    const orders = readAllOrders();
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
    const publicUploads = resolve6(process.cwd(), "public", "uploads");
    if (!existsSync5(publicUploads)) mkdirSync5(publicUploads, { recursive: true });
    const finalName = `upload_${Date.now()}_${fileName}`;
    writeFileSync5(resolve6(publicUploads, finalName), buffer);
    return send(res, 200, {
      url: `/uploads/${finalName}`,
      size: buffer.length,
      name: finalName
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
    return send(res, 200, { requests: readCustomRequests() });
  }
  const reqMatch = url.match(/^\/api\/admin\/custom-requests\/([^/]+)$/);
  if (reqMatch) {
    const reqId = reqMatch[1];
    if (req.method === "PUT") {
      const updated = await updateCustomRequestStatus(reqId, {
        status: body.status,
        adminNotes: typeof body.adminNotes === "string" ? body.adminNotes : void 0
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
import { createHmac as createHmac2 } from "node:crypto";
import bcrypt4 from "bcryptjs";
import jwt2 from "jsonwebtoken";

// server/auth-store.ts
import { createHash, randomBytes as randomBytes2, timingSafeEqual } from "node:crypto";
import bcrypt3 from "bcryptjs";
function hashToken(token) {
  return createHash("sha256").update(token).digest("hex");
}
function newToken() {
  return randomBytes2(32).toString("hex");
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
    id: randomBytes2(12).toString("hex"),
    name: input.name.trim(),
    email,
    phone: input.phone.trim(),
    passwordHash: await bcrypt3.hash(input.password, 12),
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
    passwordHash: await bcrypt3.hash(password, 12),
    resetTokenHash: null,
    resetExpires: null
  });
}
async function addAddress(customer, input) {
  const address = { ...input, id: randomBytes2(8).toString("hex") };
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
import { randomBytes as randomBytes3 } from "node:crypto";
import { existsSync as existsSync6, mkdirSync as mkdirSync6, readFileSync as readFileSync6, writeFileSync as writeFileSync6 } from "node:fs";
import { resolve as resolve7 } from "node:path";

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

// src/data/site.ts
var DEMO_COUPON = {
  code: "WARM10",
  percent: 10
};

// server/order-store.ts
var dataDir5 = dataDirectory();
var storePath = resolve7(dataDir5, "orders.json");
function ensureStore3() {
  if (!existsSync6(dataDir5)) mkdirSync6(dataDir5, { recursive: true });
  if (!existsSync6(storePath)) writeFileSync6(storePath, "[]", "utf8");
}
function readAll() {
  ensureStore3();
  try {
    return JSON.parse(readFileSync6(storePath, "utf8")).map(normaliseOrder);
  } catch {
    return [];
  }
}
function normaliseOrder(order) {
  return {
    ...order,
    contact: order.contact ?? null,
    cartFingerprint: order.cartFingerprint ?? "",
    amountPaise: order.amountPaise ?? Math.round((order.total || 0) * 100),
    razorpayOrderId: order.razorpayOrderId ?? null,
    razorpayPaymentId: order.razorpayPaymentId ?? null,
    paymentError: order.paymentError ?? null,
    paymentMethod: order.paymentMethod ?? null
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
function writeAll(orders) {
  ensureStore3();
  writeFileSync6(storePath, JSON.stringify(orders, null, 2), "utf8");
}
function listOrdersForCustomer(customerId) {
  return readAll().filter((order) => order.customerId === customerId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
function getOrderForCustomer(customerId, orderId) {
  const local = listOrdersForCustomer(customerId).find((order) => order.id === orderId);
  return local ?? null;
}
function getOrderByNumberForCustomer(customerId, number) {
  const cleaned = number.trim().toUpperCase();
  return listOrdersForCustomer(customerId).find(
    (order) => order.number.toUpperCase() === cleaned
  ) ?? null;
}
async function ensureCustomerInSupabase(customerId) {
  if (!customerId || customerId === "guest") return null;
  try {
    const { data: existing } = await supabase.from("customers").select("id").eq("id", customerId).maybeSingle();
    if (existing?.id) return existing.id;
    const localUser = await findById(customerId);
    if (localUser) {
      const { data: inserted, error } = await supabase.from("customers").insert([{
        id: localUser.id,
        name: localUser.name,
        email: localUser.email,
        phone: localUser.phone || "",
        password_hash: localUser.passwordHash || "synced_customer",
        email_verified: localUser.emailVerified ?? true,
        addresses: localUser.addresses || [],
        created_at: localUser.createdAt || (/* @__PURE__ */ new Date()).toISOString()
      }]).select();
      if (!error && inserted?.[0]) return inserted[0].id;
    }
  } catch (err) {
    console.warn("[Supabase Customer Link Warning]:", err);
  }
  return null;
}
async function persistOrderToSupabase(order) {
  try {
    const validCustomerId = await ensureCustomerInSupabase(order.customerId);
    const dbOrder = {
      id: order.id,
      number: order.number,
      customer_id: validCustomerId,
      items: order.items,
      address: order.shippingAddress,
      coupon: order.coupon,
      subtotal: order.subtotal,
      discount: order.discount,
      shipping: 0,
      tax: 0,
      total: order.total,
      payment_method: order.paymentMethod || "demo",
      payment_status: order.paymentStatus || "pending",
      fulfilment_status: order.fulfilmentStatus || "placed",
      razorpay_order_id: order.razorpayOrderId,
      razorpay_payment_id: order.razorpayPaymentId,
      created_at: order.createdAt,
      updated_at: (/* @__PURE__ */ new Date()).toISOString()
    };
    const { error: oErr } = await supabase.from("orders").upsert([dbOrder], { onConflict: "id" });
    if (oErr) {
      console.error("[Supabase Order Upsert Error]:", oErr.message);
    } else {
      console.log(`[Supabase Order Saved]: ${order.number} (${order.paymentStatus})`);
    }
    if (Array.isArray(order.items) && order.items.length) {
      const dbItems = order.items.map((it, idx) => ({
        id: `item_${order.id}_${idx}`,
        order_id: order.id,
        product_id: it.productId,
        quantity: it.quantity,
        price_at_purchase: it.unitPrice,
        product_name_snapshot: it.name || "Artisanal Piece",
        product_sku_snapshot: it.productId || "",
        variant_details: { finish: it.finish, customization: it.customization }
      }));
      const { error: iErr } = await supabase.from("order_items").upsert(dbItems, { onConflict: "id" });
      if (iErr) {
        console.warn("[Supabase Order Items Notice]:", iErr.message);
      }
    }
  } catch (err) {
    console.error("[Supabase Order Sync Exception]:", err);
  }
}
async function decrementPurchasedStock(items) {
  try {
    for (const item of items) {
      const { data: prod } = await supabase.from("products").select("id, ready_to_ship_stock, made_to_order").eq("id", item.productId).maybeSingle();
      if (prod && !prod.made_to_order) {
        const currentStock = Number(prod.ready_to_ship_stock) || 0;
        const newStock = Math.max(0, currentStock - item.quantity);
        await supabase.from("products").update({ ready_to_ship_stock: newStock }).eq("id", item.productId);
        console.log(`[Supabase Stock Decremented]: Product ${item.productId} stock updated from ${currentStock} to ${newStock}`);
      }
    }
  } catch (err) {
    console.warn("[Supabase Stock Decrement Notice]:", err);
  }
}
async function createOrderFromCart(customerId, input) {
  const { data: dbProducts } = await supabase.from("products").select("*");
  const liveCatalog = dbProducts && dbProducts.length > 0 ? dbProducts : [];
  const items = [];
  for (const line of input.items) {
    const dbP = liveCatalog.find((entry) => entry.id === line.productId);
    const fallbackP = products.find((entry) => entry.id === line.productId);
    const p = dbP || fallbackP;
    if (!p || line.quantity < 1) continue;
    const stock = Number(dbP ? dbP.ready_to_ship_stock ?? dbP.readyToShipStock : 10);
    const isMadeToOrder = Boolean(dbP ? dbP.made_to_order ?? dbP.madeToOrder : true);
    if (!isMadeToOrder && line.quantity > stock) {
      return {
        error: "insufficient_stock",
        message: `Only ${stock} unit${stock === 1 ? "" : "s"} available in stock for "${p.name}".`
      };
    }
    const basePrice = Number(p.price) || 0;
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
    }
  }
  const coupon = appliedCoupon;
  const total = Math.max(0, subtotal - discount);
  const orders = readAll();
  const order = {
    id: randomBytes3(10).toString("hex"),
    number: `CK${String(orders.length + 10841).padStart(6, "0")}`,
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
  orders.push(order);
  writeAll(orders);
  await persistOrderToSupabase(order);
  return { order };
}
function findReusableCheckoutOrder(customerId, fingerprint) {
  return listOrdersForCustomer(customerId).find(
    (order) => order.cartFingerprint === fingerprint && order.paymentStatus !== "paid" && order.paymentStatus !== "refunded"
  ) ?? null;
}
function saveOrder(next) {
  const orders = readAll();
  const index = orders.findIndex((order) => order.id === next.id);
  if (index === -1) return null;
  orders[index] = next;
  writeAll(orders);
  return next;
}
function attachRazorpayOrder(orderId, customerId, razorpayOrderId) {
  const order = getOrderForCustomer(customerId, orderId);
  if (!order) return null;
  const saved = saveOrder({
    ...order,
    paymentStatus: order.paymentStatus === "paid" ? "paid" : "pending",
    razorpayOrderId,
    paymentError: null
  });
  if (saved) {
    void persistOrderToSupabase(saved);
  }
  return saved;
}
function markOrderPaymentFailed(orderId, customerId, message) {
  const order = getOrderForCustomer(customerId, orderId);
  if (!order || order.paymentStatus === "paid") return order;
  const saved = saveOrder({
    ...order,
    paymentStatus: "failed",
    paymentError: message
  });
  if (saved) {
    void persistOrderToSupabase(saved);
  }
  return saved;
}
async function markOrderPaid(customerId, input) {
  const order = getOrderForCustomer(customerId, input.orderId);
  if (!order) return { error: "missing" };
  if (order.razorpayOrderId !== input.razorpayOrderId) return { error: "mismatch" };
  if (order.paymentStatus === "paid") return { order };
  const paid = saveOrder({
    ...order,
    paymentStatus: "paid",
    fulfilmentStatus: order.fulfilmentStatus === "placed" ? "confirmed" : order.fulfilmentStatus,
    razorpayPaymentId: input.razorpayPaymentId,
    paymentMethod: input.paymentMethod ?? order.paymentMethod,
    deliveryMethod: input.deliveryMethod ?? order.deliveryMethod,
    trackingNumber: nextTrackingNumber(order),
    paymentError: null
  });
  if (!paid) return { error: "missing" };
  await persistOrderToSupabase(paid);
  await decrementPurchasedStock(paid.items);
  return { order: paid };
}
async function markCashOnDelivery(customerId, input) {
  const order = getOrderForCustomer(customerId, input.orderId);
  if (!order) return { error: "missing" };
  if (order.razorpayOrderId !== input.razorpayOrderId) return { error: "mismatch" };
  if (order.paymentStatus === "paid") return { order };
  const next = saveOrder({
    ...order,
    paymentStatus: "pending",
    fulfilmentStatus: order.fulfilmentStatus === "placed" ? "confirmed" : order.fulfilmentStatus,
    paymentMethod: "cash",
    deliveryMethod: "Cash on delivery",
    trackingNumber: nextTrackingNumber(order),
    paymentError: null
  });
  if (!next) return { error: "missing" };
  await persistOrderToSupabase(next);
  await decrementPurchasedStock(next.items);
  return { order: next };
}

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
var SECRET = process.env.COUCHKRAFT_AUTH_SECRET || createHmac2("sha256", "couchkraft-local").update("dev").digest("hex");
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
  if (!url.startsWith("/api/auth") && !url.startsWith("/api/orders") && !url.startsWith("/api/addresses") && !url.startsWith("/api/checkout") && !url.startsWith("/api/admin") && !url.startsWith("/api/products") && !url.startsWith("/api/banners") && !url.startsWith("/api/settings") && !url.startsWith("/api/custom-requests")) {
    return false;
  }
  try {
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
    if (req.method === "POST" && url === "/api/custom-requests") {
      const body = await readBody(req);
      const customerName = text(body, "customerName").trim() || text(body, "name").trim();
      const customerPhone = text(body, "customerPhone").trim() || text(body, "phone").trim();
      if (!customerPhone) {
        return send2(res, 400, { error: "Please enter your phone number so our atelier can follow up." });
      }
      const user = await currentUser(req);
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
        notes: text(body, "notes")
      });
      return send2(res, 201, { ok: true, request: created, message: "Your bespoke furniture commission has been safely submitted." });
    }
    if (url.startsWith("/api/admin")) {
      const body = req.method !== "GET" && req.method !== "HEAD" ? await readBody(req) : {};
      return handleAdminApi(req, res, url, body);
    }
    if (req.method === "GET" && url === "/api/products") {
      return send2(res, 200, { products: await readProducts() });
    }
    if (req.method === "GET" && url === "/api/banners") {
      return send2(res, 200, { banners: readBanners() });
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
      const otpSend = await sendEmailOtp(email);
      if (!otpSend.ok) console.warn("[Register OTP Send Notice]:", otpSend.error);
      return send2(res, 201, {
        ok: true,
        message: otpSend.ok ? "Account created! A 6-digit verification code has been dispatched to your email." : "Account created! If you do not receive a verification code shortly, click Resend."
      });
    }
    if (req.method === "POST" && url === "/api/auth/demo-login") {
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
      return send2(res, 200, { orders: listOrdersForCustomer(user.id) });
    }
    if (req.method === "GET" && url === "/api/checkout/config") {
      const keys = razorpayConfigFrom(runtimeEnv);
      return send2(res, 200, {
        configured: true,
        gateway: keys.ok ? "razorpay" : "demo",
        mode: keys.ok ? "test" : "demo",
        keyId: keys.ok ? keys.config.keyId : null,
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
        let order = findReusableCheckoutOrder(user.id, fingerprint);
        if (!order) {
          const created = await createOrderFromCart(user.id, {
            items,
            address,
            coupon,
            contact,
            paymentStatus: "pending",
            cartFingerprint: fingerprint
          });
          if ("error" in created) return send2(res, 400, { error: created.message || "Your bag has no valid pieces to order." });
          order = created.order;
        }
        if (order.paymentStatus === "paid") {
          return send2(res, 200, { order, alreadyPaid: true, gateway: keys.ok ? "razorpay" : "demo" });
        }
        if (!order.razorpayOrderId) {
          if (keys.ok) {
            const razorpayOrder = await createRazorpayOrder(keys.config, {
              amountPaise: order.amountPaise,
              receipt: order.number,
              notes: { couchkraftOrderId: order.id, customerId: user.id }
            });
            order = attachRazorpayOrder(order.id, user.id, razorpayOrder.id) || order;
          } else {
            order = attachRazorpayOrder(order.id, user.id, `order_demo_${order.id}`) || order;
          }
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
      if (razorpayConfigFrom(runtimeEnv).ok) {
        return send2(res, 400, { error: "Demo gateway is disabled while Razorpay test keys are configured." });
      }
      const body = await readBody(req);
      const orderId = text(body, "orderId");
      const method = text(body, "method");
      const action = text(body, "action") || "success";
      const methods = ["card", "cash", "upi", "netbanking"];
      if (!methods.includes(method)) {
        return send2(res, 400, { error: "Choose card, cash, UPI or net banking." });
      }
      const existing = getOrderForCustomer(user.id, orderId);
      if (!existing) return send2(res, 404, { error: "Order not found." });
      if (!existing.razorpayOrderId?.startsWith("order_demo_")) {
        return send2(res, 400, { error: "This order is not using the demo gateway." });
      }
      if (action === "fail") {
        const order = markOrderPaymentFailed(orderId, user.id, "Demo payment failed.");
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
        markOrderPaymentFailed(orderId, user.id, "Payment signature could not be verified.");
        return send2(res, 400, { error: "Payment could not be verified. This order has not been marked as paid." });
      }
      const result = await markOrderPaid(user.id, { orderId, razorpayOrderId, razorpayPaymentId });
      if ("error" in result) {
        return send2(res, result.error === "missing" ? 404 : 400, {
          error: result.error === "missing" ? "Order not found." : "This payment does not match the order on your account."
        });
      }
      return send2(res, 200, { order: result.order });
    }
    if (req.method === "POST" && url === "/api/checkout/fail") {
      const user = await currentUser(req);
      if (!user) return send2(res, 401, { error: "Please sign in." });
      const body = await readBody(req);
      const order = markOrderPaymentFailed(
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
      const order = getOrderByNumberForCustomer(user.id, number);
      if (!order) return send2(res, 404, { error: "No matching order was found on this account." });
      return send2(res, 200, { order });
    }
    const orderMatch = url.match(/^\/api\/orders\/([^/]+)$/);
    if (orderMatch && req.method === "GET") {
      const user = await currentUser(req);
      if (!user) return send2(res, 401, { error: "Please sign in." });
      const order = getOrderForCustomer(user.id, orderMatch[1]);
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
  } catch {
    return send2(res, 500, { error: "Something went wrong. Please try again." });
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
