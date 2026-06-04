import mongoose from "mongoose";
import dns from "node:dns";

const fallbackDnsServers = ["8.8.8.8", "1.1.1.1"];

export async function connectDB() {
  if (mongoose.connection.readyState >= 1) return mongoose.connection;
  if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is required");

  mongoose.set("strictQuery", true);
  try {
    await mongoose.connect(process.env.MONGODB_URI);
  } catch (error) {
    if (error.code === "ECONNREFUSED" && process.env.MONGODB_URI.startsWith("mongodb+srv://")) {
      dns.setServers(fallbackDnsServers);
      await mongoose.connect(process.env.MONGODB_URI);
    } else {
      throw error;
    }
  }
  return mongoose.connection;
}
