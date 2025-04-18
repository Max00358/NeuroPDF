// to run both FE and BE concurrently: 
// under root folder-> npm run dev

import React, { useState, useEffect } from 'react';
import ChatComponent from './components/ChatComponents';
import RenderQA from './components/RenderQA';
import TreeGraph from './components/Tree';
import { Layout, Button, Avatar } from "antd";
import { RightOutlined, DownCircleOutlined } from "@ant-design/icons";
import logo from "./graphics/logo192.png";

const layoutStyles = {
  height: "100vh",
  display: "flex",
  flexDirection: "column",
  overflow: "auto",
};

const headerStyles = {
  position: "fixed", // stay fixed to the top
  top: 0,
  left: 0,
  right: 0,
  backgroundColor: "#f0f2f5",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  height: "80px",
  padding: "0 24px",
  boxShadow: "0 2px 8px rgba(0, 0, 0, 0.05)",
  borderBottom: "1px solid #e0e0e0",
  zIndex: 5,     // stays above all content
};

const profileContainerStyles = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  lineHeight: "1.2",
};

const logoStyles = {
  height: "36px",       // smaller like iMessage avatars
  marginBottom: "4px"
};

const textContainerStyles = {
  display: "flex",
  alignItems: "center",
  gap: "3px",
  fontSize: "12.5px",
  fontWeight: "600",
  color: "#4a4a4a"  // muted dark gray
};

const contentStyles = {
  flex: 1,
  overflowY: "auto",
  padding: "80px 0px 100px 0px",
  width: "100%",
  marginTop: "80px",
};

const chatComponentStyle = {
  position: "fixed",
  bottom: "0",
  width: "90%",
  // left & transform centers the chat components
  left: "50%",
  transform: "translateX(-50%)",
  padding: "24px 40px",
  backgroundColor: "rgba(245, 246, 250, 0.75)", // translucent
  backdropFilter: "blur(12px)",                   // blur effect
  WebkitBackdropFilter: "blur(12px)",             // Safari support
  zIndex: 10,
};

const downCircleStyle = {
  position: "fixed",
  bottom: "100px",
  left: "50%",
  transform: "translateX(-50%)",
  opacity: 0.9,
  zIndex: 10
};

const treeOverlayStyle = {
  position: "absolute",
  top: "35px",
  left: 0,
  right: 0,
  bottom: 0,
  zIndex: 2,
  padding: "40px",
  justifyContent: "center",

  // backgroundColor: "rgba(103, 102, 102, 0)",
  // backdropFilter: "blur(6px)",
};

const App = () => {
  const [conversation, setConversation] = useState([]);
  const [conversation_q, setConversationQ] = useState([]);

  const [isLoading, setIsLoading] = useState(false);
  const [isUploaded, setIsUploaded] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [showTree, setShowTree] = useState(false);

  const [filePath, setFilePath] = useState(null);
  const [treeData, setTreeData] = useState(null);

  const { Header, Content } = Layout;

  const handleResp = (answer, highlight_text) => {
    // append new {Q, A} into conversation and setState to trigger re-render
    // using append/push will NOT trigger re-render, which is why we don't use it here
    setConversation([...conversation, { answer, highlight_text }]);
  };
  const scrollToBottom = () => {
    const content = document.querySelector(".ant-layout-content");
    content.scrollTo({
      top: content.scrollHeight,
      behavior: "smooth"
    });
  };

  // runs when component mounts (load for the 1st time)
  useEffect(() => {
    const content = document.querySelector(".ant-layout-content");
    const checkScroll = () => {
      setShowScrollButton(
        content.scrollHeight - content.scrollTop - content.clientHeight> 100
      );
    };
    content.addEventListener("scroll", checkScroll);
    return () => content.removeEventListener("scroll", checkScroll);
  }, []);

  return (
    <>
      <Layout style={layoutStyles}>
        <Header 
          id='top_header' 
          style={headerStyles}
        >
          <div style={profileContainerStyles}>
            <Avatar 
              src={logo}
              size="large"
              style={logoStyles}
              alt="NeuroPDF Logo"
          />
            <div style={textContainerStyles}>
              NeuroPDF
              <RightOutlined />
            </div>
          </div>
        </Header>

        <Content style={contentStyles}>
          <div style={{ maxWidth: "900px", margin: "0 auto", padding: "0 24px" }}>
            { isUploaded && (
                <div style={treeOverlayStyle}>
                  <TreeGraph
                      data={{ filePath, treeData, setTreeData, showTree, setShowTree }}
                  />
                </div>
            )}
            <RenderQA 
              chatState={{ conversation, conversation_q, isLoading }}
            />
          </div>
          {
            showScrollButton &&
            <Button 
              type="primary"
              size="large"
              icon={<DownCircleOutlined/>}
              onClick={scrollToBottom}
              style={downCircleStyle}
            />
          }
        </Content>

        <div style={chatComponentStyle}>
          <ChatComponent
            handleResp={handleResp}
            setIsLoading={setIsLoading}
            setConversationQ={setConversationQ}
            filePath={filePath}
            setFilePath={setFilePath}
            setIsUploaded={setIsUploaded}
            setTreeData={setTreeData}
          />
        </div>
      </Layout>
    </>
  );
};

export default App;