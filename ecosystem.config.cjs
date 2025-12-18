module.exports = {
  apps: [
    {
      name: "mayday",
      script: "server/server.js",
      exec_mode: "fork",
      instances: 1,
      watch: false,
      env: {
        NODE_ENV: "production",
        PORT: 8004,
        PUBLIC_IP: "192.168.1.14",
        ASTERISK_CONFIG_PATH: "/etc/asterisk",
      },
    },
  ],
};
