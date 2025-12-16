import mongoose from "mongoose";

const userSchema = mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  password: { type: String, required: true },
  firstName: { type: String },
  lastName: { type: String },
  user_role: {
    type: String,
    enum: ["SUPERVISOR", "ADMIN", "CREATOR"],
    default: "CREATOR",
  },
});

const User = mongoose.model("User", userSchema);

export default User;
