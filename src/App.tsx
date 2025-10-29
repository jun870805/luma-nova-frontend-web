// src/App.tsx
import './App.scss'
import { Routes, Route } from 'react-router-dom'
import ChatList from './components/chatList'
import Chat from './components/chat'

function App() {
  return (
    <div className="appContainer">
      <div className="chatWrapper">
        <Routes>
          <Route path="/" element={<ChatList />} />
          <Route path="/chat/:id" element={<Chat />} />
        </Routes>
      </div>
    </div>
  )
}

export default App
