import { i18n as i18nObj } from '../i18n';
import should from 'should';
import fs from 'fs';
import path from 'path';

var i18n = new i18nObj({
  locales: ['en', 'de', 'fr'],
  defaultLocale: 'en',
  queryParameter: 'lang',
  cookiename: 'languageCookie',
  directory: './locales'
});


describe('Locale switching should work queryParameter', function() {

  var req;
  var res;

  beforeEach(function() {


    req = {
      request: "GET /test?lang=fr",
      url: "/test?lang=fr",
      headers: {
        'accept-language': 'de'
      },
      cookies:{
        'languageCookie':'de'
      }
    };

    res = {
      locals: {}
    };
  });

  it('getLocale should return same locale for req and res based on ?lang=fr', function() {
    i18n.init(req, res);

    i18n.getLocale(req).should.equal('fr');
    i18n.getLocale(res).should.equal('fr');

    req.getLocale().should.equal('fr');
    res.getLocale().should.equal('fr');
    res.locals.getLocale().should.equal('fr');

    req.__('Hello').should.equal('Bonjour');
    res.__('Hello').should.equal('Bonjour');
    res.locals.__('Hello').should.equal('Bonjour');
  });
});