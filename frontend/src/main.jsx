import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/global.css'
import './styles/utilities.css'
import App from './App'

console.log('main.jsx ejecutándose')

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
)