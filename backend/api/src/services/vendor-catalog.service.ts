import { prisma } from '../prisma';

const GLOBAL_DEFAULT_MARKUP_BPS = 500; // 5%

export class VendorCatalogService {
  /**
   * Helper to validate image URLs from S3/Azure
   * Downloads the first few bytes to check magic numbers
   */
  static async validateImages(images: any[]): Promise<boolean> {
    if (!images || !Array.isArray(images) || images.length === 0) return false;
    if (images.length > 8) return false;

    for (const img of images) {
      try {
        if (!img.url || typeof img.url !== 'string') return false;
        
        // Fetch first 12 bytes to check magic numbers
        const res = await fetch(img.url, { headers: { Range: 'bytes=0-11' } });
        if (!res.ok) return false;
        
        const buffer = Buffer.from(await res.arrayBuffer());
        const hex = buffer.toString('hex').toUpperCase();

        // Check magic bytes
        const isJPEG = hex.startsWith('FFD8FF');
        const isPNG = hex.startsWith('89504E470D0A1A0A');
        const isWebP = hex.startsWith('52494646') && hex.substring(16, 24) === '57454250';

        if (!isJPEG && !isPNG && !isWebP) {
          return false; // Reject SVG or other types
        }
      } catch (err) {
        return false;
      }
    }
    return true;
  }

  /**
   * Helper to run validation pipeline
   */
  static async validateProductForPublish(vendorId: string, data: any, variants: any[]): Promise<{ status: 'PUBLISHED' | 'DRAFT', errors: any }> {
    const errors: string[] = [];

    if (!data.title || data.title.trim().length === 0) errors.push('Title is required');
    if (!data.description || data.description.trim().length === 0) errors.push('Description is required');
    if (!data.category || data.category.trim().length === 0) errors.push('Category is required');

    const isValidImages = await this.validateImages(data.images);
    if (!isValidImages) errors.push('At least one valid image (PNG/JPEG/WebP) is required, max 8 images.');

    const vendor = await prisma.vendor.findUnique({ where: { id: vendorId } });
    if (!vendor?.serviceablePincodes || (Array.isArray(vendor.serviceablePincodes) && vendor.serviceablePincodes.length === 0)) {
      errors.push('Vendor profile must have serviceable pincodes configured before publishing products.');
    }

    if (!variants || variants.length === 0) {
      errors.push('At least one variant is required');
    } else {
      for (const v of variants) {
        if (!v.costCents || v.costCents <= 0) errors.push(`Variant ${v.sku} requires costCents > 0`);
        if (v.stockQty === undefined || v.stockQty < 0) errors.push(`Variant ${v.sku} requires stockQty >= 0`);
        if (!v.hsnCode) {
          errors.push(`Variant ${v.sku} requires hsnCode`);
        } else {
          const hsn = await prisma.hsnCode.findUnique({ where: { code: v.hsnCode } });
          if (!hsn) errors.push(`Variant ${v.sku} has invalid HSN code`);
        }
      }
    }

    if (errors.length > 0) {
      return { status: 'DRAFT', errors: { messages: errors } };
    }
    return { status: 'PUBLISHED', errors: null };
  }

  /**
   * Compute priceCents from costCents and markup
   */
  static async computeVariantPrices(vendorId: string, variants: any[]): Promise<any[]> {
    if (!variants || !Array.isArray(variants)) return [];

    const vendor = await prisma.vendor.findUnique({ where: { id: vendorId } });
    const markupBps = vendor?.defaultMarkupBps ?? GLOBAL_DEFAULT_MARKUP_BPS;

    const processedVariants = [];
    for (const v of variants) {
      let hsnRecord = null;
      if (v.hsnCode) {
        hsnRecord = await prisma.hsnCode.findUnique({ where: { code: v.hsnCode } });
      }
      
      const computedPriceCents = v.costCents ? Math.round(v.costCents * (1 + markupBps / 10000)) : 0;
      
      processedVariants.push({
        ...v,
        priceCents: computedPriceCents,
        gstRateBps: hsnRecord ? hsnRecord.defaultGstRateBps : 0,
      });
    }
    return processedVariants;
  }

  static async createProduct(vendorId: string, vendorUserId: string, data: any) {
    const { variants, ...productData } = data;

    const validation = await this.validateProductForPublish(vendorId, productData, variants);
    const processedVariants = await this.computeVariantPrices(vendorId, variants);

    return prisma.product.create({
      data: {
        ...productData,
        vendorId,
        createdByVendorUserId: vendorUserId,
        // Wait, for vendor created products, admin status should be ACTIVE so it shows up?
        // Let's set status: ACTIVE and moderationStatus based on validation.
        status: 'ACTIVE',
        moderationStatus: validation.status,
        validationErrors: validation.errors || undefined,
        variants: { create: processedVariants }
      },
      include: { variants: true }
    });
  }

  static async updateProduct(vendorId: string, productId: string, data: any) {
    const { variants, ...productData } = data;

    // Ensure vendor owns the product
    const existing = await prisma.product.findFirst({ where: { id: productId, vendorId } });
    if (!existing) throw new Error('Product not found');

    const validation = await this.validateProductForPublish(vendorId, productData, variants);
    
    // Check for overridden prices
    const existingVariants = await prisma.variant.findMany({ where: { productId } });
    const overriddenMap = new Map(existingVariants.map(v => [v.sku, v.priceCentsOverriddenByAdmin]));
    const originalPriceMap = new Map(existingVariants.map(v => [v.sku, v.priceCents]));

    const processedVariants = await this.computeVariantPrices(vendorId, variants);
    for (const v of processedVariants) {
      if (overriddenMap.get(v.sku)) {
        v.priceCents = originalPriceMap.get(v.sku); // Preserve admin override
      }
    }

    return prisma.$transaction(async (tx) => {
      // Delete old variants that are not in the new list (or simply update/create)
      // For simplicity, standard upsert pattern by sku
      for (const v of processedVariants) {
        await tx.variant.upsert({
          where: { sku: v.sku },
          update: { ...v, productId },
          create: { ...v, productId }
        });
      }

      return tx.product.update({
        where: { id: productId },
        data: {
          ...productData,
          moderationStatus: validation.status,
          validationErrors: validation.errors || undefined,
        },
        include: { variants: true }
      });
    });
  }

  static async listOwnProducts(vendorId: string) {
    return prisma.product.findMany({
      where: { vendorId },
      include: { variants: true, _count: { select: { campaigns: true } } },
      orderBy: { createdAt: 'desc' }
    });
  }

  static async deleteProduct(vendorId: string, productId: string) {
    // Soft delete by setting status INACTIVE
    return prisma.product.updateMany({
      where: { id: productId, vendorId },
      data: { status: 'INACTIVE' }
    });
  }
}
