import { useState, useEffect, useRef } from 'react';
import { MessageSquare, Send, Smile, Shield, Radio, Sparkles, AlertCircle, X, ChevronDown, ChevronUp } from 'lucide-react';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';

const QUICK_CHEERS = [
  { text: 'SIX! 💥 Massive hit!', label: '6️⃣ Six!' },
  { text: 'FOUR! ⚡ Beautiful boundary!', label: '4️⃣ Four!' },
  { text: 'WHAT A WICKET! 🎯 Huge breakthrough!', label: '☝️ Wicket!' },
  { text: 'Great bowling! 👏 Under pressure!', label: '👏 Bowling' },
  { text: 'Come on team! Let\'s win this! 🏆🔥', label: '🏆 Cheer!' },
];

export function LiveMatchChat({ matchId, isLive = true, defaultCollapsed = false, className = '' }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [customName, setCustomName] = useState(() => {
    return localStorage.getItem('cricket_fan_name') || '';
  });
  const [namePromptOpen, setNamePromptOpen] = useState(false);
  const [enabled, setEnabled] = useState(true);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const [userChatPref, setUserChatPref] = useState(() => {
    return localStorage.getItem('cricket_live_chat') !== 'false';
  });

  const scrollRef = useRef(null);

  const fetchMessages = async () => {
    try {
      const res = await api(`/matches/public/${matchId}/messages`);
      if (res) {
        setEnabled(res.enabled !== false);
        setMessages(res.messages || []);
      }
    } catch (e) {
      // Quiet fail if network temporarily unavailable
    }
  };

  useEffect(() => {
    if (!userChatPref) return;
    fetchMessages();
    if (!isLive) return;
    const interval = setInterval(fetchMessages, 4000);
    return () => clearInterval(interval);
  }, [matchId, isLive, userChatPref]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (!collapsed && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length, collapsed]);

  const handleSend = async (msgToSend) => {
    const content = (msgToSend || text).trim();
    if (!content) return;

    // Check sender name
    let sender = user?.name || customName.trim();
    if (!sender) {
      setNamePromptOpen(true);
      return;
    }

    setSending(true);
    try {
      const res = await api(`/matches/public/${matchId}/messages`, {
        method: 'POST',
        body: {
          message: content,
          senderName: sender,
        },
      });

      if (res?.message) {
        setMessages((prev) => [...prev, res.message]);
        setText('');
      }
    } catch (err) {
      console.error('Failed to post message:', err);
    } finally {
      setSending(false);
    }
  };

  const saveCustomName = (name) => {
    const trimmed = name.trim().slice(0, 30);
    setCustomName(trimmed);
    localStorage.setItem('cricket_fan_name', trimmed);
    setNamePromptOpen(false);
    if (text.trim()) {
      handleSend(text);
    }
  };

  // If user disabled live chat in settings
  if (!userChatPref) {
    return (
      <div className={`rounded-xl border border-dashed border-slate-300 p-3 text-center text-xs text-slate-500 bg-slate-50 ${className}`}>
        <p>Live Fan Chat is turned off in your Settings.</p>
        <button
          type="button"
          onClick={() => {
            localStorage.setItem('cricket_live_chat', 'true');
            setUserChatPref(true);
          }}
          className="mt-1 font-semibold text-emerald-600 hover:underline"
        >
          Enable Live Chat
        </button>
      </div>
    );
  }

  // If Super Admin disabled live chat globally
  if (!enabled) {
    return (
      <div className={`rounded-xl border border-slate-200 p-3 text-center text-xs text-slate-500 bg-slate-50/70 flex items-center justify-center gap-2 ${className}`}>
        <Radio className="h-3.5 w-3.5 text-slate-400" />
        <span>Live fan chat is currently disabled by administrator.</span>
      </div>
    );
  }

  return (
    <div className={`rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden transition-all ${className}`}>
      {/* Header Bar */}
      <div
        className="flex items-center justify-between px-3.5 py-2.5 bg-gradient-to-r from-slate-900 via-navy-900 to-slate-900 text-white cursor-pointer select-none"
        onClick={() => setCollapsed(!collapsed)}
      >
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-emerald-400" />
          <span className="text-xs font-bold tracking-wide">LIVE FAN CHAT</span>
          <span className="flex items-center gap-1 rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            {messages.length}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-slate-300">
            {collapsed ? 'Tap to view' : 'Tap to close'}
          </span>
          {collapsed ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronUp className="h-4 w-4 text-slate-400" />}
        </div>
      </div>

      {!collapsed && (
        <div className="p-3 space-y-3">
          {/* Quick Cheer Buttons */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
            {QUICK_CHEERS.map((q, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSend(q.text)}
                disabled={sending}
                className="shrink-0 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-bold text-slate-700 hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-800 transition active:scale-95"
              >
                {q.label}
              </button>
            ))}
          </div>

          {/* Messages Container */}
          <div
            ref={scrollRef}
            className="h-44 sm:h-52 overflow-y-auto space-y-2 rounded-xl bg-slate-50/80 p-2.5 border border-slate-200/70 text-xs"
          >
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center text-slate-400">
                <Sparkles className="h-6 w-6 mb-1 text-slate-300" />
                <p className="font-semibold text-slate-600">No cheers yet!</p>
                <p className="text-[11px]">Be the first to cheer for your team.</p>
              </div>
            ) : (
              messages.map((m, i) => {
                const isMe = user?.name ? m.senderName === user.name : m.senderName === customName;
                const isStaff = m.senderRole === 'superadmin' || m.senderRole === 'admin' || m.senderRole === 'scorer';

                return (
                  <div
                    key={m._id || i}
                    className={`flex flex-col gap-0.5 rounded-xl p-2 ${
                      isMe
                        ? 'bg-emerald-50 border border-emerald-200 ml-6 text-emerald-950'
                        : isStaff
                        ? 'bg-amber-50/70 border border-amber-200 mr-6 text-slate-900'
                        : 'bg-white border border-slate-200 mr-6 text-slate-900'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[10px] text-slate-400">
                      <div className="flex items-center gap-1.5">
                        <span className={`font-bold ${isStaff ? 'text-amber-800' : isMe ? 'text-emerald-800' : 'text-slate-700'}`}>
                          {m.senderName}
                        </span>
                        {isStaff && (
                          <span className="rounded bg-amber-200/70 px-1 py-0.2 text-[9px] font-bold text-amber-900">
                            {m.senderRole === 'scorer' ? 'Official Scorer' : 'Staff'}
                          </span>
                        )}
                      </div>
                      <span>{new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <p className="text-[12px] leading-snug break-words mt-0.5">{m.message}</p>
                  </div>
                );
              })
            )}
          </div>

          {/* Name Prompt Modal if spectator hasn't set name */}
          {namePromptOpen && (
            <div className="rounded-xl border border-amber-300 bg-amber-50 p-2.5 space-y-2 text-xs">
              <p className="font-bold text-amber-900">What is your name? (For live cheer)</p>
              <div className="flex gap-1.5">
                <input
                  type="text"
                  placeholder="Enter your name"
                  defaultValue={customName}
                  id="fan-name-input"
                  className="input !py-1 text-xs flex-1 bg-white"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') saveCustomName(e.currentTarget.value);
                  }}
                />
                <button
                  type="button"
                  onClick={() => {
                    const el = document.getElementById('fan-name-input');
                    if (el) saveCustomName(el.value);
                  }}
                  className="btn btn-green !py-1 text-xs font-bold"
                >
                  Save
                </button>
              </div>
            </div>
          )}

          {/* Message Input Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-1.5"
          >
            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={user?.name ? `Cheer as ${user.name}...` : customName ? `Cheer as ${customName}...` : 'Write a cheer or comment...'}
              maxLength={300}
              className="input !py-2 text-xs flex-1"
            />
            <button
              type="submit"
              disabled={sending || !text.trim()}
              className="btn btn-green !py-2 !px-3 shrink-0 flex items-center justify-center font-bold"
            >
              <Send className="h-3.5 w-3.5" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
