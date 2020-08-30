var path = Npm.require('path');
var mongodb = Npm.require('mongodb');
var ObjectID = Npm.require('mongodb').ObjectID;

var chunkSize = 1024*1024*2; // 256k is default GridFS chunk size, but performs terribly for largish files

/**
 * @public
 * @constructor
 * @param {String} name - The store name
 * @param {Object} options
 * @param {Function} [options.beforeSave] - Function to run before saving a file from the server. The context of the function will be the `FS.File` instance we're saving. The function may alter its properties.
 * @param {Number} [options.maxTries=5] - Max times to attempt saving a file
 * @returns {FS.StorageAdapter} An instance of FS.StorageAdapter.
 *
 * Creates a GridFS store instance on the server. Inherits from FS.StorageAdapter
 * type.
 */

FS.Store.GridFS = function(name, options = {}) {
  var self = this;

  // Default set of options for the grid FS store
  var gridFSOptions = {}
  // options for the mongo database connection
  var mongoOptions = options.mongoOptions || {};

  if (!(self instanceof FS.Store.GridFS))
    throw new Error('FS.Store.GridFS missing keyword "new"');

  if (!options.mongoUrl) {
    options.mongoUrl = process.env.MONGO_URL;
    // When using a Meteor MongoDB instance, preface name with "cfs_gridfs."
    gridFSOptions.bucketName = "cfs_gridfs." + name;
  }

  if (!options.mongoOptions) {
    options.mongoOptions = { db: { native_parser: true }, server: { auto_reconnect: true }};
  }

  if (options.chunkSize) {
    gridFSOptions.chunkSizeBytes = options.chunkSize;
  }

  return new FS.StorageAdapter(name, options, {
    typeName: 'storage.gridfs',

    // Enforce aliases on the mongo collection and store the database when the storage adapter initializes 
    init: function(callback) {
      mongodb.MongoClient.connect(options.mongoUrl, mongoOptions, function (err, client) {
        if (err) { return callback(err); }
        FS.debug && console.log(`GRIDFS Connected to mongodb`);
        self.db = client.db();
        // Create and save the grid file store bucket so we can use it later
        self.gfs = new mongodb.GridFSBucket(self.db, gridFSOptions);
        FS.debug && console.log(`GRIDFS bucket initialized`, gridFSOptions);
        // ensure that indexes are added as otherwise CollectionFS fails for Mongo >= 3.0
        // var collection = new Mongo.Collection(gridFSOptions.bucketName);
        // collection.rawCollection().ensureIndex({ "files_id": 1, "n": 1});        
        
        callback(null);
      });
    },
    
    fileKey: function(fileObj) {
      FS.debug && console.log(`GRIDFS fileKey: `, gridFSOptions);
      // We should not have to mount the file here - We assume its taken
      // care of - Otherwise we create new files instead of overwriting
      var key = {
        _id: null,
        filename: null
      };

      // If we're passed a fileObj, we retrieve the _id and filename from it.
      if (fileObj) {
        var info = fileObj._getInfo(name, {updateFileRecordFirst: false});
        key._id = info.key || null;
        key.filename = info.name || fileObj.name({updateFileRecordFirst: false}) || (fileObj.collectionName + '-' + fileObj._id);
      }

      // If key._id is null at this point, createWriteStream will let GridFS generate a new ID
      return key;
    },

    createReadStream: function(fileKey, options = {}) {
      FS.debug && console.log(`GRIDFS createReadStream: `, gridFSOptions, fileKey, options);
      return self.gfs.openDownloadStream(new ObjectID(fileKey._id), options);
    },

    createWriteStream: function(fileKey, options = {}) {
      FS.debug && console.log(`GRIDFS createWriteStream:`, gridFSOptions, fileKey, options);
      var opts = {
        ...options,
        content_type: options.contentType || 'application/octet-stream'
      };
      
      var writeStream = self.gfs.openUploadStream(fileKey.filename, opts);

      writeStream.on('finish', function(file) {
        if (FS.debug) console.log('SA GridFS - DONE!',file._id, file.length, file.uploadDate);
        
        // Emit end and return the fileKey, size, and updated date
        writeStream.emit('stored', {
          // Set the generated _id so that we know it for future reads and writes.
          // We store the _id as a string and only convert to ObjectID right before
          // reading, writing, or deleting. If we store the ObjectID itself,
          // Meteor (EJSON?) seems to convert it to a LocalCollection.ObjectID,
          // which GFS doesn't understand.
          fileKey: file._id.toString(),
          size: file.length,
          storedAt: file.uploadDate || new Date()
        });
      });

      writeStream.on('error', function(error) {
        console.log('SA GridFS - ERROR!', error);
      });

      return writeStream;
    },

    remove: function(fileKey, callback) {
      FS.debug && console.log(`GRIDFS remove`, gridFSOptions, fileKey);
      try {
        self.gfs.delete(new ObjectID(fileKey._id), callback);
      } catch(err) {
        callback(err);
      }
    },

    // Not implemented
    watch: function() {
      throw new Error("GridFS storage adapter does not support the sync option");
    },

  });
};
