/*jshint debug:true, noarg:true, noempty:true, eqeqeq:true, bitwise:true, undef:true, curly:true, browser: true, devel: true, jquery:true, strict:true */
/*global  Backbone, Skeletor, _, jQuery, Rollcall */

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
      uic_url: 'string'
    },
    wakeful: {
      url: 'string'
    },
    rollcall: {db: 'string'},
    login_picker:'boolean',
    runs:'object'
  };

  app.rollcall = null;
  app.runId= null;
  app.users = null; // users collection
  app.username = null;
  app.runState = null;
  app.userState = null;
  app.numOfStudents = 0;

  var DATABASE = null;
  app.stateData = null;

  app.currentNote = null;
  app.currentReply = {};

  app.inputView = null;
  app.listView = null;
  // app.loginButtonsView = null;

  app.keyCount = 0;
  app.autoSaveTimer = window.setTimeout(function() { console.log("timer activated"); } ,10);

  app.init = function() {
    /* CONFIG */
    app.loadConfig('../config.json');
    app.verifyConfig(app.config, app.requiredConfig);

    // TODO: should ask at startup
    DATABASE = app.config.drowsy.db;

    // hide all rows initially
    app.hideAllRows();

    if (app.rollcall === null) {
      app.rollcall = new Rollcall(app.config.drowsy.url, app.config.rollcall.db);
    }

    app.setup();

  };

  app.setup = function() {
    /* pull users, then initialize the model and wake it up, then pull everything else */
    // Skeletor.Model.init(app.config.drowsy.url, DATABASE+'-'+app.runId)
    // .then(function () {
    //   console.log('model initialized - now waking up');
    //   return Skeletor.Model.wake(app.config.wakeful.url);
    // })
    // .done(function () {
    //   console.log('model awake - now calling ready');
    //   app.ready();
    // });
    app.ready();

    /* MISC */
    jQuery().toastmessage({
      position : 'middle-center'
    });

  };

  app.ready = function() {

      /* ======================================================
       * Setting up the Backbone Views to render data
       * coming from Collections and Models
       * ======================================================
       */

      // if (app.listView === null) {
      //   app.listView = new app.View.ListView({
      //     el: '#list-screen',
      //     collection: Skeletor.Model.awake.notes
      //   });
      // }

      setProjectName(app.config.project_name);

      /* ======================================================
       * Function to enable click listeners in the UI
       * Beware: some click listeners might belong into Views
       * ======================================================
       */
      setUpClickListeners();

      // show notes-screen - is this the default? TODO: check with design team where the first pedagogical step should be
      jQuery('#notes-screen').removeClass('hidden');
      jQuery('.nav-pills .notes-button').addClass('active'); // highlight notes selection in nav bar

  };


  //*************** MAIN FUNCTIONS  ***************//

  app.addBrainstorm = function() {
    // app.currentNote = new Model.Note(noteData);
    // app.currentNote.wake(app.config.wakeful.url);
    // app.currentNote.save();
    // Model.awake.notes.add(app.currentNote);
    // return app.currentNote;
  };


  //*************** HELPER FUNCTIONS ***************//

  /**
   *  Function where most of the click listener should be setup
   *  called very late in the init process, will try to look it with Promise
   */
  var setUpClickListeners = function () {
    // Show notes screen
    jQuery('.new-brainstorm').click(function() {
      // if (app.username) {
      //   jQuery('.nav-pills li').removeClass('active'); // unmark all nav items
      //   jQuery(this).addClass('active');

      //   app.hideAllRows();
      //   jQuery('#notes-screen').removeClass('hidden');
      // }
    });


  };

  var setProjectName = function(name) {
    jQuery('.brand').text(name + ": Dashboard");
  };


  //*************** LOGIN FUNCTIONS ***************//

  app.hideAllRows = function () {
    jQuery('.row-fluid').each(function (){
      jQuery(this).addClass('hidden');
    });
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


  this.Skeletor = Skeletor;

}).call(this);
