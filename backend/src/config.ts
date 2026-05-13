const isDev = process.env.NODE_ENV === "development";

const config = {
  host: !isDev && process.env.HOST ? process.env.HOST : "localhost",
  port: !isDev && process.env.PORT ? parseInt(process.env.PORT) : 1234,
  tickRate: 20,
  boardWidth: 1280,
  boardHeight: 720,
  playerWidth: 340,
  playerHeight: 150,
  globalPlayerScale: 1,
  playerSpeed: 250,
};

export default config;
