"use client";

import CanvasRenderer from "@/components/scatter/CanvasRenderer";
import Controls from "@/components/scatter/Controls";
import { DrawModeType, WebGLRef } from "@/types/webgl";
import { useRef, useState } from "react";

export default function ScatterPlotPage() {
    const [pointSize, setPointSize] = useState<number>(4);
    const [drawMode, setDrawMode] = useState<DrawModeType>(DrawModeType.AUTO);
    const [useAutoLOD, setUseAutoLOD] = useState<boolean>(true);

    const glRef = useRef<WebGL2RenderingContext | null>(null);
    const fullBufRef = useRef<WebGLBuffer | null>(null);
    const fullVaoRef = useRef<WebGLVertexArrayObject | null>(null);
    const coarseBufRef = useRef<WebGLBuffer | null>(null);
    const coarseVaoRef = useRef<WebGLVertexArrayObject | null>(null);

    const fullCountRef = useRef<number>(0);
    const coarseCountRef = useRef<number>(0);

    const worldSize = useRef<[number, number]>([2000, 2000]);

    const webglRef: WebGLRef = {
        glRef,
        fullBufRef,
        fullVaoRef,
        coarseBufRef,
        coarseVaoRef,
        fullCountRef,
        coarseCountRef,
        worldSize,
    };

    return (
        <>
            <main className="max-w-6xl mx-auto grid grid-cols-12 gap-2">
                {/** controls */}
                <section className="col-span-3 bg-white rounded-xl p-4 shadow">
                    <Controls
                        webglRef={webglRef}
                        pointSize={pointSize}
                        setPointSize={setPointSize}
                        drawMode={drawMode}
                        setDrawMode={setDrawMode}
                        useAutoLOD={useAutoLOD}
                        setUseAutoLOD={setUseAutoLOD}
                    />
                </section>

                {/** canvas */}
                <section className="col-span-9 bg-white rounded-xl shadow p-2 flex flex-col">
                    <CanvasRenderer
                        webglRef={webglRef}
                        pointSize={pointSize}
                        drawMode={drawMode}
                        useAutoLOD={useAutoLOD}
                    />
                </section>
            </main>

            <footer className="max-w-6xl mx-auto mt-6 text-xs text-primary-500">
                Built with WebGL2 • Progressive loading • Simple LOD
            </footer>
        </>
    );
}
