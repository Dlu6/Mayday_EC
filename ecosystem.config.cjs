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
        PUBLIC_IP: "192.168.1.15",
        ASTERISK_CONFIG_PATH: "/etc/asterisk",
        LICENSE_MGMT_API_URL: "https://mayday-website-backend-c2abb923fa80.herokuapp.com/api",
        SECRET_INTERNAL_API_KEY: "aVeryLongAndRandomSecretStringForInternalComms_987654321_production",
      },
    },
  ],
};
