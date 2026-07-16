import { z } from "zod";

// ─── Vendor ────────────────────────────────────────────────────────────────

export const createVendorSchema = z.object({
  name: z.string().min(2, "Vendor name is required"),
  contact: z.string().min(2, "Contact is required"),
  fulfillmentType: z.enum(["EMAIL", "API", "DIGITAL"]),
  serviceablePincodes: z.array(z.string()).optional(),
  cutoffDates: z.record(z.string()).optional(), // { "Diwali": "2026-11-01" }
  payoutDetails: z.record(z.unknown()).optional(),
});

export const updateVendorSchema = createVendorSchema.partial().extend({
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
});

export type CreateVendorInput = z.infer<typeof createVendorSchema>;
export type UpdateVendorInput = z.infer<typeof updateVendorSchema>;

// ─── Variant ───────────────────────────────────────────────────────────────

export const createVariantSchema = z.object({
  sku: z.string().min(1, "SKU is required"),
  title: z.string().min(1, "Variant title is required"),
  priceCents: z.number().int().positive("Price must be positive"),
  costCents: z.number().int().positive("Cost must be positive"),
  hsnCode: z.string().optional(),
  gstRateBps: z.number().int().min(0).max(50000), // up to 500%
  isDigital: z.boolean().default(false),
  stockQty: z.number().int().min(0).default(0),
});

export type CreateVariantInput = z.infer<typeof createVariantSchema>;

// ─── Product ───────────────────────────────────────────────────────────────

export const createProductSchema = z.object({
  vendorId: z.string().uuid(),
  title: z.string().min(2, "Product title is required"),
  description: z.string().min(10, "Description is required"),
  whatsInside: z.string().optional(),
  images: z.array(z.string().url()).default([]),
  category: z.string().optional(),
  attributes: z.record(z.unknown()).optional(),
  variants: z.array(createVariantSchema).min(1, "At least one variant is required"),
});

export const updateProductSchema = createProductSchema
  .omit({ variants: true, vendorId: true })
  .partial()
  .extend({
    status: z.enum(["ACTIVE", "INACTIVE", "DRAFT"]).optional(),
  });

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;

// ─── Collection ────────────────────────────────────────────────────────────

export const createCollectionSchema = z.object({
  name: z.string().min(2, "Collection name is required"),
  description: z.string().optional(),
  productIds: z.array(z.string().uuid()).min(1),
});

export type CreateCollectionInput = z.infer<typeof createCollectionSchema>;

// ─── Query filters ─────────────────────────────────────────────────────────

export const catalogQuerySchema = z.object({
  search: z.string().optional(),
  category: z.string().optional(),
  maxPriceCents: z.coerce.number().int().positive().optional(),
  minPriceCents: z.coerce.number().int().positive().optional(),
  collectionId: z.string().uuid().optional(),
  cursor: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(24),
});

export type CatalogQuery = z.infer<typeof catalogQuerySchema>;
