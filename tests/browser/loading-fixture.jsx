// Isolated entry for testing real deferred imports; no campaign connection.
import React from 'react';
import {createRoot} from 'react-dom/client';
import App from '../../src/App.jsx';
createRoot(document.getElementById('root')).render(<App/>);
