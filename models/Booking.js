const mongoose = require("mongoose");
const BookingSchema = new mongoose.Schema({
  place: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Place",
    required: true,
  },
  user: { type: mongoose.Schema.Types.ObjectId,ref:"User", required: true },
  checkIn: {
    type: Date,
    required: true,
  },
  checkOut: {
    type: Date,
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  phone: {
    type: String,
    required: true,
  },
  price: {
    type: Number,
  },
});

const BookingModel = mongoose.model("Booking", BookingSchema);

module.exports = BookingModel;
