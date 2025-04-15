import { execFile } from "child_process";
import axios from "axios";
import util from "util";

const execFilePromise = util.promisify(execFile);

const chat = async(filePath, UserQuestion) => {
    const apiKey = process.env.REACT_APP_DEEPSEEK_API_KEY;

    // catch the value from returned key-value pair, so stdout & stderr var name is fixed
    const { stdout, stderr } = await execFilePromise("python3", ["context.py", filePath, UserQuestion]);
    const context = JSON.parse(stdout).context;

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
            },
            timeout: 15000 // 15 seconds
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