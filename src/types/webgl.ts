import { RefObject } from "react";
import RBush from "rbush";

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

    rTreeRef: RefObject<RBush<PointItem>>;
    rCoarseTreeRef: RefObject<RBush<PointItem>>;

    requestRender?: () => void;
}

export interface PointItem {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
    data: [number, number];
}
