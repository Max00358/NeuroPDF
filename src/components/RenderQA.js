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

const agentContainer = {
    textAlign: "left"
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
  

const RenderQA = (props) => {
    const { conversation, isLoading } = props;

    return (
        <>
            {conversation?.map((each, index) => {
                const rawHighligh = Array.isArray(each.highlight_text) 
                    ? each.highlight_text.join(" ") : String(each.highlight_text || "");
            
                const cleanedHighlight = rawHighligh
                    .replace(/\n(?!\n)/g, " ")
                    .replace(/\n\n+/g, "\n\n")
                    .trim();

                return (
                    <div key={index} style={containerStyle}>
                        <div style={userContainer}>
                            <div style={userStyle}>{each.question}</div>
                        </div>
                        <div style={agentContainer}>
                            <div style={agentStyle}>
                                <Card
                                    title="Relevant Context"
                                    hoverable={true}
                                    style={highlightStyle}
                                >
                                    "{cleanedHighlight}"
                                </Card>
                                {each.answer}
                            </div>
                        </div>
                    </div>
                );
            })}
            {isLoading && <Spin size="large" style={{ margin: "10px" }} />}
        </>
    );
};

export default RenderQA;