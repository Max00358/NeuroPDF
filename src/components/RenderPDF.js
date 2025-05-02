import { Button, message, Spin } from "antd";
import { ZoomInOutlined, ZoomOutOutlined, HomeOutlined, PieChartOutlined, StopOutlined } from "@ant-design/icons";
import React, { useState, useRef, useEffect } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/esm/Page/AnnotationLayer.css";
import "react-pdf/dist/esm/Page/TextLayer.css";
import Canva from "./Canva.js";

pdfjs.GlobalWorkerOptions.workerSrc = process.env.REACT_APP_PDF_WORKER_URL;
const REACT_URL = process.env.REACT_APP_DOMAIN;

// Styles
const styles = {
    pdfContainer: {
        position: "relative",
        height: "64.6vh",
        width: "100%",
        overflow: "hidden",
    },
    buttonList: {
        position: "absolute",
        top: "1.5%",
        right: "10px",
        display: "flex",
        flexDirection: "column",
        gap: "7px",
        zIndex: 3,
        alignItems: "flex-end",
    },
    scrollContainer: {
        overflowY: "auto",
        height: "100%",
        width: "100%",
    },
    pageContainer: {
        marginBottom: "20px",
        position: "relative",
        display: "flex",
        justifyContent: "center",
    },
};

const RenderPDF = ({ data }) => {
    const { filePath, showPDF } = data;
    const fileName = filePath.replace(/^.*[\\\/]/, '');
    const fileUrl = `${REACT_URL}/uploads/${encodeURIComponent(fileName)}`;

    const [messageApi, contextHolder] = message.useMessage();
    const errorShownRef = useRef(false);

    const [numPages, setNumPages] = useState(null);
    const defaultScale = 0.5;
    const [scale, setScale] = useState(defaultScale);

    const pdfContainerRef = useRef(null);
    const [pdfSize, setPdfSize] = useState({ width: 0, height: 0 });
    const [isDrawing, setIsDrawing] = useState(false);
    const [tickCrossClicked, setTickCrossClicked] = useState(false);

    const canvasContainer = {
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        zIndex: (isDrawing || !tickCrossClicked) ? 2 : 1,
    }

    useEffect(() => {
        if (pdfContainerRef.current) {
            const { offsetWidth, offsetHeight } = pdfContainerRef.current;
            setPdfSize({ width: offsetWidth, height: offsetHeight });
        }
    }, [numPages, scale, showPDF]);

    const onDocumentLoadSuccess = ({ numPages }) => {
        setNumPages(numPages);
        errorShownRef.current = false;
    };

    const onDocumentLoadError = (error) => {
        if (showPDF && !errorShownRef.current) {
            errorShownRef.current = true;
            messageApi.error("Failed to load PDF", 2);
            console.error("PDF load error:", error);
        }
    };

    const zoomInHandler = () => setScale(prev => Math.min(2.0, prev + 0.1));
    const zoomOutHandler = () => setScale(prev => Math.max(0.1, prev - 0.1));
    const homeHandler = () => setScale(defaultScale);
    const toggleDrawingHandler = () => setIsDrawing(!isDrawing);

    return (
        <>
            {contextHolder}
            {showPDF && (
                <div style={styles.pdfContainer} ref={pdfContainerRef}>
                    <div style={styles.buttonList}>
                        <Button
                            type="primary"
                            size="middle"
                            shape="circle"
                            icon={<HomeOutlined />}
                            onClick={homeHandler}
                        />
                        <Button
                            type="primary"
                            size="middle"
                            shape="circle"
                            icon={<ZoomInOutlined />}
                            onClick={zoomInHandler}
                        />
                        <Button
                            type="primary"
                            size="middle"
                            shape="circle"
                            icon={<ZoomOutOutlined />}
                            onClick={zoomOutHandler}
                        />
                        <Button
                            type="primary"
                            size="middle"
                            shape="circle"
                            danger={isDrawing}
                            icon={isDrawing ? <StopOutlined /> : <PieChartOutlined />}
                            onClick={toggleDrawingHandler}
                        />
                    </div>

                    <div style={styles.scrollContainer}>
                        <Document
                            file={fileUrl}
                            loading={<Spin tip="Loading PDF..." />}
                            onLoadSuccess={onDocumentLoadSuccess}
                            onLoadError={onDocumentLoadError}
                        >
                            {Array.from({ length: numPages || 0 }, (_, index) => (
                                <div key={`page_${index + 1}`} style={styles.pageContainer}>
                                    <Page
                                        pageNumber={index + 1}
                                        scale={scale}
                                        width={pdfContainerRef.current?.offsetWidth * 0.9}
                                        renderTextLayer={false}
                                        renderAnnotationLayer={false}
                                    />

                                    <div style={canvasContainer}>
                                        <Canva
                                            drawStatus={{ isDrawing, setIsDrawing, setTickCrossClicked }}
                                            pdfStatus={{ pdfSize, scale, filePath, index }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </Document>
                    </div>
                </div>
            )}
        </>
    );
};

export default RenderPDF;