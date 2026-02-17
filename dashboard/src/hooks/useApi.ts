"use client";

import { useState, useEffect } from "react";

import { API_BASE } from "@/config";

export function useApi<T>(endpoint: string) {
    const [data, setData] = useState<T | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        fetch(`${API_BASE}${endpoint}`)
            .then((res) => {
                if (!res.ok) throw new Error(`API error: ${res.status}`);
                return res.json();
            })
            .then((json) => {
                if (!cancelled) {
                    setData(json);
                    setLoading(false);
                }
            })
            .catch((err) => {
                if (!cancelled) {
                    setError(err.message);
                    setLoading(false);
                }
            });
        return () => {
            cancelled = true;
        };
    }, [endpoint]);

    return { data, loading, error };
}
