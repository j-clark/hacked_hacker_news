;(function() {

  BHNConst = {
    hrefID: 'a[href^="item?id="]',
    prefsKey: 'BHNPrefs'
  }

  BHNPrefs = {
    animateScroll: true
  };

  BHN = {
    storage: chrome.storage.sync,

    setItem: function(key, value) {
      var obj = {};
      obj[key] = value
      this.storage.set(obj);
    },

    getItem: function(key, callback) {
      this.storage.get(key, callback);
    },

    removeItem: function(key) {
      this.storage.remove(key);
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

  function unreadLink(a, unread) {
    return '<a href="' + a.getAttribute('href') +
      '" class="unread-count">' + unread + ' unread</a>';
  }

  function isThreadPage() {
    //pages showing a subthread where the parent is root, but is not a submission
    //will match the regex, but shouldn't be treated as a submission/story
    return getStoryID() && !$('.default').find('a:contains("parent")').length;
  }

  function getStoryID() {
    var id = document.URL.match(/\d+$/);
    return id && id[0];
  }

  function markUnreadComments() {
    var storyID = getStoryID();

    BHN.getItem(storyID, function(item) {
      $('.comhead > ' + BHNConst.hrefID).each(function() {
        var id = this.getAttribute('href').split('=')[1];
        var thread = item && item[storyID];

        if(!thread || !thread.c || thread.c.indexOf(id) < 0) {
          $(this).closest('.default').addClass('unread');
        }
      });
    });
  }

  function setUnreadCounts() {
    $('.subtext').find('a:contains("flag")').each(function() {
      var comments_link = $(this).parent().find(BHNConst.hrefID),
          id = comments_link[0].getAttribute('href').split('=')[1];

      BHN.getItem(id, function(thread) {
        var unread = parseInt(comments_link.text(), 10) || 0;

        console.log(thread[4993753].c.length)

        if(thread && thread[id] && thread[id].c) {
          unread -= thread[id].c.length;
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
    if(BHNPrefs.animateScroll) {
      $('html, body').animate({ scrollTop: y }, 100);
    } else {
      window.scrollTo(0, y);
    }
  }

  // function showSpinner(elem) {
  //   $(elem).parent('p').append('<img class="spinner" src="img/spinner" />');
  // }

  // function removeSpinner(elem) {
  //   $(elem).parent('p').find('.spinner').remove();
  // }

  function showInline(elem) {
    var href = elem.getAttribute('href');
    if(href[0] === '/') {
      href = href.substr(1, href.length);
    }
    var url = 'http://news.ycombinator.com/' + href;
    var that = $(elem);

    // showSpinner(elem);

    $.ajax({
      url: url,
      success: function(data) {
        var def = that.closest('.default'),
            form = $(data).find('form'),
            originText = that.text();
        def.append(form.addClass('inline-form')[0]);

        formSubmissionHandler(form, originText);

        that.text('cancel');
        def.find('textarea').focus();
        that.off('click');
        that.click(function(event) {
          event.preventDefault();
          hideInline(this, originText);
        })
      }
    });
  }

  function formSubmissionHandler(form, type) {
    form.ajaxForm(function() {
      if(type === 'delete') {
        form.closest('tbody').remove();
      } else {
        form.remove();
      }
    });


    console.log(type)
  }

  function hideInline(elem, text) {
    elem = $(elem);
    elem.text(text);
    elem.closest('.default').find('.inline-form').remove();
    elem.off('click');
    elem.click(function(event) {
      event.preventDefault();
      showInline(this);
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
          case 97:
            $('.reading').closest('.default').parent().find('a[id^="up_"]').click();
            break;
          case 106:
            scrollToNextUnread();
            break;
          case 114:
            $('.reading').find('a[href^="reply"]').click();
            break;
          case 122:
            $('.reading').closest('.default').parent().find('a[id^="down_"]').click();
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

      console.log('lastPuge: ' + ((now - then) / (86400000/24) ) + ' hours ago')

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
        if(key === 'lastPurge') return;
        if(obj[key] && daysOld(obj[key], 1)) {
          BHN.removeItem(key);
          console.log('removing ' + key); //REMOVE ME
        } else {
          console.log(obj)
        }
      });

    }
  }

  function purgeCheck() {

    BHN.getItem('lastPurge', function(when) {
      if(when && when['lastPurge']) {
        // if(daysOld({ 'd': when['lastPurge'] }, 1/24)) {
          purgeOldComments();
          window.alert('purging'); //REMOVE ME
          BHN.setItem('lastPurge', new Date().getTime());
        // }
      } else {
        BHN.setItem('lastPurge', new Date().getTime());
      }
    });
  }

  function setupInlining() {
    var reply = 'a[href^="reply"]',
        edit = 'a[href^="edit"]',
        del = 'a[href^="/x?fnid="]:contains("delete")';

    $(reply + ',' + edit + ',' + del).click(function(event) {
      event.preventDefault();
      showInline(this);
    });
  }

  function settingsIcon() {
    var pagetop = $('span.pagetop')[1];
    var div = '<div id="settings-panel" name="settings-panel" class="hidden" />';

    $('body').append( $(div).append('<span />').text('hi') )

    if(pagetop) {
      $(pagetop).append($('<span> | </span>'))
      $(pagetop).append($('<a href="#settings-panel" class="settings"/>').text('settings'))
    } else {
      console.log('asdf')
    }
    $('.settings').leanModal();
  }

  function loadPrefs() {
    BHN.getItem(BHNConst.prefsKey, function(data) {
      var prefs = BHNPrefs;

      if(data && data[BHNConst.prefsKey]) {

      }

      BHN.setItem(BHNConst.prefsKey, prefs);
    })
  }

  $(function() {
    $('a[href="submit"]').off('click')
    $('a[href="submit"]').leanModal();

    settingsIcon();
    loadPrefs();
    setupInlining();

    if(isThreadPage()) {

      setUnreadCounts();
      markUnreadComments();
      saveComments(getStoryID(), getCommentIDs());
      handleKeypress();

    } else if(bhnCares()) {
      setUnreadCounts();
    }
    // purgeCheck();
  });

})();