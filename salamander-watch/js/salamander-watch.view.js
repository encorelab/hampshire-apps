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

    initialize: function() {
      var view = this;
      console.log('Initializing CollectView...', view.el);

      view.collection.on('sync', view.onModelSaved, view);
    },

    events: {
      'click #new-observation-btn'     : "startNewObservation",
      'click #resume-observation-btn'  : "resumeObservation",
      'click input[type=radio]'        : "updateObservation",
      'click .next-btn'                : "determineTarget",
      'click .back-btn'                : "determineTarget",
      'change #photo-file'             : "enableUpload",
      'click #upload-btn'              : "uploadPhoto",
      'click .finish-btn'              : "publishObservation",
      'keyup :input'                   : "checkForAutoSave"
    },

    enableUpload: function() {
      if (jQuery('#photo-file').val()) {
        jQuery('#upload-btn').removeAttr('disabled');
      }
    },

    // this is a wrapper, since we also use jumpToPage for resume
    determineTarget: function(ev) {
      var view = this;
      var pageId = jQuery(ev.target).data('target-page');
      view.jumpToPage(pageId);
    },

    jumpToPage: function(page) {
      // set 'current_page'
      // var dataObj = app.observation.get('data');
      // dataObj.current_page = page;
      // app.observation.set('data',dataObj);
      // Doing the above three lines in one line, but no set and therefore no events!!
      app.observation.get('data').current_page = page;
      app.observation.save();

      jQuery('.page').addClass('hidden');
      jQuery('#'+page).removeClass('hidden');
    },

    buttonSelected: function(ev) {
      var view = this;

      jQuery('.btn-select').removeClass("btn-select");
      jQuery(ev.target).addClass("btn-select");
    },

    startNewObservation: function() {
      var view = this;
      // if there are unpublished observations, prompt
      if (view.collection.findWhere({published: false, author: app.username})) {
        if (confirm('You have unpublished observations. Select OK to proceed and delete these unpublished observations')) {
          // delete the old unpublished observations
          var modelsToDelete = view.collection.where({"published": false, "author": app.username})
          modelsToDelete.forEach(function(model) {
            //model.wake(Skeletor.Mobile.config.wakeful.url);
            model.destroy();
          })

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

      var page = app.observation.attributes.data.current_page;      // enough - add to model!
      view.jumpToPage(page);
    },

    updateObservation: function(ev) {
      // update the data object (model.attributes.data{})
      var dataObj = app.observation.get('data');
      var key = jQuery(ev.target).attr('name');
      var value = jQuery(ev.target).val();
      dataObj[key] = value;
      app.observation.set('data',dataObj);
      app.observation.save();
      // TODO: move this stuff to the model
    },

    publishObservation: function() {
      var view = this;

      view.tryAddLocationData();
      view.tryAddWeatherData();
      app.observation.set('published', true);
      app.observation.set('modified_at', new Date());
      app.observation.save();

      jQuery().toastmessage('showSuccessToast', "Your observation has been submitted...");

      // clean up the pages and start fresh for new observation (or should it push them to community view?)
      view.render();
    },

    setupNewObservation: function() {
      var view = this;

      app.observation = new Model.SalamanderWatchObservation();
      app.observation.wake(app.config.wakeful.url);
      app.observation.save();
      view.collection.add(app.observation);

      // begin the main observation content and add it to the obj
      app.observation.set('data',{});
      view.tryAddLocationData();
      view.tryAddWeatherData();

      // UI changes
      jQuery('#title-page').addClass('hidden');

      view.jumpToPage("photo-uploader");
    },


    // NB: LOCATION AND WEATHER ARE RECORDED AT START AND FINISH OF OBS - IF AVAILABLE (so sometimes only at the end)

    tryAddLocationData: function() {
      if (app.mapPosition && app.mapElevation) {
        // add the location data
        var locationObj = {
          'latitude': app.mapPosition.latitude,
          'longitude': app.mapPosition.longitude,
          'elevation': app.mapElevation
        };
        app.observation.set('location',locationObj);
        app.observation.save();
      }
    },

    tryAddWeatherData: function() {
      if (app.weatherConditions && app.weatherForecast) {
        // add the weather data
        var weatherObj = {
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
        app.observation.set('weather',weatherObj);
        app.observation.save();
      }
    },

    uploadPhoto: function() {
      var file = jQuery('#photo-file')[0].files.item(0);
      var formData = new FormData();
      formData.append('file', file);

      // disable the upload btn again (until a file is chosen again)
      jQuery('#upload-btn').attr('disabled','disabled');

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
      }

      function success(data, status, xhr) {
        console.log("UPLOAD SUCCEEDED!");
        console.log(xhr.getAllResponseHeaders());
        var dataObj = app.observation.get('data');
        dataObj.photo_url = data.url;
        app.observation.set('data',dataObj);
        app.observation.save();
        jQuery('#upload-btn').text("Replace Photo");          // this will get moved around when there is actually taking a photo
        showResult(data.url);
      }

      function showResult(photoId) {
        // delete old photo
        jQuery('#photo-container').html('');
        // set up an element to hold the new photo
        var imgEl = jQuery('<img>');
        imgEl.attr('src',app.config.pikachu.url + photoId);
        imgEl.addClass('photo-preview');
        jQuery('#photo-container').append(imgEl);
      }
    },

    checkForAutoSave: function(ev) {
      var view = this,
          field = ev.target.name,
          input = ev.target.value;
      // clear timer on keyup so that a save doesn't happen while typing
      window.clearTimeout(app.autoSaveTimer);

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
        jQuery('.weather-image').attr('src', '/leaf-drop/img/icons/clear.svg');
      } else if (weatherString === 'Overcast') {
        jQuery('.weather-image').attr('src', '/leaf-drop/img/icons/overcast.svg');
      } else if (weatherString.indexOf('Cloud') > -1) {
        jQuery('.weather-image').attr('src', '/leaf-drop/img/icons/cloud.svg');
      } else if (weatherString.indexOf('Thunderstorm') > -1) {
        jQuery('.weather-image').attr('src', '/leaf-drop/img/icons/thunderstorm.svg');
      } else if (weatherString.indexOf('Freezing') > -1) {
        jQuery('.weather-image').attr('src', '/leaf-drop/img/icons/freezing.svg');
      } else if (weatherString.indexOf('Drizzle') > -1) {
        jQuery('.weather-image').attr('src', '/leaf-drop/img/icons/drizzle.svg');
      } else if (weatherString.indexOf('Mist') > -1) {
        jQuery('.weather-image').attr('src', '/leaf-drop/img/icons/drizzle.svg');
      } else if (weatherString.indexOf('Haze') > -1) {
        jQuery('.weather-image').attr('src', '/leaf-drop/img/icons/drizzle.svg');
      } else if (weatherString.indexOf('Rain') > -1) {
        jQuery('.weather-image').attr('src', '/leaf-drop/img/icons/rain.svg');
      } else if (weatherString.indexOf('Snow') > -1) {
        jQuery('.weather-image').attr('src', '/leaf-drop/img/icons/snow.svg');
      } else if (weatherString.indexOf('Hail') > -1) {
        jQuery('.weather-image').attr('src', '/leaf-drop/img/icons/hail.svg');
      } else if (weatherString.indexOf('Ice') > -1) {
        jQuery('.weather-image').attr('src', '/leaf-drop/img/icons/hail.svg');
      } else if (weatherString.indexOf('Fog') > -1) {
        jQuery('.weather-image').attr('src', '/leaf-drop/img/icons/fog.svg');
      } else if (weatherString.indexOf('Squalls') > -1) {
        jQuery('.weather-image').attr('src', '/leaf-drop/img/icons/squalls.svg');
      } else {
        jQuery('.weather-image').attr('src', '/leaf-drop/img/icons/na.svg');
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

      // filter by 'published', when we add it
      view.collection.each(function(o) {
        if (o.get('location')) {
          var latLng = new google.maps.LatLng(o.get('location').latitude, o.get('location').longitude);
          var marker = new google.maps.Marker({
            id: o.get('_id'),
            position: latLng
            //title: o.get('message')       // TODO: this is very likely wrong
          });

          marker.setMap(app.map);

          google.maps.event.addListener(marker, 'click', function() {
            //injectThumbnail(o);   for when we have pictures
            var mapPopupContent = o.get('author') + "'s observation";
            app.map.infowindow.setContent(mapPopupContent);
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
    template: '#findings-list-template',

    initialize: function() {
      var view = this;
      console.log('Initializing FindingsView...', view.el);
    },

    events: {

    },

    render: function() {
      var view = this;
      console.log('Rendering FindingsView...');

      // clear out any previous values
      jQuery('#findings-list').html('');
      var list = jQuery('#findings-list');
      // populate the list using the template
      view.collection.each(function(obs) {
        var listItem = null;
        var dataObj = obs.get('data');
        listItem = _.template(jQuery(view.template).text(), { "author": obs.get('author'), "life_status": dataObj.life_status, "additional_notes": dataObj.additional_notes } );

        if (listItem !== null) {
          list.append(listItem);
        } else {
          console.error('Houston, we have a templating problem...');
        }
      });
    }

  });

  this.Skeletor = Skeletor;
}).call(this);
