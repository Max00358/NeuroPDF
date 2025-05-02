import { Stage, Layer, Rect, Group, Text } from 'react-konva';
import React, { useState, useRef, useEffect } from "react";

const Canva = ({ drawStatus, pdfStatus }) => {
    const { isDrawing, setIsDrawing, setTickCrossClicked } = drawStatus;
    const { pdfSize, scale, filePath } = pdfStatus;

    const [tempBox, setTempBox] = useState(null);   // temporary box
    const [hoverButton, setHoverButton] = useState(null);
    const [showButton, setShowButton] = useState(false);
    const stageRef = useRef(null);

    const mouseDownHandler = (e) => {
        if(!isDrawing) return;

        console.log("start drawing!!!");
        setShowButton(false);
        setTickCrossClicked(false);

        const stage = e.target.getStage();
        const point = stage.getPointerPosition();

        setTempBox({
            x: point.x,
            y: point.y,
            width: 0,
            height: 0
        });
    };
    const mouseMoveHandler = (e) => {
        if(!isDrawing || !tempBox) return;

        const stage = e.target.getStage();
        const point = stage.getPointerPosition();
        setTempBox(prev => ({
            ...prev,
            width: point.x - prev.x,
            height: point.y - prev.y
        }));
    };
    const mouseUpHandler = () => {
        if(!isDrawing) return;

        console.log("stop drawing");
        setIsDrawing(false);
        setShowButton(true);
    };

    const confirmBoxHandler = async (e) => {
        console.log("Confirm Clicked");

        if(stageRef.current) 
            stageRef.current.container().style.cursor = "default";

        setTempBox(null);
        setTickCrossClicked(true);
        setIsDrawing(false);

        // top left origin, grows downwards
        const backendBox = {
            filePath: filePath,
            x: tempBox ? (tempBox.x) * scale/2.7 : 0,
            y: tempBox ? (tempBox.y) * scale*1.65 : 0,
            width: tempBox ? tempBox.width*0.82 : 0,
            height: tempBox ? tempBox.height*0.82 : 0,
            page: 0,
        };

        try{
            const DOMAIN = process.env.REACT_APP_FAST_API_DOMAIN;
            const res = await fetch(`${DOMAIN}/extract-tables`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(backendBox),
            });

            const data = await res.json();
            console.log("Backend response:", data);
        }
        catch(err){
            console.error("Error sending box to backend:", err);
        }
    };
    const cancelBoxHandler = () => {
        console.log("Cancel Clicked");

        if(stageRef.current) 
            stageRef.current.container().style.cursor = "default";

        setTempBox(null);
        setTickCrossClicked(true);
        setIsDrawing(false);
    };

    // canva tick & cross behavior
    const mouseEnterHandler = (e, type) => {
        setHoverButton(type);

        const container = e.target.getStage().container();
        container.style.cursor = "pointer";
    };
    const mouseLeaveHandler = (e) => {
        setHoverButton(null);

        const container = e.target.getStage().container();
        container.style.cursor = "default";
    };

    useEffect(() => {
        const container = stageRef.current?.container();
        if(container) 
            container.style.cursor = isDrawing? "crosshair" : "default";
    }, [isDrawing]);

    return (
        <>
        <Stage
            ref={stageRef}

            width={pdfSize.width}
            height={pdfSize.height}
            onMouseDown={mouseDownHandler}
            onMouseMove={mouseMoveHandler}
            onMouseUp={mouseUpHandler}
        >
            <Layer>
                {/* render new box */}
                { tempBox && (
                <>
                    <Rect
                        x={tempBox.x}
                        y={tempBox.y}
                        width={tempBox.width}
                        height={tempBox.height}
                        fill="rgba(0, 110, 255, 0.2)"
                        stroke="rgba(0, 110, 255, 0.82)"
                        draggable
                    />

                    {/* tick & cross button near tempBox */}
                    {showButton &&
                        <Group
                            x={tempBox.x + tempBox.width + 10}
                            y={tempBox.y + tempBox.height}
                        >
                            <Text
                                text="✔"
                                fontSize={24}
                                width={24}
                                height={24}
                                fill={hoverButton === "confirm"? "#66cc66" : "green"}
                                onClick={(e) => confirmBoxHandler(e)}
                                onMouseEnter={(e) => mouseEnterHandler(e, "confirm")}
                                onMouseLeave={mouseLeaveHandler}
                            />
                            <Text
                                text="✖"
                                fontSize={24}
                                width={24}
                                height={24}
                                fill={hoverButton === "cancel"? "#ff6666" : "red"}
                                x={30}
                                onClick={cancelBoxHandler}
                                onMouseEnter={(e) => mouseEnterHandler(e, "cancel")}
                                onMouseLeave={mouseLeaveHandler}
                            />
                        </Group>
                    }
                </>
                )}
            </Layer>
        </Stage>
        </>
    );
};

export default Canva;