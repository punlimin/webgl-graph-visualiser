"use client";

import { WORKER_CODE } from "../../../public/worker";
import { DrawModeType, WebGLRef } from "@/types/webgl";
import { clampInput } from "@/utils/numberUtils";
import { useEffect, useRef, useState } from "react";

interface Props {
    webglRef: WebGLRef;
    pointSize: number;
    setPointSize: (value: number) => void;
    drawMode: DrawModeType;
    setDrawMode: (value: DrawModeType) => void;
    useAutoLOD: boolean;
    setUseAutoLOD: (value: boolean) => void;
}

const MAX_TOTAL_POINTS = 100_000;
const MAX_CHUNK_SIZE = 1_000;

export default function Controls({
    webglRef,
    pointSize,
    setPointSize,
    drawMode,
    setDrawMode,
    useAutoLOD,
    setUseAutoLOD,
}: Props) {
    const { glRef, fullBufRef, coarseBufRef, fullCountRef, coarseCountRef, worldSize } = webglRef;

    const [totalPoints, setTotalPoints] = useState<number>(MAX_TOTAL_POINTS);
    const [chunkSize, setChunkSize] = useState<number>(MAX_CHUNK_SIZE);
    const [coarseRate, setCoarseRate] = useState<number>(100);
    const [coarseCount, setCoarseCount] = useState<number>(0);
    const [generating, setGenerating] = useState<boolean>(false);
    const [loadedPoints, setLoadedPoints] = useState<number>(0);
    const [statusText, setStatusText] = useState<string>(`Loaded ${loadedPoints} points`);

    const workerRef = useRef<Worker | null>(null);

    const startGenerate = () => {
        // clean previous worker
        if (workerRef.current) {
            workerRef.current.terminate();
            workerRef.current = null;
        }

        const gl = glRef.current!;
        if (!gl) return;

        // pre-allocate GPU buffers to total capacity to avoid re-allocations
        const total = Math.max(1, Math.floor(totalPoints));
        const coarseCap = Math.ceil(total / Math.max(1, coarseRate));

        if (typeof webglRef.initBuffers === "function") {
            webglRef.initBuffers(total, coarseCap);
        } else {
            console.warn("GL not ready yet");
            return;
        }

        setGenerating(true);
        setLoadedPoints(0);
        setCoarseCount(0);

        // create worker from blob
        const blob = new Blob([WORKER_CODE], { type: "application/javascript" });
        const url = URL.createObjectURL(blob);
        const w = new Worker(url);
        workerRef.current = w;

        w.onmessage = (ev: MessageEvent) => {
            const msg = ev.data || {};
            if (msg.type === "chunk" && msg.buffer) {
                // append to full buffer using bufferSubData
                const arr = new Float32Array(msg.buffer);
                const offset = fullCountRef.current * 2 * 4;
                gl.bindBuffer(gl.ARRAY_BUFFER, fullBufRef.current);
                gl.bufferSubData(gl.ARRAY_BUFFER, offset, arr);
                fullCountRef.current += arr.length / 2;
                setLoadedPoints(p => p + arr.length / 2);
                webglRef.requestRender?.();
            } else if (msg.type === "coarse" && msg.buffer) {
                const arr = new Float32Array(msg.buffer);
                const offset = coarseCountRef.current * 2 * 4;
                gl.bindBuffer(gl.ARRAY_BUFFER, coarseBufRef.current);
                gl.bufferSubData(gl.ARRAY_BUFFER, offset, arr);
                coarseCountRef.current += arr.length / 2;
                setCoarseCount(coarseCountRef.current);
                webglRef.requestRender?.();
            } else if (msg.type === "progress") {
                // lightweight progress update
                if (msg.loaded) setLoadedPoints(msg.loaded);
            } else if (msg.type === "done") {
                setGenerating(false);
                setLoadedPoints(fullCountRef.current);
                // revoke worker URL
                URL.revokeObjectURL(url);
                webglRef.requestRender?.();
            }
        };

        // start
        w.postMessage({
            cmd: "generate",
            total,
            chunkSize,
            coarseRate,
            worldW: worldSize.current[0],
            worldH: worldSize.current[1],
        });
    };

    const stopGenerate = () => {
        if (workerRef.current) {
            workerRef.current.terminate();
            workerRef.current = null;
        }
        setGenerating(false);
    };

    const clearBuffers = () => {
        const gl = glRef.current!;
        if (!gl) return;
        if (fullBufRef.current) {
            gl.bindBuffer(gl.ARRAY_BUFFER, fullBufRef.current);
            gl.bufferData(gl.ARRAY_BUFFER, 4, gl.DYNAMIC_DRAW);
            fullCountRef.current = 0;
            setLoadedPoints(0);
        }
        if (coarseBufRef.current) {
            gl.bindBuffer(gl.ARRAY_BUFFER, coarseBufRef.current);
            gl.bufferData(gl.ARRAY_BUFFER, 4, gl.DYNAMIC_DRAW);
            coarseCountRef.current = 0;
            setCoarseCount(0);
        }

        webglRef.requestRender?.();
    };

    useEffect(() => {
        if (generating) {
            setStatusText(`Generating... (${loadedPoints} / ${totalPoints})`);
        } else {
            setStatusText(`Loaded ${loadedPoints} points`);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [generating]);

    return (
        <div>
            <div className="space-y-5 text-sm">
                <div>
                    <label className="block text-xs text-primary-600">
                        Total points
                        <input
                            id={"totalPoints"}
                            value={totalPoints}
                            onChange={e => setTotalPoints(Number(e.target.value))}
                            onBlur={e => {
                                setTotalPoints(clampInput(e.target.value, 1, MAX_TOTAL_POINTS));
                            }}
                            type="number"
                            className="w-full border rounded px-2 py-1 text-primary-800"
                        />
                    </label>
                </div>

                <div>
                    <label className="block text-xs text-primary-600">
                        Chunk size
                        <input
                            id={"chunkSize"}
                            value={chunkSize}
                            onChange={e => setChunkSize(Number(e.target.value))}
                            onBlur={e =>
                                setChunkSize(clampInput(e.target.value, 1, MAX_CHUNK_SIZE))
                            }
                            type="number"
                            className="w-full border rounded px-2 py-1 text-primary-800"
                        />
                    </label>
                </div>

                <div>
                    <label className="block text-xs text-primary-600">
                        Coarse sampling rate (1 per N)
                        <input
                            id={"coarseRate"}
                            value={coarseRate}
                            onChange={e => setCoarseRate(Number(e.target.value))}
                            onBlur={e =>
                                setCoarseRate(clampInput(e.target.value, 50, MAX_TOTAL_POINTS))
                            }
                            type="number"
                            className="w-full border rounded px-2 py-1 text-primary-800"
                        />
                    </label>
                </div>

                <div>
                    <label className="block text-xs text-primary-600">
                        {`Point size ${pointSize}`}
                        <input
                            type="range"
                            min={2}
                            max={20}
                            value={pointSize}
                            onChange={e => {
                                setPointSize(Number(e.target.value));
                            }}
                            className="w-full text-primary-800"
                        />
                    </label>
                </div>

                <div className="flex flex-col gap-2">
                    <button
                        onClick={startGenerate}
                        disabled={generating}
                        className="px-3 py-1 bg-primary-500 text-white rounded disabled:opacity-50"
                    >
                        Generate
                    </button>
                    <button
                        onClick={stopGenerate}
                        disabled={!generating}
                        className="px-3 py-1 bg-primary-200 text-primary-700 rounded disabled:opacity-50"
                    >
                        Stop
                    </button>
                    <button
                        onClick={() => {
                            clearBuffers();
                            stopGenerate();
                        }}
                        className="px-3 py-1 bg-primary-50 text-primary-700 rounded"
                    >
                        Clear
                    </button>
                </div>

                <div className="flex items-center gap-2">
                    <label htmlFor="auto" className="text-xs text-primary-600">
                        <input
                            id="auto"
                            type="checkbox"
                            checked={useAutoLOD}
                            className="mr-1"
                            onChange={e => setUseAutoLOD(e.target.checked)}
                        />
                        Auto LOD
                    </label>
                </div>

                <div>
                    <label className="block text-xs text-primary-600">
                        Draw mode
                        <select
                            id={"drawMode"}
                            value={drawMode}
                            onChange={e => setDrawMode(e.target.value as DrawModeType)}
                            className="w-full border rounded px-2 py-1 text-sm text-primary-800"
                        >
                            <option value="auto">Auto</option>
                            <option value="coarse">Coarse only</option>
                            <option value="full">Full points</option>
                        </select>
                    </label>
                </div>

                <div className="text-xs text-primary-600">{statusText}</div>
                <div className="text-xs text-primary-500">Coarse points: {coarseCount}</div>
            </div>
        </div>
    );
}
