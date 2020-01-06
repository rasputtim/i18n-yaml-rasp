/**
 * @author      Created by Rasputtim <rasputtim@gmx.com> on 2019-12-25.
 * @link        
 * @license     http://opensource.org/licenses/MIT
 *
 * @version     0.0.1
 */

'use strict';

 

//import url from 'url';
import fs  from 'fs';
import path  from 'path';
import debugfactory  from 'debug';
import jsyaml  from 'js-yaml'; //added rasputtim
import warnfactory  from 'debug';
import errorfactory  from 'debug';

var __dirname = path.resolve(path.dirname(''));

console.log(__dirname);
// dependencies// dependencies
//todo: correct vsprintf problem of loading as a module
//import * as sprintfLib  from 'sprintf-js';
import Mustache from 'mustache';
import parseInterval from'math-interval-parser';





let debug = debugfactory('i18n:debug');
let warn = warnfactory('i18n:warn');
let error = errorfactory('i18n:error');

let map =  new WeakMap();


function getAllFuncs(obj) {
  var props = [];

  do {
      props = props.concat(Object.getOwnPropertyNames(obj));
      //console.log("PROP: " + props);
  } while (obj = Object.getPrototypeOf(obj));
  return props;
  //return props.sort().filter(function(e, i, arr) { 
  //   if (e!=arr[i+1] && typeof obj[e] == 'function') return true;
  //});
}



/**
 * LocaleService
 */
export class LocaleService {
  

  static locales = {}; 
  static PluralsForLocale = {};
  static i18nObj = {};
  /**
   *
   * @param i18nProvider The i18n provider
   */
  constructor(myOptions) {
    this.version = '0.8.3';
    
    this.i18nOptions = myOptions;
    // reset locales
    this.locales = {};
    this.PluralsForLocale = {};
    this.pathsep = path.sep;
    //console.log("CREATED THE LocaleServie");
    // Store a reference to your object
    // where to store json files
    this.directory = ( typeof this.i18nOptions !== 'undefined' && typeof this.i18nOptions.directory === 'string') ?
    this.i18nOptions.directory : path.join(__dirname, 'locales');
    
    

    // permissions when creating new directories
    // default permissions are 0744
    this.directoryPermissions = ( typeof this.i18nOptions !== 'undefined' &&  typeof this.i18nOptions.directoryPermissions === 'string') ?
    parseInt(this.i18nOptions.directoryPermissions, 8) : '0744';

   
    if (!fs.existsSync(this.directory)){
      fs.mkdirSync(this.directory , this.directoryPermissions);
    }

    // setting custom logger functions
    this.logDebugFn = ( typeof this.i18nOptions !== 'undefined' && typeof this.i18nOptions.logDebugFn === 'function') ? this.i18nOptions.logDebugFn : debug;
    this.logWarnFn = ( typeof this.i18nOptions !== 'undefined' && typeof this.i18nOptions.logWarnFn === 'function') ? this.i18nOptions.logWarnFn : warn;
    this.logErrorFn = ( typeof this.i18nOptions !== 'undefined' && typeof this.i18nOptions.logErrorFn === 'function') ? this.i18nOptions.logErrorFn : error;


    // json files prefix
    this.prefix = ( typeof this.i18nOptions !== 'undefined' && typeof this.i18nOptions.prefix === 'string') ? this.i18nOptions.prefix : '';

    // write new locale information to disk
    this.updateFiles = ( typeof this.i18nOptions !== 'undefined' && typeof this.i18nOptions.updateFiles === 'boolean') ? this.i18nOptions.updateFiles : true;

    this.api = {
      'i18n' : 'i18n',
      '__': '__',
      '__n': '__n',
      '__l': '__l',
      '__h': '__h',
      '__mf': '__mf',
      'getLocale': 'getLocale',
      'setLocale': 'setLocale',
      'getCatalog': 'getCatalog',
      'getLocales': 'getLocales',
      'addLocale': 'addLocale',
      'removeLocale': 'removeLocale'
    };  

      // Provide custom API method aliases if desired
      // This needs to be processed before the first call to applyAPItoObject()
      if ( typeof this.i18nOptions !== 'undefined' && this.i18nOptions.api && typeof this.i18nOptions.api === 'object') {
        for (var method in this.i18nOptions.api) {
          if (this.i18nOptions.api.hasOwnProperty(method)) {
            var alias = this.i18nOptions.api[method];
            if (typeof this.api[method] !== 'undefined') {
              this.api[method] = alias;
            }
          }
        }
      }
  
      
  
      // sets a custom cookie name to parse locale settings from
      this.cookiename = ( typeof this.i18nOptions !== 'undefined' && typeof this.i18nOptions.cookie === 'string') ? this.i18nOptions.cookie : null;
  
      // query-string parameter to be watched - @todo: add test & doc
      this.queryParameter = ( typeof this.i18nOptions !== 'undefined' && typeof this.i18nOptions.queryParameter === 'string') ? this.i18nOptions.queryParameter : null;
  
  
      // sync locale information accros all files
      this.syncFiles = ( typeof this.i18nOptions !== 'undefined' && typeof this.i18nOptions.syncFiles === 'boolean') ? this.i18nOptions.syncFiles : false;
  
      // what to use as the indentation unit (ex: "\t", "  ")
      this.indent = ( typeof this.i18nOptions !== 'undefined' && typeof this.i18nOptions.indent === 'string') ? this.i18nOptions.indent : '\t';
        if ( typeof this.i18nOptions !== 'undefined' && this.i18nOptions.extension === '.yaml') {
            this.i18nOptions.extension = '.yml';
        }
  
      // setting defaultLocale
      var defLocale = ( typeof this.i18nOptions !== 'undefined' && typeof this.i18nOptions.defaultLocale === 'string') ? this.i18nOptions.defaultLocale : 'en';
      
      map.set(this, {
        defaultLocale: defLocale
     }); 
      //change rasputtim
      // Schema to be used for yaml files (ex: require("js-yaml/lib/js-yaml/schema/default_full"))
      this.yamlSchema = ( typeof this.i18nOptions !== 'undefined' && typeof this.i18nOptions.yamlSchema === 'string') ? this.i18nOptions.schema : '';
  
      // enable object notation?
      this.objectNotation = ( typeof this.i18nOptions !== 'undefined' && typeof this.i18nOptions.objectNotation !== 'undefined') ? this.i18nOptions.objectNotation : false;
      if (this.objectNotation === true) this.objectNotation = '.';
  
      // read language fallback map
      this.fallbacks = ( typeof this.i18nOptions !== 'undefined' && typeof this.i18nOptions.fallbacks === 'object') ? this.i18nOptions.fallbacks : {};
  
      // when missing locales we try to guess that from directory
      if ( typeof this.i18nOptions !== 'undefined' && !Array.isArray(this.i18nOptions.locales) ) 
        this.i18nOptions.locales = this.guessLocales(this.directory);


    // implicitly read all localesi
    if (typeof this.i18nOptions !== 'undefined' && Array.isArray(this.i18nOptions.locales) ) {
     
      this.i18nOptions.locales.forEach((l) =>{
        this.read(l);
      });

      // auto reload locale files when changed
      if ( typeof this.i18nOptions !== 'undefined' && this.i18nOptions.autoReload) {

        // watch changes of locale files (it's called twice because fs.watch is still unstable)
        fs.watch(this.directory, function(event, filename) {
          var localeFromFile = this.guessLocaleFromFile(filename);

         // if (localeFromFile &&  this.i18nProvider.i18n.locales.indexOf(localeFromFile) > -1) {
         //   logDebug('Auto reloading locale file "' + filename + '".');
         //   read(localeFromFile);
         // }

        });
      }
    }

    

  }

//seter and getter
get defaultLocale(){
  return map.get(this).defaultLocale;
}

set defaultLocale(locale) {
  map.get(this).defaultLocale = locale;
}
  
 
  
//private methods

myVsprintf(str, replace2){
var replace = replace2[0];
  //myVsprintf (str, replace);
  for (var _len = arguments.length, args = Array(_len > 2 ? _len - 2 : 0), _key = 2; _key < _len; _key++) {
    args[_key - 2] = arguments[_key];
  }

if (typeof replace === 'string' || !isNaN(replace)) {
    var i = 0;

    args.unshift(replace);

    return str.replace(/%[dfsu]/g, function (match) {
        return args[i++];
    });
} else if (Array.isArray(replace)) {
    replace.unshift(str);

    return sprintf.apply(null, replace);
} else if ((typeof replace === 'undefined' ? 'undefined' : _typeof(replace)) === 'object') {
    return str.replace(/:([a-zA-z0-9$-]+)|{((?:(?!{|}).)+)}/g, function () {
        return replace[(arguments.length <= 1 ? undefined : arguments[1]) || (arguments.length <= 2 ? undefined : arguments[2])] || (arguments.length <= 0 ? undefined : arguments[0]);
    });
}

}

/**
   * try reading a file
   */
  read (locale) {
    var localeFile = {},
      file = this.getStorageFilePath(locale);
    try {
      this.logDebug('read ' + file + ' for locale: ' + locale);
      localeFile = fs.readFileSync(file);
      try {
        // parsing filecontents to locales[locale]
        //changes rasputtim (.yml)
        //locales[locale] = JSON.parse(localeFile);
        switch (this.i18nOptions.extension) {
          case '.yml':
            this.locales[locale] = jsyaml.load(localeFile, {schema: this.yamlSchema});
            break;
          default:
            this.locales[locale] = JSON.parse(localeFile);
        }
      } catch (parseError) {
        this.logError('unable to parse locales from file (maybe ' +
          file + ' is empty or invalid '+this.i18nOptions.extension+'?): ', parseError);
      }
    } catch (readError) {
      // unable to read, so intialize that file
      // locales[locale] are already set in memory, so no extra read required
      // or locales[locale] are empty, which initializes an empty locale.json file

      // since the current invalid locale could exist, we should back it up
      if (fs.existsSync(file)) {
        this.logDebug('backing up invalid locale ' + locale + ' to ' + file + '.invalid');
        fs.renameSync(file, file + '.invalid');
      }

      this.logDebug('initializing ' + file);
      this.write(locale);
    }
  }

  /**
   * try writing a file in a created directory
   */
  write(locale) {
    var stats, target, tmp;

    // don't write new locale information to disk if updateFiles isn't true
    if (!this.updateFiles) {
      return;
    }

    // creating directory if necessary
    try {
      stats = fs.lstatSync(this.directory);
    } catch (e) {
      this.logDebug('creating locales dir in: ' + this.directory);
      fs.mkdirSync(this.directory, this.directoryPermissions);
    }

    // first time init has an empty file
    if (!this.locales[locale]) {
      this.locales[locale] = {};
    }

    // writing to tmp and rename on success
    try {
      target = this.getStorageFilePath(locale);
      tmp = target + '.tmp';
      // changes rasputtim
      //fs.writeFileSync(tmp, JSON.stringify(locales[locale], null, indent), 'utf8');
      var fileContents = '';
    switch (this.i18nOptions.extension) {
      case '.yml':
        fileContents = jsyaml.dump(this.locales[locale]);
          break;
      default:
        fileContents = JSON.stringify(this.locales[locale], null, this.indent);
    }
    fs.writeFileSync(tmp, fileContents, 'utf8');
      stats = fs.statSync(tmp);
      if (stats.isFile()) {
        fs.renameSync(tmp, target);
      } else {
        this.logError('unable to write locales to file (either ' +
          tmp + ' or ' + target + ' are not writeable?): ');
      }
    } catch (e) {
      this.logError('unexpected error writing files (either ' +
        tmp + ' or ' + target + ' are not writeable?): ', e);
    }
  }



  
  /**
   * basic normalization of filepath
   */
  getStorageFilePath(locale) {
    // changed API to use .json as default, #16
    var ext = this.i18nOptions.extension || '.json',
      filepath = path.normalize(this.directory + this.pathsep + this.prefix + locale + ext),
      filepathJS = path.normalize(this.directory + this.pathsep + this.prefix + locale + '.js');
    // use .js as fallback if already existing
    try {
      if (fs.statSync(filepathJS)) {
        this.logDebug('using existing file ' + filepathJS);
        this.i18nOptions.extension = '.js';
        return filepathJS;
      }
    } catch (e) {
      this.logDebug('will use ' + filepath);
    }
    return filepath;
  }

  /**
   * Logging proxies
   */
  logDebug(msg) {
    this.logDebugFn(msg);
  }

  logWarn(msg) {
    this.logWarnFn(msg);
  }

  logError(msg) {
    this.logErrorFn(msg);
  }

///the private from i18n


  postProcess(msg, namedValues, args, count) {
    var other = LocaleService.i18nObj;
    // test for parsable interval string
    if ((/\|/).test(msg)) {
      msg = this.parsePluralInterval(msg, count);
    }

    // replace the counter
    if (typeof count === 'number') {
      msg = other.myVsprintf(msg, [parseInt(count, 10)]);
    }

    // if the msg string contains {{Mustache}} patterns we render it as a mini tempalate
    if ((/{{.*}}/).test(msg)) {
      msg = Mustache.render(msg, namedValues);
    }

    // if we have extra arguments with values to get replaced,
    // an additional substition injects those strings afterwards
    if ((/%/).test(msg) && args && args.length > 0) {
      msg = other.myVsprintf(msg, args);
    }

    return msg;
  }

  argsEndWithNamedObject(args) {
    return (args.length > 1 &&
      args[args.length - 1] !== null &&
      typeof args[args.length - 1] === 'object');
  }

  parseArgv(args) {
    var namedValues, returnArgs;

    //if (this.argsEndWithNamedObject(args)) {
      if((args.length > 1 &&
        args[args.length - 1] !== null &&
        typeof args[args.length - 1] === 'object')){
      namedValues = args[args.length - 1];
      returnArgs = Array.prototype.slice.call(args, 1, -1);
    } else {
      namedValues = {};
      returnArgs = args.length >= 2 ? Array.prototype.slice.call(args, 1) : [];
    }

    return [namedValues, returnArgs];
  }

  /**
   * tries to guess locales by scanning the given directory
   */
 
   guessLocales(directory) {
    var entries = fs.readdirSync(directory);
    var localesFound = [];

    for (var i = entries.length - 1; i >= 0; i--) {
      if (entries[i].match(/^\./)) continue;
      var localeFromFile = this.guessLocaleFromFile(entries[i]);
      if (localeFromFile) localesFound.push(localeFromFile);
    }

    return localesFound.sort();
  }

  /**
   * tries to guess locales from a given filename
   */
 
   guessLocaleFromFile(filename) {
    var extensionRegex = new RegExp(this.extension + '$', 'g');
    var prefixRegex = new RegExp('^' + this.prefix, 'g');

    if (this.prefix && !filename.match(prefixRegex)) return false;
    if (this.extension && !filename.match(extensionRegex)) return false;
    return filename.replace(this.prefix, '').replace(extensionRegex, '');
  }

  
  /**
   * Parse th Accepted-Language array from the HTTP header of the request object
   * Get a sorted list of accepted languages from the HTTP Accept-Language header
   */
 
   getAcceptedLanguagesFromHeader(header) {
    var languages = header.split(','),
      preferences = {};
    return languages.map(function parseLanguagePreference(item) {
      var preferenceParts = item.trim().split(';q=');
      if (preferenceParts.length < 2) {
        preferenceParts[1] = 1.0;
      } else {
        var quality = parseFloat(preferenceParts[1]);
        preferenceParts[1] = quality ? quality : 0.0;
      }
      preferences[preferenceParts[0]] = preferenceParts[1];

      return preferenceParts[0];
    }).filter(function(lang) {
      return preferences[lang] > 0;
    }).sort(function sortLanguages(a, b) {
      return preferences[b] - preferences[a];
    });
  }

get_i18nOpj(){
  return LocaleService.i18nObj;
} 

set_i18nObj(valor){
  LocaleService.i18nObj = valor;
  // you may register i18n in global scope, up to you
  if (typeof this.i18nOptions !== 'undefined' && typeof this.i18nOptions.register === 'object') {
    this.register = this.i18nOptions.register;
    // or give an array objects to register to
    if (Array.isArray(this.i18nOptions.register)) {
      this.register = this.i18nOptions.register;
      this.register.forEach(function(r) {
        valor.applyAPItoObject(r);
      });
    } else {
      valor.applyAPItoObject(this.i18nOptions.register);
    }
  }
}

getSelfFromI18n(){
  var este = LocaleService.i18nObj;
  return este;
}

  /**
   * searches for locale in given object
   */

  getLocaleFromObject(obj) {
    var locale;
    if (obj && obj.scope) {
      locale = obj.scope.locale;
    }
    if (obj && obj.locale) {
      locale = obj.locale;
    }
    return locale;
  }

  /**
   * splits and parses a phrase for mathematical interval expressions
   */
  
   parsePluralInterval(phrase, count) {
    var returnPhrase = phrase;
    var phrases = phrase.split(/\|/);

    // some() breaks on 1st true
    phrases.some(function(p) {
      var matches = p.match(/^\s*([\(\)\[\]\d,]+)?\s*(.*)$/);

      // not the same as in combined condition
      if (matches[1]) {
        if (this.matchInterval(count, matches[1]) === true) {
          returnPhrase = matches[2];
          return true;
        }
      } else {
        returnPhrase = p;
      }

    });
    return returnPhrase;
  }

  /**
   * test a number to match mathematical interval expressions
   * [0,2] - 0 to 2 (including, matches: 0, 1, 2)
   * ]0,3[ - 0 to 3 (excluding, matches: 1, 2)
   * [1]   - 1 (matches: 1)
   * [20,] - all numbers ≥20 (matches: 20, 21, 22, ...)
   * [,20] - all numbers ≤20 (matches: 20, 21, 22, ...)
   */
  
   matchInterval(number, interval) {
    interval = parseInterval(interval);
    if (interval && typeof number === 'number') {
      if (interval.from.value === number) {
        return interval.from.included;
      }
      if (interval.to.value === number) {
        return interval.to.included;
      }

      return (Math.min(interval.from.value, number) === interval.from.value &&
        Math.max(interval.to.value, number) === interval.to.value);
    }
    return false;
  }

 

  /**
   * initialize the same key in all locales
   * when not already existing, checked via translate
   */
  
   syncToAllFiles(singular, plural) {
    // iterate over locales and translate again
    // this will implicitly write/sync missing keys
    // to the rest of locales
    for (var l in this.locales) {
      this.translate(l, singular, plural, true);
    }
  }

  /**
   * Allows delayed access to translations nested inside objects.
   * @param {String} locale The locale to use.
   * @param {String} singular The singular term to look up.
   * @param {Boolean} [allowDelayedTraversal=true] Is delayed traversal of the tree allowed?
   * This parameter is used internally. It allows to signal the accessor that
   * a translation was not found in the initial lookup and that an invocation
   * of the accessor may trigger another traversal of the tree.
   * @returns {Function} A function that, when invoked, returns the current value stored
   * in the object at the requested location.
   */
  
   localeAccessor(locale, singular, allowDelayedTraversal) {
    // Bail out on non-existent locales to defend against internal errors.
    if (!this.locales[locale]) return Function.prototype;

    // Handle object lookup notation
    var indexOfDot = this.objectNotation && singular.lastIndexOf(this.objectNotation);
    if (this.objectNotation && (0 < indexOfDot && indexOfDot < singular.length - 1)) {
      // If delayed traversal wasn't specifically forbidden, it is allowed.
      if (typeof allowDelayedTraversal === 'undefined') allowDelayedTraversal = true;
      // The accessor we're trying to find and which we want to return.
      var accessor = null;
      // An accessor that returns null.
      var nullAccessor = function() {
        return null;
      };
      // Do we need to re-traverse the tree upon invocation of the accessor?
      var reTraverse = false;
      // Split the provided term and run the callback for each subterm.
      singular.split(this.objectNotation).reduce(function(object, index) {
        // Make the accessor return null.
        accessor = nullAccessor;
        // If our current target object (in the locale tree) doesn't exist or
        // it doesn't have the next subterm as a member...
        if (null === object || !object.hasOwnProperty(index)) {
          // ...remember that we need retraversal (because we didn't find our target).
          reTraverse = allowDelayedTraversal;
          // Return null to avoid deeper iterations.
          return null;
        }
        // We can traverse deeper, so we generate an accessor for this current level.
        accessor = function() {
          return object[index];
        };
        // Return a reference to the next deeper level in the locale tree.
        return object[index];

      }, this.locales[locale]);
      // Return the requested accessor.
      return function() {
        // If we need to re-traverse (because we didn't find our target term)
        // traverse again and return the new result (but don't allow further iterations)
        // or return the previously found accessor if it was already valid.
        return (reTraverse) ? this.localeAccessor(locale, singular, false)() : accessor();
      };

    } else {
      // No object notation, just return an accessor that performs array lookup.
      return (other)=> {
        var translation = other.locales[locale][singular]; 
        return (typeof translation !== 'undefined') ? translation : '';
      };
    }
  }

  /**
   * Allows delayed mutation of a translation nested inside objects.
   * @description Construction of the mutator will attempt to locate the requested term
   * inside the object, but if part of the branch does not exist yet, it will not be
   * created until the mutator is actually invoked. At that point, re-traversal of the
   * tree is performed and missing parts along the branch will be created.
   * @param {String} locale The locale to use.
   * @param {String} singular The singular term to look up.
   * @param [Boolean} [allowBranching=false] Is the mutator allowed to create previously
   * non-existent branches along the requested locale path?
   * @returns {Function} A function that takes one argument. When the function is
   * invoked, the targeted translation term will be set to the given value inside the locale table.
   */
  
   localeMutator(locale, singular, allowBranching) {
    // Bail out on non-existent locales to defend against internal errors.
    if (!this.locales[locale]) return Function.prototype;

    // Handle object lookup notation
    var indexOfDot = this.objectNotation && singular.lastIndexOf(this.objectNotation);
    if (this.objectNotation && (0 < indexOfDot && indexOfDot < singular.length - 1)) {
      // If branching wasn't specifically allowed, disable it.
      if (typeof allowBranching === 'undefined') allowBranching = false;
      // This will become the function we want to return.
      var accessor = null;
      // An accessor that takes one argument and returns null.
      var nullAccessor = function() {
        return null;
      };
      // Fix object path.
      var fixObject = function() {
        return {};
      };
      // Are we going to need to re-traverse the tree when the mutator is invoked?
      var reTraverse = false;
      // Split the provided term and run the callback for each subterm.
      singular.split(this.objectNotation).reduce(function(object, index) {
        // Make the mutator do nothing.
        accessor = nullAccessor;
        // If our current target object (in the locale tree) doesn't exist or
        // it doesn't have the next subterm as a member...
        if (null === object || !object.hasOwnProperty(index)) {
          // ...check if we're allowed to create new branches.
          if (allowBranching) {
            // Fix `object` if `object` is not Object.
            if (null === object || typeof object !== 'object') {
              object = fixObject();
            }
            // If we are allowed to, create a new object along the path.
            object[index] = {};
          } else {
            // If we aren't allowed, remember that we need to re-traverse later on and...
            reTraverse = true;
            // ...return null to make the next iteration bail our early on.
            return null;
          }
        }
        // Generate a mutator for the current level.
        accessor = function(value) {
          object[index] = value;
          return value;
        };
        // Generate a fixer for the current level.
        fixObject = function() {
          object[index] = {};
          return object[index];
        };

        // Return a reference to the next deeper level in the locale tree.
        return object[index];

      }, this.locales[locale]);

      // Return the final mutator.
      return function(value) {
        // If we need to re-traverse the tree
        // invoke the search again, but allow branching
        // this time (because here the mutator is being invoked)
        // otherwise, just change the value directly.
        return (reTraverse) ? this.localeMutator(locale, singular, true)(value) : accessor(value);
      };

    } else {
      // No object notation, just return a mutator that performs array lookup and changes the value.
      return (value) =>{
        this.locales[locale][singular] = value;
        return value;
      };
    }
  }

  /**translate
   * read locale file, translate a msg and write to fs if new
   */
  
  translate(locale, singular, plural, skipSyncToAllFiles) {

    //find provider
    var i18nObj = LocaleService.i18nObj;
    
    // add same key to all translations
    if (!skipSyncToAllFiles && i18nObj.syncFiles) {
      i18nObj.syncToAllFiles(singular, plural);
    }
    
    if (locale === undefined) {
      i18nObj.logWarn('WARN: No locale found - check the context of the call to __(). Using ' +
     super.defaultLocale + ' as current locale');
      locale = super.defaultLocale;
    }

    if (!i18nObj.locales[locale] && i18nObj.fallbacks[locale]) {
      locale = i18nObj.fallbacks[locale];
    }

    // attempt to read when defined as valid locale
    if (!i18nObj.locales[locale]) {
      i18nObj.read(locale);
    }

    // fallback to default when missed
    if (!i18nObj.locales[locale]) {

      i18nObj.logWarn('WARN: Locale ' + locale +
        ' couldn\'t be read - check the context of the call to $__. Using ' +
        super.defaultLocale + ' (default) as current locale');

      locale = super.defaultLocale;
      i18nObj.read(locale);
    }

    // dotnotaction add on, @todo: factor out
    var defaultSingular = singular;
    var defaultPlural = plural;
    if (i18nObj.objectNotation) {
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

    var accessor = i18nObj.localeAccessor(locale, singular);
    var mutator = i18nObj.localeMutator(locale, singular);

     if (plural) {
      if (!accessor(i18nObj)) {
        mutator({
          'one': defaultSingular || singular,
          'i18nObj': defaultPlural || plural
        });
        i18nObj.write(locale);
      }
    }

    if (!accessor(i18nObj)) {
      mutator(defaultSingular || singular);
      i18nObj.write(locale);
    }

    return accessor(i18nObj);
  }


}


