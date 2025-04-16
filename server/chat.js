import { execFile } from "child_process";
import axios from "axios";
import util from "util";

const execFilePromise = util.promisify(execFile);

const chat = async(filePath, UserQuestion) => {
    const apiKey = process.env.REACT_APP_DEEPSEEK_API_KEY;

    // catch the value from returned key-value pair, so stdout & stderr var name is fixed
    const { stdout, stderr } = await execFilePromise("python3", ["context.py", filePath, UserQuestion]);
    const context = JSON.parse(stdout).context;
    const highlight_text = JSON.parse(stdout).highlight_text;

    // back-end (server.js) calls front-end (chat.js) 
    // front-end calls LLM API and spits results to back-end
    const payload = {
        model: 'deepseek-chat',
        messages: [
            {
                role: "system",
                content: `
                    Use the following context to answer the question at the end.

                    Provide a concise answer in one short paragraph.

                    You will be given:

                    {Context}
                    Question: {Question}

                    [Your concise answer here...]
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
            },
            timeout: 15000 // 15 seconds
        });
        console.log(`(chat.js) LLM response acquired!`);

        const answer = response.data.choices[0].message.content;
        return { 
            LLM_response: answer, 
            highlight_text : highlight_text
        };
    }
    catch(error){
        console.error('DeepSeek Error:', error.response?.data || error.message);
        throw new Error("Failed to get response from DeepSeek API");
    }
};

export default chat;