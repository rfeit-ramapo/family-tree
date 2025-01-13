// server/src/main.ts

import cors from "cors";
import * as dotenv from "dotenv";
import express from "express";
import { OAuth2Client } from "google-auth-library";
import DBManager from "./database/DBManager";
import { DBTree } from "./database/models/Tree";

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

app.get("/api/trees", async (req, res) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({
      message: "Unauthorized: Missing or malformed Authorization header",
    });
    return;
  }

  const token = authHeader.split(" ")[1];

  if (!token) {
    res.status(401).json({ message: "Unauthorized: Missing token" });
    return;
  }

  try {
    // Verify the token
    const ticket = await authClient.verifyIdToken({
      idToken: token,
      audience: process.env.AUTH_CLIENT as string,
    });
    const payload = ticket.getPayload();
    const userId = payload!.sub; // User's unique Google ID

    if (!userId) {
      res.status(401).json({ message: "Unauthorized: Invalid token" });
      return;
    }

    // Fetch trees for the user from the database
    const trees = await DBTree.getCreatorTrees(userId);
    res.status(200).json(trees);
    return;
  } catch (error) {
    console.error("Error verifying token or fetching trees:", error);
    res.status(500).json({ message: "Failed to fetch trees" });
    return;
  }
});

app.post("/api/trees/create", async (req, res) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({
      message: "Unauthorized: Missing or malformed Authorization header",
    });
    return;
  }

  const token = authHeader.split(" ")[1];

  if (!token) {
    res.status(401).json({ message: "Unauthorized: Missing token" });
    return;
  }

  try {
    // Verify the token
    const ticket = await authClient.verifyIdToken({
      idToken: token,
      audience: process.env.AUTH_CLIENT as string,
    });
    const payload = ticket.getPayload();
    const userId = payload!.sub; // User's unique Google ID

    if (!userId) {
      res.status(401).json({ message: "Unauthorized: Invalid token" });
      return;
    }

    // Get the tree name from the request body
    const { name } = req.body;

    if (!name || name.trim() === "") {
      res.status(400).json({ message: "Tree name cannot be empty" });
      return;
    }

    // Create the tree in the database
    const newTree = await DBTree.createTree(userId, name);

    // Return the newly created tree
    res.status(201).json(newTree);
    return;
  } catch (error) {
    console.error("Error verifying token or creating tree:", error);
    res.status(500).json({ message: "Failed to create tree" });
    return;
  }
});

app.post("/api/trees/rename", async (req, res) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({
      message: "Unauthorized: Missing or malformed Authorization header",
    });
    return;
  }

  const token = authHeader.split(" ")[1];

  if (!token) {
    res.status(401).json({ message: "Unauthorized: Missing token" });
    return;
  }

  try {
    // Verify the token
    const ticket = await authClient.verifyIdToken({
      idToken: token,
      audience: process.env.AUTH_CLIENT as string,
    });
    const payload = ticket.getPayload();
    const userId = payload!.sub; // User's unique Google ID

    if (!userId) {
      res.status(401).json({ message: "Unauthorized: Invalid token" });
      return;
    }

    // Get the tree name from the request body
    const { name, treeId } = req.body;

    if (!name || name.trim() === "") {
      res.status(400).json({ message: "Tree name cannot be empty" });
      return;
    }

    // Create the tree in the database
    const newTree = await DBTree.renameTree(name, treeId);

    // Return the newly created tree
    res.status(201).json(newTree);
    return;
  } catch (error) {
    console.error("Error verifying token or renaming tree:", error);
    res.status(500).json({ message: "Failed to rename tree" });
    return;
  }
});

app.post("/api/trees/delete", async (req, res) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({
      message: "Unauthorized: Missing or malformed Authorization header",
    });
    return;
  }

  const token = authHeader.split(" ")[1];

  if (!token) {
    res.status(401).json({ message: "Unauthorized: Missing token" });
    return;
  }

  try {
    // Verify the token
    const ticket = await authClient.verifyIdToken({
      idToken: token,
      audience: process.env.AUTH_CLIENT as string,
    });
    const payload = ticket.getPayload();
    const userId = payload!.sub; // User's unique Google ID

    if (!userId) {
      res.status(401).json({ message: "Unauthorized: Invalid token" });
      return;
    }

    // Get the tree name from the request body
    const { treeId } = req.body;

    // Create the tree in the database
    await DBTree.deleteTree(treeId);
    res.status(201).json({ message: "Tree deleted" });
    return;
  } catch (error) {
    console.error("Error verifying token or deleting tree:", error);
    res.status(500).json({ message: "Failed to delete tree" });
    return;
  }
});

app.get("/api/tree/:treeId", async (req, res) => {
  const { treeId } = req.params;
  const authHeader = req.headers.authorization;

  let userId: string | null = null;

  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.split(" ")[1];

    // Verify the token
    try {
      const ticket = await authClient.verifyIdToken({
        idToken: token,
        audience: process.env.AUTH_CLIENT as string,
      });
      const payload = ticket.getPayload();
      userId = payload?.sub || null; // User's unique Google ID
    } catch (error) {
      console.error("Token verification failed:", error);
    }
  }

  let fullTree;
  let metadata;
  try {
    // Fetch the tree from the database
    fullTree = await DBTree.getTree(treeId);
    metadata = fullTree.tree;
  } catch (error) {
    console.error("Error fetching tree:", error);
    res.status(500).json({ message: "Failed to fetch tree" });
    return;
  }

  if (!metadata.isPublic && metadata.creator !== userId) {
    res.status(403).json({ message: "Unauthorized: Tree is private" });
    return;
  }

  res.status(200).json(fullTree);
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
