import app from "../backend/src/app.js";
import { connectDB } from "../backend/src/config/db.js";

let ready;

export default async function handler(req, res) {
  if (!ready) ready = connectDB();
  await ready;
  return app(req, res);
}
