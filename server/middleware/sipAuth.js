import UserModel from "../models/UsersModel.js";
import jwt from "jsonwebtoken";

// middleware/sipAuth.js
export const sipAuthMiddleware = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  // console.log(req.headers, "🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀");
  // console.log("Auth header>>>>>:", authHeader);

  try {
    if (!authHeader) {
      throw new Error("No authorization header provided");
    }

    let user;
    let token;

    if (authHeader.startsWith("Bearer ")) {
      // Extract token and remove any duplicate 'Bearer' prefixes
      token = authHeader
        .replace(/^Bearer\s+Bearer\s+/, "Bearer ")
        .split(" ")[1];

      if (!token) {
        throw new Error("Invalid token format");
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      user = await UserModel.findOne({
        where: { id: decoded.userId, disabled: false },
      });
    } else if (authHeader.startsWith("Basic ")) {
      // Basic auth
      const [email, password] = Buffer.from(authHeader.split(" ")[1], "base64")
        .toString()
        .split(":");

      user = await UserModel.findExtensionByEmail(email);

      if (!user || user.auth?.password !== password) {
        throw new Error("Invalid credentials");
      }
    } else {
      throw new Error("Invalid authorization type");
    }

    if (!user) {
      throw new Error("User not found");
    }

    req.user = user;
    next();
  } catch (error) {
    console.error("Authentication error:", error);
    res.status(401).json({
      success: false,
      message: error.message,
    });
  }
};

// Phonebar Verify Extension Access
export const verifyExtensionAccess = async (req, res, next) => {
  const { extension } = req.body;

  try {
    const user = await UserModel.findOne({
      where: {
        extension,
        disabled: false,
      },
    });

    if (!user) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized to clear this extension",
      });
    }

    next();
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error verifying extension access",
    });
  }
};
