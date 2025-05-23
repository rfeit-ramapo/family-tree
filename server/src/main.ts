import cors from "cors";
import * as dotenv from "dotenv";
import express from "express";
import { OAuth2Client } from "google-auth-library";
import DBManager from "./database/DBManager";
import { DBTree, PersonDetails, TreeMember } from "./database/models/Tree";
import multer from "multer";
import path from "path";
import fs from "fs/promises";
import { v4 as uuidv4 } from "uuid";

// Set up environment and initialize the app
dotenv.config();
const app = express();
const authClient = new OAuth2Client(process.env.AUTH_CLIENT || "my_client_id");
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
const PORT = process.env.PORT || 3001;

// Google OAuth login endpoint
app.post("/api/google-login", async (req, res) => {
  const { token } = req.body;

  try {
    const ticket = await authClient.verifyIdToken({
      idToken: token,
      audience: process.env.AUTH_CLIENT as string,
    });
    const payload = ticket.getPayload();
    const userId = payload?.sub;
    const email = payload?.email;
    const picture = payload?.picture;

    res
      .status(200)
      .json({ message: "User authenticated", userId, email, picture });
  } catch {
    res.status(401).json({ message: "Invalid Google token" });
  }
});

// Get all trees for the authenticated user
app.get("/api/trees", async (req, res) => {
  const authResult = await authorizeRequestWithUser(req, res);
  req = authResult.req;
  res = authResult.res;
  const userId = authResult.userId;

  if (!userId) return;
  try {
    // Fetch trees for the user from the database
    const trees = await DBTree.getCreatorTrees(userId);
    res.status(200).json(trees);
    return;
  } catch (error) {
    console.error("Error fetching trees from database:", error);
    res.status(500).json({ message: "Failed to fetch trees" });
    return;
  }
});

// Create a new tree for the authenticated user
app.post("/api/trees/create", async (req, res) => {
  const authResult = await authorizeRequestWithUser(req, res);
  req = authResult.req;
  res = authResult.res;
  const userId = authResult.userId;

  if (!userId) return;
  try {
    // Get the tree name from the request body
    const { name } = req.body;

    // Validate the tree name
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
    console.error("Error creating tree:", error);
    res.status(500).json({ message: "Failed to create tree" });
    return;
  }
});

// Rename a tree for the authenticated user
app.post("/api/trees/rename", async (req, res) => {
  const authResult = await authorizeRequestWithUser(req, res);
  req = authResult.req;
  res = authResult.res;
  const userId = authResult.userId;

  if (!userId) return;
  try {
    // Get the tree name from the request body
    const { name, treeId } = req.body;

    // Validate the tree name
    if (!name || name.trim() === "") {
      res.status(400).json({ message: "Tree name cannot be empty" });
      return;
    }

    // Rename the tree in the database
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

// Delete a tree for the authenticated user
app.post("/api/trees/delete", async (req, res) => {
  const authResult = await authorizeRequestWithUser(req, res);
  req = authResult.req;
  res = authResult.res;
  const userId = authResult.userId;

  if (!userId) return;
  try {
    // Get the tree id from the request body
    const { treeId } = req.body;

    // Delete the tree from the database
    await DBTree.deleteTree(treeId);
    res.status(201).json({ message: "Tree deleted" });
    return;
  } catch (error) {
    console.error("Error verifying token or deleting tree:", error);
    res.status(500).json({ message: "Failed to delete tree" });
    return;
  }
});

// Fetch a tree by id if the user is authorized to view it
app.get("/api/tree/:treeId", async (req, res) => {
  const authResult = await authorizeOptionalRequest(req, res);
  req = authResult.req as Request<{ treeId: string }>;
  res = authResult.res;
  const userId = authResult.userId;

  const { treeId } = req.params;
  const { focalId } = req.query as { focalId: string | undefined };
  let fullTree;
  let metadata;

  try {
    // Fetch the tree from the database
    fullTree = await DBTree.getTree(treeId, focalId);
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

// Fetch a person by id if the user is authorized to view it
app.get("/api/person/:personId", async (req, res) => {
  const authResult = await authorizeOptionalRequest(req, res);
  req = authResult.req as Request<{ personId: string }>;
  res = authResult.res;
  const userId = authResult.userId;

  const { personId } = req.params;
  const { rootId } = req.query as { rootId: string };
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

/**
 * Interface for a storage service that can save and delete files.
 */
interface StorageService {
  // Function to save a file to storage
  saveFile(file: Express.Multer.File, fileName: string): Promise<string>;
  // Function to delete a file from storage
  deleteFile(filePath: string): Promise<void>;
  // Function to get the public URL of a file
  getPublicUrl(fileName: string): string;
}

/**
 * Implementation of a storage service that saves files to the local filesystem.
 * Can be replaced with a cloud storage system later.
 */
class LocalStorageService implements StorageService {
  // Directory to store uploads
  uploadDir: string;
  // URL path to access uploads
  publicPath: string;

  constructor() {
    // Store files in a public directory inside your project
    this.uploadDir = path.join(__dirname, "../public/uploads");
    this.publicPath = "/uploads"; // URL path to access uploads

    // Create upload directory if it doesn't exist
    fs.mkdir(this.uploadDir, { recursive: true }).catch(console.error);
  }

  /**
   * NAME: saveFile
   *
   * SYNOPSIS: async saveFile(file: Express.Multer.File, fileName: string): Promise<string>
   *    file  --> the file to save
   *    fileName  --> the name to save the file as
   *
   * DESCRIPTION
   * Function to save a file to the local filesystem.
   *
   * RETURNS
   * A promise that resolves to the filename the file was saved as.
   */
  async saveFile(file: Express.Multer.File, fileName: string): Promise<string> {
    const filePath = path.join(this.uploadDir, fileName);
    await fs.writeFile(filePath, file.buffer);
    return fileName;
  }

  /**
   * NAME: deleteFile
   *
   * SYNOPSIS: async deleteFile(fileName: string): Promise<void>
   *    fileName  --> the name of the file to delete
   *
   * DESCRIPTION
   * Function to delete a file from the local filesystem.
   *
   * RETURNS
   * A promise that resolves when the file is deleted.
   */
  async deleteFile(fileName: string): Promise<void> {
    try {
      const filePath = path.join(this.uploadDir, path.basename(fileName));
      await fs.unlink(filePath);
    } catch (error) {
      console.error("Error deleting file:", error);
    }
  }

  /**
   * NAME: getPublicUrl
   *
   * SYNOPSIS: getPublicUrl(fileName: string): string
   *    fileName  --> the name of the file to get the URL for
   *
   * DESCRIPTION
   * Function to get the public URL of a file.
   *
   * RETURNS
   * The URL path to access the file.
   */
  getPublicUrl(fileName: string): string {
    // Return the URL path to access the file
    return `${this.publicPath}/${fileName}`;
  }
}

// Configure multer for handling file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    // Limit the fileSize to 5MB
    fileSize: 5 * 1024 * 1024,
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
      console.error("No file uploaded");
      res.status(400).json({ message: "No file uploaded" });
      return;
    }

    // Verify authentication
    const authResult = await authorizeRequestWithUser(req, res);
    req = authResult.req;
    res = authResult.res;
    const userId = authResult.userId;
    if (!userId) return;

    try {
      // Get current image URL if updating an existing person
      let oldImageUrl: string | null = null;
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

      const fileExtension = path.extname(req.file!.originalname);
      const fileName = `${userId}_${uuidv4()}${fileExtension}`;

      // Save the new file
      await storageService.saveFile(req.file!, fileName);
      const publicUrl = storageService.getPublicUrl(fileName);
      person.imageUrl = publicUrl;

      // Update person record
      try {
        await DBTree.updatePerson(person);
      } catch (error) {
        console.error("Error updating person record:", error);
        res.status(500).json({ message: "Failed to update person" });

        // Delete the new image since the update failed
        await storageService.deleteFile(publicUrl);
        return;
      }

      // Delete old image if it exists
      if (oldImageUrl) {
        await storageService.deleteFile(path.basename(oldImageUrl));
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

// Remove an image from a person record
app.post("/api/remove-image/:personId", async (req, res): Promise<void> => {
  // Verify authentication
  const authResult = await authorizeRequestWithUser(req, res);
  req = authResult.req as Request<{ personId: string }>;
  res = authResult.res;
  const userId = authResult.userId;
  if (!userId) return;

  const { personId } = req.params;

  try {
    // Get the person information
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
    const currentImageUrl = person.imageUrl || null;
    person.imageUrl = undefined;

    // Update person record
    try {
      await DBTree.updatePerson(person);
    } catch (error) {
      console.error("Error updating person record:", error);
      res.status(500).json({ message: "Failed to update person" });
      return;
    }

    // Delete old image if it exists in storage
    if (currentImageUrl && currentImageUrl.startsWith("/uploads/")) {
      await storageService.deleteFile(path.basename(currentImageUrl));
    }

    res.status(200).json({
      message: "Image removal successful",
    });
  } catch (error) {
    console.error("Error in removal process:", error);
    res.status(500).json({ message: "Failed to process image removal" });
    return;
  }
});

// Error handling middleware for multer
import { Request, Response, NextFunction } from "express";
import {
  authorizeOptionalRequest,
  authorizeRequestWithUser,
} from "./authorization";

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

// Update a person record
app.put("/api/person/:personId", async (req, res) => {
  // Verify authentication
  const authResult = await authorizeRequestWithUser(req, res);
  req = authResult.req as Request<{ personId: string }>;
  res = authResult.res;
  const userId = authResult.userId;
  if (!userId) return;

  const personDetails = req.body as PersonDetails;
  const person = personDetails.person;

  // Turn the date strings into Date objects
  person.dateOfBirth = person.dateOfBirth
    ? new Date(person.dateOfBirth)
    : undefined;
  person.dateOfDeath = person.dateOfDeath
    ? new Date(person.dateOfDeath)
    : undefined;

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

// Update a person's root status
app.put("/api/person/:personId/root", async (req, res) => {
  // Verify authentication
  const authResult = await authorizeRequestWithUser(req, res);
  req = authResult.req as Request<{ personId: string }>;
  res = authResult.res;
  const userId = authResult.userId;
  if (!userId) return;

  const { personId } = req.params;
  const { isRoot } = req.body;

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

// Create a new person record
app.post("/api/person", async (req, res) => {
  // Verify authentication
  const authResult = await authorizeRequestWithUser(req, res);
  req = authResult.req;
  res = authResult.res;
  const userId = authResult.userId;
  if (!userId) return;

  const treeId = req.body.treeId as string;

  // Get the tree metadata
  let treeData;
  try {
    treeData = await DBTree.getTree(treeId);
  } catch (error) {
    console.error("Error fetching tree metadata:", error);
    res.status(500).json({ message: "Failed to create person" });
    return;
  }
  if (
    treeData.metadata.creator !== userId &&
    treeData.metadata.editors.indexOf(userId) === -1
  ) {
    res.status(403).json({ message: "Unauthorized: Not an editor" });
    return;
  }

  let createdPerson: TreeMember;
  try {
    // Create the person record
    createdPerson = await DBTree.createPerson(treeId, !treeData.root);
  } catch (error) {
    console.error("Error creating person record:", error);
    res.status(500).json({ message: "Failed to create person" });
    return;
  }

  res.status(201).json({ message: "Person created", person: createdPerson });
});

// Get suggestions for a particular person and relationship type
app.get("/api/suggestions/:originId/:type", async (req, res) => {
  const authResult = await authorizeRequestWithUser(req, res);
  req = authResult.req as Request<{
    originId: string;
    type: string;
  }>;
  res = authResult.res;
  const userId = authResult.userId;

  if (!userId) return;

  const { originId, type } = req.params;
  if (type !== "children" && type !== "partners" && type !== "parents") {
    res.status(400).json({ message: "Invalid suggestion type" });
    return;
  }

  try {
    // Fetch trees for the user from the database
    const suggestions = await DBTree.getSuggestedRelations(
      originId,
      type as "children" | "partners" | "parents"
    );
    res.status(200).json(suggestions);
    return;
  } catch (error) {
    console.error("Error fetching trees from database:", error);
    res.status(500).json({ message: "Failed to fetch trees" });
    return;
  }
});

// Get people for a particular tree
app.get("/api/tree/get-people/:treeId", async (req, res) => {
  const authResult = await authorizeOptionalRequest(req, res);
  req = authResult.req as Request<{ treeId: string }>;
  res = authResult.res;
  const userId = authResult.userId;

  // Verify that the user is authorized to view the tree
  const { treeId } = req.params;
  let fullTree, metadata;
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

  // Process the request
  try {
    const people = await DBTree.getPeople(treeId);
    res.status(200).json(people);
    return;
  } catch (error) {
    console.error("Error fetching people from database:", error);
    res.status(500).json({ message: "Failed to fetch people" });
    return;
  }
});

// Connect two people in the tree
app.post("/api/connect/:originId/:targetId/:type", async (req, res) => {
  const authResult = await authorizeRequestWithUser(req, res);
  req = authResult.req as Request<{
    originId: string;
    targetId: string;
    type: string;
  }>;
  res = authResult.res;
  const userId = authResult.userId;

  if (!userId) return;

  let { originId, targetId, type } = req.params;
  if (type === "child") {
    type = "PARENT_OF";
  } else if (type === "parent") {
    type = "PARENT_OF";
    [originId, targetId] = [targetId, originId];
  } else if (type === "partner") {
    type = "PARTNER_OF";
  } else {
    res.status(400).json({ message: "Invalid suggestion type" });
    return;
  }

  try {
    // Fetch trees for the user from the database
    await DBTree.addRelation(
      originId,
      targetId,
      type as "PARENT_OF" | "PARTNER_OF"
    );
    res.status(200).json({ message: "Connection created" });
    return;
  } catch (error) {
    console.error("Error fetching trees from database:", error);
    res.status(500).json({ message: "Failed to fetch trees" });
    return;
  }
});

// Toggle the given partner as being the current partner
app.post(
  "/api/connection/toggle-current-partner/:personId/:partnerId",
  async (req, res) => {
    const authResult = await authorizeRequestWithUser(req, res);
    req = authResult.req as Request<{
      personId: string;
      partnerId: string;
    }>;
    res = authResult.res;
    const userId = authResult.userId;

    if (!userId) return;
    const { personId, partnerId } = req.params;

    try {
      await DBTree.toggleCurrentPartner(personId, partnerId);
      res.status(200).json({ message: "Current partner toggled" });
      return;
    } catch (error) {
      console.error("Error toggling current partner:", error);
      res.status(500).json({ message: "Failed to toggle current partner" });
      return;
    }
  }
);

// Toggle the visibility of a tree
app.post("/api/tree/toggle-public/:treeId", async (req, res) => {
  const authResult = await authorizeRequestWithUser(req, res);
  req = authResult.req as Request<{ treeId: string }>;
  res = authResult.res;
  const userId = authResult.userId;

  if (!userId) return;
  const { treeId } = req.params;

  try {
    await DBTree.togglePublic(userId, treeId);
    res.status(200).json({ message: "Tree visibility toggled" });
    return;
  } catch (error) {
    console.error("Error toggling tree visibility:", error);
    res.status(500).json({ message: "Failed to toggle tree visibility" });
    return;
  }
});

// Remove a connection between two people
app.post("/api/connection/remove/:originId/:targetId/", async (req, res) => {
  const authResult = await authorizeRequestWithUser(req, res);
  req = authResult.req as Request<{
    originId: string;
    targetId: string;
  }>;
  res = authResult.res;
  const userId = authResult.userId;

  if (!userId) return;

  const { originId, targetId } = req.params;

  try {
    // Fetch trees for the user from the database
    await DBTree.removeRelation(originId, targetId);
    res.status(200).json({ message: "Connection removed" });
    return;
  } catch (error) {
    console.error("Error removing connection from database:", error);
    res.status(500).json({ message: "Failed to delete connection" });
    return;
  }
});

// Remove a person from the tree
app.post("/api/person/remove/:personId", async (req, res) => {
  const authResult = await authorizeRequestWithUser(req, res);
  req = authResult.req as Request<{ personId: string }>;
  res = authResult.res;
  const userId = authResult.userId;

  if (!userId) return;

  const { personId } = req.params;

  try {
    // Fetch trees for the user from the database
    await DBTree.removePerson(personId);
    res.status(200).json({ message: "Person removed" });
    return;
  } catch (error) {
    console.error("Error removing person from the database:", error);
    res.status(500).json({ message: "Failed to remove person" });
    return;
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

// Log the database connection on startup
async function logDBConnection() {
  console.log(
    await DBManager.driver.getServerInfo({ database: DBManager.db_name })
  );
}
logDBConnection();
