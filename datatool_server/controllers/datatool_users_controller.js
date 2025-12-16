// server/controllers/datatool_users_controller.js
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import User from "../models/datatoolUsersModel.js";

const secret = "testhjzvdbnfvADHG878HM5@#$";

export const signin = async (req, res) => {
  const { email, password } = req.body;

  try {
    const oldUser = await User.findOne({ email });

    if (!oldUser)
      return res.status(404).json({ message: "User doesn't exist" });

    const isPasswordCorrect = await bcrypt.compare(password, oldUser.password);

    if (!isPasswordCorrect)
      return res.status(400).json({ message: "Invalid credentials" });

    const token = jwt.sign({ email: oldUser.email, id: oldUser._id }, secret, {
      expiresIn: "24h",
    });

    res.status(200).json({ result: oldUser, token });
  } catch (err) {
    res.status(500).json({ message: "Something went wrong" });
  }
};

export const signup = async (req, res) => {
  const { email, password, firstName, lastName } = req.body;

  try {
    const oldUser = await User.findOne({ email });

    if (oldUser)
      return res.status(400).json({ message: "User already exists" });

    const hashedPassword = await bcrypt.hash(password, 12);

    const result = await User.create({
      email,
      password: hashedPassword,
      name: `${firstName} ${lastName}`,
    });
    // console.log(result)

    const token = jwt.sign({ email: result.email, id: result._id }, secret, {
      expiresIn: "24h",
    });

    res.status(201).json({ result, token });
  } catch (error) {
    res.status(500).json({ message: "User must be Unique!" });

    console.log(error);
  }
};

export const getUsers = async (req, res) => {
  try {
    if (req.params.role == "ADMIN") {
      const users = await User.find();
      res.status(200).json({ data: users });

      // res.status(200).json(users);
    } else {
      const users = await User.find({ creator: req.params.userId });
      res.json({ data: users });
    }
  } catch (error) {
    res.status(404).json({ message: error.message });
  }
};

export const getUser = async (req, res) => {
  const { id } = req.params;

  try {
    // console.log(req.params.role, req.params.userId)
    if (req.params.role == "ADMIN" || req.params.role == "CREATOR") {
      const counselor = await User.findById(id);

      res.status(200).json(counselor);
    } else {
      if (req.params.role == "CREATOR") {
        const counselor = await User.find({
          id: id,
          creator: req.params.userId,
        });

        res.status(200).json(counselor);
      }
    }
  } catch (error) {
    console.log(error);
    res.status(404).json({ message: error });
  }
};

export const createUser = async (req, res) => {
  const { email, password, firstName, lastName, user_role } = req.body;
  // console.log(user_role.value)

  try {
    if (req.params.role == "ADMIN") {
      const oldUser = await User.findOne({ email });

      if (oldUser)
        return res.status(400).json({ message: "User already Exists" });

      const hashedPassword = await bcrypt.hash(password, 12);

      const result = await User.create({
        email,
        password: hashedPassword,
        name: `${firstName} ${lastName}`,
        user_role: user_role.value,
      });

      const token = jwt.sign({ email: result.email, id: result._id }, secret, {
        expiresIn: "24h",
      });

      res.status(201).json({ result, token });
    } else {
      res.status(400).json({ message: "Only Admins can Create Users!" });
    }
  } catch (error) {
    res.status(501).json({ message: "User must be Unique!" });
    console.log(error);
  }
};

export const profileUpdate = async (req, res) => {
  const { email, password, user_role } = req.body;
  // console.log(user_role)
  try {
    if (req.params.role == "ADMIN") {
      // console.log("XXXXXXXXXXX")
      const hashedPassword = await bcrypt.hash(password, 12);
      const filter = { _id: req.params.resourceUserId };
      const update = {
        password: hashedPassword,
        user_role,
      };
      // console.log(email)
      User.findOneAndUpdate(
        filter,
        { $set: update },
        { useFindAndModify: false },
        function (err) {
          if (err) return console.error(err);
        }
      );
      res.status(202).json({ message: "Profile updated successfully" });
    } else if (req.params.role == "CREATOR") {
      if (req.params.resourceUserId == req.params.loggedInUserId) {
        //For user to edit their own credentials
        const hashedPassword = await bcrypt.hash(password, 12);
        const filter = { _id: req.params.resourceUserId };
        const update = {
          password: hashedPassword,
        };
        User.findOneAndUpdate(
          filter,
          { $set: update },
          { useFindAndModify: false },
          function (err) {
            if (err) return console.error(err);
          }
        );
        res.status(202).json({ message: "Profile updated successfully" });
      } else {
        res
          .status(400)
          .json({ message: "You're not Allowed to carry out this Operation!" });
      }
    } else {
      res
        .status(400)
        .json({ message: "You're not allowed to carry out this Action!" });
    }
  } catch (error) {
    res.status(500).json({ message: error });
    console.log(error);
  }
};

export const deleteUser = async (req, res) => {
  const { id } = req.params;
  try {
    // console.log(req.params.role, req.params.userId)
    if (req.params.role == "ADMIN") {
      if (!mongoose.Types.ObjectId.isValid(id))
        return res.status(404).send(`No User with id: ${id}`);

      await User.findByIdAndRemove(id);

      res.json({ message: "User deleted successfully." });
    } else {
      res.status(403).json({ message: "You are not authorized" });
    }
  } catch (error) {
    console.log(error.message);
  }
};
