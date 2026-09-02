import ChatPanel from '../components/whatsapp/ChatPanel'
import './WhatsappPage.css'

export default function WhatsappPage() {
  return (
    <div className="whatsapp-page">

      {/* ── Cabecera ── */}
      <div className="whatsapp-page__header">
        <div className="whatsapp-page__header-left">
          <h1 className="whatsapp-page__title">WhatsApp</h1>
          <span className="whatsapp-page__subtitle">Conversaciones con clientes</span>
        </div>
      </div>

      {/* ── Panel de chat ── */}
      <div className="whatsapp-page__card">
        <ChatPanel />
      </div>

    </div>
  )
}