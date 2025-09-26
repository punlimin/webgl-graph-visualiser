/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            colors: {
                primary: {
                    50: "#f6f7f6",
                    100: "#edf0ed",
                    200: "#d8e0d8",
                    300: "#b8c5b8",
                    400: "#93a693",
                    500: "#6e8a6e",
                    600: "#4f6b4f",
                    700: "#344c34",
                    800: "#1f2d1f",
                },
            },
        },
    },
    plugins: [],
};
