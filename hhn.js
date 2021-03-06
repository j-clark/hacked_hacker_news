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

  var debug = false,

  HHNLog = function(args) {
    debug && console.log(args);
  },

  HHNAlert = function(args) {
    debug && window.alert(args);
  },

  HHN = (function() {
    var storage = chrome.storage.local;

    function setItem(key, value) {
      var obj = {};
      obj[key] = value;
      storage.set(obj);
    }

    function getItem(key, callback) {
      storage.get(key, callback);
    }

    function removeItem(key) {
      storage.remove(key);
    }

    return {
      setItem: setItem,
      getItem: getItem,
      removeItem: removeItem
    };
  })(),

  HHNPurge = (function() {
    function check() {

      HHNLog('checking if i should purge...');

      HHN.getItem('lastPurge', function(when) {
        if(when.lastPurge) {
          if(_daysOld({ 'd': when.lastPurge }, 1, true)) {

            HHNLog('calling _purgeOldComments');
            HHNAlert('purging');

            _purgeOldComments();
            HHN.setItem('lastPurge', new Date().getTime());
          } else {
            HHNLog('nope');
          }
        } else {
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
        var key;

        for(key in storage) {
          if(storage.hasOwnProperty(key)) {
            HHN.getItem(key, _purge);
          }
        }
      });
    }

    function _purge(obj) {
      var key;

      HHNLog(obj);

      for(key in obj) {
        HHNLog(key);
        if(obj.hasOwnProperty(key)) {
          if(obj[key].d && _daysOld(obj[key], 3)) {
            HHN.removeItem(key);
          }
        }
      }
    }

    return {
      check: check
    };
  })(),

  HHNEndlessNews = (function() {
    var paths = ['/','/news','/newest', '/newcomments', '/ask'];

    function init() {
      if(paths.indexOf(window.location.pathname) > -1) {
        _linkClickHandler();
      }
    }

    function _retry() {
      HHNLog('need to try again');
      setTimeout(function() {
        $.ajax({
          //what if we're not on the first page?!
          url: document.URL,
          success: _loadNextPage
        });
      }, 1000);
    }

    function _linkClickHandler() {
      $('a[href^="/x?fnid"]:contains("More")').click(function(event) {
        event.preventDefault();
        $(this).off('click').click(function(event) {
          event.preventDefault();
        });
        _loadNextPage(null);
      });
    }

    function _loadNextPage(page) {
      HHNLog('from loadNextPage');
      setTimeout(function() {
        var
          moreLink = 'a[href^="/x?fnid"]:contains("More")',
          more = $(moreLink).parent().parent(),
          link = page ? $(page).find(moreLink)[0] : more.find('a')[0];

        $.ajax({
          url: link.getAttribute('href'),
          success: function(html) {
            if(html !== 'Unknown or expired link.') {
              _replaceLinkWithHTML(more, html);
            } else {
              page ? window.location.href = this.url : _retry();
            }
          }
        });
      }, page ? 1000 : 1);
    }

    function _replaceLinkWithHTML(more, html) {
      more.prev().remove();
      more.replaceWith( $(html).find('tbody:first > tr')[2].getElementsByTagName('tbody')[0].innerHTML );

      _linkClickHandler();
      setUnreadCounts();
    }

    return {
      init: init
    };
  })();

  function saveComments(storyID, commentIDs) {
    var obj = {}, i;

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
      cls += 'bold';
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

  function processComments() {
    var comheads = $('.comhead > a[href^="item?id="]');
    markUnread(comheads);
    setDepths(comheads);
    addParentLinks(comheads);
  }

  function setDepths(comments) {
    comments.closest('tbody').closest('tr').each(function() {
      var width = $(this).find('img').width();
      if(width !== null) {
        $(this).attr('depth', width / 40);
      }
    });
  }

  function hasParent(elem) {
    return +elem.closest('[depth]').attr('depth') > 0;
  }

  function addParentLinks(comments) {
    comments.closest('.default').each(function() {
      if(hasParent($(this))) {
        appendParentLinkAfter($(this).find('u'));
      }
    });
  }

  function appendParentLinkAfter(elem) {
    if(elem.length) {
      var link = document.createElement('a');
      link.setAttribute('href', '#');
      link.className = 'parent';
      link.innerHTML = 'parent';
      $(link).click(function(event) {
        event.preventDefault();
        var parent = findParent($(this).closest('.default'));
        scrollToComment(parent);
      }).insertAfter(elem[0]);
    }
  }

  function markUnread(comments) {
    var storyID = getStoryID();
    HHN.getItem(storyID, function(item) {
      comments.each(function() {
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

  function findParent(elem) {
    //hacker news indents comments with a clear image
    //that is depth * 40 pixels wide
    var depth = elem.closest('[depth]').attr('depth'),
        prev = null;

    if(depth === 0) return null;

    prev = elem.closest('[depth]').prev();
    while(+prev.attr('depth') !== depth - 1) {
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
      form.find('input[value="No"]').remove();
    }
  }

  function showInline(elem) {
    var that = $(elem);

    $('.inline-form').remove();

    $.ajax({
      url: elem.getAttribute('href'),
      success: function(data) {
        var
          def = that.closest('.default'),
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
    var
      reply = 'a[href^="reply"]',
      edit = 'a[href^="edit"]',
      del = 'a[href^="/x?fnid="]:contains("delete")';

    $(reply + ',' + edit + ',' + del).off('click').click(function(event) {
      event.preventDefault();
      showSpinner(this);
      $(this).off('click');
      showInline(this);
    });
  }

  function wrapThread(elem) {
    var
      rootDepth = +elem.attr('depth'),
      elems = [];

    elems.push(elem[0]);
    elem = elem.next();

    while(+elem.attr('depth') > rootDepth) {
      elems.push(elem[0]);
      elem = elem.next();
    }
    $(elems).wrapAll('<div class="thread" />');
  }

  $(function() {
    HHNEndlessNews.init();

    if(isThreadPage()) {

      setupInlining();
      setUnreadCounts();
      processComments();
      saveComments(getStoryID(), getCommentIDs());
      handleKeypress();

    } else if(hhnCares()) {
      setUnreadCounts();
    }
    HHNPurge.check();
  });

})();