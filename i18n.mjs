
import { LocaleService } from './localeService.mjs';
import url from 'url';
import Messageformat from 'messageformat';
import plurals from 'cldr-core/supplemental/plurals.json';
import ordinals from 'cldr-core/supplemental/ordinals.json';
import Compiler from 'make-plural-compiler';



export class i18n extends LocaleService{
    
  
   /*
   * @param i18nProvider The i18n provider
   */
    constructor (options) {
      
      super(options);
      super.set_i18nObj(this,options);
      
    }
  
  i18n(){
    return super.self;
  }  
  
/**
   *
   * Middleware to use localeServidces with express
   */
  init(){
    
    return (request, response, next) => {
      
      if (typeof request === 'object') {
      
        // guess requested language/locale
      this.guessLanguage(request);
  
        // bind api to req
        this.applyAPItoObject(request);
  
        // looks double but will ensure schema on api refactor
        this.setLocale(request, request.locale);
      } else {
        return super.logError('i18n.init must be called with one parameter minimum, ie. i18n.init(req)');
      }
  
      if (typeof response === 'object') {
        this.applyAPItoObject(response);
  
        // and set that locale to response too
        this.setLocale(response, request.locale);
      }
  
      // head over to next callback when bound as middleware
      if (typeof next === 'function') {
        return next();
      }
    
    };
   
  }

  /**
   *
   * @returns {Function} A middleware function to use with Web Frameworks.
   * use our localeService object to detect 
   * and set the current locale based on the query parameter 
   */
  getMiddleWare() {
    return (req, res, next) => {
      const queryParameter = 'lang';
      if (req.url) {
        const urlObj = url.parse(req.url, true);
        if (urlObj.query[queryParameter]) {
          const language = urlObj.query[queryParameter].toLowerCase();
          req.setLocale(language);
        }
      }
      next();
    };
  }


    __(phrase) {
      var msg;
      var argv = super.parseArgv(arguments);
      var namedValues = argv[0];
      var args = argv[1];
      var other = super.getSelfFromObject();

      // called like __({phrase: "Hello", locale: "en"})
      if (typeof phrase === 'object') {
        if (typeof phrase.locale === 'string' && typeof phrase.phrase === 'string') {
          msg =  other.translate(phrase.locale, phrase.phrase);
        }
      }
      // called like __("Hello")
      else {
        // get translated message with locale from scope (deprecated) or object
         
        msg = other.translate(super.getLocaleFromObject(this), phrase);
      }
  
      // postprocess to get compatible to plurals
      if (typeof msg === 'object' && msg.one) {
        msg = msg.one;
      }
  
      // in case there is no 'one' but an 'other' rule
      if (typeof msg === 'object' && msg.other) {
        msg = msg.other;
      }
  
      // head over to postProcessing
      return other.postProcess(msg, namedValues, args);
    }
  
    __mf(phrase) {
      var other = super.getSelfFromObject();
      var msg, mf, f;
      var targetLocale = other.defaultLocale;
      var argv = super.parseArgv(arguments);
      var namedValues = argv[0];
      var args = argv[1];
      
      
      // called like __({phrase: "Hello", locale: "en"})
      if (typeof phrase === 'object') {
        if (typeof phrase.locale === 'string' && typeof phrase.phrase === 'string') {
          msg = phrase.phrase;
          targetLocale = phrase.locale;
        }
      }
      // called like __("Hello")
      else {
        // get translated message with locale from scope (deprecated) or object
        msg = phrase;
        targetLocale = super.getLocaleFromObject(this);
      }
  
      msg = other.translate(targetLocale, msg);
      // --- end get msg
  
      // now head over to Messageformat
      // and try to cache instance
      if (other.MessageformatInstanceForLocale[targetLocale]) {
        mf = other.MessageformatInstanceForLocale[targetLocale];
      } else {
        mf = new Messageformat(targetLocale);
        mf.compiledFunctions = {};
        other.MessageformatInstanceForLocale[targetLocale] = mf;
      }
  
      // let's try to cache that function
      if (mf.compiledFunctions[msg]) {
        f = mf.compiledFunctions[msg];
      } else {
        f = mf.compile(msg);
        mf.compiledFunctions[msg] = f;
      }
  
      return super.postProcess(f(namedValues), namedValues, args);
    }
  
    __l(phrase) {
      var translations = [];
      var other = super.getSelfFromObject();
      Object.keys(other.locales).sort().forEach(function(l) {
        translations.push(other.__({ phrase: phrase, locale: l }));
      });
      return translations;
    }
  
    __h(phrase) {
      var translations = [];
      var other = super.getSelfFromObject();
      Object.keys(other.locales).sort().forEach((l) => {
        var hash = {};
        hash[l] = other.__({ phrase: phrase, locale: l });
        translations.push(hash);
      });
      return translations;
    }
  
    __n(singular, plural, count) {
      var msg, namedValues, targetLocale, args = [];
      var other = super.getSelfFromObject();
      // Accept an object with named values as the last parameter
      if (super.argsEndWithNamedObject(arguments)) {
        namedValues = arguments[arguments.length - 1];
        args = arguments.length >= 5 ? Array.prototype.slice.call(arguments, 3, -1) : [];
      } else {
        namedValues = {};
        args = arguments.length >= 4 ? Array.prototype.slice.call(arguments, 3) : [];
      }
  
      // called like __n({singular: "%s cat", plural: "%s cats", locale: "en"}, 3)
      if (typeof singular === 'object') {
        if (
          typeof singular.locale === 'string' &&
          typeof singular.singular === 'string' &&
          typeof singular.plural === 'string'
        ) {
          targetLocale = singular.locale;
          msg = other.translate(singular.locale, singular.singular, singular.plural);
        }
        args.unshift(count);
  
        // some template engines pass all values as strings -> so we try to convert them to numbers
        if (typeof plural === 'number' || parseInt(plural, 10) + '' === plural) {
          count = plural;
        }
  
        // called like __n({singular: "%s cat", plural: "%s cats", locale: "en", count: 3})
        if (typeof singular.count === 'number' || typeof singular.count === 'string') {
          count = singular.count;
          args.unshift(plural);
        }
      } else {
        // called like  __n('cat', 3)
        if (typeof plural === 'number' || parseInt(plural, 10) + '' === plural) {
          count = plural;
  
          // we add same string as default
          // which efectivly copies the key to the plural.value
          // this is for initialization of new empty translations
          plural = singular;
  
          args.unshift(count);
          args.unshift(plural);
        }
        // called like __n('%s cat', '%s cats', 3)
        // get translated message with locale from scope (deprecated) or object
        msg = other.translate(super.getLocaleFromObject(this), singular, plural);
        targetLocale = super.getLocaleFromObject(this);
      }
  
      if (count === null) count = namedValues.count;
  
      // enforce number
      count = parseInt(count, 10);
  
      // find the correct plural rule for given locale
      if (typeof msg === 'object') {
        var p,x;
        // create a new Plural for locale
        // and try to cache instance
        if (other.PluralsForLocale[targetLocale]) {
          p = other.PluralsForLocale[targetLocale];
        } else {
          // split locales with a region code
          var lc = targetLocale.toLowerCase().split(/[_-\s]+/)
            .filter(function(el){ return true && el; });
          // take the first part of locale, fallback to full locale
          Compiler.load(plurals, ordinals);
          x = new Compiler(lc[0] || targetLocale, {cardinals:false,ordinals: true});
          //x.load(plurals, ordinals);
          p = x.compile();
          other.PluralsForLocale[targetLocale] = p;
        }
  
        // fallback to 'other' on case of missing translations
        
        msg = msg[p(count)] || msg.other;
      }
  
      // head over to postProcessing
      return super.postProcess(msg, namedValues, args, count);
    }
  
    setLocale(object, locale, skipImplicitObjects) {
      var other = super.getSelfFromObject();
      // when given an array of objects => setLocale on each
      if (Array.isArray(object) && typeof locale === 'string') {
        for (var i = object.length - 1; i >= 0; i--) {
          other.setLocale(object[i], locale, true);
        }
        return other.getLocale(object[0]);
      }
  
      // defaults to called like i18n.setLocale(req, 'en')
      var targetObject = object;
      var targetLocale = locale;
  
      // called like req.setLocale('en') or i18n.setLocale('en')
      if (locale === undefined && typeof object === 'string') {
        targetObject = this;
        targetLocale = object;
      }
  
      // consider a fallback
      if (!other.locales[targetLocale] && other.fallbacks[targetLocale]) {
        targetLocale = other.fallbacks[targetLocale];
      }
  
      // now set locale on object
      targetObject.locale = other.locales[targetLocale] ? targetLocale : other.defaultLocale;
  
      // consider any extra registered objects
      if (typeof other.register === 'object') {
        if (Array.isArray(other.register) && !skipImplicitObjects) {
          other.register.forEach((r) => {
            r.locale = targetObject.locale;
          });
        } else {
          other.register.locale = targetObject.locale;
        }
      }
  
      // consider res
      if (targetObject.res && !skipImplicitObjects) {
  
        // escape recursion
        // @see  - https://github.com/balderdashy/sails/pull/3631
        //       - https://github.com/mashpie/i18n-node/pull/218
        if (targetObject.res.locals) {
          other.setLocale(targetObject.res, targetObject.locale, true);
          other.setLocale(targetObject.res.locals, targetObject.locale, true);
        } else {
          other.setLocale(targetObject.res, targetObject.locale);
        }
      }
  
      // consider locals
      if (targetObject.locals && !skipImplicitObjects) {
  
        // escape recursion
        // @see  - https://github.com/balderdashy/sails/pull/3631
        //       - https://github.com/mashpie/i18n-node/pull/218
        if (targetObject.locals.res) {
          other.setLocale(targetObject.locals, targetObject.locale, true);
          other.setLocale(targetObject.locals.res, targetObject.locale, true);
        } else {
          other.setLocale(targetObject.locals, targetObject.locale);
        }
      }
  
      return other.getLocale(targetObject);
    }
  
    getLocale(request) {
      var other = super.getSelfFromObject();
      // called like i18n.getLocale(req)
      if (request && request.locale) {
        return request.locale;
      }
  
      // called like req.getLocale()
      return this.locale || other.defaultLocale;
    }
  
    getCatalog(object, locale) {
      var targetLocale;
      var other = super.getSelfFromObject();
      // called like i18n.getCatalog(req)
      if (typeof object === 'object' && typeof object.locale === 'string' && locale === undefined) {
        targetLocale = object.locale;
      }
  
      // called like i18n.getCatalog(req, 'en')
      if (!targetLocale && typeof object === 'object' && typeof locale === 'string') {
        targetLocale = locale;
      }
  
      // called like req.getCatalog('en')
      if (!targetLocale && locale === undefined && typeof object === 'string') {
        targetLocale = object;
      }
  
      // called like req.getCatalog()
      if (!targetLocale &&
        object === undefined &&
        locale === undefined &&
        typeof this.locale === 'string'
      ) {
        if (this.register && this.register.GLOBAL) {
          targetLocale = '';
        } else {
          targetLocale = this.locale;
        }
      }
  
      // called like i18n.getCatalog()
      if (targetLocale === undefined || targetLocale === '') {
        return other.locales;
      }
  
      if (!other.locales[targetLocale] && other.fallbacks[targetLocale]) {
        targetLocale = other.fallbacks[targetLocale];
      }
  
      if (other.locales[targetLocale]) {
        return other.locales[targetLocale];
      } else {
        other.logWarn('No catalog found for "' + targetLocale + '"');
        return false;
      }
    }
  
    getLocales() {
      var other = super.getSelfFromObject();
      return Object.keys(other.locales);
    }
  
    addLocale(locale) {
      var other = super.getSelfFromObject();
      other.read(locale);
    }
  
    removeLocale(locale) {
      var other = super.getSelfFromObject();
      delete other.locales[locale];
    }
  
    /**
   * guess language setting based on http headers
   */

  guessLanguage(request) {
    if (typeof request === 'object') {
      var queryParameter = this.queryParameter;

      var languageHeader = request.headers? request.headers['accept-language'] : undefined,
        languages = [],
        regions = [];

      request.languages = [this.defaultLocale];
      request.regions = [this.defaultLocale];
      request.language = this.defaultLocale;
      request.region = this.defaultLocale;

      // a query parameter overwrites all
      if (queryParameter && request.url) {
        var urlObj = url.parse(request.url, true);
        if (urlObj.query[queryParameter]) {
          super.logDebug('Overriding locale from query: ' + urlObj.query[queryParameter]);
          request.language = urlObj.query[queryParameter].toLowerCase();
          return this.setLocale(request, request.language);
        }
      }

      // a cookie overwrites headers
      if (this.cookiename && request.cookies && request.cookies[this.cookiename]) {
        request.language = request.cookies[this.cookiename];
        return this.setLocale(request, request.language);
      }

      // 'accept-language' is the most common source
      if (languageHeader) {
        var acceptedLanguages = this.getAcceptedLanguagesFromHeader(languageHeader),
          match, fallbackMatch, fallback;
        for (var i = 0; i < acceptedLanguages.length; i++) {
          var lang = acceptedLanguages[i],
            lr = lang.split('-', 2),
            parentLang = lr[0],
            region = lr[1];

          // Check if we have a configured fallback set for this language.
          if (this.fallbacks && this.fallbacks[lang]) {
            fallback = this.fallbacks[lang];
            // Fallbacks for languages should be inserted
            // where the original, unsupported language existed.
            var acceptedLanguageIndex = acceptedLanguages.indexOf(lang);
            var fallbackIndex = acceptedLanguages.indexOf(fallback);
            if(fallbackIndex > -1) {
              acceptedLanguages.splice(fallbackIndex, 1);
            }
            acceptedLanguages.splice(acceptedLanguageIndex + 1, 0, fallback);
          }

          // Check if we have a configured fallback set for the parent language of the locale.
          if (this.fallbacks && this.fallbacks[parentLang]) {
            fallback = this.fallbacks[parentLang];
            // Fallbacks for a parent language should be inserted
            // to the end of the list, so they're only picked
            // if there is no better match.
            if (acceptedLanguages.indexOf(fallback) < 0) {
              acceptedLanguages.push(fallback);
            }
          }

          if (languages.indexOf(parentLang) < 0) {
            languages.push(parentLang.toLowerCase());
          }
          if (region) {
            regions.push(region.toLowerCase());
          }

          if (!match && this.locales[lang]) {
            match = lang;
            break;
          }

          if (!fallbackMatch && this.locales[parentLang]) {
            fallbackMatch = parentLang;
          }
        }

        request.language = match || fallbackMatch || request.language;
        request.region = regions[0] || request.region;
        return this.setLocale(request, request.language);
      }
    }

    // last resort: defaultLocale
    return this.setLocale(request, this.defaultLocale);
  }

  
  /**
   * registers all public API methods to a given response object when not already declared
   */
  applyAPItoObject (object) {

    var alreadySetted = true;
    let api = this.api;
    
    // attach to itself if not provided
    for (var method in api) {
      if (api.hasOwnProperty(method)) {
        var alias = api[method];

        // be kind rewind, or better not touch anything already existing
        if (!object[alias]) {
          alreadySetted = false;
          object[alias] = this[method].bind(object);
        }
      }
    }

    // set initial locale if not set
    if (!object.locale) {
      object.locale = this.defaultLocale;
    }

    // escape recursion
    if (alreadySetted) {
      return;
    }

    // attach to response if present (ie. in express)
    if (object.res) {
      this.applyAPItoObject(object.res);
    }

    // attach to locals if present (ie. in express)
    if (object.locals) {
      this.applyAPItoObject(object.locals);
    }
  }

  /**translate
   * read locale file, translate a msg and write to fs if new
   */
  
  translate(locale, singular, plural, skipSyncToAllFiles) {

    //find provider
    var provider = LocaleService.i18nObj;
    
    // add same key to all translations
    if (!skipSyncToAllFiles && provider.syncFiles) {
      provider.syncToAllFiles(singular, plural);
    }
    
    if (locale === undefined) {
      provider.logWarn('WARN: No locale found - check the context of the call to __(). Using ' +
      provider.defaultLocale + ' as current locale');
      locale = provider.defaultLocale;
    }

    if (!provider.locales[locale] && provider.fallbacks[locale]) {
      locale = provider.fallbacks[locale];
    }

    // attempt to read when defined as valid locale
    if (!provider.locales[locale]) {
      provider.read(locale);
    }

    // fallback to default when missed
    if (!provider.locales[locale]) {

      provider.logWarn('WARN: Locale ' + locale +
        ' couldn\'t be read - check the context of the call to $__. Using ' +
        provider.defaultLocale + ' (default) as current locale');

      locale = provider.defaultLocale;
      provider.read(locale);
    }

    // dotnotaction add on, @todo: factor out
    var defaultSingular = singular;
    var defaultPlural = plural;
    if (provider.objectNotation) {
      var indexOfColon = singular.indexOf(':');
      // We compare against 0 instead of -1 because
      // we don't really expect the string to start with ':'.
      if (0 < indexOfColon) {
        defaultSingular = singular.substring(indexOfColon + 1);
        singular = singular.substring(0, indexOfColon);
      }
      if (plural && typeof plural !== 'number') {
        indexOfColon = plural.indexOf(':');
        if (0 < indexOfColon) {
          defaultPlural = plural.substring(indexOfColon + 1);
          plural = plural.substring(0, indexOfColon);
        }
      }
    }

    var accessor = provider.localeAccessor(locale, singular);
    var mutator = provider.localeMutator(locale, singular);

     if (plural) {
      if (!accessor(provider)) {
        mutator({
          'one': defaultSingular || singular,
          'other': defaultPlural || plural
        });
        provider.write(locale);
      }
    }

    if (!accessor(provider)) {
      mutator(defaultSingular || singular);
      provider.write(locale);
    }

    return accessor(provider);
  }

} 