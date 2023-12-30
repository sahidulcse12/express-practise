const express = require("express");
const PostController = require("../controller/PostController");

const routes = express();

routes.get("/search", PostController.getPostByKeyword);

module.exports = routes;
