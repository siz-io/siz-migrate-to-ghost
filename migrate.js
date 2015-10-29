var fs = require('fs');
var Promise = require('bluebird');
var _ = require('lodash');
var util = require('util');
var mongodb = require('mongodb');
var uuid = require('node-uuid');
var using = Promise.using;
var request = request = Promise.promisify(require("request"));
var showdown = require('showdown');

var converter = new showdown.Converter();

Promise.promisifyAll(fs);
Promise.promisifyAll(mongodb);

mongodb_uri = process.env.MONGO_URI;
ghost_url = process.env.GHOST_URL

var idStart = 1000;

function getDatabase() {
  return mongodb.connectAsync(mongodb_uri).disposer(function (connection, promise) {
    connection.close();
  });
}

function getImport() {
  // http://test.sizvideos.com/ghost/api/v0.1/authentication/token
  var token = process.env.AUTH_TOKEN;
  return request({
    url: ghost_url + '/ghost/api/v0.1/db/?access_token=' + token,
    json: true
  }).spread(function (response, body) {
    return body;
  });
}

function toGhostPost(from) {
  var markdown = from.boxes.map(function (box) {
    return '![](http:' + box.formats.filter(function (format) {
      return format.type === "gif";
    })[0].href + ')'
  }).join('\n') + '\n\n' + '<iframe width="560" height="315" src="https://www.youtube.com/embed/' + from.source.id + '" frameborder="0" allowfullscreen></iframe>';

  var html = converter.makeHtml(markdown);

  return {
    id: idStart++,
    uuid: uuid.v4(),
    title: from.title,
    slug: from.slug,
    markdown: markdown,
    html: html,
    image: 'http:' + from.picture.href,
    featured: 0,
    page: 0,
    status: 'published',
    language: 'en_US',
    meta_title: null,
    meta_description: null,
    author_id: 1,
    created_at: '2015-10-15T13:29:20.000Z',
    created_by: 1,
    updated_at: '2015-10-15T13:29:32.000Z',
    updated_by: 1,
    published_at: '2015-10-15T13:29:32.000Z',
    published_by: 1
  };
}


using(getDatabase(), function (db) {
    return Promise.props({
      dbImport: getImport(),
      stories: db.collection("stories").find({}).toArrayAsync()
    })
  }).then(function (results) {
    var db = results.dbImport.db;
    console.log(db[0].data.posts);

    //db[0].data.posts = db[0].data.posts.concat(results.stories.map(toGhostPost));

    /*delete results.dbImport.db[0].meta;
    delete results.dbImport.db[0].data.permissions;
    delete results.dbImport.db[0].data.permissions_roles;

    delete results.dbImport.db[0].data.roles;
    delete results.dbImport.db[0].data.settings;

    delete results.dbImport.db[0].data.posts_tags;
    delete results.dbImport.db[0].data.tags;

    delete results.dbImport.db[0].data.roles_users;
    delete results.dbImport.db[0].data.users;*/

    // on va chunker pour aider un peu ghost à importer les data.


    var newPosts = results.stories.map(toGhostPost);
    var chunks = [];

    var i, j = 0;
    var chunk = 10;
    for (
      i = 0, j = newPosts.length; i < j; i += chunk
    ) {
      chunks.push(newPosts.slice(i, i + chunk));
    }

    return chunks.map(function (chunk, index) {
      return JSON.stringify({
        db: [{
          data: {
            posts: chunk
          }
        }]
      }, null, 2);
    });

    //return results.dbImport;
  }).map(function (chunk, index) {
    var filename = 'output-' + index + '.json';
    return fs.writeFileAsync(filename, chunk, {})
      .then(function () {
        console.log('chunk written');
      })
      .return(filename);
  }, {
    concurrency: 1
  })
  .map(function (filename) {

    var formData = {
      importfile: fs.createReadStream(filename)
    }

    return request({
      url: ghost_url + "/ghost/api/v0.1/db/",
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + process.env.AUTH_TOKEN
      },
      formData: formData
    }).spread(function (response, body) {
      console.log(filename + ' imported.');
    }).return(filename);
  }, {
    concurrency: 1
  })
  .then(function () {
    console.log('fini');
  });