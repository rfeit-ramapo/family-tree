import { Request, Response } from "express";
import { OAuth2Client } from "google-auth-library";

const authClient = new OAuth2Client(process.env.AUTH_CLIENT || "my_client_id");

// Authorize a request with a user token
// If the token is valid, fill the userId field
// Otherwise, return a 401 response
export const authorizeRequestWithUser = async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  let userId;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({
      message: "Unauthorized: Missing or malformed Authorization header",
    });
    return { res, req };
  }

  const token = authHeader.split(" ")[1];

  if (!token) {
    res.status(401).json({ message: "Unauthorized: Missing token" });
    return { res, req };
  }

  try {
    // Verify the token
    const ticket = await authClient.verifyIdToken({
      idToken: token,
      audience: process.env.AUTH_CLIENT as string,
    });
    const payload = ticket.getPayload();
    userId = payload!.sub; // User's unique Google ID

    if (!userId) {
      res.status(401).json({ message: "Unauthorized: Invalid token" });
      return { res, req };
    }
  } catch (error) {
    console.error(error);
    res.status(401).json({ message: "Unauthorized: Invalid token" });
    return { res, req };
  }

  return {
    userId,
    res,
    req,
  };
};

// Authorize a request with an optional token
// If the token is present, fill the userId field
// Otherwise, userId will be null
export const authorizeOptionalRequest = async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  let userId: string | null = null;

  // Optionally fill user id if token is present
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

  return {
    userId,
    res,
    req,
  };
};
