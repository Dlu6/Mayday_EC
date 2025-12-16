// src/auth/UserContext.js

import { createContext, useContext } from "react";
import { useSelector } from "react-redux";
import useAuth from "../hooks/useAuth";

const UserContext = createContext(null);

export const useUserContext = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error("useUserContext must be used within a UserProvider");
  }
  return context;
};

export const UserProvider = ({ children }) => {
  const { login, logout } = useAuth();
  const user = useSelector((state) => state.auth.user);
  const isAuthenticated = !!user;

  return (
    <UserContext.Provider value={{ user, isAuthenticated, login, logout }}>
      {children}
    </UserContext.Provider>
  );
};
