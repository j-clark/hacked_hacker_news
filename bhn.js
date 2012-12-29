;(function() {

  var scoreSpan = 'span[id^="score_"]';
  var hrefID = 'a[href^="item?id="]';

  BHNUtil = {};
  BHNUtil = {
    addCommentsToLocalStorage: function(storyID, commentIDs) {
      var obj = {};
      var i;

      if(commentIDs.length) {

        obj = JSON.parse(localStorage.getItem(storyID));
        for(i = 0; i < commentIDs.length; i++) {
          if(obj.c.indexOf(commentIDs[i]) < 0) {
            obj.c.push(commentIDs[i]);
          }
        }
        obj.d = new Date().getTime();
      }

      localStorage.setItem(storyID, JSON.stringify(obj));
    },

    unreadLink: function(aElem, unread) {
      return '<a href="' +
        aElem.getAttribute('href') +
        '" class="unread-count">' + unread + ' unread</a>';
    }
  };

  function isThreadPage() {
    //pages showing a subthread where the parent is root, but is not a submission
    //will match the regex, but shouldn't be treated as a submission/story
    return document.URL.match(/\d+$/) && !$('.default').find('a:contains("parent")').length;
  }

  function getStoryID() {
    return document.URL.match(/\d+$/);
  }

  function markUnreadComments() {
    var storyID = getStoryID();
    var thread = JSON.parse(localStorage.getItem(storyID) || {})

    // thread = BHNUtil.idStringToObject(thread || '');
    $('.comhead > ' + hrefID).each(function() {
      var id = this.getAttribute('href').split('=')[1];

      if(thread.c.indexOf(id) < 0)
        $(this).closest('.default').addClass('unread');
    });
  }

  function setUnreadCounts() {

    $(scoreSpan).each(function() {
      var comments_link = $(this).parent().find(hrefID);
      var num_comments = parseInt(comments_link.text(), 10) || 0;
      var thread = JSON.parse(localStorage.getItem( this.id.split('_')[1] ));
      var unread = 0;

      if(thread) {
        unread = num_comments - thread.c.length;
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
      var new_obj = {
        "d": new Date().getTime(),
        "c": []
      }
      if(!localStorage.getItem(id)) {
        localStorage.setItem(id, JSON.stringify(new_obj));
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
        that.off('click');
        that.click(function(event) {
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
    that.off('click');
    that.click(function(event) {
      event.preventDefault();
      showInlineReply(this);
    });
  }

  function bhnCares() {
    return document.URL.indexOf('thread') < 0 &&
      document.URL.indexOf('newcomments') < 0 &&
      !isThreadPage();
  }

  $(function() {
    if(getStoryID() !== null) {
      setUnreadCounts();
      markUnreadComments();
      BHNUtil.addCommentsToLocalStorage(getStoryID(), getCommentIDs());

      $('body').keypress(function(event) {
        if(event.keyCode === 106) {
          scrollToNextUnread();
        } else if(event.keyCode === 114) {
          $('.reading').find('a[href^="reply"]').click();
        }
      });

      $('a[href^="reply"]').click(function(event) {
        event.preventDefault();
        showInlineReply(this);
      });
    } else if(bhnCares()) {
      setUnreadCounts();
      addStoriesToLocalStorage();
    }
  });

})();