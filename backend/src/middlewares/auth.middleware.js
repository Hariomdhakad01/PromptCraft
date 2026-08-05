import { getUserFromToken } from "../services/auth.service.js"

export async function requireAuth(req, _res, next){
    const token = readToken(req)
    const user = await getUserFromToken(token)

    if (!user) {
        next(Object.assign(new Error("Please login to continue"), { statusCode: 401 }))
        return
    }

    req.user = {
        id: user.id,
        email: user.email,
        name: user.name,
    }
    next()
}

function readToken(req){
    const authHeader = req.headers.authorization || ""

    if (authHeader.startsWith("Bearer ")) {
        return authHeader.slice(7)
    }

    return req.cookies?.newgen_token || ""
}