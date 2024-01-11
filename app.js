require("dotenv").config();
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const path = require("path");
const logger = require("morgan");

const router = express.Router();
const debug = require("debug")("myapp:server");

// Import Routers.
const userRoute = require("./routes/user.route");
const questionRoute = require("./routes/question.route");
const notificationRoute = require("./routes/notification.route");
const dashboardRoute = require("./routes/dashboard.route");
const storyRoute = require("./routes/story.route");
const reportRoute = require("./routes/report.route");
const channelRoute = require("./routes/channel.route");
const adsRoute = require("./routes/ads.route");


const mongoose = require("mongoose");

mongoose
  .connect(process.env.DB_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log("Successfully connected to the database");
  })
  .catch((err) => {
    console.log("Could not connect to the database. Exiting now...", err);
    process.exit();
  });

// initialize our express app
const app = express();
// app.use(cors());
var allowedOrigins = [
  'http://localhost:8080',
  'http://localhost:5000',
                      'https://outofpocketexpress.vercel.app'];
app.use(cors({
  origin: function(origin, callback){
    // allow requests with no origin 
    // (like mobile apps or curl requests)
    if(!origin) return callback(null, true);
    if(allowedOrigins.indexOf(origin) === -1){
      var msg = 'The CORS policy for this site does not ' +
                'allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  }
}));

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Allow-Credentials", true);
  next();
});

app.use(cookieParser());
app.use(bodyParser.json({ limit: "100mb" }));
app.use(logger("dev"));
app.use(bodyParser.urlencoded({ extended: true }));
// app.use(express.static("frontend/dist"));
app.use("/uploads", express.static("uploads"));

app.use("/user", userRoute);
app.use("/question", questionRoute);
app.use("/notification", notificationRoute);
app.use("/dashboard", dashboardRoute);
app.use("/story", storyRoute);
app.use("/report", reportRoute);
app.use("/channel", channelRoute);
app.use("/ads", adsRoute);

app.use("/", router);
// app.get("*", (req, res) => {
//   res.sendFile(path.join(__dirname, "frontend/dist", "index.html"));
// });
app.get('/', (req, res)=>{
  res.status(200);
  res.send("This is from root");
});



const port = process.env.PORT || 5000;
const server = require('http').createServer(app);
const io = require('socket.io')(server);


let userSockets = [];
let channelSockets = [];

// Connect Socket.
const {setupExtension} = require("./utils/socket");
setupExtension(io, userSockets, channelSockets);

global.io = io;
global.userSockets = userSockets;
global.channelSockets = channelSockets;

server.listen(port || 5000, () => {
  console.log("Server is up and running on port numner: " + port);
});

server.on("error", onError);
server.on("listening", onListening);

function onError(error) {
  if (error.syscall !== "listen") {
    throw error;
  }

  var bind = typeof port === "string" ? "Pipe " + port : "Port " + port;

  // handle specific listen errors with friendly messages
  switch (error.code) {
    case "EACCES":
      console.error(bind + " requires elevated privileges");
      process.exit(1);
      break;

    case "EADDRINUSE":
      console.error(bind + " is already in use");
      process.exit(1);
      break;

    default:
      throw error;
  }
}

/**
 * Event listener for HTTP server "listening" event.
 */

function onListening() {
  var addr = server.address();
  var bind = typeof addr === "string" ? "pipe " + addr : "port " + addr.port;
  debug("Listening on " + bind);
}
