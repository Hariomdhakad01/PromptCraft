const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function validateRegisterPayload(payload = {}){
    const name = sanitizeText(payload.name)
    const email = normalizeEmail(payload.email)
    const password = String(payload.password || "")
    const errors = {}

    if (!name) {
        errors.name = "Name is required"
    } else if (name.length > 80) {
        errors.name = "Name must be 80 characters or less"
    }

    validateEmail(email, errors)
    validatePassword(password, errors)
    throwIfInvalid(errors)

    return { name, email, password }
}

export function validateLoginPayload(payload = {}){
    const email = normalizeEmail(payload.email)
    const password = String(payload.password || "")
    const errors = {}

    validateEmail(email, errors)

    if (!password) {
        errors.password = "Password is required"
    }

    throwIfInvalid(errors)
    return { email, password }
}

function validateEmail(email, errors){
    if (!email) {
        errors.email = "Email is required"
    } else if (!EMAIL_PATTERN.test(email)) {
        errors.email = "Enter a valid email address"
    }
}

function validatePassword(password, errors){
    if (!password) {
        errors.password = "Password is required"
    } else if (password.length < 6) {
        errors.password = "Password must be at least 6 characters"
    } else if (password.length > 128) {
        errors.password = "Password must be 128 characters or less"
    }
}

function normalizeEmail(email){
    return String(email || "").trim().toLowerCase()
}

function sanitizeText(value){
    return String(value || "").replace(/\u0000/g, "").trim()
}

function throwIfInvalid(errors){
    if (Object.keys(errors).length === 0) {
        return
    }

    throw Object.assign(new Error("Validation failed"), {
        statusCode: 400,
        details: errors,
    })
}