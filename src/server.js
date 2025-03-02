// src/server.js
const App = require('./app');
const env = require('./config/env');

const app = new App();

process.on('uncaughtException', (error) => {
  console.error('UNCAUGHT EXCEPTION! 💥 Shutting down...');
  console.error(error.name, error.message);
  process.exit(1);
});

app.listen();

process.on('unhandledRejection', (error) => {
  console.error('UNHANDLED REJECTION! 💥 Shutting down...');
  console.error(error.name, error.message);
  app.listen().close(() => {
    process.exit(1);
  });
});