import { PDFParse } from "pdf-parse"

export async function parsePdf(file){
    if (!file) {
        throw Object.assign(new Error("PDF file is required"), { statusCode: 400 })
    }

    const parser = new PDFParse({ data: file.buffer })

    try {
        const parsed = await parser.getText()
        const text = normalizeText(parsed.text)

        if (!text) {
            throw Object.assign(new Error("Could not extract readable text from this PDF"), { statusCode: 422 })
        }

        return {
            fileName: file.originalname,
            mimeType: file.mimetype,
            size: file.size,
            text,
            textPreview: text.slice(0, 700),
            pageCount: parsed.total,
            uploadedAt: new Date(),
        }
    } finally {
        await parser.destroy()
    }
}

function normalizeText(text = ""){
    return text
        .replace(/\r/g, "")
        .replace(/[ \t]+/g, " ")
        .replace(/\n{3,}/g, "\n\n")
        .trim()
}
