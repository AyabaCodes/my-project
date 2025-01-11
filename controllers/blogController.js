const Blog = require("../models/blogModel");
const User = require("../models/userModel");

// Helper function to calculate reading time (words per minute: 200)
const calculateReadingTime = (body) => {
  const words = body.split(/\s+/).length;
  const minutes = Math.floor(words / 200);
  const seconds = Math.ceil((words % 200) / (200 / 60));
  let readingTime = "";
  if (minutes > 0) {
    readingTime += `${minutes} minute${minutes > 1 ? "s" : ""}`;
  }
  if (seconds > 0) {
    readingTime += `${minutes > 0 ? " and " : ""}${seconds} second${
      seconds > 1 ? "s" : ""
    }`;
  }
  return readingTime || "0 seconds";
};

//Route to craete blog for logged in users
exports.createBlog = async (req, res) => {
  try {
    const { title, description, body, tags } = req.body;
    if (!title || !description || !body) {
      return res
        .status(400)
        .json({ error: "Title, Description and body are required" });
    }
    const readingTime = calculateReadingTime(body);
    const author = req.user._id;

    const blog = await new Blog({
      title,
      description,
      body,
      tags,
      author,
      readingTime,
    });
    await blog.save();
    res
      .status(201)
      .json({ message: "Blog post created successfully", blogPost: blog });
  } catch (error) {
    res
      .status(500)
      .json({ error: "Internal server error", details: error.message });
  }
};

//Route to get lists of all blogs for logged and not logged in users
exports.getAllBlogs = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      sortBy = "timestamp",
      sortOrder = "asc",
    } = req.query;

    // Construct query for search
    const query = { state: "published" }; // Only published posts for logged in and not logged in users

    // Calculate sorting order
    const sortOrderValue = sortOrder === "desc" ? -1 : 1;

    // Retrieve posts with pagination, search, and sorting

    const posts = await Blog.find(query)
      .populate("author", "username")
      .sort({ [sortBy]: sortOrderValue })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    // Get the total count for pagination metadata
    const total = await Blog.countDocuments(query);

    // Response
    res.status(200).json({
      total,
      currentPage: parseInt(page),
      totalPages: Math.ceil(total / limit),
      posts,
    });
  } catch (error) {
    res
      .status(500)
      .json({ error: "Internal server error", details: error.message });
  }
};

// Route to get a single published blog post by ID for logged in and not logged in users
exports.getBlog = async (req, res) => {
  try {
    const { id } = req.params;
    const post = await Blog.findOne({
      _id: id,
      state: "published",
    }).populate("author", "username");

    if (!post) {
      return res.status(404).json({ error: "Post not found or not published" });
    }

    await post.save(post.readCount++);
    res.status(200).json(post);
  } catch (error) {
    res
      .status(500)
      .json({ error: "Internal server error", details: error.message });
  }
};

// Route to update a blog post by the owner
exports.updateBlogPost = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, body, state } = req.body;
    const post = await Blog.findById(id);

    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    if (post.author.toString() !== req.user.id) {
      return res
        .status(403)
        .json({ error: "You can only update your own posts" });
    }

    if (title) post.title = title;
    if (description) post.description = description;
    if (body) {
      post.body = body;
      post.readingTime = calculateReadingTime(body);
    }
    if (state && ["draft", "published"].includes(state)) {
      post.state = state;
    }

    await post.save();
    res.status(200).json({ message: "Post updated successfully", post });
  } catch (error) {
    res
      .status(500)
      .json({ error: "Internal server error", details: error.message });
  }
};

// Route to delete a blog post by the owner
exports.deleteBlogPost = async (req, res) => {
  try {
    const { id } = req.params;
    const post = await Blog.findById(id);

    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    if (post.author.toString() !== req.user.id) {
      return res
        .status(403)
        .json({ error: "You can only delete your own posts" });
    }

    await post.deleteOne();
    res.status(200).json({ message: "Post deleted successfully" });
  } catch (error) {
    res
      .status(500)
      .json({ error: "Internal server error", details: error.message });
  }
};

//sample search:GET /posts?page=1&limit=20&sortBy=readingTime&sortOrder=desc&author=tolu&title=cobol&tags=programming,cobol
//Route to search blog with pagination and sort functions
exports.searchController = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      sortBy = "timestamp",
      sortOrder = "asc",
      author,
      title,
      tags,
    } = req.query;

    // Construct query for search
    const query = { state: "published" }; // Only published posts for logged in and not logged in users

    if (author) {
      const user = await User.findOne({ username: author });
      if (user) query.author = user._id;
    }
    if (title) query["title"] = { $regex: title, $options: "i" };
    if (tags) query["tags"] = { $in: tags.split(",") };

    // Calculate sorting order
    const sortOrderValue = sortOrder === "desc" ? -1 : 1;

    // Retrieve posts with pagination, search, and sorting

    const posts = await Blog.find(query)
      .populate("author", "username")
      .sort({ [sortBy]: sortOrderValue })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    // Get the total count for pagination metadata
    const total = await Blog.countDocuments(query);

    // Response
    res.status(200).json({
      total,
      currentPage: parseInt(page),
      totalPages: Math.ceil(total / limit),
      posts,
    });
  } catch (error) {
    res
      .status(500)
      .json({ error: "Internal server error", details: error.message });
  }
};

//Route to get owner blog posts with endpoint paginated and filterable by state
exports.getMyBlogs = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      sortBy = "timestamp",
      sortOrder = "asc",
      state,
    } = req.query;

    // const query = {};
    // console.log("stateValue is: ", stateValue);
    // if (stateValue) query.state = stateValue;
    // console.log("state value in the query is: ", query);
    // const blogOwner = await User.findOne({ _id: req.user.id });
    // if (blogOwner) {
    //   query.author = blogOwner._id;
    // } else {
    //   return res
    //     .status(403)
    //     .json({ error: "You can only get a list of your own posts" });
    // }
    // console.log("values in query now: ", query);

    const query = { author: req.user.id };
    if (state) {
      if (!["draft", "published"].includes(state)) {
        return res
          .status(400)
          .json({ error: 'Invalid state filter. Use "draft" or "published".' });
      }
      query.state = state;
    }
    // Calculate sorting order
    const sortOrderValue = sortOrder === "desc" ? -1 : 1;

    // Retrieve posts with pagination, search, and sorting

    const posts = await Blog.find(query)
      .populate("author", "username")
      .sort({ [sortBy]: sortOrderValue })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    // Get the total count for pagination metadata
    const total = await Blog.countDocuments(query);

    // Response
    res.status(200).json({
      total,
      currentPage: parseInt(page),
      totalPages: Math.ceil(total / limit),
      posts,
    });
  } catch (error) {
    res
      .status(500)
      .json({ error: "Internal server error", details: error.message });
  }
};
