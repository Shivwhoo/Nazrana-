/**
 * Seed script for the Corporate Gifting platform.
 * Run with DATABASE_URL set in environment:
 *   $env:DATABASE_URL="..."; node_modules\.bin\ts-node seed.ts
 */

import { PrismaClient } from '@prisma/client';
// @ts-ignore
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();


async function main() {
  console.log('🌱 Seeding database...');

  // ─── Platform Admin ──────────────────────────────────────────────────────
  const adminPassword = await bcrypt.hash('Admin@1234', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@gifting.internal' },
    update: {},
    create: {
      email: 'admin@gifting.internal',
      name: 'Platform Admin',
      password: adminPassword,
      isPlatformAdmin: true,
    },
  });
  console.log(`✓ Admin user: ${admin.email}`);

  // ─── Vendors ─────────────────────────────────────────────────────────────
  const hamperVendor = await prisma.vendor.upsert({
    where: { id: 'vendor-hamper-house' },
    update: {},
    create: {
      id: 'vendor-hamper-house',
      name: 'Hamper House',
      contact: 'orders@hamperhouse.in',
      fulfillmentType: 'EMAIL',
      serviceablePincodes: undefined, // pan-India
      cutoffDates: { 'Diwali 2026': '2026-10-20', 'New Year 2027': '2026-12-20' } as any,
      payoutDetails: { bank: 'HDFC', account: '1234567890', ifsc: 'HDFC0001234' },
      status: 'ACTIVE',
    },
  });

  const voucherVendor = await prisma.vendor.upsert({
    where: { id: 'vendor-voucher-vault' },
    update: {},
    create: {
      id: 'vendor-voucher-vault',
      name: 'VoucherVault',
      contact: 'api@vouchervault.in',
      fulfillmentType: 'DIGITAL',
      serviceablePincodes: undefined, // digital — no pincode restriction
      cutoffDates: {} as any,
      payoutDetails: { bank: 'ICICI', account: '9876543210', ifsc: 'ICIC0001234' },
      status: 'ACTIVE',
    },
  });
  console.log(`✓ Vendors: ${hamperVendor.name}, ${voucherVendor.name}`);

  // ─── Products ─────────────────────────────────────────────────────────────
  type ProductSeed = {
    id: string;
    vendorId: string;
    title: string;
    description: string;
    whatsInside: string;
    category: string;
    images: string[];
    attributes: Record<string, string>;
    variants: Array<{
      sku: string;
      title: string;
      priceCents: number;
      costCents: number;
      hsnCode: string;
      gstRateBps: number;
      isDigital: boolean;
      stockQty: number;
    }>;
  };

  const products: ProductSeed[] = [
    // ── Diwali Hampers ──
    {
      id: 'prod-diwali-classic',
      vendorId: hamperVendor.id,
      title: 'Diwali Classic Hamper',
      description: 'A tastefully curated Diwali hamper with premium sweets, dry fruits, and artisanal candles. Delivered in a handcrafted box with your company branding.',
      whatsInside: 'Kaju Katli 250g · Assorted Dry Fruits 200g · Soy Wax Candle · Greeting Card · Branded Box',
      category: 'Diwali Hampers',
      images: ['https://images.unsplash.com/photo-1607083206869-4c7672e72a8a?w=800'],
      attributes: { boxType: 'Handcrafted', occasion: 'Diwali' },
      variants: [
        { sku: 'DH-CLASSIC-500', title: '₹500 Hamper', priceCents: 50000, costCents: 38000, hsnCode: '21069099', gstRateBps: 1800, isDigital: false, stockQty: 500 },
        { sku: 'DH-CLASSIC-1000', title: '₹1,000 Hamper', priceCents: 100000, costCents: 75000, hsnCode: '21069099', gstRateBps: 1800, isDigital: false, stockQty: 500 },
        { sku: 'DH-CLASSIC-1500', title: '₹1,500 Hamper', priceCents: 150000, costCents: 112000, hsnCode: '21069099', gstRateBps: 1800, isDigital: false, stockQty: 300 },
      ],
    },
    {
      id: 'prod-diwali-premium',
      vendorId: hamperVendor.id,
      title: 'Diwali Premium Gift Set',
      description: 'An elevated Diwali experience with Belgian chocolates, premium tea collection, diyas, and a luxurious scented candle.',
      whatsInside: 'Belgian Chocolate Box 200g · Darjeeling Tea Collection · Hand-painted Diyas (set of 3) · Scented Candle · Premium Rigid Box',
      category: 'Diwali Hampers',
      images: ['https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=800'],
      attributes: { boxType: 'Rigid', occasion: 'Diwali' },
      variants: [
        { sku: 'DH-PREMIUM-2000', title: '₹2,000 Set', priceCents: 200000, costCents: 148000, hsnCode: '21069099', gstRateBps: 1800, isDigital: false, stockQty: 200 },
        { sku: 'DH-PREMIUM-2500', title: '₹2,500 Set', priceCents: 250000, costCents: 185000, hsnCode: '21069099', gstRateBps: 1800, isDigital: false, stockQty: 200 },
      ],
    },
    {
      id: 'prod-diwali-healthy',
      vendorId: hamperVendor.id,
      title: 'Healthy Diwali Hamper',
      description: 'For health-conscious gifting — organic snacks, millet ladoos, herbal teas, and a seed-infused artisan candle.',
      whatsInside: 'Millet Ladoos 250g · Organic Trail Mix 150g · Herbal Tea Sampler · Seed Candle · Eco-friendly Box',
      category: 'Diwali Hampers',
      images: ['https://images.unsplash.com/photo-1602028915047-37269d1a73f7?w=800'],
      attributes: { boxType: 'Eco', occasion: 'Diwali', dietary: 'Organic' },
      variants: [
        { sku: 'DH-HEALTHY-1200', title: '₹1,200 Hamper', priceCents: 120000, costCents: 88000, hsnCode: '21069099', gstRateBps: 1800, isDigital: false, stockQty: 300 },
      ],
    },
    {
      id: 'prod-diwali-corporate',
      vendorId: hamperVendor.id,
      title: 'Corporate Diwali Box',
      description: 'Professionally packaged with subdued branding — ideal for large-scale corporate distribution. Includes assorted mithai and a premium leather keychain.',
      whatsInside: 'Assorted Mithai Box 400g · Premium Leather Keychain · Company-branded Tin · Festive Carry Bag',
      category: 'Diwali Hampers',
      images: ['https://images.unsplash.com/photo-1607083206868-6d408fd6f689?w=800'],
      attributes: { boxType: 'Tin', occasion: 'Diwali', branding: 'Custom' },
      variants: [
        { sku: 'DH-CORP-800', title: '₹800 Box', priceCents: 80000, costCents: 59000, hsnCode: '21069099', gstRateBps: 1800, isDigital: false, stockQty: 1000 },
        { sku: 'DH-CORP-1500', title: '₹1,500 Box', priceCents: 150000, costCents: 111000, hsnCode: '21069099', gstRateBps: 1800, isDigital: false, stockQty: 600 },
      ],
    },
    // ── Snack Boxes ──
    {
      id: 'prod-snack-artisan',
      vendorId: hamperVendor.id,
      title: 'Artisan Snack Box',
      description: 'A curated box of small-batch artisan snacks from Indian food entrepreneurs — granola, chakli, roasted nuts, and more.',
      whatsInside: 'Makhana Crunch 100g · Artisan Chakli 150g · Date & Nut Bites 100g · Flavoured Groundnuts 120g · Khakhra Assortment 100g',
      category: 'Snack Boxes',
      images: ['https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=800'],
      attributes: { dietary: 'Vegetarian' },
      variants: [
        { sku: 'SB-ARTISAN-750', title: '₹750 Box', priceCents: 75000, costCents: 55000, hsnCode: '19059090', gstRateBps: 1200, isDigital: false, stockQty: 400 },
        { sku: 'SB-ARTISAN-1200', title: '₹1,200 Box', priceCents: 120000, costCents: 88000, hsnCode: '19059090', gstRateBps: 1200, isDigital: false, stockQty: 400 },
      ],
    },
    {
      id: 'prod-snack-healthy',
      vendorId: hamperVendor.id,
      title: 'Healthy Bites Box',
      description: 'Clean-label snacks with no refined sugar or preservatives — protein bars, seed bars, and herbal infusions.',
      whatsInside: 'Protein Bar x3 · Seed Bar x3 · Mixed Seeds 100g · Herbal Tea Bags x6',
      category: 'Snack Boxes',
      images: ['https://images.unsplash.com/photo-1505253668822-42074d58a7c6?w=800'],
      attributes: { dietary: 'No Added Sugar, Gluten-Free' },
      variants: [
        { sku: 'SB-HEALTHY-600', title: '₹600 Box', priceCents: 60000, costCents: 44000, hsnCode: '19059090', gstRateBps: 1200, isDigital: false, stockQty: 350 },
      ],
    },
    // ── Stationery & Desk ──
    {
      id: 'prod-desk-set',
      vendorId: hamperVendor.id,
      title: 'Premium Desk Essentials Set',
      description: 'Elevate every workday with this curated desk set — a refillable notebook, brass pen, sticky notes, and a minimalist desk organizer.',
      whatsInside: 'A5 Refillable Notebook · Brass Ballpen · Sticky Notes Pack · Mini Desk Organizer',
      category: 'Stationery & Desk',
      images: ['https://images.unsplash.com/photo-1519219788971-8d9797e0928e?w=800'],
      attributes: { material: 'Brass + Recycled Paper' },
      variants: [
        { sku: 'DS-DESK-900', title: '₹900 Set', priceCents: 90000, costCents: 66000, hsnCode: '96081000', gstRateBps: 1200, isDigital: false, stockQty: 250 },
        { sku: 'DS-DESK-1500', title: '₹1,500 Set', priceCents: 150000, costCents: 110000, hsnCode: '96081000', gstRateBps: 1200, isDigital: false, stockQty: 250 },
      ],
    },
    {
      id: 'prod-notebook-set',
      vendorId: hamperVendor.id,
      title: 'Handmade Journal Set',
      description: 'A beautiful set of two handmade paper journals with cotton-rag covers — each unique, each a piece of craftsmanship.',
      whatsInside: 'A5 Handmade Journal x2 · Bookmark x2 · Artisan Pen',
      category: 'Stationery & Desk',
      images: ['https://images.unsplash.com/photo-1531346680769-a1d79b57de5c?w=800'],
      attributes: { material: 'Handmade Paper', artisan: 'true' },
      variants: [
        { sku: 'DS-JOURNAL-700', title: '₹700 Set', priceCents: 70000, costCents: 51000, hsnCode: '48201090', gstRateBps: 1200, isDigital: false, stockQty: 200 },
      ],
    },
    // ── Wellness ──
    {
      id: 'prod-wellness-kit',
      vendorId: hamperVendor.id,
      title: 'Self-Care Wellness Kit',
      description: 'A thoughtful wellness package — aromatherapy, stress ball, herbal bath soak, and a calming journal.',
      whatsInside: 'Lavender Essential Oil 10ml · Stress Ball · Himalayan Bath Salts 200g · Wellness Journal',
      category: 'Wellness',
      images: ['https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800'],
      attributes: { scent: 'Lavender' },
      variants: [
        { sku: 'WL-SELF-1000', title: '₹1,000 Kit', priceCents: 100000, costCents: 73000, hsnCode: '33049910', gstRateBps: 1800, isDigital: false, stockQty: 200 },
        { sku: 'WL-SELF-1500', title: '₹1,500 Kit', priceCents: 150000, costCents: 110000, hsnCode: '33049910', gstRateBps: 1800, isDigital: false, stockQty: 200 },
      ],
    },
    {
      id: 'prod-tea-set',
      vendorId: hamperVendor.id,
      title: 'Premium Tea Sampler Collection',
      description: "A curated journey through India's finest teas — Darjeeling first flush, Nilgiri, Assam CTC, and rare white tea, in a beautiful wooden chest.",
      whatsInside: 'Darjeeling First Flush 50g · Nilgiri Green 50g · Assam CTC 100g · White Moonlight Tea 25g · Wooden Chest',
      category: 'Wellness',
      images: ['https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=800'],
      attributes: { origin: 'India', caffeine: 'Varied' },
      variants: [
        { sku: 'WL-TEA-1200', title: '₹1,200 Set', priceCents: 120000, costCents: 88000, hsnCode: '09021090', gstRateBps: 500, isDigital: false, stockQty: 300 },
      ],
    },
    // ── Accessories ──
    {
      id: 'prod-bottle-copper',
      vendorId: hamperVendor.id,
      title: 'Handcrafted Copper Water Bottle',
      description: 'Pure copper bottle with Ayurvedic benefits, handcrafted by artisans in Moradabad. Gift-boxed with a card on the benefits of copper.',
      whatsInside: 'Copper Bottle 1L · Gift Box · Informational Card',
      category: 'Accessories',
      images: ['https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800'],
      attributes: { material: 'Pure Copper', capacity: '1L', artisan: 'Moradabad' },
      variants: [
        { sku: 'AC-COPPER-800', title: '₹800 Bottle', priceCents: 80000, costCents: 58000, hsnCode: '74199990', gstRateBps: 1800, isDigital: false, stockQty: 300 },
      ],
    },
    {
      id: 'prod-tote-canvas',
      vendorId: hamperVendor.id,
      title: 'Hand-Block Printed Canvas Tote',
      description: 'A spacious canvas tote with traditional Rajasthani block print patterns — functional, eco-friendly, and a canvas of craft.',
      whatsInside: 'Canvas Tote Bag (large) · Matching Pouch',
      category: 'Accessories',
      images: ['https://images.unsplash.com/photo-1566150905458-1bf1fc113f0d?w=800'],
      attributes: { material: 'Canvas', print: 'Block Print', origin: 'Rajasthan' },
      variants: [
        { sku: 'AC-TOTE-500', title: '₹500 Set', priceCents: 50000, costCents: 36000, hsnCode: '42022900', gstRateBps: 1200, isDigital: false, stockQty: 500 },
        { sku: 'AC-TOTE-700', title: '₹700 Premium', priceCents: 70000, costCents: 51000, hsnCode: '42022900', gstRateBps: 1200, isDigital: false, stockQty: 400 },
      ],
    },
    {
      id: 'prod-planter-terracotta',
      vendorId: hamperVendor.id,
      title: 'Terracotta Planter Gift Set',
      description: 'A cheerful set of hand-painted terracotta planters with succulent seeds — bring life to any desk.',
      whatsInside: 'Terracotta Planter x2 (hand-painted) · Succulent Seed Mix · Potting Mix Sachet · Care Guide',
      category: 'Accessories',
      images: ['https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=800'],
      attributes: { material: 'Terracotta', artisan: 'true' },
      variants: [
        { sku: 'AC-PLANTER-600', title: '₹600 Set', priceCents: 60000, costCents: 43000, hsnCode: '69120090', gstRateBps: 1200, isDigital: false, stockQty: 200 },
      ],
    },
    // ── Onboarding Kits ──
    {
      id: 'prod-onboarding-starter',
      vendorId: hamperVendor.id,
      title: 'New Joiner Welcome Kit',
      description: 'Start every hire on the right foot — a branded welcome kit with essentials for the first day.',
      whatsInside: 'Branded Notebook · Company Pen · Sticky Notes · Cable Organiser · Welcome Card',
      category: 'Onboarding Kits',
      images: ['https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=800'],
      attributes: { occasion: 'Onboarding', branding: 'Custom' },
      variants: [
        { sku: 'OK-STARTER-700', title: '₹700 Kit', priceCents: 70000, costCents: 51000, hsnCode: '48201090', gstRateBps: 1200, isDigital: false, stockQty: 500 },
        { sku: 'OK-STARTER-1200', title: '₹1,200 Kit', priceCents: 120000, costCents: 88000, hsnCode: '48201090', gstRateBps: 1200, isDigital: false, stockQty: 500 },
      ],
    },
    {
      id: 'prod-onboarding-premium',
      vendorId: hamperVendor.id,
      title: 'Premium Onboarding Box',
      description: 'A premium welcome experience — leather notebook, wireless charger pad, branded mug, and a personalized card.',
      whatsInside: 'PU Leather Notebook · 10W Wireless Charger · Ceramic Mug · Sticker Pack · Premium Gift Box',
      category: 'Onboarding Kits',
      images: ['https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=800'],
      attributes: { occasion: 'Onboarding', branding: 'Custom', techInclusion: 'true' },
      variants: [
        { sku: 'OK-PREMIUM-2000', title: '₹2,000 Kit', priceCents: 200000, costCents: 148000, hsnCode: '85176990', gstRateBps: 1800, isDigital: false, stockQty: 200 },
        { sku: 'OK-PREMIUM-2500', title: '₹2,500 Kit', priceCents: 250000, costCents: 185000, hsnCode: '85176990', gstRateBps: 1800, isDigital: false, stockQty: 200 },
      ],
    },
    // ── Digital Vouchers ──
    {
      id: 'prod-amazon-voucher',
      vendorId: voucherVendor.id,
      title: 'Amazon Gift Card',
      description: 'Give the gift of choice — an Amazon gift card redeemable on millions of products. Delivered instantly to the recipient\'s email.',
      whatsInside: 'Digital voucher code delivered via email',
      category: 'Digital Vouchers',
      images: ['https://images.unsplash.com/photo-1523474253046-8cd2748b5fd2?w=800'],
      attributes: { brand: 'Amazon', delivery: 'Instant' },
      variants: [
        { sku: 'DV-AMAZON-500', title: '₹500 Card', priceCents: 50000, costCents: 49000, hsnCode: '49070090', gstRateBps: 1800, isDigital: true, stockQty: 9999 },
        { sku: 'DV-AMAZON-1000', title: '₹1,000 Card', priceCents: 100000, costCents: 98000, hsnCode: '49070090', gstRateBps: 1800, isDigital: true, stockQty: 9999 },
        { sku: 'DV-AMAZON-1500', title: '₹1,500 Card', priceCents: 150000, costCents: 147000, hsnCode: '49070090', gstRateBps: 1800, isDigital: true, stockQty: 9999 },
        { sku: 'DV-AMAZON-2000', title: '₹2,000 Card', priceCents: 200000, costCents: 196000, hsnCode: '49070090', gstRateBps: 1800, isDigital: true, stockQty: 9999 },
      ],
    },
    {
      id: 'prod-flipkart-voucher',
      vendorId: voucherVendor.id,
      title: 'Flipkart Gift Voucher',
      description: 'A Flipkart gift voucher — ideal for electronics, fashion, and home essentials. Redeemable online instantly.',
      whatsInside: 'Digital voucher code delivered via email',
      category: 'Digital Vouchers',
      images: ['https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=800'],
      attributes: { brand: 'Flipkart', delivery: 'Instant' },
      variants: [
        { sku: 'DV-FK-500', title: '₹500 Voucher', priceCents: 50000, costCents: 49000, hsnCode: '49070090', gstRateBps: 1800, isDigital: true, stockQty: 9999 },
        { sku: 'DV-FK-1000', title: '₹1,000 Voucher', priceCents: 100000, costCents: 98000, hsnCode: '49070090', gstRateBps: 1800, isDigital: true, stockQty: 9999 },
        { sku: 'DV-FK-1500', title: '₹1,500 Voucher', priceCents: 150000, costCents: 147000, hsnCode: '49070090', gstRateBps: 1800, isDigital: true, stockQty: 9999 },
      ],
    },
    {
      id: 'prod-swiggy-voucher',
      vendorId: voucherVendor.id,
      title: 'Swiggy Food Voucher',
      description: 'Treat your team to a great meal — a Swiggy gift voucher valid across all restaurants on the app.',
      whatsInside: 'Digital voucher code delivered via email',
      category: 'Digital Vouchers',
      images: ['https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800'],
      attributes: { brand: 'Swiggy', delivery: 'Instant', type: 'Food' },
      variants: [
        { sku: 'DV-SWIGGY-500', title: '₹500 Voucher', priceCents: 50000, costCents: 49000, hsnCode: '49070090', gstRateBps: 1800, isDigital: true, stockQty: 9999 },
        { sku: 'DV-SWIGGY-1000', title: '₹1,000 Voucher', priceCents: 100000, costCents: 98000, hsnCode: '49070090', gstRateBps: 1800, isDigital: true, stockQty: 9999 },
      ],
    },
    {
      id: 'prod-netf-voucher',
      vendorId: voucherVendor.id,
      title: 'Netflix Gift Card',
      description: 'Give a month of world-class entertainment — a Netflix gift card valid for subscription renewal.',
      whatsInside: 'Digital voucher code delivered via email',
      category: 'Digital Vouchers',
      images: ['https://images.unsplash.com/photo-1522869635100-9f4c5e86aa37?w=800'],
      attributes: { brand: 'Netflix', delivery: 'Instant', type: 'Streaming' },
      variants: [
        { sku: 'DV-NETFLIX-649', title: '₹649 (1 month Mobile)', priceCents: 64900, costCents: 63500, hsnCode: '49070090', gstRateBps: 1800, isDigital: true, stockQty: 9999 },
        { sku: 'DV-NETFLIX-1499', title: '₹1,499 (1 month Standard)', priceCents: 149900, costCents: 146800, hsnCode: '49070090', gstRateBps: 1800, isDigital: true, stockQty: 9999 },
      ],
    },
    {
      id: 'prod-bookmyshow-voucher',
      vendorId: voucherVendor.id,
      title: 'BookMyShow Gift Card',
      description: 'Movies, concerts, sports — a BookMyShow gift card for any live experience.',
      whatsInside: 'Digital voucher code delivered via email',
      category: 'Digital Vouchers',
      images: ['https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800'],
      attributes: { brand: 'BookMyShow', delivery: 'Instant', type: 'Entertainment' },
      variants: [
        { sku: 'DV-BMS-500', title: '₹500 Card', priceCents: 50000, costCents: 49000, hsnCode: '49070090', gstRateBps: 1800, isDigital: true, stockQty: 9999 },
        { sku: 'DV-BMS-1000', title: '₹1,000 Card', priceCents: 100000, costCents: 98000, hsnCode: '49070090', gstRateBps: 1800, isDigital: true, stockQty: 9999 },
      ],
    },
  ];

  // Upsert all products + variants
  for (const p of products) {
    const { variants, ...productData } = p;
    const product = await prisma.product.upsert({
      where: { id: p.id },
      update: {},
      create: {
        ...productData,
        status: 'ACTIVE',
      },
    });

    for (const v of variants) {
      await prisma.variant.upsert({
        where: { sku: v.sku },
        update: {},
        create: { ...v, productId: product.id },
      });
    }

    process.stdout.write(`  ✓ ${product.title}\n`);
  }
  console.log(`✓ Seeded ${products.length} products`);

  // ─── Diwali 2026 Collection ───────────────────────────────────────────────
  const diwaliProductIds = [
    'prod-diwali-classic',
    'prod-diwali-premium',
    'prod-diwali-healthy',
    'prod-diwali-corporate',
    'prod-snack-artisan',
    'prod-snack-healthy',
    'prod-wellness-kit',
    'prod-tea-set',
    'prod-amazon-voucher',
    'prod-flipkart-voucher',
  ];

  const diwaliCollection = await prisma.collection.upsert({
    where: { id: 'coll-diwali-2026' },
    update: {},
    create: {
      id: 'coll-diwali-2026',
      name: 'Diwali 2026',
      description: 'Curated gifts for the festival of lights — hampers, sweets, and digital vouchers for the Diwali season.',
    },
  });

  for (const productId of diwaliProductIds) {
    await prisma.collectionItem.upsert({
      where: { collectionId_productId: { collectionId: diwaliCollection.id, productId } },
      update: {},
      create: { collectionId: diwaliCollection.id, productId },
    });
  }

  console.log(`✓ Collection "Diwali 2026" with ${diwaliProductIds.length} products`);
  console.log('\n🎉 Seed complete!');
  console.log(`\n  Admin login: admin@gifting.internal / Admin@1234`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
