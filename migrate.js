var fs = require('fs');
var Promise = require('bluebird');
var _ = require('lodash');
var util = require('util');
var mongodb = require('mongodb');
var uuid = require('node-uuid');
var using = Promise.using;
var request = request = Promise.promisify(require("request"));

Promise.promisifyAll(fs);
Promise.promisifyAll(mongodb);

mongodb_uri  = process.env.MONGO_URI;
ghost_url = process.env.GHOST_URL

var idStart = 1000;

function getDatabase() {
  return mongodb.connectAsync(mongodb_uri).disposer(function(connection, promise) {
    connection.close();
  });
}

function getImport() {
  // http://test.sizvideos.com/ghost/api/v0.1/authentication/token
  var token =  process.env.AUTH_TOKEN;
  return request({
    url: ghost_url + '/ghost/api/v0.1/db/?access_token=' + token,
    json: true
    }).spread(function(response, body) {
      return body;
    });
}

function toGhostPost(from) {
  return { id: idStart++,
    uuid: uuid.v4(),
    title: 'import-' + from.title,
    slug: 'import-' + from.slug,
    markdown: from.title,
    html: '<p>'+ from.title + '</p>' +
          '<p>dont la source est ' + from.source.id + '</p>' +
          '<p>et les video sont là: ' + from.boxes.map(function(box){return 'http:' + box.formats[0].href}).join() + '</p>',
    image: 'http://' + from.picture.href,
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
    published_by: 1 } ;
}


using(getDatabase(), function(db) {
  return Promise.all([
    getImport(),
    db.collection("stories").find({}, {limit: 10}).toArrayAsync()
  ])
}).then(function(results) {
    console.log(results[0].db[0].data.posts);
    results[0].db[0].data.posts = results[0].db[0].data.posts.concat(results[1].map(toGhostPost));
    return results[0];
}).then(function(writeMe){
    return fs.writeFileAsync('output.json', JSON.stringify(writeMe, null, 2), {} );
   })
  .then(function() {
    console.log('fini');
  });

