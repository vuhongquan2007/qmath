import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import QMathWorkspace from './components/QMathWorkspace';
import './index.css';
import './qmath-workspace.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QMathWorkspace />
  </StrictMode>,
);
