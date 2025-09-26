"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, ArrowLeft } from "lucide-react";
import { navConfig } from "@/config/navConfig";
import { usePathname } from "next/navigation";
import { cn } from "@/utils/cn";

export default function Sidebar() {
    const [isOpen, setIsOpen] = useState(true);
    const pathname = usePathname();

    return (
        <div className="flex">
            <div
                className={`${
                    isOpen ? "w-48" : "w-10"
                } h-screen bg-primary-700 text-primary-50 transition-all duration-300 flex flex-col`}
            >
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="p-2 text-primary-200 hover:text-white self-end"
                >
                    {isOpen ? <ArrowLeft size={20} /> : <Menu size={20} />}
                </button>

                {isOpen && (
                    <nav className="mt-4 flex flex-col gap-2">
                        {navConfig.map((item) => {
                            const isActive = pathname === item.url;

                            return (
                                <Link
                                    key={item.url}
                                    href={item.url}
                                    className={cn(
                                        "px-4 py-2 rounded transition",
                                        isActive
                                            ? "bg-primary-500 text-primary-700 font-semibold"
                                            : "hover:bg-primary-600 text-primary-5"
                                    )}
                                >
                                    {item.label}
                                </Link>
                            );
                        })}
                    </nav>
                )}
            </div>
        </div>
    );
}
