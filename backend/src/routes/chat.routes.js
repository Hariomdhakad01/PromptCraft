import { Router } from "express"
import {
    createChatController,
    deleteChatController,
    getChatController,
    listChatsController,
    renameChatController,
    streamMessageController,
    uploadPdfController,
} from "../controllers/chat.controller.js"
import { requireAuth } from "../middlewares/auth.middleware.js"
import { uploadPdf } from "../middlewares/upload.middleware.js"
import { asyncHandler } from "../utils/async-handler.js"

const router = Router()

router.use(asyncHandler(requireAuth))

router.get("/", asyncHandler(listChatsController))
router.post("/", asyncHandler(createChatController))
router.get("/:chatId", asyncHandler(getChatController))
router.patch("/:chatId", asyncHandler(renameChatController))
router.delete("/:chatId", asyncHandler(deleteChatController))
router.post("/:chatId/pdf", uploadPdf.single("pdf"), asyncHandler(uploadPdfController))
router.post("/message", uploadPdf.single("pdf"), asyncHandler(streamMessageController))
router.post("/:chatId/message", uploadPdf.single("pdf"), asyncHandler(streamMessageController))

export default router
