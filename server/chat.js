import axios from "axios";

const chat = async(filePath, UserQuestion) => {
    const API_URL = 'http://127.0.0.1:7860';

    try{
        const contextResp = await axios.post(`${API_URL}/chat`, {
            filePath,
            question: UserQuestion
        });
        
        const { LLM_response, highlight_text } = contextResp.data;
        return { LLM_response, highlight_text };
    } catch(error){
        console.error('Error calling FastAPI:', error);
        throw new Error("Failed to communicate with backend");
    }
};

export default chat;