// to run both FE and BE concurrently: 
// under root folder-> npm run dev

import React, { useState } from 'react';
import ChatComponent from './components/ChatComponents';
import PdfUploader from './components/PdfUploader';
import RenderQA from './components/RenderQA';
import { Layout } from "antd";
import logo from "./graphics/logo192.png";

// Clean and modern layout styles
const layoutStyles = {
  height: "100vh",
  backgroundColor: "#f5f6fa", // light neutral
  fontFamily: "Inter, -apple-system, BlinkMacSystemFont, sans-serif"
};

const headerStyles = {
  backgroundColor: "#ffffff",
  display: "flex",
  alignItems: "center",
  padding: "0 40px",
  height: "72px",
  boxShadow: "0 1px 4px rgba(0, 0, 0, 0.06)",
  zIndex: 1
};

const logoStyles = {
  height: "48px",
  cursor: "pointer"
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
  backgroundColor: "#ffffff",
  boxShadow: "0 -2px 12px rgba(0, 0, 0, 0.05)"
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
          <img src={logo} alt="NeuroPDF Logo" style={logoStyles} />
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