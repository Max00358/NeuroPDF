import React from "react";

const wrapText = (text, maxCharsPerLine = 33) => {
	if (!text) return [];

	const words = text.split(" ");
	const lines = [];
	let currentLine = "";

	for (let word of words) {
		const testLine = currentLine + word + " ";
		if (testLine.length > maxCharsPerLine) {
			lines.push(currentLine.trim());
			currentLine = word + " ";
		} 
		else {
			currentLine = testLine;
		}
	}

	if (currentLine) lines.push(currentLine.trim());
	return lines;
};

const renderNode = ({ nodeDatum }) => {
	const width = 200;
	const lineHeight = 16;

	const nameLine = [nodeDatum.name];
	const previewLines = wrapText(nodeDatum.attributes?.content_preview);
	const pageLine = nodeDatum.attributes?.page
		? [`Page ${nodeDatum.attributes.page}`]
		: [];

	const lines = [...nameLine, ...previewLines, ...pageLine];
	const height = lines.length * lineHeight + 20;
	const isParent = nodeDatum.children && nodeDatum.children.length > 0;

	return (
		<>
			<rect
				x={-width / 2}
				y={-height / 2}
				width={width}
				height={height}
				rx={12}
				ry={12}
				fill="#ffffff"
				stroke="#dcdcdc"
				strokeWidth={1}
				filter="drop-shadow(0px 2px 6px rgba(0,0,0,0.1))"
			/>
			{lines.map((line, i) => {
				const isTitle = i === 0;
				const isPage = i === lines.length - 1 && pageLine.length === 1;
				const y = -height / 2 + 22 + i * lineHeight;

				return (
					<text
						key={i}
						x={0}
						y={y}
						textAnchor="middle"
						fontSize={isTitle ? "11" : isPage ? "9" : "10"}
						fontWeight={isTitle ? 700 : isPage ? 200 : 400}

						//stops .rd3t-node & .rd3t-leaf-node from affecting text thickness
						stroke="none"
          				strokeWidth={0}

						fill={isTitle ? "#111" : isPage ? "#999" : "#444"}
						style={{ fontFamily: "system-ui, sans-serif" }}
					>
						{line}
					</text>
				)
			})}
		</>
	);
};

export default renderNode;
