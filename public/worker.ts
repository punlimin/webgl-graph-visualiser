
export const WORKER_CODE = `
(self.onmessage = function (e) {
    const data = e.data || {};
    if (data.cmd !== "generate") return;
    const total = Number(data.total) || 1000000;
    const chunkSize = Number(data.chunkSize) || 100000;
    const coarseRate = Math.max(1, Number(data.coarseRate) || 100);
    const worldW = Number(data.worldW) || 2000;
    const worldH = Number(data.worldH) || 2000;

    // coarse sample accumulation
    const coarseCapacity = Math.ceil(total / coarseRate);
    const coarseBuf = new Float32Array(coarseCapacity * 2);
    let coarseIdx = 0;

    // chunk buffer
    let chunkBuf = new Float32Array(chunkSize * 2);
    let chunkIdx = 0;

    // helper to send a Float32Array copy (so the buffer is exactly sized)
    function sendFloat32(arr, kind) {
        // arr is a typed array view; slice() produces a new copy whose .buffer is transferable
        const copy = arr.slice(0);
        self.postMessage({ type: kind, buffer: copy.buffer }, [copy.buffer]);
    }

    for (let i = 0; i < total; ++i) {
        // Generate an interesting distribution: a few clusters + swirl pattern
        const r = Math.random();
        let x, y;
        if (r < 0.65) {
            // clustered points
            const cx = (Math.floor(Math.random() * 5) / 5) * worldW + worldW * 0.08;
            const cy = (Math.floor(Math.random() * 4) / 4) * worldH + worldH * 0.08;
            x = cx + (Math.random() - 0.5) * worldW * 0.06;
            y = cy + (Math.random() - 0.5) * worldH * 0.06;
        } else {
            // swirl / ring
            const t = i / total;
            const ang = t * Math.PI * 8;
            const rad = 0.15 * worldW + (Math.sin(t * 30) * 0.1 + Math.random() * 0.05) * worldW;
            x = worldW / 2 + Math.cos(ang) * rad;
            y = worldH / 2 + Math.sin(ang) * rad;
        }

        // write to chunk
        chunkBuf[chunkIdx * 2] = x;
        chunkBuf[chunkIdx * 2 + 1] = y;
        chunkIdx++;

        // coarse sample
        if (i % coarseRate === 0) {
            coarseBuf[coarseIdx * 2] = x;
            coarseBuf[coarseIdx * 2 + 1] = y;
            coarseIdx++;
            // emit partial coarse updates occasionally so main thread can show early LOD
            if (coarseIdx > 0 && coarseIdx % 4096 === 0) {
                const send = coarseBuf.slice((coarseIdx - 4096) * 2, coarseIdx * 2);
                self.postMessage({ type: "coarse", buffer: send.buffer }, [send.buffer]);
            }
        }

        // emit chunk
        if (chunkIdx >= chunkSize) {
            const send = chunkBuf.slice(0, chunkIdx * 2);
            self.postMessage({ type: "chunk", buffer: send.buffer }, [send.buffer]);
            chunkBuf = new Float32Array(chunkSize * 2);
            chunkIdx = 0;
        }

        // occasional progress
        if (i % Math.max(1, Math.floor(total / 200)) === 0) {
            self.postMessage({ type: "progress", loaded: i });
        }
    }

    // final partials
    if (chunkIdx > 0) {
        const send = chunkBuf.slice(0, chunkIdx * 2);
        self.postMessage({ type: "chunk", buffer: send.buffer }, [send.buffer]);
    }
    if (coarseIdx > 0) {
        const send = coarseBuf.slice(0, coarseIdx * 2);
        self.postMessage({ type: "coarse", buffer: send.buffer }, [send.buffer]);
    }
    self.postMessage({ type: "done" });
});
`;
