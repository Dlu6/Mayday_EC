import express from "express";
import {
  getPosts,
  getPostsNoLimit,
  getClientsBySearch,
  getAllPosts,
  getPost,
  createPost,
  updatePost,
  deletePost,
  getSessionsAndPosts,
  getDataToolMetrics,
  getDataToolAllTimeMetrics,
  getAllPostsForReport,
} from "../controllers/datatool_posts_controller.js";

import {
  signin,
  signup,
  getUsers,
  getUser,
  createUser,
  profileUpdate,
  deleteUser,
} from "../controllers/datatool_users_controller.js";

const router = express.Router();

// Posts routes
router.get("/posts/:userId/:role", getPostsNoLimit);
router.get("/posts/search/:user_id", getClientsBySearch);
router.get("/posts/all/:role/:userId", getAllPosts);
router.get("/posts/:id/:role/:userId", getPost);
router.post("/posts/:userId/:role", createPost);
router.put("/posts/:postId/:userId/:role", updatePost);
router.delete("/posts/:postId/:userId/:role", deletePost);

// User routes
router.post("/users/signin", signin);
router.post("/users/signup", signup);
router.get("/users/:role/:userId", getUsers);
router.get("/users/:id/:role/:userId", getUser);
router.post("/users/:role", createUser);
router.patch(
  "/users/:resourceUserId/:loggedInUserId/:role",

  profileUpdate
);
router.delete("/users/:id/:role/:userId", deleteUser);

// Analytics routes
router.get("/sessions-and-posts", getSessionsAndPosts);
router.get("/metrics", getDataToolMetrics);
router.get("/metrics/all-time", getDataToolAllTimeMetrics);

// Report routes
router.get("/posts/all", getAllPostsForReport);

export default router;
