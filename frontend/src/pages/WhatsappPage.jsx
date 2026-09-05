import ChatPanel from '../components/whatsapp/ChatPanel'
import './WhatsappPage.css'

export default function WhatsappPage() {
  return (
    <div className="whatsapp-page">
      <div className="whatsapp-page__card">
        <ChatPanel />
      </div>
    </div>
  )
}
