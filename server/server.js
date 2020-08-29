
Meteor.startup(function () {
    // following environment variable set up directly on Modulus/Xervo account
    // process.env.MAIL_URL = "smtp://servicedatabasekiosk@harrisoncountymuseum.org:nG21GN5wMJyPGsDAlHt1@smtp.bizmail.yahoo.com:465";

    Profiles._ensureIndex({randomPoint: '2dsphere'});

    ProfilesFirstNameIndex = new EasySearch.Index({
        collection: Profiles,
        fields: ['firstName'],
        engine: new EasySearch.MongoDB()
    });

    Accounts.emailTemplates.from = "HCHM Kiosk <servicedatabasekiosk@harrisoncountymuseum.org>";

});

Meteor.methods({
    sendEmail: function (to, from, subject, text) {
        check([to, from, subject, text], [String]);

        // Let other method calls from the same client start running,
        // without waiting for the email sending to complete.
        this.unblock();

        Email.send({
            to: to,
            from: from,
            subject: subject,
            text: text,
            bcc: 'hchminfo@gmail.com'
        });
    },
    getImagesCount: function () {
        return Images.find().count();
    },
    getCuratedImagesCount: function () {
        return Images.find({curated: true}).count();
    }
});

Meteor.publish('allProfiles', function () {
    return Profiles.find();
});
Meteor.publish('profileWithImages', function (pId) {
    var pCursor = Profiles.find(pId);
    var images = pCursor.fetch()[0].images;
    return [pCursor, Images.find({_id: {$in: images}})];
});
Meteor.publish('currentConflict', function (cNum) {
    cNum = parseInt(cNum, 10);
    var pCursor = Profiles.find({conflicts: {$in: [cNum]}}, {
        fields: {
            firstName: 1,
            lastName: 1,
            conflicts: 1,
            profilePhotoID: 1
        }
    });
    var imageIDs = pCursor.map(function (p) {
        return p.profilePhotoID
    });
    return [pCursor, Images.find({_id: {$in: imageIDs}})];
});
Meteor.publish('allImages', function () {
    return Images.find();
});
Meteor.publish('images', function (imageIDs) {
    return Images.find({_id: {$in: imageIDs}});
});
Meteor.publish('carouselPhotos', function () {
    // curated images only
    return Images.find({curated:true}, {limit: 22});
});
Meteor.publish('photoGalleryPhotos', function () {
    // all curated images 
    return Images.find({curated:true});
});

Meteor.publish('profilesFirstLastNames', function () {
    return Profiles.find({}, {
        fields: {
            firstName: 1,
            lastName: 1
        }
    });
});

Meteor.publish('searchResultsData', function (profileIDs) {
    var profilesCursor = Profiles.find({
        '_id': {$in: profileIDs}
    });
    var imageIDs = profilesCursor.map(function (p) {
        return p.profilePhotoID;
    });
    imageIDs = _.compact(imageIDs);
    return [profilesCursor, Images.find({
        '_id': {$in: imageIDs}
    })];
});
