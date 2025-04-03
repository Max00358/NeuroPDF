import { RecursiveCharacterTextSplitter, TextSplitter } from "langchain/text_splitter";
import { MemoryVectorStore } from "langchain/vectorstores/memory";
import { PDFLoader } from "langchain/document_loaders/fs/pdf";
import { RetrievalQAChain } from "langchain/chains";
import { PromptTemplate } from "langchain/prompts";
import axios from "axios";

const chat = async(filePath = "./uploads/sample-default.pdf", UserQuestion)=>{
    const apiKey = process.env.REACT_APP_DEEPSEEK_API_KEY;
    const loader = new PDFLoader(filePath);
    const data = await loader.load(); // contains array of pageContent & metadata

    const text_splitter = new RecursiveCharacterTextSplitter({
        chunkSize: 500,
        chunkOverlap: 50
    });
    const splitDocs = await text_splitter.splitDocuments(data);

    // the entire PDF into context
    const context = data.map(doc => doc.pageContent).join("\n\n");

    // naive filter to pick relevant chunks based on keyword presence
    // const relevantChunks = splitDocs
    //     .filter(doc => doc.pageContent.toLowerCase().includes(UserQuestion.toLowerCase()))
    //     .map(doc => doc.pageContent)
    //     .slice(0, 3); // pick top 3 relevant chunks

    // const context = relevantChunks.join("\n\n");

    // back-end (server.js) calls front-end (chat.js) 
    // front-end calls LLM API and spits results to back-end
    const payload = {
        model: 'deepseek-chat',
        messages: [
            {
                role: "system",
                content: `Use the following pieces of context to answer the question at the end.
                        Use one paragraph max and keep the answer as concise as possible.

                        The question will be asked in the below format:
                        {context}
                        Question: {question}

                        Respond in below format:
                        {your answer}`
            },
            {
                role: "user",
                content: `${context}\n\nQuestion:${UserQuestion}`
            }
        ],
        stream: false
    };

    try{
        // separate HTTP request sent from backend to DeepSeek API 
        const response = await axios.post("https://api.deepseek.com/chat/completions", payload, {
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${apiKey}`
            }
        });
        const answer = response.data.choices[0].message.content;
        return { answer };
    }
    catch(error){
        console.error('DeepSeek Error:', error.response?.data || error.message);
        throw new Error("Failed to get response from DeepSeek API");
    }
};

export default chat;