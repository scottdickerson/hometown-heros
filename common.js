
numRandomImages = 0;
var subscriptions = new SubsManager();
FS.debug = true;

Router.configure({
    layoutTemplate: 'main',
    loadingTemplate: 'loading',
    notFoundTemplate: 'notFound'
});
adminDashboardRecordImages = function () {
    var profileID = this.url.split("/")[3];
    var images = Profiles.findOne(profileID).images;
    Session.set("adminDashboardImages", images);
    this.next();
};
/* remove nulls and also affix profileID */
adminDashboardImagesCleanup = function () {
    // remove nulls from images array
    // also clean up nulls in stories array
    var profileID = this.url.split("/")[3];
    var thisProfile = Profiles.findOne(profileID);
    var compactedImages = _.compact(thisProfile.images);
    var compactedStories = _.compact(thisProfile.stories);
    Profiles.update({_id: profileID}, {$set: {images: compactedImages, stories: compactedStories}});

    // set profileID on images
    for (var i = 0; i < compactedImages.length; i++) {
        Images.update(compactedImages[i], {$set: {profileID: profileID}});
    }
    // also, remove orphaned images from Images collection
    var deletedImages = _.difference(Session.get("adminDashboardImages"), compactedImages);
    for (i = 0; i < deletedImages.length; i++) {
        Images.remove(deletedImages[i]);
    }

    var photosToRemove = Images.find({$or: [{profileID: ""}, {profileID: {$exists: false}}]}).fetch();
    for (var i = 0; i < photosToRemove.length; ++i) {
        Images.remove(photosToRemove[i]._id);
    }

    // and alter profilePhotoID as needed, simply using first remaining
    if (deletedImages.indexOf(thisProfile.profilePhotoID) > -1) {
        var newProfileImageID = (compactedImages.length > 0) ? compactedImages[0] : "";
        console.log("setting profilePhotoID to: " + newProfileImageID);
        Profiles.update({_id: profileID}, {$set: {profilePhotoID: newProfileImageID}});
    } else if (!thisProfile.profilePhotoID) {
        // set profile image to newly added one, if none specified already
        if (compactedImages.length) {
            Profiles.update({_id: profileID}, {$set: {profilePhotoID: compactedImages[0]}});
        }
    }


};

Router.onRun(adminDashboardRecordImages, {
    only: ['adminDashboardProfilesEdit']
    // or except: ['routeOne', 'routeTwo']
});
Router.onStop(adminDashboardImagesCleanup, {
    only: ['adminDashboardProfilesEdit']
    // or except: ['routeOne', 'routeTwo']
});

Router.route('/', {
    name: 'home',
    template: 'home'
});

Router.route('/kioskMode', {
    name: "kioskMode",
    template: 'home',
    onAfterAction: function () {
        setTimeout(kioskMode, 2000, true);
    }
});

Router.route('/adminLogin', {
    layoutTemplate: 'edAdmin'
});
Router.route('/searchByName', {
    name: 'searchByName',
    waitOn: function () {
        // use of SubsManager => sub will be cached
        return subscriptions.subscribe('profilesFirstLastNames');
    }
});
Router.route('/profileImages', {
    layoutTemplate: 'edAdmin',
    // data: function() {
    //     return [Profiles.find({}),Images.find({})];
    // },
    waitOn: function () {
        return [subscriptions.subscribe('allImages'), subscriptions.subscribe('allProfiles')];
    }
});

Router.route('/addNewProfile', {
    waitOn: function () {
        // use of SubsManager => sub will be cached
        return subscriptions.subscribe('profilesFirstLastNames');
    }
});
Router.route('/browseByConflict');
Router.route('/browseByConflict/:_conflict', {
    name: 'browseByConflictResults',
    template: 'browseByConflictResults',
    data: function () {
        var conflict = parseInt(this.params._conflict, 10);
        var templateData = {
            conflictLabel: Conflicts.get(conflict, "label"),
            profile: Profiles.find({conflicts: {$in: [conflict]}}, {sort: {lastName: 1, firstName: 1}}).fetch()
        }
        return templateData;
    },
    waitOn: function () {
        var currentConflict = this.params._conflict;
        return subscriptions.subscribe('currentConflict', currentConflict);
    }
});
Router.route('/photoGallery', {
    waitOn: function () {
        return subscriptions.subscribe('photoGalleryPhotos');
    }
});
Router.route('/profile/:_id', {
    name: 'profile',
    template: 'profile',
    data: function () {
        var currentProfile = this.params._id;
        return Profiles.findOne({_id: currentProfile});
    },
    onBeforeAction: function () {
        var currentProfile = this.params._id;
        if (Profiles.findOne({_id: currentProfile})) {
            this.next();
        } else {
            this.render("home");
        }
    },
    waitOn: function () {
        var currentProfile = this.params._id;
        return subscriptions.subscribe('profileWithImages', currentProfile);
    }
});
Router.route('/devOnlyCreateProfiles', {
    layoutTemplate: 'edAdmin'
});


/*****************
 ** COLLECTIONS **
 *****************/

Schemas = {};
Profiles = new Mongo.Collection('profiles');
//Stories = new Mongo.Collection('stories');

var createThumb = function (fileObj, readStream, writeStream) {
    gm(readStream, fileObj.name()).resize('1500', '225').quality(70).stream().pipe(writeStream);
};

var resizeImage = function (fileObj, readStream, writeStream) {

    gm(readStream, fileObj.name()).size({bufferStream: true}, function (err, size) {
        if (!err) {
            fileObj.original.dims = {
                width: size.width,
                height: size.height,
                aspect: size.width / size.height
            };
            if (size.width > 1920 || size.height > 1080) {
                this.resize('1920', '1080').quality(82).stream().pipe(writeStream);
            } else {
                this.quality(82).stream().pipe(writeStream);
            }
        }
    });

};

Images = new FS.Collection("images", {
    stores: [
        new FS.Store.GridFS("images", {transformWrite: resizeImage}),
        new FS.Store.GridFS("thumbs", {transformWrite: createThumb})
    ],
    filter: {
        allow: {
            contentTypes: ['image/*']
            // ,
            // extensions: ['png','gif','jpg','jpeg']
        }
    }
});
Images.allow({
    insert: function (userId, doc) {
        return true;
    },
    update: function (userId, doc, fieldNames, modifier) {
        return true;
    },
    download: function (userId) {
        return true;
    }
});

/****************
 **** ENUMS *****
 ****************
 * https://github.com/zeroasterisk/meteor-super-enums
 ****************/

ServiceTypes = SEnum([
    "United States Army",
    "United States Marine Corps",
    "United States Navy",
    "United States Air Force",
    "United States Coast Guard",
    "National Guard of the United States",
    "Texas State Guard",
    "Confederate States of America Armed Forces",
    "Republic of Texas Armed Forces",
    "USO",
    "Volunteer",
    "Unknown"
]);

Conflicts = SEnum([
    "Texas Revolution",
    "Mexican War",
    "Civil War",
    "Spanish-American War",
    "World War I",
    "World War II",
    "Korean War",
    "Vietnam War",
    "Persian Gulf Wars",
    "War on Terror",
    "Peacetime",
    "Other Conflicts"
]);


/******************
 ** ADMIN CONFIG **
 *****************/

Schemas.Profiles = new SimpleSchema({
    firstName: {
        type: String,
        max: 35
    },
    lastName: {
        type: String,
        max: 45
    },
    community: {
        type: String,
        max: 100,
        optional: true
    },
    serviceType: {
        type: [Number],
        autoform: {
            options: ServiceTypes.nodes
        },
        optional: true
    },
    serviceDetail: {
        type: String,
        max: 500,
        optional: true
    },
    highestRank: {
        type: String,
        max: 100,
        optional: true
    },
    conflicts: {
        type: [Number],
        minCount: 1,
        autoform: {
            options: Conflicts.nodes
        }
    },
    medals: {
        type: String,
        max: 500,
        optional: true
    },
    images: {
        type: [String],
        regEx: SimpleSchema.RegEx.Id,
        label: 'Profile Photos and Scanned Documents',
        optional: true
    },
    "images.$": {
        autoform: {
            afFieldInput: {
                type: 'fileUpload',
                collection: 'Images',
                accept: 'image/*',
                label: 'Add photo or scanned doc',
                previewTemplate: 'adminImagePreview',
                onBeforeInsert: function () {
                    return function (fileObj) {
                        fileObj.profileID = '';
                        fileObj.curated = false;
                        fileObj.randomPoint = [Math.random(), 0];
                        fileObj.createdAt = Date.now();
                        return fileObj;
                    };
                }
            }
        }
    },
    profilePhotoID: {
        type: String,
        regEx: SimpleSchema.RegEx.Id,
        optional: true,
        autoform: {
            options: function () {
                var formId = AutoForm.getFormId();
                return _.map(AutoForm.getFieldValue('images', formId), function (id) {
                    return {label: id, value: id}
                });
            }
        }
    },
    stories: {
        type: [Object],
        optional: true
    },
    "stories.$.text": {
        type: String,
        optional: true,
        autoform: {
            type: 'textarea'
        }
    },
    "stories.$.sig": {
        type: String,
        optional: true
    },
    "stories.$.createdAt": {
        type: Number,
        optional: true,
        autoValue: function () {
            var stories = this.field("stories");
            if (stories.isSet) {
                if (this.isInsert) {
                    return Date.now();
                } else {
                    if (!this.value) {
                        return Date.now();
                    }
                }
            }
        }
    },
    contactName: {
        type: String,
        max: 100,
        optional: true
    },
    contactEmail: {
        type: String,
        regEx: SimpleSchema.RegEx.Email,
        optional: true
    },
    randomPoint: {
        type: [Number],
        decimal: true,
        minCount: 2,
        maxCount: 2,
        autoValue: function () {
            return [Math.random(), 0];
        }
    }
});


Profiles.attachSchema(Schemas.Profiles);

AdminConfig = {
    skin: 'green',
    collections: {
        Profiles: {
            icon: 'book',
            omitFields: ['randomPoint'],
            tableColumns: [
                {label: 'ID', name: '_id', template: 'linkToProfile'},
                {label: 'First Name', name: 'firstName'},
                {label: 'Last Name', name: 'lastName'}
            ],
            color: 'red',
            routes: {
                edit: {
                    waitOn: function () { return Meteor.subscribe('allImages'); },
                    onAfterAction: function() { console.log("hey"); }
                }
            }
        }
    },
    logoutRedirect: 'adminLogin'
};
AdminDashboard.addSidebarItem('Profile-related Images', '/profileImages', {icon: 'picture-o'});


ProfilesFirstNameIndex = new EasySearch.Index({
    collection: Profiles,
    fields: ['firstName'],
    engine: new EasySearch.Minimongo()
});

ProfilesLastNameIndex = new EasySearch.Index({
    collection: Profiles,
    fields: ['lastName'],
    engine: new EasySearch.Minimongo()
});


