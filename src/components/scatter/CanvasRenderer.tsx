"use client";

import { FRAGMENT_SOURCE, VERTEX_SOURCE } from "@/config/webglConfig";
import { DrawModeType, WebGLRef } from "@/types/webgl";
import { createGLProgram } from "@/utils/webglUtils";
import React, { useEffect, useRef } from "react";

interface Props {
    webglRef: WebGLRef;
    pointSize: number;
    drawMode: DrawModeType;
    useAutoLOD: boolean;
}

export default function CanvasRenderer({ webglRef, pointSize, drawMode, useAutoLOD }: Props) {
    const {
        glRef,
        fullBufRef,
        fullVaoRef,
        coarseBufRef,
        coarseVaoRef,
        fullCountRef,
        coarseCountRef,
        worldSize,
    } = webglRef;

    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const programRef = useRef<WebGLProgram | null>(null);

    const panRef = useRef<[number, number]>([0, 0]);
    const scaleRef = useRef<number>(1);
    const dprRef = useRef<number>(1);

    const uniformsRef = useRef<{
        u_canvas: WebGLUniformLocation | null;
        u_pan: WebGLUniformLocation | null;
        u_scale: WebGLUniformLocation | null;
        u_pointSize: WebGLUniformLocation | null;
        u_color: WebGLUniformLocation | null;
    } | null>(null);

    useEffect(() => {
        const canvas = canvasRef.current!;
        const gl = canvas.getContext("webgl2") as WebGL2RenderingContext | null;
        if (!gl) {
            console.error("WebGL2 not supported in this browser");
            return;
        }
        glRef.current = gl;

        const program = createGLProgram(gl, VERTEX_SOURCE, FRAGMENT_SOURCE);
        programRef.current = program;

        // Buffers used when generating points
        const fullBuf = gl.createBuffer();
        const coarseBuf = gl.createBuffer();
        fullBufRef.current = fullBuf;
        coarseBufRef.current = coarseBuf;

        const fullVao = gl.createVertexArray();
        const coarseVao = gl.createVertexArray();
        fullVaoRef.current = fullVao;
        coarseVaoRef.current = coarseVao;

        uniformsRef.current = {
            u_canvas: gl.getUniformLocation(program, "u_canvas"),
            u_pan: gl.getUniformLocation(program, "u_pan"),
            u_scale: gl.getUniformLocation(program, "u_scale"),
            u_pointSize: gl.getUniformLocation(program, "u_pointSize"),
            u_color: gl.getUniformLocation(program, "u_color"),
        };

        // set GL state
        gl.disable(gl.DEPTH_TEST);
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

        let dragging = false;
        let last: [number, number] | null = null;

        function resize() {
            if (!gl) {
                return;
            }

            const dpr = Math.min(window.devicePixelRatio || 1, 2);
            dprRef.current = dpr;
            const width = Math.max(1, Math.floor(canvas.clientWidth * dpr));
            const height = Math.max(1, Math.floor(canvas.clientHeight * dpr));
            if (canvas.width !== width || canvas.height !== height) {
                canvas.width = width;
                canvas.height = height;
            }
            gl.viewport(0, 0, canvas.width, canvas.height);

            // If no pan/scale set (initial), center world into canvas
            if (scaleRef.current === 1 && panRef.current[0] === 0 && panRef.current[1] === 0) {
                const [wW, wH] = worldSize.current;
                const initialScale = Math.min(canvas.width / wW, canvas.height / wH);
                scaleRef.current = initialScale;
                panRef.current = [
                    canvas.width / 2 - (wW * initialScale) / 2,
                    canvas.height / 2 - (wH * initialScale) / 2,
                ];
            }
        }

        function mouseWheel(e: WheelEvent) {
            e.preventDefault();
            const rect = canvas.getBoundingClientRect();
            const cx = (e.clientX - rect.left) * dprRef.current;
            const cy = (e.clientY - rect.top) * dprRef.current;
            const k = Math.exp(-e.deltaY * 0.0012); // zoom factor
            const newScale = Math.max(0.0001, Math.min(10_000, scaleRef.current * k));
            // zoom about cursor point
            panRef.current[0] = cx - (cx - panRef.current[0]) * (newScale / scaleRef.current);
            panRef.current[1] = cy - (cy - panRef.current[1]) * (newScale / scaleRef.current);
            scaleRef.current = newScale;
        }

        function pointerDown(e: PointerEvent) {
            dragging = true;
            last = [e.clientX, e.clientY];
            (e.target as Element).setPointerCapture(e.pointerId);
        }

        function pointerUp() {
            dragging = false;
            last = null;
        }

        function pointerMove(e: PointerEvent) {
            if (!dragging || !last) return;
            const dx = (e.clientX - last[0]) * dprRef.current;
            const dy = (e.clientY - last[1]) * dprRef.current;
            panRef.current[0] += dx;
            panRef.current[1] += dy;
            last = [e.clientX, e.clientY];
        }

        window.addEventListener("resize", resize);
        canvas.addEventListener("wheel", mouseWheel, { passive: false });
        canvas.addEventListener("pointerdown", pointerDown);
        window.addEventListener("pointerup", pointerUp);
        window.addEventListener("pointermove", pointerMove);

        resize();

        let requestAnimFrame = 0;
        function render() {
            requestAnimFrame = requestAnimationFrame(render);
            if (!gl) return;
            resize();

            gl.clearColor(0.99, 0.99, 0.985, 1);
            gl.clear(gl.COLOR_BUFFER_BIT);

            gl.useProgram(program);

            // common uniforms
            const u = uniformsRef.current!;
            gl.uniform2f(u.u_canvas, canvas.width, canvas.height);
            gl.uniform2f(u.u_pan, panRef.current[0], panRef.current[1]);
            gl.uniform1f(u.u_scale, scaleRef.current);
            gl.uniform1f(u.u_pointSize, Math.max(1, pointSize * dprRef.current));
            gl.uniform4f(u.u_color, 0.15, 0.45, 0.35, 0.9); // sage-ish

            // Decide draw mode
            const wantCoarse =
                drawMode === "coarse" ||
                (drawMode === "auto" && useAutoLOD && scaleRef.current < 0.6);

            if (wantCoarse) {
                const cc = coarseCountRef.current;
                if (cc > 0) {
                    gl.bindVertexArray(coarseVaoRef.current);
                    gl.drawArrays(gl.POINTS, 0, cc);
                }
            } else {
                const fc = fullCountRef.current;
                if (fc > 0) {
                    gl.bindVertexArray(fullVaoRef.current);
                    gl.drawArrays(gl.POINTS, 0, fc);
                }
            }

            gl.bindVertexArray(null);
        }

        render();

        // cleanup on unmount
        return () => {
            cancelAnimationFrame(requestAnimFrame);
            window.removeEventListener("resize", resize);
            canvas.removeEventListener("wheel", mouseWheel);
            canvas.removeEventListener("pointerdown", pointerDown);
            window.removeEventListener("pointerup", pointerUp);
            window.removeEventListener("pointermove", pointerMove);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pointSize, drawMode, useAutoLOD]);

    return (
        <>
            <div className="flex items-center justify-between px-3 pb-2">
                <div className="text-sm text-primary-600">Canvas (pan: drag, zoom: wheel)</div>
                <div className="text-xs text-primary-500">Tip: use Auto LOD for fast overview</div>
            </div>
            <div className="flex-1 rounded-xl overflow-hidden border border-primary-50">
                <canvas ref={canvasRef} className="w-full h-[70vh] block bg-primary-50" />
            </div>

            <div className="mt-3 px-3 text-xs text-primary-600">
                This demo streams points from a worker and shows a coarse sample quickly so you get
                an overview while the full set loads. The coarse/full switching is controlled by
                zoom.
            </div>
        </>
    );
}
