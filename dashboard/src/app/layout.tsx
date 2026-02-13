import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import Background from "@/components/Background";
import CustomCursor from "@/components/CustomCursor";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

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
            <body className={`flex min-h-screen bg-surface-200 ${inter.variable} font-sans selection:bg-accent-purple/30 selection:text-accent-purple`}>
                <Background />
                <CustomCursor />
                <Sidebar />
                <main className="flex-1 ml-64 min-h-screen relative z-10">
                    <div className="p-8 max-w-[1600px] mx-auto">{children}</div>
                </main>
            </body>
        </html>
    );
}
