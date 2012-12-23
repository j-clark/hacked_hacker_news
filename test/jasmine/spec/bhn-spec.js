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

describe('something', function() {
  it('should allow for e2e tests', function() {
    browser().navigateTo('http://www.google.com');
    expect(true).toEqual(true);
  });
});