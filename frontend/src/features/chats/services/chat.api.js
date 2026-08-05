const API_BASE = "/api/chat"
const AUTH_TOKEN_KEY = "newgen-auth-token"

export async function listChats(){
    const response = await fetch(API_BASE, {
        headers: authHeaders(),
        credentials: "include",
    })
    return readJson(response)
}

export async function createChat(title){
    const response = await fetch(API_BASE, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        credentials: "include",
        body: JSON.stringify({ title }),
    })

    return readJson(response)
}

export async function getChat(chatId){
    const response = await fetch(`${API_BASE}/${chatId}`, {
        headers: authHeaders(),
        credentials: "include",
    })
    return readJson(response)
}

export async function deleteChat(chatId){
    const response = await fetch(`${API_BASE}/${chatId}`, {
        method: "DELETE",
        headers: authHeaders(),
        credentials: "include",
    })
    return readJson(response)
}

export async function renameChat(chatId, title){
    const response = await fetch(`${API_BASE}/${chatId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        credentials: "include",
        body: JSON.stringify({ title }),
    })

    return readJson(response)
}

export async function streamMessage({ chatId, message, pdf, onEvent }){
    const formData = new FormData()
    formData.append("message", message || "")

    if (chatId) {
        formData.append("chatId", chatId)
    }

    if (pdf) {
        formData.append("pdf", pdf)
    }

    const url = chatId ? `${API_BASE}/${chatId}/message` : `${API_BASE}/message`
    const response = await fetch(url, {
        method: "POST",
        headers: authHeaders(),
        credentials: "include",
        body: formData,
    })

    if (!response.ok || !response.body) {
        const payload = await safeJson(response)
        throw new Error(payload?.message || "Failed to send message")
    }

    await readSse(response.body, onEvent)
}

function authHeaders(){
    const token = localStorage.getItem(AUTH_TOKEN_KEY)
    return token ? { Authorization: `Bearer ${token}` } : {}
}

async function readJson(response){
    const payload = await safeJson(response)

    if (!response.ok) {
        throw new Error(payload?.message || "Request failed")
    }

    return payload
}

async function safeJson(response){
    try {
        return await response.json()
    } catch {
        return null
    }
}

async function readSse(body, onEvent){
    const reader = body.getReader()
    const decoder = new TextDecoder()
    let buffer = ""

    while (true) {
        const { value, done } = await reader.read()

        if (done) {
            break
        }

        buffer += decoder.decode(value, { stream: true })
        const events = buffer.split("\n\n")
        buffer = events.pop() || ""

        for (const rawEvent of events) {
            const parsed = parseSseEvent(rawEvent)
            if (parsed) {
                onEvent?.(parsed)
            }
        }
    }
}

function parseSseEvent(rawEvent){
    const lines = rawEvent.split("\n")
    const event = lines.find((line) => line.startsWith("event:"))?.replace("event:", "").trim() || "message"
    const data = lines
        .filter((line) => line.startsWith("data:"))
        .map((line) => line.replace("data:", "").trim())
        .join("\n")

    if (!data) {
        return null
    }

    return {
        event,
        data: JSON.parse(data),
    }
}