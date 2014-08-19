/*jshint debug:true, noarg:true, noempty:true, eqeqeq:true, bitwise:true, undef:true, curly:true, browser: true, devel: true, jquery:true, strict:false */
/*global Backbone, _, jQuery, Sail */

(function() {
  "use strict";
  var Skeletor = this.Skeletor || {};
  this.Skeletor.Mobile = this.Skeletor.Mobile || {};
  var app = this.Skeletor.Mobile;
  app.View = {};

  /**
    ListView
  **/
  app.View.ListView = Backbone.View.extend({
    template: "#notes-list-template",

    initialize: function () {
      var view = this;
      console.log('Initializing ListView...', view.el);

      view.collection.on('change', function(n) {
        view.render();
      });

      view.collection.on('add', function(n) {
        view.render();
      });

      view.render();

      return view;
    },

    events: {
      // nothing here yet, but could be click events on list items to have actions (delete, response and so forth)
    },

    render: function () {
      var view = this;
      console.log("Rendering ListView");

      // find the list where items are rendered into
      var list = this.$el.find('ul');

      // Only want to show published notes at some point
      var publishedNotes = view.collection.where({published: true});

      _.each(publishedNotes, function(note){
        var me_or_others = 'others';
        // add class 'me' or 'other' to note
        if (note.get('author') === app.username) {
          me_or_others = 'me';
        }

        //
        var listItem = _.template(jQuery(view.template).text(), {'id': note.id, 'text': note.get('body'), 'me_or_others': me_or_others, 'author': note.get('author'), 'created_at': note.get('created_at')});

        var existingNote = list.find("[data-id='" + note.id + "']");

        if (existingNote.length === 0) {
          list.append(listItem);
        } else {
          existingNote.replaceWith(listItem);
        }
      });

    }

  });

  /**
    CollectView
  **/
  app.View.CollectView = Backbone.View.extend({
    view: this,
    //template: "#resume-unpublished-notes",

    initialize: function() {
      var view = this;
      console.log('Initializing CollectView...', view.el);
    },

    events: {
      'click .next-btn'        : "populateNextPage"
      // 'click .resume-note-btn'   : "resumeNote",
      // 'click .new-note-btn'      : 'showNewNote',
      // 'click .modal-select-note' : 'selectNoteToResume',
      // 'click .cancel-note-btn'   : 'cancelNote',
      // 'click .share-note-btn'    : 'shareNote',
      // //'click .note-body'         : 'createOrRestoreNote',
      // 'keyup :input': function(ev) {
      //   var view = this,
      //     field = ev.target.name,
      //     input = ev.target.value;
      //   // clear timer on keyup so that a save doesn't happen while typing
      //   window.clearTimeout(app.autoSaveTimer);

      //   // save after 10 keystrokes
      //   app.autoSave(app.currentNote, field, input, false);

      //   // setting up a timer so that if we stop typing we save stuff after 5 seconds
      //   app.autoSaveTimer = setTimeout(function(){
      //     app.autoSave(app.currentNote, field, input, true);
      //   }, 5000);
      // }
    },

    populateNextPage: function() {
      var view = this;

      // find the currently shown page
      var pageLabel = jQuery('.current-page').attr('id');


      // get the page number from it
      var pageNumber = 0;
      pageNumber = pageLabel.substr(5, pageLabel.length - 5);

      view.collectInputValues();

      view.updateProgressBar();

      view.removeOldContent();

      view.addNewContent(pageNumber);
    },

    collectInputValues: function() {
      var view = this;
      // lots to add here, think about this, probably needs to use class names again - also, probably move to leaf-drop.js
      view.addToJSON(jQuery('.input-field .text-field').text());
      view.addToJSON(jQuery('.input-field .radio-field').val());
    },

    updateProgressBar: function() {
      // change jpg src or whatever
    },

    removeOldContent: function() {
      jQuery('.leaf-page').addClass('hidden');
      jQuery('.leaf-page').removeClass('current-page');
    },

    addNewContent: function(pNum) {
      var pNumStr = pNum;
      var pageNumber = Number(pNumStr);
      pageNumber += 1;
      var pageLabel = 'leaf-';
      pageLabel = pageLabel + pageNumber;
      //jQuery('#variable-content-container').html(jQuery('#' + pageLabel));

      jQuery('#' + pageLabel).removeClass('hidden');
      jQuery('#' + pageLabel).addClass('current-page');
    },

    addToJSON: function(value) {
      // this will add the value to the JSON object

      /*
      {
        "type" : "bird",
        "location" : SOEMTHING,

      }
      */

    },

    resumeNote: function(){
      var view = this;

      // retrieve unpublished notes of user
      var notesToRestore = view.collection.where({author: app.username, published: false});

      // fill the modal
      jQuery('#select-note-modal').html('');
      _.each(notesToRestore, function(note){
        var option = _.template(jQuery(view.template).text(), {'option_text': note.get('body'), id: note.id});
        jQuery('#select-note-modal').append(option);
      });

      //show modal
      console.log('Show modal to pick previous note.');
      jQuery('.unpublished-note-picker').modal('show');
    },

    render: function () {
      console.log('Rendering CollectView...');
    }
  });


  /**
    TreeSpeciesView
  **/
  app.View.TreeSpeciesView = Backbone.View.extend({
    view: this,
    //template: "#something with tree species?",

    initialize: function() {
      var view = this;
      console.log('Initializing TreeSpeciesView...', view.el);
      this.populateTreeSpeciesEls();
    },

    events: {

    },

    populateTreeSpeciesEls: function(){
      var view = this;

      //_.each(notesToRestore, function(note){
        // OLD TEMPLATE CODE THAT MIGHT BE USEFUL
        // var option = _.template(jQuery(view.template).text(), {'option_text': note.get('body'), id: note.id});
        // jQuery('#select-note-modal').append(option);
      //});

      _.each(view.collection, function(tree) {
        console.log(tree);
      });

    },

    render: function () {
      console.log('Rendering TreeSpeciesView...');
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
    },

    events: {

    },

    render: function () {
      console.log('Rendering MapView...');
    }
  });

  this.Skeletor = Skeletor;
}).call(this);
