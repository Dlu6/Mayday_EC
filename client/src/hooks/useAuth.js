import { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { loginUser, logoutUser, restoreUser } from "../features/auth/authSlice";

// useAuth hook that checks if the user is authenticated
const useAuth = () => {
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(true);

  const user = useSelector((state) => state.auth.user);
  const status = useSelector((state) => state.auth.status);

  useEffect(() => {
    const checkAuth = async () => {
      const savedUser = JSON.parse(localStorage.getItem("user"));
      const token = localStorage.getItem("token");

      if (savedUser && token) {
        await dispatch(restoreUser({ user: savedUser, token }));
      } else {
        dispatch(logoutUser());
      }
      setLoading(false);
    };

    checkAuth();
  }, [dispatch]);

  const login = async (username, password) => {
    const result = await dispatch(loginUser({ username, password })).unwrap();
    if (result.user) {
      localStorage.setItem("user", JSON.stringify(result.user));
      localStorage.setItem("token", result.token);
    }
    return result;
  };

  const logout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    dispatch(logoutUser());
  };

  return {
    user,
    loading: loading || status === "loading",
    isAuthenticated: !!user,
    login,
    logout,
  };
};

export default useAuth;
