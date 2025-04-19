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
		<g>
			<rect
				x={-width / 2}
				y={-height / 2}
				width={width}
				height={height}
				rx={10}
				ry={10}
				fill="#ffffff"
				stroke="#1890ff"
				strokeWidth={2}
			/>
			{lines.map((line, i) => (
				<text
					key={i}
					x={0}
					y={-height / 2 + 20 + i * lineHeight}
					textAnchor="middle"
					fill="#333"
					fontSize="12"
					fontWeight={i === 0 ? 200 : 50}
				>
					{line}
				</text>
			))}
		</g>
	);
};

export default renderNode;
