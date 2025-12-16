const config = {
  development: {
    apiUrl: "http://localhost:8004",
    wsUrl: "ws://localhost:8004",
    baseUrl: "http://localhost:5173",
    sipWsUrl: "ws://65.1.149.92:8088/ws",
  },
  production: {
    apiUrl: "https://mhuhelpline.com",
    wsUrl: "ws://mhuhelpline.com",
    baseUrl: "https://mhuhelpline.com",
    sipWsUrl: "ws://65.1.149.92:8088/ws",
  },
};

const environment = process.env.NODE_ENV || "development";
export default config[environment];
