"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export default function ScrollReset() {
    const pathname = usePathname();

    useEffect(() => {
        const container = document.getElementById("main-scroll-container");
        if (container) {
            container.scrollTo(0, 0);
        }
    }, [pathname]);

    return null;
}
