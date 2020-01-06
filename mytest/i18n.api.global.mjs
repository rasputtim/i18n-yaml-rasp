import { i18n as i18nObj} from '../i18n.mjs';
import should from 'should';

var i18n = new i18nObj({
    locales: ['en', 'de'],
    fallbacks: { 'nl': 'de' },
    directory: './locales',
    register: global
  });

  var locale = i18n.getLocale();
  console.log (locale);
  var newlocale = i18n.setLocale('de');
var locale2 =  i18n.setLocale('en');
try{
  should.equal(i18n.setLocale('nl'), 'de', 'not equal');
}catch(error){
  console.log(error);        
}

i18n.setLocale('en');
var message = __('Empty');

try {
i18n.setLocale('en');
var trans1 = __('Hello');
var trans2 = __('Hello %s, how are you today?', 'Marcus');
var trans3 = __('Hello %s, how are you today? How was your %s.', 'Marcus', __('weekend'))
        should.equal(trans1, 'Hello');
        should.equal(trans2, 'Hello Marcus, how are you today?');
        should.equal(trans3, 'Hello Marcus, how are you today? How was your weekend.');
}catch(error){
  console.log(error);
}      

// should.equal(, '');