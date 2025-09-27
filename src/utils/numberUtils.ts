export const clampInput = (val: string | number, min: number, max: number) => {
    const numericValue = Number(val);

    if (isNaN(numericValue) || val === "") {
        return max;
    }

    return Math.min(max, Math.max(min, numericValue));
};
