import { ChatMistralAI } from "@langchain/mistralai"
import config from "../config/config.js"

const model = new ChatMistralAI({
    model: config.mistralModel,
    apiKey: config.mistralApiKey,
    temperature: 0.4,
})

export async function generateResponse(messages){
    const response = await model.invoke(messages)
    return normalizeContent(response.content)
}

export async function streamResponse(messages, { onToken, signal } = {}){
    const stream = await model.stream(messages, { signal })
    let fullText = ""

    for await (const chunk of stream) {
        const token = normalizeContent(chunk.content)

        if (!token) {
            continue
        }

        fullText += token
        onToken?.(token)
    }

    return fullText
}

function normalizeContent(content){
    if (typeof content === "string") {
        return content
    }

    if (Array.isArray(content)) {
        return content
            .map((part) => typeof part === "string" ? part : part?.text || "")
            .join("")
    }

    return content?.text || ""
}
