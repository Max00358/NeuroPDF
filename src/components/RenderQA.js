// to display Questions & Answers (RenderQA)
import React from "react";
import { Spin, Card } from "antd";

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
    marginBottom: "5%",
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
    padding: "16px",                     // Adequate space for spinner
    display: "inline-flex",              // For proper bubble sizing
    justifyContent: "center",
    alignItems: "center"
};
  

const RenderQA = (props) => {
    const { conversation, conversation_q, isLoading } = props;

    const formatHighlight = (highlight) => {
        const raw = Array.isArray(highlight) ? highlight.join(" ") : String(highlight || "");
        return raw
            .replace(/\n(?!\n)/g, " ")
            .replace(/\n\n+/g, "\n\n")
            .trim();
    };

    return (
        <>
            {conversation_q?.map((question, index) => 
                <div 
                    key={`q-${index}`}
                    style={containerStyle}
                >
                    <div style={userContainer}>
                        <div style={userStyle}>
                            {question}
                        </div>
                    </div>

                    {/* Display LLM answer if it exists */}
                    {conversation[index] && (
                        <div style={agentContainer}>
                            <div style={agentStyle}>
                                <Card
                                    title="Relevant Context"
                                    hoverable={true}
                                    style={highlightStyle}
                                >
                                    {
                                        conversation[index].highlight_text &&
                                        formatHighlight(conversation[index].highlight_text)
                                    }
                                </Card>
                                {conversation[index].answer}
                            </div>
                        </div>
                    )}

                    {/* Show loading indicator for current question */}
                    {isLoading && index === conversation_q.length - 1 && (
                        <div style={containerStyle}>
                            <div style={loadingStyle}>
                                <Spin 
                                    size="large"
                                    percent="auto"
                                />
                            </div>
                        </div>
                    )}
                </div>
            )}
        </>
    );
};

export default RenderQA;