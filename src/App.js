import React, { useState } from 'react';
import ChatComponent from './components/ChatComponents';
import PdfUploader from './components/PdfUploader';
import RenderQA from './components/RenderQA';
import { Layout, Typography } from "antd";

const chatComponentStyle = {
  position: "fixed",
  bottom: "0",
  width: "80%",
  left: "10%",
  marginBottom: "20px"
};

const pdfUploaderStyle = {
  margin: "auto",
  paddingTop: "80px"
};

const renderQAStyle = {
  height: "50%",
  paddingTop: "80px",
}

// to run both FE and BE concurrently: under root folder-> npm run dev
const App = () => {
  const [filePath, setFilePath] = useState(null);
  const [conversation, setConversation] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const { Header, Content } = Layout;
  const { Title } = Typography;

  const handleResp = (question, answer) => {
    setConversation([...conversation, { question, answer }]);
  }

  return (
    <>
      <Layout style={{ height: "100vh", backgroundColor: "white" }}>
        <Header
          style={{
            display: "flex",
            alignItems: "center"
          }}
        >
          <Title style={{ color: "white" }}>NeuroPDF</Title>
        </Header>

        <Content
          style={{
            width: "80%",
            margin: "auto"
          }}
        >
          <div style={{ width: "80%", margin: "auto" }}>
            <div style={pdfUploaderStyle}>
              <PdfUploader setFilePath={setFilePath}/>
            </div>
          </div>

          <br />
          <br />

          <div style={renderQAStyle} id='chat-scroll-container'>
            <RenderQA conversation={conversation} isLoading={isLoading}/>
          </div>

          <br />
          <br />
        </Content>
          <div style={chatComponentStyle}>
            <ChatComponent 
              handleResp={handleResp}
              isLoading={isLoading}
              setIsLoading={setIsLoading}
              filePath={filePath}
            />
          </div>
      </Layout>
    </>
  );
}

export default App;
