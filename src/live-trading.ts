import dotenv from "dotenv";
import { InteractiveCLI } from "./cli/InteractiveCLI";

dotenv.config();

async function main() {
    const cli = new InteractiveCLI();

    // Handle graceful shutdown
    process.on("SIGINT", () => {
        console.log("\n🛑 Shutting down gracefully...");
        cli.close();
        process.exit(0);
    });

    process.on("SIGTERM", () => {
        console.log("\n🛑 Shutting down gracefully...");
        cli.close();
        process.exit(0);
    });

    try {
        await cli.start();
    } catch (error) {
        console.error("❌ Application error:", error);
        cli.close();
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}
