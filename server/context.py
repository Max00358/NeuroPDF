# RAG
from langchain_community.document_loaders import PyMuPDFLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_community.vectorstores import FAISS      # lightweight vector search engine
import json
import sys
import os

filePath = sys.argv[1]
question = sys.argv[2]

loader = PyMuPDFLoader(filePath)
docs = loader.load() # contains array of pageContent & metadata

index_path = "./uploads/PDF_vector_cache"
embedding_model = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")

if os.path.exists(index_path):
    vectorstore = FAISS.load_local(index_path, embedding_model, allow_dangerous_deserialization=True)
    print("Caching succeeded", file=sys.stderr)
else:
    text_splitter = RecursiveCharacterTextSplitter(chunk_size=500, chunk_overlap=50)
    split_docs = text_splitter.split_documents(docs)

    vectorstore = FAISS.from_documents(split_docs, embedding_model)
    vectorstore.save_local(index_path) # cache the PDF content

docs = vectorstore.similarity_search(question, k=3) # find top 3 relevant chunks
context = "\n\n".join([doc.page_content for doc in docs]) # adding \n\n to help LLM visually understand context better

print(json.dumps({
        "context" : context,
    }))