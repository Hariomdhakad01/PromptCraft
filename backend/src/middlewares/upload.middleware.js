import multer from "multer"

const storage = multer.memoryStorage()

export const uploadPdf = multer({
    storage,
    limits: {
        fileSize: 8 * 1024 * 1024,
        files: 1,
    },
    fileFilter(_req, file, cb) {
        if (file.mimetype !== "application/pdf") {
            cb(Object.assign(new Error("Only PDF files are supported"), { statusCode: 400 }))
            return
        }

        cb(null, true)
    },
})
