const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const m = await prisma.membership.findMany({ include: { user: true, organization: true } });
  console.log(JSON.stringify(m, null, 2));
}

main().finally(() => prisma.$disconnect());
