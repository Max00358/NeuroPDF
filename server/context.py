# RAG
from langchain_community.document_loaders import PyMuPDFLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_huggingface import HuggingFaceEmbeddings
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

# find top 3 relevant chunks
# docs = [(Document(...), score), (Document(...), score), ...]
docs = vectorstore.similarity_search_with_score(question, k=3)
filtered_doc = [doc for doc, score in docs if score < 0.55] # lower score = more similarity

if not filtered_doc:
    print(json.dumps({
        "context" : "",
        "highlight": ""
    }))
    sys.exit(0)

# print("filtered doc: ", filtered_doc)
highlight_text = filtered_doc[0].page_content                  # top 1 relevant chunk is highlight
context = "\n\n".join([doc.page_content for doc, _ in docs])   # adding \n\n to help LLM visually understand context better

print(json.dumps({
        "context" : context,
        "highlight_text": highlight_text
    }))