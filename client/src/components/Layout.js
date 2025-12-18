import getUserRoutes from "../utils/getUserRoutes";
import React, { useEffect, useState, useMemo, useRef } from "react";
import {
  AppBar,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Paper,
  Typography,
  CssBaseline,
  Box,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import useAuth from "../hooks/useAuth";
import DashboardIcon from "@mui/icons-material/Dashboard"; // Import the icons you need
import SettingsIcon from "@mui/icons-material/Settings";
import SchemaIcon from "@mui/icons-material/Schema";
import PeopleIcon from "@mui/icons-material/People";
import AnalyticsIcon from "@mui/icons-material/Assessment";
import IntegrationIcon from "@mui/icons-material/IntegrationInstructions";
import UsersIcon from "@mui/icons-material/SupportAgent";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import VoiceIcon from "@mui/icons-material/DialerSip";
import { Outlet } from "react-router-dom";
import ExpandMore from "@mui/icons-material/NavigateNext";
import ExpandLess from "@mui/icons-material/ExpandMore";
import { useLocation } from "react-router-dom";
import Collapse from "@mui/material/Collapse";
import MenuIcon from "@mui/icons-material/Menu";
import MenuOpenIcon from "@mui/icons-material/MenuOpen";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import LogoutButton from "./auth/LogoutButton";

const Layout = () => {
  // Add your logic to determine which routes are available to the current user
  const { user, isAuthenticated } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(true); // State to control drawer open/close
  const [open, setOpen] = useState({});
  const location = useLocation();
  const [selectedRoutePath, setSelectedRoutePath] = useState("");

  const [activeMenuName, setActiveMenuName] = useState("Dashboard");
  const navigate = useNavigate();

  // Memoize userRoutes to prevent recreation on every render
  const userRoutes = useMemo(() => {
    return isAuthenticated ? getUserRoutes(user) : [];
  }, [isAuthenticated, user]);

  // Track if initial menu expansion has been done
  const initialExpandDone = useRef(false);

  // Update active menu name and selected path when location changes
  useEffect(() => {
    // A function to recursively find the active route name (supports nested paths)
    const findRouteName = (routes, pathname) => {
      for (let route of routes) {
        // Exact match
        if (route.path === pathname) {
          return route.name;
        }
        // Nested path match (e.g., /voice/outboundRoutes/12/edit matches /voice/outboundRoutes)
        if (pathname.startsWith(route.path + '/')) {
          return route.name;
        }
        if (route.children) {
          const foundName = findRouteName(route.children, pathname);
          if (foundName) return foundName;
        }
      }
      return null;
    };

    const activeRouteName = findRouteName(userRoutes, location.pathname);
    setActiveMenuName(activeRouteName || "~");
    setSelectedRoutePath(location.pathname);
  }, [location.pathname, userRoutes]);

  // Auto-expand parent menus on initial load and navigation
  useEffect(() => {
    if (userRoutes.length === 0) return;

    const expandParentMenus = (routes, pathname) => {
      const newOpenState = {};
      for (let route of routes) {
        if (route.children) {
          const isChildActive = route.children.some(
            (child) => pathname === child.path || pathname.startsWith(child.path + '/')
          );
          if (isChildActive) {
            newOpenState[route.name] = true;
          }
        }
      }
      return newOpenState;
    };

    const expansions = expandParentMenus(userRoutes, location.pathname);
    
    // Only update if there are menus to expand
    if (Object.keys(expansions).length > 0) {
      setOpen((prevOpen) => {
        // Check if we actually need to update
        const needsUpdate = Object.keys(expansions).some(key => !prevOpen[key]);
        if (needsUpdate || !initialExpandDone.current) {
          initialExpandDone.current = true;
          return { ...prevOpen, ...expansions };
        }
        return prevOpen;
      });
    }
  }, [location.pathname, userRoutes]);

  const iconsMap = {
    Dashboard: <DashboardIcon sx={{ color: "white" }} />,
    Settings: <SettingsIcon sx={{ color: "red" }} />,
    IVR: <SchemaIcon sx={{ color: "white" }} />,
    Tools: <SettingsIcon sx={{ color: "white" }} />,
    Voice: <VoiceIcon sx={{ color: "white" }} />,
    People: <PeopleIcon sx={{ color: "white" }} />,
    Analytics: <AnalyticsIcon sx={{ color: "white" }} />,
    Integrations: <IntegrationIcon sx={{ color: "white" }} />,
    Staff: <UsersIcon sx={{ color: "white" }} />,
    Support: <HelpOutlineIcon sx={{ color: "white" }} />,
  };

  const drawerWidth = 240;

  const handleClick = (name) => {
    setOpen((prevOpen) => ({
      ...prevOpen,
      [name]: !prevOpen[name],
    }));
  };

  const getActiveMenuIcon = (activeMenuName) => {
    // Find the route object that matches the activeMenuName
    const activeRoute = userRoutes.find(
      (route) => route.name === activeMenuName
    );
    // Return the corresponding icon from iconsMap, or null if not found
    return activeRoute ? iconsMap[activeRoute.name] : null;
  };

  // Toggle drawer function
  const handleDrawerToggle = () => {
    setDrawerOpen(!drawerOpen);
  };

  // Updated color scheme
  const colors = {
    primary: "#002F4C", // Base drawer color
    secondary: "#004B7D", // Light blue for child items
    // accent: "#F26800", // Orange for active parent
    accent: "#9FC131", // Orange for active parent
    hover: "rgba(255, 255, 255, 0.1)",
    text: "#ffffff",
    icon: "#ffffff",
    iconSelected: "#F26800",
  };

  // Modified drawer styles
  const drawerStyles = {
    width: drawerOpen ? drawerWidth : (theme) => theme.spacing(7),
    flexShrink: 0,
    whiteSpace: "nowrap",
    boxSizing: "border-box",
    transition: (theme) =>
      theme.transitions.create("width", {
        easing: theme.transitions.easing.sharp,
        duration: theme.transitions.duration.enteringScreen,
      }),
    "& .MuiDrawer-paper": {
      width: drawerOpen ? drawerWidth : (theme) => theme.spacing(7),
      overflowX: "hidden",
      transition: (theme) =>
        theme.transitions.create("width", {
          easing: theme.transitions.easing.sharp,
          duration: theme.transitions.duration.leavingScreen,
        }),
      backgroundColor: colors.primary,
      color: colors.text,
    },
  };

  // Add this helper function to check if a route is active
  const isRouteActive = (route) => {
    // Direct match
    if (selectedRoutePath === route.path) return true;
    // Check if current path starts with route path (for nested routes like /voice/outboundRoutes/12/edit)
    if (selectedRoutePath.startsWith(route.path + '/')) return true;
    // Check if any children are active (exact or nested match)
    if (route.children) {
      return route.children.some((child) => 
        selectedRoutePath === child.path || 
        selectedRoutePath.startsWith(child.path + '/')
      );
    }
    return false;
  };

  // Helper function to check if a child route is active (for submenu highlighting)
  const isChildRouteActive = (childPath) => {
    // Exact match
    if (selectedRoutePath === childPath) return true;
    // Nested route match (e.g., /voice/outboundRoutes/12/edit matches /voice/outboundRoutes)
    if (selectedRoutePath.startsWith(childPath + '/')) return true;
    return false;
  };

  // Modified listItemStyles to handle different active states for parent and child
  const listItemStyles = (route) => {
    const isActive = isRouteActive(route);
    const hasChildren = Boolean(route.children);
    const isParentWithActiveChild = hasChildren && isActive;

    return {
      backgroundColor: isParentWithActiveChild ? colors.accent : "transparent",
      "&:hover": {
        backgroundColor: isParentWithActiveChild ? colors.accent : colors.hover,
      },
      "& .MuiListItemIcon-root": {
        color: isActive ? colors.iconSelected : colors.icon,
        transition: "color 0.2s",
      },
      "& .MuiListItemText-primary": {
        color: isParentWithActiveChild ? colors.text : "inherit",
        fontWeight: isParentWithActiveChild ? 600 : 400,
      },
      "&.Mui-selected": {
        backgroundColor: isParentWithActiveChild
          ? colors.accent
          : colors.secondary,
        "&:hover": {
          backgroundColor: isParentWithActiveChild
            ? colors.accent
            : colors.secondary,
        },
        "& .MuiListItemIcon-root": {
          color: colors.iconSelected,
        },
      },
    };
  };

  // Modified submenuItemStyles for consistent child styling
  const submenuItemStyles = (isSelected) => ({
    pl: 8,
    backgroundColor: isSelected ? colors.secondary : "transparent",
    "&:hover": {
      backgroundColor: isSelected ? colors.secondary : colors.hover,
    },
    "&.Mui-selected": {
      backgroundColor: colors.secondary,
      "&:hover": {
        backgroundColor: colors.secondary,
      },
    },
    "& .MuiListItemText-primary": {
      fontSize: "0.9rem",
      color: isSelected ? colors.text : "rgba(255, 255, 255, 0.7)",
    },
  });

  return (
    <Box sx={{ display: "flex" }}>
      <CssBaseline />
      <AppBar
        position="fixed"
        sx={{
          zIndex: (theme) => theme.zIndex.drawer + 1,
          backgroundColor: "#011D2B",
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            onClick={handleDrawerToggle}
            edge="start"
            sx={{ marginRight: "12px", "& .MuiSvgIcon-root": { fontSize: 28 } }}
          >
            {drawerOpen ? <MenuOpenIcon /> : <MenuIcon />}
          </IconButton>
          <Typography variant="h6" noWrap sx={{ flexGrow: 1 }}>
            Simi Valley CRM
          </Typography>

          {/* User Profile Section */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
            }}
          >
            <Typography
              variant="subtitle1"
              sx={{
                display: { xs: "none", sm: "block" },
                color: "#fff",
              }}
            >
              {user?.name || user?.username || "User"}
            </Typography>
            <IconButton
              color="inherit"
              aria-label="user profile"
              onClick={() => navigate("/profile")}
              sx={{
                "& .MuiSvgIcon-root": { fontSize: 38 },
              }}
            >
              <AccountCircleIcon />
            </IconButton>
            <LogoutButton />
          </Box>
        </Toolbar>
      </AppBar>

      <Drawer variant="permanent" sx={drawerStyles}>
        <Toolbar />{" "}
        {/* This adds space at the top of the drawer content, under the AppBar */}
        <Box sx={{ overflow: "auto" }}>
          <List>
            {userRoutes.map((route) => (
              <React.Fragment key={route.name}>
                <ListItem
                  button
                  onClick={() => {
                    if (route.children) {
                      handleClick(route.name);
                    } else {
                      navigate(route.path);
                      setSelectedRoutePath(route.path);
                    }
                  }}
                  selected={isRouteActive(route)}
                  sx={listItemStyles(route)}
                >
                  <ListItemIcon
                    sx={{
                      minWidth: "40px",
                    }}
                  >
                    {iconsMap[route.name] || <Box />}
                  </ListItemIcon>
                  <ListItemText primary={route.name} />
                  {route.children ? (
                    open[route.name] ? (
                      <ExpandLess />
                    ) : (
                      <ExpandMore />
                    )
                  ) : null}
                </ListItem>
                {route.children && (
                  <Collapse in={open[route.name]} timeout="auto" unmountOnExit>
                    <List component="div" disablePadding>
                      {route.children.map((child) => (
                        <ListItem
                          key={child.name}
                          button
                          selected={isChildRouteActive(child.path)}
                          sx={submenuItemStyles(
                            isChildRouteActive(child.path)
                          )}
                          onClick={() => {
                            navigate(child.path);
                            setSelectedRoutePath(child.path);
                          }}
                        >
                          <ListItemText primary={child.name} />
                        </ListItem>
                      ))}
                    </List>
                  </Collapse>
                )}
              </React.Fragment>
            ))}
          </List>
        </Box>
      </Drawer>
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { sm: `calc(100% - ${drawerWidth}px)` },
        }}
      >
        <Toolbar /> {/* This ensures content starts below the AppBar */}
        <Paper
          elevation={0}
          sx={{
            backgroundColor: "#0f4c75",
            color: "#fff",
            padding: 2,
            marginBottom: 1,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center" }}>
            {getActiveMenuIcon(activeMenuName)}
            <Typography
              variant="h6"
              sx={{ marginLeft: "10px", fontWeight: 600 }}
            >
              {activeMenuName}
            </Typography>
          </Box>
        </Paper>
        <Outlet />
      </Box>
    </Box>
  );
};

export default Layout;
