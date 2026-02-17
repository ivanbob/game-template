import React, { useState, useEffect } from 'react';
import { fetchLeaderboard } from './actions/TileActions';

const Leaderboard = ({ onClose }) => {
    const [scores, setScores] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const load = async () => {
            try {
                const data = await fetchLeaderboard();
                setScores(data);
            } catch (err) {
                console.error(err);
                setError('Failed to load rankings.');
            } finally {
                setLoading(false);
            }
        };

        load();
    }, []);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-md flex flex-col max-h-[80vh]">

                {/* Header */}
                <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-800/50 rounded-t-xl">
                    <h2 className="text-xl font-bold text-cyan-400 tracking-wider">TOP CONTRIBUTORS</h2>
                    <button
                        onClick={onClose}
                        className="text-slate-400 hover:text-white transition-colors"
                    >
                        ✕
                    </button>
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
                    {loading && (
                        <div className="text-center py-8 text-slate-500 animate-pulse">
                            Decrypting Global Stats...
                        </div>
                    )}

                    {error && (
                        <div className="text-center py-8 text-red-400">
                            {error}
                        </div>
                    )}

                    {!loading && !error && scores.length === 0 && (
                        <div className="text-center py-8 text-slate-500">
                            No solves yet today. Be the first!
                        </div>
                    )}

                    {!loading && !error && scores.map((entry, index) => (
                        <div
                            key={entry.userId}
                            className={`flex items-center justify-between p-3 rounded-lg border ${index < 3
                                ? 'bg-gradient-to-r from-slate-800 to-slate-900 border-yellow-500/30'
                                : 'bg-slate-900/50 border-slate-800'
                                }`}
                        >
                            <div className="flex items-center gap-3">
                                <div className={`w-8 h-8 flex items-center justify-center rounded-full font-bold text-sm ${index === 0 ? 'bg-yellow-500 text-black' :
                                    index === 1 ? 'bg-slate-300 text-black' :
                                        index === 2 ? 'bg-amber-700 text-white' :
                                            'bg-slate-800 text-slate-400'
                                    }`}>
                                    {index + 1}
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-slate-200 font-mono text-sm max-w-[150px] truncate">
                                        User {entry.userId.slice(0, 8)}
                                    </span>
                                </div>
                            </div>
                            <div className="font-mono text-cyan-400 font-bold">
                                {entry.score} <span className="text-xs text-slate-500 font-normal">SOLVES</span>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-slate-800 bg-slate-800/50 text-center text-xs text-slate-500 rounded-b-xl">
                    Rankings reset daily with the Vault.
                </div>
            </div>
        </div>
    );
};

export default Leaderboard;
