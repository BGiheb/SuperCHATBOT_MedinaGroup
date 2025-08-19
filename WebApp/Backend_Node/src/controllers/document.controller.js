const { PrismaClient } = require('@prisma/client');
const cloudinary = require('../config/cloudinary');
const path = require('path');
const fs = require('fs').promises;
const prisma = new PrismaClient();
const axios = require('axios');

exports.getDocumentsByChatbot = async (req, res, next) => {
  try {
    const chatbotId = parseInt(req.query.chatbotId, 10);
    if (isNaN(chatbotId)) {
      return res.status(400).json({ message: 'Invalid chatbotId' });
    }

    const chatbot = await prisma.chatbot.findFirst({
      where: { id: chatbotId, ownerId: req.user.id },
    });
    if (!chatbot) {
      return res.status(403).json({ message: 'Unauthorized or chatbot not found' });
    }

    const documents = await prisma.document.findMany({
      where: { chatbotId },
      select: {
        id: true,
        fileName: true,
        fileType: true,
        size: true,
        url: true,
        createdAt: true,
      },
    });

    console.log(`Fetched ${documents.length} documents for chatbot ${chatbotId}`);
    return res.status(200).json(documents);
  } catch (error) {
    console.error('Error fetching documents:', error.message, error.stack);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

exports.uploadDocument = async (req, res, next) => {
  try {
    const { chatbotId } = req.body;
    if (!chatbotId || isNaN(parseInt(chatbotId))) {
      return res.status(400).json({ message: 'Invalid chatbotId' });
    }

    const chatbot = await prisma.chatbot.findFirst({
      where: { id: parseInt(chatbotId), ownerId: req.user.id },
      include: { documents: true },
    });
    if (!chatbot) {
      return res.status(403).json({ message: 'Unauthorized or chatbot not found' });
    }

    const file = req.file;
    if (!file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    console.log('Processing document:', {
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      path: file.path,
    });

    try {
      await fs.access(file.path);
      console.log('Document file exists:', file.path);
    } catch (err) {
      console.error('Document file not found:', file.path, err);
      throw new Error(`Document file not found: ${file.path}`);
    }

    const sanitizedName = chatbot.name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '_')
      .replace(/\s+/g, '_');

    let upload;
    try {
      upload = await cloudinary.uploader.upload(file.path, {
        folder: `Uploads/${sanitizedName}+${chatbotId}`,
        resource_type: 'auto',
      });
      console.log('Document uploaded to Cloudinary:', upload.secure_url);
    } catch (cloudinaryError) {
      console.error('Cloudinary upload failed:', cloudinaryError.message, cloudinaryError.stack);
      throw new Error(`Cloudinary upload failed: ${cloudinaryError.message}`);
    }

    const fileType = path.extname(file.originalname).slice(1).toLowerCase();

    const document = await prisma.document.create({
      data: {
        fileName: file.originalname,
        fileType,
        size: file.size,
        url: upload.secure_url,
        chatbotId: parseInt(chatbotId),
      },
    });

    // Call the Python endpoint to process the document
    try {
      const pythonApiUrl = `${process.env.PYTHON_API_BASE_URL || 'http://127.0.0.1:8000'}/process/${chatbotId}`;
      const response = await axios.post(pythonApiUrl);
      console.log(`Python API response for chatbot ${chatbotId}:`, response.data);
    } catch (error) {
      console.error('Error calling Python API:', error.message);
      // Continue despite error, as in createChatbot and updateChatbot
    }

    // Clean up temporary file
    await fs.unlink(file.path).catch((err) => console.error('Error deleting document file:', err));

    console.log(`Uploaded document ${document.id} for chatbot ${chatbotId} with fileType: ${fileType}`);
    res.status(201).json({
      ...document,
      documentsCount: chatbot.documents.length + 1,
    });
  } catch (e) {
    console.error('Error uploading document:', e.message, e.stack);
    return res.status(500).json({ message: e.message || 'Server error' });
  }
};

exports.replaceDocument = async (req, res, next) => {
  try {
    const { id } = req.params;
    const file = req.file;
    if (!file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const document = await prisma.document.findFirst({
      where: { id: parseInt(id) },
      include: { chatbot: { include: { documents: true } } },
    });
    if (!document || document.chatbot.ownerId !== req.user.id) {
      return res.status(403).json({ message: 'Unauthorized or document not found' });
    }

    try {
      await fs.access(file.path);
      console.log('Document file exists:', file.path);
    } catch (err) {
      console.error('Document file not found:', file.path, err);
      throw new Error(`Document file not found: ${file.path}`);
    }

    const sanitizedName = document.chatbot.name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '_')
      .replace(/\s+/g, '_');

    const publicId = document.url.split('/').pop().split('.')[0];
    await cloudinary.uploader.destroy(`Uploads/${sanitizedName}+${document.chatbotId}/${publicId}`);

    let upload;
    try {
      upload = await cloudinary.uploader.upload(file.path, {
        folder: `Uploads/${sanitizedName}+${document.chatbotId}`,
        resource_type: 'auto',
      });
      console.log('Document uploaded to Cloudinary:', upload.secure_url);
    } catch (cloudinaryError) {
      console.error('Cloudinary upload failed:', cloudinaryError.message, cloudinaryError.stack);
      throw new Error(`Cloudinary upload failed: ${cloudinaryError.message}`);
    }

    const fileType = path.extname(file.originalname).slice(1).toLowerCase();

    const updatedDocument = await prisma.document.update({
      where: { id: parseInt(id) },
      data: {
        fileName: file.originalname,
        fileType,
        size: file.size,
        url: upload.secure_url,
        createdAt: new Date(),
      },
    });

    // Call the Python endpoint to process the document
    try {
      const pythonApiUrl = `${process.env.PYTHON_API_BASE_URL || 'http://127.0.0.1:8000'}/process/${document.chatbotId}`;
      const response = await axios.post(pythonApiUrl);
      console.log(`Python API response for chatbot ${document.chatbotId}:`, response.data);
    } catch (error) {
      console.error('Error calling Python API:', error.message);
      // Continue despite error
    }

    // Clean up temporary file
    await fs.unlink(file.path).catch((err) => console.error('Error deleting document file:', err));

    console.log(`Replaced document ${id} with fileType: ${fileType}`);
    res.status(200).json({
      ...updatedDocument,
      documentsCount: document.chatbot.documents.length,
    });
  } catch (e) {
    console.error('Error replacing document:', e.message, e.stack);
    return res.status(500).json({ message: e.message || 'Server error' });
  }
};

exports.deleteDocument = async (req, res, next) => {
  try {
    const { id } = req.params;
    console.log(`Attempting to delete document with id: ${id}`);

    const result = await prisma.$transaction(async (tx) => {
      // Fetch document and verify ownership
      const document = await tx.document.findFirst({
        where: { id: parseInt(id) },
        include: { chatbot: true },
      });
      if (!document) {
        throw new Error('Document not found');
      }
      if (document.chatbot.ownerId !== req.user.id && req.user.role !== 'ADMIN') {
        throw new Error('Unauthorized: You do not have permission to delete this document');
      }

      // Delete from database
      await tx.document.delete({
        where: { id: parseInt(id) },
      });

      // Call Python API to reprocess documents
      try {
        const pythonApiUrl = `${process.env.PYTHON_API_BASE_URL || 'http://127.0.0.1:8000'}/process-documents`;
        const response = await axios.post(pythonApiUrl, { chatbot_id: document.chatbotId }, {
          headers: { 'Content-Type': 'application/json' },
        });
        console.log(`Python API response for chatbot ${document.chatbotId}:`, response.data);
      } catch (pythonError) {
        console.error(`Error calling Python API for chatbot ${document.chatbotId}:`, pythonError.message);
        // Log error but continue to allow deletion
      }

      return document;
    });

    console.log(`Successfully deleted document ${id}`);
    res.status(204).send();
  } catch (e) {
    console.error('Error deleting document:', e.message, e.stack);
    if (e.message.includes('Unauthorized') || e.message.includes('Document not found')) {
      return res.status(403).json({ message: e.message });
    }
    if (e.code === 'P2025') {
      return res.status(404).json({ message: 'Document not found for deletion' });
    }
    return res.status(500).json({ message: e.message || 'Internal server error' });
  }
};

exports.downloadDocument = async (req, res, next) => {
  try {
    const { id } = req.params;
    const document = await prisma.document.findFirst({
      where: { id: parseInt(id) },
      include: { chatbot: { include: { documents: true } } },
    });
    if (!document || document.chatbot.ownerId !== req.user.id) {
      return res.status(403).json({ message: 'Unauthorized or document not found' });
    }

    res.status(200).json({
      url: document.url,
      documentsCount: document.chatbot.documents.length,
    });
  } catch (e) {
    console.error('Error downloading document:', e.message, e.stack);
    return res.status(500).json({ message: e.message || 'Server error' });
  }
};