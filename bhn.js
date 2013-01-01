;(function() {

  BHNConst = {
    scoreSpan: 'span[id^="score_"]',
    hrefID: 'a[href^="item?id="]'
  }

  BHNPrefs = {};

  BHN = {
    storage: chrome.storage.sync,

    setItem: function(key, value) {
      var obj = {};
      obj[key] = value
      chrome.storage.sync.set(obj);
    },

    getItem: function(key, callback) {
      chrome.storage.sync.get(key, callback);
    },

    removeItem: function(key) {
      chrome.storage.sync.remove(key);
    }
  }

  function saveComments(storyID, commentIDs) {
    var obj = {},
        i;

    if(commentIDs.length) {
      obj['c'] = [];

      //this won't work for older threads that are split into multiple pages,
      //but solving that is more complicated than just retrieving the current
      //list and appending to it
      for(i = 0; i < commentIDs.length; i++) {
        obj.c.push(commentIDs[i]);
      }

      obj['d'] = new Date().getTime();
      BHN.setItem(storyID, obj);
    }
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
      $('.comhead > ' + BHNConst.hrefID).each(function() {
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

    $(BHNConst.scoreSpan).each(function() {
      var comments_link = $(this).parent().find(BHNConst.hrefID);
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
    $('.comhead > ' + BHNConst.hrefID).each(function() {
      ids.push(this.getAttribute('href').split('=')[1]);
    });
    return ids;
  }

  function getReadCommentIDs() {
    var ids = [];
    $('.comhead > ' + BHNConst.hrefID).each(function() {
      if(!$(this).closest('.default').hasClass('unread')) {
        ids.push(this.getAttribute('href').split('=')[1]);
      }
    });
    return ids;
  }

  function centerOf(elem) {
    return elem.offset().top - ( window.innerHeight - elem.height() ) / 2;
  }

  function scrollToNextUnread() {
    var firstUnread = $( $('.unread')[0] );

    $('.reading').removeClass('reading');

    if(firstUnread.length) {

      firstUnread.addClass('reading');
      firstUnread.removeClass('unread');

      if(firstUnread.height() >= window.innerHeight) {
        bhnScrollTo(firstUnread.offset().top);
      } else {
        bhnScrollTo( centerOf(firstUnread) );
      }
    }
  }

  function bhnScrollTo(y) {
    if(false) {
      window.scrollTo(0, y);
    } else {
      $('html, body').animate({ scrollTop: y }, 100);
    }
  }

  function showSpinner(elem) {
    $(elem).parent('p').append('<img class="spinner" src="img/spinner" />');
  }

  function removeSpinner(elem) {
    $(elem).parent('p').find('.spinner').remove();
  }

  function showInlineReply(elem) {
    var href = elem.getAttribute('href');
    if(href[0] === '/') {
      href = href.substr(1, href.length);
    }
    var url = 'http://news.ycombinator.com/' + href;
    var that = $(elem);

    showSpinner(elem);

    $.ajax({
      url: url,
      success: function(data) {
        var def = that.closest('.default');
        def.append( $(data).find('form').addClass('inline-reply')[0] );
        that.text('cancel');
        def.find('input[value="reply"]').click(function(event) {
          saveComments(getStoryID(), getReadCommentIDs());
        });
        def.find('textarea').focus();
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
      if(document.activeElement.tagName !== 'TEXTAREA') {
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

  function setupInlining() {
    var reply = 'a[href^="reply"]',
        edit = 'a[href^="edit"]',
        del = 'a[href^="/x?fnid="]:contains("delete")';

    $(reply + ',' + edit + ',' + del).click(function(event) {
      event.preventDefault();
      showInlineReply(this);
    });
  }

  function purgeCheck() {

    BHN.getItem('lastPurge', function(when) {
      if(when && when['lastPurge  ']) {
        if(daysOld({"d": when}, 1)) {
          purgeOldComments();
          window.alert('purging'); //REMOVE ME
          BHN.setItem('lastPurge', new Date().getTime());
        }
      } else {
        BHN.setItem('lastPurge', new Date().getTime());
      }
    });
  }

  function settingsIcon() {
    var pagetop = $('span.pagetop')[1];

    $('body').append( $('<div id="settings-panel" name="settings-panel" class="hidden" />').append('<span />').text('hi') )

    if(pagetop) {
      $(pagetop).append($('<span> | </span>'))
      $(pagetop).append($('<a href="#settings-panel" class="settings"/>').text('settings'))
    } else {
      console.log('asdf')
    }
    $('.settings').leanModal();
  }

  function loadPrefs() {
    BHN.getItem('BHNPrefs', function(data) {
      var prefs = BHNPrefs;

      if(data && data['BHNPrefs']) {

      }

      BHN.setItem('BHNPrefs', prefs);
    })
  }

  $(function() {
    $('a[href="submit"]').off('click')
    $('a[href="submit"]').leanModal();

    settingsIcon();
    loadPrefs();

    if(isThreadPage()) {

      setUnreadCounts();
      markUnreadComments();
      saveComments(getStoryID(), getCommentIDs());
      handleKeypress();
      setupInlining();

    } else if(bhnCares()) {
      setUnreadCounts();
    }
    purgeCheck();
  });

})();