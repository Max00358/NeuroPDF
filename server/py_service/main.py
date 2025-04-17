# Applying Python microservice (FastAPI) rather than subprocesses
    # no cold start delay from starting up new python procecess
    # ready to scale/deploy to backend services
    # FastAPI hosts the get_context function so the server is always running
    # unlike child_process.exec() that starts & dies per request

from fastapi import FastAPI
from pydantic import BaseModel
from langchain_community.document_loaders import PyMuPDFLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_community.vectorstores import FAISS      # lightweight vector search engine
from dotenv import load_dotenv
import httpx, os, sys

app = FastAPI()
index_path = "../uploads/PDF_vector_cache"
embedding_model = None

load_dotenv()
API_KEY = os.getenv("REACT_APP_DEEPSEEK_API_KEY")

# schema
class MakeTreeRequest(BaseModel):
    filePath: str
    
class ContextRequest(BaseModel):
    filePath: str
    question: str

@app.post("/tree")
async def get_tree(req: MakeTreeRequest):
    global embedding_model # tell Py interpretor this var is not local to get_context function
    if embedding_model is None:
        embedding_model = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
    
    loader = PyMuPDFLoader(os.path.join("..", req.filePath))
    docs = loader.load()              # contains array of pageContent & metadata

    # call get_tree once only, hence "index_path" do not exist
    text_splitter = RecursiveCharacterTextSplitter(chunk_size=500, chunk_overlap=50)
    split_docs = text_splitter.split_documents(docs)

    vectorstore = FAISS.from_documents(split_docs, embedding_model)
    vectorstore.save_local(index_path) # cache the PDF content

    payload = {
        "model": "deepseek-chat",
        "messages": [
            {
                "role": "system",
                "content": '''Analyze the following document and return a structured list of topics and subtopics in a tree format (JSON).'''
            },
            {
                "role": "user",
                "content": f"{split_docs}"
            }
        ],
        "stream": False
    }
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://api.deepseek.com/chat/completions",
                json=payload,
                headers={ "Authorization": f"Bearer {API_KEY}" },
                timeout=15000  # 15 seconds
            )
        answer = response.json()["choices"][0]["message"]["content"]
        return { "tree": answer }
    
    except Exception as error:
        return { "error": str(error) }


# chat endpoint (RAG)
@app.post("/chat")
async def get_context(req: ContextRequest): # incoming req should be parsed & validated into "ContextRequest" instance
    global embedding_model # tell Py interpretor this var is not local to get_context function
    if embedding_model is None:
        embedding_model = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
    
    question = req.question
    loader = PyMuPDFLoader(os.path.join("..", req.filePath))
    docs = loader.load()              # contains array of pageContent & metadata

    if os.path.exists(index_path):
        vectorstore = FAISS.load_local(index_path, embedding_model, allow_dangerous_deserialization=True)
    else:
        text_splitter = RecursiveCharacterTextSplitter(chunk_size=500, chunk_overlap=50)
        split_docs = text_splitter.split_documents(docs)

        vectorstore = FAISS.from_documents(split_docs, embedding_model)
        vectorstore.save_local(index_path) # cache the PDF content
        print("Caching succeeded", file=sys.stderr)

    # find top 3 relevant chunks
    # docs = [(Document(...), score), (Document(...), score), ...]
    docs = vectorstore.similarity_search_with_score(question, k=3)
    filtered_doc = [doc for doc, score in docs if score < 0.55] # lower score = more similarity

    if not filtered_doc:
        return {
            "LLM_response": "",
            "highlight_text": ""
        }

    # print("filtered doc: ", filtered_doc)
    highlight_text = filtered_doc[0].page_content                  # top 1 relevant chunk is highlight
    context = "\n\n".join([doc.page_content for doc, _ in docs])   # adding \n\n to help LLM visually understand context better

    payload = {
        "model": "deepseek-chat",
        "messages": [
            {
                "role": "system",
                "content": '''
                    Use the following context to answer the question at the end.

                    Provide a concise answer in one short paragraph.

                    You will be given:

                    [Context]
                    Question: [Question]

                    [Your concise answer here...]
                '''
            },
            {
                "role": "user",
                "content": f"${context}\n\nQuestion:${question}"
            }
        ],
        "stream": False
    }
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://api.deepseek.com/chat/completions",
                json=payload,
                headers={"Authorization": f"Bearer {API_KEY}"},
                timeout=15000  # 15 seconds
            )
        answer = response.json()["choices"][0]["message"]["content"]

        return {
            "LLM_response": answer,
            "highlight_text": highlight_text
        }
    
    except Exception as error:
        return { "error": str(error) }