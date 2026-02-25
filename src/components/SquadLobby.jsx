import React, { useState, useEffect } from 'react';
import '../styles/cipher.css';

const SquadLobby = ({ onSelectSquad }) => {
    const [view, setView] = useState('list'); // 'list', 'create', 'join'
    const [squads, setSquads] = useState([]);
    const [loading, setLoading] = useState(true);
    const [squadName, setSquadName] = useState('');
    const [joinCode, setJoinCode] = useState('');
    const [error, setError] = useState('');

    const changeView = (v) => {
        setError('');
        setSquadName('');
        setJoinCode('');
        setView(v);
    };

    const WORKER_BASE = 'https://cipher-squad-worker.jikoentcompany.workers.dev';

    useEffect(() => {
        fetchSquads();
    }, []);

    const fetchSquads = async () => {
        setLoading(true);
        try {
            // Check if global squad logic should be used here, but for now we expect API to return squads
            const res = await fetch(`${WORKER_BASE}/api/squad/info`, {
                headers: getAuthHeaders()
            });
            if (res.ok) {
                const data = await res.json();
                setSquads(data.data?.squads || []);
            }
        } catch (e) {
            console.error('Failed to fetch squads:', e);
        }
        setLoading(false);
    };

    const getAuthHeaders = () => {
        const headers = { 'Content-Type': 'application/json' };
        const tg = window.Telegram?.WebApp;
        if (tg?.initData) {
            headers['Authorization'] = `tma ${tg.initData}`;
        } else {
            headers['Authorization'] = `mock dev_user_local`;
        }
        return headers;
    };

    const handleCreate = async () => {
        if (!squadName.trim()) return setError('Please enter a squad name.');
        setError('');
        setLoading(true);
        try {
            const res = await fetch(`${WORKER_BASE}/api/squad/create`, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify({ name: squadName })
            });

            if (res.ok) {
                const data = await res.json();
                onSelectSquad(data.data.id, data.data.name);
            } else {
                setError('Failed to create squad.');
            }
        } catch (e) {
            setError('Network error.');
        }
        setLoading(false);
    };

    const handleJoin = async () => {
        if (!joinCode.trim()) return setError('Please enter an invite code.');
        setError('');
        setLoading(true);
        try {
            const res = await fetch(`${WORKER_BASE}/api/squad/join`, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify({ squadId: joinCode })
            });

            if (res.ok) {
                const data = await res.json();
                onSelectSquad(data.data.id, data.data.name);
            } else {
                setError('Invalid invite code or squad not found.');
            }
        } catch (e) {
            setError('Network error.');
        }
        setLoading(false);
    };

    const renderList = () => (
        <div className="squad-list">
            <h3>My Squads</h3>
            {loading ? <p>Loading...</p> : (
                squads.length === 0 ? (
                    <p className="empty-state">You are not in any private squads yet.</p>
                ) : (
                    <ul>
                        {squads.map(sq => (
                            <li key={sq.id} onClick={() => onSelectSquad(sq.id, sq.name)}>
                                <span className="squad-name">{sq.name}</span>
                                <span className="squad-role" style={{ color: '#888', fontSize: '0.8rem', marginLeft: '8px' }}>({sq.role})</span>
                            </li>
                        ))}
                    </ul>
                )
            )}

            <div className="lobby-actions">
                <button className="primary-btn" onClick={() => changeView('create')}>Create Squad</button>
                <button className="secondary-btn" onClick={() => changeView('join')}>Join via Code</button>
            </div>

            <div className="global-fallback">
                <p>Or play with everyone:</p>
                <button className="outline-btn" onClick={() => onSelectSquad('global-squad-0000', 'Global Squad')}>Enter Global Vault</button>
            </div>
        </div>
    );

    const renderCreate = () => (
        <form className="squad-form" onSubmit={(e) => { e.preventDefault(); handleCreate(); }}>
            <h3>Create a New Squad</h3>
            <p>Form a private squad to solve vaults with your friends.</p>
            <input
                type="text"
                placeholder="Squad Name (e.g., Alpha Team)"
                value={squadName}
                onChange={(e) => setSquadName(e.target.value)}
                maxLength={30}
            />
            {error && <p className="error-text">{error}</p>}
            <div className="lobby-actions">
                <button type="submit" className="primary-btn" disabled={loading}>Create</button>
                <button type="button" className="secondary-btn" onClick={() => changeView('list')} disabled={loading}>Cancel</button>
            </div>
        </form>
    );

    const renderJoin = () => (
        <form className="squad-form" onSubmit={(e) => { e.preventDefault(); handleJoin(); }}>
            <h3>Join a Squad</h3>
            <p>Enter the invite code from your squad leader.</p>
            <input
                type="text"
                placeholder="Invite Code"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
            />
            {error && <p className="error-text">{error}</p>}
            <div className="lobby-actions">
                <button type="submit" className="primary-btn" disabled={loading}>Join</button>
                <button type="button" className="secondary-btn" onClick={() => changeView('list')} disabled={loading}>Cancel</button>
            </div>
        </form>
    );

    return (
        <div className="squad-lobby">
            <h2>SQUAD TERMINAL</h2>
            <div className="lobby-content">
                {view === 'list' && renderList()}
                {view === 'create' && renderCreate()}
                {view === 'join' && renderJoin()}
            </div>
        </div>
    );
};

export default SquadLobby;
