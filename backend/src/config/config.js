import {config} from "dotenv"

config()

if(!process.env.MISTRAL_API_KEY){
    throw new Error("MISTRAL_API_KEY is not defined")
}

export default {
    port: process.env.PORT || 3000,
    mistralApiKey: process.env.MISTRAL_API_KEY,
    mistralModel: process.env.MISTRAL_MODEL || "mistral-medium-latest",
    mongodbUri: process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/newgenai",
    corsOrigin: process.env.CORS_ORIGIN || "http://localhost:5173",
    jwtSecret: process.env.JWT_SECRET || "newgen-dev-secret-change-me",
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
    maxHistoryMessages: Number(process.env.MAX_HISTORY_MESSAGES || 16),
    maxPdfContextChars: Number(process.env.MAX_PDF_CONTEXT_CHARS || 12000),
}
