import { i18n } from '../i18n';
import should from 'should';

var i18nObj = new i18n({
    locales: ['en', 'de'],
    fallbacks: { 'nl': 'de' },
    directory: './locales',
    register: global
  });

  var locale = i18nObj.getLocale();
  console.log (locale);