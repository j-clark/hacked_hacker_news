;(function() {

  $(function() {

    injectJQuery();

    if(isCommentsPage()) {
      // highlight unread posts
      addCommentsToLocalStorage();
    } else {
      $('span[id^="score_"]').each(function() {
        addStoryToLocalStorage(this.id.split('_')[1]);
      });
    }

  });

  function addCommentsToLocalStorage() {
    var storyID = document.URL.match(/\d+$/);
    var commentIDs = getCommentIDs();
    var readComments = localStorage.getItem(storyID) || '';

    if(readComments !== '' && commentIDs.length) {
      readComments = readComments + ',' + commentIDs.join();
    } else if(readComments === '' && commentIDs.length) {
      readComments = commentIDs.join();
    }

    localStorage.setItem(storyID, readComments);

  }

  function getCommentIDs() {
    var ids = [];
    $('.comhead > a[href^="item?id="]').each(function() {
      ids[ids.length] = this.getAttribute('href').split('=')[1];
    });
    return ids;
  }

  function addStoryToLocalStorage(postID) {
    if(!localStorage.getItem(postID)) {
      localStorage.setItem(postID, []);
    }
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