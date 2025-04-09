import React, { useState, useEffect} from "react";
import { Button, Input } from "antd";
import { AudioOutlined, PlayCircleOutlined, PauseCircleOutlined} from "@ant-design/icons";
import SpeechRecognition, { useSpeechRecognition } from "react-speech-recognition";
import Speech from "speak-tts";
import axios from "axios";

const { Search } = Input
const DOMAIN = process.env.REACT_APP_DOMAIN;

const searchContainer = {
    display: "flex",
    justifyContent: "center"
};

const ChatComponent = (props) => {
    const { handleResp, isLoading, setIsLoading, filePath} = props;
    // searchValue is user's input text, we dig them out from Search->onSearch
    const [searchValue, setSearchValue] = useState("")
    const [isChatModeOn, setIsChatModeOn] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [speech, setSpeech] = useState();

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
        setSearchValue(""); // clear text box after msg sent
        if (!filePath) {
            handleResp(question, "Please upload a PDF before using chat.");
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        try{
            const response = await axios.post(`${DOMAIN}/chat`, {
                message: question,
                filePath    // filePath to PDF
            });
            const response_str = response.data?.answer || "No Response Data :(";
            handleResp(question, response_str);
            
            if(speech && isChatModeOn){
                talk(response_str, isPaused);
            }
        }
        catch(error){
            console.error(`Error: ${error}`);
            // '?' is nullish-safety check, '?.' is optional chaining
            const safeMsg = error?.response?.data || error.message || "ChatComponents->onSearch Error";
            handleResp(question, safeMsg.toString());
        }
        finally{
            setIsLoading(false);
        }
    };

    return (
        <div style={searchContainer}>
            {/* the search bar implementation */}
            {!isChatModeOn &&
                <Search
                    placeholder="Ask Anything"
                    enterButton="Ask"
                    size="large"
                    onSearch={onSearch}
                    loading={isLoading}
                    value={searchValue}
                    onChange={handleChange}
                />
            }
            <Button
                type="primary"
                size="large"
                danger={isChatModeOn}
                onClick={chatModeClickHandler}
                style={{ marginLeft: "5px" }}
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
                    style={{ marginLeft: "5px" }}
                >
                    {isRecording ? "Recording..." : "Click to Record"}
                </Button>
            }
            {
            isChatModeOn &&
                <Button
                    type="primary"
                    icon={isPaused? <PauseCircleOutlined /> : <PlayCircleOutlined />}
                    size="large"
                    danger={isPaused}
                    onClick={mutingClickHandler}
                    style={{ marginLeft: "5px" }}
                >
                </Button>
            }
        </div>
    )
};

export default ChatComponent;