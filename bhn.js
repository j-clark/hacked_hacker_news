;(function() {
  $(function() {

    $('span[id^="score_"]').each(function() {
      addToLocalStorage(this.id.split('_')[1]);
    });

  });

  function addToLocalStorage(postID) {
    if(!localStorage.getItem(postID)) {
      localStorage.setItem(postID, []);
    }
  }

})();