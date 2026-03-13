'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { ManualImageModal } from '@/components/ManualGuide';
import { Sidebar } from '@/components/Sidebar';
import { WelcomeScreen } from '@/components/WelcomeScreen';
import { MessageItem, TypingIndicator } from '@/components/MessageItem';
import { InputBar } from '@/components/InputBar';
import { SettingsModal } from '@/components/SettingsModal';
import { HistoryModal, ChatSession } from '@/components/HistoryModal';
import { LandingPage } from '@/components/LandingPage';
import { Mode, ChatMessage, ModalState, MODE_CONFIG } from '@/lib/constants';

export default function HomePage() {
  const [showLanding, setShowLanding] = useState(true);
  const [mode, setMode] = useState<Mode>('ct-expert');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [modal, setModal] = useState<ModalState>({ isOpen: false, pageNumber: 1, caption: '' });

  // New States for History and Settings
  const [sessionId, setSessionId] = useState<string>('');
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Initialize session ID and load history on mount
  useEffect(() => {
    // 1. Check for active session
    const activeSessionId = localStorage.getItem('ct_expert_active_session_id');
    const storedSessions = localStorage.getItem('ct_expert_sessions');
    
    let parsedSessions: ChatSession[] = [];
    if (storedSessions) {
      try {
        parsedSessions = JSON.parse(storedSessions);
        setSessions(parsedSessions);
      } catch (e) {
        console.error("Failed to parse sessions", e);
      }
    }

    if (activeSessionId) {
      const active = parsedSessions.find(s => s.id === activeSessionId);
      if (active) {
        setSessionId(active.id);
        setMessages(active.messages);
        setMode(active.mode);
        setShowLanding(false); // Skip landing if active session exists
        return;
      }
    }

    // Default: new session
    setSessionId(crypto.randomUUID());
  }, []);

  // Save session whenever messages change
  useEffect(() => {
    if (messages.length === 0 || !sessionId) {
      localStorage.removeItem('ct_expert_active_session_id');
      return;
    }

    // Mark as active session
    localStorage.setItem('ct_expert_active_session_id', sessionId);

    setSessions(prev => {
      const existingIdx = prev.findIndex(s => s.id === sessionId);
      const previewMsg = messages.find(m => m.role === 'user')?.content || 'Nueva conversación';
      const updatedSession: ChatSession = {
        id: sessionId,
        date: new Date().toISOString(),
        preview: previewMsg.length > 50 ? previewMsg.substring(0, 50) + '...' : previewMsg,
        mode: messages[0]?.mode || mode,
        messages: messages
      };

      const newSessions = existingIdx >= 0
        ? [...prev.slice(0, existingIdx), updatedSession, ...prev.slice(existingIdx + 1)]
        : [updatedSession, ...prev];

      localStorage.setItem('ct_expert_sessions', JSON.stringify(newSessions));
      return newSessions;
    });
  }, [messages, sessionId, mode]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  useEffect(() => {
    if (!textareaRef.current) return;
    textareaRef.current.style.height = 'auto';
    textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
  }, [input]);

  const openModal = useCallback((pageNumber: number, caption: string) => {
    setModal({ isOpen: true, pageNumber, caption });
  }, []);

  const closeModal = useCallback(() => {
    setModal({ isOpen: false, pageNumber: 1, caption: '' });
  }, []);

  const sendMessage = useCallback(async (text?: string, overrideMode?: Mode) => {
    const messageText = text ?? input.trim();
    const activeMode = overrideMode ?? mode;
    if (!messageText || isLoading) return;

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: messageText,
      mode: activeMode,
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    if (overrideMode) setMode(overrideMode);

    try {
      const customKey = localStorage.getItem('gemini_api_key');
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(customKey ? { 'X-Gemini-Api-Key': customKey } : {})
        },
        body: JSON.stringify({
          message: messageText,
          mode: activeMode,
          history: messages.slice(-10).map(m => ({ role: m.role, content: m.content })),
        }),
      });

      const data = await response.json();
      const content = data.error
        ? `⚠️ Error: ${data.error}\n\n${data.details ?? ''}`
        : data.response;

      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        role: 'assistant',
        content,
        mode: activeMode,
      }]);
    } catch {
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: '⚠️ Error de conexión. Verifica que el servidor esté ejecutándose y que la API Key de Gemini esté configurada.',
        mode: activeMode,
      }]);
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, messages, mode]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }, [sendMessage]);

  const currentConfig = MODE_CONFIG[mode];

  return (
    <div className="app-container">
      {showLanding && (
        <LandingPage onEnter={() => setShowLanding(false)} />
      )}
      
      {!showLanding && (
        <>
          <Sidebar
            mode={mode}
            sidebarOpen={sidebarOpen}
            onModeChange={setMode}
            onSendMessage={sendMessage}
            onToggle={() => setSidebarOpen(o => !o)}
            onNewConversation={() => {
              setMessages([]);
              setSessionId(crypto.randomUUID());
            }}
            onOpenHistory={() => setIsHistoryOpen(true)}
            onOpenSettings={() => setIsSettingsOpen(true)}
          />

          <main className="main-content">
            <div className="header-bar">
              <div>
                <div className="header-title">{currentConfig.title}</div>
                <div className="header-subtitle">{currentConfig.subtitle}</div>
              </div>
              <div className={`mode-badge ${currentConfig.badge}`}>
                {currentConfig.icon}
                {mode === 'ct-expert' ? 'Modo Experto CT' : 'Modo Cerberus Tutor'}
              </div>
            </div>

            <div className="chat-area" role="log" aria-live="polite" aria-label="Conversación">
              {messages.length === 0 ? (
                <WelcomeScreen onSendMessage={sendMessage} />
              ) : (
                messages.map(msg => (
                  <MessageItem key={msg.id} message={msg} onOpenModal={openModal} />
                ))
              )}
              {isLoading && <TypingIndicator />}
              <div ref={chatEndRef} />
            </div>

            <InputBar
              input={input}
              isLoading={isLoading}
              mode={mode}
              textareaRef={textareaRef}
              onChange={setInput}
              onKeyDown={handleKeyDown}
              onSend={sendMessage}
            />
          </main>
        </>
      )}

      <ManualImageModal
        isOpen={modal.isOpen}
        pageNumber={modal.pageNumber}
        caption={modal.caption}
        onClose={closeModal}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onClearHistory={() => {
          localStorage.removeItem('ct_expert_sessions');
          setSessions([]);
          setMessages([]);
          setSessionId(crypto.randomUUID());
        }}
      />

      <HistoryModal
        isOpen={isHistoryOpen}
        sessions={sessions}
        onClose={() => setIsHistoryOpen(false)}
        onSelectSession={(session) => {
          setSessionId(session.id);
          setMode(session.mode);
          setMessages(session.messages);
        }}
        onDeleteSession={(id) => {
          const newSessions = sessions.filter(s => s.id !== id);
          setSessions(newSessions);
          localStorage.setItem('ct_expert_sessions', JSON.stringify(newSessions));
          if (sessionId === id) {
            setMessages([]);
            setSessionId(crypto.randomUUID());
          }
        }}
      />
    </div>
  );
}
