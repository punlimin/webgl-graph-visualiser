"use client";

import { MAX_TOTAL_POINTS, MAX_CHUNK_SIZE } from "@/config/webglConfig";
import { WORKER_CODE } from "../../../public/worker";
import { DrawModeType, PointItem, WebGLRef } from "@/types/webgl";
import { clampInput } from "@/utils/numberUtils";
import { useCallback, useEffect, useRef, useState } from "react";

interface Props {
    webglRef: WebGLRef;
    pointSize: number;
    setPointSize: (value: number) => void;
    drawMode: DrawModeType;
    setDrawMode: (value: DrawModeType) => void;
    useAutoLOD: boolean;
    setUseAutoLOD: (value: boolean) => void;
    showDebug: boolean;
    setShowDebug: (value: boolean) => void;
}

export default function Controls({
    webglRef,
    pointSize,
    setPointSize,
    drawMode,
    setDrawMode,
    useAutoLOD,
    setUseAutoLOD,
    showDebug,
    setShowDebug,
}: Props) {
    const {
        glRef,
        fullBufRef,
        coarseBufRef,
        fullCountRef,
        coarseCountRef,
        worldSize,
        rTreeRef,
        rCoarseTreeRef,
    } = webglRef;

    const [totalPoints, setTotalPoints] = useState(MAX_TOTAL_POINTS / 100);
    const [chunkSize, setChunkSize] = useState(100);
    const [coarseRate, setCoarseRate] = useState(100);
    const [loadedPoints, setLoadedPoints] = useState(0);
    const [coarseCount, setCoarseCount] = useState(0);
    const [statusText, setStatusText] = useState(`Loaded 0 points`);
    const [generating, setGenerating] = useState(false);

    const workerRef = useRef<Worker | null>(null);

    const startGenerate = useCallback(
        (pointsToGenerate: number, startIdx = fullCountRef.current) => {
            if (generating) return;
            const gl = glRef.current;
            if (!gl) return;

            if (pointsToGenerate > MAX_TOTAL_POINTS) {
                console.warn(
                    `Requested ${pointsToGenerate} points exceeds maximum ${MAX_TOTAL_POINTS}`
                );
                pointsToGenerate = MAX_TOTAL_POINTS;
            }

            setGenerating(true);

            if (workerRef.current) workerRef.current.terminate();

            const blob = new Blob([WORKER_CODE], { type: "application/javascript" });
            const url = URL.createObjectURL(blob);
            const worker = new Worker(url);
            workerRef.current = worker;

            worker.onmessage = (ev: MessageEvent) => {
                const msg = ev.data || {};
                const arr = msg.buffer ? new Float32Array(msg.buffer) : null;

                if (msg.type === "chunk" && arr && arr.length > 0) {
                    const remaining = MAX_TOTAL_POINTS - fullCountRef.current;
                    const writeLen = Math.min(arr.length / 2, remaining);
                    if (writeLen <= 0) return;

                    const offset = fullCountRef.current * 2 * 4;
                    gl.bindBuffer(gl.ARRAY_BUFFER, fullBufRef.current);
                    gl.bufferSubData(gl.ARRAY_BUFFER, offset, arr.subarray(0, writeLen * 2));

                    const startFullCount = fullCountRef.current;
                    fullCountRef.current += writeLen;
                    setLoadedPoints(fullCountRef.current);

                    // Full points for R-tree
                    const fullItems: PointItem[] = [];
                    for (let i = 0; i < writeLen * 2; i += 2) {
                        const x = arr[i];
                        const y = arr[i + 1];
                        fullItems.push({ minX: x, minY: y, maxX: x, maxY: y, data: [x, y] });
                    }
                    rTreeRef.current.load(fullItems);

                    // Coarse points batch
                    const coarseBatch: number[] = [];
                    const coarseItems: PointItem[] = [];
                    for (let i = 0; i < writeLen; i++) {
                        const globalIdx = startFullCount + i;
                        if (globalIdx % coarseRate === 0) {
                            const x = arr[i * 2];
                            const y = arr[i * 2 + 1];
                            coarseBatch.push(x, y);
                            coarseItems.push({ minX: x, minY: y, maxX: x, maxY: y, data: [x, y] });
                        }
                    }

                    if (coarseBatch.length > 0) {
                        const coarseOffset = coarseCountRef.current * 2 * 4;
                        gl.bindBuffer(gl.ARRAY_BUFFER, coarseBufRef.current);
                        gl.bufferSubData(
                            gl.ARRAY_BUFFER,
                            coarseOffset,
                            new Float32Array(coarseBatch)
                        );

                        rCoarseTreeRef.current.load(coarseItems);

                        coarseCountRef.current += coarseItems.length;
                        setCoarseCount(coarseCountRef.current);
                    }

                    webglRef.requestRender?.();
                }

                if (msg.type === "done") {
                    setGenerating(false);
                    URL.revokeObjectURL(url);
                    webglRef.requestRender?.();
                }
            };

            worker.postMessage({
                cmd: "generate",
                total: pointsToGenerate,
                startIdx,
                chunkSize: MAX_CHUNK_SIZE,
                worldW: worldSize.current[0],
                worldH: worldSize.current[1],
            });
        },
        [
            coarseRate,
            coarseBufRef,
            coarseCountRef,
            fullBufRef,
            fullCountRef,
            generating,
            glRef,
            rCoarseTreeRef,
            rTreeRef,
            webglRef,
            worldSize,
        ]
    );

    const stopGenerate = useCallback(() => {
        if (workerRef.current) {
            workerRef.current.terminate();
            workerRef.current = null;
        }
        setGenerating(false);
    }, []);

    const clearBuffers = useCallback(() => {
        const gl = glRef.current;
        if (!gl) return;

        fullCountRef.current = 0;
        coarseCountRef.current = 0;
        rTreeRef.current.clear();
        rCoarseTreeRef.current.clear();

        gl.bindBuffer(gl.ARRAY_BUFFER, fullBufRef.current);
        gl.bufferData(gl.ARRAY_BUFFER, MAX_TOTAL_POINTS * 2 * 4, gl.DYNAMIC_DRAW);

        const coarseCap = Math.ceil(MAX_TOTAL_POINTS / Math.max(1, coarseRate));
        gl.bindBuffer(gl.ARRAY_BUFFER, coarseBufRef.current);
        gl.bufferData(gl.ARRAY_BUFFER, coarseCap * 2 * 4, gl.DYNAMIC_DRAW);

        setLoadedPoints(0);
        setCoarseCount(0);
        webglRef.requestRender?.();
    }, [
        glRef,
        fullBufRef,
        coarseBufRef,
        fullCountRef,
        coarseCountRef,
        rTreeRef,
        rCoarseTreeRef,
        coarseRate,
        webglRef,
    ]);

    const addAndGenerate = useCallback(
        (pointsToGenerate: number) => {
            const remaining = MAX_TOTAL_POINTS - fullCountRef.current;
            const toGenerate = Math.min(pointsToGenerate, remaining);
            if (toGenerate <= 0) return;
            startGenerate(toGenerate, fullCountRef.current);
        },
        [startGenerate, fullCountRef]
    );

    useEffect(() => {
        setStatusText(
            generating ? `Generating... (${loadedPoints})` : `Loaded ${loadedPoints} points`
        );
    }, [generating, loadedPoints]);

    useEffect(() => {
        const gl = glRef.current;
        if (!gl) return;

        const coarseCap = Math.ceil(MAX_TOTAL_POINTS / Math.max(1, coarseRate));

        gl.bindBuffer(gl.ARRAY_BUFFER, fullBufRef.current);
        gl.bufferData(gl.ARRAY_BUFFER, MAX_TOTAL_POINTS * 2 * 4, gl.DYNAMIC_DRAW);

        gl.bindBuffer(gl.ARRAY_BUFFER, coarseBufRef.current);
        gl.bufferData(gl.ARRAY_BUFFER, coarseCap * 2 * 4, gl.DYNAMIC_DRAW);

        fullCountRef.current = 0;
        coarseCountRef.current = 0;
        setLoadedPoints(0);
        setCoarseCount(0);
    }, [glRef, fullBufRef, coarseBufRef, webglRef, coarseRate, fullCountRef, coarseCountRef]);

    return (
        <div>
            <div className="space-y-5 text-sm">
                <div>
                    <label className="block text-xs text-primary-600">
                        Total points
                        <input
                            id="totalPoints"
                            value={totalPoints}
                            onChange={e => setTotalPoints(Number(e.target.value))}
                            onBlur={e =>
                                setTotalPoints(clampInput(e.target.value, 1, MAX_TOTAL_POINTS))
                            }
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
                        onClick={() => {
                            clearBuffers();
                            startGenerate(totalPoints);
                        }}
                        disabled={generating}
                        className="px-3 py-1 bg-primary-500 text-white rounded disabled:opacity-50"
                    >
                        Generate
                    </button>
                    <button
                        onClick={() => addAndGenerate(totalPoints)}
                        disabled={generating || fullCountRef.current >= MAX_TOTAL_POINTS}
                        className="px-3 py-1 bg-primary-400 text-white rounded disabled:opacity-50"
                    >
                        Add More Points
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

                <div>
                    <div className="text-xs text-primary-600">{statusText}</div>
                    <div className="text-xs text-primary-500">Coarse points: {coarseCount}</div>
                </div>

                <div className="flex items-center gap-2">
                    <label htmlFor="auto" className="text-xs text-primary-600">
                        <input
                            id="auto"
                            type="checkbox"
                            checked={showDebug}
                            className="mr-1"
                            onChange={e => setShowDebug(e.target.checked)}
                        />
                        Show Debug
                    </label>
                </div>
            </div>
        </div>
    );
}
