;(function() {

  var scoreSpan = 'span[id^="score_"]';
  var hrefID = 'a[href^="item?id="]';

  BHNUtil = {};
  BHNUtil = {
    addCommentsToLocalStorage: function(storyID, commentIDs) {
      var obj = {};
      var i;

      if(commentIDs.length) {

        obj = BHNUtil.idStringToObject(localStorage.getItem(storyID));
        for(i = 0; i < commentIDs.length; i++) {
          obj[commentIDs[i]] = true;
        }
      }

      localStorage.setItem(storyID, BHNUtil.objectToIDString(obj));
    },

    idStringToObject: function(str) {

      var obj = {};
      var i;

      if(str !== '' && str !== null) {
        var arr = str.split(',');

        for(i = 0; i < arr.length; i++) {
          obj[arr[i]] = true;
        }
      }

      return obj;
    },

    objectToIDString: function(obj) {

      var str = [];
      var key;
      if(obj) {
        for(key in obj) {
          str.push(key);
        }
      }
      return str.join();
    },

    unreadLink: function(aElem, unread) {
      return '<a href="' +
        aElem.getAttribute('href') +
        '" class="unread-count">' + unread + ' unread</a>';
    }
  };

  function getStoryID() {
    return document.URL.match(/\d+$/);
  }

  function markUnreadComments() {
    var storyID = getStoryID();
    var readComments = localStorage.getItem(storyID);

    readComments = BHNUtil.idStringToObject(readComments || '');
    $('.comhead > ' + hrefID).each(function() {
      var id = this.getAttribute('href').split('=')[1];
      if(!readComments[id]) {
        $(this).parent().parent().parent().addClass('unread');
      }
    });
  }

  function setUnreadCounts() {

    $(scoreSpan).each(function() {
      var comments_link = $(this).parent().find(hrefID);
      var num_comments = parseInt(comments_link.text(), 10) || 0;
      var comms = localStorage.getItem( this.id.split('_')[1] );
      var unread = 0;

      if(comms) {
        unread = num_comments - comms.split(',').length;
      } else {
        unread = num_comments;
      }

      comments_link.parent().append(' | ' + BHNUtil.unreadLink(comments_link[0], unread));
    });

  }

  function getCommentIDs() {
    var ids = [];
    $('.comhead > ' + hrefID).each(function() {
      ids.push(this.getAttribute('href').split('=')[1]);
    });
    return ids;
  }

  function addStoriesToLocalStorage() {
    $(scoreSpan).each(function() {
      var id = this.id.split('_')[1];
      if(!localStorage.getItem(id)) {
        localStorage.setItem(id, []);
      }
    });
  }

  function scrollToNextUnread() {
    var firstUnread = $($('.unread')[0]);
    $('.reading').removeClass('reading');
    if(firstUnread.length) {
      firstUnread.addClass('reading');
      firstUnread.removeClass('unread');
      var scrollY = firstUnread.offset().top - (window.innerHeight - firstUnread.height()) / 2;
      if(firstUnread.height() >= window.innerHeight) {
        scrollToPosition(0, firstUnread.offset().top);
      } else {
        scrollToPosition(0, scrollY);
      }
    }
  }

  function scrollToPosition(x, y) {
    if(false) {
      window.scrollTo(x, y);
    } else {
      $('html, body').animate({scrollTop:y}, 100);
    }
  }

  function showInlineReply(elem) {
    var url = 'http://news.ycombinator.com/' + elem.getAttribute('href');
    var that = $(elem);

    $.ajax({
      url: url,
      success: function(data) {
        that.closest('.default').append( $(data).find('form').addClass('inline-reply')[0] );
        that.text('cancel');
        that.addClass('inline-reply-cancel');
        that.click(function(event) {
          $(this).off('click');
          hideInlineReply(this);
          event.preventDefault();
        })
      }
    });
  }

  function hideInlineReply(elem) {
    var that = $(elem);
    that.text('reply');
    that.closest('.default').find('.inline-reply').remove();
    that.click(function(event) {
      $(this).off('click');
      event.preventDefault();
      showInlineReply(this);
    });
  }

  $(function() {
    setUnreadCounts();
    if(getStoryID() !== null) {
      markUnreadComments();
      BHNUtil.addCommentsToLocalStorage(getStoryID(), getCommentIDs());

      $('body').keypress(function(event) {
        if(event.keyCode === 106) {
          scrollToNextUnread();
        }
      });

      $('a[href^="reply"]').click(function(event) {
        event.preventDefault();
        $(this).off('click');
        showInlineReply(this);
      });
    } else {
      addStoriesToLocalStorage();
    }
  });

})();