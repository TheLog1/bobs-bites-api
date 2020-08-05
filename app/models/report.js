const mongoose = require('mongoose')

const reportSchema = new mongoose.Schema({
  species: {
    type: String,
    required: true
  },
  potency: {
    type: Number,
    min: 0,
    max: 10,
    required: true
  },
  info: {
    type: String,
    required: true
  },
  medicallySignificant: {
    type: Boolean,
    required: true
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
})

module.exports = mongoose.model('Report', reportSchema)
