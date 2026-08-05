import mongoose from "mongoose"
import config from "../config/config.js"
import Chat from "../models/chat.model.js"
import Message from "../models/message.model.js"
import { streamResponse } from "./ai.service.js"
import { parsePdf } from "./pdf.service.js"

export async function listRecentChats(userId){
    requireUserId(userId)

    return Chat.find({ userId })
        .select("-document.text")
        .sort({ lastMessageAt: -1, updatedAt: -1 })
        .limit(50)
}

export async function getChat(chatId, userId){
    const chat = await findChatOrThrow(chatId, userId)
    const messages = await Message.find({ chatId: chat._id, userId }).sort({ createdAt: 1 })

    return { chat, messages }
}

export async function createChat({ title, userId } = {}){
    requireUserId(userId)

    return Chat.create({
        userId,
        title: sanitizeTitle(title) || "New chat",
        lastMessageAt: new Date(),
    })
}

export async function renameChat(chatId, title, userId){
    const chat = await findChatOrThrow(chatId, userId)
    chat.title = sanitizeTitle(title) || chat.title
    await chat.save()
    return chat
}

export async function deleteChat(chatId, userId){
    const chat = await findChatOrThrow(chatId, userId)
    await Message.deleteMany({ chatId: chat._id, userId })
    await Chat.deleteOne({ _id: chat._id, userId })
    return { id: chat.id }
}

export async function attachPdf({ chatId, file, userId }){
    requireUserId(userId)

    const document = await parsePdf(file)
    let chat

    if (chatId) {
        chat = await findChatOrThrow(chatId, userId)
        chat.document = document
        chat.lastMessageAt = new Date()

        if (chat.title === "New chat") {
            chat.title = titleFromFile(document.fileName)
        }

        await chat.save()
    } else {
        chat = await Chat.create({
            userId,
            title: titleFromFile(document.fileName),
            document,
            lastMessageAt: new Date(),
        })
    }

    return chat
}

export async function streamChatReply({ chatId, message, file, userId, onToken, onChatReady, signal }){
    requireUserId(userId)
    const userText = sanitizeMessage(message)

    if (!userText && !file) {
        throw Object.assign(new Error("Message or PDF is required"), { statusCode: 400 })
    }

    const parsedDocument = file ? await parsePdf(file) : null
    const chat = await resolveChat({ chatId, userId, userText, document: parsedDocument })
    onChatReady?.(chat)
    const history = await loadHistory(chat._id, userId)

    const userMessage = await Message.create({
        userId,
        chatId: chat._id,
        role: "user",
        content: userText || `Analyze the uploaded PDF: ${parsedDocument.fileName}`,
        attachments: parsedDocument ? [toAttachment(parsedDocument)] : [],
    })

    const promptMessages = buildPromptMessages({
        chat,
        history,
        userMessage,
    })

    try {
        const assistantText = await streamResponse(promptMessages, { onToken, signal })
        const finalText = assistantText.trim() || "I could not generate a response. Please try again."

        const assistantMessage = await Message.create({
            userId,
            chatId: chat._id,
            role: "assistant",
            content: finalText,
        })

        await refreshChatStats(chat._id, userId, userMessage.content)

        return {
            chat: await Chat.findOne({ _id: chat._id, userId }).select("-document.text"),
            userMessage,
            assistantMessage,
        }
    } catch (error) {
        await refreshChatStats(chat._id, userId, userMessage.content)
        throw error
    }
}

async function resolveChat({ chatId, userId, userText, document }){
    if (chatId) {
        const chat = await findChatOrThrow(chatId, userId)

        if (document) {
            chat.document = document
            if (chat.title === "New chat" && !userText) {
                chat.title = titleFromFile(document.fileName)
            }
            await chat.save()
        }

        return chat
    }

    return Chat.create({
        userId,
        title: makeChatTitle(userText, document?.fileName),
        document: document || undefined,
        lastMessageAt: new Date(),
    })
}

async function findChatOrThrow(chatId, userId){
    requireUserId(userId)

    if (!mongoose.Types.ObjectId.isValid(chatId)) {
        throw Object.assign(new Error("Invalid chat id"), { statusCode: 400 })
    }

    const chat = await Chat.findOne({ _id: chatId, userId })

    if (!chat) {
        throw Object.assign(new Error("Chat not found"), { statusCode: 404 })
    }

    return chat
}

async function loadHistory(chatId, userId){
    const messages = await Message.find({ chatId, userId })
        .sort({ createdAt: -1 })
        .limit(config.maxHistoryMessages)
        .lean()

    return messages.reverse()
}

function buildPromptMessages({ chat, history, userMessage }){
    const systemPrompt = [
        "You are NewGen AI, a concise, helpful AI assistant inside a ChatGPT-style app.",
        "Remember and use the conversation history when answering follow-up questions.",
        "If a PDF context is provided, ground answers in that document when relevant and say when the document does not contain the answer.",
        "Use clear formatting, practical examples, and avoid inventing facts.",
    ]

    if (chat.document?.text) {
        systemPrompt.push(`PDF context from ${chat.document.fileName}:\n${chat.document.text.slice(0, config.maxPdfContextChars)}`)
    }

    return [
        { role: "system", content: systemPrompt.join("\n\n") },
        ...history.map((item) => ({ role: item.role, content: item.content })),
        { role: "user", content: userMessage.content },
    ]
}

async function refreshChatStats(chatId, userId, fallbackTitleSource){
    const [chat, messageCount] = await Promise.all([
        Chat.findOne({ _id: chatId, userId }),
        Message.countDocuments({ chatId, userId }),
    ])

    if (!chat) {
        return
    }

    if (chat.title === "New chat" && fallbackTitleSource) {
        chat.title = makeChatTitle(fallbackTitleSource)
    }

    chat.messageCount = messageCount
    chat.lastMessageAt = new Date()
    await chat.save()
}

function requireUserId(userId){
    if (!userId) {
        throw Object.assign(new Error("Please login to continue"), { statusCode: 401 })
    }
}

function sanitizeMessage(message){
    return String(message || "").replace(/\u0000/g, "").trim()
}

function sanitizeTitle(title){
    return String(title || "").trim().slice(0, 80)
}

function makeChatTitle(message, fileName){
    if (message) {
        return sanitizeTitle(message.split(/\s+/).slice(0, 8).join(" ")) || "New chat"
    }

    if (fileName) {
        return titleFromFile(fileName)
    }

    return "New chat"
}

function titleFromFile(fileName = "PDF chat"){
    return sanitizeTitle(fileName.replace(/\.pdf$/i, "")) || "PDF chat"
}

function toAttachment(document){
    return {
        fileName: document.fileName,
        mimeType: document.mimeType,
        size: document.size,
        textPreview: document.textPreview,
    }
}