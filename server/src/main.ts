// server/src/main.ts

import cors from "cors";
import * as dotenv from "dotenv";
import express from "express";
import { OAuth2Client } from "google-auth-library";
import DBManager from "./database/DBManager";

dotenv.config();
const app = express();
const authClient = new OAuth2Client(process.env.AUTH_CLIENT || "my_client_id");

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
const PORT = process.env.PORT || 3001;

app.get("/api", (_req, res) => {
  res.status(200).json({ message: "Hello from the server!" });
});

app.post("/api/google-login", async (req, res) => {
  const { token } = req.body;

  try {
    const ticket = await authClient.verifyIdToken({
      idToken: token,
      audience: process.env.AUTH_CLIENT as string,
    });
    const payload = ticket.getPayload();
    console.log(payload);
    const userId = payload?.sub;
    const email = payload?.email;
    const picture = payload?.picture;

    // You can now authenticate the user in your database
    res
      .status(200)
      .json({ message: "User authenticated", userId, email, picture });
  } catch {
    res.status(401).json({ message: "Invalid Google token" });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

async function logDBConnection() {
  console.log(
    await DBManager.driver.getServerInfo({ database: DBManager.db_name })
  );
}

logDBConnection();
