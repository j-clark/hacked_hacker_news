/*

  MIT licensed.

  Copyright (c) 2012-2013 Joshua Clark <atxjclark@gmail.com>

  Permission is hereby granted, free of charge, to any person obtaining a
  copy of this software and associated documentation files (the "Software"),
  to deal in the Software without restriction, including without limitation
  the rights to use, copy, modify, merge, publish, distribute, sublicense,
  and/or sell copies of the Software, and to permit persons to whom the
  Software is furnished to do so, subject to the following conditions:

  The above copyright notice and this permission notice shall be included in
  all copies or substantial portions of the Software.

  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
  AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
  WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
  CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

*/

;(function() {
  'use strict';

  var HHNPrefs = {
    animateScroll: true
  },

  HHN = {
    storage: chrome.storage.sync,

    setItem: function(key, value) {
      var obj = {};
      obj[key] = value;
      this.storage.set(obj);
    },

    getItem: function(key, callback) {
      this.storage.get(key, callback);
    },

    removeItem: function(key) {
      this.storage.remove(key);
    }
  };

  function saveComments(storyID, commentIDs) {
    var obj = {}, i;

    if(commentIDs.length) {
      obj.c = [];
      obj.d = new Date().getTime();

      commentIDs.forEach(function (elem) {
        obj.c.push(elem);
      });
      HHN.setItem(storyID, obj);
    }
  }

  function unreadLink(a, unread) {
    return '<a href="' + a.getAttribute('href') +
      '" class="unread-count">' + unread + ' unread</a>';
  }

  function getStoryID() {
    var id = document.URL.match(/\d+$/);
    return id && id[0];
  }

  function isThreadPage() {
    //pages showing a subthread where the parent is root, but is not a submission
    //will match the regex, but shouldn't be treated as a submission/story
    return getStoryID() && !$('.default').find('a:contains("parent")').length;
  }

  function markUnreadComments() {
    var storyID = getStoryID();

    HHN.getItem(storyID, function(item) {
      $('.comhead > a[href^="item?id="]').each(function() {
        var id = this.getAttribute('href').split('=')[1],
            thread = item && item[storyID];

        if(!thread || !thread.c || thread.c.indexOf(id) < 0) {
          $(this).closest('.default').addClass('unread');
        }
      });
    });
  }

  function setUnreadCounts() {
    $('.subtext').find('a:contains("flag")').each(function() {
      var comments_link = $(this).parent().find('a[href^="item?id="]'),
          id = comments_link[0].getAttribute('href').split('=')[1];

      HHN.getItem(id, function(thread) {
        var unread = parseInt(comments_link.text(), 10) || 0;

        if(thread[id] && thread[id].c) {
          unread -= thread[id].c.length;
        }
        comments_link.parent().append(' | ' + unreadLink(comments_link[0], unread));
      });
    });
  }

  function getCommentIDs() {
    var ids = [];
    $('.comhead > a[href^="item?id="]').each(function() {
      ids.push(this.getAttribute('href').split('=')[1]);
    });
    return ids;
  }

  function getReadCommentIDs() {
    var ids = [];
    $('.comhead > a[href^="item?id="]').each(function() {
      if(!$(this).closest('.default').hasClass('unread')) {
        ids.push(this.getAttribute('href').split('=')[1]);
      }
    });
    return ids;
  }

  function centerOf(elem) {
    return elem.offset().top - ( window.innerHeight - elem.height() ) / 2;
  }

  function hhnScrollTo(y) {
    if(HHNPrefs.animateScroll) {
      $('html, body').animate({ scrollTop: y }, 100);
    } else {
      window.scrollTo(0, y);
    }
  }

  function scrollToNextUnread() {
    var firstUnread = $( $('.unread')[0] );
    $('.reading').removeClass('reading');

    if(firstUnread.length) {

      firstUnread.addClass('reading');
      firstUnread.removeClass('unread');

      if(firstUnread.height() >= window.innerHeight) {
        hhnScrollTo(firstUnread.offset().top);
      } else {
        hhnScrollTo( centerOf(firstUnread) );
      }
    }
  }

  function showSpinner(elem) {
    var spinnerURL = chrome.extension.getURL('/img/spinner.gif'),
        spinner = $('<img class="spinner" src="' + spinnerURL + '"/>');
    $(elem).closest('.default').append(spinner);
  }

  function removeSpinner(elem) {
    $('.spinner').remove();
  }

  function submitEdit(form) {
    $.ajax({
      url: document.URL,
      success: function(data) {
        var id = $(form).parent().find('span[id^="score_"]')[0].id,
            newComment = $(data).find('#' + id).closest('table').closest('tr');

        form.closest('table').closest('tr').replaceWith(newComment);

        //more elegant way to do this without readding handlers to everything?
        setupInlining();
      }
    });
  }

  function formSubmissionHandler(form, type) {
    form.ajaxForm(function() {
      if(type === 'delete') {
        form.closest('tbody').remove();
      } else if(type === 'edit') {
        submitEdit(form);
      } else {
        form.remove();
      }
      removeSpinner();
    });
  }

  function showInline(elem) {
    var url = elem.getAttribute('href').match(/[^\/].+$/),
        that = $(elem);

    $('.inline-form').remove();

    $.ajax({
      url: url,
      success: function(data) {
        var form = $(data).find('form'),
            def = that.closest('.default'),
            originText = that.text();

        def.append( form.addClass('inline-form')[0] );
        def.find('textarea').focus();

        removeSpinner();
        formSubmissionHandler(form, originText);

        that.text('cancel');
        that.off('click');
        that.click(function(event) {
          event.preventDefault();
          hideInline(this, originText);
        });
      }
    });
  }

  function hideInline(elem, text) {
    elem = $(elem).text(text).off('click');
    elem.closest('.default').find('.inline-form').remove();
    elem.click(function(event) {
      event.preventDefault();
      showInline(this);
    });
  }

  function hhnCares() {
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
        then = parseInt(obj.d, 10),
        age;

    if(then) {
      age = (now - then) / 86400000 > days; //86400000 = ms per day
    }
    return age;
  }

  function purgeOldComments() {
    HHN.getItem(null, function(storage) {
      var key,
          obj;
      for(key in storage) {
        if(storage.hasOwnProperty(key)) {
          HHN.getItem(key, purge);
        }
      }
    });
  }

  function purge(obj) {
    var key;

    for(key in obj) {
      if(obj.hasOwnProperty(key)) {
        if(obj.key.d && daysOld(obj.key, 5)) {
          HHN.removeItem(key);
        }
      }
    }
  }

  function purgeCheck() {

    HHN.getItem('lastPurge', function(when) {
      if(when.lastPurge) {
        if( daysOld({ 'd': when.lastPurge }, 1) ) {
          purgeOldComments();
          HHN.setItem('lastPurge', new Date().getTime());
        }
      } else {
        HHN.setItem('lastPurge', new Date().getTime());
      }
    });
  }

  function setupInlining() {
    var reply = 'a[href^="reply"]',
        edit = 'a[href^="edit"]',
        del = 'a[href^="/x?fnid="]:contains("delete")';

    $(reply + ',' + edit + ',' + del).click(function(event) {
      event.preventDefault();
      showSpinner(this);
      $(this).off('click');
      showInline(this);
    });
  }

  function settingsIcon() {
    var pagetop = $('span.pagetop')[1],
        div = '<div id="settings-panel" name="settings-panel" class="hidden" />';

    $('body').append( $(div).append('<span />').text('this isn\'t implented yet') );

    if(pagetop) {
      $(pagetop).append($('<span> | </span>'));
      $(pagetop).append($('<a href="#settings-panel" class="settings"/>').text('settings'));
    }
    $('.settings').colorbox({html:$('#settings-panel').html(), top:'10%'});
  }

  function loadPrefs() {
    HHN.getItem('HHNPrefs', function(data) {
      var prefs = HHNPrefs;

      HHN.setItem('HHNPrefs', prefs);
    });
  }

  function inlineSubmission() {
    $('a[href="submit"]').click(function(event) {
      event.preventDefault();
      var href = this.getAttribute('href');
      $.ajax({
        url:'http://news.ycombinator.com/' + href,
        success: function(data) {
          var form = $(data).find('form');
          form.find('a[href$="bookmarklet.html"]').closest('tr').remove();
          $.colorbox({
            html: form.parent().html(),
            top:'10%'
          });
        }
      });
    });
  }

  function neverEndingScroll() {
    $('a[href^="/x?fnid"]:contains("More")').click(function(event) {
      event.preventDefault();
      var more = $(this).parent().parent();

      $(this).click(function(event) {
        event.preventDefault();
      });

      $.ajax({
        url: more.find('a')[0].getAttribute('href'),
        success: function(data) {
          more.prev().remove();
          more.replaceWith( $(data).find('.comhead').closest('tbody').html() );
          neverEndingScroll();
        }
      });
    });
  }

  $(function() {
    $('a[href="submit"]').off('click');

    settingsIcon();
    loadPrefs();
    setupInlining();
    inlineSubmission();
    if(!document.URL.match(/thread/) && !document.URL.match(/ask/) ) {
      neverEndingScroll();
    }

    if(isThreadPage()) {

      setUnreadCounts();
      markUnreadComments();
      saveComments(getStoryID(), getCommentIDs());
      handleKeypress();

    } else if(hhnCares()) {
      setUnreadCounts();
    }
    purgeCheck();
  });

})();