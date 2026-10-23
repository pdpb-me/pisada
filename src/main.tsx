import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { Toaster } from '@/components/ui/sonner'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
    <Toaster position="top-center" />
  </StrictMode>,
)

// Makes the app installable on the phone (see public/sw.js: it caches nothing).
// Not in the demo: it must never install over the real app.
if ('serviceWorker' in navigator && import.meta.env.PROD && import.meta.env.MODE !== 'demo') {
  navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`)
}
