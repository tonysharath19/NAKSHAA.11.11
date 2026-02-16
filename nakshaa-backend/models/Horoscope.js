const mongoose = require("mongoose");

const horoscopeSchema = new mongoose.Schema({
  date: {
    type: String,
    required: true
  },
  sign: {
    type: String,
    required: true
  },
  life: {
    type: String,
    required: true
  },
  career: {
    type: String,
    required: true
  },
  health: {
    type: String,
    required: true
  },
  wealth: {
    type: String,
    required: true
  },
  love: {
    type: String,
    required: true
  },
  luckyNumber: {
    type: String,
    required: true
  },
  luckyColor: {
    type: String,
    required: true
  },
  affirmation: {
    type: String,
    required: true
  }
}, { timestamps: true });

module.exports = mongoose.model("Horoscope", horoscopeSchema);
