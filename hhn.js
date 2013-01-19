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

  var debug = true,

  HHNLog = function(args) {
    if(debug) {
      console.log(args);
    }
  },

  HHN = {
    storage: chrome.storage.local,

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
  },

  HHNPurge = (function() {
    function check() {

      HHNLog('checking if i should purge...');

      HHN.getItem('lastPurge', function(when) {
        if(when.lastPurge) {
          if(_daysOld({ 'd': when.lastPurge }, 1, true)) {

            HHNLog('calling _purgeOldComments');

            _purgeOldComments();
            HHN.setItem('lastPurge', new Date().getTime());
          } else {
            HHNLog('nope');
            HHN.setItem('lastPurge', new Date().getTime() - 86400000)
          }
        } else {
          HHNLog('nope');
          HHN.removeItem('lastPurge')
          HHN.setItem('lastPurge', new Date().getTime());
        }
      });
    }

    function _daysOld(obj, days, purgeCheck) {
      var now = new Date().getTime(),
          then = parseInt(obj.d, 10);

      if(purgeCheck) {
        HHNLog('last purge was ' + new Date(then));
      } else {
        HHNLog('the comment was added on ' + new Date(then));
        HHNLog('its age is ' + ((now - then) / 86400000).toFixed(2));
      }

      if(then) {
        //86400000 is the number of ms in a day
        return (now - then) / 86400000 > days;
      } else {
        return null;
      }
    }

    function _purgeOldComments() {
      HHN.getItem(null, function(storage) {
        var key, obj;

        for(key in storage) {
          if(storage.hasOwnProperty(key)) {
            HHN.getItem(key, _purge);
          }
        }
      });
    }

    function _purge(obj) {
      var key;

      HHNLog('*******************');
      HHNLog(obj);

      for(key in obj) {
        HHNLog(key);
        if(obj.hasOwnProperty(key)) {
          if(obj[key].d && _daysOld(obj[key], 5)) {
            HHN.removeItem(key);
          }
        }
      }
      HHNLog('*******************');
    }

    return {
      check: check
    };
  })();

  function saveComments(storyID, commentIDs) {
    var obj = {},
        i;

    if(commentIDs.length) {
      obj.c = [];

      //this won't work for older threads that are split into multiple pages,
      //but solving that is more complicated than just retrieving the current
      //list and appending to it
      for(i = 0; i < commentIDs.length; i++) {
        obj.c.push(commentIDs[i]);
      }

      obj.d = new Date().getTime();
      HHN.setItem(storyID, obj);
    }
  }

  function unreadLink(a, unread) {
    var cls = 'unread-count ';

    if(unread > 0) {
      cls += 'bold'
    } else {
      unread = 0; // don't show negative unreads if a comment is deleted
    }
    return '<a href="' + a.getAttribute('href') +
      '" class="' + cls + '">' + unread + ' unread</a>';
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

    $('.subtext span[id^="score_"]').each(function() {
      var comments_link = $(this).parent().find('a[href^="item?id="]');
      if($(this).parent().find('.unread-count').length) return;
      var id = comments_link[0].getAttribute('href').split('=')[1];

      HHN.getItem(id, function(thread) {
        var unread = parseInt(comments_link.text(), 10) || 0;

        if(thread[id] && thread[id].c) {
          unread -= thread[id].c.length;
          comments_link.parent().append(' (' + unreadLink(comments_link[0], unread) + ')');
        }
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

  function findParent(elem) {
    //hacker news indents comments with a clear image
    //that is depth * 40 pixels wide
    var depth = elem.prev().prev().width() / 40,
        prev = null;

    if(depth === 0) return null;

    prev = elem.closest('tbody').closest('tr');
    while(prev.find('img').width() / 40 !== depth - 1) {
      prev = prev.prev();
    }
    return prev;
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
      scrollToComment(firstUnread);
    }
  }

  function scrollToComment(comment) {
    if(comment.height() >= window.innerHeight) {
      $('html, body').animate({ scrollTop: comment.offset().top }, 100);
    } else {
      $('html, body').animate({ scrollTop: centerOf(comment) }, 100);
    }
  }

  function showSpinner(elem) {
    var spinnerURL = chrome.extension.getURL('/img/spinner.gif'),
        spinner = $('<img class="spinner" src="' + spinnerURL + '"/>');
    $(elem).closest('.default').append(spinner);
  }

  function removeSpinner() {
    $('.spinner').remove();
  }

  function submitEdit(form) {
    $.ajax({
      url: document.URL,
      success: function(data) {
        var id = $(form).parent().find('span[id^="score_"]')[0].id,
            newComment = $(data).find('#' + id).closest('table').closest('tr');

        form.closest('table').closest('tr').replaceWith(newComment);
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

  function processForm(form, type) {
    if(type === 'edit') {
      form.find('td[valign="top"]:contains("text:")').remove();
      form.find('a[href="formatdoc"]').parent().remove();
    } else if(type === 'delete') {
      var cancelLink = $('<a href="#"/>').click(function(event) {
        event.preventDefault();
        form.remove();
      }).text('cancel');
      form.find('input[value="No"]').replaceWith(cancelLink);
    }
  }

  function showInline(elem) {
    var href = elem.getAttribute('href'),
        url = 'http://news.ycombinator.com/',
        that = $(elem);

    if(href[0] === '/') {
      href = href.substr(1, href.length);
    }
    url += href;
    $('.inline-form').remove();

    $.ajax({
      url: url,
      success: function(data) {
        var def = that.closest('.default'),
            form = $(data).find('form'),
            originText = that.text();

        processForm(form, originText);

        def.append(form.addClass('inline-form')[0]);
        removeSpinner();
        formSubmissionHandler(form, originText);

        that.text('cancel');
        def.find('textarea').focus();
        that.off('click');
        that.click(function(event) {
          event.preventDefault();
          hideInline(this, originText);
        });
      }
    });
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

  function setupInlining() {
    var reply = 'a[href^="reply"]',
        edit = 'a[href^="edit"]',
        del = 'a[href^="/x?fnid="]:contains("delete")';

    $(reply + ',' + edit + ',' + del).off('click').click(function(event) {
      event.preventDefault();
      showSpinner(this);
      $(this).off('click');
      showInline(this);
    });
  }

  function neverEndingScroll() {
    $('a[href^="/x?fnid"]:contains("More")').click(function(event) {
      event.preventDefault();
      $(this).off('click').click(function(event) {
        event.preventDefault();
      });

      var more = $(this).parent().parent();
      $.ajax({
        url: more.find('a')[0].getAttribute('href'),
        success: function(data) {
          more.prev().remove();
          more.replaceWith( $(data).find('.comhead').closest('tbody').html() );
          neverEndingScroll();
          setUnreadCounts();
        }
      });
    });
  }

  $(function() {

    if(!document.URL.match(/threads/) && !document.URL.match(/ask/)) {
      neverEndingScroll();
    }

    if(isThreadPage()) {

      setupInlining();
      setUnreadCounts();
      markUnreadComments();
      saveComments(getStoryID(), getCommentIDs());
      handleKeypress();

    } else if(hhnCares()) {
      setUnreadCounts();
    }
    HHNPurge.check();
  });

})();