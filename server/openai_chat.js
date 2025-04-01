import { RecursiveCharacterTextSplitter, TextSplitter } from "langchain/text_splitter";
import { MemoryVectorStore } from "langchain/vectorstores/memory";
import { RetrievalQAChain } from "langchain/chains";
import { PromptTemplate } from "langchain/prompts";
import { PDFLoader } from "langchain/document_loaders/fs/pdf";

import { OpenAIEmbeddings } from "langchain/embeddings/openai";
import { ChatOpenAI } from "langchain/chat_models/openai";

// Deepseek & OpenAI API Platform usage
// https://platform.deepseek.com/usage
// https://platform.openai.com/settings/organization/billing/overview

const openai_chat = async(filePath = "./uploads/sample-default.pdf", query) => {
    const loader = new PDFLoader(filePath);
    const data = await loader.load();

    // a 100-page PDF, when feeding into GPT at once, will exceed GPT token limit
    // the solution is to split text into smaller chunks (500 chars in this case)
    // chunkOverlap means continuity of each chunks
        // say if chunk 1 goes from 0 - 500 & chunkOverlap is 50
        // then chunk 2 goes from 450 - 950 instead of 500 - 1000
        // this ensures GPT gets more contexts (a sentence might not finish at chunk boundary)
    const textSplitter = new RecursiveCharacterTextSplitter({
        chunkSize: 500, //  (in terms of number of characters)
        chunkOverlap: 0,
    });

    const splitDocs = await textSplitter.splitDocuments(data);

    // convert text chunks into numerical vectors
    const embeddings = new OpenAIEmbeddings({
        openAIApiKey: process.env.REACT_APP_OPENAI_API_KEY,
    });

    // store embeddings in memory for similarity search
    const vectorStore = await MemoryVectorStore.fromDocuments(
        splitDocs,
        embeddings
    );

    const model = new ChatOpenAI({
        modelName: "gpt-3.5-turbo",
        openAIApiKey: process.env.REACT_APP_OPENAI_API_KEY,
    });

    const template = `Use the following pieces of context to answer the question at the end.
                    If you don't know the answer, just say that you don't know, don't try to make up an answer.
                    Use three sentences maximum and keep the answer as concise as possible.


                    {context}
                    Question: {question}
                    Helpful Answer:`;

    // search up relevant chunks related to query in vectorstores
    // gpt only receives the relevant chunks and not ALL chunks
    const chain = RetrievalQAChain.fromLLM(model, vectorStore.asRetriever(), {
        prompt: PromptTemplate.fromTemplate(template),
    });

    const response = await chain.call({
        query,
    });

    return response;
}

export default openai_chat;