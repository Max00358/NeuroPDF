// to display Questions & Answers (RenderQA)
import React, { useEffect, useRef }from "react";
import { Card, Button, message } from "antd";
import { CopyOutlined } from "@ant-design/icons";
import "./RenderQA.css";

const containerStyle = {
    display: "flex",
    justifyContent: "space-between",
    flexDirection: "column",
    marginBottom: "20px"
};
const userContainer = {
    textAlign: "right"
};
const userStyle = {
    maxWidth: "50%",
    textAlign: "left",
    backgroundColor: "#007AFF", // iMessage blue
    color: "white",
    display: "inline-block",
    padding: "10px",
    marginBottom: "5%",
    borderRadius: "18px 18px 0px 18px"
};

const agentContainer = {
    textAlign: "left" // left of the entire window
};
const agentStyle = {
    maxWidth: "50%",
    textAlign: "left",
    backgroundColor: "#E5E5EA", // iMessage light grey
    color: "black",
    display: "inline-block",
    padding: "10px",
    marginBottom: "1%",
    borderRadius: "18px 18px 18px 0px"
};

const highlightStyle = {
    maxWidth: "100%",
    backgroundColor: "#E5E5EA", // classic iMessage gray
    color: "black",
    padding: "12px 16px",
    marginBottom: "8px",
    alignSelf: "flex-start", // float left (like received message)
    fontSize: "15px",
    lineHeight: "1.4",
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
    boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
    borderRadius: "18px 18px 18px 18px"
};
const loadingStyle = {
    maxWidth: "50%",
    backgroundColor: "#E5E5EA",          // iMessage light gray
    borderRadius: "18px 18px 18px 4px",  // iMessage-style bubble
    padding: "0 0 16px 0",               // Adequate space for spinner
    display: "inline-flex",              // For proper bubble sizing
    justifyContent: "center",

    fontSize: "48px", 
};
const copyStyle = {
    backgroundColor: ""
}

const RenderQA = ({ chatState }) => {
    const { conversation, conversation_q, isLoading, liveAnswer, highlight } = chatState;
    const [ messageApi, contextHolder ] = message.useMessage();
    const scrollRef = useRef(null);

    // auto-scroll to bottom
    useEffect(() => {
        scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [conversation, conversation_q, liveAnswer]);

    const formatHighlight = (highlight) => {
        const raw = Array.isArray(highlight) ? highlight.join(" ") : String(highlight || "");
        return raw
            .replace(/\n(?!\n)/g, " ")
            .replace(/\n\n+/g, "\n\n")
            .trim();
    };
    const copyToClipboard = (text, type) => {
        navigator.clipboard.writeText(text)
            .then(() => {
                // makes "Copied!" msg disappear after 1.5 seconds
                setTimeout(() => {
                    messageApi.open({
                        key: 'updatable',
                        type: 'success',
                        content: (type === "context")? 'Context Copied!' : 'Answer Copied!',
                        duration: 0.8,
                    });
                });
            })
            .catch((err) => {
                console.error("(RenderQA.js) Copy failed: ", err);
            })
    }

    return (
        <>  
        {conversation_q?.map((question, index) => {
            const isCurrent = index === conversation_q.length-1;
            const showLive = isCurrent && liveAnswer;

            return (
                <div 
                    key={`q-${index}`}
                    ref={scrollRef}
                    style={containerStyle}
                >
                    <div style={userContainer}>
                        <div style={userStyle}>
                            {question}
                        </div>
                    </div>

                    {
                        showLive ? (
                            // Display current live answer & highlight
                            <div style={agentContainer}>
                                <div 
                                    style={agentStyle}
                                >
                                    { 
                                        highlight?.length > 0 && (
                                        <Card 
                                            title="Relevant Context" 
                                            hoverable={true}
                                            style={highlightStyle}>
                                            "{formatHighlight(highlight)}"
                                        </Card>
                                    )}
                                    { liveAnswer }
                                </div>
                            </div>
                        ):(
                            // Display LLM answer if it exists
                            conversation[index] && (
                            <div style={agentContainer}>
                                <div 
                                    className="fade-in"
                                    style={agentStyle}
                                >
                                    {
                                        conversation[index].highlight_text?.length > 0 &&
                                        <Card
                                            title="Relevant Context"
                                            hoverable={true}
                                            onClick={() => copyToClipboard(formatHighlight(conversation[index].highlight_text), "context")}
                                            style={highlightStyle}
                                        >
                                            "{ formatHighlight(conversation[index].highlight_text) }"
                                        </Card>
                                    }
                                    { conversation[index].answer }
                                </div>
                            </div>
                        )
                    )}

                    {/* Copy Button under LLM response */}
                    <div>  
                        {!isLoading &&
                        <>
                            {/* contextHolder makes sure msg gets displayed after click */}
                            {contextHolder} 
                            <Button
                                icon={<CopyOutlined/>}
                                style={copyStyle}
                                onClick={() => copyToClipboard(conversation[index].answer, "answer")}
                            />
                        </>
                        }
                    </div>

                    {/* Show loading indicator for current question */}
                    {isLoading && index === conversation_q.length - 1 && !liveAnswer && (
                        <div style={containerStyle}>
                            <div style={loadingStyle}>
                                <span className="dot-animation">
                                    .
                                </span>
                            </div>
                        </div>
                    )}
                </div>
            )
        })}
        </>
    );
};

export default RenderQA;