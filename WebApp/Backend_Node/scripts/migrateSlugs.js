const { PrismaClient } = require('@prisma/client');
const { v4: uuidv4 } = require('uuid');

const prisma = new PrismaClient();

async function migrateSlugs() {
  try {
    const chatbots = await prisma.chatbot.findMany();
    let updatedCount = 0;
    for (const bot of chatbots) {
      if (!bot.slug) {
        await prisma.chatbot.update({
          where: { id: bot.id },
          data: { slug: uuidv4() },
        });
        console.log(`Updated chatbot ${bot.id} with slug ${bot.slug}`);
        updatedCount++;
      }
    }
    console.log(`Migration completed. Updated ${updatedCount} chatbots.`);
  } catch (e) {
    console.error('Migration failed:', e);
    throw e;
  } finally {
    await prisma.$disconnect();
  }
}

migrateSlugs();