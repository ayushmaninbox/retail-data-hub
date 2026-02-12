import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/Sidebar";

export const metadata: Metadata = {
    title: "Retail Data Hub — Dashboard",
    description:
        "Smart Retail Supply Chain & Customer Intelligence Platform — Analytics Dashboard",
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en">
            <body className="flex min-h-screen bg-dark-900">
                <Sidebar />
                <main className="flex-1 ml-64 min-h-screen">
                    <div className="p-8 max-w-[1600px] mx-auto">{children}</div>
                </main>
            </body>
        </html>
    );
}
