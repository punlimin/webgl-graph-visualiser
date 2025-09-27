import { RefObject } from "react";

export const enum DrawModeType {
    AUTO = "auto",
    COARSE = "coarse",
    FULL = "full",
}

export interface WebGLRef {
    glRef: RefObject<WebGL2RenderingContext | null>;
    fullBufRef: RefObject<WebGLBuffer | null>;
    coarseBufRef: RefObject<WebGLBuffer | null>;

    fullCountRef: RefObject<number>;
    coarseCountRef: RefObject<number>;

    worldSize: RefObject<[number, number]>;

    initBuffers?: (totalPoints: number, coarseCap: number) => void;
    requestRender?: () => void;
}
