// Import required modules

const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const JWT = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const imageDownloader = require("image-downloader");
const path = require("path");
const multer = require("multer");
const fs = require("fs");

// Import models
const User = require("./models/Users");
const Place = require("./models/Place");
const Booking = require("./models/Booking");
const { rejects } = require("assert");

// App configuration
require("dotenv").config();
const app = express();
const bcryptSalt = bcrypt.genSaltSync(12);
const jwtSecret = "asdvavszvawfd";

// Middleware
app.use(express.json());
app.use(cookieParser());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use(
  cors({
    origin: ["https://bright-chebakia-be5e03.netlify.app"],
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Utility function to get user data from token
function getUserDataFromToken(token) {
  return new Promise((resolve, reject) => {
    JWT.verify(token, jwtSecret, {}, async (err, user) => {
      if (err) reject(err);
      resolve(user);
    });
  });
}

// Route for simple test
app.get("/test", (req, res) => {
  res.json("test ok");
});

// User registration
app.post("/register", async (req, res) => {
  const { name, email, password } = req.body;
  try {
    const user = await User.create({
      name,
      email,
      password: bcrypt.hashSync(password, bcryptSalt),
    });
    res.json({ user });
  } catch (error) {
    res.status(422).json(error);
  }
});

async function startServer() {
  mongoose
    .connect(process.env.MONGO_URL)
    .then(() => {
      console.log("Connected to the Database");
    })
    .catch((error) => {
      console.log("Not able to connect to the database.", error);
    });
}

// User login
app.post("/login", async (req, res) => {
  mongoose.connect(process.env.MONGO_URL);
  const { email, password } = req.body;
  const isUserExist = await User.findOne({ email });
  if (isUserExist) {
    const isPasswordCheck = bcrypt.compareSync(password, isUserExist.password);
    if (isPasswordCheck) {
      JWT.sign(
        { email: isUserExist.email, id: isUserExist._id },
        jwtSecret,
        {},
        (err, token) => {
          if (err) throw console.error("Error : ", err);
          res.cookie("token", token).json({ isUserExist, token });
        }
      );
    } else {
      res.status(422).json("Password not matching");
    }
  } else {
    res.json("User does not exist");
  }
});

// Get user profile
app.get("/profile", async (req, res) => {
  const token = req.headers.authorization.split(" ")[1];
  if (token) {
    JWT.verify(token, jwtSecret, {}, async (err, user) => {
      if (err) throw err;
      const { name, email, _id } = await User.findById(user.id);
      res.json({ name, email, _id });
    });
  } else {
    res.json(null);
  }
});

// User logout
app.post("/logout", (req, res) => {
  res.json(true);
});

// Upload by link
app.post("/upload-by-link", async (req, res) => {
  const { link } = req.body;

  if (!link) {
    return res.status(400).json({ error: "The link is required" });
  }

  const newName = "photos" + Date.now() + ".jpg";
  try {
    await imageDownloader.image({
      url: link,
      dest: path.join(__dirname, "/uploads/", newName),
    });
    res.json({ path: "uploads/" + newName });
  } catch (err) {
    console.error("Error loading the image: ", err);
    res.status(500).json({ error: "Failed to download image" });
  }
});

// Upload using multer
const photosMiddleware = multer({ dest: "uploads/" });

app.post("/upload", photosMiddleware.array("photos", 100), (req, res) => {
  const uploadedFiles = req.files.map((file) => {
    const { path, originalname } = file;
    const parts = originalname.split(".");
    const ext = parts.pop();
    const newpath = `${path}.${ext}`;
    fs.renameSync(path, newpath);
    return newpath.replace("uploads/", "");
  });
  res.json(uploadedFiles);
});

// Create a new place
app.post("/places", async (req, res) => {
  const token = req.headers.authorization.split(" ")[1];

  const {
    title,
    address,
    addedPhotos,
    description,
    perks,
    extraInfo,
    checkIn,
    checkOut,
    maxGuests,
    price,
  } = req.body;

  JWT.verify(token, jwtSecret, {}, async (err, userData) => {
    if (err) throw err;
    const placeDoc = await Place.create({
      owner: userData.id,
      price,
      title,
      address,
      photos: addedPhotos,
      description,
      perks,
      extraInfo,
      checkIn,
      checkOut,
      maxGuests,
      price,
    });
    res.json(placeDoc);
  });
});

// Get places by user
app.get("/user-places", async (req, res) => {
  const token = req.headers.authorization.split(" ")[1];
  const userData = await getUserDataFromToken(token);

  Place.find({ owner: userData.id })
    .then((places) => res.json(places))
    .catch((error) =>
      res.status(500).json({ message: "Error in fetching places : ", error })
    );
});

// app.get("/user-places", async (req, res) => {
//    const {token} = req.cookies;
//   JWT.verify(token, jwtSecret, {}, async (err, userData) => {
//      if(err) return null;
//     res.json( await Place.find({owner:userData.id}) );
//   });
// });

// Get a specific place by ID
app.get("/places/:id", async (req, res) => {
  const { id } = req.params;
  res.json(await Place.findById(id));
});

// Update a place
app.put("/places", async (req, res) => {
  const token = req.headers.authorization.split(" ")[1];
  const {
    id,
    title,
    address,
    photos,
    description,
    perks,
    extraInfo,
    checkIn,
    checkOut,
    maxGuests,
    price,
  } = req.body;

  const userData = await getUserDataFromToken(token);
  const placeDoc = await Place.findById(id);

  if (userData.id === placeDoc.owner.toString()) {
    placeDoc.set({
      title,
      address,
      photos,
      description,
      perks,
      extraInfo,
      checkIn,
      checkOut,
      maxGuests,
      price,
    });
    await placeDoc.save();
    res.json("Update successful");
  } else {
    res.status(403).json("Unauthorized");
  }
});

// Get all places
app.get("/places", async (req, res) => {
  res.json(await Place.find());
});

// Create a booking
app.post("/bookings", async (req, res) => {
  const token = req.headers.authorization.split(" ")[1];

  const userData = await getUserDataFromToken(token);

  const { checkIn, checkOut, place, maxGuests, phone, name, price } = req.body;

  try {
    const booking = await Booking.create({
      checkIn,
      checkOut,
      place,
      maxGuests,
      phone,
      name,
      price,
      user: userData.id,
    });
    res.json(booking);
  } catch (e) {
    res.status(500).json(e);
  }
  return "";
});

// Get bookings for a user
app.get("/bookings", async (req, res) => {
  const token = req.headers.authorization.split(" ")[1];
  const userData = await getUserDataFromToken(token);
  res.json(await Booking.find({ user: userData.id }).populate("place"));
});

// Start server
const PORT = process.env.PORT || 4000;

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

startServer();
