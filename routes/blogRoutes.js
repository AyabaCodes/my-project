const express = require("express");
const {
  createBlog,
  getAllBlogs,
  getBlog,
  updateBlogPost,
  deleteBlogPost,
  searchController,
  getMyBlogs,
  LoggedIngetAllBlogs,
} = require("../controllers/blogController");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/", authMiddleware, createBlog);
router.put("/:id", authMiddleware, updateBlogPost);
router.delete("/:id", authMiddleware, deleteBlogPost);
router.get("/myblogs", authMiddleware, getMyBlogs);
router.get("/published", authMiddleware, getAllBlogs);
router.get("/published/:id", authMiddleware, getBlog);
router.get("/", getAllBlogs);
router.get("/:id", getBlog);
router.get("/posts", searchController);

module.exports = router;
