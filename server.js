const express = require("express");
const dotenv = require("dotenv");
const connectDB = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const blogRoutes = require("./routes/blogRoutes");

const PORT = process.env.PORT || 5001;

const app = express();

dotenv.config();
connectDB();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use("/api/auth", authRoutes);
app.use("/api/blog", blogRoutes);

app.listen(PORT, () => {
  console.log(`Server is listening on PORT:${PORT}`);
});
