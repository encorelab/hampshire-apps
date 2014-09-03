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

    initialize: function() {
      var view = this;
      console.log('Initializing CollectView...', view.el);
    },

    events: {
      'click #new-observation'  : "startNewObservation",
      'click .next-btn'         : "moveForward",
      'click .back-btn'         : "moveBack",
      'click .wiki-link'        : "openModal",
      'click .leaf-fallen-btn'  : "buttonSelected"
    },

    buttonSelected: function(ev) {
      var view = this;

      jQuery('.btn-select').removeClass("btn-select");
      jQuery(ev.target).addClass("btn-select");
    },

    startNewObservation: function() {
      var view = this;

      // delete the old observation
      app.currentObservation = {};
      app.currentObservation.leaves = [];

      jQuery('#title-page').addClass('hidden');
      jQuery('#variable-content-container').removeClass('hidden');
      jQuery('.back-btn').removeClass('hidden');
      jQuery('.next-btn').removeClass('hidden');

      // we're on page '0', the title page - this will move us to page 1
      view.determineTargetPage('next');
    },

    moveForward: function() {
      var view = this;
      view.determineTargetPage('next');
    },

    moveBack: function() {
      var view = this;
      view.determineTargetPage('prev');
    },

    determineTargetPage: function(direction) {
      var view = this;

      // decide on next or previous page, and update the page number to that
      var pageNumber = Number(view.getPageNum());
      if (direction === 'next') {
        pageNumber += 1;
      } else if (direction === 'prev') {
        pageNumber -= 1;
      } else {
        console.error('ERROR: unexpected direction');
      }

      // determine which of the 6 leaf observations we are on
      var leafCycleNum = app.currentObservation.leaves.length + 1;

      /********** PAGE 4 *********/
      if (pageNumber == 4) {
        // if user said leaf has fallen
        var checkedEl = jQuery('.current-page [type="radio"]:checked');
        if (jQuery(checkedEl).is("#id-leaf-fallen-yes")) {
          // update the observation for fallen
          app.currentObservation.leaves[leafCycleNum-1] = { "leaf_num":leafCycleNum, "fallen":"yes" };

          // if this is the last observation, go to page 6. Else go to page 3
          if (leafCycleNum === 6) {
            view.populatePage(6);
          } else {
            view.populatePage(3);
          }

        // if user said leaf has not fallen
        } else if (jQuery(checkedEl).is("#id-leaf-fallen-no")) {
          app.currentObservation.leaves[leafCycleNum-1] = { "leaf_num":leafCycleNum, "fallen":"no" };

          view.populatePage(pageNumber);
        } else {
          jQuery().toastmessage('showErrorToast', "Please select whether this leaf has fallen");
        }


      /********** PAGE 6 *********/
      } else if (pageNumber === 6) {            // special case for leaf cycle pages to loop
        // go to page 3 if the leaves aren't all done (eg array length is 6)
        if (leafCycleNum === 6) {
          view.populatePage(6);
        } else {
          view.populatePage(3);
        }


      /********** ALL OTHER PAGES *********/
      } else {
        view.populatePage(pageNumber);
      }
    },

    updateJSONObject: function() {
      var view = this;

      _.each(jQuery('.current-page .input-field'), function(i) {
        // if this is of type text take the text and put it straight up into the json
        if (i.type === "text" || i.type === "textarea" || i.type === "number") {
          // add text value to json
          app.currentObservation[jQuery(i).data().fieldName] = jQuery(i).val();

        // else if this is of type radio, capture selected
        } else if (i.type === "radio") {
          var el = jQuery('[type="radio"]:checked');
          app.currentObservation[el.data().fieldName] = jQuery(el).val();               // we need a condition here to check if el is null (this can also be used to prompt user to make a selection)
        }

      });
    },

    updateProgressBar: function() {
      // change jpg src or whatever
    },

    removePageClasses: function() {
      jQuery('.leaf-page').addClass('hidden');
      jQuery('.leaf-page').removeClass('current-page');
    },

    clearPageContent: function() {
      jQuery('.current-page .input-field').val('');
      jQuery('.current-page .leaf-fallen').prop('checked', false);
      jQuery('.current-page .btn-select').removeClass('btn-select');
    },

    populatePage: function(pageNumber) {
      var view = this;

      view.updateJSONObject();
      view.updateProgressBar();
      view.removePageClasses();
      view.clearPageContent();

      if (pageNumber === 7) {
        jQuery('.page-title').text('Review Data');
        jQuery('.next-btn').text('Finish');
        app.reviewDataView.render();
      } else {
        jQuery('.page-title').text('New Observation');
        jQuery('.next-btn').text('Next');
      }

      var pageLabel = 'leaf-';
      pageLabel = pageLabel + pageNumber;

      jQuery('#' + pageLabel).removeClass('hidden');
      jQuery('#' + pageLabel).addClass('current-page');
    },

    getPageNum: function() {
      // find the currently shown page
      var pageLabel = jQuery('.current-page').attr('id');

      // get the page number from it
      var pageNumber = 0;
      if (pageLabel) {
        pageNumber = pageLabel.substr(5, pageLabel.length - 5);
      }
      // else we're starting a new observation

      return pageNumber;
    },

    // the target of the link is an image (book icon) so .parent() targets the link
    openModal: function(ev) {
      ev.preventDefault();
      var url = jQuery(ev.target).parent().attr('href');
      jQuery('.modal-body').html('<iframe width="100%" height="500px" frameborder="0" scrolling="yes" allowtransparency="true" src="'+url+'"></iframe>');
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
    },

    events: {

    },

    render: function () {
      var view = this;
      console.log('Rendering ReviewDataView...');

      jQuery('.tree-number-field').text(app.currentObservation.tree_number);
      jQuery('.branch-letter-field').text(app.currentObservation.branch_letter);
      jQuery('.tree-species-field').text(app.currentObservation.tree_species);
      jQuery('.percent-colored-tree-field').text(app.currentObservation.percent_colored_tree);
      jQuery('.field-notes-field').text(app.currentObservation.additional_notes);

      var list = jQuery('#review-data-list');

      //_.each(notesToRestore, function(note){
        // OLD TEMPLATE CODE THAT MIGHT BE USEFUL
        // var option = _.template(jQuery(view.template).text(), {'option_text': note.get('body'), id: note.id});
        // jQuery('#select-note-modal').append(option);
      //});

      _.each(app.currentObservation.leaves, function(leaf) {
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
