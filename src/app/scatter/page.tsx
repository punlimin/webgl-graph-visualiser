import CanvasRenderer from "@/components/scatter/CanvasRenderer";
import Controls from "@/components/scatter/Controls";

export default function ScatterPlotPage() {
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

            <footer className="max-w-6xl mx-auto mt-6 text-xs text-primary-500">
                Built with WebGL2 • Progressive loading • Simple LOD
            </footer>
        </>
    );
}
