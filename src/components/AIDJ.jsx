import React, { useState, useRef, useEffect } from 'react';
import { Bot, X, Send, Play, Terminal, Sparkles, AlertCircle } from 'lucide-react';

const AIDJ = ({ tracks = [], playTrack, onClose }) => {
  const [messages, setMessages] = useState([
    { 
      sender: 'ai', 
      text: 'Yo, Chummer (チャマー)。オレはAI DJ "Neuromancer"だ。このサイバースペースのグリッドから、お前の求める音楽データをジャックしてやるぜ。', 
      isAction: false 
    },
    {
      sender: 'ai',
      text: '「○○を探して」「○○をかけて」と命令してみな。あるいは「おすすめは？」と聞いてくれれば、脳幹に直撃するビートをジャックするぜ。',
      isHelp: true
    }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const chatRef = useRef(null);

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  // サイバーパンク風スラング付きレスポンス生成
  const generateNeuromancerResponse = (userMsg) => {
    const msgLower = userMsg.toLowerCase();
    
    // 1. 曲を探す指示の判定
    let searchKeyword = '';
    const searchMatch = userMsg.match(/(?:(?:を)?(?:探して|さがして|検索|見つけて|find|search))/i);
    
    if (searchMatch) {
      // 「○○を探して」の○○を抽出
      searchKeyword = userMsg.split(searchMatch[0])[0].trim().replace(/[「」『』"']/g, '');
    } else if (msgLower.includes('かけて') || msgLower.includes('再生') || msgLower.includes('play')) {
      const playMatch = userMsg.match(/(?:(?:を)?(?:かけて|再生|play))/i);
      searchKeyword = userMsg.split(playMatch[0])[0].trim().replace(/[「」『』"']/g, '');
    }

    // もしキーワード抽出に失敗したが、文字数が短く何かの検索とみなせる場合
    if (!searchKeyword && userMsg.length < 15 && !['こんにちは', 'ハロー', 'hello', 'よぉ', '自己紹介', 'だれ', '誰', '誰ですか', '使い方', 'ヘルプ', 'help', 'おすすめ', 'お勧め'].some(w => msgLower.includes(w))) {
      searchKeyword = userMsg;
    }

    if (searchKeyword) {
      if (tracks.length === 0) {
        return {
          text: `まだGoogle Driveとの同期が通ってないようだな。マトリクスが空っぽだ。先に右上の「同期」から接続しな。接続後に音楽を探してやるぜ。`
        };
      }

      // ライブラリから検索
      const matched = tracks.filter(t => t.name.toLowerCase().includes(searchKeyword.toLowerCase()));
      
      if (matched.length > 0) {
        return {
          text: `グリッドのスキャン完了。[ICE]をバイパスして、マイドライブから「${searchKeyword}」に一致するトラックを ${matched.length} 件ジャックしたぜ。デッキへロードする曲を選びな。`,
          matchedTracks: matched
        };
      } else {
        return {
          text: `クソッ、マイドライブの全セクターをスキャンしたが、「${searchKeyword}」に一致するトラックのデータシグナルを検出できなかった。キーワードの周波数を変えてみるか、別のDeckから探してみてくれ。`
        };
      }
    }

    // 2. 挨拶や自己紹介
    if (msgLower.includes('こんにちは') || msgLower.includes('ハロー') || msgLower.includes('hello') || msgLower.includes('よぉ')) {
      return {
        text: `よぉ、Chummer。調子はどうだ？ オレのニューラル・プロセッサはいつでも音楽データをハックする準備ができてるぜ。今日のプレイリストをアップデートするか？`
      };
    }

    if (msgLower.includes('だれ') || msgLower.includes('誰') || msgLower.includes('who are you') || msgLower.includes('自己紹介') || msgLower.includes('名前')) {
      return {
        text: `オレは "Neuromancer"。このCloudGrooveの音響マトリクスを支配するAI DJだ。お前のGoogle Driveに眠る音楽ファイルを解析し、最高のサイバービートに昇華するのがオレの仕事だ。`
      };
    }

    if (msgLower.includes('使い方') || msgLower.includes('ヘルプ') || msgLower.includes('help')) {
      return {
        text: `使い方はシンプルだ。チャットで「Synthwaveを探して」や「Cyberpunkをかけて」などと打つだけでいい。オレがお前の同期した音楽ファイルから見つけ出して、すぐにこのデッキで再生可能にしてやるぜ。`
      };
    }

    // 3. おすすめのリクエスト
    if (msgLower.includes('おすすめ') || msgLower.includes('お勧め') || msgLower.includes('recommend') || msgLower.includes('なんか') || msgLower.includes('何でも') || msgLower.includes('曲を提案')) {
      if (tracks.length === 0) {
        return {
          text: `まだGoogle Driveとの同期が通ってないようだな。マトリクスが空っぽだ。先に右上の「同期」から接続しな。`
        };
      }
      
      // ランダムに3曲選ぶ
      const shuffled = [...tracks].sort(() => 0.5 - Math.random());
      const selected = shuffled.slice(0, Math.min(3, tracks.length));
      
      return {
        text: `オレのセクターから、今日の脳内ホルモンを刺激するトラックを選び抜いたぜ。これが脳幹に直撃するおすすめのビートだ。聴いてみな。`,
        matchedTracks: selected
      };
    }

    // 4. その他の会話
    const genericResponses = [
      'ほう、興味深いアクセスだな。だがオレのデータ・ソケットが求めているのは音の波形だ。曲の検索や再生を指示してくれ。',
      'グリッドにノイズが混ざっている。もう少し具体的なリクエスト、例えば「Synthwave を探して」といった命令を送ってくれ。',
      'お前の脳波パターンは少しカオスだ。オレがビートを注入して同期させてやろうか？ 何か曲を探し出すぜ。',
      'システムログ: [警告] 未知のクエリ。だがオレは親切だ。ライブラリから何か適当な曲をジャックしてやろうか？ 「おすすめ」と打ってみな。'
    ];
    
    return {
      text: genericResponses[Math.floor(Math.random() * genericResponses.length)]
    };
  };

  const handleSend = () => {
    if (!input.trim() || isTyping) return;
    
    const userMsg = input.trim();
    setMessages(prev => [...prev, { sender: 'user', text: userMsg }]);
    setInput('');
    setIsTyping(true);

    // AIのタイピングエフェクト（遅延）
    setTimeout(() => {
      setIsTyping(false);
      const res = generateNeuromancerResponse(userMsg);
      setMessages(prev => [...prev, { 
        sender: 'ai', 
        text: res.text, 
        matchedTracks: res.matchedTracks 
      }]);
    }, 700 + Math.random() * 500); 
  };

  return (
    <div className="side-panel ai-dj-panel" style={{ borderLeft: '1px solid var(--neon-purple)', boxShadow: '0 0 20px rgba(181, 0, 255, 0.15)' }}>
      <div className="panel-header" style={{ background: 'linear-gradient(90deg, rgba(181, 0, 255, 0.15) 0%, rgba(0, 0, 0, 0) 100%)' }}>
        <h3 className="neon-text-purple" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontFamily: 'Orbitron', textShadow: '0 0 8px var(--neon-purple)' }}>
          <Bot size={18} className="neon-text-purple animate-pulse" /> AI DJ "Neuromancer"
        </h3>
        <button className="close-btn" onClick={onClose} style={{ color: 'var(--neon-purple)' }}><X size={20} /></button>
      </div>

      <div className="chat-area" ref={chatRef} style={{ padding: '15px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {messages.map((msg, idx) => (
          <div 
            key={idx} 
            className={`message ${msg.sender}`} 
            style={{ 
              alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start',
              maxWidth: '85%',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px'
            }}
          >
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.65rem',
              fontFamily: 'Orbitron',
              color: msg.sender === 'user' ? 'var(--neon-cyan)' : 'var(--neon-purple)',
              alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start'
            }}>
              {msg.sender === 'user' ? (
                <>USER <span className="sync-dot active" style={{ position: 'static', backgroundColor: 'var(--neon-cyan)' }}></span></>
              ) : (
                <><span className="sync-dot active animate-ping" style={{ position: 'static', backgroundColor: 'var(--neon-purple)' }}></span> NEUROMANCER v1.0.8</>
              )}
            </div>

            <div style={{
              padding: '10px 14px',
              borderRadius: msg.sender === 'user' ? '12px 2px 12px 12px' : '2px 12px 12px 12px',
              background: msg.sender === 'user' ? 'rgba(0, 243, 255, 0.05)' : 'rgba(181, 0, 255, 0.05)',
              border: `1px solid ${msg.sender === 'user' ? 'rgba(0, 243, 255, 0.2)' : 'rgba(181, 0, 255, 0.2)'}`,
              boxShadow: msg.sender === 'user' ? '0 0 10px rgba(0, 243, 255, 0.05)' : '0 0 10px rgba(181, 0, 255, 0.05)',
              color: '#fff',
              fontSize: '0.85rem',
              lineHeight: '1.4'
            }}>
              {msg.text}

              {/* 検索で見つかった曲の表示領域 */}
              {msg.matchedTracks && msg.matchedTracks.length > 0 && (
                <div style={{ 
                  marginTop: '12px', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: '8px', 
                  borderTop: '1px solid rgba(255,255,255,0.1)', 
                  paddingTop: '10px' 
                }}>
                  {msg.matchedTracks.map(track => (
                    <div 
                      key={track.id} 
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        backgroundColor: 'rgba(0,0,0,0.5)',
                        border: '1px solid rgba(255,255,255,0.05)',
                        borderRadius: '6px',
                        padding: '6px 10px',
                        gap: '10px'
                      }}
                    >
                      <span style={{ 
                        fontSize: '0.75rem', 
                        whiteSpace: 'nowrap', 
                        overflow: 'hidden', 
                        textOverflow: 'ellipsis',
                        color: 'var(--text-color)',
                        flex: 1
                      }} title={track.name}>
                        {track.name}
                      </span>
                      <button 
                        onClick={() => playTrack && playTrack(track)}
                        style={{
                          background: 'rgba(181, 0, 255, 0.1)',
                          border: '1px solid var(--neon-purple)',
                          color: '#fff',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '0.7rem',
                          fontFamily: 'Orbitron',
                          transition: 'all 0.2s',
                          boxShadow: '0 0 5px rgba(181, 0, 255, 0.2)'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'var(--neon-purple)';
                          e.currentTarget.style.boxShadow = '0 0 10px var(--neon-purple)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'rgba(181, 0, 255, 0.1)';
                          e.currentTarget.style.boxShadow = '0 0 5px rgba(181, 0, 255, 0.2)';
                        }}
                      >
                        <Play size={10} fill="currentColor" /> JACK
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {isTyping && (
          <div style={{ alignSelf: 'flex-start', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ fontSize: '0.65rem', fontFamily: 'Orbitron', color: 'var(--neon-purple)' }}>
              NEUROMANCER
            </span>
            <div style={{
              padding: '8px 12px',
              borderRadius: '2px 12px 12px 12px',
              background: 'rgba(181, 0, 255, 0.02)',
              border: '1px dashed rgba(181, 0, 255, 0.2)',
              color: 'var(--neon-purple)',
              fontSize: '0.75rem',
              fontFamily: 'monospace',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <Terminal size={12} className="animate-pulse" /> [SYS.SCANNING_GRID...]
            </div>
          </div>
        )}
      </div>

      <div className="chat-input" style={{ borderTop: '1px solid rgba(181, 0, 255, 0.15)', padding: '10px 15px', display: 'flex', gap: '8px', backgroundColor: 'rgba(0,0,0,0.4)' }}>
        <input 
          type="text" 
          placeholder="Neuromancerに命令する (例: Synthを探して)" 
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.8)',
            border: '1px solid rgba(181, 0, 255, 0.3)',
            borderRadius: '4px',
            color: '#fff',
            padding: '8px 12px',
            fontSize: '0.8rem',
            fontFamily: 'monospace',
            outline: 'none',
            boxShadow: 'inset 0 0 5px rgba(0,0,0,0.5)'
          }}
          disabled={isTyping}
        />
        <button 
          onClick={handleSend}
          style={{
            background: 'var(--neon-purple)',
            border: 'none',
            borderRadius: '4px',
            color: '#fff',
            width: '36px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: '0 0 8px var(--neon-purple)',
            transition: 'all 0.2s'
          }}
          disabled={isTyping || !input.trim()}
          onMouseEnter={(e) => {
            if (!e.currentTarget.disabled) e.currentTarget.style.boxShadow = '0 0 15px var(--neon-purple)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.boxShadow = '0 0 8px var(--neon-purple)';
          }}
        >
          <Send size={14} />
        </button>
      </div>
    </div>
  );
};

export default AIDJ;
