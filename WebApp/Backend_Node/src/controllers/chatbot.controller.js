const { PrismaClient } = require('@prisma/client');
const QRCode = require('qrcode');
const cloudinary = require('../config/cloudinary');
const fs = require('fs').promises;
const path = require('path');
const axios = require('axios');
const prisma = new PrismaClient();

const ensureUploadsDir = async () => {
  const uploadDir = path.join(__dirname, '..', 'Uploads');
  try {
    await fs.mkdir(uploadDir, { recursive: true });
    await fs.chmod(uploadDir, 0o755);
    console.log(`Uploads directory ensured at: ${uploadDir}`);
  } catch (err) {
    console.error('Error creating uploads directory:', err);
    throw new Error('Failed to create uploads directory');
  }
};

exports.createChatbot = async (req, res, next) => {
  try {
    if (!['ADMIN', 'SUB_ADMIN'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Forbidden: Admin or Sub-Admin access required' });
    }
    const { name, description, primaryColor } = req.body;
    if (!name) return res.status(400).json({ message: 'Name is required' });

    const sanitizedName = name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '_')
      .replace(/\s+/g, '_');

    await ensureUploadsDir();

    let logoUrl = req.body.logoUrl || '🤖';
    let logoFilePath = null;
    if (req.files && req.files.logo && req.files.logo[0]) {
      logoFilePath = req.files.logo[0].path;
      try {
        await fs.access(logoFilePath);
        const logoUpload = await cloudinary.uploader.upload(logoFilePath, {
          folder: 'chatbot_logos',
          resource_type: 'image',
        });
        logoUrl = logoUpload.secure_url;
      } catch (err) {
        console.error('Logo file error:', err);
        throw new Error(`Logo file not found: ${logoFilePath}`);
      }
    }

    const bot = await prisma.chatbot.create({
      data: {
        name,
        description,
        logoUrl,
        primaryColor,
        ownerId: req.user.id,
        isActive: true,
      },
      include: { owner: { select: { name: true } } }, // Inclure le nom du créateur
    });

    const url = `${process.env.BASE_URL || 'http://localhost:4000'}/c/${bot.id}`;
    const qrDataUrl = await QRCode.toDataURL(url);

    let documents = [];
    let documentFilePaths = [];
    if (req.files && req.files.documents) {
      const documentFiles = Array.isArray(req.files.documents)
        ? req.files.documents
        : [req.files.documents];

      documents = await Promise.all(
        documentFiles.map(async (file) => {
          const filePath = file.path;
          documentFilePaths.push(filePath);
          try {
            await fs.access(filePath);
            const upload = await cloudinary.uploader.upload(filePath, {
              folder: `Uploads/${sanitizedName}+${bot.id}`,
              resource_type: 'auto',
            });
            const fileType = path.extname(file.originalname).slice(1).toLowerCase();
            return {
              fileName: file.originalname,
              fileType,
              size: file.size,
              url: upload.secure_url,
              chatbotId: bot.id,
            };
          } catch (err) {
            console.error('Document file error:', err);
            throw new Error(`Document file not found: ${filePath}`);
          }
        })
      );
    }

    const [updatedBot] = await prisma.$transaction([
      prisma.chatbot.update({
        where: { id: bot.id },
        data: { qrUrl: qrDataUrl },
        include: { documents: true, owner: { select: { name: true } } },
      }),
      ...documents.map((doc) => prisma.document.create({ data: doc })),
    ]);

    if (documents.length > 0) {
      try {
        const pythonApiUrl = `${process.env.PYTHON_API_BASE_URL || 'http://127.0.0.1:8000'}/process/${bot.id}`;
        const response = await axios.post(pythonApiUrl);
        console.log(`Python API response for chatbot ${bot.id}:`, response.data);
      } catch (error) {
        console.error('Error calling Python API:', error.message);
      }
    }

    if (logoFilePath) {
      await fs.unlink(logoFilePath).catch((err) => console.error('Error deleting logo file:', err));
    }
    for (const filePath of documentFilePaths) {
      await fs.unlink(filePath).catch((err) => console.error('Error deleting document file:', err));
    }

    res.status(201).json({
      ...updatedBot,
      logo: updatedBot.logoUrl || '🤖',
      primaryColor: updatedBot.primaryColor || '#3b82f6',
      documentsCount: updatedBot.documents.length,
      createdBy: updatedBot.owner?.name || 'Unknown',
    });
  } catch (e) {
    console.error('Error in createChatbot:', e.message, e.stack);
    next(e);
  }
};

exports.updateChatbot = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id || isNaN(id)) {
      return res.status(400).json({ message: 'Invalid or missing chatbot ID' });
    }

    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized: No user authenticated' });
    }

    const bot = await prisma.chatbot.findUnique({
      where: { id },
      include: { documents: true, owner: { select: { name: true } } },
    });
    if (!bot) return res.status(404).json({ message: 'Chatbot not found' });
    if (req.user.role !== 'ADMIN' && bot.ownerId !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to update this chatbot' });
    }

    const { name, description, primaryColor, logoUrl, isActive } = req.body;
    const isActiveBoolean = isActive === 'true' || isActive === true;

    const sanitizedName = name
      ? name.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/\s+/g, '_')
      : bot.name.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/\s+/g, '_');

    await ensureUploadsDir();

    let newLogoUrl = logoUrl || bot.logoUrl || '🤖';
    let logoFilePath = null;
    if (req.files && req.files.logo && req.files.logo[0]) {
      logoFilePath = req.files.logo[0].path;
      try {
        await fs.access(logoFilePath);
        const logoUpload = await cloudinary.uploader.upload(logoFilePath, {
          folder: 'chatbot_logos',
          resource_type: 'image',
        });
        newLogoUrl = logoUpload.secure_url;
      } catch (err) {
        console.error('Logo file error:', err);
        throw new Error(`Logo file not found: ${logoFilePath}`);
      }
    }

    let documents = [];
    let documentFilePaths = [];
    if (req.files && req.files.documents) {
      const documentFiles = Array.isArray(req.files.documents)
        ? req.files.documents
        : [req.files.documents];
      documents = await Promise.all(
        documentFiles.map(async (file) => {
          const filePath = file.path;
          documentFilePaths.push(filePath);
          try {
            await fs.access(filePath);
            const upload = await cloudinary.uploader.upload(filePath, {
              folder: `Uploads/${sanitizedName}+${id}`,
              resource_type: 'auto',
            });
            const fileType = path.extname(file.originalname).slice(1).toLowerCase();
            return {
              fileName: file.originalname,
              fileType,
              size: file.size,
              url: upload.secure_url,
              chatbotId: id,
            };
          } catch (err) {
            console.error('Document file error:', err);
            throw new Error(`Document file not found: ${filePath}`);
          }
        })
      );
    }

    const updateData = {
      name: name || bot.name,
      description: description !== undefined ? description : bot.description,
      logoUrl: newLogoUrl,
      primaryColor: primaryColor || bot.primaryColor,
      isActive: isActiveBoolean !== undefined ? isActiveBoolean : bot.isActive,
    };

    const hasChanges =
      updateData.name !== bot.name ||
      updateData.description !== bot.description ||
      updateData.logoUrl !== bot.logoUrl ||
      updateData.primaryColor !== bot.primaryColor ||
      updateData.isActive !== bot.isActive ||
      documents.length > 0;

    const [updatedBot] = await prisma.$transaction([
      prisma.chatbot.update({
        where: { id },
        data: updateData,
        include: { documents: true, owner: { select: { name: true } } },
      }),
      ...documents.map((doc) => prisma.document.create({ data: doc })),
    ]);

    if (documents.length > 0) {
      try {
        const pythonApiUrl = `${process.env.PYTHON_API_BASE_URL || 'http://127.0.0.1:8000'}/process/${id}`;
        const response = await axios.post(pythonApiUrl);
        console.log(`Python API response for chatbot ${id}:`, response.data);
      } catch (error) {
        console.error('Error calling Python API:', error.message);
      }
    }

    if (logoFilePath) {
      await fs.unlink(logoFilePath).catch((err) => console.error('Error deleting logo file:', err));
    }
    for (const filePath of documentFilePaths) {
      await fs.unlink(filePath).catch((err) => console.error('Error deleting document file:', err));
    }

    res.status(200).json({
      ...updatedBot,
      logo: updatedBot.logoUrl || '🤖',
      primaryColor: updatedBot.primaryColor || '#3b82f6',
      documentsCount: updatedBot.documents.length,
      createdBy: updatedBot.owner?.name || 'Unknown',
      hasChanges,
    });
  } catch (e) {
    console.error('Error in updateChatbot:', e.message, e.stack);
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.getChatbot = async (req, res, next) => {
  try {
    const id = req.params.id ? parseInt(req.params.id, 10) : null;
    if (!id || isNaN(id)) {
      return res.status(400).json({ message: 'Invalid or missing chatbot ID' });
    }

    const bot = await prisma.chatbot.findUnique({
      where: { id, isActive: true },
      include: { documents: true, owner: { select: { name: true } } },
    });

    if (!bot) {
      return res.status(404).json({ message: 'Chatbot not found or inactive' });
    }

    let userId = null;
    if (req.user) {
      userId = req.user.id;
    } else {
      const anonymousUser = await prisma.user.create({
        data: {
          isAnonymous: true,
          name: `Anonymous_${Date.now()}`,
          role: 'USER',
        },
      });
      userId = anonymousUser.id;
    }

    await prisma.$transaction(async (tx) => {
      console.log(`Logging qRScan for chatbotId: ${id}, userId: ${userId}`);
      await tx.qRScan.create({
        data: {
          chatbotId: id,
          userId: userId,
          scannedAt: new Date(),
        },
      });

      await tx.chatbot.update({
        where: { id },
        data: {
          qrScanCount: { increment: 1 },
        },
      });
    });

    // Fetch conversation stats
    const conversationStats = await prisma.conversation.groupBy({
      by: ['chatbotId'],
      where: { chatbotId: id },
      _count: { id: true },
    });
    const conversationsCount = conversationStats[0]?._count.id || 0;

    res.json({
      id: bot.id,
      name: bot.name,
      description: bot.description,
      logo: bot.logoUrl || '🤖',
      primaryColor: bot.primaryColor || '#3b82f6',
      isActive: bot.isActive,
      userId,
      documentsCount: bot.documents.length,
      documents: bot.documents,
      qrScans: bot.qrScanCount,
      conversationsCount, // Added conversationsCount
      createdBy: bot.owner?.name || 'Unknown',
    });
  } catch (e) {
    console.error('Error in getChatbot:', e.message, e.stack);
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.getChatbotForEdit = async (req, res, next) => {
  try {
    const id = req.params.id ? parseInt(req.params.id, 10) : null;
    if (!id || isNaN(id)) {
      return res.status(400).json({ message: 'Invalid or missing chatbot ID' });
    }

    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized: No user authenticated' });
    }

    const bot = await prisma.chatbot.findUnique({
      where: { id },
      include: { documents: true, owner: { select: { name: true } } },
    });

    if (!bot) {
      return res.status(404).json({ message: 'Chatbot not found' });
    }

    if (req.user.role !== 'ADMIN' && bot.ownerId !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to edit this chatbot' });
    }

    // Fetch conversation stats
    const conversationStats = await prisma.conversation.groupBy({
      by: ['chatbotId'],
      where: { chatbotId: id },
      _count: { id: true },
    });
    const conversationsCount = conversationStats[0]?._count.id || 0;

    res.json({
      id: bot.id,
      name: bot.name,
      description: bot.description,
      logo: bot.logoUrl || '🤖',
      primaryColor: bot.primaryColor || '#3b82f6',
      isActive: bot.isActive,
      documentsCount: bot.documents.length,
      documents: bot.documents,
      conversationsCount, // Added conversationsCount
      createdBy: bot.owner?.name || 'Unknown',
    });
  } catch (e) {
    console.error('Error in getChatbotForEdit:', e.message, e.stack);
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.listMyChatbots = async (req, res, next) => {
  try {
    const where = req.user.role === 'ADMIN' ? {} : { ownerId: req.user.id };
    const bots = await prisma.chatbot.findMany({
      where,
      include: { documents: true, owner: { select: { name: true } } },
    });

    // Fetch conversation stats for all chatbots
    const conversationStats = await prisma.conversation.groupBy({
      by: ['chatbotId'],
      where: { chatbotId: { in: bots.map(bot => bot.id) } },
      _count: { id: true },
    });

    console.log(`Fetched ${bots.length} chatbots for userId: ${req.user.id}, role: ${req.user.role}`);
    console.log('Chatbot qrScanCounts:', bots.map(bot => ({ id: bot.id, qrScanCount: bot.qrScanCount })));

    res.json(
      bots.map((bot) => ({
        ...bot,
        logo: bot.logoUrl || '🤖',
        primaryColor: bot.primaryColor || '#3b82f6',
        documentsCount: bot.documents.length,
        qrScans: bot.qrScanCount || 0,
        conversationsCount: conversationStats.find(stat => stat.chatbotId === bot.id)?._count.id || 0, // Added conversationsCount
        createdBy: bot.owner?.name || 'Unknown',
      }))
    );
  } catch (e) {
    console.error('Error in listMyChatbots:', e.message, e.stack);
    next(e);
  }
};

exports.getQRCodes = async (req, res, next) => {
  try {
    if (!req.user || !req.user.id || !req.user.role) {
      return res.status(400).json({ message: 'Invalid user data in token' });
    }
    const where = req.user.role === 'ADMIN' ? {} : { ownerId: req.user.id };

    const chatbots = await prisma.chatbot.findMany({
      where,
      select: {
        id: true,
        name: true,
        qrUrl: true,
        logoUrl: true,
        primaryColor: true,
        isActive: true,
        description: true,
        createdAt: true,
        qrScanCount: true,
        documents: { select: { id: true } },
        owner: { select: { name: true } },
      },
    });

    // Fetch conversation stats for all chatbots
    const conversationStats = await prisma.conversation.groupBy({
      by: ['chatbotId'],
      where: { chatbotId: { in: chatbots.map(bot => bot.id) } },
      _count: { id: true },
    });

    res.json(
      chatbots.map((bot) => ({
        ...bot,
        logo: bot.logoUrl || '🤖',
        primaryColor: bot.primaryColor || '#3b82f6',
        documentsCount: bot.documents.length,
        qrScans: bot.qrScanCount || 0,
        conversationsCount: conversationStats.find(stat => stat.chatbotId === bot.id)?._count.id || 0, // Added conversationsCount
        createdBy: bot.owner?.name || 'Unknown',
      }))
    );
  } catch (e) {
    console.error('Error in getQRCodes:', e);
    next(e);
  }
};

exports.regenerateQRCode = async (req, res, next) => {
  try {
    const id = req.params.id ? parseInt(req.params.id, 10) : null;
    if (!id || isNaN(id)) {
      return res.status(400).json({ message: 'Invalid or missing chatbot ID' });
    }
    const bot = await prisma.chatbot.findUnique({
      where: { id },
      include: { owner: { select: { name: true } } },
    });
    if (!bot) return res.status(404).json({ message: 'Chatbot not found' });
    if (req.user.role !== 'ADMIN' && bot.ownerId !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to regenerate this QR code' });
    }

    const url = `${process.env.BASE_URL || 'http://localhost:4000'}/c/${bot.id}`;
    const qrDataUrl = await QRCode.toDataURL(url);

    const updated = await prisma.chatbot.update({
      where: { id },
      data: { qrUrl: qrDataUrl },
      include: { documents: true, owner: { select: { name: true } } },
    });

    // Fetch conversation stats
    const conversationStats = await prisma.conversation.groupBy({
      by: ['chatbotId'],
      where: { chatbotId: id },
      _count: { id: true },
    });
    const conversationsCount = conversationStats[0]?._count.id || 0;

    res.json({
      ...updated,
      logo: updated.logoUrl || '🤖',
      primaryColor: updated.primaryColor || '#3b82f6',
      documentsCount: updated.documents?.length || 0,
      conversationsCount, // Added conversationsCount
      createdBy: updated.owner?.name || 'Unknown',
    });
  } catch (e) {
    console.error('Error in regenerateQRCode:', e);
    next(e);
  }
};

exports.uploadDocuments = async (req, res, next) => {
  try {
    const chatbotId = parseInt(req.params.id, 10);
    const bot = await prisma.chatbot.findUnique({ where: { id: chatbotId } });
    if (!bot) return res.status(404).json({ message: 'Chatbot not found' });
    if (req.user.role !== 'ADMIN' && bot.ownerId !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to upload documents for this bot' });
    }

    if (!req.files || !req.files.documents) {
      return res.status(400).json({ message: 'No files uploaded' });
    }

    const sanitizedName = bot.name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '_')
      .replace(/\s+/g, '_');

    await ensureUploadsDir();

    const documentFiles = Array.isArray(req.files.documents)
      ? req.files.documents
      : [req.files.documents];

    const documentFilePaths = [];
    const docsData = await Promise.all(
      documentFiles.map(async (file) => {
        const filePath = file.path;
        documentFilePaths.push(filePath);
        try {
          await fs.access(filePath);
          const upload = await cloudinary.uploader.upload(filePath, {
            folder: `Uploads/${sanitizedName}+${chatbotId}`,
            resource_type: 'auto',
          });
          const fileType = path.extname(file.originalname).slice(1).toLowerCase();
          return {
            fileName: file.originalname,
            fileType,
            size: file.size,
            url: upload.secure_url,
            chatbotId,
          };
        } catch (err) {
          console.error('Document file error:', err);
          throw new Error(`Document file not found: ${filePath}`);
        }
      })
    );

    const created = await prisma.$transaction(
      docsData.map((doc) => prisma.document.create({ data: doc }))
    );

    const updatedBot = await prisma.chatbot.findUnique({
      where: { id: chatbotId },
      include: { documents: true, owner: { select: { name: true } } },
    });

    res.status(201).json({
      documents: created,
      documentsCount: updatedBot.documents.length,
      createdBy: updatedBot.owner?.name || 'Unknown',
    });
  } catch (e) {
    console.error('Error in uploadDocuments:', e.message, e.stack);
    next(e);
  }
};

exports.sendMessage = async (req, res, next) => {
  try {
    const chatbotId = parseInt(req.params.id, 10);
    if (!chatbotId || isNaN(chatbotId)) {
      return res.status(400).json({ message: 'Invalid or missing chatbot ID' });
    }

    const bot = await prisma.chatbot.findUnique({
      where: { id: chatbotId, isActive: true },
      include: { owner: { select: { name: true } } },
    });
    if (!bot) {
      return res.status(404).json({ message: 'Chatbot not found or inactive' });
    }

    const { content, userId } = req.body;
    if (!content || typeof content !== 'string') {
      return res.status(400).json({ message: 'Message content is required' });
    }

    let finalUserId = userId;
    if (!finalUserId && !req.user?.id) {
      const anonymousUser = await prisma.user.create({
        data: {
          isAnonymous: true,
          name: `Anonymous_${Date.now()}`,
          role: 'USER',
        },
      });
      finalUserId = anonymousUser.id;
    } else if (!finalUserId) {
      finalUserId = req.user.id;
    }

    const user = await prisma.user.findUnique({ where: { id: finalUserId } });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const existingSession = await prisma.session.findFirst({
      where: {
        userId: finalUserId,
        chatbotId,
        endedAt: null,
      },
    });
    if (!existingSession) {
      await prisma.session.create({
        data: {
          userId: finalUserId,
          chatbotId,
          startedAt: new Date(),
        },
      });
    }

    let answer;
    try {
      const encodedQuestion = encodeURIComponent(content.trim());
      const pythonApiUrl = `${
        process.env.PYTHON_API_BASE_URL || 'http://127.0.0.1:8000'
      }/ask/${chatbotId}?question=${encodedQuestion}`;
      const response = await axios.post(pythonApiUrl, {}, {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      });
      answer = response.data.answer || 'No response from AI.';
    } catch (error) {
      console.error('Error calling Python API:', error.message);
      answer = 'Sorry, I encountered an error while processing your request.';
    }

    const conversation = await prisma.conversation.create({
      data: {
        userId: finalUserId,
        chatbotId,
        question: content,
        answer,
      },
    });

    res.status(200).json({
      id: conversation.id.toString(),
      content: answer,
      sender: 'bot',
      timestamp: conversation.createdAt,
      userId: finalUserId,
      createdBy: bot.owner?.name || 'Unknown',
    });
  } catch (e) {
    console.error('Error in sendMessage:', e);
    next(e);
  }
};

exports.getChatbotStats = async (req, res, next) => {
  try {
    const id = req.params.id ? parseInt(req.params.id, 10) : null;
    if (!id || isNaN(id)) {
      return res.status(400).json({ message: 'Invalid or missing chatbot ID' });
    }

    const bot = await prisma.chatbot.findUnique({
      where: { id },
      include: { owner: { select: { name: true } } },
    });
    if (!bot) return res.status(404).json({ message: 'Chatbot not found' });
    if (req.user.role !== 'ADMIN' && bot.ownerId !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to view statistics' });
    }

    const conversationStats = await prisma.conversation.groupBy({
      by: ['chatbotId'],
      where: { chatbotId: id },
      _count: { id: true },
    });
    const totalMessages = conversationStats[0]?._count.id || 0;

    const prevConversationStats = await prisma.conversation.groupBy({
      by: ['chatbotId'],
      where: {
        chatbotId: id,
        createdAt: { lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
      },
      _count: { id: true },
    });
    const prevTotalMessages = prevConversationStats[0]?._count.id || 0;
    const messagesTrend = prevTotalMessages > 0 ? ((totalMessages - prevTotalMessages) / prevTotalMessages * 100).toFixed(1) : '0.0';

    const userCount = await prisma.conversation.groupBy({
      by: ['userId'],
      where: { chatbotId: id },
      _count: { userId: true },
    });

    const anonymousUserCount = await prisma.conversation.groupBy({
      by: ['userId'],
      where: {
        chatbotId: id,
        user: { isAnonymous: true },
      },
      _count: { userId: true },
    });

    const activeSessions = await prisma.session.count({
      where: {
        chatbotId: id,
        endedAt: null,
        startedAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
    });

    const qrScans = await prisma.qRScan.count({
      where: { chatbotId: id },
    });

    res.json({
      chatbotId: id,
      totalMessages,
      messagesTrend: `${totalMessages > prevTotalMessages ? '+' : ''}${messagesTrend}%`,
      messagesTrendUp: totalMessages > prevTotalMessages,
      uniqueUsers: userCount.length,
      anonymousUsers: anonymousUserCount.length,
      activeSessions,
      qrScans,
      createdBy: bot.owner?.name || 'Unknown',
    });
  } catch (e) {
    console.error('Error in getChatbotStats:', e);
    next(e);
  }
};

exports.getConversations = async (req, res, next) => {
  try {
    const chatbotId = parseInt(req.params.id, 10);
    const userId = parseInt(req.query.userId, 10);
    if (!chatbotId || isNaN(chatbotId) || !userId || isNaN(userId)) {
      return res.status(400).json({ message: 'Invalid or missing chatbot ID or user ID' });
    }

    const bot = await prisma.chatbot.findUnique({
      where: { id: chatbotId, isActive: true },
      include: { owner: { select: { name: true } } },
    });
    if (!bot) {
      return res.status(404).json({ message: 'Chatbot not found or inactive' });
    }

    const conversations = await prisma.conversation.findMany({
      where: {
        chatbotId,
        userId,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    res.json({
      conversations,
      createdBy: bot.owner?.name || 'Unknown',
    });
  } catch (e) {
    console.error('Error in getConversations:', e);
    next(e);
  }
};

exports.getUserStats = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;

    const where = userRole === 'ADMIN' ? {} : { ownerId: userId };
    const chatbots = await prisma.chatbot.findMany({
      where,
      select: { id: true },
      include: { owner: { select: { name: true } } },
    });
    const chatbotIds = chatbots.map((bot) => bot.id);

    const conversationStats = await prisma.conversation.groupBy({
      by: ['chatbotId'],
      where: { chatbotId: { in: chatbotIds } },
      _count: { id: true },
    });
    const totalMessages = conversationStats.reduce((sum, stat) => sum + (stat._count.id || 0), 0);

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const prevConversationStats = await prisma.conversation.groupBy({
      by: ['chatbotId'],
      where: {
        chatbotId: { in: chatbotIds },
        createdAt: { lt: thirtyDaysAgo },
      },
      _count: { id: true },
    });
    const prevTotalMessages = prevConversationStats.reduce((sum, stat) => sum + (stat._count.id || 0), 0);
    const messagesTrend = prevTotalMessages > 0 ? ((totalMessages - prevTotalMessages) / prevTotalMessages * 100).toFixed(1) : '0.0';

    const activeSessions = await prisma.session.count({
      where: {
        chatbotId: { in: chatbotIds },
        endedAt: null,
        startedAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
    });
    const prevActiveSessions = await prisma.session.count({
      where: {
        chatbotId: { in: chatbotIds },
        endedAt: null,
        startedAt: {
          gte: new Date(thirtyDaysAgo - 24 * 60 * 60 * 1000),
          lt: thirtyDaysAgo,
        },
      },
    });
    const sessionsTrend = prevActiveSessions > 0 ? ((activeSessions - prevActiveSessions) / prevActiveSessions * 100).toFixed(1) : '0.0';

    const qrScans = await prisma.qRScan.count({
      where: { chatbotId: { in: chatbotIds } },
    });
    const prevQrScans = await prisma.qRScan.count({
      where: {
        chatbotId: { in: chatbotIds },
        scannedAt: { lt: thirtyDaysAgo },
      },
    });
    const qrScansTrend = prevQrScans > 0 ? ((qrScans - prevQrScans) / prevQrScans * 100).toFixed(1) : '0.0';

    res.json({
      totalMessages,
      messagesTrend: `${totalMessages > prevTotalMessages ? '+' : ''}${messagesTrend}%`,
      messagesTrendUp: totalMessages > prevTotalMessages,
      activeSessions,
      sessionsTrend: `${activeSessions > prevActiveSessions ? '+' : ''}${sessionsTrend}%`,
      sessionsTrendUp: activeSessions > prevActiveSessions,
      qrScans,
      qrScansTrend: `${qrScans > prevQrScans ? '+' : ''}${qrScansTrend}%`,
      qrScansTrendUp: qrScans > prevQrScans,
      createdBy: chatbots[0]?.owner?.name || 'Unknown',
    });
  } catch (e) {
    console.error('Error in getUserStats:', e);
    next(e);
  }
};

exports.endSession = async (req, res, next) => {
  try {
    const { chatbotId, userId } = req.body;

    if (!chatbotId || !userId) {
      return res.status(400).json({ message: 'Chatbot ID and User ID are required' });
    }

    const session = await prisma.session.findFirst({
      where: {
        chatbotId: parseInt(chatbotId, 10),
        userId: parseInt(userId, 10),
        endedAt: null,
      },
    });

    if (!session) {
      return res.status(404).json({ message: 'No active session found' });
    }

    if (req.user.role !== 'ADMIN' && req.user.id !== parseInt(userId, 10)) {
      return res.status(403).json({ message: 'Not authorized to end this session' });
    }

    const updatedSession = await prisma.session.update({
      where: { id: session.id },
      data: { endedAt: new Date() },
    });

    res.status(200).json({ message: 'Session ended successfully', session: updatedSession });
  } catch (e) {
    console.error('Error in endSession:', e);
    next(e);
  }
};