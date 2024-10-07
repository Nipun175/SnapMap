const fs = require('fs');

const { validationResult } = require("express-validator");
const mongoose = require("mongoose");

const HttpError = require("../models/http-error");
const getCoordsForAddress = require("../utils/locations");
const Place = require("../models/place");
const User = require("../models/user");

const getAllPlaces = async (req, res) => {
  const places = await Place.find();
  return res.json(places);
};

const getPlaceById = async (req, res, next) => {
  const placeId = req.params.pid;
  let place;

  try {
    place = await Place.findById(placeId);
  } catch (err) {
    const error = new HttpError(
      "Something went wrong, could not find a place",
      500
    );
    return next(error);
  }

  if (!place) {
    const error = next(
      new HttpError("Could not find a place for provided id", 404)
    );
    return next(error);
  }

  return res.status(200).json({ place: place.toObject({ getters: true }) });
};

const getPlacesByUserId = async (req, res, next) => {
  const userId = req.params.uid;
  let userWithPlaces
  try {
    userWithPlaces = await User.findById(userId).populate("places");
  } catch (err) {
    const error = new HttpError(
      "Something went wrong, could not fetch place",
      500
    );
    return next(error);
  }

  if (!userWithPlaces || userWithPlaces.places.length === 0) {
    const error = new HttpError(
      "Could not find a place for provided user id",
      404
    );
    return next(error);
  }

  return res
    .status(200)
    .json({ userWithPlaces: userWithPlaces.places.map((p) => p.toObject({ getters: true })) });
};

const createPlace = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty())
    return next(
      new HttpError("Invalid inputs passed, please check your data", 422)
    );

  const { title, description, address } = req.body;
  let coordinates;
  try {
    coordinates = await getCoordsForAddress(address);
  } catch (error) {
    return next(error);
  }

  const createdPlace = new Place({
    title,
    description,
    address,
    location: coordinates,
    image: req.file.path.replace("\\","/"),
    creator: req.userData.userId
  });

  let user;
  try {
    user = await User.findById(req.userData.userId);
  } catch (err) {
    console.log(err);
    const error = new HttpError("Creating place failed, please try again", 500);
    return next(error);
  }

  // console.log(user);

  if (!user) {
    const error = new HttpError("Could not find user for provided ID", 404);
    return next(error);
  }

  try {
    const sess = await mongoose.startSession();
    sess.startTransaction();
    await createdPlace.save({ session: sess });
    user.places.push(createdPlace);
    await user.save({ session: sess });
    await sess.commitTransaction();
  } catch (err) {
    const error = new HttpError("Creating place failed, please try again", 500);
    return next(error);
  }

  return res.status(201).json(createdPlace);
};

const updatePlace = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty())
    return next(
      new HttpError("Invalid inputs passed, please check your data", 422)
    );

  const { title, description } = req.body;
  const pid = req.params.pid;

  let place;

  try {
    place = await Place.findById(pid);
  } catch (err) {
    return next(new HttpError("Something went wrong, try again later",500));
  }

  if(place.creator.toString() !== req.userData.userId) {
    return next(new HttpError("You are not allowed to edit this place",401));
  }

  if (!place) {
    return next(new HttpError("Could not find place by given ID", 404));
  }

  place.title = title;
  place.description = description;

  try {
    await place.save();
  } catch (err) {
    return next(
      new HttpError("Something went wrong, could not update place", 500)
    );
  }

  return res.status(200).json({ place: place.toObject({ getters: true }) });
};

const deletePlace = async (req, res, next) => {
  const placeId = req.params.pid;

  let place
  try {
    place = await Place.findById(placeId).populate("creator");
  } catch (err) {
    return next(new HttpError("Something went wrong while deleting.", 500));
  }

  if (!place) {
    return next(new HttpError("Could not find place for ID", 404));
  }

  if(place.creator.toString() !== req.userData.userId) {
    return next(new HttpError("You are not allowed to delete this place", 401));
  }

  const imagePath = place.image;

  try {
    const sess = await mongoose.startSession();
    sess.startTransaction();
    await place.deleteOne({ session: sess });
    place.creator.places.pull(place);
    await place.creator.save({ session: sess });
    await sess.commitTransaction();
  } catch(err) {
    return next(new HttpError("Something went wrong, could not delete place", 500));
  }
  
  fs.unlink(imagePath, err => {
    console.log(err);
  });

  return res.status(200).json({ message: "deleted" });

};

module.exports = {
  getAllPlaces,
  getPlaceById,
  getPlacesByUserId,
  createPlace,
  updatePlace,
  deletePlace,
};

// throw
