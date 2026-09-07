import React, { useState, useEffect, useRef } from 'react';
import { Upload, Check, Trash2, Loader2, Cookie, FileText } from 'lucide-react';

/**
 * CookiesUpload — upload a Netscape-format cookies.txt for yt-dlp.
 * The file is sent to /api/cookies/upload which writes it to a fixed path
 * on the Railway volume and updates YT_DLP_COOKIES live (no restart).
 */
export default function CookiesUpload() {
    const [status, setStatus] = useState(null); // null | 'loading' | 'active' | 'idle'
    const [activeFile, setActiveFile] = useState(null); // { size }
    const [uploading, setUploading] = useState(false);
    const [dragOver, setDragOver] = useState(false);
    const fileRef = useRef(null);

    // Check if cookies are already active on mount
    useEffect(() => {
        fetch('/api/cookies/status')
            .then(r => r.json())
            .then(data => {
                if (data.active) {
                    setStatus('active');
                    setActiveFile({ size: data.size });
                } else {
                    setStatus('idle');
                }
            })
            .catch(() => setStatus('idle'));
    }, []);

    const handleUpload = async (file) => {
        if (!file) return;
        setUploading(true);
        try {
            const formData = new FormData();
            formData.append('file', file);
            const res = await fetch('/api/cookies/upload', { method: 'POST', body: formData });
            if (!res.ok) throw new Error((await res.json()).detail || 'Upload failed');
            const data = await res.json();
            setActiveFile({ size: data.size });
            setStatus('active');
        } catch (err) {
            alert('Failed to upload cookies: ' + err.message);
        } finally {
            setUploading(false);
        }
    };

    const handleDelete = async () => {
        if (!confirm('Remove the uploaded cookies file?')) return;
        try {
            const res = await fetch('/api/cookies', { method: 'DELETE' });
            if (!res.ok) throw new Error('Delete failed');
            setActiveFile(null);
            setStatus('idle');
        } catch (err) {
            alert('Failed to delete cookies: ' + err.message);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setDragOver(false);
        const file = e.dataTransfer.files?.[0];
        if (file) handleUpload(file);
    };

    const formatSize = (bytes) => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    };

    return (
        <div className="glass-panel p-6 mt-8">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <Cookie size={18} className="text-primary" />
                    <h2 className="text-lg font-semibold">YouTube Cookies</h2>
                </div>
                <span className="text-[10px] bg-white/5 border border-white/5 px-2 py-0.5 rounded text-zinc-500 uppercase tracking-wider">Optional</span>
            </div>
            <p className="text-xs text-zinc-500 mb-6 leading-relaxed">
                Upload a Netscape-format <code className="text-zinc-400 bg-white/5 px-1 rounded">cookies.txt</code> from your browser
                to download age-restricted or login-gated YouTube videos. Use a browser extension like
                <a href="https://chrome.google.com/webstore/detail/get-cookiestxt-clean/ahmfnjeglddpplmkeijbbdbbjhofmlkn" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline ml-1">Get cookies.txt LOCALLY</a> to export.
            </p>

            {status === 'active' && activeFile ? (
                <div className="flex items-center gap-4 p-4 border border-green-500/20 bg-green-500/5 rounded-xl">
                    <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center">
                        <Check size={18} className="text-green-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                            <FileText size={14} className="text-zinc-400" />
                            <span className="text-sm text-zinc-200 truncate">youtube.txt</span>
                            <span className="text-xs text-zinc-500">({formatSize(activeFile.size)})</span>
                        </div>
                        <span className="text-xs text-green-400">Active — used by yt-dlp for all downloads</span>
                    </div>
                    <button
                        onClick={handleDelete}
                        className="p-2 text-zinc-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                        title="Remove cookies file"
                    >
                        <Trash2 size={16} />
                    </button>
                </div>
            ) : (
                <div
                    onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={handleDrop}
                    onClick={() => fileRef.current?.click()}
                    className={`relative flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-xl cursor-pointer transition-all ${
                        dragOver
                            ? 'border-primary bg-primary/5'
                            : 'border-white/10 hover:border-white/20 hover:bg-white/[0.02]'
                    }`}
                >
                    <input
                        ref={fileRef}
                        type="file"
                        accept=".txt,text/plain"
                        className="hidden"
                        onChange={(e) => handleUpload(e.target.files?.[0])}
                    />
                    {uploading ? (
                        <div className="flex flex-col items-center gap-3">
                            <Loader2 size={24} className="text-primary animate-spin" />
                            <span className="text-sm text-zinc-400">Uploading...</span>
                        </div>
                    ) : (
                        <>
                            <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-3">
                                <Upload size={20} className="text-zinc-400" />
                            </div>
                            <p className="text-sm text-zinc-300 mb-1">
                                Drop your <code className="text-primary bg-primary/10 px-1 rounded">cookies.txt</code> here
                            </p>
                            <p className="text-xs text-zinc-500">or click to browse • Netscape format</p>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}
