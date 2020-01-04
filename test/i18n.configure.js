import { i18n } from '../i18n';
import should from 'should';
import fs from 'fs';

var testScope = {};

new i18n({
  locales: ['en', 'de'],
  register: testScope,
  directory: './customlocales',
  extension: '.customextension',
  prefix: 'customprefix-'
});

describe('Module Config', function() {

  

  beforeEach(function() {
    testScope.__('Hello');
  });

  afterEach(function() {
    var stats = fs.lstatSync('./customlocales');
    should.exist(stats);
    if (stats) {
      try {
        fs.unlinkSync('./customlocales/customprefix-de.customextension');
        fs.unlinkSync('./customlocales/customprefix-en.customextension');
        fs.rmdirSync('./customlocales');
      } catch (e) {}
    }

  });

  it('should be possible to setup a custom directory', function() {
    var stats = fs.lstatSync('./customlocales');
    should.exist(stats);
  });

  it('should be possible to read custom files with custom prefixes and extensions', function() {
    var statsde = fs.lstatSync('./customlocales/customprefix-de.customextension'),
      statsen = fs.lstatSync('./customlocales/customprefix-en.customextension');
    should.exist(statsde);
    should.exist(statsen);
  });

});