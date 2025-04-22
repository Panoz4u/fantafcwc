const Dotenv = require('dotenv-webpack');

module.exports = {
  // ... altre configurazioni webpack
  plugins: [
    new Dotenv()
  ]
};