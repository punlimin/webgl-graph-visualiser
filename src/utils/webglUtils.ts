const compileGLShader = (gl: WebGL2RenderingContext, src: string, type: number) => {
    const shader = gl.createShader(type)!;
    gl.shaderSource(shader, src);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        const log = gl.getShaderInfoLog(shader);
        gl.deleteShader(shader);
        throw new Error("Shader compile error: " + log);
    }
    return shader;
};

export const createGLProgram = (gl: WebGL2RenderingContext, vsSrc: string, fsSrc: string) => {
    const vertexShader = compileGLShader(gl, vsSrc, gl.VERTEX_SHADER);
    const fragmentShader = compileGLShader(gl, fsSrc, gl.FRAGMENT_SHADER);
    const program = gl.createProgram()!;
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        const log = gl.getProgramInfoLog(program);
        gl.deleteProgram(program);
        throw new Error("Program link error: " + log);
    }
    return program;
};
