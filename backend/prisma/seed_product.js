const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Create a Vendor
  const vendor = await prisma.vendor.create({
    data: {
      name: 'GiftCard Co',
      contact: 'orders@giftcard.co',
      fulfillmentType: 'DIGITAL',
      status: 'ACTIVE'
    }
  });

  // Create a Product
  const product = await prisma.product.create({
    data: {
      vendorId: vendor.id,
      title: 'Amazon Gift Card ₹1000',
      description: 'The perfect gift for anyone. Instantly delivered.',
      images: ['https://m.media-amazon.com/images/I/41Kq+HioP-L._AC_.jpg'],
      category: 'Gift Cards',
      status: 'ACTIVE',
      variants: {
        create: [
          {
            sku: 'AMZ-1000',
            title: '₹1000 Denomination',
            priceCents: 100000,
            costCents: 100000,
            gstRateBps: 0,
            isDigital: true,
            stockQty: 999
          }
        ]
      }
    }
  });

  console.log('Successfully created test product:', product.title);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
