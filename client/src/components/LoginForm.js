// src/components/LoginForm.js
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  TextField,
  Button,
  Paper,
  Grid,
  Typography,
  InputAdornment,
  IconButton,
  Box,
  Switch,
  FormControlLabel,
} from "@mui/material";
import { Visibility, VisibilityOff } from "@mui/icons-material";
import { useSnackbar } from "notistack";
import useAuth from "../hooks/useAuth";
import maydaylogo from "../assets/images/mayday_logo_simi.png";
import floaterBg from "../assets/images/floater.svg";
const LoginForm = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const { login } = useAuth();
  const { enqueueSnackbar } = useSnackbar();
  const navigate = useNavigate();
  const [useLocalApp, setUseLocalApp] = useState(false);
  const [isElectronApp, setIsElectronApp] = useState(false);

  useEffect(() => {
    const checkElectron = () => {
      try {
        return window.electron !== undefined;
      } catch (e) {
        return false;
      }
    };

    const isElectron = checkElectron();
    setIsElectronApp(isElectron);

    if (isElectron) {
      // Get the current preference from localStorage
      const savedPreference = localStorage.getItem("useRemoteUrl");
      if (savedPreference !== null) {
        setUseLocalApp(savedPreference === "false"); // Inverse since this is "Use Local App"
      }
    }
  }, []);

  const handleClickShowPassword = () => {
    setShowPassword(!showPassword);
  };

  const handleMouseDownPassword = (event) => {
    event.preventDefault();
  };

  const handleAppToggle = async (event) => {
    const useLocal = event.target.checked;
    setUseLocalApp(useLocal);

    if (isElectronApp && window.electron) {
      localStorage.setItem("useRemoteUrl", (!useLocal).toString());
      window.electron.send("set-url-preference", !useLocal);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const result = await login(username, password);
      if (result.user) {
        navigate("/dashboard", { replace: true });
      }
    } catch (err) {
      setUsername("");
      setPassword("");
      enqueueSnackbar(err.message || "Login failed!", {
        variant: "error",
      });
    }
  };

  return (
    <Grid
      container
      alignItems="center"
      justifyContent="center"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        backgroundImage: `url(${floaterBg})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      <Grid item xs={12} sm={6} md={4}>
        <Paper elevation={6} style={{ padding: "1.5rem" }}>
          <Box textAlign="center"
          // mb={2}
          >
            <img
              src={maydaylogo}
              alt="Mayday Logo"
              style={{ width: "320px", height: "320px", marginBottom: "-70px" }}
            />
            {/* <Typography
              variant="h3"
              component="h1"
              color="primary"
              style={{
                fontSize: "4rem",
                letterSpacing: "1px",
                fontWeight: "bolder",
                fontFamily: "Arial, sans-serif",
                textShadow: "2px 2px 4px rgba(0, 0, 0, 0.1)",
              }}
            >
              Mayday
            </Typography> */}
          </Box>
          <Typography
            variant="h5"
            component="h1"
            style={{
              textAlign: "center",
              marginBottom: "1rem",
              color: "#333",
              fontWeight: "lighter",
              fontStyle: "italic",
              fontFamily: "Arial, sans-serif",
              fontSize: "1rem",
            }}
          >
            Login to your account!
          </Typography>
          <form onSubmit={handleSubmit}>
            <TextField
              label="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              margin="normal"
              fullWidth
            />
            <TextField
              label="Password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              margin="normal"
              fullWidth
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label="toggle password visibility"
                      onClick={handleClickShowPassword}
                      onMouseDown={handleMouseDownPassword}
                      edge="end"
                    >
                      {showPassword ? <Visibility /> : <VisibilityOff />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            {/* Might have to delete this */}
            {isElectronApp && (
              <FormControlLabel
                control={
                  <Switch
                    checked={useLocalApp}
                    onChange={handleAppToggle}
                    color="primary"
                  />
                }
                label="Use Local App"
                style={{ marginBottom: "1rem", display: "block" }}
              />
            )}
            <Button
              type="submit"
              color="primary"
              variant="contained"
              fullWidth
              style={{ marginTop: "1rem" }}
            >
              Log In
            </Button>
          </form>
        </Paper>
      </Grid>
    </Grid>
  );
};

export default LoginForm;
