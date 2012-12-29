;(function() {

  var scoreSpan = 'span[id^="score_"]';
  var hrefID = 'a[href^="item?id="]';
  var testing = true;

  BHN = {
    storage: (function() {
      if(testing) {
        return localStorage;
      } else {
        return chrome.storage.sync;
      }
    }()),
    setItem: function(key, value) {
      var obj = {};
      if(testing) {
        localStorage.setItem(key, JSON.stringify(value));
      } else {
        obj[key] = value
        chrome.storage.sync.set(obj);
      }
    },
    getItem: function(key, callback) {
      var obj = {};
      if(testing) {
        obj[key] = JSON.parse(localStorage.getItem(key));
        callback(obj);
      } else {
        chrome.storage.sync.get(key, callback);
      }
    },
    removeItem: function(key) {
      if(testing) {
        localStorage.removeItem(key);
      } else {
        chrome.storage.sync.remove(key);
      }
    }
  }

  function saveComments(storyID, commentIDs) {
    var obj = { "d":0, "c":[] },
        new_thread = true,
        somth = null,
        i;

    BHN.getItem(storyID, function(somth) {
      if(commentIDs.length) {

        if(somth && somth.c) {
          obj = somth;
          new_thread = false;
        }

        for(i = 0; i < commentIDs.length; i++) {
          if(new_thread || obj.c.indexOf(commentIDs[i]) < 0) {
            obj.c.push(commentIDs[i]);
          }
        }

        obj.d = new Date().getTime();
        BHN.setItem(storyID, obj);
      }
    });
  }

  function unreadLink(aElem, unread) {
    return '<a href="' +
      aElem.getAttribute('href') +
      '" class="unread-count">' + unread + ' unread</a>';
  }

  function isThreadPage() {
    //pages showing a subthread where the parent is root, but is not a submission
    //will match the regex, but shouldn't be treated as a submission/story
    return document.URL.match(/\d+$/) && !$('.default').find('a:contains("parent")').length;
  }

  function getStoryID() {
    return document.URL.match(/\d+$/)[0];
  }

  function markUnreadComments() {
    var storyID = getStoryID();

    BHN.getItem(storyID, function(item) {
      $('.comhead > ' + hrefID).each(function() {
        var id = this.getAttribute('href').split('=')[1];

        if(item) {
          thread = item[storyID]
        } else {
          thread = item
        }

        if(!thread || !thread.c || thread.c.indexOf(id) < 0) {
          $(this).closest('.default').addClass('unread');
        }
      });
    });
  }

  function setUnreadCounts() {

    $(scoreSpan).each(function() {
      var comments_link = $(this).parent().find(hrefID);
      var num_comments = parseInt(comments_link.text(), 10) || 0;
      var id = this.id.split('_')[1];

      BHN.getItem(id, function(thread) {
        var unread = 0;

        if(thread && thread[id] && thread[id].c) {
          unread = num_comments - thread[id].c.length;
        } else {
          unread = num_comments;
        }

        comments_link.parent().append(' | ' + unreadLink(comments_link[0], unread));
      });
    });

  }

  function getCommentIDs() {
    var ids = [];
    $('.comhead > ' + hrefID).each(function() {
      ids.push(this.getAttribute('href').split('=')[1]);
    });
    return ids;
  }

  function centerOf(elem) {
    return elem.offset().top - ( window.innerHeight - elem.height() ) / 2;
  }

  function scrollToNextUnread() {
    var firstUnread = $( $('.unread')[0] ),
        scrollY = 0;
    $('.reading').removeClass('reading');

    if(firstUnread.length) {

      firstUnread.addClass('reading');
      firstUnread.removeClass('unread');
      scrollY = centerOf(firstUnread);

      if(firstUnread.height() >= window.innerHeight) {
        scrollToPosition(firstUnread.offset().top);
      } else {
        scrollToPosition(scrollY);
      }
    }
  }

  function scrollToPosition(y) {
    if(false) {
      window.scrollTo(0, y);
    } else {
      $('html, body').animate({scrollTop:y}, 100);
    }
  }

  function showSpinner(elem) {
    $(elem).parent('p').append('<img class="spinner" src="img/spinner" />');
  }

  function removeSpinner(elem) {
    $(elem).parent('p').find('.spinner').remove();
  }

  function showInlineReply(elem) {
    var url = 'http://news.ycombinator.com/' + elem.getAttribute('href');
    var that = $(elem);

    showSpinner(elem);

    $.ajax({
      url: url,
      success: function(data) {
        that.closest('.default').append( $(data).find('form').addClass('inline-reply')[0] );
        that.text('cancel');
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

  function handleKeypress() {
    $('body').keypress(function(event) {

      switch(event.keyCode) {
        case 106:
          scrollToNextUnread();
          break;
        case 114:
          $('.reading').find('a[href^="reply"]').click();
          break;
        default:
          break;
      }

    });
  }

  function daysOld(obj, days) {
    var now = new Date().getTime(),
        then = parseInt(obj.d, 10);

    if(then) {
      //86400000 is the number of ms in a day
      return (now - then) / 86400000 > days;
    } else {
      return null;
    }
  }

  function purgeOldComments() {
    var key,
        obj;

    for(key in BHN.storage) {

      BHN.getItem(key, function(item) {
        obj = item;
        if(obj && daysOld(obj, 2)) {
          BHN.removeItem(key);
          console.log('removing ' + key); //REMOVE ME
        }
      });

    }
  }

  function setupInlineReplying() {
    $('a[href^="reply"]').click(function(event) {
      event.preventDefault();
      showInlineReply(this);
    });
  }

  function purgeCheck() {

    BHN.getItem('lastPurge', function(when) {
      if(when) {
        if(daysOld({"d": when}, 1)) {
          purgeOldComments();
          window.alert('purging'); //REMOVE ME
        }
      } else {
        BHN.setItem('lastPurge', new Date().getTime());
      }
    });
  }

  $(function() {
    if(isThreadPage()) {

      setUnreadCounts();
      markUnreadComments();
      saveComments(getStoryID(), getCommentIDs());
      handleKeypress();
      setupInlineReplying();

    } else if(bhnCares()) {
      setUnreadCounts();
    }
    purgeCheck();
  });

})();