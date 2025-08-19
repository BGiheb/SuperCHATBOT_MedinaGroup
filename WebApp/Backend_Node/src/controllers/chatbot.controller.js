const { PrismaClient } = require('@prisma/client');
const QRCode = require('qrcode');
const cloudinary = require('../config/cloudinary');
const fs = require('fs').promises;
const path = require('path');
const axios = require('axios');
const prisma = new PrismaClient();

// Ensure the uploads directory exists
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
    const { name, description, primaryColor } = req.body;
    if (!name) return res.status(400).json({ message: 'Name is required' });

    const sanitizedName = name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '_')
      .replace(/\s+/g, '_');

    await ensureUploadsDir();

    console.log('Uploaded files:', JSON.stringify(req.files, null, 2));

    let logoUrl = req.body.logoUrl || '🤖';
    let logoFilePath = null;
    if (req.files && req.files.logo && req.files.logo[0]) {
      logoFilePath = req.files.logo[0].path;
      console.log('Logo file path:', logoFilePath);

      try {
        await fs.access(logoFilePath);
        console.log('Logo file exists:', logoFilePath);
      } catch (err) {
        console.error('Logo file not found:', logoFilePath, err);
        throw new Error(`Logo file not found: ${logoFilePath}`);
      }

      const logoUpload = await cloudinary.uploader.upload(logoFilePath, {
        folder: 'chatbot_logos',
        resource_type: 'image',
      });
      logoUrl = logoUpload.secure_url;
      console.log('Logo uploaded to Cloudinary:', logoUrl);
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
    });

    const url = `${process.env.BASE_URL || 'http://localhost:4000'}/c/${bot.id}`;
    const qrDataUrl = await QRCode.toDataURL(url);

    let documents = [];
    let documentFilePaths = [];
    if (req.files && req.files.documents) {
      const documentFiles = Array.isArray(req.files.documents)
        ? req.files.documents
        : [req.files.documents];

      console.log('Document files:', documentFiles.length);

      documents = await Promise.all(
        documentFiles.map(async (file) => {
          const filePath = file.path;
          documentFilePaths.push(filePath);
          console.log('Processing document:', filePath);

          try {
            await fs.access(filePath);
            console.log('Document file exists:', filePath);
          } catch (err) {
            console.error('Document file not found:', filePath, err);
            throw new Error(`Document file not found: ${filePath}`);
          }

          const upload = await cloudinary.uploader.upload(filePath, {
            folder: `Uploads/${sanitizedName}+${bot.id}`,
            resource_type: 'auto',
          });
          console.log('Document uploaded to Cloudinary:', upload.secure_url);

          const fileType = path.extname(file.originalname).slice(1).toLowerCase();

          return {
            fileName: file.originalname,
            fileType,
            size: file.size,
            url: upload.secure_url,
            chatbotId: bot.id,
          };
        })
      );
    }

    const [updatedBot] = await prisma.$transaction([
      prisma.chatbot.update({
        where: { id: bot.id },
        data: { qrUrl: qrDataUrl },
        include: { documents: true },
      }),
      ...documents.map((doc) => prisma.document.create({ data: doc })),
    ]);

    // Call the Python endpoint to process documents
    if (documents.length > 0) {
      try {
        const pythonApiUrl = `${process.env.PYTHON_API_BASE_URL || 'http://127.0.0.1:8000'}/process/${bot.id}`;
        const response = await axios.post(pythonApiUrl);
        console.log(`Python API response for chatbot ${bot.id}:`, response.data);
      } catch (error) {
        console.error('Error calling Python API:', error.message);
        // Optionally, you can decide whether to fail the request or continue
        // Here, we continue but log the error
      }
    }

    // Clean up temporary files
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
    });
  } catch (e) {
    console.error('Error in createChatbot:', e.message, e.stack);
    next(e);
  }
};

exports.updateChatbot = async (req, res, next) => {
  try {
    console.log('updateChatbot function loaded with boolean fix v5');
    const id = parseInt(req.params.id, 10);
    if (!id || isNaN(id)) {
      return res.status(400).json({ message: 'Invalid or missing chatbot ID' });
    }

    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized: No user authenticated' });
    }

    const bot = await prisma.chatbot.findUnique({
      where: { id },
      include: { documents: true },
    });
    if (!bot) return res.status(404).json({ message: 'Chatbot not found' });
    if (req.user.role !== 'ADMIN' && bot.ownerId !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to update this chatbot' });
    }

    const { name, description, primaryColor, logoUrl, isActive } = req.body;
    const isActiveBoolean = isActive === 'true' || isActive === true;
    console.log('Request body:', req.body);
    console.log('isActive raw:', req.body.isActive, 'converted:', isActiveBoolean, 'type:', typeof isActiveBoolean);

    const sanitizedName = name
      ? name.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/\s+/g, '_')
      : bot.name.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/\s+/g, '_');

    await ensureUploadsDir();

    let newLogoUrl = logoUrl || bot.logoUrl || '🤖';
    let logoFilePath = null;
    if (req.files && req.files.logo && req.files.logo[0]) {
      logoFilePath = req.files.logo[0].path;
      console.log('Logo file path:', logoFilePath);
      try {
        await fs.access(logoFilePath);
        console.log('Logo file exists:', logoFilePath);
      } catch (err) {
        console.error('Logo file not found:', logoFilePath, err);
        throw new Error(`Logo file not found: ${logoFilePath}`);
      }
      const logoUpload = await cloudinary.uploader.upload(logoFilePath, {
        folder: 'chatbot_logos',
        resource_type: 'image',
      });
      newLogoUrl = logoUpload.secure_url;
      console.log('Logo uploaded to Cloudinary:', newLogoUrl);
    }

    let documents = [];
    let documentFilePaths = [];
    if (req.files && req.files.documents) {
      const documentFiles = Array.isArray(req.files.documents)
        ? req.files.documents
        : [req.files.documents];
      console.log('Document files:', documentFiles.length);
      documents = await Promise.all(
        documentFiles.map(async (file) => {
          const filePath = file.path;
          documentFilePaths.push(filePath);
          console.log('Processing document:', filePath);
          try {
            await fs.access(filePath);
            console.log('Document file exists:', filePath);
          } catch (err) {
            console.error('Document file not found:', filePath, err);
            throw new Error(`Document file not found: ${filePath}`);
          }
          const upload = await cloudinary.uploader.upload(filePath, {
            folder: `Uploads/${sanitizedName}+${id}`,
            resource_type: 'auto',
          });
          console.log('Document uploaded to Cloudinary:', upload.secure_url);
          const fileType = path.extname(file.originalname).slice(1).toLowerCase();
          return {
            fileName: file.originalname,
            fileType,
            size: file.size,
            url: upload.secure_url,
            chatbotId: id,
          };
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

    console.log('Prisma update data:', updateData);
    console.log('Has changes:', hasChanges);

    const [updatedBot] = await prisma.$transaction([
      prisma.chatbot.update({
        where: { id },
        data: updateData,
        include: { documents: true },
      }),
      ...documents.map((doc) => prisma.document.create({ data: doc })),
    ]);

    // Call the Python endpoint to process documents
    if (documents.length > 0) {
      try {
        const pythonApiUrl = `${process.env.PYTHON_API_BASE_URL || 'http://127.0.0.1:8000'}/process/${id}`;
        const response = await axios.post(pythonApiUrl);
        console.log(`Python API response for chatbot ${id}:`, response.data);
      } catch (error) {
        console.error('Error calling Python API:', error.message);
        // Continue despite error, as in createChatbot
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
      console.error('Invalid chatbot ID:', req.params.id);
      return res.status(400).json({ message: 'Invalid or missing chatbot ID' });
    }

    const bot = await prisma.chatbot.findUnique({
      where: { id, isActive: true },
      include: { documents: true },
    });

    if (!bot) {
      console.error(`Chatbot not found or inactive for ID: ${id}`);
      return res.status(404).json({ message: 'Chatbot not found or inactive' });
    }

    // Log QR scan
    let userId = null;
    if (req.user) {
      userId = req.user.id;
      console.log(`Authenticated user: ${req.user.id}, role: ${req.user.role}, ownerId: ${bot.ownerId}`);
    } else {
      const anonymousUser = await prisma.user.create({
        data: {
          isAnonymous: true,
          name: `Anonymous_${Date.now()}`,
          role: 'USER',
        },
      });
      userId = anonymousUser.id;
      console.log(`Created anonymous user: ${userId}`);
    }

    await prisma.qRScan.create({
      data: {
        chatbotId: id,
        userId: userId,
        scannedAt: new Date(),
      },
    });

    const response = {
      id: bot.id,
      name: bot.name,
      description: bot.description,
      logo: bot.logoUrl || '🤖',
      primaryColor: bot.primaryColor || '#3b82f6',
      isActive: bot.isActive,
      userId,
      documentsCount: bot.documents.length,
      documents: bot.documents, // Include documents for all requests
    };

    console.log(`Returning chatbot ${id} with ${bot.documents.length} documents:`, bot.documents);
    res.json(response);
  } catch (e) {
    console.error('Error in getChatbot:', e.message, e.stack);
    res.status(500).json({ message: 'Internal server error' });
  }
};
exports.getChatbotForEdit = async (req, res, next) => {
  try {
    const id = req.params.id ? parseInt(req.params.id, 10) : null;
    if (!id || isNaN(id)) {
      console.error('Invalid chatbot ID:', req.params.id);
      return res.status(400).json({ message: 'Invalid or missing chatbot ID' });
    }

    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized: No user authenticated' });
    }

    const bot = await prisma.chatbot.findUnique({
      where: { id },
      include: { documents: true },
    });

    if (!bot) {
      console.error(`Chatbot not found for ID: ${id}`);
      return res.status(404).json({ message: 'Chatbot not found' });
    }

    if (req.user.role !== 'ADMIN' && bot.ownerId !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to edit this chatbot' });
    }

    const response = {
      id: bot.id,
      name: bot.name,
      description: bot.description,
      logo: bot.logoUrl || '🤖',
      primaryColor: bot.primaryColor || '#3b82f6',
      isActive: bot.isActive,
      documentsCount: bot.documents.length,
      documents: bot.documents,
    };

    console.log(`Returning chatbot ${id} for editing with ${bot.documents.length} documents:`, bot.documents);
    res.json(response);
  } catch (e) {
    console.error('Error in getChatbotForEdit:', e.message, e.stack);
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.listMyChatbots = async (req, res, next) => {
  try {
    const bots = await prisma.chatbot.findMany({
      where: { ownerId: req.user.id },
      include: { documents: true },
    });
    res.json(
      bots.map((bot) => ({
        ...bot,
        logo: bot.logoUrl || '🤖',
        primaryColor: bot.primaryColor || '#3b82f6',
        documentsCount: bot.documents.length,
      }))
    );
  } catch (e) {
    console.error('Error in listMyChatbots:', e);
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
        documents: {
          select: {
            id: true,
          },
        },
      },
    });

    const resChatbots = chatbots.map((bot) => ({
      ...bot,
      logo: bot.logoUrl || '🤖',
      primaryColor: bot.primaryColor || '#3b82f6',
      documentsCount: bot.documents.length,
    }));

    res.json(resChatbots);
  } catch (e) {
    console.error('Error in getQRCodes:', e);
    next(e);
  }
};
exports.listMyChatbots = async (req, res, next) => {
  try {
    const bots = await prisma.chatbot.findMany({
      where: { ownerId: req.user.id },
      include: { documents: true },
    });
    res.json(
      bots.map((bot) => ({
        ...bot,
        logo: bot.logoUrl || '🤖',
        primaryColor: bot.primaryColor || '#3b82f6',
        documentsCount: bot.documents.length,
      }))
    );
  } catch (e) {
    console.error('Error in listMyChatbots:', e);
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
        documents: {
          select: {
            id: true,
          },
        },
      },
    });

    const resChatbots = chatbots.map((bot) => ({
      ...bot,
      logo: bot.logoUrl || '🤖',
      primaryColor: bot.primaryColor || '#3b82f6',
      documentsCount: bot.documents.length,
    }));

    res.json(resChatbots);
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
    const bot = await prisma.chatbot.findUnique({ where: { id } });
    if (!bot) return res.status(404).json({ message: 'Chatbot not found' });
    if (req.user.role !== 'ADMIN' && bot.ownerId !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to regenerate this QR code' });
    }

    const url = `${process.env.BASE_URL || 'http://localhost:4000'}/c/${bot.id}`;
    const qrDataUrl = await QRCode.toDataURL(url);

    const updated = await prisma.chatbot.update({
      where: { id },
      data: { qrUrl: qrDataUrl },
      include: { documents: true },
    });

    res.json({
      ...updated,
      logo: updated.logoUrl || '🤖',
      primaryColor: updated.primaryColor || '#3b82f6',
      documentsCount: updated.documents?.length || 0,
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
    if (bot.ownerId !== req.user.id && req.user.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Not authorized to upload documents for this bot' });
    }

    if (!req.files || !req.files.documents) {
      return res.status(400).json({ message: 'No files uploaded' });
    }

    // Sanitize chatbot name for folder structure
    const sanitizedName = bot.name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '_')
      .replace(/\s+/g, '_');

    // Ensure uploads directory exists
    await ensureUploadsDir();

    const documentFiles = Array.isArray(req.files.documents)
      ? req.files.documents
      : [req.files.documents];

    console.log('Uploading documents:', documentFiles.length);

    const documentFilePaths = [];
    const docsData = await Promise.all(
      documentFiles.map(async (file) => {
        const filePath = file.path;
        documentFilePaths.push(filePath);
        console.log('Processing document:', filePath);

        // Verify file exists
        try {
          await fs.access(filePath);
          console.log('Document file exists:', filePath);
        } catch (err) {
          console.error('Document file not found:', filePath, err);
          throw new Error(`Document file not found: ${filePath}`);
        }

        const upload = await cloudinary.uploader.upload(filePath, {
          folder: `Uploads/${sanitizedName}+${chatbotId}`,
          resource_type: 'auto',
        });
        console.log('Document uploaded to Cloudinary:', upload.secure_url);

        // Extract fileType as the extension without the leading dot (e.g., 'pdf', 'docx')
        const fileType = path.extname(file.originalname).slice(1).toLowerCase();

        return {
          fileName: file.originalname,
          fileType,
          size: file.size,
          url: upload.secure_url,
          chatbotId,
        };
      })
    );

    const created = await prisma.$transaction(
      docsData.map((doc) => prisma.document.create({ data: doc }))
    );

    // Fetch updated chatbot to get accurate documentsCount
    const updatedBot = await prisma.chatbot.findUnique({
      where: { id: chatbotId },
      include: { documents: true },
    });

    res.status(201).json({
      documents: created,
      documentsCount: updatedBot.documents.length,
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
    });
    if (!bot) {
      return res.status(404).json({ message: 'Chatbot not found or inactive' });
    }

    const { content, userId } = req.body;
    if (!content || typeof content !== 'string') {
      return res.status(400).json({ message: 'Message content is required' });
    }

    // Use provided userId or create anonymous user
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

    // Verify user exists
    const user = await prisma.user.findUnique({ where: { id: finalUserId } });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Create or update session
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

    // Call Python API to get the answer using POST with query parameter
    let answer;
    try {
      const encodedQuestion = encodeURIComponent(content.trim());
      const pythonApiUrl = `${
        process.env.PYTHON_API_BASE_URL || 'http://127.0.0.1:8000'
      }/ask/${chatbotId}?question=${encodedQuestion}`;
      console.log(`Calling Python API (POST): ${pythonApiUrl}`);

      const response = await axios.post(pythonApiUrl, {}, {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      });
      answer = response.data.answer || 'No response from AI.';
      console.log(`Python API response for chatbot ${chatbotId}:`, response.data);
    } catch (error) {
      console.error('Error calling Python API (POST):', error.message, error.response?.status, error.response?.data);
      answer = 'Sorry, I encountered an error while processing your request.';
    }

    // Store conversation (question and answer)
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
    });
    if (!bot) return res.status(404).json({ message: 'Chatbot not found' });
    if (req.user.role !== 'ADMIN' && bot.ownerId !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to view statistics' });
    }

    const stats = await prisma.conversation.groupBy({
      by: ['chatbotId'],
      where: { chatbotId: id },
      _count: {
        id: true,
      },
      _max: {
        createdAt: true,
      },
      _min: {
        createdAt: true,
      },
    });

    const userCount = await prisma.conversation.groupBy({
      by: ['userId'],
      where: { chatbotId: id },
      _count: {
        userId: true,
      },
    });

    const anonymousUserCount = await prisma.conversation.groupBy({
      by: ['userId'],
      where: {
        chatbotId: id,
        user: { isAnonymous: true },
      },
      _count: {
        userId: true,
      },
    });

    res.json({
      chatbotId: id,
      totalConversations: stats[0]?._count.id || 0,
      uniqueUsers: userCount.length,
      anonymousUsers: anonymousUserCount.length,
      lastConversation: stats[0]?._max.createdAt || null,
      firstConversation: stats[0]?._min.createdAt || null,
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

    res.json(conversations);
  } catch (e) {
    console.error('Error in getConversations:', e);
    next(e);
  }
};
// Update getChatbotStats for consistency
exports.getChatbotStats = async (req, res, next) => {
  try {
    const id = req.params.id ? parseInt(req.params.id, 10) : null;
    if (!id || isNaN(id)) {
      return res.status(400).json({ message: 'Invalid or missing chatbot ID' });
    }

    const bot = await prisma.chatbot.findUnique({ where: { id } });
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
    });
  } catch (e) {
    console.error('Error in getChatbotStats:', e);
    next(e);
  }
};
exports.getUserStats = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;

    // Fetch chatbots owned by the user (or all if admin)
    const where = userRole === 'ADMIN' ? {} : { ownerId: userId };
    const chatbots = await prisma.chatbot.findMany({ where, select: { id: true } });
    const chatbotIds = chatbots.map((bot) => bot.id);

    // Total Messages
    const conversationStats = await prisma.conversation.groupBy({
      by: ['chatbotId'],
      where: { chatbotId: { in: chatbotIds } },
      _count: { id: true },
    });
    const totalMessages = conversationStats.reduce((sum, stat) => sum + (stat._count.id || 0), 0);

    // Previous period for trend (e.g., last 30 days)
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

    // Active Sessions (sessions with no endedAt in last 24 hours)
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const activeSessions = await prisma.session.count({
      where: {
        chatbotId: { in: chatbotIds },
        endedAt: null,
        startedAt: { gte: twentyFourHoursAgo },
      },
    });
    const prevActiveSessions = await prisma.session.count({
      where: {
        chatbotId: { in: chatbotIds },
        endedAt: null,
        startedAt: {
          gte: new Date(thirtyDaysAgo - 24 * 60 * 60 * 1000),
          lt: twentyFourHoursAgo,
        },
      },
    });
    const sessionsTrend = prevActiveSessions > 0 ? ((activeSessions - prevActiveSessions) / prevActiveSessions * 100).toFixed(1) : '0.0';

    // QR Scans
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

    // Find the active session for the user and chatbot
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

    // Update the session to set endedAt
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