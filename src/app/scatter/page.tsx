"use client";

import CanvasRenderer from "@/components/scatter/CanvasRenderer";
import Controls from "@/components/scatter/Controls";
import { DrawModeType, PointItem, WebGLRef } from "@/types/webgl";
import { useEffect, useRef, useState } from "react";
import RBush from "rbush";
import { MAX_TOTAL_POINTS } from "@/config/webglConfig";

export default function ScatterPlotPage() {
    const [pointSize, setPointSize] = useState<number>(4);
    const [drawMode, setDrawMode] = useState<DrawModeType>(DrawModeType.AUTO);
    const [useAutoLOD, setUseAutoLOD] = useState<boolean>(true);
    const [showDebug, setShowDebug] = useState<boolean>(true);

    const glRef = useRef<WebGL2RenderingContext | null>(null);
    const fullBufRef = useRef<WebGLBuffer | null>(null);
    const coarseBufRef = useRef<WebGLBuffer | null>(null);

    const rTreeRef = useRef<RBush<PointItem>>(new RBush<PointItem>());
    const rCoarseTreeRef = useRef<RBush<PointItem>>(new RBush<PointItem>());

    const fullCountRef = useRef<number>(0);
    const coarseCountRef = useRef<number>(0);

    const worldSize = useRef<[number, number]>([2000, 2000]);

    const webglRef: WebGLRef = {
        glRef,
        fullBufRef,
        coarseBufRef,
        fullCountRef,
        coarseCountRef,
        worldSize,
        rTreeRef,
        rCoarseTreeRef,
    };

    useEffect(() => {
        const gl = glRef.current!;

        gl.bindBuffer(gl.ARRAY_BUFFER, fullBufRef.current);
        gl.bufferData(gl.ARRAY_BUFFER, MAX_TOTAL_POINTS * 2 * 4, gl.DYNAMIC_DRAW);

        gl.bindBuffer(gl.ARRAY_BUFFER, coarseBufRef.current);
        gl.bufferData(gl.ARRAY_BUFFER, MAX_TOTAL_POINTS * 2 * 4, gl.DYNAMIC_DRAW);

        fullCountRef.current = 0;
        coarseCountRef.current = 0;

        // Reset counts
        fullCountRef.current = 0;
        coarseCountRef.current = 0;
    }, []);

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
                        showDebug={showDebug}
                        setShowDebug={setShowDebug}
                    />
                </section>

                {/** canvas */}
                <section className="col-span-9 bg-white rounded-xl shadow p-2 flex flex-col">
                    <CanvasRenderer
                        webglRef={webglRef}
                        pointSize={pointSize}
                        drawMode={drawMode}
                        useAutoLOD={useAutoLOD}
                        showDebug={showDebug}
                    />
                </section>
            </main>

            <footer className="max-w-6xl mx-auto mt-3 text-xs text-primary-600">
                This demo streams points from a worker and shows a coarse sample quickly so you get
                an overview while the full set loads. The coarse/full switching is controlled by
                zoom when Auto LOD is enabled.
            </footer>
        </>
    );
}
