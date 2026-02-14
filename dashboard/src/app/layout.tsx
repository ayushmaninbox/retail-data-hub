import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import DashboardContainer from "@/components/DashboardContainer";

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
            <body className={`min-h-screen bg-surface-200 ${inter.variable} font-sans selection:bg-accent-purple/30 selection:text-accent-purple`}>
                <DashboardContainer>
                    {children}
                </DashboardContainer>
            </body>
        </html>
    );
}
