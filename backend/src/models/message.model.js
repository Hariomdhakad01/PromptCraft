import mongoose from "mongoose"

const messageSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true,
    },
    chatId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Chat",
        required: true,
        index: true,
    },
    role: {
        type: String,
        enum: ["user", "assistant", "system"],
        required: true,
    },
    content: {
        type: String,
        required: true,
        trim: true,
    },
    attachments: [{
        fileName: String,
        mimeType: String,
        size: Number,
        textPreview: String,
    }],
}, {
    timestamps: true,
})

messageSchema.index({ userId: 1, chatId: 1, createdAt: 1 })

messageSchema.set("toJSON", {
    transform(_doc, ret) {
        ret.id = ret._id.toString()
        delete ret._id
        delete ret.__v
        return ret
    },
})

const Message = mongoose.model("Message", messageSchema)

export default Message
