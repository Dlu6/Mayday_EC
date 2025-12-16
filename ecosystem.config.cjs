module.exports = {
  apps: [
    {
      name: "mayday",
      script: "server/server.js",
      exec_mode: "fork",
      instances: 1,
      watch: true,
      env: {
        NODE_ENV: "production",
        PORT: 8004,
        PUBLIC_IP: "65.1.149.92",
        ASTERISK_CONFIG_PATH: "/etc/asterisk",
      },
    },
  ],
};
