export const VERTEX_SOURCE = `#version 300 es
    precision highp float;
    layout(location = 0) in vec2 a_pos;
    uniform vec2 u_canvas; // canvas pixel size
    uniform vec2 u_pan; // pan in pixels
    uniform float u_scale; // world units -> pixels (scale)
    uniform float u_pointSize;
    void main() {
        vec2 worldPx = a_pos * u_scale + u_pan;
        vec2 ndc = (worldPx / u_canvas) * 2.0 - 1.0;
        ndc.y = -ndc.y; // flip
        gl_Position = vec4(ndc, 0.0, 1.0);
        gl_PointSize = u_pointSize;
    }
`;

export const FRAGMENT_SOURCE = `#version 300 es
    precision highp float;
    uniform vec4 u_color;
    out vec4 outColor;
    void main() {
        vec2 c = gl_PointCoord - vec2(0.5);
        float r = length(c);
        float alpha = smoothstep(0.5, 0.48, r);
        outColor = vec4(u_color.rgb, u_color.a * alpha);
    }
`;
