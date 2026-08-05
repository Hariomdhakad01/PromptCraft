# PromptCraft

A resume-ready full-stack AI chat application with PDF upload, Server-Sent Events streaming, recent chat history, and persistent conversation memory.

## Highlights

- ChatGPT-style interface with recent chats and active conversation history.
- SSE token streaming over `fetch`, including multipart PDF uploads.
- PDF text extraction with `pdf-parse` and document-aware prompting.
- Thin Express controllers with business logic moved into services.
- Login/register with user-owned chat history and protected chat APIs.
- MongoDB persistence for chats, messages, uploaded document context, and message counts.
- Docker Compose setup for frontend, backend, and MongoDB.

## Tech Stack

- Frontend: React 19, Vite, Tailwind CSS entrypoint, lucide-react icons.
- Backend: Node.js, Express 5, Mongoose, Multer, pdf-parse.
- AI: Mistral via `@langchain/mistralai`.
- Database: MongoDB.

## Folder Structure

```text
newgenAI/
  backend/
    src/
      config/          database and env config
      controllers/     HTTP-only request/response adapters
      middlewares/     upload and error middleware
      models/          Mongoose chat and message models
      routes/          API route definitions
      services/        AI, chat, and PDF business logic
      utils/           async helpers
  frontend/
    src/
      app/             React shell and styling
      features/chats/  chat API client
```

## Backend API

- `GET /health` - service health.
- `POST /api/auth/register` - create an account.
- `POST /api/auth/login` - login and receive a token.
- `GET /api/auth/me` - load the current logged-in user.
- `POST /api/auth/logout` - logout and clear the auth cookie.
- `GET /api/chat` - list recent chats for the logged-in user.
- `POST /api/chat` - create an empty chat.
- `GET /api/chat/:chatId` - load one chat with messages.
- `PATCH /api/chat/:chatId` - rename a chat.
- `DELETE /api/chat/:chatId` - delete a chat and its messages.
- `POST /api/chat/message` - stream a new chat response with optional PDF.
- `POST /api/chat/:chatId/message` - stream into an existing chat with optional PDF.
- `POST /api/chat/:chatId/pdf` - attach or replace a PDF context.

Streaming events are `ready`, `chat`, `token`, `done`, and `error`.

## Environment

Create `backend/.env` from `backend/.env.example` and set:

```env
PORT=3000
MISTRAL_API_KEY=your_mistral_api_key
MISTRAL_MODEL=mistral-medium-latest
MONGODB_URI=mongodb://127.0.0.1:27017/newgenai
CORS_ORIGIN=http://localhost:5173
JWT_SECRET=change_this_secret_for_local_dev
JWT_EXPIRES_IN=7d
MAX_HISTORY_MESSAGES=16
MAX_PDF_CONTEXT_CHARS=12000
```

## Run Locally

Terminal 1:

```bash
cd backend
npm install
npm run dev
```

Terminal 2:

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`.

## Run With Docker

```bash
docker compose up --build
```

Frontend: `http://localhost:5173`
Backend: `http://localhost:3001`
MongoDB: `mongodb://localhost:27017/newgenai`



