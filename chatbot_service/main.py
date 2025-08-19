# main.py
from fastapi.middleware.cors import CORSMiddleware

from fastapi import FastAPI, HTTPException
from db import SessionLocal
from models import Chatbot
from retriever import process_documents
from qa import ask_question

app = FastAPI()

origins = ["*"]  # pour tester en local, sinon mettre ["https://monsite.com"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.post("/process/{chatbot_id}")
def process_chatbot_docs(chatbot_id: int):
    db = SessionLocal()
    bot = db.query(Chatbot).filter(Chatbot.id == chatbot_id).first()
    if not bot:
        raise HTTPException(status_code=404, detail="Chatbot not found")
    if not bot.documents:
        raise HTTPException(status_code=400, detail="No documents found")
    process_documents(bot.id, bot.documents)
    return {"message": "Documents processed successfully"}

@app.post("/ask/{chatbot_id}")
def ask_chatbot(chatbot_id: int, question: str):
    try:
        answer = ask_question(chatbot_id, question)
        return {"answer": answer}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
