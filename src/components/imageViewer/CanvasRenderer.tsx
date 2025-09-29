"use client";

import { IMAGE_VERTEX_SOURCE, IMAGE_FRAGMENT_SOURCE } from "@/config/webglConfig";
import { createGLProgram } from "@/utils/webglUtils";
import { useEffect, useRef, useState } from "react";

export default function CanvasRenderer() {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const programRef = useRef<WebGLProgram | null>(null);
    const glRef = useRef<WebGL2RenderingContext | null>(null);
    const textureRef = useRef<WebGLTexture | null>(null);
    const vaoRef = useRef<WebGLVertexArrayObject | null>(null);
    const isDragging = useRef(false);
    const lastPos = useRef({ x: 0, y: 0 });

    const [scale, setScale] = useState(1);
    const [offset, setOffset] = useState({ x: 0, y: 0 });
    const [imageSize, setImageSize] = useState({ width: 0, height: 0 });

    function draw(gl: WebGL2RenderingContext) {
        if (!gl || !programRef.current || !vaoRef.current || !textureRef.current) return;

        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
        gl.clearColor(0.95, 0.95, 0.95, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT);

        gl.useProgram(programRef.current);
        gl.bindVertexArray(vaoRef.current);

        // Calculate pixel-perfect scaling for native resolution
        // In WebGL, the clip space is from -1 to 1 (2 units total)
        // So we need to scale the image to fit within this space while maintaining aspect ratio
        const pixelScaleX = (imageSize.width * 2) / gl.canvas.width;
        const pixelScaleY = (imageSize.height * 2) / gl.canvas.height;

        // Apply user scale on top of the pixel-perfect scale
        const effectiveScaleX = pixelScaleX * scale;
        const effectiveScaleY = pixelScaleY * scale;

        // Create transformation matrix that maintains the image's native aspect ratio
        const transform = [
            effectiveScaleX,
            0,
            0,
            0,
            effectiveScaleY,
            0,
            (offset.x / gl.canvas.width) * 2,
            (offset.y / gl.canvas.height) * -2,
            1,
        ];

        const uTransform = gl.getUniformLocation(programRef.current, "uTransform");
        gl.uniformMatrix3fv(uTransform, false, transform);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, textureRef.current);
        const uImage = gl.getUniformLocation(programRef.current, "uImage");
        gl.uniform1i(uImage, 0);

        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }

    useEffect(() => {
        const canvas = canvasRef.current!;

        // Get WebGL context with anti-aliasing
        const gl = canvas.getContext("webgl2", {
            antialias: false, // Disable antialiasing for pixel-perfect rendering
            preserveDrawingBuffer: true,
        }) as WebGL2RenderingContext | null;

        if (!gl) {
            console.error("WebGL2 not supported in this browser");
            return;
        }
        glRef.current = gl;

        const program = createGLProgram(gl, IMAGE_VERTEX_SOURCE, IMAGE_FRAGMENT_SOURCE);
        programRef.current = program;

        // Quad for rendering texture
        const positions = new Float32Array([-1, -1, 0, 1, 1, -1, 1, 1, -1, 1, 0, 0, 1, 1, 1, 0]);

        const vao = gl.createVertexArray()!;
        const vbo = gl.createBuffer()!;

        gl.bindVertexArray(vao);
        gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
        gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

        // Use layout locations directly
        gl.enableVertexAttribArray(0); // aPosition
        gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 16, 0);

        gl.enableVertexAttribArray(1); // aTexCoord
        gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 16, 8);

        vaoRef.current = vao;
    }, []);

    // Texture loading
    useEffect(() => {
        if (!glRef.current) return;
        const gl = glRef.current;

        const image = new Image();
        image.crossOrigin = "anonymous";
        image.src = "test.webp";

        image.onload = () => {
            console.log(`Image loaded: ${image.width}x${image.height}`);

            // Set the actual image dimensions
            setImageSize({ width: image.width, height: image.height });

            const tex = gl.createTexture()!;
            gl.bindTexture(gl.TEXTURE_2D, tex);

            // Set texture parameters for pixel-perfect rendering
            gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);

            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);

            // Use NEAREST filtering for pixel-perfect rendering (no interpolation)
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

            textureRef.current = tex;

            // Force redraw with new texture
            draw(gl);
        };

        image.onerror = () => {
            console.error("Failed to load image");
        };
    }, [glRef]);

    // Resize handler
    useEffect(() => {
        const handleResize = () => {
            const canvas = canvasRef.current;
            const gl = glRef.current;
            if (!canvas || !gl) return;

            const container = canvas.parentElement;
            if (!container) return;

            const rect = container.getBoundingClientRect();
            const dpr = window.devicePixelRatio || 1;

            // Set actual canvas dimensions
            canvas.width = rect.width * dpr;
            canvas.height = rect.height * dpr;

            // Set CSS dimensions
            canvas.style.width = `${rect.width}px`;
            canvas.style.height = `${rect.height}px`;

            gl.viewport(0, 0, canvas.width, canvas.height);

            if (textureRef.current) {
                draw(gl);
            }
        };

        handleResize();
        window.addEventListener("resize", handleResize);

        return () => window.removeEventListener("resize", handleResize);
    }, []);

    // Mouse and wheel interaction handlers
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const handleWheel = (e: WheelEvent) => {
            e.preventDefault();
            const rect = canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            const zoomIntensity = 0.001;
            const delta = -e.deltaY * zoomIntensity;
            const newScale = scale * Math.exp(delta);

            // Clamp scale between 0.1 and 10
            const clampedScale = Math.max(0.1, Math.min(10, newScale));

            // Adjust offset to zoom towards mouse position
            const scaleFactor = clampedScale / scale;
            setOffset(prev => ({
                x: prev.x + (x - rect.width / 2) * (1 - scaleFactor),
                y: prev.y + (y - rect.height / 2) * (1 - scaleFactor),
            }));

            setScale(clampedScale);
        };

        const handleMouseDown = (e: MouseEvent) => {
            isDragging.current = true;
            lastPos.current = { x: e.clientX, y: e.clientY };
            canvas.style.cursor = "grabbing";
        };

        const handleMouseMove = (e: MouseEvent) => {
            if (!isDragging.current) return;

            const deltaX = e.clientX - lastPos.current.x;
            const deltaY = e.clientY - lastPos.current.y;

            setOffset(prev => ({
                x: prev.x + deltaX,
                y: prev.y + deltaY,
            }));

            lastPos.current = { x: e.clientX, y: e.clientY };
        };

        const handleMouseUp = () => {
            isDragging.current = false;
            canvas.style.cursor = "grab";
        };

        canvas.addEventListener("wheel", handleWheel, { passive: false });
        canvas.addEventListener("mousedown", handleMouseDown);
        window.addEventListener("mousemove", handleMouseMove);
        window.addEventListener("mouseup", handleMouseUp);

        return () => {
            canvas.removeEventListener("wheel", handleWheel);
            canvas.removeEventListener("mousedown", handleMouseDown);
            window.removeEventListener("mousemove", handleMouseMove);
            window.removeEventListener("mouseup", handleMouseUp);
        };
    }, [scale]);

    // Redraw when scale, offset, or image size changes
    useEffect(() => {
        const gl = glRef.current;
        if (gl && textureRef.current) {
            draw(gl);
        }
    }, [scale, offset, imageSize]);

    // Reset to actual pixel size (1:1 mapping)
    const resetToActualSize = () => {
        setScale(1);
        setOffset({ x: 0, y: 0 });
    };

    // Center the image in the view
    const centerImage = () => {
        setOffset({ x: 0, y: 0 });
    };

    return (
        <>
            <div className="flex items-center justify-between px-3 pb-2">
                <div className="text-sm text-primary-600">
                    {imageSize.width > 0 && `${imageSize.width} × ${imageSize.height}`}
                    {imageSize.width === 0 && "Loading image..."}
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={centerImage}
                        className="text-xs bg-gray-500 text-white px-2 py-1 rounded hover:bg-gray-600 transition-colors"
                    >
                        Center
                    </button>
                    <button
                        onClick={resetToActualSize}
                        className="text-xs bg-primary-500 text-white px-2 py-1 rounded hover:bg-primary-600 transition-colors"
                    >
                        Actual Size (1:1)
                    </button>
                </div>
            </div>
            <div className="relative flex-1 rounded-xl overflow-hidden border border-primary-50">
                <canvas
                    ref={canvasRef}
                    className="w-full h-[70vh] block bg-primary-50 cursor-grab"
                />
            </div>
        </>
    );
}
