import axios from "axios";

const chat = async(filePath, UserQuestion) => {
    const API_KEY = process.env.REACT_APP_DEEPSEEK_API_KEY;

    const start = performance.now()
    const API_URL = 'http://127.0.0.1:7860';
    const contextResp = await axios.post(`${API_URL}/context`, {
        filePath,
        question: UserQuestion
    });
    const end = performance.now()
    const context = contextResp.data.context;
    const highlight_text = contextResp.data.highlight_text;
    console.log(`Calling /context for ${(end - start)/1000} seconds`)

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
                "Authorization": `Bearer ${API_KEY}`
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