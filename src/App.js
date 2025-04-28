// to run both FE and BE concurrently: 
// under root folder-> npm run dev

import React, { useState } from 'react';
import ChatComponent from './components/ChatComponents';
import RenderQA from './components/RenderQA';
import TreeGraph from './components/Tree';
import { Layout, Avatar, Tabs } from "antd";
import { RightOutlined, FilePdfOutlined, PartitionOutlined } from "@ant-design/icons";
import logo from "./graphics/logo192.png";
import RenderPDF from "./components/RenderPDF";
import "./App.css"

const { TabPane } = Tabs;

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
	//boxShadow: "0 2px 8px rgba(0, 0, 0, 0.05)",
	borderBottom: "1px solid #e0e0e0",
	zIndex: 3,     // stays above all content
};

const profileContainerStyles = {
	display: "flex",
	flexDirection: "column",
	alignItems: "center",
	lineHeight: "1",
};

const textContainerStyles = {
	display: "flex",
	alignItems: "center",
	marginTop: "3px",
	gap: "3px",
	fontSize: "12.5px",
	fontWeight: "600",
	color: "#4a4a4a"  // muted dark gray
};

const contentStyles = {
	flex: 1,
	overflowY: "auto",
	padding: "5px 0px 120px 0px",
	width: "100%",
	marginTop: "80px",
};
const tabStyle = {
	position: "fixed",
    top: "88px",
    left: "50%",
    transform: "translateX(-50%)",
	height: "70vh",
    zIndex: 1,
    width: "90%",

	backgroundColor: "rgba(194, 182, 182, 0.38)",
    backdropFilter: "blur(8px)",

    borderRadius: "8px",
    boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
    //padding: "20px",
};

const chatComponentStyle = {
	position: "fixed",
	bottom: "0",
	width: "90%",
	// left & transform centers the chat components
	left: "50%",
	transform: "translateX(-50%)",
	borderRadius: "8px",
	padding: "0 0 35px 0",
	backgroundColor: "rgba(245, 246, 250, 0.75)", // translucent
	backdropFilter: "blur(12px)",                   // blur effect
	WebkitBackdropFilter: "blur(12px)",             // Safari support
	zIndex: 10,

	display: "flex",
	flexDirection: "column",
	gap: "8px",
};

const treeOverlayStyle = {
	position: "absolute",
	top: -16,
	left: 0,
	right: 0,
	justifyContent: "center",
};

const pdfOverlayStyle = {
	marginTop: "-16px",
	justifyContent: "center",
};

const App = () => {
  	const [conversation, setConversation] = useState([]);		// context & LLM_response
  	const [conversation_q, setConversationQ] = useState([]);	// user questions

  	const [liveAnswer, setLiveAnswer] = useState("");
	const [highlight, setHighlight] = useState("");

	const [isLoading, setIsLoading] = useState(false);
	const [isUploaded, setIsUploaded] = useState(false);

	const [showTree, setShowTree] = useState(false);
	const [showPDF, setShowPDF] = useState(false);

	const [filePath, setFilePath] = useState(null);
	const [treeData, setTreeData] = useState(null);

	const { Header, Content } = Layout;

	const handleResp = (answer, highlight_text) => {
		// append new {Q, A} into conversation and setState to trigger re-render
		// using append/push will NOT trigger re-render, which is why we don't use it here
		setConversation([...conversation, { answer, highlight_text }]);
	};
	const closeTabHandler = (targetKey, action) => {
		if(action === 'remove'){
			if(targetKey === 'pdf')
				setShowPDF(false);
			else if(targetKey === 'tree')
				setShowTree(false);
		}
	};

  	return (
		<>
		<Layout style={layoutStyles}>
			<Header 
				style={headerStyles}
			>
				<div style={profileContainerStyles}>
					<Avatar.Group>
						<Avatar
							className='avatar-style'
							icon={<img src={logo} />}
							size="large"
							alt="NeuroPDF Logo"
						/>
						{isUploaded &&
							<Avatar
								className='avatar-style'
								icon={<FilePdfOutlined />}
								size="large"
								onClick={() => setShowPDF(!showPDF)} 
							/>
						}
						{isUploaded &&
							<Avatar
								className='avatar-style'
								icon={<PartitionOutlined />}
								size="large"
								onClick={() => setShowTree(!showTree)}
							/>
						}
					</Avatar.Group> 
					<div style={textContainerStyles}>
						NeuroPDF
						<RightOutlined />
					</div>
				</div>
			</Header>

			<Content style={contentStyles}>
				{isUploaded && (showPDF || showTree) &&
					<div style={tabStyle}> 
						<Tabs
							type='editable-card'
							onEdit={closeTabHandler}
							hideAdd
						>
							{showTree &&				
								<TabPane 
									key="tree"
									tab="Tree Graph"
								>
									<div style={treeOverlayStyle}>
										<TreeGraph
											data={{ filePath, treeData, setTreeData, showTree }}
										/>
									</div>
								</TabPane>
							}

							{showPDF &&	
								<TabPane
									key="pdf"
									tab="PDF Viewer"
								>
									<div style={pdfOverlayStyle}>
										<RenderPDF 
											data={{ filePath, showPDF }} 
										/>
									</div>
								</TabPane>
							}
						</Tabs>
					</div>
				}

				{/* makes sure 1st msg has 40px distance from the header */}
				<div 
					style={{ maxWidth: "900px", margin: "40px auto 0", padding: "0 24px" }}
				>
					<RenderQA 
						chatState={{ conversation, conversation_q, isLoading, liveAnswer, highlight }}
					/>
				</div>
			</Content>

			<div 
				style={chatComponentStyle}
			>
				<ChatComponent
					msgState={{ handleResp, isLoading, setIsLoading, setConversationQ, setLiveAnswer, setHighlight }}
					fileState={{ filePath, setFilePath, setIsUploaded }}
					treeState={{ setTreeData, showTree, showPDF }}
				/>
			</div>
		</Layout>
		</>
	);
};

export default App;