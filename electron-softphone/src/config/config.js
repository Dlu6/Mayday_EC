const config = {
  development: {
    apiUrl: "http://localhost:8004",
    wsUrl: "ws://localhost:8004",
    baseUrl: "http://localhost:5173",
    sipWsUrl: "ws://65.1.149.92:8088/ws",
  },
  production: {
    apiUrl: "http://192.168.1.14",
    wsUrl: "ws://192.168.1.14",
    baseUrl: "http://192.168.1.14",
    sipWsUrl: "ws://192.168.1.14:8088/ws",
  },
};

const environment = process.env.NODE_ENV || "development";
export default config[environment];
