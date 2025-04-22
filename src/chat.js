const DOMAIN = process.env.REACT_APP_FAST_API_DOMAIN;

const chat = async(filePath, UserQuestion, onHighlight, onLLMChunk, onDone, onError) => {
    const url = new URL(`${DOMAIN}/chat-stream`);
    url.searchParams.append('filePath', filePath);
    url.searchParams.append('question', UserQuestion);

    const eventSource = new EventSource(url);

    eventSource.onmessage = (event) => {
        if(event.data === "[DONE]"){
            eventSource.close();
            onDone?.(); // if onDone function exist, then call it
            return;
        }

        try{
            const data = JSON.parse(event.data);
            if(data.highlight_text){
                onHighlight?.(data.highlight_text);
            }
            else if(data.LLM_response){
                onLLMChunk?.(data.LLM_response);
            }
        }
        catch(e){
            console.error("Failed to parse SSE data: ", e);
        }
    };

    eventSource.onerror = (err) => {
        console.error(`SSE Err: ${err}`);
        eventSource.close();
        onError?.(err);
    };

    return () => eventSource.close();
};

export default chat;