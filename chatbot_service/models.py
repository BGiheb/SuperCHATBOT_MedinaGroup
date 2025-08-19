from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime
from db import Base

class Chatbot(Base):
    __tablename__ = "Chatbot"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    description = Column(String)
    documents = relationship("Document", back_populates="chatbot")

class Document(Base):
    __tablename__ = "Document"

    id = Column(Integer, primary_key=True, index=True)
    fileName = Column(String)
    fileType = Column(String)
    url = Column(String, unique=True)
    chatbotId = Column(Integer, ForeignKey("Chatbot.id"))
    createdAt = Column(DateTime, default=datetime.utcnow)

    chatbot = relationship("Chatbot", back_populates="documents")
