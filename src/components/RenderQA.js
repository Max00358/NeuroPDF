// to display Questions & Answers (RenderQA)
import React from "react";
import { Spin } from "antd";

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

const RenderQA = (props) => {
    const { conversation, isLoading } = props;

    return (
        <>
            {conversation?.map((each, index) => {
                return (
                    <div key={index} style={containerStyle}>
                        <div style={userContainer}>
                            <div style={userStyle}>{each.question}</div>
                        </div>
                        <div style={agentContainer}>
                            <div style={agentStyle}>{each.answer}</div>
                        </div>
                    </div>
                );
            })}
            {isLoading && <Spin size="large" style={{ margin: "10px" }} />}
        </>
    );
};

export default RenderQA;