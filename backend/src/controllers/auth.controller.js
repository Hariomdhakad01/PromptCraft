import { getUserFromToken, loginUser, registerUser } from "../services/auth.service.js"

const COOKIE_OPTIONS = {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 7 * 24 * 60 * 60 * 1000,
}

export async function registerController(req, res){
    const auth = await registerUser(req.body)
    setAuthCookie(res, auth.token)
    res.status(201).json(auth)
}

export async function loginController(req, res){
    const auth = await loginUser(req.body)
    setAuthCookie(res, auth.token)
    res.json(auth)
}

export async function meController(req, res){
    const user = await getUserFromToken(readToken(req))

    if (!user) {
        res.status(401).json({ message: "Please login to continue" })
        return
    }

    res.json({ user })
}

export function logoutController(_req, res){
    res.clearCookie("newgen_token", COOKIE_OPTIONS)
    res.json({ ok: true })
}

function setAuthCookie(res, token){
    res.cookie("newgen_token", token, COOKIE_OPTIONS)
}

function readToken(req){
    const authHeader = req.headers.authorization || ""

    if (authHeader.startsWith("Bearer ")) {
        return authHeader.slice(7)
    }

    return req.cookies?.newgen_token || ""
}