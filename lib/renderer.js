"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.render = void 0;
const assert_1 = require("assert");
const font_1 = require("./font");
const layout_1 = require("./layout");
async function render(schematic, skin, options = {
    optimize: true,
    drawBoxes: false,
    fontSize: 20,
}) {
    let font = (0, font_1.defaultFont)(options.fontSize);
    const bakeText = !!options.bakeText;
    if (options.fontFile) {
        font = await (0, font_1.loadFontFromFile)(options.fontFile, options.fontSize);
    }
    const laidOut = await (0, layout_1.layout)(schematic, skin, font, options);
    if (font.font && !bakeText) {
        const usedChars = charsInNode(laidOut);
        font = (0, font_1.loadFontFromFont)((0, font_1.trimFont)(font.font, usedChars), options.fontSize);
    }
    if (bakeText) {
        font = { ...font, dataURL: undefined };
    }
    return renderSVG(laidOut, font, skin, !!options.drawBoxes, bakeText);
}
exports.render = render;
function labelsInTree(node) {
    const labels = [
        ...(node.labels ?? []).map((label) => label),
        ...(node.ports ?? []).flatMap((port) => port.labels ?? []),
        ...(node.children ?? []).flatMap((child) => labelsInTree(child)),
    ];
    return labels;
}
function charsInNode(node) {
    const labels = labelsInTree(node);
    const usedChars = new Set;
    for (const label of labels) {
        for (const char of label.text) {
            if (char !== "\n") {
                usedChars.add(char);
            }
        }
    }
    return [...usedChars.keys()].join("");
}
function round(value) {
    return String(Math.round(Number(value) * 1000) / 1000);
}
function roundUpOneDecimal(value) {
    return (Math.ceil(value * 10) / 10).toFixed(1);
}
function renderSVG(layout, font, skin, drawBoxes, bakeText) {
    (0, assert_1.strict)(layout.width !== undefined);
    (0, assert_1.strict)(layout.height !== undefined);
    const svgSymbols = layout.children.reduce((commands, node) => {
        (0, assert_1.strict)(node.x !== undefined);
        (0, assert_1.strict)(node.y !== undefined);
        (0, assert_1.strict)(node.width !== undefined);
        (0, assert_1.strict)(node.height !== undefined);
        const symbol = node.koppla.skin;
        (0, assert_1.strict)(symbol !== undefined);
        if (symbol.options?.dynamic) {
            symbol.updateDynamicSize({
                x: Number(node.width),
                y: Number(node.height),
            });
        }
        const rotation = (node.koppla.rotation * 180) / Math.PI;
        const sourceReference = {
            x: symbol.size.x / 2,
            y: symbol.size.y / 2,
        };
        const targetReference = {
            x: node.x + node.width / 2,
            y: node.y + node.height / 2,
        };
        const translation = {
            x: targetReference.x - sourceReference.x,
            y: targetReference.y - sourceReference.y,
        };
        const transforms = [
            `translate(${round(translation.x)}, ${round(translation.y)})`,
        ];
        if (rotation !== 0) {
            transforms.push(`rotate(${rotation},${round(sourceReference.x)},${round(sourceReference.y)})`);
        }
        if (node.koppla.flip) {
            transforms.push(`translate(${round(symbol.size.x)}, 0) scale(-1, 1)`);
        }
        const figure = `<g transform="${transforms.join("")}">${symbol?.svgData}</g>`;
        commands.push(figure);
        if (drawBoxes) {
            commands.push(`<rect x="${node.x}" y="${node.y}" width="${node.width}" height="${node.height}" style="fill:none;stroke:#000000;stroke-width:1;"/>`);
        }
        return commands;
    }, []);
    const topMargin = Math.round(font.height * 0.6);
    const totalHeight = layout.height + topMargin;
    const svgWires = layout.edges.reduce((commands, edge) => {
        const lines = (edge.sections ?? []).reduce((lines, section) => {
            const points = (section.bendPoints ?? []).concat(section.endPoint);
            const lineTos = points.map((point) => `L${round(point.x)} ${round(point.y)}`);
            lines.push(`M${round(section.startPoint.x)} ${round(section.startPoint.y)} ${lineTos.join("")}`);
            return lines;
        }, []);
        const wire = `<path d="${lines.join(" ")}" class="wire"/>`;
        commands.push(wire);
        return commands;
    }, []);
    const svgJunctions = layout.edges.flatMap((edge) => {
        return edge.junctionPoints?.map((point) => {
            const x = round(Number(point.x));
            const y = round(Number(point.y));
            return `<circle cx="${x}" cy="${y}" r="5" class="dot"/>`;
        });
    });
    const svgLabels = layout.children.flatMap((node) => {
        const labels = node.labels ?? [];
        const portLabels = (node.ports ?? []).flatMap((port) => (port.labels ?? []).map((label) => ({
            ...label,
            x: Number(port.x) + Number(label.x),
            y: Number(port.y) + Number(label.y),
        })));
        return [...labels, ...portLabels].map((label) => {
            const x = round(Number(node.x) + Number(label.x));
            const y = round(Number(node.y) + Number(label.y));
            const lines = label.text.split("\n");
            const lineHeight = font.height * 1.4;
            if (bakeText && font.font) {
                const fontFace = font.font;
                const scale = font.height / font.font.unitsPerEm;
                const yBaseline = Number(y) + fontFace.ascender * scale;
                const paths = lines.map((line, index) => {
                    const lineBaseline = yBaseline + index * lineHeight;
                    const path = fontFace.getPath(line, Number(x), lineBaseline, font.height);
                    return `<path d="${path.toPathData(3)}" class="textpath"/>`;
                });
                return (`
                    ${paths.join("\n")}
                    ` +
                    (drawBoxes
                        ? `<rect x="${x}" y="${y}" width="${label.width}" height="${label.height}" style="fill:none;stroke:#000000;stroke-width:1;"/>`
                        : ""));
            }
            return (`
                <text x="${x}" y="${y}">${lines
                .map((line, index) => {
                const dy = index === 0 ? 0 : lineHeight;
                return `<tspan x="${x}" dy="${dy}">${line}</tspan>`;
            })
                .join("")}</text>
                ` +
                (drawBoxes
                    ? `<rect x="${x}" y="${y}" width="${label.width}" height="${label.height}" style="fill:none;stroke:#000000;stroke-width:1;"/>`
                    : ""));
        });
    });
    const fontStyle = `
    ${font.dataURL
        ? `
    @font-face {
        font-family: "Koppla Electric";
        font-style: normal;
        src: url("${font.dataURL}");
    }`
        : ""}
    text {
        font-family: "Koppla Electric", monospace;
        font-size: ${font.height}px;
        font-weight: normal;
        fill: #000;
        stroke: none;
        dominant-baseline: hanging;
    }
    .pagebg {
        fill: #FFFFFF;
        stroke: none;
    }
    .wire {
        fill:none;
        stroke:#000;
        stroke-width:3.5;
        stroke-linecap:round;
    }
    .textpath {
        fill:#000;
        stroke:none;
    }
    .dot {
        fill:#000;
    }
    ${skin.styleCache.CSS}
    `;
    const viewWidth = roundUpOneDecimal(layout.width);
    const viewHeight = roundUpOneDecimal(totalHeight);
    return minify(`<?xml version="1.0" encoding="UTF-8" standalone="no"?>
        <svg viewBox="0 0 ${viewWidth} ${viewHeight}" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:svg="http://www.w3.org/2000/svg">
        <style>${fontStyle}</style>
        <rect x="0" y="0" width="${layout.width}" height="${totalHeight}" class="pagebg"/>
        <g transform="translate(0, ${topMargin})">
        ${svgSymbols.join("\n")}
        ${svgWires.join("\n")}
        ${svgJunctions.join("\n")}
        ${svgLabels.join("\n")}
        </g>
        </svg>`);
}
function minify(code) {
    const mini = code.replace(/^\s+/gm, "").replace(/[{]([^}]+)[}]/gm, (_all, style) => {
        const oneLine = (style?.split("\n") ?? []).join("");
        return `{${oneLine}}`;
    });
    return mini;
}
//# sourceMappingURL=renderer.js.map