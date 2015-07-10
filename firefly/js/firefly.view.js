/*jshint debug:true, noarg:true, noempty:true, eqeqeq:true, bitwise:true, undef:true, curly:true, browser: true, devel: true, jquery:true, strict:false */
/*global Backbone, _, jQuery, Sail, google */

(function() {
  "use strict";
  var Skeletor = this.Skeletor || {};
  this.Skeletor.Mobile = this.Skeletor.Mobile || {};
  var app = this.Skeletor.Mobile;
  var Model = this.Skeletor.Model;
  Skeletor.Model = Model;
  app.View = {};

  /**
    CollectView
  **/
  app.View.CollectView = Backbone.View.extend({
    view: this,
    cleanCollectHTML: null,

    initialize: function() {
      var view = this;
      console.log('Initializing CollectView...', view.el);

      // store an unmodified version of the html for later when we want to revert
      view.cleanCollectHTML = jQuery('#collect-screen').html();

      view.collection.on('sync', view.onModelSaved, view);
    },

    events: {
      'click #new-observation-btn'     : "startNewObservation",
      'click #resume-observation-btn'  : "resumeObservation",
      'click input[type=radio]'        : "updateObservation",
      'click .next-btn'                : "determineTarget",
      'click .back-btn'                : "determineTarget",
      'click #new-report-btn'          : "addReport",
      'change #photo-file'             : "enableUpload",
      'click #upload-btn'              : "checkUploadEnabled",
      'click .finish-btn'              : "publishObservation",
      'keyup :input'                   : "checkForAutoSave"
    },

    // this is a wrapper, since we also use jumpToPage for resume
    determineTarget: function(ev) {
      var view = this;
      var pageId = jQuery(ev.target).data('target-page');
      view.jumpToPage(pageId);
    },

    jumpToPage: function(page) {
      var view = this;
      // NB: doing the above three lines in one line, but this does not use set and therefore no events will fire
      app.observation.get('data').current_page = page;
      app.observation.save();

      jQuery('.page').addClass('hidden');
      jQuery('#'+page).removeClass('hidden');
    },

    startNewObservation: function() {
      var view = this;
      // if there are unpublished observations, prompt
      if (view.collection.findWhere({published: false, author: app.username})) {
        /*
          Ok, something is super strange here. This code block does not seem to work under the following conditions:
          - our 7 inch Samsung tablets
          - Chrome (40.xx)
          - code is served locally

          If you switch browsers, serve from the server, or create a desktop site, things work as expected.

          It seems to have something to do with confirm, as it will always return false (without prompting the user for a choice). This shouldn't affect the run, since the behaviour is only observed when serving it locally, so we're taking the close our eyes and hope this goes away approach to this bug...
        */
        if (confirm("You have unpublished observations. Select OK to proceed and delete these unpublished observations")) {
          // delete the old unpublished observations
          var modelsToDelete = view.collection.where({"published": false, "author": app.username});
          modelsToDelete.forEach(function(model) {
            //model.wake(Skeletor.Mobile.config.wakeful.url);
            model.destroy();
          });

          // begin new observation
          view.setupNewObservation();
        }
      } else {
        // else just being new observation
        view.setupNewObservation();
      }
    },

    resumeObservation: function() {
      var view = this;
      // find the last unpublished observation for this user
      app.observation = view.collection.findWhere({published: false, author: app.username});
      app.observation.wake(app.config.wakeful.url);

      // TODO: we're going to need a better way to do this next time - maybe storing the data type on the model? Or iterating over the html elements instead? This is bad right now

      // populate the radios based on the model
      // _.each(app.observation.get('data'), function(v,k) {
      //   console.log(k, v);
      //   // special fields (add other text fields here, and broaden as necessary). Holy gods this is stainy. TODO: check back how Matt did this in VEOS
      //   if (v === "enter and exit") {
      //     jQuery('#id-tunnel-use-enter-exit').attr('checked','checked');
      //   }
      //   else if (k === "additional_notes") {
      //     jQuery('[name=additional_notes]').text(v);
      //   }
      //   // photo
      //   else if (v.indexOf('.') !== -1) {
      //     view.showPhoto(v);
      //   }
      //   // radios
      //   else if (v.length > 0 && jQuery(':radio[value='+v+']').length > 0) {
      //     jQuery(':radio[value='+v+']').attr('checked','checked');
      //   }
      // });

      var page = app.observation.get('data').current_page;
      view.jumpToPage(page);
    },

    updateObservation: function(ev) {
      // update the data object (model.attributes.data{})
      var key = jQuery(ev.target).attr('name');
      var value = jQuery(ev.target).val();

      // dealing with the nested array of reports
      if (jQuery(ev.target).hasClass('reporting')) {
        var reportsObj = app.observation.get('data').reports;
        _.last(reportsObj)[key] = value;
        app.observation.get('data').reports = reportsObj;
      } else {
        app.observation.get('data')[key] = value;
      }

      app.observation.save();
    },

    publishObservation: function() {
      var view = this;

      // clear timer to avoid side effects
      app.clearAutoSaveTimer();

      // do a last save of the text in the additional_notes field (in case user typed anything since autoSave fired)
      app.observation.set('location',view.getLocationData());
      app.observation.set('weather', view.getWeatherData());
      app.observation.set('published', true);
      app.observation.set('modified_at', new Date());
      app.observation.save();

      jQuery().toastmessage('showSuccessToast', "Your observation has been submitted...");

      // clean up the pages and start fresh for new observation (or should it push them to community view?)
      jQuery('#collect-screen').html(view.cleanCollectHTML);
      view.render();
    },

    setupNewObservation: function() {
      var view = this;

      app.observation = new Model.FireflyObservation();
      app.observation.wake(app.config.wakeful.url);
      app.observation.save();
      view.collection.add(app.observation);

      // begin the main observation content and add it to the obj
      var data = {};
      data.reports = [];
      app.observation.set('data',data);
      app.observation.save();

      // UI changes
      jQuery('#title-page').addClass('hidden');

      view.jumpToPage("habitat-name-page");
    },

    addReport: function() {
      var view = this;

      var reportsObj = app.observation.get('data').reports;
      reportsObj.push({});
      app.observation.get('data').reports = reportsObj;
      app.observation.save()
        .done(function() {
          view.jumpToPage('reporting-photo-uploader-page');
        })
        .fail(function() {
          jQuery().toastmessage('showErrorToast', "Unable to create a new reporting observation. Please check your internet connection...");
        });
    },

    getLocationData: function() {
      var locationObj;
      if (app.mapPosition && app.mapElevation) {
        // add the location data
        locationObj = {
          'latitude': app.mapPosition.latitude,
          'longitude': app.mapPosition.longitude,
          'elevation': app.mapElevation
        };
      } else {
        locationObj = { "error": "Missing location data" };
      }

      return locationObj;
    },

    getWeatherData: function() {
      var weatherObj;
      if (app.weatherConditions && app.weatherForecast) {
        // add the weather data
        weatherObj = {
          "temperature_f": app.weatherConditions.temp_f,
          "temperature_c": app.weatherConditions.temp_c,
          "wind_direction": app.weatherConditions.wind_dir,
          "wind_speed_mph": app.weatherConditions.wind_mph,
          "wind_speed_kph": app.weatherConditions.wind_kph,
          "wind_gust_speed_mph": app.weatherConditions.wind_gust_mph,
          "wind_gust_speed_kph": app.weatherConditions.wind_gust_kph,
          "pressure_mb": app.weatherConditions.pressure_mb,
          "pressure_trend": app.weatherConditions.pressure_trend,
          "visibility_m": app.weatherConditions.visibility_mi,
          "visibility_k": app.weatherConditions.visibility_km,
          "precipitation_hour_in": app.weatherConditions.precip_1hr_in,
          "precipitation_hour_cm": app.weatherConditions.precip_1hr_metric,
          "precipitation_today_in": app.weatherConditions.precip_today_in,
          "precipitation_today_cm": app.weatherConditions.precip_today_metric,
          "humidity": app.weatherConditions.relative_humidity
        };
      } else {
        weatherObj = { "error": "Missing weather data" };
      }

      return weatherObj;
    },

    // doing this a little differently now - we really need the user to know what to click on
    enableUpload: function() {
      if (jQuery('#photo-file').val()) {
        jQuery('#upload-btn').removeClass('waiting-for-file');
        jQuery('#upload-btn').addClass('highlighted');
        setTimeout(function() {
          jQuery('#upload-btn').removeClass('highlighted');
        }, 1500);
      }
    },

    checkUploadEnabled: function(ev) {
      var view = this;
      if (jQuery(ev.target).hasClass('waiting-for-file')) {
        jQuery().toastmessage('showErrorToast', "Click on the area above to add or replace a photo...");
      } else {
        view.uploadPhoto();
      }
    },

    uploadPhoto: function() {
      var view = this;

      jQuery('.camera-icon').addClass('hidden');
      jQuery('#photo-spinner').removeClass('hidden');

      var file = jQuery('#photo-file')[0].files.item(0);
      var formData = new FormData();
      formData.append('file', file);

      // disable the upload btn again (until a file is chosen again)
      jQuery('#upload-btn').addClass('waiting-for-file');

      jQuery.ajax({
        url: app.config.pikachu.url,
        type: 'POST',
        success: success,
        error: failure,
        data: formData,
        cache: false,
        contentType: false,
        processData: false
      });

      function failure(err) {
        jQuery().toastmessage('showErrorToast', "Photo could not be uploaded. Please try again");
        jQuery('.camera-icon').removeClass('hidden');
        jQuery('#photo-spinner').addClass('hidden');
      }

      function success(data, status, xhr) {
        console.log("UPLOAD SUCCEEDED!");
        console.log(xhr.getAllResponseHeaders());

        var reportsObj = app.observation.get('data').reports;
        _.last(reportsObj)['photo_url'] = data.url;
        app.observation.get('data').reports = reportsObj;
        app.observation.save();

        jQuery('#upload-btn').text("Replace Photo");
        view.showPhoto(data.url);
        jQuery('.camera-icon').removeClass('hidden');
        jQuery('#photo-spinner').addClass('hidden');
      }
    },

    showPhoto: function(photoId) {
      // trying this a different way - now overwrites the photo icon instead of creating a new element
      jQuery('.camera-icon').attr('src',app.config.pikachu.url + photoId);
    },

    checkForAutoSave: function(ev) {
      var view = this,
          field = ev.target.name,
          input = ev.target.value;
      // clear timer on keyup so that a save doesn't happen while typing
      // window.clearTimeout(app.autoSaveTimer);
      app.clearAutoSaveTimer();

      // save after 10 keystrokes
      app.autoSave(app.observation, field, input, false, "data");

      // setting up a timer so that if we stop typing we save stuff after 5 seconds
      app.autoSaveTimer = setTimeout(function(){
       app.autoSave(app.observation, field, input, true, "data");
      }, 5000);
    },

    onModelSaved: function(model, response, options) {
      model.set('modified_at', new Date());
    },

    render: function () {
      var view = this;
      console.log('Rendering CollectView...');

      // UI updates
      jQuery('.page').addClass('hidden');
      jQuery('#title-page').removeClass('hidden');
      jQuery('.start-obs-btn').removeClass('hidden');

      // determine if we want resume button showing - if any unpublished notes (note the bang), removeClass. Should also probably be contains instead of findWhere
      if (!view.collection.findWhere({published: false, author: app.username})) {
        jQuery('#resume-observation-btn').addClass('hidden');
      }
    }

  });



  /**
    WeatherView
  **/
  app.View.WeatherView = Backbone.View.extend({
    view: this,

    initialize: function() {
      var view = this;
      console.log('Initializing WeatherView...', view.el);
    },

    events: {

    },

    render: function () {
      var view = this;
      var weatherString = app.weatherConditions.weather;
      console.log('Rendering WeatherView...');

      if (weatherString === 'Clear') {
        jQuery('.weather-image').attr('src', '/shared/img/weather/clear.svg');
      } else if (weatherString === 'Overcast') {
        jQuery('.weather-image').attr('src', '/shared/img/weather/overcast.svg');
      } else if (weatherString.indexOf('Cloud') > -1) {
        jQuery('.weather-image').attr('src', '/shared/img/weather/cloud.svg');
      } else if (weatherString.indexOf('Thunderstorm') > -1) {
        jQuery('.weather-image').attr('src', '/shared/img/weather/thunderstorm.svg');
      } else if (weatherString.indexOf('Freezing') > -1) {
        jQuery('.weather-image').attr('src', '/shared/img/weather/freezing.svg');
      } else if (weatherString.indexOf('Drizzle') > -1) {
        jQuery('.weather-image').attr('src', '/shared/img/weather/drizzle.svg');
      } else if (weatherString.indexOf('Mist') > -1) {
        jQuery('.weather-image').attr('src', '/shared/img/weather/drizzle.svg');
      } else if (weatherString.indexOf('Haze') > -1) {
        jQuery('.weather-image').attr('src', '/shared/img/weather/drizzle.svg');
      } else if (weatherString.indexOf('Rain') > -1) {
        jQuery('.weather-image').attr('src', '/shared/img/weather/rain.svg');
      } else if (weatherString.indexOf('Snow') > -1) {
        jQuery('.weather-image').attr('src', '/shared/img/weather/snow.svg');
      } else if (weatherString.indexOf('Hail') > -1) {
        jQuery('.weather-image').attr('src', '/shared/img/weather/hail.svg');
      } else if (weatherString.indexOf('Ice') > -1) {
        jQuery('.weather-image').attr('src', '/shared/img/weather/hail.svg');
      } else if (weatherString.indexOf('Fog') > -1) {
        jQuery('.weather-image').attr('src', '/shared/img/weather/fog.svg');
      } else if (weatherString.indexOf('Squalls') > -1) {
        jQuery('.weather-image').attr('src', '/shared/img/weather/squalls.svg');
      } else {
        jQuery('.weather-image').attr('src', '/shared/img/weather/na.svg');
      }

      jQuery('.temp-f').text(app.weatherConditions.temp_f);
      jQuery('.weather-string').text(app.weatherConditions.weather);

      jQuery('.wind-mph').text(app.weatherConditions.wind_mph);
      jQuery('.wind-dir').text(app.weatherConditions.wind_dir);
      // looking at the percent precipitation for the 1st period available
      jQuery('.precipitation-percent').text(app.weatherForecast.txt_forecast.forecastday[0].pop);
      jQuery('.precipitation-string').text(app.weatherConditions.precip_today_string);
      jQuery('.humidity').text(app.weatherConditions.relative_humidity);
      jQuery('.uv').text(app.weatherConditions.UV);
      jQuery('.dewpoint_f').text(app.weatherConditions.dewpoint_f);


      // change the background of the weather screen depending on the time of day and the month
      // Megs, for reference: http://www.w3schools.com/jsref/jsref_obj_date.asp
      var date = new Date();
      var month = date.getMonth();            // note: this works like an array, where Jan == 0 and Dec == 11
      console.log("It be month "+month);
      var hour = date.getHours();
      if (hour > 20 || hour < 6) {
        console.log('It be nighttime!');
      } else {
        console.log('It be daytime!');
      }
    }
  });


  /**
    MapView
  **/
  app.View.MapView = Backbone.View.extend({
    view: this,

    initialize: function() {
      var view = this;
      console.log('Initializing MapView...', view.el);

      // so that the center of the map stays in the middle upon screen resize - this is a view thing, right?
      var center;
      google.maps.event.addDomListener(app.map, 'idle', function(){
        center = app.map.getCenter();
      });
      jQuery(window).resize(function(){
        app.map.setCenter(center);
      });
    },

    events: {
      'click .photo-preview' : "showFindings"
    },

    showFindings: function() {
      // do we want to pass the observation id or something here? Depends on filtering of findingsView...

      // this is so ugly, would be much better with proper routes
      jQuery('.navigation li').removeClass('active'); // unmark all nav items
      jQuery('#findings-nav-btn').addClass('active');
      app.hideAllContainers();
      jQuery('#findings-screen').removeClass('hidden');
      app.findingsView.render();
    },

    render: function() {
      var view = this;
      console.log('Rendering MapView...');

      // if we've got a map, we can render it, otherwise...
      if (app.map && app.mapPosition) {
        // now with rounding cause the 8th decimal place doesn't mean all that much to a human
        jQuery('.latitude').text(app.roundToTwo(app.mapPosition.latitude));
        jQuery('.longitude').text(app.roundToTwo(app.mapPosition.longitude));
        jQuery('.elevation').text(app.roundToTwo(app.mapElevation));

        // re-center the map
        var latLng = app.mapMarker.getPosition();
        app.map.setCenter(latLng);

        // draw the streetview stuff
        var panoramaOptions = {
          position: latLng
        };
        var panoramaElement = jQuery('#pano')[0];
        var panorama = new google.maps.StreetViewPanorama(panoramaElement, panoramaOptions);
        app.map.setStreetView(panorama);
      }

      // ************* PINS *************
      // NB: this is pretty lame - doesn't use wakeful, so no new locations appearing until reload
      // TODO: set things up up so that the pins appear in real time - bind this to reset or something
      // this is also a pretty sloppy way to handle this, redrawing the pins every time - better to just draw new pins. But waiting on results of privacy / geolocation discussion for that

      app.map.infowindow = new google.maps.InfoWindow({
        // map styling would go here, if google finally got around to adding it
      });

      view.collection.each(function(o) {
        if (o.get('location') && o.get('published') === true) {
          var latLng = new google.maps.LatLng(o.get('location').latitude, o.get('location').longitude);
          var marker = new google.maps.Marker({
            id: o.get('_id'),
            position: latLng
          });
          marker.setMap(app.map);

          var contentEl = "<div>" + o.get('author') + "'s observation</div>";
          if (o.get('data') && o.get('data').photo_url) {
            contentEl += "<img class='photo-preview' src='" + app.config.pikachu.url + o.get('data').photo_url + "' />";
          }
          google.maps.event.addListener(marker, 'click', function() {
            app.map.infowindow.setContent(contentEl);
            app.map.infowindow.open(app.map, marker);
          });
        }
      });

    }
  });


  /**
    FindingsView
  **/
  app.View.FindingsView = Backbone.View.extend({
    template: '#findings-details-template',

    initialize: function() {
      var view = this;
      console.log('Initializing FindingsView...', view.el);

      view.collection.on('change', function(n) {
        view.render();
      });

      view.collection.on('add', function(n) {
        view.render();
      });
    },

    events: {
      "click .findings-list-item" : "openModal"
    },

    openModal: function(ev) {
      var view = this;
      ev.preventDefault();
      var obsId = jQuery(ev.target).parent().data('obs-id');
      var obs = this.collection.get(obsId);
      var el = _.template(jQuery(view.template).text(), { "author": obs.get('author'), "date": obs.get('modified_at'), "life_status": obs.get('data').life_status, "traffic_level": obs.get('data').traffic_level, "tunnel_use": obs.get('data').tunnel_use, "additional_notes": obs.get('data').additional_notes});
      // if there's a photo, add it to the modal
      if (obs.get('data') && obs.get('data').photo_url) {
        el += '<div><img src=' + app.config.pikachu.url+obs.get('data').photo_url + '></img></div>';
      }

      jQuery('.findings-modal-body').html(el);
    },

    render: function() {
      var view = this;
      console.log('Rendering FindingsView...');

      view.collection.comparator = function(model) {
        return model.get('created_at');
      };

      var publishedSortedFindings = view.collection.sort().where({published: true});

      // clear out any previous values
      jQuery('#findings-list').html('');
      var list = jQuery('#findings-list');
      // populate the list using the template
      _.each(publishedSortedFindings, function(obs) {
        var el;
        // if the finding is published and has proper data
        if (obs.get('published') === true && obs.get('data')) {
          var listItem = null;
          // if the finding has a photo
          if (obs.get('data').photo_url) {
            el = "<div class='findings-list-item col-xs-6 col-sm-4 col-lg-3' data-toggle='modal' href='#findings-modal' data-obs-id='"+obs.get('_id')+"'><img class='findings-list-photo' src='"+app.config.pikachu.url+obs.get('data').photo_url+"'></img></div>";
          }
          // otherwise just throw in the author's name. Suggestions for what to do here?
          else {
            el = "<div class='findings-list-item col-xs-6 col-sm-4 col-lg-3' data-toggle='modal' href='#findings-modal' data-obs-id='"+obs.get('_id')+"'><div class='findings-list-text'>"+obs.get('author')+"'s observation</div></div>";
          }
        }
        if (obs.get('author') === app.username) {
          el = jQuery(el).addClass('own-finding');
        }
        list.prepend(el);
      });

    }

  });

  this.Skeletor = Skeletor;
}).call(this);
