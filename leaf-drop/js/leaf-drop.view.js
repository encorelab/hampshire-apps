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
      //view.determineTargetPage('next');
      view.populatePage(1);
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
      // we don't deal with 'special pages' (eg leaf cycle ones) on back
      var pageNumber = Number(view.getPageNum());
      if (direction === 'next') {
        pageNumber += 1;
        view.handleSpecialPages(pageNumber);
      } else if (direction === 'prev') {
        pageNumber -= 1;
        view.populatePage(pageNumber);
      } else {
        console.error('ERROR: unexpected direction');
      }
    },

    handleSpecialPages: function(pageNumber) {
      var view = this;

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
        } else {
          app.currentObservation.leaves[leafCycleNum-1] = { "leaf_num":leafCycleNum, "fallen":"no" };

          view.populatePage(pageNumber);
        }


       // TODO: bring me back in for PROD
        // } else if (jQuery(checkedEl).is("#id-leaf-fallen-no")) {
        //   app.currentObservation.leaves[leafCycleNum-1] = { "leaf_num":leafCycleNum, "fallen":"no" };

        //   view.populatePage(pageNumber);
        // }
        // TODO: bring me back in for PROD (and make the above else -> else if)
        // else {
        //   jQuery().toastmessage('showErrorToast', "Please select whether this leaf has fallen");
        // }

      /********** PAGE 6 *********/
      } else if (pageNumber === 6) {            // special case for leaf cycle pages to loop
        // go to page 3 if the leaves aren't all done (eg array length is 6)
        if (leafCycleNum === 6) {
          view.populatePage(6);
        } else {
          view.populatePage(3);
        }


      /********** PAGE 8 (eg back to home screen) *********/
      } else if (pageNumber === 8) {
        jQuery('#title-page').removeClass('hidden');
        jQuery('#variable-content-container').addClass('hidden');
        jQuery('.back-btn').addClass('hidden');
        jQuery('.next-btn').addClass('hidden');


      /********** ALL OTHER PAGES *********/
      } else {
        // if there are radio buttons on this page, make sure they're checked
        if (jQuery('.current-page [type="radio"]').length > 0) {
          var checkedEl = jQuery('.current-page [type="radio"]:checked');

          view.populatePage(pageNumber);
          // TODO: bring me back in for PROD
          // if (checkedEl.length > 0) {
          //   view.populatePage(pageNumber);
          // } else {
          //   jQuery().toastmessage('showErrorToast', "Please make a selection");
          // }
        }  else {
          view.populatePage(pageNumber);
        }
      }
    },

    updateJSONObject: function() {
      var view = this;

      _.each(jQuery('.current-page .input-field'), function(i) {
        // if this is of type text take the text and put it straight up into the json
        if (i.type === "text" || i.type === "textarea" || i.type === "number") {
          // add text value to json
          if (jQuery('.current-page').hasClass('leaf-cycle')) {
            app.currentObservation.leaves[app.currentObservation.leaves.length-1][jQuery(i).data().fieldName] = jQuery(i).val();
          } else {
            app.currentObservation[jQuery(i).data().fieldName] = jQuery(i).val();
          }
        }
      });

      var el = jQuery('.current-page [type="radio"]:checked');
      // if there is a radio button on this page that is checked
      if (el.length > 0) {
        // if we're on the leaf cycle pages, otherwise it's a regular type of recording
        if (jQuery('.current-page').hasClass('leaf-cycle')) {
          app.currentObservation.leaves[app.currentObservation.leaves.length-1][el.data().fieldName] = jQuery(el).val();
        } else {
          app.currentObservation[el.data().fieldName] = jQuery(el).val();
        }
      }
    },

    updateProgressBar: function() {
      var view = this;
      // make them all opaque
      jQuery('.current-page .leaf-progress-img').addClass('unfinished-leaf-progress');

      // unopaque some of them
      jQuery('.current-page .leaf-progress-img').each(function(index, el) {
        if (index < view.getNumCompletedLeaves() + 1) {
          jQuery(el).removeClass('unfinished-leaf-progress');
        }
      });
    },

    // TODO: move me to the model (and other things to model)
    getNumCompletedLeaves: function() {
      var numCompletedLeaves = 0;
      _.each(app.currentObservation.leaves, function(leaf) {
        // either of these conditions denote 'completeness'
        if (leaf.fallen == "yes" || leaf.percent_colored != null) {
          numCompletedLeaves++;
        }
      });

      return numCompletedLeaves;
    },

    removePageClasses: function() {
      jQuery('.leaf-page').addClass('hidden');
      jQuery('.leaf-page').removeClass('current-page');
    },

    clearPageContent: function() {
      // standard clears
      jQuery('.current-page .input-field').text('');
      jQuery('.current-page .input-field').prop('checked', false);

      // special case of the number input fields (can't use text clear)
      jQuery('.leaf-measurement').val('');

      // clear yes/no buttons since it's a fake radio
      jQuery('.current-page .btn-select').removeClass('btn-select');
    },

    populatePage: function(pageNumber) {
      var view = this;

      view.updateJSONObject();
      view.removePageClasses();

      if (pageNumber === 1) {
        jQuery('.back-btn').addClass('hidden');
      } else {
        jQuery('.back-btn').removeClass('hidden');
      }

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
      view.clearPageContent();
      view.updateProgressBar();
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

      _.each(app.currentObservation.leaves, function(leaf) {
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
