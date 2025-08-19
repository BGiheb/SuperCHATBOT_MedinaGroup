# qa.py
from retriever import load_vectorstore
from langchain.chains import RetrievalQA
from langchain_google_genai import ChatGoogleGenerativeAI
from key_manager import get_api_key

def ask_question(chatbot_id: int, question: str):
    # Charger le vectorstore pour ce chatbot
    vectorstore = load_vectorstore(chatbot_id)
    retriever = vectorstore.as_retriever(search_kwargs={"k": 3})

    # LLM Gemini avec clé API dynamique
    llm = ChatGoogleGenerativeAI(
        model="gemini-1.5-flash",
        google_api_key=get_api_key(),
        temperature=0
    )

    # Chaîne QA
    qa = RetrievalQA.from_chain_type(llm=llm, retriever=retriever)
    answer = qa.run(question)
    return answer
