"use client";

import { navConfig } from "@/config/navConfig";
import { usePathname } from "next/navigation";

export default function Header() {
    const pathname = usePathname();
    const title = navConfig.find((item) => item.url === pathname)?.title ?? "";

    return (
        <header className="flex items-center justify-between px-6 py-3 bg-primary-100 border-b border-primary-200">
            <h1 className="text-lg font-semibold text-primary-700">{title}</h1>
        </header>
    );
}
