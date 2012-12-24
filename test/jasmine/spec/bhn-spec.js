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

describe('the objectToIDString method', function() {
  it('should convert various objects to comma-separated lists', function() {
    expect(BHNUtil.objectToIDString({})).toEqual('');
    expect(BHNUtil.objectToIDString({'1234':true})).toEqual('1234');
    expect(BHNUtil.objectToIDString({'1234':true, '2345':true})).toEqual('1234,2345');
  });
});

describe('the unreadLink template', function() {
  it('should create the correct element', function() {
    var a = document.createElement('a');
    a.href = 'item?id=4960831';
    expect(BHNUtil.unreadLink(a, 7)).toEqual('<a href="item?id=4960831" class="unread-count">7 unread</a>')
  });
});

describe('localStorage interaction', function() {
  describe('addComments', function () {
    it('should add the right ids when no other ids are in storage', function() {
      localStorage.clear();
      BHNUtil.addCommentsToLocalStorage('1234', ['2345','3456']);
      expect(localStorage.getItem('1234')).toEqual('2345,3456');
    });
    it('should append the right ids when other ids are in storage', function() {
      localStorage.clear();
      BHNUtil.addCommentsToLocalStorage('1234', ['2345','3456']);
      BHNUtil.addCommentsToLocalStorage('1234', ['3456','4567']);
      expect(localStorage.getItem('1234')).toEqual('2345,3456,4567');
    });
  });

});