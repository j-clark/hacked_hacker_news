describe('the idStringToObject method', function() {

  it('should convert an empty string to an empty object', function() {
    expect(BHNUtil.idStringToObject('')).toEqual({});
  });

  it('should convert a string containing one id to an object containing one id', function () {
    expect(BHNUtil.idStringToObject('123456')).toEqual({'123456': true});
  });

  it('should convert a string containing two ids to an object containing two ids', function () {
    expect(BHNUtil.idStringToObject('123456,234567')).toEqual({'123456': true, '234567': true});
  });
});

describe('the unreadLink template', function() {
  it('should create the correct element', function() {
    var a = document.createElement('a');
    a.href = 'item?id=4960831';
    expect(BHNUtil.unreadLink(a, 7)).toEqual('<a href="item?id=4960831" class="unread-count">7 unread</a>')
  })
})