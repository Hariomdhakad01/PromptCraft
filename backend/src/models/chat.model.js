import mongoose from "mongoose"

const chatSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true,
    },
    title: {
        type: String,
        trim: true,
        default: "New chat",
    },
    summary: {
        type: String,
        default: "",
    },
    messageCount: {
        type: Number,
        default: 0,
    },
    lastMessageAt: {
        type: Date,
        default: Date.now,
        index: true,
    },
    document: {
        fileName: String,
        mimeType: String,
        size: Number,
        text: String,
        textPreview: String,
        pageCount: Number,
        uploadedAt: Date,
    },
}, {
    timestamps: true,
})

chatSchema.index({ userId: 1, lastMessageAt: -1 })
chatSchema.index({ updatedAt: -1 })

chatSchema.set("toJSON", {
    transform(_doc, ret) {
        ret.id = ret._id.toString()
        delete ret._id
        delete ret.__v

        if (ret.document?.text) {
            delete ret.document.text
        }

        return ret
    },
})

const Chat = mongoose.model("Chat", chatSchema)

export default Chat
