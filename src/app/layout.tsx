import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "../components/Sidebar";
import Header from "../components/Header";

export const metadata: Metadata = {
    title: "WebGL Graph Visualiser",
    description: "High-performance webgl graph visualisation",
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en">
            <body className="flex">
                <Sidebar />

                <div className="flex-1 flex flex-col min-h-screen">
                    <Header />
                    <main className="flex-1 p-6 bg-primary-50">{children}</main>
                </div>
            </body>
        </html>
    );
}
