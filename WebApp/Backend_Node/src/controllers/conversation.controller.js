const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

exports.getConversations = async (req, res, next) => {
  try {
    const { searchQuery, userId, chatbotSlug } = req.query; // CHANGED: Use chatbotSlug
    const user = req.user;

    if (!user || !user.id) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    let chatbotId;
    if (chatbotSlug) {
      const bot = await prisma.chatbot.findUnique({
        where: { slug: chatbotSlug }, // CHANGED: Query by slug
        select: { id: true },
      });
      if (!bot) {
        return res.status(404).json({ message: 'Chatbot not found' });
      }
      chatbotId = bot.id;
    }

    const where = {
      AND: [
        user.role === 'ADMIN'
          ? {}
          : { chatbot: { ownerId: user.id } },
        userId ? { userId: parseInt(userId, 10) } : {},
        chatbotId ? { chatbotId } : {}, // CHANGED: Use resolved chatbotId
        searchQuery
          ? {
              OR: [
                { question: { contains: searchQuery, mode: 'insensitive' } },
                { answer: { contains: searchQuery, mode: 'insensitive' } },
              ],
            }
          : {},
      ],
    };

    const groupedConversations = await prisma.conversation.groupBy({
      by: ['userId', 'chatbotId'],
      where: where.AND.reduce((acc, condition) => ({ ...acc, ...condition }), {}),
      _max: { createdAt: true },
      _count: { id: true },
    });

    const conversations = await Promise.all(
      groupedConversations.map(async (group) => {
        const messages = await prisma.conversation.findMany({
          where: {
            userId: group.userId,
            chatbotId: group.chatbotId,
            ...where.AND.reduce((acc, condition) => ({ ...acc, ...condition }), {}),
          },
          include: {
            user: { select: { id: true, name: true, email: true, isAnonymous: true } },
            chatbot: { select: { id: true, slug: true, name: true, primaryColor: true, logoUrl: true } }, // NEW: Include slug
          },
          orderBy: { createdAt: 'desc' },
        });

        const session = await prisma.session.findFirst({
          where: {
            userId: group.userId,
            chatbotId: group.chatbotId,
            endedAt: null,
          },
        });

        const latestMessage = messages[0];
        return {
          id: `${group.userId}-${group.chatbotId}`,
          userId: group.userId,
          userName: latestMessage.user.name || 'Anonymous',
          userEmail: latestMessage.user.email,
          isAnonymous: latestMessage.user.isAnonymous,
          chatbotId: group.chatbotId,
          chatbotSlug: latestMessage.chatbot.slug, // NEW: Include slug
          chatbotName: latestMessage.chatbot.name,
          chatbotLogo: latestMessage.chatbot.logoUrl,
          chatbotPrimaryColor: latestMessage.chatbot.primaryColor,
          lastMessage: latestMessage.question,
          messageCount: group._count.id,
          createdAt: group._max.createdAt,
          status: session ? 'active' : 'ended',
          messages: messages.map((msg) => ({
            id: msg.id.toString(),
            content: msg.question,
            sender: 'user',
            timestamp: msg.createdAt.toISOString(),
          })),
          botMessages: messages
            .filter((msg) => msg.answer)
            .map((msg) => ({
              id: `${msg.id}-bot`,
              content: msg.answer,
              sender: 'bot',
              timestamp: msg.createdAt.toISOString(),
            })),
        };
      })
    );

    const totalConversations = await prisma.conversation.count({
      where: user.role === 'ADMIN' ? {} : { chatbot: { ownerId: user.id } },
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todaysConversations = await prisma.conversation.count({
      where: {
        ...where.AND.reduce((acc, condition) => ({ ...acc, ...condition }), {}),
        createdAt: { gte: today },
      },
    });

    const activeUsers = await prisma.conversation.groupBy({
      by: ['userId'],
      where: user.role === 'ADMIN' ? {} : { chatbot: { ownerId: user.id } },
      _count: { userId: true },
    });

    console.log(`Fetched ${conversations.length} conversations for user ${user.id} (${user.role})`);
    res.json({
      conversations,
      stats: {
        totalConversations,
        todaysConversations,
        activeUsers: activeUsers.length,
      },
    });
  } catch (e) {
    console.error('Error in getConversations:', e.message, e.stack);
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.deleteConversation = async (req, res, next) => {
  try {
    const { userId, chatbotSlug } = req.params; // CHANGED: Use chatbotSlug
    const user = req.user;

    if (!userId || !chatbotSlug || isNaN(userId)) {
      return res.status(400).json({ message: 'Invalid or missing userId or chatbotSlug' });
    }

    const parsedUserId = parseInt(userId, 10);
    const bot = await prisma.chatbot.findUnique({
      where: { slug: chatbotSlug }, // CHANGED: Query by slug
      select: { id: true },
    });
    if (!bot) {
      return res.status(404).json({ message: 'Chatbot not found' });
    }

    const conversations = await prisma.conversation.findMany({
      where: { userId: parsedUserId, chatbotId: bot.id },
    });

    if (conversations.length === 0) {
      return res.status(404).json({ message: 'No conversations found for this user and chatbot' });
    }

    if (user.role !== 'ADMIN' && user.id !== parsedUserId) {
      return res.status(403).json({ message: 'Not authorized to delete these conversations' });
    }

    await prisma.conversation.deleteMany({
      where: { userId: parsedUserId, chatbotId: bot.id },
    });

    res.status(200).json({ message: 'Conversations deleted successfully' });
  } catch (e) {
    console.error('Error in deleteConversation:', e);
    next(e);
  }
};