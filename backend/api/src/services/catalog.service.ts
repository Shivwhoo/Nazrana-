import { prisma } from '../prisma';
import { CatalogQuery } from '@gifting/shared';

export class CatalogService {
  /**
   * List active products with search, category, price-band, and collection filters.
   * Cursor-based pagination (by product ID).
   */
  static async listProducts(query: CatalogQuery) {
    const { search, category, maxPriceCents, minPriceCents, collectionId, cursor, limit } = query;

    const products = await prisma.product.findMany({
      where: {
        status: 'ACTIVE',
        moderationStatus: 'PUBLISHED',
        ...(search ? {
          OR: [
            { title: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } },
          ],
        } : {}),
        ...(category ? { category } : {}),
        ...(collectionId ? {
          collections: { some: { collectionId } }
        } : {}),
        variants: {
          some: {
            ...(maxPriceCents ? { priceCents: { lte: maxPriceCents } } : {}),
            ...(minPriceCents ? { priceCents: { gte: minPriceCents } } : {}),
          }
        }
      },
      include: {
        variants: {
          orderBy: { priceCents: 'asc' }
        },
        vendor: {
          select: { id: true, name: true, fulfillmentType: true, cutoffDates: true, serviceablePincodes: true }
        },
        collections: {
          include: { collection: { select: { id: true, name: true } } }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: limit + 1, // fetch one extra to know if there's a next page
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    });

    const hasNextPage = products.length > limit;
    const items = hasNextPage ? products.slice(0, limit) : products;
    const nextCursor = hasNextPage ? items[items.length - 1].id : null;

    return { items, nextCursor, hasNextPage };
  }

  /**
   * Get a single product with all variants.
   */
  static async getProduct(productId: string) {
    return prisma.product.findFirst({
      where: { id: productId, status: 'ACTIVE' },
      include: {
        variants: { orderBy: { priceCents: 'asc' } },
        vendor: {
          select: { id: true, name: true, fulfillmentType: true, cutoffDates: true, serviceablePincodes: true }
        },
        collections: {
          include: { collection: { select: { id: true, name: true } } }
        }
      }
    });
  }

  /**
   * List all collections with their product count.
   */
  static async listCollections() {
    return prisma.collection.findMany({
      include: {
        _count: { select: { items: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  /**
   * Get products in a specific collection.
   */
  static async getCollectionProducts(collectionId: string, query: CatalogQuery) {
    return CatalogService.listProducts({ ...query, collectionId });
  }

  // ─── PLATFORM_ADMIN: Vendor CRUD ──────────────────────────────────────────

  static async createVendor(data: Parameters<typeof prisma.vendor.create>[0]['data']) {
    return prisma.vendor.create({ data });
  }

  static async updateVendor(id: string, data: Parameters<typeof prisma.vendor.update>[0]['data']) {
    return prisma.vendor.update({ where: { id }, data });
  }

  static async deleteVendor(id: string) {
    return prisma.vendor.update({ where: { id }, data: { status: 'INACTIVE' } });
  }

  static async listVendors() {
    return prisma.vendor.findMany({ orderBy: { createdAt: 'desc' } });
  }

  // ─── PLATFORM_ADMIN: Product CRUD ─────────────────────────────────────────

  static async createProduct(data: any) {
    const { variants, ...productData } = data;
    return prisma.product.create({
      data: {
        ...productData,
        status: 'ACTIVE',
        variants: { create: variants }
      },
      include: { variants: true }
    });
  }

  static async updateProduct(id: string, data: any) {
    const { variants, ...productData } = data;
    return prisma.product.update({
      where: { id },
      data: productData,
      include: { variants: true }
    });
  }

  static async listAllProducts() {
    return prisma.product.findMany({
      include: {
        variants: true,
        vendor: { select: { id: true, name: true } },
        _count: { select: { collections: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  // ─── PLATFORM_ADMIN: Collection CRUD ──────────────────────────────────────

  static async createCollection(name: string, description: string | undefined, productIds: string[]) {
    return prisma.collection.create({
      data: {
        name,
        description,
        items: {
          create: productIds.map(productId => ({ productId }))
        }
      },
      include: { items: { include: { product: true } } }
    });
  }

  static async updateCollection(id: string, name: string, description?: string) {
    return prisma.collection.update({ where: { id }, data: { name, description } });
  }

  static async addProductToCollection(collectionId: string, productId: string) {
    return prisma.collectionItem.create({ data: { collectionId, productId } });
  }

  static async removeProductFromCollection(collectionId: string, productId: string) {
    return prisma.collectionItem.deleteMany({ where: { collectionId, productId } });
  }
}
