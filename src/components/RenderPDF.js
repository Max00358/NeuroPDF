import { Button, message, Spin } from "antd";
import { ZoomInOutlined, ZoomOutOutlined, HomeOutlined, PieChartOutlined, StopOutlined } from "@ant-design/icons";
import React, { useState, useRef, useEffect } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/esm/Page/AnnotationLayer.css";
import "react-pdf/dist/esm/Page/TextLayer.css";
import Canva from "./Canva";

// adding REACT_APP_ prefix means .env var is safe to be exposed to front-end
pdfjs.GlobalWorkerOptions.workerSrc = process.env.REACT_APP_PDF_WORKER_URL;
const REACT_URL = process.env.REACT_APP_DOMAIN;

const pdfContainerStyle = {
    position: "relative",
    boxSizing: "border-box",
    height: "64.6vh",
};
const buttonListStyle = {
    position: "absolute", 
    top: "1.5%",
    right: "10px",

    display: "flex",
    flexDirection: "column",
    gap: "7px",
    zIndex: 3, 
    
    alignItems: "flex-end",
    cursor: "pointer",
    
    ":hover": {
        backgroundColor: "rgba(255, 255, 255, 1)",
    }
}
const scrollContainerStyle = {
    overflowY: "auto",
    height: "100%",

    display: "flex",
    justifyContent: "center",
};
const pdfBackgroundContainerStyle = {
    height: "100%",
    //backgroundColor: "rgba(194, 182, 182, 0.38)",
    //backdropFilter: "blur(6px)",

    borderRadius: "0 0 8px 8px",
    display: "flex",
    justifyContent: "center",
    zIndex: 0,
};

const RenderPDF = ({ data }) => {
    const { filePath, showPDF } = data;
    const fileName = filePath.replace(/^.*[\\\/]/, '')
    const fileUrl = `${REACT_URL}/uploads/${encodeURIComponent(fileName)}`; // encodeURIComponent for URL safety

    const [ messageApi, contextHolder ] = message.useMessage();
    const errorShownRef = useRef(false);

    const [numPages, setNumPages] = useState(null);
    const defaultScale = 0.5;
    const [scale, setScale] = useState(defaultScale);

    const pdfContainerRef = useRef(null);
    const [pdfSize, setPdfSize] = useState({ width: 0, height: 0 });
    const [isDrawing, setIsDrawing] = useState(false);

    useEffect(() => {
        if(pdfContainerRef.current){
            const offsetWidth = pdfContainerRef.current.offsetWidth;
            const offsetHeight = pdfContainerRef.current.offsetHeight;

            setPdfSize({ width: offsetWidth, height: offsetHeight });
        }
    }, [numPages, scale]);

    const onDocumentLoadSuccess = ({ numPages }) => {
        setNumPages(numPages);
        errorShownRef.current = false; // reset
    };
    const onDocumentLoadError = () => {
        if (showPDF && !errorShownRef.current) {
            errorShownRef.current = true;

            setTimeout(() => {
                messageApi.warning("Failed to Load PDF...", 0.8);
                setTimeout(() => {
                    errorShownRef.current = false; // reset for future toggles
                }, 500);
            }, 0);
        }
    };
    const zoomInHandler = () => {
        setScale(prev => Math.min(2.0, prev + 0.1));
    };
    const zoomOutHandler = () => {
        setScale(prev => Math.max(0.1, prev - 0.1));
    };
    const homeHandler = () => {
        setScale(defaultScale);
    };

    const startDrawingHandler = () => {
        console.log("isDrawing: TRUE!");
        setIsDrawing(true);
    };
    const stopDrawingHandler = () => {
        console.log("isDrawing: FALSE!");
        setIsDrawing(false);
    };

    return (
        <>
            {contextHolder}
            {showPDF &&
            <>
                <div
                    style={pdfContainerStyle}
                >
                    <span
                        style={buttonListStyle}
                    >
                        <Button
                            type="primary"
                            size="middle"
                            shape='circle'
                            icon={<HomeOutlined />}
                            onClick={homeHandler}
                        />
                        <Button
                            type="primary"
                            size="middle"
                            shape='circle'
                            icon={<ZoomInOutlined />}
                            onClick={zoomInHandler}
                        />
                        <Button
                            type="primary"
                            size="middle"
                            shape='circle'
                            icon={<ZoomOutOutlined />}
                            onClick={zoomOutHandler}
                        />
                        <Button
                            type="primary"
                            size="middle"
                            shape='circle'
                            danger={isDrawing? true : false}
                            icon={isDrawing? <StopOutlined /> : <PieChartOutlined />}
                            onClick={isDrawing? stopDrawingHandler : startDrawingHandler}
                        />
                    </span>

                    <div 
                        style={pdfBackgroundContainerStyle}
                        ref={pdfContainerRef} // ref works on DOM element (div) but not on react-components (Document)
                    >
                        <div
                            style={scrollContainerStyle}
                        >
                            <Document
                                file={fileUrl}
                                loading={
                                    <Spin tip="Loading PDF..." >
                                        <div style={{ minHeight: 100 }} />
                                    </Spin>
                                }
                                onDocumentLoadSuccess={onDocumentLoadSuccess}
                                error={onDocumentLoadError}
                            >
                                {Array.from(new Array(numPages), (el, index) => (
                                    <Page
                                        key={`page_${index+1}`}
                                        pageNumber={index + 1} // pageNumber starts from 1 not 0
                                        scale={scale}
                                        width={1500}
                                    />
                                ))}
                            </Document>

                            <div style={{
                                position: "absolute",
                                top: 0,
                                left: 0,
                                cursor: isDrawing? "crosshair" : "default",
                                zIndex: 2,
                            }}>
                                <Canva 
                                    drawStatus={{ isDrawing, setIsDrawing }} 
                                    pdfSize={ pdfSize }
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </>
            }
        </>
    );
};

export default RenderPDF;