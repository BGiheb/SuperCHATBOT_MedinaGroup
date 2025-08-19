# retriever.py
import requests
import tempfile
import os
from PyPDF2 import PdfReader
import docx
from langchain_community.vectorstores import FAISS
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from key_manager import get_api_key

VECTOR_STORE_PATH = "vectorstores"

# Embeddings Gemini (clé API dynamique)
def get_embeddings():
    return GoogleGenerativeAIEmbeddings(
        model="models/embedding-001",
        google_api_key=get_api_key()
    )

def download_file(url: str) -> str:
    resp = requests.get(url)
    if resp.status_code != 200:
        raise Exception(f"Failed to download {url}")
    tmp = tempfile.NamedTemporaryFile(delete=False)
    tmp.write(resp.content)
    tmp.close()
    return tmp.name

def extract_text(file_path: str, file_type: str) -> str:
    text = ""
    if file_type == "pdf":
        reader = PdfReader(file_path)
        for page in reader.pages:
            text += page.extract_text() or ""
    elif file_type in ["doc", "docx"]:
        doc = docx.Document(file_path)
        text = "\n".join([p.text for p in doc.paragraphs])
    else:
        with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
            text = f.read()
    return text

def process_documents(chatbot_id: int, documents: list):
    texts = []
    for doc in documents:
        path = download_file(doc.url)
        content = extract_text(path, doc.fileType.lower())
        os.unlink(path)  # supprimer fichier temporaire
        texts.append(content)

    db = FAISS.from_texts(texts, get_embeddings())
    save_path = os.path.join(VECTOR_STORE_PATH, f"chatbot_{chatbot_id}")
    db.save_local(save_path)
    return save_path

def load_vectorstore(chatbot_id: int):
    save_path = os.path.join(VECTOR_STORE_PATH, f"chatbot_{chatbot_id}")
    if not os.path.exists(save_path):
        raise Exception("Vector store not found, process documents first")
    return FAISS.load_local(
        save_path,
        get_embeddings(),
        allow_dangerous_deserialization=True
    )
