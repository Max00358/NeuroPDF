# Applying Python microservice (FastAPI) rather than subprocesses
    # no cold start delay from starting up new python procecess
    # ready to scale/deploy to backend services
    # FastAPI hosts the get_context function so the server is always running
    # unlike child_process.exec() that starts & dies per request

from fastapi import FastAPI
from pydantic import BaseModel
from transformers import AutoTokenizer
from langchain_community.document_loaders import PyMuPDFLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_community.vectorstores import FAISS      # lightweight vector search engine
from fastapi.middleware.cors import CORSMiddleware
from fastapi import BackgroundTasks, UploadFile, File
from fastapi.staticfiles import StaticFiles
from fastapi.responses import StreamingResponse
from fastapi import Request
from dotenv import load_dotenv
import json, httpx, os, re, glob
import pandas as pd
import pdfplumber
import dirtyjson

import fitz

app = FastAPI()
index_path = "../vsEngCache"
index_table_path = "../pdfTables"
embedding_model = HuggingFaceEmbeddings(
    model_name="all-MiniLM-L6-v2",
    model_kwargs={"device": "cpu"}
)
in_progress_trees = set() # store upload file path
in_progress_tables = set()

load_dotenv()
API_KEY = os.getenv("DEEPSEEK_API_KEY")

# Add CORS middleware to allow requests from all origins (or specify the origins you need)
origins = os.getenv("ALLOWED_ORIGINS", "").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],  # Allow all HTTP methods (you can limit this to specific methods like ["GET", "POST"])
    allow_headers=["*"],  # Allow all headers
)

# schema for POST
class MakeTreeRequest(BaseModel):
    filePath: str

class BoxCoordinates(BaseModel):
    filePath: str
    x: float
    y: float
    width: float
    height: float
    page: int=0

############# Upload Files #############
def clear_uploads(uploads_dir: str):
    for filename in os.listdir(uploads_dir):
        file_path = os.path.join(uploads_dir, filename)
        try:
            if os.path.isfile(file_path):
                os.remove(file_path)
                print(f"(FastAPI) Removed old file: {file_path}")
        except Exception as e:
            print(f"(FastAPI) Error deleting file {file_path}: {e}")

@app.post("/upload")
async def upload_pdf(file: UploadFile = File(...)):
    uploads_dir = os.path.join(os.path.dirname(__file__), "..", "uploads")
    os.makedirs(uploads_dir, exist_ok=True)
    app.mount("/upload", StaticFiles(directory=uploads_dir), name="upload") # fastAPI now not only handles API routes but also file req

    if len(os.listdir(uploads_dir)) > 0:
        clear_uploads(uploads_dir)

    save_path = os.path.join(uploads_dir, file.filename)
    with open(save_path, "wb") as f:
        f.write(await file.read())
    
    print(f"(main.py) Uploaded file saved to: {save_path}")
    return { "filePath": save_path }

############################################################

############# Extract Tables & Generate Graphs #############
def suggest_chart(df):
    pass

def create_chart(df, chart_type, save_path):
    pass

def extract_tables_graph_gen_background(filePath: str):
    tableDir = os.path.join(os.path.dirname(__file__), index_table_path)
    os.makedirs(tableDir, exist_ok=True)

    try:
        with pdfplumber.open(filePath) as pdf:
            for i, page in enumerate(pdf.pages):
                tables = page.extract_tables()

                cnt = 0
                for table in tables:
                    df = pd.DataFrame(table[1:], columns=table[0]) # table[0]: header row
                    chart_type = suggest_chart(df)
                    create_chart(df, chart_type, save_path=f'{tableDir}/table_{cnt}.png')
                    cnt += 1

        in_progress_tables.discard(filePath)       

    except Exception as e:
        print(f"Error extracting table: {str(e)}")


@app.post("/extract-tables")
async def extract_tables_endpoint(req: BoxCoordinates, background_tasks: BackgroundTasks):
    doc = fitz.open(os.path.join("..", req.filePath))
    page = doc[req.page]

    rect = fitz.Rect(
        req.x, 
        req.y, 
        req.x + req.width, 
        req.y + req.height
    )
    page.draw_rect(rect, color=(1,0,0), width=2)

    output_path = req.filePath.replace(".pdf", "_annotated.pdf")
    doc.save(os.path.join("..", output_path))
    return {
        "status" : "saved", 
        "output" : output_path
    }


    # if req.filePath not in in_progress_tables:
    #     in_progress_tables.add(req.filePath)
    #     background_tasks.add_task(extract_tables_graph_gen_background, req.filePath)
    
    # return { "status" : "in_progress" }

############################################################

###################### Build JSON Tree #####################
# filePath: PDF upload path
# treePath: tree json save path
def build_tree_background(filePath: str, treePath: str):
    try:        
        loader = PyMuPDFLoader(os.path.join("..", filePath))
        docs = loader.load()              # contains array of pageContent & metadata

        # call get_tree once only, hence "index_path" do not exist
        text_splitter = RecursiveCharacterTextSplitter(chunk_size=500, chunk_overlap=10) # 50
        split_docs = text_splitter.split_documents(docs)

        tokenizer = AutoTokenizer.from_pretrained("deepseek-ai/deepseek-llm-7b-base")
        total_tokens = sum(len(tokenizer.tokenize(doc.page_content)) for doc in split_docs)
        print(f"(main.py->background_task) Total token count: {total_tokens}")

        # to reduce tokens used
        final_input = "\n".join(doc.page_content.strip() for doc in split_docs)

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
                        Act like a strict JSON expert. You MUST return JSON in this EXACT structure:

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
                                    "content_preview": string (max 15 words)
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
                    "content": f"{final_input}"
                }
            ],
            "stream": False
        }
        print("(main.py->background_task) waiting for LLM Json tree response...")
        response = httpx.post(
            "https://api.deepseek.com/chat/completions",
            json=payload,
            headers={ "Authorization": f"Bearer {API_KEY}" },
            timeout=15000  # 15 seconds
        )
        print("(main.py->background_task) obtained LLM Json tree response...")
        answer = response.json()["choices"][0]["message"]["content"]
        
        try:
            cleaned = re.sub(r"^```(?:json)?\s*", "", answer.strip())
            cleaned = re.sub(r"\s*```$", "", cleaned.strip())
            tree = json.loads(cleaned)
        except json.JSONDecodeError:
            try:
                print("(main.py->background_task) Falling back to dirtyjson...")
                tree = dirtyjson.loads(answer)
            except Exception as e:
                print("(main.py->background_task) Still failed to parse JSON:", e)
                print("(main.py->background_task) Raw LLM response:", repr(answer))

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

############################################################

#################### LLM Response Stream ###################
# chat endpoint (RAG)
vs_map: dict[str, FAISS] = {} # store vectorstores

# streaming via SSE requires GET, POST is used to get full response at once
    # request: Request is used to detect if client has closed connection
@app.get("/chat-stream")
async def get_context(request: Request, filePath: str, question: str): # incoming req should be parsed & validated into "ContextRequest" instance        
    # if upload path not in memory, build it
    vectorstore = None
    if filePath not in vs_map:
        loader = PyMuPDFLoader(os.path.join("..", filePath))
        docs = loader.load() # contains array of pageContent & metadata

        text_splitter = RecursiveCharacterTextSplitter(chunk_size=500, chunk_overlap=50)
        split_docs = text_splitter.split_documents(docs)

        vectorstore = FAISS.from_documents(split_docs, embedding_model)
        vs_map[filePath] = vectorstore
    else:
        vectorstore = vs_map[filePath]
    
    # find top 3 relevant chunks
    # docs = [(Document(...), score), (Document(...), score), ...]
    docs = vectorstore.similarity_search_with_score(question, k=3)
    filtered_doc = [doc for doc, score in docs if score < 0.55] # lower score = more similarity

    highlight_text = filtered_doc[0].page_content if len(filtered_doc) > 0 else "" # top 1 relevant chunk is highlight
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
        "stream": True
    }

    async def event_generator():
        yield f"data: { json.dumps({'highlight_text': highlight_text}) }\n\n"

        async with httpx.AsyncClient(timeout=60) as client:
            async with client.stream(
                "POST",
                "https://api.deepseek.com/chat/completions",
                json=payload,
                headers={"Authorization": f"Bearer {API_KEY}"},
            ) as response:
                async for line in response.aiter_lines():
                    if await request.is_disconnected():
                        print("(main.py) client has closed connection...")
                        break
                    if line.strip().startswith("data: "):
                        json_data = line.removeprefix("data: ").strip()
                        if json_data == "[DONE]":
                            # yield lets program return value multiple times, not just once like return
                            yield "data: [DONE]\n\n"
                            break
                        try:
                            chunk = json.loads(json_data)
                            # grabs content if exist, empty string if not to prevent errors
                            delta = chunk["choices"][0]["delta"].get("content", "")
                            if delta:
                                yield f"data: {json.dumps({ 'LLM_response': delta })}\n\n"
                        except Exception as e:
                            yield f"data: {json.dumps({ 'error': str(e) })}\n\n"
    
    return StreamingResponse(event_generator(), media_type="text/event-stream")

############################################################