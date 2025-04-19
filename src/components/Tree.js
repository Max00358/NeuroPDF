import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import ReactD3Tree from "react-d3-tree";
import { CloseCircleOutlined } from "@ant-design/icons";
import { Button, message } from "antd";
import renderNode from "./RenderNode";

const TreeGraph = React.memo(({ data }) => {
    const { filePath, treeData, setTreeData, showTree, setShowTree } = data;

    const [ messageApi, contextHolder ] = message.useMessage();

    const hasFetchedRef = useRef(false);
    const pollingRef = useRef(null);
    const containerRef = useRef(null);
    const [translate, setTranslate] = useState({x: 0, y: 0});

    const API_URL = 'http://127.0.0.1:7860';

    const treeContainerStyle = { 
        position: "relative",
        boxSizing: "border-box",
        top: "10px",
        left: "0px",
        right: "0px",
        height: "76vh",

        backgroundColor: "rgba(194, 182, 182, 0.38)",
        backdropFilter: "blur(6px)",

        border: "1px solid rgba(232, 232, 232, 0.47)",
        borderRadius: "8px",
        //padding: "20px",
        zIndex: 0,

        overflow: "hidden"
    };

    const treeCloseButtonStyle = {
        position: "absolute",
        top: "8px",         // Distance from top
        right: "8px",       // Distance from right
        zIndex: treeContainerStyle.zIndex + 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: "32px",      // Fixed size for better click target
        height: "32px",
        
        backgroundColor: "rgba(255, 255, 255, 0.8)",
        borderRadius: "50%",
        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.15)",
        
        ":hover": {
          backgroundColor: "rgba(255, 255, 255, 1)",
          transform: "scale(1.1)"
        }
    };

    const msgStyle = {
        margin: '70px 0 0 0',
    };

    useEffect(() => {
        if(showTree && containerRef.current){
            const { width, height } = containerRef.current.getBoundingClientRect();
            setTranslate({ x: width/2, y: height/5 });
        }
    }, [showTree, treeData]);

    useEffect(() => {
        // keep React.StrictMode & avoid duplicated API calls
        if (hasFetchedRef.current) return;
        hasFetchedRef.current = true;

        const fetchTreeData = async() => {
            if(treeData) return;  // prevent re-rendering
            console.log("🔁 TreeGraph mounted");

            try{
                console.log(`Calling main.py...`);
                const start = performance.now();
                const response = await axios.post(`${API_URL}/tree`, { filePath });
                const end = performance.now();
                console.log(`finished executing main.py... using: ${(end-start)/1000} seconds`);

                const tree = response.data.tree;
                console.log("(Tree.js) Fetched tree data:", tree);

                if(tree) {
                    clearInterval(pollingRef.current);
                    setTreeData(tree);
                    console.log("✅ Tree loaded successfully.");
                }
                else{
                    console.log("⏳ Tree not ready yet, retrying...");
                }
            } catch(error){
                console.error("(Tree.js) Error fetching tree data:", error);
            }
        };

        fetchTreeData();
        // poll every 5 sec
            // used to store value across renders without UI changes, here it stores interval ID
        pollingRef.current = setInterval(fetchTreeData, 5000);

        return () => clearInterval(pollingRef.current);
    }, [filePath]);

    const key = 'treeLoading'; // used to identify & update existing msg
    useEffect(() => {
        if(!filePath) return;

        if (!treeData) {
            messageApi.loading({
                key,
                style: msgStyle,
                content: 'Analyzing PDF...',
                duration: 0
            });
        } 
        else if(treeData){
            messageApi.open({
                key,           // using same key makes sure the same msg gets updated
                type: 'success',
                style: msgStyle,
                content: (
                    <span 
                        onClick={() => setShowTree(true)} 
                        style={{ cursor: 'pointer'}}
                    >
                        View Tree
                    </span>
                ),
                duration: 0
            });
        }
    }, [treeData, filePath]);

    if (!treeData) {
        return (
            <>
                {contextHolder}
                {/* <div style={agentStyle}>
                    Loading Tree Graph...
                </div> */}
            </>
        )
    }

    return (
        <>
            {contextHolder}
            {showTree &&
                <div 
                    style={treeContainerStyle}
                    ref={containerRef}
                >
                    <Button
                        icon={<CloseCircleOutlined/>}
                        size="large"
                        type="link"
                        onClick={() => setShowTree(false)}
                        style={treeCloseButtonStyle}
                    />
                    
                    <ReactD3Tree
                        data={treeData}
                        orientation="vertical"
                        translate={translate}
                        zoomable={true}
                        collapsible={false}
                        separation={{
                            siblings: 1.7,
                            nonSiblings: 2
                        }}
                        renderCustomNodeElement={renderNode}
                        styles={{
                            links: { stroke: '#a0a0a0', strokeWidth: 2, fill: '0' },
                        }}
                    />
                </div>
            }
        </>
      );
});

export default TreeGraph;