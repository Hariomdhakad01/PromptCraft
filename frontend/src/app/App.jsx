import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  FileText,
  KeyRound,
  Loader2,
  LogOut,
  Menu,
  MessageSquareText,
  Paperclip,
  Plus,
  Send,
  Sparkles,
  Trash2,
  UserPlus,
  X,
} from "lucide-react"
import "./App.css"
import {
  createChat,
  deleteChat,
  getChat,
  listChats,
  streamMessage,
} from "../features/chats/services/chat.api.js"
import {
  getAuthToken,
  getCurrentUser,
  loginUser,
  logoutUser,
  registerUser,
  setAuthToken,
} from "../features/auth/services/auth.api.js"

const ACTIVE_CHAT_KEY = "newgen-active-chat"

function App() {
  const [user, setUser] = useState(null)
  const [authChecked, setAuthChecked] = useState(false)
  const [authMode, setAuthMode] = useState("login")
  const [authForm, setAuthForm] = useState({ name: "", email: "", password: "" })
  const [authLoading, setAuthLoading] = useState(false)
  const [authError, setAuthError] = useState("")
  const [chats, setChats] = useState([])
  const [activeChatId, setActiveChatId] = useState("")
  const [messages, setMessages] = useState([])
  const [message, setMessage] = useState("")
  const [selectedPdf, setSelectedPdf] = useState(null)
  const [loadingChats, setLoadingChats] = useState(false)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [creatingChat, setCreatingChat] = useState(false)
  const [streaming, setStreaming] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [error, setError] = useState("")
  const fileInputRef = useRef(null)
  const messagesRef = useRef(null)
  const messagesEndRef = useRef(null)
  const shouldAutoScrollRef = useRef(true)
  const lastMessageCountRef = useRef(0)

  const activeChatStorageKey = useMemo(
    () => user?.id ? `${ACTIVE_CHAT_KEY}:${user.id}` : ACTIVE_CHAT_KEY,
    [user?.id],
  )

  const activeChat = useMemo(
    () => chats.find((chat) => chat.id === activeChatId),
    [activeChatId, chats],
  )

  const upsertChat = useCallback(function upsertChat(chat) {
    if (!chat?.id) return

    setChats((current) => {
      const withoutChat = current.filter((item) => item.id !== chat.id)
      return [chat, ...withoutChat].sort((a, b) => new Date(b.lastMessageAt) - new Date(a.lastMessageAt))
    })
  }, [])

  const loadChat = useCallback(async function loadChat(chatId) {
    try {
      setLoadingMessages(true)
      shouldAutoScrollRef.current = true
      lastMessageCountRef.current = 0
      const data = await getChat(chatId)
      setMessages(data.messages || [])
      upsertChat(data.chat)
    } catch (err) {
      setError(err.message)
      setMessages([])
      setActiveChatId("")
    } finally {
      setLoadingMessages(false)
      setSidebarOpen(false)
    }
  }, [upsertChat])

  const loadChats = useCallback(async function loadChats() {
    if (!user) {
      return
    }

    try {
      setLoadingChats(true)
      const data = await listChats()
      setChats(data.chats || [])

      if (!activeChatId && data.chats?.[0]?.id) {
        setActiveChatId(data.chats[0].id)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoadingChats(false)
    }
  }, [activeChatId, user])

  const scrollMessagesToBottom = useCallback(function scrollMessagesToBottom(behavior = "smooth") {
    messagesEndRef.current?.scrollIntoView({ behavior, block: "end" })
  }, [])

  useEffect(() => {
    const task = window.setTimeout(async () => {
      if (!getAuthToken()) {
        setAuthChecked(true)
        return
      }

      try {
        const data = await getCurrentUser()
        setUser(data.user)
        setActiveChatId(localStorage.getItem(`${ACTIVE_CHAT_KEY}:${data.user.id}`) || "")
      } catch {
        setAuthToken("")
      } finally {
        setAuthChecked(true)
      }
    }, 0)

    return () => window.clearTimeout(task)
  }, [])

  useEffect(() => {
    if (!user) {
      return undefined
    }

    const task = window.setTimeout(() => {
      loadChats()
    }, 0)

    return () => window.clearTimeout(task)
  }, [loadChats, user])

  useEffect(() => {
    if (!user) {
      return undefined
    }

    if (!activeChatId) {
      localStorage.removeItem(activeChatStorageKey)
      return undefined
    }

    localStorage.setItem(activeChatStorageKey, activeChatId)
    const task = window.setTimeout(() => {
      loadChat(activeChatId)
    }, 0)

    return () => window.clearTimeout(task)
  }, [activeChatId, activeChatStorageKey, loadChat, user])

  useEffect(() => {
    const previousMessageCount = lastMessageCountRef.current
    const hasNewMessage = messages.length > previousMessageCount
    lastMessageCountRef.current = messages.length

    if (loadingMessages) {
      return
    }

    if (hasNewMessage || shouldAutoScrollRef.current) {
      scrollMessagesToBottom(hasNewMessage ? "smooth" : "auto")
    }
  }, [messages, loadingMessages, scrollMessagesToBottom])

  async function startNewChat() {
    if (!user || creatingChat) {
      return
    }

    try {
      setCreatingChat(true)
      setError("")
      setMessage("")
      setMessages([])
      setSelectedPdf(null)
      shouldAutoScrollRef.current = true
      lastMessageCountRef.current = 0

      const data = await createChat("New chat")
      upsertChat(data.chat)
      setActiveChatId(data.chat.id)
      setSidebarOpen(false)
    } catch (err) {
      setError(err.message)
    } finally {
      setCreatingChat(false)
    }
  }

  async function removeChat(chatId) {
    try {
      await deleteChat(chatId)
      setChats((current) => current.filter((chat) => chat.id !== chatId))

      if (activeChatId === chatId) {
        setActiveChatId("")
        setMessages([])
      }
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleSend(event) {
    event?.preventDefault()

    const trimmed = message.trim()
    if ((!trimmed && !selectedPdf) || streaming || !user) {
      return
    }

    const userTempId = `user-${Date.now()}`
    const assistantTempId = `assistant-${Date.now()}`
    const attachment = selectedPdf
      ? [{ fileName: selectedPdf.name, mimeType: selectedPdf.type, size: selectedPdf.size }]
      : []

    shouldAutoScrollRef.current = true
    setMessages((current) => [
      ...current,
      {
        id: userTempId,
        role: "user",
        content: trimmed || `Analyze the uploaded PDF: ${selectedPdf.name}`,
        attachments: attachment,
        createdAt: new Date().toISOString(),
      },
      {
        id: assistantTempId,
        role: "assistant",
        content: "",
        createdAt: new Date().toISOString(),
      },
    ])

    setMessage("")
    setError("")
    setStreaming(true)

    const pdfToSend = selectedPdf
    setSelectedPdf(null)

    try {
      await streamMessage({
        chatId: activeChatId,
        message: trimmed,
        pdf: pdfToSend,
        onEvent: ({ event: streamEvent, data }) => {
          if (streamEvent === "chat") {
            upsertChat(data.chat)
            setActiveChatId(data.chat.id)
          }

          if (streamEvent === "token") {
            setMessages((current) => current.map((item) => (
              item.id === assistantTempId
                ? { ...item, content: `${item.content}${data.token}` }
                : item
            )))
          }

          if (streamEvent === "done") {
            setMessages((current) => current.map((item) => {
              if (item.id === userTempId) return data.userMessage
              if (item.id === assistantTempId) return data.assistantMessage
              return item
            }))
            upsertChat(data.chat)
            loadChats()
          }

          if (streamEvent === "error") {
            setError(data.message)
          }
        },
      })
    } catch (err) {
      setError(err.message)
      setMessages((current) => current.filter((item) => item.id !== assistantTempId))
    } finally {
      setStreaming(false)
    }
  }

  async function handleAuthSubmit(event) {
    event.preventDefault()

    try {
      setAuthLoading(true)
      setAuthError("")
      const authenticate = authMode === "register" ? registerUser : loginUser
      const data = await authenticate(authForm)

      setAuthToken(data.token)
      setUser(data.user)
      setChats([])
      setMessages([])
      setActiveChatId(localStorage.getItem(`${ACTIVE_CHAT_KEY}:${data.user.id}`) || "")
      setAuthForm({ name: "", email: "", password: "" })
    } catch (err) {
      const firstDetail = err.details && Object.values(err.details)[0]
      setAuthError(firstDetail || err.message)
    } finally {
      setAuthLoading(false)
    }
  }

  async function handleLogout() {
    try {
      await logoutUser()
    } catch {
      // Token is cleared locally even if the server session was already gone.
    }

    setAuthToken("")
    setUser(null)
    setChats([])
    setActiveChatId("")
    setMessages([])
    setMessage("")
    setSelectedPdf(null)
    setError("")
    setSidebarOpen(false)
  }

  function handleAuthFieldChange(event) {
    const { name, value } = event.target
    setAuthForm((current) => ({ ...current, [name]: value }))
  }

  function switchAuthMode(mode) {
    setAuthMode(mode)
    setAuthError("")
  }

  function handleFileChange(event) {
    const file = event.target.files?.[0]

    if (!file) {
      return
    }

    if (file.type !== "application/pdf") {
      setError("Please choose a PDF file")
      event.target.value = ""
      return
    }

    setSelectedPdf(file)
    setError("")
  }

  function handleKeyDown(event) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault()
      handleSend(event)
    }
  }

  function handleMessagesScroll() {
    const container = messagesRef.current

    if (!container) {
      shouldAutoScrollRef.current = true
      return
    }

    const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight
    shouldAutoScrollRef.current = distanceFromBottom < 140
  }

  if (!authChecked) {
    return (
      <main className="auth-shell">
        <div className="auth-card auth-loading">
          <Loader2 className="spin" size={26} />
        </div>
      </main>
    )
  }

  if (!user) {
    return (
      <main className="auth-shell">
        <section className="auth-card">
          <div className="auth-brand">
            <Sparkles size={24} />
            <span>PromptCraft</span>
          </div>
          <div className="auth-tabs">
            <button className={authMode === "login" ? "active" : ""} onClick={() => switchAuthMode("login")} type="button">
              <KeyRound size={16} />
              <span>Login</span>
            </button>
            <button className={authMode === "register" ? "active" : ""} onClick={() => switchAuthMode("register")} type="button">
              <UserPlus size={16} />
              <span>Register</span>
            </button>
          </div>
          <form className="auth-form" onSubmit={handleAuthSubmit}>
            {authMode === "register" && (
              <label>
                <span>Name</span>
                <input autoComplete="name" name="name" onChange={handleAuthFieldChange} required type="text" value={authForm.name} />
              </label>
            )}
            <label>
              <span>Email</span>
              <input autoComplete="email" name="email" onChange={handleAuthFieldChange} required type="email" value={authForm.email} />
            </label>
            <label>
              <span>Password</span>
              <input autoComplete={authMode === "register" ? "new-password" : "current-password"} minLength={6} name="password" onChange={handleAuthFieldChange} required type="password" value={authForm.password} />
            </label>
            {authError && <div className="error-banner auth-error">{authError}</div>}
            <button className="auth-submit" disabled={authLoading} type="submit">
              {authLoading ? <Loader2 className="spin" size={18} /> : authMode === "register" ? "Create account" : "Login"}
            </button>
          </form>
        </section>
      </main>
    )
  }

  return (
    <main className="app-shell">
      <aside className={`sidebar ${sidebarOpen ? "sidebar-open" : ""}`}>
        <div className="sidebar-header">
          <button className="brand" onClick={startNewChat} type="button" title="NewGen AI">
            <Sparkles size={20} />
            <span>PromptCraft</span>
          </button>
          <button className="icon-button mobile-only" onClick={() => setSidebarOpen(false)} type="button" title="Close sidebar">
            <X size={18} />
          </button>
        </div>

        <button className="new-chat-button" disabled={creatingChat} onClick={startNewChat} type="button">
          {creatingChat ? <Loader2 className="spin" size={18} /> : <Plus size={18} />}
          <span>New chat</span>
        </button>

        <div className="sidebar-section-title">Recent chats</div>
        <div className="chat-list">
          {loadingChats ? (
            <div className="muted-row"><Loader2 className="spin" size={16} /> Loading</div>
          ) : chats.length === 0 ? (
            <div className="empty-sidebar">No chats yet</div>
          ) : chats.map((chat) => (
            <div className={`chat-list-item ${chat.id === activeChatId ? "active" : ""}`} key={chat.id}>
              <button onClick={() => setActiveChatId(chat.id)} type="button" title={chat.title}>
                <MessageSquareText size={17} />
                <span>{chat.title}</span>
              </button>
              <button className="delete-chat" onClick={() => removeChat(chat.id)} type="button" title="Delete chat">
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>
      </aside>

      <section className="chat-panel">
        <header className="topbar">
          <button className="icon-button mobile-only" onClick={() => setSidebarOpen(true)} type="button" title="Open sidebar">
            <Menu size={20} />
          </button>
          <div className="topbar-title">
            <h1>{activeChat?.title || "New chat"}</h1>
            <p>{activeChat?.document?.fileName || "Ask anything or attach a PDF"}</p>
          </div>
          <div className="topbar-actions">
            <span className="user-pill">{user.name}</span>
            <button className="icon-button" onClick={handleLogout} type="button" title="Logout">
              <LogOut size={18} />
            </button>
          </div>
        </header>

        <div className="messages" onScroll={handleMessagesScroll} ref={messagesRef}>
          {loadingMessages ? (
            <div className="center-state"><Loader2 className="spin" size={24} /></div>
          ) : messages.length === 0 ? (
            <div className="welcome-state">
              <Sparkles size={34} />
              <h2>What are we working on?</h2>
              <p>Start a chat, upload a PDF, or ask a follow-up from your saved history.</p>
            </div>
          ) : messages.map((item) => (
            <article className={`message ${item.role}`} key={item.id}>
              <div className="avatar">{item.role === "user" ? "U" : "AI"}</div>
              <div className="message-body">
                {item.attachments?.length > 0 && (
                  <div className="attachment-row">
                    {item.attachments.map((attachment) => (
                      <span className="attachment-chip" key={`${item.id}-${attachment.fileName}`}>
                        <FileText size={14} />
                        {attachment.fileName}
                      </span>
                    ))}
                  </div>
                )}
                <p>{item.content || (streaming && item.role === "assistant" ? "Thinking..." : "")}</p>
              </div>
            </article>
          ))}
          <div ref={messagesEndRef} />
        </div>

        <form className="composer" onSubmit={handleSend}>
          {error && <div className="error-banner">{error}</div>}
          {selectedPdf && (
            <div className="selected-file">
              <FileText size={16} />
              <span>{selectedPdf.name}</span>
              <button onClick={() => setSelectedPdf(null)} type="button" title="Remove PDF">
                <X size={15} />
              </button>
            </div>
          )}
          <div className="composer-row">
            <button className="icon-button" onClick={() => fileInputRef.current?.click()} type="button" title="Attach PDF">
              <Paperclip size={20} />
            </button>
            <textarea
              onChange={(event) => setMessage(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Message NewGen AI"
              rows={1}
              value={message}
            />
            <button className="send-button" disabled={streaming || (!message.trim() && !selectedPdf)} type="submit" title="Send">
              {streaming ? <Loader2 className="spin" size={19} /> : <Send size={19} />}
            </button>
            <input accept="application/pdf" hidden onChange={handleFileChange} ref={fileInputRef} type="file" />
          </div>
        </form>
      </section>
    </main>
  )
}

export default App