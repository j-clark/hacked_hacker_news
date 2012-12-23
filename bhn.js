;(function() {

  BETTER_HN = {};
  BETTER_HN.scoreSpan = 'span[id^="score_"]';
  BETTER_HN.hrefID = 'a[href^="item?id="]';

  $(function() {

    //REMOVE THIS
    injectJQuery();

    setUnreadCounts();
    if(isCommentsPage()) {
      // set unread count
      // highlight unread posts
      addCommentsToLocalStorage();
    } else {
      addStoriesToLocalStorage();
    }

  });

  function setUnreadCounts() {

    $(BETTER_HN.scoreSpan).each(function() {
      var comments_link = $(this).parent().find(BETTER_HN.hrefID);
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
      '"" class=unread-count>' + unread + ' unread</a>'
  }

  function addCommentsToLocalStorage() {

    //storyID should not be assumed to already by in localStorage
    //could have followed a link from not the front page
    var storyID = document.URL.match(/\d+$/);
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

  function toObject(str) {
    if(str === '') return {};

    var obj = {};
    var arr = str.split(',');

    for(var i = 0; i < arr.length; i++) {
      obj[arr[i]] = true;
    }

    return obj;
  }

  function getCommentIDs() {
    var ids = [];
    $('.comhead > ' + BETTER_HN.hrefID).each(function() {
      ids.push(this.getAttribute('href').split('=')[1]);
    });
    return ids;
  }

  function addStoriesToLocalStorage() {
    $(BETTER_HN.scoreSpan).each(function() {
      var id = this.id.split('_')[1];
      if(!localStorage.getItem(id)) {
        localStorage.setItem(id, []);
      }
    });
  }

  function isCommentsPage() {
    return document.URL.match(/item\?id=\d+/);
  }

  function injectJQuery() {
    var elem = document.createElement('script');
    elem.src = 'http://code.jquery.com/jquery-latest.min.js';
    document.getElementsByTagName('head')[0].appendChild(elem);
  }

})();