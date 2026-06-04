import dotenv from "dotenv";
import app from "./app.js";
import { connectDB } from "./config/db.js";
import { warmEmbeddingModel } from "./config/ai.js";

dotenv.config();

const port = process.env.PORT || 5000;

try {
  await connectDB();
  const server = app.listen(port, () => {
    console.log(`AI LMS Tutor API running on port ${port}`);
    warmEmbeddingModel()
      .then(() => console.log("Embedding model ready."))
      .catch((error) => console.warn(`Embedding model warmup skipped: ${error.message}`));
  });

  server.on("error", (error) => {
    if (error.code === "EADDRINUSE") {
      console.error(`Port ${port} is already in use. Stop the other backend first:`);
      console.error(`  PowerShell: Get-NetTCPConnection -LocalPort ${port} | Select OwningProcess`);
      console.error(`  Then:       Stop-Process -Id <PID> -Force`);
      process.exit(1);
    }
    throw error;
  });
} catch (error) {
  console.error("Failed to start API server.");
  console.error(`Reason: ${error.message}`);
  if (error.code === "ECONNREFUSED" && error.hostname?.includes("mongodb.net")) {
    console.error("MongoDB Atlas DNS was refused by Node. Try another network, set DNS to 8.8.8.8/1.1.1.1, or use the standard mongodb:// shard connection string.");
  }
  process.exit(1);
}
