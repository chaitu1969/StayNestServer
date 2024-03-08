const mongoose = require("mongoose");
const { Schema } = mongoose;

const UserSchema = new Schema({
  name: { type: String, require: true },
  email: { type: String, unique: true, required: true },
  password: String,
});

const UserModel = mongoose.model("User", UserSchema);

module.exports = UserModel;
