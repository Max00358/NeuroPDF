import React, { useState, useEffect, useRef, useLayoutEffect } from "react";
import PdfUploader from './PdfUploader';
import { Button, Input, Popover, message } from "antd";
import { AudioOutlined, PlayCircleOutlined, PauseCircleOutlined, PlusCircleOutlined, BorderOutlined, ArrowUpOutlined, DownCircleOutlined } from "@ant-design/icons";
import SpeechRecognition, { useSpeechRecognition } from "react-speech-recognition";
import Speech from "speak-tts";
import chat from "../chat";

// static style obj stays outside component to avoid re-render/re-calculation
const chatBoxContainer = {
    width: "100%",
    height: "100%",
    border: "1px solid rgba(217, 217, 217, 0.7)",
    borderRadius: "8px",
    padding: "8px 12px",

    display: "flex", 
    flexDirection: "column", 
    gap: "12px"
};
const buttonRow = {
    display: "flex",
    justifyContent: "space-between", // or "flex-start" with `gap`
    alignItems: "center",
    flexWrap: "wrap",
    gap: "8px",
};

const ChatComponent = ({ msgState, fileState, treeState }) => {
    const { handleResp, isLoading, setIsLoading, setConversationQ, setLiveAnswer, highlight, setHighlight } = msgState;
	const { filePath, setFilePath, setIsUploaded } = fileState;
	const { setTreeData } = treeState;

    // searchValue is user's input text, we dig them out from Search->onSearch
    const [searchValue, setSearchValue] = useState("")
    const [speech, setSpeech] = useState();

    const [isRecording, setIsRecording] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [isPaused, setIsPaused] = useState(false);

    const [showScrollButton, setShowScrollButton] = useState(false);
    const [chatHeight, setChatHeight] = useState(0);
    const chatRef = useRef(null);
    const pauseRef = useRef(false);

    const [ messageApi, contextHolder ] = message.useMessage();

    const downCircleStyle = {
        position: "fixed",
        bottom: `${chatHeight + 55}px`,
        left: "50%",
        transform: "translateX(-50%)",
        opacity: 0.8,
    };

    const {
        transcript,
        listening,
        resetTranscript, // function to reset transcript str
        browserSupportsSpeechRecognition,
        isMicrophoneAvailable
    } = useSpeechRecognition();

    useEffect(() => {
        const speech = new Speech();
        speech
            .init({
                volume: 1,
                lang: "en-US",
                rate: 1,
                pitch: 1,
                voice: "Google US English",
                splitSentences: true
            })
            .then((data) => {
                console.log("speech init success: ", data);
                setSpeech(speech);
            })
            .catch((e) => {
                console.log("error occured during init:", e);
            })
    }, []);

    // this hook automates what happens after voice input ends
    // [listening, transcript]
        // means run when either of the above elements changes
    // []
        // means run when components first mount (insert components into DOM for 1st time)
    // no []
        // runs every re-render (expensive!)
    useEffect(() => {
        // !!transcript forces it to be a boolean
        if(!listening && !!transcript){
            (async() => await onSearch(transcript))();
            setIsRecording(false);
        }
    }, [listening, transcript]);

    // scrolling button functions
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

    // useLayoutEffect: react hook that runs after DOM mutation, but before browser paints the screen
    // use this when code needs to measure DOM (width, height...) before it becomes visible
    useLayoutEffect(() => {
        const observer = new ResizeObserver(entries => {
            for(let entry of entries){
                // filter to find the div/element we care about
                if(entry.target === chatRef.current)
                    setChatHeight(entry.contentRect.height);
            }
        });

        if(chatRef.current) observer.observe(chatRef.current);
        return () => observer.disconnect();
    }, []);

    // creating typing output effect
    const typingSpeed = 20;             // ms per char
    const bufferRef = useRef("");       // perserve 1 chunk of data
    const typeOut = () => {
        if(bufferRef.current.length === 0 || pauseRef.current) {
            isTypingRef.current = false;
            return;
        }

        const firstChar = bufferRef.current[0];
        bufferRef.current = bufferRef.current.slice(1); // slice off 0th char

        setLiveAnswer(prev => prev + firstChar);
        setTimeout(typeOut, typingSpeed);
    };

    const finalAnsRef = useRef("");
    const finalHighlightRef = useRef("");
    const isTypingRef = useRef(false);
    const startChat = (filePath, UserQuestion) => {
        // reset buffer
        finalAnsRef.current = "";
        finalHighlightRef.current = "";
        bufferRef.current = "";
        pauseRef.current = false;

        setLiveAnswer("");
        setHighlight("");
        
        chat(
            filePath,
            UserQuestion,
            (highlight_text) => {
                finalHighlightRef.current = highlight_text;
                setHighlight(highlight_text);
            },
            (chunk) => { // onLLMChunk
                if(!chunk) return;

                finalAnsRef.current += chunk;
                bufferRef.current += chunk;

                if(!isTypingRef.current && !pauseRef.current){
                    isTypingRef.current = true;
                    typeOut();
                }
            },
            () => { // onDone
                // when we receive "[DONE]", program can still be typing
                // but if we were to clear liveAnswer immediately, 
                // our display will be cutoff, and then new chunks are still coming in...
                const waitTypingDone = setInterval(() => {
                    if((!isTypingRef.current && bufferRef.current.length === 0) || pauseRef.current){
                        clearInterval(waitTypingDone);
                        
                        if(!pauseRef.current)
                            handleResp(finalAnsRef.current, finalHighlightRef.current);

                        // setIsLoading duration: immediately after Q's sent && before liveAnswer appears
                        setIsLoading(false);
                        setLiveAnswer("");
                        setHighlight("");

                        if (speech && isRecording) {
                            talk(finalAnsRef.current, isPaused);
                        }
                    }
                }, 50);
            }, 
            (err) => { // onError
                setLiveAnswer(`(ChatComponents.js) Error: ${err.message || "Streaming error"}`);
                setIsLoading(false);
            }
        );
    };
    const responseCancelHandler = () => {
        pauseRef.current = true;

        const waitTypingDone = setInterval(() => {
            if(pauseRef.current || !isTypingRef.current || bufferRef.current.length === 0){
                isTypingRef.current = false;
                bufferRef.current = "";
                clearInterval(waitTypingDone);

                handleResp(finalAnsRef.current, finalHighlightRef.current);
                setIsLoading(false);
                setLiveAnswer("");
                setHighlight("");
            }
        }, 50);
    };

    const talk = (what2say) => {
        speech.speak({
            text: what2say,
            queue: false, 
            listeners: {
                onstart: () => {
                    setIsSpeaking(true);
                    console.log("start utterance");
                },
                onend: () => {
                    console.log("end utterance");
                    setIsSpeaking(false);
                },
                onboundary: (event) => {
                    console.log(`${event.name} boundary reached after ${event.elapsedTime} milliseconds`);
                }
            }
        });
    };
    const recordingClickHandler = () => {
        setIsRecording(!isRecording);
        if(isRecording){
            setIsRecording(false);
            SpeechRecognition.stopListening();
        } else {
            setIsRecording(true);
            SpeechRecognition.startListening({ continuous: false });
        }
    };
    const pausingClickHandler = () => {
        // prev is current state value before update
        setIsPaused((prev) => {
            const currPaused = !prev;
            if(speech){
                if(currPaused) {
                    speech.pause();
                } else {
                    speech.resume();
                }
            }
            return currPaused;
        });
    };
    const pressEnterHandler = (e) => {
        if(isLoading){
            messageApi.warning("Hold on! A response is still generating...", 1);
        }
        else if(isRecording){
            messageApi.warning("Turn off chat mode to send text", 1);
        }
        // when enter is pressed but shift is NOT pressed, send LLM the user question
        else if(!e.shiftKey && searchValue.trim() !== ""){
            e.preventDefault();
            onSearch(searchValue);
        }
    };

    const handleChange = (e) => {
        setSearchValue(e.target.value);
    };
    const onSearch = async(question)=>{
        setIsLoading(true);
        setConversationQ(prev => [...prev, question]);
        setSearchValue(""); // clear text box after msg sent
        
        if (!filePath) {
            handleResp("Please upload a PDF before using chat.", "");
            setIsLoading(false);
            return;
        }
        startChat(filePath, question);
    };

    return(
        <div 
            style={chatBoxContainer}
            ref={chatRef}
        >
            {contextHolder}
            {showScrollButton &&
                <Button 
                    type="primary"
                    size="large"
                    shape='circle'
                    icon={<DownCircleOutlined/>}
                    onClick={scrollToBottom}
                    style={downCircleStyle}
                />
            }

            {/* Search bar */}
            <Input.TextArea
                placeholder="Ask Anything"
                autoSize={{ 
                    minRows: 1, 
                    maxRows: 7
                }}
                value={searchValue}
                onChange={handleChange}
                onPressEnter={pressEnterHandler}
                style={{ 
                    flexGrow: 1,
                    fontSize: "16px",
                    lineHeight: "1.5",
                    padding: "5px 10px 0px 10px",
                    border: "none",                // no border
                    boxShadow: "none",             // no inner shadow
                    resize: "none",
                    outline: "none",               // no blue border when focused
                    backgroundColor: "transparent" // match container
                }}
            />

            {/* Action buttons */}
            <div 
                style={buttonRow}
            >
                <Popover
                    content={
                        <PdfUploader 
                            setFilePath={setFilePath} 
                            setIsUploaded={setIsUploaded}
                            setTreeData={setTreeData}
                        />
                    }
                    title="Upload PDF"
                    trigger="click"
                    placement="bottomLeft" // position of tooltip relative to the target(button)
                    arrow={{ pointAtCenter: true }}
                >
                    <Button 
                        type="primary"
                        size="middle"
                        shape="circle"
                        icon={<PlusCircleOutlined/>}
                    />
                </Popover>

                <div 
                    style={{
                        display: "flex",
                        justifyContent: "flex-end",
                        alignItems: "center",
                        gap: "8px"
                    }}
                >
                    <Button
                        type="primary"
                        size="middle"
                        shape="circle"
                        icon={isSpeaking && isPaused ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
                        disabled={!isSpeaking}
                        danger={isSpeaking && isPaused}
                        onClick={pausingClickHandler}
                    />
                    <Button
                        type="primary"
                        size="middle"
                        shape="circle"
                        icon={<AudioOutlined />}
                        danger={isRecording}
                        onClick={recordingClickHandler}
                    />

                    {isLoading ?
                        // response cancel
                        (<Button
                            type="primary"
                            size="middle"
                            shape="circle"
                            icon={<BorderOutlined />}
                            onClick={responseCancelHandler}
                        />)
                        :
                        // response send
                        (<Button
                            type="primary"
                            size="middle"
                            shape="circle"
                            disabled={isRecording}
                            icon={<ArrowUpOutlined />}
                            onClick={pressEnterHandler}
                        />)
                    }
                </div>
            </div>
        </div>
    )
};

export default ChatComponent;