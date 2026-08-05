import {
    attachPdf,
    createChat,
    deleteChat,
    getChat,
    listRecentChats,
    renameChat,
    streamChatReply,
} from "../services/chat.service.js"

export async function listChatsController(req, res){
    const chats = await listRecentChats(req.user.id)
    res.json({ chats })
}

export async function createChatController(req, res){
    const chat = await createChat({
        title: req.body.title,
        userId: req.user.id,
    })
    res.status(201).json({ chat })
}

export async function getChatController(req, res){
    const data = await getChat(req.params.chatId, req.user.id)
    res.json(data)
}

export async function renameChatController(req, res){
    const chat = await renameChat(req.params.chatId, req.body.title, req.user.id)
    res.json({ chat })
}

export async function deleteChatController(req, res){
    const result = await deleteChat(req.params.chatId, req.user.id)
    res.json(result)
}

export async function uploadPdfController(req, res){
    const chat = await attachPdf({
        chatId: req.params.chatId,
        file: req.file,
        userId: req.user.id,
    })
    res.status(201).json({ chat })
}

export async function streamMessageController(req, res){
    setupSse(res)
    sendSse(res, "ready", { ok: true })

    try {
        const result = await streamChatReply({
            chatId: req.params.chatId || req.body.chatId,
            message: req.body.message,
            file: req.file,
            userId: req.user.id,
            onChatReady: (chat) => sendSse(res, "chat", { chat }),
            onToken: (token) => sendSse(res, "token", { token }),
        })

        sendSse(res, "done", result)
        res.end()
    } catch (error) {
        sendSse(res, "error", {
            message: error.message || "Failed to stream AI response",
        })
        res.end()
    }
}

function setupSse(res){
    res.setHeader("Content-Type", "text/event-stream")
    res.setHeader("Cache-Control", "no-cache, no-transform")
    res.setHeader("Connection", "keep-alive")
    res.flushHeaders?.()
}

function sendSse(res, event, payload){
    res.write(`event: ${event}\n`)
    res.write(`data: ${JSON.stringify(payload)}\n\n`)
}