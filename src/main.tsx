import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'

window.addEventListener('error', (e) => {
  document.body.innerHTML += `<div style="color:red;z-index:9999;position:fixed;top:0;left:0">${e.message}</div>`;
});
window.addEventListener('unhandledrejection', (e) => {
  document.body.innerHTML += `<div style="color:red;z-index:9999;position:fixed;top:50px;left:0">${e.reason}</div>`;
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
      <App />
  </React.StrictMode>,
)
