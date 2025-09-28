"use client";

import { FRAGMENT_SOURCE, VERTEX_SOURCE } from "@/config/webglConfig";
import { DrawModeType, PointItem, WebGLRef } from "@/types/webgl";
import { createGLProgram } from "@/utils/webglUtils";
import RBush from "rbush";
import React, { useEffect, useRef, useState } from "react";
import DebugOverlay from "./DebugOverlay";

interface Props {
    webglRef: WebGLRef;
    pointSize: number;
    drawMode: DrawModeType;
    useAutoLOD: boolean;
    showDebug: boolean;
}

const LOD_THRESHOLD = 0.6;

export default function CanvasRenderer({
    webglRef,
    pointSize,
    drawMode,
    useAutoLOD,
    showDebug,
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

    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const programRef = useRef<WebGLProgram | null>(null);

    const fullVaoRef = useRef<WebGLVertexArrayObject | null>(null);
    const coarseVaoRef = useRef<WebGLVertexArrayObject | null>(null);

    const panRef = useRef<[number, number]>([0, 0]);
    const scaleRef = useRef<number>(1);
    const dprRef = useRef<number>(1);
    const dirty = useRef<boolean>(true);

    const [currentDrawMode, setCurrentDrawMode] = useState<DrawModeType>();
    const [fps, setFps] = useState<number>(0);
    const [pointsInViewport, setPointsInViewport] = useState<number>(0);

    const uniformsRef = useRef<{
        u_canvas: WebGLUniformLocation | null;
        u_pan: WebGLUniformLocation | null;
        u_scale: WebGLUniformLocation | null;
        u_pointSize: WebGLUniformLocation | null;
        u_color: WebGLUniformLocation | null;
    } | null>(null);

    const resize = () => {
        const canvas = canvasRef.current!;
        const gl = glRef.current;
        if (!canvasRef.current || !gl) return;

        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        dprRef.current = dpr;
        const width = Math.max(1, Math.floor(canvas.clientWidth * dpr));
        const height = Math.max(1, Math.floor(canvas.clientHeight * dpr));
        if (canvas.width !== width || canvas.height !== height) {
            canvas.width = width;
            canvas.height = height;
            dirty.current = true;
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
            dirty.current = true;
        }
    };

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

        // Buffers + VAOs
        fullBufRef.current = gl.createBuffer();
        coarseBufRef.current = gl.createBuffer();
        fullVaoRef.current = gl.createVertexArray();
        coarseVaoRef.current = gl.createVertexArray();

        gl.bindBuffer(gl.ARRAY_BUFFER, fullBufRef.current);
        gl.bufferData(gl.ARRAY_BUFFER, 4, gl.DYNAMIC_DRAW);
        gl.bindVertexArray(fullVaoRef.current);
        gl.enableVertexAttribArray(0);
        gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 8, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, coarseBufRef.current);
        gl.bufferData(gl.ARRAY_BUFFER, 4, gl.DYNAMIC_DRAW);
        gl.bindVertexArray(coarseVaoRef.current);
        gl.enableVertexAttribArray(0);
        gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 8, 0);

        fullCountRef.current = 0;
        coarseCountRef.current = 0;

        uniformsRef.current = {
            u_canvas: gl.getUniformLocation(program, "u_canvas"),
            u_pan: gl.getUniformLocation(program, "u_pan"),
            u_scale: gl.getUniformLocation(program, "u_scale"),
            u_pointSize: gl.getUniformLocation(program, "u_pointSize"),
            u_color: gl.getUniformLocation(program, "u_color"),
        };

        // GL state
        gl.disable(gl.DEPTH_TEST);
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

        webglRef.requestRender = () => {
            dirty.current = true;
        };

        // Interaction
        let dragging = false;
        let last: [number, number] | null = null;

        function mouseWheel(e: WheelEvent) {
            e.preventDefault();
            const rect = canvas.getBoundingClientRect();
            const cx = (e.clientX - rect.left) * dprRef.current;
            const cy = (e.clientY - rect.top) * dprRef.current;
            const k = Math.exp(-e.deltaY * 0.0012);
            const newScale = Math.max(0.0001, Math.min(10_000, scaleRef.current * k));
            panRef.current[0] = cx - (cx - panRef.current[0]) * (newScale / scaleRef.current);
            panRef.current[1] = cy - (cy - panRef.current[1]) * (newScale / scaleRef.current);
            scaleRef.current = newScale;
            dirty.current = true;
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
            dirty.current = true;
        }

        function getVisiblePoints(tree: RBush<PointItem>): Float32Array {
            const [panX, panY] = panRef.current;
            const scale = scaleRef.current;

            const width = canvas.width;
            const height = canvas.height;

            // Convert viewport -> world coords
            const viewMinX = (0 - panX) / scale;
            const viewMinY = (0 - panY) / scale;
            const viewMaxX = (width - panX) / scale;
            const viewMaxY = (height - panY) / scale;

            const visibleItems = tree.search({
                minX: viewMinX,
                minY: viewMinY,
                maxX: viewMaxX,
                maxY: viewMaxY,
            });

            const result = new Float32Array(visibleItems.length * 2);
            visibleItems.forEach((p, i) => {
                result[i * 2] = p.data[0];
                result[i * 2 + 1] = p.data[1];
            });
            return result;
        }

        const observer = new ResizeObserver(() => resize());
        observer.observe(canvas);

        window.addEventListener("resize", resize);
        canvas.addEventListener("wheel", mouseWheel, { passive: false });
        canvas.addEventListener("pointerdown", pointerDown);
        window.addEventListener("pointerup", pointerUp);
        window.addEventListener("pointermove", pointerMove);

        resize();

        let lastTime = performance.now();
        let frames = 0;

        let requestAnimFrameId = 0;
        function render() {
            requestAnimFrameId = requestAnimationFrame(render);

            const gl = glRef.current;

            frames++;
            const now = performance.now();
            if (now - lastTime >= 1000) {
                setFps((frames * 1000) / (now - lastTime));
                frames = 0;
                lastTime = now;
            }

            if (!gl || !dirty.current) return;
            dirty.current = false;

            gl.clearColor(0.99, 0.99, 0.985, 1);
            gl.clear(gl.COLOR_BUFFER_BIT);

            gl.useProgram(programRef.current!);

            const u = uniformsRef.current!;
            gl.uniform2f(u.u_canvas, canvasRef.current!.width, canvasRef.current!.height);
            gl.uniform2f(u.u_pan, panRef.current[0], panRef.current[1]);
            gl.uniform1f(u.u_scale, scaleRef.current);
            gl.uniform1f(u.u_pointSize, Math.max(1, pointSize * dprRef.current));
            gl.uniform4f(u.u_color, 0.15, 0.45, 0.35, 0.9);

            const wantCoarse =
                drawMode === DrawModeType.COARSE ||
                (drawMode === DrawModeType.AUTO && useAutoLOD && scaleRef.current < LOD_THRESHOLD);

            if (wantCoarse) {
                const visible = getVisiblePoints(rCoarseTreeRef.current);
                setPointsInViewport(visible.length);
                const numPoints = visible.length / 2;
                if (numPoints > 0) {
                    gl.bindBuffer(gl.ARRAY_BUFFER, coarseBufRef.current);
                    gl.bufferData(gl.ARRAY_BUFFER, visible, gl.DYNAMIC_DRAW);

                    gl.bindVertexArray(coarseVaoRef.current);
                    gl.drawArrays(gl.POINTS, 0, numPoints);
                    setCurrentDrawMode(DrawModeType.COARSE);
                }
            } else {
                const visible = getVisiblePoints(rTreeRef.current);
                setPointsInViewport(visible.length);

                const numPoints = visible.length / 2;
                if (numPoints > 0) {
                    gl.bindBuffer(gl.ARRAY_BUFFER, fullBufRef.current);
                    gl.bufferData(gl.ARRAY_BUFFER, visible, gl.DYNAMIC_DRAW);

                    gl.bindVertexArray(fullVaoRef.current);
                    gl.drawArrays(gl.POINTS, 0, numPoints);
                    setCurrentDrawMode(DrawModeType.FULL);
                }
            }

            gl.bindVertexArray(null);
        }

        render();

        return () => {
            cancelAnimationFrame(requestAnimFrameId);
            observer.disconnect();
            window.removeEventListener("resize", resize);
            canvas.removeEventListener("wheel", mouseWheel);
            canvas.removeEventListener("pointerdown", pointerDown);
            window.removeEventListener("pointerup", pointerUp);
            window.removeEventListener("pointermove", pointerMove);
            webglRef.requestRender = undefined;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pointSize, drawMode, useAutoLOD]);

    return (
        <>
            <div className="flex items-center justify-between px-3 pb-2">
                <div className="text-sm text-primary-600">Canvas (pan: drag, zoom: wheel)</div>
                <div className="text-xs text-primary-500">Tip: use Auto LOD for fast overview</div>
            </div>
            <div className="relative flex-1 rounded-xl overflow-hidden border border-primary-50">
                <canvas ref={canvasRef} className="w-full h-[70vh] block bg-primary-50" />
                {showDebug && (
                    <DebugOverlay
                        fps={fps}
                        pointsInViewport={pointsInViewport}
                        drawMode={currentDrawMode}
                    />
                )}
            </div>
        </>
    );
}
