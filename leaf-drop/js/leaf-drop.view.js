/*jshint debug:true, noarg:true, noempty:true, eqeqeq:true, bitwise:true, undef:true, curly:true, browser: true, devel: true, jquery:true, strict:false */
/*global Backbone, _, jQuery, Sail */

(function() {
  "use strict";
  var Skeletor = this.Skeletor || {};
  this.Skeletor.Mobile = this.Skeletor.Mobile || {};
  var app = this.Skeletor.Mobile;
  app.View = {};

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
      'click #new-observation' : "startNewObservation",
      'click .next-btn'        : "moveForward",
      'click .back-btn'        : "moveBack",
      'click .wiki-link'       : "openModal"
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

    startNewObservation: function() {
      var view = this;

      // delete the old observation
      app.currentObservation = {};

      jQuery('#title-page').addClass('hidden');
      jQuery('#variable-content-container').removeClass('hidden');
      jQuery('.back-btn').removeClass('hidden');
      jQuery('.next-btn').removeClass('hidden');

      // we're on page '0', the title page - this will move us to page 1
      view.populatePage(0, 'next');
    },

    moveForward: function() {
      var view = this;
      var pageNum = view.getPageNum();

      view.updateJSONObject();
      view.updateProgressBar();
      view.removeOldContent();
      view.populatePage(pageNum, 'next');
    },

    moveBack: function() {
      var view = this;
      var pageNum = view.getPageNum();

      view.updateJSONObject();
      view.updateProgressBar();
      view.removeOldContent();
      view.populatePage(pageNum, 'prev');
    },

    getPageNum: function() {
      // find the currently shown page
      var pageLabel = jQuery('.current-page').attr('id');

      // get the page number from it
      var pageNumber = 0;
      pageNumber = pageLabel.substr(5, pageLabel.length - 5);

      return pageNumber;
    },

    updateJSONObject: function() {
      var view = this;

      //view.addToJSON(jQuery('.input-field .text-field').text());
      //view.addToJSON(jQuery('.input-field .radio-field').val());
    },

    updateProgressBar: function() {
      // change jpg src or whatever
    },

    removeOldContent: function() {
      jQuery('.leaf-page').addClass('hidden');
      jQuery('.leaf-page').removeClass('current-page');
    },

    populatePage: function(pNum, direction) {
      // TODO: find a better way to do this or figure out what the actual last page is
      if (pNum === 6) {
        jQuery('.page-title').text('Review Data');
        jQuery('.next-btn').text('Finish');
      } else {
        jQuery('.page-title').text('New Observation');
        jQuery('.next-btn').text('Next');
      }

      // decide on next or previous page, and update to that
      var pNumStr = pNum;
      var pageNumber = Number(pNumStr);
      if (direction === 'next') {
        pageNumber += 1;
      } else if (direction === 'prev') {
        pageNumber -= 1;
      } else {
        console.error('ERROR: unexpected direction');
      }

      var pageLabel = 'leaf-';
      pageLabel = pageLabel + pageNumber;
      //jQuery('#variable-content-container').html(jQuery('#' + pageLabel));

      jQuery('#' + pageLabel).removeClass('hidden');
      jQuery('#' + pageLabel).addClass('current-page');

    },

    // the target of the link is an image (book icon) so .parent() targets the link
    openModal: function(ev) {
      ev.preventDefault();
      var url = jQuery(ev.target).parent().attr('href');
      jQuery('.modal-body').html('<iframe width="100%" height="500px" frameborder="0" scrolling="yes" allowtransparency="true" src="'+url+'"></iframe>');
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
    template: "#tree-species-list-template",

    initialize: function() {
      var view = this;
      console.log('Initializing TreeSpeciesView...', view.el);

      view.render()
    },

    events: {

    },

    render: function () {
      var view = this;
      console.log('Rendering TreeSpeciesView...');

      var list = jQuery('#tree-species-list');

      _.each(view.collection, function(tree) {
        var listItem = _.template(jQuery(view.template).text(),{'common_name': tree.common_name, 'latin_name': tree.latin_name, 'wikipedia_url': tree.wikipedia_url});
        list.append(listItem);
      });
    }
  });

  /**
    ReviewData
  **/
  app.View.ReviewDataView = Backbone.View.extend({
    template: "#review-data-list-template",

    initialize: function() {
      var view = this;
      console.log('Initializing ReviewDataView...', view.el);

      view.render()
    },

    events: {

    },

    render: function () {
      var view = this;
      console.log('Rendering ReviewDataView...');

      var fakeObservation = {
        "tree_number": 3,
        "branch_letter": "A",
        "tree_species": "Acer pensylvanicum",
        "percent_colored_tree": "76-100%",
        "leaves": [
          {
            "leaf_num":1,
            "fallen": "no",
            "leaf_length": 31.5,
            "leaf_width": 12,
            "percent_colored": "26-50%"
          },
          {
            "leaf_num":2,
            "fallen": "no",
            "leaf_length": 28.5,
            "leaf_width": 12,
            "percent_colored": "0-25%"
          },
          {
            "leaf_num":3,
            "fallen": "yes"
          },
          {
            "leaf_num":4,
            "fallen": "no",
            "leaf_length": 20,
            "leaf_width": 12.5,
            "percent_colored": "0-25%"
          },
          {
            "leaf_num": 5,
            "fallen": "yes"
          },
          {
            "leaf_num": 6,
            "fallen": "yes"
          }
          ],
          "additional_notes": "bla bla bla they are never going to fill this in"
      };

      jQuery('.tree-number-field').text(fakeObservation.tree_number);
      jQuery('.branch-letter-field').text(fakeObservation.branch_letter);
      jQuery('.tree-species-field').text(fakeObservation.tree_species);
      jQuery('.percent-colored-tree-field').text(fakeObservation.percent_colored_tree);
      jQuery('.field-notes-field').text(fakeObservation.additional_notes);

      var list = jQuery('#review-data-list');

      //_.each(notesToRestore, function(note){
        // OLD TEMPLATE CODE THAT MIGHT BE USEFUL
        // var option = _.template(jQuery(view.template).text(), {'option_text': note.get('body'), id: note.id});
        // jQuery('#select-note-modal').append(option);
      //});

      _.each(fakeObservation.leaves, function(leaf) {
        console.log(leaf);

        var listItem = null;

        if (leaf.fallen === "yes") {
          listItem = _.template(jQuery(view.template).text(),{'leaf_num': leaf.leaf_num, 'leaf_length': 'fallen', 'leaf_width': 'fallen', 'percent_colored': 'fallen'});
        } else {
          listItem = _.template(jQuery(view.template).text(),{'leaf_num': leaf.leaf_num, 'leaf_length': leaf.leaf_length + ' cm', 'leaf_width': leaf.leaf_width + ' cm', 'percent_colored': leaf.percent_colored});
        }

        if (listItem !== null) {
          list.append(listItem);
        } else {
          console.error('KABOOM! review-data-view issue');
        }

      });
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
