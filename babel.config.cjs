// babel.config.js (CommonJS syntax)
module.exports = {
    presets: [
      [
        '@babel/preset-env',
        {
          targets: {
            node: 'current', // This can be set to `current` or version number to target the preffered Node.js version being used to develop the application
          },
        },
      ],
    ],
  };
  
  