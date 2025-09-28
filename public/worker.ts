export const WORKER_CODE = `
self.onmessage = function(e) {
    const data = e.data || {};
    if (data.cmd !== "generate") return;

    const total = Number(data.total) || 1000000;
    const startIdx = Number(data.startIdx) || 0;
    const chunkSize = Number(data.chunkSize) || 100000;
    const worldW = Number(data.worldW) || 2000;
    const worldH = Number(data.worldH) || 2000;

    let chunkBuf = new Float32Array(Math.min(chunkSize, total) * 2);
    let chunkIdx = 0;

    function sendChunk(arr) {
        const send = new Float32Array(arr); // create exact-length copy
        self.postMessage({ type: "chunk", buffer: send.buffer }, [send.buffer]);
    }

    for (let i = 0; i < total; ++i) {
        const globalIdx = startIdx + i;

        // generate points (clusters + swirl)
        const r = Math.random();
        let x, y;
        if (r < 0.65) {
            const cx = (Math.floor(Math.random() * 5) / 5) * worldW + worldW * 0.08;
            const cy = (Math.floor(Math.random() * 4) / 4) * worldH + worldH * 0.08;
            x = cx + (Math.random() - 0.5) * worldW * 0.06;
            y = cy + (Math.random() - 0.5) * worldH * 0.06;
        } else {
            const t = globalIdx / (startIdx + total);
            const ang = t * Math.PI * 8;
            const rad = 0.15 * worldW + (Math.sin(t * 30) * 0.1 + Math.random() * 0.05) * worldW;
            x = worldW / 2 + Math.cos(ang) * rad;
            y = worldH / 2 + Math.sin(ang) * rad;
        }

        // add to chunk
        chunkBuf[chunkIdx * 2] = x;
        chunkBuf[chunkIdx * 2 + 1] = y;
        chunkIdx++;

        // emit chunk
        if (chunkIdx >= chunkBuf.length / 2) {
            sendChunk(chunkBuf.slice(0, chunkIdx * 2));
            chunkBuf = new Float32Array(Math.min(chunkSize, total - i - 1) * 2);
            chunkIdx = 0;
        }

        // progress
        if (i % Math.max(1, Math.floor(total / 200)) === 0) {
            self.postMessage({ type: "progress", loaded: i });
        }
    }

    // send final chunk
    if (chunkIdx > 0) sendChunk(chunkBuf.slice(0, chunkIdx * 2));

    self.postMessage({ type: "done" });
};
`;
