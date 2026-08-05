export function notFoundHandler(req, res){
    res.status(404).json({
        message: `Route not found: ${req.method} ${req.originalUrl}`,
    })
}

export function errorHandler(error, _req, res, _next){
    const status = error.statusCode || error.status || 500

    res.status(status).json({
        message: error.message || "Internal server error",
        details: process.env.NODE_ENV === "production" ? undefined : error.details,
    })
}
