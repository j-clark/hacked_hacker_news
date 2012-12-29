describe('the unreadLink template', function() {
  it('should create the correct element', function() {
    var a = document.createElement('a');
    a.href = 'item?id=4960831';
    expect(BHNUtil.unreadLink(a, 7)).toEqual('<a href="item?id=4960831" class="unread-count">7 unread</a>')
  });
});