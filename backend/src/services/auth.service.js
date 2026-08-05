import crypto from "crypto"
import jwt from "jsonwebtoken"
import config from "../config/config.js"
import User from "../models/user.model.js"
import { validateLoginPayload, validateRegisterPayload } from "../validations/auth.validation.js"

const HASH_ITERATIONS = 120000
const HASH_LENGTH = 64
const HASH_DIGEST = "sha512"

export async function registerUser(payload){
    const { name, email, password } = validateRegisterPayload(payload)
    const existingUser = await User.findOne({ email })

    if (existingUser) {
        throw Object.assign(new Error("Email is already registered"), { statusCode: 409 })
    }

    const { hash, salt } = await hashPassword(password)
    const user = await User.create({
        name,
        email,
        passwordHash: hash,
        passwordSalt: salt,
    })

    return buildAuthResponse(user)
}

export async function loginUser(payload){
    const { email, password } = validateLoginPayload(payload)
    const user = await User.findOne({ email })

    if (!user || !(await verifyPassword(password, user.passwordSalt, user.passwordHash))) {
        throw Object.assign(new Error("Invalid email or password"), { statusCode: 401 })
    }

    return buildAuthResponse(user)
}

export async function getUserFromToken(token){
    if (!token) {
        return null
    }

    try {
        const payload = jwt.verify(token, config.jwtSecret)
        return User.findById(payload.sub)
    } catch {
        return null
    }
}

function buildAuthResponse(user){
    const token = jwt.sign(
        { sub: user.id, email: user.email },
        config.jwtSecret,
        { expiresIn: config.jwtExpiresIn },
    )

    return { token, user }
}

async function hashPassword(password){
    const salt = crypto.randomBytes(16).toString("hex")
    const hash = await pbkdf2(password, salt)
    return { hash, salt }
}

async function verifyPassword(password, salt, expectedHash){
    const hash = await pbkdf2(password, salt)
    const expected = Buffer.from(expectedHash, "hex")
    const actual = Buffer.from(hash, "hex")

    return expected.length === actual.length && crypto.timingSafeEqual(expected, actual)
}

function pbkdf2(password, salt){
    return new Promise((resolve, reject) => {
        crypto.pbkdf2(password, salt, HASH_ITERATIONS, HASH_LENGTH, HASH_DIGEST, (error, derivedKey) => {
            if (error) {
                reject(error)
                return
            }

            resolve(derivedKey.toString("hex"))
        })
    })
}