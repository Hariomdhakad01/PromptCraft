const API_BASE = `${import.meta.env.VITE_API_URL}/auth`;
export const AUTH_TOKEN_KEY = "newgen-auth-token"

export function getAuthToken(){
    return localStorage.getItem(AUTH_TOKEN_KEY) || ""
}

export function setAuthToken(token){
    if (token) {
        localStorage.setItem(AUTH_TOKEN_KEY, token)
    } else {
        localStorage.removeItem(AUTH_TOKEN_KEY)
    }
}

export async function registerUser(payload){
    const response = await fetch(`${API_BASE}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
    })

    return readJson(response)
}

export async function loginUser(payload){
    const response = await fetch(`${API_BASE}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
    })

    return readJson(response)
}

export async function getCurrentUser(){
    const response = await fetch(`${API_BASE}/me`, {
        headers: authHeaders(),
        credentials: "include",
    })

    return readJson(response)
}

export async function logoutUser(){
    const response = await fetch(`${API_BASE}/logout`, {
        method: "POST",
        headers: authHeaders(),
        credentials: "include",
    })

    return readJson(response)
}

function authHeaders(){
    const token = getAuthToken()
    return token ? { Authorization: `Bearer ${token}` } : {}
}

async function readJson(response){
    const payload = await safeJson(response)

    if (!response.ok) {
        const error = new Error(payload?.message || "Request failed")
        error.details = payload?.details
        throw error
    }

    return payload
}

async function safeJson(response){
    try {
        return await response.json()
    } catch {
        return null
    }
}