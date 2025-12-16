import axios from "axios";
import { storageService } from "../services/storageService";

// If development, use localhost:8004, else use https://mhu-data-server.herokuapp.com/
const API = axios.create({
  baseURL:
    process.env.NODE_ENV === "development"
      ? "http://localhost:8004"
      : // : "https://mhu-data-server.herokuapp.com/",
        "https://mhuhelpline.com",
});

API.interceptors.request.use((req) => {
  const token = storageService.getAuthToken();
  if (token) {
    req.headers.Authorization = `Bearer ${token}`;
  }
  return req;
});

export const createPost = (newPost, userId, role) =>
  API.post(`/api/dataTool/posts/${userId}/${role}`, newPost);

export const updatePost = (updatedPost, userId, role) =>
  API.put(
    `/api/dataTool/posts/${updatedPost._id}/${userId}/${role}`,
    updatedPost
  );

export const fetchPosts = async (userId, role, page) => {
  try {
    const response = await API.get(
      `/api/dataTool/posts/${userId}/${role}?page=${page}`
    );
    return response;
  } catch (error) {
    console.error("Error fetching posts:", error);
    throw error;
  }
};

export const searchPosts = async (userId, role, searchQuery) => {
  try {
    const response = await API.get(
      `/api/dataTool/search/${userId}/${role}?searchQuery=${searchQuery}`
    );
    return response;
  } catch (error) {
    if (error.response && error.response.status === 404) {
      // Return a structured response for no results
      return { data: { data: [], message: "No results found" } };
    }
    throw error; // Re-throw other errors
  }
};

export const deletePost = async (postId, userId, role) => {
  try {
    const response = await API.delete(
      `/api/dataTool/posts/${postId}/${userId}/${role}`
    );
    return response;
  } catch (error) {
    console.error("Error in deletePost API call:", error);
    throw error;
  }
};

// New function to fetch session and post statistics
export const fetchStats = async () => {
  try {
    const response = await API.get("/api/dataTool/sessions-and-posts");
    return response.data;
  } catch (error) {
    console.error("Error fetching stats:", error);
    throw error;
  }
};
