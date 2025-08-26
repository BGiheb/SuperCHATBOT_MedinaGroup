from fastapi.middleware.cors import CORSMiddleware
from fastapi import FastAPI, HTTPException
from db import SessionLocal
from models import Chatbot
from retriever import process_documents
from qa import ask_question

app = FastAPI()

origins = ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/process/{chatbot_slug}")
def process_chatbot_docs(chatbot_slug: str):
    db = SessionLocal()
    try:
        bot = db.query(Chatbot).filter(Chatbot.slug == chatbot_slug).first()
        if not bot:
            raise HTTPException(status_code=404, detail="Chatbot not found")
        if not bot.documents:
            raise HTTPException(status_code=400, detail="No documents found")
        process_documents(bot.id, bot.documents)  # Still use bot.id internally
        return {"message": "Documents processed successfully"}
    finally:
        db.close()

@app.post("/ask/{chatbot_slug}")
def ask_chatbot(chatbot_slug: str, question: str):
    db = SessionLocal()
    try:
        bot = db.query(Chatbot).filter(Chatbot.slug == chatbot_slug).first()
        if not bot:
            raise HTTPException(status_code=404, detail="Chatbot not found")
        answer = ask_question(bot.id, question)  # Still use bot.id internally
        return {"answer": answer}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        db.close()