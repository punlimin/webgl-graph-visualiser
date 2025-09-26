"use client";

import { useEffect, useState } from "react";

const enum DrawModeType {
    AUTO = "auto",
    COARSE = "coarse",
    FULL = "full",
}

export default function Controls() {
    const [totalPoints, setTotalPoints] = useState<number>(1_000_000);
    const [chunkSize, setChunkSize] = useState<number>(100_000);
    const [coarseRate, setCoarseRate] = useState<number>(100);
    const [coarseCount, setCoarseCount] = useState<number>(0);
    const [pointSize, setPointSize] = useState<number>(4);
    const [generating, setGenerating] = useState<boolean>(false);
    const [useAutoLOD, setUseAutoLOD] = useState<boolean>(true);
    const [drawMode, setDrawMode] = useState<DrawModeType>(DrawModeType.AUTO);
    const [loadedPoints, setLoadedPoints] = useState<number>(0);
    const [statusText, setStatusText] = useState<string>(
        `Loaded ${loadedPoints} points`
    );

    const startGenerate = () => {
        setGenerating(true);
    };
    const stopGenerate = () => {
        setGenerating(false);
    };
    const clearBuffers = () => {};

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
                    </label>
                    <input
                        value={totalPoints}
                        onChange={(e) => setTotalPoints(Number(e.target.value))}
                        type="number"
                        className="w-full border rounded px-2 py-1"
                    />
                </div>

                <div>
                    <label className="block text-xs text-primary-600">
                        Chunk size
                    </label>
                    <input
                        value={chunkSize}
                        onChange={(e) => setChunkSize(Number(e.target.value))}
                        type="number"
                        className="w-full border rounded px-2 py-1"
                    />
                </div>

                <div>
                    <label className="block text-xs text-primary-600">
                        Coarse sampling rate (1 per N)
                    </label>
                    <input
                        value={coarseRate}
                        onChange={(e) => setCoarseRate(Number(e.target.value))}
                        type="number"
                        className="w-full border rounded px-2 py-1"
                    />
                </div>

                <div>
                    <label className="block text-xs text-primary-600">
                        Point size
                    </label>
                    <input
                        type="range"
                        min={1}
                        max={20}
                        value={pointSize}
                        onChange={(e) => setPointSize(Number(e.target.value))}
                        className="w-full"
                    />
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
                    <input
                        id="auto"
                        type="checkbox"
                        checked={useAutoLOD}
                        onChange={(e) => setUseAutoLOD(e.target.checked)}
                    />
                    <label htmlFor="auto" className="text-xs text-primary-600">
                        Auto LOD
                    </label>
                </div>

                <div>
                    <label className="block text-xs text-primary-600">
                        Draw mode
                    </label>
                    <select
                        value={drawMode}
                        onChange={(e) =>
                            setDrawMode(e.target.value as DrawModeType)
                        }
                        className="w-full border rounded px-2 py-1 text-sm"
                    >
                        <option value="auto">Auto</option>
                        <option value="coarse">Coarse only</option>
                        <option value="full">Full points</option>
                    </select>
                </div>

                <div className="text-xs text-primary-600">{statusText}</div>
                <div className="text-xs text-primary-500">
                    Coarse points: {coarseCount}
                </div>
            </div>
        </div>
    );
}
