const express = require("express");
const app = express();
const _ = require("lodash");
const { exec } = require("child_process");
const { error, stderr, stdout } = require("process");
const { json } = require("express/lib/response");

const curlCommand = `curl https://intent-kit-16.hasura.app/api/rest/blogs -H "x-hasura-admin-secret: 32qR4KmXOIpsGPQKMqEJHGJS27G5s7HdSKO3gdtQd2kv5e852SiYwWNfxkZOBuQ6"`;

const timeOut = 24 * 60 * 60 * 1000;

const dataMiddleware = (req, res, next) => {
  console.log("in middle ware");

  exec(curlCommand, (err, stdout, stderr) => {
    if (err) {
      console.error("Error executing  cURL command:", err);
      res.status(500).send("Internal server error:");
    } else {
      try {
        const data = JSON.parse(stdout);

        req.blogs = data;

        const longestTitle = _.maxBy(data.blogs, (blog) => blog.title.length);

        const privacyBlogs = _.filter(data.blogs, (blog) =>
          _.includes(blog.title.toLowerCase(), "privacy")
        );

        const uniqueBlogTitles = _.uniq(_.map(data.blogs, "title"));

        const statistics = {
          totalBlogs: data.blogs.length,
          longestTitle: longestTitle.title,
          privacyBlogsCount: privacyBlogs.length,
          uniqueBlogTitles: uniqueBlogTitles,
        };
        res.json(statistics);
        next();
      } catch (error) {
        console.error("Error parsing JSON:", error);
        res.status(500).send("Internal server error");
      }
    }
  });
};

const searchMiddleware = (req, res, next) => {
  const query = req.query.query;

  exec(curlCommand, (error, stdout, stderr) => {
    if (error) {
      console.error("Error executing cURL command:", error);
      res.status(500).send("Internal server error");
    } else {
      try {
        const data = JSON.parse(stdout);

        const result = data.blogs.filter((blog) =>
          blog.title.toLowerCase().includes(query)
        );

        res.json(result);
      } catch (error) {
        console.error("Error parsing JSON:", error);
        res.status(500).send("Internal server error");
      }
    }
  });
};

const dataCache = _.memoize(dataMiddleware, undefined, timeOut);

const searchCache = _.memoize(
  searchMiddleware,
  (query) => query,

  timeOut
);

app.get("/api/blog-stats", (req, res) => {
  dataCache(req, res);
});

app.get("/api/blog-search", (req, res) => {
  searchCache(req, res);
});

const port = 3000;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
