
// set in the NodeChef environment variables; restart the app to pick up changes
var KIOSK_FROM_EMAIL = process.env.KIOSK_FROM_EMAIL || 'kiosk@fi.harrisoncountymuseum.org';
// staff inbox that gets an e-mail for every new profile (env var keeps its old BCC name)
var KIOSK_BCC_EMAIL = process.env.KIOSK_BCC_EMAIL || 'kiosk@ms.harrisoncountymuseum.org';
var SITE_URL = 'https://hometownheroes.harrisoncountymuseum.org/';

// visitors' photos attach one upload at a time and stories save separately, so additions to a profile
// are collected and sent to staff as one e-mail once the profile has been quiet for this long.
// ponytail: pending additions live in memory, so ones still waiting during a restart/deploy are never e-mailed
var ADDITIONS_QUIET_MS = 2 * 60 * 1000;
var pendingAdditions = {};

function queueProfileAdditions(id, profile, newStories, newImageCount) {
    var pending = pendingAdditions[id] || (pendingAdditions[id] = {stories: [], imageCount: 0});
    pending.profile = profile;
    pending.stories = pending.stories.concat(newStories);
    pending.imageCount += newImageCount;
    Meteor.clearTimeout(pending.timer);
    pending.timer = Meteor.setTimeout(function () {
        delete pendingAdditions[id];
        try {
            sendProfileAdditionsEmail(id, pending);
        } catch (e) {
            console.error("Failed to send profile additions e-mail for " + id + ": " + e);
        }
    }, ADDITIONS_QUIET_MS);
}

function sendProfileAdditionsEmail(id, pending) {
    var heroName = pending.profile.firstName + ' ' + pending.profile.lastName;
    var msg = "New memories were added to a Hometown Heroes profile.\n\n";
    msg += "Hero: " + heroName + "\n";
    msg += "New photos: " + pending.imageCount + "   New stories: " + pending.stories.length + "\n";
    pending.stories.forEach(function (story) {
        msg += "\nStory" + (story.sig ? " signed " + story.sig : "") + ":\n" + story.text + "\n";
    });
    msg += "\nView the profile: " + SITE_URL + "profile/" + id + "\n";
    msg += "Edit it in the admin: " + SITE_URL + "admin/Profiles/" + id + "/edit\n";
    if (pending.imageCount) {
        msg += "Review the photos (search for the hero's name): " + SITE_URL + "profileImages\n";
    }
    Email.send({
        to: KIOSK_BCC_EMAIL,
        from: KIOSK_FROM_EMAIL,
        subject: "New memories added: " + heroName,
        text: msg
    });
}

function sendNewProfileEmails(id, profile) {
    var heroName = profile.firstName + ' ' + profile.lastName;
    var profileUrl = SITE_URL + 'profile/' + id;

    var staffMsg = "A new profile was added to Hometown Heroes.\n\n";
    staffMsg += "Hero: " + heroName + "\n";
    staffMsg += "Community: " + (profile.community || "(none given)") + "\n";
    staffMsg += "Submitted by: " + (profile.contactName || "(no name given)") +
        (profile.contactEmail ? " (" + profile.contactEmail + ")" : ", no e-mail given") + "\n";
    staffMsg += "Photos: " + (profile.images || []).length + "   Stories: " + (profile.stories || []).length + "\n\n";
    staffMsg += "View the profile: " + profileUrl + "\n";
    staffMsg += "Review it in the admin: " + SITE_URL + "admin/Profiles/" + id + "/edit\n";
    Email.send({
        to: KIOSK_BCC_EMAIL,
        from: KIOSK_FROM_EMAIL,
        subject: "New Hometown Heroes profile: " + heroName,
        text: staffMsg
    });

    if (profile.contactEmail) {
        var msg = "Greetings, " + profile.contactName + ",\n\n";
        msg += "Thanks for visiting our kiosk at the Harrison County Historical Museum.  ";
        msg += "As promised, here's the link to the entry you created for " + heroName + ".\n\n";
        msg += profileUrl + "\n\n";
        msg += "You can visit the profile page at any time to add images and other memories to the profile.\n\n";
        msg += "Thanks from the HCHM staff!\n\n";
        msg += "(This email is automatically generated. Please do not reply to it.)";
        Email.send({
            to: profile.contactEmail,
            from: KIOSK_FROM_EMAIL,
            subject: "Hometown Heroes profile for " + heroName,
            text: msg
        });
    }
}

Meteor.startup(function () {
    // following environment variable set up directly on Modulus/Xervo account
   //  process.env.MAIL_URL has to be set according to the google drive document "Hometown Heroes: Database information"

    Profiles._ensureIndex({randomPoint: '2dsphere'});

    ProfilesFirstNameIndex = new EasySearch.Index({
        collection: Profiles,
        fields: ['firstName'],
        engine: new EasySearch.MongoDB()
    });

    Accounts.emailTemplates.from = "HCHM Kiosk <" + KIOSK_FROM_EMAIL + ">";

    // estimate createdAt for profiles saved before it existed: their earliest story or photo date.
    // bypassCollection2 so the backfill doesn't also stamp updatedAt
    Profiles.find({createdAt: {$exists: false}}, {fields: {stories: 1, images: 1}}).forEach(function (profile) {
        var times = _.pluck(profile.stories || [], 'createdAt');
        Images.find({_id: {$in: profile.images || []}}, {fields: {createdAt: 1}}).forEach(function (image) {
            times.push(image.createdAt);
        });
        times = _.filter(times, _.isNumber);
        if (times.length) {
            Profiles.update(profile._id, {$set: {createdAt: new Date(_.min(times))}}, {bypassCollection2: true});
        }
    });

    // e-mail staff (and the visitor, if they gave an address) whenever a profile is created.
    // ponytail: every server instance sends its own copy; switch to a server method if NodeChef is scaled past one container
    var initializing = true;
    Profiles.find({}, {
        fields: {firstName: 1, lastName: 1, community: 1, contactName: 1, contactEmail: 1, images: 1, stories: 1}
    }).observeChanges({
        added: function (id, profile) {
            if (initializing) {
                return;
            }
            Meteor.defer(function () {
                try {
                    sendNewProfileEmails(id, profile);
                } catch (e) {
                    console.error("Failed to send new profile e-mails for " + id + ": " + e);
                }
            });
        }
    });
    initializing = false;

    // e-mail staff when stories or photos are added to an existing profile
    Profiles.find({}, {fields: {firstName: 1, lastName: 1, stories: 1, images: 1}}).observe({
        changed: function (newProfile, oldProfile) {
            var oldStoryTimes = _.pluck(oldProfile.stories || [], 'createdAt');
            var newStories = _.filter(newProfile.stories || [], function (story) {
                return story && !_.contains(oldStoryTimes, story.createdAt);
            });
            var newImageCount = _.difference(_.compact(newProfile.images || []), oldProfile.images || []).length;
            if (newStories.length || newImageCount) {
                queueProfileAdditions(newProfile._id, newProfile, newStories, newImageCount);
            }
        }
    });
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
