import { RefObject } from "react";

export const enum DrawModeType {
    AUTO = "auto",
    COARSE = "coarse",
    FULL = "full",
}

export interface WebGLRef {
    glRef: RefObject<WebGL2RenderingContext | null>;
    fullBufRef: RefObject<WebGLBuffer | null>;
    fullVaoRef: RefObject<WebGLVertexArrayObject | null>;
    coarseBufRef: RefObject<WebGLBuffer | null>;
    coarseVaoRef: RefObject<WebGLVertexArrayObject | null>;

    fullCountRef: RefObject<number>;
    coarseCountRef: RefObject<number>;

    worldSize: RefObject<[number, number]>;
}
