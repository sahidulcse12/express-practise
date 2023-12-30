const { sendResponse } = require("../util/common");
const HTTP_STATUS = require("../constants/statusCodes");
const axios = require("axios");
const PostModel = require("../model/Post");
const requestIp = require("request-ip");
const SearchModel = require("../model/Search");

class PostController {
  async getPostByKeyword(req, res) {
    try {
      let { keyword } = req.query;
      keyword = keyword?.toLowerCase()?.trim();
      console.log("keyword=", keyword);

      // check searcg keyword
      if (keyword == "") {
        return sendResponse(
          res,
          HTTP_STATUS.UNPROCESSABLE_ENTITY,
          "The keyword can't be empty"
        );
      }

      let url = `https://jsonplaceholder.typicode.com/posts`;
      let posts;

      try {
        const response = await axios.get(url);
        // Check the status code
        if (response.status !== 200) {
          return sendResponse(
            res,
            HTTP_STATUS.UNPROCESSABLE_ENTITY,
            "Failed to fetch the posts data"
          );
        }
        // Handle the data as needed
        posts = response?.data;
      } catch (postFetchError) {
        console.error("postFetchError:", postFetchError);
        return sendResponse(
          res,
          HTTP_STATUS.NOT_FOUND,
          "Failed to fetch the posts data"
        );
      }

      //   console.log("posts= ", posts);
      const bulk = [];
      let data = posts?.filter((post) => {
        if (
          post?.title?.toLowerCase()?.includes(keyword) ||
          post?.body?.toLowerCase()?.includes(keyword)
        ) {
          bulk.push({
            updateOne: {
              filter: { id: post?.id },
              update: { $set: post },
              upsert: true,
            },
          });
          return post;
        }
      });
      // console.log("bulk ", bulk);
      const result = await PostModel.bulkWrite(bulk);
      //   console.log("result ", result);

      /* add search entry*/
      const myData = await PostModel.find({
        $or: [
          { title: { $regex: keyword, $options: "i" } },
          { body: { $regex: keyword, $options: "i" } },
        ],
      });
      //   console.log(myData);
      const idStrings = myData.map((post) => String(post?._id));
      await SearchModel.create({
        ipAddress: requestIp.getClientIp(req),
        keyword,
        searchResult: idStrings,
      });

      /*response*/
      let postResult = {
        posts: data,
        postCount: data.length,
      };
      return sendResponse(
        res,
        HTTP_STATUS.OK,
        "Successfully loaded the posts",
        postResult
      );
    } catch (error) {
      console.log(error);
      return sendResponse(
        res,
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        "Internal server error"
      );
    }
  }
}
module.exports = new PostController();
