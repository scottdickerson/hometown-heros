
String.prototype.toTitleCase = function () {
    // also prevent folks from adding name in ALL CAPS
    // return this.charAt(0).toUpperCase() + this.slice(1).toLowerCase();
    return this.replace(/\w\S*/g, function (txt) {
        return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
    });
};

Meteor.Spinner.options = {
    lines: 13, // The number of lines to draw
    length: 15, // The length of each line
    width: 4, // The line thickness
    radius: 15, // The radius of the inner circle
    corners: 1.0, // Corner roundness (0..1)
    opacity: 0.2, // rotate: 15, // The rotation offset
    // direction: 1, // 1: clockwise, -1: counterclockwise
    color: '#F59000', // #rgb or #rrggbb
    speed: 0.8, // Rounds per second
    trail: 65 // Afterglow percentage
};

$.validator.setDefaults({
    rules: {
        firstName: {
            required: true
        }, lastName: {
            required: true
        }, contactEmail: {
            email: true
        }, sFirstName: {
            required: function () {
                return $("[name=sLastName]").val() == "";
            }
        }, sLastName: {
            required: function () {
                return $("[name=sFirstName]").val() == "";
            }
        }, email: {
            required: true, email: true
        }, password: {
            required: true, minlength: 6
        }
    }, messages: {
        firstName: {
            required: "You must enter all or part of their first name."
        }, lastName: {
            required: "You must enter all or part of their last name."
        }, contactEmail: {
            email: "You've entered an invalid email address."
        }, sFirstName: {
            required: "You must enter either a first or a last name."
        }, sLastName: {
            required: "You must enter either a first or a last name."
        }, email: {
            required: "You must enter an email address.", email: "You've entered an invalid email address."
        }, password: {
            required: "You must enter a password.", minlength: "Your password must be at least {0} characters."
        }
    }
});

// global helpers
Template.registerHelper('isKiosk', function () {
    return Session.get("isKiosk");
});
Template.registerHelper('screensaverActive', function () {
    return Session.get("isKiosk") && Session.get("screensaver_active");
});
Template.registerHelper('isHomePage', function () {
    return Router.current().route.getName() == "home";
});
Template.registerHelper('conflict', function () {
    // Conflicts is not a Meteor collection, it is an SEnum
    // https://github.com/zeroasterisk/meteor-super-enums
    return Conflicts.nodes;
});
Template.registerHelper('serviceType', function () {
    // ServiceTypes is not a Meteor collection, it is an SEnum
    // https://github.com/zeroasterisk/meteor-super-enums
    return ServiceTypes.nodes;
});
Template.registerHelper('image', function () {
    return Images.findOne(this.profilePhotoID);
});
Template.registerHelper('tapclick', function () {
    return (Session.get("isKiosk")) ? "tap" : "click";
})

// SCREENSAVER
var mousetimeout = 0;
Session.set("screensaver_active", false);
var idletime = 60; // # of seconds idle before screensaver kicks in
var screensaver_timeline;


function show_screensaver() {
    var routeName = Router.current().route.getName();
    if (routeName.indexOf('admin') == -1) {
        if (Router.current().route.getName() != "home") {
            // close keyboard if present
            if ($('.ui-keyboard').length > 0) {
                var keyboard = $('.ui-keyboard').getkeyboard();
                keyboard.close();
            }
            Router.go('home');
        }
        Session.set("screensaver_active", true);
    }
}

function stop_screensaver() {
    // screensaver_timeline.stop();
    $('#screensaver').fadeOut(400, function () {
        stopScreensaverVideo();
        Session.set("screensaver_active", false);
    });
}


// END SCREENSAVER

Template.screensaver.onRendered(function () {

    // start
    $('#screensaver').hide().fadeIn(1000);
    setTimeout(startScreensaverVideo, 1000);
    // screensaver_timeline.play();
});

function startScreensaverVideo() {
    var vid = $('.screensaver-video').get(0);
    vid.play();
}

function stopScreensaverVideo() {
    var vid = $('.screensaver-video').get(0);
    vid.pause();
    vid.currentTime = 0;
}

Template.nav.onCreated(function () {
    kioskMode(false);
});
Template.nav.onRendered(function () {
    document.addEventListener('touchstart', function (event) {
        // event.preventDefault();
    });
});

Template.nav.events({
    'click .back-btn': function (e) {
        e.preventDefault();
        window.history.back();
    }
});

Template.home.onCreated(function () {
    Session.set("numFrontCarouselPhotos", 0);
    // searchFields set when routing directly from "searchByName" to "profile"
    Session.set("searchFields", ["", ""]);
});


Template.photoCarousel.onCreated(function () {

    // subscribe to carouselPhotos
    this.rPoint = [Math.random(), 0];
    this.subscribe('carouselPhotos', this.rPoint);
});
// Template.photoCarousel.on(function(){
//     console.log("subscriptionsReady: " + Images.find().count());
// });
Template.photoCarousel.onRendered(function () {
    $('.photo-carousel-row').css({opacity: 0});
});
Template.photoCarousel.helpers({
    "carouselImage": function () {
        if (Template.instance().subscriptionsReady()) {
            setTimeout(initPhotoCarousel, 500);
            return Images.find({curated: true}, {limit: 22});
        }
    }
});
initPhotoCarousel = function () {
    $('.front-carousel-image-container').slick({
        dots: false,
        infinite: true,
        speed: 850,
        cssEase: 'cubic-bezier(.53,-0.43,.47,1.27)',
        slidesToShow: 6,
        slidesToScroll: 6,
        autoplay: true,
        autoplaySpeed: 2500,
        centerMode: false,
        variableWidth: true,
        prevArrow: '<button type="button" data-role="none" class="slick-prev" aria-label="Previous" tabindex="0" role="button"><img src="/images/buttons/Arrow-Left.png"></button>',
        nextArrow: '<button type="button" data-role="none" class="slick-next" aria-label="Next" tabindex="0" role="button"><img src="/images/buttons/Arrow-Right.png"></button>',
        swipeToSlide: true,
        responsive: [{
            breakpoint: 768, settings: {
                arrows: false
            }
        }]
    });
    $('.photo-carousel-row').animate({opacity: 1}, 600);

}



Template.searchByName.onCreated(function () {
    Session.set("nameSearchResults", []);
    // don't want to overwrite any prior values, but want it defined
    if (Session.get("searchFields") == null) {
        Session.set("searchFields", ["", ""]);
    }
});
Template.searchByName.onRendered(function () {
    initKeyboard('.search-name-keyboard', '[name=sFirstName]', false);
    var fields = Session.get('searchFields');
    if (fields[0] || fields[1]) {
        // repopulate fields and restore search table
        $('[name=sFirstName]').val(fields[0]);
        $('[name=sLastName]').val(fields[1]);
        $('form.search-name').submit();
        // making sure keyboard is hidden
        var keyboard = $('.ui-keyboard').getkeyboard();
        keyboard.close();
    }
    var that = this;
    setTimeout(function () {
        that.$('[name=sFirstName]').focus();
    }, 100);
    $('.ppdx-content').addClass('overflow-hidden');
});
Template.searchByName.helpers({
    'numMatches': function () {
        var nm = Session.get('nameSearchResults').length;
        return (nm === 1) ? "<span class='search-results-number'>1</span> POSSIBLE MATCH" : "<span class='search-results-number'>" + nm + "</span> POSSIBLE MATCHES";
    }
});
Template.searchByName.onDestroyed(function () {
    if (Router.current().route.getName() == "profile") {
        // moving directly from search to profile view => click on search results
        Session.set("searchFields", [$('[name=sFirstName]').val().trim(), $('[name=sLastName]').val().trim()]);
    } else {
        Session.set("searchFields", ["", ""]);
    }
    $('.ppdx-content').removeClass('overflow-hidden');
});
Template.searchNameForm.events({
    'submit form': function (e) {
        e.preventDefault();
    }, 'mousedown input': function (e) {
        if ($('.search-some-results').css('opacity') > 0 || $('.search-no-results').css('opacity') > 0) {
            var transDur = 250;
            $('.search-some-results').hide();
            $('.search-no-results').hide();
            $('.btn-name-search-container').addClass('wide');
        }
    }, 'keyup input': function (e) {
        // DON"T KNOW WHY I COULDN'T PUT KEYUP INPUT WITH MOUSEDOWN INPUT

        // allow for <enter>
        if (e.which != 13) {
            $('.search-some-results').hide();
            $('.search-no-results').hide();
            $('.btn-name-search-container').addClass('wide');
        }
    }
});
Template.searchNameForm.onRendered(function () {
    // handy references
    var transDur = 250;

    $('.search-some-results').hide();
    $('.search-no-results').hide();
    $('.btn-name-search-container').addClass('wide');

    // set up validator
    var validator = $('.search-name').validate({
        submitHandler: function (e) {

            var fName = $('[name=sFirstName]').val().trim();
            var lName = $('[name=sLastName]').val().trim();
            var result, fNameResults, lNameResults;

            if (fName == "") {
                // validator ensures lName has something
                result = ProfilesLastNameIndex.search(lName, {limit: 1000}).fetch();
                // add fuzzy matches to results if empty
                if (result.length == 0) {
                    // expose entire collection
                    var tempCursor = Profiles.find({});

                    // find most similar string
                    var bestLastName = mostSimilarString(tempCursor, "lastName", lName, -1, false);
                    result = Profiles.find({lastName: bestLastName}).fetch();
                }
            } else if (lName == "") {
                result = ProfilesFirstNameIndex.search(fName, {limit: 1000}).fetch();

                // add fuzzy matches to results if empty
                if (result.length == 0) {
                    // expose entire collection
                    var tempCursor = Profiles.find({});

                    // find most similar string
                    var bestFirstName = mostSimilarString(tempCursor, "firstName", fName, -1, false);
                    result = Profiles.find({firstName: bestFirstName}).fetch();
                }
            } else {
                fNameResults = ProfilesFirstNameIndex.search(fName, {limit: 1000}).fetch();
                lNameResults = ProfilesLastNameIndex.search(lName, {limit: 1000}).fetch();

                // add fuzzy matches to results if cursors are empty
                if (fNameResults.length == 0 || lNameResults.length == 0) {
                    // expose entire collection
                    var tempCursor = Profiles.find({});

                    // find most similar string
                    if (fNameResults.length == 0) {
                        var bestFirstName = mostSimilarString(tempCursor, "firstName", fName, -1, false);
                        fNameResults = Profiles.find({firstName: bestFirstName}).fetch();
                    }
                    if (lNameResults.length == 0) {
                        var bestLastName = mostSimilarString(tempCursor, "lastName", lName, -1, false);
                        lNameResults = Profiles.find({lastName: bestLastName}).fetch();
                    }
                }
                result = _.filter(fNameResults, function (item1) {
                    return _.some(this, function (item2) {
                        return item1._id === item2._id;
                    });
                }, lNameResults);
            }

            Session.set('nameSearchResults', result);

            if (result.length > 0) {
                $('.search-some-results').fadeIn();
            } else {
                $('.search-no-results').fadeIn();
            }

            $('.btn-name-search-container').removeClass('wide');
        }
    });
});


Template.addNewProfile.onCreated(function () {
    var npd = Session.get("newProfileData");
    if (npd == null) {
        resetNewProfileData();
    } else {
        if (npd.conflicts.length == 0 && npd.firstName != "" && npd.lastName != "") {
            // we got here after viewing profile of possible match
            // since name is filled out but conflicts (which will be required) is not

            // repopulate fields and restore search table
            // HACK: DOM isn't rendered yet, but will be soon.
            // If this fails, no real harm done.
            setTimeout(function () {
                // we don't want to see the keyboard at this point
                if ($('.ui-keyboard').length > 0) {
                    var keyboard = $('.ui-keyboard').getkeyboard();
                    keyboard.close();
                }

                $('[name=firstName]').val(npd.firstName);
                $('[name=lastName]').val(npd.lastName);
                $('form.add-name').submit();

            }, 100);
        } else {
            resetNewProfileData();
        }
    }

    // following two values will be overwritten immediately,
    // but initializing them to correct values causes progress bar to initially render
    // correctly rather than animating up from 0
    Session.set("profileCreationCurrentStep", 1);
    Session.set("profileCreationNumSteps", 7);
    // Story and photos are kept separate cuz they're added to different collections.
    // IDs must be retained so associations can be made later when Profile ID is created.
    //Session.set("newProfileStoryText", "");
    Session.set("newProfilePhotos", []);
    Session.set("newProfileID", "");

    Session.set("nameChecked", false);
    Session.set("contactEmailChecked", false);

});
Template.addNewProfile.onRendered(function () {
    var $sectionList = $('.add-new-profile-section');
    $sectionList.eq(0).show();

    Session.set("profileCreationCurrentStep", 1);
    // final div is "successfully added" message
    Session.set("profileCreationNumSteps", $sectionList.length - 1);

    // this.$('.next-btn').addClass('disabled');
    this.$('.back-btn').addClass('ppdx-hidden');
    this.$('.create-profile-btn').addClass('ppdx-hidden');
});
Template.addNewProfile.onDestroyed(function () {
    cleanUpOrphanedStoriesAndPhotos();

    if (Router.current().route.getName() !== "profile") {
        resetNewProfileData();
    }
});
Template.addNewProfile.helpers({
    'profileCreated': function () {
        // final acknowledgement screen is beyond last step of creation
        return (Session.get("profileCreationCurrentStep") > Session.get("profileCreationNumSteps"));
    }, 'nameDefined': function () {
        return (Session.get("newProfileData").firstName != "" && Session.get("newProfileData").lastName != "");
    }, 'fullName': function () {
        return Session.get("newProfileData").firstName + " " + Session.get("newProfileData").lastName;
    }, 'progPerc': function () {
        return Math.round(100 * Session.get("profileCreationCurrentStep") / Session.get("profileCreationNumSteps"));
    }, 'currentStep': function () {
        return Session.get("profileCreationCurrentStep");
    }, 'numSteps': function () {
        return Session.get("profileCreationNumSteps");
    }
});
Template.addNewProfile.events({
    'click .back-btn': function (e, template) {
        if ($(e.currentTarget).hasClass('disabled')) {
            return;
        }

        // enable back button
        if (Session.get("profileCreationCurrentStep") < 4) {
            $(e.currentTarget).addClass('ppdx-hidden');
        } else {
            // disallow quick click-through
            $(e.currentTarget).addClass('disabled');
        }

        Session.set("profileCreationCurrentStep", Session.get("profileCreationCurrentStep") - 1);
        if (Session.get("profileCreationCurrentStep") == 1) {
            // $(e.currentTarget).hide();
            $(e.currentTarget).addClass('ppdx-hidden');
        }

        var $currentDiv = template.$('.add-new-profile-section:visible');
        var $strip = template.$('.add-new-profile-strip');

        $strip.css('left', '-100vw');
        $currentDiv.prev().show();
        var prevDivClass = $currentDiv.prev().attr('class');

        if (prevDivClass.indexOf('add-new-profile-additional') > -1) {
            initKeyboard('.addl-info-keyboard', '.service-detail-input', false);
        } else if (prevDivClass.indexOf('add-new-profile-stories-photos') > -1) {
            initKeyboard('.story-keyboard', '.story-keyboard', false);
        } else if (prevDivClass.indexOf('add-new-profile-contact') > -1) {
            initKeyboard('.contact-keyboard', '.get-a-link', false);
        }

        $strip.animate({left: 0}, 400, 'easeInOutCubic', function () {
            $currentDiv.hide();
            // if (Session.get("profileCreationCurrentStep") > 3) {
            $(e.currentTarget).removeClass('disabled');
            // }

            // some divs want the first input focused after the transition
            switch (Session.get("profileCreationCurrentStep")) {
                case 4:
                    template.$('.service-detail-input').focus();
                    break;
                case 5:
                    template.$('.story-textarea').focus();
                    break;
                case 6:
                    // contact info will be step 7 on home desktop,
                    // but no matter since onscreen keybd not used.
                    template.$('.contact-name-input').focus();
                    break;
            }
        });
        //
        // $currentDiv.prev().show("slide", {direction: 'left'}, 400);
        // $currentDiv.hide("slide", {direction: 'right'}, 400, function () {
        //     // if (Session.get("profileCreationCurrentStep") > 3) {
        //     $(e.currentTarget).removeClass('disabled');
        //     // }
        //
        //     // some divs want the first input focused after the transition
        //     switch (Session.get("profileCreationCurrentStep")) {
        //         case 4:
        //             template.$('.service-detail-input').focus();
        //             break;
        //         case 5:
        //             template.$('.story-textarea').focus();
        //             break;
        //         case 6:
        //             // contact info will be step 7 on home desktop,
        //             // but no matter since onscreen keybd not used.
        //             template.$('.contact-name-input').focus();
        //             break;
        //     }
        // });

        if (template.$('.create-profile-btn').is(':visible')) {
            template.$('.create-profile-btn').addClass('ppdx-hidden disabled');
            // template.$('.next-btn').removeClass('disabled');
            setTimeout("$('.next-btn.ppdx-add-profile-navbtn').removeClass('ppdx-hidden disabled');", 400);

            // template.$('.create-profile-btn').addClass('disabled').fadeOut(400, function () {
            //     template.$('.next-btn').removeClass('disabled');
            // });
        }
    }, 'click .next-btn': function (e, template) {
        if ($(e.currentTarget).hasClass('disabled') || (Session.get("profileCreationCurrentStep") == Session.get("profileCreationNumSteps"))) {
            return;
        }
        // disallow quick click-through
        $(e.currentTarget).addClass('disabled');

        // enable back button, remember, we're doing this test before incrementing current step num
        if (Session.get("profileCreationCurrentStep") > 1) {
            // template.$('.back-btn').show();
            template.$('.back-btn').removeClass('ppdx-hidden');
        }

        if (Session.get("profileCreationCurrentStep") == 1 && !Session.get("nameChecked")) {
            // HACK: per client request, repurposing Next btn to submit add name form
            $(e.currentTarget).removeClass('disabled');
            template.$('form.add-name').submit();
            return;
        }

        if ($('.add-new-profile-contact').is(":visible") && !Session.get("contactEmailChecked")) {
            // HACK to make sure contact email is OK before proceeding
            $(e.currentTarget).removeClass('disabled');
            console.log("submitting contact info form and returning");
            template.$('form.contact-info').submit();
            return;
        } else {
            // successfully checked email.
            // set back to false in case user backs up and edits
            Session.set('contactEmailChecked', false);
        }

        var $currentDiv = template.$('.add-new-profile-section:visible');
        var $strip = template.$('.add-new-profile-strip');

        Session.set("profileCreationCurrentStep", Session.get("profileCreationCurrentStep") + 1);

        $currentDiv.next().show();
        var nextDivClass = $currentDiv.next().attr('class');

        if (nextDivClass.indexOf('add-new-profile-additional') > -1) {
            initKeyboard('.addl-info-keyboard', '.service-detail-input', false);
        } else if (nextDivClass.indexOf('add-new-profile-stories-photos') > -1) {
            initKeyboard('.story-keyboard', '.story-keyboard', false);
        } else if (nextDivClass.indexOf('add-new-profile-contact') > -1) {
            initKeyboard('.contact-keyboard', '.get-a-link', false);
        }

        $strip.animate({left: "-100vw"}, 400, 'easeInOutCubic', function () {
            $currentDiv.hide();
            $(this).css('left', 0);
            if (Session.get("profileCreationCurrentStep") > 2) {
                // only the first two steps are required, so they're the only ones gated
                $(e.currentTarget).removeClass('disabled');
            }

            // some divs want the first input focused after the transition
            switch (Session.get("profileCreationCurrentStep")) {
                case 4:
                    template.$('.service-detail-input').focus();
                    break;
                case 5:
                    template.$('.story-textarea').focus();
                    break;
                case 6:
                    // contact info will be step 7 on home desktop,
                    // but no matter since onscreen keybd not used.
                    template.$('.contact-name-input').focus();
                    break;
            }

        });


        // $currentDiv.next().show("slide", {direction: 'right'}, 4000);
        // $currentDiv.hide("slide", {direction: 'left'}, 4000, function () {
        //     if (Session.get("profileCreationCurrentStep") > 2) {
        //         // only the first two steps are required, so they're the only ones gated
        //         $(e.currentTarget).removeClass('disabled');
        //     }
        //
        //     // some divs want the first input focused after the transition
        //     switch (Session.get("profileCreationCurrentStep")) {
        //         case 4:
        //             template.$('.service-detail-input').focus();
        //             break;
        //         case 5:
        //             template.$('.story-textarea').focus();
        //             break;
        //         case 6:
        //             // contact info will be step 7 on home desktop,
        //             // but no matter since onscreen keybd not used.
        //             template.$('.contact-name-input').focus();
        //             break;
        //     }
        //
        // });
        //


        if (Session.get("profileCreationCurrentStep") == Session.get("profileCreationNumSteps")) {
            //template.$('.create-profile-btn').show("slide", {direction: 'right'}, 400);
            $(e.currentTarget).addClass('ppdx-hidden');
            setTimeout("$('.create-profile-btn.ppdx-add-profile-navbtn').removeClass('disabled ppdx-hidden');", 400);
            // template.$('.create-profile-btn').removeClass('disabled');
            // $(e.currentTarget).fadeOut(400, function () {
            //     template.$('.create-profile-btn').removeClass('disabled');
            // });
        }

    }, 'click .btn-cancel-add-new-profile': function () {
        Router.go('home');
        // Router redirect doesn't work for 'addNewProfile' since we're already on that route
        // location.reload();
    }, 'click .create-profile-btn': function (e, template) {
        // remove nav at bottom
        template.$('.add-new-profile-nav').hide();

        // date for createdAt.  Going to add 1 msec for stories so they follow
        var now = Date.now();

        // set images
        setNewProfileProp('images', Session.get("newProfilePhotos"));

        if (Session.get('newProfileData').stories.length > 0) {
            if (Session.get('newProfileData').stories[0].text == "") {
                // remove story if blank
                setNewProfileProp('stories', []);
            } else {
                var stories = Session.get('newProfileData').stories;
                stories[0].createdAt = now + 1;
                setNewProfileProp('stories', stories);
            }
        }

        // insert profile
        var profileID = Profiles.insert(Session.get('newProfileData'), function (error, results) {
            if (error) {
                alert("There was an error:\n\n" + error);
                Router.go('home');
            }
        });
        Session.set('newProfileID', profileID);

        var cEmail = Session.get('newProfileData').contactEmail;
        var cName = Session.get('newProfileData').contactName;
        // send email?
        if (cEmail) {
            var msg = "Greetings, " + cName + ",\n\n";
            msg += "Thanks for visiting our kiosk at the Harrison County Historical Museum.  ";
            msg += "As promised, here's the link to the entry you created for " + Session.get('newProfileData').firstName + " " + Session.get('newProfileData').lastName + ".\n\n";
            msg += "http://hometownheroes.harrisoncountymuseum.org/profile/" + profileID + "\n\n";
            msg += "Thanks from the HCHM staff!\n\n";
            msg += "(This email is automatically generated. Please do not reply to it.)";

            Meteor.call('sendEmail', cEmail, 'servicedatabasekiosk@harrisoncountymuseum.org', 'Automated email from HCHM Kiosk', msg);
        }

        // insert any "truthy" story added
        //if (Session.get('newProfileStoryText')) {
        //    Stories.insert({
        //        profileID: profileID,
        //        text: Session.get('newProfileStoryText')
        //    });
        //}


        // use ID to associate any images added
        var newPhotos = Session.get('newProfilePhotos');
        for (var i = 0; i < newPhotos.length; ++i) {
            //if (i == 0) {
            //    // set first image user chose as profile photo
            //    setNewProfileProp('profilePhotoID',newPhotos[i]);
            //}
            Images.update(newPhotos[i], {$set: {'profileID': profileID, 'createdAt': now}});
        }

        // just in case...
        //Session.set("newProfileStoryText", "");
        Session.set("newProfilePhotos", []);

        // show final message
        var $currentDiv = template.$('.add-new-profile-section:visible');
        $currentDiv.next().show("slide", {direction: 'right'}, 400);
        $currentDiv.hide("slide", {direction: 'left'}, 400);

        Session.set("profileCreationCurrentStep", Session.get("profileCreationCurrentStep") + 1);
    }
});
Template.addNewProfileName.onCreated(function () {
    Session.set("nameSearchResults", []);
});
Template.addNewProfileName.onRendered(function () {
    var that = this;
    setTimeout(function () {
        initKeyboard('.add-name-keyboard', '[name=firstName]', false);
        that.$('[name=firstName]').focus();
    }, 10);
});
Template.addNewProfileName.helpers({
    'numMatches': function () {
        var nm = Session.get('nameSearchResults').length;
        return (nm === 1) ? "1 other possible match has" : nm + " other possible matches have";
    }
});

Template.addNameForm.events({
    'submit form': function (e) {
        e.preventDefault();
    },

    'mousedown input': function (e) {
        if ($('.add-new-profile-name-disambiguation').is(':visible') || $('.add-new-profile-name-not-found').is(':visible')) {
            var transDur = 250;
            $('.add-new-profile-name-disambiguation').fadeOut(transDur);
            $('.add-new-profile-name-not-found').fadeOut(transDur);
        }
    }, 'keyup input': function (e) {
        // DON"T KNOW WHY I COULDN'T PUT KEYUP INPUT WITH MOUSEDOWN INPUT
        $('.add-new-profile-name-disambiguation').hide();
        $('.add-new-profile-name-not-found').hide();
    }, 'change input': function (e) {
        // user might change input field after name search executed
        Session.set("nameChecked", false);
    }
});
Template.addNameForm.onRendered(function () {
    // handy references
    var fName = Session.get("newProfileData").firstName;
    var lName = Session.get("newProfileData").lastName;
    var slideDur = 250;

    //$('.next-btn.ppdx-add-profile-navbtn').addClass('disabled');
    $('.add-new-profile-name-disambiguation').hide();
    $('.add-new-profile-name-not-found').hide();

    // prefill fields ?
    //if (Session.get('lorem')) {
    //    $('[name=firstName]').val(fName);
    //    $('[name=lastName]').val(lName);
    //}

    // first input focus
    // var $firstInput = $('[name=firstName]').focus();
    if (Session.get('isKiosk')) {
        // jsKeyboard.currentElement = $firstInput;
        // jsKeyboard.currentElementCursorPosition = fName.length;
    }

    // set up validator
    var validator = $('.add-name').validate({
        messages: {
            firstName: {
                required: "You must enter their first name."
            }, lastName: {
                required: "You must enter their last name."
            }
        }, submitHandler: function (e) {

            var fName = $('[name=firstName]').val().trim().toTitleCase();
            var lName = $('[name=lastName]').val().trim().toTitleCase();
            var comm = $('[name=community]').val().trim().toTitleCase();

            setNewProfileProp('firstName', fName);
            setNewProfileProp('lastName', lName);
            setNewProfileProp('community', comm);

            var fNameResults = ProfilesFirstNameIndex.search(fName, {limit: 1000}).fetch();
            var lNameResults = ProfilesLastNameIndex.search(lName, {limit: 1000}).fetch();

            // add fuzzy matches to results if cursors are empty
            if (fNameResults.length == 0 || lNameResults.length == 0) {
                // expose entire collection
                var tempCursor = Profiles.find({});

                // find most similar string
                if (fNameResults.length == 0) {
                    var bestFirstName = mostSimilarString(tempCursor, "firstName", fName, -1, false);
                    fNameResults = Profiles.find({firstName: bestFirstName}).fetch();
                }
                if (lNameResults.length == 0) {
                    var bestLastName = mostSimilarString(tempCursor, "lastName", lName, -1, false);
                    lNameResults = Profiles.find({lastName: bestLastName}).fetch();
                }
            }

            var result = _.filter(fNameResults, function (item1) {
                return _.some(this, function (item2) {
                    return item1._id === item2._id;
                });
            }, lNameResults);

            Session.set('nameSearchResults', result);

            Session.set("nameChecked", true);
            if (result.length > 0) {
                // still on step one, but now showing name results, need next btn enabled to move forward.
                $('.next-btn.ppdx-add-profile-navbtn').removeClass('disabled');
                $('.add-new-profile-name-disambiguation').slideDown(slideDur);
            } else {
                //$('.add-new-profile-name-not-found').slideDown(slideDur);

                // virtually clicking next button
                $('.next-btn.ppdx-add-profile-navbtn').click();
            }

        }
    });

});
Template.searchResultsTable.helpers({
    'searchResult': function () {
        // 'nameSearchResults' is Array of Profiles, fetched from limited subset of data
        // available at time of form validation
        var results = Session.get('nameSearchResults');
        var profileIDs = _.map(results, function (p) {
            return p._id;
        });
        Template.instance().subscribe('searchResultsData', profileIDs);
        return Profiles.find({'_id': {$in: profileIDs}});
    }
});

Template.searchResultRow.helpers({
    'displayConflicts': function () {
        return _.map(this.conflicts, function (i) {
            return Conflicts.get(i, "label")
        }).join(', ');
    }
});

Template.addNewProfileConflicts.events({
    'click .btn-conflicts-checkbox input': function (e) {
        var $parent = $(e.currentTarget).parent();
        var value = parseInt($parent.data("value"), 10);
        var newConflicts;

        if ($parent.find('input').is(':checked')) {
            // add to conflicts array and sort
            newConflicts = _.union(Session.get('newProfileData').conflicts, value).sort(function (a, b) {
                return a - b;
            });
        } else {
            // remove from conflicts array
            newConflicts = _.without(Session.get('newProfileData').conflicts, value);
        }
        if (newConflicts.length > 0) {
            $('.next-btn.ppdx-add-profile-navbtn').removeClass('disabled');
        } else {
            $('.next-btn.ppdx-add-profile-navbtn').addClass('disabled');
        }
        setNewProfileProp('conflicts', newConflicts);
    }
});

Template.addNewProfileServiceType.events({
    'click .btn-service-type-checkbox input': function (e) {
        var $parent = $(e.currentTarget).parent();
        var value = parseInt($parent.data("value"), 10);
        var newServiceType;

        if ($parent.find('input').is(':checked')) {
            // checked, so add to conflicts array and sort
            newServiceType = _.union(Session.get('newProfileData').serviceType, value).sort(function (a, b) {
                return a - b;
            });
        } else {
            // unchecked, so remove from conflicts array
            newServiceType = _.without(Session.get('newProfileData').serviceType, value);
        }

        console.log(newServiceType);
        // this one is optional, so not gated
        //if (newServiceType.length > 0) {
        //    $('.next-btn.ppdx-add-profile-navbtn').removeClass('disabled');
        //} else {
        //    $('.next-btn.ppdx-add-profile-navbtn').addClass('disabled');
        //}

        setNewProfileProp('serviceType', newServiceType);
    }
});


Template.addNewProfileAddlInfo.events({
    'keyup .service-detail-input': function (e) {
        if (e.which == 13 || e.which == 27) {
            $(e.target).blur();
        } else {
            setNewProfileProp('serviceDetail', $(e.target).val());
        }
    }, 'keyup .highest-rank-input': function (e) {
        if (e.which == 13 || e.which == 27) {
            $(e.target).blur();
        } else {
            setNewProfileProp('highestRank', $(e.target).val());
        }
    }, 'keyup .medals-textarea': function (e) {
        if (e.which == 13 || e.which == 27) {
            $(e.target).blur();
        } else {
            setNewProfileProp('medals', $(e.target).val());
        }
    }
});


Template.addNewProfileThumbsView.onCreated(function () {
    Session.set('newProfilePhotos', []);
});
Template.addNewProfileThumbsView.helpers({
    'images': function () {
        return Images.find({
            '_id': {$in: Session.get('newProfilePhotos')}
        });
    }
});
Template.addNewProfileThumbsView.events({
    'click .new-profile-thumb-remove': function (e) {
        var imageID = $(e.target).data("id");
        removeNewProfileImageID(imageID);
        Images.remove(imageID);
    }, 'change .add-new-profile-caption-textarea': function (e) {
        var $target = $(e.currentTarget);
        var id = $target.data("id");
        var val = $target.val().replace(/([\n\r])+/g, ' ');
        $target.val(val);
        Images.update(id, {$set: {'caption': val}});
    }
});

Template.addNewProfileStoriesPhotos.helpers({
    'fullName': function () {
        return Session.get("newProfileData").firstName + " " + Session.get("newProfileData").lastName;
    }, 'placeholder': function () {
        return (Session.get("isKiosk")) ? "You can add more online later" : "";
    }
});
Template.addNewProfileStoriesPhotos.events({
    'change #storyTextarea': function (e) {
        if (e.which == 13 || e.which == 27) {
            $(e.target).blur();
        } else {
            //Session.set("newProfileStoryText", $(e.target).val());
            var currentStories = Session.get("newProfileData").stories;
            if (currentStories.length == 0) {
                currentStories = [{}];
            }
            currentStories[0].text = $(e.target).val().trim();
            setNewProfileProp('stories', currentStories);
            //Stories.update({_id: Session.get('newProfileStoryText')}, {$set: {text: $(e.target).val()}})
        }
    }, 'change #sigInput': function (e) {
        if (e.which == 13 || e.which == 27) {
            $(e.target).blur();
        } else {
            var currentStories = Session.get("newProfileData").stories;
            if (currentStories.length == 0) {
                currentStories = [{}];
            }
            currentStories[0].sig = $(e.target).val().trim();
            setNewProfileProp('stories', currentStories);
        }
    }, 'change .photo-upload': function (e, t) {
        FS.Utility.eachFile(e, function (file) {
            if (_.contains(["image/png", "image/gif", "image/jpeg"], file.type)) {
                Images.insert(file, function (err, fileObj) {
                    if (err) {
                        // handle error
                        $('.photos-col').append('<div class="alert alert-danger">' + err + '</div>');
                    } else {
                        fileObj.update({$set: {'profileID': '', 'randomPoint': [Math.random(), 0], 'curated': false}});
                        pushNewProfileImageID(fileObj._id);
                        t.subscribe('images', Session.get('newProfilePhotos'));
                        if (Session.get('newProfileData').profilePhotoID == "") {
                            // push first image user chooses
                            setNewProfileProp('profilePhotoID', fileObj._id);
                        }
                    }
                });
            } else {
                // can't handle TIFFs or BMPs
                $('.bad-image-file-format').html("Sorry, but the only acceptable image formats are: PNG, JPG (JPEG) and GIF.").show();
            }
        });
    }
});

Template.addNewProfileContact.onRendered(function () {

    // set up validator
    var validator = $('form.contact-info').validate({
        invalidHandler: function (e) {
            console.log("validator invalidHandler");
            Session.set('contactEmailChecked', false);
        }, messages: {
            contactName: {
                max: "No more than {0} characters are accepted."
            }, contactEmail: {
                email: "Your email address (if included) must be in the format of name@domain.com"
            }
        }, submitHandler: function (e) {
            console.log("validator submitHandler");
            var cName = $('[name=contactName]').val().trim();
            var cEmail = $('[name=contactEmail]').val().trim();

            setNewProfileProp('contactName', cName);
            setNewProfileProp('contactEmail', cEmail);

            Session.set('contactEmailChecked', true);

            // virtually clicking next button
            $('.next-btn.ppdx-add-profile-navbtn').click();

        }
    });
});

Template.addNewProfileConfirmation.onCreated(function () {
    // Session.set("confirmationFieldNamesArray",[
    //     'firstName', 'lastName', 'community', 'conflicts', 'serviceType', 'serviceDetail',
    //     'highestRank', 'medals', 'contactName', 'contactEmail']
    // );
    Session.set("confirmationFieldData", {
        erase: {
            label: '', type: 'text', required: ''
        }, firstName: {
            label: 'First Name', type: 'text', required: 'required'
        }, lastName: {
            label: 'Last Name', type: 'text', required: 'required'
        }, community: {
            label: 'Community', type: 'text', required: ''
        }, conflicts: {
            label: 'Service', type: '', required: 'required'
        }, serviceType: {
            label: 'Service Type', type: '', required: ''
        }, serviceDetail: {
            label: 'Service Detail', type: 'text', required: ''
        }, highestRank: {
            label: 'Highest Rank', type: 'text', required: ''
        }, medals: {
            label: 'Medals', type: 'text', required: ''
        }, contactName: {
            label: 'Your Name', type: 'text', required: ''
        }, contactEmail: {
            label: 'Your Email', type: 'email', required: ''
        }
    });
    // initiating to avoid errors
    Session.set("confirmationModalFieldName", "erase");
});

Template.addNewProfileConfirmation.onRendered(function () {
    // set up validator
    var validator = $('form.text-detail-confirmation-form').validate({
        submitHandler: function (f) {
            var newDatum = $('.detail-textarea').val().trim();
            var fieldName = Session.get("confirmationModalFieldName");
            if (fieldName == 'firstName' || fieldName == 'lastName' || fieldName == 'community') {
                newDatum = newDatum.toTitleCase();
            }
            setNewProfileProp(fieldName, newDatum);
            $('#editTextDetailModalPpdx').modal('hide');
        }
    });

    // validation of conflicts array handled manually (not via jquery validation plugin)
});


Template.addNewProfileConfirmation.helpers({
    'firstName': function () {
        return Session.get('newProfileData').firstName;
    }, 'lastName': function () {
        return Session.get('newProfileData').lastName;
    }, 'community': function () {
        return Session.get('newProfileData').community;
    }, 'conflicts': function () {
        var conflictsString = "";
        _.map(Session.get('newProfileData').conflicts, function (i) {
            conflictsString += Conflicts.get(i, "label") + ", ";
        })
        return conflictsString.slice(0, -2);
    }, 'serviceTypes': function () {
        var serviceTypeString = "";
        _.map(Session.get('newProfileData').serviceType, function (i) {
            serviceTypeString += ServiceTypes.get(i, "label") + ", ";
        })
        return serviceTypeString.slice(0, -2);
    }, 'serviceDetail': function () {
        return Session.get('newProfileData').serviceDetail;
    }, 'highestRank': function () {
        return Session.get('newProfileData').highestRank;
    }, 'medals': function () {
        return Session.get('newProfileData').medals;
    }, 'contactName': function () {
        return Session.get('newProfileData').contactName;
    }, 'contactEmail': function () {
        return Session.get('newProfileData').contactEmail;
    }, 'modalFieldType': function () {
        return Session.get("confirmationFieldData")[Session.get("confirmationModalFieldName")].type;
    }, 'modalFieldRequired': function () {
        return Session.get("confirmationFieldData")[Session.get("confirmationModalFieldName")].required;
    }, 'modalLabel': function () {
        return Session.get("confirmationFieldData")[Session.get("confirmationModalFieldName")].label;
    }, 'modalValue': function () {
        return Session.get('newProfileData')[Session.get('confirmationModalFieldName')];
    }
});

Template.addNewProfileConfirmation.events({
    'show.bs.modal #editTextDetailModalPpdx': function (e, t) {
        initKeyboard('.detail-keyboard', '.detail-keyboard', true);
        // t.$('.detail-textarea-label').html($(e.relatedTarget).data('propname'));
        Session.set("confirmationModalFieldName", $(e.relatedTarget).data('propname'));

        // hide prior error message, if showing
        t.$('label.error').hide();
    }, 'shown.bs.modal #editTextDetailModalPpdx': function (e, t) {
        console.log("shown");
        $('input.detail-textarea').focus();
    }, 'show.bs.modal #editConflictModal': function (e, t) {
        Session.set("confirmationModalFieldName", $(e.relatedTarget).data('propname'));
        // add active class for already-chosen values
        var conflicts = Session.get('newProfileData').conflicts;
        Session.set('newConfirmationConflicts', conflicts);
        for (var i in conflicts) {
            t.$('div.conflicts-grid').find("[data-value='" + conflicts[i] + "']").addClass('active').find('input').prop('checked', true);
        }
    }, 'show.bs.modal #editServiceTypeModal': function (e, t) {
        Session.set("confirmationModalFieldName", $(e.relatedTarget).data('propname'));
        // add active class for already-chosen values
        var serviceType = Session.get('newProfileData').serviceType;
        Session.set('newConfirmationServiceType', serviceType);
        for (var i in serviceType) {
            t.$('div.service-type-grid').find("[data-value='" + serviceType[i] + "']").addClass('active').find('input').prop('checked', true);
        }
    }, 'hide.bs.modal #editTextDetailModalPpdx': function (e, t) {
        // hidden.bs.modal was triggering twice, once before modal even started closing...
        setTimeout('Session.set("confirmationModalFieldName", "erase");', 100);
    }, 'click .btn-accept-edit-detail': function (e, t) {
        t.$('form.text-detail-confirmation-form').submit();
    },

    'click .btn-conflicts-checkbox-modal input': function (e) {
        var $parent = $(e.currentTarget).parent();
        var value = parseInt($parent.data("value"), 10);

        if ($parent.find('input').is(':checked')) {
            // checked, so add to conflicts array and sort
            Session.set('newConfirmationConflicts', _.union(Session.get('newConfirmationConflicts'), value).sort(function (a, b) {
                return a - b;
            }));
        } else {
            // unchecked, so remove from conflicts array
            Session.set('newConfirmationConflicts', _.without(Session.get('newConfirmationConflicts'), value));
        }

        if (Session.get('newConfirmationConflicts').length > 0) {
            $('.btn-accept-edit-conflicts').removeClass('disabled');
        } else {
            $('.btn-accept-edit-conflicts').addClass('disabled');
        }
    }, 'click .btn-accept-edit-conflicts': function (e) {
        if ($(e.target).hasClass('disabled')) {
            return;
        }
        setNewProfileProp('conflicts', Session.get('newConfirmationConflicts'));
        $('#editConflictModal').modal('hide');
    },

    'click .btn-service-type-checkbox-modal input': function (e) {
        var $parent = $(e.currentTarget).parent();
        var value = parseInt($parent.data("value"), 10);

        if ($parent.find('input').is(':checked')) {
            // checked, so add to service type array and sort
            Session.set('newConfirmationServiceType', _.union(Session.get('newConfirmationServiceType'), value).sort(function (a, b) {
                return a - b;
            }));
        } else {
            // unchecked, so remove from service type array
            Session.set('newConfirmationServiceType', _.without(Session.get('newConfirmationServiceType'), value));
        }
    }, 'click .btn-accept-edit-servicetype': function (e) {
        setNewProfileProp('serviceType', Session.get('newConfirmationServiceType'));
        $('#editServiceTypeModal').modal('hide');
    }

});

Template.addNewProfileDone.helpers({
    'profileID': function () {
        return Session.get('newProfileID');
    }
});

Template.profile.onRendered(function () {
    Session.set("newProfilePhotos", []);
    $('.ppdx-content').addClass('overflow-x-hidden bottom-gradient');
    $(window).on('resize', adjustMemoryScrolling);
    setTimeout(adjustMemoryScrolling, 300);
});

Template.profile.onDestroyed(function () {
    $('.ppdx-content').removeClass('overflow-x-hidden bottom-gradient');
    $(window).off('resize', adjustMemoryScrolling);
});

adjustMemoryScrolling = function () {
    var $memories = $('.memories');
    if ($('.dogtag-side')[0].scrollHeight > $('.ppdx-content').height()) {
        $memories.removeClass('scroll-only');
    } else {
        $memories.addClass('scroll-only');
    }
}

Template.profile.helpers({
    'fullName': function () {
        return this.firstName + " " + this.lastName;
    }, 'profileServiceType': function () {
        return _.map(this.serviceType, function (i) {
            return ServiceTypes.get(i, "label");
        })
    }, 'profileLongName': function () {
        var nameLength = this.firstName.length + this.lastName.length + 1;
        return (nameLength > 16) ? "profile-long-name" : "";
    }, 'profileconflict': function () {
        var numConflicts = this.conflicts.length;
        return _.map(this.conflicts, function (i) {
            return {
                label: Conflicts.get(i, "label"), numConflicts: numConflicts
            }
        })
    }, // 'image': function () {
    //     return Images.findOne(this.profilePhotoID);
    // },
    'memory': function () {
        // will return interwoven photos and stories,
        // making sure profile photo is first
        // var photos = Images.find({_id: {$in: this.images}}).fetch();
        // var that = this;
        // photos = photos.sort(function (a, b) {
        //     if (a._id == that.profilePhotoID) {
        //         return -1;
        //     } else if (b._id == that.profilePhotoID) {
        //         return 1;
        //     } else {
        //         return 0;
        //     }
        // });

        //var stories = Stories.find({profileID: this._id}).fetch();
        // var stories = this.stories;
        // var minLen = Math.min(photos.length, stories.length);
        // var shuffle = [];
        // for (var i = 0; i < minLen; ++i) {
        //     shuffle.push(photos[i]);
        //     shuffle.push(stories[i]);
        // }
        // if (photos.length > stories.length) {
        //     shuffle = shuffle.concat(_.rest(photos, i));
        // } else if (photos.length < stories.length) {
        //     shuffle = shuffle.concat(_.rest(stories, i));
        // }
        // Session.set("shuffleLength", shuffle.length);
        // return shuffle;


        var photos = Images.find({_id: {$in: this.images}}).fetch();
        var stories = this.stories;
        var memories = photos.concat(stories);
        memories = memories.sort(function (a, b) {
            if (a.createdAt > b.createdAt) {
                return -1;
            } else if (a.createdAt < b.createdAt) {
                return 1;
            } else {
                return 0;
            }
        });
        return memories;
    }
});


Template.profile.events({
    'show.bs.modal #addMemoryModal': function (e, t) {
    }, 'shown.bs.modal #addMemoryModal': function (e, t) {
        initKeyboard('.story-keyboard', '.story-textarea', false);
        t.$('.story-textarea').focus();
    }, 'change .photo-upload': function (e, t) {
        var pData = Template.parentData(0);

        FS.Utility.eachFile(e, function (file) {
            if (_.contains(["image/png", "image/gif", "image/jpeg"], file.type)) {
                Images.insert(file, function (err, fileObj) {
                    if (err) {
                        // handle error
                        $('.photos-col').append('<div class="alert alert-danger">' + err + '</div>');
                    } else {
                        fileObj.update({$set: {'profileID': pData._id, 'randomPoint': [Math.random(), 0]}});

                        if (!pData.hasOwnProperty('profilePhotoID') || pData.profilePhotoID == "") {
                            // set this photo as profile photo
                            pData.profilePhotoID = fileObj._id;
                        }
                        pData.images.push(fileObj._id);

                        // repurposing the newProfileData session variable for use here
                        // since I'm reusing template and helper from new profile creation

                        pushNewProfileImageID(fileObj._id);

                        t.subscribe('images', Session.get('newProfilePhotos'));

                        Profiles.update({_id: pData._id}, {
                            $set: {
                                profilePhotoID: pData.profilePhotoID, images: pData.images
                            }
                        });
                    }
                });
            } else {
                // can't handle TIFFs or BMPs
                $('.bad-image-file-format').append("Apologies, but the only acceptable image formats are: PNG, JPG (JPEG) and GIF.").show();
            }
        });
    }, 'click .btn-add-memories': function (e, t) {
        var now = Date.now();

        // any 'truthy' story will do?
        var newStory = $('.story-textarea').val().trim();
        if (newStory) {
            this.stories.push({'text': newStory, 'sig': $('.sig-input').val().trim(), 'createdAt': now + 1});
            Profiles.update({_id: this._id}, {$set: {stories: this.stories}});
            $('.story-textarea').val('');
            $('.sig-input').val('');
        }

        // update Images added to use 'now' as createAt
        var newPhotos = Session.get('newProfilePhotos');
        for (var i = 0; i < newPhotos.length; ++i) {
            Images.update(newPhotos[i], {$set: {'createdAt': now}});
        }

        Session.set("newProfilePhotos", []);

        // scroll to last entry, but don't try to scroll past bottom of div.
        // wait for new item to be added to DOM
        // setTimeout(scrollToLastMemory, 500);

        // scroll to first entry (new ones on top), wait for item to be added to DOM
        setTimeout(scrollToFirstMemory, 500);

    }, 'click .btn-cancel-memories': function () {
        // user hit Cancel, so remove Images that might have been added
        var pArray = Session.get("newProfilePhotos");
        if (pArray.length > 0) {
            for (var i = 0; i < pArray.length; i++) {
                Images.remove(pArray[i]);
            }
        }
    }
});

scrollToLastMemory = function () {
    var $memories = $('.memories');
    var scrollPos = Math.min($('.memory').last().position().top + $memories.scrollTop(), $memories[0].scrollHeight - $memories.height());
    $memories.animate({
        scrollTop: scrollPos
    }, 1000, 'easeInOutQuint');
}

scrollToFirstMemory = function () {
    var $memories = $('.memories');
    $memories.animate({
        scrollTop: 0
    }, 1000, 'easeInOutQuint');
}

Template.browseByConflict.events({
    'click .btn-conflicts': function (e) {
        var $target = $(e.currentTarget);
        var value = parseInt($target.data("value"), 10);

        Router.go('browseByConflictResults', {_conflict: value});
    }
});
Template.browseByConflictResults.onRendered(function () {


    // if (numColumns <= 3) {
    // remove nav?
    // }

    // this.scrollToCol = function (colNum) {
    //     var vpWidth = this.$('.browse-by-conflicts-column').outerWidth();
    //     //var scrollLeft = this.$('.browse-by-conflicts-results-viewport').scrollLeft();
    //     var maxScrollLeft = this.$('.browse-by-conflicts-results-container').outerWidth() - this.$('.browse-by-conflicts-results-viewport').outerWidth();
    //     var destScroll = Math.min(colNum * vpWidth, maxScrollLeft);
    //
    //     if (colNum > -1) {
    //         TweenLite.to(this.$('.browse-by-conflicts-results-viewport'), 0.4, {
    //             scrollLeft: destScroll, ease: Power1.easeInOut, onComplete: function () {
    //                 // update letter buttons
    //             }
    //         });
    //     }
    // };
    this.scrollToLetter = function (letter) {
        var destElem = $('.col' + letter)[0];
        TweenLite.to($('.browse-by-conflicts-results-container'), 0.4, {
            scrollLeft: destElem.offsetLeft, ease: Power1.easeInOut
        });
    };
});


Template.browseByConflictResults.events({
    'click .conflict-arrow': function (e, template) {
        var dir = ($(e.currentTarget).hasClass('conflict-left-arrow')) ? 'left' : 'right';
        // magic 40 value comes from margin-right of .browse-by-conflicts-result
        var viewportWidth = $('.browse-by-conflicts-results-viewport').width() + 40;
        if (dir == 'left') {
            TweenLite.to($('.browse-by-conflicts-results-container'), 0.4, {
                scrollLeft: '-=' + viewportWidth, ease: Power1.easeInOut
            });
        } else {
            TweenLite.to($('.browse-by-conflicts-results-container'), 0.4, {
                scrollLeft: '+=' + viewportWidth, ease: Power1.easeInOut
            });
        }
    }, 'touchmove .browse-by-conflicts-results-container': function (e) {
        //console.log($(e.currentTarget).parent().scrollLeft());
        //console.log($(e.currentTarget).find('.browse-by-conflicts-result').outerWidth());
    },

    'click button.letter-button': function (e, template) {
        var letter = $(e.currentTarget).data("letter");
        template.scrollToLetter(letter);
    }
});
Template.browseByConflictEntry.helpers({
    'cap': function () {
        return Template.instance().data.lastName.charAt(0);
    }
});
Template.letterButtons.helpers({
    'letter': function () {
        // generate hash of last initials present
        var profileLettersHash = {};
        for (var index in this.profile) {
            // only record first instance of initial
            var initial = this.profile[index].lastName.charAt(0);
            if (profileLettersHash[initial] === undefined) {
                profileLettersHash[initial] = {
                    initial: initial, index: index, enabled: true
                }
            }
        }

        // generate ALL letters
        var allLetters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
        return _.map(allLetters, function (obj) {
            return profileLettersHash[obj] || {
                    initial: obj, enabled: false
                };
        });

    }
});
Template.letterButtons.events({
    //'click button.letter-button': function(e,template) {
    //    var index = $(e.target).data("index");
    //    Template.browseByConflictResults.scrollToCol(Math.floor(index/4));
    //}
});

Template.photoGallery.onRendered(function () {
    $('.photo-gallery-grid').css({opacity: 0});
    $(window).on('resize', initPhotoGallery);
});

Template.photoGallery.onDestroyed(function () {
    $(window).off("resize", initPhotoGallery);
});

initPhotoGallery = function (template) {
    var images = Images.find({curated: true}).fetch();
    console.log(images.length);
    var totalWidth = 0;

    // Set CSS dynamically to make three rows fit without vertical scrollbar.
    // Horizontal scrollbar will cut into viewport space.
    // '15' magic value is for a little space at the bottom
    var vHeight = window.innerHeight - $('.ppdx-nav').height() - $('h2').outerHeight(true) - 15;
    vHeight = Math.min(770, vHeight);
    $('.photo-gallery-viewport').css({height: vHeight});

    // calculate photo height and margins, '35' is height of webkit scrollbar for wide desktop
    var vHeightWithoutScrollbar = vHeight - 35;
    var photoHeight = Math.floor(vHeightWithoutScrollbar * 0.30612244897959183673469387755102);
    var photoMargin = Math.floor(photoHeight * 0.0888888888888888888888);
    $('.photo-gallery-tile').css({
        height: photoHeight, marginRight: photoMargin, marginBottom: photoMargin
    });

    for (var i in images) {
        totalWidth += images[i].original.dims.aspect * photoHeight + photoMargin;
    }

    // set container to 1/3 of total width, adding a bit for variation in widths
    // scrollHeight will be 760 when only three rows are used (no overflow)

    $('.photo-gallery-grid').width(Math.round(totalWidth / 3));
    while ($('.photo-gallery-viewport').get(0).scrollHeight > vHeight) {
        totalWidth += 50;
        $('.photo-gallery-grid').width(Math.round(totalWidth / 3));
    }

    $('.photo-gallery-grid').animate({opacity: 1.0}, 600);
}


Template.photoGallery.helpers({
    'photo': function () {
        setTimeout(initPhotoGallery, 500);
        return Images.find({curated: true});
    }
});

Template.profileImages.onRendered(function () {
    Session.set("adminImagesPerPage", 6);
    Session.set("adminImagesCurrentIndex", 0);
    Session.set("imageFilterObject", {});

    // $('.fancybox').fancybox({
    //     openEffect  : "fade",
    //     closeEffect : "fade",
    //     type : "image"
    // });

    $('a[rel=gallery]').fancybox();
});

Template.profileImages.helpers({
    'adminOnly': function () {
        return false;
    }, 'images': function () {
        return Images.find(Session.get("imageFilterObject"), {
            limit: Session.get("adminImagesPerPage"), skip: Session.get("adminImagesCurrentIndex") * Session.get("adminImagesPerPage")
        }).fetch();
    }, 'isProfilePhotoVis': function () {
        // Profiles.find({ _id: this.profileID}).observe(function(){
        //     console.log(this);
        //     return "visible";
        // });
        return (Profiles.findOne(this.profileID).profilePhotoID == this._id) ? "visible" : "hidden";
    }, 'isChecked': function () {
        return (this.curated) ? "checked" : "";
    }
});

Template.profileImages.events({
    'click .btn-edit-profile': function (e) {
        // HACK: couldn't figure out how to drop the needle at one of the edit pages
        // without Meteor Admin getting stuck on "loading"
        Router.go('/admin/Profiles/');
        var profileID = $(e.currentTarget).data("id");
        setTimeout(function () {
            Router.go('/admin/Profiles/' + profileID + '/edit');
        }, 1000);

    }, 'click .btn-curated-checkbox': function (e) {
        var $target = $(e.currentTarget);
        var id = $target.data("id");

        // target's 'checked' attr is queried BEFORE its value is toggled!
        if ($target.find('input').is(':checked')) {
            $target.removeClass('active');
            Images.update(id, {$set: {'curated': false}});
        } else {
            $target.addClass('active');
            Images.update(id, {$set: {'curated': true}});
        }

    }, 'click a[rel=gallery]': function (e) {
        e.preventDefault();
    }, 'change .admin-image-caption': function (e) {
        var $target = $(e.currentTarget);
        var id = $target.data("id");
        var val = $target.val().replace(/([\n\r])+/g, ' ');
        $target.val(val);
        Images.update(id, {$set: {'caption': val}});
    }
});

Template.adminImagesPagination.helpers({
    'prevDisabled': function () {
        return (Session.get("adminImagesCurrentIndex") > 0) ? "" : "disabled";
    }, 'nextDisabled': function () {
        if (this.adminOnly) {
            return ((Session.get("adminImagesCurrentIndex") + 1) * Session.get("adminImagesPerPage") < ReactiveMethod.call("getAdminOnlyImagesCount")) ? "" : "disabled";
        } else {
            if (Session.get("adminImagesFilterCurated")) {
                return ((Session.get("adminImagesCurrentIndex") + 1) * Session.get("adminImagesPerPage") < ReactiveMethod.call("getCuratedImagesCount")) ? "" : "disabled";
            } else {
                return ((Session.get("adminImagesCurrentIndex") + 1) * Session.get("adminImagesPerPage") < ReactiveMethod.call("getImagesCount")) ? "" : "disabled";
            }
        }
    }, 'currentIndex': function () {
        return Session.get("adminImagesCurrentIndex");
    }
});

Template.adminImagesPagination.events({
    'click .btn-image-nav-prev': function (e) {
        if ($(e.currentTarget).hasClass('disabled')) {
            return;
        }
        Session.set("adminImagesCurrentIndex", Session.get("adminImagesCurrentIndex") - 1);
    }, 'click .btn-image-nav-next': function (e) {
        if ($(e.currentTarget).hasClass('disabled')) {
            return;
        }
        Session.set("adminImagesCurrentIndex", Session.get("adminImagesCurrentIndex") + 1);
    }, 'keyup .input-img-nav': function (e) {
        var val = parseInt($(e.target).val(), 10);
        if (!isNaN(val)) {
            Session.set("adminImagesCurrentIndex", val);
        }
    }, 'change #itemsPerPage': function (e) {
        var val = parseInt($(e.target).val(), 10);
        Session.set("adminImagesPerPage", val);
    }, 'keyup .input-filter-by-profile': function (e) {
        var obj = Session.get("imageFilterObject");
        if ($(e.target).val()) {
            // searching now by filter, so let's not miss the result because of the "skip"
            Session.set("adminImagesCurrentIndex", 0);
            obj.profileID = $(e.target).val();
        } else {
            delete obj.profileID;
        }
        Session.set("imageFilterObject", obj);
    }, 'keyup .input-filter-by-image': function (e, t) {
        var obj = Session.get("imageFilterObject");
        if ($(e.target).val()) {
            // searching now by filter, so let's not miss the result because of the "skip"
            Session.set("adminImagesCurrentIndex", 0);
            obj._id = $(e.target).val();
        } else {
            delete obj._id;
        }
        Session.set("imageFilterObject", obj);
    }, 'click .btn-filter-curated': function (e) {
        var $target = $(e.currentTarget);
        var obj = Session.get("imageFilterObject");

        // target's 'checked' attr is queried BEFORE its value is toggled!
        if ($target.find('input').is(':checked')) {
            $target.removeClass('active');
            delete obj.curated;
            Session.set("adminImagesFilterCurated", false);
        } else {
            $target.addClass('active');
            obj.curated = true;
            Session.set("adminImagesFilterCurated", true);
        }
        Session.set("adminImagesCurrentIndex", 0);
        Session.set("imageFilterObject", obj);

    }
});
//Template.adminOnlyImages.onCreated(function () {
//    this.subscribe('adminImages');
//});
//Template.adminOnlyImages.onRendered(function () {
//    Session.set("adminImagesPerPage", 6);
//    Session.set("adminImagesCurrentIndex", 0);
//    Session.set("imageFilterObject", {});
//
//    $('a[rel=adminOnlyGallery]').fancybox();
//});
//
//Template.adminOnlyImages.helpers({
//    'adminOnly': function () {
//        return true;
//    },
//    'images': function () {
//        return AdminImages.find(Session.get("imageFilterObject"), {
//            limit: Session.get("adminImagesPerPage"),
//            skip: Session.get("adminImagesCurrentIndex") * Session.get("adminImagesPerPage")
//        }).fetch();
//    }
//});
//
//Template.adminOnlyImages.events({
//    'change .photo-upload': function (e) {
//        // skip to last page
//        Meteor.call("getAdminOnlyImagesCount", function (error, result) {
//            if (error) {
//                console.log(error.reason);
//                return;
//            }
//            Session.set("adminImagesCurrentIndex", Math.floor(result / Session.get("adminImagesPerPage")));
//        });
//
//
//        FS.Utility.eachFile(e, function (file) {
//            if (_.contains(["image/png", "image/gif", "image/jpeg"], file.type)) {
//                AdminImages.insert(file, function (err, fileObj) {
//                    if (err) {
//                        // handle error
//                        $('.ed-admin-container').append('<div class="alert alert-danger">' + err + '</div>');
//                    } else {
//                        fileObj.update({$set: {'randomPoint': [Math.random(), 0]}});
//                    }
//                });
//            } else {
//                // can't handle TIFFs or BMPs
//                $('.bad-image-file-format').append("Apologies, but the only acceptable image formats are: PNG, JPG (JPEG) and GIF.").show();
//            }
//        });
//    },
//    'click a[rel=adminOnlyGallery]': function (e) {
//        e.preventDefault();
//    },
//    'click .btn-delete-adminOnly-image': function (e) {
//        var imageID = $(e.currentTarget).data("id");
//        AdminImages.remove(imageID);
//    }
//});

kioskMode = function (value) {
    check(value, Boolean);
    Session.set("isKiosk", value);
    var sheet = document.styleSheets[0];
    if (value) {
        Meteor.subscribe('allProfiles');
        Meteor.subscribe('allImages');

        // disable pinch zoom
        // $('meta[name=viewport]').attr('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no');

        sheet.insertRule("::selection { background-color: transparent; }", 0);
        $('body').addClass('kiosk');
        document.oncontextmenu = document.body.oncontextmenu = function () {
            return false;
        }

        // using vanilla JS so that I can use capture phase
        document.addEventListener("touchstart", function (e) {
            // console.log("clearing timer");
            clearTimeout(mousetimeout);

            if (Session.get("screensaver_active")) {
                stop_screensaver();
            }

            mousetimeout = setTimeout(function () {
                show_screensaver();
            }, 1000 * idletime);
        }, true);
        document.addEventListener("mousedown", function (e) {
            clearTimeout(mousetimeout);

            if (Session.get("screensaver_active")) {
                stop_screensaver();
            }

            mousetimeout = setTimeout(function () {
                show_screensaver();
            }, 1000 * idletime);
        }, true);

        // start screensaver_timer
        mousetimeout = setTimeout(function () {
            show_screensaver();
        }, 1000 * idletime);
    } else {
        // reenable pinch zoom
        // $('meta[name=viewport]').attr('content', 'width=device-width, initial-scale=1');

        if (document.styleSheets[0].cssRules[0].cssText == "::selection { background-color: transparent; }") {
            sheet.deleteRule(0);
        }
        $('body').removeClass('kiosk');
        document.oncontextmenu = document.body.oncontextmenu = null;

        // clear screensaver timeout if coming from kiosk mode
        clearTimeout(mousetimeout);
    }
};
resetNewProfileData = function () {
    Session.set("newProfileData", {
        "firstName": "",
        "lastName": "",
        "conflicts": [],
        "community": "",
        "serviceType": [],
        "serviceDetail": "",
        "highestRank": "",
        "medals": "",
        "images": [],
        "profilePhotoID": "",
        "stories": [],
        "contactName": "",
        "contactEmail": "",
        "randomPoint": [Math.random(), 0]
    });
};
setNewProfileProp = function (prop, value) {
    var tempData = Session.get('newProfileData');
    tempData[prop] = value;
    Session.set('newProfileData', tempData);
};

// for pushing onto property which is an Array
pushNewProfileImageID = function (id) {
    var tempData = Session.get('newProfilePhotos');
    tempData.push(id);
    Session.set('newProfilePhotos', tempData);
};
// for removing entry from newProfilePhotos array
removeNewProfileImageID = function (id) {
    var tempData = Session.get('newProfilePhotos');
    tempData = _.without(tempData, id);
    Session.set('newProfilePhotos', tempData);
};
//
cleanUpOrphanedStoriesAndPhotos = function () {
    // clean up orphaned stories
    //var storiesToRemove = Stories.find({text: ""}).fetch();
    //for (var i = 0; i < storiesToRemove.length; ++i) {
    //    Stories.remove(storiesToRemove[i]._id);
    //}

    // clean up orphaned photos
    var photosToRemove = Images.find({$or: [{profileID: ""}, {profileID: {$exists: false}}]}).fetch();
    for (var i = 0; i < photosToRemove.length; ++i) {
        Images.remove(photosToRemove[i]._id);
    }
};
// DRY - same setup is used for keyboard several times
initKeyboard = function (cssInputs, cssFirstInput, isConfirmationModal) {
    if (Session.get('isKiosk')) {
        var ow = $(cssFirstInput).width();
        var myString = (isConfirmationModal) ? 'center top' : 'left top';
        var atString = (isConfirmationModal) ? 'center top+200' : 'left+' + (ow + 78) + ' top-11';
        this.$(cssInputs).keyboard({
            layout: 'custom', customLayout: {
                'normal': ['{tab} 1 2 3 4 5 6 7 8 9 0 - {bksp}', 'q w e r t y u i o p [ ]', 'a s d f g h j k l ; \'', '{shift} z x c v b n m , . / {shift}', '{space}'],
                'shift': ['{tab} ! @ # $ % ^ & * ( ) _ {bksp}', 'Q W E R T Y U I O P { }', 'A S D F G H J K L : "', '{shift} Z X C V B N M < > ? {shift}', '{space}']
            }, display: {
                'tab': 'TAB', 'bksp': 'BACK', 'shift': 'SHIFT', 'space': 'SPACE BAR'
            }, usePreview: false, position: {
                of: cssFirstInput, my: myString, at: 'left top', at2: atString
            }, autoAccept: true, tabNavigation: true, css: {
                buttonDefault: 'ppdx-kybd-btn', buttonHover: 'ppdx-kybd-btn-hover'
            }
        });
    }
};

