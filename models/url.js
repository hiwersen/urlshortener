const mongoose = require('mongoose');

const { Schema } = mongoose;

const urlSchema = new Schema({
    original_url: {
        type: String,
        required: true,
        unique: true,
    },
    short_url: {
        type: Number,
        required: true,
        unique: true,
    },
});

const UrlModel = mongoose.model("Url", urlSchema);

module.exports = UrlModel;