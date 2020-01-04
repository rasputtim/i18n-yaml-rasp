import { i18n as i18nObj } from '../i18n';
import should from 'should';
import fs from 'fs';
import path from 'path';

var testScope = {};

var i18n = new i18nObj({
  locales: ['en', 'de'],
  register: testScope,
  directory: './defaultlocales'
});

describe('Module Defaults', function() {

 

  beforeEach(function() {
    
    testScope.__('Hello');
  });

  afterEach(function() {
    var stats = fs.lstatSync('./defaultlocales');
    should.exist(stats);
    if (stats) {
      try {
        fs.unlinkSync('./defaultlocales/de.json');
        fs.unlinkSync('./defaultlocales/en.json');
        fs.rmdirSync('./defaultlocales');
      } catch (e) {}
    }

  });

  it('should be possible to setup a custom directory', function() {
    var stats = fs.lstatSync('./defaultlocales');
    should.exist(stats);
  });

  it('should be possible to read custom files with default a extension of .json (issue #16)', function() {
    var statsde = fs.lstatSync('./defaultlocales/de.json'),
      statsen = fs.lstatSync('./defaultlocales/en.json');
    should.exist(statsde);
    should.exist(statsen);
  });

});