;(function() {

  BHNUtil = {};
  BHNUtil.scoreSpan = 'span[id^="score_"]';
  BHNUtil.hrefID = 'a[href^="item?id="]';

  $(function() {

    //REMOVE THIS
    injectJQuery();

    setUnreadCounts();
    if(getStoryID() !== null) {
      markUnreadComments();
      addCommentsToLocalStorage();
    } else {
      addStoriesToLocalStorage();
    }

  });

  function markUnreadComments() {
    var storyID = getStoryID();
    var readComments = localStorage.getItem(storyID);

    readComments = idStringToObject(readComments || '');
    $('.comhead > ' + BHNUtil.hrefID).each(function() {
      var id = this.getAttribute('href').split('=')[1];
      if(!readComments[id]) {
        $(this).parent().parent().parent().addClass('unread');
      }
    });

  }

  function setUnreadCounts() {

    $(BHNUtil.scoreSpan).each(function() {
      var comments_link = $(this).parent().find(BHNUtil.hrefID);
      var num_comments = parseInt(comments_link.text(), 10) || 0;
      var comms = localStorage.getItem( this.id.split('_')[1] );
      var unread = 0;

      if(comms) {
        unread = num_comments - comms.split(',').length
      } else {
        unread = num_comments;
      }

      comments_link.parent().append(unreadLink(comments_link[0], unread));
    })

  }

  function unreadLink(aElem, unread) {
    return ' | <a href="' +
      aElem.getAttribute('href') +
      '"" class=unread-count>' + unread + ' unread</a>';
  }

  function addCommentsToLocalStorage() {

    //storyID should not be assumed to already by in localStorage
    //could have followed a link from not the front page
    var storyID = getStoryID();
    var commentIDs = getCommentIDs();
    var idStr = '';

    //FIXME: this will lose history for multipage comment threads.
    //eventually, this should append to the existing list, not
    //just overwrite it.
    if(commentIDs.length) {
      idStr = commentIDs.join();
    }

    localStorage.setItem(storyID, idStr);
  }

  BHNUtil.idStringToObject = function(str) {
    if(str === '') return {};

    var obj = {};
    var arr = str.split(',');

    for(var i = 0; i < arr.length; i++) {
      obj[arr[i]] = true;
    }

    return obj;
  };

  function getCommentIDs() {
    var ids = [];
    $('.comhead > ' + BHNUtil.hrefID).each(function() {
      ids.push(this.getAttribute('href').split('=')[1]);
    });
    return ids;
  }

  function addStoriesToLocalStorage() {
    $(BHNUtil.scoreSpan).each(function() {
      var id = this.id.split('_')[1];
      if(!localStorage.getItem(id)) {
        localStorage.setItem(id, []);
      }
    });
  }

  function getStoryID() {
    return document.URL.match(/\d+$/);
  }

  function injectJQuery() {
    var elem = document.createElement('script');
    elem.src = 'http://code.jquery.com/jquery-latest.min.js';
    document.getElementsByTagName('head')[0].appendChild(elem);
  }

})();