const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const u = await prisma.user.findFirst();
  console.log('Found user:', u);
  
  if (u) {
    await prisma.user.update({
      where: { id: u.id },
      data: { isPlatformAdmin: true }
    });
    console.log('Successfully updated user to Platform Admin!');
  } else {
    console.log('No user found in the database. Please sign up first.');
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
