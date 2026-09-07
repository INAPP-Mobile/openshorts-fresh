import React, { useState, useEffect } from 'react';
import { Key, Eye, EyeOff, Check, Loader2, AlertCircle, ExternalLink } from 'lucide-react';

/**
 * ApifyToken — manage the Apify API token used by the YouTube Video Downloader actor.
 * Token is persisted to /data/settings/settings.json on the Railway volume
 * and applied to the backend env live (no restart).
 */
export default function ApifyToken() {
    const [token, setToken] = useState('');
    const [isVisible, setIsVisible] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [status, setStatus] = useState(null); // { set, masked, from_env }
    const [saved, setSaved] = useState(false);
    const [error, setError] = useState(null);

    // Load current status on mount
    useEffect(() => {
        fetch('/api/settings')
            .then(r => r.json())
            .then(data => {
                const apify = data.APIFY_TOKEN || {};
                setStatus(apify);
                if (apify.masked) {
                    // Pre-fill with masked value as placeholder indication
                    setToken('');
                }
            })
            .catch(() => setError('Failed to load settings'))
            .finally(() => setLoading(false));
    }, []);

    const handleSave = async () => {
        setSaving(true);
        setError(null);
        setSaved(false);
        try {
            const res = await fetch('/api/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ APIFY_TOKEN: token }),
            });
            if (!res.ok) throw new Error((await res.json()).detail || 'Save failed');
            const data = await res.json();
            setStatus(data.APIFY_TOKEN);
            setSaved(true);
            // Clear input after successful save (token is masked now)
            if (token.trim()) {
                setToken('');
                setIsVisible(false);
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleClear = async () => {
        setSaving(true);
        setError(null);
        try {
            const res = await fetch('/api/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ APIFY_TOKEN: '' }),
            });
            if (!res.ok) throw new Error((await res.json()).detail || 'Clear failed');
            const data = await res.json();
            setStatus(data.APIFY_TOKEN);
            setToken('');
            setIsVisible(false);
        } catch (err) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="glass-panel p-6 mt-8">
                <div className="flex items-center gap-3">
                    <Loader2 size={20} className="animate-spin text-zinc-400" />
                    <span className="text-zinc-400">Loading settings...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="glass-panel p-6 mt-8">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-orange-500/20 rounded-lg text-orange-400">
                        <Key size={20} />
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold">Apify Token</h2>
                        <p className="text-xs text-zinc-500">YouTube Video Downloader (residential network)</p>
                    </div>
                </div>
                {status?.set && (
                    <div className="px-3 py-1 bg-green-500/10 border border-green-500/20 rounded-full text-[10px] text-green-400 font-medium flex items-center gap-2">
                        <Check size={12} /> Active
                    </div>
                )}
            </div>

            <p className="text-xs text-zinc-500 mb-4 leading-relaxed">
                Apify runs YouTube downloads on residential networks, bypassing YouTube's datacenter-IP bot checks.
                {status?.from_env && (
                    <span className="text-amber-400"> Currently loaded from Railway env var.</span>
                )}
            </p>

            <div className="space-y-3">
                <label className="block text-sm text-zinc-400">API Token</label>
                <div className="flex gap-2">
                    <div className="relative flex-1">
                        <input
                            type={isVisible ? 'text' : 'password'}
                            value={token}
                            onChange={(e) => {
                                setToken(e.target.value);
                                setSaved(false);
                            }}
                            placeholder={status?.masked || 'apify_api_...'}
                            className="input-field pr-12 font-mono text-sm"
                        />
                        <button
                            onClick={() => setIsVisible(!isVisible)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white transition-colors"
                        >
                            {isVisible ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                    </div>
                    <button
                        onClick={handleSave}
                        disabled={saving || !token.trim()}
                        className="btn-primary py-2 px-4 text-sm flex items-center gap-2 disabled:opacity-50"
                    >
                        {saving ? <Loader2 size={16} className="animate-spin" /> : null}
                        Save
                    </button>
                    {status?.set && (
                        <button
                            onClick={handleClear}
                            disabled={saving}
                            className="py-2 px-4 text-sm border border-red-500/30 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50"
                        >
                            Clear
                        </button>
                    )}
                </div>

                {status?.set && (
                    <p className="text-xs text-zinc-500">
                        Current: <code className="text-zinc-400 bg-white/5 px-1.5 py-0.5 rounded">{status.masked}</code>
                    </p>
                )}

                {saved && (
                    <p className="text-xs text-green-400 flex items-center gap-1">
                        <Check size={14} /> Token saved and applied
                    </p>
                )}

                {error && (
                    <p className="text-xs text-red-400 flex items-center gap-1">
                        <AlertCircle size={14} /> {error}
                    </p>
                )}
            </div>

            <div className="mt-4 p-3 bg-white/5 rounded-lg border border-white/5">
                <p className="text-xs text-zinc-500 leading-relaxed">
                    <strong className="text-zinc-400">How to get a token:</strong>
                </p>
                <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <a
                        href="https://console.apify.com/account#/integrations"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 border border-white/5 rounded-lg hover:bg-white/5 transition-colors flex flex-col gap-1"
                    >
                        <span className="text-zinc-400 font-medium">1. Apify Console</span>
                        <span className="text-[10px] text-zinc-600">Account → Integrations → API tokens</span>
                    </a>
                    <a
                        href="https://apify.com/store/streamers/youtube-video-downloader"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 border border-white/5 rounded-lg hover:bg-white/5 transition-colors flex flex-col gap-1"
                    >
                        <span className="text-zinc-400 font-medium">2. Actor Page</span>
                        <span className="text-[10px] text-zinc-600">Pricing: $2.50/1,000 videos</span>
                    </a>
                </div>
                <p className="text-[10px] text-zinc-600 mt-2">
                    Free tier includes $5/month usage. Token is stored on the Railway volume and applied live.
                </p>
            </div>
        </div>
    );
}
