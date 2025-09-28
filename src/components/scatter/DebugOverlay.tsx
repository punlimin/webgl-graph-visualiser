"use client";

import { DrawModeType } from "@/types/webgl";

interface Props {
    fps: number;
    pointsInViewport: number;
    drawMode?: DrawModeType;
}

export default function DebugOverlay({ fps, pointsInViewport, drawMode }: Props) {
    return (
        <div className="absolute bottom-2 left-2 bg-black/60 text-green-400 px-3 py-1 rounded text-xs font-mono pointer-events-none">
            <div>FPS: {fps.toFixed(0)}</div>
            <div>Points Rendered: {pointsInViewport}</div>
            <div>Draw Mode: {drawMode ? drawMode.toUpperCase() : "-"}</div>
        </div>
    );
}
