/**
 * File providing authorization logic for the server.
 */

import { Request, Response } from "express";
import { OAuth2Client } from "google-auth-library";

const authClient = new OAuth2Client(process.env.AUTH_CLIENT || "my_client_id");

/**
 * NAME: authorizeRequestWithUser
 *
 * SYNOPSIS: async authorizeRequestWithUser(req: Request, res: Response): Promise<{ userId?: string, res: Response, req: Request }>
 *    req  --> The HTTP request object.
 *    res  --> The HTTP response object.
 *
 * DESCRIPTION
 * This function authorizes a request by validating the user token provided in the Authorization header.
 * If the token is valid, it fills the userId field with the user's unique Google ID.
 * If the token is missing or invalid, it returns a 401 Unauthorized response.
 *
 * RETURNS
 * A promise that resolves to an object containing the userId (if the token is valid), the response object, and the request object.
 */
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

/**
 * NAME: authorizeOptionalRequest
 *
 * SYNOPSIS: async authorizeOptionalRequest(req: Request, res: Response): Promise<{ userId: string | null, res: Response, req: Request }>
 *    req  --> The HTTP request object.
 *    res  --> The HTTP response object.
 *
 * DESCRIPTION
 * This function optionally authorizes a request by validating the user token provided in the Authorization header.
 * If the token is present and valid, it fills the userId field with the user's unique Google ID.
 * If the token is missing or invalid, the userId field will be null.
 *
 * RETURNS
 * A promise that resolves to an object containing the userId (if the token is valid or null if not), the response object, and the request object.
 */
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
