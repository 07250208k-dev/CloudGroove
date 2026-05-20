import React, { useState, useRef, useEffect } from 'react';
import { Bot, X, Send, Play } from 'lucide-react';

const AIDJ = ({ onClose }) => {
  const [messages, setMessages] = useState([
    { sender: 'ai', text: 'Yo, Chummer. Drive内の「Synthwave Mixes」から、雨の日の深夜に合うトラックを抽出したぜ。聴くかい？', isAction: false }
  ]);
  const [input, setInput] = useState('');
  const chatRef = useRef(null);

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = () => {
    if (!input.trim()) return;
    
    const userMsg = input.trim();
    setMessages(prev => [...prev, { sender: 'user', text: userMsg, isAction: false }]);
    setInput('');

    setTimeout(() => {
      setMessages(prev => [...prev, { 
        sender: 'ai', 
        text: 'プレイリスト生成中... [完了]', 
        isAction: true 
      }]);
    }, 1000);
  };

  return (
    <div className="side-panel">
      <div className="panel-header">
        <h3><Bot size={18} /> AI DJ "Neuromancer"</h3>
        <button className="close-btn" onClick={onClose}><X size={20} /></button>
      </div>
      <div className="chat-area" ref={chatRef}>
        {messages.map((msg, idx) => (
          <div key={idx} className={`message ${msg.sender}`}>
            <span className="avatar">{msg.sender === 'ai' ? 'AI' : 'U'}</span>
            <p>
              {msg.text}
              {msg.isAction && (
                <><br/><button className="play-generated-btn"><Play size={14}/> ミックス開始</button></>
              )}
            </p>
          </div>
        ))}
      </div>
      <div className="chat-input">
        <input 
          type="text" 
          placeholder="DJにリクエストする..." 
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
        />
        <button onClick={handleSend}><Send size={16} /></button>
      </div>
    </div>
  );
};

export default AIDJ;
