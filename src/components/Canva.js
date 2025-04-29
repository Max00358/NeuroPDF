import { Stage, Layer, Rect, Group, Text } from 'react-konva';
import React, { useState } from "react";

const Canva = ({ drawStatus, pdfSize }) => {
    const { isDrawing, setIsDrawing } = drawStatus;

    const [tempBox, setTempBox] = useState(null);   // temporary box
    //const [finBoxes, setFinBoxes] = useState([]);   // confirmed boxes

    const [hoverButton, setHoverButton] = useState(null);

    const mouseDownHandler = (e) => {
        if(!isDrawing) return;

        console.log("start drawing!!!");
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
        setIsDrawing(false);
    };

    const confirmBoxHandler = () => {
        //setFinBoxes(prev => [...prev, tempBox]);
        console.log("Confirm Clicked");
        setTempBox(null);
    };
    const cancelBoxHandler = () => {
        console.log("Cancel Clicked");
        setTempBox(null);
    };

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

    return (
        <>
        <Stage
            width={pdfSize.width}
            height={pdfSize.height}
            onMouseDown={mouseDownHandler}
            onMouseMove={mouseMoveHandler}
            onMouseUp={mouseUpHandler}
            style={{ pointerEvents: "auto" }}
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
                        fill="rgba(0,255,0,0.2)"
                        stroke="green"
                        draggable
                    />

                    {/* tick & cross button near tempBox */}
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
                            onClick={confirmBoxHandler}
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
                </>
                )}
            </Layer>
        </Stage>
        </>
    );
};

export default Canva;