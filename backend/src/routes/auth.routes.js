import { Router } from "express"
import {
    loginController,
    logoutController,
    meController,
    registerController,
} from "../controllers/auth.controller.js"
import { asyncHandler } from "../utils/async-handler.js"

const router = Router()

router.get("/me", asyncHandler(meController))
router.post("/register", asyncHandler(registerController))
router.post("/login", asyncHandler(loginController))
router.post("/logout", logoutController)

export default router