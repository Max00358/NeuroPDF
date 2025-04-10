// to run both FE and BE concurrently: 
// under root folder-> npm run dev

import React, { useState } from 'react';
import ChatComponent from './components/ChatComponents';
import RenderQA from './components/RenderQA';
import { Layout } from "antd";
import { RightOutlined } from "@ant-design/icons";
import logo from "./graphics/logo192.png";

const layoutStyles = {
  height: "100vh",
  backgroundColor: "#f5f6fa", // light neutral
  fontFamily: "Inter, -apple-system, BlinkMacSystemFont, sans-serif"
};

const headerStyles = {
  backgroundColor: "#f0f2f5", // soft iOS-like gray
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  height: "80px",
  padding: "0 24px",
  boxShadow: "0 2px 8px rgba(0, 0, 0, 0.05)",
  borderBottom: "1px solid #e0e0e0", // iOS subtle divider
  zIndex: 1
};

const profileContainerStyles = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  lineHeight: "1.2",
};

const logoStyles = {
  height: "36px",       // smaller like iMessage avatars
  width: "36px",
  borderRadius: "50%",  // make it circular like iMessage profile picture
  objectFit: "cover",
  marginBottom: "4px"
};

const textContainerStyles = {
  display: "flex",
  alignItems: "center",
  gap: "4px",
  fontSize: "15px",
  fontWeight: "500",
  color: "#4a4a4a" // muted dark gray
};

const contentStyles = {
  width: "100%",
  maxWidth: "900px",
  margin: "60px auto 140px auto",
  padding: "0 24px"
};

const chatComponentStyle = {
  position: "fixed",
  bottom: "0",
  width: "100%",
  left: "0",
  padding: "24px 40px",
  //backgroundColor: "#ffffff",
  //boxShadow: "0 -2px 12px rgba(0, 0, 0, 0.05)"
};

const App = () => {
  const [conversation, setConversation] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const { Header, Content } = Layout;

  const handleResp = (question, answer) => {
    setConversation([...conversation, { question, answer }]);
  };

  return (
    <>
      <Layout style={layoutStyles}>
        <Header style={headerStyles}>
          <div style={profileContainerStyles}>
            <img src={logo} alt="NeuroPDF Logo" style={logoStyles} />
            <div style={textContainerStyles}>
              NeuroPDF
              <RightOutlined />
            </div>
          </div>
        </Header>

        <Content style={contentStyles}>
            <RenderQA conversation={conversation} isLoading={isLoading} />
        </Content>

        <div style={chatComponentStyle}>
          <ChatComponent
            handleResp={handleResp}
            isLoading={isLoading}
            setIsLoading={setIsLoading}
          />
        </div>
      </Layout>
    </>
  );
};

export default App;