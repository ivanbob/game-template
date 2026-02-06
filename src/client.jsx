import React from 'react';
import ReactDOM from 'react-dom/client';
import CipherGame from './components/CipherGame';
import './styles/cipher.css';

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <CipherGame />
    </React.StrictMode>
);
