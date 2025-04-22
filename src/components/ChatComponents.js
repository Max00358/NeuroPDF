import React, { useState, useEffect, useRef } from "react";
import PdfUploader from './PdfUploader';
import { Button, Input, Popover } from "antd";
import { AudioOutlined, PlayCircleOutlined, PauseCircleOutlined, PlusCircleOutlined } from "@ant-design/icons";
import SpeechRecognition, { useSpeechRecognition } from "react-speech-recognition";
import Speech from "speak-tts";
import chat from "../chat";

const searchContainer = {
    display: "flex",
    justifyContent: "center",
    alignItems: "flex-end" // sticks buttons to the end ("bottom" option doesn't exist)
};

const ChatComponent = ({ msgState, fileState, treeState }) => {
    const { handleResp, setIsLoading, setConversationQ, setLiveAnswer, highlight, setHighlight } = msgState;
	const { filePath, setFilePath, setIsUploaded } = fileState;
	const { setTreeData } = treeState;

    // searchValue is user's input text, we dig them out from Search->onSearch
    const [searchValue, setSearchValue] = useState("")
    const [speech, setSpeech] = useState();

    const [isChatModeOn, setIsChatModeOn] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [isPaused, setIsPaused] = useState(false);

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

    // creating typing output effect
    const typingSpeed = 20;             // ms per char
    const bufferRef = useRef("");       // perserve 1 chunk of data
    const typeOut = () => {
        if(bufferRef.current.length === 0) {
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

                if(!isTypingRef.current){
                    isTypingRef.current = true;
                    typeOut();
                }
            },
            () => { // onDone
                // when we receive "[DONE]", program can still be typing
                // but if we were to clear liveAnswer immediately, 
                // our display will be cutoff, and then new chunks are still coming in...
                const waitTypingDone = setInterval(() => {
                    if(!isTypingRef.current && bufferRef.current.length === 0){
                        clearInterval(waitTypingDone);

                        handleResp(finalAnsRef.current, finalHighlightRef.current);
                        // setIsLoading duration: immediately after Q's sent && before liveAnswer appears
                        setIsLoading(false);
                        setLiveAnswer("");
                        setHighlight("");

                        if (speech && isChatModeOn) {
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

    const talk = (what2say) => {
        speech.speak({
            text: what2say,
            queue: false, 
            listeners: {
                onstart: () => {
                    console.log("start utterance");
                },
                onend: () => {
                    console.log("end utterance");
                },
                onboundary: (event) => {
                    console.log(`${event.name} boundary reached after ${event.elapsedTime} milliseconds`);
                }
            }
        });
    };
    const chatModeClickHandler = () => {
        setIsChatModeOn(!isChatModeOn);
        setIsRecording(false);
        SpeechRecognition.stopListening();
    };
    const recordingClickHandler = () => {
        if(isRecording){
            setIsRecording(false);
            SpeechRecognition.stopListening();
        } else {
            setIsRecording(true);
            SpeechRecognition.startListening({ continuous: false });
        }
    };
    const mutingClickHandler = () => {
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

    return (
        <div style={searchContainer}>
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
                    size="large"
                    icon={<PlusCircleOutlined/>}
                    style={{ 
                        margin: "0 5px 0 5px", // top, right, bottom, left
                        height: "42px"
                    }} 
                >
                    Upload
                </Button>
            </Popover>

            {/* the search bar implementation */}
            {!isChatModeOn &&
                <Input.TextArea // subcomponent: multi-line text box
                    placeholder="Ask Anything"
                    autoSize={{ 
                        minRows: 1, 
                        maxRows: 6 
                    }}
                    value={searchValue}
                    onChange={handleChange}
                    onPressEnter={(e) => {
                        // when enter is pressed but shift is NOT pressed, send LLM the user question
                        if(!e.shiftKey && searchValue.trim() !== ""){
                            e.preventDefault();
                            onSearch(searchValue);
                        }
                    }}
                    style={{ 
                        flex: 1,
                        fontSize: "16px",
                        lineHeight: "1.5", 
                        padding: "8px 12px",
                    }}
                />
            }
            <Button
                type="primary"
                size="large"
                danger={isChatModeOn}
                onClick={chatModeClickHandler}
                style={{ 
                    marginLeft: "5px",
                    height: "42px"
                }}
            >
                Chat Mode: {isChatModeOn? "On" : "Off"}
            </Button>

            {
            isChatModeOn && 
                <Button
                    type="primary"
                    icon={<AudioOutlined />}
                    size="large"
                    danger={isRecording}
                    onClick={recordingClickHandler}
                    style={{ 
                        marginLeft: "5px",
                        height: "42px"
                    }}
                >
                    {isRecording ? "Recording..." : "Click to Record"}
                </Button>
            }
            {
            isChatModeOn && 
                <Button
                    type="primary"
                    icon={isPaused && isRecording? <PauseCircleOutlined /> : <PlayCircleOutlined />}
                    size="large"
                    danger={isPaused && isRecording}
                    onClick={mutingClickHandler}
                    style={{ 
                        marginLeft: "5px",
                        height: "42px"
                    }}
                >
                </Button>
            }
        </div>
    )
};

export default ChatComponent;