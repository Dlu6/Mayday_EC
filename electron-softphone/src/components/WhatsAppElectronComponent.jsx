import React, { useState, useRef, useEffect } from "react";
import {
  Box,
  TextField,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Typography,
  IconButton,
  InputAdornment,
  Badge,
  Divider,
  Paper,
  Menu,
  MenuItem,
  ListItemIcon,
  Tooltip,
  Popper,
  ClickAwayListener,
  CircularProgress,
  Chip,
  Stack,
  ImageList,
  ImageListItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormControl,
  FormLabel,
  Alert,
  Switch,
  Checkbox,
} from "@mui/material";
import {
  Search,
  MoreVert,
  Check as CheckIcon,
  CheckCircle as CheckCircleIcon,
  Message as MessageIcon,
  ArrowBack,
  Send,
  AttachFile,
  EmojiEmotions,
  InsertDriveFile,
  PhotoLibrary,
  Poll,
  Close as CloseIcon,
  Clear as ClearIcon,
  VideoFile,
  PlayArrow,
  CropSquare,
  Crop169,
  CropFree,
  Delete as DeleteIcon,
  Call,
  Reply as ReplyIcon,
  Download,
  MoreHoriz,
  Refresh as RefreshIcon,
  Check,
  Schedule,
} from "@mui/icons-material";
import AddIcon from "@mui/icons-material/Add";
import ContentFrame from "./ContentFrame";
import moment from "moment";
import EmojiPicker from "emoji-picker-react";
import ReactCrop, { centerCrop, makeAspectCrop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import whatsAppService from "../services/whatsAppService";
import { io } from "socket.io-client";
import {
  storageService,
  canInitializeServices,
} from "../services/storageService";
import logoutManager from "../services/logoutManager";

// Dummy data for chats and messages
const dummyChats = [
  {
    id: 1,
    name: "Councelor X",
    phoneNumber: "0700771301",
    avatar: "JS",
    lastMessage: "Thanks for your help with the project!",
    timestamp: "2024-02-20T10:30:00",
    unread: 2,
    status: "read",
    isOnline: true,
    messages: [
      {
        id: 1,
        text: "Hi, how are you?",
        timestamp: "2024-02-20T10:25:00",
        sender: "user",
        status: "read",
      },
      {
        id: 2,
        text: "I'm good, thanks! How about you?",
        timestamp: "2024-02-20T10:27:00",
        sender: "contact",
        status: "read",
      },
      {
        id: 3,
        text: "Thanks for your help with the project!",
        timestamp: "2024-02-20T10:30:00",
        sender: "contact",
        status: "read",
      },
    ],
  },
  {
    id: 2,
    name: "Councelor Y",
    phoneNumber: "0700771302",
    avatar: "AJ",
    lastMessage: "When can we schedule the meeting?",
    timestamp: "2024-02-20T09:15:00",
    unread: 0,
    status: "delivered",
    isOnline: false,
    messages: [],
  },
  {
    id: 3,
    name: "Clinical Team",
    phoneNumber: "0700771303",
    avatar: "MT",
    lastMessage: "Bob: Let's discuss the new campaign",
    timestamp: "2024-02-19T16:45:00",
    unread: 5,
    status: "sent",
    isGroup: true,
    messages: [],
  },
];

import serverConfig from "../config/serverConfig";

const API_BASE_URL = `${serverConfig.apiUrl}/api`;
const socketUrl = serverConfig.apiUrl;

const sendWhatsAppMessage = async (messageData) => {
  try {
    const response = await fetch(`${API_BASE_URL}/whatsapp/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(messageData),
    });

    if (!response.ok) {
      throw new Error("Failed to send WhatsApp message");
    }

    return await response.json();
  } catch (error) {
    console.error("Error sending WhatsApp message:", error);
    throw error;
  }
};

const WhatsAppElectronComponent = ({ open, onClose, initialChat = null }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedChat, setSelectedChat] = useState(null);
  const [newMessage, setNewMessage] = useState("");
  const [unreadCounts, setUnreadCounts] = useState({});
  const [attachmentMenuAnchor, setAttachmentMenuAnchor] = useState(null);
  const [emojiPickerAnchor, setEmojiPickerAnchor] = useState(null);
  const textFieldRef = useRef(null);
  const [attachedFiles, setAttachedFiles] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [mediaFiles, setMediaFiles] = useState([]);
  const [cropDialogOpen, setCropDialogOpen] = useState(false);
  const [currentImage, setCurrentImage] = useState(null);
  const [crop, setCrop] = useState();
  const [aspect, setAspect] = useState(undefined);
  const [completedCrop, setCompletedCrop] = useState(null);
  const imgRef = useRef(null);
  const previewCanvasRef = useRef(null);
  const [pollDialogOpen, setPollDialogOpen] = useState(false);
  const [pollData, setPollData] = useState({
    question: "",
    options: ["", ""],
    allowMultiple: false,
  });
  const [pollError, setPollError] = useState("");
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [emojiReactionAnchor, setEmojiReactionAnchor] = useState(null);
  const [messageMenuAnchor, setMessageMenuAnchor] = useState(null);
  const [replyingTo, setReplyingTo] = useState(null);
  const messagesEndRef = useRef(null);
  const [chats, setChats] = useState(dummyChats);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [whatsappConfig, setWhatsappConfig] = useState(null);
  const [selectedMedia, setSelectedMedia] = useState(null);
  const [socket, setSocket] = useState(null);

  const fetchChatMessages = async (phoneNumber) => {
    try {
      const response = await whatsAppService.getChatMessages(phoneNumber);
      if (response.success) {
        setSelectedChat((prev) => ({
          ...prev,
          messages: response.data,
        }));
      }
    } catch (error) {
      console.error("Error fetching messages:", error);
    }
  };

  const handleChatSelect = async (chat) => {
    if (socket) {
      // Leave previous chat room if any
      if (selectedChat) {
        socket.emit("whatsapp:leave", { contactId: selectedChat.phoneNumber });
      }
      // Join new chat room
      socket.emit("whatsapp:join", { contactId: chat.phoneNumber });
    }

    setSelectedChat(chat);
    await fetchChatMessages(chat.phoneNumber);
  };

  const handleBackToList = () => {
    if (socket && selectedChat) {
      socket.emit("whatsapp:leave", { contactId: selectedChat.phoneNumber });
    }
    setSelectedChat(null);
  };

  const handleReplyClick = (message) => {
    setReplyingTo(message);
    textFieldRef.current?.focus();
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() && !attachedFiles.length && !mediaFiles.length)
      return;

    try {
      const messageData = {
        text: newMessage,
        timestamp: new Date().toISOString(),
        status: "pending",
      };

      const tempId = `temp-${Date.now()}`;
      const tempMessage = {
        id: tempId,
        ...messageData,
        sender: "user",
      };

      setSelectedChat((prev) => ({
        ...prev,
        messages: [...prev.messages, tempMessage],
      }));

      const response = await whatsAppService.sendChatMessage(
        selectedChat.phoneNumber,
        messageData
      );

      // Update both chat list and selected chat with real message ID
      setChats((prevChats) =>
        prevChats.map((chat) =>
          chat.phoneNumber === selectedChat.phoneNumber
            ? {
                ...chat,
                lastMessage: newMessage,
                lastMessageId: response.messageId,
                status: "sent",
                timestamp: messageData.timestamp,
              }
            : chat
        )
      );

      setSelectedChat((prev) => ({
        ...prev,
        messages: prev.messages.map((msg) =>
          msg.id === tempId
            ? { ...msg, id: response.messageId, status: "sent" }
            : msg
        ),
      }));

      setNewMessage("");
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  const formatTimestamp = (timestamp) => {
    return moment(timestamp).calendar(null, {
      sameDay: "LT",
      lastDay: "[Yesterday]",
      lastWeek: "dddd",
      sameElse: "DD/MM/YYYY",
    });
  };

  const getMessageStatus = (status) => {
    const commonStyle = { fontSize: 16, ml: 0.5 };

    switch (status) {
      case "sent":
        return <Check sx={{ ...commonStyle, color: "grey.500" }} />;
      case "delivered":
        return (
          <Box sx={{ display: "flex" }}>
            <Check sx={{ ...commonStyle, color: "grey.500", mr: -0.5 }} />
            <Check sx={{ ...commonStyle, color: "grey.500" }} />
          </Box>
        );
      case "read":
        return (
          <Box sx={{ display: "flex" }}>
            <Check sx={{ ...commonStyle, color: "#34B7F1", mr: -0.5 }} />
            <Check sx={{ ...commonStyle, color: "#34B7F1" }} />
          </Box>
        );
      default:
        return <Schedule sx={{ ...commonStyle, color: "grey.500" }} />;
    }
  };

  // Handle attachment menu
  const handleAttachmentClick = (event) => {
    setAttachmentMenuAnchor(event.currentTarget);
  };

  const handleAttachmentClose = () => {
    setAttachmentMenuAnchor(null);
  };

  const handleAttachmentSelect = (type) => {
    switch (type) {
      case "file":
        handleFileAttachment();
        break;
      case "media":
        handleMediaAttachment();
        break;

      case "poll":
        handlePollAttachment();
        break;
      default:
        break;
    }
    handleAttachmentClose();
  };

  // Attachment handlers
  const handleFileAttachment = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.multiple = true;
    input.onchange = (e) => {
      const files = Array.from(e.target.files || []);
      const newFiles = files.map((file, index) => ({
        id: `file_${Date.now()}_${index}`,
        file,
        name: file.name,
        size: file.size,
        type: file.type,
        progress: 0,
      }));
      setAttachedFiles((prev) => [...prev, ...newFiles]);
    };
    input.click();
  };

  const handleMediaAttachment = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*,video/*";
    input.multiple = true;
    input.onchange = (e) => {
      const files = Array.from(e.target.files || []);
      files.forEach((file, index) => {
        if (file.type.startsWith("image/")) {
          const reader = new FileReader();
          reader.onload = () => {
            setCurrentImage({
              file,
              preview: reader.result,
              id: `image_${Date.now()}_${index}`,
            });
            setCropDialogOpen(true);
          };
          reader.readAsDataURL(file);
        } else {
          const newFile = {
            id: `video_${Date.now()}_${index}`,
            file,
            name: file.name,
            size: file.size,
            type: file.type,
            progress: 0,
          };
          setMediaFiles((prev) => [...prev, newFile]);
        }
      });
    };
    input.click();
  };

  const handlePollAttachment = () => {
    setPollDialogOpen(true);
    handleAttachmentClose();
  };

  const handleAddPollOption = () => {
    if (pollData.options.length >= 10) {
      setPollError("Maximum 10 options allowed");
      return;
    }
    setPollData((prev) => ({
      ...prev,
      options: [...prev.options, ""],
    }));
    setPollError("");
  };

  const handleRemovePollOption = (index) => {
    if (pollData.options.length <= 2) {
      setPollError("Minimum 2 options required");
      return;
    }
    setPollData((prev) => ({
      ...prev,
      options: prev.options.filter((_, i) => i !== index),
    }));
    setPollError("");
  };

  const handlePollOptionChange = (index, value) => {
    setPollData((prev) => ({
      ...prev,
      options: prev.options.map((option, i) => (i === index ? value : option)),
    }));
  };

  const handleCreatePoll = () => {
    // Validate poll data
    if (!pollData.question.trim()) {
      setPollError("Please enter a question");
      return;
    }

    if (pollData.options.some((opt) => !opt.trim())) {
      setPollError("Please fill all options");
      return;
    }

    if (new Set(pollData.options).size !== pollData.options.length) {
      setPollError("Options must be unique");
      return;
    }

    // Create poll message
    const newPollMessage = {
      id: Date.now(),
      type: "poll",
      question: pollData.question,
      options: pollData.options.map((option) => ({
        text: option,
        votes: 0,
        voters: [],
      })),
      allowMultiple: pollData.allowMultiple,
      totalVotes: 0,
      timestamp: moment().format(),
      sender: "user",
      status: "sent",
    };

    // Add poll to chat
    setSelectedChat((prev) => ({
      ...prev,
      messages: [...prev.messages, newPollMessage],
    }));

    // Reset and close dialog
    setPollData({
      question: "",
      options: ["", ""],
      allowMultiple: false,
    });
    setPollError("");
    setPollDialogOpen(false);
  };

  const handleEmojiPickerToggle = (event) => {
    setEmojiPickerAnchor(emojiPickerAnchor ? null : event.currentTarget);
  };

  const handleEmojiSelect = (emojiData) => {
    const { emoji } = emojiData;
    const start = textFieldRef.current?.selectionStart || 0;
    const end = textFieldRef.current?.selectionEnd || 0;
    const text = newMessage;

    const newText = text.slice(0, start) + emoji + text.slice(end);
    setNewMessage(newText);

    // Set cursor position after emoji
    setTimeout(() => {
      const newPosition = start + emoji.length;
      textFieldRef.current?.setSelectionRange(newPosition, newPosition);
      textFieldRef.current?.focus();
    }, 0);
  };

  const handleRemoveFile = (fileId) => {
    setAttachedFiles((prev) => prev.filter((f) => f.id !== fileId));
  };

  const handleRemoveMedia = (fileId) => {
    setMediaFiles((prev) => {
      const fileToRemove = prev.find((f) => f.id === fileId);
      if (fileToRemove?.preview) {
        URL.revokeObjectURL(fileToRemove.preview);
      }
      return prev.filter((f) => f.id !== fileId);
    });
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  // Render file attachments preview
  const renderFileAttachments = () => {
    if (attachedFiles.length === 0) return null;

    return (
      <Stack
        direction="row"
        spacing={1}
        sx={{
          p: 1,
          overflowX: "auto",
          bgcolor: "background.paper",
          borderRadius: 1,
          mb: 1,
        }}
      >
        {attachedFiles.map((file) => (
          <Chip
            key={file.id}
            icon={<InsertDriveFile />}
            label={
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Typography noWrap sx={{ maxWidth: 150 }}>
                  {file.name}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  ({formatFileSize(file.size)})
                </Typography>
                {file.progress > 0 && file.progress < 100 && (
                  <CircularProgress
                    size={16}
                    value={file.progress}
                    variant="determinate"
                  />
                )}
              </Box>
            }
            onDelete={() => handleRemoveFile(file.id)}
            deleteIcon={<ClearIcon />}
            sx={{
              maxWidth: 250,
              "& .MuiChip-label": {
                display: "flex",
                alignItems: "center",
              },
            }}
          />
        ))}
      </Stack>
    );
  };

  // Render media previews
  const renderMediaPreviews = () => {
    if (mediaFiles.length === 0) return null;

    return (
      <Box
        sx={{
          p: 1,
          bgcolor: "background.paper",
          borderRadius: 1,
          mb: 1,
        }}
      >
        <ImageList
          sx={{
            width: "100%",
            maxHeight: 200,
            m: 0,
          }}
          cols={4}
          rowHeight={100}
        >
          {mediaFiles.map((file) => (
            <ImageListItem
              key={file.id}
              sx={{
                position: "relative",
                cursor: "pointer",
                "&:hover .media-overlay": {
                  opacity: 1,
                },
              }}
            >
              {file.type.startsWith("image/") ? (
                <img
                  src={file.preview}
                  alt={file.name}
                  loading="lazy"
                  style={{
                    height: "100%",
                    width: "100%",
                    objectFit: "cover",
                  }}
                />
              ) : (
                <Box
                  sx={{
                    height: "100%",
                    width: "100%",
                    bgcolor: "black",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <VideoFile sx={{ fontSize: 40, color: "white" }} />
                  <PlayArrow
                    sx={{
                      position: "absolute",
                      fontSize: 30,
                      color: "white",
                    }}
                  />
                </Box>
              )}
              {/* Progress Overlay */}
              {file.progress > 0 && file.progress < 100 && (
                <Box
                  sx={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    bgcolor: "rgba(0,0,0,0.5)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <CircularProgress
                    variant="determinate"
                    value={file.progress}
                    sx={{ color: "white" }}
                  />
                </Box>
              )}
              {/* Remove Button */}
              <IconButton
                size="small"
                onClick={() => handleRemoveMedia(file.id)}
                sx={{
                  position: "absolute",
                  top: 4,
                  right: 4,
                  bgcolor: "rgba(0,0,0,0.6)",
                  color: "white",
                  "&:hover": {
                    bgcolor: "rgba(0,0,0,0.8)",
                  },
                }}
              >
                <ClearIcon fontSize="small" />
              </IconButton>
            </ImageListItem>
          ))}
        </ImageList>
      </Box>
    );
  };

  const handlePollVote = (messageId, optionIndex, previousVote) => {
    setSelectedChat((prev) => ({
      ...prev,
      messages: prev.messages.map((message) => {
        if (message.id === messageId && message.type === "poll") {
          // Create a copy of options array
          const updatedOptions = message.options.map((option, index) => {
            if (message.allowMultiple) {
              // For multiple choice polls
              if (index === optionIndex) {
                // Toggle vote
                const hasVoted = option.voters.includes("user");
                return {
                  ...option,
                  votes: hasVoted ? option.votes - 1 : option.votes + 1,
                  voters: hasVoted
                    ? option.voters.filter((voter) => voter !== "user")
                    : [...option.voters, "user"],
                };
              }
              return option;
            } else {
              // For single choice polls
              if (index === optionIndex) {
                // Add vote to selected option
                return {
                  ...option,
                  votes: option.votes + 1,
                  voters: [...option.voters, "user"],
                };
              } else if (index === previousVote) {
                // Remove vote from previous option
                return {
                  ...option,
                  votes: option.votes - 1,
                  voters: option.voters.filter((voter) => voter !== "user"),
                };
              }
              return option;
            }
          });

          // Calculate new total votes
          const newTotalVotes = updatedOptions.reduce(
            (sum, option) => sum + option.votes,
            0
          );

          return {
            ...message,
            options: updatedOptions,
            totalVotes: newTotalVotes,
          };
        }
        return message;
      }),
    }));
  };

  // Update renderMessage to better handle image display
  const renderMessage = (message) => (
    <Box
      key={message.id}
      sx={{
        display: "flex",
        justifyContent:
          message.sender === "contact" ? "flex-start" : "flex-end",
        mb: 1,
      }}
    >
      <Paper
        sx={{
          maxWidth: "70%",
          p: 1.5,
          bgcolor: message.sender === "contact" ? "#fff" : "#dcf8c6",
          borderRadius: 2,
          position: "relative",
          "&::before": {
            content: '""',
            position: "absolute",
            top: 0,
            [message.sender === "contact" ? "left" : "right"]: -10,
            borderStyle: "solid",
            borderWidth: "10px 10px 0 0",
            borderColor: `${
              message.sender === "contact" ? "#fff" : "#dcf8c6"
            } transparent transparent transparent`,
            transform: message.sender === "contact" ? "none" : "scaleX(-1)",
          },
        }}
      >
        <Typography variant="body1">{message.text}</Typography>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
          }}
        >
          <Typography
            variant="caption"
            sx={{
              color: "text.secondary",
              mr: 0.5,
            }}
          >
            {formatTimestamp(message.timestamp)}
          </Typography>
          {message.sender !== "contact" && getMessageStatus(message.status)}
        </Box>
      </Paper>
    </Box>
  );

  // Enhanced centerAspectCrop function
  function centerAspectCrop(mediaWidth, mediaHeight, aspect) {
    return centerCrop(
      makeAspectCrop(
        {
          unit: "%",
          width: 90,
          height: aspect ? (90 * (mediaHeight / mediaWidth)) / aspect : 90,
        },
        aspect,
        mediaWidth,
        mediaHeight
      ),
      mediaWidth,
      mediaHeight
    );
  }

  // Update preview canvas whenever crop changes
  useEffect(() => {
    if (
      completedCrop?.width &&
      completedCrop?.height &&
      imgRef.current &&
      previewCanvasRef.current
    ) {
      const image = imgRef.current;
      const canvas = previewCanvasRef.current;
      const crop = completedCrop;

      const scaleX = image.naturalWidth / image.width;
      const scaleY = image.naturalHeight / image.height;
      const ctx = canvas.getContext("2d");

      const pixelRatio = window.devicePixelRatio;

      canvas.width = crop.width * pixelRatio;
      canvas.height = crop.height * pixelRatio;

      ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      ctx.imageSmoothingQuality = "high";

      ctx.drawImage(
        image,
        crop.x * scaleX,
        crop.y * scaleY,
        crop.width * scaleX,
        crop.height * scaleY,
        0,
        0,
        crop.width,
        crop.height
      );
    }
  }, [completedCrop]);

  const handleImageLoad = (e) => {
    const { width, height } = e.currentTarget;
    const initialCrop = centerAspectCrop(width, height, aspect);
    setCrop(initialCrop);
    setCompletedCrop(initialCrop);
  };

  const handleCropComplete = async () => {
    if (!currentImage || !completedCrop) return;

    const canvas = document.createElement("canvas");
    const image = imgRef.current;
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;

    canvas.width = completedCrop.width * scaleX;
    canvas.height = completedCrop.height * scaleY;

    const ctx = canvas.getContext("2d");
    ctx.imageSmoothingQuality = "high";

    ctx.drawImage(
      image,
      completedCrop.x * scaleX,
      completedCrop.y * scaleY,
      completedCrop.width * scaleX,
      completedCrop.height * scaleY,
      0,
      0,
      completedCrop.width * scaleX,
      completedCrop.height * scaleY
    );

    // Convert canvas to blob with maximum quality
    canvas.toBlob(
      (blob) => {
        const croppedFile = new File([blob], currentImage.file.name, {
          type: currentImage.file.type,
        });

        const newFile = {
          id: `image_${Date.now()}`,
          file: croppedFile,
          name: currentImage.file.name,
          size: blob.size,
          type: currentImage.file.type,
          progress: 0,
          preview: URL.createObjectURL(blob),
        };

        setMediaFiles((prev) => [...prev, newFile]);
        setCropDialogOpen(false);
        setCurrentImage(null);
        setCrop(undefined);
        setCompletedCrop(null);
      },
      currentImage.file.type,
      1 // Maximum quality
    );
  };

  // Enhanced Crop Dialog
  const renderCropDialog = () => (
    <Dialog
      open={cropDialogOpen}
      onClose={() => {
        setCropDialogOpen(false);
        setCurrentImage(null);
        setCrop(undefined);
        setCompletedCrop(null);
      }}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: {
          height: "90vh",
          display: "flex",
          flexDirection: "column",
        },
      }}
    >
      <DialogTitle
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          bgcolor: "#128C7E",
          color: "white",
          p: 2,
        }}
      >
        <Typography variant="h6">Edit Image</Typography>
        <Box sx={{ display: "flex", gap: 1 }}>
          <Tooltip title="Square">
            <IconButton
              size="small"
              onClick={() => setAspect(1)}
              sx={{
                color: aspect === 1 ? "primary.light" : "white",
                bgcolor: aspect === 1 ? "rgba(255,255,255,0.2)" : "transparent",
                "&:hover": { bgcolor: "rgba(255,255,255,0.3)" },
              }}
            >
              <CropSquare />
            </IconButton>
          </Tooltip>
          <Tooltip title="Landscape">
            <IconButton
              size="small"
              onClick={() => setAspect(16 / 9)}
              sx={{
                color: aspect === 16 / 9 ? "primary.light" : "white",
                bgcolor:
                  aspect === 16 / 9 ? "rgba(255,255,255,0.2)" : "transparent",
                "&:hover": { bgcolor: "rgba(255,255,255,0.3)" },
              }}
            >
              <Crop169 />
            </IconButton>
          </Tooltip>
          <Tooltip title="Free">
            <IconButton
              size="small"
              onClick={() => setAspect(undefined)}
              sx={{
                color: !aspect ? "primary.light" : "white",
                bgcolor: !aspect ? "rgba(255,255,255,0.2)" : "transparent",
                "&:hover": { bgcolor: "rgba(255,255,255,0.3)" },
              }}
            >
              <CropFree />
            </IconButton>
          </Tooltip>
        </Box>
      </DialogTitle>
      <DialogContent
        sx={{
          p: 2,
          display: "flex",
          gap: 2,
          flexGrow: 1,
          overflow: "hidden",
        }}
      >
        <Box
          sx={{
            flexGrow: 1,
            overflow: "auto",
            bgcolor: "#f0f0f0",
            borderRadius: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {currentImage && (
            <ReactCrop
              crop={crop}
              onChange={(_, percentCrop) => setCrop(percentCrop)}
              onComplete={(c) => setCompletedCrop(c)}
              aspect={aspect}
              className="reactCrop"
            >
              <img
                ref={imgRef}
                alt="Crop me"
                src={currentImage.preview}
                style={{
                  maxWidth: "100%",
                  maxHeight: "70vh",
                }}
                onLoad={handleImageLoad}
              />
            </ReactCrop>
          )}
        </Box>

        {/* Preview Panel */}
        <Box
          sx={{
            width: 280,
            display: "flex",
            flexDirection: "column",
            gap: 2,
          }}
        >
          <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>
            Preview
          </Typography>
          <Box
            sx={{
              width: "100%",
              aspectRatio: "1",
              bgcolor: "#f0f0f0",
              borderRadius: 1,
              overflow: "hidden",
            }}
          >
            <canvas
              ref={previewCanvasRef}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "contain",
              }}
            />
          </Box>
        </Box>
      </DialogContent>
      <DialogActions sx={{ p: 2, gap: 1 }}>
        <Button
          onClick={() => {
            setCropDialogOpen(false);
            setCurrentImage(null);
            setCrop(undefined);
            setCompletedCrop(null);
          }}
        >
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleCropComplete}
          disabled={!completedCrop?.width || !completedCrop?.height}
        >
          Done
        </Button>
      </DialogActions>
    </Dialog>
  );

  // Poll Creation Dialog
  const renderPollDialog = () => (
    <Dialog
      open={pollDialogOpen}
      onClose={() => setPollDialogOpen(false)}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
        },
      }}
    >
      <DialogTitle
        sx={{
          bgcolor: "#128C7E",
          color: "white",
          display: "flex",
          alignItems: "center",
          gap: 1,
        }}
      >
        <Poll />
        Create Poll
      </DialogTitle>
      <DialogContent sx={{ pt: 3 }}>
        {pollError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {pollError}
          </Alert>
        )}
        <TextField
          fullWidth
          label="Question"
          value={pollData.question}
          onChange={(e) =>
            setPollData((prev) => ({
              ...prev,
              question: e.target.value,
            }))
          }
          sx={{ mb: 3, mt: 2 }}
        />
        <FormControl component="fieldset" sx={{ width: "100%" }}>
          <FormLabel component="legend" sx={{ mb: 2 }}>
            Options
          </FormLabel>
          {pollData.options.map((option, index) => (
            <Box
              key={index}
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
                mb: 2,
              }}
            >
              <TextField
                fullWidth
                value={option}
                onChange={(e) => handlePollOptionChange(index, e.target.value)}
                placeholder={`Option ${index + 1}`}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Radio disabled checked={false} />
                    </InputAdornment>
                  ),
                }}
              />
              <IconButton
                onClick={() => handleRemovePollOption(index)}
                disabled={pollData.options.length <= 2}
                color="error"
                size="small"
              >
                <DeleteIcon />
              </IconButton>
            </Box>
          ))}
          <Button
            startIcon={<AddIcon />}
            onClick={handleAddPollOption}
            disabled={pollData.options.length >= 10}
            sx={{ mt: 1 }}
          >
            Add Option
          </Button>
        </FormControl>
        <FormControlLabel
          control={
            <Switch
              checked={pollData.allowMultiple}
              onChange={(e) =>
                setPollData((prev) => ({
                  ...prev,
                  allowMultiple: e.target.checked,
                }))
              }
            />
          }
          label="Allow multiple answers"
          sx={{ mt: 2 }}
        />
      </DialogContent>
      <DialogActions sx={{ p: 2, gap: 1 }}>
        <Button onClick={() => setPollDialogOpen(false)}>Cancel</Button>
        <Button
          variant="contained"
          onClick={handleCreatePoll}
          disabled={
            !pollData.question.trim() ||
            pollData.options.some((opt) => !opt.trim())
          }
        >
          Create Poll
        </Button>
      </DialogActions>
    </Dialog>
  );

  const handleRefresh = async () => {
    setLoading(true);
    try {
      await fetchChats();
      if (selectedChat) {
        await fetchChatMessages(selectedChat.phoneNumber);
      }
    } catch (error) {
      setError("Failed to refresh chats");
      console.error("Error refreshing:", error);
    } finally {
      setLoading(false);
    }
  };

  const renderHeader = () => {
    if (!selectedChat) {
      // Chat list header
      return (
        <Box
          sx={{
            px: 2,
            py: 1,
            bgcolor: "#154B52",
            borderRadius: "20px",
            color: "white",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 2,
            minHeight: 64,
          }}
        >
          <Typography variant="h6">WhatsApp Chats</Typography>
          <Box sx={{ display: "flex", gap: 1 }}>
            <Tooltip title="Refresh">
              <IconButton
                onClick={handleRefresh}
                disabled={loading}
                sx={{
                  color: "white",
                  "&:hover": { bgcolor: "rgba(255,255,255,0.1)" },
                }}
              >
                {loading ? (
                  <CircularProgress size={24} sx={{ color: "white" }} />
                ) : (
                  <RefreshIcon />
                )}
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
      );
    }

    // Chat detail header (only shown when selectedChat exists)
    return (
      <Box
        sx={{
          px: 2,
          py: 1,
          bgcolor: "#154B52",
          borderRadius: "20px",
          color: "white",
          display: "flex",
          alignItems: "center",
          gap: 2,
          borderBottom: "1px solid rgba(255,255,255,0.1)",
          minHeight: 64,
        }}
      >
        <IconButton onClick={handleBackToList}>
          <ArrowBack />
        </IconButton>
        <Avatar>{selectedChat.avatar}</Avatar>
        {/* Rest of the chat detail header */}
      </Box>
    );
  };

  // Add reply preview above the input field
  const renderReplyPreview = () => {
    if (!replyingTo) return null;

    return (
      <Box
        sx={{
          p: 1,
          bgcolor: "background.paper",
          borderTop: "1px solid",
          borderColor: "divider",
          display: "flex",
          alignItems: "center",
          gap: 1,
        }}
      >
        <Box
          sx={{
            borderLeft: "4px solid #128C7E",
            pl: 1,
            flexGrow: 1,
          }}
        >
          <Typography variant="caption" color="primary">
            Replying to{" "}
            {replyingTo.sender === "user" ? "yourself" : selectedChat.name}
          </Typography>
          <Typography variant="body2" noWrap>
            {replyingTo.text || "Media message"}
          </Typography>
        </Box>
        <IconButton size="small" onClick={() => setReplyingTo(null)}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>
    );
  };

  // Add download functionality
  const handleDownloadFile = (message) => {
    if (message.fileUrl) {
      const link = document.createElement("a");
      link.href = message.fileUrl;
      link.download = message.fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  // Add cleanup function using useEffect
  useEffect(() => {
    return () => {
      // Cleanup function to revoke object URLs when component unmounts
      setSelectedChat((prev) => {
        if (!prev) return prev;
        prev.messages.forEach((message) => {
          if (message.type === "image" && message.url) {
            URL.revokeObjectURL(message.url);
          }
        });
        return prev;
      });
    };
  }, []);

  // Add this function to handle smooth scrolling
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Add useEffect to scroll when messages change
  useEffect(() => {
    if (selectedChat?.messages) {
      scrollToBottom();
    }
  }, [selectedChat?.messages]);

  // Add effect to handle initialChat
  useEffect(() => {
    if (initialChat) {
      // Check if chat already exists
      const existingChat = chats.find(
        (chat) => chat.phoneNumber === initialChat.phoneNumber
      );

      if (!existingChat) {
        // Add new chat to list
        setChats((prev) => [initialChat, ...prev]);
      }

      // Select the chat
      handleChatSelect(existingChat || initialChat);
    }
  }, [initialChat]);

  const fetchChats = async () => {
    // Check if logout is in progress using centralized logout manager
    if (logoutManager.shouldBlockApiCalls()) {
      console.log("🔒 Skipping fetchChats during logout");
      return;
    }

    try {
      setLoading(true);
      setError(null); // Clear any previous errors
      const response = await whatsAppService.getChats();
      // console.log("API Response:", response);

      if (response.success) {
        const chats = response.data.map((contact) => ({
          id: contact.id,
          name: contact.name || contact.phoneNumber,
          phoneNumber: contact.phoneNumber,
          avatar:
            contact?.avatar ||
            contact?.name?.substring(0, 2).toUpperCase() ||
            "UN",
          lastMessage: contact?.lastMessage || "",
          timestamp: contact.lastInteraction,
          unread: contact.unreadCount || 0,
          status: contact.status || "offline",
          isOnline: contact.isOnline || false,
          isGroup: contact.isGroup || false,
          messages: contact.messageHistory || [],
        }));

        setChats(chats);
        const initialUnreadCounts = chats.reduce(
          (acc, chat) => ({ ...acc, [chat.id]: chat.unreadCount || 0 }),
          {}
        );
        setUnreadCounts(initialUnreadCounts);

        if (initialChat) {
          const chat = chats.find(
            (c) => c.phoneNumber === initialChat.phoneNumber
          );
          if (chat) {
            handleChatSelect(chat);
          }
        }
      } else {
        throw new Error(response.error || "Failed to load chats");
      }
    } catch (error) {
      // Don't show errors during logout
      if (logoutManager.shouldBlockApiCalls()) {
        console.log("🔒 Error during logout - not setting error state");
        return;
      }

      console.error("Error fetching chats:", error);
      setError(error.message || "Failed to load chats");
    } finally {
      // Only update loading state if not logging out
      if (!logoutManager.shouldBlockApiCalls()) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    // Check if services can be initialized (has token and not logging out)
    if (!canInitializeServices()) {
      console.log(
        "Cannot initialize services - no auth token or logout in progress"
      );
      return;
    }
    fetchChats();

    // Cleanup function to cancel requests on unmount or logout
    return () => {
      if (logoutManager.shouldBlockApiCalls()) {
        whatsAppService.cancelAllRequests();
      }
    };
  }, []);

  useEffect(() => {
    // Check if services can be initialized (has token and not logging out)
    if (!canInitializeServices()) {
      console.log(
        "Cannot initialize services - no auth token or logout in progress"
      );
      return;
    }

    const fetchConfig = async () => {
      // Check if logout is in progress using centralized logout manager
      if (logoutManager.shouldBlockApiCalls()) {
        console.log("🔒 Skipping fetchConfig during logout");
        return;
      }

      try {
        const response = await whatsAppService.getWhatsAppConfig();
        if (response.success) {
          setWhatsappConfig(response.data);
        }
      } catch (error) {
        // Don't show errors during logout
        if (logoutManager.shouldBlockApiCalls()) {
          console.log("🔒 Error during logout - not setting error state");
          return;
        }

        console.error("Error fetching WhatsApp config:", error);
      }
    };
    fetchConfig();
  }, []);

  // Register with centralized logout manager
  useEffect(() => {
    // Register this component with the logout manager
    const unregister = logoutManager.onLogout(async () => {
      console.log("🔒 Logout callback executed - cancelling WhatsApp requests");
      whatsAppService.cancelAllRequests();
    });

    // Cleanup on unmount
    return () => {
      unregister();
    };
  }, []);

  // Socket connection effect
  useEffect(() => {
    // Check if services can be initialized (has token and not logging out)
    if (!canInitializeServices()) {
      console.log(
        "Cannot initialize services - no auth token or logout in progress"
      );
      return;
    }

    const token = storageService.getAuthToken();
    const newSocket = io(socketUrl, {
      auth: {
        token: `Bearer ${token}`,
      },
      transports: ["websocket"],
      upgrade: false,
      reconnection: true,
      reconnectionAttempts: 3,
      reconnectionDelay: 1000,
    });

    newSocket.on("whatsapp:message", (data) => {
      console.log("Received whatsapp message:", data);
      const { message, contact } = data;

      // Format the incoming message to match our expected structure
      const formattedMessage = {
        id: message.id,
        text: message.text,
        timestamp: message.timestamp,
        sender: "contact",
        status: "received",
        type: message.type || "text",
      };

      // Update the chat list
      setChats((prevChats) => {
        return prevChats.map((chat) => {
          if (chat.phoneNumber === contact.phoneNumber) {
            return {
              ...chat,
              lastMessage: message.text,
              timestamp: message.timestamp,
              unread:
                selectedChat?.phoneNumber === contact.phoneNumber
                  ? 0
                  : (chat.unread || 0) + 1,
            };
          }
          return chat;
        });
      });

      // Update the selected chat if we're in it
      if (selectedChat?.phoneNumber === contact.phoneNumber) {
        setSelectedChat((prev) => ({
          ...prev,
          messages: [...(prev.messages || []), formattedMessage],
          lastMessage: message.text,
          timestamp: message.timestamp,
        }));
      }
    });

    setSocket(newSocket);
    return () => newSocket.close();
  }, []);

  useEffect(() => {
    if (!socket) return;

    // Listen for status updates
    socket.on("whatsapp:status_update", ({ messageId, status, timestamp }) => {
      console.log("Status update received:", { messageId, status, timestamp });

      // Update both chat list and selected chat
      setChats((prevChats) =>
        prevChats.map((chat) => {
          // Only update status if this chat has the message as its last message
          const isLastMessage =
            chat.messages?.length > 0 &&
            chat.messages[chat.messages.length - 1].id === messageId;

          return {
            ...chat,
            status: isLastMessage ? status : chat.status,
            lastMessageId: isLastMessage ? messageId : chat.lastMessageId,
          };
        })
      );

      setSelectedChat((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          messages: prev.messages.map((msg) =>
            msg.id === messageId
              ? { ...msg, status, timestamp: timestamp || msg.timestamp }
              : msg
          ),
        };
      });
    });

    return () => {
      socket.off("whatsapp:status_update");
    };
  }, [socket]);

  useEffect(() => {
    if (!socket) return;

    // Listen for new messages
    socket.on("whatsapp:message", (data) => {
      console.log("New message received:", data);
      const { message, contact } = data;

      const formattedMessage = {
        id: message.id,
        text: message.text,
        timestamp: message.timestamp,
        sender: "contact",
        status: "received",
        type: message.type || "text",
      };

      // Update chats list
      setChats((prevChats) => {
        const chatExists = prevChats.some(
          (chat) => chat.phoneNumber === contact.phoneNumber
        );
        if (!chatExists) {
          // Fetch updated chat list if new chat
          whatsAppService
            .getChats()
            .then((response) => setChats(response.data));
        }
        return prevChats.map((chat) =>
          chat.phoneNumber === contact.phoneNumber
            ? {
                ...chat,
                lastMessage: message.text,
                timestamp: message.timestamp,
                unread:
                  selectedChat?.phoneNumber === contact.phoneNumber
                    ? 0
                    : (chat.unread || 0) + 1,
              }
            : chat
        );
      });

      // Update selected chat if it's the current conversation
      if (selectedChat?.phoneNumber === contact.phoneNumber) {
        setSelectedChat((prev) => ({
          ...prev,
          messages: [...(prev.messages || []), formattedMessage],
          lastMessage: message.text,
          timestamp: message.timestamp,
        }));
      }
    });

    return () => {
      socket.off("whatsapp:status_update");
      socket.off("whatsapp:message");
    };
  }, [socket, selectedChat?.phoneNumber]);

  return (
    <ContentFrame
      open={open}
      onClose={onClose}
      title={renderHeader()}
      headerColor="#128C7E"
    >
      {!selectedChat ? (
        // Chat List View
        <>
          {/* Search Bar */}
          <Box
            sx={{
              p: 2,
              backgroundColor: "white",
              boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
            }}
          >
            <TextField
              fullWidth
              placeholder="Search or start new chat"
              size="small"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search sx={{ color: "#54656f" }} />
                  </InputAdornment>
                ),
              }}
              sx={{
                "& .MuiOutlinedInput-root": {
                  backgroundColor: "#f0f2f5",
                  transition: "all 0.2s",
                  "&:hover": {
                    backgroundColor: "#e9edef",
                  },
                  "&.Mui-focused": {
                    backgroundColor: "#fff",
                    boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                  },
                },
              }}
            />
          </Box>

          {/* Add loading indicator */}
          {loading ? (
            <Box sx={{ display: "flex", justifyContent: "center", p: 3 }}>
              <CircularProgress size={40} sx={{ color: "#128C7E" }} />
            </Box>
          ) : error ? (
            <Alert severity="error" sx={{ m: 2 }}>
              {error}
            </Alert>
          ) : null}

          {/* Chat List */}
          <List sx={{ p: 0, bgcolor: "background.paper" }}>
            {chats
              .filter(
                (chat) =>
                  chat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  chat.phoneNumber.includes(searchQuery)
              )
              .map((chat, index) => (
                <ListItem
                  button
                  key={chat.id}
                  onClick={() => handleChatSelect(chat)}
                  sx={{
                    py: 1.5,
                    px: 2,
                    transition: "all 0.2s",
                    "&:hover": {
                      backgroundColor: "#f5f6f6",
                    },
                  }}
                >
                  <ListItemAvatar>
                    <Badge
                      overlap="circular"
                      anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                      variant="dot"
                      sx={{
                        "& .MuiBadge-badge": {
                          backgroundColor: chat.isOnline
                            ? "#25D366"
                            : "transparent",
                          border: chat.isOnline ? "2px solid #fff" : "none",
                        },
                      }}
                    >
                      <Avatar
                        sx={{
                          bgcolor: chat.isGroup ? "#128C7E" : "#00A884",
                          width: 48,
                          height: 48,
                        }}
                      >
                        {chat.isGroup ? <MessageIcon /> : chat?.avatar}
                      </Avatar>
                    </Badge>
                  </ListItemAvatar>
                  <ListItemText
                    primary={
                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <Typography
                          variant="subtitle1"
                          sx={{ fontWeight: chat.unread ? 600 : 400 }}
                        >
                          {chat.name}
                        </Typography>
                        <Typography
                          variant="caption"
                          sx={{
                            color: chat.unread ? "#00A884" : "#667781",
                            fontWeight: chat.unread ? 500 : 400,
                          }}
                        >
                          {formatTimestamp(chat.timestamp)}
                        </Typography>
                      </Box>
                    }
                    secondary={
                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 0.5,
                          }}
                        >
                          {!chat.isGroup && getMessageStatus(chat.status)}
                          <Typography
                            variant="body2"
                            sx={{
                              color: chat.unread ? "#111b21" : "#667781",
                              fontWeight: chat.unread ? 500 : 400,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                              maxWidth: "260px",
                            }}
                          >
                            {chat.lastMessage}
                          </Typography>
                        </Box>
                        {chat.unread > 0 && (
                          <Badge
                            badgeContent={chat.unread}
                            sx={{
                              "& .MuiBadge-badge": {
                                bgcolor: "#00A884",
                                color: "white",
                                fontSize: "11px",
                                minWidth: "20px",
                                height: "20px",
                                borderRadius: "10px",
                              },
                            }}
                          />
                        )}
                      </Box>
                    }
                  />
                </ListItem>
              ))}
          </List>

          {/* Add this right after the search TextField (around line 1791) */}
          {!loading &&
            chats.filter(
              (chat) =>
                chat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                chat.phoneNumber.includes(searchQuery)
            ).length === 0 && (
              <Box sx={{ p: 3, textAlign: "center" }}>
                <Typography color="textSecondary">
                  {searchQuery ? "No chats found" : "No chats available"}
                </Typography>
              </Box>
            )}
        </>
      ) : (
        // Chat Detail View
        <Box sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
          {/* Messages Area */}
          <Box
            sx={{
              flexGrow: 1,
              overflow: "auto",
              p: 2,
              bgcolor: "#efeae2",
              backgroundImage: 'url("path/to/whatsapp-bg.png")', // You can add a WhatsApp-style background
              backgroundRepeat: "repeat",
              overflowY: "auto",
            }}
          >
            {selectedChat.messages.map(renderMessage)}
            <div ref={messagesEndRef} />
          </Box>

          {/* File & Media Previews */}
          {renderFileAttachments()}
          {renderMediaPreviews()}

          {/* Add reply preview before the input area */}
          {renderReplyPreview()}

          {/* Message Input */}
          <Box
            sx={{
              p: 2,
              bgcolor: "#f0f2f5",
              display: "flex",
              alignItems: "center",
              gap: 1,
              position: "relative",
            }}
          >
            <Tooltip title={emojiPickerAnchor ? "Close" : "Emoji"}>
              <IconButton
                onClick={handleEmojiPickerToggle}
                sx={{
                  color: emojiPickerAnchor ? "primary.main" : "inherit",
                  transition: "all 0.2s",
                  "&:hover": {
                    backgroundColor: "rgba(0,0,0,0.04)",
                  },
                }}
              >
                {emojiPickerAnchor ? <CloseIcon /> : <EmojiEmotions />}
              </IconButton>
            </Tooltip>
            <Tooltip title={attachmentMenuAnchor ? "Close" : "Attach"}>
              <IconButton
                onClick={
                  attachmentMenuAnchor
                    ? handleAttachmentClose
                    : handleAttachmentClick
                }
                sx={{
                  transition: "transform 0.2s",
                  transform: attachmentMenuAnchor ? "rotate(45deg)" : "none",
                }}
              >
                {attachmentMenuAnchor ? <AddIcon /> : <AttachFile />}
              </IconButton>
            </Tooltip>
            <TextField
              fullWidth
              placeholder="Type a message"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
              inputRef={textFieldRef}
              variant="outlined"
              size="small"
              sx={{
                "& .MuiOutlinedInput-root": {
                  borderRadius: 3,
                  bgcolor: "#fff",
                },
              }}
            />
            <IconButton
              color="primary"
              onClick={handleSendMessage}
              disabled={
                (!newMessage.trim() &&
                  attachedFiles.length === 0 &&
                  mediaFiles.length === 0) ||
                isUploading
              }
            >
              {isUploading ? <CircularProgress size={24} /> : <Send />}
            </IconButton>

            {/* Emoji Picker Popper */}
            <Popper
              open={Boolean(emojiPickerAnchor)}
              anchorEl={emojiPickerAnchor}
              placement="top-start"
              sx={{
                zIndex: 1300,
              }}
            >
              <ClickAwayListener onClickAway={() => setEmojiPickerAnchor(null)}>
                <Paper
                  elevation={8}
                  sx={{
                    mb: 1,
                    borderRadius: 2,
                    overflow: "hidden",
                    "&:before": {
                      content: '""',
                      display: "block",
                      position: "absolute",
                      bottom: -6,
                      left: 12,
                      transform: "rotate(45deg)",
                      width: 12,
                      height: 12,
                      bgcolor: "background.paper",
                      boxShadow: "3px 3px 5px rgba(0,0,0,0.05)",
                      zIndex: 0,
                    },
                  }}
                >
                  <EmojiPicker
                    onEmojiClick={handleEmojiSelect}
                    autoFocusSearch={false}
                    searchPlaceHolder="Search emoji"
                    width={352}
                    height={450}
                    previewConfig={{
                      showPreview: false,
                    }}
                    skinTonesDisabled
                    searchDisabled={false}
                    lazyLoadEmojis
                    theme="light"
                  />
                </Paper>
              </ClickAwayListener>
            </Popper>
          </Box>

          {/* Enhanced Attachment Menu */}
          <Menu
            anchorEl={attachmentMenuAnchor}
            open={Boolean(attachmentMenuAnchor)}
            onClose={handleAttachmentClose}
            anchorOrigin={{
              vertical: "top",
              horizontal: "center",
            }}
            transformOrigin={{
              vertical: "bottom",
              horizontal: "center",
            }}
            PaperProps={{
              elevation: 8,
              sx: {
                mt: -2,
                borderRadius: 2,
                boxShadow:
                  "0 2px 8px rgba(0,0,0,0.15), 0 8px 16px rgba(0,0,0,0.1)",
                "& .MuiMenuItem-root": {
                  py: 0.5,
                  px: 1,
                  transition: "all 0.2s",
                  "&:hover": {
                    backgroundColor: "rgba(0,0,0,0.04)",
                    transform: "translateX(4px)",
                  },
                },
              },
            }}
            slotProps={{
              paper: {
                sx: {
                  width: 250,
                },
              },
            }}
          >
            <MenuItem onClick={() => handleAttachmentSelect("file")}>
              <ListItemIcon>
                <InsertDriveFile sx={{ color: "#5F66CD" }} />
              </ListItemIcon>
              <ListItemText primary="Document" secondary="Share files" />
            </MenuItem>
            <MenuItem onClick={() => handleAttachmentSelect("media")}>
              <ListItemIcon>
                <PhotoLibrary sx={{ color: "#1E88E5" }} />
              </ListItemIcon>
              <ListItemText
                primary="Photos & Videos"
                secondary="Share photos or videos"
              />
            </MenuItem>

            <MenuItem onClick={() => handleAttachmentSelect("poll")}>
              <ListItemIcon>
                <Poll sx={{ color: "#8E24AA" }} />
              </ListItemIcon>
              <ListItemText primary="Poll" secondary="Create a poll" />
            </MenuItem>
          </Menu>
        </Box>
      )}
      {renderCropDialog()}
      {renderPollDialog()}
    </ContentFrame>
  );
};

export default WhatsAppElectronComponent;
