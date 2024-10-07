const fs = require('fs');

const express = require("express");
const bodyParser = require("body-parser");

const placesRoutes = require("./Routes/places-routes");
const userRoutes = require("./Routes/user-routes");
const HttpError = require("./models/http-error");
const { default: mongoose } = require("mongoose");

const app = express();

app.use(bodyParser.json());

app.use('/uploads/images', express.static(__dirname + "/uploads/images"));

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization"
  );
  res.setHeader(
    "Access-Control-Allow-Methods", 
    "GET, POST, PATCH, DELETE");
  next();
});

app.use("/api/places", placesRoutes);

app.use("/api/users", userRoutes);

app.use((req, res, next) => {
  const error = new HttpError("Could not find this route", 404);
  throw error;
});

app.use((error, req, res, next) => {
  if (req.file) {
    fs.unlink(req.file.path, (err) => {
      console.log(err);
    });
  }
  if (res.headerSent) return next(error);
  res
    .status(error.code || 500)
    .json({ message: error.message || "An unknown error occured!" });
});

mongoose
  .connect(
    `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.q6r9w.mongodb.net/${process.env.DB_NAME}?retryWrites=true&w=majority&appName=Cluster0`
  )
  .then(() => {
    console.log("Connected to database");
    app.listen(8000);
  })
  .catch((err) => {
    console.log(err);
  });
