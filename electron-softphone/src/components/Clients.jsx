import React, { useState, useEffect, useCallback } from "react";
import Pagination from "./Pagination";
import ContentFrame from "./ContentFrame";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  Grid,
  Chip,
  CircularProgress,
  Divider,
  LinearProgress,
  Tooltip,
} from "@mui/material";
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Person as PersonIcon,
  Phone as PhoneIcon,
  Assignment as AssignmentIcon,
  CalendarToday as CalendarIcon,
  Info as InfoIcon,
  Close as CloseIcon,
  Refresh as RefreshIcon,
  Clear as ClearIcon,
  DateRange as DateRangeIcon,
} from "@mui/icons-material";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import ClientFormFields from "./ClientFormFields";
import {
  createPost,
  updatePost,
  fetchPosts as fetchPostsApi,
  searchPosts,
  deletePost as deletePostApi,
} from "../api/datatoolApi";
import ClientDetailView from "./ClientDetailView";
import ConfirmDialog from "./ConfirmDialog";
import { debounce } from "lodash";

// const isDev = process.env.NODE_ENV === "development";
// const API_URL = isDev ? "http://localhost:8004" : "https://mhuhelpline.com";

const Clients = ({ open, onClose, user, initialPhone, focusOnMatch }) => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPost, setSelectedPost] = useState(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isNewDialogOpen, setIsNewDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    consentV1Text:
      "I would like to let you know that on this counseling helpline, your privacy and confidentiality\nwill be respected, except in cases where there is risk of harm to yourself or others, suspected\nabuse, or when disclosure is required by law. Please note that online counseling may involve\nsome risks, such as technical interruptions or limited non-verbal cues.\n\nYou have the right to ask questions, choose what to share, or withdraw from counseling at any\ntime. While counseling can be helpful, it is not a substitute for emergency services. If you are in\ncrisis, please contact local emergency numbers or crisis hotlines. By continuing, you\nacknowledge that you understand this information and consent to receive online psychological\nsupport from",
    consentV1Accepted: false,
    feedbackConsentText:
      "Consent for Feedback Collection\nWe will be contacting clients as part of a mid-term feedback review on their experiences with the\nonline counseling system. Would it be okay for us to contact you for this purpose? Participation\nis completely voluntary, and you may choose to provide feedback now or at a later time that is\nconvenient for you.\n\nAll information you share will be kept confidential and used only to improve the counseling\nservices. Your decision to participate or not will not affect your access to support in any way. By\nagreeing, you acknowledge that you understand this information and consent to be contacted for\nthe mid-term review.",
    feedbackConsentAccepted: false,
    callerName: "",
    mobile: "",
    callerSex: "",
    clientSex: "",
    caseSource: "",
    peerReferral: "",
    sameAsCaller: "No",
    clientName: "",
    clientDistrict: "",
    relationship: "",
    language: "",
    callerAge: "",
    clientAge: "",
    difficulty: [],
    howDidYouHear: [],
    caseAssessment: [],
    servicesPrior: [],
    servicesOffered: [],
    nationality: "",
    region: "",
    accessed: [],
    message: "",
    reason: "",
    howLong: "",
    sessionList: [{ session: "", session_date: new Date() }],
  });
  const [sessionList, setSessionList] = useState([
    { session: "", session_date: new Date() },
  ]);

  const [isDetailViewOpen, setIsDetailViewOpen] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dateRange, setDateRange] = useState({ startDate: null, endDate: null });
  const [deleteDialog, setDeleteDialog] = useState({ open: false, id: null });

  // Filter posts by date range
  const filteredPosts = posts.filter((post) => {
    if (!dateRange.startDate && !dateRange.endDate) return true;
    
    const postDate = new Date(post.createdAt);
    
    if (dateRange.startDate && dateRange.endDate) {
      const start = new Date(dateRange.startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(dateRange.endDate);
      end.setHours(23, 59, 59, 999);
      return postDate >= start && postDate <= end;
    }
    
    if (dateRange.startDate) {
      const start = new Date(dateRange.startDate);
      start.setHours(0, 0, 0, 0);
      return postDate >= start;
    }
    
    if (dateRange.endDate) {
      const end = new Date(dateRange.endDate);
      end.setHours(23, 59, 59, 999);
      return postDate <= end;
    }
    
    return true;
  });

  useEffect(() => {
    if (user) {
      fetchPosts(currentPage);
    }
  }, [currentPage, user]);

  // Auto-search by incoming phone and optionally open edit if matched
  useEffect(() => {
    const run = async () => {
      if (!open || !initialPhone || !user) return;
      try {
        // Use server search first for authoritative results
        const resp = await searchPosts(
          user.id,
          user.role,
          String(initialPhone)
        );
        const list = resp?.data?.data || [];
        if (list.length > 0) {
          setPosts(list);
          if (focusOnMatch) {
            // Open the first matched record for quick update during call
            handleEdit(list[0]);
          }
        }
      } catch (e) {
        // Fallback to local filter
        const matched = posts.filter(
          (p) => String(p.mobile) === String(initialPhone)
        );
        if (matched.length > 0) {
          setPosts(matched);
          if (focusOnMatch) handleEdit(matched[0]);
        }
      }
    };
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialPhone, focusOnMatch, user]);

  const fetchPosts = async (page) => {
    try {
      const response = await fetchPostsApi(user.id, user.role, page);
      // console.log(response, "response.data 🤔🤔🤔");
      setPosts(response.data.data);
      setTotalPages(response.data.numberOfPages);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching posts:", error);
      setLoading(false);
    }
  };

  const handleSearch = useCallback(
    debounce(async (query) => {
      if (!query) {
        fetchPosts(currentPage);
        return;
      }

      setSearchLoading(true);
      try {
        const localResults = posts.filter((post) => {
          const queryLower = String(query).toLowerCase();
          return (
            String(post.clientName).toLowerCase().includes(queryLower) ||
            String(post.mobile).includes(queryLower) ||
            String(post.callerName).toLowerCase().includes(queryLower) ||
            String(post.clientDistrict).toLowerCase().includes(queryLower) ||
            String(post.relationship).toLowerCase().includes(queryLower) ||
            String(post.language).toLowerCase().includes(queryLower) ||
            String(post.callerAge).toLowerCase().includes(queryLower) ||
            String(post.clientAge).toLowerCase().includes(queryLower)
          );
        });

        if (localResults.length > 0) {
          setPosts(localResults);
        } else {
          const response = await searchPosts(user.id, user.role, query);
          setPosts(response.data.data || []);
        }
      } catch (error) {
        console.error("Error searching:", error);
        setPosts([]);
      } finally {
        setSearchLoading(false);
      }
    }, 300),
    [posts, currentPage, user]
  );

  const handleSearchChange = (event) => {
    const query = event.target.value;
    setSearchQuery(query);
    handleSearch(query);
  };

  const clearSearch = () => {
    setSearchQuery("");
    fetchPosts(currentPage);
  };

  const refreshPosts = async () => {
    setLoading(true);
    try {
      await fetchPosts(currentPage);
    } catch (error) {
      console.error("Error refreshing posts:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (id) => {
    setDeleteDialog({ open: true, id });
  };

  const confirmDelete = async () => {
    const id = deleteDialog.id;
    setDeleteDialog({ open: false, id: null });
    try {
      setLoading(true);
      const response = await deletePostApi(id, user.id, user.role);

      if (response && response.status === 200) {
        // Remove the post from the local state
        setPosts(posts.filter((post) => post._id !== id));
        // Show success message if needed
        console.log("Record deleted successfully");
      } else {
        console.error("Error deleting post: Unexpected response", response);
        // Refresh to ensure UI is in sync with database
        await refreshPosts();
      }
    } catch (error) {
      console.error("Error deleting post:", error);
      // Refresh to ensure UI is in sync with database
      await refreshPosts();
    } finally {
      setLoading(false);
    }
  };

  const handleDetailView = (post) => {
    setSelectedPost(post);
    setIsDetailViewOpen(true);
  };

  const handleEdit = (post) => {
    setSelectedPost(post);
    // Ensure we have a valid sessionList array with both session and session_date
    const sessionListWithDates = (
      post.sessionList || [{ session: "", session_date: new Date() }]
    ).map((session) => ({
      session: session.session || "",
      session_date: new Date(session.session_date) || new Date(),
    }));

    setFormData({
      ...formData,
      consentV1Text:
        post.consentV1Text ||
        "I would like to let you know that on this counseling helpline, your privacy and confidentiality\nwill be respected, except in cases where there is risk of harm to yourself or others, suspected\nabuse, or when disclosure is required by law. Please note that online counseling may involve\nsome risks, such as technical interruptions or limited non-verbal cues.\n\nYou have the right to ask questions, choose what to share, or withdraw from counseling at any\ntime. While counseling can be helpful, it is not a substitute for emergency services. If you are in\ncrisis, please contact local emergency numbers or crisis hotlines. By continuing, you\nacknowledge that you understand this information and consent to receive online psychological\nsupport from",
      consentV1Accepted: Boolean(post.consentV1Accepted),
      feedbackConsentText:
        post.feedbackConsentText ||
        "Consent for Feedback Collection\nWe will be contacting clients as part of a mid-term feedback review on their experiences with the\nonline counseling system. Would it be okay for us to contact you for this purpose? Participation\nis completely voluntary, and you may choose to provide feedback now or at a later time that is\nconvenient for you.\n\nAll information you share will be kept confidential and used only to improve the counseling\nservices. Your decision to participate or not will not affect your access to support in any way. By\nagreeing, you acknowledge that you understand this information and consent to be contacted for\nthe mid-term review.",
      feedbackConsentAccepted: Boolean(post.feedbackConsentAccepted),
      callerName: post.callerName || "",
      mobile: post.mobile || "",
      callerSex: post.callerSex || "",
      clientSex: post.clientSex || "",
      caseSource: post.caseSource || "",
      peerReferral: post.peerReferral || "",
      sameAsCaller: post.sameAsCaller || "No",
      clientName: post.clientName || "",
      clientDistrict: post.clientDistrict || "",
      relationship: post.relationship || "",
      language: post.language || "",
      callerAge: post.callerAge || "",
      clientAge: post.clientAge || "",
      difficulty: post.difficulty || [],
      howDidYouHear: post.howDidYouHear || [],
      caseAssessment: post.caseAssessment || [],
      servicesPrior: post.servicesPrior || [],
      servicesOffered: post.servicesOffered || [],
      nationality: post.nationality || "",
      region: post.region || "",
      accessed: post.accessed || [],
      message: post.message || "",
      reason: post.reason || "",
      howLong: post.howLong || "",
      sessionList: sessionListWithDates,
      _id: post._id,
    });

    // Set the sessionList state separately
    setSessionList(sessionListWithDates);
    setIsEditDialogOpen(true);
  };

  const handleNewSession = () => {
    setFormData({
      clientName: "",
      callerName: "",
      mobile: "",
      reason: "",
      sameAsCaller: false,
    });
    setIsNewDialogOpen(true);
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleChangeMulti = (e, name) => {
    const value = e.target.value;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleRadioChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (createNew = false) => {
    try {
      setIsSubmitting(true);
      const submissionData = {
        ...formData,
        sessionList: sessionList,
        sessionCount: sessionList.length,
        consentV1AcceptedAt: formData.consentV1Accepted ? new Date() : null,
        feedbackConsentAcceptedAt: formData.feedbackConsentAccepted
          ? new Date()
          : null,
      };

      if (createNew) {
        const response = await createPost(submissionData, user.id, user.role);
        // console.log("Post created:", response.data);

        // If we have a newly created post in the response, add it to the posts state
        if (response.data && response.data.newPost) {
          // Add the new post to the beginning of the posts array
          setPosts((prevPosts) => [response.data.newPost, ...prevPosts]);

          // Show a success message or notification if needed
          // You can add a toast notification here if you have a notification system
        } else {
          // If the response doesn't include the new post, fetch all posts
          fetchPosts(currentPage);
        }

        setIsNewDialogOpen(false);
        resetForm();
      } else {
        const response = await updatePost(submissionData, user.id, user.role);
        setIsEditDialogOpen(false);
        resetForm();
        fetchPosts(currentPage);
      }
    } catch (error) {
      console.error("Error submitting form:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      consentV1Text:
        "I would like to let you know that on this counseling helpline, your privacy and confidentiality\nwill be respected, except in cases where there is risk of harm to yourself or others, suspected\nabuse, or when disclosure is required by law. Please note that online counseling may involve\nsome risks, such as technical interruptions or limited non-verbal cues.\n\nYou have the right to ask questions, choose what to share, or withdraw from counseling at any\ntime. While counseling can be helpful, it is not a substitute for emergency services. If you are in\ncrisis, please contact local emergency numbers or crisis hotlines. By continuing, you\nacknowledge that you understand this information and consent to receive online psychological\nsupport from",
      consentV1Accepted: false,
      feedbackConsentText:
        "Consent for Feedback Collection\nWe will be contacting clients as part of a mid-term feedback review on their experiences with the\nonline counseling system. Would it be okay for us to contact you for this purpose? Participation\nis completely voluntary, and you may choose to provide feedback now or at a later time that is\nconvenient for you.\n\nAll information you share will be kept confidential and used only to improve the counseling\nservices. Your decision to participate or not will not affect your access to support in any way. By\nagreeing, you acknowledge that you understand this information and consent to be contacted for\nthe mid-term review.",
      feedbackConsentAccepted: false,
      callerName: "",
      mobile: "",
      callerSex: "",
      clientSex: "",
      caseSource: "",
      peerReferral: "",
      sameAsCaller: "No",
      clientName: "",
      clientDistrict: "",
      relationship: "",
      language: "",
      callerAge: "",
      clientAge: "",
      difficulty: [],
      howDidYouHear: [],
      caseAssessment: [],
      servicesPrior: [],
      servicesOffered: [],
      nationality: "",
      region: "",
      accessed: [],
      message: "",
      reason: "",
      howLong: "",
      sessionList: [{ session: "", session_date: new Date() }],
    });
    setSessionList([{ session: "", session_date: new Date() }]);
  };

  useEffect(() => {
    if (isNewDialogOpen) {
      resetForm();
    }
  }, [isNewDialogOpen]);

  const calculateFormCompletion = () => {
    const questions = [
      { field: "caseSource", required: true },
      { field: "mobile", required: true },
      { field: "callerName", required: true },
      { field: "language", required: true },
      { field: "callerSex", required: true },
      { field: "callerAge", required: true },
      { field: "sameAsCaller", required: true },
      { field: "relationship", required: false },
      { field: "clientName", required: false },
      { field: "clientSex", required: true },
      { field: "clientAge", required: false },
      { field: "difficulty", required: true },
      { field: "nationality", required: true },
      { field: "region", required: true },
      { field: "clientDistrict", required: true },
      { field: "howDidYouHear", required: true },
      { field: "reason", required: true },
      { field: "accessed", required: true },
      { field: "caseAssessment", required: true },
      { field: "howLong", required: true },
      { field: "servicesPrior", required: true },
      { field: "servicesOffered", required: true },
      { field: "message", required: false },
      { field: "peerReferral", required: true },
      { field: "sessionList", required: true },
    ];

    const totalRequired = questions.filter((q) => q.required).length;
    const filledRequired = questions.filter(
      (q) => q.required && formData[q.field] && formData[q.field].length > 0
    ).length;

    return Math.round((filledRequired / totalRequired) * 100);
  };

  const handleSessionChange = (e, index) => {
    const { name, value } = e.target;
    const list = [...sessionList];
    list[index][name] = value;
    setSessionList(list);
  };

  const handleSessionAdd = () => {
    setSessionList([...sessionList, { session: "", session_date: new Date() }]);
  };

  const handleSessionRemove = (index) => {
    const list = [...sessionList];
    list.splice(index, 1);
    setSessionList(list);
  };

  if (!open) return null;

  return (
    <ContentFrame
      open={open}
      onClose={onClose}
      title={
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <Typography variant="h6">Client Sessions</Typography>
        </Box>
      }
      headerColor="#400036"
    >
      <Box sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
        {/* Search and Actions Header */}
        <Box sx={{ p: 2, borderBottom: 1, borderColor: "divider" }}>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 1,
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <TextField
                size="small"
                placeholder="Search Client Record..."
                value={searchQuery}
                onChange={handleSearchChange}
                sx={{
                  width: 200,
                  boxShadow: "2px 2px 10px 0px rgba(0, 0, 0, 0.2)",
                }}
                InputProps={{
                  endAdornment: searchQuery && (
                    <Tooltip title="Clear Search">
                      <IconButton onClick={clearSearch}>
                        <ClearIcon
                          sx={{
                            color: "black",
                            fontSize: 20,
                          }}
                        />
                      </IconButton>
                    </Tooltip>
                  ),
                  startAdornment: searchLoading && (
                    <CircularProgress size={20} sx={{ mr: 1 }} />
                  ),
                }}
              />
              <Button variant="contained" onClick={handleSearch} size="medium">
                Search
              </Button>
            </Box>

            {/* Date Range Filter */}
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <DateRangeIcon sx={{ color: "primary.main", fontSize: 20 }} />
              <LocalizationProvider dateAdapter={AdapterDateFns}>
                <DatePicker
                  label="From"
                  value={dateRange.startDate}
                  onChange={(newValue) =>
                    setDateRange((prev) => ({ ...prev, startDate: newValue }))
                  }
                  slotProps={{
                    textField: {
                      size: "small",
                      sx: { width: 150 },
                    },
                  }}
                  maxDate={dateRange.endDate || new Date()}
                />
                <DatePicker
                  label="To"
                  value={dateRange.endDate}
                  onChange={(newValue) =>
                    setDateRange((prev) => ({ ...prev, endDate: newValue }))
                  }
                  slotProps={{
                    textField: {
                      size: "small",
                      sx: { width: 150 },
                    },
                  }}
                  minDate={dateRange.startDate}
                  maxDate={new Date()}
                />
              </LocalizationProvider>
              {(dateRange.startDate || dateRange.endDate) && (
                <Tooltip title="Clear Date Filter">
                  <IconButton
                    size="small"
                    onClick={() =>
                      setDateRange({ startDate: null, endDate: null })
                    }
                    sx={{ color: "error.main" }}
                  >
                    <ClearIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              )}
            </Box>

            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Button
                variant="contained"
                color="primary"
                startIcon={<AddIcon />}
                onClick={handleNewSession}
                size="small"
              >
                New Session
              </Button>
              <Tooltip title="Refresh">
                <IconButton
                  onClick={() => fetchPosts(currentPage)}
                  aria-label="refresh"
                >
                  <RefreshIcon />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>
        </Box>

        {/* Main Content - Make it scrollable */}
        <Box
          sx={{
            flex: 1,
            overflow: "auto",
            p: 2,
            pb: 8, // Add padding bottom to prevent content from being hidden behind pagination
          }}
        >
          {loading ? (
            <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
              <CircularProgress />
            </Box>
          ) : filteredPosts.length === 0 ? (
            <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
              <Typography color="text.secondary">
                {searchQuery
                  ? "No results found"
                  : dateRange.startDate || dateRange.endDate
                  ? "No records found for the selected date range"
                  : "No records available"}
              </Typography>
            </Box>
          ) : (
            <Grid container spacing={2}>
              {filteredPosts.map((post) => (
                <Grid item xs={12} sm={6} md={4} key={post._id}>
                  <Card
                    sx={{
                      height: "100%",
                      display: "flex",
                      flexDirection: "column",
                      transition: "all 0.2s ease",
                      "&:hover": {
                        transform: "translateY(-4px)",
                        boxShadow: (theme) => theme.shadows[8],
                      },
                    }}
                  >
                    <CardContent sx={{ flexGrow: 1 }}>
                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "space-between",
                          mb: 2,
                        }}
                      >
                        <Typography variant="h6" sx={{ fontWeight: 300 }}>
                          {post.callerName}
                        </Typography>
                        {/* Add more icon inside the chip */}
                        <Chip
                          size="small"
                          label="View Details"
                          sx={{
                            backgroundColor: "#164773",
                            color: "#fff",
                          }}
                          variant="filled"
                          onClick={() => handleDetailView(post)}
                          //   White color for the icon
                          icon={<InfoIcon color="white" />}
                        />
                      </Box>

                      <Box
                        sx={{
                          display: "flex",
                          flexDirection: "column",
                          gap: 1,
                        }}
                      >
                        <Box sx={{ display: "flex", alignItems: "center" }}>
                          <PersonIcon
                            sx={{ mr: 1, color: "primary.main", fontSize: 20 }}
                          />
                          <Typography variant="body2">
                            {post.callerName}
                          </Typography>
                        </Box>
                        <Box sx={{ display: "flex", alignItems: "center" }}>
                          <PhoneIcon
                            sx={{ mr: 1, color: "primary.main", fontSize: 20 }}
                          />
                          <Typography variant="body2">{post.mobile}</Typography>
                        </Box>
                        <Box sx={{ display: "flex", alignItems: "center" }}>
                          <CalendarIcon
                            sx={{ mr: 1, color: "primary.main", fontSize: 20 }}
                          />
                          <Typography variant="body2">
                            {new Date(post.createdAt).toLocaleDateString()}
                          </Typography>
                        </Box>
                        <Box sx={{ display: "flex", alignItems: "center" }}>
                          <InfoIcon
                            sx={{ mr: 1, color: "primary.main", fontSize: 20 }}
                          />
                          <Tooltip title="Hover to reveal sensitive information">
                            <Typography
                              variant="body2"
                              sx={{
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                display: "-webkit-box",
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: "vertical",
                                filter: "blur(2px)",
                                transition: "filter 0.3s ease",
                                cursor: "pointer",
                                "&:hover": {
                                  filter: "blur(0)",
                                },
                              }}
                            >
                              {post.reason || "No reason provided"}
                            </Typography>
                          </Tooltip>
                        </Box>
                      </Box>

                      <Divider sx={{ my: 2 }} />

                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <Chip
                          size="small"
                          label={`${post.sessionCount || 0} sessions`}
                          color="secondary"
                        />
                        <Box>
                          <Tooltip title="Edit Record">
                            <IconButton
                              size="small"
                              onClick={() => handleEdit(post)}
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete Record">
                            <IconButton
                              size="small"
                              onClick={() => handleDelete(post._id)}
                              color="error"
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </Box>

        {/* Sticky Pagination Footer */}
        <Box
          sx={{
            position: "sticky",
            bottom: 0,
            left: 0,
            right: 0,
            p: 2,
            borderTop: 1,
            borderColor: "divider",
            bgcolor: "background.paper",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: 2,
            zIndex: 1,
            backdropFilter: "blur(8px)",
            boxShadow: "0px -4px 8px -4px rgba(0, 0, 0, 0.1)",
          }}
        >
          <Typography variant="body2" color="text.secondary">
            Showing {filteredPosts.length} of {posts.length} results
            {(dateRange.startDate || dateRange.endDate) && " (filtered)"}
          </Typography>
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        </Box>
      </Box>

      {/* Edit Dialog */}
      <Dialog
        open={isEditDialogOpen}
        onClose={() => setIsEditDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                backgroundColor: "#036",
                color: "#fff",
                borderRadius: "5px",
                padding: "15px",
              }}
            >
              <Typography variant="h6">
                Edit Client Session ~{" "}
                <span style={{ color: "red" }}>{formData.callerName}</span>
              </Typography>

              <Tooltip title="Close">
                <IconButton
                  onClick={() => setIsEditDialogOpen(false)}
                  size="small"
                  style={{
                    color: "#fff",
                    backgroundColor: "#BD2A2E",
                    borderRadius: "5px",
                  }}
                >
                  <CloseIcon />
                </IconButton>
              </Tooltip>
            </Box>
            {/* Divider */}
            <Divider
              sx={{
                width: "50%",
                borderColor: "divider",
                borderWidth: 1,
              }}
            />
            <Box sx={{ width: "100%" }}>
              <Box
                sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}
              >
                <Typography variant="body2" color="text.secondary">
                  Form Completion
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {calculateFormCompletion()}%
                </Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={calculateFormCompletion()}
                sx={{
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: "grey.200",
                  "& .MuiLinearProgress-bar": {
                    borderRadius: 4,
                    backgroundColor: (theme) => {
                      const completion = calculateFormCompletion();
                      if (completion >= 85) return theme.palette.success.main;
                      if (completion >= 50) return theme.palette.primary.main;
                      return theme.palette.error.main;
                    },
                  },
                }}
              />
            </Box>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          <ClientFormFields
            formData={formData}
            handleChange={handleChange}
            handleChangeMulti={handleChangeMulti}
            handleRadioChange={handleRadioChange}
            sessionList={sessionList}
            handleSessionChange={handleSessionChange}
            handleSessionAdd={handleSessionAdd}
            handleSessionRemove={handleSessionRemove}
          />
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setIsEditDialogOpen(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            onClick={() => handleSubmit(false)}
            variant="contained"
            disabled={isSubmitting}
            startIcon={
              isSubmitting && (
                <CircularProgress sx={{ color: "#348343" }} size={20} />
              )
            }
          >
            {isSubmitting ? "Saving..." : "Save Changes"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* New Session Dialog */}
      <Dialog
        open={isNewDialogOpen}
        onClose={() => setIsNewDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                backgroundColor: "#042326",
                color: "#fff",
                borderRadius: "5px",
                padding: "15px",
              }}
            >
              <Typography variant="h6">New Client Session</Typography>
              <Tooltip title="Close">
                <IconButton
                  onClick={() => setIsNewDialogOpen(false)}
                  size="small"
                  style={{
                    color: "#fff",
                    backgroundColor: "#BD2A2E",
                    borderRadius: "5px",
                  }}
                >
                  <CloseIcon />
                </IconButton>
              </Tooltip>
            </Box>
            <Box sx={{ width: "100%" }}>
              <Box
                sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}
              >
                <Typography variant="body2" color="text.secondary">
                  Form Completion
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {calculateFormCompletion()}%
                </Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={calculateFormCompletion()}
                sx={{
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: "grey.200",
                  "& .MuiLinearProgress-bar": {
                    borderRadius: 4,
                    backgroundColor: (theme) => {
                      const completion = calculateFormCompletion();
                      if (completion >= 85) return theme.palette.success.main;
                      if (completion >= 50) return theme.palette.primary.main;
                      return theme.palette.error.main;
                    },
                  },
                }}
              />
            </Box>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          <ClientFormFields
            formData={formData}
            handleChange={handleChange}
            handleChangeMulti={handleChangeMulti}
            handleRadioChange={handleRadioChange}
            sessionList={sessionList}
            handleSessionChange={handleSessionChange}
            handleSessionAdd={handleSessionAdd}
            handleSessionRemove={handleSessionRemove}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2.5, borderTop: 1, borderColor: "divider" }}>
          <Button
            onClick={() => {
              resetForm();
              setIsNewDialogOpen(false);
            }}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            onClick={() => handleSubmit(true)}
            variant="contained"
            color="primary"
            disabled={isSubmitting || !formData.consentV1Accepted}
            startIcon={isSubmitting && <CircularProgress size={20} />}
          >
            {isSubmitting ? "Submitting..." : "Submit Session"}
          </Button>
        </DialogActions>
      </Dialog>

      <ClientDetailView
        open={isDetailViewOpen}
        onClose={() => setIsDetailViewOpen(false)}
        post={selectedPost}
        handleEdit={handleEdit}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteDialog.open}
        onClose={() => setDeleteDialog({ open: false, id: null })}
        onConfirm={confirmDelete}
        title="Delete Record"
        message="Are you sure you want to delete this record? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        variant="error"
      />
    </ContentFrame>
  );
};

export default Clients;
