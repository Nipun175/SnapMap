const mongoose = require("mongoose");
const uniqueValidator = require("mongoose-unique-validator");

const UserSchema = new mongoose.Schema({
    name: {type: String, required: true},
    email: {type: String, required: true, unique: true},
    password: {type: String, required: true, minLength: 6},
    image: {type: String},
    places: [{ type: mongoose.Types.ObjectId, required: true, ref: 'Place' }],
});

UserSchema.plugin(uniqueValidator);

module.exports = mongoose.model("User", UserSchema);