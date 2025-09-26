import React from "react";

export default function CanvasRenderer() {
    return (
        <>
            <div className="flex items-center justify-between px-3 pb-2">
                <div className="text-sm text-primary-600">
                    Canvas (pan: drag, zoom: wheel)
                </div>
                <div className="text-xs text-primary-500">
                    Tip: use Auto LOD for fast overview
                </div>
            </div>
            <div className="flex-1 rounded-xl overflow-hidden border border-primary-50">
                {/*<canvas
                    ref={canvasRef}
                    className="w-full h-[70vh] block bg-primary-50"
                />*/}
            </div>

            <div className="mt-3 px-3 text-xs text-primary-600">
                This demo streams points from a worker and shows a coarse sample
                quickly so you get an overview while the full set loads. The
                coarse/full switching is controlled by zoom.
            </div>
        </>
    );
}
