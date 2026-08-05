import mongoose from "mongoose"
import app from "./src/app.js"
import config from "./src/config/config.js"
import { connectDatabase } from "./src/config/database.js"
import dns from "dns";
dns.setServers(["1.1.1.1", "0.0.0.0"]);

async function bootstrap(){
    await connectDatabase()

    const server = app.listen(config.port, () => {
        console.log(`Server is running on port ${config.port}`)
    })

    const shutdown = async () => {
        console.log("Shutting down server")
        server.close(async () => {
            await mongoose.connection.close()
            process.exit(0)
        })
    }

    process.on("SIGINT", shutdown)
    process.on("SIGTERM", shutdown)
}

bootstrap().catch((error) => {
    console.error("Failed to start server", error)
    process.exit(1)
})
