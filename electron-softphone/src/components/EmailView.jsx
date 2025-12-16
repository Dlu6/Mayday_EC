// import React, { useState } from "react";
// import ContentFrame from "./ContentFrame";
// import {
//   Box,
//   Grid,
//   Paper,
//   Typography,
//   List,
//   ListItem,
//   ListItemText,
//   ListItemAvatar,
//   Avatar,
//   IconButton,
//   TextField,
//   InputAdornment,
//   Fab,
//   Divider,
//   Menu,
//   MenuItem,
//   ListItemIcon,
//   Badge,
//   Tooltip,
//   Dialog,
//   DialogTitle,
//   DialogContent,
//   DialogActions,
//   Button,
// } from "@mui/material";
// import {
//   Search,
//   Mail as MailIcon,
//   Send,
//   Delete,
//   Star,
//   StarBorder,
//   Refresh,
//   Edit,
//   AttachFile,
//   Image,
//   Description,
//   Archive,
//   MoreVert,
//   Reply,
//   Forward,
// } from "@mui/icons-material";

// // Dummy data for emails
// const dummyEmails = [
//   {
//     id: 1,
//     from: "Salongo Sunday",
//     email: "salongo.sunday@example.com",
//     subject: "Counselling Session Schedule",
//     content:
//       "Hi, Sunday, Jackie your counsellor for today. I'll be with you for the next 30 minutes. We do a video chat? Confirm your availability.",
//     timestamp: "10:30 AM",
//     unread: true,
//     starred: false,
//     avatar: "JS",
//   },
//   // Add more dummy emails...
// ];

// const EmailView = ({ open, onClose }) => {
//   const [emails, setEmails] = useState(dummyEmails);
//   const [selectedEmail, setSelectedEmail] = useState(null);
//   const [searchQuery, setSearchQuery] = useState("");
//   const [composeOpen, setComposeOpen] = useState(false);
//   const [newEmail, setNewEmail] = useState({
//     to: "",
//     from: "",
//     subject: "",
//     content: "",
//     replyTo: null,
//     isReply: false,
//     isForward: false,
//   });
//   const [replyMode, setReplyMode] = useState(false);
//   const [forwardMode, setForwardMode] = useState(false);

//   // Email handlers
//   const handleEmailSelect = (email) => {
//     setSelectedEmail(email);
//     // Mark as read
//     setEmails(
//       emails.map((e) => (e.id === email.id ? { ...e, unread: false } : e))
//     );
//   };

//   const handleStarEmail = (emailId) => {
//     setEmails(
//       emails.map((email) =>
//         email.id === emailId ? { ...email, starred: !email.starred } : email
//       )
//     );
//   };

//   const handleDeleteEmail = (emailId) => {
//     setEmails(emails.filter((email) => email.id !== emailId));
//     if (selectedEmail?.id === emailId) {
//       setSelectedEmail(null);
//     }
//   };

//   // Compose handlers
//   const handleCompose = () => {
//     setComposeOpen(true);
//     setNewEmail({ to: "", subject: "", content: "" });
//   };

//   const handleReply = (email) => {
//     setReplyMode(true);
//     setComposeOpen(true);
//     setNewEmail({
//       to: email.email,
//       from: "user@example.com", // Replace with actual user email
//       subject: `Re: ${email.subject}`,
//       content: `\n\n-------- Original Message --------\nFrom: ${email.from}\nDate: ${email.timestamp}\nSubject: ${email.subject}\n\n${email.content}`,
//       replyTo: email.id,
//       isReply: true,
//       isForward: false,
//     });
//   };

//   const handleForward = (email) => {
//     setForwardMode(true);
//     setComposeOpen(true);
//     setNewEmail({
//       to: "",
//       from: "user@example.com", // Replace with actual user email
//       subject: `Fwd: ${email.subject}`,
//       content: `\n\n-------- Forwarded Message --------\nFrom: ${email.from}\nDate: ${email.timestamp}\nSubject: ${email.subject}\n\n${email.content}`,
//       replyTo: email.id,
//       isReply: false,
//       isForward: true,
//     });
//   };

//   const handleSendEmail = () => {
//     const newId = emails.length + 1;
//     const newEmailObj = {
//       id: newId,
//       from: "You",
//       email: "user@example.com", // Replace with actual user email
//       subject: newEmail.subject,
//       content: newEmail.content,
//       timestamp: new Date().toLocaleTimeString([], {
//         hour: "2-digit",
//         minute: "2-digit",
//       }),
//       unread: false,
//       starred: false,
//       avatar: "ME",
//       replyTo: newEmail.replyTo,
//     };

//     setEmails([newEmailObj, ...emails]);
//     setComposeOpen(false);
//     setReplyMode(false);
//     setForwardMode(false);
//     setNewEmail({
//       to: "",
//       from: "",
//       subject: "",
//       content: "",
//       replyTo: null,
//       isReply: false,
//       isForward: false,
//     });
//   };

//   return (
//     <ContentFrame
//       open={open}
//       onClose={onClose}
//       title="Email"
//       headerColor="#1976d2"
//     >
//       <Box sx={{ height: "100%", display: "flex" }}>
//         {/* Email List */}
//         <Paper
//           sx={{
//             width: 320,
//             borderRight: 1,
//             borderColor: "divider",
//             height: "100%",
//             display: "flex",
//             flexDirection: "column",
//           }}
//         >
//           {/* Search and Actions */}
//           <Box sx={{ width: "100%", p: 2 }}>
//             <TextField
//               size="small"
//               placeholder="Search emails..."
//               value={searchQuery}
//               onChange={(e) => setSearchQuery(e.target.value)}
//               InputProps={{
//                 startAdornment: (
//                   <InputAdornment position="start">
//                     <Search />
//                   </InputAdornment>
//                 ),
//               }}
//             />
//           </Box>

//           {/* Email List */}
//           <List sx={{ flex: 1, overflow: "auto" }}>
//             {emails.map((email) => (
//               <ListItem
//                 key={email.id}
//                 button
//                 selected={selectedEmail?.id === email.id}
//                 onClick={() => handleEmailSelect(email)}
//                 sx={{
//                   borderBottom: 1,
//                   borderColor: "divider",
//                   bgcolor: email.unread ? "action.hover" : "transparent",
//                 }}
//               >
//                 <ListItemAvatar>
//                   <Badge
//                     color="primary"
//                     variant="dot"
//                     invisible={!email.unread}
//                   >
//                     <Avatar>{email.avatar}</Avatar>
//                   </Badge>
//                 </ListItemAvatar>
//                 <ListItemText
//                   primary={email.subject}
//                   secondary={email.from}
//                   primaryTypographyProps={{
//                     noWrap: true,
//                     fontWeight: email.unread ? 600 : 400,
//                   }}
//                 />
//                 <IconButton
//                   size="small"
//                   onClick={(e) => {
//                     e.stopPropagation();
//                     handleStarEmail(email.id);
//                   }}
//                 >
//                   {email.starred ? (
//                     <Star sx={{ color: "warning.main" }} />
//                   ) : (
//                     <StarBorder />
//                   )}
//                 </IconButton>
//               </ListItem>
//             ))}
//           </List>

//           {/* Compose Button */}
//           <Box sx={{ p: 2 }}>
//             <Fab
//               variant="extended"
//               color="primary"
//               fullWidth
//               onClick={handleCompose}
//             >
//               <Edit sx={{ mr: 1 }} />
//               Compose
//             </Fab>
//           </Box>
//         </Paper>

//         {/* Email Content */}
//         <Box sx={{ flex: 1, p: 3, display: "flex", flexDirection: "column" }}>
//           {selectedEmail ? (
//             <>
//               <Box sx={{ mb: 3 }}>
//                 <Typography variant="h5">{selectedEmail.subject}</Typography>
//                 <Typography variant="subtitle2" color="text.secondary">
//                   From: {selectedEmail.from} ({selectedEmail.email})
//                 </Typography>
//               </Box>
//               <Typography>{selectedEmail.content}</Typography>
//               <Box sx={{ mt: "auto", pt: 2 }}>
//                 <Button
//                   variant="contained"
//                   startIcon={<Reply />}
//                   sx={{ mr: 1 }}
//                   onClick={() => handleReply(selectedEmail)}
//                 >
//                   Reply
//                 </Button>
//                 <Button
//                   variant="outlined"
//                   startIcon={<Forward />}
//                   sx={{ mr: 1 }}
//                   onClick={() => handleForward(selectedEmail)}
//                 >
//                   Forward
//                 </Button>
//                 <Button
//                   variant="outlined"
//                   color="error"
//                   startIcon={<Delete />}
//                   onClick={() => handleDeleteEmail(selectedEmail.id)}
//                 >
//                   Delete
//                 </Button>
//               </Box>
//             </>
//           ) : (
//             <Box
//               sx={{
//                 height: "100%",
//                 display: "flex",
//                 alignItems: "center",
//                 justifyContent: "center",
//               }}
//             >
//               <Typography color="text.secondary">
//                 Select an email to view
//               </Typography>
//             </Box>
//           )}
//         </Box>
//       </Box>

//       {/* Compose Dialog */}
//       <Dialog
//         open={composeOpen}
//         onClose={() => {
//           setComposeOpen(false);
//           setReplyMode(false);
//           setForwardMode(false);
//           setNewEmail({
//             to: "",
//             from: "",
//             subject: "",
//             content: "",
//             replyTo: null,
//             isReply: false,
//             isForward: false,
//           });
//         }}
//         maxWidth="md"
//         fullWidth
//       >
//         <DialogTitle>
//           {replyMode
//             ? "Reply to Email"
//             : forwardMode
//             ? "Forward Email"
//             : "New Email"}
//         </DialogTitle>
//         <DialogContent>
//           <TextField
//             fullWidth
//             label="To"
//             margin="normal"
//             value={newEmail.to}
//             onChange={(e) => setNewEmail({ ...newEmail, to: e.target.value })}
//           />
//           <TextField
//             fullWidth
//             label="Subject"
//             margin="normal"
//             value={newEmail.subject}
//             onChange={(e) =>
//               setNewEmail({ ...newEmail, subject: e.target.value })
//             }
//           />
//           <TextField
//             fullWidth
//             label="Message"
//             multiline
//             rows={8}
//             margin="normal"
//             value={newEmail.content}
//             onChange={(e) =>
//               setNewEmail({ ...newEmail, content: e.target.value })
//             }
//           />
//         </DialogContent>
//         <DialogActions>
//           <Button
//             onClick={() => {
//               setComposeOpen(false);
//               setReplyMode(false);
//               setForwardMode(false);
//             }}
//           >
//             Cancel
//           </Button>
//           <Button
//             variant="contained"
//             onClick={handleSendEmail}
//             startIcon={<Send />}
//             disabled={!newEmail.to || !newEmail.subject}
//           >
//             Send
//           </Button>
//         </DialogActions>
//       </Dialog>
//     </ContentFrame>
//   );
// };

// export default EmailView;
