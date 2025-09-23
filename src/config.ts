const config = {
  host: process.env.HOST || "localhost",
  port: parseInt(process.env.PORT || "1234"),
  tickRate: 20,
  boardWidth: 1280,
  boardHeight: 720,
  playerWidth: 340,
  playerHeight: 150,
  playerSpeed: 250,
};

export default config;
