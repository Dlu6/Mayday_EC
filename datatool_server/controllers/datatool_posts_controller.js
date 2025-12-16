// server/controllers/datatool_posts_controller.js
import express from "express";
import mongoose from "mongoose";
import PostMessage from "../models/datatoolPostsModel.js";
import User from "../models/datatoolUsersModel.js";

export const getPosts = async (req, res) => {
  const { page } = req.query;

  try {
    // console.log(req.params.role, req.params.userId)
    if (req.params.role == "ADMIN") {
      const LIMIT = 8;
      const startIndex = (Number(page) - 1) * LIMIT; // get the starting index of every page

      const total = await PostMessage.countDocuments({});
      const posts = await PostMessage.find()
        .sort({ _id: -1 })
        .limit(LIMIT)
        .skip(startIndex);

      res.json({
        data: posts,
        currentPage: Number(page),
        numberOfPages: Math.ceil(total / LIMIT),
      });
    } else {
      const LIMIT = 8;
      const startIndex = (Number(page) - 1) * LIMIT; // get the starting index of every page

      const total = await PostMessage.countDocuments({});
      const posts = await PostMessage.find({ creator: req.params.userId })
        .sort({ _id: -1 })
        .limit(LIMIT)
        .skip(startIndex);

      res.json({
        data: posts,
        currentPage: Number(page),
        numberOfPages: Math.ceil(total / LIMIT),
      });
    }
  } catch (error) {
    res.status(404).json({ message: error });
  }
};

// Helper function to calculate the sessionCount
function getSessionCount(sessionList) {
  return sessionList.length >= 1 ? sessionList.length : 1;
}

export const getPostsNoLimit = async (req, res) => {
  const { userId, role } = req.params;
  const { page = 1 } = req.query;

  try {
    const LIMIT = 100;
    const startIndex = (Number(page) - 1) * LIMIT;

    // Build query based on role
    const query = role === "ADMIN" ? {} : { creator: userId };

    // Get total count for pagination
    const total = await PostMessage.countDocuments(query);

    // Fetch posts with query
    const posts = await PostMessage.find(query)
      .sort({ _id: -1 })
      .limit(LIMIT)
      .skip(startIndex);

    if (!posts.length) {
      return res.status(200).json({
        data: [],
        currentPage: Number(page),
        numberOfPages: Math.ceil(total / LIMIT),
      });
    }

    const postsWithSessionListCount = posts.map((post) => ({
      ...post.toObject(),
      sessionCount: getSessionCount(post.sessionList),
    }));

    res.status(200).json({
      data: postsWithSessionListCount,
      currentPage: Number(page),
      numberOfPages: Math.ceil(total / LIMIT),
    });
  } catch (error) {
    console.error("Error in getPostsNoLimit:", error);
    res.status(500).json({
      message: "Failed to fetch posts",
      error: error.message,
    });
  }
};

// Search through posts
export const getClientsBySearch = async (req, res) => {
  const { searchQuery } = req.query;
  let { user_id: userId } = req.params;

  try {
    if (userId) {
      const user = await User.findById(userId);
    }

    const isNumeric = !isNaN(searchQuery);
    let searchQueryNumber = isNumeric ? Number(searchQuery) : null;

    let searchFields = [
      { name: { $regex: searchQuery, $options: "i" } },
      { callerName: { $regex: searchQuery, $options: "i" } },
      { clientName: { $regex: searchQuery, $options: "i" } },
      { clientDistrict: { $regex: searchQuery, $options: "i" } },
      { relationship: { $regex: searchQuery, $options: "i" } },
      { language: { $regex: searchQuery, $options: "i" } },
      { clientAge: { $regex: searchQuery, $options: "i" } },
    ];

    if (isNumeric) {
      searchFields.push({ mobile: searchQueryNumber });
    }

    const posts = await PostMessage.find({
      $or: searchFields,
    });

    // Always return a 200 status with data and message
    return res.status(200).json({
      data: posts,
      message: posts.length === 0 ? "No results found" : "Results found",
    });
  } catch (error) {
    // Return a 500 status for server errors
    return res.status(500).json({
      data: [],
      message: "An error occurred while searching",
    });
  }
};

export const getAllPosts = async (req, res) => {
  try {
    if (req.params.role == "ADMIN") {
      const posts = await PostMessage.find().sort({ _id: -1 });
      res.json({ data: posts });
    } else {
      const posts = await PostMessage.find({ creator: req.params.userId }).sort(
        {
          _id: -1,
        }
      );
      res.json({ data: posts });
    }
  } catch (error) {
    res.status(404).json({ message: error });
  }
};

export const getPost = async (req, res) => {
  const { id } = req.params;

  try {
    let query = PostMessage.findById(id);

    if (req.params.role !== "ADMIN" && req.params.role !== "CREATOR") {
      query.where({ id: id, creator: req.params.userId });
    }

    const post = await query.lean().exec();

    // Add sessionListCount property to the post object
    post.sessionCount = post.sessionList.length;

    res.status(200).json(post);
  } catch (error) {
    console.log(error);
    res.status(404).json({ message: error });
  }
};

export const createPost = async (req, res) => {
  const { userId, role } = req.params;
  try {
    if (role == "ADMIN" || role == "CREATOR") {
      const {
        consentV1Text,
        consentV1Accepted,
        consentV1AcceptedAt,
        feedbackConsentText,
        feedbackConsentAccepted,
        feedbackConsentAcceptedAt,
        callerName,
        mobile,
        message,
        reason,
        howLong,
        callerSex,
        clientSex,
        caseSource,
        peerReferral,
        sameAsCaller,
        clientName,
        clientDistrict,
        relationship,
        language,
        callerAge,
        clientAge,
        difficulty,
        howDidYouHear,
        caseAssessment,
        nationality,
        servicesPrior,
        servicesOffered,
        region,
        accessed,
        name,
        sessionList,
      } = req.body;
      // const post = req.body;
      const newPostMessage = new PostMessage({
        // ...post,
        consentV1Text,
        consentV1Accepted,
        consentV1AcceptedAt,
        feedbackConsentText,
        feedbackConsentAccepted,
        feedbackConsentAcceptedAt,
        callerName,
        mobile,
        message,
        reason,
        howLong,
        callerSex,
        clientSex,
        caseSource,
        peerReferral,
        sameAsCaller,
        clientName,
        clientDistrict,
        relationship,
        language,
        callerAge,
        clientAge,
        difficulty,
        howDidYouHear,
        caseAssessment,
        servicesPrior,
        servicesOffered,
        nationality,
        region,
        accessed,
        name,
        sessionList,
        creator: userId,
        createdAt: new Date().toISOString(),
      });
      await newPostMessage.save();

      // Add sessionCount to the new post
      const newPostWithSessionCount = {
        ...newPostMessage.toObject(),
        sessionCount: getSessionCount(newPostMessage.sessionList),
      };

      // Return the newly created post with a success status
      res.status(201).json({
        success: true,
        message: "Post created successfully",
        newPost: newPostWithSessionCount,
      });
    } else {
      res.status(400).json({ message: "Operation not allowed!" });
    }
  } catch (error) {
    res.status(409).json({ message: error.message });
  }
};

export const updatePost = async (req, res) => {
  const { userId, postId } = req.params;
  try {
    let {
      consentV1Text,
      consentV1Accepted,
      consentV1AcceptedAt,
      feedbackConsentText,
      feedbackConsentAccepted,
      feedbackConsentAcceptedAt,
      callerName,
      callerSex,
      clientSex,
      caseSource,
      peerReferral,
      sameAsCaller,
      clientName,
      clientDistrict,
      relationship,
      language,
      callerAge,
      clientAge,
      difficulty,
      howDidYouHear,
      caseAssessment,
      servicesPrior,
      servicesOffered,
      nationality,
      region,
      accessed,
      message,
      reason,
      howLong,
      mobile,
      sessionList,
    } = req.body;
    // console.log(req.body, "RRRRRRRRRRRRRRR")
    // console.log(isJson(language))
    // if (req.params.role == "ADMIN") {
    if (!mongoose.Types.ObjectId.isValid(postId))
      return res.status(404).send(`No post with id: ${postId}`);

    const updatedPost = {
      creator: userId,
      consentV1Text,
      consentV1Accepted,
      consentV1AcceptedAt,
      feedbackConsentText,
      feedbackConsentAccepted,
      feedbackConsentAcceptedAt,
      callerName,
      callerSex,
      clientSex,
      caseSource,
      peerReferral,
      sameAsCaller,
      clientName,
      clientDistrict,
      relationship,
      language,
      callerAge,
      clientAge,
      difficulty,
      howDidYouHear,
      caseAssessment,
      servicesPrior,
      servicesOffered,
      nationality,
      region,
      accessed,
      message,
      reason,
      howLong,
      mobile,
      sessionList,
    };
    // console.log(updatedPost)
    await PostMessage.findByIdAndUpdate(
      postId,
      { ...updatedPost },
      { new: true }
    );

    res.json(updatedPost);
    // } else {
    //     res.status(400).json({ message: "Only Admins can Update!"})
    // }
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: error });
  }
};

export const deletePost = async (req, res) => {
  const { postId, userId, role } = req.params;
  try {
    // Validate the MongoDB ID
    if (!mongoose.Types.ObjectId.isValid(postId))
      return res.status(404).json({ message: `No post with id: ${id}` });

    // Find the post to check the creator
    const post = await PostMessage.findById(postId);
    if (!post) {
      return res
        .status(404)
        .json({ message: `Post with id ${postId} not found` });
    }

    // Check user role and permissions
    if (role === "ADMIN" || post.creator === userId) {
      // Admin or creator can delete the post
      await PostMessage.findByIdAndDelete(postId);
      return res.status(200).json({
        success: true,
        message: "Post deleted successfully.",
      });
    } else {
      return res.status(403).json({
        message: "You don't have permission to delete this post.",
      });
    }
  } catch (error) {
    console.error("Error deleting post:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete post",
      error: error.message,
    });
  }
};

// Get user stats
export const getSessionsAndPosts = async (req, res) => {
  try {
    //Fetch all users where user_role is CREATOR
    const users = await User.find({ user_role: "CREATOR" });

    // Map over their users and fetch their respective posts
    let userStats = await Promise.all(
      users.map(async (user) => {
        // Fetch posts created by this user
        const posts = await PostMessage.find({ creator: user._id.toString() });

        //  Calculate the total number of sessions across all posts
        let totalSessions = 0;
        for (let post of posts) {
          totalSessions += post.sessionList ? post.sessionList.length : 0;
        }

        // Return stats for this user
        return {
          userId: user._id,
          name: user.name,
          email: user.email,
          role: user.user_role,
          posts: posts.length,
          sessions: totalSessions,
        };
      })
    );
    userStats = userStats.sort((a, b) => b.posts - a.posts);

    res.status(200).json(userStats);
  } catch (error) {
    res.status(500).json({ message: error });
  }
};

// Add this new controller function
export const getDataToolMetrics = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    // Parse dates with proper time boundaries
    const start = startDate
      ? new Date(startDate)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    start.setHours(0, 0, 0, 0); // Start of day
    const end = endDate ? new Date(endDate) : new Date();
    end.setHours(23, 59, 59, 999); // End of day - include full last day

    // Build date filter
    const dateFilter = {
      createdAt: {
        $gte: start,
        $lte: end,
      },
    };

    // Get all posts within date range
    const posts = await PostMessage.find(dateFilter);

    if (!posts.length) {
      return res.status(200).json({
        totalCases: 0,
        totalSessions: 0,
        casesByDifficulty: [],
        casesByRegion: [],
        casesBySex: [],
        sessionsByMonth: [],
        casesBySource: [],
        casesByAge: [],
        counselorPerformance: [],
      });
    }

    // Calculate total cases and sessions more accurately
    const totalCases = posts.length;

    // Calculate total sessions by properly counting the sessionList length for each post
    const totalSessions = posts.reduce((sum, post) => {
      // If sessionList exists and has length, use that, otherwise count as 1 session
      return (
        sum +
        (post.sessionList && post.sessionList.length
          ? post.sessionList.length
          : 1)
      );
    }, 0);

    // Group cases by difficulty
    const difficultyMap = new Map();
    posts.forEach((post) => {
      if (post.difficulty && post.difficulty.length) {
        post.difficulty.forEach((diff) => {
          difficultyMap.set(diff, (difficultyMap.get(diff) || 0) + 1);
        });
      } else {
        difficultyMap.set(
          "Not Specified",
          (difficultyMap.get("Not Specified") || 0) + 1
        );
      }
    });

    const casesByDifficulty = Array.from(difficultyMap, ([name, value]) => ({
      name,
      value,
    }));

    // Group cases by region
    const regionMap = new Map();
    posts.forEach((post) => {
      const region = post.region || "Not Specified";
      regionMap.set(region, (regionMap.get(region) || 0) + 1);
    });

    const casesByRegion = Array.from(regionMap, ([name, value]) => ({
      name,
      value,
    }));

    // Group cases by sex
    const sexMap = new Map();
    posts.forEach((post) => {
      const sex = post.clientSex || "Not Specified";
      sexMap.set(sex, (sexMap.get(sex) || 0) + 1);
    });

    const casesBySex = Array.from(sexMap, ([name, value]) => ({
      name,
      value,
    }));

    // Group sessions by month
    const sessionsByMonthMap = new Map();
    posts.forEach((post) => {
      // Process each session in the post
      if (post.sessionList && post.sessionList.length) {
        post.sessionList.forEach((session) => {
          const date = new Date(session.session_date);
          const monthYear = `${date.toLocaleString("default", {
            month: "short",
          })} ${date.getFullYear()}`;
          sessionsByMonthMap.set(
            monthYear,
            (sessionsByMonthMap.get(monthYear) || 0) + 1
          );
        });
      } else {
        // If no sessions, count the post creation date
        const date = new Date(post.createdAt);
        const monthYear = `${date.toLocaleString("default", {
          month: "short",
        })} ${date.getFullYear()}`;
        sessionsByMonthMap.set(
          monthYear,
          (sessionsByMonthMap.get(monthYear) || 0) + 1
        );
      }
    });

    // Sort sessions by month chronologically
    const months = Array.from(sessionsByMonthMap.keys());
    months.sort((a, b) => {
      const dateA = new Date(a);
      const dateB = new Date(b);
      return dateA - dateB;
    });

    const sessionsByMonth = months.map((month) => ({
      month,
      sessions: sessionsByMonthMap.get(month),
    }));

    // Group cases by source
    const sourceMap = new Map();
    posts.forEach((post) => {
      const source = post.caseSource || "Not Specified";
      sourceMap.set(source, (sourceMap.get(source) || 0) + 1);
    });

    const casesBySource = Array.from(sourceMap, ([name, value]) => ({
      name,
      value,
    }));

    // Group cases by age
    const ageMap = new Map();
    posts.forEach((post) => {
      let ageGroup = "Not Specified";

      if (post.clientAge) {
        const age = parseInt(post.clientAge);
        if (!isNaN(age)) {
          if (age < 18) ageGroup = "Under 18";
          else if (age >= 18 && age <= 24) ageGroup = "18-24";
          else if (age >= 25 && age <= 34) ageGroup = "25-34";
          else if (age >= 35 && age <= 44) ageGroup = "35-44";
          else if (age >= 45 && age <= 54) ageGroup = "45-54";
          else if (age >= 55) ageGroup = "55+";
        }
      }

      ageMap.set(ageGroup, (ageMap.get(ageGroup) || 0) + 1);
    });

    const casesByAge = Array.from(ageMap, ([name, value]) => ({ name, value }));

    // Get counselor performance - similar to SessionAnalytics.jsx
    const counselorMap = new Map();

    // First get all unique creator IDs
    const creatorIds = [...new Set(posts.map((post) => post.creator))];

    // Get user details for each creator
    const users = await User.find({ _id: { $in: creatorIds } });

    // Create a map of user IDs to names
    const userMap = new Map();
    users.forEach((user) => {
      userMap.set(user._id.toString(), user.name);
    });

    // Count cases and sessions by counselor
    posts.forEach((post) => {
      const creatorId = post.creator;
      const creatorName = userMap.get(creatorId) || "Unknown";

      if (!counselorMap.has(creatorId)) {
        counselorMap.set(creatorId, {
          id: creatorId,
          name: creatorName,
          cases: 0,
          sessions: 0,
          role: "CREATOR", // Default role
        });
      }

      const counselorData = counselorMap.get(creatorId);
      counselorData.cases += 1;

      // Count sessions properly
      const sessionCount =
        post.sessionList && post.sessionList.length
          ? post.sessionList.length
          : 1;
      counselorData.sessions += sessionCount;
    });

    // Add user roles to counselor data
    for (const user of users) {
      if (counselorMap.has(user._id.toString())) {
        counselorMap.get(user._id.toString()).role = user.user_role;
      }
    }

    const counselorPerformance = Array.from(counselorMap.values());

    // Sort counselor performance by number of cases (descending)
    counselorPerformance.sort((a, b) => b.cases - a.cases);

    // Return all metrics
    res.status(200).json({
      totalCases,
      totalSessions,
      activeUsers: counselorPerformance.length,
      casesByDifficulty,
      casesByRegion,
      casesBySex,
      sessionsByMonth,
      casesBySource,
      casesByAge,
      counselorPerformance,
    });
  } catch (error) {
    console.error("Error in getDataToolMetrics:", error);
    res.status(500).json({
      message: "Failed to fetch Data Tool metrics",
      error: error.message,
    });
  }
};

// Add this new controller function for all-time metrics
export const getDataToolAllTimeMetrics = async (req, res) => {
  try {
    // Get all posts without date filtering
    const posts = await PostMessage.find();

    if (!posts.length) {
      return res.status(200).json({
        totalCases: 0,
        totalSessions: 0,
        activeUsers: 0,
        counselorPerformance: [],
      });
    }

    // Calculate total cases and sessions
    const totalCases = posts.length;

    // Calculate total sessions by properly counting the sessionList length for each post
    const totalSessions = posts.reduce((sum, post) => {
      return (
        sum +
        (post.sessionList && post.sessionList.length
          ? post.sessionList.length
          : 1)
      );
    }, 0);

    // Get counselor performance
    const counselorMap = new Map();

    // First get all unique creator IDs
    const creatorIds = [...new Set(posts.map((post) => post.creator))];

    // Get user details for each creator
    const users = await User.find({});
    const activeUsers = users.filter(
      (user) => user.user_role === "CREATOR"
    ).length;

    // Create a map of user IDs to names
    const userMap = new Map();
    users.forEach((user) => {
      userMap.set(user._id.toString(), {
        name: user.name,
        role: user.user_role,
      });
    });

    // Count cases and sessions by counselor
    posts.forEach((post) => {
      const creatorId = post.creator;
      const userData = userMap.get(creatorId) || {
        name: "Unknown",
        role: "CREATOR",
      };

      if (!counselorMap.has(creatorId)) {
        counselorMap.set(creatorId, {
          id: creatorId,
          name: userData.name,
          cases: 0,
          sessions: 0,
          role: userData.role,
        });
      }

      const counselorData = counselorMap.get(creatorId);
      counselorData.cases += 1;

      // Count sessions properly
      const sessionCount =
        post.sessionList && post.sessionList.length
          ? post.sessionList.length
          : 1;
      counselorData.sessions += sessionCount;
    });

    const counselorPerformance = Array.from(counselorMap.values());

    // Sort counselor performance by number of cases (descending)
    counselorPerformance.sort((a, b) => b.cases - a.cases);

    // Return all metrics
    res.status(200).json({
      totalCases,
      totalSessions,
      activeUsers,
      counselorPerformance,
    });
  } catch (error) {
    console.error("Error in getDataToolAllTimeMetrics:", error);
    res.status(500).json({
      message: "Failed to fetch all-time Data Tool metrics",
      error: error.message,
    });
  }
};

// Add this new controller function for getting all posts for reports
export const getAllPostsForReport = async (req, res) => {
  try {
    // Get all posts without pagination
    const posts = await PostMessage.find().sort({ createdAt: -1 });

    // Return all posts
    res.status(200).json({
      data: posts,
      count: posts.length,
    });
  } catch (error) {
    console.error("Error in getAllPostsForReport:", error);
    res.status(500).json({
      message: "Failed to fetch all posts for report",
      error: error.message,
    });
  }
};

// Remove this line as it's causing the export issue
// export default router;

// Instead, make sure we're exporting all the functions properly
