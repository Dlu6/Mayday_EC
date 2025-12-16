import mongoose from "mongoose";

const postSchema = mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  consentV1Text: { type: String },
  consentV1Accepted: { type: Boolean, default: false },
  consentV1AcceptedAt: { type: Date },
  feedbackConsentText: { type: String },
  feedbackConsentAccepted: { type: Boolean, default: false },
  feedbackConsentAcceptedAt: { type: Date },
  callerName: String,
  mobile: Number,
  callerSex: String,
  clientSex: String,
  caseSource: String,
  peerReferral: String,
  sameAsCaller: { type: String, default: "Yes" },
  clientName: String,
  clientDistrict: String,
  relationship: String,
  language: String,
  callerAge: String,
  clientAge: String,
  difficulty: [String],
  howDidYouHear: [String],
  caseAssessment: [String],
  servicesPrior: [String],
  servicesOffered: [String],
  nationality: {
    type: String,
    enum: [
      "Ugandan",
      "Congolese",
      "Rwandese",
      "Sudanese",
      "Kenyan",
      "Somali",
      "Tanzanian",
      "Others",
      "", // Allow empty for backwards compatibility
    ],
  },
  region: {
    type: String,
    enum: ["Central", "Eastern", "Northern", "Western", "Others", ""],
  },
  accessed: [String],
  message: String,
  reason: String,
  howLong: String,
  name: String,
  creator: String,
  sessionList: [
    { session: String, session_date: { type: Date, default: new Date() } },
  ],
  // sessionCount: { type: Number, default: 1 },
  createdAt: {
    type: Date,
    default: new Date(),
  },
});

// Add a virtual property for sessionCount
postSchema.virtual("sessionCount").get(function () {
  return this.sessionList && this.sessionList.length
    ? this.sessionList.length
    : 1;
});

// Ensure virtuals are included when converting to JSON
postSchema.set("toJSON", { virtuals: true });
postSchema.set("toObject", { virtuals: true });

var PostMessage = mongoose.model("PostMessage", postSchema);

export default PostMessage;
