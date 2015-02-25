/*jshint debug:true, noarg:true, noempty:true, eqeqeq:true, bitwise:true, undef:true, curly:true, browser: true, devel: true, jquery:true, strict:true */
/*global  Backbone, Skeletor, _, jQuery, Rollcall, google */

(function() {
  "use strict";
  var Skeletor = this.Skeletor || {};
  this.Skeletor.Mobile = this.Skeletor.Mobile || new Skeletor.App();
  var Model = this.Skeletor.Model;
  Skeletor.Model = Model;
  var app = this.Skeletor.Mobile;

  app.config = null;
  app.requiredConfig = {
    drowsy: {
      url: 'string',
      db: 'string',
      username: 'string',
      password: 'string'
    },
    wakeful: {
      url: 'string'
    },
    login_picker:'boolean',
    runs:'object'
  };

  app.rollcall = null;
  app.runId= null;
  app.users = null; // users collection
  app.username = null;

  var DATABASE = null;
  app.stateData = null;

  app.observation = null;

  app.weatherConditions = null;
  app.weatherForecast = null;

  app.mapData = null;
  app.map = null;
  app.mapPosition = null;
  app.mapMarker = null;
  app.mapElevation = null;

  app.collectView = null;
  app.weatherView = null;
  app.mapView = null;
  app.findingsView = null;

  app.keyCount = 0;
  app.autoSaveTimer = window.setTimeout(function() { } ,10);

  app.init = function() {
    /* CONFIG */
    app.loadConfig('../config.json');
    app.verifyConfig(app.config, app.requiredConfig);

    // TODO: should ask at startup
    DATABASE = app.config.drowsy.db;

    // Adding BasicAuth to the XHR header in order to authenticate with drowsy database
    // this is not really big security but a start
    var basicAuthHash = btoa(app.config.drowsy.username + ':' + app.config.drowsy.password);
    Backbone.$.ajaxSetup({
      beforeSend: function(xhr) {
        return xhr.setRequestHeader('Authorization',
            // 'Basic ' + btoa(username + ':' + password));
            'Basic ' + basicAuthHash);
      }
    });

    // hide all rows initially
    app.hideAllContainers();

    if (app.rollcall === null) {
      app.rollcall = new Rollcall(app.config.drowsy.url, DATABASE);
    }

    app.handleLogin();
  };

  app.handleLogin = function () {
    if (jQuery.url().param('runId') && jQuery.url().param('username')) {
      console.log ("URL parameter correct :)");
      app.runId = jQuery.url().param('runId');
      app.username = jQuery.url().param('username');
    } else {
      // retrieve user name from cookie if possible otherwise ask user to choose name
      app.runId = jQuery.cookie('hunger-games_mobile_runId');
      app.username = jQuery.cookie('hunger-games_mobile_username');
    }

    if (app.username && app.runId) {
      // We have a user in cookies so we show stuff
      console.log('We found user: '+app.username);

      // make sure the app.users collection is always filled
      app.rollcall.usersWithTags([app.runId])
      .done(function (usersInRun) {
        console.log("Users in run: " + usersInRun);

        if (usersInRun && usersInRun.length > 0) {
          app.users = usersInRun;

          // sort the collection by username
          app.users.comparator = function(model) {
            return model.get('username');
          };
          app.users.sort();

          var currentUser = app.users.findWhere({username: app.username});

          if (currentUser) {
            jQuery('.username-display a').text(app.runId+' - '+currentUser.get('display_name'));

            hideLogin();
            showUsername();

            app.setup();
          } else {
            console.log('User '+usersInRun+' not found in run '+app.runId+'. Show login picker!');
            logoutUser();
          }
        } else {
          console.log("Either run is wrong or run has no users. Wrong URL or Cookie? Show login");
          // fill modal dialog with user login buttons
          logoutUser();
        }
      });
    } else {
      console.log('No user and run found so prompt for username and runId');
      hideUsername();
      // fill modal dialog with user login buttons
      if (app.config.login_picker) {
        hideLogin();
        showRunPicker();
        // showUserLoginPicker(app.runId);
      } else {
        showLogin();
        hideUserLoginPicker();
      }
    }

    // click listener that sets username
    jQuery('#login-button').click(function() {
      app.loginUser(jQuery('#username').val());
      // prevent bubbling events that lead to reload
      return false;
    });
  };

  app.setup = function() {
    /*
      In order to get set up, we need to:
        1: pull users
        2: initialize the model and wake it up
        3: pull mgaps data, and use that locational information to:
          a: pull current weather data
          b: pull forecast weather data
        4: pull static data
        5: call ready(), which setups the views - should we rename this?
        6: setUpClickListeners() - which depends on 1 and 2 (and 5?)
        7: wireUpViews()

      I think, how we want to do this, we do the following concurrently:
      1->2->4->5->6->7
      and
      3->3a->7
       ->3b->
    */
    Skeletor.Model.init(app.config.drowsy.url, DATABASE)
    .then(function () {
      console.log('Model initialized - now waking up');
      return Skeletor.Model.wake(app.config.wakeful.url);
    })
    .done(function () {
      console.log('Model awake - now calling ready');
      grabMapData();
      ready();
    });
  };

  var ready = function() {
    setupUI();
    setUpClickListeners();
    wireUpViews("collectView");
    wireUpViews("findingsView");

    // show the first screen
    jQuery('#collect-screen').removeClass('hidden');
    app.collectView.render();
  };

  var setupUI = function() {
    /* MISC */
    jQuery().toastmessage({
      position : 'middle-center'
    });

    jQuery('.brand').text("Salamander Watch");
  };

  var setUpClickListeners = function () {
    // click listener that logs user out
    jQuery('#logout-user').click(function() {
      logoutUser();
    });


    /* Buttons that manage the app/site/diaspora navigation */
    jQuery('#investigations-nav-btn').addClass('active');           // no need to set things up here (href in html). This btn can always be highlighted, since this only applies to in-app stuff

    jQuery('.not-currently-enabled').click(function() {
      jQuery().toastmessage('showErrorToast', "These sections are currently under development...");
    });




    /* Buttons that manage the in-app navigation */
    jQuery('.sidebar-nav-btn').click(function() {
      if (app.username) {
        jQuery('.sidebar-navigation li').removeClass('active');     // unmark all nav items
        jQuery(this).addClass('active');
        app.hideAllContainers();
        if (jQuery(this).attr('id') === 'collect-nav-btn') {
          jQuery('#collect-screen').removeClass('hidden');
        } else if (jQuery(this).attr('id') === 'weather-nav-btn') {
          jQuery('#weather-screen').removeClass('hidden');
          app.weatherView.render();
        } else if (jQuery(this).attr('id') === 'map-nav-btn') {
          jQuery('#map-screen').removeClass('hidden');
          google.maps.event.trigger(app.map,'resize');
          app.mapView.render();
        } else if (jQuery(this).attr('id') === 'findings-nav-btn') {
          jQuery('#findings-screen').removeClass('hidden');
          app.findingsView.render();
        } else {
          console.log('ERROR: unknown nav button');
        }
      }
    });
  };

  var grabMapData = function() {
    // grab data from google maps API
    // this structure assumes the user is not moving around during the observation - is this a safe assumption?

    function initializeMap() {
      var mapOptions = {
        zoom: 16,
        scrollwheel: false,
        mapTypeId: google.maps.MapTypeId.ROADMAP
      };
      var mapElement = jQuery('#map-canvas')[0];

      app.map = new google.maps.Map(mapElement, mapOptions);

      // Try HTML5 geolocation
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(function(position) {
          var pos = new google.maps.LatLng(position.coords.latitude, position.coords.longitude);

          app.mapPosition = position.coords;
          app.mapMarker = new google.maps.Marker({
            map: app.map,
            position: pos,
            animation: google.maps.Animation.DROP,
            title: 'You are here.'
          });


          // ************* ELEVATION *************
          // this may not be the right way to do this. Feels very clunky
          var elevator = new google.maps.ElevationService();
          // this array nonsense because this service is set up to take multiple values
          var locations = [];
          locations.push(pos);
          var positionalRequest = {
            'locations': locations
          };
          // we now have an array of 1 location (lat/lng google object)

          elevator.getElevationForLocations(positionalRequest, function(results, status) {
            // success
            if (status === google.maps.ElevationStatus.OK) {
              if (results[0]) {
                app.mapElevation = results[0].elevation;

                // now we can enable the map nav button and can start on grabbing the weather data
                // NOTE: these kinds of deferred should be deprecated. Get them all out for the next iteration of this
                wireUpViews("mapView");

                var deferredConditions = app.grabWeatherConditions();
                var deferredForecast = app.grabWeatherForecast();

                jQuery.when(deferredConditions, deferredForecast).then(wireUpViews("weatherView"));
              }
            }
            // failure
            else {
              console.log("Elevator crashed into the ground");
            }
          });

        }, function() {
          // couldn't get geolocation
          handleNoGeolocation(true);
        });
      } else {
        // browser doesn't support geolocation
        handleNoGeolocation(false);
      }
    }

    function handleNoGeolocation(errorFlag) {
      var content;
      if (errorFlag) {
        content = 'Error: The geolocation service failed.';
      } else {
        content = 'Error: Your browser doesn\'t support geolocation.';
      }

      var options = {
        map: app.map,
        // if geolocation is not available the default map that shows up is of Amherst, MA
        position: new google.maps.LatLng(42.3670, -72.5170),
        content: content        // how is this var used? It never shows up, so the user doesn't know what's going on... TODO
      };

      var infowindow = new google.maps.InfoWindow(options);
      app.map.setCenter(options.position);
    }
    google.maps.event.addDomListener(window, 'load', initializeMap());
  };

  app.grabWeatherConditions = function() {
    var deferred = jQuery.ajax({
      url: "///api.wunderground.com/api/3fb52372e8662ab2/geolookup/conditions/q/"+app.mapPosition.latitude+","+app.mapPosition.longitude+".json",
      dataType : "jsonp"
    }).then(function(response){
      app.weatherConditions = response.current_observation;
      return deferred;
    });
  };

  app.grabWeatherForecast = function() {
    var deferred = jQuery.ajax({
      url: "///api.wunderground.com/api/3fb52372e8662ab2/geolookup/forecast/q/"+app.mapPosition.latitude+","+app.mapPosition.longitude+".json",
      dataType : "jsonp"
    }).then(function(response){
      app.weatherForecast = response.forecast;
      return deferred;
    });
  };


  var wireUpViews = function(view) {
    /* ======================================================
     * Setting up the Backbone Views to render data
     * coming from Collections and Models.
     * This also takes care of making the nav items clickable,
     * so these can only be called when everything is set up
     * ======================================================
     */

    if (view === "collectView") {
      if (app.collectView === null) {
        app.collectView = new app.View.CollectView({
          el: '#collect-screen',
          collection: Skeletor.Model.awake.salamander_watch_observations
        });
      }
      jQuery('.sidebar-nav-btn#collect-nav-btn').removeClass('disabled');
    }

    if (view === "weatherView") {
      if (app.weatherView === null) {
        app.weatherView = new app.View.WeatherView({
          el: '#weather-screen'
        });
      }
      jQuery('.sidebar-nav-btn#weather-nav-btn').removeClass('disabled');
    }

    if (view === "mapView") {
      if (app.mapView === null) {
        app.mapView = new app.View.MapView({
          el: '#map-screen',
          collection: Skeletor.Model.awake.salamander_watch_observations
        });
      }
      jQuery('.sidebar-nav-btn#map-nav-btn').removeClass('disabled');
    }

    if (view === "findingsView") {
      if (app.findingsView === null) {
        app.findingsView = new app.View.FindingsView({
          el: '#findings-screen',
          collection: Skeletor.Model.awake.salamander_watch_observations
        });
      }
      jQuery('.sidebar-nav-btn#findings-nav-btn').removeClass('disabled');
    }
  };


  //*************** HELPER FUNCTIONS ***************//

  app.roundToTwo = function(num) {
    return Math.round(num * 100) / 100;
  };


  //*************** LOGIN FUNCTIONS ***************//

  app.loginUser = function (username) {
    // retrieve user with given username
    app.rollcall.user(username)
    .done(function (user) {
      if (user) {
        console.log(user.toJSON());

        app.username = user.get('username');

        jQuery.cookie('hunger-games_mobile_username', app.username, { expires: 1, path: '/' });
        jQuery('.username-display a').text(app.runId+' - '+user.get('display_name'));

        hideLogin();
        hideUserLoginPicker();
        showUsername();

        app.setup();
      } else {
        console.log('User '+username+' not found!');
        if (confirm('User '+username+' not found! Do you want to create the user to continue?')) {
            // Create user and continue!
            console.log('Create user and continue!');
        } else {
            // Do nothing!
            console.log('No user logged in!');
        }
      }
    });
  };

  var logoutUser = function () {
    jQuery.removeCookie('hunger-games_mobile_username',  { path: '/' });
    jQuery.removeCookie('hunger-games_mobile_runId',  { path: '/' });

    // to make reload not log us in again after logout is called we need to remove URL parameters
    if (window.location.search && window.location.search !== "") {
      var reloadUrl = window.location.origin + window.location.pathname;
      window.location.replace(reloadUrl);
    } else {
      window.location.reload();
    }
    return true;
  };

  var showLogin = function () {
    jQuery('#login-button').removeAttr('disabled');
    jQuery('#username').removeAttr('disabled');
  };

  var hideLogin = function () {
    jQuery('#login-button').attr('disabled','disabled');
    jQuery('#username').attr('disabled','disabled');
  };

  var hideUserLoginPicker = function () {
    // hide modal dialog
    jQuery('#login-picker').modal('hide');
  };

  var showUsername = function () {
    jQuery('.username-display').removeClass('hide');
  };

  var hideUsername = function() {
    jQuery('.username-display').addClass('hide');
  };

  var showRunPicker = function(runs) {
    jQuery('.login-buttons').html(''); //clear the house
    console.log(app.config.runs);

    // change header
    jQuery('#login-picker .modal-header h3').text('Please choose your class');

    _.each(app.config.runs, function(run) {
      var button = jQuery('<button class="btn btn-large btn-primary login-button">');
      button.val(run);
      button.text(run);
      jQuery('.login-buttons').append(button);
    });

    // register click listeners
    jQuery('.login-button').click(function() {
      app.runId = jQuery(this).val();
      jQuery.cookie('hunger-games_mobile_runId', app.runId, { expires: 1, path: '/' });
      // jQuery('#login-picker').modal("hide");
      showUserLoginPicker(app.runId);
    });

    // show modal dialog
    jQuery('#login-picker').modal({keyboard: false, backdrop: 'static'});
  };

  var showUserLoginPicker = function(runId) {
    // change header
    jQuery('#login-picker .modal-header h3').text('Please login with your user ID');

    // retrieve all users that have runId
    app.rollcall.usersWithTags([runId])
    .done(function (availableUsers) {
      jQuery('.login-buttons').html(''); //clear the house
      console.log(availableUsers);
      app.users = availableUsers;

      // sort the collection by username
      app.users.comparator = function(model) {
        return model.get('display_name');
      };
      app.users.sort();

      app.users.each(function(user) {
        var button = jQuery('<button class="btn btn-large btn-primary login-button">');
        button.val(user.get('username'));
        button.text(user.get('display_name'));
        jQuery('.login-buttons').append(button);
      });

      // register click listeners
      jQuery('.login-button').click(function() {
        var clickedUserName = jQuery(this).val();
        app.loginUser(clickedUserName);
      });

      // show modal dialog
      // jQuery('#login-picker').modal({backdrop: 'static'});
    });
  };

  app.hideAllContainers = function () {
    jQuery('.container').each(function (){
      jQuery(this).addClass('hidden');
    });
  };

  app.autoSave = function(model, inputKey, inputValue, instantSave, nested) {
    app.keyCount++;
    if (instantSave || app.keyCount > 9) {
      console.log('Autosaved');
      // since we still haven't updated the model to deal with nested sets, using this instead (eww)
      if (nested === "data") {
        var nestedObj = model.get(nested);
        nestedObj[inputKey] = inputValue;
        model.set(nested,nestedObj);
      } else {
        model.set(inputKey, inputValue);
      }
      model.save(null, {silent:true});
      app.keyCount = 0;
    }
  };

  app.clearAutoSaveTimer = function () {
    if (app.autoSaveTimer) {
      window.clearTimeout(app.autoSaveTimer);
    }
  };

  /**
    Function that is called on each keypress on username input field (in a form).
    If the 'return' key is pressed we call loginUser with the value of the input field.
    To avoid further bubbling, form submission and reload of page we have to return false.
    See also: http://stackoverflow.com/questions/905222/enter-key-press-event-in-javascript
  **/
  app.interceptKeypress = function(e) {
    if (e.which === 13 || e.keyCode === 13) {
      app.loginUser(jQuery('#username').val());
      return false;
    }
  };

  app.turnUrlsToLinks = function(text) {
    var urlRegex = /(https?:\/\/[^\s]+)/g;
    var urlText = text.replace(urlRegex, '<a href="$1">$1</a>');
    return urlText;
  };

  this.Skeletor = Skeletor;

}).call(this);
