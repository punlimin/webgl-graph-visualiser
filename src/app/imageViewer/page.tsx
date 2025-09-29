"use client";

import CanvasRenderer from "@/components/imageViewer/CanvasRenderer";
import Controls from "@/components/imageViewer/Controls";

export default function ImageViewerPage() {
    return (
        <>
            <main className="max-w-6xl mx-auto grid grid-cols-12 gap-2">
                {/** controls */}
                <section className="col-span-3 bg-white rounded-xl p-4 shadow">
                    <Controls />
                </section>

                {/** canvas */}
                <section className="col-span-9 bg-white rounded-xl shadow p-2 flex flex-col">
                    <CanvasRenderer />
                </section>
            </main>

            <footer className="max-w-6xl mx-auto mt-3 text-xs text-primary-600">
                WebGL image viewer: zoom with wheel, pan by dragging, reset with button.
            </footer>
        </>
    );
}
