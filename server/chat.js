import { RecursiveCharacterTextSplitter, TextSplitter } from "langchain/text_splitter";
import { PDFLoader } from "langchain/document_loaders/fs/pdf";
import axios from "axios";
import { execFile } from "child_process";
import util from "util";

const execFilePromise = util.promisify(execFile);

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
                content: `
                    Use the following context to answer the question at the end.

                    First, determine whether answering the question requires referencing a specific part of the context. Start your response with either "yes." or "no." (all lowercase, followed by a period). Then continue with a concise answer in one short paragraph.

                    You will be given:

                    {context}
                    Question: {question}

                    Final Output:
                    yes. [Your concise answer here...]
                    or
                    no. [Your concise answer here...]
                `
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
        console.log(`(chat.js) waiting for LLM response...`);
        const response = await axios.post("https://api.deepseek.com/chat/completions", payload, {
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${apiKey}`
            }
        });
        console.log(`(chat.js) LLM response acquired!`);
        const answer = response.data.choices[0].message.content;

        //call python highlight script in virtual env (venv)
        try {
            const { stdout, stderr } = await execFilePromise("python3", ["highlight.py", filePath, answer]);
            const parsed = JSON.parse(stdout);
            const LLM_response = parsed.answer;
            const highlight_text = parsed.highlight_text;

            console.log("(chat.js) LLM_response: ", LLM_response);
            console.log("(chat.js) highlight_text: ", highlight_text);

            // this returns JS object of this form: (All JS obj needs to have key-value pair or else error)
            //{
            // answer: "LLM answer",
            // highlightedPDF : path_to_highlightPDF
            //}
            return { 
                LLM_response: LLM_response, 
                highlight_text : highlight_text
            };
        } catch (err) {
            console.error("Python error:", err);
            return {
                answer, 
                highlight_text : ""
            };
        }
    }
    catch(error){
        console.error('DeepSeek Error:', error.response?.data || error.message);
        throw new Error("Failed to get response from DeepSeek API");
    }
};

export default chat;