// server/src/main.ts

import cors from "cors";
import * as dotenv from "dotenv";
import express from "express";
import { OAuth2Client } from "google-auth-library";
import DBManager from "./database/DBManager";
import { DBTree, PersonDetails } from "./database/models/Tree";

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
    metadata = fullTree.metadata;
  } catch (error) {
    console.error("Error fetching tree:", error);
    res.status(500).json({ message: "Failed to fetch tree" });
    return;
  }

  if (
    !metadata.isPublic &&
    metadata.creator !== userId &&
    (!userId || metadata.viewers.indexOf(userId) === -1)
  ) {
    res.status(403).json({ message: "Unauthorized: Tree is private" });
    return;
  }

  res.status(200).json(fullTree);
});

app.get("/api/person/:personId", async (req, res) => {
  const { personId } = req.params;
  const { rootId } = req.query as { rootId: string };

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

  let personData;
  try {
    personData = await DBTree.getPersonDetails(personId, rootId);
  } catch (error) {
    console.error("Error fetching person:", error);
    res.status(500).json({ message: "Failed to fetch person" });
    return;
  }

  if (
    !personData.isPublic &&
    personData.creator !== userId &&
    (!userId || personData.viewers.indexOf(userId) === -1)
  ) {
    res.status(403).json({ message: "Unauthorized: Person is private" });
    return;
  }

  res.status(200).json(personData);
});

import multer from "multer";
import path from "path";
import fs from "fs/promises";
import { v4 as uuidv4 } from "uuid";

// Storage service interface for easy switching between storage solutions
interface StorageService {
  saveFile(file: Express.Multer.File, fileName: string): Promise<string>;
  deleteFile(filePath: string): Promise<void>;
  getPublicUrl(fileName: string): string;
}

// Local storage implementation
class LocalStorageService implements StorageService {
  private uploadDir: string;
  private publicPath: string;

  constructor() {
    // Store files in a public directory inside your project
    this.uploadDir = path.join(__dirname, "../public/uploads");
    this.publicPath = "/uploads"; // URL path to access uploads

    // Create upload directory if it doesn't exist
    fs.mkdir(this.uploadDir, { recursive: true }).catch(console.error);
  }

  async saveFile(file: Express.Multer.File, fileName: string): Promise<string> {
    const filePath = path.join(this.uploadDir, fileName);
    await fs.writeFile(filePath, file.buffer);
    return fileName;
  }

  async deleteFile(fileName: string): Promise<void> {
    try {
      const filePath = path.join(this.uploadDir, path.basename(fileName));
      await fs.unlink(filePath);
    } catch (error) {
      console.error("Error deleting file:", error);
    }
  }

  getPublicUrl(fileName: string): string {
    // Return the URL path to access the file
    return `${this.publicPath}/${fileName}`;
  }
}

// Configure multer for handling file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (_req, file, callback) => {
    const allowedMimes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (allowedMimes.includes(file.mimetype)) {
      callback(null, true);
    } else {
      callback(
        new Error(
          "Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed."
        )
      );
    }
  },
});

// Initialize storage service
const storageService = new LocalStorageService();

// Serve static files from the public directory
app.use("/uploads", express.static(path.join(__dirname, "../public/uploads")));

// Handle image upload endpoint
app.post(
  "/api/upload-image",
  upload.single("image"),
  async (req, res): Promise<void> => {
    if (!req.file) {
      res.status(400).json({ message: "No file uploaded" });
      return;
    }

    // Verify authentication
    const authHeader = req.headers.authorization;
    let userId: string | null = null;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const token = authHeader?.split(" ")[1];

    try {
      const ticket = await authClient.verifyIdToken({
        idToken: token!,
        audience: process.env.AUTH_CLIENT as string,
      });
      const payload = ticket.getPayload();
      userId = payload?.sub || null;
    } catch (error) {
      console.error("Token verification failed:", error);
      res.status(401).json({ message: "Invalid token" });
      return;
    }

    if (!userId) {
      res.status(401).json({ message: "User not authenticated" });
      return;
    }

    try {
      // Get current image URL if updating an existing person
      let oldImageUrl: string | null = null;
      console.log("Request body:", req.body);
      const personData = await DBTree.getPersonDetails(req.body.personId);

      // If the user is not an editor for this person, return 403
      if (
        personData.creator !== userId &&
        personData.editors.indexOf(userId) === -1
      ) {
        res.status(403).json({ message: "Unauthorized: Not an editor" });
        return;
      }

      const person = personData.person;
      oldImageUrl = person.imageUrl || null;

      // Generate unique filename
      if (!req.file) {
        res.status(400).json({ message: "No file uploaded" });
        return;
      }
      const fileExtension = path.extname(req.file.originalname);
      const fileName = `${userId}_${uuidv4()}${fileExtension}`;

      // Save the new file
      await storageService.saveFile(req.file, fileName);
      const publicUrl = storageService.getPublicUrl(fileName);
      person.imageUrl = publicUrl;

      // Update person record if needed
      if (req.body.personId) {
        try {
          console.log("Updating person to:", person);
          await DBTree.updatePerson(person);

          // Delete old image if it exists
          if (oldImageUrl) {
            await storageService.deleteFile(path.basename(oldImageUrl));
          }
        } catch (error) {
          console.error("Error updating person record:", error);
          res.status(500).json({ message: "Failed to update person" });

          // Delete the new image since the update failed
          await storageService.deleteFile(publicUrl);
          return;
        }
      }

      res.status(200).json({
        message: "Upload successful",
        imageUrl: publicUrl,
      });
    } catch (error) {
      console.error("Error in upload process:", error);
      res.status(500).json({ message: "Failed to process upload" });
      return;
    }
  }
);

app.post("/api/remove-image/:personId", async (req, res): Promise<void> => {
  const { personId } = req.params;

  // Verify authentication
  const authHeader = req.headers.authorization;
  let userId: string | null = null;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  const token = authHeader?.split(" ")[1];

  try {
    const ticket = await authClient.verifyIdToken({
      idToken: token!,
      audience: process.env.AUTH_CLIENT as string,
    });
    const payload = ticket.getPayload();
    userId = payload?.sub || null;
  } catch (error) {
    console.error("Token verification failed:", error);
    res.status(401).json({ message: "Invalid token" });
    return;
  }

  if (!userId) {
    res.status(401).json({ message: "User not authenticated" });
    return;
  }

  try {
    // Get current image URL if updating an existing person
    let oldImageUrl: string | null = null;
    const personData = await DBTree.getPersonDetails(personId);

    // If the user is not an editor for this person, return 403
    if (
      personData.creator !== userId &&
      personData.editors.indexOf(userId) === -1
    ) {
      res.status(403).json({ message: "Unauthorized: Not an editor" });
      return;
    }

    const person = personData.person;
    oldImageUrl = person.imageUrl || null;
    person.imageUrl = undefined;

    // Update person record
    try {
      await DBTree.updatePerson(person);

      // Delete old image if it exists
      if (oldImageUrl) {
        await storageService.deleteFile(path.basename(oldImageUrl));
      }
    } catch (error) {
      console.error("Error updating person record:", error);
      res.status(500).json({ message: "Failed to update person" });
      return;
    }

    res.status(200).json({
      message: "Upload successful",
    });
  } catch (error) {
    console.error("Error in removal process:", error);
    res.status(500).json({ message: "Failed to process image removal" });
    return;
  }
});

// Error handling middleware for multer
import { Request, Response, NextFunction } from "express";

app.use(
  (error: Error, _req: Request, res: Response, next: NextFunction): void => {
    if (error instanceof multer.MulterError) {
      if (error.code === "LIMIT_FILE_SIZE") {
        res
          .status(400)
          .json({ message: "File is too large. Maximum size is 5MB." });
      }
      res.status(400).json({ message: error.message });
    }
    return next(error);
  }
);

// Serve static files from the 'public' directory
app.use("/uploads", express.static(path.join(__dirname, "../public/uploads")));

app.put("/api/person/:personId", async (req, res) => {
  const personDetails = req.body as PersonDetails;
  const person = personDetails.person;

  // Verify authentication
  const authHeader = req.headers.authorization;
  let userId: string | null = null;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  const token = authHeader?.split(" ")[1];

  try {
    const ticket = await authClient.verifyIdToken({
      idToken: token!,
      audience: process.env.AUTH_CLIENT as string,
    });
    const payload = ticket.getPayload();
    userId = payload?.sub || null;
  } catch (error) {
    console.error("Token verification failed:", error);
    res.status(401).json({ message: "Invalid token" });
    return;
  }

  if (!userId) {
    res.status(401).json({ message: "User not authenticated" });
    return;
  }

  try {
    const oldPersonData = await DBTree.getPersonDetails(person.id);

    // If the user is not an editor for this person, return 403
    if (
      oldPersonData.creator !== userId &&
      oldPersonData.editors.indexOf(userId) === -1
    ) {
      res.status(403).json({ message: "Unauthorized: Not an editor" });
      return;
    }

    // Update the person record
    await DBTree.updatePerson(person);
  } catch (error) {
    console.error("Error updating person record:", error);
    res.status(500).json({ message: "Failed to update person" });
    return;
  }

  res.status(200).json({ message: "Person updated" });
});

app.put("/api/person/:personId/root", async (req, res) => {
  const { personId } = req.params;
  const { isRoot } = req.body;

  // Verify authentication
  const authHeader = req.headers.authorization;
  let userId: string | null = null;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  const token = authHeader?.split(" ")[1];

  try {
    const ticket = await authClient.verifyIdToken({
      idToken: token!,
      audience: process.env.AUTH_CLIENT as string,
    });
    const payload = ticket.getPayload();
    userId = payload?.sub || null;
  } catch (error) {
    console.error("Token verification failed:", error);
    res.status(401).json({ message: "Invalid token" });
    return;
  }

  if (!userId) {
    res.status(401).json({ message: "User not authenticated" });
    return;
  }

  try {
    const personData = await DBTree.getPersonDetails(personId);

    // If the user is not an editor for this person, return 403
    if (
      personData.creator !== userId &&
      personData.editors.indexOf(userId) === -1
    ) {
      res.status(403).json({ message: "Unauthorized: Not an editor" });
      return;
    }

    // Update the person record
    await DBTree.switchRoot(personId, isRoot);
  } catch (error) {
    console.error("Error updating person record:", error);
    res.status(500).json({ message: "Failed to update person" });
    return;
  }

  res.status(200).json({ message: "Root updated" });
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
