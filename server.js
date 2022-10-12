#!/usr/bin/env node

/**
 * Module dependencies.
 */

var app = require("./server/config/app");
var debug = require("debug")("02-the-express-generator-end:server");
var http = require("http");

/**
 * Get port from environment and store in Express.
 */

var port = normalizePort(process.env.PORT || "3001");
app.set("port", port);

/**
 * Create HTTP server.
 */

var server = http.createServer(app);

const WebSocket = require("ws");

const wss = new WebSocket.Server({ port: 4910 });

let globalCount = 0;
let setInt;

wss.on("connection", (ws) => {
  console.log("New client");

  ws.count = 0;
  setInt = setInterval(() => {
    ws.send(
      JSON.stringify({
        wsCount: ws.count++,
        globalCount: globalCount++,
        commandID: "A002",
      })
    );
  }, 2000);

  ws.onmessage = (event) => {
    console.log(event.data);
  };

  ws.onclose = (event) => {
    console.log("Client disconnected");
    clearInterval(setInt);
  };
});

/**
 * Listen on provided port, on all network interfaces.
 */

server.listen(port);
server.on("error", onError);
server.on("listening", onListening);

/**
 * Normalize a port into a number, string, or false.
 */

function normalizePort(val) {
  var port = parseInt(val, 10);

  if (isNaN(port)) {
    // named pipe
    return val;
  }

  if (port >= 0) {
    // port number
    return port;
  }

  return false;
}

/**
 * Event listener for HTTP server "error" event.
 */

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
