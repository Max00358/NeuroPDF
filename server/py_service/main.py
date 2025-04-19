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
from fastapi.middleware.cors import CORSMiddleware
from fastapi import BackgroundTasks
from dotenv import load_dotenv
import json, httpx, os, sys

app = FastAPI()
index_path = "../vs_eng_cache"
embedding_model = HuggingFaceEmbeddings(
    model_name="all-MiniLM-L6-v2",
    model_kwargs={"device": "cpu"}
)
in_progress_trees = set() # store upload file path

load_dotenv()
API_KEY = os.getenv("DEEPSEEK_API_KEY")

# Add CORS middleware to allow requests from all origins (or specify the origins you need)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # include all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allow all HTTP methods (you can limit this to specific methods like ["GET", "POST"])
    allow_headers=["*"],  # Allow all headers
)

# In production:
# app.add_middleware(
#     CORSMiddleware,
#     allow_origins=[FRONTEND_URL],
#     allow_methods=["POST"],
#     allow_headers=["Content-Type"]
# )

# schema
class MakeTreeRequest(BaseModel):
    filePath: str
    
class ContextRequest(BaseModel):
    filePath: str
    question: str    

# filePath: PDF upload path
# treePath: tree json save path
def build_tree_background(filePath: str, treePath: str):
    try:        
        loader = PyMuPDFLoader(os.path.join("..", filePath))
        docs = loader.load()              # contains array of pageContent & metadata

        # call get_tree once only, hence "index_path" do not exist
        text_splitter = RecursiveCharacterTextSplitter(chunk_size=500, chunk_overlap=50)
        split_docs = text_splitter.split_documents(docs)

        vectorstore = FAISS.from_documents(split_docs, embedding_model)

        treeDir = os.path.join(os.path.dirname(__file__), index_path)
        os.makedirs(treeDir, exist_ok=True)
        vectorstore.save_local(index_path) # cache the PDF content

        payload = {
            "model": "deepseek-chat",
            "messages": [
                {
                    "role": "system",
                    "content": '''
                        You are a JSON expert. You MUST return JSON in this EXACT structure:

                        {
                            "name": string (document title),
                            "attributes?": {
                                "type": string,
                                "pages": number,
                                "author?": string
                            },
                            "children": [
                                {
                                "name": string (section heading),
                                "attributes": {
                                    "page": number (1-based),
                                    "content_preview": string (max 20 words)
                                },
                                "children?": [...] (subsections)
                                }
                            ]
                        }

                        RULES:
                        1. Structure must be hierarchical with nested children
                        2. Every node MUST have 'name' and 'attributes.page'
                        3. Use 1-based page numbers from PDF metadata
                        4. content_preview should summarize key points
                        5. Maintain original document section hierarchy

                        Do NOT wrap the output in triple backticks or any markdown. Only output raw JSON.
                    '''
                },
                {
                    "role": "user",
                    "content": f"{split_docs}"
                }
            ],
            "stream": False
        }
        response = httpx.post(
            "https://api.deepseek.com/chat/completions",
            json=payload,
            headers={ "Authorization": f"Bearer {API_KEY}" },
            timeout=15000  # 15 seconds
        )
        answer = response.json()["choices"][0]["message"]["content"]
        tree = json.loads(answer)

        with open(treePath, 'w') as f:
            json.dump(tree, f)
        # just saved tree.json file, can throw upload path out of cache 
        in_progress_trees.discard(filePath)
    
    except Exception as e:
        print(f"(main.py) Background tree generation failed: {str(e)}")


@app.post("/tree")
async def get_tree(req: MakeTreeRequest, background_tasks: BackgroundTasks):
    # find specified tree in treeJson dir
    filename = os.path.splitext(os.path.basename(req.filePath))[0] # remove extension
    treeName = f"{filename}.tree.json"

    treeDir = os.path.join(os.path.dirname(__file__), "..", "treeJson")
    os.makedirs(treeDir, exist_ok=True)
    treePath = os.path.join(treeDir, treeName)

    # if tree.json already exist, return it
    if os.path.exists(treePath):
        with open(treePath, 'r') as f:
            tree = json.load(f)
        return { "tree": tree }

    # schedule background task if tree is not already in progress of being built
        # background task is fire-and-forgot, it does not return anything
        # front-end simply has to poll the treePath (savePath) to check if background task has returned
    if req.filePath not in in_progress_trees:
        in_progress_trees.add(req.filePath)
        background_tasks.add_task(build_tree_background, req.filePath, treePath)

    return { 
        "tree": None, 
        "status": "in_progress"
    }


# chat endpoint (RAG)
vs_map: dict[str, FAISS] = {} # store vectorstores

@app.post("/chat")
async def get_context(req: ContextRequest): # incoming req should be parsed & validated into "ContextRequest" instance    
    question = req.question
    print(f"(main.py) upload file path: {req.filePath}")
    
    # if upload path not in memory, build it
    vectorstore = None
    if req.filePath not in vs_map:
        loader = PyMuPDFLoader(os.path.join("..", req.filePath))
        docs = loader.load() # contains array of pageContent & metadata

        text_splitter = RecursiveCharacterTextSplitter(chunk_size=500, chunk_overlap=50)
        split_docs = text_splitter.split_documents(docs)

        vectorstore = FAISS.from_documents(split_docs, embedding_model)
        vs_map[req.filePath] = vectorstore
    else:
        vectorstore = vs_map[req.filePath]
    
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
                "content": f"{context}\n\nQuestion:{question}"
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
                timeout=60  # 60 seconds (in py, timeout has unit of seconds; in JS, timeout has unit of ms)
            )
        answer = response.json()["choices"][0]["message"]["content"]

        return {
            "LLM_response": answer,
            "highlight_text": highlight_text
        }
    
    except Exception as error:
        return { "error": str(error) }
    