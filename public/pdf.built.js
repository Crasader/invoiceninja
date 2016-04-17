/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */
/* Copyright 2012 Mozilla Foundation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// Initializing PDFJS global object (if still undefined)
if (typeof PDFJS === 'undefined') {
  (typeof window !== 'undefined' ? window : this).PDFJS = {};
}

PDFJS.version = '0.8.765';
PDFJS.build = '88ec2bd';

(function pdfjsWrapper() {
  // Use strict in our context only - users might not want it
  'use strict';

/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */
/* Copyright 2012 Mozilla Foundation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/* globals Cmd, ColorSpace, Dict, MozBlobBuilder, Name, PDFJS, Ref, URL */

'use strict';

var globalScope = (typeof window === 'undefined') ? this : window;

var isWorker = (typeof window == 'undefined');

var ERRORS = 0, WARNINGS = 1, INFOS = 5;
var verbosity = WARNINGS;

var FONT_IDENTITY_MATRIX = [0.001, 0, 0, 0.001, 0, 0];

var TextRenderingMode = {
  FILL: 0,
  STROKE: 1,
  FILL_STROKE: 2,
  INVISIBLE: 3,
  FILL_ADD_TO_PATH: 4,
  STROKE_ADD_TO_PATH: 5,
  FILL_STROKE_ADD_TO_PATH: 6,
  ADD_TO_PATH: 7,
  FILL_STROKE_MASK: 3,
  ADD_TO_PATH_FLAG: 4
};

// The global PDFJS object exposes the API
// In production, it will be declared outside a global wrapper
// In development, it will be declared here
if (!globalScope.PDFJS) {
  globalScope.PDFJS = {};
}

globalScope.PDFJS.pdfBug = false;

// All the possible operations for an operator list.
var OPS = PDFJS.OPS = {
  // Intentionally start from 1 so it is easy to spot bad operators that will be
  // 0's.
  dependency: 1,
  setLineWidth: 2,
  setLineCap: 3,
  setLineJoin: 4,
  setMiterLimit: 5,
  setDash: 6,
  setRenderingIntent: 7,
  setFlatness: 8,
  setGState: 9,
  save: 10,
  restore: 11,
  transform: 12,
  moveTo: 13,
  lineTo: 14,
  curveTo: 15,
  curveTo2: 16,
  curveTo3: 17,
  closePath: 18,
  rectangle: 19,
  stroke: 20,
  closeStroke: 21,
  fill: 22,
  eoFill: 23,
  fillStroke: 24,
  eoFillStroke: 25,
  closeFillStroke: 26,
  closeEOFillStroke: 27,
  endPath: 28,
  clip: 29,
  eoClip: 30,
  beginText: 31,
  endText: 32,
  setCharSpacing: 33,
  setWordSpacing: 34,
  setHScale: 35,
  setLeading: 36,
  setFont: 37,
  setTextRenderingMode: 38,
  setTextRise: 39,
  moveText: 40,
  setLeadingMoveText: 41,
  setTextMatrix: 42,
  nextLine: 43,
  showText: 44,
  showSpacedText: 45,
  nextLineShowText: 46,
  nextLineSetSpacingShowText: 47,
  setCharWidth: 48,
  setCharWidthAndBounds: 49,
  setStrokeColorSpace: 50,
  setFillColorSpace: 51,
  setStrokeColor: 52,
  setStrokeColorN: 53,
  setFillColor: 54,
  setFillColorN: 55,
  setStrokeGray: 56,
  setFillGray: 57,
  setStrokeRGBColor: 58,
  setFillRGBColor: 59,
  setStrokeCMYKColor: 60,
  setFillCMYKColor: 61,
  shadingFill: 62,
  beginInlineImage: 63,
  beginImageData: 64,
  endInlineImage: 65,
  paintXObject: 66,
  markPoint: 67,
  markPointProps: 68,
  beginMarkedContent: 69,
  beginMarkedContentProps: 70,
  endMarkedContent: 71,
  beginCompat: 72,
  endCompat: 73,
  paintFormXObjectBegin: 74,
  paintFormXObjectEnd: 75,
  beginGroup: 76,
  endGroup: 77,
  beginAnnotations: 78,
  endAnnotations: 79,
  beginAnnotation: 80,
  endAnnotation: 81,
  paintJpegXObject: 82,
  paintImageMaskXObject: 83,
  paintImageMaskXObjectGroup: 84,
  paintImageXObject: 85,
  paintInlineImageXObject: 86,
  paintInlineImageXObjectGroup: 87
};

// Use only for debugging purposes. This should not be used in any code that is
// in mozilla master.
var log = (function() {
  if ('console' in globalScope && 'log' in globalScope['console']) {
    return globalScope['console']['log'].bind(globalScope['console']);
  } else {
    return function nop() {
    };
  }
})();

// A notice for devs that will not trigger the fallback UI.  These are good
// for things that are helpful to devs, such as warning that Workers were
// disabled, which is important to devs but not end users.
function info(msg) {
  if (verbosity >= INFOS) {
    log('Info: ' + msg);
    PDFJS.LogManager.notify('info', msg);
  }
}

// Non-fatal warnings that should trigger the fallback UI.
function warn(msg) {
  if (verbosity >= WARNINGS) {
    log('Warning: ' + msg);
    PDFJS.LogManager.notify('warn', msg);
  }
}

// Fatal errors that should trigger the fallback UI and halt execution by
// throwing an exception.
function error(msg) {
  // If multiple arguments were passed, pass them all to the log function.
  if (arguments.length > 1) {
    var logArguments = ['Error:'];
    logArguments.push.apply(logArguments, arguments);
    log.apply(null, logArguments);
    // Join the arguments into a single string for the lines below.
    msg = [].join.call(arguments, ' ');
  } else {
    log('Error: ' + msg);
  }
  log(backtrace());
  PDFJS.LogManager.notify('error', msg);
  throw new Error(msg);
}

// Missing features that should trigger the fallback UI.
function TODO(what) {
  warn('TODO: ' + what);
}

function backtrace() {
  try {
    throw new Error();
  } catch (e) {
    return e.stack ? e.stack.split('\n').slice(2).join('\n') : '';
  }
}

function assert(cond, msg) {
  if (!cond)
    error(msg);
}

// Combines two URLs. The baseUrl shall be absolute URL. If the url is an
// absolute URL, it will be returned as is.
function combineUrl(baseUrl, url) {
  if (!url)
    return baseUrl;
  if (url.indexOf(':') >= 0)
    return url;
  if (url.charAt(0) == '/') {
    // absolute path
    var i = baseUrl.indexOf('://');
    i = baseUrl.indexOf('/', i + 3);
    return baseUrl.substring(0, i) + url;
  } else {
    // relative path
    var pathLength = baseUrl.length, i;
    i = baseUrl.lastIndexOf('#');
    pathLength = i >= 0 ? i : pathLength;
    i = baseUrl.lastIndexOf('?', pathLength);
    pathLength = i >= 0 ? i : pathLength;
    var prefixLength = baseUrl.lastIndexOf('/', pathLength);
    return baseUrl.substring(0, prefixLength + 1) + url;
  }
}

// Validates if URL is safe and allowed, e.g. to avoid XSS.
function isValidUrl(url, allowRelative) {
  if (!url) {
    return false;
  }
  var colon = url.indexOf(':');
  if (colon < 0) {
    return allowRelative;
  }
  var protocol = url.substr(0, colon);
  switch (protocol) {
    case 'http':
    case 'https':
    case 'ftp':
    case 'mailto':
      return true;
    default:
      return false;
  }
}
PDFJS.isValidUrl = isValidUrl;

// In a well-formed PDF, |cond| holds.  If it doesn't, subsequent
// behavior is undefined.
function assertWellFormed(cond, msg) {
  if (!cond)
    error(msg);
}

var LogManager = PDFJS.LogManager = (function LogManagerClosure() {
  var loggers = [];
  return {
    addLogger: function logManager_addLogger(logger) {
      loggers.push(logger);
    },
    notify: function(type, message) {
      for (var i = 0, ii = loggers.length; i < ii; i++) {
        var logger = loggers[i];
        if (logger[type])
          logger[type](message);
      }
    }
  };
})();

function shadow(obj, prop, value) {
  Object.defineProperty(obj, prop, { value: value,
                                     enumerable: true,
                                     configurable: true,
                                     writable: false });
  return value;
}

var PasswordResponses = PDFJS.PasswordResponses = {
  NEED_PASSWORD: 1,
  INCORRECT_PASSWORD: 2
};

var PasswordException = (function PasswordExceptionClosure() {
  function PasswordException(msg, code) {
    this.name = 'PasswordException';
    this.message = msg;
    this.code = code;
  }

  PasswordException.prototype = new Error();
  PasswordException.constructor = PasswordException;

  return PasswordException;
})();

var UnknownErrorException = (function UnknownErrorExceptionClosure() {
  function UnknownErrorException(msg, details) {
    this.name = 'UnknownErrorException';
    this.message = msg;
    this.details = details;
  }

  UnknownErrorException.prototype = new Error();
  UnknownErrorException.constructor = UnknownErrorException;

  return UnknownErrorException;
})();

var InvalidPDFException = (function InvalidPDFExceptionClosure() {
  function InvalidPDFException(msg) {
    this.name = 'InvalidPDFException';
    this.message = msg;
  }

  InvalidPDFException.prototype = new Error();
  InvalidPDFException.constructor = InvalidPDFException;

  return InvalidPDFException;
})();

var MissingPDFException = (function MissingPDFExceptionClosure() {
  function MissingPDFException(msg) {
    this.name = 'MissingPDFException';
    this.message = msg;
  }

  MissingPDFException.prototype = new Error();
  MissingPDFException.constructor = MissingPDFException;

  return MissingPDFException;
})();

var NotImplementedException = (function NotImplementedExceptionClosure() {
  function NotImplementedException(msg) {
    this.message = msg;
  }

  NotImplementedException.prototype = new Error();
  NotImplementedException.prototype.name = 'NotImplementedException';
  NotImplementedException.constructor = NotImplementedException;

  return NotImplementedException;
})();

var MissingDataException = (function MissingDataExceptionClosure() {
  function MissingDataException(begin, end) {
    this.begin = begin;
    this.end = end;
    this.message = 'Missing data [' + begin + ', ' + end + ')';
  }

  MissingDataException.prototype = new Error();
  MissingDataException.prototype.name = 'MissingDataException';
  MissingDataException.constructor = MissingDataException;

  return MissingDataException;
})();

var XRefParseException = (function XRefParseExceptionClosure() {
  function XRefParseException(msg) {
    this.message = msg;
  }

  XRefParseException.prototype = new Error();
  XRefParseException.prototype.name = 'XRefParseException';
  XRefParseException.constructor = XRefParseException;

  return XRefParseException;
})();


function bytesToString(bytes) {
  var str = '';
  var length = bytes.length;
  for (var n = 0; n < length; ++n)
    str += String.fromCharCode(bytes[n]);
  return str;
}

function stringToBytes(str) {
  var length = str.length;
  var bytes = new Uint8Array(length);
  for (var n = 0; n < length; ++n)
    bytes[n] = str.charCodeAt(n) & 0xFF;
  return bytes;
}

var IDENTITY_MATRIX = [1, 0, 0, 1, 0, 0];

var Util = PDFJS.Util = (function UtilClosure() {
  function Util() {}

  Util.makeCssRgb = function Util_makeCssRgb(rgb) {
    return 'rgb(' + rgb[0] + ',' + rgb[1] + ',' + rgb[2] + ')';
  };

  Util.makeCssCmyk = function Util_makeCssCmyk(cmyk) {
    var rgb = ColorSpace.singletons.cmyk.getRgb(cmyk, 0);
    return Util.makeCssRgb(rgb);
  };

  // Concatenates two transformation matrices together and returns the result.
  Util.transform = function Util_transform(m1, m2) {
    return [
      m1[0] * m2[0] + m1[2] * m2[1],
      m1[1] * m2[0] + m1[3] * m2[1],
      m1[0] * m2[2] + m1[2] * m2[3],
      m1[1] * m2[2] + m1[3] * m2[3],
      m1[0] * m2[4] + m1[2] * m2[5] + m1[4],
      m1[1] * m2[4] + m1[3] * m2[5] + m1[5]
    ];
  };

  // For 2d affine transforms
  Util.applyTransform = function Util_applyTransform(p, m) {
    var xt = p[0] * m[0] + p[1] * m[2] + m[4];
    var yt = p[0] * m[1] + p[1] * m[3] + m[5];
    return [xt, yt];
  };

  Util.applyInverseTransform = function Util_applyInverseTransform(p, m) {
    var d = m[0] * m[3] - m[1] * m[2];
    var xt = (p[0] * m[3] - p[1] * m[2] + m[2] * m[5] - m[4] * m[3]) / d;
    var yt = (-p[0] * m[1] + p[1] * m[0] + m[4] * m[1] - m[5] * m[0]) / d;
    return [xt, yt];
  };

  // Applies the transform to the rectangle and finds the minimum axially
  // aligned bounding box.
  Util.getAxialAlignedBoundingBox =
    function Util_getAxialAlignedBoundingBox(r, m) {

    var p1 = Util.applyTransform(r, m);
    var p2 = Util.applyTransform(r.slice(2, 4), m);
    var p3 = Util.applyTransform([r[0], r[3]], m);
    var p4 = Util.applyTransform([r[2], r[1]], m);
    return [
      Math.min(p1[0], p2[0], p3[0], p4[0]),
      Math.min(p1[1], p2[1], p3[1], p4[1]),
      Math.max(p1[0], p2[0], p3[0], p4[0]),
      Math.max(p1[1], p2[1], p3[1], p4[1])
    ];
  };

  Util.inverseTransform = function Util_inverseTransform(m) {
    var d = m[0] * m[3] - m[1] * m[2];
    return [m[3] / d, -m[1] / d, -m[2] / d, m[0] / d,
      (m[2] * m[5] - m[4] * m[3]) / d, (m[4] * m[1] - m[5] * m[0]) / d];
  };

  // Apply a generic 3d matrix M on a 3-vector v:
  //   | a b c |   | X |
  //   | d e f | x | Y |
  //   | g h i |   | Z |
  // M is assumed to be serialized as [a,b,c,d,e,f,g,h,i],
  // with v as [X,Y,Z]
  Util.apply3dTransform = function Util_apply3dTransform(m, v) {
    return [
      m[0] * v[0] + m[1] * v[1] + m[2] * v[2],
      m[3] * v[0] + m[4] * v[1] + m[5] * v[2],
      m[6] * v[0] + m[7] * v[1] + m[8] * v[2]
    ];
  };

  // This calculation uses Singular Value Decomposition.
  // The SVD can be represented with formula A = USV. We are interested in the
  // matrix S here because it represents the scale values.
  Util.singularValueDecompose2dScale =
    function Util_singularValueDecompose2dScale(m) {

    var transpose = [m[0], m[2], m[1], m[3]];

    // Multiply matrix m with its transpose.
    var a = m[0] * transpose[0] + m[1] * transpose[2];
    var b = m[0] * transpose[1] + m[1] * transpose[3];
    var c = m[2] * transpose[0] + m[3] * transpose[2];
    var d = m[2] * transpose[1] + m[3] * transpose[3];

    // Solve the second degree polynomial to get roots.
    var first = (a + d) / 2;
    var second = Math.sqrt((a + d) * (a + d) - 4 * (a * d - c * b)) / 2;
    var sx = first + second || 1;
    var sy = first - second || 1;

    // Scale values are the square roots of the eigenvalues.
    return [Math.sqrt(sx), Math.sqrt(sy)];
  };

  // Normalize rectangle rect=[x1, y1, x2, y2] so that (x1,y1) < (x2,y2)
  // For coordinate systems whose origin lies in the bottom-left, this
  // means normalization to (BL,TR) ordering. For systems with origin in the
  // top-left, this means (TL,BR) ordering.
  Util.normalizeRect = function Util_normalizeRect(rect) {
    var r = rect.slice(0); // clone rect
    if (rect[0] > rect[2]) {
      r[0] = rect[2];
      r[2] = rect[0];
    }
    if (rect[1] > rect[3]) {
      r[1] = rect[3];
      r[3] = rect[1];
    }
    return r;
  };

  // Returns a rectangle [x1, y1, x2, y2] corresponding to the
  // intersection of rect1 and rect2. If no intersection, returns 'false'
  // The rectangle coordinates of rect1, rect2 should be [x1, y1, x2, y2]
  Util.intersect = function Util_intersect(rect1, rect2) {
    function compare(a, b) {
      return a - b;
    }

    // Order points along the axes
    var orderedX = [rect1[0], rect1[2], rect2[0], rect2[2]].sort(compare),
        orderedY = [rect1[1], rect1[3], rect2[1], rect2[3]].sort(compare),
        result = [];

    rect1 = Util.normalizeRect(rect1);
    rect2 = Util.normalizeRect(rect2);

    // X: first and second points belong to different rectangles?
    if ((orderedX[0] === rect1[0] && orderedX[1] === rect2[0]) ||
        (orderedX[0] === rect2[0] && orderedX[1] === rect1[0])) {
      // Intersection must be between second and third points
      result[0] = orderedX[1];
      result[2] = orderedX[2];
    } else {
      return false;
    }

    // Y: first and second points belong to different rectangles?
    if ((orderedY[0] === rect1[1] && orderedY[1] === rect2[1]) ||
        (orderedY[0] === rect2[1] && orderedY[1] === rect1[1])) {
      // Intersection must be between second and third points
      result[1] = orderedY[1];
      result[3] = orderedY[2];
    } else {
      return false;
    }

    return result;
  };

  Util.sign = function Util_sign(num) {
    return num < 0 ? -1 : 1;
  };

  // TODO(mack): Rename appendToArray
  Util.concatenateToArray = function concatenateToArray(arr1, arr2) {
    Array.prototype.push.apply(arr1, arr2);
  };

  Util.prependToArray = function concatenateToArray(arr1, arr2) {
    Array.prototype.unshift.apply(arr1, arr2);
  };

  Util.extendObj = function extendObj(obj1, obj2) {
    for (var key in obj2) {
      obj1[key] = obj2[key];
    }
  };

  Util.getInheritableProperty = function Util_getInheritableProperty(dict,
                                                                     name) {
    while (dict && !dict.has(name)) {
      dict = dict.get('Parent');
    }
    if (!dict) {
      return null;
    }
    return dict.get(name);
  };

  Util.inherit = function Util_inherit(sub, base, prototype) {
    sub.prototype = Object.create(base.prototype);
    sub.prototype.constructor = sub;
    for (var prop in prototype) {
      sub.prototype[prop] = prototype[prop];
    }
  };

  Util.loadScript = function Util_loadScript(src, callback) {
    var script = document.createElement('script');
    var loaded = false;
    script.setAttribute('src', src);
    if (callback) {
      script.onload = function() {
        if (!loaded) {
          callback();
        }
        loaded = true;
      };
    }
    document.getElementsByTagName('head')[0].appendChild(script);
  };

  return Util;
})();

var PageViewport = PDFJS.PageViewport = (function PageViewportClosure() {
  function PageViewport(viewBox, scale, rotation, offsetX, offsetY, dontFlip) {
    this.viewBox = viewBox;
    this.scale = scale;
    this.rotation = rotation;
    this.offsetX = offsetX;
    this.offsetY = offsetY;

    // creating transform to convert pdf coordinate system to the normal
    // canvas like coordinates taking in account scale and rotation
    var centerX = (viewBox[2] + viewBox[0]) / 2;
    var centerY = (viewBox[3] + viewBox[1]) / 2;
    var rotateA, rotateB, rotateC, rotateD;
    rotation = rotation % 360;
    rotation = rotation < 0 ? rotation + 360 : rotation;
    switch (rotation) {
      case 180:
        rotateA = -1; rotateB = 0; rotateC = 0; rotateD = 1;
        break;
      case 90:
        rotateA = 0; rotateB = 1; rotateC = 1; rotateD = 0;
        break;
      case 270:
        rotateA = 0; rotateB = -1; rotateC = -1; rotateD = 0;
        break;
      //case 0:
      default:
        rotateA = 1; rotateB = 0; rotateC = 0; rotateD = -1;
        break;
    }

    if (dontFlip) {
      rotateC = -rotateC; rotateD = -rotateD;
    }

    var offsetCanvasX, offsetCanvasY;
    var width, height;
    if (rotateA === 0) {
      offsetCanvasX = Math.abs(centerY - viewBox[1]) * scale + offsetX;
      offsetCanvasY = Math.abs(centerX - viewBox[0]) * scale + offsetY;
      width = Math.abs(viewBox[3] - viewBox[1]) * scale;
      height = Math.abs(viewBox[2] - viewBox[0]) * scale;
    } else {
      offsetCanvasX = Math.abs(centerX - viewBox[0]) * scale + offsetX;
      offsetCanvasY = Math.abs(centerY - viewBox[1]) * scale + offsetY;
      width = Math.abs(viewBox[2] - viewBox[0]) * scale;
      height = Math.abs(viewBox[3] - viewBox[1]) * scale;
    }
    // creating transform for the following operations:
    // translate(-centerX, -centerY), rotate and flip vertically,
    // scale, and translate(offsetCanvasX, offsetCanvasY)
    this.transform = [
      rotateA * scale,
      rotateB * scale,
      rotateC * scale,
      rotateD * scale,
      offsetCanvasX - rotateA * scale * centerX - rotateC * scale * centerY,
      offsetCanvasY - rotateB * scale * centerX - rotateD * scale * centerY
    ];

    this.width = width;
    this.height = height;
    this.fontScale = scale;
  }
  PageViewport.prototype = {
    clone: function PageViewPort_clone(args) {
      args = args || {};
      var scale = 'scale' in args ? args.scale : this.scale;
      var rotation = 'rotation' in args ? args.rotation : this.rotation;
      return new PageViewport(this.viewBox.slice(), scale, rotation,
                              this.offsetX, this.offsetY, args.dontFlip);
    },
    convertToViewportPoint: function PageViewport_convertToViewportPoint(x, y) {
      return Util.applyTransform([x, y], this.transform);
    },
    convertToViewportRectangle:
      function PageViewport_convertToViewportRectangle(rect) {
      var tl = Util.applyTransform([rect[0], rect[1]], this.transform);
      var br = Util.applyTransform([rect[2], rect[3]], this.transform);
      return [tl[0], tl[1], br[0], br[1]];
    },
    convertToPdfPoint: function PageViewport_convertToPdfPoint(x, y) {
      return Util.applyInverseTransform([x, y], this.transform);
    }
  };
  return PageViewport;
})();

var PDFStringTranslateTable = [
  0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
  0x2D8, 0x2C7, 0x2C6, 0x2D9, 0x2DD, 0x2DB, 0x2DA, 0x2DC, 0, 0, 0, 0, 0, 0, 0,
  0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
  0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
  0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
  0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0x2022, 0x2020, 0x2021, 0x2026, 0x2014,
  0x2013, 0x192, 0x2044, 0x2039, 0x203A, 0x2212, 0x2030, 0x201E, 0x201C,
  0x201D, 0x2018, 0x2019, 0x201A, 0x2122, 0xFB01, 0xFB02, 0x141, 0x152, 0x160,
  0x178, 0x17D, 0x131, 0x142, 0x153, 0x161, 0x17E, 0, 0x20AC
];

function stringToPDFString(str) {
  var i, n = str.length, str2 = '';
  if (str[0] === '\xFE' && str[1] === '\xFF') {
    // UTF16BE BOM
    for (i = 2; i < n; i += 2)
      str2 += String.fromCharCode(
        (str.charCodeAt(i) << 8) | str.charCodeAt(i + 1));
  } else {
    for (i = 0; i < n; ++i) {
      var code = PDFStringTranslateTable[str.charCodeAt(i)];
      str2 += code ? String.fromCharCode(code) : str.charAt(i);
    }
  }
  return str2;
}

function stringToUTF8String(str) {
  return decodeURIComponent(escape(str));
}

function isEmptyObj(obj) {
  for (var key in obj) {
    return false;
  }
  return true;
}

function isBool(v) {
  return typeof v == 'boolean';
}

function isInt(v) {
  return typeof v == 'number' && ((v | 0) == v);
}

function isNum(v) {
  return typeof v == 'number';
}

function isString(v) {
  return typeof v == 'string';
}

function isNull(v) {
  return v === null;
}

function isName(v) {
  return v instanceof Name;
}

function isCmd(v, cmd) {
  return v instanceof Cmd && (!cmd || v.cmd == cmd);
}

function isDict(v, type) {
  if (!(v instanceof Dict)) {
    return false;
  }
  if (!type) {
    return true;
  }
  var dictType = v.get('Type');
  return isName(dictType) && dictType.name == type;
}

function isArray(v) {
  return v instanceof Array;
}

function isStream(v) {
  return typeof v == 'object' && v !== null && v !== undefined &&
         ('getBytes' in v);
}

function isArrayBuffer(v) {
  return typeof v == 'object' && v !== null && v !== undefined &&
         ('byteLength' in v);
}

function isRef(v) {
  return v instanceof Ref;
}

function isPDFFunction(v) {
  var fnDict;
  if (typeof v != 'object')
    return false;
  else if (isDict(v))
    fnDict = v;
  else if (isStream(v))
    fnDict = v.dict;
  else
    return false;
  return fnDict.has('FunctionType');
}

/**
 * The following promise implementation tries to generally implment the
 * Promise/A+ spec. Some notable differences from other promise libaries are:
 * - There currently isn't a seperate deferred and promise object.
 * - Unhandled rejections eventually show an error if they aren't handled.
 *
 * Based off of the work in:
 * https://bugzilla.mozilla.org/show_bug.cgi?id=810490
 */
var Promise = PDFJS.Promise = (function PromiseClosure() {
  var STATUS_PENDING = 0;
  var STATUS_RESOLVED = 1;
  var STATUS_REJECTED = 2;

  // In an attempt to avoid silent exceptions, unhandled rejections are
  // tracked and if they aren't handled in a certain amount of time an
  // error is logged.
  var REJECTION_TIMEOUT = 500;

  var HandlerManager = {
    handlers: [],
    running: false,
    unhandledRejections: [],
    pendingRejectionCheck: false,

    scheduleHandlers: function scheduleHandlers(promise) {
      if (promise._status == STATUS_PENDING) {
        return;
      }

      this.handlers = this.handlers.concat(promise._handlers);
      promise._handlers = [];

      if (this.running) {
        return;
      }
      this.running = true;

      setTimeout(this.runHandlers.bind(this), 0);
    },

    runHandlers: function runHandlers() {
      while (this.handlers.length > 0) {
        var handler = this.handlers.shift();

        var nextStatus = handler.thisPromise._status;
        var nextValue = handler.thisPromise._value;

        try {
          if (nextStatus === STATUS_RESOLVED) {
            if (typeof(handler.onResolve) == 'function') {
              nextValue = handler.onResolve(nextValue);
            }
          } else if (typeof(handler.onReject) === 'function') {
              nextValue = handler.onReject(nextValue);
              nextStatus = STATUS_RESOLVED;

              if (handler.thisPromise._unhandledRejection) {
                this.removeUnhandeledRejection(handler.thisPromise);
              }
          }
        } catch (ex) {
          nextStatus = STATUS_REJECTED;
          nextValue = ex;
        }

        handler.nextPromise._updateStatus(nextStatus, nextValue);
      }

      this.running = false;
    },

    addUnhandledRejection: function addUnhandledRejection(promise) {
      this.unhandledRejections.push({
        promise: promise,
        time: Date.now()
      });
      this.scheduleRejectionCheck();
    },

    removeUnhandeledRejection: function removeUnhandeledRejection(promise) {
      promise._unhandledRejection = false;
      for (var i = 0; i < this.unhandledRejections.length; i++) {
        if (this.unhandledRejections[i].promise === promise) {
          this.unhandledRejections.splice(i);
          i--;
        }
      }
    },

    scheduleRejectionCheck: function scheduleRejectionCheck() {
      if (this.pendingRejectionCheck) {
        return;
      }
      this.pendingRejectionCheck = true;
      setTimeout(function rejectionCheck() {
        this.pendingRejectionCheck = false;
        var now = Date.now();
        for (var i = 0; i < this.unhandledRejections.length; i++) {
          if (now - this.unhandledRejections[i].time > REJECTION_TIMEOUT) {
            var unhandled = this.unhandledRejections[i].promise._value;
            var msg = 'Unhandled rejection: ' + unhandled;
            if (unhandled.stack) {
              msg += '\n' + unhandled.stack;
            }
            warn(msg);
            this.unhandledRejections.splice(i);
            i--;
          }
        }
        if (this.unhandledRejections.length) {
          this.scheduleRejectionCheck();
        }
      }.bind(this), REJECTION_TIMEOUT);
    }
  };

  function Promise() {
    this._status = STATUS_PENDING;
    this._handlers = [];
  }
  /**
   * Builds a promise that is resolved when all the passed in promises are
   * resolved.
   * @param {array} array of data and/or promises to wait for.
   * @return {Promise} New dependant promise.
   */
  Promise.all = function Promise_all(promises) {
    var deferred = new Promise();
    var unresolved = promises.length;
    var results = [];
    if (unresolved === 0) {
      deferred.resolve(results);
      return deferred;
    }
    function reject(reason) {
      if (deferred._status === STATUS_REJECTED) {
        return;
      }
      results = [];
      deferred.reject(reason);
    }
    for (var i = 0, ii = promises.length; i < ii; ++i) {
      var promise = promises[i];
      var resolve = (function(i) {
        return function(value) {
          if (deferred._status === STATUS_REJECTED) {
            return;
          }
          results[i] = value;
          unresolved--;
          if (unresolved === 0)
            deferred.resolve(results);
        };
      })(i);
      if (Promise.isPromise(promise)) {
        promise.then(resolve, reject);
      } else {
        resolve(promise);
      }
    }
    return deferred;
  };

  /**
   * Checks if the value is likely a promise (has a 'then' function).
   * @return {boolean} true if x is thenable
   */
  Promise.isPromise = function Promise_isPromise(value) {
    return value && typeof value.then === 'function';
  };

  Promise.prototype = {
    _status: null,
    _value: null,
    _handlers: null,
    _unhandledRejection: null,

    _updateStatus: function Promise__updateStatus(status, value) {
      if (this._status === STATUS_RESOLVED ||
          this._status === STATUS_REJECTED) {
        return;
      }

      if (status == STATUS_RESOLVED &&
          Promise.isPromise(value)) {
        value.then(this._updateStatus.bind(this, STATUS_RESOLVED),
                   this._updateStatus.bind(this, STATUS_REJECTED));
        return;
      }

      this._status = status;
      this._value = value;

      if (status === STATUS_REJECTED && this._handlers.length === 0) {
        this._unhandledRejection = true;
        HandlerManager.addUnhandledRejection(this);
      }

      HandlerManager.scheduleHandlers(this);
    },

    get isResolved() {
      return this._status === STATUS_RESOLVED;
    },

    get isRejected() {
      return this._status === STATUS_REJECTED;
    },

    resolve: function Promise_resolve(value) {
      this._updateStatus(STATUS_RESOLVED, value);
    },

    reject: function Promise_reject(reason) {
      this._updateStatus(STATUS_REJECTED, reason);
    },

    then: function Promise_then(onResolve, onReject) {
      var nextPromise = new Promise();
      this._handlers.push({
        thisPromise: this,
        onResolve: onResolve,
        onReject: onReject,
        nextPromise: nextPromise
      });
      HandlerManager.scheduleHandlers(this);
      return nextPromise;
    }
  };

  return Promise;
})();

var StatTimer = (function StatTimerClosure() {
  function rpad(str, pad, length) {
    while (str.length < length)
      str += pad;
    return str;
  }
  function StatTimer() {
    this.started = {};
    this.times = [];
    this.enabled = true;
  }
  StatTimer.prototype = {
    time: function StatTimer_time(name) {
      if (!this.enabled)
        return;
      if (name in this.started)
        warn('Timer is already running for ' + name);
      this.started[name] = Date.now();
    },
    timeEnd: function StatTimer_timeEnd(name) {
      if (!this.enabled)
        return;
      if (!(name in this.started))
        warn('Timer has not been started for ' + name);
      this.times.push({
        'name': name,
        'start': this.started[name],
        'end': Date.now()
      });
      // Remove timer from started so it can be called again.
      delete this.started[name];
    },
    toString: function StatTimer_toString() {
      var times = this.times;
      var out = '';
      // Find the longest name for padding purposes.
      var longest = 0;
      for (var i = 0, ii = times.length; i < ii; ++i) {
        var name = times[i]['name'];
        if (name.length > longest)
          longest = name.length;
      }
      for (var i = 0, ii = times.length; i < ii; ++i) {
        var span = times[i];
        var duration = span.end - span.start;
        out += rpad(span['name'], ' ', longest) + ' ' + duration + 'ms\n';
      }
      return out;
    }
  };
  return StatTimer;
})();

PDFJS.createBlob = function createBlob(data, contentType) {
  if (typeof Blob !== 'undefined')
    return new Blob([data], { type: contentType });
  // Blob builder is deprecated in FF14 and removed in FF18.
  var bb = new MozBlobBuilder();
  bb.append(data);
  return bb.getBlob(contentType);
};

PDFJS.createObjectURL = (function createObjectURLClosure() {
  if (typeof URL !== 'undefined' && URL.createObjectURL) {
    return function createObjectURL(data, contentType) {
      var blob = PDFJS.createBlob(data, contentType);
      return URL.createObjectURL(blob);
    };
  }

  // Blob/createObjectURL is not available, falling back to data schema.
  var digits =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';

  return function createObjectURL(data, contentType) {
    var buffer = 'data:' + contentType + ';base64,';
    for (var i = 0, ii = data.length; i < ii; i += 3) {
      var b1 = data[i] & 0xFF;
      var b2 = data[i + 1] & 0xFF;
      var b3 = data[i + 2] & 0xFF;
      var d1 = b1 >> 2, d2 = ((b1 & 3) << 4) | (b2 >> 4);
      var d3 = i + 1 < ii ? ((b2 & 0xF) << 2) | (b3 >> 6) : 64;
      var d4 = i + 2 < ii ? (b3 & 0x3F) : 64;
      buffer += digits[d1] + digits[d2] + digits[d3] + digits[d4];
    }
    return buffer;
  };
})();

function MessageHandler(name, comObj) {
  this.name = name;
  this.comObj = comObj;
  this.callbackIndex = 1;
  this.postMessageTransfers = true;
  var callbacks = this.callbacks = {};
  var ah = this.actionHandler = {};

  ah['console_log'] = [function ahConsoleLog(data) {
    log.apply(null, data);
  }];
  // If there's no console available, console_error in the
  // action handler will do nothing.
  if ('console' in globalScope) {
    ah['console_error'] = [function ahConsoleError(data) {
      globalScope['console'].error.apply(null, data);
    }];
  } else {
    ah['console_error'] = [function ahConsoleError(data) {
      log.apply(null, data);
    }];
  }
  ah['_warn'] = [function ah_Warn(data) {
    warn(data);
  }];

  comObj.onmessage = function messageHandlerComObjOnMessage(event) {
    var data = event.data;
    if (data.isReply) {
      var callbackId = data.callbackId;
      if (data.callbackId in callbacks) {
        var callback = callbacks[callbackId];
        delete callbacks[callbackId];
        callback(data.data);
      } else {
        error('Cannot resolve callback ' + callbackId);
      }
    } else if (data.action in ah) {
      var action = ah[data.action];
      if (data.callbackId) {
        var promise = new Promise();
        promise.then(function(resolvedData) {
          comObj.postMessage({
            isReply: true,
            callbackId: data.callbackId,
            data: resolvedData
          });
        });
        action[0].call(action[1], data.data, promise);
      } else {
        action[0].call(action[1], data.data);
      }
    } else {
      error('Unkown action from worker: ' + data.action);
    }
  };
}

MessageHandler.prototype = {
  on: function messageHandlerOn(actionName, handler, scope) {
    var ah = this.actionHandler;
    if (ah[actionName]) {
      error('There is already an actionName called "' + actionName + '"');
    }
    ah[actionName] = [handler, scope];
  },
  /**
   * Sends a message to the comObj to invoke the action with the supplied data.
   * @param {String} actionName Action to call.
   * @param {JSON} data JSON data to send.
   * @param {function} [callback] Optional callback that will handle a reply.
   * @param {Array} [transfers] Optional list of transfers/ArrayBuffers
   */
  send: function messageHandlerSend(actionName, data, callback, transfers) {
    var message = {
      action: actionName,
      data: data
    };
    if (callback) {
      var callbackId = this.callbackIndex++;
      this.callbacks[callbackId] = callback;
      message.callbackId = callbackId;
    }
    if (transfers && this.postMessageTransfers) {
      this.comObj.postMessage(message, transfers);
    } else {
      this.comObj.postMessage(message);
    }
  }
};

function loadJpegStream(id, imageUrl, objs) {
  var img = new Image();
  img.onload = (function loadJpegStream_onloadClosure() {
    objs.resolve(id, img);
  });
  img.src = imageUrl;
}


var ColorSpace = (function ColorSpaceClosure() {
  // Constructor should define this.numComps, this.defaultColor, this.name
  function ColorSpace() {
    error('should not call ColorSpace constructor');
  }

  ColorSpace.prototype = {
    /**
     * Converts the color value to the RGB color. The color components are
     * located in the src array starting from the srcOffset. Returns the array
     * of the rgb components, each value ranging from [0,255].
     */
    getRgb: function ColorSpace_getRgb(src, srcOffset) {
      error('Should not call ColorSpace.getRgb');
    },
    /**
     * Converts the color value to the RGB color, similar to the getRgb method.
     * The result placed into the dest array starting from the destOffset.
     */
    getRgbItem: function ColorSpace_getRgb(src, srcOffset, dest, destOffset) {
      error('Should not call ColorSpace.getRgbItem');
    },
    /**
     * Converts the specified number of the color values to the RGB colors.
     * The colors are located in the src array starting from the srcOffset.
     * The result is placed into the dest array starting from the destOffset.
     * The src array items shall be in [0,2^bits) range, the dest array items
     * will be in [0,255] range.
     */
    getRgbBuffer: function ColorSpace_getRgbBuffer(src, srcOffset, count,
                                                   dest, destOffset, bits) {
      error('Should not call ColorSpace.getRgbBuffer');
    },
    /**
     * Determines amount of the bytes is required to store the reslut of the
     * conversion that done by the getRgbBuffer method.
     */
    getOutputLength: function ColorSpace_getOutputLength(inputLength) {
      error('Should not call ColorSpace.getOutputLength');
    },
    /**
     * Returns true if source data will be equal the result/output data.
     */
    isPassthrough: function ColorSpace_isPassthrough(bits) {
      return false;
    },
    /**
     * Creates the output buffer and converts the specified number of the color
     * values to the RGB colors, similar to the getRgbBuffer.
     */
    createRgbBuffer: function ColorSpace_createRgbBuffer(src, srcOffset,
                                                         count, bits) {
      if (this.isPassthrough(bits)) {
        return src.subarray(srcOffset);
      }
      var dest = new Uint8Array(count * 3);
      var numComponentColors = 1 << bits;
      // Optimization: create a color map when there is just one component and
      // we are converting more colors than the size of the color map. We
      // don't build the map if the colorspace is gray or rgb since those
      // methods are faster than building a map. This mainly offers big speed
      // ups for indexed and alternate colorspaces.
      if (this.numComps === 1 && count > numComponentColors &&
          this.name !== 'DeviceGray' && this.name !== 'DeviceRGB') {
        // TODO it may be worth while to cache the color map. While running
        // testing I never hit a cache so I will leave that out for now (perhaps
        // we are reparsing colorspaces too much?).
        var allColors = bits <= 8 ? new Uint8Array(numComponentColors) :
                                    new Uint16Array(numComponentColors);
        for (var i = 0; i < numComponentColors; i++) {
          allColors[i] = i;
        }
        var colorMap = new Uint8Array(numComponentColors * 3);
        this.getRgbBuffer(allColors, 0, numComponentColors, colorMap, 0, bits);

        var destOffset = 0;
        for (var i = 0; i < count; ++i) {
          var key = src[srcOffset++] * 3;
          dest[destOffset++] = colorMap[key];
          dest[destOffset++] = colorMap[key + 1];
          dest[destOffset++] = colorMap[key + 2];
        }
        return dest;
      }
      this.getRgbBuffer(src, srcOffset, count, dest, 0, bits);
      return dest;
    },
    /**
     * True if the colorspace has components in the default range of [0, 1].
     * This should be true for all colorspaces except for lab color spaces
     * which are [0,100], [-128, 127], [-128, 127].
     */
    usesZeroToOneRange: true
  };

  ColorSpace.parse = function ColorSpace_parse(cs, xref, res) {
    var IR = ColorSpace.parseToIR(cs, xref, res);
    if (IR instanceof AlternateCS)
      return IR;

    return ColorSpace.fromIR(IR);
  };

  ColorSpace.fromIR = function ColorSpace_fromIR(IR) {
    var name = isArray(IR) ? IR[0] : IR;

    switch (name) {
      case 'DeviceGrayCS':
        return this.singletons.gray;
      case 'DeviceRgbCS':
        return this.singletons.rgb;
      case 'DeviceCmykCS':
        return this.singletons.cmyk;
      case 'CalGrayCS':
        var whitePoint = IR[1].WhitePoint;
        var blackPoint = IR[1].BlackPoint;
        var gamma = IR[1].Gamma;
        return new CalGrayCS(whitePoint, blackPoint, gamma);
      case 'PatternCS':
        var basePatternCS = IR[1];
        if (basePatternCS)
          basePatternCS = ColorSpace.fromIR(basePatternCS);
        return new PatternCS(basePatternCS);
      case 'IndexedCS':
        var baseIndexedCS = IR[1];
        var hiVal = IR[2];
        var lookup = IR[3];
        return new IndexedCS(ColorSpace.fromIR(baseIndexedCS), hiVal, lookup);
      case 'AlternateCS':
        var numComps = IR[1];
        var alt = IR[2];
        var tintFnIR = IR[3];

        return new AlternateCS(numComps, ColorSpace.fromIR(alt),
                                PDFFunction.fromIR(tintFnIR));
      case 'LabCS':
        var whitePoint = IR[1].WhitePoint;
        var blackPoint = IR[1].BlackPoint;
        var range = IR[1].Range;
        return new LabCS(whitePoint, blackPoint, range);
      default:
        error('Unkown name ' + name);
    }
    return null;
  };

  ColorSpace.parseToIR = function ColorSpace_parseToIR(cs, xref, res) {
    if (isName(cs)) {
      var colorSpaces = res.get('ColorSpace');
      if (isDict(colorSpaces)) {
        var refcs = colorSpaces.get(cs.name);
        if (refcs)
          cs = refcs;
      }
    }

    cs = xref.fetchIfRef(cs);
    var mode;

    if (isName(cs)) {
      mode = cs.name;
      this.mode = mode;

      switch (mode) {
        case 'DeviceGray':
        case 'G':
          return 'DeviceGrayCS';
        case 'DeviceRGB':
        case 'RGB':
          return 'DeviceRgbCS';
        case 'DeviceCMYK':
        case 'CMYK':
          return 'DeviceCmykCS';
        case 'Pattern':
          return ['PatternCS', null];
        default:
          error('unrecognized colorspace ' + mode);
      }
    } else if (isArray(cs)) {
      mode = cs[0].name;
      this.mode = mode;

      switch (mode) {
        case 'DeviceGray':
        case 'G':
          return 'DeviceGrayCS';
        case 'DeviceRGB':
        case 'RGB':
          return 'DeviceRgbCS';
        case 'DeviceCMYK':
        case 'CMYK':
          return 'DeviceCmykCS';
        case 'CalGray':
          var params = cs[1].getAll();
          return ['CalGrayCS', params];
        case 'CalRGB':
          return 'DeviceRgbCS';
        case 'ICCBased':
          var stream = xref.fetchIfRef(cs[1]);
          var dict = stream.dict;
          var numComps = dict.get('N');
          if (numComps == 1)
            return 'DeviceGrayCS';
          if (numComps == 3)
            return 'DeviceRgbCS';
          if (numComps == 4)
            return 'DeviceCmykCS';
          break;
        case 'Pattern':
          var basePatternCS = cs[1];
          if (basePatternCS)
            basePatternCS = ColorSpace.parseToIR(basePatternCS, xref, res);
          return ['PatternCS', basePatternCS];
        case 'Indexed':
        case 'I':
          var baseIndexedCS = ColorSpace.parseToIR(cs[1], xref, res);
          var hiVal = cs[2] + 1;
          var lookup = xref.fetchIfRef(cs[3]);
          if (isStream(lookup)) {
            lookup = lookup.getBytes();
          }
          return ['IndexedCS', baseIndexedCS, hiVal, lookup];
        case 'Separation':
        case 'DeviceN':
          var name = cs[1];
          var numComps = 1;
          if (isName(name))
            numComps = 1;
          else if (isArray(name))
            numComps = name.length;
          var alt = ColorSpace.parseToIR(cs[2], xref, res);
          var tintFnIR = PDFFunction.getIR(xref, xref.fetchIfRef(cs[3]));
          return ['AlternateCS', numComps, alt, tintFnIR];
        case 'Lab':
          var params = cs[1].getAll();
          return ['LabCS', params];
        default:
          error('unimplemented color space object "' + mode + '"');
      }
    } else {
      error('unrecognized color space object: "' + cs + '"');
    }
    return null;
  };
  /**
   * Checks if a decode map matches the default decode map for a color space.
   * This handles the general decode maps where there are two values per
   * component. e.g. [0, 1, 0, 1, 0, 1] for a RGB color.
   * This does not handle Lab, Indexed, or Pattern decode maps since they are
   * slightly different.
   * @param {Array} decode Decode map (usually from an image).
   * @param {Number} n Number of components the color space has.
   */
  ColorSpace.isDefaultDecode = function ColorSpace_isDefaultDecode(decode, n) {
    if (!decode)
      return true;

    if (n * 2 !== decode.length) {
      warn('The decode map is not the correct length');
      return true;
    }
    for (var i = 0, ii = decode.length; i < ii; i += 2) {
      if (decode[i] !== 0 || decode[i + 1] != 1)
        return false;
    }
    return true;
  };

  ColorSpace.singletons = {
    get gray() {
      return shadow(this, 'gray', new DeviceGrayCS());
    },
    get rgb() {
      return shadow(this, 'rgb', new DeviceRgbCS());
    },
    get cmyk() {
      return shadow(this, 'cmyk', new DeviceCmykCS());
    }
  };

  return ColorSpace;
})();

/**
 * Alternate color space handles both Separation and DeviceN color spaces.  A
 * Separation color space is actually just a DeviceN with one color component.
 * Both color spaces use a tinting function to convert colors to a base color
 * space.
 */
var AlternateCS = (function AlternateCSClosure() {
  function AlternateCS(numComps, base, tintFn) {
    this.name = 'Alternate';
    this.numComps = numComps;
    this.defaultColor = new Float32Array(numComps);
    for (var i = 0; i < numComps; ++i) {
      this.defaultColor[i] = 1;
    }
    this.base = base;
    this.tintFn = tintFn;
  }

  AlternateCS.prototype = {
    getRgb: function AlternateCS_getRgb(src, srcOffset) {
      var rgb = new Uint8Array(3);
      this.getRgbItem(src, srcOffset, rgb, 0);
      return rgb;
    },
    getRgbItem: function AlternateCS_getRgbItem(src, srcOffset,
                                                dest, destOffset) {
      var baseNumComps = this.base.numComps;
      var input = 'subarray' in src ?
        src.subarray(srcOffset, srcOffset + this.numComps) :
        Array.prototype.slice.call(src, srcOffset, srcOffset + this.numComps);
      var tinted = this.tintFn(input);
      this.base.getRgbItem(tinted, 0, dest, destOffset);
    },
    getRgbBuffer: function AlternateCS_getRgbBuffer(src, srcOffset, count,
                                                    dest, destOffset, bits) {
      var tintFn = this.tintFn;
      var base = this.base;
      var scale = 1 / ((1 << bits) - 1);
      var baseNumComps = base.numComps;
      var usesZeroToOneRange = base.usesZeroToOneRange;
      var isPassthrough = base.isPassthrough(8) || !usesZeroToOneRange;
      var pos = isPassthrough ? destOffset : 0;
      var baseBuf = isPassthrough ? dest : new Uint8Array(baseNumComps * count);
      var numComps = this.numComps;

      var scaled = new Float32Array(numComps);
      for (var i = 0; i < count; i++) {
        for (var j = 0; j < numComps; j++) {
          scaled[j] = src[srcOffset++] * scale;
        }
        var tinted = tintFn(scaled);
        if (usesZeroToOneRange) {
          for (var j = 0; j < baseNumComps; j++) {
            baseBuf[pos++] = tinted[j] * 255;
          }
        } else {
          base.getRgbItem(tinted, 0, baseBuf, pos);
          pos += baseNumComps;
        }
      }
      if (!isPassthrough) {
        base.getRgbBuffer(baseBuf, 0, count, dest, destOffset, 8);
      }
    },
    getOutputLength: function AlternateCS_getOutputLength(inputLength) {
      return this.base.getOutputLength(inputLength *
                                       this.base.numComps / this.numComps);
    },
    isPassthrough: ColorSpace.prototype.isPassthrough,
    createRgbBuffer: ColorSpace.prototype.createRgbBuffer,
    isDefaultDecode: function AlternateCS_isDefaultDecode(decodeMap) {
      return ColorSpace.isDefaultDecode(decodeMap, this.numComps);
    },
    usesZeroToOneRange: true
  };

  return AlternateCS;
})();

var PatternCS = (function PatternCSClosure() {
  function PatternCS(baseCS) {
    this.name = 'Pattern';
    this.base = baseCS;
  }
  PatternCS.prototype = {};

  return PatternCS;
})();

var IndexedCS = (function IndexedCSClosure() {
  function IndexedCS(base, highVal, lookup) {
    this.name = 'Indexed';
    this.numComps = 1;
    this.defaultColor = new Uint8Array([0]);
    this.base = base;
    this.highVal = highVal;

    var baseNumComps = base.numComps;
    var length = baseNumComps * highVal;
    var lookupArray;

    if (isStream(lookup)) {
      lookupArray = new Uint8Array(length);
      var bytes = lookup.getBytes(length);
      lookupArray.set(bytes);
    } else if (isString(lookup)) {
      lookupArray = new Uint8Array(length);
      for (var i = 0; i < length; ++i)
        lookupArray[i] = lookup.charCodeAt(i);
    } else if (lookup instanceof Uint8Array || lookup instanceof Array) {
      lookupArray = lookup;
    } else {
      error('Unrecognized lookup table: ' + lookup);
    }
    this.lookup = lookupArray;
  }

  IndexedCS.prototype = {
    getRgb: function IndexedCS_getRgb(src, srcOffset) {
      var numComps = this.base.numComps;
      var start = src[srcOffset] * numComps;
      return this.base.getRgb(this.lookup, start);
    },
    getRgbItem: function IndexedCS_getRgbItem(src, srcOffset,
                                              dest, destOffset) {
      var numComps = this.base.numComps;
      var start = src[srcOffset] * numComps;
      this.base.getRgbItem(this.lookup, start, dest, destOffset);
    },
    getRgbBuffer: function IndexedCS_getRgbBuffer(src, srcOffset, count,
                                                  dest, destOffset) {
      var base = this.base;
      var numComps = base.numComps;
      var outputDelta = base.getOutputLength(numComps);
      var lookup = this.lookup;

      for (var i = 0; i < count; ++i) {
        var lookupPos = src[srcOffset++] * numComps;
        base.getRgbBuffer(lookup, lookupPos, 1, dest, destOffset, 8);
        destOffset += outputDelta;
      }
    },
    getOutputLength: function IndexedCS_getOutputLength(inputLength) {
      return this.base.getOutputLength(inputLength * this.base.numComps);
    },
    isPassthrough: ColorSpace.prototype.isPassthrough,
    createRgbBuffer: ColorSpace.prototype.createRgbBuffer,
    isDefaultDecode: function IndexedCS_isDefaultDecode(decodeMap) {
      // indexed color maps shouldn't be changed
      return true;
    },
    usesZeroToOneRange: true
  };
  return IndexedCS;
})();

var DeviceGrayCS = (function DeviceGrayCSClosure() {
  function DeviceGrayCS() {
    this.name = 'DeviceGray';
    this.numComps = 1;
    this.defaultColor = new Float32Array([0]);
  }

  DeviceGrayCS.prototype = {
    getRgb: function DeviceGrayCS_getRgb(src, srcOffset) {
      var rgb = new Uint8Array(3);
      this.getRgbItem(src, srcOffset, rgb, 0);
      return rgb;
    },
    getRgbItem: function DeviceGrayCS_getRgbItem(src, srcOffset,
                                                 dest, destOffset) {
      var c = (src[srcOffset] * 255) | 0;
      c = c < 0 ? 0 : c > 255 ? 255 : c;
      dest[destOffset] = dest[destOffset + 1] = dest[destOffset + 2] = c;
    },
    getRgbBuffer: function DeviceGrayCS_getRgbBuffer(src, srcOffset, count,
                                                     dest, destOffset, bits) {
      var scale = 255 / ((1 << bits) - 1);
      var j = srcOffset, q = destOffset;
      for (var i = 0; i < count; ++i) {
        var c = (scale * src[j++]) | 0;
        dest[q++] = c;
        dest[q++] = c;
        dest[q++] = c;
      }
    },
    getOutputLength: function DeviceGrayCS_getOutputLength(inputLength) {
      return inputLength * 3;
    },
    isPassthrough: ColorSpace.prototype.isPassthrough,
    createRgbBuffer: ColorSpace.prototype.createRgbBuffer,
    isDefaultDecode: function DeviceGrayCS_isDefaultDecode(decodeMap) {
      return ColorSpace.isDefaultDecode(decodeMap, this.numComps);
    },
    usesZeroToOneRange: true
  };
  return DeviceGrayCS;
})();

var DeviceRgbCS = (function DeviceRgbCSClosure() {
  function DeviceRgbCS() {
    this.name = 'DeviceRGB';
    this.numComps = 3;
    this.defaultColor = new Float32Array([0, 0, 0]);
  }
  DeviceRgbCS.prototype = {
    getRgb: function DeviceRgbCS_getRgb(src, srcOffset) {
      var rgb = new Uint8Array(3);
      this.getRgbItem(src, srcOffset, rgb, 0);
      return rgb;
    },
    getRgbItem: function DeviceRgbCS_getRgbItem(src, srcOffset,
                                                dest, destOffset) {
      var r = (src[srcOffset] * 255) | 0;
      var g = (src[srcOffset + 1] * 255) | 0;
      var b = (src[srcOffset + 2] * 255) | 0;
      dest[destOffset] = r < 0 ? 0 : r > 255 ? 255 : r;
      dest[destOffset + 1] = g < 0 ? 0 : g > 255 ? 255 : g;
      dest[destOffset + 2] = b < 0 ? 0 : b > 255 ? 255 : b;
    },
    getRgbBuffer: function DeviceRgbCS_getRgbBuffer(src, srcOffset, count,
                                                    dest, destOffset, bits) {
      var length = count * 3;
      if (bits == 8) {
        dest.set(src.subarray(srcOffset, srcOffset + length), destOffset);
        return;
      }
      var scale = 255 / ((1 << bits) - 1);
      var j = srcOffset, q = destOffset;
      for (var i = 0; i < length; ++i) {
        dest[q++] = (scale * src[j++]) | 0;
      }
    },
    getOutputLength: function DeviceRgbCS_getOutputLength(inputLength) {
      return inputLength;
    },
    isPassthrough: function DeviceRgbCS_isPassthrough(bits) {
      return bits == 8;
    },
    createRgbBuffer: ColorSpace.prototype.createRgbBuffer,
    isDefaultDecode: function DeviceRgbCS_isDefaultDecode(decodeMap) {
      return ColorSpace.isDefaultDecode(decodeMap, this.numComps);
    },
    usesZeroToOneRange: true
  };
  return DeviceRgbCS;
})();

var DeviceCmykCS = (function DeviceCmykCSClosure() {
  // The coefficients below was found using numerical analysis: the method of
  // steepest descent for the sum((f_i - color_value_i)^2) for r/g/b colors,
  // where color_value is the tabular value from the table of sampled RGB colors
  // from CMYK US Web Coated (SWOP) colorspace, and f_i is the corresponding
  // CMYK color conversion using the estimation below:
  //   f(A, B,.. N) = Acc+Bcm+Ccy+Dck+c+Fmm+Gmy+Hmk+Im+Jyy+Kyk+Ly+Mkk+Nk+255
  function convertToRgb(src, srcOffset, srcScale, dest, destOffset) {
    var c = src[srcOffset + 0] * srcScale;
    var m = src[srcOffset + 1] * srcScale;
    var y = src[srcOffset + 2] * srcScale;
    var k = src[srcOffset + 3] * srcScale;

    var r =
      c * (-4.387332384609988 * c + 54.48615194189176 * m +
           18.82290502165302 * y + 212.25662451639585 * k +
           -285.2331026137004) +
      m * (1.7149763477362134 * m - 5.6096736904047315 * y +
           -17.873870861415444 * k - 5.497006427196366) +
      y * (-2.5217340131683033 * y - 21.248923337353073 * k +
           17.5119270841813) +
      k * (-21.86122147463605 * k - 189.48180835922747) + 255;
    var g =
      c * (8.841041422036149 * c + 60.118027045597366 * m +
           6.871425592049007 * y + 31.159100130055922 * k +
           -79.2970844816548) +
      m * (-15.310361306967817 * m + 17.575251261109482 * y +
           131.35250912493976 * k - 190.9453302588951) +
      y * (4.444339102852739 * y + 9.8632861493405 * k - 24.86741582555878) +
      k * (-20.737325471181034 * k - 187.80453709719578) + 255;
    var b =
      c * (0.8842522430003296 * c + 8.078677503112928 * m +
           30.89978309703729 * y - 0.23883238689178934 * k +
           -14.183576799673286) +
      m * (10.49593273432072 * m + 63.02378494754052 * y +
           50.606957656360734 * k - 112.23884253719248) +
      y * (0.03296041114873217 * y + 115.60384449646641 * k +
           -193.58209356861505) +
      k * (-22.33816807309886 * k - 180.12613974708367) + 255;

    dest[destOffset] = r > 255 ? 255 : r < 0 ? 0 : r;
    dest[destOffset + 1] = g > 255 ? 255 : g < 0 ? 0 : g;
    dest[destOffset + 2] = b > 255 ? 255 : b < 0 ? 0 : b;
  }

  function DeviceCmykCS() {
    this.name = 'DeviceCMYK';
    this.numComps = 4;
    this.defaultColor = new Float32Array([0, 0, 0, 1]);
  }
  DeviceCmykCS.prototype = {
    getRgb: function DeviceCmykCS_getRgb(src, srcOffset) {
      var rgb = new Uint8Array(3);
      convertToRgb(src, srcOffset, 1, rgb, 0);
      return rgb;
    },
    getRgbItem: function DeviceCmykCS_getRgbItem(src, srcOffset,
                                                 dest, destOffset) {
      convertToRgb(src, srcOffset, 1, dest, destOffset);
    },
    getRgbBuffer: function DeviceCmykCS_getRgbBuffer(src, srcOffset, count,
                                                     dest, destOffset, bits) {
      var scale = 1 / ((1 << bits) - 1);
      for (var i = 0; i < count; i++) {
        convertToRgb(src, srcOffset, scale, dest, destOffset);
        srcOffset += 4;
        destOffset += 3;
      }
    },
    getOutputLength: function DeviceCmykCS_getOutputLength(inputLength) {
      return (inputLength >> 2) * 3;
    },
    isPassthrough: ColorSpace.prototype.isPassthrough,
    createRgbBuffer: ColorSpace.prototype.createRgbBuffer,
    isDefaultDecode: function DeviceCmykCS_isDefaultDecode(decodeMap) {
      return ColorSpace.isDefaultDecode(decodeMap, this.numComps);
    },
    usesZeroToOneRange: true
  };

  return DeviceCmykCS;
})();

//
// CalGrayCS: Based on "PDF Reference, Sixth Ed", p.245
//
var CalGrayCS = (function CalGrayCSClosure() {
  function CalGrayCS(whitePoint, blackPoint, gamma) {
    this.name = 'CalGray';
    this.numComps = 3;
    this.defaultColor = new Float32Array([0, 0, 0]);

    if (!whitePoint) {
      error('WhitePoint missing - required for color space CalGray');
    }
    blackPoint = blackPoint || [0, 0, 0];
    gamma = gamma || 1;

    // Translate arguments to spec variables.
    this.XW = whitePoint[0];
    this.YW = whitePoint[1];
    this.ZW = whitePoint[2];

    this.XB = blackPoint[0];
    this.YB = blackPoint[1];
    this.ZB = blackPoint[2];

    this.G = gamma;

    // Validate variables as per spec.
    if (this.XW < 0 || this.ZW < 0 || this.YW !== 1) {
      error('Invalid WhitePoint components for ' + this.name +
            ', no fallback available');
    }

    if (this.XB < 0 || this.YB < 0 || this.ZB < 0) {
      info('Invalid BlackPoint for ' + this.name + ', falling back to default');
      this.XB = this.YB = this.ZB = 0;
    }

    if (this.XB !== 0 || this.YB !== 0 || this.ZB !== 0) {
      TODO(this.name + ', BlackPoint: XB: ' + this.XB + ', YB: ' + this.YB +
           ', ZB: ' + this.ZB + ', only default values are supported.');
    }

    if (this.G < 1) {
      info('Invalid Gamma: ' + this.G + ' for ' + this.name +
           ', falling back to default');
      this.G = 1;
    }
  }

  CalGrayCS.prototype = {
    getRgb: function CalGrayCS_getRgb(src, srcOffset) {
      var rgb = new Uint8Array(3);
      this.getRgbItem(src, srcOffset, rgb, 0);
      return rgb;
    },
    getRgbItem: function CalGrayCS_getRgbItem(src, srcOffset,
                                              dest, destOffset) {
      // A represents a gray component of a calibrated gray space.
      // A <---> AG in the spec
      var A = src[srcOffset];
      var AG = Math.pow(A, this.G);

      // Computes intermediate variables M, L, N as per spec.
      // Except if other than default BlackPoint values are used.
      var M = this.XW * AG;
      var L = this.YW * AG;
      var N = this.ZW * AG;

      // Decode XYZ, as per spec.
      var X = M;
      var Y = L;
      var Z = N;

      // http://www.poynton.com/notes/colour_and_gamma/ColorFAQ.html, Ch 4.
      // This yields values in range [0, 100].
      var Lstar = Math.max(116 * Math.pow(Y, 1 / 3) - 16, 0);

      // Convert values to rgb range [0, 255].
      dest[destOffset] = Lstar * 255 / 100;
      dest[destOffset + 1] = Lstar * 255 / 100;
      dest[destOffset + 2] = Lstar * 255 / 100;
    },
    getRgbBuffer: function CalGrayCS_getRgbBuffer(src, srcOffset, count,
                                                  dest, destOffset, bits) {
      // TODO: This part is copied from DeviceGray. Make this utility function.
      var scale = 255 / ((1 << bits) - 1);
      var j = srcOffset, q = destOffset;
      for (var i = 0; i < count; ++i) {
        var c = (scale * src[j++]) | 0;
        dest[q++] = c;
        dest[q++] = c;
        dest[q++] = c;
      }
    },
    getOutputLength: function CalGrayCS_getOutputLength(inputLength) {
      return inputLength * 3;
    },
    isPassthrough: ColorSpace.prototype.isPassthrough,
    createRgbBuffer: ColorSpace.prototype.createRgbBuffer,
    isDefaultDecode: function CalGrayCS_isDefaultDecode(decodeMap) {
      return ColorSpace.isDefaultDecode(decodeMap, this.numComps);
    },
    usesZeroToOneRange: true
  };
  return CalGrayCS;
})();

//
// LabCS: Based on "PDF Reference, Sixth Ed", p.250
//
var LabCS = (function LabCSClosure() {
  function LabCS(whitePoint, blackPoint, range) {
    this.name = 'Lab';
    this.numComps = 3;
    this.defaultColor = new Float32Array([0, 0, 0]);

    if (!whitePoint)
      error('WhitePoint missing - required for color space Lab');
    blackPoint = blackPoint || [0, 0, 0];
    range = range || [-100, 100, -100, 100];

    // Translate args to spec variables
    this.XW = whitePoint[0];
    this.YW = whitePoint[1];
    this.ZW = whitePoint[2];
    this.amin = range[0];
    this.amax = range[1];
    this.bmin = range[2];
    this.bmax = range[3];

    // These are here just for completeness - the spec doesn't offer any
    // formulas that use BlackPoint in Lab
    this.XB = blackPoint[0];
    this.YB = blackPoint[1];
    this.ZB = blackPoint[2];

    // Validate vars as per spec
    if (this.XW < 0 || this.ZW < 0 || this.YW !== 1)
      error('Invalid WhitePoint components, no fallback available');

    if (this.XB < 0 || this.YB < 0 || this.ZB < 0) {
      info('Invalid BlackPoint, falling back to default');
      this.XB = this.YB = this.ZB = 0;
    }

    if (this.amin > this.amax || this.bmin > this.bmax) {
      info('Invalid Range, falling back to defaults');
      this.amin = -100;
      this.amax = 100;
      this.bmin = -100;
      this.bmax = 100;
    }
  }

  // Function g(x) from spec
  function fn_g(x) {
    if (x >= 6 / 29)
      return x * x * x;
    else
      return (108 / 841) * (x - 4 / 29);
  }

  function decode(value, high1, low2, high2) {
    return low2 + (value) * (high2 - low2) / (high1);
  }

  // If decoding is needed maxVal should be 2^bits per component - 1.
  function convertToRgb(cs, src, srcOffset, maxVal, dest, destOffset) {
    // XXX: Lab input is in the range of [0, 100], [amin, amax], [bmin, bmax]
    // not the usual [0, 1]. If a command like setFillColor is used the src
    // values will already be within the correct range. However, if we are
    // converting an image we have to map the values to the correct range given
    // above.
    // Ls,as,bs <---> L*,a*,b* in the spec
    var Ls = src[srcOffset];
    var as = src[srcOffset + 1];
    var bs = src[srcOffset + 2];
    if (maxVal !== false) {
      Ls = decode(Ls, maxVal, 0, 100);
      as = decode(as, maxVal, cs.amin, cs.amax);
      bs = decode(bs, maxVal, cs.bmin, cs.bmax);
    }

    // Adjust limits of 'as' and 'bs'
    as = as > cs.amax ? cs.amax : as < cs.amin ? cs.amin : as;
    bs = bs > cs.bmax ? cs.bmax : bs < cs.bmin ? cs.bmin : bs;

    // Computes intermediate variables X,Y,Z as per spec
    var M = (Ls + 16) / 116;
    var L = M + (as / 500);
    var N = M - (bs / 200);

    var X = cs.XW * fn_g(L);
    var Y = cs.YW * fn_g(M);
    var Z = cs.ZW * fn_g(N);

    var r, g, b;
    // Using different conversions for D50 and D65 white points,
    // per http://www.color.org/srgb.pdf
    if (cs.ZW < 1) {
      // Assuming D50 (X=0.9642, Y=1.00, Z=0.8249)
      r = X * 3.1339 + Y * -1.6170 + Z * -0.4906;
      g = X * -0.9785 + Y * 1.9160 + Z * 0.0333;
      b = X * 0.0720 + Y * -0.2290 + Z * 1.4057;
    } else {
      // Assuming D65 (X=0.9505, Y=1.00, Z=1.0888)
      r = X * 3.2406 + Y * -1.5372 + Z * -0.4986;
      g = X * -0.9689 + Y * 1.8758 + Z * 0.0415;
      b = X * 0.0557 + Y * -0.2040 + Z * 1.0570;
    }
    // clamp color values to [0,1] range then convert to [0,255] range.
    dest[destOffset] = Math.sqrt(r < 0 ? 0 : r > 1 ? 1 : r) * 255;
    dest[destOffset + 1] = Math.sqrt(g < 0 ? 0 : g > 1 ? 1 : g) * 255;
    dest[destOffset + 2] = Math.sqrt(b < 0 ? 0 : b > 1 ? 1 : b) * 255;
  }

  LabCS.prototype = {
    getRgb: function LabCS_getRgb(src, srcOffset) {
      var rgb = new Uint8Array(3);
      convertToRgb(this, src, srcOffset, false, rgb, 0);
      return rgb;
    },
    getRgbItem: function LabCS_getRgbItem(src, srcOffset, dest, destOffset) {
      convertToRgb(this, src, srcOffset, false, dest, destOffset);
    },
    getRgbBuffer: function LabCS_getRgbBuffer(src, srcOffset, count,
                                              dest, destOffset, bits) {
      var maxVal = (1 << bits) - 1;
      for (var i = 0; i < count; i++) {
        convertToRgb(this, src, srcOffset, maxVal, dest, destOffset);
        srcOffset += 3;
        destOffset += 3;
      }
    },
    getOutputLength: function LabCS_getOutputLength(inputLength) {
      return inputLength;
    },
    isPassthrough: ColorSpace.prototype.isPassthrough,
    isDefaultDecode: function LabCS_isDefaultDecode(decodeMap) {
      // XXX: Decoding is handled with the lab conversion because of the strange
      // ranges that are used.
      return true;
    },
    usesZeroToOneRange: false
  };
  return LabCS;
})();



var PatternType = {
  AXIAL: 2,
  RADIAL: 3
};

var Pattern = (function PatternClosure() {
  // Constructor should define this.getPattern
  function Pattern() {
    error('should not call Pattern constructor');
  }

  Pattern.prototype = {
    // Input: current Canvas context
    // Output: the appropriate fillStyle or strokeStyle
    getPattern: function Pattern_getPattern(ctx) {
      error('Should not call Pattern.getStyle: ' + ctx);
    }
  };

  Pattern.shadingFromIR = function Pattern_shadingFromIR(raw) {
    return Shadings[raw[0]].fromIR(raw);
  };

  Pattern.parseShading = function Pattern_parseShading(shading, matrix, xref,
                                                       res) {

    var dict = isStream(shading) ? shading.dict : shading;
    var type = dict.get('ShadingType');

    switch (type) {
      case PatternType.AXIAL:
      case PatternType.RADIAL:
        // Both radial and axial shadings are handled by RadialAxial shading.
        return new Shadings.RadialAxial(dict, matrix, xref, res);
      default:
        TODO('Unsupported shading type: ' + type);
        return new Shadings.Dummy();
    }
  };
  return Pattern;
})();

var Shadings = {};

// A small number to offset the first/last color stops so we can insert ones to
// support extend.  Number.MIN_VALUE appears to be too small and breaks the
// extend. 1e-7 works in FF but chrome seems to use an even smaller sized number
// internally so we have to go bigger.
Shadings.SMALL_NUMBER = 1e-2;

// Radial and axial shading have very similar implementations
// If needed, the implementations can be broken into two classes
Shadings.RadialAxial = (function RadialAxialClosure() {
  function RadialAxial(dict, matrix, xref, res, ctx) {
    this.matrix = matrix;
    this.coordsArr = dict.get('Coords');
    this.shadingType = dict.get('ShadingType');
    this.type = 'Pattern';
    this.ctx = ctx;
    var cs = dict.get('ColorSpace', 'CS');
    cs = ColorSpace.parse(cs, xref, res);
    this.cs = cs;

    var t0 = 0.0, t1 = 1.0;
    if (dict.has('Domain')) {
      var domainArr = dict.get('Domain');
      t0 = domainArr[0];
      t1 = domainArr[1];
    }

    var extendStart = false, extendEnd = false;
    if (dict.has('Extend')) {
      var extendArr = dict.get('Extend');
      extendStart = extendArr[0];
      extendEnd = extendArr[1];
    }

    if (this.shadingType === PatternType.RADIAL &&
       (!extendStart || !extendEnd)) {
      // Radial gradient only currently works if either circle is fully within
      // the other circle.
      var x1 = this.coordsArr[0];
      var y1 = this.coordsArr[1];
      var r1 = this.coordsArr[2];
      var x2 = this.coordsArr[3];
      var y2 = this.coordsArr[4];
      var r2 = this.coordsArr[5];
      var distance = Math.sqrt((x1 - x2) * (x1 - x2) + (y1 - y2) * (y1 - y2));
      if (r1 <= r2 + distance &&
          r2 <= r1 + distance) {
        warn('Unsupported radial gradient.');
      }
    }

    this.extendStart = extendStart;
    this.extendEnd = extendEnd;

    var fnObj = dict.get('Function');
    var fn;
    if (isArray(fnObj)) {
      var fnArray = [];
      for (var j = 0, jj = fnObj.length; j < jj; j++) {
        var obj = xref.fetchIfRef(fnObj[j]);
        if (!isPDFFunction(obj)) {
          error('Invalid function');
        }
        fnArray.push(PDFFunction.parse(xref, obj));
      }
      fn = function radialAxialColorFunction(arg) {
        var out = [];
        for (var i = 0, ii = fnArray.length; i < ii; i++) {
          out.push(fnArray[i](arg)[0]);
        }
        return out;
      };
    } else {
      if (!isPDFFunction(fnObj)) {
        error('Invalid function');
      }
      fn = PDFFunction.parse(xref, fnObj);
    }

    // 10 samples seems good enough for now, but probably won't work
    // if there are sharp color changes. Ideally, we would implement
    // the spec faithfully and add lossless optimizations.
    var diff = t1 - t0;
    var step = diff / 10;

    var colorStops = this.colorStops = [];

    // Protect against bad domains so we don't end up in an infinte loop below.
    if (t0 >= t1 || step <= 0) {
      // Acrobat doesn't seem to handle these cases so we'll ignore for
      // now.
      info('Bad shading domain.');
      return;
    }

    for (var i = t0; i <= t1; i += step) {
      var rgbColor = cs.getRgb(fn([i]), 0);
      var cssColor = Util.makeCssRgb(rgbColor);
      colorStops.push([(i - t0) / diff, cssColor]);
    }

    var background = 'transparent';
    if (dict.has('Background')) {
      var rgbColor = cs.getRgb(dict.get('Background'), 0);
      background = Util.makeCssRgb(rgbColor);
    }

    if (!extendStart) {
      // Insert a color stop at the front and offset the first real color stop
      // so it doesn't conflict with the one we insert.
      colorStops.unshift([0, background]);
      colorStops[1][0] += Shadings.SMALL_NUMBER;
    }
    if (!extendEnd) {
      // Same idea as above in extendStart but for the end.
      colorStops[colorStops.length - 1][0] -= Shadings.SMALL_NUMBER;
      colorStops.push([1, background]);
    }

    this.colorStops = colorStops;
  }

  RadialAxial.fromIR = function RadialAxial_fromIR(raw) {
    var type = raw[1];
    var colorStops = raw[2];
    var p0 = raw[3];
    var p1 = raw[4];
    var r0 = raw[5];
    var r1 = raw[6];
    return {
      type: 'Pattern',
      getPattern: function RadialAxial_getPattern(ctx) {
        var grad;
        if (type == PatternType.AXIAL)
          grad = ctx.createLinearGradient(p0[0], p0[1], p1[0], p1[1]);
        else if (type == PatternType.RADIAL)
          grad = ctx.createRadialGradient(p0[0], p0[1], r0, p1[0], p1[1], r1);

        for (var i = 0, ii = colorStops.length; i < ii; ++i) {
          var c = colorStops[i];
          grad.addColorStop(c[0], c[1]);
        }
        return grad;
      }
    };
  };

  RadialAxial.prototype = {
    getIR: function RadialAxial_getIR() {
      var coordsArr = this.coordsArr;
      var type = this.shadingType;
      if (type == PatternType.AXIAL) {
        var p0 = [coordsArr[0], coordsArr[1]];
        var p1 = [coordsArr[2], coordsArr[3]];
        var r0 = null;
        var r1 = null;
      } else if (type == PatternType.RADIAL) {
        var p0 = [coordsArr[0], coordsArr[1]];
        var p1 = [coordsArr[3], coordsArr[4]];
        var r0 = coordsArr[2];
        var r1 = coordsArr[5];
      } else {
        error('getPattern type unknown: ' + type);
      }

      var matrix = this.matrix;
      if (matrix) {
        p0 = Util.applyTransform(p0, matrix);
        p1 = Util.applyTransform(p1, matrix);
      }

      return ['RadialAxial', type, this.colorStops, p0, p1, r0, r1];
    }
  };

  return RadialAxial;
})();

Shadings.Dummy = (function DummyClosure() {
  function Dummy() {
    this.type = 'Pattern';
  }

  Dummy.fromIR = function Dummy_fromIR() {
    return {
      type: 'Pattern',
      getPattern: function Dummy_fromIR_getPattern() {
        return 'hotpink';
      }
    };
  };

  Dummy.prototype = {
    getIR: function Dummy_getIR() {
      return ['Dummy'];
    }
  };
  return Dummy;
})();

var TilingPattern = (function TilingPatternClosure() {
  var PaintType = {
    COLORED: 1,
    UNCOLORED: 2
  };

  var MAX_PATTERN_SIZE = 3000; // 10in @ 300dpi shall be enough

  function TilingPattern(IR, color, ctx, objs, commonObjs, baseTransform) {
    this.name = IR[1][0].name;
    this.operatorList = IR[2];
    this.matrix = IR[3] || [1, 0, 0, 1, 0, 0];
    this.bbox = IR[4];
    this.xstep = IR[5];
    this.ystep = IR[6];
    this.paintType = IR[7];
    this.tilingType = IR[8];
    this.color = color;
    this.objs = objs;
    this.commonObjs = commonObjs;
    this.baseTransform = baseTransform;
    this.type = 'Pattern';
    this.ctx = ctx;
  }

  TilingPattern.getIR = function TilingPattern_getIR(operatorList, dict, args) {
    var matrix = dict.get('Matrix');
    var bbox = dict.get('BBox');
    var xstep = dict.get('XStep');
    var ystep = dict.get('YStep');
    var paintType = dict.get('PaintType');
    var tilingType = dict.get('TilingType');

    return [
      'TilingPattern', args, operatorList, matrix, bbox, xstep, ystep,
      paintType, tilingType
    ];
  };

  TilingPattern.prototype = {
    createPatternCanvas: function TilinPattern_createPatternCanvas(owner) {
      var operatorList = this.operatorList;
      var bbox = this.bbox;
      var xstep = this.xstep;
      var ystep = this.ystep;
      var paintType = this.paintType;
      var tilingType = this.tilingType;
      var color = this.color;
      var objs = this.objs;
      var commonObjs = this.commonObjs;
      var ctx = this.ctx;

      TODO('TilingType: ' + tilingType);

      var x0 = bbox[0], y0 = bbox[1], x1 = bbox[2], y1 = bbox[3];

      var topLeft = [x0, y0];
      // we want the canvas to be as large as the step size
      var botRight = [x0 + xstep, y0 + ystep];

      var width = botRight[0] - topLeft[0];
      var height = botRight[1] - topLeft[1];

      // Obtain scale from matrix and current transformation matrix.
      var matrixScale = Util.singularValueDecompose2dScale(this.matrix);
      var curMatrixScale = Util.singularValueDecompose2dScale(
                             this.baseTransform);
      var combinedScale = [matrixScale[0] * curMatrixScale[0],
                           matrixScale[1] * curMatrixScale[1]];

      // MAX_PATTERN_SIZE is used to avoid OOM situation.
      // Use width and height values that are as close as possible to the end
      // result when the pattern is used. Too low value makes the pattern look
      // blurry. Too large value makes it look too crispy.
      width = Math.min(Math.ceil(Math.abs(width * combinedScale[0])),
                       MAX_PATTERN_SIZE);

      height = Math.min(Math.ceil(Math.abs(height * combinedScale[1])),
                        MAX_PATTERN_SIZE);

      var tmpCanvas = CachedCanvases.getCanvas('pattern', width, height, true);
      var tmpCtx = tmpCanvas.context;
      var graphics = new CanvasGraphics(tmpCtx, commonObjs, objs);
      graphics.groupLevel = owner.groupLevel;

      this.setFillAndStrokeStyleToContext(tmpCtx, paintType, color);

      this.setScale(width, height, xstep, ystep);
      this.transformToScale(graphics);

      // transform coordinates to pattern space
      var tmpTranslate = [1, 0, 0, 1, -topLeft[0], -topLeft[1]];
      graphics.transform.apply(graphics, tmpTranslate);

      this.clipBbox(graphics, bbox, x0, y0, x1, y1);

      graphics.executeOperatorList(operatorList);
      return tmpCanvas.canvas;
    },

    setScale: function TilingPattern_setScale(width, height, xstep, ystep) {
      this.scale = [width / xstep, height / ystep];
    },

    transformToScale: function TilingPattern_transformToScale(graphics) {
      var scale = this.scale;
      var tmpScale = [scale[0], 0, 0, scale[1], 0, 0];
      graphics.transform.apply(graphics, tmpScale);
    },

    scaleToContext: function TilingPattern_scaleToContext() {
      var scale = this.scale;
      this.ctx.scale(1 / scale[0], 1 / scale[1]);
    },

    clipBbox: function clipBbox(graphics, bbox, x0, y0, x1, y1) {
      if (bbox && isArray(bbox) && 4 == bbox.length) {
        var bboxWidth = x1 - x0;
        var bboxHeight = y1 - y0;
        graphics.rectangle(x0, y0, bboxWidth, bboxHeight);
        graphics.clip();
        graphics.endPath();
      }
    },

    setFillAndStrokeStyleToContext:
      function setFillAndStrokeStyleToContext(context, paintType, color) {
      switch (paintType) {
        case PaintType.COLORED:
          var ctx = this.ctx;
          context.fillStyle = ctx.fillStyle;
          context.strokeStyle = ctx.strokeStyle;
          break;
        case PaintType.UNCOLORED:
          var rgbColor = ColorSpace.singletons.rgb.getRgb(color, 0);
          var cssColor = Util.makeCssRgb(rgbColor);
          context.fillStyle = cssColor;
          context.strokeStyle = cssColor;
          break;
        default:
          error('Unsupported paint type: ' + paintType);
      }
    },

    getPattern: function TilingPattern_getPattern(ctx, owner) {
      var temporaryPatternCanvas = this.createPatternCanvas(owner);

      var ctx = this.ctx;
      ctx.setTransform.apply(ctx, this.baseTransform);
      ctx.transform.apply(ctx, this.matrix);
      this.scaleToContext();

      return ctx.createPattern(temporaryPatternCanvas, 'repeat');
    }
  };

  return TilingPattern;
})();



var PDFFunction = (function PDFFunctionClosure() {
  var CONSTRUCT_SAMPLED = 0;
  var CONSTRUCT_INTERPOLATED = 2;
  var CONSTRUCT_STICHED = 3;
  var CONSTRUCT_POSTSCRIPT = 4;

  return {
    getSampleArray: function PDFFunction_getSampleArray(size, outputSize, bps,
                                                       str) {
      var length = 1;
      for (var i = 0, ii = size.length; i < ii; i++)
        length *= size[i];
      length *= outputSize;

      var array = [];
      var codeSize = 0;
      var codeBuf = 0;
      // 32 is a valid bps so shifting won't work
      var sampleMul = 1.0 / (Math.pow(2.0, bps) - 1);

      var strBytes = str.getBytes((length * bps + 7) / 8);
      var strIdx = 0;
      for (var i = 0; i < length; i++) {
        while (codeSize < bps) {
          codeBuf <<= 8;
          codeBuf |= strBytes[strIdx++];
          codeSize += 8;
        }
        codeSize -= bps;
        array.push((codeBuf >> codeSize) * sampleMul);
        codeBuf &= (1 << codeSize) - 1;
      }
      return array;
    },

    getIR: function PDFFunction_getIR(xref, fn) {
      var dict = fn.dict;
      if (!dict)
        dict = fn;

      var types = [this.constructSampled,
                   null,
                   this.constructInterpolated,
                   this.constructStiched,
                   this.constructPostScript];

      var typeNum = dict.get('FunctionType');
      var typeFn = types[typeNum];
      if (!typeFn)
        error('Unknown type of function');

      return typeFn.call(this, fn, dict, xref);
    },

    fromIR: function PDFFunction_fromIR(IR) {
      var type = IR[0];
      switch (type) {
        case CONSTRUCT_SAMPLED:
          return this.constructSampledFromIR(IR);
        case CONSTRUCT_INTERPOLATED:
          return this.constructInterpolatedFromIR(IR);
        case CONSTRUCT_STICHED:
          return this.constructStichedFromIR(IR);
        //case CONSTRUCT_POSTSCRIPT:
        default:
          return this.constructPostScriptFromIR(IR);
      }
    },

    parse: function PDFFunction_parse(xref, fn) {
      var IR = this.getIR(xref, fn);
      return this.fromIR(IR);
    },

    constructSampled: function PDFFunction_constructSampled(str, dict) {
      function toMultiArray(arr) {
        var inputLength = arr.length;
        var outputLength = arr.length / 2;
        var out = [];
        var index = 0;
        for (var i = 0; i < inputLength; i += 2) {
          out[index] = [arr[i], arr[i + 1]];
          ++index;
        }
        return out;
      }
      var domain = dict.get('Domain');
      var range = dict.get('Range');

      if (!domain || !range)
        error('No domain or range');

      var inputSize = domain.length / 2;
      var outputSize = range.length / 2;

      domain = toMultiArray(domain);
      range = toMultiArray(range);

      var size = dict.get('Size');
      var bps = dict.get('BitsPerSample');
      var order = dict.get('Order') || 1;
      if (order !== 1) {
        // No description how cubic spline interpolation works in PDF32000:2008
        // As in poppler, ignoring order, linear interpolation may work as good
        TODO('No support for cubic spline interpolation: ' + order);
      }

      var encode = dict.get('Encode');
      if (!encode) {
        encode = [];
        for (var i = 0; i < inputSize; ++i) {
          encode.push(0);
          encode.push(size[i] - 1);
        }
      }
      encode = toMultiArray(encode);

      var decode = dict.get('Decode');
      if (!decode)
        decode = range;
      else
        decode = toMultiArray(decode);

      var samples = this.getSampleArray(size, outputSize, bps, str);

      return [
        CONSTRUCT_SAMPLED, inputSize, domain, encode, decode, samples, size,
        outputSize, Math.pow(2, bps) - 1, range
      ];
    },

    constructSampledFromIR: function PDFFunction_constructSampledFromIR(IR) {
      // See chapter 3, page 109 of the PDF reference
      function interpolate(x, xmin, xmax, ymin, ymax) {
        return ymin + ((x - xmin) * ((ymax - ymin) / (xmax - xmin)));
      }

      return function constructSampledFromIRResult(args) {
        // See chapter 3, page 110 of the PDF reference.
        var m = IR[1];
        var domain = IR[2];
        var encode = IR[3];
        var decode = IR[4];
        var samples = IR[5];
        var size = IR[6];
        var n = IR[7];
        var mask = IR[8];
        var range = IR[9];

        if (m != args.length)
          error('Incorrect number of arguments: ' + m + ' != ' +
                args.length);

        var x = args;

        // Building the cube vertices: its part and sample index
        // http://rjwagner49.com/Mathematics/Interpolation.pdf
        var cubeVertices = 1 << m;
        var cubeN = new Float64Array(cubeVertices);
        var cubeVertex = new Uint32Array(cubeVertices);
        for (var j = 0; j < cubeVertices; j++)
          cubeN[j] = 1;

        var k = n, pos = 1;
        // Map x_i to y_j for 0 <= i < m using the sampled function.
        for (var i = 0; i < m; ++i) {
          // x_i' = min(max(x_i, Domain_2i), Domain_2i+1)
          var domain_2i = domain[i][0];
          var domain_2i_1 = domain[i][1];
          var xi = Math.min(Math.max(x[i], domain_2i), domain_2i_1);

          // e_i = Interpolate(x_i', Domain_2i, Domain_2i+1,
          //                   Encode_2i, Encode_2i+1)
          var e = interpolate(xi, domain_2i, domain_2i_1,
                              encode[i][0], encode[i][1]);

          // e_i' = min(max(e_i, 0), Size_i - 1)
          var size_i = size[i];
          e = Math.min(Math.max(e, 0), size_i - 1);

          // Adjusting the cube: N and vertex sample index
          var e0 = e < size_i - 1 ? Math.floor(e) : e - 1; // e1 = e0 + 1;
          var n0 = e0 + 1 - e; // (e1 - e) / (e1 - e0);
          var n1 = e - e0; // (e - e0) / (e1 - e0);
          var offset0 = e0 * k;
          var offset1 = offset0 + k; // e1 * k
          for (var j = 0; j < cubeVertices; j++) {
            if (j & pos) {
              cubeN[j] *= n1;
              cubeVertex[j] += offset1;
            } else {
              cubeN[j] *= n0;
              cubeVertex[j] += offset0;
            }
          }

          k *= size_i;
          pos <<= 1;
        }

        var y = new Float64Array(n);
        for (var j = 0; j < n; ++j) {
          // Sum all cube vertices' samples portions
          var rj = 0;
          for (var i = 0; i < cubeVertices; i++)
            rj += samples[cubeVertex[i] + j] * cubeN[i];

          // r_j' = Interpolate(r_j, 0, 2^BitsPerSample - 1,
          //                    Decode_2j, Decode_2j+1)
          rj = interpolate(rj, 0, 1, decode[j][0], decode[j][1]);

          // y_j = min(max(r_j, range_2j), range_2j+1)
          y[j] = Math.min(Math.max(rj, range[j][0]), range[j][1]);
        }

        return y;
      };
    },

    constructInterpolated: function PDFFunction_constructInterpolated(str,
                                                                      dict) {
      var c0 = dict.get('C0') || [0];
      var c1 = dict.get('C1') || [1];
      var n = dict.get('N');

      if (!isArray(c0) || !isArray(c1))
        error('Illegal dictionary for interpolated function');

      var length = c0.length;
      var diff = [];
      for (var i = 0; i < length; ++i)
        diff.push(c1[i] - c0[i]);

      return [CONSTRUCT_INTERPOLATED, c0, diff, n];
    },

    constructInterpolatedFromIR:
      function PDFFunction_constructInterpolatedFromIR(IR) {
      var c0 = IR[1];
      var diff = IR[2];
      var n = IR[3];

      var length = diff.length;

      return function constructInterpolatedFromIRResult(args) {
        var x = n == 1 ? args[0] : Math.pow(args[0], n);

        var out = [];
        for (var j = 0; j < length; ++j)
          out.push(c0[j] + (x * diff[j]));

        return out;

      };
    },

    constructStiched: function PDFFunction_constructStiched(fn, dict, xref) {
      var domain = dict.get('Domain');

      if (!domain)
        error('No domain');

      var inputSize = domain.length / 2;
      if (inputSize != 1)
        error('Bad domain for stiched function');

      var fnRefs = dict.get('Functions');
      var fns = [];
      for (var i = 0, ii = fnRefs.length; i < ii; ++i)
        fns.push(PDFFunction.getIR(xref, xref.fetchIfRef(fnRefs[i])));

      var bounds = dict.get('Bounds');
      var encode = dict.get('Encode');

      return [CONSTRUCT_STICHED, domain, bounds, encode, fns];
    },

    constructStichedFromIR: function PDFFunction_constructStichedFromIR(IR) {
      var domain = IR[1];
      var bounds = IR[2];
      var encode = IR[3];
      var fnsIR = IR[4];
      var fns = [];

      for (var i = 0, ii = fnsIR.length; i < ii; i++) {
        fns.push(PDFFunction.fromIR(fnsIR[i]));
      }

      return function constructStichedFromIRResult(args) {
        var clip = function constructStichedFromIRClip(v, min, max) {
          if (v > max)
            v = max;
          else if (v < min)
            v = min;
          return v;
        };

        // clip to domain
        var v = clip(args[0], domain[0], domain[1]);
        // calulate which bound the value is in
        for (var i = 0, ii = bounds.length; i < ii; ++i) {
          if (v < bounds[i])
            break;
        }

        // encode value into domain of function
        var dmin = domain[0];
        if (i > 0)
          dmin = bounds[i - 1];
        var dmax = domain[1];
        if (i < bounds.length)
          dmax = bounds[i];

        var rmin = encode[2 * i];
        var rmax = encode[2 * i + 1];

        var v2 = rmin + (v - dmin) * (rmax - rmin) / (dmax - dmin);

        // call the appropropriate function
        return fns[i]([v2]);
      };
    },

    constructPostScript: function PDFFunction_constructPostScript(fn, dict,
                                                                  xref) {
      var domain = dict.get('Domain');
      var range = dict.get('Range');

      if (!domain)
        error('No domain.');

      if (!range)
        error('No range.');

      var lexer = new PostScriptLexer(fn);
      var parser = new PostScriptParser(lexer);
      var code = parser.parse();

      return [CONSTRUCT_POSTSCRIPT, domain, range, code];
    },

    constructPostScriptFromIR: function PDFFunction_constructPostScriptFromIR(
                                          IR) {
      var domain = IR[1];
      var range = IR[2];
      var code = IR[3];
      var numOutputs = range.length / 2;
      var evaluator = new PostScriptEvaluator(code);
      // Cache the values for a big speed up, the cache size is limited though
      // since the number of possible values can be huge from a PS function.
      var cache = new FunctionCache();
      return function constructPostScriptFromIRResult(args) {
        var initialStack = [];
        for (var i = 0, ii = (domain.length / 2); i < ii; ++i) {
          initialStack.push(args[i]);
        }

        var key = initialStack.join('_');
        if (cache.has(key))
          return cache.get(key);

        var stack = evaluator.execute(initialStack);
        var transformed = [];
        for (i = numOutputs - 1; i >= 0; --i) {
          var out = stack.pop();
          var rangeIndex = 2 * i;
          if (out < range[rangeIndex])
            out = range[rangeIndex];
          else if (out > range[rangeIndex + 1])
            out = range[rangeIndex + 1];
          transformed[i] = out;
        }
        cache.set(key, transformed);
        return transformed;
      };
    }
  };
})();

var FunctionCache = (function FunctionCacheClosure() {
  // Of 10 PDF's with type4 functions the maxium number of distinct values seen
  // was 256. This still may need some tweaking in the future though.
  var MAX_CACHE_SIZE = 1024;
  function FunctionCache() {
    this.cache = {};
    this.total = 0;
  }
  FunctionCache.prototype = {
    has: function FunctionCache_has(key) {
      return key in this.cache;
    },
    get: function FunctionCache_get(key) {
      return this.cache[key];
    },
    set: function FunctionCache_set(key, value) {
      if (this.total < MAX_CACHE_SIZE) {
        this.cache[key] = value;
        this.total++;
      }
    }
  };
  return FunctionCache;
})();

var PostScriptStack = (function PostScriptStackClosure() {
  var MAX_STACK_SIZE = 100;
  function PostScriptStack(initialStack) {
    this.stack = initialStack || [];
  }

  PostScriptStack.prototype = {
    push: function PostScriptStack_push(value) {
      if (this.stack.length >= MAX_STACK_SIZE)
        error('PostScript function stack overflow.');
      this.stack.push(value);
    },
    pop: function PostScriptStack_pop() {
      if (this.stack.length <= 0)
        error('PostScript function stack underflow.');
      return this.stack.pop();
    },
    copy: function PostScriptStack_copy(n) {
      if (this.stack.length + n >= MAX_STACK_SIZE)
        error('PostScript function stack overflow.');
      var stack = this.stack;
      for (var i = stack.length - n, j = n - 1; j >= 0; j--, i++)
        stack.push(stack[i]);
    },
    index: function PostScriptStack_index(n) {
      this.push(this.stack[this.stack.length - n - 1]);
    },
    // rotate the last n stack elements p times
    roll: function PostScriptStack_roll(n, p) {
      var stack = this.stack;
      var l = stack.length - n;
      var r = stack.length - 1, c = l + (p - Math.floor(p / n) * n), i, j, t;
      for (i = l, j = r; i < j; i++, j--) {
        t = stack[i]; stack[i] = stack[j]; stack[j] = t;
      }
      for (i = l, j = c - 1; i < j; i++, j--) {
        t = stack[i]; stack[i] = stack[j]; stack[j] = t;
      }
      for (i = c, j = r; i < j; i++, j--) {
        t = stack[i]; stack[i] = stack[j]; stack[j] = t;
      }
    }
  };
  return PostScriptStack;
})();
var PostScriptEvaluator = (function PostScriptEvaluatorClosure() {
  function PostScriptEvaluator(operators, operands) {
    this.operators = operators;
    this.operands = operands;
  }
  PostScriptEvaluator.prototype = {
    execute: function PostScriptEvaluator_execute(initialStack) {
      var stack = new PostScriptStack(initialStack);
      var counter = 0;
      var operators = this.operators;
      var length = operators.length;
      var operator, a, b;
      while (counter < length) {
        operator = operators[counter++];
        if (typeof operator == 'number') {
          // Operator is really an operand and should be pushed to the stack.
          stack.push(operator);
          continue;
        }
        switch (operator) {
          // non standard ps operators
          case 'jz': // jump if false
            b = stack.pop();
            a = stack.pop();
            if (!a)
              counter = b;
            break;
          case 'j': // jump
            a = stack.pop();
            counter = a;
            break;

          // all ps operators in alphabetical order (excluding if/ifelse)
          case 'abs':
            a = stack.pop();
            stack.push(Math.abs(a));
            break;
          case 'add':
            b = stack.pop();
            a = stack.pop();
            stack.push(a + b);
            break;
          case 'and':
            b = stack.pop();
            a = stack.pop();
            if (isBool(a) && isBool(b))
              stack.push(a && b);
            else
              stack.push(a & b);
            break;
          case 'atan':
            a = stack.pop();
            stack.push(Math.atan(a));
            break;
          case 'bitshift':
            b = stack.pop();
            a = stack.pop();
            if (a > 0)
              stack.push(a << b);
            else
              stack.push(a >> b);
            break;
          case 'ceiling':
            a = stack.pop();
            stack.push(Math.ceil(a));
            break;
          case 'copy':
            a = stack.pop();
            stack.copy(a);
            break;
          case 'cos':
            a = stack.pop();
            stack.push(Math.cos(a));
            break;
          case 'cvi':
            a = stack.pop() | 0;
            stack.push(a);
            break;
          case 'cvr':
            // noop
            break;
          case 'div':
            b = stack.pop();
            a = stack.pop();
            stack.push(a / b);
            break;
          case 'dup':
            stack.copy(1);
            break;
          case 'eq':
            b = stack.pop();
            a = stack.pop();
            stack.push(a == b);
            break;
          case 'exch':
            stack.roll(2, 1);
            break;
          case 'exp':
            b = stack.pop();
            a = stack.pop();
            stack.push(Math.pow(a, b));
            break;
          case 'false':
            stack.push(false);
            break;
          case 'floor':
            a = stack.pop();
            stack.push(Math.floor(a));
            break;
          case 'ge':
            b = stack.pop();
            a = stack.pop();
            stack.push(a >= b);
            break;
          case 'gt':
            b = stack.pop();
            a = stack.pop();
            stack.push(a > b);
            break;
          case 'idiv':
            b = stack.pop();
            a = stack.pop();
            stack.push((a / b) | 0);
            break;
          case 'index':
            a = stack.pop();
            stack.index(a);
            break;
          case 'le':
            b = stack.pop();
            a = stack.pop();
            stack.push(a <= b);
            break;
          case 'ln':
            a = stack.pop();
            stack.push(Math.log(a));
            break;
          case 'log':
            a = stack.pop();
            stack.push(Math.log(a) / Math.LN10);
            break;
          case 'lt':
            b = stack.pop();
            a = stack.pop();
            stack.push(a < b);
            break;
          case 'mod':
            b = stack.pop();
            a = stack.pop();
            stack.push(a % b);
            break;
          case 'mul':
            b = stack.pop();
            a = stack.pop();
            stack.push(a * b);
            break;
          case 'ne':
            b = stack.pop();
            a = stack.pop();
            stack.push(a != b);
            break;
          case 'neg':
            a = stack.pop();
            stack.push(-b);
            break;
          case 'not':
            a = stack.pop();
            if (isBool(a) && isBool(b))
              stack.push(a && b);
            else
              stack.push(a & b);
            break;
          case 'or':
            b = stack.pop();
            a = stack.pop();
            if (isBool(a) && isBool(b))
              stack.push(a || b);
            else
              stack.push(a | b);
            break;
          case 'pop':
            stack.pop();
            break;
          case 'roll':
            b = stack.pop();
            a = stack.pop();
            stack.roll(a, b);
            break;
          case 'round':
            a = stack.pop();
            stack.push(Math.round(a));
            break;
          case 'sin':
            a = stack.pop();
            stack.push(Math.sin(a));
            break;
          case 'sqrt':
            a = stack.pop();
            stack.push(Math.sqrt(a));
            break;
          case 'sub':
            b = stack.pop();
            a = stack.pop();
            stack.push(a - b);
            break;
          case 'true':
            stack.push(true);
            break;
          case 'truncate':
            a = stack.pop();
            a = a < 0 ? Math.ceil(a) : Math.floor(a);
            stack.push(a);
            break;
          case 'xor':
            b = stack.pop();
            a = stack.pop();
            if (isBool(a) && isBool(b))
              stack.push(a != b);
            else
              stack.push(a ^ b);
            break;
          default:
            error('Unknown operator ' + operator);
            break;
        }
      }
      return stack.stack;
    }
  };
  return PostScriptEvaluator;
})();

var PostScriptParser = (function PostScriptParserClosure() {
  function PostScriptParser(lexer) {
    this.lexer = lexer;
    this.operators = [];
    this.token = null;
    this.prev = null;
  }
  PostScriptParser.prototype = {
    nextToken: function PostScriptParser_nextToken() {
      this.prev = this.token;
      this.token = this.lexer.getToken();
    },
    accept: function PostScriptParser_accept(type) {
      if (this.token.type == type) {
        this.nextToken();
        return true;
      }
      return false;
    },
    expect: function PostScriptParser_expect(type) {
      if (this.accept(type))
        return true;
      error('Unexpected symbol: found ' + this.token.type + ' expected ' +
            type + '.');
    },
    parse: function PostScriptParser_parse() {
      this.nextToken();
      this.expect(PostScriptTokenTypes.LBRACE);
      this.parseBlock();
      this.expect(PostScriptTokenTypes.RBRACE);
      return this.operators;
    },
    parseBlock: function PostScriptParser_parseBlock() {
      while (true) {
        if (this.accept(PostScriptTokenTypes.NUMBER)) {
          this.operators.push(this.prev.value);
        } else if (this.accept(PostScriptTokenTypes.OPERATOR)) {
          this.operators.push(this.prev.value);
        } else if (this.accept(PostScriptTokenTypes.LBRACE)) {
          this.parseCondition();
        } else {
          return;
        }
      }
    },
    parseCondition: function PostScriptParser_parseCondition() {
      // Add two place holders that will be updated later
      var conditionLocation = this.operators.length;
      this.operators.push(null, null);

      this.parseBlock();
      this.expect(PostScriptTokenTypes.RBRACE);
      if (this.accept(PostScriptTokenTypes.IF)) {
        // The true block is right after the 'if' so it just falls through on
        // true else it jumps and skips the true block.
        this.operators[conditionLocation] = this.operators.length;
        this.operators[conditionLocation + 1] = 'jz';
      } else if (this.accept(PostScriptTokenTypes.LBRACE)) {
        var jumpLocation = this.operators.length;
        this.operators.push(null, null);
        var endOfTrue = this.operators.length;
        this.parseBlock();
        this.expect(PostScriptTokenTypes.RBRACE);
        this.expect(PostScriptTokenTypes.IFELSE);
        // The jump is added at the end of the true block to skip the false
        // block.
        this.operators[jumpLocation] = this.operators.length;
        this.operators[jumpLocation + 1] = 'j';

        this.operators[conditionLocation] = endOfTrue;
        this.operators[conditionLocation + 1] = 'jz';
      } else {
        error('PS Function: error parsing conditional.');
      }
    }
  };
  return PostScriptParser;
})();

var PostScriptTokenTypes = {
  LBRACE: 0,
  RBRACE: 1,
  NUMBER: 2,
  OPERATOR: 3,
  IF: 4,
  IFELSE: 5
};

var PostScriptToken = (function PostScriptTokenClosure() {
  function PostScriptToken(type, value) {
    this.type = type;
    this.value = value;
  }

  var opCache = {};

  PostScriptToken.getOperator = function PostScriptToken_getOperator(op) {
    var opValue = opCache[op];
    if (opValue)
      return opValue;

    return opCache[op] = new PostScriptToken(PostScriptTokenTypes.OPERATOR, op);
  };

  PostScriptToken.LBRACE = new PostScriptToken(PostScriptTokenTypes.LBRACE,
                                                '{');
  PostScriptToken.RBRACE = new PostScriptToken(PostScriptTokenTypes.RBRACE,
                                                '}');
  PostScriptToken.IF = new PostScriptToken(PostScriptTokenTypes.IF, 'IF');
  PostScriptToken.IFELSE = new PostScriptToken(PostScriptTokenTypes.IFELSE,
                                                'IFELSE');
  return PostScriptToken;
})();

var PostScriptLexer = (function PostScriptLexerClosure() {
  function PostScriptLexer(stream) {
    this.stream = stream;
    this.nextChar();
  }
  PostScriptLexer.prototype = {
    nextChar: function PostScriptLexer_nextChar() {
      return (this.currentChar = this.stream.getByte());
    },
    getToken: function PostScriptLexer_getToken() {
      var s = '';
      var comment = false;
      var ch = this.currentChar;

      // skip comments
      while (true) {
        if (ch < 0) {
          return EOF;
        }

        if (comment) {
          if (ch === 0x0A || ch === 0x0D) {
            comment = false;
          }
        } else if (ch == 0x25) { // '%'
          comment = true;
        } else if (!Lexer.isSpace(ch)) {
          break;
        }
        ch = this.nextChar();
      }
      switch (ch | 0) {
        case 0x30: case 0x31: case 0x32: case 0x33: case 0x34: // '0'-'4'
        case 0x35: case 0x36: case 0x37: case 0x38: case 0x39: // '5'-'9'
        case 0x2B: case 0x2D: case 0x2E: // '+', '-', '.'
          return new PostScriptToken(PostScriptTokenTypes.NUMBER,
                                      this.getNumber());
        case 0x7B: // '{'
          this.nextChar();
          return PostScriptToken.LBRACE;
        case 0x7D: // '}'
          this.nextChar();
          return PostScriptToken.RBRACE;
      }
      // operator
      var str = String.fromCharCode(ch);
      while ((ch = this.nextChar()) >= 0 && // and 'A'-'Z', 'a'-'z'
             ((ch >= 0x41 && ch <= 0x5A) || (ch >= 0x61 && ch <= 0x7A))) {
        str += String.fromCharCode(ch);
      }
      switch (str.toLowerCase()) {
        case 'if':
          return PostScriptToken.IF;
        case 'ifelse':
          return PostScriptToken.IFELSE;
        default:
          return PostScriptToken.getOperator(str);
      }
    },
    getNumber: function PostScriptLexer_getNumber() {
      var ch = this.currentChar;
      var str = String.fromCharCode(ch);
      while ((ch = this.nextChar()) >= 0) {
        if ((ch >= 0x30 && ch <= 0x39) || // '0'-'9'
             ch === 0x2D || ch === 0x2E) { // '-', '.'
          str += String.fromCharCode(ch);
        } else {
          break;
        }
      }
      var value = parseFloat(str);
      if (isNaN(value))
        error('Invalid floating point number: ' + value);
      return value;
    }
  };
  return PostScriptLexer;
})();



var Annotation = (function AnnotationClosure() {
  // 12.5.5: Algorithm: Appearance streams
  function getTransformMatrix(rect, bbox, matrix) {
    var bounds = Util.getAxialAlignedBoundingBox(bbox, matrix);
    var minX = bounds[0];
    var minY = bounds[1];
    var maxX = bounds[2];
    var maxY = bounds[3];

    if (minX === maxX || minY === maxY) {
      // From real-life file, bbox was [0, 0, 0, 0]. In this case,
      // just apply the transform for rect
      return [1, 0, 0, 1, rect[0], rect[1]];
    }

    var xRatio = (rect[2] - rect[0]) / (maxX - minX);
    var yRatio = (rect[3] - rect[1]) / (maxY - minY);
    return [
      xRatio,
      0,
      0,
      yRatio,
      rect[0] - minX * xRatio,
      rect[1] - minY * yRatio
    ];
  }

  function getDefaultAppearance(dict) {
    var appearanceState = dict.get('AP');
    if (!isDict(appearanceState)) {
      return;
    }

    var appearance;
    var appearances = appearanceState.get('N');
    if (isDict(appearances)) {
      var as = dict.get('AS');
      if (as && appearances.has(as.name)) {
        appearance = appearances.get(as.name);
      }
    } else {
      appearance = appearances;
    }
    return appearance;
  }

  function Annotation(params) {
    if (params.data) {
      this.data = params.data;
      return;
    }

    var dict = params.dict;
    var data = this.data = {};

    data.subtype = dict.get('Subtype').name;
    var rect = dict.get('Rect');
    data.rect = Util.normalizeRect(rect);
    data.annotationFlags = dict.get('F');

    var color = dict.get('C');
    if (isArray(color) && color.length === 3) {
      // TODO(mack): currently only supporting rgb; need support different
      // colorspaces
      data.color = color;
    } else {
      data.color = [0, 0, 0];
    }

    // Some types of annotations have border style dict which has more
    // info than the border array
    if (dict.has('BS')) {
      var borderStyle = dict.get('BS');
      data.borderWidth = borderStyle.has('W') ? borderStyle.get('W') : 1;
    } else {
      var borderArray = dict.get('Border') || [0, 0, 1];
      data.borderWidth = borderArray[2] || 0;
    }

    this.appearance = getDefaultAppearance(dict);
    data.hasAppearance = !!this.appearance;
  }

  Annotation.prototype = {

    getData: function Annotation_getData() {
      return this.data;
    },

    hasHtml: function Annotation_hasHtml() {
      return false;
    },

    getHtmlElement: function Annotation_getHtmlElement(commonObjs) {
      throw new NotImplementedException(
        'getHtmlElement() should be implemented in subclass');
    },

    // TODO(mack): Remove this, it's not really that helpful.
    getEmptyContainer: function Annotation_getEmptyContainer(tagName, rect) {
      assert(!isWorker,
        'getEmptyContainer() should be called from main thread');

      rect = rect || this.data.rect;
      var element = document.createElement(tagName);
      element.style.width = Math.ceil(rect[2] - rect[0]) + 'px';
      element.style.height = Math.ceil(rect[3] - rect[1]) + 'px';
      return element;
    },

    isViewable: function Annotation_isViewable() {
      var data = this.data;
      return !!(
        data &&
        (!data.annotationFlags ||
         !(data.annotationFlags & 0x22)) && // Hidden or NoView
        data.rect                            // rectangle is nessessary
      );
    },

    loadResources: function(keys) {
      var promise = new Promise();
      this.appearance.dict.getAsync('Resources').then(function(resources) {
        if (!resources) {
          promise.resolve();
          return;
        }
        var objectLoader = new ObjectLoader(resources.map,
                                            keys,
                                            resources.xref);
        objectLoader.load().then(function() {
          promise.resolve(resources);
        });
      }.bind(this));

      return promise;
    },

    getOperatorList: function Annotation_getToOperatorList(evaluator) {

      var promise = new Promise();

      if (!this.appearance) {
        promise.resolve(new OperatorList());
        return promise;
      }

      var data = this.data;

      var appearanceDict = this.appearance.dict;
      var resourcesPromise = this.loadResources([
        'ExtGState',
        'ColorSpace',
        'Pattern',
        'Shading',
        'XObject',
        'Font'
        // ProcSet
        // Properties
      ]);
      var bbox = appearanceDict.get('BBox') || [0, 0, 1, 1];
      var matrix = appearanceDict.get('Matrix') || [1, 0, 0, 1, 0 ,0];
      var transform = getTransformMatrix(data.rect, bbox, matrix);

      var border = data.border;

      resourcesPromise.then(function(resources) {
        var opList = new OperatorList();
        opList.addOp(OPS.beginAnnotation, [data.rect, transform, matrix]);
        evaluator.getOperatorList(this.appearance, resources, opList);
        opList.addOp(OPS.endAnnotation, []);
        promise.resolve(opList);
      }.bind(this));

      return promise;
    }
  };

  Annotation.getConstructor =
      function Annotation_getConstructor(subtype, fieldType) {

    if (!subtype) {
      return;
    }

    // TODO(mack): Implement FreeText annotations
    if (subtype === 'Link') {
      return LinkAnnotation;
    } else if (subtype === 'Text') {
      return TextAnnotation;
    } else if (subtype === 'Widget') {
      if (!fieldType) {
        return;
      }

      if (fieldType === 'Tx') {
        return TextWidgetAnnotation;
      } else {
        return WidgetAnnotation;
      }
    } else {
      return Annotation;
    }
  };

  // TODO(mack): Support loading annotation from data
  Annotation.fromData = function Annotation_fromData(data) {
    var subtype = data.subtype;
    var fieldType = data.fieldType;
    var Constructor = Annotation.getConstructor(subtype, fieldType);
    if (Constructor) {
      return new Constructor({ data: data });
    }
  };

  Annotation.fromRef = function Annotation_fromRef(xref, ref) {

    var dict = xref.fetchIfRef(ref);
    if (!isDict(dict)) {
      return;
    }

    var subtype = dict.get('Subtype');
    subtype = isName(subtype) ? subtype.name : '';
    if (!subtype) {
      return;
    }

    var fieldType = Util.getInheritableProperty(dict, 'FT');
    fieldType = isName(fieldType) ? fieldType.name : '';

    var Constructor = Annotation.getConstructor(subtype, fieldType);
    if (!Constructor) {
      return;
    }

    var params = {
      dict: dict,
      ref: ref,
    };

    var annotation = new Constructor(params);

    if (annotation.isViewable()) {
      return annotation;
    } else {
      TODO('unimplemented annotation type: ' + subtype);
    }
  };

  Annotation.appendToOperatorList = function Annotation_appendToOperatorList(
      annotations, opList, pdfManager, partialEvaluator) {

    function reject(e) {
      annotationsReadyPromise.reject(e);
    }

    var annotationsReadyPromise = new Promise();

    var annotationPromises = [];
    for (var i = 0, n = annotations.length; i < n; ++i) {
      annotationPromises.push(annotations[i].getOperatorList(partialEvaluator));
    }
    Promise.all(annotationPromises).then(function(datas) {
      opList.addOp(OPS.beginAnnotations, []);
      for (var i = 0, n = datas.length; i < n; ++i) {
        var annotOpList = datas[i];
        opList.addOpList(annotOpList);
      }
      opList.addOp(OPS.endAnnotations, []);
      annotationsReadyPromise.resolve();
    }, reject);

    return annotationsReadyPromise;
  };

  return Annotation;
})();
PDFJS.Annotation = Annotation;


var WidgetAnnotation = (function WidgetAnnotationClosure() {

  function WidgetAnnotation(params) {
    Annotation.call(this, params);

    if (params.data) {
      return;
    }

    var dict = params.dict;
    var data = this.data;

    data.fieldValue = stringToPDFString(
      Util.getInheritableProperty(dict, 'V') || '');
    data.alternativeText = stringToPDFString(dict.get('TU') || '');
    data.defaultAppearance = Util.getInheritableProperty(dict, 'DA') || '';
    var fieldType = Util.getInheritableProperty(dict, 'FT');
    data.fieldType = isName(fieldType) ? fieldType.name : '';
    data.fieldFlags = Util.getInheritableProperty(dict, 'Ff') || 0;
    this.fieldResources = Util.getInheritableProperty(dict, 'DR') || new Dict();

    // Building the full field name by collecting the field and
    // its ancestors 'T' data and joining them using '.'.
    var fieldName = [];
    var namedItem = dict;
    var ref = params.ref;
    while (namedItem) {
      var parent = namedItem.get('Parent');
      var parentRef = namedItem.getRaw('Parent');
      var name = namedItem.get('T');
      if (name) {
        fieldName.unshift(stringToPDFString(name));
      } else {
        // The field name is absent, that means more than one field
        // with the same name may exist. Replacing the empty name
        // with the '`' plus index in the parent's 'Kids' array.
        // This is not in the PDF spec but necessary to id the
        // the input controls.
        var kids = parent.get('Kids');
        var j, jj;
        for (j = 0, jj = kids.length; j < jj; j++) {
          var kidRef = kids[j];
          if (kidRef.num == ref.num && kidRef.gen == ref.gen)
            break;
        }
        fieldName.unshift('`' + j);
      }
      namedItem = parent;
      ref = parentRef;
    }
    data.fullName = fieldName.join('.');
  }

  var parent = Annotation.prototype;
  Util.inherit(WidgetAnnotation, Annotation, {
    isViewable: function WidgetAnnotation_isViewable() {
      if (this.data.fieldType === 'Sig') {
        TODO('unimplemented annotation type: Widget signature');
        return false;
      }

      return parent.isViewable.call(this);
    }
  });

  return WidgetAnnotation;
})();

var TextWidgetAnnotation = (function TextWidgetAnnotationClosure() {
  function TextWidgetAnnotation(params) {
    WidgetAnnotation.call(this, params);

    if (params.data) {
      return;
    }

    this.data.textAlignment = Util.getInheritableProperty(params.dict, 'Q');
  }

  // TODO(mack): This dupes some of the logic in CanvasGraphics.setFont()
  function setTextStyles(element, item, fontObj) {

    var style = element.style;
    style.fontSize = item.fontSize + 'px';
    style.direction = item.fontDirection < 0 ? 'rtl': 'ltr';

    if (!fontObj) {
      return;
    }

    style.fontWeight = fontObj.black ?
                            (fontObj.bold ? 'bolder' : 'bold') :
                            (fontObj.bold ? 'bold' : 'normal');
    style.fontStyle = fontObj.italic ? 'italic' : 'normal';

    var fontName = fontObj.loadedName;
    var fontFamily = fontName ? '"' + fontName + '", ' : '';
    // Use a reasonable default font if the font doesn't specify a fallback
    var fallbackName = fontObj.fallbackName || 'Helvetica, sans-serif';
    style.fontFamily = fontFamily + fallbackName;
  }


  var parent = WidgetAnnotation.prototype;
  Util.inherit(TextWidgetAnnotation, WidgetAnnotation, {
    hasHtml: function TextWidgetAnnotation_hasHtml() {
      return !this.data.hasAppearance && !!this.data.fieldValue;
    },

    getHtmlElement: function TextWidgetAnnotation_getHtmlElement(commonObjs) {
      assert(!isWorker, 'getHtmlElement() shall be called from main thread');

      var item = this.data;

      var element = this.getEmptyContainer('div');
      element.style.display = 'table';

      var content = document.createElement('div');
      content.textContent = item.fieldValue;
      var textAlignment = item.textAlignment;
      content.style.textAlign = ['left', 'center', 'right'][textAlignment];
      content.style.verticalAlign = 'middle';
      content.style.display = 'table-cell';

      var fontObj = item.fontRefName ?
                    commonObjs.getData(item.fontRefName) : null;
      var cssRules = setTextStyles(content, item, fontObj);

      element.appendChild(content);

      return element;
    },

    getOperatorList: function TextWidgetAnnotation_getOperatorList(evaluator) {
      if (this.appearance) {
        return Annotation.prototype.getOperatorList.call(this, evaluator);
      }

      var promise = new Promise();
      var opList = new OperatorList();
      var data = this.data;

      // Even if there is an appearance stream, ignore it. This is the
      // behaviour used by Adobe Reader.

      var defaultAppearance = data.defaultAppearance;
      if (!defaultAppearance) {
        promise.resolve(opList);
        return promise;
      }

      // Include any font resources found in the default appearance

      var stream = new Stream(stringToBytes(defaultAppearance));
      evaluator.getOperatorList(stream, this.fieldResources, opList);
      var appearanceFnArray = opList.fnArray;
      var appearanceArgsArray = opList.argsArray;
      var fnArray = [];
      var argsArray = [];

      // TODO(mack): Add support for stroke color
      data.rgb = [0, 0, 0];
      // TODO THIS DOESN'T MAKE ANY SENSE SINCE THE fnArray IS EMPTY!
      for (var i = 0, n = fnArray.length; i < n; ++i) {
        var fnId = appearanceFnArray[i];
        var args = appearanceArgsArray[i];

        if (fnId === OPS.setFont) {
          data.fontRefName = args[0];
          var size = args[1];
          if (size < 0) {
            data.fontDirection = -1;
            data.fontSize = -size;
          } else {
            data.fontDirection = 1;
            data.fontSize = size;
          }
        } else if (fnId === OPS.setFillRGBColor) {
          data.rgb = args;
        } else if (fnId === OPS.setFillGray) {
          var rgbValue = args[0] * 255;
          data.rgb = [rgbValue, rgbValue, rgbValue];
        }
      }
      promise.resolve(opList);
      return promise;
    }
  });

  return TextWidgetAnnotation;
})();

var TextAnnotation = (function TextAnnotationClosure() {
  function TextAnnotation(params) {
    Annotation.call(this, params);

    if (params.data) {
      return;
    }

    var dict = params.dict;
    var data = this.data;

    var content = dict.get('Contents');
    var title = dict.get('T');
    data.content = stringToPDFString(content || '');
    data.title = stringToPDFString(title || '');
    data.name = !dict.has('Name') ? 'Note' : dict.get('Name').name;
  }

  var ANNOT_MIN_SIZE = 10;

  Util.inherit(TextAnnotation, Annotation, {

    getOperatorList: function TextAnnotation_getOperatorList(evaluator) {
      var promise = new Promise();
      promise.resolve(new OperatorList());
      return promise;
    },

    hasHtml: function TextAnnotation_hasHtml() {
      return true;
    },

    getHtmlElement: function TextAnnotation_getHtmlElement(commonObjs) {
      assert(!isWorker, 'getHtmlElement() shall be called from main thread');

      var item = this.data;
      var rect = item.rect;

      // sanity check because of OOo-generated PDFs
      if ((rect[3] - rect[1]) < ANNOT_MIN_SIZE) {
        rect[3] = rect[1] + ANNOT_MIN_SIZE;
      }
      if ((rect[2] - rect[0]) < ANNOT_MIN_SIZE) {
        rect[2] = rect[0] + (rect[3] - rect[1]); // make it square
      }

      var container = this.getEmptyContainer('section', rect);
      container.className = 'annotText';

      var image = document.createElement('img');
      image.style.height = container.style.height;
      var iconName = item.name;
      image.src = PDFJS.imageResourcesPath + 'annotation-' +
        iconName.toLowerCase() + '.svg';
      image.alt = '[{{type}} Annotation]';
      image.dataset.l10nId = 'text_annotation_type';
      image.dataset.l10nArgs = JSON.stringify({type: iconName});
      var content = document.createElement('div');
      content.setAttribute('hidden', true);
      var title = document.createElement('h1');
      var text = document.createElement('p');
      content.style.left = Math.floor(rect[2] - rect[0]) + 'px';
      content.style.top = '0px';
      title.textContent = item.title;

      if (!item.content && !item.title) {
        content.setAttribute('hidden', true);
      } else {
        var e = document.createElement('span');
        var lines = item.content.split(/(?:\r\n?|\n)/);
        for (var i = 0, ii = lines.length; i < ii; ++i) {
          var line = lines[i];
          e.appendChild(document.createTextNode(line));
          if (i < (ii - 1))
            e.appendChild(document.createElement('br'));
        }
        text.appendChild(e);

        var showAnnotation = function showAnnotation() {
          container.style.zIndex += 1;
          content.removeAttribute('hidden');
        };

        var hideAnnotation = function hideAnnotation(e) {
          if (e.toElement || e.relatedTarget) { // No context menu is used
            container.style.zIndex -= 1;
            content.setAttribute('hidden', true);
          }
        };

        content.addEventListener('mouseover', showAnnotation, false);
        content.addEventListener('mouseout', hideAnnotation, false);
        image.addEventListener('mouseover', showAnnotation, false);
        image.addEventListener('mouseout', hideAnnotation, false);
      }

      content.appendChild(title);
      content.appendChild(text);
      container.appendChild(image);
      container.appendChild(content);

      return container;
    }
  });

  return TextAnnotation;
})();

var LinkAnnotation = (function LinkAnnotationClosure() {
  function LinkAnnotation(params) {
    Annotation.call(this, params);

    if (params.data) {
      return;
    }

    var dict = params.dict;
    var data = this.data;

    var action = dict.get('A');
    if (action) {
      var linkType = action.get('S').name;
      if (linkType === 'URI') {
        var url = addDefaultProtocolToUrl(action.get('URI'));
        // TODO: pdf spec mentions urls can be relative to a Base
        // entry in the dictionary.
        if (!isValidUrl(url, false)) {
          url = '';
        }
        data.url = url;
      } else if (linkType === 'GoTo') {
        data.dest = action.get('D');
      } else if (linkType === 'GoToR') {
        var urlDict = action.get('F');
        if (isDict(urlDict)) {
          // We assume that the 'url' is a Filspec dictionary
          // and fetch the url without checking any further
          url = urlDict.get('F') || '';
        }

        // TODO: pdf reference says that GoToR
        // can also have 'NewWindow' attribute
        if (!isValidUrl(url, false)) {
          url = '';
        }
        data.url = url;
        data.dest = action.get('D');
      } else if (linkType === 'Named') {
        data.action = action.get('N').name;
      } else {
        TODO('unrecognized link type: ' + linkType);
      }
    } else if (dict.has('Dest')) {
      // simple destination link
      var dest = dict.get('Dest');
      data.dest = isName(dest) ? dest.name : dest;
    }
  }

  // Lets URLs beginning with 'www.' default to using the 'http://' protocol.
  function addDefaultProtocolToUrl(url) {
    if (url.indexOf('www.') === 0) {
      return ('http://' + url);
    }
    return url;
  }

  Util.inherit(LinkAnnotation, Annotation, {
    hasOperatorList: function LinkAnnotation_hasOperatorList() {
      return false;
    },

    hasHtml: function LinkAnnotation_hasHtml() {
      return true;
    },

    getHtmlElement: function LinkAnnotation_getHtmlElement(commonObjs) {
      var rect = this.data.rect;
      var element = document.createElement('a');
      var borderWidth = this.data.borderWidth;

      element.style.borderWidth = borderWidth + 'px';
      var color = this.data.color;
      var rgb = [];
      for (var i = 0; i < 3; ++i) {
        rgb[i] = Math.round(color[i] * 255);
      }
      element.style.borderColor = Util.makeCssRgb(rgb);
      element.style.borderStyle = 'solid';

      var width = rect[2] - rect[0] - 2 * borderWidth;
      var height = rect[3] - rect[1] - 2 * borderWidth;
      element.style.width = width + 'px';
      element.style.height = height + 'px';

      element.href = this.data.url || '';
      return element;
    }
  });

  return LinkAnnotation;
})();


/**
 * The maximum allowed image size in total pixels e.g. width * height. Images
 * above this value will not be drawn. Use -1 for no limit.
 * @var {Number}
 */
PDFJS.maxImageSize = PDFJS.maxImageSize === undefined ? -1 : PDFJS.maxImageSize;

/**
 * By default fonts are converted to OpenType fonts and loaded via font face
 * rules. If disabled, the font will be rendered using a built in font renderer
 * that constructs the glyphs with primitive path commands.
 * @var {Boolean}
 */
PDFJS.disableFontFace = PDFJS.disableFontFace === undefined ?
                        false : PDFJS.disableFontFace;

/**
 * Path for image resources, mainly for annotation icons. Include trailing
 * slash.
 * @var {String}
 */
PDFJS.imageResourcesPath = PDFJS.imageResourcesPath === undefined ?
                           '' : PDFJS.imageResourcesPath;

/**
 * Disable the web worker and run all code on the main thread. This will happen
 * automatically if the browser doesn't support workers or sending typed arrays
 * to workers.
 * @var {Boolean}
 */
PDFJS.disableWorker = PDFJS.disableWorker === undefined ?
                      false : PDFJS.disableWorker;

/**
 * Path and filename of the worker file. Required when the worker is enabled in
 * development mode. If unspecified in the production build, the worker will be
 * loaded based on the location of the pdf.js file.
 * @var {String}
 */
PDFJS.workerSrc = PDFJS.workerSrc === undefined ? null : PDFJS.workerSrc;

/**
 * Disable range request loading of PDF files. When enabled and if the server
 * supports partial content requests then the PDF will be fetched in chunks.
 * Enabled (false) by default.
 * @var {Boolean}
 */
PDFJS.disableRange = PDFJS.disableRange === undefined ?
                     false : PDFJS.disableRange;

/**
 * Disable pre-fetching of PDF file data. When range requests are enabled PDF.js
 * will automatically keep fetching more data even if it isn't needed to display
 * the current page. This default behavior can be disabled.
 * @var {Boolean}
 */
PDFJS.disableAutoFetch = PDFJS.disableAutoFetch === undefined ?
                         false : PDFJS.disableAutoFetch;

/**
 * Enables special hooks for debugging PDF.js.
 * @var {Boolean}
 */
PDFJS.pdfBug = PDFJS.pdfBug === undefined ? false : PDFJS.pdfBug;

/**
 * Enables transfer usage in postMessage for ArrayBuffers.
 * @var {boolean}
 */
PDFJS.postMessageTransfers = PDFJS.postMessageTransfers === undefined ?
                             true : PDFJS.postMessageTransfers;
/**
 * This is the main entry point for loading a PDF and interacting with it.
 * NOTE: If a URL is used to fetch the PDF data a standard XMLHttpRequest(XHR)
 * is used, which means it must follow the same origin rules that any XHR does
 * e.g. No cross domain requests without CORS.
 *
 * @param {string|TypedAray|object} source Can be an url to where a PDF is
 * located, a typed array (Uint8Array) already populated with data or
 * and parameter object with the following possible fields:
 *  - url   - The URL of the PDF.
 *  - data  - A typed array with PDF data.
 *  - httpHeaders - Basic authentication headers.
 *  - password - For decrypting password-protected PDFs.
 *  - initialData - A typed array with the first portion or all of the pdf data.
 *                  Used by the extension since some data is already loaded
 *                  before the switch to range requests. 
 *
 * @param {object} pdfDataRangeTransport is optional. It is used if you want
 * to manually serve range requests for data in the PDF. See viewer.js for
 * an example of pdfDataRangeTransport's interface.
 *
 * @param {function} passwordCallback is optional. It is used to request a
 * password if wrong or no password was provided. The callback receives two
 * parameters: function that needs to be called with new password and reason
 * (see {PasswordResponses}).
 *
 * @return {Promise} A promise that is resolved with {PDFDocumentProxy} object.
 */
PDFJS.getDocument = function getDocument(source,
                                         pdfDataRangeTransport,
                                         passwordCallback,
                                         progressCallback) {
  var workerInitializedPromise, workerReadyPromise, transport;

  if (typeof source === 'string') {
    source = { url: source };
  } else if (isArrayBuffer(source)) {
    source = { data: source };
  } else if (typeof source !== 'object') {
    error('Invalid parameter in getDocument, need either Uint8Array, ' +
          'string or a parameter object');
  }

  if (!source.url && !source.data)
    error('Invalid parameter array, need either .data or .url');

  // copy/use all keys as is except 'url' -- full path is required
  var params = {};
  for (var key in source) {
    if (key === 'url' && typeof window !== 'undefined') {
      params[key] = combineUrl(window.location.href, source[key]);
      continue;
    }
    params[key] = source[key];
  }

  workerInitializedPromise = new PDFJS.Promise();
  workerReadyPromise = new PDFJS.Promise();
  transport = new WorkerTransport(workerInitializedPromise,
      workerReadyPromise, pdfDataRangeTransport, progressCallback);
  workerInitializedPromise.then(function transportInitialized() {
    transport.passwordCallback = passwordCallback;
    transport.fetchDocument(params);
  });
  return workerReadyPromise;
};

/**
 * Proxy to a PDFDocument in the worker thread. Also, contains commonly used
 * properties that can be read synchronously.
 */
var PDFDocumentProxy = (function PDFDocumentProxyClosure() {
  function PDFDocumentProxy(pdfInfo, transport) {
    this.pdfInfo = pdfInfo;
    this.transport = transport;
  }
  PDFDocumentProxy.prototype = {
    /**
     * @return {number} Total number of pages the PDF contains.
     */
    get numPages() {
      return this.pdfInfo.numPages;
    },
    /**
     * @return {string} A unique ID to identify a PDF. Not guaranteed to be
     * unique.
     */
    get fingerprint() {
      return this.pdfInfo.fingerprint;
    },
    /**
     * @return {boolean} true if embedded document fonts are in use. Will be
     * set during rendering of the pages.
     */
    get embeddedFontsUsed() {
      return this.transport.embeddedFontsUsed;
    },
    /**
     * @param {number} The page number to get. The first page is 1.
     * @return {Promise} A promise that is resolved with a {PDFPageProxy}
     * object.
     */
    getPage: function PDFDocumentProxy_getPage(number) {
      return this.transport.getPage(number);
    },
    /**
     * @param {object} Must have 'num' and 'gen' properties.
     * @return {Promise} A promise that is resolved with the page index that is
     * associated with the reference.
     */
    getPageIndex: function PDFDocumentProxy_getPageIndex(ref) {
      return this.transport.getPageIndex(ref);
    },
    /**
     * @return {Promise} A promise that is resolved with a lookup table for
     * mapping named destinations to reference numbers.
     */
    getDestinations: function PDFDocumentProxy_getDestinations() {
      return this.transport.getDestinations();
    },
    /**
     * @return {Promise} A promise that is resolved with an array of all the
     * JavaScript strings in the name tree.
     */
    getJavaScript: function PDFDocumentProxy_getDestinations() {
      var promise = new PDFJS.Promise();
      var js = this.pdfInfo.javaScript;
      promise.resolve(js);
      return promise;
    },
    /**
     * @return {Promise} A promise that is resolved with an {array} that is a
     * tree outline (if it has one) of the PDF. The tree is in the format of:
     * [
     *  {
     *   title: string,
     *   bold: boolean,
     *   italic: boolean,
     *   color: rgb array,
     *   dest: dest obj,
     *   items: array of more items like this
     *  },
     *  ...
     * ].
     */
    getOutline: function PDFDocumentProxy_getOutline() {
      var promise = new PDFJS.Promise();
      var outline = this.pdfInfo.outline;
      promise.resolve(outline);
      return promise;
    },
    /**
     * @return {Promise} A promise that is resolved with an {object} that has
     * info and metadata properties.  Info is an {object} filled with anything
     * available in the information dictionary and similarly metadata is a
     * {Metadata} object with information from the metadata section of the PDF.
     */
    getMetadata: function PDFDocumentProxy_getMetadata() {
      var promise = new PDFJS.Promise();
      var info = this.pdfInfo.info;
      var metadata = this.pdfInfo.metadata;
      promise.resolve({
        info: info,
        metadata: metadata ? new PDFJS.Metadata(metadata) : null
      });
      return promise;
    },
    isEncrypted: function PDFDocumentProxy_isEncrypted() {
      var promise = new PDFJS.Promise();
      promise.resolve(this.pdfInfo.encrypted);
      return promise;
    },
    /**
     * @return {Promise} A promise that is resolved with a TypedArray that has
     * the raw data from the PDF.
     */
    getData: function PDFDocumentProxy_getData() {
      var promise = new PDFJS.Promise();
      this.transport.getData(promise);
      return promise;
    },
    /**
     * @return {Promise} A promise that is resolved when the document's data
     * is loaded
     */
    dataLoaded: function PDFDocumentProxy_dataLoaded() {
      return this.transport.dataLoaded();
    },
    cleanup: function PDFDocumentProxy_cleanup() {
      this.transport.startCleanup();
    },
    destroy: function PDFDocumentProxy_destroy() {
      this.transport.destroy();
    }
  };
  return PDFDocumentProxy;
})();

var PDFPageProxy = (function PDFPageProxyClosure() {
  function PDFPageProxy(pageInfo, transport) {
    this.pageInfo = pageInfo;
    this.transport = transport;
    this.stats = new StatTimer();
    this.stats.enabled = !!globalScope.PDFJS.enableStats;
    this.commonObjs = transport.commonObjs;
    this.objs = new PDFObjects();
    this.receivingOperatorList  = false;
    this.cleanupAfterRender = false;
    this.pendingDestroy = false;
    this.renderTasks = [];
  }
  PDFPageProxy.prototype = {
    /**
     * @return {number} Page number of the page. First page is 1.
     */
    get pageNumber() {
      return this.pageInfo.pageIndex + 1;
    },
    /**
     * @return {number} The number of degrees the page is rotated clockwise.
     */
    get rotate() {
      return this.pageInfo.rotate;
    },
    /**
     * @return {object} The reference that points to this page. It has 'num' and
     * 'gen' properties.
     */
    get ref() {
      return this.pageInfo.ref;
    },
    /**
     * @return {array} An array of the visible portion of the PDF page in the
     * user space units - [x1, y1, x2, y2].
     */
    get view() {
      return this.pageInfo.view;
    },
    /**
     * @param {number} scale The desired scale of the viewport.
     * @param {number} rotate Degrees to rotate the viewport. If omitted this
     * defaults to the page rotation.
     * @return {PageViewport} Contains 'width' and 'height' properties along
     * with transforms required for rendering.
     */
    getViewport: function PDFPageProxy_getViewport(scale, rotate) {
      if (arguments.length < 2)
        rotate = this.rotate;
      return new PDFJS.PageViewport(this.view, scale, rotate, 0, 0);
    },
    /**
     * @return {Promise} A promise that is resolved with an {array} of the
     * annotation objects.
     */
    getAnnotations: function PDFPageProxy_getAnnotations() {
      if (this.annotationsPromise)
        return this.annotationsPromise;

      var promise = new PDFJS.Promise();
      this.annotationsPromise = promise;
      this.transport.getAnnotations(this.pageInfo.pageIndex);
      return promise;
    },
    /**
     * Begins the process of rendering a page to the desired context.
     * @param {object} params A parameter object that supports:
     * {
     *   canvasContext(required): A 2D context of a DOM Canvas object.,
     *   textLayer(optional): An object that has beginLayout, endLayout, and
     *                        appendText functions.,
     *   imageLayer(optional): An object that has beginLayout, endLayout and
     *                         appendImage functions.,
     *   continueCallback(optional): A function that will be called each time
     *                               the rendering is paused.  To continue
     *                               rendering call the function that is the
     *                               first argument to the callback.
     * }.
     * @return {RenderTask} An extended promise that is resolved when the page
     * finishes rendering (see RenderTask).
     */
    render: function PDFPageProxy_render(params) {
      var stats = this.stats;
      stats.time('Overall');

      // If there was a pending destroy cancel it so no cleanup happens during
      // this call to render.
      this.pendingDestroy = false;

      // If there is no displayReadyPromise yet, then the operatorList was never
      // requested before. Make the request and create the promise.
      if (!this.displayReadyPromise) {
        this.receivingOperatorList = true;
        this.displayReadyPromise = new Promise();
        this.operatorList = {
          fnArray: [],
          argsArray: [],
          lastChunk: false
        };

        this.stats.time('Page Request');
        this.transport.messageHandler.send('RenderPageRequest', {
          pageIndex: this.pageNumber - 1
        });
      }

      var internalRenderTask = new InternalRenderTask(complete, params,
                                       this.objs, this.commonObjs,
                                       this.operatorList, this.pageNumber);
      this.renderTasks.push(internalRenderTask);
      var renderTask = new RenderTask(internalRenderTask);

      var self = this;
      this.displayReadyPromise.then(
        function pageDisplayReadyPromise(transparency) {
          if (self.pendingDestroy) {
            complete();
            return;
          }
          stats.time('Rendering');
          internalRenderTask.initalizeGraphics(transparency);
          internalRenderTask.operatorListChanged();
        },
        function pageDisplayReadPromiseError(reason) {
          complete(reason);
        }
      );

      function complete(error) {
        var i = self.renderTasks.indexOf(internalRenderTask);
        if (i >= 0) {
          self.renderTasks.splice(i, 1);
        }

        if (self.cleanupAfterRender) {
          self.pendingDestroy = true;
        }
        self._tryDestroy();

        if (error) {
          renderTask.reject(error);
        } else {
          renderTask.resolve();
        }
        stats.timeEnd('Rendering');
        stats.timeEnd('Overall');
      }

      return renderTask;
    },
    /**
     * @return {Promise} That is resolved with the a {string} that is the text
     * content from the page.
     */
    getTextContent: function PDFPageProxy_getTextContent() {
      var promise = new PDFJS.Promise();
      this.transport.messageHandler.send('GetTextContent', {
          pageIndex: this.pageNumber - 1
        },
        function textContentCallback(textContent) {
          promise.resolve(textContent);
        }
      );
      return promise;
    },
    /**
     * Stub for future feature.
     */
    getOperationList: function PDFPageProxy_getOperationList() {
      var promise = new PDFJS.Promise();
      var operationList = { // not implemented
        dependencyFontsID: null,
        operatorList: null
      };
      promise.resolve(operationList);
      return promise;
    },
    /**
     * Destroys resources allocated by the page.
     */
    destroy: function PDFPageProxy_destroy() {
      this.pendingDestroy = true;
      this._tryDestroy();
    },
    /**
     * For internal use only. Attempts to clean up if rendering is in a state
     * where that's possible.
     */
    _tryDestroy: function PDFPageProxy__destroy() {
      if (!this.pendingDestroy ||
          this.renderTasks.length !== 0 ||
          this.receivingOperatorList) {
        return;
      }

      delete this.operatorList;
      delete this.displayReadyPromise;
      this.objs.clear();
      this.pendingDestroy = false;
    },
    /**
     * For internal use only.
     */
    _startRenderPage: function PDFPageProxy_startRenderPage(transparency) {
      this.displayReadyPromise.resolve(transparency);
    },
    /**
     * For internal use only.
     */
    _renderPageChunk: function PDFPageProxy_renderPageChunk(operatorListChunk) {
      // Add the new chunk to the current operator list.
      for (var i = 0, ii = operatorListChunk.length; i < ii; i++) {
        this.operatorList.fnArray.push(operatorListChunk.fnArray[i]);
        this.operatorList.argsArray.push(operatorListChunk.argsArray[i]);
      }
      this.operatorList.lastChunk = operatorListChunk.lastChunk;

      // Notify all the rendering tasks there are more operators to be consumed.
      for (var i = 0; i < this.renderTasks.length; i++) {
        this.renderTasks[i].operatorListChanged();
      }

      if (operatorListChunk.lastChunk) {
        this.receivingOperatorList = false;
        this._tryDestroy();
      }
    }
  };
  return PDFPageProxy;
})();
/**
 * For internal use only.
 */
var WorkerTransport = (function WorkerTransportClosure() {
  function WorkerTransport(workerInitializedPromise, workerReadyPromise,
      pdfDataRangeTransport, progressCallback) {
    this.pdfDataRangeTransport = pdfDataRangeTransport;

    this.workerReadyPromise = workerReadyPromise;
    this.progressCallback = progressCallback;
    this.commonObjs = new PDFObjects();

    this.pageCache = [];
    this.pagePromises = [];
    this.embeddedFontsUsed = false;

    this.passwordCallback = null;

    // If worker support isn't disabled explicit and the browser has worker
    // support, create a new web worker and test if it/the browser fullfills
    // all requirements to run parts of pdf.js in a web worker.
    // Right now, the requirement is, that an Uint8Array is still an Uint8Array
    // as it arrives on the worker. Chrome added this with version 15.
    if (!globalScope.PDFJS.disableWorker && typeof Worker !== 'undefined') {
      var workerSrc = PDFJS.workerSrc;
      if (!workerSrc) {
        error('No PDFJS.workerSrc specified');
      }

      try {
        // Some versions of FF can't create a worker on localhost, see:
        // https://bugzilla.mozilla.org/show_bug.cgi?id=683280
        var worker = new Worker(workerSrc);
        var messageHandler = new MessageHandler('main', worker);
        this.messageHandler = messageHandler;

        messageHandler.on('test', function transportTest(data) {
          var supportTypedArray = data && data.supportTypedArray;
          if (supportTypedArray) {
            this.worker = worker;
            if (!data.supportTransfers) {
              PDFJS.postMessageTransfers = false;
            }
            this.setupMessageHandler(messageHandler);
            workerInitializedPromise.resolve();
          } else {
            globalScope.PDFJS.disableWorker = true;
            this.loadFakeWorkerFiles().then(function() {
              this.setupFakeWorker();
              workerInitializedPromise.resolve();
            }.bind(this));
          }
        }.bind(this));

        var testObj = new Uint8Array([PDFJS.postMessageTransfers ? 255 : 0]);
        // Some versions of Opera throw a DATA_CLONE_ERR on serializing the
        // typed array. Also, checking if we can use transfers.
        try {
          messageHandler.send('test', testObj, null, [testObj.buffer]);
        } catch (ex) {
          info('Cannot use postMessage transfers');
          testObj[0] = 0;
          messageHandler.send('test', testObj);
        }
        return;
      } catch (e) {
        info('The worker has been disabled.');
      }
    }
    // Either workers are disabled, not supported or have thrown an exception.
    // Thus, we fallback to a faked worker.
    globalScope.PDFJS.disableWorker = true;
    this.loadFakeWorkerFiles().then(function() {
      this.setupFakeWorker();
      workerInitializedPromise.resolve();
    }.bind(this));
  }
  WorkerTransport.prototype = {
    destroy: function WorkerTransport_destroy() {
      this.pageCache = [];
      this.pagePromises = [];
      var self = this;
      this.messageHandler.send('Terminate', null, function () {
        if (self.worker) {
          self.worker.terminate();
        }
      });
    },

    loadFakeWorkerFiles: function WorkerTransport_loadFakeWorkerFiles() {
      if (!PDFJS.fakeWorkerFilesLoadedPromise) {
        PDFJS.fakeWorkerFilesLoadedPromise = new Promise();
        // In the developer build load worker_loader which in turn loads all the
        // other files and resolves the promise. In production only the
        // pdf.worker.js file is needed.
        Util.loadScript(PDFJS.workerSrc, function() {
          PDFJS.fakeWorkerFilesLoadedPromise.resolve();
        });
      }
      return PDFJS.fakeWorkerFilesLoadedPromise;
    },

    setupFakeWorker: function WorkerTransport_setupFakeWorker() {
      warn('Setting up fake worker.');
      // If we don't use a worker, just post/sendMessage to the main thread.
      var fakeWorker = {
        postMessage: function WorkerTransport_postMessage(obj) {
          fakeWorker.onmessage({data: obj});
        },
        terminate: function WorkerTransport_terminate() {}
      };

      var messageHandler = new MessageHandler('main', fakeWorker);
      this.setupMessageHandler(messageHandler);

      // If the main thread is our worker, setup the handling for the messages
      // the main thread sends to it self.
      PDFJS.WorkerMessageHandler.setup(messageHandler);
    },

    setupMessageHandler:
      function WorkerTransport_setupMessageHandler(messageHandler) {
      this.messageHandler = messageHandler;

      function updatePassword(password) {
        messageHandler.send('UpdatePassword', password);
      }

      var pdfDataRangeTransport = this.pdfDataRangeTransport;
      if (pdfDataRangeTransport) {
        pdfDataRangeTransport.addRangeListener(function(begin, chunk) {
          messageHandler.send('OnDataRange', {
            begin: begin,
            chunk: chunk
          });
        });

        pdfDataRangeTransport.addProgressListener(function(loaded) {
          messageHandler.send('OnDataProgress', {
            loaded: loaded
          });
        });

        messageHandler.on('RequestDataRange',
          function transportDataRange(data) {
            pdfDataRangeTransport.requestDataRange(data.begin, data.end);
          }, this);
      }

      messageHandler.on('GetDoc', function transportDoc(data) {
        var pdfInfo = data.pdfInfo;
        var pdfDocument = new PDFDocumentProxy(pdfInfo, this);
        this.pdfDocument = pdfDocument;
        this.workerReadyPromise.resolve(pdfDocument);
      }, this);

      messageHandler.on('NeedPassword', function transportPassword(data) {
        if (this.passwordCallback) {
          return this.passwordCallback(updatePassword,
                                       PasswordResponses.NEED_PASSWORD);
        }
        this.workerReadyPromise.reject(data.exception.message, data.exception);
      }, this);

      messageHandler.on('IncorrectPassword', function transportBadPass(data) {
        if (this.passwordCallback) {
          return this.passwordCallback(updatePassword,
                                       PasswordResponses.INCORRECT_PASSWORD);
        }
        this.workerReadyPromise.reject(data.exception.message, data.exception);
      }, this);

      messageHandler.on('InvalidPDF', function transportInvalidPDF(data) {
        this.workerReadyPromise.reject(data.exception.name, data.exception);
      }, this);

      messageHandler.on('MissingPDF', function transportMissingPDF(data) {
        this.workerReadyPromise.reject(data.exception.message, data.exception);
      }, this);

      messageHandler.on('UnknownError', function transportUnknownError(data) {
        this.workerReadyPromise.reject(data.exception.message, data.exception);
      }, this);

      messageHandler.on('GetPage', function transportPage(data) {
        var pageInfo = data.pageInfo;
        var page = new PDFPageProxy(pageInfo, this);
        this.pageCache[pageInfo.pageIndex] = page;
        var promise = this.pagePromises[pageInfo.pageIndex];
        promise.resolve(page);
      }, this);

      messageHandler.on('GetAnnotations', function transportAnnotations(data) {
        var annotations = data.annotations;
        var promise = this.pageCache[data.pageIndex].annotationsPromise;
        promise.resolve(annotations);
      }, this);

      messageHandler.on('StartRenderPage', function transportRender(data) {
        var page = this.pageCache[data.pageIndex];

        page.stats.timeEnd('Page Request');
        page._startRenderPage(data.transparency);
      }, this);

      messageHandler.on('RenderPageChunk', function transportRender(data) {
        var page = this.pageCache[data.pageIndex];

        page._renderPageChunk(data.operatorList);
      }, this);

      messageHandler.on('commonobj', function transportObj(data) {
        var id = data[0];
        var type = data[1];
        if (this.commonObjs.hasData(id))
          return;

        switch (type) {
          case 'Font':
            var exportedData = data[2];

            var font;
            if ('error' in exportedData) {
              var error = exportedData.error;
              warn('Error during font loading: ' + error);
              this.commonObjs.resolve(id, error);
              break;
            } else {
              font = new FontFace(exportedData);
            }

            FontLoader.bind(
              [font],
              function fontReady(fontObjs) {
                this.commonObjs.resolve(id, font);
              }.bind(this)
            );
            break;
          case 'FontPath':
            this.commonObjs.resolve(id, data[2]);
            break;
          default:
            error('Got unknown common object type ' + type);
        }
      }, this);

      messageHandler.on('obj', function transportObj(data) {
        var id = data[0];
        var pageIndex = data[1];
        var type = data[2];
        var pageProxy = this.pageCache[pageIndex];
        if (pageProxy.objs.hasData(id))
          return;

        switch (type) {
          case 'JpegStream':
            var imageData = data[3];
            loadJpegStream(id, imageData, pageProxy.objs);
            break;
          case 'Image':
            var imageData = data[3];
            pageProxy.objs.resolve(id, imageData);

            // heuristics that will allow not to store large data
            var MAX_IMAGE_SIZE_TO_STORE = 8000000;
            if ('data' in imageData &&
                imageData.data.length > MAX_IMAGE_SIZE_TO_STORE) {
              pageProxy.cleanupAfterRender = true;
            }
            break;
          default:
            error('Got unknown object type ' + type);
        }
      }, this);

      messageHandler.on('DocProgress', function transportDocProgress(data) {
        if (this.progressCallback) {
          this.progressCallback({
            loaded: data.loaded,
            total: data.total
          });
        }
      }, this);

      messageHandler.on('DocError', function transportDocError(data) {
        this.workerReadyPromise.reject(data);
      }, this);

      messageHandler.on('PageError', function transportError(data) {
        var page = this.pageCache[data.pageNum - 1];
        if (page.displayReadyPromise)
          page.displayReadyPromise.reject(data.error);
        else
          error(data.error);
      }, this);

      messageHandler.on('JpegDecode', function(data, promise) {
        var imageUrl = data[0];
        var components = data[1];
        if (components != 3 && components != 1)
          error('Only 3 component or 1 component can be returned');

        var img = new Image();
        img.onload = (function messageHandler_onloadClosure() {
          var width = img.width;
          var height = img.height;
          var size = width * height;
          var rgbaLength = size * 4;
          var buf = new Uint8Array(size * components);
          var tmpCanvas = createScratchCanvas(width, height);
          var tmpCtx = tmpCanvas.getContext('2d');
          tmpCtx.drawImage(img, 0, 0);
          var data = tmpCtx.getImageData(0, 0, width, height).data;

          if (components == 3) {
            for (var i = 0, j = 0; i < rgbaLength; i += 4, j += 3) {
              buf[j] = data[i];
              buf[j + 1] = data[i + 1];
              buf[j + 2] = data[i + 2];
            }
          } else if (components == 1) {
            for (var i = 0, j = 0; i < rgbaLength; i += 4, j++) {
              buf[j] = data[i];
            }
          }
          promise.resolve({ data: buf, width: width, height: height});
        }).bind(this);
        img.src = imageUrl;
      });
    },

    fetchDocument: function WorkerTransport_fetchDocument(source) {
      source.disableAutoFetch = PDFJS.disableAutoFetch;
      source.chunkedViewerLoading = !!this.pdfDataRangeTransport;
      this.messageHandler.send('GetDocRequest', {
        source: source,
        disableRange: PDFJS.disableRange,
        maxImageSize: PDFJS.maxImageSize,
        disableFontFace: PDFJS.disableFontFace
      });
    },

    getData: function WorkerTransport_getData(promise) {
      this.messageHandler.send('GetData', null, function(data) {
        promise.resolve(data);
      });
    },

    dataLoaded: function WorkerTransport_dataLoaded() {
      var promise = new PDFJS.Promise();
      this.messageHandler.send('DataLoaded', null, function(args) {
        promise.resolve(args);
      });
      return promise;
    },

    getPage: function WorkerTransport_getPage(pageNumber, promise) {
      var pageIndex = pageNumber - 1;
      if (pageIndex in this.pagePromises)
        return this.pagePromises[pageIndex];
      var promise = new PDFJS.Promise('Page ' + pageNumber);
      this.pagePromises[pageIndex] = promise;
      this.messageHandler.send('GetPageRequest', { pageIndex: pageIndex });
      return promise;
    },

    getPageIndex: function WorkerTransport_getPageIndexByRef(ref) {
      var promise = new PDFJS.Promise();
      this.messageHandler.send('GetPageIndex', { ref: ref },
        function (pageIndex) {
          promise.resolve(pageIndex);
        }
      );
      return promise;
    },

    getAnnotations: function WorkerTransport_getAnnotations(pageIndex) {
      this.messageHandler.send('GetAnnotationsRequest',
        { pageIndex: pageIndex });
    },

    getDestinations: function WorkerTransport_getDestinations() {
      var promise = new PDFJS.Promise();
      this.messageHandler.send('GetDestinations', null,
        function transportDestinations(destinations) {
          promise.resolve(destinations);
        }
      );
      return promise;
    },

    startCleanup: function WorkerTransport_startCleanup() {
      this.messageHandler.send('Cleanup', null,
        function endCleanup() {
          for (var i = 0, ii = this.pageCache.length; i < ii; i++) {
            var page = this.pageCache[i];
            if (page) {
              page.destroy();
            }
          }
          this.commonObjs.clear();
          FontLoader.clear();
        }.bind(this)
      );
    }
  };
  return WorkerTransport;

})();

/**
 * A PDF document and page is built of many objects. E.g. there are objects
 * for fonts, images, rendering code and such. These objects might get processed
 * inside of a worker. The `PDFObjects` implements some basic functions to
 * manage these objects.
 */
var PDFObjects = (function PDFObjectsClosure() {
  function PDFObjects() {
    this.objs = {};
  }

  PDFObjects.prototype = {
    /**
     * Internal function.
     * Ensures there is an object defined for `objId`.
     */
    ensureObj: function PDFObjects_ensureObj(objId) {
      if (this.objs[objId])
        return this.objs[objId];

      var obj = {
        promise: new Promise(objId),
        data: null,
        resolved: false
      };
      this.objs[objId] = obj;

      return obj;
    },

    /**
     * If called *without* callback, this returns the data of `objId` but the
     * object needs to be resolved. If it isn't, this function throws.
     *
     * If called *with* a callback, the callback is called with the data of the
     * object once the object is resolved. That means, if you call this
     * function and the object is already resolved, the callback gets called
     * right away.
     */
    get: function PDFObjects_get(objId, callback) {
      // If there is a callback, then the get can be async and the object is
      // not required to be resolved right now
      if (callback) {
        this.ensureObj(objId).promise.then(callback);
        return null;
      }

      // If there isn't a callback, the user expects to get the resolved data
      // directly.
      var obj = this.objs[objId];

      // If there isn't an object yet or the object isn't resolved, then the
      // data isn't ready yet!
      if (!obj || !obj.resolved)
        error('Requesting object that isn\'t resolved yet ' + objId);

      return obj.data;
    },

    /**
     * Resolves the object `objId` with optional `data`.
     */
    resolve: function PDFObjects_resolve(objId, data) {
      var obj = this.ensureObj(objId);

      obj.resolved = true;
      obj.data = data;
      obj.promise.resolve(data);
    },

    isResolved: function PDFObjects_isResolved(objId) {
      var objs = this.objs;

      if (!objs[objId]) {
        return false;
      } else {
        return objs[objId].resolved;
      }
    },

    hasData: function PDFObjects_hasData(objId) {
      return this.isResolved(objId);
    },

    /**
     * Returns the data of `objId` if object exists, null otherwise.
     */
    getData: function PDFObjects_getData(objId) {
      var objs = this.objs;
      if (!objs[objId] || !objs[objId].resolved) {
        return null;
      } else {
        return objs[objId].data;
      }
    },

    clear: function PDFObjects_clear() {
      this.objs = {};
    }
  };
  return PDFObjects;
})();
/*
 * RenderTask is basically a promise but adds a cancel function to terminate it.
 */
var RenderTask = (function RenderTaskClosure() {
  function RenderTask(internalRenderTask) {
    this.internalRenderTask = internalRenderTask;
    Promise.call(this);
  }

  RenderTask.prototype = Object.create(Promise.prototype);

  /**
   * Cancel the rendering task. If the task is curently rendering it will not be
   * cancelled until graphics pauses with a timeout. The promise that this
   * object extends will resolved when cancelled.
   */
  RenderTask.prototype.cancel = function RenderTask_cancel() {
    this.internalRenderTask.cancel();
  };

  return RenderTask;
})();

var InternalRenderTask = (function InternalRenderTaskClosure() {

  function InternalRenderTask(callback, params, objs, commonObjs, operatorList,
                              pageNumber) {
    this.callback = callback;
    this.params = params;
    this.objs = objs;
    this.commonObjs = commonObjs;
    this.operatorListIdx = null;
    this.operatorList = operatorList;
    this.pageNumber = pageNumber;
    this.running = false;
    this.graphicsReadyCallback = null;
    this.graphicsReady = false;
    this.cancelled = false;
  }

  InternalRenderTask.prototype = {

    initalizeGraphics:
        function InternalRenderTask_initalizeGraphics(transparency) {

      if (this.cancelled) {
        return;
      }
      if (PDFJS.pdfBug && 'StepperManager' in globalScope &&
          globalScope.StepperManager.enabled) {
        this.stepper = globalScope.StepperManager.create(this.pageNumber - 1);
        this.stepper.init(this.operatorList);
        this.stepper.nextBreakPoint = this.stepper.getNextBreakPoint();
      }

      var params = this.params;
      this.gfx = new CanvasGraphics(params.canvasContext, this.commonObjs,
                                    this.objs, params.textLayer,
                                    params.imageLayer);

      this.gfx.beginDrawing(params.viewport, transparency);
      this.operatorListIdx = 0;
      this.graphicsReady = true;
      if (this.graphicsReadyCallback) {
        this.graphicsReadyCallback();
      }
    },

    cancel: function InternalRenderTask_cancel() {
      this.running = false;
      this.cancelled = true;
      this.callback('cancelled');
    },

    operatorListChanged: function InternalRenderTask_operatorListChanged() {
      if (!this.graphicsReady) {
        if (!this.graphicsReadyCallback) {
          this.graphicsReadyCallback = this._continue.bind(this);
        }
        return;
      }

      if (this.stepper) {
        this.stepper.updateOperatorList(this.operatorList);
      }

      if (this.running) {
        return;
      }
      this._continue();
    },

    _continue: function InternalRenderTask__continue() {
      this.running = true;
      if (this.cancelled) {
        return;
      }
      if (this.params.continueCallback) {
        this.params.continueCallback(this._next.bind(this));
      } else {
        this._next();
      }
    },

    _next: function InternalRenderTask__next() {
      if (this.cancelled) {
        return;
      }
      this.operatorListIdx = this.gfx.executeOperatorList(this.operatorList,
                                        this.operatorListIdx,
                                        this._continue.bind(this),
                                        this.stepper);
      if (this.operatorListIdx === this.operatorList.argsArray.length) {
        this.running = false;
        if (this.operatorList.lastChunk) {
          this.gfx.endDrawing();
          this.callback();
        }
      }
    }

  };

  return InternalRenderTask;
})();


var Metadata = PDFJS.Metadata = (function MetadataClosure() {
  function fixMetadata(meta) {
    return meta.replace(/>\\376\\377([^<]+)/g, function(all, codes) {
      var bytes = codes.replace(/\\([0-3])([0-7])([0-7])/g,
                                function(code, d1, d2, d3) {
        return String.fromCharCode(d1 * 64 + d2 * 8 + d3 * 1);
      });
      var chars = '';
      for (var i = 0; i < bytes.length; i += 2) {
        var code = bytes.charCodeAt(i) * 256 + bytes.charCodeAt(i + 1);
        chars += code >= 32 && code < 127 && code != 60 && code != 62 &&
          code != 38 && false ? String.fromCharCode(code) :
          '&#x' + (0x10000 + code).toString(16).substring(1) + ';';
      }
      return '>' + chars;
    });
  }

  function Metadata(meta) {
    if (typeof meta === 'string') {
      // Ghostscript produces invalid metadata
      meta = fixMetadata(meta);

      var parser = new DOMParser();
      meta = parser.parseFromString(meta, 'application/xml');
    } else if (!(meta instanceof Document)) {
      error('Metadata: Invalid metadata object');
    }

    this.metaDocument = meta;
    this.metadata = {};
    this.parse();
  }

  Metadata.prototype = {
    parse: function Metadata_parse() {
      var doc = this.metaDocument;
      var rdf = doc.documentElement;

      if (rdf.nodeName.toLowerCase() !== 'rdf:rdf') { // Wrapped in <xmpmeta>
        rdf = rdf.firstChild;
        while (rdf && rdf.nodeName.toLowerCase() !== 'rdf:rdf')
          rdf = rdf.nextSibling;
      }

      var nodeName = (rdf) ? rdf.nodeName.toLowerCase() : null;
      if (!rdf || nodeName !== 'rdf:rdf' || !rdf.hasChildNodes())
        return;

      var children = rdf.childNodes, desc, entry, name, i, ii, length, iLength;

      for (i = 0, length = children.length; i < length; i++) {
        desc = children[i];
        if (desc.nodeName.toLowerCase() !== 'rdf:description')
          continue;

        for (ii = 0, iLength = desc.childNodes.length; ii < iLength; ii++) {
          if (desc.childNodes[ii].nodeName.toLowerCase() !== '#text') {
            entry = desc.childNodes[ii];
            name = entry.nodeName.toLowerCase();
            this.metadata[name] = entry.textContent.trim();
          }
        }
      }
    },

    get: function Metadata_get(name) {
      return this.metadata[name] || null;
    },

    has: function Metadata_has(name) {
      return typeof this.metadata[name] !== 'undefined';
    }
  };

  return Metadata;
})();


// <canvas> contexts store most of the state we need natively.
// However, PDF needs a bit more state, which we store here.

// Minimal font size that would be used during canvas fillText operations.
var MIN_FONT_SIZE = 16;

var COMPILE_TYPE3_GLYPHS = true;

function createScratchCanvas(width, height) {
  var canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

function addContextCurrentTransform(ctx) {
  // If the context doesn't expose a `mozCurrentTransform`, add a JS based on.
  if (!ctx.mozCurrentTransform) {
    // Store the original context
    ctx._scaleX = ctx._scaleX || 1.0;
    ctx._scaleY = ctx._scaleY || 1.0;
    ctx._originalSave = ctx.save;
    ctx._originalRestore = ctx.restore;
    ctx._originalRotate = ctx.rotate;
    ctx._originalScale = ctx.scale;
    ctx._originalTranslate = ctx.translate;
    ctx._originalTransform = ctx.transform;
    ctx._originalSetTransform = ctx.setTransform;

    ctx._transformMatrix = [ctx._scaleX, 0, 0, ctx._scaleY, 0, 0];
    ctx._transformStack = [];

    Object.defineProperty(ctx, 'mozCurrentTransform', {
      get: function getCurrentTransform() {
        return this._transformMatrix;
      }
    });

    Object.defineProperty(ctx, 'mozCurrentTransformInverse', {
      get: function getCurrentTransformInverse() {
        // Calculation done using WolframAlpha:
        // http://www.wolframalpha.com/input/?
        //   i=Inverse+{{a%2C+c%2C+e}%2C+{b%2C+d%2C+f}%2C+{0%2C+0%2C+1}}

        var m = this._transformMatrix;
        var a = m[0], b = m[1], c = m[2], d = m[3], e = m[4], f = m[5];

        var ad_bc = a * d - b * c;
        var bc_ad = b * c - a * d;

        return [
          d / ad_bc,
          b / bc_ad,
          c / bc_ad,
          a / ad_bc,
          (d * e - c * f) / bc_ad,
          (b * e - a * f) / ad_bc
        ];
      }
    });

    ctx.save = function ctxSave() {
      var old = this._transformMatrix;
      this._transformStack.push(old);
      this._transformMatrix = old.slice(0, 6);

      this._originalSave();
    };

    ctx.restore = function ctxRestore() {
      var prev = this._transformStack.pop();
      if (prev) {
        this._transformMatrix = prev;
        this._originalRestore();
      }
    };

    ctx.translate = function ctxTranslate(x, y) {
      var m = this._transformMatrix;
      m[4] = m[0] * x + m[2] * y + m[4];
      m[5] = m[1] * x + m[3] * y + m[5];

      this._originalTranslate(x, y);
    };

    ctx.scale = function ctxScale(x, y) {
      var m = this._transformMatrix;
      m[0] = m[0] * x;
      m[1] = m[1] * x;
      m[2] = m[2] * y;
      m[3] = m[3] * y;

      this._originalScale(x, y);
    };

    ctx.transform = function ctxTransform(a, b, c, d, e, f) {
      var m = this._transformMatrix;
      this._transformMatrix = [
        m[0] * a + m[2] * b,
        m[1] * a + m[3] * b,
        m[0] * c + m[2] * d,
        m[1] * c + m[3] * d,
        m[0] * e + m[2] * f + m[4],
        m[1] * e + m[3] * f + m[5]
      ];

      ctx._originalTransform(a, b, c, d, e, f);
    };

    ctx.setTransform = function ctxSetTransform(a, b, c, d, e, f) {
      this._transformMatrix = [a, b, c, d, e, f];

      ctx._originalSetTransform(a, b, c, d, e, f);
    };

    ctx.rotate = function ctxRotate(angle) {
      var cosValue = Math.cos(angle);
      var sinValue = Math.sin(angle);

      var m = this._transformMatrix;
      this._transformMatrix = [
        m[0] * cosValue + m[2] * sinValue,
        m[1] * cosValue + m[3] * sinValue,
        m[0] * (-sinValue) + m[2] * cosValue,
        m[1] * (-sinValue) + m[3] * cosValue,
        m[4],
        m[5]
      ];

      this._originalRotate(angle);
    };
  }
}

var CachedCanvases = (function CachedCanvasesClosure() {
  var cache = {};
  return {
    getCanvas: function CachedCanvases_getCanvas(id, width, height,
                                                 trackTransform) {
      var canvasEntry;
      if (id in cache) {
        canvasEntry = cache[id];
        canvasEntry.canvas.width = width;
        canvasEntry.canvas.height = height;
        // reset canvas transform for emulated mozCurrentTransform, if needed
        canvasEntry.context.setTransform(1, 0, 0, 1, 0, 0);
      } else {
        var canvas = createScratchCanvas(width, height);
        var ctx = canvas.getContext('2d');
        if (trackTransform) {
          addContextCurrentTransform(ctx);
        }
        cache[id] = canvasEntry = {canvas: canvas, context: ctx};
      }
      return canvasEntry;
    },
    clear: function () {
      cache = {};
    }
  };
})();

function compileType3Glyph(imgData) {
  var POINT_TO_PROCESS_LIMIT = 1000;

  var width = imgData.width, height = imgData.height;
  var i, j, j0, width1 = width + 1;
  var points = new Uint8Array(width1 * (height + 1));
  var POINT_TYPES =
      new Uint8Array([0, 2, 4, 0, 1, 0, 5, 4, 8, 10, 0, 8, 0, 2, 1, 0]);
  // finding iteresting points: every point is located between mask pixels,
  // so there will be points of the (width + 1)x(height + 1) grid. Every point
  // will have flags assigned based on neighboring mask pixels:
  //   4 | 8
  //   --P--
  //   2 | 1
  // We are interested only in points with the flags:
  //   - outside corners: 1, 2, 4, 8;
  //   - inside corners: 7, 11, 13, 14;
  //   - and, intersections: 5, 10.
  var pos = 3, data = imgData.data, lineSize = width * 4, count = 0;
  if (data[3] !== 0) {
    points[0] = 1;
    ++count;
  }
  for (j = 1; j < width; j++) {
    if (data[pos] !== data[pos + 4]) {
      points[j] = data[pos] ? 2 : 1;
      ++count;
    }
    pos += 4;
  }
  if (data[pos] !== 0) {
    points[j] = 2;
    ++count;
  }
  pos += 4;
  for (i = 1; i < height; i++) {
    j0 = i * width1;
    if (data[pos - lineSize] !== data[pos]) {
      points[j0] = data[pos] ? 1 : 8;
      ++count;
    }
    // 'sum' is the position of the current pixel configuration in the 'TYPES'
    // array (in order 8-1-2-4, so we can use '>>2' to shift the column).
    var sum = (data[pos] ? 4 : 0) + (data[pos - lineSize] ? 8 : 0);
    for (j = 1; j < width; j++) {
      sum = (sum >> 2) + (data[pos + 4] ? 4 : 0) +
            (data[pos - lineSize + 4] ? 8 : 0);
      if (POINT_TYPES[sum]) {
        points[j0 + j] = POINT_TYPES[sum];
        ++count;
      }
      pos += 4;
    }
    if (data[pos - lineSize] !== data[pos]) {
      points[j0 + j] = data[pos] ? 2 : 4;
      ++count;
    }
    pos += 4;

    if (count > POINT_TO_PROCESS_LIMIT) {
      return null;
    }
  }

  pos -= lineSize;
  j0 = i * width1;
  if (data[pos] !== 0) {
    points[j0] = 8;
    ++count;
  }
  for (j = 1; j < width; j++) {
    if (data[pos] !== data[pos + 4]) {
      points[j0 + j] = data[pos] ? 4 : 8;
      ++count;
    }
    pos += 4;
  }
  if (data[pos] !== 0) {
    points[j0 + j] = 4;
    ++count;
  }
  if (count > POINT_TO_PROCESS_LIMIT) {
    return null;
  }

  // building outlines
  var steps = new Int32Array([0, width1, -1, 0, -width1, 0, 0, 0, 1]);
  var outlines = [];
  for (i = 0; count && i <= height; i++) {
    var p = i * width1;
    var end = p + width;
    while (p < end && !points[p]) {
      p++;
    }
    if (p === end) {
      continue;
    }
    var coords = [p % width1, i];

    var type = points[p], p0 = p, pp;
    do {
      var step = steps[type];
      do { p += step; } while (!points[p]);

      pp = points[p];
      if (pp !== 5 && pp !== 10) {
        // set new direction
        type = pp;
        // delete mark
        points[p] = 0;
      } else { // type is 5 or 10, ie, a crossing
        // set new direction
        type = pp & ((0x33 * type) >> 4);
        // set new type for "future hit"
        points[p] &= (type >> 2 | type << 2);
      }

      coords.push(p % width1);
      coords.push((p / width1) | 0);
      --count;
    } while (p0 !== p);
    outlines.push(coords);
    --i;
  }

  var drawOutline = function(c) {
    c.save();
    // the path shall be painted in [0..1]x[0..1] space
    c.scale(1 / width, -1 / height);
    c.translate(0, -height);
    c.beginPath();
    for (var i = 0, ii = outlines.length; i < ii; i++) {
      var o = outlines[i];
      c.moveTo(o[0], o[1]);
      for (var j = 2, jj = o.length; j < jj; j += 2) {
        c.lineTo(o[j], o[j+1]);
      }
    }
    c.fill();
    c.beginPath();
    c.restore();
  };

  return drawOutline;
}

var CanvasExtraState = (function CanvasExtraStateClosure() {
  function CanvasExtraState(old) {
    // Are soft masks and alpha values shapes or opacities?
    this.alphaIsShape = false;
    this.fontSize = 0;
    this.fontSizeScale = 1;
    this.textMatrix = IDENTITY_MATRIX;
    this.fontMatrix = FONT_IDENTITY_MATRIX;
    this.leading = 0;
    // Current point (in user coordinates)
    this.x = 0;
    this.y = 0;
    // Start of text line (in text coordinates)
    this.lineX = 0;
    this.lineY = 0;
    // Character and word spacing
    this.charSpacing = 0;
    this.wordSpacing = 0;
    this.textHScale = 1;
    this.textRenderingMode = TextRenderingMode.FILL;
    this.textRise = 0;
    // Color spaces
    this.fillColorSpace = ColorSpace.singletons.gray;
    this.fillColorSpaceObj = null;
    this.strokeColorSpace = ColorSpace.singletons.gray;
    this.strokeColorSpaceObj = null;
    this.fillColorObj = null;
    this.strokeColorObj = null;
    // Default fore and background colors
    this.fillColor = '#000000';
    this.strokeColor = '#000000';
    // Note: fill alpha applies to all non-stroking operations
    this.fillAlpha = 1;
    this.strokeAlpha = 1;
    this.lineWidth = 1;
    this.paintFormXObjectDepth = 0;

    this.old = old;
  }

  CanvasExtraState.prototype = {
    clone: function CanvasExtraState_clone() {
      return Object.create(this);
    },
    setCurrentPoint: function CanvasExtraState_setCurrentPoint(x, y) {
      this.x = x;
      this.y = y;
    }
  };
  return CanvasExtraState;
})();

var CanvasGraphics = (function CanvasGraphicsClosure() {
  // Defines the time the executeOperatorList is going to be executing
  // before it stops and shedules a continue of execution.
  var EXECUTION_TIME = 15;

  function CanvasGraphics(canvasCtx, commonObjs, objs, textLayer, imageLayer) {
    this.ctx = canvasCtx;
    this.current = new CanvasExtraState();
    this.stateStack = [];
    this.pendingClip = null;
    this.pendingEOFill = false;
    this.res = null;
    this.xobjs = null;
    this.commonObjs = commonObjs;
    this.objs = objs;
    this.textLayer = textLayer;
    this.imageLayer = imageLayer;
    this.groupStack = [];
    this.processingType3 = null;
    // Patterns are painted relative to the initial page/form transform, see pdf
    // spec 8.7.2 NOTE 1.
    this.baseTransform = null;
    this.baseTransformStack = [];
    this.groupLevel = 0;
    if (canvasCtx) {
      addContextCurrentTransform(canvasCtx);
    }
  }

  function putBinaryImageData(ctx, imgData) {
    if (typeof ImageData !== 'undefined' && imgData instanceof ImageData) {
      ctx.putImageData(imgData, 0, 0);
      return;
    }

    var tmpImgData = ctx.createImageData(imgData.width, imgData.height);

    var data = imgData.data;
    var tmpImgDataPixels = tmpImgData.data;
    if ('set' in tmpImgDataPixels)
      tmpImgDataPixels.set(data);
    else {
      // Copy over the imageData pixel by pixel.
      for (var i = 0, ii = tmpImgDataPixels.length; i < ii; i++)
        tmpImgDataPixels[i] = data[i];
    }

    ctx.putImageData(tmpImgData, 0, 0);
  }

  function copyCtxState(sourceCtx, destCtx) {
    var properties = ['strokeStyle', 'fillStyle', 'fillRule', 'globalAlpha',
                      'lineWidth', 'lineCap', 'lineJoin', 'miterLimit',
                      'globalCompositeOperation', 'font'];
    for (var i = 0, ii = properties.length; i < ii; i++) {
      var property = properties[i];
      if (property in sourceCtx) {
        destCtx[property] = sourceCtx[property];
      }
    }
    if ('setLineDash' in sourceCtx) {
      destCtx.setLineDash(sourceCtx.getLineDash());
      destCtx.lineDashOffset =  sourceCtx.lineDashOffset;
    } else if ('mozDash' in sourceCtx) {
      destCtx.mozDash = sourceCtx.mozDash;
      destCtx.mozDashOffset = sourceCtx.mozDashOffset;
    }
  }

  var LINE_CAP_STYLES = ['butt', 'round', 'square'];
  var LINE_JOIN_STYLES = ['miter', 'round', 'bevel'];
  var NORMAL_CLIP = {};
  var EO_CLIP = {};

  CanvasGraphics.prototype = {

    beginDrawing: function CanvasGraphics_beginDrawing(viewport, transparency) {
      // For pdfs that use blend modes we have to clear the canvas else certain
      // blend modes can look wrong since we'd be blending with a white
      // backdrop. The problem with a transparent backdrop though is we then
      // don't get sub pixel anti aliasing on text, so we fill with white if
      // we can.
      var width = this.ctx.canvas.width;
      var height = this.ctx.canvas.height;
      if (transparency) {
        this.ctx.clearRect(0, 0, width, height);
      } else {
        this.ctx.mozOpaque = true;
        this.ctx.save();
        this.ctx.fillStyle = 'rgb(255, 255, 255)';
        this.ctx.fillRect(0, 0, width, height);
        this.ctx.restore();
      }

      var transform = viewport.transform;
      this.baseTransform = transform.slice();
      this.ctx.save();
      this.ctx.transform.apply(this.ctx, transform);

      if (this.textLayer) {
        this.textLayer.beginLayout();
      }
      if (this.imageLayer) {
        this.imageLayer.beginLayout();
      }
    },

    executeOperatorList: function CanvasGraphics_executeOperatorList(
                                    operatorList,
                                    executionStartIdx, continueCallback,
                                    stepper) {
      var argsArray = operatorList.argsArray;
      var fnArray = operatorList.fnArray;
      var i = executionStartIdx || 0;
      var argsArrayLen = argsArray.length;

      // Sometimes the OperatorList to execute is empty.
      if (argsArrayLen == i) {
        return i;
      }

      var executionEndIdx;
      var endTime = Date.now() + EXECUTION_TIME;

      var commonObjs = this.commonObjs;
      var objs = this.objs;
      var fnId;

      while (true) {
        if (stepper && i === stepper.nextBreakPoint) {
          stepper.breakIt(i, continueCallback);
          return i;
        }

        fnId = fnArray[i];

        if (fnId !== OPS.dependency) {
          this[fnId].apply(this, argsArray[i]);
        } else {
          var deps = argsArray[i];
          for (var n = 0, nn = deps.length; n < nn; n++) {
            var depObjId = deps[n];
            var common = depObjId.substring(0, 2) == 'g_';

            // If the promise isn't resolved yet, add the continueCallback
            // to the promise and bail out.
            if (!common && !objs.isResolved(depObjId)) {
              objs.get(depObjId, continueCallback);
              return i;
            }
            if (common && !commonObjs.isResolved(depObjId)) {
              commonObjs.get(depObjId, continueCallback);
              return i;
            }
          }
        }

        i++;

        // If the entire operatorList was executed, stop as were done.
        if (i == argsArrayLen) {
          return i;
        }

        // If the execution took longer then a certain amount of time, schedule
        // to continue exeution after a short delay.
        // However, this is only possible if a 'continueCallback' is passed in.
        if (continueCallback && Date.now() > endTime) {
          setTimeout(continueCallback, 0);
          return i;
        }

        // If the operatorList isn't executed completely yet OR the execution
        // time was short enough, do another execution round.
      }
    },

    endDrawing: function CanvasGraphics_endDrawing() {
      this.ctx.restore();
      CachedCanvases.clear();

      if (this.textLayer) {
        this.textLayer.endLayout();
      }
      if (this.imageLayer) {
        this.imageLayer.endLayout();
      }
    },

    // Graphics state
    setLineWidth: function CanvasGraphics_setLineWidth(width) {
      this.current.lineWidth = width;
      this.ctx.lineWidth = width;
    },
    setLineCap: function CanvasGraphics_setLineCap(style) {
      this.ctx.lineCap = LINE_CAP_STYLES[style];
    },
    setLineJoin: function CanvasGraphics_setLineJoin(style) {
      this.ctx.lineJoin = LINE_JOIN_STYLES[style];
    },
    setMiterLimit: function CanvasGraphics_setMiterLimit(limit) {
      this.ctx.miterLimit = limit;
    },
    setDash: function CanvasGraphics_setDash(dashArray, dashPhase) {
      var ctx = this.ctx;
      if ('setLineDash' in ctx) {
        ctx.setLineDash(dashArray);
        ctx.lineDashOffset = dashPhase;
      } else {
        ctx.mozDash = dashArray;
        ctx.mozDashOffset = dashPhase;
      }
    },
    setRenderingIntent: function CanvasGraphics_setRenderingIntent(intent) {
      // Maybe if we one day fully support color spaces this will be important
      // for now we can ignore.
      // TODO set rendering intent?
    },
    setFlatness: function CanvasGraphics_setFlatness(flatness) {
      // There's no way to control this with canvas, but we can safely ignore.
      // TODO set flatness?
    },
    setGState: function CanvasGraphics_setGState(states) {
      for (var i = 0, ii = states.length; i < ii; i++) {
        var state = states[i];
        var key = state[0];
        var value = state[1];

        switch (key) {
          case 'LW':
            this.setLineWidth(value);
            break;
          case 'LC':
            this.setLineCap(value);
            break;
          case 'LJ':
            this.setLineJoin(value);
            break;
          case 'ML':
            this.setMiterLimit(value);
            break;
          case 'D':
            this.setDash(value[0], value[1]);
            break;
          case 'RI':
            this.setRenderingIntent(value);
            break;
          case 'FL':
            this.setFlatness(value);
            break;
          case 'Font':
            this.setFont(value[0], value[1]);
            break;
          case 'CA':
            this.current.strokeAlpha = state[1];
            break;
          case 'ca':
            this.current.fillAlpha = state[1];
            this.ctx.globalAlpha = state[1];
            break;
          case 'BM':
            if (value && value.name && (value.name !== 'Normal')) {
              var mode = value.name.replace(/([A-Z])/g,
                function(c) {
                  return '-' + c.toLowerCase();
                }
              ).substring(1);
              this.ctx.globalCompositeOperation = mode;
              if (this.ctx.globalCompositeOperation !== mode) {
                warn('globalCompositeOperation "' + mode +
                     '" is not supported');
              }
            } else {
              this.ctx.globalCompositeOperation = 'source-over';
            }
            break;
        }
      }
    },
    save: function CanvasGraphics_save() {
      this.ctx.save();
      var old = this.current;
      this.stateStack.push(old);
      this.current = old.clone();
    },
    restore: function CanvasGraphics_restore() {
      var prev = this.stateStack.pop();
      if (prev) {
        this.current = prev;
        this.ctx.restore();
      }
    },
    transform: function CanvasGraphics_transform(a, b, c, d, e, f) {
      this.ctx.transform(a, b, c, d, e, f);
    },

    // Path
    moveTo: function CanvasGraphics_moveTo(x, y) {
      this.ctx.moveTo(x, y);
      this.current.setCurrentPoint(x, y);
    },
    lineTo: function CanvasGraphics_lineTo(x, y) {
      this.ctx.lineTo(x, y);
      this.current.setCurrentPoint(x, y);
    },
    curveTo: function CanvasGraphics_curveTo(x1, y1, x2, y2, x3, y3) {
      this.ctx.bezierCurveTo(x1, y1, x2, y2, x3, y3);
      this.current.setCurrentPoint(x3, y3);
    },
    curveTo2: function CanvasGraphics_curveTo2(x2, y2, x3, y3) {
      var current = this.current;
      this.ctx.bezierCurveTo(current.x, current.y, x2, y2, x3, y3);
      current.setCurrentPoint(x3, y3);
    },
    curveTo3: function CanvasGraphics_curveTo3(x1, y1, x3, y3) {
      this.curveTo(x1, y1, x3, y3, x3, y3);
      this.current.setCurrentPoint(x3, y3);
    },
    closePath: function CanvasGraphics_closePath() {
      this.ctx.closePath();
    },
    rectangle: function CanvasGraphics_rectangle(x, y, width, height) {
      this.ctx.rect(x, y, width, height);
    },
    stroke: function CanvasGraphics_stroke(consumePath) {
      consumePath = typeof consumePath !== 'undefined' ? consumePath : true;
      var ctx = this.ctx;
      var strokeColor = this.current.strokeColor;
      if (this.current.lineWidth === 0)
        ctx.lineWidth = this.getSinglePixelWidth();
      // For stroke we want to temporarily change the global alpha to the
      // stroking alpha.
      ctx.globalAlpha = this.current.strokeAlpha;
      if (strokeColor && strokeColor.hasOwnProperty('type') &&
          strokeColor.type === 'Pattern') {
        // for patterns, we transform to pattern space, calculate
        // the pattern, call stroke, and restore to user space
        ctx.save();
        ctx.strokeStyle = strokeColor.getPattern(ctx, this);
        ctx.stroke();
        ctx.restore();
      } else {
        ctx.stroke();
      }
      if (consumePath)
        this.consumePath();
      // Restore the global alpha to the fill alpha
      ctx.globalAlpha = this.current.fillAlpha;
    },
    closeStroke: function CanvasGraphics_closeStroke() {
      this.closePath();
      this.stroke();
    },
    fill: function CanvasGraphics_fill(consumePath) {
      consumePath = typeof consumePath !== 'undefined' ? consumePath : true;
      var ctx = this.ctx;
      var fillColor = this.current.fillColor;
      var needRestore = false;

      if (fillColor && fillColor.hasOwnProperty('type') &&
          fillColor.type === 'Pattern') {
        ctx.save();
        ctx.fillStyle = fillColor.getPattern(ctx, this);
        needRestore = true;
      }

      if (this.pendingEOFill) {
        if ('mozFillRule' in this.ctx) {
          this.ctx.mozFillRule = 'evenodd';
          this.ctx.fill();
          this.ctx.mozFillRule = 'nonzero';
        } else {
          try {
            this.ctx.fill('evenodd');
          } catch (ex) {
            // shouldn't really happen, but browsers might think differently
            this.ctx.fill();
          }
        }
        this.pendingEOFill = false;
      } else {
        this.ctx.fill();
      }

      if (needRestore) {
        ctx.restore();
      }
      if (consumePath) {
        this.consumePath();
      }
    },
    eoFill: function CanvasGraphics_eoFill() {
      this.pendingEOFill = true;
      this.fill();
    },
    fillStroke: function CanvasGraphics_fillStroke() {
      this.fill(false);
      this.stroke(false);

      this.consumePath();
    },
    eoFillStroke: function CanvasGraphics_eoFillStroke() {
      this.pendingEOFill = true;
      this.fillStroke();
    },
    closeFillStroke: function CanvasGraphics_closeFillStroke() {
      this.closePath();
      this.fillStroke();
    },
    closeEOFillStroke: function CanvasGraphics_closeEOFillStroke() {
      this.pendingEOFill = true;
      this.closePath();
      this.fillStroke();
    },
    endPath: function CanvasGraphics_endPath() {
      this.consumePath();
    },

    // Clipping
    clip: function CanvasGraphics_clip() {
      this.pendingClip = NORMAL_CLIP;
    },
    eoClip: function CanvasGraphics_eoClip() {
      this.pendingClip = EO_CLIP;
    },

    // Text
    beginText: function CanvasGraphics_beginText() {
      this.current.textMatrix = IDENTITY_MATRIX;
      this.current.x = this.current.lineX = 0;
      this.current.y = this.current.lineY = 0;
    },
    endText: function CanvasGraphics_endText() {
      if (!('pendingTextPaths' in this)) {
        this.ctx.beginPath();
        return;
      }
      var paths = this.pendingTextPaths;
      var ctx = this.ctx;

      ctx.save();
      ctx.beginPath();
      for (var i = 0; i < paths.length; i++) {
        var path = paths[i];
        ctx.setTransform.apply(ctx, path.transform);
        ctx.translate(path.x, path.y);
        path.addToPath(ctx, path.fontSize);
      }
      ctx.restore();
      ctx.clip();
      ctx.beginPath();
      delete this.pendingTextPaths;
    },
    setCharSpacing: function CanvasGraphics_setCharSpacing(spacing) {
      this.current.charSpacing = spacing;
    },
    setWordSpacing: function CanvasGraphics_setWordSpacing(spacing) {
      this.current.wordSpacing = spacing;
    },
    setHScale: function CanvasGraphics_setHScale(scale) {
      this.current.textHScale = scale / 100;
    },
    setLeading: function CanvasGraphics_setLeading(leading) {
      this.current.leading = -leading;
    },
    setFont: function CanvasGraphics_setFont(fontRefName, size) {
      var fontObj = this.commonObjs.get(fontRefName);
      var current = this.current;

      if (!fontObj)
        error('Can\'t find font for ' + fontRefName);

      current.fontMatrix = fontObj.fontMatrix ? fontObj.fontMatrix :
                                                FONT_IDENTITY_MATRIX;

      // A valid matrix needs all main diagonal elements to be non-zero
      // This also ensures we bypass FF bugzilla bug #719844.
      if (current.fontMatrix[0] === 0 ||
          current.fontMatrix[3] === 0) {
        warn('Invalid font matrix for font ' + fontRefName);
      }

      // The spec for Tf (setFont) says that 'size' specifies the font 'scale',
      // and in some docs this can be negative (inverted x-y axes).
      if (size < 0) {
        size = -size;
        current.fontDirection = -1;
      } else {
        current.fontDirection = 1;
      }

      this.current.font = fontObj;
      this.current.fontSize = size;

      if (fontObj.coded)
        return; // we don't need ctx.font for Type3 fonts

      var name = fontObj.loadedName || 'sans-serif';
      var bold = fontObj.black ? (fontObj.bold ? 'bolder' : 'bold') :
                                 (fontObj.bold ? 'bold' : 'normal');

      var italic = fontObj.italic ? 'italic' : 'normal';
      var typeface = '"' + name + '", ' + fontObj.fallbackName;

      // Some font backends cannot handle fonts below certain size.
      // Keeping the font at minimal size and using the fontSizeScale to change
      // the current transformation matrix before the fillText/strokeText.
      // See https://bugzilla.mozilla.org/show_bug.cgi?id=726227
      var browserFontSize = size >= MIN_FONT_SIZE ? size : MIN_FONT_SIZE;
      this.current.fontSizeScale = browserFontSize != MIN_FONT_SIZE ? 1.0 :
                                   size / MIN_FONT_SIZE;

      var rule = italic + ' ' + bold + ' ' + browserFontSize + 'px ' + typeface;
      this.ctx.font = rule;
    },
    setTextRenderingMode: function CanvasGraphics_setTextRenderingMode(mode) {
      this.current.textRenderingMode = mode;
    },
    setTextRise: function CanvasGraphics_setTextRise(rise) {
      this.current.textRise = rise;
    },
    moveText: function CanvasGraphics_moveText(x, y) {
      this.current.x = this.current.lineX += x;
      this.current.y = this.current.lineY += y;
    },
    setLeadingMoveText: function CanvasGraphics_setLeadingMoveText(x, y) {
      this.setLeading(-y);
      this.moveText(x, y);
    },
    setTextMatrix: function CanvasGraphics_setTextMatrix(a, b, c, d, e, f) {
      this.current.textMatrix = [a, b, c, d, e, f];

      this.current.x = this.current.lineX = 0;
      this.current.y = this.current.lineY = 0;
    },
    nextLine: function CanvasGraphics_nextLine() {
      this.moveText(0, this.current.leading);
    },
    applyTextTransforms: function CanvasGraphics_applyTextTransforms() {
      var ctx = this.ctx;
      var current = this.current;
      ctx.transform.apply(ctx, current.textMatrix);
      ctx.translate(current.x, current.y + current.textRise);
      if (current.fontDirection > 0) {
        ctx.scale(current.textHScale, -1);
      } else {
        ctx.scale(-current.textHScale, 1);
      }
    },
    createTextGeometry: function CanvasGraphics_createTextGeometry() {
      var geometry = {};
      var ctx = this.ctx;
      var font = this.current.font;
      var ctxMatrix = ctx.mozCurrentTransform;
      var a = ctxMatrix[0], b = ctxMatrix[1], c = ctxMatrix[2];
      var d = ctxMatrix[3], e = ctxMatrix[4], f = ctxMatrix[5];
      var sx = (a >= 0) ?
          Math.sqrt((a * a) + (b * b)) : -Math.sqrt((a * a) + (b * b));
      var sy = (d >= 0) ?
          Math.sqrt((c * c) + (d * d)) : -Math.sqrt((c * c) + (d * d));
      var angle = Math.atan2(b, a);
      var x = e;
      var y = f;
      geometry.x = x;
      geometry.y = y;
      geometry.hScale = sx;
      geometry.vScale = sy;
      geometry.angle = angle;
      geometry.spaceWidth = font.spaceWidth;
      geometry.fontName = font.loadedName;
      geometry.fontFamily = font.fallbackName;
      geometry.fontSize = this.current.fontSize;
      return geometry;
    },

    paintChar: function (character, x, y) {
      var ctx = this.ctx;
      var current = this.current;
      var font = current.font;
      var fontSize = current.fontSize / current.fontSizeScale;
      var textRenderingMode = current.textRenderingMode;
      var fillStrokeMode = textRenderingMode &
        TextRenderingMode.FILL_STROKE_MASK;
      var isAddToPathSet = !!(textRenderingMode &
        TextRenderingMode.ADD_TO_PATH_FLAG);

      var addToPath;
      if (font.disableFontFace || isAddToPathSet) {
        addToPath = font.getPathGenerator(this.commonObjs, character);
      }

      if (font.disableFontFace) {
        ctx.save();
        ctx.translate(x, y);
        ctx.beginPath();
        addToPath(ctx, fontSize);
        if (fillStrokeMode === TextRenderingMode.FILL ||
            fillStrokeMode === TextRenderingMode.FILL_STROKE) {
          ctx.fill();
        }
        if (fillStrokeMode === TextRenderingMode.STROKE ||
            fillStrokeMode === TextRenderingMode.FILL_STROKE) {
          ctx.stroke();
        }
        ctx.restore();
      } else {
        if (fillStrokeMode === TextRenderingMode.FILL ||
            fillStrokeMode === TextRenderingMode.FILL_STROKE) {
          ctx.fillText(character, x, y);
        }
        if (fillStrokeMode === TextRenderingMode.STROKE ||
            fillStrokeMode === TextRenderingMode.FILL_STROKE) {
          ctx.strokeText(character, x, y);
        }
      }

      if (isAddToPathSet) {
        var paths = this.pendingTextPaths || (this.pendingTextPaths = []);
        paths.push({
          transform: ctx.mozCurrentTransform,
          x: x,
          y: y,
          fontSize: fontSize,
          addToPath: addToPath
        });
      }
    },

    showText: function CanvasGraphics_showText(glyphs, skipTextSelection) {
      var ctx = this.ctx;
      var current = this.current;
      var font = current.font;
      var fontSize = current.fontSize;
      var fontSizeScale = current.fontSizeScale;
      var charSpacing = current.charSpacing;
      var wordSpacing = current.wordSpacing;
      var textHScale = current.textHScale * current.fontDirection;
      var fontMatrix = current.fontMatrix || FONT_IDENTITY_MATRIX;
      var glyphsLength = glyphs.length;
      var textLayer = this.textLayer;
      var geom;
      var textSelection = textLayer && !skipTextSelection ? true : false;
      var canvasWidth = 0.0;
      var vertical = font.vertical;
      var defaultVMetrics = font.defaultVMetrics;

      // Type3 fonts - each glyph is a "mini-PDF"
      if (font.coded) {
        ctx.save();
        ctx.transform.apply(ctx, current.textMatrix);
        ctx.translate(current.x, current.y);

        ctx.scale(textHScale, 1);

        if (textSelection) {
          this.save();
          ctx.scale(1, -1);
          geom = this.createTextGeometry();
          this.restore();
        }
        for (var i = 0; i < glyphsLength; ++i) {

          var glyph = glyphs[i];
          if (glyph === null) {
            // word break
            this.ctx.translate(wordSpacing, 0);
            current.x += wordSpacing * textHScale;
            continue;
          }

          this.processingType3 = glyph;
          this.save();
          ctx.scale(fontSize, fontSize);
          ctx.transform.apply(ctx, fontMatrix);
          this.executeOperatorList(glyph.operatorList);
          this.restore();

          var transformed = Util.applyTransform([glyph.width, 0], fontMatrix);
          var width = (transformed[0] * fontSize + charSpacing) *
                      current.fontDirection;

          ctx.translate(width, 0);
          current.x += width * textHScale;

          canvasWidth += width;
        }
        ctx.restore();
        this.processingType3 = null;
      } else {
        ctx.save();
        this.applyTextTransforms();

        var lineWidth = current.lineWidth;
        var a1 = current.textMatrix[0], b1 = current.textMatrix[1];
        var scale = Math.sqrt(a1 * a1 + b1 * b1);
        if (scale === 0 || lineWidth === 0)
          lineWidth = this.getSinglePixelWidth();
        else
          lineWidth /= scale;

        if (textSelection)
          geom = this.createTextGeometry();

        if (fontSizeScale != 1.0) {
          ctx.scale(fontSizeScale, fontSizeScale);
          lineWidth /= fontSizeScale;
        }

        ctx.lineWidth = lineWidth;

        var x = 0;
        for (var i = 0; i < glyphsLength; ++i) {
          var glyph = glyphs[i];
          if (glyph === null) {
            // word break
            x += current.fontDirection * wordSpacing;
            continue;
          }

          var restoreNeeded = false;
          var character = glyph.fontChar;
          var vmetric = glyph.vmetric || defaultVMetrics;
          if (vertical) {
            var vx = glyph.vmetric ? vmetric[1] : glyph.width * 0.5;
            vx = -vx * fontSize * current.fontMatrix[0];
            var vy = vmetric[2] * fontSize * current.fontMatrix[0];
          }
          var width = vmetric ? -vmetric[0] : glyph.width;
          var charWidth = width * fontSize * current.fontMatrix[0] +
                          charSpacing * current.fontDirection;
          var accent = glyph.accent;

          var scaledX, scaledY, scaledAccentX, scaledAccentY;
          if (!glyph.disabled) {
            if (vertical) {
              scaledX = vx / fontSizeScale;
              scaledY = (x + vy) / fontSizeScale;
            } else {
              scaledX = x / fontSizeScale;
              scaledY = 0;
            }

            if (font.remeasure && width > 0) {
              // some standard fonts may not have the exact width, trying to
              // rescale per character
              var measuredWidth = ctx.measureText(character).width * 1000 /
                current.fontSize * current.fontSizeScale;
              var characterScaleX = width / measuredWidth;
              restoreNeeded = true;
              ctx.save();
              ctx.scale(characterScaleX, 1);
              scaledX /= characterScaleX;
              if (accent) {
                scaledAccentX /= characterScaleX;
              }
            }

            this.paintChar(character, scaledX, scaledY);
            if (accent) {
              scaledAccentX = scaledX + accent.offset.x / fontSizeScale;
              scaledAccentY = scaledY - accent.offset.y / fontSizeScale;
              this.paintChar(accent.fontChar, scaledAccentX, scaledAccentY);
            }
          }

          x += charWidth;

          canvasWidth += charWidth;

          if (restoreNeeded) {
            ctx.restore();
          }
        }
        if (vertical) {
          current.y -= x * textHScale;
        } else {
          current.x += x * textHScale;
        }
        ctx.restore();
      }

      if (textSelection) {
        geom.canvasWidth = canvasWidth;
        if (vertical) {
          var VERTICAL_TEXT_ROTATION = Math.PI / 2;
          geom.angle += VERTICAL_TEXT_ROTATION;
        }
        this.textLayer.appendText(geom);
      }

      return canvasWidth;
    },
    showSpacedText: function CanvasGraphics_showSpacedText(arr) {
      var ctx = this.ctx;
      var current = this.current;
      var font = current.font;
      var fontSize = current.fontSize;
      // TJ array's number is independent from fontMatrix
      var textHScale = current.textHScale * 0.001 * current.fontDirection;
      var arrLength = arr.length;
      var textLayer = this.textLayer;
      var geom;
      var canvasWidth = 0.0;
      var textSelection = textLayer ? true : false;
      var vertical = font.vertical;
      var spacingAccumulator = 0;

      if (textSelection) {
        ctx.save();
        this.applyTextTransforms();
        geom = this.createTextGeometry();
        ctx.restore();
      }

      for (var i = 0; i < arrLength; ++i) {
        var e = arr[i];
        if (isNum(e)) {
          var spacingLength = -e * fontSize * textHScale;
          if (vertical) {
            current.y += spacingLength;
          } else {
            current.x += spacingLength;
          }

          if (textSelection)
            spacingAccumulator += spacingLength;
        } else {
          var shownCanvasWidth = this.showText(e, true);

          if (textSelection) {
            canvasWidth += spacingAccumulator + shownCanvasWidth;
            spacingAccumulator = 0;
          }
        }
      }

      if (textSelection) {
        geom.canvasWidth = canvasWidth;
        if (vertical) {
          var VERTICAL_TEXT_ROTATION = Math.PI / 2;
          geom.angle += VERTICAL_TEXT_ROTATION;
        }
        this.textLayer.appendText(geom);
      }
    },
    nextLineShowText: function CanvasGraphics_nextLineShowText(text) {
      this.nextLine();
      this.showText(text);
    },
    nextLineSetSpacingShowText:
      function CanvasGraphics_nextLineSetSpacingShowText(wordSpacing,
                                                         charSpacing,
                                                         text) {
      this.setWordSpacing(wordSpacing);
      this.setCharSpacing(charSpacing);
      this.nextLineShowText(text);
    },

    // Type3 fonts
    setCharWidth: function CanvasGraphics_setCharWidth(xWidth, yWidth) {
      // We can safely ignore this since the width should be the same
      // as the width in the Widths array.
    },
    setCharWidthAndBounds: function CanvasGraphics_setCharWidthAndBounds(xWidth,
                                                                        yWidth,
                                                                        llx,
                                                                        lly,
                                                                        urx,
                                                                        ury) {
      // TODO According to the spec we're also suppose to ignore any operators
      // that set color or include images while processing this type3 font.
      this.rectangle(llx, lly, urx - llx, ury - lly);
      this.clip();
      this.endPath();
    },

    // Color
    setStrokeColorSpace: function CanvasGraphics_setStrokeColorSpace(raw) {
      this.current.strokeColorSpace = ColorSpace.fromIR(raw);
    },
    setFillColorSpace: function CanvasGraphics_setFillColorSpace(raw) {
      this.current.fillColorSpace = ColorSpace.fromIR(raw);
    },
    setStrokeColor: function CanvasGraphics_setStrokeColor(/*...*/) {
      var cs = this.current.strokeColorSpace;
      var rgbColor = cs.getRgb(arguments, 0);
      var color = Util.makeCssRgb(rgbColor);
      this.ctx.strokeStyle = color;
      this.current.strokeColor = color;
    },
    getColorN_Pattern: function CanvasGraphics_getColorN_Pattern(IR, cs) {
      if (IR[0] == 'TilingPattern') {
        var args = IR[1];
        var base = cs.base;
        var color;
        if (base) {
          var baseComps = base.numComps;

          color = base.getRgb(args, 0);
        }
        var pattern = new TilingPattern(IR, color, this.ctx, this.objs,
                                        this.commonObjs, this.baseTransform);
      } else if (IR[0] == 'RadialAxial' || IR[0] == 'Dummy') {
        var pattern = Pattern.shadingFromIR(IR);
      } else {
        error('Unkown IR type ' + IR[0]);
      }
      return pattern;
    },
    setStrokeColorN: function CanvasGraphics_setStrokeColorN(/*...*/) {
      var cs = this.current.strokeColorSpace;

      if (cs.name == 'Pattern') {
        this.current.strokeColor = this.getColorN_Pattern(arguments, cs);
      } else {
        this.setStrokeColor.apply(this, arguments);
      }
    },
    setFillColor: function CanvasGraphics_setFillColor(/*...*/) {
      var cs = this.current.fillColorSpace;
      var rgbColor = cs.getRgb(arguments, 0);
      var color = Util.makeCssRgb(rgbColor);
      this.ctx.fillStyle = color;
      this.current.fillColor = color;
    },
    setFillColorN: function CanvasGraphics_setFillColorN(/*...*/) {
      var cs = this.current.fillColorSpace;

      if (cs.name == 'Pattern') {
        this.current.fillColor = this.getColorN_Pattern(arguments, cs);
      } else {
        this.setFillColor.apply(this, arguments);
      }
    },
    setStrokeGray: function CanvasGraphics_setStrokeGray(gray) {
      this.current.strokeColorSpace = ColorSpace.singletons.gray;

      var rgbColor = this.current.strokeColorSpace.getRgb(arguments, 0);
      var color = Util.makeCssRgb(rgbColor);
      this.ctx.strokeStyle = color;
      this.current.strokeColor = color;
    },
    setFillGray: function CanvasGraphics_setFillGray(gray) {
      this.current.fillColorSpace = ColorSpace.singletons.gray;

      var rgbColor = this.current.fillColorSpace.getRgb(arguments, 0);
      var color = Util.makeCssRgb(rgbColor);
      this.ctx.fillStyle = color;
      this.current.fillColor = color;
    },
    setStrokeRGBColor: function CanvasGraphics_setStrokeRGBColor(r, g, b) {
      this.current.strokeColorSpace = ColorSpace.singletons.rgb;

      var rgbColor = this.current.strokeColorSpace.getRgb(arguments, 0);
      var color = Util.makeCssRgb(rgbColor);
      this.ctx.strokeStyle = color;
      this.current.strokeColor = color;
    },
    setFillRGBColor: function CanvasGraphics_setFillRGBColor(r, g, b) {
      this.current.fillColorSpace = ColorSpace.singletons.rgb;

      var rgbColor = this.current.fillColorSpace.getRgb(arguments, 0);
      var color = Util.makeCssRgb(rgbColor);
      this.ctx.fillStyle = color;
      this.current.fillColor = color;
    },
    setStrokeCMYKColor: function CanvasGraphics_setStrokeCMYKColor(c, m, y, k) {
      this.current.strokeColorSpace = ColorSpace.singletons.cmyk;

      var color = Util.makeCssCmyk(arguments);
      this.ctx.strokeStyle = color;
      this.current.strokeColor = color;
    },
    setFillCMYKColor: function CanvasGraphics_setFillCMYKColor(c, m, y, k) {
      this.current.fillColorSpace = ColorSpace.singletons.cmyk;

      var color = Util.makeCssCmyk(arguments);
      this.ctx.fillStyle = color;
      this.current.fillColor = color;
    },

    shadingFill: function CanvasGraphics_shadingFill(patternIR) {
      var ctx = this.ctx;

      this.save();
      var pattern = Pattern.shadingFromIR(patternIR);
      ctx.fillStyle = pattern.getPattern(ctx, this);

      var inv = ctx.mozCurrentTransformInverse;
      if (inv) {
        var canvas = ctx.canvas;
        var width = canvas.width;
        var height = canvas.height;

        var bl = Util.applyTransform([0, 0], inv);
        var br = Util.applyTransform([0, height], inv);
        var ul = Util.applyTransform([width, 0], inv);
        var ur = Util.applyTransform([width, height], inv);

        var x0 = Math.min(bl[0], br[0], ul[0], ur[0]);
        var y0 = Math.min(bl[1], br[1], ul[1], ur[1]);
        var x1 = Math.max(bl[0], br[0], ul[0], ur[0]);
        var y1 = Math.max(bl[1], br[1], ul[1], ur[1]);

        this.ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
      } else {
        // HACK to draw the gradient onto an infinite rectangle.
        // PDF gradients are drawn across the entire image while
        // Canvas only allows gradients to be drawn in a rectangle
        // The following bug should allow us to remove this.
        // https://bugzilla.mozilla.org/show_bug.cgi?id=664884

        this.ctx.fillRect(-1e10, -1e10, 2e10, 2e10);
      }

      this.restore();
    },

    // Images
    beginInlineImage: function CanvasGraphics_beginInlineImage() {
      error('Should not call beginInlineImage');
    },
    beginImageData: function CanvasGraphics_beginImageData() {
      error('Should not call beginImageData');
    },

    paintFormXObjectBegin: function CanvasGraphics_paintFormXObjectBegin(matrix,
                                                                        bbox) {
      this.save();
      this.current.paintFormXObjectDepth++;
      this.baseTransformStack.push(this.baseTransform);

      if (matrix && isArray(matrix) && 6 == matrix.length)
        this.transform.apply(this, matrix);

      this.baseTransform = this.ctx.mozCurrentTransform;

      if (bbox && isArray(bbox) && 4 == bbox.length) {
        var width = bbox[2] - bbox[0];
        var height = bbox[3] - bbox[1];
        this.rectangle(bbox[0], bbox[1], width, height);
        this.clip();
        this.endPath();
      }
    },

    paintFormXObjectEnd: function CanvasGraphics_paintFormXObjectEnd() {
      var depth = this.current.paintFormXObjectDepth;
      do {
        this.restore();
        // some pdf don't close all restores inside object
        // closing those for them
      } while (this.current.paintFormXObjectDepth >= depth);
      this.baseTransform = this.baseTransformStack.pop();
    },

    beginGroup: function CanvasGraphics_beginGroup(group) {
      this.save();
      var currentCtx = this.ctx;
      // TODO non-isolated groups - according to Rik at adobe non-isolated
      // group results aren't usually that different and they even have tools
      // that ignore this setting. Notes from Rik on implmenting:
      // - When you encounter an transparency group, create a new canvas with
      // the dimensions of the bbox
      // - copy the content from the previous canvas to the new canvas
      // - draw as usual
      // - remove the backdrop alpha:
      // alphaNew = 1 - (1 - alpha)/(1 - alphaBackdrop) with 'alpha' the alpha
      // value of your transparency group and 'alphaBackdrop' the alpha of the
      // backdrop
      // - remove background color:
      // colorNew = color - alphaNew *colorBackdrop /(1 - alphaNew)
      if (!group.isolated) {
        info('TODO: Support non-isolated groups.');
      }

      // TODO knockout - supposedly possible with the clever use of compositing
      // modes.
      if (group.knockout) {
        TODO('Support knockout groups.');
      }

      var currentTransform = currentCtx.mozCurrentTransform;
      if (group.matrix) {
        currentCtx.transform.apply(currentCtx, group.matrix);
      }
      assert(group.bbox, 'Bounding box is required.');

      // Based on the current transform figure out how big the bounding box
      // will actually be.
      var bounds = Util.getAxialAlignedBoundingBox(
                    group.bbox,
                    currentCtx.mozCurrentTransform);
      // Clip the bounding box to the current canvas.
      var canvasBounds = [0,
                          0,
                          currentCtx.canvas.width,
                          currentCtx.canvas.height];
      bounds = Util.intersect(bounds, canvasBounds) || [0, 0, 0, 0];
      // Use ceil in case we're between sizes so we don't create canvas that is
      // too small and make the canvas at least 1x1 pixels.
      var drawnWidth = Math.max(Math.ceil(bounds[2] - bounds[0]), 1);
      var drawnHeight = Math.max(Math.ceil(bounds[3] - bounds[1]), 1);

      var scratchCanvas = CachedCanvases.getCanvas(
        'groupAt' + this.groupLevel, drawnWidth, drawnHeight, true);
      var groupCtx = scratchCanvas.context;
      // Since we created a new canvas that is just the size of the bounding box
      // we have to translate the group ctx.
      var offsetX = bounds[0];
      var offsetY = bounds[1];
      groupCtx.translate(-offsetX, -offsetY);
      groupCtx.transform.apply(groupCtx, currentTransform);

      // Setup the current ctx so when the group is popped we draw it the right
      // location.
      currentCtx.setTransform(1, 0, 0, 1, 0, 0);
      currentCtx.translate(offsetX, offsetY);
      // The transparency group inherits all off the current graphics state
      // except the blend mode, soft mask, and alpha constants.
      copyCtxState(currentCtx, groupCtx);
      this.ctx = groupCtx;
      this.setGState([
        ['SMask', 'None'],
        ['BM', 'Normal'],
        ['ca', 1],
        ['CA', 1]
      ]);
      this.groupStack.push(currentCtx);
      this.groupLevel++;
    },

    endGroup: function CanvasGraphics_endGroup(group) {
      this.groupLevel--;
      var groupCtx = this.ctx;
      this.ctx = this.groupStack.pop();
      // Turn off image smoothing to avoid sub pixel interpolation which can
      // look kind of blurry for some pdfs.
      if ('imageSmoothingEnabled' in this.ctx) {
        this.ctx.imageSmoothingEnabled = false;
      } else {
        this.ctx.mozImageSmoothingEnabled = false;
      }
      this.ctx.drawImage(groupCtx.canvas, 0, 0);
      this.restore();
    },

    beginAnnotations: function CanvasGraphics_beginAnnotations() {
      this.save();
      this.current = new CanvasExtraState();
    },

    endAnnotations: function CanvasGraphics_endAnnotations() {
      this.restore();
    },

    beginAnnotation: function CanvasGraphics_beginAnnotation(rect, transform,
                                                             matrix) {
      this.save();

      if (rect && isArray(rect) && 4 == rect.length) {
        var width = rect[2] - rect[0];
        var height = rect[3] - rect[1];
        this.rectangle(rect[0], rect[1], width, height);
        this.clip();
        this.endPath();
      }

      this.transform.apply(this, transform);
      this.transform.apply(this, matrix);
    },

    endAnnotation: function CanvasGraphics_endAnnotation() {
      this.restore();
    },

    paintJpegXObject: function CanvasGraphics_paintJpegXObject(objId, w, h) {
      var domImage = this.objs.get(objId);
      if (!domImage) {
        error('Dependent image isn\'t ready yet');
      }

      this.save();

      var ctx = this.ctx;
      // scale the image to the unit square
      ctx.scale(1 / w, -1 / h);

      ctx.drawImage(domImage, 0, 0, domImage.width, domImage.height,
                    0, -h, w, h);
      if (this.imageLayer) {
        var currentTransform = ctx.mozCurrentTransformInverse;
        var position = this.getCanvasPosition(0, 0);
        this.imageLayer.appendImage({
          objId: objId,
          left: position[0],
          top: position[1],
          width: w / currentTransform[0],
          height: h / currentTransform[3]
        });
      }
      this.restore();
    },

    paintImageMaskXObject: function CanvasGraphics_paintImageMaskXObject(img) {
      var ctx = this.ctx;
      var width = img.width, height = img.height;

      var glyph = this.processingType3;

      if (COMPILE_TYPE3_GLYPHS && glyph && !('compiled' in glyph)) {
        var MAX_SIZE_TO_COMPILE = 1000;
        if (width <= MAX_SIZE_TO_COMPILE && height <= MAX_SIZE_TO_COMPILE) {
          glyph.compiled =
            compileType3Glyph({data: img.data, width: width, height: height});
        } else {
          glyph.compiled = null;
        }
      }

      if (glyph && glyph.compiled) {
        glyph.compiled(ctx);
        return;
      }

      var maskCanvas = CachedCanvases.getCanvas('maskCanvas', width, height);
      var maskCtx = maskCanvas.context;
      maskCtx.save();

      putBinaryImageData(maskCtx, img);

      maskCtx.globalCompositeOperation = 'source-in';

      var fillColor = this.current.fillColor;
      maskCtx.fillStyle = (fillColor && fillColor.hasOwnProperty('type') &&
                          fillColor.type === 'Pattern') ?
                          fillColor.getPattern(maskCtx, this) : fillColor;
      maskCtx.fillRect(0, 0, width, height);

      maskCtx.restore();

      this.paintInlineImageXObject(maskCanvas.canvas);
    },

    paintImageMaskXObjectGroup:
      function CanvasGraphics_paintImageMaskXObjectGroup(images) {
      var ctx = this.ctx;

      for (var i = 0, ii = images.length; i < ii; i++) {
        var image = images[i];
        var width = image.width, height = image.height;

        var maskCanvas = CachedCanvases.getCanvas('maskCanvas', width, height);
        var maskCtx = maskCanvas.context;
        maskCtx.save();

        putBinaryImageData(maskCtx, image);

        maskCtx.globalCompositeOperation = 'source-in';

        var fillColor = this.current.fillColor;
        maskCtx.fillStyle = (fillColor && fillColor.hasOwnProperty('type') &&
                            fillColor.type === 'Pattern') ?
                            fillColor.getPattern(maskCtx, this) : fillColor;
        maskCtx.fillRect(0, 0, width, height);

        maskCtx.restore();

        ctx.save();
        ctx.transform.apply(ctx, image.transform);
        ctx.scale(1, -1);
        ctx.drawImage(maskCanvas.canvas, 0, 0, width, height,
                      0, -1, 1, 1);
        ctx.restore();
      }
    },

    paintImageXObject: function CanvasGraphics_paintImageXObject(objId) {
      var imgData = this.objs.get(objId);
      if (!imgData)
        error('Dependent image isn\'t ready yet');

      this.paintInlineImageXObject(imgData);
    },

    paintInlineImageXObject:
      function CanvasGraphics_paintInlineImageXObject(imgData) {
      var width = imgData.width;
      var height = imgData.height;
      var ctx = this.ctx;

      this.save();
      // scale the image to the unit square
      ctx.scale(1 / width, -1 / height);

      var currentTransform = ctx.mozCurrentTransformInverse;
      var a = currentTransform[0], b = currentTransform[1];
      var widthScale = Math.max(Math.sqrt(a * a + b * b), 1);
      var c = currentTransform[2], d = currentTransform[3];
      var heightScale = Math.max(Math.sqrt(c * c + d * d), 1);

      var imgToPaint;
      // instanceof HTMLElement does not work in jsdom node.js module
      if (imgData instanceof HTMLElement || !imgData.data) {
        imgToPaint = imgData;
      } else {
        var tmpCanvas = CachedCanvases.getCanvas('inlineImage', width, height);
        var tmpCtx = tmpCanvas.context;
        putBinaryImageData(tmpCtx, imgData);
        imgToPaint = tmpCanvas.canvas;
      }

      var paintWidth = width, paintHeight = height;
      var tmpCanvasId = 'prescale1';
      // Vertial or horizontal scaling shall not be more than 2 to not loose the
      // pixels during drawImage operation, painting on the temporary canvas(es)
      // that are twice smaller in size
      while ((widthScale > 2 && paintWidth > 1) ||
             (heightScale > 2 && paintHeight > 1)) {
        var newWidth = paintWidth, newHeight = paintHeight;
        if (widthScale > 2 && paintWidth > 1) {
          newWidth = Math.ceil(paintWidth / 2);
          widthScale /= paintWidth / newWidth;
        }
        if (heightScale > 2 && paintHeight > 1) {
          newHeight = Math.ceil(paintHeight / 2);
          heightScale /= paintHeight / newHeight;
        }
        var tmpCanvas = CachedCanvases.getCanvas(tmpCanvasId,
                                                 newWidth, newHeight);
        tmpCtx = tmpCanvas.context;
        tmpCtx.clearRect(0, 0, newWidth, newHeight);
        tmpCtx.drawImage(imgToPaint, 0, 0, paintWidth, paintHeight,
                                     0, 0, newWidth, newHeight);
        imgToPaint = tmpCanvas.canvas;
        paintWidth = newWidth;
        paintHeight = newHeight;
        tmpCanvasId = tmpCanvasId === 'prescale1' ? 'prescale2' : 'prescale1';
      }
      ctx.drawImage(imgToPaint, 0, 0, paintWidth, paintHeight,
                                0, -height, width, height);

      if (this.imageLayer) {
        var position = this.getCanvasPosition(0, -height);
        this.imageLayer.appendImage({
          imgData: imgData,
          left: position[0],
          top: position[1],
          width: width / currentTransform[0],
          height: height / currentTransform[3]
        });
      }
      this.restore();
    },

    paintInlineImageXObjectGroup:
      function CanvasGraphics_paintInlineImageXObjectGroup(imgData, map) {
      var ctx = this.ctx;
      var w = imgData.width;
      var h = imgData.height;

      var tmpCanvas = CachedCanvases.getCanvas('inlineImage', w, h);
      var tmpCtx = tmpCanvas.context;
      putBinaryImageData(tmpCtx, imgData);

      for (var i = 0, ii = map.length; i < ii; i++) {
        var entry = map[i];
        ctx.save();
        ctx.transform.apply(ctx, entry.transform);
        ctx.scale(1, -1);
        ctx.drawImage(tmpCanvas.canvas, entry.x, entry.y, entry.w, entry.h,
                      0, -1, 1, 1);
        if (this.imageLayer) {
          var position = this.getCanvasPosition(entry.x, entry.y);
          this.imageLayer.appendImage({
            imgData: imgData,
            left: position[0],
            top: position[1],
            width: w,
            height: h
          });
        }
        ctx.restore();
      }
    },

    // Marked content

    markPoint: function CanvasGraphics_markPoint(tag) {
      // TODO Marked content.
    },
    markPointProps: function CanvasGraphics_markPointProps(tag, properties) {
      // TODO Marked content.
    },
    beginMarkedContent: function CanvasGraphics_beginMarkedContent(tag) {
      // TODO Marked content.
    },
    beginMarkedContentProps: function CanvasGraphics_beginMarkedContentProps(
                                        tag, properties) {
      // TODO Marked content.
    },
    endMarkedContent: function CanvasGraphics_endMarkedContent() {
      // TODO Marked content.
    },

    // Compatibility

    beginCompat: function CanvasGraphics_beginCompat() {
      // TODO ignore undefined operators (should we do that anyway?)
    },
    endCompat: function CanvasGraphics_endCompat() {
      // TODO stop ignoring undefined operators
    },

    // Helper functions

    consumePath: function CanvasGraphics_consumePath() {
      if (this.pendingClip) {
        if (this.pendingClip == EO_CLIP) {
          if ('mozFillRule' in this.ctx) {
            this.ctx.mozFillRule = 'evenodd';
            this.ctx.clip();
            this.ctx.mozFillRule = 'nonzero';
          } else {
            try {
              this.ctx.clip('evenodd');
            } catch (ex) {
              // shouldn't really happen, but browsers might think differently
              this.ctx.clip();
            }
          }
        } else {
          this.ctx.clip();
        }
        this.pendingClip = null;
      }
      this.ctx.beginPath();
    },
    getSinglePixelWidth: function CanvasGraphics_getSinglePixelWidth(scale) {
      var inverse = this.ctx.mozCurrentTransformInverse;
      // max of the current horizontal and vertical scale
      return Math.sqrt(Math.max(
        (inverse[0] * inverse[0] + inverse[1] * inverse[1]),
        (inverse[2] * inverse[2] + inverse[3] * inverse[3])));
    },
    getCanvasPosition: function CanvasGraphics_getCanvasPosition(x, y) {
        var transform = this.ctx.mozCurrentTransform;
        return [
          transform[0] * x + transform[2] * y + transform[4],
          transform[1] * x + transform[3] * y + transform[5]
        ];
    }
  };

  for (var op in OPS) {
    CanvasGraphics.prototype[OPS[op]] = CanvasGraphics.prototype[op];
  }

  return CanvasGraphics;
})();



PDFJS.disableFontFace = false;

var FontLoader = {
  insertRule: function fontLoaderInsertRule(rule) {
    var styleElement = document.getElementById('PDFJS_FONT_STYLE_TAG');
    if (!styleElement) {
        styleElement = document.createElement('style');
        styleElement.id = 'PDFJS_FONT_STYLE_TAG';
        document.documentElement.getElementsByTagName('head')[0].appendChild(
          styleElement);
    }

    var styleSheet = styleElement.sheet;
    styleSheet.insertRule(rule, styleSheet.cssRules.length);
  },
  clear: function fontLoaderClear() {
    var styleElement = document.getElementById('PDFJS_FONT_STYLE_TAG');
    if (styleElement) {
      styleElement.parentNode.removeChild(styleElement);
    }
  },
  get loadTestFont() {
    // This is a CFF font with 1 glyph for '.' that fills its entire width and
    // height.
    return shadow(this, 'loadTestFont', atob(
      'T1RUTwALAIAAAwAwQ0ZGIDHtZg4AAAOYAAAAgUZGVE1lkzZwAAAEHAAAABxHREVGABQAFQ' +
      'AABDgAAAAeT1MvMlYNYwkAAAEgAAAAYGNtYXABDQLUAAACNAAAAUJoZWFk/xVFDQAAALwA' +
      'AAA2aGhlYQdkA+oAAAD0AAAAJGhtdHgD6AAAAAAEWAAAAAZtYXhwAAJQAAAAARgAAAAGbm' +
      'FtZVjmdH4AAAGAAAAAsXBvc3T/hgAzAAADeAAAACAAAQAAAAEAALZRFsRfDzz1AAsD6AAA' +
      'AADOBOTLAAAAAM4KHDwAAAAAA+gDIQAAAAgAAgAAAAAAAAABAAADIQAAAFoD6AAAAAAD6A' +
      'ABAAAAAAAAAAAAAAAAAAAAAQAAUAAAAgAAAAQD6AH0AAUAAAKKArwAAACMAooCvAAAAeAA' +
      'MQECAAACAAYJAAAAAAAAAAAAAQAAAAAAAAAAAAAAAFBmRWQAwAAuAC4DIP84AFoDIQAAAA' +
      'AAAQAAAAAAAAAAACAAIAABAAAADgCuAAEAAAAAAAAAAQAAAAEAAAAAAAEAAQAAAAEAAAAA' +
      'AAIAAQAAAAEAAAAAAAMAAQAAAAEAAAAAAAQAAQAAAAEAAAAAAAUAAQAAAAEAAAAAAAYAAQ' +
      'AAAAMAAQQJAAAAAgABAAMAAQQJAAEAAgABAAMAAQQJAAIAAgABAAMAAQQJAAMAAgABAAMA' +
      'AQQJAAQAAgABAAMAAQQJAAUAAgABAAMAAQQJAAYAAgABWABYAAAAAAAAAwAAAAMAAAAcAA' +
      'EAAAAAADwAAwABAAAAHAAEACAAAAAEAAQAAQAAAC7//wAAAC7////TAAEAAAAAAAABBgAA' +
      'AQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAAAAA' +
      'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' +
      'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' +
      'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' +
      'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAMAAA' +
      'AAAAD/gwAyAAAAAQAAAAAAAAAAAAAAAAAAAAABAAQEAAEBAQJYAAEBASH4DwD4GwHEAvgc' +
      'A/gXBIwMAYuL+nz5tQXkD5j3CBLnEQACAQEBIVhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWF' +
      'hYWFhYWFhYAAABAQAADwACAQEEE/t3Dov6fAH6fAT+fPp8+nwHDosMCvm1Cvm1DAz6fBQA' +
      'AAAAAAABAAAAAMmJbzEAAAAAzgTjFQAAAADOBOQpAAEAAAAAAAAADAAUAAQAAAABAAAAAg' +
      'ABAAAAAAAAAAAD6AAAAAAAAA=='
    ));
  },

  loadTestFontId: 0,

  loadingContext: {
    requests: [],
    nextRequestId: 0
  },

  isSyncFontLoadingSupported: (function detectSyncFontLoadingSupport() {
    if (isWorker)
      return false;

    // User agent string sniffing is bad, but there is no reliable way to tell
    // if font is fully loaded and ready to be used with canvas.
    var userAgent = window.navigator.userAgent;
    var m = /Mozilla\/5.0.*?rv:(\d+).*? Gecko/.exec(userAgent);
    if (m && m[1] >= 14)
      return true;
    // TODO other browsers
    return false;
  })(),

  bind: function fontLoaderBind(fonts, callback) {
    assert(!isWorker, 'bind() shall be called from main thread');

    var rules = [], fontsToLoad = [];
    for (var i = 0, ii = fonts.length; i < ii; i++) {
      var font = fonts[i];

      // Add the font to the DOM only once or skip if the font
      // is already loaded.
      if (font.attached || font.loading === false) {
        continue;
      }
      font.attached = true;

      var rule = font.bindDOM();
      if (rule) {
        rules.push(rule);
        fontsToLoad.push(font);
      }
    }

    var request = FontLoader.queueLoadingCallback(callback);
    if (rules.length > 0 && !this.isSyncFontLoadingSupported) {
      FontLoader.prepareFontLoadEvent(rules, fontsToLoad, request);
    } else {
      request.complete();
    }
  },

  queueLoadingCallback: function FontLoader_queueLoadingCallback(callback) {
    function LoadLoader_completeRequest() {
      assert(!request.end, 'completeRequest() cannot be called twice');
      request.end = Date.now();

      // sending all completed requests in order how they were queued
      while (context.requests.length > 0 && context.requests[0].end) {
        var otherRequest = context.requests.shift();
        setTimeout(otherRequest.callback, 0);
      }
    }

    var context = FontLoader.loadingContext;
    var requestId = 'pdfjs-font-loading-' + (context.nextRequestId++);
    var request = {
      id: requestId,
      complete: LoadLoader_completeRequest,
      callback: callback,
      started: Date.now()
    };
    context.requests.push(request);
    return request;
  },

  prepareFontLoadEvent: function fontLoaderPrepareFontLoadEvent(rules,
                                                                fonts,
                                                                request) {
      /** Hack begin */
      // There's currently no event when a font has finished downloading so the
      // following code is a dirty hack to 'guess' when a font is
      // ready. It's assumed fonts are loaded in order, so add a known test
      // font after the desired fonts and then test for the loading of that
      // test font.

      function int32(data, offset) {
        return (data.charCodeAt(offset) << 24) |
               (data.charCodeAt(offset + 1) << 16) |
               (data.charCodeAt(offset + 2) << 8) |
               (data.charCodeAt(offset + 3) & 0xff);
      }

      function string32(value) {
        return String.fromCharCode((value >> 24) & 0xff) +
               String.fromCharCode((value >> 16) & 0xff) +
               String.fromCharCode((value >> 8) & 0xff) +
               String.fromCharCode(value & 0xff);
      }

      function spliceString(s, offset, remove, insert) {
        var chunk1 = data.substr(0, offset);
        var chunk2 = data.substr(offset + remove);
        return chunk1 + insert + chunk2;
      }

      var i, ii;

      var canvas = document.createElement('canvas');
      canvas.width = 1;
      canvas.height = 1;
      var ctx = canvas.getContext('2d');

      var called = 0;
      function isFontReady(name, callback) {
        called++;
        // With setTimeout clamping this gives the font ~100ms to load.
        if(called > 30) {
          warn('Load test font never loaded.');
          callback();
          return;
        }
        ctx.font = '30px ' + name;
        ctx.fillText('.', 0, 20);
        var imageData = ctx.getImageData(0, 0, 1, 1);
        if (imageData.data[3] > 0) {
          callback();
          return;
        }
        setTimeout(isFontReady.bind(null, name, callback));
      }

      var loadTestFontId = 'lt' + Date.now() + this.loadTestFontId++;
      // Chromium seems to cache fonts based on a hash of the actual font data,
      // so the font must be modified for each load test else it will appear to
      // be loaded already.
      // TODO: This could maybe be made faster by avoiding the btoa of the full
      // font by splitting it in chunks before hand and padding the font id.
      var data = this.loadTestFont;
      var COMMENT_OFFSET = 976; // has to be on 4 byte boundary (for checksum)
      data = spliceString(data, COMMENT_OFFSET, loadTestFontId.length,
                          loadTestFontId);
      // CFF checksum is important for IE, adjusting it
      var CFF_CHECKSUM_OFFSET = 16;
      var XXXX_VALUE = 0x58585858; // the "comment" filled with 'X'
      var checksum = int32(data, CFF_CHECKSUM_OFFSET);
      for (i = 0, ii = loadTestFontId.length - 3; i < ii; i += 4) {
        checksum = (checksum - XXXX_VALUE + int32(loadTestFontId, i)) | 0;
      }
      if (i < loadTestFontId.length) { // align to 4 bytes boundary
        checksum = (checksum - XXXX_VALUE +
                    int32(loadTestFontId + 'XXX', i)) | 0;
      }
      data = spliceString(data, CFF_CHECKSUM_OFFSET, 4, string32(checksum));

      var url = 'url(data:font/opentype;base64,' + btoa(data) + ');';
      var rule = '@font-face { font-family:"' + loadTestFontId + '";src:' +
                 url + '}';
      FontLoader.insertRule(rule);

      var names = [];
      for (i = 0, ii = fonts.length; i < ii; i++) {
        names.push(fonts[i].loadedName);
      }
      names.push(loadTestFontId);

      var div = document.createElement('div');
      div.setAttribute('style',
                       'visibility: hidden;' +
                       'width: 10px; height: 10px;' +
                       'position: absolute; top: 0px; left: 0px;');
      for (i = 0, ii = names.length; i < ii; ++i) {
        var span = document.createElement('span');
        span.textContent = 'Hi';
        span.style.fontFamily = names[i];
        div.appendChild(span);
      }
      document.body.appendChild(div);

      isFontReady(loadTestFontId, function() {
        document.body.removeChild(div);
        request.complete();
      });
      /** Hack end */
  }
};

var FontFace = (function FontFaceClosure() {
  function FontFace(name, file, properties) {
    this.compiledGlyphs = {};
    if (arguments.length === 1) {
      // importing translated data
      var data = arguments[0];
      for (var i in data) {
        this[i] = data[i];
      }
      return;
    }
  }
  FontFace.prototype = {
    bindDOM: function FontFace_bindDOM() {
      if (!this.data)
        return null;

      if (PDFJS.disableFontFace) {
        this.disableFontFace = true;
        return null;
      }

      var data = bytesToString(this.data);
      var fontName = this.loadedName;

      // Add the font-face rule to the document
      var url = ('url(data:' + this.mimetype + ';base64,' +
                 window.btoa(data) + ');');
      var rule = '@font-face { font-family:"' + fontName + '";src:' + url + '}';

      FontLoader.insertRule(rule);

      if (PDFJS.pdfBug && 'FontInspector' in globalScope &&
          globalScope['FontInspector'].enabled)
        globalScope['FontInspector'].fontAdded(this, url);

      return rule;
    },
    getPathGenerator: function (objs, character) {
      if (!(character in this.compiledGlyphs)) {
        var js = objs.get(this.loadedName + '_path_' + character);
        /*jshint -W054 */
        this.compiledGlyphs[character] = new Function('c', 'size', js);
      }
      return this.compiledGlyphs[character];
    }
  };
  return FontFace;
})();


}).call((typeof window === 'undefined') ? this : window);

if (!PDFJS.workerSrc && typeof document !== 'undefined') {
  // workerSrc is not set -- using last script url to define default location
  PDFJS.workerSrc = (function () {
    'use strict';
    var scriptTagContainer = document.body ||
                             document.getElementsByTagName('head')[0];
    var pdfjsSrc = scriptTagContainer.lastChild.src;
    return pdfjsSrc && pdfjsSrc.replace(/\.js$/i, '.worker.js');
  })();
}



/* Copyright 2012 Mozilla Foundation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/* globals VBArray, PDFJS */

'use strict';

// Initializing PDFJS global object here, it case if we need to change/disable
// some PDF.js features, e.g. range requests
if (typeof PDFJS === 'undefined') {
  (typeof window !== 'undefined' ? window : this).PDFJS = {};
}

// Checking if the typed arrays are supported
// Support: iOS<6.0 (subarray), IE<10, Android<4.0
(function checkTypedArrayCompatibility() {
  if (typeof Uint8Array !== 'undefined') {
    // Support: iOS<6.0
    if (typeof Uint8Array.prototype.subarray === 'undefined') {
        Uint8Array.prototype.subarray = function subarray(start, end) {
          return new Uint8Array(this.slice(start, end));
        };
        Float32Array.prototype.subarray = function subarray(start, end) {
          return new Float32Array(this.slice(start, end));
        };
    }

    // Support: Android<4.1
    if (typeof Float64Array === 'undefined') {
      window.Float64Array = Float32Array;
    }
    return;
  }

  function subarray(start, end) {
    return new TypedArray(this.slice(start, end));
  }

  function setArrayOffset(array, offset) {
    if (arguments.length < 2) {
      offset = 0;
    }
    for (var i = 0, n = array.length; i < n; ++i, ++offset) {
      this[offset] = array[i] & 0xFF;
    }
  }

  function TypedArray(arg1) {
    var result, i, n;
    if (typeof arg1 === 'number') {
      result = [];
      for (i = 0; i < arg1; ++i) {
        result[i] = 0;
      }
    } else if ('slice' in arg1) {
      result = arg1.slice(0);
    } else {
      result = [];
      for (i = 0, n = arg1.length; i < n; ++i) {
        result[i] = arg1[i];
      }
    }

    result.subarray = subarray;
    result.buffer = result;
    result.byteLength = result.length;
    result.set = setArrayOffset;

    if (typeof arg1 === 'object' && arg1.buffer) {
      result.buffer = arg1.buffer;
    }
    return result;
  }

  window.Uint8Array = TypedArray;
  window.Int8Array = TypedArray;

  // we don't need support for set, byteLength for 32-bit array
  // so we can use the TypedArray as well
  window.Uint32Array = TypedArray;
  window.Int32Array = TypedArray;
  window.Uint16Array = TypedArray;
  window.Float32Array = TypedArray;
  window.Float64Array = TypedArray;
})();

// URL = URL || webkitURL
// Support: Safari<7, Android 4.2+
(function normalizeURLObject() {
  if (!window.URL) {
    window.URL = window.webkitURL;
  }
})();

// Object.defineProperty()?
// Support: Android<4.0, Safari<5.1
(function checkObjectDefinePropertyCompatibility() {
  if (typeof Object.defineProperty !== 'undefined') {
    var definePropertyPossible = true;
    try {
      // some browsers (e.g. safari) cannot use defineProperty() on DOM objects
      // and thus the native version is not sufficient
      Object.defineProperty(new Image(), 'id', { value: 'test' });
      // ... another test for android gb browser for non-DOM objects
      var Test = function Test() {};
      Test.prototype = { get id() { } };
      Object.defineProperty(new Test(), 'id',
        { value: '', configurable: true, enumerable: true, writable: false });
    } catch (e) {
      definePropertyPossible = false;
    }
    if (definePropertyPossible) {
      return;
    }
  }

  Object.defineProperty = function objectDefineProperty(obj, name, def) {
    delete obj[name];
    if ('get' in def) {
      obj.__defineGetter__(name, def['get']);
    }
    if ('set' in def) {
      obj.__defineSetter__(name, def['set']);
    }
    if ('value' in def) {
      obj.__defineSetter__(name, function objectDefinePropertySetter(value) {
        this.__defineGetter__(name, function objectDefinePropertyGetter() {
          return value;
        });
        return value;
      });
      obj[name] = def.value;
    }
  };
})();


// No XMLHttpRequest#response?
// Support: IE<11, Android <4.0
(function checkXMLHttpRequestResponseCompatibility() {
  var xhrPrototype = XMLHttpRequest.prototype;
  var xhr = new XMLHttpRequest();
  if (!('overrideMimeType' in xhr)) {
    // IE10 might have response, but not overrideMimeType
    // Support: IE10
    Object.defineProperty(xhrPrototype, 'overrideMimeType', {
      value: function xmlHttpRequestOverrideMimeType(mimeType) {}
    });
  }
  if ('responseType' in xhr) {
    return;
  }

  // The worker will be using XHR, so we can save time and disable worker.
  PDFJS.disableWorker = true;

  Object.defineProperty(xhrPrototype, 'responseType', {
    get: function xmlHttpRequestGetResponseType() {
      return this._responseType || 'text';
    },
    set: function xmlHttpRequestSetResponseType(value) {
      if (value === 'text' || value === 'arraybuffer') {
        this._responseType = value;
        if (value === 'arraybuffer' &&
            typeof this.overrideMimeType === 'function') {
          this.overrideMimeType('text/plain; charset=x-user-defined');
        }
      }
    }
  });

  // Support: IE9
  if (typeof VBArray !== 'undefined') {
    Object.defineProperty(xhrPrototype, 'response', {
      get: function xmlHttpRequestResponseGet() {
        if (this.responseType === 'arraybuffer') {
          return new Uint8Array(new VBArray(this.responseBody).toArray());
        } else {
          return this.responseText;
        }
      }
    });
    return;
  }

  Object.defineProperty(xhrPrototype, 'response', {
    get: function xmlHttpRequestResponseGet() {
      if (this.responseType !== 'arraybuffer') {
        return this.responseText;
      }
      var text = this.responseText;
      var i, n = text.length;
      var result = new Uint8Array(n);
      for (i = 0; i < n; ++i) {
        result[i] = text.charCodeAt(i) & 0xFF;
      }
      return result.buffer;
    }
  });
})();

// window.btoa (base64 encode function) ?
// Support: IE<10
(function checkWindowBtoaCompatibility() {
  if ('btoa' in window) {
    return;
  }

  var digits =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';

  window.btoa = function windowBtoa(chars) {
    var buffer = '';
    var i, n;
    for (i = 0, n = chars.length; i < n; i += 3) {
      var b1 = chars.charCodeAt(i) & 0xFF;
      var b2 = chars.charCodeAt(i + 1) & 0xFF;
      var b3 = chars.charCodeAt(i + 2) & 0xFF;
      var d1 = b1 >> 2, d2 = ((b1 & 3) << 4) | (b2 >> 4);
      var d3 = i + 1 < n ? ((b2 & 0xF) << 2) | (b3 >> 6) : 64;
      var d4 = i + 2 < n ? (b3 & 0x3F) : 64;
      buffer += (digits.charAt(d1) + digits.charAt(d2) +
                 digits.charAt(d3) + digits.charAt(d4));
    }
    return buffer;
  };
})();

// window.atob (base64 encode function)?
// Support: IE<10
(function checkWindowAtobCompatibility() {
  if ('atob' in window) {
    return;
  }

  // https://github.com/davidchambers/Base64.js
  var digits =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
  window.atob = function (input) {
    input = input.replace(/=+$/, '');
    if (input.length % 4 === 1) {
      throw new Error('bad atob input');
    }
    for (
      // initialize result and counters
      var bc = 0, bs, buffer, idx = 0, output = '';
      // get next character
      buffer = input.charAt(idx++);
      // character found in table?
      // initialize bit storage and add its ascii value
      ~buffer && (bs = bc % 4 ? bs * 64 + buffer : buffer,
        // and if not first of each 4 characters,
        // convert the first 8 bits to one ascii character
        bc++ % 4) ? output += String.fromCharCode(255 & bs >> (-2 * bc & 6)) : 0
    ) {
      // try to find character in table (0-63, not found => -1)
      buffer = digits.indexOf(buffer);
    }
    return output;
  };
})();

// Function.prototype.bind?
// Support: Android<4.0, iOS<6.0
(function checkFunctionPrototypeBindCompatibility() {
  if (typeof Function.prototype.bind !== 'undefined') {
    return;
  }

  Function.prototype.bind = function functionPrototypeBind(obj) {
    var fn = this, headArgs = Array.prototype.slice.call(arguments, 1);
    var bound = function functionPrototypeBindBound() {
      var args = headArgs.concat(Array.prototype.slice.call(arguments));
      return fn.apply(obj, args);
    };
    return bound;
  };
})();

// HTMLElement dataset property
// Support: IE<11, Safari<5.1, Android<4.0
(function checkDatasetProperty() {
  var div = document.createElement('div');
  if ('dataset' in div) {
    return; // dataset property exists
  }

  Object.defineProperty(HTMLElement.prototype, 'dataset', {
    get: function() {
      if (this._dataset) {
        return this._dataset;
      }

      var dataset = {};
      for (var j = 0, jj = this.attributes.length; j < jj; j++) {
        var attribute = this.attributes[j];
        if (attribute.name.substring(0, 5) !== 'data-') {
          continue;
        }
        var key = attribute.name.substring(5).replace(/\-([a-z])/g,
          function(all, ch) {
            return ch.toUpperCase();
          });
        dataset[key] = attribute.value;
      }

      Object.defineProperty(this, '_dataset', {
        value: dataset,
        writable: false,
        enumerable: false
      });
      return dataset;
    },
    enumerable: true
  });
})();

// HTMLElement classList property
// Support: IE<10, Android<4.0, iOS<5.0
(function checkClassListProperty() {
  var div = document.createElement('div');
  if ('classList' in div) {
    return; // classList property exists
  }

  function changeList(element, itemName, add, remove) {
    var s = element.className || '';
    var list = s.split(/\s+/g);
    if (list[0] === '') {
      list.shift();
    }
    var index = list.indexOf(itemName);
    if (index < 0 && add) {
      list.push(itemName);
    }
    if (index >= 0 && remove) {
      list.splice(index, 1);
    }
    element.className = list.join(' ');
    return (index >= 0);
  }

  var classListPrototype = {
    add: function(name) {
      changeList(this.element, name, true, false);
    },
    contains: function(name) {
      return changeList(this.element, name, false, false);
    },
    remove: function(name) {
      changeList(this.element, name, false, true);
    },
    toggle: function(name) {
      changeList(this.element, name, true, true);
    }
  };

  Object.defineProperty(HTMLElement.prototype, 'classList', {
    get: function() {
      if (this._classList) {
        return this._classList;
      }

      var classList = Object.create(classListPrototype, {
        element: {
          value: this,
          writable: false,
          enumerable: true
        }
      });
      Object.defineProperty(this, '_classList', {
        value: classList,
        writable: false,
        enumerable: false
      });
      return classList;
    },
    enumerable: true
  });
})();

// Check console compatibility
// In older IE versions the console object is not available
// unless console is open.
// Support: IE<10
(function checkConsoleCompatibility() {
  if (!('console' in window)) {
    window.console = {
      log: function() {},
      error: function() {},
      warn: function() {}
    };
  } else if (!('bind' in console.log)) {
    // native functions in IE9 might not have bind
    console.log = (function(fn) {
      return function(msg) { return fn(msg); };
    })(console.log);
    console.error = (function(fn) {
      return function(msg) { return fn(msg); };
    })(console.error);
    console.warn = (function(fn) {
      return function(msg) { return fn(msg); };
    })(console.warn);
  }
})();

// Check onclick compatibility in Opera
// Support: Opera<15
(function checkOnClickCompatibility() {
  // workaround for reported Opera bug DSK-354448:
  // onclick fires on disabled buttons with opaque content
  function ignoreIfTargetDisabled(event) {
    if (isDisabled(event.target)) {
      event.stopPropagation();
    }
  }
  function isDisabled(node) {
    return node.disabled || (node.parentNode && isDisabled(node.parentNode));
  }
  if (navigator.userAgent.indexOf('Opera') !== -1) {
    // use browser detection since we cannot feature-check this bug
    document.addEventListener('click', ignoreIfTargetDisabled, true);
  }
})();

// Checks if possible to use URL.createObjectURL()
// Support: IE
(function checkOnBlobSupport() {
  // sometimes IE loosing the data created with createObjectURL(), see #3977
  if (navigator.userAgent.indexOf('Trident') >= 0) {
    PDFJS.disableCreateObjectURL = true;
  }
})();

// Checks if navigator.language is supported
(function checkNavigatorLanguage() {
  if ('language' in navigator) {
    return;
  }
  PDFJS.locale = navigator.userLanguage || 'en-US';
})();

(function checkRangeRequests() {
  // Safari has issues with cached range requests see:
  // https://github.com/mozilla/pdf.js/issues/3260
  // Last tested with version 6.0.4.
  // Support: Safari 6.0+
  var isSafari = Object.prototype.toString.call(
                  window.HTMLElement).indexOf('Constructor') > 0;

  // Older versions of Android (pre 3.0) has issues with range requests, see:
  // https://github.com/mozilla/pdf.js/issues/3381.
  // Make sure that we only match webkit-based Android browsers,
  // since Firefox/Fennec works as expected.
  // Support: Android<3.0
  var regex = /Android\s[0-2][^\d]/;
  var isOldAndroid = regex.test(navigator.userAgent);

  // Range requests are broken in Chrome 39 and 40, https://crbug.com/442318
  var isChromeWithRangeBug = /Chrome\/(39|40)\./.test(navigator.userAgent);

  if (isSafari || isOldAndroid || isChromeWithRangeBug) {
    PDFJS.disableRange = true;
    PDFJS.disableStream = true;
  }
})();

// Check if the browser supports manipulation of the history.
// Support: IE<10, Android<4.2
(function checkHistoryManipulation() {
  // Android 2.x has so buggy pushState support that it was removed in
  // Android 3.0 and restored as late as in Android 4.2.
  // Support: Android 2.x
  if (!history.pushState || navigator.userAgent.indexOf('Android 2.') >= 0) {
    PDFJS.disableHistory = true;
  }
})();

// Support: IE<11, Chrome<21, Android<4.4, Safari<6
(function checkSetPresenceInImageData() {
  // IE < 11 will use window.CanvasPixelArray which lacks set function.
  if (window.CanvasPixelArray) {
    if (typeof window.CanvasPixelArray.prototype.set !== 'function') {
      window.CanvasPixelArray.prototype.set = function(arr) {
        for (var i = 0, ii = this.length; i < ii; i++) {
          this[i] = arr[i];
        }
      };
    }
  } else {
    // Old Chrome and Android use an inaccessible CanvasPixelArray prototype.
    // Because we cannot feature detect it, we rely on user agent parsing.
    var polyfill = false, versionMatch;
    if (navigator.userAgent.indexOf('Chrom') >= 0) {
      versionMatch = navigator.userAgent.match(/Chrom(e|ium)\/([0-9]+)\./);
      // Chrome < 21 lacks the set function.
      polyfill = versionMatch && parseInt(versionMatch[2]) < 21;
    } else if (navigator.userAgent.indexOf('Android') >= 0) {
      // Android < 4.4 lacks the set function.
      // Android >= 4.4 will contain Chrome in the user agent,
      // thus pass the Chrome check above and not reach this block.
      polyfill = /Android\s[0-4][^\d]/g.test(navigator.userAgent);
    } else if (navigator.userAgent.indexOf('Safari') >= 0) {
      versionMatch = navigator.userAgent.
        match(/Version\/([0-9]+)\.([0-9]+)\.([0-9]+) Safari\//);
      // Safari < 6 lacks the set function.
      polyfill = versionMatch && parseInt(versionMatch[1]) < 6;
    }

    if (polyfill) {
      var contextPrototype = window.CanvasRenderingContext2D.prototype;
      var createImageData = contextPrototype.createImageData;
      contextPrototype.createImageData = function(w, h) {
        var imageData = createImageData.call(this, w, h);
        imageData.data.set = function(arr) {
          for (var i = 0, ii = this.length; i < ii; i++) {
            this[i] = arr[i];
          }
        };
        return imageData;
      };
      // this closure will be kept referenced, so clear its vars
      contextPrototype = null;
    }
  }
})();

// Support: IE<10, Android<4.0, iOS
(function checkRequestAnimationFrame() {
  function fakeRequestAnimationFrame(callback) {
    window.setTimeout(callback, 20);
  }

  var isIOS = /(iPad|iPhone|iPod)/g.test(navigator.userAgent);
  if (isIOS) {
    // requestAnimationFrame on iOS is broken, replacing with fake one.
    window.requestAnimationFrame = fakeRequestAnimationFrame;
    return;
  }
  if ('requestAnimationFrame' in window) {
    return;
  }
  window.requestAnimationFrame =
    window.mozRequestAnimationFrame ||
    window.webkitRequestAnimationFrame ||
    fakeRequestAnimationFrame;
})();

(function checkCanvasSizeLimitation() {
  var isIOS = /(iPad|iPhone|iPod)/g.test(navigator.userAgent);
  var isAndroid = /Android/g.test(navigator.userAgent);
  if (isIOS || isAndroid) {
    // 5MP
    PDFJS.maxCanvasPixels = 5242880;
  }
})();

// Disable fullscreen support for certain problematic configurations.
// Support: IE11+ (when embedded).
(function checkFullscreenSupport() {
  var isEmbeddedIE = (navigator.userAgent.indexOf('Trident') >= 0 &&
                      window.parent !== window);
  if (isEmbeddedIE) {
    PDFJS.disableFullscreen = true;
  }
})();

// Provides document.currentScript support
// Support: IE, Chrome<29.
(function checkCurrentScript() {
  if ('currentScript' in document) {
    return;
  }
  Object.defineProperty(document, 'currentScript', {
    get: function () {
      var scripts = document.getElementsByTagName('script');
      return scripts[scripts.length - 1];
    },
    enumerable: true,
    configurable: true
  });
})();
!function(t){function e(r){if(n[r])return n[r].exports;var i=n[r]={exports:{},id:r,loaded:!1};return t[r].call(i.exports,i,i.exports,e),i.loaded=!0,i.exports}var n={};return e.m=t,e.c=n,e.p="",e(0)}([function(t,e,n){(function(e){t.exports=e.pdfMake=n(1)}).call(e,function(){return this}())},function(t,e,n){(function(e){"use strict";function r(t,e,n){this.docDefinition=t,this.fonts=e||s,this.vfs=n}var i=n(6),o=n(105),a=o.saveAs,s={Roboto:{normal:"Roboto-Regular.ttf",bold:"Roboto-Medium.ttf",italics:"Roboto-Italic.ttf",bolditalics:"Roboto-Italic.ttf"}};r.prototype._createDoc=function(t,n){var r=new i(this.fonts);r.fs.bindFS(this.vfs);var o,a=r.createPdfKitDocument(this.docDefinition,t),s=[];a.on("data",function(t){s.push(t)}),a.on("end",function(){o=e.concat(s),n(o,a._pdfMakePages)}),a.end()},r.prototype._getPages=function(t,e){if(!e)throw"getBuffer is an async method and needs a callback argument";this._createDoc(t,function(t,n){e(n)})},r.prototype.open=function(t){var e=window.open("","_blank");try{this.getDataUrl(function(t){e.location.href=t})}catch(n){throw e.close(),n}},r.prototype.print=function(){this.getDataUrl(function(t){var e=document.createElement("iframe");e.style.position="absolute",e.style.left="-99999px",e.src=t,e.onload=function(){function t(){document.body.removeChild(e),document.removeEventListener("click",t)}document.addEventListener("click",t,!1)},document.body.appendChild(e)},{autoPrint:!0})},r.prototype.download=function(t,e){"function"==typeof t&&(e=t,t=null),t=t||"file.pdf",this.getBuffer(function(n){var r;try{r=new Blob([n],{type:"application/pdf"})}catch(i){if("InvalidStateError"==i.name){var o=new Uint8Array(n);r=new Blob([o.buffer],{type:"application/pdf"})}}if(!r)throw"Could not generate blob";a(r,t),"function"==typeof e&&e()})},r.prototype.getBase64=function(t,e){if(!t)throw"getBase64 is an async method and needs a callback argument";this._createDoc(e,function(e){t(e.toString("base64"))})},r.prototype.getDataUrl=function(t,e){if(!t)throw"getDataUrl is an async method and needs a callback argument";this._createDoc(e,function(e){t("data:application/pdf;base64,"+e.toString("base64"))})},r.prototype.getBuffer=function(t,e){if(!t)throw"getBuffer is an async method and needs a callback argument";this._createDoc(e,function(e){t(e)})},t.exports={createPdf:function(t){return new r(t,window.pdfMake.fonts,window.pdfMake.vfs)}}}).call(e,n(2).Buffer)},function(t,e,n){(function(t,r){function i(){function t(){}try{var e=new Uint8Array(1);return e.foo=function(){return 42},e.constructor=t,42===e.foo()&&e.constructor===t&&"function"==typeof e.subarray&&0===e.subarray(1,1).byteLength}catch(n){return!1}}function o(){return t.TYPED_ARRAY_SUPPORT?2147483647:1073741823}function t(e){return this instanceof t?(this.length=0,this.parent=void 0,"number"==typeof e?a(this,e):"string"==typeof e?s(this,e,arguments.length>1?arguments[1]:"utf8"):h(this,e)):arguments.length>1?new t(e,arguments[1]):new t(e)}function a(e,n){if(e=g(e,0>n?0:0|v(n)),!t.TYPED_ARRAY_SUPPORT)for(var r=0;n>r;r++)e[r]=0;return e}function s(t,e,n){("string"!=typeof n||""===n)&&(n="utf8");var r=0|y(e,n);return t=g(t,r),t.write(e,n),t}function h(e,n){if(t.isBuffer(n))return u(e,n);if(V(n))return c(e,n);if(null==n)throw new TypeError("must start with number, buffer, array or string");if("undefined"!=typeof ArrayBuffer){if(n.buffer instanceof ArrayBuffer)return l(e,n);if(n instanceof ArrayBuffer)return f(e,n)}return n.length?d(e,n):p(e,n)}function u(t,e){var n=0|v(e.length);return t=g(t,n),e.copy(t,0,0,n),t}function c(t,e){var n=0|v(e.length);t=g(t,n);for(var r=0;n>r;r+=1)t[r]=255&e[r];return t}function l(t,e){var n=0|v(e.length);t=g(t,n);for(var r=0;n>r;r+=1)t[r]=255&e[r];return t}function f(e,n){return t.TYPED_ARRAY_SUPPORT?(n.byteLength,e=t._augment(new Uint8Array(n))):e=l(e,new Uint8Array(n)),e}function d(t,e){var n=0|v(e.length);t=g(t,n);for(var r=0;n>r;r+=1)t[r]=255&e[r];return t}function p(t,e){var n,r=0;"Buffer"===e.type&&V(e.data)&&(n=e.data,r=0|v(n.length)),t=g(t,r);for(var i=0;r>i;i+=1)t[i]=255&n[i];return t}function g(e,n){t.TYPED_ARRAY_SUPPORT?(e=t._augment(new Uint8Array(n)),e.__proto__=t.prototype):(e.length=n,e._isBuffer=!0);var r=0!==n&&n<=t.poolSize>>>1;return r&&(e.parent=$),e}function v(t){if(t>=o())throw new RangeError("Attempt to allocate Buffer larger than maximum size: 0x"+o().toString(16)+" bytes");return 0|t}function m(e,n){if(!(this instanceof m))return new m(e,n);var r=new t(e,n);return delete r.parent,r}function y(t,e){"string"!=typeof t&&(t=""+t);var n=t.length;if(0===n)return 0;for(var r=!1;;)switch(e){case"ascii":case"binary":case"raw":case"raws":return n;case"utf8":case"utf-8":return H(t).length;case"ucs2":case"ucs-2":case"utf16le":case"utf-16le":return 2*n;case"hex":return n>>>1;case"base64":return Y(t).length;default:if(r)return H(t).length;e=(""+e).toLowerCase(),r=!0}}function _(t,e,n){var r=!1;if(e=0|e,n=void 0===n||n===1/0?this.length:0|n,t||(t="utf8"),0>e&&(e=0),n>this.length&&(n=this.length),e>=n)return"";for(;;)switch(t){case"hex":return T(this,e,n);case"utf8":case"utf-8":return I(this,e,n);case"ascii":return L(this,e,n);case"binary":return R(this,e,n);case"base64":return C(this,e,n);case"ucs2":case"ucs-2":case"utf16le":case"utf-16le":return B(this,e,n);default:if(r)throw new TypeError("Unknown encoding: "+t);t=(t+"").toLowerCase(),r=!0}}function w(t,e,n,r){n=Number(n)||0;var i=t.length-n;r?(r=Number(r),r>i&&(r=i)):r=i;var o=e.length;if(o%2!==0)throw new Error("Invalid hex string");r>o/2&&(r=o/2);for(var a=0;r>a;a++){var s=parseInt(e.substr(2*a,2),16);if(isNaN(s))throw new Error("Invalid hex string");t[n+a]=s}return a}function b(t,e,n,r){return q(H(e,t.length-n),t,n,r)}function x(t,e,n,r){return q(Z(e),t,n,r)}function S(t,e,n,r){return x(t,e,n,r)}function k(t,e,n,r){return q(Y(e),t,n,r)}function E(t,e,n,r){return q(G(e,t.length-n),t,n,r)}function C(t,e,n){return 0===e&&n===t.length?K.fromByteArray(t):K.fromByteArray(t.slice(e,n))}function I(t,e,n){n=Math.min(t.length,n);for(var r=[],i=e;n>i;){var o=t[i],a=null,s=o>239?4:o>223?3:o>191?2:1;if(n>=i+s){var h,u,c,l;switch(s){case 1:128>o&&(a=o);break;case 2:h=t[i+1],128===(192&h)&&(l=(31&o)<<6|63&h,l>127&&(a=l));break;case 3:h=t[i+1],u=t[i+2],128===(192&h)&&128===(192&u)&&(l=(15&o)<<12|(63&h)<<6|63&u,l>2047&&(55296>l||l>57343)&&(a=l));break;case 4:h=t[i+1],u=t[i+2],c=t[i+3],128===(192&h)&&128===(192&u)&&128===(192&c)&&(l=(15&o)<<18|(63&h)<<12|(63&u)<<6|63&c,l>65535&&1114112>l&&(a=l))}}null===a?(a=65533,s=1):a>65535&&(a-=65536,r.push(a>>>10&1023|55296),a=56320|1023&a),r.push(a),i+=s}return A(r)}function A(t){var e=t.length;if(J>=e)return String.fromCharCode.apply(String,t);for(var n="",r=0;e>r;)n+=String.fromCharCode.apply(String,t.slice(r,r+=J));return n}function L(t,e,n){var r="";n=Math.min(t.length,n);for(var i=e;n>i;i++)r+=String.fromCharCode(127&t[i]);return r}function R(t,e,n){var r="";n=Math.min(t.length,n);for(var i=e;n>i;i++)r+=String.fromCharCode(t[i]);return r}function T(t,e,n){var r=t.length;(!e||0>e)&&(e=0),(!n||0>n||n>r)&&(n=r);for(var i="",o=e;n>o;o++)i+=j(t[o]);return i}function B(t,e,n){for(var r=t.slice(e,n),i="",o=0;o<r.length;o+=2)i+=String.fromCharCode(r[o]+256*r[o+1]);return i}function O(t,e,n){if(t%1!==0||0>t)throw new RangeError("offset is not uint");if(t+e>n)throw new RangeError("Trying to access beyond buffer length")}function M(e,n,r,i,o,a){if(!t.isBuffer(e))throw new TypeError("buffer must be a Buffer instance");if(n>o||a>n)throw new RangeError("value is out of bounds");if(r+i>e.length)throw new RangeError("index out of range")}function D(t,e,n,r){0>e&&(e=65535+e+1);for(var i=0,o=Math.min(t.length-n,2);o>i;i++)t[n+i]=(e&255<<8*(r?i:1-i))>>>8*(r?i:1-i)}function U(t,e,n,r){0>e&&(e=4294967295+e+1);for(var i=0,o=Math.min(t.length-n,4);o>i;i++)t[n+i]=e>>>8*(r?i:3-i)&255}function P(t,e,n,r,i,o){if(e>i||o>e)throw new RangeError("value is out of bounds");if(n+r>t.length)throw new RangeError("index out of range");if(0>n)throw new RangeError("index out of range")}function z(t,e,n,r,i){return i||P(t,e,n,4,3.4028234663852886e38,-3.4028234663852886e38),X.write(t,e,n,r,23,4),n+4}function F(t,e,n,r,i){return i||P(t,e,n,8,1.7976931348623157e308,-1.7976931348623157e308),X.write(t,e,n,r,52,8),n+8}function W(t){if(t=N(t).replace(tt,""),t.length<2)return"";for(;t.length%4!==0;)t+="=";return t}function N(t){return t.trim?t.trim():t.replace(/^\s+|\s+$/g,"")}function j(t){return 16>t?"0"+t.toString(16):t.toString(16)}function H(t,e){e=e||1/0;for(var n,r=t.length,i=null,o=[],a=0;r>a;a++){if(n=t.charCodeAt(a),n>55295&&57344>n){if(!i){if(n>56319){(e-=3)>-1&&o.push(239,191,189);continue}if(a+1===r){(e-=3)>-1&&o.push(239,191,189);continue}i=n;continue}if(56320>n){(e-=3)>-1&&o.push(239,191,189),i=n;continue}n=i-55296<<10|n-56320|65536}else i&&(e-=3)>-1&&o.push(239,191,189);if(i=null,128>n){if((e-=1)<0)break;o.push(n)}else if(2048>n){if((e-=2)<0)break;o.push(n>>6|192,63&n|128)}else if(65536>n){if((e-=3)<0)break;o.push(n>>12|224,n>>6&63|128,63&n|128)}else{if(!(1114112>n))throw new Error("Invalid code point");if((e-=4)<0)break;o.push(n>>18|240,n>>12&63|128,n>>6&63|128,63&n|128)}}return o}function Z(t){for(var e=[],n=0;n<t.length;n++)e.push(255&t.charCodeAt(n));return e}function G(t,e){for(var n,r,i,o=[],a=0;a<t.length&&!((e-=2)<0);a++)n=t.charCodeAt(a),r=n>>8,i=n%256,o.push(i),o.push(r);return o}function Y(t){return K.toByteArray(W(t))}function q(t,e,n,r){for(var i=0;r>i&&!(i+n>=e.length||i>=t.length);i++)e[i+n]=t[i];return i}/*!
	 * The buffer module from node.js, for the browser.
	 *
	 * @author   Feross Aboukhadijeh <feross@feross.org> <http://feross.org>
	 * @license  MIT
	 */
var K=n(3),X=n(4),V=n(5);e.Buffer=t,e.SlowBuffer=m,e.INSPECT_MAX_BYTES=50,t.poolSize=8192;var $={};t.TYPED_ARRAY_SUPPORT=void 0!==r.TYPED_ARRAY_SUPPORT?r.TYPED_ARRAY_SUPPORT:i(),t.TYPED_ARRAY_SUPPORT&&(t.prototype.__proto__=Uint8Array.prototype,t.__proto__=Uint8Array),t.isBuffer=function(t){return!(null==t||!t._isBuffer)},t.compare=function(e,n){if(!t.isBuffer(e)||!t.isBuffer(n))throw new TypeError("Arguments must be Buffers");if(e===n)return 0;for(var r=e.length,i=n.length,o=0,a=Math.min(r,i);a>o&&e[o]===n[o];)++o;return o!==a&&(r=e[o],i=n[o]),i>r?-1:r>i?1:0},t.isEncoding=function(t){switch(String(t).toLowerCase()){case"hex":case"utf8":case"utf-8":case"ascii":case"binary":case"base64":case"raw":case"ucs2":case"ucs-2":case"utf16le":case"utf-16le":return!0;default:return!1}},t.concat=function(e,n){if(!V(e))throw new TypeError("list argument must be an Array of Buffers.");if(0===e.length)return new t(0);var r;if(void 0===n)for(n=0,r=0;r<e.length;r++)n+=e[r].length;var i=new t(n),o=0;for(r=0;r<e.length;r++){var a=e[r];a.copy(i,o),o+=a.length}return i},t.byteLength=y,t.prototype.length=void 0,t.prototype.parent=void 0,t.prototype.toString=function(){var t=0|this.length;return 0===t?"":0===arguments.length?I(this,0,t):_.apply(this,arguments)},t.prototype.equals=function(e){if(!t.isBuffer(e))throw new TypeError("Argument must be a Buffer");return this===e?!0:0===t.compare(this,e)},t.prototype.inspect=function(){var t="",n=e.INSPECT_MAX_BYTES;return this.length>0&&(t=this.toString("hex",0,n).match(/.{2}/g).join(" "),this.length>n&&(t+=" ... ")),"<Buffer "+t+">"},t.prototype.compare=function(e){if(!t.isBuffer(e))throw new TypeError("Argument must be a Buffer");return this===e?0:t.compare(this,e)},t.prototype.indexOf=function(e,n){function r(t,e,n){for(var r=-1,i=0;n+i<t.length;i++)if(t[n+i]===e[-1===r?0:i-r]){if(-1===r&&(r=i),i-r+1===e.length)return n+r}else r=-1;return-1}if(n>2147483647?n=2147483647:-2147483648>n&&(n=-2147483648),n>>=0,0===this.length)return-1;if(n>=this.length)return-1;if(0>n&&(n=Math.max(this.length+n,0)),"string"==typeof e)return 0===e.length?-1:String.prototype.indexOf.call(this,e,n);if(t.isBuffer(e))return r(this,e,n);if("number"==typeof e)return t.TYPED_ARRAY_SUPPORT&&"function"===Uint8Array.prototype.indexOf?Uint8Array.prototype.indexOf.call(this,e,n):r(this,[e],n);throw new TypeError("val must be string, number or Buffer")},t.prototype.get=function(t){return this.readUInt8(t)},t.prototype.set=function(t,e){return this.writeUInt8(t,e)},t.prototype.write=function(t,e,n,r){if(void 0===e)r="utf8",n=this.length,e=0;else if(void 0===n&&"string"==typeof e)r=e,n=this.length,e=0;else if(isFinite(e))e=0|e,isFinite(n)?(n=0|n,void 0===r&&(r="utf8")):(r=n,n=void 0);else{var i=r;r=e,e=0|n,n=i}var o=this.length-e;if((void 0===n||n>o)&&(n=o),t.length>0&&(0>n||0>e)||e>this.length)throw new RangeError("attempt to write outside buffer bounds");r||(r="utf8");for(var a=!1;;)switch(r){case"hex":return w(this,t,e,n);case"utf8":case"utf-8":return b(this,t,e,n);case"ascii":return x(this,t,e,n);case"binary":return S(this,t,e,n);case"base64":return k(this,t,e,n);case"ucs2":case"ucs-2":case"utf16le":case"utf-16le":return E(this,t,e,n);default:if(a)throw new TypeError("Unknown encoding: "+r);r=(""+r).toLowerCase(),a=!0}},t.prototype.toJSON=function(){return{type:"Buffer",data:Array.prototype.slice.call(this._arr||this,0)}};var J=4096;t.prototype.slice=function(e,n){var r=this.length;e=~~e,n=void 0===n?r:~~n,0>e?(e+=r,0>e&&(e=0)):e>r&&(e=r),0>n?(n+=r,0>n&&(n=0)):n>r&&(n=r),e>n&&(n=e);var i;if(t.TYPED_ARRAY_SUPPORT)i=t._augment(this.subarray(e,n));else{var o=n-e;i=new t(o,void 0);for(var a=0;o>a;a++)i[a]=this[a+e]}return i.length&&(i.parent=this.parent||this),i},t.prototype.readUIntLE=function(t,e,n){t=0|t,e=0|e,n||O(t,e,this.length);for(var r=this[t],i=1,o=0;++o<e&&(i*=256);)r+=this[t+o]*i;return r},t.prototype.readUIntBE=function(t,e,n){t=0|t,e=0|e,n||O(t,e,this.length);for(var r=this[t+--e],i=1;e>0&&(i*=256);)r+=this[t+--e]*i;return r},t.prototype.readUInt8=function(t,e){return e||O(t,1,this.length),this[t]},t.prototype.readUInt16LE=function(t,e){return e||O(t,2,this.length),this[t]|this[t+1]<<8},t.prototype.readUInt16BE=function(t,e){return e||O(t,2,this.length),this[t]<<8|this[t+1]},t.prototype.readUInt32LE=function(t,e){return e||O(t,4,this.length),(this[t]|this[t+1]<<8|this[t+2]<<16)+16777216*this[t+3]},t.prototype.readUInt32BE=function(t,e){return e||O(t,4,this.length),16777216*this[t]+(this[t+1]<<16|this[t+2]<<8|this[t+3])},t.prototype.readIntLE=function(t,e,n){t=0|t,e=0|e,n||O(t,e,this.length);for(var r=this[t],i=1,o=0;++o<e&&(i*=256);)r+=this[t+o]*i;return i*=128,r>=i&&(r-=Math.pow(2,8*e)),r},t.prototype.readIntBE=function(t,e,n){t=0|t,e=0|e,n||O(t,e,this.length);for(var r=e,i=1,o=this[t+--r];r>0&&(i*=256);)o+=this[t+--r]*i;return i*=128,o>=i&&(o-=Math.pow(2,8*e)),o},t.prototype.readInt8=function(t,e){return e||O(t,1,this.length),128&this[t]?-1*(255-this[t]+1):this[t]},t.prototype.readInt16LE=function(t,e){e||O(t,2,this.length);var n=this[t]|this[t+1]<<8;return 32768&n?4294901760|n:n},t.prototype.readInt16BE=function(t,e){e||O(t,2,this.length);var n=this[t+1]|this[t]<<8;return 32768&n?4294901760|n:n},t.prototype.readInt32LE=function(t,e){return e||O(t,4,this.length),this[t]|this[t+1]<<8|this[t+2]<<16|this[t+3]<<24},t.prototype.readInt32BE=function(t,e){return e||O(t,4,this.length),this[t]<<24|this[t+1]<<16|this[t+2]<<8|this[t+3]},t.prototype.readFloatLE=function(t,e){return e||O(t,4,this.length),X.read(this,t,!0,23,4)},t.prototype.readFloatBE=function(t,e){return e||O(t,4,this.length),X.read(this,t,!1,23,4)},t.prototype.readDoubleLE=function(t,e){return e||O(t,8,this.length),X.read(this,t,!0,52,8)},t.prototype.readDoubleBE=function(t,e){return e||O(t,8,this.length),X.read(this,t,!1,52,8)},t.prototype.writeUIntLE=function(t,e,n,r){t=+t,e=0|e,n=0|n,r||M(this,t,e,n,Math.pow(2,8*n),0);var i=1,o=0;for(this[e]=255&t;++o<n&&(i*=256);)this[e+o]=t/i&255;return e+n},t.prototype.writeUIntBE=function(t,e,n,r){t=+t,e=0|e,n=0|n,r||M(this,t,e,n,Math.pow(2,8*n),0);var i=n-1,o=1;for(this[e+i]=255&t;--i>=0&&(o*=256);)this[e+i]=t/o&255;return e+n},t.prototype.writeUInt8=function(e,n,r){return e=+e,n=0|n,r||M(this,e,n,1,255,0),t.TYPED_ARRAY_SUPPORT||(e=Math.floor(e)),this[n]=255&e,n+1},t.prototype.writeUInt16LE=function(e,n,r){return e=+e,n=0|n,r||M(this,e,n,2,65535,0),t.TYPED_ARRAY_SUPPORT?(this[n]=255&e,this[n+1]=e>>>8):D(this,e,n,!0),n+2},t.prototype.writeUInt16BE=function(e,n,r){return e=+e,n=0|n,r||M(this,e,n,2,65535,0),t.TYPED_ARRAY_SUPPORT?(this[n]=e>>>8,this[n+1]=255&e):D(this,e,n,!1),n+2},t.prototype.writeUInt32LE=function(e,n,r){return e=+e,n=0|n,r||M(this,e,n,4,4294967295,0),t.TYPED_ARRAY_SUPPORT?(this[n+3]=e>>>24,this[n+2]=e>>>16,this[n+1]=e>>>8,this[n]=255&e):U(this,e,n,!0),n+4},t.prototype.writeUInt32BE=function(e,n,r){return e=+e,n=0|n,r||M(this,e,n,4,4294967295,0),t.TYPED_ARRAY_SUPPORT?(this[n]=e>>>24,this[n+1]=e>>>16,this[n+2]=e>>>8,this[n+3]=255&e):U(this,e,n,!1),n+4},t.prototype.writeIntLE=function(t,e,n,r){if(t=+t,e=0|e,!r){var i=Math.pow(2,8*n-1);M(this,t,e,n,i-1,-i)}var o=0,a=1,s=0>t?1:0;for(this[e]=255&t;++o<n&&(a*=256);)this[e+o]=(t/a>>0)-s&255;return e+n},t.prototype.writeIntBE=function(t,e,n,r){if(t=+t,e=0|e,!r){var i=Math.pow(2,8*n-1);M(this,t,e,n,i-1,-i)}var o=n-1,a=1,s=0>t?1:0;for(this[e+o]=255&t;--o>=0&&(a*=256);)this[e+o]=(t/a>>0)-s&255;return e+n},t.prototype.writeInt8=function(e,n,r){return e=+e,n=0|n,r||M(this,e,n,1,127,-128),t.TYPED_ARRAY_SUPPORT||(e=Math.floor(e)),0>e&&(e=255+e+1),this[n]=255&e,n+1},t.prototype.writeInt16LE=function(e,n,r){return e=+e,n=0|n,r||M(this,e,n,2,32767,-32768),t.TYPED_ARRAY_SUPPORT?(this[n]=255&e,this[n+1]=e>>>8):D(this,e,n,!0),n+2},t.prototype.writeInt16BE=function(e,n,r){return e=+e,n=0|n,r||M(this,e,n,2,32767,-32768),t.TYPED_ARRAY_SUPPORT?(this[n]=e>>>8,this[n+1]=255&e):D(this,e,n,!1),n+2},t.prototype.writeInt32LE=function(e,n,r){return e=+e,n=0|n,r||M(this,e,n,4,2147483647,-2147483648),t.TYPED_ARRAY_SUPPORT?(this[n]=255&e,this[n+1]=e>>>8,this[n+2]=e>>>16,this[n+3]=e>>>24):U(this,e,n,!0),n+4},t.prototype.writeInt32BE=function(e,n,r){return e=+e,n=0|n,r||M(this,e,n,4,2147483647,-2147483648),0>e&&(e=4294967295+e+1),t.TYPED_ARRAY_SUPPORT?(this[n]=e>>>24,this[n+1]=e>>>16,this[n+2]=e>>>8,this[n+3]=255&e):U(this,e,n,!1),n+4},t.prototype.writeFloatLE=function(t,e,n){return z(this,t,e,!0,n)},t.prototype.writeFloatBE=function(t,e,n){return z(this,t,e,!1,n)},t.prototype.writeDoubleLE=function(t,e,n){return F(this,t,e,!0,n)},t.prototype.writeDoubleBE=function(t,e,n){return F(this,t,e,!1,n)},t.prototype.copy=function(e,n,r,i){if(r||(r=0),i||0===i||(i=this.length),n>=e.length&&(n=e.length),n||(n=0),i>0&&r>i&&(i=r),i===r)return 0;if(0===e.length||0===this.length)return 0;if(0>n)throw new RangeError("targetStart out of bounds");if(0>r||r>=this.length)throw new RangeError("sourceStart out of bounds");if(0>i)throw new RangeError("sourceEnd out of bounds");i>this.length&&(i=this.length),e.length-n<i-r&&(i=e.length-n+r);var o,a=i-r;if(this===e&&n>r&&i>n)for(o=a-1;o>=0;o--)e[o+n]=this[o+r];else if(1e3>a||!t.TYPED_ARRAY_SUPPORT)for(o=0;a>o;o++)e[o+n]=this[o+r];else e._set(this.subarray(r,r+a),n);return a},t.prototype.fill=function(t,e,n){if(t||(t=0),e||(e=0),n||(n=this.length),e>n)throw new RangeError("end < start");if(n!==e&&0!==this.length){if(0>e||e>=this.length)throw new RangeError("start out of bounds");if(0>n||n>this.length)throw new RangeError("end out of bounds");var r;if("number"==typeof t)for(r=e;n>r;r++)this[r]=t;else{var i=H(t.toString()),o=i.length;for(r=e;n>r;r++)this[r]=i[r%o]}return this}},t.prototype.toArrayBuffer=function(){if("undefined"!=typeof Uint8Array){if(t.TYPED_ARRAY_SUPPORT)return new t(this).buffer;for(var e=new Uint8Array(this.length),n=0,r=e.length;r>n;n+=1)e[n]=this[n];return e.buffer}throw new TypeError("Buffer.toArrayBuffer not supported in this browser")};var Q=t.prototype;t._augment=function(e){return e.constructor=t,e._isBuffer=!0,e._set=e.set,e.get=Q.get,e.set=Q.set,e.write=Q.write,e.toString=Q.toString,e.toLocaleString=Q.toString,e.toJSON=Q.toJSON,e.equals=Q.equals,e.compare=Q.compare,e.indexOf=Q.indexOf,e.copy=Q.copy,e.slice=Q.slice,e.readUIntLE=Q.readUIntLE,e.readUIntBE=Q.readUIntBE,e.readUInt8=Q.readUInt8,e.readUInt16LE=Q.readUInt16LE,e.readUInt16BE=Q.readUInt16BE,e.readUInt32LE=Q.readUInt32LE,e.readUInt32BE=Q.readUInt32BE,e.readIntLE=Q.readIntLE,e.readIntBE=Q.readIntBE,e.readInt8=Q.readInt8,e.readInt16LE=Q.readInt16LE,e.readInt16BE=Q.readInt16BE,e.readInt32LE=Q.readInt32LE,e.readInt32BE=Q.readInt32BE,e.readFloatLE=Q.readFloatLE,e.readFloatBE=Q.readFloatBE,e.readDoubleLE=Q.readDoubleLE,e.readDoubleBE=Q.readDoubleBE,e.writeUInt8=Q.writeUInt8,e.writeUIntLE=Q.writeUIntLE,e.writeUIntBE=Q.writeUIntBE,e.writeUInt16LE=Q.writeUInt16LE,e.writeUInt16BE=Q.writeUInt16BE,e.writeUInt32LE=Q.writeUInt32LE,e.writeUInt32BE=Q.writeUInt32BE,e.writeIntLE=Q.writeIntLE,e.writeIntBE=Q.writeIntBE,e.writeInt8=Q.writeInt8,e.writeInt16LE=Q.writeInt16LE,e.writeInt16BE=Q.writeInt16BE,e.writeInt32LE=Q.writeInt32LE,e.writeInt32BE=Q.writeInt32BE,e.writeFloatLE=Q.writeFloatLE,e.writeFloatBE=Q.writeFloatBE,e.writeDoubleLE=Q.writeDoubleLE,e.writeDoubleBE=Q.writeDoubleBE,e.fill=Q.fill,e.inspect=Q.inspect,e.toArrayBuffer=Q.toArrayBuffer,e};var tt=/[^+\/0-9A-Za-z-_]/g}).call(e,n(2).Buffer,function(){return this}())},function(t,e,n){var r="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";!function(t){"use strict";function e(t){var e=t.charCodeAt(0);return e===a||e===l?62:e===s||e===f?63:h>e?-1:h+10>e?e-h+26+26:c+26>e?e-c:u+26>e?e-u+26:void 0}function n(t){function n(t){u[l++]=t}var r,i,a,s,h,u;if(t.length%4>0)throw new Error("Invalid string. Length must be a multiple of 4");var c=t.length;h="="===t.charAt(c-2)?2:"="===t.charAt(c-1)?1:0,u=new o(3*t.length/4-h),a=h>0?t.length-4:t.length;var l=0;for(r=0,i=0;a>r;r+=4,i+=3)s=e(t.charAt(r))<<18|e(t.charAt(r+1))<<12|e(t.charAt(r+2))<<6|e(t.charAt(r+3)),n((16711680&s)>>16),n((65280&s)>>8),n(255&s);return 2===h?(s=e(t.charAt(r))<<2|e(t.charAt(r+1))>>4,n(255&s)):1===h&&(s=e(t.charAt(r))<<10|e(t.charAt(r+1))<<4|e(t.charAt(r+2))>>2,n(s>>8&255),n(255&s)),u}function i(t){function e(t){return r.charAt(t)}function n(t){return e(t>>18&63)+e(t>>12&63)+e(t>>6&63)+e(63&t)}var i,o,a,s=t.length%3,h="";for(i=0,a=t.length-s;a>i;i+=3)o=(t[i]<<16)+(t[i+1]<<8)+t[i+2],h+=n(o);switch(s){case 1:o=t[t.length-1],h+=e(o>>2),h+=e(o<<4&63),h+="==";break;case 2:o=(t[t.length-2]<<8)+t[t.length-1],h+=e(o>>10),h+=e(o>>4&63),h+=e(o<<2&63),h+="="}return h}var o="undefined"!=typeof Uint8Array?Uint8Array:Array,a="+".charCodeAt(0),s="/".charCodeAt(0),h="0".charCodeAt(0),u="a".charCodeAt(0),c="A".charCodeAt(0),l="-".charCodeAt(0),f="_".charCodeAt(0);t.toByteArray=n,t.fromByteArray=i}(e)},function(t,e){e.read=function(t,e,n,r,i){var o,a,s=8*i-r-1,h=(1<<s)-1,u=h>>1,c=-7,l=n?i-1:0,f=n?-1:1,d=t[e+l];for(l+=f,o=d&(1<<-c)-1,d>>=-c,c+=s;c>0;o=256*o+t[e+l],l+=f,c-=8);for(a=o&(1<<-c)-1,o>>=-c,c+=r;c>0;a=256*a+t[e+l],l+=f,c-=8);if(0===o)o=1-u;else{if(o===h)return a?NaN:(d?-1:1)*(1/0);a+=Math.pow(2,r),o-=u}return(d?-1:1)*a*Math.pow(2,o-r)},e.write=function(t,e,n,r,i,o){var a,s,h,u=8*o-i-1,c=(1<<u)-1,l=c>>1,f=23===i?Math.pow(2,-24)-Math.pow(2,-77):0,d=r?0:o-1,p=r?1:-1,g=0>e||0===e&&0>1/e?1:0;for(e=Math.abs(e),isNaN(e)||e===1/0?(s=isNaN(e)?1:0,a=c):(a=Math.floor(Math.log(e)/Math.LN2),e*(h=Math.pow(2,-a))<1&&(a--,h*=2),e+=a+l>=1?f/h:f*Math.pow(2,1-l),e*h>=2&&(a++,h/=2),a+l>=c?(s=0,a=c):a+l>=1?(s=(e*h-1)*Math.pow(2,i),a+=l):(s=e*Math.pow(2,l-1)*Math.pow(2,i),a=0));i>=8;t[n+d]=255&s,d+=p,s/=256,i-=8);for(a=a<<i|s,u+=i;u>0;t[n+d]=255&a,d+=p,a/=256,u-=8);t[n+d-p]|=128*g}},function(t,e){var n=Array.isArray,r=Object.prototype.toString;t.exports=n||function(t){return!!t&&"[object Array]"==r.call(t)}},function(t,e,n){"use strict";function r(t){this.fontDescriptors=t}function i(t){if(!t)return null;if("number"==typeof t||t instanceof Number)t={left:t,right:t,top:t,bottom:t};else if(t instanceof Array)if(2===t.length)t={left:t[0],top:t[1],right:t[0],bottom:t[1]};else{if(4!==t.length)throw"Invalid pageMargins definition";t={left:t[0],top:t[1],right:t[2],bottom:t[3]}}return t}function o(t){t.registerTableLayouts({noBorders:{hLineWidth:function(t){return 0},vLineWidth:function(t){return 0},paddingLeft:function(t){return t&&4||0},paddingRight:function(t,e){return t<e.table.widths.length-1?4:0}},headerLineOnly:{hLineWidth:function(t,e){return 0===t||t===e.table.body.length?0:t===e.table.headerRows?2:0},vLineWidth:function(t){return 0},paddingLeft:function(t){return 0===t?0:8},paddingRight:function(t,e){return t===e.table.widths.length-1?0:8}},lightHorizontalLines:{hLineWidth:function(t,e){return 0===t||t===e.table.body.length?0:t===e.table.headerRows?2:1},vLineWidth:function(t){return 0},hLineColor:function(t){return 1===t?"black":"#aaa"},paddingLeft:function(t){return 0===t?0:8},paddingRight:function(t,e){return t===e.table.widths.length-1?0:8}}})}function a(t){if("string"==typeof t||t instanceof String){var e=v[t.toUpperCase()];if(!e)throw"Page size "+t+" not recognized";return{width:e[0],height:e[1]}}return t}function s(t,e){var n=e.options.size[0]>e.options.size[1]?"landscape":"portrait";if(t.pageSize.orientation!==n){var r=e.options.size[0],i=e.options.size[1];e.options.size=[i,r]}}function h(t,e,n){n._pdfMakePages=t;for(var r=0;r<t.length;r++){r>0&&(s(t[r],n),n.addPage(n.options));for(var i=t[r],o=0,a=i.items.length;a>o;o++){var h=i.items[o];switch(h.type){case"vector":l(h.item,n);break;case"line":u(h.item,h.item.x,h.item.y,n);break;case"image":f(h.item,h.item.x,h.item.y,n)}}i.watermark&&c(i,n),e.setFontRefsToPdfDoc()}}function u(t,e,n,r){e=e||0,n=n||0;var i=t.getHeight(),o=t.getAscenderHeight();y.drawBackground(t,e,n,r);for(var a=0,s=t.inlines.length;s>a;a++){var h=t.inlines[a];r.fill(h.color||"black"),r.save(),r.transform(1,0,0,-1,0,r.page.height);var u=h.font.encode(h.text);r.addContent("BT"),r.addContent(""+(e+h.x)+" "+(r.page.height-n-o)+" Td"),r.addContent("/"+u.fontId+" "+h.fontSize+" Tf"),r.addContent("<"+u.encodedText+"> Tj"),r.addContent("ET"),h.link&&r.link(e+h.x,r.page.height-n-i,h.width,i,h.link),r.restore()}y.drawDecorations(t,e,n,r)}function c(t,e){var n=t.watermark;e.fill("black"),e.opacity(.6),e.save(),e.transform(1,0,0,-1,0,e.page.height);var r=180*Math.atan2(e.page.height,e.page.width)/Math.PI;e.rotate(r,{origin:[e.page.width/2,e.page.height/2]});var i=n.font.encode(n.text);e.addContent("BT"),e.addContent(""+(e.page.width/2-n.size.size.width/2)+" "+(e.page.height/2-n.size.size.height/4)+" Td"),e.addContent("/"+i.fontId+" "+n.size.fontSize+" Tf"),e.addContent("<"+i.encodedText+"> Tj"),e.addContent("ET"),e.restore()}function l(t,e){switch(e.lineWidth(t.lineWidth||1),t.dash?e.dash(t.dash.length,{space:t.dash.space||t.dash.length}):e.undash(),e.fillOpacity(t.fillOpacity||1),e.strokeOpacity(t.strokeOpacity||1),e.lineJoin(t.lineJoin||"miter"),t.type){case"ellipse":e.ellipse(t.x,t.y,t.r1,t.r2);break;case"rect":t.r?e.roundedRect(t.x,t.y,t.w,t.h,t.r):e.rect(t.x,t.y,t.w,t.h);break;case"line":e.moveTo(t.x1,t.y1),e.lineTo(t.x2,t.y2);break;case"polyline":if(0===t.points.length)break;e.moveTo(t.points[0].x,t.points[0].y);for(var n=1,r=t.points.length;r>n;n++)e.lineTo(t.points[n].x,t.points[n].y);if(t.points.length>1){var i=t.points[0],o=t.points[t.points.length-1];(t.closePath||i.x===o.x&&i.y===o.y)&&e.closePath()}}t.color&&t.lineColor?e.fillAndStroke(t.color,t.lineColor):t.color?e.fill(t.color):e.stroke(t.lineColor||"black")}function f(t,e,n,r){r.image(t.image,t.x,t.y,{width:t._width,height:t._height})}var d=(n(7),n(9)),p=n(11),g=n(24),v=(n(46),n(102)),m=n(103),y=n(104),d=n(9);r.prototype.createPdfKitDocument=function(t,e){e=e||{};var n=a(t.pageSize||"a4");if("landscape"===t.pageOrientation&&(n={width:n.height,height:n.width}),n.orientation="landscape"===t.pageOrientation?t.pageOrientation:"portrait",this.pdfKitDoc=new g({size:[n.width,n.height],compress:!1}),this.pdfKitDoc.info.Producer="pdfmake",this.pdfKitDoc.info.Creator="pdfmake",t.info){t.info;this.pdfKitDoc.info.Title=t.info.title?t.info.title:null,this.pdfKitDoc.info.Author=t.info.author?t.info.author:null,this.pdfKitDoc.info.Subject=t.info.subject?t.info.subject:null,this.pdfKitDoc.info.Keywords=t.info.keywords?t.info.keywords:null}this.fontProvider=new d(this.fontDescriptors,this.pdfKitDoc),t.images=t.images||{};var r=new p(n,i(t.pageMargins||40),new m(this.pdfKitDoc,t.images));o(r),e.tableLayouts&&r.registerTableLayouts(e.tableLayouts);var s=r.layoutDocument(t.content,this.fontProvider,t.styles||{},t.defaultStyle||{fontSize:12,font:"Roboto"},t.background,t.header,t.footer,t.images,t.watermark,t.pageBreakBefore);if(h(s,this.fontProvider,this.pdfKitDoc),e.autoPrint){var u=this.pdfKitDoc.ref({Type:"Action",S:"Named",N:"Print"});this.pdfKitDoc._root.data.OpenAction=u,u.end()}return this.pdfKitDoc};t.exports=r,r.prototype.fs=n(44)},function(t,e,n){var r;(function(t,i){(function(){function o(t,e){if(t!==e){var n=null===t,r=t===I,i=t===t,o=null===e,a=e===I,s=e===e;if(t>e&&!o||!i||n&&!a&&s||r&&s)return 1;if(e>t&&!n||!s||o&&!r&&i||a&&i)return-1}return 0}function a(t,e,n){for(var r=t.length,i=n?r:-1;n?i--:++i<r;)if(e(t[i],i,t))return i;return-1}function s(t,e,n){if(e!==e)return y(t,n);for(var r=n-1,i=t.length;++r<i;)if(t[r]===e)return r;return-1}function h(t){return"function"==typeof t||!1}function u(t){return null==t?"":t+""}function c(t,e){for(var n=-1,r=t.length;++n<r&&e.indexOf(t.charAt(n))>-1;);return n}function l(t,e){for(var n=t.length;n--&&e.indexOf(t.charAt(n))>-1;);return n}function f(t,e){return o(t.criteria,e.criteria)||t.index-e.index}function d(t,e,n){for(var r=-1,i=t.criteria,a=e.criteria,s=i.length,h=n.length;++r<s;){var u=o(i[r],a[r]);if(u){if(r>=h)return u;var c=n[r];return u*("asc"===c||c===!0?1:-1)}}return t.index-e.index}function p(t){return Yt[t]}function g(t){return qt[t]}function v(t,e,n){return e?t=Vt[t]:n&&(t=$t[t]),"\\"+t}function m(t){return"\\"+$t[t]}function y(t,e,n){for(var r=t.length,i=e+(n?0:-1);n?i--:++i<r;){var o=t[i];if(o!==o)return i}return-1}function _(t){return!!t&&"object"==typeof t}function w(t){return 160>=t&&t>=9&&13>=t||32==t||160==t||5760==t||6158==t||t>=8192&&(8202>=t||8232==t||8233==t||8239==t||8287==t||12288==t||65279==t)}function b(t,e){for(var n=-1,r=t.length,i=-1,o=[];++n<r;)t[n]===e&&(t[n]=Y,o[++i]=n);return o}function x(t,e){for(var n,r=-1,i=t.length,o=-1,a=[];++r<i;){var s=t[r],h=e?e(s,r,t):s;r&&n===h||(n=h,a[++o]=s)}return a}function S(t){for(var e=-1,n=t.length;++e<n&&w(t.charCodeAt(e)););return e}function k(t){for(var e=t.length;e--&&w(t.charCodeAt(e)););return e}function E(t){return Kt[t]}function C(t){function e(t){if(_(t)&&!Ls(t)&&!(t instanceof i)){if(t instanceof r)return t;if(ea.call(t,"__chain__")&&ea.call(t,"__wrapped__"))return dr(t)}return new r(t)}function n(){}function r(t,e,n){this.__wrapped__=t,this.__actions__=n||[],this.__chain__=!!e}function i(t){this.__wrapped__=t,this.__actions__=[],this.__dir__=1,this.__filtered__=!1,this.__iteratees__=[],this.__takeCount__=Aa,this.__views__=[]}function w(){var t=new i(this.__wrapped__);return t.__actions__=te(this.__actions__),t.__dir__=this.__dir__,t.__filtered__=this.__filtered__,t.__iteratees__=te(this.__iteratees__),t.__takeCount__=this.__takeCount__,t.__views__=te(this.__views__),t}function Q(){if(this.__filtered__){var t=new i(this);t.__dir__=-1,t.__filtered__=!0}else t=this.clone(),t.__dir__*=-1;return t}function rt(){var t=this.__wrapped__.value(),e=this.__dir__,n=Ls(t),r=0>e,i=n?t.length:0,o=Yn(0,i,this.__views__),a=o.start,s=o.end,h=s-a,u=r?s:a-1,c=this.__iteratees__,l=c.length,f=0,d=Sa(h,this.__takeCount__);if(!n||j>i||i==h&&d==h)return nn(r&&n?t.reverse():t,this.__actions__);var p=[];t:for(;h--&&d>f;){u+=e;for(var g=-1,v=t[u];++g<l;){var m=c[g],y=m.iteratee,_=m.type,w=y(v);if(_==Z)v=w;else if(!w){if(_==H)continue t;break t}}p[f++]=v}return p}function ot(){this.__data__={}}function Yt(t){return this.has(t)&&delete this.__data__[t]}function qt(t){return"__proto__"==t?I:this.__data__[t]}function Kt(t){return"__proto__"!=t&&ea.call(this.__data__,t)}function Xt(t,e){return"__proto__"!=t&&(this.__data__[t]=e),this}function Vt(t){var e=t?t.length:0;for(this.data={hash:ma(null),set:new la};e--;)this.push(t[e])}function $t(t,e){var n=t.data,r="string"==typeof e||Mi(e)?n.set.has(e):n.hash[e];return r?0:-1}function Jt(t){var e=this.data;"string"==typeof t||Mi(t)?e.set.add(t):e.hash[t]=!0}function Qt(t,e){for(var n=-1,r=t.length,i=-1,o=e.length,a=No(r+o);++n<r;)a[n]=t[n];for(;++i<o;)a[n++]=e[i];return a}function te(t,e){var n=-1,r=t.length;for(e||(e=No(r));++n<r;)e[n]=t[n];return e}function ee(t,e){for(var n=-1,r=t.length;++n<r&&e(t[n],n,t)!==!1;);return t}function ne(t,e){for(var n=t.length;n--&&e(t[n],n,t)!==!1;);return t}function oe(t,e){for(var n=-1,r=t.length;++n<r;)if(!e(t[n],n,t))return!1;return!0}function ae(t,e,n,r){for(var i=-1,o=t.length,a=r,s=a;++i<o;){var h=t[i],u=+e(h);n(u,a)&&(a=u,s=h)}return s}function se(t,e){for(var n=-1,r=t.length,i=-1,o=[];++n<r;){var a=t[n];e(a,n,t)&&(o[++i]=a)}return o}function he(t,e){for(var n=-1,r=t.length,i=No(r);++n<r;)i[n]=e(t[n],n,t);return i}function ue(t,e){for(var n=-1,r=e.length,i=t.length;++n<r;)t[i+n]=e[n];return t}function ce(t,e,n,r){var i=-1,o=t.length;for(r&&o&&(n=t[++i]);++i<o;)n=e(n,t[i],i,t);return n}function le(t,e,n,r){var i=t.length;for(r&&i&&(n=t[--i]);i--;)n=e(n,t[i],i,t);return n}function fe(t,e){for(var n=-1,r=t.length;++n<r;)if(e(t[n],n,t))return!0;return!1}function de(t,e){for(var n=t.length,r=0;n--;)r+=+e(t[n])||0;return r}function pe(t,e){return t===I?e:t}function ge(t,e,n,r){return t!==I&&ea.call(r,n)?t:e}function ve(t,e,n){for(var r=-1,i=Ws(e),o=i.length;++r<o;){var a=i[r],s=t[a],h=n(s,e[a],a,t,e);(h===h?h===s:s!==s)&&(s!==I||a in t)||(t[a]=h)}return t}function me(t,e){return null==e?t:_e(e,Ws(e),t)}function ye(t,e){for(var n=-1,r=null==t,i=!r&&$n(t),o=i?t.length:0,a=e.length,s=No(a);++n<a;){var h=e[n];i?s[n]=Jn(h,o)?t[h]:I:s[n]=r?I:t[h]}return s}function _e(t,e,n){n||(n={});for(var r=-1,i=e.length;++r<i;){var o=e[r];n[o]=t[o]}return n}function we(t,e,n){var r=typeof t;return"function"==r?e===I?t:an(t,e,n):null==t?Ao:"object"==r?Fe(t):e===I?Mo(t):We(t,e)}function be(t,e,n,r,i,o,a){var s;if(n&&(s=i?n(t,r,i):n(t)),s!==I)return s;if(!Mi(t))return t;var h=Ls(t);if(h){if(s=qn(t),!e)return te(t,s)}else{var u=ra.call(t),c=u==J;if(u!=et&&u!=q&&(!c||i))return Gt[u]?Xn(t,u,e):i?t:{};if(s=Kn(c?{}:t),!e)return me(s,t)}o||(o=[]),a||(a=[]);for(var l=o.length;l--;)if(o[l]==t)return a[l];return o.push(t),a.push(s),(h?ee:Te)(t,function(r,i){s[i]=be(r,e,n,i,t,o,a)}),s}function xe(t,e,n){if("function"!=typeof t)throw new Vo(G);return fa(function(){t.apply(I,n)},e)}function Se(t,e){var n=t?t.length:0,r=[];if(!n)return r;var i=-1,o=Hn(),a=o==s,h=a&&e.length>=j?gn(e):null,u=e.length;h&&(o=$t,a=!1,e=h);t:for(;++i<n;){var c=t[i];if(a&&c===c){for(var l=u;l--;)if(e[l]===c)continue t;r.push(c)}else o(e,c,0)<0&&r.push(c)}return r}function ke(t,e){var n=!0;return Ua(t,function(t,r,i){return n=!!e(t,r,i)}),n}function Ee(t,e,n,r){var i=r,o=i;return Ua(t,function(t,a,s){var h=+e(t,a,s);(n(h,i)||h===r&&h===o)&&(i=h,o=t)}),o}function Ce(t,e,n,r){var i=t.length;for(n=null==n?0:+n||0,0>n&&(n=-n>i?0:i+n),r=r===I||r>i?i:+r||0,0>r&&(r+=i),i=n>r?0:r>>>0,n>>>=0;i>n;)t[n++]=e;return t}function Ie(t,e){var n=[];return Ua(t,function(t,r,i){e(t,r,i)&&n.push(t)}),n}function Ae(t,e,n,r){var i;return n(t,function(t,n,o){return e(t,n,o)?(i=r?n:t,!1):void 0}),i}function Le(t,e,n,r){r||(r=[]);for(var i=-1,o=t.length;++i<o;){var a=t[i];_(a)&&$n(a)&&(n||Ls(a)||Ei(a))?e?Le(a,e,n,r):ue(r,a):n||(r[r.length]=a)}return r}function Re(t,e){return za(t,e,to)}function Te(t,e){return za(t,e,Ws)}function Be(t,e){return Fa(t,e,Ws)}function Oe(t,e){for(var n=-1,r=e.length,i=-1,o=[];++n<r;){var a=e[n];Oi(t[a])&&(o[++i]=a)}return o}function Me(t,e,n){if(null!=t){n!==I&&n in lr(t)&&(e=[n]);for(var r=0,i=e.length;null!=t&&i>r;)t=t[e[r++]];return r&&r==i?t:I}}function De(t,e,n,r,i,o){return t===e?!0:null==t||null==e||!Mi(t)&&!_(e)?t!==t&&e!==e:Ue(t,e,De,n,r,i,o)}function Ue(t,e,n,r,i,o,a){var s=Ls(t),h=Ls(e),u=K,c=K;s||(u=ra.call(t),u==q?u=et:u!=et&&(s=Hi(t))),h||(c=ra.call(e),c==q?c=et:c!=et&&(h=Hi(e)));var l=u==et,f=c==et,d=u==c;if(d&&!s&&!l)return Fn(t,e,u);if(!i){var p=l&&ea.call(t,"__wrapped__"),g=f&&ea.call(e,"__wrapped__");if(p||g)return n(p?t.value():t,g?e.value():e,r,i,o,a)}if(!d)return!1;o||(o=[]),a||(a=[]);for(var v=o.length;v--;)if(o[v]==t)return a[v]==e;o.push(t),a.push(e);var m=(s?zn:Wn)(t,e,n,r,i,o,a);return o.pop(),a.pop(),m}function Pe(t,e,n){var r=e.length,i=r,o=!n;if(null==t)return!i;for(t=lr(t);r--;){var a=e[r];if(o&&a[2]?a[1]!==t[a[0]]:!(a[0]in t))return!1}for(;++r<i;){a=e[r];var s=a[0],h=t[s],u=a[1];if(o&&a[2]){if(h===I&&!(s in t))return!1}else{var c=n?n(h,u,s):I;if(!(c===I?De(u,h,n,!0):c))return!1}}return!0}function ze(t,e){var n=-1,r=$n(t)?No(t.length):[];return Ua(t,function(t,i,o){r[++n]=e(t,i,o)}),r}function Fe(t){var e=Zn(t);if(1==e.length&&e[0][2]){var n=e[0][0],r=e[0][1];return function(t){return null==t?!1:t[n]===r&&(r!==I||n in lr(t))}}return function(t){return Pe(t,e)}}function We(t,e){var n=Ls(t),r=tr(t)&&rr(e),i=t+"";return t=fr(t),function(o){if(null==o)return!1;var a=i;if(o=lr(o),(n||!r)&&!(a in o)){if(o=1==t.length?o:Me(o,Ke(t,0,-1)),null==o)return!1;a=Cr(t),o=lr(o)}return o[a]===e?e!==I||a in o:De(e,o[a],I,!0)}}function Ne(t,e,n,r,i){if(!Mi(t))return t;var o=$n(e)&&(Ls(e)||Hi(e)),a=o?I:Ws(e);return ee(a||e,function(s,h){if(a&&(h=s,s=e[h]),_(s))r||(r=[]),i||(i=[]),je(t,e,h,Ne,n,r,i);else{var u=t[h],c=n?n(u,s,h,t,e):I,l=c===I;l&&(c=s),c===I&&(!o||h in t)||!l&&(c===c?c===u:u!==u)||(t[h]=c)}}),t}function je(t,e,n,r,i,o,a){for(var s=o.length,h=e[n];s--;)if(o[s]==h)return void(t[n]=a[s]);var u=t[n],c=i?i(u,h,n,t,e):I,l=c===I;l&&(c=h,$n(h)&&(Ls(h)||Hi(h))?c=Ls(u)?u:$n(u)?te(u):[]:Wi(h)||Ei(h)?c=Ei(u)?Ki(u):Wi(u)?u:{}:l=!1),o.push(h),a.push(c),l?t[n]=r(c,h,i,o,a):(c===c?c!==u:u===u)&&(t[n]=c)}function He(t){return function(e){return null==e?I:e[t]}}function Ze(t){var e=t+"";return t=fr(t),function(n){return Me(n,t,e)}}function Ge(t,e){for(var n=t?e.length:0;n--;){var r=e[n];if(r!=i&&Jn(r)){var i=r;da.call(t,r,1)}}return t}function Ye(t,e){return t+ya(Ca()*(e-t+1))}function qe(t,e,n,r,i){return i(t,function(t,i,o){n=r?(r=!1,t):e(n,t,i,o)}),n}function Ke(t,e,n){var r=-1,i=t.length;e=null==e?0:+e||0,0>e&&(e=-e>i?0:i+e),n=n===I||n>i?i:+n||0,0>n&&(n+=i),i=e>n?0:n-e>>>0,e>>>=0;for(var o=No(i);++r<i;)o[r]=t[r+e];return o}function Xe(t,e){var n;return Ua(t,function(t,r,i){return n=e(t,r,i),!n}),!!n}function Ve(t,e){var n=t.length;for(t.sort(e);n--;)t[n]=t[n].value;return t}function $e(t,e,n){var r=Nn(),i=-1;e=he(e,function(t){return r(t)});var o=ze(t,function(t){var n=he(e,function(e){return e(t)});return{criteria:n,index:++i,value:t}});return Ve(o,function(t,e){return d(t,e,n)})}function Je(t,e){var n=0;return Ua(t,function(t,r,i){n+=+e(t,r,i)||0}),n}function Qe(t,e){var n=-1,r=Hn(),i=t.length,o=r==s,a=o&&i>=j,h=a?gn():null,u=[];h?(r=$t,o=!1):(a=!1,h=e?[]:u);t:for(;++n<i;){var c=t[n],l=e?e(c,n,t):c;if(o&&c===c){for(var f=h.length;f--;)if(h[f]===l)continue t;e&&h.push(l),u.push(c)}else r(h,l,0)<0&&((e||a)&&h.push(l),u.push(c))}return u}function tn(t,e){for(var n=-1,r=e.length,i=No(r);++n<r;)i[n]=t[e[n]];return i}function en(t,e,n,r){for(var i=t.length,o=r?i:-1;(r?o--:++o<i)&&e(t[o],o,t););return n?Ke(t,r?0:o,r?o+1:i):Ke(t,r?o+1:0,r?i:o)}function nn(t,e){var n=t;n instanceof i&&(n=n.value());for(var r=-1,o=e.length;++r<o;){var a=e[r];n=a.func.apply(a.thisArg,ue([n],a.args))}return n}function rn(t,e,n){var r=0,i=t?t.length:r;if("number"==typeof e&&e===e&&Ta>=i){for(;i>r;){var o=r+i>>>1,a=t[o];(n?e>=a:e>a)&&null!==a?r=o+1:i=o}return i}return on(t,e,Ao,n)}function on(t,e,n,r){e=n(e);for(var i=0,o=t?t.length:0,a=e!==e,s=null===e,h=e===I;o>i;){var u=ya((i+o)/2),c=n(t[u]),l=c!==I,f=c===c;if(a)var d=f||r;else d=s?f&&l&&(r||null!=c):h?f&&(r||l):null==c?!1:r?e>=c:e>c;d?i=u+1:o=u}return Sa(o,Ra)}function an(t,e,n){if("function"!=typeof t)return Ao;if(e===I)return t;switch(n){case 1:return function(n){return t.call(e,n)};case 3:return function(n,r,i){return t.call(e,n,r,i)};case 4:return function(n,r,i,o){return t.call(e,n,r,i,o)};case 5:return function(n,r,i,o,a){return t.call(e,n,r,i,o,a)}}return function(){return t.apply(e,arguments)}}function sn(t){var e=new aa(t.byteLength),n=new pa(e);return n.set(new pa(t)),e}function hn(t,e,n){for(var r=n.length,i=-1,o=xa(t.length-r,0),a=-1,s=e.length,h=No(s+o);++a<s;)h[a]=e[a];for(;++i<r;)h[n[i]]=t[i];for(;o--;)h[a++]=t[i++];return h}function un(t,e,n){for(var r=-1,i=n.length,o=-1,a=xa(t.length-i,0),s=-1,h=e.length,u=No(a+h);++o<a;)u[o]=t[o];for(var c=o;++s<h;)u[c+s]=e[s];for(;++r<i;)u[c+n[r]]=t[o++];return u}function cn(t,e){return function(n,r,i){var o=e?e():{};if(r=Nn(r,i,3),Ls(n))for(var a=-1,s=n.length;++a<s;){var h=n[a];t(o,h,r(h,a,n),n)}else Ua(n,function(e,n,i){t(o,e,r(e,n,i),i)});return o}}function ln(t){return mi(function(e,n){var r=-1,i=null==e?0:n.length,o=i>2?n[i-2]:I,a=i>2?n[2]:I,s=i>1?n[i-1]:I;for("function"==typeof o?(o=an(o,s,5),i-=2):(o="function"==typeof s?s:I,i-=o?1:0),a&&Qn(n[0],n[1],a)&&(o=3>i?I:o,i=1);++r<i;){var h=n[r];h&&t(e,h,o)}return e})}function fn(t,e){return function(n,r){var i=n?ja(n):0;if(!nr(i))return t(n,r);for(var o=e?i:-1,a=lr(n);(e?o--:++o<i)&&r(a[o],o,a)!==!1;);return n}}function dn(t){return function(e,n,r){for(var i=lr(e),o=r(e),a=o.length,s=t?a:-1;t?s--:++s<a;){var h=o[s];if(n(i[h],h,i)===!1)break}return e}}function pn(t,e){function n(){var i=this&&this!==re&&this instanceof n?r:t;return i.apply(e,arguments)}var r=mn(t);return n}function gn(t){return ma&&la?new Vt(t):null}function vn(t){return function(e){for(var n=-1,r=Eo(co(e)),i=r.length,o="";++n<i;)o=t(o,r[n],n);return o}}function mn(t){return function(){var e=arguments;switch(e.length){case 0:return new t;case 1:return new t(e[0]);case 2:return new t(e[0],e[1]);case 3:return new t(e[0],e[1],e[2]);case 4:return new t(e[0],e[1],e[2],e[3]);case 5:
return new t(e[0],e[1],e[2],e[3],e[4]);case 6:return new t(e[0],e[1],e[2],e[3],e[4],e[5]);case 7:return new t(e[0],e[1],e[2],e[3],e[4],e[5],e[6])}var n=Da(t.prototype),r=t.apply(n,e);return Mi(r)?r:n}}function yn(t){function e(n,r,i){i&&Qn(n,r,i)&&(r=I);var o=Pn(n,t,I,I,I,I,I,r);return o.placeholder=e.placeholder,o}return e}function _n(t,e){return mi(function(n){var r=n[0];return null==r?r:(n.push(e),t.apply(I,n))})}function wn(t,e){return function(n,r,i){if(i&&Qn(n,r,i)&&(r=I),r=Nn(r,i,3),1==r.length){n=Ls(n)?n:cr(n);var o=ae(n,r,t,e);if(!n.length||o!==e)return o}return Ee(n,r,t,e)}}function bn(t,e){return function(n,r,i){if(r=Nn(r,i,3),Ls(n)){var o=a(n,r,e);return o>-1?n[o]:I}return Ae(n,r,t)}}function xn(t){return function(e,n,r){return e&&e.length?(n=Nn(n,r,3),a(e,n,t)):-1}}function Sn(t){return function(e,n,r){return n=Nn(n,r,3),Ae(e,n,t,!0)}}function kn(t){return function(){for(var e,n=arguments.length,i=t?n:-1,o=0,a=No(n);t?i--:++i<n;){var s=a[o++]=arguments[i];if("function"!=typeof s)throw new Vo(G);!e&&r.prototype.thru&&"wrapper"==jn(s)&&(e=new r([],!0))}for(i=e?-1:n;++i<n;){s=a[i];var h=jn(s),u="wrapper"==h?Na(s):I;e=u&&er(u[0])&&u[1]==(U|B|M|P)&&!u[4].length&&1==u[9]?e[jn(u[0])].apply(e,u[3]):1==s.length&&er(s)?e[h]():e.thru(s)}return function(){var t=arguments,r=t[0];if(e&&1==t.length&&Ls(r)&&r.length>=j)return e.plant(r).value();for(var i=0,o=n?a[i].apply(this,t):r;++i<n;)o=a[i].call(this,o);return o}}}function En(t,e){return function(n,r,i){return"function"==typeof r&&i===I&&Ls(n)?t(n,r):e(n,an(r,i,3))}}function Cn(t){return function(e,n,r){return("function"!=typeof n||r!==I)&&(n=an(n,r,3)),t(e,n,to)}}function In(t){return function(e,n,r){return("function"!=typeof n||r!==I)&&(n=an(n,r,3)),t(e,n)}}function An(t){return function(e,n,r){var i={};return n=Nn(n,r,3),Te(e,function(e,r,o){var a=n(e,r,o);r=t?a:r,e=t?e:a,i[r]=e}),i}}function Ln(t){return function(e,n,r){return e=u(e),(t?e:"")+On(e,n,r)+(t?"":e)}}function Rn(t){var e=mi(function(n,r){var i=b(r,e.placeholder);return Pn(n,t,I,r,i)});return e}function Tn(t,e){return function(n,r,i,o){var a=arguments.length<3;return"function"==typeof r&&o===I&&Ls(n)?t(n,r,i,a):qe(n,Nn(r,o,4),i,a,e)}}function Bn(t,e,n,r,i,o,a,s,h,u){function c(){for(var y=arguments.length,_=y,w=No(y);_--;)w[_]=arguments[_];if(r&&(w=hn(w,r,i)),o&&(w=un(w,o,a)),p||v){var x=c.placeholder,S=b(w,x);if(y-=S.length,u>y){var k=s?te(s):I,E=xa(u-y,0),C=p?S:I,A=p?I:S,T=p?w:I,B=p?I:w;e|=p?M:D,e&=~(p?D:M),g||(e&=~(L|R));var O=[t,e,n,T,C,B,A,k,h,E],U=Bn.apply(I,O);return er(t)&&Ha(U,O),U.placeholder=x,U}}var P=f?n:this,z=d?P[t]:t;return s&&(w=hr(w,s)),l&&h<w.length&&(w.length=h),this&&this!==re&&this instanceof c&&(z=m||mn(t)),z.apply(P,w)}var l=e&U,f=e&L,d=e&R,p=e&B,g=e&T,v=e&O,m=d?I:mn(t);return c}function On(t,e,n){var r=t.length;if(e=+e,r>=e||!wa(e))return"";var i=e-r;return n=null==n?" ":n+"",mo(n,va(i/n.length)).slice(0,i)}function Mn(t,e,n,r){function i(){for(var e=-1,s=arguments.length,h=-1,u=r.length,c=No(u+s);++h<u;)c[h]=r[h];for(;s--;)c[h++]=arguments[++e];var l=this&&this!==re&&this instanceof i?a:t;return l.apply(o?n:this,c)}var o=e&L,a=mn(t);return i}function Dn(t){var e=Go[t];return function(t,n){return n=n===I?0:+n||0,n?(n=ua(10,n),e(t*n)/n):e(t)}}function Un(t){return function(e,n,r,i){var o=Nn(r);return null==r&&o===we?rn(e,n,t):on(e,n,o(r,i,1),t)}}function Pn(t,e,n,r,i,o,a,s){var h=e&R;if(!h&&"function"!=typeof t)throw new Vo(G);var u=r?r.length:0;if(u||(e&=~(M|D),r=i=I),u-=i?i.length:0,e&D){var c=r,l=i;r=i=I}var f=h?I:Na(t),d=[t,e,n,r,i,c,l,o,a,s];if(f&&(ir(d,f),e=d[1],s=d[9]),d[9]=null==s?h?0:t.length:xa(s-u,0)||0,e==L)var p=pn(d[0],d[2]);else p=e!=M&&e!=(L|M)||d[4].length?Bn.apply(I,d):Mn.apply(I,d);var g=f?Wa:Ha;return g(p,d)}function zn(t,e,n,r,i,o,a){var s=-1,h=t.length,u=e.length;if(h!=u&&!(i&&u>h))return!1;for(;++s<h;){var c=t[s],l=e[s],f=r?r(i?l:c,i?c:l,s):I;if(f!==I){if(f)continue;return!1}if(i){if(!fe(e,function(t){return c===t||n(c,t,r,i,o,a)}))return!1}else if(c!==l&&!n(c,l,r,i,o,a))return!1}return!0}function Fn(t,e,n){switch(n){case X:case V:return+t==+e;case $:return t.name==e.name&&t.message==e.message;case tt:return t!=+t?e!=+e:t==+e;case nt:case it:return t==e+""}return!1}function Wn(t,e,n,r,i,o,a){var s=Ws(t),h=s.length,u=Ws(e),c=u.length;if(h!=c&&!i)return!1;for(var l=h;l--;){var f=s[l];if(!(i?f in e:ea.call(e,f)))return!1}for(var d=i;++l<h;){f=s[l];var p=t[f],g=e[f],v=r?r(i?g:p,i?p:g,f):I;if(!(v===I?n(p,g,r,i,o,a):v))return!1;d||(d="constructor"==f)}if(!d){var m=t.constructor,y=e.constructor;if(m!=y&&"constructor"in t&&"constructor"in e&&!("function"==typeof m&&m instanceof m&&"function"==typeof y&&y instanceof y))return!1}return!0}function Nn(t,n,r){var i=e.callback||Co;return i=i===Co?we:i,r?i(t,n,r):i}function jn(t){for(var e=t.name,n=Ma[e],r=n?n.length:0;r--;){var i=n[r],o=i.func;if(null==o||o==t)return i.name}return e}function Hn(t,n,r){var i=e.indexOf||kr;return i=i===kr?s:i,t?i(t,n,r):i}function Zn(t){for(var e=eo(t),n=e.length;n--;)e[n][2]=rr(e[n][1]);return e}function Gn(t,e){var n=null==t?I:t[e];return Pi(n)?n:I}function Yn(t,e,n){for(var r=-1,i=n.length;++r<i;){var o=n[r],a=o.size;switch(o.type){case"drop":t+=a;break;case"dropRight":e-=a;break;case"take":e=Sa(e,t+a);break;case"takeRight":t=xa(t,e-a)}}return{start:t,end:e}}function qn(t){var e=t.length,n=new t.constructor(e);return e&&"string"==typeof t[0]&&ea.call(t,"index")&&(n.index=t.index,n.input=t.input),n}function Kn(t){var e=t.constructor;return"function"==typeof e&&e instanceof e||(e=qo),new e}function Xn(t,e,n){var r=t.constructor;switch(e){case at:return sn(t);case X:case V:return new r(+t);case st:case ht:case ut:case ct:case lt:case ft:case dt:case pt:case gt:var i=t.buffer;return new r(n?sn(i):i,t.byteOffset,t.length);case tt:case it:return new r(t);case nt:var o=new r(t.source,Mt.exec(t));o.lastIndex=t.lastIndex}return o}function Vn(t,e,n){null==t||tr(e,t)||(e=fr(e),t=1==e.length?t:Me(t,Ke(e,0,-1)),e=Cr(e));var r=null==t?t:t[e];return null==r?I:r.apply(t,n)}function $n(t){return null!=t&&nr(ja(t))}function Jn(t,e){return t="number"==typeof t||Pt.test(t)?+t:-1,e=null==e?Ba:e,t>-1&&t%1==0&&e>t}function Qn(t,e,n){if(!Mi(n))return!1;var r=typeof e;if("number"==r?$n(n)&&Jn(e,n.length):"string"==r&&e in n){var i=n[e];return t===t?t===i:i!==i}return!1}function tr(t,e){var n=typeof t;if("string"==n&&It.test(t)||"number"==n)return!0;if(Ls(t))return!1;var r=!Ct.test(t);return r||null!=e&&t in lr(e)}function er(t){var n=jn(t);if(!(n in i.prototype))return!1;var r=e[n];if(t===r)return!0;var o=Na(r);return!!o&&t===o[0]}function nr(t){return"number"==typeof t&&t>-1&&t%1==0&&Ba>=t}function rr(t){return t===t&&!Mi(t)}function ir(t,e){var n=t[1],r=e[1],i=n|r,o=U>i,a=r==U&&n==B||r==U&&n==P&&t[7].length<=e[8]||r==(U|P)&&n==B;if(!o&&!a)return t;r&L&&(t[2]=e[2],i|=n&L?0:T);var s=e[3];if(s){var h=t[3];t[3]=h?hn(h,s,e[4]):te(s),t[4]=h?b(t[3],Y):te(e[4])}return s=e[5],s&&(h=t[5],t[5]=h?un(h,s,e[6]):te(s),t[6]=h?b(t[5],Y):te(e[6])),s=e[7],s&&(t[7]=te(s)),r&U&&(t[8]=null==t[8]?e[8]:Sa(t[8],e[8])),null==t[9]&&(t[9]=e[9]),t[0]=e[0],t[1]=i,t}function or(t,e){return t===I?e:Rs(t,e,or)}function ar(t,e){t=lr(t);for(var n=-1,r=e.length,i={};++n<r;){var o=e[n];o in t&&(i[o]=t[o])}return i}function sr(t,e){var n={};return Re(t,function(t,r,i){e(t,r,i)&&(n[r]=t)}),n}function hr(t,e){for(var n=t.length,r=Sa(e.length,n),i=te(t);r--;){var o=e[r];t[r]=Jn(o,n)?i[o]:I}return t}function ur(t){for(var e=to(t),n=e.length,r=n&&t.length,i=!!r&&nr(r)&&(Ls(t)||Ei(t)),o=-1,a=[];++o<n;){var s=e[o];(i&&Jn(s,r)||ea.call(t,s))&&a.push(s)}return a}function cr(t){return null==t?[]:$n(t)?Mi(t)?t:qo(t):oo(t)}function lr(t){return Mi(t)?t:qo(t)}function fr(t){if(Ls(t))return t;var e=[];return u(t).replace(At,function(t,n,r,i){e.push(r?i.replace(Bt,"$1"):n||t)}),e}function dr(t){return t instanceof i?t.clone():new r(t.__wrapped__,t.__chain__,te(t.__actions__))}function pr(t,e,n){e=(n?Qn(t,e,n):null==e)?1:xa(ya(e)||1,1);for(var r=0,i=t?t.length:0,o=-1,a=No(va(i/e));i>r;)a[++o]=Ke(t,r,r+=e);return a}function gr(t){for(var e=-1,n=t?t.length:0,r=-1,i=[];++e<n;){var o=t[e];o&&(i[++r]=o)}return i}function vr(t,e,n){var r=t?t.length:0;return r?((n?Qn(t,e,n):null==e)&&(e=1),Ke(t,0>e?0:e)):[]}function mr(t,e,n){var r=t?t.length:0;return r?((n?Qn(t,e,n):null==e)&&(e=1),e=r-(+e||0),Ke(t,0,0>e?0:e)):[]}function yr(t,e,n){return t&&t.length?en(t,Nn(e,n,3),!0,!0):[]}function _r(t,e,n){return t&&t.length?en(t,Nn(e,n,3),!0):[]}function wr(t,e,n,r){var i=t?t.length:0;return i?(n&&"number"!=typeof n&&Qn(t,e,n)&&(n=0,r=i),Ce(t,e,n,r)):[]}function br(t){return t?t[0]:I}function xr(t,e,n){var r=t?t.length:0;return n&&Qn(t,e,n)&&(e=!1),r?Le(t,e):[]}function Sr(t){var e=t?t.length:0;return e?Le(t,!0):[]}function kr(t,e,n){var r=t?t.length:0;if(!r)return-1;if("number"==typeof n)n=0>n?xa(r+n,0):n;else if(n){var i=rn(t,e);return r>i&&(e===e?e===t[i]:t[i]!==t[i])?i:-1}return s(t,e,n||0)}function Er(t){return mr(t,1)}function Cr(t){var e=t?t.length:0;return e?t[e-1]:I}function Ir(t,e,n){var r=t?t.length:0;if(!r)return-1;var i=r;if("number"==typeof n)i=(0>n?xa(r+n,0):Sa(n||0,r-1))+1;else if(n){i=rn(t,e,!0)-1;var o=t[i];return(e===e?e===o:o!==o)?i:-1}if(e!==e)return y(t,i,!0);for(;i--;)if(t[i]===e)return i;return-1}function Ar(){var t=arguments,e=t[0];if(!e||!e.length)return e;for(var n=0,r=Hn(),i=t.length;++n<i;)for(var o=0,a=t[n];(o=r(e,a,o))>-1;)da.call(e,o,1);return e}function Lr(t,e,n){var r=[];if(!t||!t.length)return r;var i=-1,o=[],a=t.length;for(e=Nn(e,n,3);++i<a;){var s=t[i];e(s,i,t)&&(r.push(s),o.push(i))}return Ge(t,o),r}function Rr(t){return vr(t,1)}function Tr(t,e,n){var r=t?t.length:0;return r?(n&&"number"!=typeof n&&Qn(t,e,n)&&(e=0,n=r),Ke(t,e,n)):[]}function Br(t,e,n){var r=t?t.length:0;return r?((n?Qn(t,e,n):null==e)&&(e=1),Ke(t,0,0>e?0:e)):[]}function Or(t,e,n){var r=t?t.length:0;return r?((n?Qn(t,e,n):null==e)&&(e=1),e=r-(+e||0),Ke(t,0>e?0:e)):[]}function Mr(t,e,n){return t&&t.length?en(t,Nn(e,n,3),!1,!0):[]}function Dr(t,e,n){return t&&t.length?en(t,Nn(e,n,3)):[]}function Ur(t,e,n,r){var i=t?t.length:0;if(!i)return[];null!=e&&"boolean"!=typeof e&&(r=n,n=Qn(t,e,r)?I:e,e=!1);var o=Nn();return(null!=n||o!==we)&&(n=o(n,r,3)),e&&Hn()==s?x(t,n):Qe(t,n)}function Pr(t){if(!t||!t.length)return[];var e=-1,n=0;t=se(t,function(t){return $n(t)?(n=xa(t.length,n),!0):void 0});for(var r=No(n);++e<n;)r[e]=he(t,He(e));return r}function zr(t,e,n){var r=t?t.length:0;if(!r)return[];var i=Pr(t);return null==e?i:(e=an(e,n,4),he(i,function(t){return ce(t,e,I,!0)}))}function Fr(){for(var t=-1,e=arguments.length;++t<e;){var n=arguments[t];if($n(n))var r=r?ue(Se(r,n),Se(n,r)):n}return r?Qe(r):[]}function Wr(t,e){var n=-1,r=t?t.length:0,i={};for(!r||e||Ls(t[0])||(e=[]);++n<r;){var o=t[n];e?i[o]=e[n]:o&&(i[o[0]]=o[1])}return i}function Nr(t){var n=e(t);return n.__chain__=!0,n}function jr(t,e,n){return e.call(n,t),t}function Hr(t,e,n){return e.call(n,t)}function Zr(){return Nr(this)}function Gr(){return new r(this.value(),this.__chain__)}function Yr(t){for(var e,r=this;r instanceof n;){var i=dr(r);e?o.__wrapped__=i:e=i;var o=i;r=r.__wrapped__}return o.__wrapped__=t,e}function qr(){var t=this.__wrapped__,e=function(t){return n&&n.__dir__<0?t:t.reverse()};if(t instanceof i){var n=t;return this.__actions__.length&&(n=new i(this)),n=n.reverse(),n.__actions__.push({func:Hr,args:[e],thisArg:I}),new r(n,this.__chain__)}return this.thru(e)}function Kr(){return this.value()+""}function Xr(){return nn(this.__wrapped__,this.__actions__)}function Vr(t,e,n){var r=Ls(t)?oe:ke;return n&&Qn(t,e,n)&&(e=I),("function"!=typeof e||n!==I)&&(e=Nn(e,n,3)),r(t,e)}function $r(t,e,n){var r=Ls(t)?se:Ie;return e=Nn(e,n,3),r(t,e)}function Jr(t,e){return is(t,Fe(e))}function Qr(t,e,n,r){var i=t?ja(t):0;return nr(i)||(t=oo(t),i=t.length),n="number"!=typeof n||r&&Qn(e,n,r)?0:0>n?xa(i+n,0):n||0,"string"==typeof t||!Ls(t)&&ji(t)?i>=n&&t.indexOf(e,n)>-1:!!i&&Hn(t,e,n)>-1}function ti(t,e,n){var r=Ls(t)?he:ze;return e=Nn(e,n,3),r(t,e)}function ei(t,e){return ti(t,Mo(e))}function ni(t,e,n){var r=Ls(t)?se:Ie;return e=Nn(e,n,3),r(t,function(t,n,r){return!e(t,n,r)})}function ri(t,e,n){if(n?Qn(t,e,n):null==e){t=cr(t);var r=t.length;return r>0?t[Ye(0,r-1)]:I}var i=-1,o=qi(t),r=o.length,a=r-1;for(e=Sa(0>e?0:+e||0,r);++i<e;){var s=Ye(i,a),h=o[s];o[s]=o[i],o[i]=h}return o.length=e,o}function ii(t){return ri(t,Aa)}function oi(t){var e=t?ja(t):0;return nr(e)?e:Ws(t).length}function ai(t,e,n){var r=Ls(t)?fe:Xe;return n&&Qn(t,e,n)&&(e=I),("function"!=typeof e||n!==I)&&(e=Nn(e,n,3)),r(t,e)}function si(t,e,n){if(null==t)return[];n&&Qn(t,e,n)&&(e=I);var r=-1;e=Nn(e,n,3);var i=ze(t,function(t,n,i){return{criteria:e(t,n,i),index:++r,value:t}});return Ve(i,f)}function hi(t,e,n,r){return null==t?[]:(r&&Qn(e,n,r)&&(n=I),Ls(e)||(e=null==e?[]:[e]),Ls(n)||(n=null==n?[]:[n]),$e(t,e,n))}function ui(t,e){return $r(t,Fe(e))}function ci(t,e){if("function"!=typeof e){if("function"!=typeof t)throw new Vo(G);var n=t;t=e,e=n}return t=wa(t=+t)?t:0,function(){return--t<1?e.apply(this,arguments):void 0}}function li(t,e,n){return n&&Qn(t,e,n)&&(e=I),e=t&&null==e?t.length:xa(+e||0,0),Pn(t,U,I,I,I,I,e)}function fi(t,e){var n;if("function"!=typeof e){if("function"!=typeof t)throw new Vo(G);var r=t;t=e,e=r}return function(){return--t>0&&(n=e.apply(this,arguments)),1>=t&&(e=I),n}}function di(t,e,n){function r(){d&&sa(d),u&&sa(u),g=0,u=d=p=I}function i(e,n){n&&sa(n),u=d=p=I,e&&(g=gs(),c=t.apply(f,h),d||u||(h=f=I))}function o(){var t=e-(gs()-l);0>=t||t>e?i(p,u):d=fa(o,t)}function a(){i(m,d)}function s(){if(h=arguments,l=gs(),f=this,p=m&&(d||!y),v===!1)var n=y&&!d;else{u||y||(g=l);var r=v-(l-g),i=0>=r||r>v;i?(u&&(u=sa(u)),g=l,c=t.apply(f,h)):u||(u=fa(a,r))}return i&&d?d=sa(d):d||e===v||(d=fa(o,e)),n&&(i=!0,c=t.apply(f,h)),!i||d||u||(h=f=I),c}var h,u,c,l,f,d,p,g=0,v=!1,m=!0;if("function"!=typeof t)throw new Vo(G);if(e=0>e?0:+e||0,n===!0){var y=!0;m=!1}else Mi(n)&&(y=!!n.leading,v="maxWait"in n&&xa(+n.maxWait||0,e),m="trailing"in n?!!n.trailing:m);return s.cancel=r,s}function pi(t,e){if("function"!=typeof t||e&&"function"!=typeof e)throw new Vo(G);var n=function(){var r=arguments,i=e?e.apply(this,r):r[0],o=n.cache;if(o.has(i))return o.get(i);var a=t.apply(this,r);return n.cache=o.set(i,a),a};return n.cache=new pi.Cache,n}function gi(t){if("function"!=typeof t)throw new Vo(G);return function(){return!t.apply(this,arguments)}}function vi(t){return fi(2,t)}function mi(t,e){if("function"!=typeof t)throw new Vo(G);return e=xa(e===I?t.length-1:+e||0,0),function(){for(var n=arguments,r=-1,i=xa(n.length-e,0),o=No(i);++r<i;)o[r]=n[e+r];switch(e){case 0:return t.call(this,o);case 1:return t.call(this,n[0],o);case 2:return t.call(this,n[0],n[1],o)}var a=No(e+1);for(r=-1;++r<e;)a[r]=n[r];return a[e]=o,t.apply(this,a)}}function yi(t){if("function"!=typeof t)throw new Vo(G);return function(e){return t.apply(this,e)}}function _i(t,e,n){var r=!0,i=!0;if("function"!=typeof t)throw new Vo(G);return n===!1?r=!1:Mi(n)&&(r="leading"in n?!!n.leading:r,i="trailing"in n?!!n.trailing:i),di(t,e,{leading:r,maxWait:+e,trailing:i})}function wi(t,e){return e=null==e?Ao:e,Pn(e,M,I,[t],[])}function bi(t,e,n,r){return e&&"boolean"!=typeof e&&Qn(t,e,n)?e=!1:"function"==typeof e&&(r=n,n=e,e=!1),"function"==typeof n?be(t,e,an(n,r,1)):be(t,e)}function xi(t,e,n){return"function"==typeof e?be(t,!0,an(e,n,1)):be(t,!0)}function Si(t,e){return t>e}function ki(t,e){return t>=e}function Ei(t){return _(t)&&$n(t)&&ea.call(t,"callee")&&!ca.call(t,"callee")}function Ci(t){return t===!0||t===!1||_(t)&&ra.call(t)==X}function Ii(t){return _(t)&&ra.call(t)==V}function Ai(t){return!!t&&1===t.nodeType&&_(t)&&!Wi(t)}function Li(t){return null==t?!0:$n(t)&&(Ls(t)||ji(t)||Ei(t)||_(t)&&Oi(t.splice))?!t.length:!Ws(t).length}function Ri(t,e,n,r){n="function"==typeof n?an(n,r,3):I;var i=n?n(t,e):I;return i===I?De(t,e,n):!!i}function Ti(t){return _(t)&&"string"==typeof t.message&&ra.call(t)==$}function Bi(t){return"number"==typeof t&&wa(t)}function Oi(t){return Mi(t)&&ra.call(t)==J}function Mi(t){var e=typeof t;return!!t&&("object"==e||"function"==e)}function Di(t,e,n,r){return n="function"==typeof n?an(n,r,3):I,Pe(t,Zn(e),n)}function Ui(t){return Fi(t)&&t!=+t}function Pi(t){return null==t?!1:Oi(t)?oa.test(ta.call(t)):_(t)&&Ut.test(t)}function zi(t){return null===t}function Fi(t){return"number"==typeof t||_(t)&&ra.call(t)==tt}function Wi(t){var e;if(!_(t)||ra.call(t)!=et||Ei(t)||!ea.call(t,"constructor")&&(e=t.constructor,"function"==typeof e&&!(e instanceof e)))return!1;var n;return Re(t,function(t,e){n=e}),n===I||ea.call(t,n)}function Ni(t){return Mi(t)&&ra.call(t)==nt}function ji(t){return"string"==typeof t||_(t)&&ra.call(t)==it}function Hi(t){return _(t)&&nr(t.length)&&!!Zt[ra.call(t)]}function Zi(t){return t===I}function Gi(t,e){return e>t}function Yi(t,e){return e>=t}function qi(t){var e=t?ja(t):0;return nr(e)?e?te(t):[]:oo(t)}function Ki(t){return _e(t,to(t))}function Xi(t,e,n){var r=Da(t);return n&&Qn(t,e,n)&&(e=I),e?me(r,e):r}function Vi(t){return Oe(t,to(t))}function $i(t,e,n){var r=null==t?I:Me(t,fr(e),e+"");return r===I?n:r}function Ji(t,e){if(null==t)return!1;var n=ea.call(t,e);if(!n&&!tr(e)){if(e=fr(e),t=1==e.length?t:Me(t,Ke(e,0,-1)),null==t)return!1;e=Cr(e),n=ea.call(t,e)}return n||nr(t.length)&&Jn(e,t.length)&&(Ls(t)||Ei(t))}function Qi(t,e,n){n&&Qn(t,e,n)&&(e=I);for(var r=-1,i=Ws(t),o=i.length,a={};++r<o;){var s=i[r],h=t[s];e?ea.call(a,h)?a[h].push(s):a[h]=[s]:a[h]=s}return a}function to(t){if(null==t)return[];Mi(t)||(t=qo(t));var e=t.length;e=e&&nr(e)&&(Ls(t)||Ei(t))&&e||0;for(var n=t.constructor,r=-1,i="function"==typeof n&&n.prototype===t,o=No(e),a=e>0;++r<e;)o[r]=r+"";for(var s in t)a&&Jn(s,e)||"constructor"==s&&(i||!ea.call(t,s))||o.push(s);return o}function eo(t){t=lr(t);for(var e=-1,n=Ws(t),r=n.length,i=No(r);++e<r;){var o=n[e];i[e]=[o,t[o]]}return i}function no(t,e,n){var r=null==t?I:t[e];return r===I&&(null==t||tr(e,t)||(e=fr(e),t=1==e.length?t:Me(t,Ke(e,0,-1)),r=null==t?I:t[Cr(e)]),r=r===I?n:r),Oi(r)?r.call(t):r}function ro(t,e,n){if(null==t)return t;var r=e+"";e=null!=t[r]||tr(e,t)?[r]:fr(e);for(var i=-1,o=e.length,a=o-1,s=t;null!=s&&++i<o;){var h=e[i];Mi(s)&&(i==a?s[h]=n:null==s[h]&&(s[h]=Jn(e[i+1])?[]:{})),s=s[h]}return t}function io(t,e,n,r){var i=Ls(t)||Hi(t);if(e=Nn(e,r,4),null==n)if(i||Mi(t)){var o=t.constructor;n=i?Ls(t)?new o:[]:Da(Oi(o)?o.prototype:I)}else n={};return(i?ee:Te)(t,function(t,r,i){return e(n,t,r,i)}),n}function oo(t){return tn(t,Ws(t))}function ao(t){return tn(t,to(t))}function so(t,e,n){return e=+e||0,n===I?(n=e,e=0):n=+n||0,t>=Sa(e,n)&&t<xa(e,n)}function ho(t,e,n){n&&Qn(t,e,n)&&(e=n=I);var r=null==t,i=null==e;if(null==n&&(i&&"boolean"==typeof t?(n=t,t=1):"boolean"==typeof e&&(n=e,i=!0)),r&&i&&(e=1,i=!1),t=+t||0,i?(e=t,t=0):e=+e||0,n||t%1||e%1){var o=Ca();return Sa(t+o*(e-t+ha("1e-"+((o+"").length-1))),e)}return Ye(t,e)}function uo(t){return t=u(t),t&&t.charAt(0).toUpperCase()+t.slice(1)}function co(t){return t=u(t),t&&t.replace(zt,p).replace(Tt,"")}function lo(t,e,n){t=u(t),e+="";var r=t.length;return n=n===I?r:Sa(0>n?0:+n||0,r),n-=e.length,n>=0&&t.indexOf(e,n)==n}function fo(t){return t=u(t),t&&xt.test(t)?t.replace(wt,g):t}function po(t){return t=u(t),t&&Rt.test(t)?t.replace(Lt,v):t||"(?:)"}function go(t,e,n){t=u(t),e=+e;var r=t.length;if(r>=e||!wa(e))return t;var i=(e-r)/2,o=ya(i),a=va(i);return n=On("",a,n),n.slice(0,o)+t+n}function vo(t,e,n){return(n?Qn(t,e,n):null==e)?e=0:e&&(e=+e),t=wo(t),Ea(t,e||(Dt.test(t)?16:10))}function mo(t,e){var n="";if(t=u(t),e=+e,1>e||!t||!wa(e))return n;do e%2&&(n+=t),e=ya(e/2),t+=t;while(e);return n}function yo(t,e,n){return t=u(t),n=null==n?0:Sa(0>n?0:+n||0,t.length),t.lastIndexOf(e,n)==n}function _o(t,n,r){var i=e.templateSettings;r&&Qn(t,n,r)&&(n=r=I),t=u(t),n=ve(me({},r||n),i,ge);var o,a,s=ve(me({},n.imports),i.imports,ge),h=Ws(s),c=tn(s,h),l=0,f=n.interpolate||Ft,d="__p += '",p=Ko((n.escape||Ft).source+"|"+f.source+"|"+(f===Et?Ot:Ft).source+"|"+(n.evaluate||Ft).source+"|$","g"),g="//# sourceURL="+("sourceURL"in n?n.sourceURL:"lodash.templateSources["+ ++Ht+"]")+"\n";t.replace(p,function(e,n,r,i,s,h){return r||(r=i),d+=t.slice(l,h).replace(Wt,m),n&&(o=!0,d+="' +\n__e("+n+") +\n'"),s&&(a=!0,d+="';\n"+s+";\n__p += '"),r&&(d+="' +\n((__t = ("+r+")) == null ? '' : __t) +\n'"),l=h+e.length,e}),d+="';\n";var v=n.variable;v||(d="with (obj) {\n"+d+"\n}\n"),d=(a?d.replace(vt,""):d).replace(mt,"$1").replace(yt,"$1;"),d="function("+(v||"obj")+") {\n"+(v?"":"obj || (obj = {});\n")+"var __t, __p = ''"+(o?", __e = _.escape":"")+(a?", __j = Array.prototype.join;\nfunction print() { __p += __j.call(arguments, '') }\n":";\n")+d+"return __p\n}";var y=$s(function(){return Zo(h,g+"return "+d).apply(I,c)});if(y.source=d,Ti(y))throw y;return y}function wo(t,e,n){var r=t;return(t=u(t))?(n?Qn(r,e,n):null==e)?t.slice(S(t),k(t)+1):(e+="",t.slice(c(t,e),l(t,e)+1)):t}function bo(t,e,n){var r=t;return t=u(t),t?(n?Qn(r,e,n):null==e)?t.slice(S(t)):t.slice(c(t,e+"")):t}function xo(t,e,n){var r=t;return t=u(t),t?(n?Qn(r,e,n):null==e)?t.slice(0,k(t)+1):t.slice(0,l(t,e+"")+1):t}function So(t,e,n){n&&Qn(t,e,n)&&(e=I);var r=z,i=F;if(null!=e)if(Mi(e)){var o="separator"in e?e.separator:o;r="length"in e?+e.length||0:r,i="omission"in e?u(e.omission):i}else r=+e||0;if(t=u(t),r>=t.length)return t;var a=r-i.length;if(1>a)return i;var s=t.slice(0,a);if(null==o)return s+i;if(Ni(o)){if(t.slice(a).search(o)){var h,c,l=t.slice(0,a);for(o.global||(o=Ko(o.source,(Mt.exec(o)||"")+"g")),o.lastIndex=0;h=o.exec(l);)c=h.index;s=s.slice(0,null==c?a:c)}}else if(t.indexOf(o,a)!=a){var f=s.lastIndexOf(o);f>-1&&(s=s.slice(0,f))}return s+i}function ko(t){return t=u(t),t&&bt.test(t)?t.replace(_t,E):t}function Eo(t,e,n){return n&&Qn(t,e,n)&&(e=I),t=u(t),t.match(e||Nt)||[]}function Co(t,e,n){return n&&Qn(t,e,n)&&(e=I),_(t)?Lo(t):we(t,e)}function Io(t){return function(){return t}}function Ao(t){return t}function Lo(t){return Fe(be(t,!0))}function Ro(t,e){return We(t,be(e,!0))}function To(t,e,n){if(null==n){var r=Mi(e),i=r?Ws(e):I,o=i&&i.length?Oe(e,i):I;(o?o.length:r)||(o=!1,n=e,e=t,t=this)}o||(o=Oe(e,Ws(e)));var a=!0,s=-1,h=Oi(t),u=o.length;n===!1?a=!1:Mi(n)&&"chain"in n&&(a=n.chain);for(;++s<u;){var c=o[s],l=e[c];t[c]=l,h&&(t.prototype[c]=function(e){return function(){var n=this.__chain__;if(a||n){var r=t(this.__wrapped__),i=r.__actions__=te(this.__actions__);return i.push({func:e,args:arguments,thisArg:t}),r.__chain__=n,r}return e.apply(t,ue([this.value()],arguments))}}(l))}return t}function Bo(){return re._=ia,this}function Oo(){}function Mo(t){return tr(t)?He(t):Ze(t)}function Do(t){return function(e){return Me(t,fr(e),e+"")}}function Uo(t,e,n){n&&Qn(t,e,n)&&(e=n=I),t=+t||0,n=null==n?1:+n||0,null==e?(e=t,t=0):e=+e||0;for(var r=-1,i=xa(va((e-t)/(n||1)),0),o=No(i);++r<i;)o[r]=t,t+=n;return o}function Po(t,e,n){if(t=ya(t),1>t||!wa(t))return[];var r=-1,i=No(Sa(t,La));for(e=an(e,n,1);++r<t;)La>r?i[r]=e(r):e(r);return i}function zo(t){var e=++na;return u(t)+e}function Fo(t,e){return(+t||0)+(+e||0)}function Wo(t,e,n){return n&&Qn(t,e,n)&&(e=I),e=Nn(e,n,3),1==e.length?de(Ls(t)?t:cr(t),e):Je(t,e)}t=t?ie.defaults(re.Object(),t,ie.pick(re,jt)):re;var No=t.Array,jo=t.Date,Ho=t.Error,Zo=t.Function,Go=t.Math,Yo=t.Number,qo=t.Object,Ko=t.RegExp,Xo=t.String,Vo=t.TypeError,$o=No.prototype,Jo=qo.prototype,Qo=Xo.prototype,ta=Zo.prototype.toString,ea=Jo.hasOwnProperty,na=0,ra=Jo.toString,ia=re._,oa=Ko("^"+ta.call(ea).replace(/[\\^$.*+?()[\]{}|]/g,"\\$&").replace(/hasOwnProperty|(function).*?(?=\\\()| for .+?(?=\\\])/g,"$1.*?")+"$"),aa=t.ArrayBuffer,sa=t.clearTimeout,ha=t.parseFloat,ua=Go.pow,ca=Jo.propertyIsEnumerable,la=Gn(t,"Set"),fa=t.setTimeout,da=$o.splice,pa=t.Uint8Array,ga=Gn(t,"WeakMap"),va=Go.ceil,ma=Gn(qo,"create"),ya=Go.floor,_a=Gn(No,"isArray"),wa=t.isFinite,ba=Gn(qo,"keys"),xa=Go.max,Sa=Go.min,ka=Gn(jo,"now"),Ea=t.parseInt,Ca=Go.random,Ia=Yo.NEGATIVE_INFINITY,Aa=Yo.POSITIVE_INFINITY,La=4294967295,Ra=La-1,Ta=La>>>1,Ba=9007199254740991,Oa=ga&&new ga,Ma={};e.support={};e.templateSettings={escape:St,evaluate:kt,interpolate:Et,variable:"",imports:{_:e}};var Da=function(){function t(){}return function(e){if(Mi(e)){t.prototype=e;var n=new t;t.prototype=I}return n||{}}}(),Ua=fn(Te),Pa=fn(Be,!0),za=dn(),Fa=dn(!0),Wa=Oa?function(t,e){return Oa.set(t,e),t}:Ao,Na=Oa?function(t){return Oa.get(t)}:Oo,ja=He("length"),Ha=function(){var t=0,e=0;return function(n,r){var i=gs(),o=N-(i-e);if(e=i,o>0){if(++t>=W)return n}else t=0;return Wa(n,r)}}(),Za=mi(function(t,e){return _(t)&&$n(t)?Se(t,Le(e,!1,!0)):[]}),Ga=xn(),Ya=xn(!0),qa=mi(function(t){for(var e=t.length,n=e,r=No(l),i=Hn(),o=i==s,a=[];n--;){var h=t[n]=$n(h=t[n])?h:[];r[n]=o&&h.length>=120?gn(n&&h):null}var u=t[0],c=-1,l=u?u.length:0,f=r[0];t:for(;++c<l;)if(h=u[c],(f?$t(f,h):i(a,h,0))<0){for(var n=e;--n;){var d=r[n];if((d?$t(d,h):i(t[n],h,0))<0)continue t}f&&f.push(h),a.push(h)}return a}),Ka=mi(function(t,e){e=Le(e);var n=ye(t,e);return Ge(t,e.sort(o)),n}),Xa=Un(),Va=Un(!0),$a=mi(function(t){return Qe(Le(t,!1,!0))}),Ja=mi(function(t,e){return $n(t)?Se(t,e):[]}),Qa=mi(Pr),ts=mi(function(t){var e=t.length,n=e>2?t[e-2]:I,r=e>1?t[e-1]:I;return e>2&&"function"==typeof n?e-=2:(n=e>1&&"function"==typeof r?(--e,r):I,r=I),t.length=e,zr(t,n,r)}),es=mi(function(t){return t=Le(t),this.thru(function(e){return Qt(Ls(e)?e:[lr(e)],t)})}),ns=mi(function(t,e){return ye(t,Le(e))}),rs=cn(function(t,e,n){ea.call(t,n)?++t[n]:t[n]=1}),is=bn(Ua),os=bn(Pa,!0),as=En(ee,Ua),ss=En(ne,Pa),hs=cn(function(t,e,n){ea.call(t,n)?t[n].push(e):t[n]=[e]}),us=cn(function(t,e,n){t[n]=e}),cs=mi(function(t,e,n){var r=-1,i="function"==typeof e,o=tr(e),a=$n(t)?No(t.length):[];return Ua(t,function(t){var s=i?e:o&&null!=t?t[e]:I;a[++r]=s?s.apply(t,n):Vn(t,e,n)}),a}),ls=cn(function(t,e,n){t[n?0:1].push(e)},function(){return[[],[]]}),fs=Tn(ce,Ua),ds=Tn(le,Pa),ps=mi(function(t,e){if(null==t)return[];var n=e[2];return n&&Qn(e[0],e[1],n)&&(e.length=1),$e(t,Le(e),[])}),gs=ka||function(){return(new jo).getTime()},vs=mi(function(t,e,n){var r=L;if(n.length){var i=b(n,vs.placeholder);r|=M}return Pn(t,r,e,n,i)}),ms=mi(function(t,e){e=e.length?Le(e):Vi(t);for(var n=-1,r=e.length;++n<r;){var i=e[n];t[i]=Pn(t[i],L,t)}return t}),ys=mi(function(t,e,n){var r=L|R;if(n.length){var i=b(n,ys.placeholder);r|=M}return Pn(e,r,t,n,i)}),_s=yn(B),ws=yn(O),bs=mi(function(t,e){return xe(t,1,e)}),xs=mi(function(t,e,n){return xe(t,e,n)}),Ss=kn(),ks=kn(!0),Es=mi(function(t,e){if(e=Le(e),"function"!=typeof t||!oe(e,h))throw new Vo(G);var n=e.length;return mi(function(r){for(var i=Sa(r.length,n);i--;)r[i]=e[i](r[i]);return t.apply(this,r)})}),Cs=Rn(M),Is=Rn(D),As=mi(function(t,e){return Pn(t,P,I,I,I,Le(e))}),Ls=_a||function(t){return _(t)&&nr(t.length)&&ra.call(t)==K},Rs=ln(Ne),Ts=ln(function(t,e,n){return n?ve(t,e,n):me(t,e)}),Bs=_n(Ts,pe),Os=_n(Rs,or),Ms=Sn(Te),Ds=Sn(Be),Us=Cn(za),Ps=Cn(Fa),zs=In(Te),Fs=In(Be),Ws=ba?function(t){var e=null==t?I:t.constructor;return"function"==typeof e&&e.prototype===t||"function"!=typeof t&&$n(t)?ur(t):Mi(t)?ba(t):[]}:ur,Ns=An(!0),js=An(),Hs=mi(function(t,e){if(null==t)return{};if("function"!=typeof e[0]){var e=he(Le(e),Xo);return ar(t,Se(to(t),e))}var n=an(e[0],e[1],3);return sr(t,function(t,e,r){return!n(t,e,r)})}),Zs=mi(function(t,e){return null==t?{}:"function"==typeof e[0]?sr(t,an(e[0],e[1],3)):ar(t,Le(e))}),Gs=vn(function(t,e,n){return e=e.toLowerCase(),t+(n?e.charAt(0).toUpperCase()+e.slice(1):e)}),Ys=vn(function(t,e,n){return t+(n?"-":"")+e.toLowerCase()}),qs=Ln(),Ks=Ln(!0),Xs=vn(function(t,e,n){return t+(n?"_":"")+e.toLowerCase()}),Vs=vn(function(t,e,n){return t+(n?" ":"")+(e.charAt(0).toUpperCase()+e.slice(1))}),$s=mi(function(t,e){try{return t.apply(I,e)}catch(n){return Ti(n)?n:new Ho(n)}}),Js=mi(function(t,e){return function(n){return Vn(n,t,e)}}),Qs=mi(function(t,e){return function(n){return Vn(t,n,e)}}),th=Dn("ceil"),eh=Dn("floor"),nh=wn(Si,Ia),rh=wn(Gi,Aa),ih=Dn("round");return e.prototype=n.prototype,r.prototype=Da(n.prototype),r.prototype.constructor=r,i.prototype=Da(n.prototype),i.prototype.constructor=i,ot.prototype["delete"]=Yt,ot.prototype.get=qt,ot.prototype.has=Kt,ot.prototype.set=Xt,Vt.prototype.push=Jt,pi.Cache=ot,e.after=ci,e.ary=li,e.assign=Ts,e.at=ns,e.before=fi,e.bind=vs,e.bindAll=ms,e.bindKey=ys,e.callback=Co,e.chain=Nr,e.chunk=pr,e.compact=gr,e.constant=Io,e.countBy=rs,e.create=Xi,e.curry=_s,e.curryRight=ws,e.debounce=di,e.defaults=Bs,e.defaultsDeep=Os,e.defer=bs,e.delay=xs,e.difference=Za,e.drop=vr,e.dropRight=mr,e.dropRightWhile=yr,e.dropWhile=_r,e.fill=wr,e.filter=$r,e.flatten=xr,e.flattenDeep=Sr,e.flow=Ss,e.flowRight=ks,e.forEach=as,e.forEachRight=ss,e.forIn=Us,e.forInRight=Ps,e.forOwn=zs,e.forOwnRight=Fs,e.functions=Vi,e.groupBy=hs,e.indexBy=us,e.initial=Er,e.intersection=qa,e.invert=Qi,e.invoke=cs,e.keys=Ws,e.keysIn=to,e.map=ti,e.mapKeys=Ns,e.mapValues=js,e.matches=Lo,e.matchesProperty=Ro,e.memoize=pi,e.merge=Rs,e.method=Js,e.methodOf=Qs,e.mixin=To,e.modArgs=Es,e.negate=gi,e.omit=Hs,e.once=vi,e.pairs=eo,e.partial=Cs,e.partialRight=Is,e.partition=ls,e.pick=Zs,e.pluck=ei,e.property=Mo,e.propertyOf=Do,e.pull=Ar,e.pullAt=Ka,e.range=Uo,e.rearg=As,e.reject=ni,e.remove=Lr,e.rest=Rr,e.restParam=mi,e.set=ro,e.shuffle=ii,e.slice=Tr,e.sortBy=si,e.sortByAll=ps,e.sortByOrder=hi,e.spread=yi,e.take=Br,e.takeRight=Or,e.takeRightWhile=Mr,e.takeWhile=Dr,e.tap=jr,e.throttle=_i,e.thru=Hr,e.times=Po,e.toArray=qi,e.toPlainObject=Ki,e.transform=io,e.union=$a,e.uniq=Ur,e.unzip=Pr,e.unzipWith=zr,e.values=oo,e.valuesIn=ao,e.where=ui,e.without=Ja,e.wrap=wi,e.xor=Fr,e.zip=Qa,e.zipObject=Wr,e.zipWith=ts,e.backflow=ks,e.collect=ti,e.compose=ks,e.each=as,e.eachRight=ss,e.extend=Ts,e.iteratee=Co,e.methods=Vi,e.object=Wr,e.select=$r,e.tail=Rr,e.unique=Ur,To(e,e),e.add=Fo,e.attempt=$s,e.camelCase=Gs,e.capitalize=uo,e.ceil=th,e.clone=bi,e.cloneDeep=xi,e.deburr=co,e.endsWith=lo,e.escape=fo,e.escapeRegExp=po,e.every=Vr,e.find=is,e.findIndex=Ga,e.findKey=Ms,e.findLast=os,e.findLastIndex=Ya,e.findLastKey=Ds,e.findWhere=Jr,e.first=br,e.floor=eh,e.get=$i,e.gt=Si,e.gte=ki,e.has=Ji,e.identity=Ao,e.includes=Qr,e.indexOf=kr,e.inRange=so,e.isArguments=Ei,e.isArray=Ls,e.isBoolean=Ci,e.isDate=Ii,e.isElement=Ai,e.isEmpty=Li,e.isEqual=Ri,e.isError=Ti,e.isFinite=Bi,e.isFunction=Oi,e.isMatch=Di,e.isNaN=Ui,e.isNative=Pi,e.isNull=zi,e.isNumber=Fi,e.isObject=Mi,e.isPlainObject=Wi,e.isRegExp=Ni,e.isString=ji,e.isTypedArray=Hi,e.isUndefined=Zi,e.kebabCase=Ys,e.last=Cr,e.lastIndexOf=Ir,e.lt=Gi,e.lte=Yi,e.max=nh,e.min=rh,e.noConflict=Bo,e.noop=Oo,e.now=gs,e.pad=go,e.padLeft=qs,e.padRight=Ks,e.parseInt=vo,e.random=ho,e.reduce=fs,e.reduceRight=ds,e.repeat=mo,e.result=no,e.round=ih,e.runInContext=C,e.size=oi,e.snakeCase=Xs,e.some=ai,e.sortedIndex=Xa,e.sortedLastIndex=Va,e.startCase=Vs,e.startsWith=yo,e.sum=Wo,e.template=_o,e.trim=wo,e.trimLeft=bo,e.trimRight=xo,e.trunc=So,e.unescape=ko,e.uniqueId=zo,e.words=Eo,e.all=Vr,e.any=ai,e.contains=Qr,e.eq=Ri,e.detect=is,e.foldl=fs,e.foldr=ds,e.head=br,e.include=Qr,e.inject=fs,To(e,function(){var t={};return Te(e,function(n,r){e.prototype[r]||(t[r]=n)}),t}(),!1),e.sample=ri,e.prototype.sample=function(t){return this.__chain__||null!=t?this.thru(function(e){return ri(e,t)}):ri(this.value())},e.VERSION=A,ee(["bind","bindKey","curry","curryRight","partial","partialRight"],function(t){e[t].placeholder=e}),ee(["drop","take"],function(t,e){i.prototype[t]=function(n){var r=this.__filtered__;if(r&&!e)return new i(this);n=null==n?1:xa(ya(n)||0,0);var o=this.clone();return r?o.__takeCount__=Sa(o.__takeCount__,n):o.__views__.push({size:n,type:t+(o.__dir__<0?"Right":"")}),o},i.prototype[t+"Right"]=function(e){return this.reverse()[t](e).reverse()}}),ee(["filter","map","takeWhile"],function(t,e){var n=e+1,r=n!=Z;i.prototype[t]=function(t,e){var i=this.clone();return i.__iteratees__.push({iteratee:Nn(t,e,1),type:n}),i.__filtered__=i.__filtered__||r,i}}),ee(["first","last"],function(t,e){var n="take"+(e?"Right":"");i.prototype[t]=function(){return this[n](1).value()[0]}}),ee(["initial","rest"],function(t,e){var n="drop"+(e?"":"Right");i.prototype[t]=function(){return this.__filtered__?new i(this):this[n](1);
}}),ee(["pluck","where"],function(t,e){var n=e?"filter":"map",r=e?Fe:Mo;i.prototype[t]=function(t){return this[n](r(t))}}),i.prototype.compact=function(){return this.filter(Ao)},i.prototype.reject=function(t,e){return t=Nn(t,e,1),this.filter(function(e){return!t(e)})},i.prototype.slice=function(t,e){t=null==t?0:+t||0;var n=this;return n.__filtered__&&(t>0||0>e)?new i(n):(0>t?n=n.takeRight(-t):t&&(n=n.drop(t)),e!==I&&(e=+e||0,n=0>e?n.dropRight(-e):n.take(e-t)),n)},i.prototype.takeRightWhile=function(t,e){return this.reverse().takeWhile(t,e).reverse()},i.prototype.toArray=function(){return this.take(Aa)},Te(i.prototype,function(t,n){var o=/^(?:filter|map|reject)|While$/.test(n),a=/^(?:first|last)$/.test(n),s=e[a?"take"+("last"==n?"Right":""):n];s&&(e.prototype[n]=function(){var e=a?[1]:arguments,n=this.__chain__,h=this.__wrapped__,u=!!this.__actions__.length,c=h instanceof i,l=e[0],f=c||Ls(h);f&&o&&"function"==typeof l&&1!=l.length&&(c=f=!1);var d=function(t){return a&&n?s(t,1)[0]:s.apply(I,ue([t],e))},p={func:Hr,args:[d],thisArg:I},g=c&&!u;if(a&&!n)return g?(h=h.clone(),h.__actions__.push(p),t.call(h)):s.call(I,this.value())[0];if(!a&&f){h=g?h:new i(this);var v=t.apply(h,e);return v.__actions__.push(p),new r(v,n)}return this.thru(d)})}),ee(["join","pop","push","replace","shift","sort","splice","split","unshift"],function(t){var n=(/^(?:replace|split)$/.test(t)?Qo:$o)[t],r=/^(?:push|sort|unshift)$/.test(t)?"tap":"thru",i=/^(?:join|pop|replace|shift)$/.test(t);e.prototype[t]=function(){var t=arguments;return i&&!this.__chain__?n.apply(this.value(),t):this[r](function(e){return n.apply(e,t)})}}),Te(i.prototype,function(t,n){var r=e[n];if(r){var i=r.name,o=Ma[i]||(Ma[i]=[]);o.push({name:n,func:r})}}),Ma[Bn(I,R).name]=[{name:"wrapper",func:I}],i.prototype.clone=w,i.prototype.reverse=Q,i.prototype.value=rt,e.prototype.chain=Zr,e.prototype.commit=Gr,e.prototype.concat=es,e.prototype.plant=Yr,e.prototype.reverse=qr,e.prototype.toString=Kr,e.prototype.run=e.prototype.toJSON=e.prototype.valueOf=e.prototype.value=Xr,e.prototype.collect=e.prototype.map,e.prototype.head=e.prototype.first,e.prototype.select=e.prototype.filter,e.prototype.tail=e.prototype.rest,e}var I,A="3.10.1",L=1,R=2,T=4,B=8,O=16,M=32,D=64,U=128,P=256,z=30,F="...",W=150,N=16,j=200,H=1,Z=2,G="Expected a function",Y="__lodash_placeholder__",q="[object Arguments]",K="[object Array]",X="[object Boolean]",V="[object Date]",$="[object Error]",J="[object Function]",Q="[object Map]",tt="[object Number]",et="[object Object]",nt="[object RegExp]",rt="[object Set]",it="[object String]",ot="[object WeakMap]",at="[object ArrayBuffer]",st="[object Float32Array]",ht="[object Float64Array]",ut="[object Int8Array]",ct="[object Int16Array]",lt="[object Int32Array]",ft="[object Uint8Array]",dt="[object Uint8ClampedArray]",pt="[object Uint16Array]",gt="[object Uint32Array]",vt=/\b__p \+= '';/g,mt=/\b(__p \+=) '' \+/g,yt=/(__e\(.*?\)|\b__t\)) \+\n'';/g,_t=/&(?:amp|lt|gt|quot|#39|#96);/g,wt=/[&<>"'`]/g,bt=RegExp(_t.source),xt=RegExp(wt.source),St=/<%-([\s\S]+?)%>/g,kt=/<%([\s\S]+?)%>/g,Et=/<%=([\s\S]+?)%>/g,Ct=/\.|\[(?:[^[\]]*|(["'])(?:(?!\1)[^\n\\]|\\.)*?\1)\]/,It=/^\w*$/,At=/[^.[\]]+|\[(?:(-?\d+(?:\.\d+)?)|(["'])((?:(?!\2)[^\n\\]|\\.)*?)\2)\]/g,Lt=/^[:!,]|[\\^$.*+?()[\]{}|\/]|(^[0-9a-fA-Fnrtuvx])|([\n\r\u2028\u2029])/g,Rt=RegExp(Lt.source),Tt=/[\u0300-\u036f\ufe20-\ufe23]/g,Bt=/\\(\\)?/g,Ot=/\$\{([^\\}]*(?:\\.[^\\}]*)*)\}/g,Mt=/\w*$/,Dt=/^0[xX]/,Ut=/^\[object .+?Constructor\]$/,Pt=/^\d+$/,zt=/[\xc0-\xd6\xd8-\xde\xdf-\xf6\xf8-\xff]/g,Ft=/($^)/,Wt=/['\n\r\u2028\u2029\\]/g,Nt=function(){var t="[A-Z\\xc0-\\xd6\\xd8-\\xde]",e="[a-z\\xdf-\\xf6\\xf8-\\xff]+";return RegExp(t+"+(?="+t+e+")|"+t+"?"+e+"|"+t+"+|[0-9]+","g")}(),jt=["Array","ArrayBuffer","Date","Error","Float32Array","Float64Array","Function","Int8Array","Int16Array","Int32Array","Math","Number","Object","RegExp","Set","String","_","clearTimeout","isFinite","parseFloat","parseInt","setTimeout","TypeError","Uint8Array","Uint8ClampedArray","Uint16Array","Uint32Array","WeakMap"],Ht=-1,Zt={};Zt[st]=Zt[ht]=Zt[ut]=Zt[ct]=Zt[lt]=Zt[ft]=Zt[dt]=Zt[pt]=Zt[gt]=!0,Zt[q]=Zt[K]=Zt[at]=Zt[X]=Zt[V]=Zt[$]=Zt[J]=Zt[Q]=Zt[tt]=Zt[et]=Zt[nt]=Zt[rt]=Zt[it]=Zt[ot]=!1;var Gt={};Gt[q]=Gt[K]=Gt[at]=Gt[X]=Gt[V]=Gt[st]=Gt[ht]=Gt[ut]=Gt[ct]=Gt[lt]=Gt[tt]=Gt[et]=Gt[nt]=Gt[it]=Gt[ft]=Gt[dt]=Gt[pt]=Gt[gt]=!0,Gt[$]=Gt[J]=Gt[Q]=Gt[rt]=Gt[ot]=!1;var Yt={"À":"A","Á":"A","Â":"A","Ã":"A","Ä":"A","Å":"A","à":"a","á":"a","â":"a","ã":"a","ä":"a","å":"a","Ç":"C","ç":"c","Ð":"D","ð":"d","È":"E","É":"E","Ê":"E","Ë":"E","è":"e","é":"e","ê":"e","ë":"e","Ì":"I","Í":"I","Î":"I","Ï":"I","ì":"i","í":"i","î":"i","ï":"i","Ñ":"N","ñ":"n","Ò":"O","Ó":"O","Ô":"O","Õ":"O","Ö":"O","Ø":"O","ò":"o","ó":"o","ô":"o","õ":"o","ö":"o","ø":"o","Ù":"U","Ú":"U","Û":"U","Ü":"U","ù":"u","ú":"u","û":"u","ü":"u","Ý":"Y","ý":"y","ÿ":"y","Æ":"Ae","æ":"ae","Þ":"Th","þ":"th","ß":"ss"},qt={"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;","`":"&#96;"},Kt={"&amp;":"&","&lt;":"<","&gt;":">","&quot;":'"',"&#39;":"'","&#96;":"`"},Xt={"function":!0,object:!0},Vt={0:"x30",1:"x31",2:"x32",3:"x33",4:"x34",5:"x35",6:"x36",7:"x37",8:"x38",9:"x39",A:"x41",B:"x42",C:"x43",D:"x44",E:"x45",F:"x46",a:"x61",b:"x62",c:"x63",d:"x64",e:"x65",f:"x66",n:"x6e",r:"x72",t:"x74",u:"x75",v:"x76",x:"x78"},$t={"\\":"\\","'":"'","\n":"n","\r":"r","\u2028":"u2028","\u2029":"u2029"},Jt=Xt[typeof e]&&e&&!e.nodeType&&e,Qt=Xt[typeof t]&&t&&!t.nodeType&&t,te=Jt&&Qt&&"object"==typeof i&&i&&i.Object&&i,ee=Xt[typeof self]&&self&&self.Object&&self,ne=Xt[typeof window]&&window&&window.Object&&window,re=(Qt&&Qt.exports===Jt&&Jt,te||ne!==(this&&this.window)&&ne||ee||this),ie=C();re._=ie,r=function(){return ie}.call(e,n,e,t),!(r!==I&&(t.exports=r))}).call(this)}).call(e,n(8)(t),function(){return this}())},function(t,e){t.exports=function(t){return t.webpackPolyfill||(t.deprecate=function(){},t.paths=[],t.children=[],t.webpackPolyfill=1),t}},function(t,e,n){"use strict";function r(t,e){var n="normal";return t&&e?n="bolditalics":t?n="bold":e&&(n="italics"),n}function i(t,e){this.fonts={},this.pdfDoc=e,this.fontWrappers={};for(var n in t)if(t.hasOwnProperty(n)){var r=t[n];this.fonts[n]={normal:r.normal,bold:r.bold,italics:r.italics,bolditalics:r.bolditalics}}}var o=n(7),a=n(10);i.prototype.provideFont=function(t,e,n){var i=r(e,n);if(!this.fonts[t]||!this.fonts[t][i])throw new Error("Font '"+t+"' in style '"+i+"' is not defined in the font section of the document definition.");return this.fontWrappers[t]=this.fontWrappers[t]||{},this.fontWrappers[t][i]||(this.fontWrappers[t][i]=new a(this.pdfDoc,this.fonts[t][i],t+"("+i+")")),this.fontWrappers[t][i]},i.prototype.setFontRefsToPdfDoc=function(){var t=this;o.each(t.fontWrappers,function(e){o.each(e,function(e){o.each(e.pdfFonts,function(e){t.pdfDoc.page.fonts[e.id]||(t.pdfDoc.page.fonts[e.id]=e.ref())})})})},t.exports=i},function(t,e,n){"use strict";function r(t,e,n){this.MAX_CHAR_TYPES=92,this.pdfkitDoc=t,this.path=e,this.pdfFonts=[],this.charCatalogue=[],this.name=n,Object.defineProperty(this,"ascender",{get:function(){var t=this.getFont(0);return t.ascender}}),Object.defineProperty(this,"decender",{get:function(){var t=this.getFont(0);return t.decender}})}var i=n(7);r.prototype.getFont=function(t){if(!this.pdfFonts[t]){var e=this.name+t;this.postscriptName&&delete this.pdfkitDoc._fontFamilies[this.postscriptName],this.pdfFonts[t]=this.pdfkitDoc.font(this.path,e)._font,this.postscriptName||(this.postscriptName=this.pdfFonts[t].name)}return this.pdfFonts[t]},r.prototype.widthOfString=function(){var t=this.getFont(0);return t.widthOfString.apply(t,arguments)},r.prototype.lineHeight=function(){var t=this.getFont(0);return t.lineHeight.apply(t,arguments)},r.prototype.ref=function(){var t=this.getFont(0);return t.ref.apply(t,arguments)};var o=function(t){return t.charCodeAt(0)};r.prototype.encode=function(t){var e=this,n=i.chain(t.split("")).map(o).uniq().value();if(n.length>e.MAX_CHAR_TYPES)throw new Error("Inline has more than "+e.MAX_CHAR_TYPES+": "+t+" different character types and therefore cannot be properly embedded into pdf.");var r=function(t){return i.uniq(t.concat(n)).length<=e.MAX_CHAR_TYPES},a=i.findIndex(e.charCatalogue,r);0>a&&(a=e.charCatalogue.length,e.charCatalogue[a]=[]);var s=e.getFont(a);s.use(t),i.each(n,function(t){i.includes(e.charCatalogue[a],t)||e.charCatalogue[a].push(t)});var h=i.map(s.encode(t),function(t){return t.charCodeAt(0).toString(16)}).join("");return{encodedText:h,fontId:s.id}},t.exports=r},function(t,e,n){"use strict";function r(t,e){a.each(e,function(e){t.push(e)})}function i(t,e,n){this.pageSize=t,this.pageMargins=e,this.tracker=new s,this.imageMeasure=n,this.tableLayouts={}}function o(t){var e=t.x,n=t.y;t.positions=[],a.each(t.canvas,function(t){var e=t.x,n=t.y,r=t.x1,i=t.y1,o=t.x2,a=t.y2;t.resetXY=function(){t.x=e,t.y=n,t.x1=r,t.y1=i,t.x2=o,t.y2=a}}),t.resetXY=function(){t.x=e,t.y=n,a.each(t.canvas,function(t){t.resetXY()})}}var a=n(7),s=n(12),h=n(13),u=n(19),c=n(20),l=n(16),f=n(23),d=n(22),p=n(17).pack,g=n(17).offsetVector,v=n(17).fontStringify,m=n(17).isFunction,y=n(14),_=n(15);i.prototype.registerTableLayouts=function(t){this.tableLayouts=p(this.tableLayouts,t)},i.prototype.layoutDocument=function(t,e,n,r,i,o,s,u,c,l){function f(t,e){return m(l)?(t=a.reject(t,function(t){return a.isEmpty(t.positions)}),a.each(t,function(t){var n=a.pick(t,["id","text","ul","ol","table","image","qr","canvas","columns","headlineLevel","style","pageBreak","pageOrientation","width","height"]);n.startPosition=a.first(t.positions),n.pageNumbers=a.chain(t.positions).map("pageNumber").uniq().value(),n.pages=e.length,n.stack=a.isArray(t.stack),t.nodeInfo=n}),a.any(t,function(t,e,n){if("before"!==t.pageBreak&&!t.pageBreakCalculated){t.pageBreakCalculated=!0;var r=a.first(t.nodeInfo.pageNumbers),i=a.chain(n).drop(e+1).filter(function(t){return a.contains(t.nodeInfo.pageNumbers,r)}).value(),o=a.chain(n).drop(e+1).filter(function(t){return a.contains(t.nodeInfo.pageNumbers,r+1)}).value(),s=a.chain(n).take(e).filter(function(t){return a.contains(t.nodeInfo.pageNumbers,r)}).value();if(l(t.nodeInfo,a.map(i,"nodeInfo"),a.map(o,"nodeInfo"),a.map(s,"nodeInfo")))return t.pageBreak="before",!0}})):!1}function d(t){a.each(t.linearNodeList,function(t){t.resetXY()})}this.docMeasure=new h(e,n,r,this.imageMeasure,this.tableLayouts,u);for(var p=this.tryLayoutDocument(t,e,n,r,i,o,s,u,c);f(p.linearNodeList,p.pages);)d(p),p=this.tryLayoutDocument(t,e,n,r,i,o,s,u,c);return p.pages},i.prototype.tryLayoutDocument=function(t,e,n,r,i,o,a,s,h,l){this.linearNodeList=[],t=this.docMeasure.measureDocument(t),this.writer=new c(new u(this.pageSize,this.pageMargins),this.tracker);var f=this;return this.writer.context().tracker.startTracking("pageAdded",function(){f.addBackground(i)}),this.addBackground(i),this.processNode(t),this.addHeadersAndFooters(o,a),null!=h&&this.addWatermark(h,e),{pages:this.writer.context().pages,linearNodeList:this.linearNodeList}},i.prototype.addBackground=function(t){var e=m(t)?t:function(){return t},n=e(this.writer.context().page+1);if(n){var r=this.writer.context().getCurrentPage().pageSize;this.writer.beginUnbreakableBlock(r.width,r.height),this.processNode(this.docMeasure.measureDocument(n)),this.writer.commitUnbreakableBlock(0,0)}},i.prototype.addStaticRepeatable=function(t,e){this.addDynamicRepeatable(function(){return t},e)},i.prototype.addDynamicRepeatable=function(t,e){for(var n=this.writer.context().pages,r=0,i=n.length;i>r;r++){this.writer.context().page=r;var o=t(r+1,i);if(o){var a=e(this.writer.context().getCurrentPage().pageSize,this.pageMargins);this.writer.beginUnbreakableBlock(a.width,a.height),this.processNode(this.docMeasure.measureDocument(o)),this.writer.commitUnbreakableBlock(a.x,a.y)}}},i.prototype.addHeadersAndFooters=function(t,e){var n=function(t,e){return{x:0,y:0,width:t.width,height:e.top}},r=function(t,e){return{x:0,y:t.height-e.bottom,width:t.width,height:e.bottom}};m(t)?this.addDynamicRepeatable(t,n):t&&this.addStaticRepeatable(t,n),m(e)?this.addDynamicRepeatable(e,r):e&&this.addStaticRepeatable(e,r)},i.prototype.addWatermark=function(t,e){function n(t,e,n){for(var r,i=t.width,o=t.height,a=.8*Math.sqrt(i*i+o*o),s=new y(n),h=new _,u=0,c=1e3,l=(u+c)/2;Math.abs(u-c)>1;)h.push({fontSize:l}),r=s.sizeOfString(e,h),r.width>a?(c=l,l=(u+c)/2):r.width<a&&(u=l,l=(u+c)/2),h.pop();return{size:r,fontSize:l}}for(var r=Object.getOwnPropertyNames(e.fonts)[0],i={text:t,font:e.provideFont(e[r],!1,!1),size:n(this.pageSize,t,e)},o=this.writer.context().pages,a=0,s=o.length;s>a;a++)o[a].watermark=i},i.prototype.processNode=function(t){function e(e){var r=t._margin;"before"===t.pageBreak&&n.writer.moveToNextPage(t.pageOrientation),r&&(n.writer.context().moveDown(r[1]),n.writer.context().addMargin(r[0],r[2])),e(),r&&(n.writer.context().addMargin(-r[0],-r[2]),n.writer.context().moveDown(r[3])),"after"===t.pageBreak&&n.writer.moveToNextPage(t.pageOrientation)}var n=this;this.linearNodeList.push(t),o(t),e(function(){var e=t.absolutePosition;if(e&&(n.writer.context().beginDetachedBlock(),n.writer.context().moveTo(e.x||0,e.y||0)),t.stack)n.processVerticalContainer(t);else if(t.columns)n.processColumns(t);else if(t.ul)n.processList(!1,t);else if(t.ol)n.processList(!0,t);else if(t.table)n.processTable(t);else if(void 0!==t.text)n.processLeaf(t);else if(t.image)n.processImage(t);else if(t.canvas)n.processCanvas(t);else if(t.qr)n.processQr(t);else if(!t._span)throw"Unrecognized document structure: "+JSON.stringify(t,v);e&&n.writer.context().endDetachedBlock()})},i.prototype.processVerticalContainer=function(t){var e=this;t.stack.forEach(function(n){e.processNode(n),r(t.positions,n.positions)})},i.prototype.processColumns=function(t){function e(t){if(!t)return null;var e=[];e.push(0);for(var r=n.length-1;r>0;r--)e.push(t);return e}var n=t.columns,i=this.writer.context().availableWidth,o=e(t._gap);o&&(i-=(o.length-1)*t._gap),l.buildColumnWidths(n,i);var a=this.processRow(n,n,o);r(t.positions,a.positions)},i.prototype.processRow=function(t,e,n,i,o){function a(t){for(var e,n=0,r=c.length;r>n;n++){var i=c[n];if(i.prevPage===t.prevPage){e=i;break}}e||(e=t,c.push(e)),e.prevY=Math.max(e.prevY,t.prevY),e.y=Math.min(e.y,t.y)}function s(t){return n&&n.length>t?n[t]:0}function h(t,e){if(t.rowSpan&&t.rowSpan>1){var n=o+t.rowSpan-1;if(n>=i.length)throw"Row span for column "+e+" (with indexes starting from 0) exceeded row count";return i[n][e]}return null}var u=this,c=[],l=[];return this.tracker.auto("pageChanged",a,function(){e=e||t,u.writer.context().beginColumnGroup();for(var i=0,o=t.length;o>i;i++){var a=t[i],c=e[i]._calcWidth,f=s(i);if(a.colSpan&&a.colSpan>1)for(var d=1;d<a.colSpan;d++)c+=e[++i]._calcWidth+n[i];u.writer.context().beginColumn(c,f,h(a,i)),a._span?a._columnEndingContext&&u.writer.context().markEnding(a):(u.processNode(a),r(l,a.positions))}u.writer.context().completeColumnGroup()}),{pageBreaks:c,positions:l}},i.prototype.processList=function(t,e){function n(t){if(s){var e=s;if(s=null,e.canvas){var n=e.canvas[0];g(n,-e._minWidth,0),i.writer.addVector(n)}else{var r=new d(i.pageSize.width);r.addInline(e._inlines[0]),r.x=-e._minWidth,r.y=t.getAscenderHeight()-r.getAscenderHeight(),i.writer.addLine(r,!0)}}}var i=this,o=t?e.ol:e.ul,a=e._gapSize;this.writer.context().addMargin(a.width);var s;this.tracker.auto("lineAdded",n,function(){o.forEach(function(t){s=t.listMarker,i.processNode(t),r(e.positions,t.positions)})}),this.writer.context().addMargin(-a.width)},i.prototype.processTable=function(t){var e=new f(t);e.beginTable(this.writer);for(var n=0,i=t.table.body.length;i>n;n++){e.beginRow(n,this.writer);var o=this.processRow(t.table.body[n],t.table.widths,t._offsets.offsets,t.table.body,n);r(t.positions,o.positions),e.endRow(n,this.writer,o.pageBreaks)}e.endTable(this.writer)},i.prototype.processLeaf=function(t){for(var e=this.buildNextLine(t),n=e?e.getHeight():0,r=t.maxHeight||-1;e&&(-1===r||r>n);){var i=this.writer.addLine(e);t.positions.push(i),e=this.buildNextLine(t),e&&(n+=e.getHeight())}},i.prototype.buildNextLine=function(t){if(!t._inlines||0===t._inlines.length)return null;for(var e=new d(this.writer.context().availableWidth);t._inlines&&t._inlines.length>0&&e.hasEnoughSpaceForInline(t._inlines[0]);)e.addInline(t._inlines.shift());return e.lastLineInParagraph=0===t._inlines.length,e},i.prototype.processImage=function(t){var e=this.writer.addImage(t);t.positions.push(e)},i.prototype.processCanvas=function(t){var e=t._minHeight;this.writer.context().availableHeight<e&&this.writer.moveToNextPage(),t.canvas.forEach(function(e){var n=this.writer.addVector(e);t.positions.push(n)},this),this.writer.context().moveDown(e)},i.prototype.processQr=function(t){var e=this.writer.addQr(t);t.positions.push(e)},t.exports=i},function(t,e){"use strict";function n(){this.events={}}n.prototype.startTracking=function(t,e){var n=this.events[t]||(this.events[t]=[]);n.indexOf(e)<0&&n.push(e)},n.prototype.stopTracking=function(t,e){var n=this.events[t];if(n){var r=n.indexOf(e);r>=0&&n.splice(r,1)}},n.prototype.emit=function(t){var e=Array.prototype.slice.call(arguments,1),n=this.events[t];n&&n.forEach(function(t){t.apply(this,e)})},n.prototype.auto=function(t,e,n){this.startTracking(t,e),n(),this.stopTracking(t,e)},t.exports=n},function(t,e,n){"use strict";function r(t,e,n,r,a,s){this.textTools=new i(t),this.styleStack=new o(e,n),this.imageMeasure=r,this.tableLayouts=a,this.images=s,this.autoImageIndex=1}var i=n(14),o=n(15),a=n(16),s=n(17).fontStringify,h=n(17).pack,u=n(18);r.prototype.measureDocument=function(t){return this.measureNode(t)},r.prototype.measureNode=function(t){function e(t){var e=t._margin;return e&&(t._minWidth+=e[0]+e[2],t._maxWidth+=e[0]+e[2]),t}function n(){function e(t,e){return t.marginLeft||t.marginTop||t.marginRight||t.marginBottom?[t.marginLeft||e[0]||0,t.marginTop||e[1]||0,t.marginRight||e[2]||0,t.marginBottom||e[3]||0]:e}function n(t){for(var e={},n=t.length-1;n>=0;n--){var i=t[n],o=r.styleStack.styleDictionary[i];for(var a in o)o.hasOwnProperty(a)&&(e[a]=o[a])}return e}function i(t){return"number"==typeof t||t instanceof Number?t=[t,t,t,t]:t instanceof Array&&2===t.length&&(t=[t[0],t[1],t[0],t[1]]),t}var o=[void 0,void 0,void 0,void 0];if(t.style){var a=t.style instanceof Array?t.style:[t.style],s=n(a);s&&(o=e(s,o)),s.margin&&(o=i(s.margin))}return o=e(t,o),t.margin&&(o=i(t.margin)),void 0===o[0]&&void 0===o[1]&&void 0===o[2]&&void 0===o[3]?null:o}t instanceof Array?t={stack:t}:("string"==typeof t||t instanceof String)&&(t={text:t}),0===Object.keys(t).length&&(t={text:""});var r=this;return this.styleStack.auto(t,function(){if(t._margin=n(t),t.columns)return e(r.measureColumns(t));if(t.stack)return e(r.measureVerticalContainer(t));if(t.ul)return e(r.measureList(!1,t));if(t.ol)return e(r.measureList(!0,t));if(t.table)return e(r.measureTable(t));if(void 0!==t.text)return e(r.measureLeaf(t));if(t.image)return e(r.measureImage(t));if(t.canvas)return e(r.measureCanvas(t));if(t.qr)return e(r.measureQr(t));throw"Unrecognized document structure: "+JSON.stringify(t,s)})},r.prototype.convertIfBase64Image=function(t){if(/^data:image\/(jpeg|jpg|png);base64,/.test(t.image)){var e="$$pdfmake$$"+this.autoImageIndex++;this.images[e]=t.image,t.image=e}},r.prototype.measureImage=function(t){this.images&&this.convertIfBase64Image(t);var e=this.imageMeasure.measureImage(t.image);if(t.fit){var n=e.width/e.height>t.fit[0]/t.fit[1]?t.fit[0]/e.width:t.fit[1]/e.height;t._width=t._minWidth=t._maxWidth=e.width*n,t._height=e.height*n}else t._width=t._minWidth=t._maxWidth=t.width||e.width,t._height=t.height||e.height*t._width/e.width;return t._alignment=this.styleStack.getProperty("alignment"),t},r.prototype.measureLeaf=function(t){var e=this.styleStack.clone();e.push(t);var n=this.textTools.buildInlines(t.text,e);return t._inlines=n.items,t._minWidth=n.minWidth,t._maxWidth=n.maxWidth,t},r.prototype.measureVerticalContainer=function(t){var e=t.stack;t._minWidth=0,t._maxWidth=0;for(var n=0,r=e.length;r>n;n++)e[n]=this.measureNode(e[n]),t._minWidth=Math.max(t._minWidth,e[n]._minWidth),t._maxWidth=Math.max(t._maxWidth,e[n]._maxWidth);return t},r.prototype.gapSizeForList=function(t,e){if(t){var n=e.length.toString().replace(/./g,"9");return this.textTools.sizeOfString(n+". ",this.styleStack)}return this.textTools.sizeOfString("9. ",this.styleStack)},r.prototype.buildMarker=function(t,e,n,r){var i;if(t)i={_inlines:this.textTools.buildInlines(e,n).items};else{var o=r.fontSize/6;i={canvas:[{x:o,y:r.height/r.lineHeight+r.decender-r.fontSize/3,r1:o,r2:o,type:"ellipse",color:"black"}]}}return i._minWidth=i._maxWidth=r.width,i._minHeight=i._maxHeight=r.height,i},r.prototype.measureList=function(t,e){var n=this.styleStack.clone(),r=t?e.ol:e.ul;e._gapSize=this.gapSizeForList(t,r),e._minWidth=0,e._maxWidth=0;for(var i=1,o=0,a=r.length;a>o;o++){var s=r[o]=this.measureNode(r[o]),h=i++ +". ";s.ol||s.ul||(s.listMarker=this.buildMarker(t,s.counter||h,n,e._gapSize)),e._minWidth=Math.max(e._minWidth,r[o]._minWidth+e._gapSize.width),e._maxWidth=Math.max(e._maxWidth,r[o]._maxWidth+e._gapSize.width)}return e},r.prototype.measureColumns=function(t){var e=t.columns;t._gap=this.styleStack.getProperty("columnGap")||0;for(var n=0,r=e.length;r>n;n++)e[n]=this.measureNode(e[n]);var i=a.measureMinMax(e);return t._minWidth=i.min+t._gap*(e.length-1),t._maxWidth=i.max+t._gap*(e.length-1),t},r.prototype.measureTable=function(t){function e(t,e){return function(){return null!==e&&"object"==typeof e&&(e.fillColor=t.styleStack.getProperty("fillColor")),t.measureNode(e)}}function n(e){var n=t.layout;("string"==typeof t.layout||t instanceof String)&&(n=e[n]);var r={hLineWidth:function(t,e){return 1},vLineWidth:function(t,e){return 1},hLineColor:function(t,e){return"black"},vLineColor:function(t,e){return"black"},paddingLeft:function(t,e){return 4},paddingRight:function(t,e){return 4},paddingTop:function(t,e){return 2},paddingBottom:function(t,e){return 2}};return h(r,n)}function r(e){for(var n=[],r=0,i=0,o=0,a=t.table.widths.length;a>o;o++){var s=i+e.vLineWidth(o,t)+e.paddingLeft(o,t);n.push(s),r+=s,i=e.paddingRight(o,t)}return r+=i+e.vLineWidth(t.table.widths.length,t),{total:r,offsets:n}}function i(){for(var e,n,r=0,i=g.length;i>r;r++){var a=g[r],s=o(a.col,a.span,t._offsets),h=a.minWidth-s.minWidth,u=a.maxWidth-s.maxWidth;if(h>0)for(e=h/a.span,n=0;n<a.span;n++)t.table.widths[a.col+n]._minWidth+=e;if(u>0)for(e=u/a.span,n=0;n<a.span;n++)t.table.widths[a.col+n]._maxWidth+=e}}function o(e,n,r){for(var i={minWidth:0,maxWidth:0},o=0;n>o;o++)i.minWidth+=t.table.widths[e+o]._minWidth+(o?r.offsets[e+o]:0),i.maxWidth+=t.table.widths[e+o]._maxWidth+(o?r.offsets[e+o]:0);return i}function s(t,e,n){for(var r=1;n>r;r++)t[e+r]={_span:!0,_minWidth:0,_maxWidth:0,rowSpan:t[e].rowSpan}}function u(t,e,n,r){for(var i=1;r>i;i++)t.body[e+i][n]={_span:!0,_minWidth:0,_maxWidth:0,fillColor:t.body[e][n].fillColor}}function c(t){if(t.table.widths||(t.table.widths="auto"),"string"==typeof t.table.widths||t.table.widths instanceof String)for(t.table.widths=[t.table.widths];t.table.widths.length<t.table.body[0].length;)t.table.widths.push(t.table.widths[t.table.widths.length-1]);for(var e=0,n=t.table.widths.length;n>e;e++){var r=t.table.widths[e];("number"==typeof r||r instanceof Number||"string"==typeof r||r instanceof String)&&(t.table.widths[e]={width:r})}}c(t),t._layout=n(this.tableLayouts),t._offsets=r(t._layout);var l,f,d,p,g=[];for(l=0,d=t.table.body[0].length;d>l;l++){var v=t.table.widths[l];for(v._minWidth=0,v._maxWidth=0,f=0,p=t.table.body.length;p>f;f++){var m=t.table.body[f],y=m[l];if(!y._span){y=m[l]=this.styleStack.auto(y,e(this,y)),y.colSpan&&y.colSpan>1?(s(m,l,y.colSpan),g.push({col:l,span:y.colSpan,minWidth:y._minWidth,maxWidth:y._maxWidth})):(v._minWidth=Math.max(v._minWidth,y._minWidth),v._maxWidth=Math.max(v._maxWidth,y._maxWidth))}y.rowSpan&&y.rowSpan>1&&u(t.table,f,l,y.rowSpan)}}i();var _=a.measureMinMax(t.table.widths);return t._minWidth=_.min+t._offsets.total,t._maxWidth=_.max+t._offsets.total,t},r.prototype.measureCanvas=function(t){for(var e=0,n=0,r=0,i=t.canvas.length;i>r;r++){var o=t.canvas[r];switch(o.type){case"ellipse":e=Math.max(e,o.x+o.r1),n=Math.max(n,o.y+o.r2);break;case"rect":e=Math.max(e,o.x+o.w),n=Math.max(n,o.y+o.h);break;case"line":e=Math.max(e,o.x1,o.x2),n=Math.max(n,o.y1,o.y2);break;case"polyline":for(var a=0,s=o.points.length;s>a;a++)e=Math.max(e,o.points[a].x),n=Math.max(n,o.points[a].y)}}return t._minWidth=t._maxWidth=e,t._minHeight=t._maxHeight=n,t},r.prototype.measureQr=function(t){return t=u.measure(t),t._alignment=this.styleStack.getProperty("alignment"),t},t.exports=r},function(t,e){"use strict";function n(t){this.fontProvider=t}function r(t,e){var n=[];t=t.replace("	","    ");var r;r=e?[t,""]:t.match(u);for(var i=0,o=r.length;o-1>i;i++){var a=r[i],s=0===a.length;if(s){var h=0===n.length||n[n.length-1].lineEnd;h?n.push({text:"",lineEnd:!0}):n[n.length-1].lineEnd=!0}else n.push({text:a})}return n}function i(t,e){e=e||{},t=t||{};for(var n in t)"text"!=n&&t.hasOwnProperty(n)&&(e[n]=t[n]);return e}function o(t){var e=[];("string"==typeof t||t instanceof String)&&(t=[t]);for(var n=0,o=t.length;o>n;n++){var a,s=t[n],h=null;"string"==typeof s||s instanceof String?a=r(s):(a=r(s.text,s.noWrap),h=i(s));for(var u=0,c=a.length;c>u;u++){var l={text:a[u].text};a[u].lineEnd&&(l.lineEnd=!0),i(h,l),e.push(l)}}return e}function a(t){return t.replace(/[^A-Za-z0-9\[\] ]/g,function(t){return f[t]||t})}function s(t,e,n,r){var i;return void 0!==t[n]&&null!==t[n]?t[n]:e?(e.auto(t,function(){i=e.getProperty(n)}),null!==i&&void 0!==i?i:r):r}function h(t,e,n){var r=o(e);return r.forEach(function(e){var r=s(e,n,"font","Roboto"),i=s(e,n,"fontSize",12),o=s(e,n,"bold",!1),h=s(e,n,"italics",!1),u=s(e,n,"color","black"),f=s(e,n,"decoration",null),d=s(e,n,"decorationColor",null),p=s(e,n,"decorationStyle",null),g=s(e,n,"background",null),v=s(e,n,"lineHeight",1),m=t.provideFont(r,o,h);e.width=m.widthOfString(a(e.text),i),e.height=m.lineHeight(i)*v;var y=e.text.match(c),_=e.text.match(l);y?e.leadingCut=m.widthOfString(y[0],i):e.leadingCut=0,_?e.trailingCut=m.widthOfString(_[0],i):e.trailingCut=0,e.alignment=s(e,n,"alignment","left"),e.font=m,e.fontSize=i,e.color=u,e.decoration=f,e.decorationColor=d,e.decorationStyle=p,e.background=g}),r}var u=/([^ ,\/!.?:;\-\n]*[ ,\/!.?:;\-]*)|\n/g,c=/^(\s)+/g,l=/(\s)+$/g;n.prototype.buildInlines=function(t,e){function n(t){return Math.max(0,t.width-t.leadingCut-t.trailingCut)}var r,i=h(this.fontProvider,t,e),o=0,a=0;return i.forEach(function(t){o=Math.max(o,t.width-t.leadingCut-t.trailingCut),r||(r={width:0,leadingCut:t.leadingCut,trailingCut:0}),r.width+=t.width,r.trailingCut=t.trailingCut,a=Math.max(a,n(r)),t.lineEnd&&(r=null)}),s({},e,"noWrap",!1)&&(o=a),{items:i,minWidth:o,maxWidth:a}},n.prototype.sizeOfString=function(t,e){t=t.replace("	","    ");var n=s({},e,"font","Roboto"),r=s({},e,"fontSize",12),i=s({},e,"bold",!1),o=s({},e,"italics",!1),h=s({},e,"lineHeight",1),u=this.fontProvider.provideFont(n,i,o);return{width:u.widthOfString(a(t),r),height:u.lineHeight(r)*h,fontSize:r,lineHeight:h,ascender:u.ascender/1e3*r,decender:u.decender/1e3*r}};var f={"Ą":"A","Ć":"C","Ę":"E","Ł":"L","Ń":"N","Ó":"O","Ś":"S","Ź":"Z","Ż":"Z","ą":"a","ć":"c","ę":"e","ł":"l","ń":"n","ó":"o","ś":"s","ź":"z","ż":"z"};t.exports=n},function(t,e){"use strict";function n(t,e){this.defaultStyle=e||{},this.styleDictionary=t,this.styleOverrides=[]}n.prototype.clone=function(){var t=new n(this.styleDictionary,this.defaultStyle);return this.styleOverrides.forEach(function(e){t.styleOverrides.push(e)}),t},n.prototype.push=function(t){this.styleOverrides.push(t)},n.prototype.pop=function(t){for(t=t||1;t-->0;)this.styleOverrides.pop()},n.prototype.autopush=function(t){if("string"==typeof t||t instanceof String)return 0;var e=[];t.style&&(e=t.style instanceof Array?t.style:[t.style]);for(var n=0,r=e.length;r>n;n++)this.push(e[n]);var i={},o=!1;return["font","fontSize","bold","italics","alignment","color","columnGap","fillColor","decoration","decorationStyle","decorationColor","background","lineHeight","noWrap"].forEach(function(e){void 0!==t[e]&&null!==t[e]&&(i[e]=t[e],o=!0)}),o&&this.push(i),e.length+(o?1:0)},n.prototype.auto=function(t,e){var n=this.autopush(t),r=e();return n>0&&this.pop(n),r},n.prototype.getProperty=function(t){if(this.styleOverrides)for(var e=this.styleOverrides.length-1;e>=0;e--){var n=this.styleOverrides[e];if("string"==typeof n||n instanceof String){var r=this.styleDictionary[n];if(r&&null!==r[t]&&void 0!==r[t])return r[t]}else if(void 0!==n[t]&&null!==n[t])return n[t]}return this.defaultStyle&&this.defaultStyle[t]},t.exports=n},function(t,e){"use strict";function n(t,e){var n=[],o=0,a=0,s=[],h=0,u=0,c=[],l=e;t.forEach(function(t){r(t)?(n.push(t),o+=t._minWidth,a+=t._maxWidth):i(t)?(s.push(t),h=Math.max(h,t._minWidth),u=Math.max(u,t._maxWidth)):c.push(t)}),c.forEach(function(t){"string"==typeof t.width&&/\d+%/.test(t.width)&&(t.width=parseFloat(t.width)*l/100),t.width<t._minWidth&&t.elasticWidth?t._calcWidth=t._minWidth:t._calcWidth=t.width,e-=t._calcWidth});var f=o+h*s.length,d=a+u*s.length;if(f>=e)n.forEach(function(t){t._calcWidth=t._minWidth}),s.forEach(function(t){t._calcWidth=h});else{if(e>d)n.forEach(function(t){t._calcWidth=t._maxWidth,e-=t._calcWidth});else{var p=e-f,g=d-f;n.forEach(function(t){var n=t._maxWidth-t._minWidth;t._calcWidth=t._minWidth+n*p/g,e-=t._calcWidth})}if(s.length>0){var v=e/s.length;s.forEach(function(t){t._calcWidth=v})}}}function r(t){return"auto"===t.width}function i(t){return null===t.width||void 0===t.width||"*"===t.width||"star"===t.width}function o(t){for(var e={min:0,max:0},n={min:0,max:0},o=0,a=0,s=t.length;s>a;a++){var h=t[a];i(h)?(n.min=Math.max(n.min,h._minWidth),n.max=Math.max(n.max,h._maxWidth),o++):r(h)?(e.min+=h._minWidth,e.max+=h._maxWidth):(e.min+=void 0!==h.width&&h.width||h._minWidth,e.max+=void 0!==h.width&&h.width||h._maxWidth)}return o&&(e.min+=o*n.min,e.max+=o*n.max),e}t.exports={buildColumnWidths:n,measureMinMax:o,isAutoColumn:r,isStarColumn:i}},function(t,e){"use strict";function n(){for(var t={},e=0,n=arguments.length;n>e;e++){var r=arguments[e];if(r)for(var i in r)r.hasOwnProperty(i)&&(t[i]=r[i])}return t}function r(t,e,n){switch(t.type){case"ellipse":case"rect":t.x+=e,t.y+=n;break;case"line":t.x1+=e,t.x2+=e,t.y1+=n,t.y2+=n;break;case"polyline":for(var r=0,i=t.points.length;i>r;r++)t.points[r].x+=e,t.points[r].y+=n}}function i(t,e){return"font"===t?"font":e}function o(t){var e={};return t&&"[object Function]"===e.toString.call(t)}t.exports={pack:n,fontStringify:i,offsetVector:r,isFunction:o}},function(t,e){"use strict";function n(t,e){var n={numeric:s,alphanumeric:h,octet:u},r={L:p,M:g,Q:v,H:m};e=e||{};var i=e.version||-1,o=r[(e.eccLevel||"L").toUpperCase()],a=e.mode?n[e.mode.toLowerCase()]:-1,c="mask"in e?e.mask:-1;if(0>a)a="string"==typeof t?t.match(l)?s:t.match(d)?h:u:u;else if(a!=s&&a!=h&&a!=u)throw"invalid or unsupported mode";if(t=U(a,t),null===t)throw"invalid data format";if(0>o||o>3)throw"invalid ECC level";if(0>i){for(i=1;40>=i&&!(t.length<=D(i,a,o));++i);if(i>40)throw"too large data for the Qr format"}else if(1>i||i>40)throw"invalid Qr version! should be between 1 and 40";if(-1!=c&&(0>c||c>8))throw"invalid mask";return Y(t,i,a,o,c)}function r(t,e){var r=[],i=t.background||"#fff",o=t.foreground||"#000",a=n(t,e),s=a.length,h=Math.floor(e.fit?e.fit/s:5),u=s*h;r.push({type:"rect",x:0,y:0,w:u,h:u,lineWidth:0,color:i});for(var c=0;s>c;++c)for(var l=0;s>l;++l)a[c][l]&&r.push({type:"rect",x:h*c,y:h*l,w:h,h:h,lineWidth:0,color:o});return{canvas:r,size:u}}function i(t){var e=r(t.qr,t);return t._canvas=e.canvas,t._width=t._height=t._minWidth=t._maxWidth=t._minHeight=t._maxHeight=e.size,t}for(var o=[null,[[10,7,17,13],[1,1,1,1],[]],[[16,10,28,22],[1,1,1,1],[4,16]],[[26,15,22,18],[1,1,2,2],[4,20]],[[18,20,16,26],[2,1,4,2],[4,24]],[[24,26,22,18],[2,1,4,4],[4,28]],[[16,18,28,24],[4,2,4,4],[4,32]],[[18,20,26,18],[4,2,5,6],[4,20,36]],[[22,24,26,22],[4,2,6,6],[4,22,40]],[[22,30,24,20],[5,2,8,8],[4,24,44]],[[26,18,28,24],[5,4,8,8],[4,26,48]],[[30,20,24,28],[5,4,11,8],[4,28,52]],[[22,24,28,26],[8,4,11,10],[4,30,56]],[[22,26,22,24],[9,4,16,12],[4,32,60]],[[24,30,24,20],[9,4,16,16],[4,24,44,64]],[[24,22,24,30],[10,6,18,12],[4,24,46,68]],[[28,24,30,24],[10,6,16,17],[4,24,48,72]],[[28,28,28,28],[11,6,19,16],[4,28,52,76]],[[26,30,28,28],[13,6,21,18],[4,28,54,80]],[[26,28,26,26],[14,7,25,21],[4,28,56,84]],[[26,28,28,30],[16,8,25,20],[4,32,60,88]],[[26,28,30,28],[17,8,25,23],[4,26,48,70,92]],[[28,28,24,30],[17,9,34,23],[4,24,48,72,96]],[[28,30,30,30],[18,9,30,25],[4,28,52,76,100]],[[28,30,30,30],[20,10,32,27],[4,26,52,78,104]],[[28,26,30,30],[21,12,35,29],[4,30,56,82,108]],[[28,28,30,28],[23,12,37,34],[4,28,56,84,112]],[[28,30,30,30],[25,12,40,34],[4,32,60,88,116]],[[28,30,30,30],[26,13,42,35],[4,24,48,72,96,120]],[[28,30,30,30],[28,14,45,38],[4,28,52,76,100,124]],[[28,30,30,30],[29,15,48,40],[4,24,50,76,102,128]],[[28,30,30,30],[31,16,51,43],[4,28,54,80,106,132]],[[28,30,30,30],[33,17,54,45],[4,32,58,84,110,136]],[[28,30,30,30],[35,18,57,48],[4,28,56,84,112,140]],[[28,30,30,30],[37,19,60,51],[4,32,60,88,116,144]],[[28,30,30,30],[38,19,63,53],[4,28,52,76,100,124,148]],[[28,30,30,30],[40,20,66,56],[4,22,48,74,100,126,152]],[[28,30,30,30],[43,21,70,59],[4,26,52,78,104,130,156]],[[28,30,30,30],[45,22,74,62],[4,30,56,82,108,134,160]],[[28,30,30,30],[47,24,77,65],[4,24,52,80,108,136,164]],[[28,30,30,30],[49,25,81,68],[4,28,56,84,112,140,168]]],a=0,s=1,h=2,u=4,c=8,l=/^\d*$/,f=/^[A-Za-z0-9 $%*+\-./:]*$/,d=/^[A-Z0-9 $%*+\-./:]*$/,p=1,g=0,v=3,m=2,y=[],_=[-1],w=0,b=1;255>w;++w)y.push(b),
_[b]=w,b=2*b^(b>=128?285:0);for(var x=[[]],w=0;30>w;++w){for(var S=x[w],k=[],E=0;w>=E;++E){var C=w>E?y[S[E]]:0,I=y[(w+(S[E-1]||0))%255];k.push(_[C^I])}x.push(k)}for(var A={},w=0;45>w;++w)A["0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ $%*+-./:".charAt(w)]=w;var L=[function(t,e){return(t+e)%2===0},function(t,e){return t%2===0},function(t,e){return e%3===0},function(t,e){return(t+e)%3===0},function(t,e){return((t/2|0)+(e/3|0))%2===0},function(t,e){return t*e%2+t*e%3===0},function(t,e){return(t*e%2+t*e%3)%2===0},function(t,e){return((t+e)%2+t*e%3)%2===0}],R=function(t){return t>6},T=function(t){return 4*t+17},B=function(t){var e=o[t],n=16*t*t+128*t+64;return R(t)&&(n-=36),e[2].length&&(n-=25*e[2].length*e[2].length-10*e[2].length-55),n},O=function(t,e){var n=-8&B(t),r=o[t];return n-=8*r[0][e]*r[1][e]},M=function(t,e){switch(e){case s:return 10>t?10:27>t?12:14;case h:return 10>t?9:27>t?11:13;case u:return 10>t?8:16;case c:return 10>t?8:27>t?10:12}},D=function(t,e,n){var r=O(t,n)-4-M(t,e);switch(e){case s:return 3*(r/10|0)+(4>r%10?0:7>r%10?1:2);case h:return 2*(r/11|0)+(6>r%11?0:1);case u:return r/8|0;case c:return r/13|0}},U=function(t,e){switch(t){case s:return e.match(l)?e:null;case h:return e.match(f)?e.toUpperCase():null;case u:if("string"==typeof e){for(var n=[],r=0;r<e.length;++r){var i=e.charCodeAt(r);128>i?n.push(i):2048>i?n.push(192|i>>6,128|63&i):65536>i?n.push(224|i>>12,128|i>>6&63,128|63&i):n.push(240|i>>18,128|i>>12&63,128|i>>6&63,128|63&i)}return n}return e}},P=function(t,e,n,r){var i=[],o=0,c=8,l=n.length,f=function(t,e){if(e>=c){for(i.push(o|t>>(e-=c));e>=8;)i.push(t>>(e-=8)&255);o=0,c=8}e>0&&(o|=(t&(1<<e)-1)<<(c-=e))},d=M(t,e);switch(f(e,4),f(l,d),e){case s:for(var p=2;l>p;p+=3)f(parseInt(n.substring(p-2,p+1),10),10);f(parseInt(n.substring(p-2),10),[0,4,7][l%3]);break;case h:for(var p=1;l>p;p+=2)f(45*A[n.charAt(p-1)]+A[n.charAt(p)],11);l%2==1&&f(A[n.charAt(p-1)],6);break;case u:for(var p=0;l>p;++p)f(n[p],8)}for(f(a,4),8>c&&i.push(o);i.length+1<r;)i.push(236,17);return i.length<r&&i.push(236),i},z=function(t,e){for(var n=t.slice(0),r=t.length,i=e.length,o=0;i>o;++o)n.push(0);for(var o=0;r>o;){var a=_[n[o++]];if(a>=0)for(var s=0;i>s;++s)n[o+s]^=y[(a+e[s])%255]}return n.slice(r)},F=function(t,e,n){for(var r=[],i=t.length/e|0,o=0,a=e-t.length%e,s=0;a>s;++s)r.push(o),o+=i;for(var s=a;e>s;++s)r.push(o),o+=i+1;r.push(o);for(var h=[],s=0;e>s;++s)h.push(z(t.slice(r[s],r[s+1]),n));for(var u=[],c=t.length/e|0,s=0;c>s;++s)for(var l=0;e>l;++l)u.push(t[r[l]+s]);for(var l=a;e>l;++l)u.push(t[r[l+1]-1]);for(var s=0;s<n.length;++s)for(var l=0;e>l;++l)u.push(h[l][s]);return u},W=function(t,e,n,r){for(var i=t<<r,o=e-1;o>=0;--o)i>>r+o&1&&(i^=n<<o);return t<<r|i},N=function(t){for(var e=o[t],n=T(t),r=[],i=[],a=0;n>a;++a)r.push([]),i.push([]);var s=function(t,e,n,o,a){for(var s=0;n>s;++s)for(var h=0;o>h;++h)r[t+s][e+h]=a[s]>>h&1,i[t+s][e+h]=1};s(0,0,9,9,[127,65,93,93,93,65,383,0,64]),s(n-8,0,8,9,[256,127,65,93,93,93,65,127]),s(0,n-8,9,8,[254,130,186,186,186,130,254,0,0]);for(var a=9;n-8>a;++a)r[6][a]=r[a][6]=1&~a,i[6][a]=i[a][6]=1;for(var h=e[2],u=h.length,a=0;u>a;++a)for(var c=0===a||a===u-1?1:0,l=0===a?u-1:u,f=c;l>f;++f)s(h[a],h[f],5,5,[31,17,21,17,31]);if(R(t))for(var d=W(t,6,7973,12),p=0,a=0;6>a;++a)for(var f=0;3>f;++f)r[a][n-11+f]=r[n-11+f][a]=d>>p++&1,i[a][n-11+f]=i[n-11+f][a]=1;return{matrix:r,reserved:i}},j=function(t,e,n){for(var r=t.length,i=0,o=-1,a=r-1;a>=0;a-=2){6==a&&--a;for(var s=0>o?r-1:0,h=0;r>h;++h){for(var u=a;u>a-2;--u)e[s][u]||(t[s][u]=n[i>>3]>>(7&~i)&1,++i);s+=o}o=-o}return t},H=function(t,e,n){for(var r=L[n],i=t.length,o=0;i>o;++o)for(var a=0;i>a;++a)e[o][a]||(t[o][a]^=r(o,a));return t},Z=function(t,e,n,r){for(var i=t.length,o=21522^W(n<<3|r,5,1335,10),a=0;15>a;++a){var s=[0,1,2,3,4,5,7,8,i-7,i-6,i-5,i-4,i-3,i-2,i-1][a],h=[i-1,i-2,i-3,i-4,i-5,i-6,i-7,i-8,7,5,4,3,2,1,0][a];t[s][8]=t[8][h]=o>>a&1}return t},G=function(t){for(var e=3,n=3,r=40,i=10,o=function(t){for(var n=0,i=0;i<t.length;++i)t[i]>=5&&(n+=e+(t[i]-5));for(var i=5;i<t.length;i+=2){var o=t[i];t[i-1]==o&&t[i-2]==3*o&&t[i-3]==o&&t[i-4]==o&&(t[i-5]>=4*o||t[i+1]>=4*o)&&(n+=r)}return n},a=t.length,s=0,h=0,u=0;a>u;++u){var c,l=t[u];c=[0];for(var f=0;a>f;){var d;for(d=0;a>f&&l[f];++d)++f;for(c.push(d),d=0;a>f&&!l[f];++d)++f;c.push(d)}s+=o(c),c=[0];for(var f=0;a>f;){var d;for(d=0;a>f&&t[f][u];++d)++f;for(c.push(d),d=0;a>f&&!t[f][u];++d)++f;c.push(d)}s+=o(c);var p=t[u+1]||[];h+=l[0];for(var f=1;a>f;++f){var g=l[f];h+=g,l[f-1]==g&&p[f]===g&&p[f-1]===g&&(s+=n)}}return s+=i*(Math.abs(h/a/a-.5)/.05|0)},Y=function(t,e,n,r,i){var a=o[e],s=P(e,n,t,O(e,r)>>3);s=F(s,a[1][r],x[a[0][r]]);var h=N(e),u=h.matrix,c=h.reserved;if(j(u,c,s),0>i){H(u,c,0),Z(u,c,r,0);var l=0,f=G(u);for(H(u,c,0),i=1;8>i;++i){H(u,c,i),Z(u,c,r,i);var d=G(u);f>d&&(f=d,l=i),H(u,c,i)}i=l}return H(u,c,i),Z(u,c,r,i),u};t.exports={measure:i}},function(t,e,n){"use strict";function r(t,e){this.pages=[],this.pageMargins=e,this.x=e.left,this.availableWidth=t.width-e.left-e.right,this.availableHeight=0,this.page=-1,this.snapshots=[],this.endingCell=null,this.tracker=new a,this.addPage(t)}function i(t,e){return void 0===t?e:"landscape"===t?"landscape":"portrait"}function o(t,e){var n;return n=t.page>e.page?t:e.page>t.page?e:t.y>e.y?t:e,{page:n.page,x:n.x,y:n.y,availableHeight:n.availableHeight,availableWidth:n.availableWidth}}var a=n(12);r.prototype.beginColumnGroup=function(){this.snapshots.push({x:this.x,y:this.y,availableHeight:this.availableHeight,availableWidth:this.availableWidth,page:this.page,bottomMost:{y:this.y,page:this.page},endingCell:this.endingCell,lastColumnWidth:this.lastColumnWidth}),this.lastColumnWidth=0},r.prototype.beginColumn=function(t,e,n){var r=this.snapshots[this.snapshots.length-1];this.calculateBottomMost(r),this.endingCell=n,this.page=r.page,this.x=this.x+this.lastColumnWidth+(e||0),this.y=r.y,this.availableWidth=t,this.availableHeight=r.availableHeight,this.lastColumnWidth=t},r.prototype.calculateBottomMost=function(t){this.endingCell?(this.saveContextInEndingCell(this.endingCell),this.endingCell=null):t.bottomMost=o(this,t.bottomMost)},r.prototype.markEnding=function(t){this.page=t._columnEndingContext.page,this.x=t._columnEndingContext.x,this.y=t._columnEndingContext.y,this.availableWidth=t._columnEndingContext.availableWidth,this.availableHeight=t._columnEndingContext.availableHeight,this.lastColumnWidth=t._columnEndingContext.lastColumnWidth},r.prototype.saveContextInEndingCell=function(t){t._columnEndingContext={page:this.page,x:this.x,y:this.y,availableHeight:this.availableHeight,availableWidth:this.availableWidth,lastColumnWidth:this.lastColumnWidth}},r.prototype.completeColumnGroup=function(){var t=this.snapshots.pop();this.calculateBottomMost(t),this.endingCell=null,this.x=t.x,this.y=t.bottomMost.y,this.page=t.bottomMost.page,this.availableWidth=t.availableWidth,this.availableHeight=t.bottomMost.availableHeight,this.lastColumnWidth=t.lastColumnWidth},r.prototype.addMargin=function(t,e){this.x+=t,this.availableWidth-=t+(e||0)},r.prototype.moveDown=function(t){return this.y+=t,this.availableHeight-=t,this.availableHeight>0},r.prototype.initializePage=function(){this.y=this.pageMargins.top,this.availableHeight=this.getCurrentPage().pageSize.height-this.pageMargins.top-this.pageMargins.bottom,this.pageSnapshot().availableWidth=this.getCurrentPage().pageSize.width-this.pageMargins.left-this.pageMargins.right},r.prototype.pageSnapshot=function(){return this.snapshots[0]?this.snapshots[0]:this},r.prototype.moveTo=function(t,e){void 0!==t&&null!==t&&(this.x=t,this.availableWidth=this.getCurrentPage().pageSize.width-this.x-this.pageMargins.right),void 0!==e&&null!==e&&(this.y=e,this.availableHeight=this.getCurrentPage().pageSize.height-this.y-this.pageMargins.bottom)},r.prototype.beginDetachedBlock=function(){this.snapshots.push({x:this.x,y:this.y,availableHeight:this.availableHeight,availableWidth:this.availableWidth,page:this.page,endingCell:this.endingCell,lastColumnWidth:this.lastColumnWidth})},r.prototype.endDetachedBlock=function(){var t=this.snapshots.pop();this.x=t.x,this.y=t.y,this.availableWidth=t.availableWidth,this.availableHeight=t.availableHeight,this.page=t.page,this.endingCell=t.endingCell,this.lastColumnWidth=t.lastColumnWidth};var s=function(t,e){return e=i(e,t.pageSize.orientation),e!==t.pageSize.orientation?{orientation:e,width:t.pageSize.height,height:t.pageSize.width}:{orientation:t.pageSize.orientation,width:t.pageSize.width,height:t.pageSize.height}};r.prototype.moveToNextPage=function(t){var e=this.page+1,n=this.page,r=this.y,i=e>=this.pages.length;return i?this.addPage(s(this.getCurrentPage(),t)):(this.page=e,this.initializePage()),{newPageCreated:i,prevPage:n,prevY:r,y:this.y}},r.prototype.addPage=function(t){var e={items:[],pageSize:t};return this.pages.push(e),this.page=this.pages.length-1,this.initializePage(),this.tracker.emit("pageAdded"),e},r.prototype.getCurrentPage=function(){return this.page<0||this.page>=this.pages.length?null:this.pages[this.page]},r.prototype.getCurrentPosition=function(){var t=this.getCurrentPage().pageSize,e=t.height-this.pageMargins.top-this.pageMargins.bottom,n=t.width-this.pageMargins.left-this.pageMargins.right;return{pageNumber:this.page+1,pageOrientation:t.orientation,pageInnerHeight:e,pageInnerWidth:n,left:this.x,top:this.y,verticalRatio:(this.y-this.pageMargins.top)/e,horizontalRatio:(this.x-this.pageMargins.left)/n}},t.exports=r},function(t,e,n){"use strict";function r(t,e){this.transactionLevel=0,this.repeatables=[],this.tracker=e,this.writer=new o(t,e)}function i(t,e){var n=e(t);return n||(t.moveToNextPage(),n=e(t)),n}var o=n(21);r.prototype.addLine=function(t,e,n){return i(this,function(r){return r.writer.addLine(t,e,n)})},r.prototype.addImage=function(t,e){return i(this,function(n){return n.writer.addImage(t,e)})},r.prototype.addQr=function(t,e){return i(this,function(n){return n.writer.addQr(t,e)})},r.prototype.addVector=function(t,e,n,r){return this.writer.addVector(t,e,n,r)},r.prototype.addFragment=function(t,e,n,r){this.writer.addFragment(t,e,n,r)||(this.moveToNextPage(),this.writer.addFragment(t,e,n,r))},r.prototype.moveToNextPage=function(t){var e=this.writer.context.moveToNextPage(t);e.newPageCreated?this.repeatables.forEach(function(t){this.writer.addFragment(t,!0)},this):this.repeatables.forEach(function(t){this.writer.context.moveDown(t.height)},this),this.writer.tracker.emit("pageChanged",{prevPage:e.prevPage,prevY:e.prevY,y:e.y})},r.prototype.beginUnbreakableBlock=function(t,e){0===this.transactionLevel++&&(this.originalX=this.writer.context.x,this.writer.pushContext(t,e))},r.prototype.commitUnbreakableBlock=function(t,e){if(0===--this.transactionLevel){var n=this.writer.context;this.writer.popContext();var r=n.pages.length;if(r>0){var i=n.pages[0];if(i.xOffset=t,i.yOffset=e,r>1)if(void 0!==t||void 0!==e)i.height=n.getCurrentPage().pageSize.height-n.pageMargins.top-n.pageMargins.bottom;else{i.height=this.writer.context.getCurrentPage().pageSize.height-this.writer.context.pageMargins.top-this.writer.context.pageMargins.bottom;for(var o=0,a=this.repeatables.length;a>o;o++)i.height-=this.repeatables[o].height}else i.height=n.y;void 0!==t||void 0!==e?this.writer.addFragment(i,!0,!0,!0):this.addFragment(i)}}},r.prototype.currentBlockToRepeatable=function(){var t=this.writer.context,e={items:[]};return t.pages[0].items.forEach(function(t){e.items.push(t)}),e.xOffset=this.originalX,e.height=t.y,e},r.prototype.pushToRepeatables=function(t){this.repeatables.push(t)},r.prototype.popFromRepeatables=function(){this.repeatables.pop()},r.prototype.context=function(){return this.writer.context},t.exports=r},function(t,e,n){"use strict";function r(t,e){this.context=t,this.contextStack=[],this.tracker=e}function i(t,e,n){null===n||void 0===n||0>n||n>t.items.length?t.items.push(e):t.items.splice(n,0,e)}function o(t){var e=new a(t.maxWidth);for(var n in t)t.hasOwnProperty(n)&&(e[n]=t[n]);return e}var a=n(22),s=n(17).pack,h=n(17).offsetVector,u=n(19);r.prototype.addLine=function(t,e,n){var r=t.getHeight(),o=this.context,a=o.getCurrentPage(),s=this.getCurrentPositionOnPage();return o.availableHeight<r||!a?!1:(t.x=o.x+(t.x||0),t.y=o.y+(t.y||0),this.alignLine(t),i(a,{type:"line",item:t},n),this.tracker.emit("lineAdded",t),e||o.moveDown(r),s)},r.prototype.alignLine=function(t){var e=this.context.availableWidth,n=t.getWidth(),r=t.inlines&&t.inlines.length>0&&t.inlines[0].alignment,i=0;switch(r){case"right":i=e-n;break;case"center":i=(e-n)/2}if(i&&(t.x=(t.x||0)+i),"justify"===r&&!t.newLineForced&&!t.lastLineInParagraph&&t.inlines.length>1)for(var o=(e-n)/(t.inlines.length-1),a=1,s=t.inlines.length;s>a;a++)i=a*o,t.inlines[a].x+=i},r.prototype.addImage=function(t,e){var n=this.context,r=n.getCurrentPage(),o=this.getCurrentPositionOnPage();return n.availableHeight<t._height||!r?!1:(t.x=n.x+(t.x||0),t.y=n.y,this.alignImage(t),i(r,{type:"image",item:t},e),n.moveDown(t._height),o)},r.prototype.addQr=function(t,e){var n=this.context,r=n.getCurrentPage(),i=this.getCurrentPositionOnPage();if(n.availableHeight<t._height||!r)return!1;t.x=n.x+(t.x||0),t.y=n.y,this.alignImage(t);for(var o=0,a=t._canvas.length;a>o;o++){var s=t._canvas[o];s.x+=t.x,s.y+=t.y,this.addVector(s,!0,!0,e)}return n.moveDown(t._height),i},r.prototype.alignImage=function(t){var e=this.context.availableWidth,n=t._minWidth,r=0;switch(t._alignment){case"right":r=e-n;break;case"center":r=(e-n)/2}r&&(t.x=(t.x||0)+r)},r.prototype.addVector=function(t,e,n,r){var o=this.context,a=o.getCurrentPage(),s=this.getCurrentPositionOnPage();return a?(h(t,e?0:o.x,n?0:o.y),i(a,{type:"vector",item:t},r),s):void 0},r.prototype.addFragment=function(t,e,n,r){var i=this.context,a=i.getCurrentPage();return!e&&t.height>i.availableHeight?!1:(t.items.forEach(function(r){switch(r.type){case"line":var u=o(r.item);u.x=(u.x||0)+(e?t.xOffset||0:i.x),u.y=(u.y||0)+(n?t.yOffset||0:i.y),a.items.push({type:"line",item:u});break;case"vector":var c=s(r.item);h(c,e?t.xOffset||0:i.x,n?t.yOffset||0:i.y),a.items.push({type:"vector",item:c});break;case"image":var l=s(r.item);l.x=(l.x||0)+(e?t.xOffset||0:i.x),l.y=(l.y||0)+(n?t.yOffset||0:i.y),a.items.push({type:"image",item:l})}}),r||i.moveDown(t.height),!0)},r.prototype.pushContext=function(t,e){void 0===t&&(e=this.context.getCurrentPage().height-this.context.pageMargins.top-this.context.pageMargins.bottom,t=this.context.availableWidth),("number"==typeof t||t instanceof Number)&&(t=new u({width:t,height:e},{left:0,right:0,top:0,bottom:0})),this.contextStack.push(this.context),this.context=t},r.prototype.popContext=function(){this.context=this.contextStack.pop()},r.prototype.getCurrentPositionOnPage=function(){return(this.contextStack[0]||this.context).getCurrentPosition()},t.exports=r},function(t,e){"use strict";function n(t){this.maxWidth=t,this.leadingCut=0,this.trailingCut=0,this.inlineWidths=0,this.inlines=[]}n.prototype.getAscenderHeight=function(){var t=0;return this.inlines.forEach(function(e){t=Math.max(t,e.font.ascender/1e3*e.fontSize)}),t},n.prototype.hasEnoughSpaceForInline=function(t){return 0===this.inlines.length?!0:this.newLineForced?!1:this.inlineWidths+t.width-this.leadingCut-(t.trailingCut||0)<=this.maxWidth},n.prototype.addInline=function(t){0===this.inlines.length&&(this.leadingCut=t.leadingCut||0),this.trailingCut=t.trailingCut||0,t.x=this.inlineWidths-this.leadingCut,this.inlines.push(t),this.inlineWidths+=t.width,t.lineEnd&&(this.newLineForced=!0)},n.prototype.getWidth=function(){return this.inlineWidths-this.leadingCut-this.trailingCut},n.prototype.getHeight=function(){var t=0;return this.inlines.forEach(function(e){t=Math.max(t,e.height||0)}),t},t.exports=n},function(t,e,n){"use strict";function r(t){this.tableNode=t}var i=n(16);r.prototype.beginTable=function(t){function e(){var t=0;return r.table.widths.forEach(function(e){t+=e._calcWidth}),t}function n(){var t=[],e=0,n=0;t.push({left:0,rowSpan:0});for(var r=0,i=a.tableNode.table.body[0].length;i>r;r++){var o=a.layout.paddingLeft(r,a.tableNode)+a.layout.paddingRight(r,a.tableNode),s=a.layout.vLineWidth(r,a.tableNode);n=o+s+a.tableNode.table.widths[r]._calcWidth,t[t.length-1].width=n,e+=n,t.push({left:e,rowSpan:0,width:0})}return t}var r,o,a=this;r=this.tableNode,this.offsets=r._offsets,this.layout=r._layout,o=t.context().availableWidth-this.offsets.total,i.buildColumnWidths(r.table.widths,o),this.tableWidth=r._offsets.total+e(),this.rowSpanData=n(),this.cleanUpRepeatables=!1,this.headerRows=r.table.headerRows||0,this.rowsWithoutPageBreak=this.headerRows+(r.table.keepWithHeaderRows||0),this.dontBreakRows=r.table.dontBreakRows||!1,this.rowsWithoutPageBreak&&t.beginUnbreakableBlock(),this.drawHorizontalLine(0,t)},r.prototype.onRowBreak=function(t,e){var n=this;return function(){var t=n.rowPaddingTop+(n.headerRows?0:n.topLineWidth);e.context().moveDown(t)}},r.prototype.beginRow=function(t,e){this.topLineWidth=this.layout.hLineWidth(t,this.tableNode),this.rowPaddingTop=this.layout.paddingTop(t,this.tableNode),this.bottomLineWidth=this.layout.hLineWidth(t+1,this.tableNode),this.rowPaddingBottom=this.layout.paddingBottom(t,this.tableNode),this.rowCallback=this.onRowBreak(t,e),e.tracker.startTracking("pageChanged",this.rowCallback),this.dontBreakRows&&e.beginUnbreakableBlock(),this.rowTopY=e.context().y,this.reservedAtBottom=this.bottomLineWidth+this.rowPaddingBottom,e.context().availableHeight-=this.reservedAtBottom,e.context().moveDown(this.rowPaddingTop)},r.prototype.drawHorizontalLine=function(t,e,n){var r=this.layout.hLineWidth(t,this.tableNode);if(r){for(var i=r/2,o=null,a=0,s=this.rowSpanData.length;s>a;a++){var h=this.rowSpanData[a],u=!h.rowSpan;!o&&u&&(o={left:h.left,width:0}),u&&(o.width+=h.width||0);var c=(n||0)+i;u&&a!==s-1||o&&(e.addVector({type:"line",x1:o.left,x2:o.left+o.width,y1:c,y2:c,lineWidth:r,lineColor:"function"==typeof this.layout.hLineColor?this.layout.hLineColor(t,this.tableNode):this.layout.hLineColor},!1,n),o=null)}e.context().moveDown(r)}},r.prototype.drawVerticalLine=function(t,e,n,r,i){var o=this.layout.vLineWidth(r,this.tableNode);0!==o&&i.addVector({type:"line",x1:t+o/2,x2:t+o/2,y1:e,y2:n,lineWidth:o,lineColor:"function"==typeof this.layout.vLineColor?this.layout.vLineColor(r,this.tableNode):this.layout.vLineColor},!1,!0)},r.prototype.endTable=function(t){this.cleanUpRepeatables&&t.popFromRepeatables()},r.prototype.endRow=function(t,e,n){function r(){for(var e=[],n=0,r=0,i=a.tableNode.table.body[t].length;i>r;r++){if(!n){e.push({x:a.rowSpanData[r].left,index:r});var o=a.tableNode.table.body[t][r];n=o._colSpan||o.colSpan||0}n>0&&n--}return e.push({x:a.rowSpanData[a.rowSpanData.length-1].left,index:a.rowSpanData.length-1}),e}var i,o,a=this;e.tracker.stopTracking("pageChanged",this.rowCallback),e.context().moveDown(this.layout.paddingBottom(t,this.tableNode)),e.context().availableHeight+=this.reservedAtBottom;var s=e.context().page,h=e.context().y,u=r(),c=[],l=n&&n.length>0;if(c.push({y0:this.rowTopY,page:l?n[0].prevPage:s}),l)for(o=0,i=n.length;i>o;o++){var f=n[o];c[c.length-1].y1=f.prevY,c.push({y0:f.y,page:f.prevPage+1})}c[c.length-1].y1=h;for(var d=c[0].y1-c[0].y0===this.rowPaddingTop,p=d?1:0,g=c.length;g>p;p++){var v=p<c.length-1,m=p>0&&!this.headerRows,y=m?0:this.topLineWidth,_=c[p].y0,w=c[p].y1;for(v&&(w+=this.rowPaddingBottom),e.context().page!=c[p].page&&(e.context().page=c[p].page,this.reservedAtBottom=0),o=0,i=u.length;i>o;o++)if(this.drawVerticalLine(u[o].x,_-y,w+this.bottomLineWidth,u[o].index,e),i-1>o){var b=u[o].index,x=this.tableNode.table.body[t][b].fillColor;if(x){var S=this.layout.vLineWidth(b,this.tableNode),k=u[o].x+S,E=_-y;e.addVector({type:"rect",x:k,y:E,w:u[o+1].x-k,h:w+this.bottomLineWidth-E,lineWidth:0,color:x},!1,!0,0)}}v&&this.layout.hLineWhenBroken!==!1&&this.drawHorizontalLine(t+1,e,w),m&&this.layout.hLineWhenBroken!==!1&&this.drawHorizontalLine(t,e,_)}e.context().page=s,e.context().y=h;var C=this.tableNode.table.body[t];for(o=0,i=C.length;i>o;o++){if(C[o].rowSpan&&(this.rowSpanData[o].rowSpan=C[o].rowSpan,C[o].colSpan&&C[o].colSpan>1))for(var I=1;I<C[o].rowSpan;I++)this.tableNode.table.body[t+I][o]._colSpan=C[o].colSpan;this.rowSpanData[o].rowSpan>0&&this.rowSpanData[o].rowSpan--}this.drawHorizontalLine(t+1,e),this.headerRows&&t===this.headerRows-1&&(this.headerRepeatable=e.currentBlockToRepeatable()),this.dontBreakRows&&e.tracker.auto("pageChanged",function(){a.drawHorizontalLine(t,e)},function(){e.commitUnbreakableBlock(),a.drawHorizontalLine(t,e)}),!this.headerRepeatable||t!==this.rowsWithoutPageBreak-1&&t!==this.tableNode.table.body.length-1||(e.commitUnbreakableBlock(),e.pushToRepeatables(this.headerRepeatable),this.cleanUpRepeatables=!0,this.headerRepeatable=null)},t.exports=r},function(t,e,n){(function(e){(function(){var r,i,o,a,s,h,u={}.hasOwnProperty,c=function(t,e){function n(){this.constructor=t}for(var r in e)u.call(e,r)&&(t[r]=e[r]);return n.prototype=e.prototype,t.prototype=new n,t.__super__=e.prototype,t};h=n(25),s=n(44),i=n(45),a=n(46),o=n(64),r=function(t){function r(t){var e,n,i,o;if(this.options=null!=t?t:{},r.__super__.constructor.apply(this,arguments),this.version=1.3,this.compress=null!=(i=this.options.compress)?i:!0,this._pageBuffer=[],this._pageBufferStart=0,this._offsets=[],this._waiting=0,this._ended=!1,this._offset=0,this._root=this.ref({Type:"Catalog",Pages:this.ref({Type:"Pages",Count:0,Kids:[]})}),this.page=null,this.initColor(),this.initVector(),this.initFonts(),this.initText(),this.initImages(),this.info={Producer:"PDFKit",Creator:"PDFKit",CreationDate:new Date},this.options.info){o=this.options.info;for(e in o)n=o[e],this.info[e]=n}this._write("%PDF-"+this.version),this._write("%ÿÿÿÿ"),this.addPage()}var h;return c(r,t),h=function(t){var e,n,i;i=[];for(n in t)e=t[n],i.push(r.prototype[n]=e);return i},h(n(65)),h(n(67)),h(n(69)),h(n(89)),h(n(96)),h(n(101)),r.prototype.addPage=function(t){var e;return null==t&&(t=this.options),this.options.bufferPages||this.flushPages(),this.page=new o(this,t),this._pageBuffer.push(this.page),e=this._root.data.Pages.data,e.Kids.push(this.page.dictionary),e.Count++,this.x=this.page.margins.left,this.y=this.page.margins.top,this._ctm=[1,0,0,1,0,0],this.transform(1,0,0,-1,0,this.page.height),this},r.prototype.bufferedPageRange=function(){return{start:this._pageBufferStart,count:this._pageBuffer.length}},r.prototype.switchToPage=function(t){var e;if(!(e=this._pageBuffer[t-this._pageBufferStart]))throw new Error("switchToPage("+t+") out of bounds, current buffer covers pages "+this._pageBufferStart+" to "+(this._pageBufferStart+this._pageBuffer.length-1));return this.page=e},r.prototype.flushPages=function(){var t,e,n,r;for(e=this._pageBuffer,this._pageBuffer=[],this._pageBufferStart+=e.length,n=0,r=e.length;r>n;n++)t=e[n],t.end()},r.prototype.ref=function(t){var e;return e=new a(this,this._offsets.length+1,t),this._offsets.push(null),this._waiting++,e},r.prototype._read=function(){},r.prototype._write=function(t){return e.isBuffer(t)||(t=new e(t+"\n","binary")),this.push(t),this._offset+=t.length},r.prototype.addContent=function(t){return this.page.write(t),this},r.prototype._refEnd=function(t){return this._offsets[t.id-1]=t.offset,0===--this._waiting&&this._ended?(this._finalize(),this._ended=!1):void 0},r.prototype.write=function(t,e){var n;return n=new Error("PDFDocument#write is deprecated, and will be removed in a future version of PDFKit. Please pipe the document into a Node stream."),this.pipe(s.createWriteStream(t)),this.end(),this.once("end",e)},r.prototype.output=function(t){throw new Error("PDFDocument#output is deprecated, and has been removed from PDFKit. Please pipe the document into a Node stream.")},r.prototype.end=function(){var t,e,n,r,i,o;this.flushPages(),this._info=this.ref(),i=this.info;for(e in i)r=i[e],"string"==typeof r&&(r=new String(r)),this._info.data[e]=r;this._info.end(),o=this._fontFamilies;for(n in o)t=o[n],t.embed();return this._root.end(),this._root.data.Pages.end(),0===this._waiting?this._finalize():this._ended=!0},r.prototype._finalize=function(t){var e,n,r,o,a;for(n=this._offset,this._write("xref"),this._write("0 "+(this._offsets.length+1)),this._write("0000000000 65535 f "),a=this._offsets,r=0,o=a.length;o>r;r++)e=a[r],e=("0000000000"+e).slice(-10),this._write(e+" 00000 n ");return this._write("trailer"),this._write(i.convert({Size:this._offsets.length+1,Root:this._root,Info:this._info})),this._write("startxref"),this._write(""+n),this._write("%%EOF"),this.push(null)},r.prototype.toString=function(){return"[object PDFDocument]"},r}(h.Readable),t.exports=r}).call(this)}).call(e,n(2).Buffer)},function(t,e,n){function r(){i.call(this)}t.exports=r;var i=n(26).EventEmitter,o=n(27);o(r,i),r.Readable=n(28),r.Writable=n(40),r.Duplex=n(41),r.Transform=n(42),r.PassThrough=n(43),r.Stream=r,r.prototype.pipe=function(t,e){function n(e){t.writable&&!1===t.write(e)&&u.pause&&u.pause()}function r(){u.readable&&u.resume&&u.resume()}function o(){c||(c=!0,t.end())}function a(){c||(c=!0,"function"==typeof t.destroy&&t.destroy())}function s(t){if(h(),0===i.listenerCount(this,"error"))throw t}function h(){u.removeListener("data",n),t.removeListener("drain",r),u.removeListener("end",o),u.removeListener("close",a),u.removeListener("error",s),t.removeListener("error",s),u.removeListener("end",h),u.removeListener("close",h),t.removeListener("close",h)}var u=this;u.on("data",n),t.on("drain",r),t._isStdio||e&&e.end===!1||(u.on("end",o),u.on("close",a));var c=!1;return u.on("error",s),t.on("error",s),u.on("end",h),u.on("close",h),t.on("close",h),t.emit("pipe",u),t}},function(t,e){function n(){this._events=this._events||{},this._maxListeners=this._maxListeners||void 0}function r(t){return"function"==typeof t}function i(t){return"number"==typeof t}function o(t){return"object"==typeof t&&null!==t}function a(t){return void 0===t}t.exports=n,n.EventEmitter=n,n.prototype._events=void 0,n.prototype._maxListeners=void 0,n.defaultMaxListeners=10,n.prototype.setMaxListeners=function(t){if(!i(t)||0>t||isNaN(t))throw TypeError("n must be a positive number");return this._maxListeners=t,this},n.prototype.emit=function(t){var e,n,i,s,h,u;if(this._events||(this._events={}),"error"===t&&(!this._events.error||o(this._events.error)&&!this._events.error.length)){if(e=arguments[1],e instanceof Error)throw e;throw TypeError('Uncaught, unspecified "error" event.')}if(n=this._events[t],a(n))return!1;if(r(n))switch(arguments.length){case 1:n.call(this);break;case 2:n.call(this,arguments[1]);break;case 3:n.call(this,arguments[1],arguments[2]);break;default:s=Array.prototype.slice.call(arguments,1),n.apply(this,s)}else if(o(n))for(s=Array.prototype.slice.call(arguments,1),u=n.slice(),i=u.length,h=0;i>h;h++)u[h].apply(this,s);return!0},n.prototype.addListener=function(t,e){var i;if(!r(e))throw TypeError("listener must be a function");return this._events||(this._events={}),this._events.newListener&&this.emit("newListener",t,r(e.listener)?e.listener:e),this._events[t]?o(this._events[t])?this._events[t].push(e):this._events[t]=[this._events[t],e]:this._events[t]=e,o(this._events[t])&&!this._events[t].warned&&(i=a(this._maxListeners)?n.defaultMaxListeners:this._maxListeners,i&&i>0&&this._events[t].length>i&&(this._events[t].warned=!0,"function"==typeof console.trace)),this},n.prototype.on=n.prototype.addListener,n.prototype.once=function(t,e){function n(){this.removeListener(t,n),i||(i=!0,e.apply(this,arguments))}if(!r(e))throw TypeError("listener must be a function");var i=!1;return n.listener=e,this.on(t,n),this},n.prototype.removeListener=function(t,e){var n,i,a,s;if(!r(e))throw TypeError("listener must be a function");if(!this._events||!this._events[t])return this;if(n=this._events[t],a=n.length,i=-1,n===e||r(n.listener)&&n.listener===e)delete this._events[t],this._events.removeListener&&this.emit("removeListener",t,e);else if(o(n)){for(s=a;s-->0;)if(n[s]===e||n[s].listener&&n[s].listener===e){i=s;break}if(0>i)return this;1===n.length?(n.length=0,delete this._events[t]):n.splice(i,1),this._events.removeListener&&this.emit("removeListener",t,e)}return this},n.prototype.removeAllListeners=function(t){var e,n;if(!this._events)return this;if(!this._events.removeListener)return 0===arguments.length?this._events={}:this._events[t]&&delete this._events[t],this;if(0===arguments.length){for(e in this._events)"removeListener"!==e&&this.removeAllListeners(e);return this.removeAllListeners("removeListener"),this._events={},this}if(n=this._events[t],r(n))this.removeListener(t,n);else if(n)for(;n.length;)this.removeListener(t,n[n.length-1]);return delete this._events[t],this},n.prototype.listeners=function(t){var e;return e=this._events&&this._events[t]?r(this._events[t])?[this._events[t]]:this._events[t].slice():[]},n.prototype.listenerCount=function(t){if(this._events){var e=this._events[t];if(r(e))return 1;if(e)return e.length}return 0},n.listenerCount=function(t,e){return t.listenerCount(e)}},function(t,e){"function"==typeof Object.create?t.exports=function(t,e){t.super_=e,t.prototype=Object.create(e.prototype,{constructor:{value:t,enumerable:!1,writable:!0,configurable:!0}})}:t.exports=function(t,e){t.super_=e;var n=function(){};n.prototype=e.prototype,t.prototype=new n,t.prototype.constructor=t}},function(t,e,n){e=t.exports=n(29),e.Stream=n(25),e.Readable=e,e.Writable=n(36),e.Duplex=n(35),e.Transform=n(38),e.PassThrough=n(39)},function(t,e,n){(function(e){function r(t,e){var r=n(35);t=t||{};var i=t.highWaterMark,o=t.objectMode?16:16384;this.highWaterMark=i||0===i?i:o,this.highWaterMark=~~this.highWaterMark,this.buffer=[],this.length=0,this.pipes=null,this.pipesCount=0,this.flowing=null,this.ended=!1,this.endEmitted=!1,this.reading=!1,this.sync=!0,this.needReadable=!1,this.emittedReadable=!1,this.readableListening=!1,this.objectMode=!!t.objectMode,e instanceof r&&(this.objectMode=this.objectMode||!!t.readableObjectMode),this.defaultEncoding=t.defaultEncoding||"utf8",this.ranOut=!1,this.awaitDrain=0,this.readingMore=!1,this.decoder=null,this.encoding=null,t.encoding&&(A||(A=n(37).StringDecoder),this.decoder=new A(t.encoding),this.encoding=t.encoding)}function i(t){n(35);return this instanceof i?(this._readableState=new r(t,this),this.readable=!0,void C.call(this)):new i(t)}function o(t,e,n,r,i){var o=u(e,n);if(o)t.emit("error",o);else if(I.isNullOrUndefined(n))e.reading=!1,e.ended||c(t,e);else if(e.objectMode||n&&n.length>0)if(e.ended&&!i){var s=new Error("stream.push() after EOF");t.emit("error",s)}else if(e.endEmitted&&i){var s=new Error("stream.unshift() after end event");t.emit("error",s)}else!e.decoder||i||r||(n=e.decoder.write(n)),i||(e.reading=!1),e.flowing&&0===e.length&&!e.sync?(t.emit("data",n),t.read(0)):(e.length+=e.objectMode?1:n.length,i?e.buffer.unshift(n):e.buffer.push(n),e.needReadable&&l(t)),d(t,e);else i||(e.reading=!1);return a(e)}function a(t){return!t.ended&&(t.needReadable||t.length<t.highWaterMark||0===t.length)}function s(t){if(t>=R)t=R;else{t--;for(var e=1;32>e;e<<=1)t|=t>>e;t++}return t}function h(t,e){return 0===e.length&&e.ended?0:e.objectMode?0===t?0:1:isNaN(t)||I.isNull(t)?e.flowing&&e.buffer.length?e.buffer[0].length:e.length:0>=t?0:(t>e.highWaterMark&&(e.highWaterMark=s(t)),t>e.length?e.ended?e.length:(e.needReadable=!0,0):t)}function u(t,e){var n=null;return I.isBuffer(e)||I.isString(e)||I.isNullOrUndefined(e)||t.objectMode||(n=new TypeError("Invalid non-string/buffer chunk")),n}function c(t,e){if(e.decoder&&!e.ended){var n=e.decoder.end();n&&n.length&&(e.buffer.push(n),e.length+=e.objectMode?1:n.length)}e.ended=!0,l(t)}function l(t){var n=t._readableState;n.needReadable=!1,n.emittedReadable||(L("emitReadable",n.flowing),n.emittedReadable=!0,n.sync?e.nextTick(function(){f(t)}):f(t))}function f(t){L("emit readable"),t.emit("readable"),y(t)}function d(t,n){n.readingMore||(n.readingMore=!0,e.nextTick(function(){p(t,n)}))}function p(t,e){for(var n=e.length;!e.reading&&!e.flowing&&!e.ended&&e.length<e.highWaterMark&&(L("maybeReadMore read 0"),t.read(0),n!==e.length);)n=e.length;e.readingMore=!1}function g(t){return function(){var e=t._readableState;
L("pipeOnDrain",e.awaitDrain),e.awaitDrain&&e.awaitDrain--,0===e.awaitDrain&&E.listenerCount(t,"data")&&(e.flowing=!0,y(t))}}function v(t,n){n.resumeScheduled||(n.resumeScheduled=!0,e.nextTick(function(){m(t,n)}))}function m(t,e){e.resumeScheduled=!1,t.emit("resume"),y(t),e.flowing&&!e.reading&&t.read(0)}function y(t){var e=t._readableState;if(L("flow",e.flowing),e.flowing)do var n=t.read();while(null!==n&&e.flowing)}function _(t,e){var n,r=e.buffer,i=e.length,o=!!e.decoder,a=!!e.objectMode;if(0===r.length)return null;if(0===i)n=null;else if(a)n=r.shift();else if(!t||t>=i)n=o?r.join(""):k.concat(r,i),r.length=0;else if(t<r[0].length){var s=r[0];n=s.slice(0,t),r[0]=s.slice(t)}else if(t===r[0].length)n=r.shift();else{n=o?"":new k(t);for(var h=0,u=0,c=r.length;c>u&&t>h;u++){var s=r[0],l=Math.min(t-h,s.length);o?n+=s.slice(0,l):s.copy(n,h,0,l),l<s.length?r[0]=s.slice(l):r.shift(),h+=l}}return n}function w(t){var n=t._readableState;if(n.length>0)throw new Error("endReadable called on non-empty stream");n.endEmitted||(n.ended=!0,e.nextTick(function(){n.endEmitted||0!==n.length||(n.endEmitted=!0,t.readable=!1,t.emit("end"))}))}function b(t,e){for(var n=0,r=t.length;r>n;n++)e(t[n],n)}function x(t,e){for(var n=0,r=t.length;r>n;n++)if(t[n]===e)return n;return-1}t.exports=i;var S=n(31),k=n(2).Buffer;i.ReadableState=r;var E=n(26).EventEmitter;E.listenerCount||(E.listenerCount=function(t,e){return t.listeners(e).length});var C=n(25),I=n(32);I.inherits=n(33);var A,L=n(34);L=L&&L.debuglog?L.debuglog("stream"):function(){},I.inherits(i,C),i.prototype.push=function(t,e){var n=this._readableState;return I.isString(t)&&!n.objectMode&&(e=e||n.defaultEncoding,e!==n.encoding&&(t=new k(t,e),e="")),o(this,n,t,e,!1)},i.prototype.unshift=function(t){var e=this._readableState;return o(this,e,t,"",!0)},i.prototype.setEncoding=function(t){return A||(A=n(37).StringDecoder),this._readableState.decoder=new A(t),this._readableState.encoding=t,this};var R=8388608;i.prototype.read=function(t){L("read",t);var e=this._readableState,n=t;if((!I.isNumber(t)||t>0)&&(e.emittedReadable=!1),0===t&&e.needReadable&&(e.length>=e.highWaterMark||e.ended))return L("read: emitReadable",e.length,e.ended),0===e.length&&e.ended?w(this):l(this),null;if(t=h(t,e),0===t&&e.ended)return 0===e.length&&w(this),null;var r=e.needReadable;L("need readable",r),(0===e.length||e.length-t<e.highWaterMark)&&(r=!0,L("length less than watermark",r)),(e.ended||e.reading)&&(r=!1,L("reading or ended",r)),r&&(L("do read"),e.reading=!0,e.sync=!0,0===e.length&&(e.needReadable=!0),this._read(e.highWaterMark),e.sync=!1),r&&!e.reading&&(t=h(n,e));var i;return i=t>0?_(t,e):null,I.isNull(i)&&(e.needReadable=!0,t=0),e.length-=t,0!==e.length||e.ended||(e.needReadable=!0),n!==t&&e.ended&&0===e.length&&w(this),I.isNull(i)||this.emit("data",i),i},i.prototype._read=function(t){this.emit("error",new Error("not implemented"))},i.prototype.pipe=function(t,n){function r(t){L("onunpipe"),t===l&&o()}function i(){L("onend"),t.end()}function o(){L("cleanup"),t.removeListener("close",h),t.removeListener("finish",u),t.removeListener("drain",v),t.removeListener("error",s),t.removeListener("unpipe",r),l.removeListener("end",i),l.removeListener("end",o),l.removeListener("data",a),!f.awaitDrain||t._writableState&&!t._writableState.needDrain||v()}function a(e){L("ondata");var n=t.write(e);!1===n&&(L("false write response, pause",l._readableState.awaitDrain),l._readableState.awaitDrain++,l.pause())}function s(e){L("onerror",e),c(),t.removeListener("error",s),0===E.listenerCount(t,"error")&&t.emit("error",e)}function h(){t.removeListener("finish",u),c()}function u(){L("onfinish"),t.removeListener("close",h),c()}function c(){L("unpipe"),l.unpipe(t)}var l=this,f=this._readableState;switch(f.pipesCount){case 0:f.pipes=t;break;case 1:f.pipes=[f.pipes,t];break;default:f.pipes.push(t)}f.pipesCount+=1,L("pipe count=%d opts=%j",f.pipesCount,n);var d=(!n||n.end!==!1)&&t!==e.stdout&&t!==e.stderr,p=d?i:o;f.endEmitted?e.nextTick(p):l.once("end",p),t.on("unpipe",r);var v=g(l);return t.on("drain",v),l.on("data",a),t._events&&t._events.error?S(t._events.error)?t._events.error.unshift(s):t._events.error=[s,t._events.error]:t.on("error",s),t.once("close",h),t.once("finish",u),t.emit("pipe",l),f.flowing||(L("pipe resume"),l.resume()),t},i.prototype.unpipe=function(t){var e=this._readableState;if(0===e.pipesCount)return this;if(1===e.pipesCount)return t&&t!==e.pipes?this:(t||(t=e.pipes),e.pipes=null,e.pipesCount=0,e.flowing=!1,t&&t.emit("unpipe",this),this);if(!t){var n=e.pipes,r=e.pipesCount;e.pipes=null,e.pipesCount=0,e.flowing=!1;for(var i=0;r>i;i++)n[i].emit("unpipe",this);return this}var i=x(e.pipes,t);return-1===i?this:(e.pipes.splice(i,1),e.pipesCount-=1,1===e.pipesCount&&(e.pipes=e.pipes[0]),t.emit("unpipe",this),this)},i.prototype.on=function(t,n){var r=C.prototype.on.call(this,t,n);if("data"===t&&!1!==this._readableState.flowing&&this.resume(),"readable"===t&&this.readable){var i=this._readableState;if(!i.readableListening)if(i.readableListening=!0,i.emittedReadable=!1,i.needReadable=!0,i.reading)i.length&&l(this,i);else{var o=this;e.nextTick(function(){L("readable nexttick read 0"),o.read(0)})}}return r},i.prototype.addListener=i.prototype.on,i.prototype.resume=function(){var t=this._readableState;return t.flowing||(L("resume"),t.flowing=!0,t.reading||(L("resume read 0"),this.read(0)),v(this,t)),this},i.prototype.pause=function(){return L("call pause flowing=%j",this._readableState.flowing),!1!==this._readableState.flowing&&(L("pause"),this._readableState.flowing=!1,this.emit("pause")),this},i.prototype.wrap=function(t){var e=this._readableState,n=!1,r=this;t.on("end",function(){if(L("wrapped end"),e.decoder&&!e.ended){var t=e.decoder.end();t&&t.length&&r.push(t)}r.push(null)}),t.on("data",function(i){if(L("wrapped data"),e.decoder&&(i=e.decoder.write(i)),i&&(e.objectMode||i.length)){var o=r.push(i);o||(n=!0,t.pause())}});for(var i in t)I.isFunction(t[i])&&I.isUndefined(this[i])&&(this[i]=function(e){return function(){return t[e].apply(t,arguments)}}(i));var o=["error","close","destroy","pause","resume"];return b(o,function(e){t.on(e,r.emit.bind(r,e))}),r._read=function(e){L("wrapped _read",e),n&&(n=!1,t.resume())},r},i._fromList=_}).call(e,n(30))},function(t,e){function n(){u=!1,a.length?h=a.concat(h):c=-1,h.length&&r()}function r(){if(!u){var t=setTimeout(n);u=!0;for(var e=h.length;e;){for(a=h,h=[];++c<e;)a&&a[c].run();c=-1,e=h.length}a=null,u=!1,clearTimeout(t)}}function i(t,e){this.fun=t,this.array=e}function o(){}var a,s=t.exports={},h=[],u=!1,c=-1;s.nextTick=function(t){var e=new Array(arguments.length-1);if(arguments.length>1)for(var n=1;n<arguments.length;n++)e[n-1]=arguments[n];h.push(new i(t,e)),1!==h.length||u||setTimeout(r,0)},i.prototype.run=function(){this.fun.apply(null,this.array)},s.title="browser",s.browser=!0,s.env={},s.argv=[],s.version="",s.versions={},s.on=o,s.addListener=o,s.once=o,s.off=o,s.removeListener=o,s.removeAllListeners=o,s.emit=o,s.binding=function(t){throw new Error("process.binding is not supported")},s.cwd=function(){return"/"},s.chdir=function(t){throw new Error("process.chdir is not supported")},s.umask=function(){return 0}},function(t,e){t.exports=Array.isArray||function(t){return"[object Array]"==Object.prototype.toString.call(t)}},function(t,e,n){(function(t){function n(t){return Array.isArray(t)}function r(t){return"boolean"==typeof t}function i(t){return null===t}function o(t){return null==t}function a(t){return"number"==typeof t}function s(t){return"string"==typeof t}function h(t){return"symbol"==typeof t}function u(t){return void 0===t}function c(t){return l(t)&&"[object RegExp]"===m(t)}function l(t){return"object"==typeof t&&null!==t}function f(t){return l(t)&&"[object Date]"===m(t)}function d(t){return l(t)&&("[object Error]"===m(t)||t instanceof Error)}function p(t){return"function"==typeof t}function g(t){return null===t||"boolean"==typeof t||"number"==typeof t||"string"==typeof t||"symbol"==typeof t||"undefined"==typeof t}function v(e){return t.isBuffer(e)}function m(t){return Object.prototype.toString.call(t)}e.isArray=n,e.isBoolean=r,e.isNull=i,e.isNullOrUndefined=o,e.isNumber=a,e.isString=s,e.isSymbol=h,e.isUndefined=u,e.isRegExp=c,e.isObject=l,e.isDate=f,e.isError=d,e.isFunction=p,e.isPrimitive=g,e.isBuffer=v}).call(e,n(2).Buffer)},function(t,e){"function"==typeof Object.create?t.exports=function(t,e){t.super_=e,t.prototype=Object.create(e.prototype,{constructor:{value:t,enumerable:!1,writable:!0,configurable:!0}})}:t.exports=function(t,e){t.super_=e;var n=function(){};n.prototype=e.prototype,t.prototype=new n,t.prototype.constructor=t}},function(t,e){},function(t,e,n){(function(e){function r(t){return this instanceof r?(h.call(this,t),u.call(this,t),t&&t.readable===!1&&(this.readable=!1),t&&t.writable===!1&&(this.writable=!1),this.allowHalfOpen=!0,t&&t.allowHalfOpen===!1&&(this.allowHalfOpen=!1),void this.once("end",i)):new r(t)}function i(){this.allowHalfOpen||this._writableState.ended||e.nextTick(this.end.bind(this))}function o(t,e){for(var n=0,r=t.length;r>n;n++)e(t[n],n)}t.exports=r;var a=Object.keys||function(t){var e=[];for(var n in t)e.push(n);return e},s=n(32);s.inherits=n(33);var h=n(29),u=n(36);s.inherits(r,h),o(a(u.prototype),function(t){r.prototype[t]||(r.prototype[t]=u.prototype[t])})}).call(e,n(30))},function(t,e,n){(function(e){function r(t,e,n){this.chunk=t,this.encoding=e,this.callback=n}function i(t,e){var r=n(35);t=t||{};var i=t.highWaterMark,o=t.objectMode?16:16384;this.highWaterMark=i||0===i?i:o,this.objectMode=!!t.objectMode,e instanceof r&&(this.objectMode=this.objectMode||!!t.writableObjectMode),this.highWaterMark=~~this.highWaterMark,this.needDrain=!1,this.ending=!1,this.ended=!1,this.finished=!1;var a=t.decodeStrings===!1;this.decodeStrings=!a,this.defaultEncoding=t.defaultEncoding||"utf8",this.length=0,this.writing=!1,this.corked=0,this.sync=!0,this.bufferProcessing=!1,this.onwrite=function(t){d(e,t)},this.writecb=null,this.writelen=0,this.buffer=[],this.pendingcb=0,this.prefinished=!1,this.errorEmitted=!1}function o(t){var e=n(35);return this instanceof o||this instanceof e?(this._writableState=new i(t,this),this.writable=!0,void S.call(this)):new o(t)}function a(t,n,r){var i=new Error("write after end");t.emit("error",i),e.nextTick(function(){r(i)})}function s(t,n,r,i){var o=!0;if(!(x.isBuffer(r)||x.isString(r)||x.isNullOrUndefined(r)||n.objectMode)){var a=new TypeError("Invalid non-string/buffer chunk");t.emit("error",a),e.nextTick(function(){i(a)}),o=!1}return o}function h(t,e,n){return!t.objectMode&&t.decodeStrings!==!1&&x.isString(e)&&(e=new b(e,n)),e}function u(t,e,n,i,o){n=h(e,n,i),x.isBuffer(n)&&(i="buffer");var a=e.objectMode?1:n.length;e.length+=a;var s=e.length<e.highWaterMark;return s||(e.needDrain=!0),e.writing||e.corked?e.buffer.push(new r(n,i,o)):c(t,e,!1,a,n,i,o),s}function c(t,e,n,r,i,o,a){e.writelen=r,e.writecb=a,e.writing=!0,e.sync=!0,n?t._writev(i,e.onwrite):t._write(i,o,e.onwrite),e.sync=!1}function l(t,n,r,i,o){r?e.nextTick(function(){n.pendingcb--,o(i)}):(n.pendingcb--,o(i)),t._writableState.errorEmitted=!0,t.emit("error",i)}function f(t){t.writing=!1,t.writecb=null,t.length-=t.writelen,t.writelen=0}function d(t,n){var r=t._writableState,i=r.sync,o=r.writecb;if(f(r),n)l(t,r,i,n,o);else{var a=m(t,r);a||r.corked||r.bufferProcessing||!r.buffer.length||v(t,r),i?e.nextTick(function(){p(t,r,a,o)}):p(t,r,a,o)}}function p(t,e,n,r){n||g(t,e),e.pendingcb--,r(),_(t,e)}function g(t,e){0===e.length&&e.needDrain&&(e.needDrain=!1,t.emit("drain"))}function v(t,e){if(e.bufferProcessing=!0,t._writev&&e.buffer.length>1){for(var n=[],r=0;r<e.buffer.length;r++)n.push(e.buffer[r].callback);e.pendingcb++,c(t,e,!0,e.length,e.buffer,"",function(t){for(var r=0;r<n.length;r++)e.pendingcb--,n[r](t)}),e.buffer=[]}else{for(var r=0;r<e.buffer.length;r++){var i=e.buffer[r],o=i.chunk,a=i.encoding,s=i.callback,h=e.objectMode?1:o.length;if(c(t,e,!1,h,o,a,s),e.writing){r++;break}}r<e.buffer.length?e.buffer=e.buffer.slice(r):e.buffer.length=0}e.bufferProcessing=!1}function m(t,e){return e.ending&&0===e.length&&!e.finished&&!e.writing}function y(t,e){e.prefinished||(e.prefinished=!0,t.emit("prefinish"))}function _(t,e){var n=m(t,e);return n&&(0===e.pendingcb?(y(t,e),e.finished=!0,t.emit("finish")):y(t,e)),n}function w(t,n,r){n.ending=!0,_(t,n),r&&(n.finished?e.nextTick(r):t.once("finish",r)),n.ended=!0}t.exports=o;var b=n(2).Buffer;o.WritableState=i;var x=n(32);x.inherits=n(33);var S=n(25);x.inherits(o,S),o.prototype.pipe=function(){this.emit("error",new Error("Cannot pipe. Not readable."))},o.prototype.write=function(t,e,n){var r=this._writableState,i=!1;return x.isFunction(e)&&(n=e,e=null),x.isBuffer(t)?e="buffer":e||(e=r.defaultEncoding),x.isFunction(n)||(n=function(){}),r.ended?a(this,r,n):s(this,r,t,n)&&(r.pendingcb++,i=u(this,r,t,e,n)),i},o.prototype.cork=function(){var t=this._writableState;t.corked++},o.prototype.uncork=function(){var t=this._writableState;t.corked&&(t.corked--,t.writing||t.corked||t.finished||t.bufferProcessing||!t.buffer.length||v(this,t))},o.prototype._write=function(t,e,n){n(new Error("not implemented"))},o.prototype._writev=null,o.prototype.end=function(t,e,n){var r=this._writableState;x.isFunction(t)?(n=t,t=null,e=null):x.isFunction(e)&&(n=e,e=null),x.isNullOrUndefined(t)||this.write(t,e),r.corked&&(r.corked=1,this.uncork()),r.ending||r.finished||w(this,r,n)}}).call(e,n(30))},function(t,e,n){function r(t){if(t&&!h(t))throw new Error("Unknown encoding: "+t)}function i(t){return t.toString(this.encoding)}function o(t){this.charReceived=t.length%2,this.charLength=this.charReceived?2:0}function a(t){this.charReceived=t.length%3,this.charLength=this.charReceived?3:0}var s=n(2).Buffer,h=s.isEncoding||function(t){switch(t&&t.toLowerCase()){case"hex":case"utf8":case"utf-8":case"ascii":case"binary":case"base64":case"ucs2":case"ucs-2":case"utf16le":case"utf-16le":case"raw":return!0;default:return!1}},u=e.StringDecoder=function(t){switch(this.encoding=(t||"utf8").toLowerCase().replace(/[-_]/,""),r(t),this.encoding){case"utf8":this.surrogateSize=3;break;case"ucs2":case"utf16le":this.surrogateSize=2,this.detectIncompleteChar=o;break;case"base64":this.surrogateSize=3,this.detectIncompleteChar=a;break;default:return void(this.write=i)}this.charBuffer=new s(6),this.charReceived=0,this.charLength=0};u.prototype.write=function(t){for(var e="";this.charLength;){var n=t.length>=this.charLength-this.charReceived?this.charLength-this.charReceived:t.length;if(t.copy(this.charBuffer,this.charReceived,0,n),this.charReceived+=n,this.charReceived<this.charLength)return"";t=t.slice(n,t.length),e=this.charBuffer.slice(0,this.charLength).toString(this.encoding);var r=e.charCodeAt(e.length-1);if(!(r>=55296&&56319>=r)){if(this.charReceived=this.charLength=0,0===t.length)return e;break}this.charLength+=this.surrogateSize,e=""}this.detectIncompleteChar(t);var i=t.length;this.charLength&&(t.copy(this.charBuffer,0,t.length-this.charReceived,i),i-=this.charReceived),e+=t.toString(this.encoding,0,i);var i=e.length-1,r=e.charCodeAt(i);if(r>=55296&&56319>=r){var o=this.surrogateSize;return this.charLength+=o,this.charReceived+=o,this.charBuffer.copy(this.charBuffer,o,0,o),t.copy(this.charBuffer,0,0,o),e.substring(0,i)}return e},u.prototype.detectIncompleteChar=function(t){for(var e=t.length>=3?3:t.length;e>0;e--){var n=t[t.length-e];if(1==e&&n>>5==6){this.charLength=2;break}if(2>=e&&n>>4==14){this.charLength=3;break}if(3>=e&&n>>3==30){this.charLength=4;break}}this.charReceived=e},u.prototype.end=function(t){var e="";if(t&&t.length&&(e=this.write(t)),this.charReceived){var n=this.charReceived,r=this.charBuffer,i=this.encoding;e+=r.slice(0,n).toString(i)}return e}},function(t,e,n){function r(t,e){this.afterTransform=function(t,n){return i(e,t,n)},this.needTransform=!1,this.transforming=!1,this.writecb=null,this.writechunk=null}function i(t,e,n){var r=t._transformState;r.transforming=!1;var i=r.writecb;if(!i)return t.emit("error",new Error("no writecb in Transform class"));r.writechunk=null,r.writecb=null,h.isNullOrUndefined(n)||t.push(n),i&&i(e);var o=t._readableState;o.reading=!1,(o.needReadable||o.length<o.highWaterMark)&&t._read(o.highWaterMark)}function o(t){if(!(this instanceof o))return new o(t);s.call(this,t),this._transformState=new r(t,this);var e=this;this._readableState.needReadable=!0,this._readableState.sync=!1,this.once("prefinish",function(){h.isFunction(this._flush)?this._flush(function(t){a(e,t)}):a(e)})}function a(t,e){if(e)return t.emit("error",e);var n=t._writableState,r=t._transformState;if(n.length)throw new Error("calling transform done when ws.length != 0");if(r.transforming)throw new Error("calling transform done when still transforming");return t.push(null)}t.exports=o;var s=n(35),h=n(32);h.inherits=n(33),h.inherits(o,s),o.prototype.push=function(t,e){return this._transformState.needTransform=!1,s.prototype.push.call(this,t,e)},o.prototype._transform=function(t,e,n){throw new Error("not implemented")},o.prototype._write=function(t,e,n){var r=this._transformState;if(r.writecb=n,r.writechunk=t,r.writeencoding=e,!r.transforming){var i=this._readableState;(r.needTransform||i.needReadable||i.length<i.highWaterMark)&&this._read(i.highWaterMark)}},o.prototype._read=function(t){var e=this._transformState;h.isNull(e.writechunk)||!e.writecb||e.transforming?e.needTransform=!0:(e.transforming=!0,this._transform(e.writechunk,e.writeencoding,e.afterTransform))}},function(t,e,n){function r(t){return this instanceof r?void i.call(this,t):new r(t)}t.exports=r;var i=n(38),o=n(32);o.inherits=n(33),o.inherits(r,i),r.prototype._transform=function(t,e,n){n(null,t)}},function(t,e,n){t.exports=n(36)},function(t,e,n){t.exports=n(35)},function(t,e,n){t.exports=n(38)},function(t,e,n){t.exports=n(39)},function(t,e,n){(function(e,n){"use strict";function r(){this.fileSystem={},this.baseSystem={}}function i(t){return 0===t.indexOf(n)&&(t=t.substring(n.length)),0===t.indexOf("/")&&(t=t.substring(1)),t}r.prototype.readFileSync=function(t){t=i(t);var n=this.baseSystem[t];return n?new e(n,"base64"):this.fileSystem[t]},r.prototype.writeFileSync=function(t,e){this.fileSystem[i(t)]=e},r.prototype.bindFS=function(t){this.baseSystem=t},t.exports=new r}).call(e,n(2).Buffer,"/")},function(t,e,n){(function(e){(function(){var r,i;r=function(){function t(){}var n,r,o,a;return o=function(t,e){return(Array(e+1).join("0")+t).slice(-e)},r=/[\n\r\t\b\f\(\)\\]/g,n={"\n":"\\n","\r":"\\r","	":"\\t","\b":"\\b","\f":"\\f","\\":"\\\\","(":"\\(",")":"\\)"},a=function(t){var e,n,r,i,o;if(r=t.length,1&r)throw new Error("Buffer length must be even");for(n=i=0,o=r-1;o>i;n=i+=2)e=t[n],t[n]=t[n+1],t[n+1]=e;return t},t.convert=function(s){var h,u,c,l,f,d,p,g,v,m;if("string"==typeof s)return"/"+s;if(s instanceof String){for(p=s.replace(r,function(t){return n[t]}),c=!1,u=v=0,m=p.length;m>v;u=v+=1)if(p.charCodeAt(u)>127){c=!0;break}return c&&(p=a(new e("\ufeff"+p,"utf16le")).toString("binary")),"("+p+")"}if(e.isBuffer(s))return"<"+s.toString("hex")+">";if(s instanceof i)return s.toString();if(s instanceof Date)return"(D:"+o(s.getUTCFullYear(),4)+o(s.getUTCMonth(),2)+o(s.getUTCDate(),2)+o(s.getUTCHours(),2)+o(s.getUTCMinutes(),2)+o(s.getUTCSeconds(),2)+"Z)";if(Array.isArray(s))return l=function(){var e,n,r;for(r=[],e=0,n=s.length;n>e;e++)h=s[e],r.push(t.convert(h));return r}().join(" "),"["+l+"]";if("[object Object]"==={}.toString.call(s)){d=["<<"];for(f in s)g=s[f],d.push("/"+f+" "+t.convert(g));return d.push(">>"),d.join("\n")}return""+s},t}(),t.exports=r,i=n(46)}).call(this)}).call(e,n(2).Buffer)},function(t,e,n){(function(e){(function(){var r,i,o,a=function(t,e){return function(){return t.apply(e,arguments)}};o=n(47),i=function(){function t(t,e,n){this.document=t,this.id=e,this.data=null!=n?n:{},this.finalize=a(this.finalize,this),this.gen=0,this.deflate=null,this.compress=this.document.compress&&!this.data.Filter,this.uncompressedLength=0,this.chunks=[]}return t.prototype.initDeflate=function(){return this.data.Filter="FlateDecode",this.deflate=o.createDeflate(),this.deflate.on("data",function(t){return function(e){return t.chunks.push(e),t.data.Length+=e.length}}(this)),this.deflate.on("end",this.finalize)},t.prototype.write=function(t){var n;return e.isBuffer(t)||(t=new e(t+"\n","binary")),this.uncompressedLength+=t.length,null==(n=this.data).Length&&(n.Length=0),this.compress?(this.deflate||this.initDeflate(),this.deflate.write(t)):(this.chunks.push(t),this.data.Length+=t.length)},t.prototype.end=function(t){return("string"==typeof t||e.isBuffer(t))&&this.write(t),this.deflate?this.deflate.end():this.finalize()},t.prototype.finalize=function(){var t,e,n,i;if(this.offset=this.document._offset,this.document._write(""+this.id+" "+this.gen+" obj"),this.document._write(r.convert(this.data)),this.chunks.length){for(this.document._write("stream"),i=this.chunks,e=0,n=i.length;n>e;e++)t=i[e],this.document._write(t);this.chunks.length=0,this.document._write("\nendstream")}return this.document._write("endobj"),this.document._refEnd(this)},t.prototype.toString=function(){return""+this.id+" "+this.gen+" R"},t}(),t.exports=i,r=n(45)}).call(this)}).call(e,n(2).Buffer)},function(t,e,n){(function(t,r){function i(e,n,r){function i(){for(var t;null!==(t=e.read());)s.push(t),h+=t.length;e.once("readable",i)}function o(t){e.removeListener("end",a),e.removeListener("readable",i),r(t)}function a(){var n=t.concat(s,h);s=[],r(null,n),e.close()}var s=[],h=0;e.on("error",o),e.on("end",a),e.end(n),i()}function o(e,n){if("string"==typeof n&&(n=new t(n)),!t.isBuffer(n))throw new TypeError("Not a string or buffer");var r=g.Z_FINISH;return e._processChunk(n,r)}function a(t){return this instanceof a?void d.call(this,t,g.DEFLATE):new a(t)}function s(t){return this instanceof s?void d.call(this,t,g.INFLATE):new s(t)}function h(t){return this instanceof h?void d.call(this,t,g.GZIP):new h(t)}function u(t){return this instanceof u?void d.call(this,t,g.GUNZIP):new u(t)}function c(t){return this instanceof c?void d.call(this,t,g.DEFLATERAW):new c(t)}function l(t){return this instanceof l?void d.call(this,t,g.INFLATERAW):new l(t)}function f(t){return this instanceof f?void d.call(this,t,g.UNZIP):new f(t)}function d(n,r){if(this._opts=n=n||{},this._chunkSize=n.chunkSize||e.Z_DEFAULT_CHUNK,p.call(this,n),n.flush&&n.flush!==g.Z_NO_FLUSH&&n.flush!==g.Z_PARTIAL_FLUSH&&n.flush!==g.Z_SYNC_FLUSH&&n.flush!==g.Z_FULL_FLUSH&&n.flush!==g.Z_FINISH&&n.flush!==g.Z_BLOCK)throw new Error("Invalid flush flag: "+n.flush);if(this._flushFlag=n.flush||g.Z_NO_FLUSH,n.chunkSize&&(n.chunkSize<e.Z_MIN_CHUNK||n.chunkSize>e.Z_MAX_CHUNK))throw new Error("Invalid chunk size: "+n.chunkSize);if(n.windowBits&&(n.windowBits<e.Z_MIN_WINDOWBITS||n.windowBits>e.Z_MAX_WINDOWBITS))throw new Error("Invalid windowBits: "+n.windowBits);if(n.level&&(n.level<e.Z_MIN_LEVEL||n.level>e.Z_MAX_LEVEL))throw new Error("Invalid compression level: "+n.level);if(n.memLevel&&(n.memLevel<e.Z_MIN_MEMLEVEL||n.memLevel>e.Z_MAX_MEMLEVEL))throw new Error("Invalid memLevel: "+n.memLevel);if(n.strategy&&n.strategy!=e.Z_FILTERED&&n.strategy!=e.Z_HUFFMAN_ONLY&&n.strategy!=e.Z_RLE&&n.strategy!=e.Z_FIXED&&n.strategy!=e.Z_DEFAULT_STRATEGY)throw new Error("Invalid strategy: "+n.strategy);if(n.dictionary&&!t.isBuffer(n.dictionary))throw new Error("Invalid dictionary: it should be a Buffer instance");this._binding=new g.Zlib(r);var i=this;this._hadError=!1,this._binding.onerror=function(t,n){i._binding=null,i._hadError=!0;var r=new Error(t);r.errno=n,r.code=e.codes[n],i.emit("error",r)};var o=e.Z_DEFAULT_COMPRESSION;"number"==typeof n.level&&(o=n.level);var a=e.Z_DEFAULT_STRATEGY;"number"==typeof n.strategy&&(a=n.strategy),this._binding.init(n.windowBits||e.Z_DEFAULT_WINDOWBITS,o,n.memLevel||e.Z_DEFAULT_MEMLEVEL,a,n.dictionary),this._buffer=new t(this._chunkSize),this._offset=0,this._closed=!1,this._level=o,this._strategy=a,this.once("end",this.close)}var p=n(42),g=n(48),v=n(60),m=n(63).ok;g.Z_MIN_WINDOWBITS=8,g.Z_MAX_WINDOWBITS=15,g.Z_DEFAULT_WINDOWBITS=15,g.Z_MIN_CHUNK=64,g.Z_MAX_CHUNK=1/0,g.Z_DEFAULT_CHUNK=16384,g.Z_MIN_MEMLEVEL=1,g.Z_MAX_MEMLEVEL=9,g.Z_DEFAULT_MEMLEVEL=8,g.Z_MIN_LEVEL=-1,g.Z_MAX_LEVEL=9,g.Z_DEFAULT_LEVEL=g.Z_DEFAULT_COMPRESSION,Object.keys(g).forEach(function(t){t.match(/^Z/)&&(e[t]=g[t])}),e.codes={Z_OK:g.Z_OK,Z_STREAM_END:g.Z_STREAM_END,Z_NEED_DICT:g.Z_NEED_DICT,Z_ERRNO:g.Z_ERRNO,Z_STREAM_ERROR:g.Z_STREAM_ERROR,Z_DATA_ERROR:g.Z_DATA_ERROR,Z_MEM_ERROR:g.Z_MEM_ERROR,Z_BUF_ERROR:g.Z_BUF_ERROR,Z_VERSION_ERROR:g.Z_VERSION_ERROR},Object.keys(e.codes).forEach(function(t){e.codes[e.codes[t]]=t}),e.Deflate=a,e.Inflate=s,e.Gzip=h,e.Gunzip=u,e.DeflateRaw=c,e.InflateRaw=l,e.Unzip=f,e.createDeflate=function(t){return new a(t)},e.createInflate=function(t){return new s(t)},e.createDeflateRaw=function(t){return new c(t)},e.createInflateRaw=function(t){return new l(t)},e.createGzip=function(t){return new h(t)},e.createGunzip=function(t){return new u(t)},e.createUnzip=function(t){return new f(t)},e.deflate=function(t,e,n){return"function"==typeof e&&(n=e,e={}),i(new a(e),t,n)},e.deflateSync=function(t,e){return o(new a(e),t)},e.gzip=function(t,e,n){return"function"==typeof e&&(n=e,e={}),i(new h(e),t,n)},e.gzipSync=function(t,e){return o(new h(e),t)},e.deflateRaw=function(t,e,n){return"function"==typeof e&&(n=e,e={}),i(new c(e),t,n)},e.deflateRawSync=function(t,e){return o(new c(e),t)},e.unzip=function(t,e,n){return"function"==typeof e&&(n=e,e={}),i(new f(e),t,n)},e.unzipSync=function(t,e){return o(new f(e),t)},e.inflate=function(t,e,n){return"function"==typeof e&&(n=e,e={}),i(new s(e),t,n)},e.inflateSync=function(t,e){return o(new s(e),t)},e.gunzip=function(t,e,n){return"function"==typeof e&&(n=e,e={}),i(new u(e),t,n)},e.gunzipSync=function(t,e){return o(new u(e),t)},e.inflateRaw=function(t,e,n){return"function"==typeof e&&(n=e,e={}),i(new l(e),t,n)},e.inflateRawSync=function(t,e){return o(new l(e),t)},v.inherits(d,p),d.prototype.params=function(t,n,i){if(t<e.Z_MIN_LEVEL||t>e.Z_MAX_LEVEL)throw new RangeError("Invalid compression level: "+t);if(n!=e.Z_FILTERED&&n!=e.Z_HUFFMAN_ONLY&&n!=e.Z_RLE&&n!=e.Z_FIXED&&n!=e.Z_DEFAULT_STRATEGY)throw new TypeError("Invalid strategy: "+n);if(this._level!==t||this._strategy!==n){var o=this;this.flush(g.Z_SYNC_FLUSH,function(){o._binding.params(t,n),o._hadError||(o._level=t,o._strategy=n,i&&i())})}else r.nextTick(i)},d.prototype.reset=function(){return this._binding.reset()},d.prototype._flush=function(e){this._transform(new t(0),"",e)},d.prototype.flush=function(e,n){var i=this._writableState;if(("function"==typeof e||void 0===e&&!n)&&(n=e,e=g.Z_FULL_FLUSH),i.ended)n&&r.nextTick(n);else if(i.ending)n&&this.once("end",n);else if(i.needDrain){var o=this;this.once("drain",function(){o.flush(n)})}else this._flushFlag=e,this.write(new t(0),"",n)},d.prototype.close=function(t){if(t&&r.nextTick(t),!this._closed){this._closed=!0,this._binding.close();var e=this;r.nextTick(function(){e.emit("close")})}},d.prototype._transform=function(e,n,r){var i,o=this._writableState,a=o.ending||o.ended,s=a&&(!e||o.length===e.length);if(null===!e&&!t.isBuffer(e))return r(new Error("invalid input"));s?i=g.Z_FINISH:(i=this._flushFlag,e.length>=o.length&&(this._flushFlag=this._opts.flush||g.Z_NO_FLUSH));this._processChunk(e,i,r)},d.prototype._processChunk=function(e,n,r){function i(c,d){if(!h._hadError){var p=a-d;if(m(p>=0,"have should not go down"),p>0){var g=h._buffer.slice(h._offset,h._offset+p);h._offset+=p,u?h.push(g):(l.push(g),f+=g.length)}if((0===d||h._offset>=h._chunkSize)&&(a=h._chunkSize,h._offset=0,h._buffer=new t(h._chunkSize)),0===d){if(s+=o-c,o=c,!u)return!0;var v=h._binding.write(n,e,s,o,h._buffer,h._offset,h._chunkSize);return v.callback=i,void(v.buffer=e)}return u?void r():!1}}var o=e&&e.length,a=this._chunkSize-this._offset,s=0,h=this,u="function"==typeof r;if(!u){var c,l=[],f=0;this.on("error",function(t){c=t});do var d=this._binding.writeSync(n,e,s,o,this._buffer,this._offset,a);while(!this._hadError&&i(d[0],d[1]));if(this._hadError)throw c;var p=t.concat(l,f);return this.close(),p}var g=this._binding.write(n,e,s,o,this._buffer,this._offset,a);g.buffer=e,g.callback=i},v.inherits(a,d),v.inherits(s,d),v.inherits(h,d),v.inherits(u,d),v.inherits(c,d),v.inherits(l,d),v.inherits(f,d)}).call(e,n(2).Buffer,n(30))},function(t,e,n){(function(t,r){function i(t){if(t<e.DEFLATE||t>e.UNZIP)throw new TypeError("Bad argument");this.mode=t,this.init_done=!1,this.write_in_progress=!1,this.pending_close=!1,this.windowBits=0,this.level=0,this.memLevel=0,this.strategy=0,this.dictionary=null}function o(t,e){for(var n=0;n<t.length;n++)this[e+n]=t[n]}var a=n(49),s=n(50),h=n(51),u=n(56),c=n(59);for(var l in c)e[l]=c[l];e.NONE=0,e.DEFLATE=1,e.INFLATE=2,e.GZIP=3,e.GUNZIP=4,e.DEFLATERAW=5,e.INFLATERAW=6,e.UNZIP=7,i.prototype.init=function(t,n,r,i,o){switch(this.windowBits=t,this.level=n,this.memLevel=r,this.strategy=i,(this.mode===e.GZIP||this.mode===e.GUNZIP)&&(this.windowBits+=16),this.mode===e.UNZIP&&(this.windowBits+=32),(this.mode===e.DEFLATERAW||this.mode===e.INFLATERAW)&&(this.windowBits=-this.windowBits),this.strm=new s,this.mode){case e.DEFLATE:case e.GZIP:case e.DEFLATERAW:var a=h.deflateInit2(this.strm,this.level,e.Z_DEFLATED,this.windowBits,this.memLevel,this.strategy);break;case e.INFLATE:case e.GUNZIP:case e.INFLATERAW:case e.UNZIP:var a=u.inflateInit2(this.strm,this.windowBits);break;default:throw new Error("Unknown mode "+this.mode)}return a!==e.Z_OK?void this._error(a):(this.write_in_progress=!1,void(this.init_done=!0))},i.prototype.params=function(){throw new Error("deflateParams Not supported")},i.prototype._writeCheck=function(){if(!this.init_done)throw new Error("write before init");if(this.mode===e.NONE)throw new Error("already finalized");if(this.write_in_progress)throw new Error("write already in progress");if(this.pending_close)throw new Error("close is pending")},i.prototype.write=function(e,n,r,i,o,a,s){this._writeCheck(),this.write_in_progress=!0;var h=this;return t.nextTick(function(){h.write_in_progress=!1;var t=h._write(e,n,r,i,o,a,s);h.callback(t[0],t[1]),h.pending_close&&h.close()}),this},i.prototype.writeSync=function(t,e,n,r,i,o,a){return this._writeCheck(),this._write(t,e,n,r,i,o,a)},i.prototype._write=function(t,n,i,a,s,c,l){if(this.write_in_progress=!0,t!==e.Z_NO_FLUSH&&t!==e.Z_PARTIAL_FLUSH&&t!==e.Z_SYNC_FLUSH&&t!==e.Z_FULL_FLUSH&&t!==e.Z_FINISH&&t!==e.Z_BLOCK)throw new Error("Invalid flush value");null==n&&(n=new r(0),a=0,i=0),s._set?s.set=s._set:s.set=o;var f=this.strm;switch(f.avail_in=a,f.input=n,f.next_in=i,f.avail_out=l,f.output=s,f.next_out=c,this.mode){case e.DEFLATE:case e.GZIP:case e.DEFLATERAW:var d=h.deflate(f,t);break;case e.UNZIP:case e.INFLATE:case e.GUNZIP:case e.INFLATERAW:var d=u.inflate(f,t);break;default:throw new Error("Unknown mode "+this.mode)}return d!==e.Z_STREAM_END&&d!==e.Z_OK&&this._error(d),this.write_in_progress=!1,[f.avail_in,f.avail_out]},i.prototype.close=function(){return this.write_in_progress?void(this.pending_close=!0):(this.pending_close=!1,this.mode===e.DEFLATE||this.mode===e.GZIP||this.mode===e.DEFLATERAW?h.deflateEnd(this.strm):u.inflateEnd(this.strm),void(this.mode=e.NONE))},i.prototype.reset=function(){switch(this.mode){case e.DEFLATE:case e.DEFLATERAW:var t=h.deflateReset(this.strm);break;case e.INFLATE:case e.INFLATERAW:var t=u.inflateReset(this.strm)}t!==e.Z_OK&&this._error(t)},i.prototype._error=function(t){this.onerror(a[t]+": "+this.strm.msg,t),this.write_in_progress=!1,this.pending_close&&this.close()},e.Zlib=i}).call(e,n(30),n(2).Buffer)},function(t,e){"use strict";t.exports={2:"need dictionary",1:"stream end",0:"","-1":"file error","-2":"stream error","-3":"data error","-4":"insufficient memory","-5":"buffer error","-6":"incompatible version"}},function(t,e){"use strict";function n(){this.input=null,this.next_in=0,this.avail_in=0,this.total_in=0,this.output=null,this.next_out=0,this.avail_out=0,this.total_out=0,this.msg="",this.state=null,this.data_type=2,this.adler=0}t.exports=n},function(t,e,n){
"use strict";function r(t,e){return t.msg=B[e],e}function i(t){return(t<<1)-(t>4?9:0)}function o(t){for(var e=t.length;--e>=0;)t[e]=0}function a(t){var e=t.state,n=e.pending;n>t.avail_out&&(n=t.avail_out),0!==n&&(A.arraySet(t.output,e.pending_buf,e.pending_out,n,t.next_out),t.next_out+=n,e.pending_out+=n,t.total_out+=n,t.avail_out-=n,e.pending-=n,0===e.pending&&(e.pending_out=0))}function s(t,e){L._tr_flush_block(t,t.block_start>=0?t.block_start:-1,t.strstart-t.block_start,e),t.block_start=t.strstart,a(t.strm)}function h(t,e){t.pending_buf[t.pending++]=e}function u(t,e){t.pending_buf[t.pending++]=e>>>8&255,t.pending_buf[t.pending++]=255&e}function c(t,e,n,r){var i=t.avail_in;return i>r&&(i=r),0===i?0:(t.avail_in-=i,A.arraySet(e,t.input,t.next_in,i,n),1===t.state.wrap?t.adler=R(t.adler,e,i,n):2===t.state.wrap&&(t.adler=T(t.adler,e,i,n)),t.next_in+=i,t.total_in+=i,i)}function l(t,e){var n,r,i=t.max_chain_length,o=t.strstart,a=t.prev_length,s=t.nice_match,h=t.strstart>t.w_size-ut?t.strstart-(t.w_size-ut):0,u=t.window,c=t.w_mask,l=t.prev,f=t.strstart+ht,d=u[o+a-1],p=u[o+a];t.prev_length>=t.good_match&&(i>>=2),s>t.lookahead&&(s=t.lookahead);do if(n=e,u[n+a]===p&&u[n+a-1]===d&&u[n]===u[o]&&u[++n]===u[o+1]){o+=2,n++;do;while(u[++o]===u[++n]&&u[++o]===u[++n]&&u[++o]===u[++n]&&u[++o]===u[++n]&&u[++o]===u[++n]&&u[++o]===u[++n]&&u[++o]===u[++n]&&u[++o]===u[++n]&&f>o);if(r=ht-(f-o),o=f-ht,r>a){if(t.match_start=e,a=r,r>=s)break;d=u[o+a-1],p=u[o+a]}}while((e=l[e&c])>h&&0!==--i);return a<=t.lookahead?a:t.lookahead}function f(t){var e,n,r,i,o,a=t.w_size;do{if(i=t.window_size-t.lookahead-t.strstart,t.strstart>=a+(a-ut)){A.arraySet(t.window,t.window,a,a,0),t.match_start-=a,t.strstart-=a,t.block_start-=a,n=t.hash_size,e=n;do r=t.head[--e],t.head[e]=r>=a?r-a:0;while(--n);n=a,e=n;do r=t.prev[--e],t.prev[e]=r>=a?r-a:0;while(--n);i+=a}if(0===t.strm.avail_in)break;if(n=c(t.strm,t.window,t.strstart+t.lookahead,i),t.lookahead+=n,t.lookahead+t.insert>=st)for(o=t.strstart-t.insert,t.ins_h=t.window[o],t.ins_h=(t.ins_h<<t.hash_shift^t.window[o+1])&t.hash_mask;t.insert&&(t.ins_h=(t.ins_h<<t.hash_shift^t.window[o+st-1])&t.hash_mask,t.prev[o&t.w_mask]=t.head[t.ins_h],t.head[t.ins_h]=o,o++,t.insert--,!(t.lookahead+t.insert<st)););}while(t.lookahead<ut&&0!==t.strm.avail_in)}function d(t,e){var n=65535;for(n>t.pending_buf_size-5&&(n=t.pending_buf_size-5);;){if(t.lookahead<=1){if(f(t),0===t.lookahead&&e===O)return yt;if(0===t.lookahead)break}t.strstart+=t.lookahead,t.lookahead=0;var r=t.block_start+n;if((0===t.strstart||t.strstart>=r)&&(t.lookahead=t.strstart-r,t.strstart=r,s(t,!1),0===t.strm.avail_out))return yt;if(t.strstart-t.block_start>=t.w_size-ut&&(s(t,!1),0===t.strm.avail_out))return yt}return t.insert=0,e===U?(s(t,!0),0===t.strm.avail_out?wt:bt):t.strstart>t.block_start&&(s(t,!1),0===t.strm.avail_out)?yt:yt}function p(t,e){for(var n,r;;){if(t.lookahead<ut){if(f(t),t.lookahead<ut&&e===O)return yt;if(0===t.lookahead)break}if(n=0,t.lookahead>=st&&(t.ins_h=(t.ins_h<<t.hash_shift^t.window[t.strstart+st-1])&t.hash_mask,n=t.prev[t.strstart&t.w_mask]=t.head[t.ins_h],t.head[t.ins_h]=t.strstart),0!==n&&t.strstart-n<=t.w_size-ut&&(t.match_length=l(t,n)),t.match_length>=st)if(r=L._tr_tally(t,t.strstart-t.match_start,t.match_length-st),t.lookahead-=t.match_length,t.match_length<=t.max_lazy_match&&t.lookahead>=st){t.match_length--;do t.strstart++,t.ins_h=(t.ins_h<<t.hash_shift^t.window[t.strstart+st-1])&t.hash_mask,n=t.prev[t.strstart&t.w_mask]=t.head[t.ins_h],t.head[t.ins_h]=t.strstart;while(0!==--t.match_length);t.strstart++}else t.strstart+=t.match_length,t.match_length=0,t.ins_h=t.window[t.strstart],t.ins_h=(t.ins_h<<t.hash_shift^t.window[t.strstart+1])&t.hash_mask;else r=L._tr_tally(t,0,t.window[t.strstart]),t.lookahead--,t.strstart++;if(r&&(s(t,!1),0===t.strm.avail_out))return yt}return t.insert=t.strstart<st-1?t.strstart:st-1,e===U?(s(t,!0),0===t.strm.avail_out?wt:bt):t.last_lit&&(s(t,!1),0===t.strm.avail_out)?yt:_t}function g(t,e){for(var n,r,i;;){if(t.lookahead<ut){if(f(t),t.lookahead<ut&&e===O)return yt;if(0===t.lookahead)break}if(n=0,t.lookahead>=st&&(t.ins_h=(t.ins_h<<t.hash_shift^t.window[t.strstart+st-1])&t.hash_mask,n=t.prev[t.strstart&t.w_mask]=t.head[t.ins_h],t.head[t.ins_h]=t.strstart),t.prev_length=t.match_length,t.prev_match=t.match_start,t.match_length=st-1,0!==n&&t.prev_length<t.max_lazy_match&&t.strstart-n<=t.w_size-ut&&(t.match_length=l(t,n),t.match_length<=5&&(t.strategy===Z||t.match_length===st&&t.strstart-t.match_start>4096)&&(t.match_length=st-1)),t.prev_length>=st&&t.match_length<=t.prev_length){i=t.strstart+t.lookahead-st,r=L._tr_tally(t,t.strstart-1-t.prev_match,t.prev_length-st),t.lookahead-=t.prev_length-1,t.prev_length-=2;do++t.strstart<=i&&(t.ins_h=(t.ins_h<<t.hash_shift^t.window[t.strstart+st-1])&t.hash_mask,n=t.prev[t.strstart&t.w_mask]=t.head[t.ins_h],t.head[t.ins_h]=t.strstart);while(0!==--t.prev_length);if(t.match_available=0,t.match_length=st-1,t.strstart++,r&&(s(t,!1),0===t.strm.avail_out))return yt}else if(t.match_available){if(r=L._tr_tally(t,0,t.window[t.strstart-1]),r&&s(t,!1),t.strstart++,t.lookahead--,0===t.strm.avail_out)return yt}else t.match_available=1,t.strstart++,t.lookahead--}return t.match_available&&(r=L._tr_tally(t,0,t.window[t.strstart-1]),t.match_available=0),t.insert=t.strstart<st-1?t.strstart:st-1,e===U?(s(t,!0),0===t.strm.avail_out?wt:bt):t.last_lit&&(s(t,!1),0===t.strm.avail_out)?yt:_t}function v(t,e){for(var n,r,i,o,a=t.window;;){if(t.lookahead<=ht){if(f(t),t.lookahead<=ht&&e===O)return yt;if(0===t.lookahead)break}if(t.match_length=0,t.lookahead>=st&&t.strstart>0&&(i=t.strstart-1,r=a[i],r===a[++i]&&r===a[++i]&&r===a[++i])){o=t.strstart+ht;do;while(r===a[++i]&&r===a[++i]&&r===a[++i]&&r===a[++i]&&r===a[++i]&&r===a[++i]&&r===a[++i]&&r===a[++i]&&o>i);t.match_length=ht-(o-i),t.match_length>t.lookahead&&(t.match_length=t.lookahead)}if(t.match_length>=st?(n=L._tr_tally(t,1,t.match_length-st),t.lookahead-=t.match_length,t.strstart+=t.match_length,t.match_length=0):(n=L._tr_tally(t,0,t.window[t.strstart]),t.lookahead--,t.strstart++),n&&(s(t,!1),0===t.strm.avail_out))return yt}return t.insert=0,e===U?(s(t,!0),0===t.strm.avail_out?wt:bt):t.last_lit&&(s(t,!1),0===t.strm.avail_out)?yt:_t}function m(t,e){for(var n;;){if(0===t.lookahead&&(f(t),0===t.lookahead)){if(e===O)return yt;break}if(t.match_length=0,n=L._tr_tally(t,0,t.window[t.strstart]),t.lookahead--,t.strstart++,n&&(s(t,!1),0===t.strm.avail_out))return yt}return t.insert=0,e===U?(s(t,!0),0===t.strm.avail_out?wt:bt):t.last_lit&&(s(t,!1),0===t.strm.avail_out)?yt:_t}function y(t){t.window_size=2*t.w_size,o(t.head),t.max_lazy_match=I[t.level].max_lazy,t.good_match=I[t.level].good_length,t.nice_match=I[t.level].nice_length,t.max_chain_length=I[t.level].max_chain,t.strstart=0,t.block_start=0,t.lookahead=0,t.insert=0,t.match_length=t.prev_length=st-1,t.match_available=0,t.ins_h=0}function _(){this.strm=null,this.status=0,this.pending_buf=null,this.pending_buf_size=0,this.pending_out=0,this.pending=0,this.wrap=0,this.gzhead=null,this.gzindex=0,this.method=V,this.last_flush=-1,this.w_size=0,this.w_bits=0,this.w_mask=0,this.window=null,this.window_size=0,this.prev=null,this.head=null,this.ins_h=0,this.hash_size=0,this.hash_bits=0,this.hash_mask=0,this.hash_shift=0,this.block_start=0,this.match_length=0,this.prev_match=0,this.match_available=0,this.strstart=0,this.match_start=0,this.lookahead=0,this.prev_length=0,this.max_chain_length=0,this.max_lazy_match=0,this.level=0,this.strategy=0,this.good_match=0,this.nice_match=0,this.dyn_ltree=new A.Buf16(2*ot),this.dyn_dtree=new A.Buf16(2*(2*rt+1)),this.bl_tree=new A.Buf16(2*(2*it+1)),o(this.dyn_ltree),o(this.dyn_dtree),o(this.bl_tree),this.l_desc=null,this.d_desc=null,this.bl_desc=null,this.bl_count=new A.Buf16(at+1),this.heap=new A.Buf16(2*nt+1),o(this.heap),this.heap_len=0,this.heap_max=0,this.depth=new A.Buf16(2*nt+1),o(this.depth),this.l_buf=0,this.lit_bufsize=0,this.last_lit=0,this.d_buf=0,this.opt_len=0,this.static_len=0,this.matches=0,this.insert=0,this.bi_buf=0,this.bi_valid=0}function w(t){var e;return t&&t.state?(t.total_in=t.total_out=0,t.data_type=X,e=t.state,e.pending=0,e.pending_out=0,e.wrap<0&&(e.wrap=-e.wrap),e.status=e.wrap?lt:vt,t.adler=2===e.wrap?0:1,e.last_flush=O,L._tr_init(e),z):r(t,W)}function b(t){var e=w(t);return e===z&&y(t.state),e}function x(t,e){return t&&t.state?2!==t.state.wrap?W:(t.state.gzhead=e,z):W}function S(t,e,n,i,o,a){if(!t)return W;var s=1;if(e===H&&(e=6),0>i?(s=0,i=-i):i>15&&(s=2,i-=16),1>o||o>$||n!==V||8>i||i>15||0>e||e>9||0>a||a>q)return r(t,W);8===i&&(i=9);var h=new _;return t.state=h,h.strm=t,h.wrap=s,h.gzhead=null,h.w_bits=i,h.w_size=1<<h.w_bits,h.w_mask=h.w_size-1,h.hash_bits=o+7,h.hash_size=1<<h.hash_bits,h.hash_mask=h.hash_size-1,h.hash_shift=~~((h.hash_bits+st-1)/st),h.window=new A.Buf8(2*h.w_size),h.head=new A.Buf16(h.hash_size),h.prev=new A.Buf16(h.w_size),h.lit_bufsize=1<<o+6,h.pending_buf_size=4*h.lit_bufsize,h.pending_buf=new A.Buf8(h.pending_buf_size),h.d_buf=h.lit_bufsize>>1,h.l_buf=3*h.lit_bufsize,h.level=e,h.strategy=a,h.method=n,b(t)}function k(t,e){return S(t,e,V,J,Q,K)}function E(t,e){var n,s,c,l;if(!t||!t.state||e>P||0>e)return t?r(t,W):W;if(s=t.state,!t.output||!t.input&&0!==t.avail_in||s.status===mt&&e!==U)return r(t,0===t.avail_out?j:W);if(s.strm=t,n=s.last_flush,s.last_flush=e,s.status===lt)if(2===s.wrap)t.adler=0,h(s,31),h(s,139),h(s,8),s.gzhead?(h(s,(s.gzhead.text?1:0)+(s.gzhead.hcrc?2:0)+(s.gzhead.extra?4:0)+(s.gzhead.name?8:0)+(s.gzhead.comment?16:0)),h(s,255&s.gzhead.time),h(s,s.gzhead.time>>8&255),h(s,s.gzhead.time>>16&255),h(s,s.gzhead.time>>24&255),h(s,9===s.level?2:s.strategy>=G||s.level<2?4:0),h(s,255&s.gzhead.os),s.gzhead.extra&&s.gzhead.extra.length&&(h(s,255&s.gzhead.extra.length),h(s,s.gzhead.extra.length>>8&255)),s.gzhead.hcrc&&(t.adler=T(t.adler,s.pending_buf,s.pending,0)),s.gzindex=0,s.status=ft):(h(s,0),h(s,0),h(s,0),h(s,0),h(s,0),h(s,9===s.level?2:s.strategy>=G||s.level<2?4:0),h(s,xt),s.status=vt);else{var f=V+(s.w_bits-8<<4)<<8,d=-1;d=s.strategy>=G||s.level<2?0:s.level<6?1:6===s.level?2:3,f|=d<<6,0!==s.strstart&&(f|=ct),f+=31-f%31,s.status=vt,u(s,f),0!==s.strstart&&(u(s,t.adler>>>16),u(s,65535&t.adler)),t.adler=1}if(s.status===ft)if(s.gzhead.extra){for(c=s.pending;s.gzindex<(65535&s.gzhead.extra.length)&&(s.pending!==s.pending_buf_size||(s.gzhead.hcrc&&s.pending>c&&(t.adler=T(t.adler,s.pending_buf,s.pending-c,c)),a(t),c=s.pending,s.pending!==s.pending_buf_size));)h(s,255&s.gzhead.extra[s.gzindex]),s.gzindex++;s.gzhead.hcrc&&s.pending>c&&(t.adler=T(t.adler,s.pending_buf,s.pending-c,c)),s.gzindex===s.gzhead.extra.length&&(s.gzindex=0,s.status=dt)}else s.status=dt;if(s.status===dt)if(s.gzhead.name){c=s.pending;do{if(s.pending===s.pending_buf_size&&(s.gzhead.hcrc&&s.pending>c&&(t.adler=T(t.adler,s.pending_buf,s.pending-c,c)),a(t),c=s.pending,s.pending===s.pending_buf_size)){l=1;break}l=s.gzindex<s.gzhead.name.length?255&s.gzhead.name.charCodeAt(s.gzindex++):0,h(s,l)}while(0!==l);s.gzhead.hcrc&&s.pending>c&&(t.adler=T(t.adler,s.pending_buf,s.pending-c,c)),0===l&&(s.gzindex=0,s.status=pt)}else s.status=pt;if(s.status===pt)if(s.gzhead.comment){c=s.pending;do{if(s.pending===s.pending_buf_size&&(s.gzhead.hcrc&&s.pending>c&&(t.adler=T(t.adler,s.pending_buf,s.pending-c,c)),a(t),c=s.pending,s.pending===s.pending_buf_size)){l=1;break}l=s.gzindex<s.gzhead.comment.length?255&s.gzhead.comment.charCodeAt(s.gzindex++):0,h(s,l)}while(0!==l);s.gzhead.hcrc&&s.pending>c&&(t.adler=T(t.adler,s.pending_buf,s.pending-c,c)),0===l&&(s.status=gt)}else s.status=gt;if(s.status===gt&&(s.gzhead.hcrc?(s.pending+2>s.pending_buf_size&&a(t),s.pending+2<=s.pending_buf_size&&(h(s,255&t.adler),h(s,t.adler>>8&255),t.adler=0,s.status=vt)):s.status=vt),0!==s.pending){if(a(t),0===t.avail_out)return s.last_flush=-1,z}else if(0===t.avail_in&&i(e)<=i(n)&&e!==U)return r(t,j);if(s.status===mt&&0!==t.avail_in)return r(t,j);if(0!==t.avail_in||0!==s.lookahead||e!==O&&s.status!==mt){var p=s.strategy===G?m(s,e):s.strategy===Y?v(s,e):I[s.level].func(s,e);if((p===wt||p===bt)&&(s.status=mt),p===yt||p===wt)return 0===t.avail_out&&(s.last_flush=-1),z;if(p===_t&&(e===M?L._tr_align(s):e!==P&&(L._tr_stored_block(s,0,0,!1),e===D&&(o(s.head),0===s.lookahead&&(s.strstart=0,s.block_start=0,s.insert=0))),a(t),0===t.avail_out))return s.last_flush=-1,z}return e!==U?z:s.wrap<=0?F:(2===s.wrap?(h(s,255&t.adler),h(s,t.adler>>8&255),h(s,t.adler>>16&255),h(s,t.adler>>24&255),h(s,255&t.total_in),h(s,t.total_in>>8&255),h(s,t.total_in>>16&255),h(s,t.total_in>>24&255)):(u(s,t.adler>>>16),u(s,65535&t.adler)),a(t),s.wrap>0&&(s.wrap=-s.wrap),0!==s.pending?z:F)}function C(t){var e;return t&&t.state?(e=t.state.status,e!==lt&&e!==ft&&e!==dt&&e!==pt&&e!==gt&&e!==vt&&e!==mt?r(t,W):(t.state=null,e===vt?r(t,N):z)):W}var I,A=n(52),L=n(53),R=n(54),T=n(55),B=n(49),O=0,M=1,D=3,U=4,P=5,z=0,F=1,W=-2,N=-3,j=-5,H=-1,Z=1,G=2,Y=3,q=4,K=0,X=2,V=8,$=9,J=15,Q=8,tt=29,et=256,nt=et+1+tt,rt=30,it=19,ot=2*nt+1,at=15,st=3,ht=258,ut=ht+st+1,ct=32,lt=42,ft=69,dt=73,pt=91,gt=103,vt=113,mt=666,yt=1,_t=2,wt=3,bt=4,xt=3,St=function(t,e,n,r,i){this.good_length=t,this.max_lazy=e,this.nice_length=n,this.max_chain=r,this.func=i};I=[new St(0,0,0,0,d),new St(4,4,8,4,p),new St(4,5,16,8,p),new St(4,6,32,32,p),new St(4,4,16,16,g),new St(8,16,32,32,g),new St(8,16,128,128,g),new St(8,32,128,256,g),new St(32,128,258,1024,g),new St(32,258,258,4096,g)],e.deflateInit=k,e.deflateInit2=S,e.deflateReset=b,e.deflateResetKeep=w,e.deflateSetHeader=x,e.deflate=E,e.deflateEnd=C,e.deflateInfo="pako deflate (from Nodeca project)"},function(t,e){"use strict";var n="undefined"!=typeof Uint8Array&&"undefined"!=typeof Uint16Array&&"undefined"!=typeof Int32Array;e.assign=function(t){for(var e=Array.prototype.slice.call(arguments,1);e.length;){var n=e.shift();if(n){if("object"!=typeof n)throw new TypeError(n+"must be non-object");for(var r in n)n.hasOwnProperty(r)&&(t[r]=n[r])}}return t},e.shrinkBuf=function(t,e){return t.length===e?t:t.subarray?t.subarray(0,e):(t.length=e,t)};var r={arraySet:function(t,e,n,r,i){if(e.subarray&&t.subarray)return void t.set(e.subarray(n,n+r),i);for(var o=0;r>o;o++)t[i+o]=e[n+o]},flattenChunks:function(t){var e,n,r,i,o,a;for(r=0,e=0,n=t.length;n>e;e++)r+=t[e].length;for(a=new Uint8Array(r),i=0,e=0,n=t.length;n>e;e++)o=t[e],a.set(o,i),i+=o.length;return a}},i={arraySet:function(t,e,n,r,i){for(var o=0;r>o;o++)t[i+o]=e[n+o]},flattenChunks:function(t){return[].concat.apply([],t)}};e.setTyped=function(t){t?(e.Buf8=Uint8Array,e.Buf16=Uint16Array,e.Buf32=Int32Array,e.assign(e,r)):(e.Buf8=Array,e.Buf16=Array,e.Buf32=Array,e.assign(e,i))},e.setTyped(n)},function(t,e,n){"use strict";function r(t){for(var e=t.length;--e>=0;)t[e]=0}function i(t){return 256>t?at[t]:at[256+(t>>>7)]}function o(t,e){t.pending_buf[t.pending++]=255&e,t.pending_buf[t.pending++]=e>>>8&255}function a(t,e,n){t.bi_valid>q-n?(t.bi_buf|=e<<t.bi_valid&65535,o(t,t.bi_buf),t.bi_buf=e>>q-t.bi_valid,t.bi_valid+=n-q):(t.bi_buf|=e<<t.bi_valid&65535,t.bi_valid+=n)}function s(t,e,n){a(t,n[2*e],n[2*e+1])}function h(t,e){var n=0;do n|=1&t,t>>>=1,n<<=1;while(--e>0);return n>>>1}function u(t){16===t.bi_valid?(o(t,t.bi_buf),t.bi_buf=0,t.bi_valid=0):t.bi_valid>=8&&(t.pending_buf[t.pending++]=255&t.bi_buf,t.bi_buf>>=8,t.bi_valid-=8)}function c(t,e){var n,r,i,o,a,s,h=e.dyn_tree,u=e.max_code,c=e.stat_desc.static_tree,l=e.stat_desc.has_stree,f=e.stat_desc.extra_bits,d=e.stat_desc.extra_base,p=e.stat_desc.max_length,g=0;for(o=0;Y>=o;o++)t.bl_count[o]=0;for(h[2*t.heap[t.heap_max]+1]=0,n=t.heap_max+1;G>n;n++)r=t.heap[n],o=h[2*h[2*r+1]+1]+1,o>p&&(o=p,g++),h[2*r+1]=o,r>u||(t.bl_count[o]++,a=0,r>=d&&(a=f[r-d]),s=h[2*r],t.opt_len+=s*(o+a),l&&(t.static_len+=s*(c[2*r+1]+a)));if(0!==g){do{for(o=p-1;0===t.bl_count[o];)o--;t.bl_count[o]--,t.bl_count[o+1]+=2,t.bl_count[p]--,g-=2}while(g>0);for(o=p;0!==o;o--)for(r=t.bl_count[o];0!==r;)i=t.heap[--n],i>u||(h[2*i+1]!==o&&(t.opt_len+=(o-h[2*i+1])*h[2*i],h[2*i+1]=o),r--)}}function l(t,e,n){var r,i,o=new Array(Y+1),a=0;for(r=1;Y>=r;r++)o[r]=a=a+n[r-1]<<1;for(i=0;e>=i;i++){var s=t[2*i+1];0!==s&&(t[2*i]=h(o[s]++,s))}}function f(){var t,e,n,r,i,o=new Array(Y+1);for(n=0,r=0;W-1>r;r++)for(ht[r]=n,t=0;t<1<<Q[r];t++)st[n++]=r;for(st[n-1]=r,i=0,r=0;16>r;r++)for(ut[r]=i,t=0;t<1<<tt[r];t++)at[i++]=r;for(i>>=7;H>r;r++)for(ut[r]=i<<7,t=0;t<1<<tt[r]-7;t++)at[256+i++]=r;for(e=0;Y>=e;e++)o[e]=0;for(t=0;143>=t;)it[2*t+1]=8,t++,o[8]++;for(;255>=t;)it[2*t+1]=9,t++,o[9]++;for(;279>=t;)it[2*t+1]=7,t++,o[7]++;for(;287>=t;)it[2*t+1]=8,t++,o[8]++;for(l(it,j+1,o),t=0;H>t;t++)ot[2*t+1]=5,ot[2*t]=h(t,5);ct=new dt(it,Q,N+1,j,Y),lt=new dt(ot,tt,0,H,Y),ft=new dt(new Array(0),et,0,Z,K)}function d(t){var e;for(e=0;j>e;e++)t.dyn_ltree[2*e]=0;for(e=0;H>e;e++)t.dyn_dtree[2*e]=0;for(e=0;Z>e;e++)t.bl_tree[2*e]=0;t.dyn_ltree[2*X]=1,t.opt_len=t.static_len=0,t.last_lit=t.matches=0}function p(t){t.bi_valid>8?o(t,t.bi_buf):t.bi_valid>0&&(t.pending_buf[t.pending++]=t.bi_buf),t.bi_buf=0,t.bi_valid=0}function g(t,e,n,r){p(t),r&&(o(t,n),o(t,~n)),R.arraySet(t.pending_buf,t.window,e,n,t.pending),t.pending+=n}function v(t,e,n,r){var i=2*e,o=2*n;return t[i]<t[o]||t[i]===t[o]&&r[e]<=r[n]}function m(t,e,n){for(var r=t.heap[n],i=n<<1;i<=t.heap_len&&(i<t.heap_len&&v(e,t.heap[i+1],t.heap[i],t.depth)&&i++,!v(e,r,t.heap[i],t.depth));)t.heap[n]=t.heap[i],n=i,i<<=1;t.heap[n]=r}function y(t,e,n){var r,o,h,u,c=0;if(0!==t.last_lit)do r=t.pending_buf[t.d_buf+2*c]<<8|t.pending_buf[t.d_buf+2*c+1],o=t.pending_buf[t.l_buf+c],c++,0===r?s(t,o,e):(h=st[o],s(t,h+N+1,e),u=Q[h],0!==u&&(o-=ht[h],a(t,o,u)),r--,h=i(r),s(t,h,n),u=tt[h],0!==u&&(r-=ut[h],a(t,r,u)));while(c<t.last_lit);s(t,X,e)}function _(t,e){var n,r,i,o=e.dyn_tree,a=e.stat_desc.static_tree,s=e.stat_desc.has_stree,h=e.stat_desc.elems,u=-1;for(t.heap_len=0,t.heap_max=G,n=0;h>n;n++)0!==o[2*n]?(t.heap[++t.heap_len]=u=n,t.depth[n]=0):o[2*n+1]=0;for(;t.heap_len<2;)i=t.heap[++t.heap_len]=2>u?++u:0,o[2*i]=1,t.depth[i]=0,t.opt_len--,s&&(t.static_len-=a[2*i+1]);for(e.max_code=u,n=t.heap_len>>1;n>=1;n--)m(t,o,n);i=h;do n=t.heap[1],t.heap[1]=t.heap[t.heap_len--],m(t,o,1),r=t.heap[1],t.heap[--t.heap_max]=n,t.heap[--t.heap_max]=r,o[2*i]=o[2*n]+o[2*r],t.depth[i]=(t.depth[n]>=t.depth[r]?t.depth[n]:t.depth[r])+1,o[2*n+1]=o[2*r+1]=i,t.heap[1]=i++,m(t,o,1);while(t.heap_len>=2);t.heap[--t.heap_max]=t.heap[1],c(t,e),l(o,u,t.bl_count)}function w(t,e,n){var r,i,o=-1,a=e[1],s=0,h=7,u=4;for(0===a&&(h=138,u=3),e[2*(n+1)+1]=65535,r=0;n>=r;r++)i=a,a=e[2*(r+1)+1],++s<h&&i===a||(u>s?t.bl_tree[2*i]+=s:0!==i?(i!==o&&t.bl_tree[2*i]++,t.bl_tree[2*V]++):10>=s?t.bl_tree[2*$]++:t.bl_tree[2*J]++,s=0,o=i,0===a?(h=138,u=3):i===a?(h=6,u=3):(h=7,u=4))}function b(t,e,n){var r,i,o=-1,h=e[1],u=0,c=7,l=4;for(0===h&&(c=138,l=3),r=0;n>=r;r++)if(i=h,h=e[2*(r+1)+1],!(++u<c&&i===h)){if(l>u){do s(t,i,t.bl_tree);while(0!==--u)}else 0!==i?(i!==o&&(s(t,i,t.bl_tree),u--),s(t,V,t.bl_tree),a(t,u-3,2)):10>=u?(s(t,$,t.bl_tree),a(t,u-3,3)):(s(t,J,t.bl_tree),a(t,u-11,7));u=0,o=i,0===h?(c=138,l=3):i===h?(c=6,l=3):(c=7,l=4)}}function x(t){var e;for(w(t,t.dyn_ltree,t.l_desc.max_code),w(t,t.dyn_dtree,t.d_desc.max_code),_(t,t.bl_desc),e=Z-1;e>=3&&0===t.bl_tree[2*nt[e]+1];e--);return t.opt_len+=3*(e+1)+5+5+4,e}function S(t,e,n,r){var i;for(a(t,e-257,5),a(t,n-1,5),a(t,r-4,4),i=0;r>i;i++)a(t,t.bl_tree[2*nt[i]+1],3);b(t,t.dyn_ltree,e-1),b(t,t.dyn_dtree,n-1)}function k(t){var e,n=4093624447;for(e=0;31>=e;e++,n>>>=1)if(1&n&&0!==t.dyn_ltree[2*e])return B;if(0!==t.dyn_ltree[18]||0!==t.dyn_ltree[20]||0!==t.dyn_ltree[26])return O;for(e=32;N>e;e++)if(0!==t.dyn_ltree[2*e])return O;return B}function E(t){gt||(f(),gt=!0),t.l_desc=new pt(t.dyn_ltree,ct),t.d_desc=new pt(t.dyn_dtree,lt),t.bl_desc=new pt(t.bl_tree,ft),t.bi_buf=0,t.bi_valid=0,d(t)}function C(t,e,n,r){a(t,(D<<1)+(r?1:0),3),g(t,e,n,!0)}function I(t){a(t,U<<1,3),s(t,X,it),u(t)}function A(t,e,n,r){var i,o,s=0;t.level>0?(t.strm.data_type===M&&(t.strm.data_type=k(t)),_(t,t.l_desc),_(t,t.d_desc),s=x(t),i=t.opt_len+3+7>>>3,o=t.static_len+3+7>>>3,i>=o&&(i=o)):i=o=n+5,i>=n+4&&-1!==e?C(t,e,n,r):t.strategy===T||o===i?(a(t,(U<<1)+(r?1:0),3),y(t,it,ot)):(a(t,(P<<1)+(r?1:0),3),S(t,t.l_desc.max_code+1,t.d_desc.max_code+1,s+1),y(t,t.dyn_ltree,t.dyn_dtree)),d(t),r&&p(t)}function L(t,e,n){return t.pending_buf[t.d_buf+2*t.last_lit]=e>>>8&255,t.pending_buf[t.d_buf+2*t.last_lit+1]=255&e,t.pending_buf[t.l_buf+t.last_lit]=255&n,t.last_lit++,0===e?t.dyn_ltree[2*n]++:(t.matches++,e--,t.dyn_ltree[2*(st[n]+N+1)]++,t.dyn_dtree[2*i(e)]++),t.last_lit===t.lit_bufsize-1}var R=n(52),T=4,B=0,O=1,M=2,D=0,U=1,P=2,z=3,F=258,W=29,N=256,j=N+1+W,H=30,Z=19,G=2*j+1,Y=15,q=16,K=7,X=256,V=16,$=17,J=18,Q=[0,0,0,0,0,0,0,0,1,1,1,1,2,2,2,2,3,3,3,3,4,4,4,4,5,5,5,5,0],tt=[0,0,0,0,1,1,2,2,3,3,4,4,5,5,6,6,7,7,8,8,9,9,10,10,11,11,12,12,13,13],et=[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,3,7],nt=[16,17,18,0,8,7,9,6,10,5,11,4,12,3,13,2,14,1,15],rt=512,it=new Array(2*(j+2));r(it);var ot=new Array(2*H);r(ot);var at=new Array(rt);r(at);var st=new Array(F-z+1);r(st);var ht=new Array(W);r(ht);var ut=new Array(H);r(ut);var ct,lt,ft,dt=function(t,e,n,r,i){this.static_tree=t,this.extra_bits=e,this.extra_base=n,this.elems=r,this.max_length=i,this.has_stree=t&&t.length},pt=function(t,e){this.dyn_tree=t,this.max_code=0,this.stat_desc=e},gt=!1;e._tr_init=E,e._tr_stored_block=C,e._tr_flush_block=A,e._tr_tally=L,e._tr_align=I},function(t,e){"use strict";function n(t,e,n,r){for(var i=65535&t|0,o=t>>>16&65535|0,a=0;0!==n;){a=n>2e3?2e3:n,n-=a;do i=i+e[r++]|0,o=o+i|0;while(--a);i%=65521,o%=65521}return i|o<<16|0}t.exports=n},function(t,e){"use strict";function n(){for(var t,e=[],n=0;256>n;n++){t=n;for(var r=0;8>r;r++)t=1&t?3988292384^t>>>1:t>>>1;e[n]=t}return e}function r(t,e,n,r){var o=i,a=r+n;t=-1^t;for(var s=r;a>s;s++)t=t>>>8^o[255&(t^e[s])];return-1^t}var i=n();t.exports=r},function(t,e,n){"use strict";function r(t){return(t>>>24&255)+(t>>>8&65280)+((65280&t)<<8)+((255&t)<<24)}function i(){this.mode=0,this.last=!1,this.wrap=0,this.havedict=!1,this.flags=0,this.dmax=0,this.check=0,this.total=0,this.head=null,this.wbits=0,this.wsize=0,this.whave=0,this.wnext=0,this.window=null,this.hold=0,this.bits=0,this.length=0,this.offset=0,this.extra=0,this.lencode=null,this.distcode=null,this.lenbits=0,this.distbits=0,this.ncode=0,this.nlen=0,this.ndist=0,this.have=0,this.next=null,this.lens=new m.Buf16(320),this.work=new m.Buf16(288),this.lendyn=null,this.distdyn=null,this.sane=0,this.back=0,this.was=0}function o(t){var e;return t&&t.state?(e=t.state,t.total_in=t.total_out=e.total=0,t.msg="",e.wrap&&(t.adler=1&e.wrap),e.mode=U,e.last=0,e.havedict=0,e.dmax=32768,e.head=null,e.hold=0,e.bits=0,e.lencode=e.lendyn=new m.Buf32(pt),e.distcode=e.distdyn=new m.Buf32(gt),e.sane=1,e.back=-1,A):T}function a(t){var e;return t&&t.state?(e=t.state,e.wsize=0,e.whave=0,e.wnext=0,o(t)):T}function s(t,e){var n,r;return t&&t.state?(r=t.state,0>e?(n=0,e=-e):(n=(e>>4)+1,48>e&&(e&=15)),e&&(8>e||e>15)?T:(null!==r.window&&r.wbits!==e&&(r.window=null),r.wrap=n,r.wbits=e,a(t))):T}function h(t,e){var n,r;return t?(r=new i,t.state=r,r.window=null,n=s(t,e),n!==A&&(t.state=null),n):T}function u(t){return h(t,mt)}function c(t){if(yt){var e;for(g=new m.Buf32(512),v=new m.Buf32(32),e=0;144>e;)t.lens[e++]=8;for(;256>e;)t.lens[e++]=9;for(;280>e;)t.lens[e++]=7;for(;288>e;)t.lens[e++]=8;for(b(S,t.lens,0,288,g,0,t.work,{bits:9}),e=0;32>e;)t.lens[e++]=5;b(k,t.lens,0,32,v,0,t.work,{bits:5}),yt=!1}t.lencode=g,t.lenbits=9,t.distcode=v,t.distbits=5}function l(t,e,n,r){var i,o=t.state;return null===o.window&&(o.wsize=1<<o.wbits,o.wnext=0,o.whave=0,o.window=new m.Buf8(o.wsize)),r>=o.wsize?(m.arraySet(o.window,e,n-o.wsize,o.wsize,0),o.wnext=0,o.whave=o.wsize):(i=o.wsize-o.wnext,i>r&&(i=r),m.arraySet(o.window,e,n-r,i,o.wnext),r-=i,r?(m.arraySet(o.window,e,n-r,r,0),o.wnext=r,o.whave=o.wsize):(o.wnext+=i,o.wnext===o.wsize&&(o.wnext=0),o.whave<o.wsize&&(o.whave+=i))),0}function f(t,e){var n,i,o,a,s,h,u,f,d,p,g,v,pt,gt,vt,mt,yt,_t,wt,bt,xt,St,kt,Et,Ct=0,It=new m.Buf8(4),At=[16,17,18,0,8,7,9,6,10,5,11,4,12,3,13,2,14,1,15];if(!t||!t.state||!t.output||!t.input&&0!==t.avail_in)return T;n=t.state,n.mode===q&&(n.mode=K),s=t.next_out,o=t.output,u=t.avail_out,a=t.next_in,i=t.input,h=t.avail_in,f=n.hold,d=n.bits,p=h,g=u,St=A;t:for(;;)switch(n.mode){case U:if(0===n.wrap){n.mode=K;break}for(;16>d;){if(0===h)break t;h--,f+=i[a++]<<d,d+=8}if(2&n.wrap&&35615===f){n.check=0,It[0]=255&f,It[1]=f>>>8&255,n.check=_(n.check,It,2,0),f=0,d=0,n.mode=P;break}if(n.flags=0,n.head&&(n.head.done=!1),!(1&n.wrap)||(((255&f)<<8)+(f>>8))%31){t.msg="incorrect header check",n.mode=lt;break}if((15&f)!==D){t.msg="unknown compression method",n.mode=lt;break}if(f>>>=4,d-=4,xt=(15&f)+8,0===n.wbits)n.wbits=xt;else if(xt>n.wbits){t.msg="invalid window size",n.mode=lt;break}n.dmax=1<<xt,t.adler=n.check=1,n.mode=512&f?G:q,f=0,d=0;break;case P:for(;16>d;){if(0===h)break t;h--,f+=i[a++]<<d,d+=8}if(n.flags=f,(255&n.flags)!==D){t.msg="unknown compression method",n.mode=lt;break}if(57344&n.flags){t.msg="unknown header flags set",n.mode=lt;break}n.head&&(n.head.text=f>>8&1),512&n.flags&&(It[0]=255&f,It[1]=f>>>8&255,n.check=_(n.check,It,2,0)),f=0,d=0,n.mode=z;case z:for(;32>d;){if(0===h)break t;h--,f+=i[a++]<<d,d+=8}n.head&&(n.head.time=f),512&n.flags&&(It[0]=255&f,It[1]=f>>>8&255,It[2]=f>>>16&255,It[3]=f>>>24&255,n.check=_(n.check,It,4,0)),f=0,d=0,n.mode=F;case F:for(;16>d;){if(0===h)break t;h--,f+=i[a++]<<d,d+=8}n.head&&(n.head.xflags=255&f,n.head.os=f>>8),512&n.flags&&(It[0]=255&f,It[1]=f>>>8&255,n.check=_(n.check,It,2,0)),f=0,d=0,n.mode=W;case W:if(1024&n.flags){for(;16>d;){if(0===h)break t;h--,f+=i[a++]<<d,d+=8}n.length=f,n.head&&(n.head.extra_len=f),512&n.flags&&(It[0]=255&f,It[1]=f>>>8&255,n.check=_(n.check,It,2,0)),f=0,d=0}else n.head&&(n.head.extra=null);n.mode=N;case N:if(1024&n.flags&&(v=n.length,v>h&&(v=h),v&&(n.head&&(xt=n.head.extra_len-n.length,n.head.extra||(n.head.extra=new Array(n.head.extra_len)),m.arraySet(n.head.extra,i,a,v,xt)),512&n.flags&&(n.check=_(n.check,i,v,a)),h-=v,a+=v,n.length-=v),n.length))break t;n.length=0,n.mode=j;case j:if(2048&n.flags){if(0===h)break t;v=0;do xt=i[a+v++],n.head&&xt&&n.length<65536&&(n.head.name+=String.fromCharCode(xt));while(xt&&h>v);if(512&n.flags&&(n.check=_(n.check,i,v,a)),h-=v,a+=v,xt)break t}else n.head&&(n.head.name=null);n.length=0,n.mode=H;case H:if(4096&n.flags){if(0===h)break t;v=0;do xt=i[a+v++],n.head&&xt&&n.length<65536&&(n.head.comment+=String.fromCharCode(xt));while(xt&&h>v);if(512&n.flags&&(n.check=_(n.check,i,v,a)),h-=v,a+=v,xt)break t}else n.head&&(n.head.comment=null);n.mode=Z;case Z:if(512&n.flags){for(;16>d;){if(0===h)break t;h--,f+=i[a++]<<d,d+=8}if(f!==(65535&n.check)){t.msg="header crc mismatch",n.mode=lt;break}f=0,d=0}n.head&&(n.head.hcrc=n.flags>>9&1,n.head.done=!0),t.adler=n.check=0,n.mode=q;break;case G:for(;32>d;){if(0===h)break t;h--,f+=i[a++]<<d,d+=8}t.adler=n.check=r(f),f=0,d=0,n.mode=Y;case Y:if(0===n.havedict)return t.next_out=s,t.avail_out=u,t.next_in=a,t.avail_in=h,n.hold=f,n.bits=d,R;t.adler=n.check=1,n.mode=q;case q:if(e===C||e===I)break t;case K:if(n.last){f>>>=7&d,d-=7&d,n.mode=ht;break}for(;3>d;){if(0===h)break t;h--,f+=i[a++]<<d,d+=8}switch(n.last=1&f,f>>>=1,d-=1,3&f){case 0:n.mode=X;break;case 1:if(c(n),n.mode=et,e===I){f>>>=2,d-=2;break t}break;case 2:n.mode=J;break;case 3:t.msg="invalid block type",n.mode=lt}f>>>=2,d-=2;break;case X:for(f>>>=7&d,d-=7&d;32>d;){if(0===h)break t;h--,f+=i[a++]<<d,d+=8}if((65535&f)!==(f>>>16^65535)){t.msg="invalid stored block lengths",n.mode=lt;break}if(n.length=65535&f,f=0,d=0,n.mode=V,e===I)break t;case V:n.mode=$;case $:if(v=n.length){if(v>h&&(v=h),v>u&&(v=u),0===v)break t;m.arraySet(o,i,a,v,s),h-=v,a+=v,u-=v,s+=v,n.length-=v;break}n.mode=q;break;case J:for(;14>d;){if(0===h)break t;h--,f+=i[a++]<<d,d+=8}if(n.nlen=(31&f)+257,f>>>=5,d-=5,n.ndist=(31&f)+1,f>>>=5,d-=5,n.ncode=(15&f)+4,f>>>=4,d-=4,n.nlen>286||n.ndist>30){t.msg="too many length or distance symbols",n.mode=lt;break}n.have=0,n.mode=Q;case Q:for(;n.have<n.ncode;){for(;3>d;){if(0===h)break t;h--,f+=i[a++]<<d,d+=8}n.lens[At[n.have++]]=7&f,f>>>=3,d-=3}for(;n.have<19;)n.lens[At[n.have++]]=0;if(n.lencode=n.lendyn,n.lenbits=7,kt={bits:n.lenbits},St=b(x,n.lens,0,19,n.lencode,0,n.work,kt),n.lenbits=kt.bits,St){t.msg="invalid code lengths set",n.mode=lt;break}n.have=0,n.mode=tt;case tt:for(;n.have<n.nlen+n.ndist;){for(;Ct=n.lencode[f&(1<<n.lenbits)-1],vt=Ct>>>24,mt=Ct>>>16&255,yt=65535&Ct,!(d>=vt);){if(0===h)break t;h--,f+=i[a++]<<d,d+=8}if(16>yt)f>>>=vt,d-=vt,n.lens[n.have++]=yt;else{if(16===yt){for(Et=vt+2;Et>d;){if(0===h)break t;h--,f+=i[a++]<<d,d+=8}if(f>>>=vt,d-=vt,0===n.have){t.msg="invalid bit length repeat",n.mode=lt;break}xt=n.lens[n.have-1],v=3+(3&f),f>>>=2,d-=2}else if(17===yt){for(Et=vt+3;Et>d;){if(0===h)break t;h--,f+=i[a++]<<d,d+=8}f>>>=vt,d-=vt,xt=0,v=3+(7&f),f>>>=3,d-=3}else{for(Et=vt+7;Et>d;){if(0===h)break t;h--,f+=i[a++]<<d,d+=8}f>>>=vt,d-=vt,xt=0,v=11+(127&f),f>>>=7,d-=7}if(n.have+v>n.nlen+n.ndist){t.msg="invalid bit length repeat",n.mode=lt;break}for(;v--;)n.lens[n.have++]=xt}}if(n.mode===lt)break;if(0===n.lens[256]){t.msg="invalid code -- missing end-of-block",n.mode=lt;break}if(n.lenbits=9,kt={bits:n.lenbits},St=b(S,n.lens,0,n.nlen,n.lencode,0,n.work,kt),n.lenbits=kt.bits,St){t.msg="invalid literal/lengths set",n.mode=lt;break}if(n.distbits=6,n.distcode=n.distdyn,kt={bits:n.distbits},St=b(k,n.lens,n.nlen,n.ndist,n.distcode,0,n.work,kt),n.distbits=kt.bits,St){t.msg="invalid distances set",n.mode=lt;break}if(n.mode=et,e===I)break t;case et:n.mode=nt;case nt:if(h>=6&&u>=258){t.next_out=s,t.avail_out=u,t.next_in=a,t.avail_in=h,n.hold=f,n.bits=d,w(t,g),s=t.next_out,o=t.output,u=t.avail_out,a=t.next_in,i=t.input,h=t.avail_in,f=n.hold,d=n.bits,n.mode===q&&(n.back=-1);break}for(n.back=0;Ct=n.lencode[f&(1<<n.lenbits)-1],vt=Ct>>>24,mt=Ct>>>16&255,yt=65535&Ct,!(d>=vt);){if(0===h)break t;h--,f+=i[a++]<<d,d+=8}if(mt&&0===(240&mt)){for(_t=vt,wt=mt,bt=yt;Ct=n.lencode[bt+((f&(1<<_t+wt)-1)>>_t)],vt=Ct>>>24,mt=Ct>>>16&255,yt=65535&Ct,!(d>=_t+vt);){if(0===h)break t;h--,f+=i[a++]<<d,d+=8}f>>>=_t,d-=_t,n.back+=_t}if(f>>>=vt,d-=vt,n.back+=vt,n.length=yt,0===mt){n.mode=st;break}if(32&mt){n.back=-1,n.mode=q;break}if(64&mt){t.msg="invalid literal/length code",n.mode=lt;break}n.extra=15&mt,n.mode=rt;case rt:if(n.extra){for(Et=n.extra;Et>d;){if(0===h)break t;h--,f+=i[a++]<<d,d+=8}n.length+=f&(1<<n.extra)-1,f>>>=n.extra,d-=n.extra,n.back+=n.extra}n.was=n.length,n.mode=it;case it:for(;Ct=n.distcode[f&(1<<n.distbits)-1],vt=Ct>>>24,mt=Ct>>>16&255,yt=65535&Ct,!(d>=vt);){if(0===h)break t;h--,f+=i[a++]<<d,d+=8}if(0===(240&mt)){for(_t=vt,wt=mt,bt=yt;Ct=n.distcode[bt+((f&(1<<_t+wt)-1)>>_t)],vt=Ct>>>24,mt=Ct>>>16&255,yt=65535&Ct,!(d>=_t+vt);){if(0===h)break t;h--,f+=i[a++]<<d,d+=8}f>>>=_t,d-=_t,n.back+=_t}if(f>>>=vt,d-=vt,n.back+=vt,64&mt){t.msg="invalid distance code",n.mode=lt;break}n.offset=yt,n.extra=15&mt,n.mode=ot;case ot:if(n.extra){for(Et=n.extra;Et>d;){if(0===h)break t;h--,f+=i[a++]<<d,d+=8}n.offset+=f&(1<<n.extra)-1,f>>>=n.extra,d-=n.extra,n.back+=n.extra}if(n.offset>n.dmax){t.msg="invalid distance too far back",n.mode=lt;break}n.mode=at;case at:if(0===u)break t;if(v=g-u,n.offset>v){if(v=n.offset-v,v>n.whave&&n.sane){t.msg="invalid distance too far back",n.mode=lt;break}v>n.wnext?(v-=n.wnext,pt=n.wsize-v):pt=n.wnext-v,v>n.length&&(v=n.length),gt=n.window}else gt=o,pt=s-n.offset,v=n.length;v>u&&(v=u),u-=v,n.length-=v;do o[s++]=gt[pt++];while(--v);0===n.length&&(n.mode=nt);break;case st:if(0===u)break t;o[s++]=n.length,u--,n.mode=nt;break;case ht:if(n.wrap){for(;32>d;){if(0===h)break t;h--,f|=i[a++]<<d,d+=8}if(g-=u,t.total_out+=g,n.total+=g,g&&(t.adler=n.check=n.flags?_(n.check,o,g,s-g):y(n.check,o,g,s-g)),g=u,(n.flags?f:r(f))!==n.check){t.msg="incorrect data check",n.mode=lt;break}f=0,d=0}n.mode=ut;case ut:if(n.wrap&&n.flags){for(;32>d;){if(0===h)break t;h--,f+=i[a++]<<d,d+=8}if(f!==(4294967295&n.total)){t.msg="incorrect length check",n.mode=lt;break}f=0,d=0}n.mode=ct;case ct:St=L;break t;case lt:St=B;break t;case ft:return O;case dt:default:return T}return t.next_out=s,t.avail_out=u,
t.next_in=a,t.avail_in=h,n.hold=f,n.bits=d,(n.wsize||g!==t.avail_out&&n.mode<lt&&(n.mode<ht||e!==E))&&l(t,t.output,t.next_out,g-t.avail_out)?(n.mode=ft,O):(p-=t.avail_in,g-=t.avail_out,t.total_in+=p,t.total_out+=g,n.total+=g,n.wrap&&g&&(t.adler=n.check=n.flags?_(n.check,o,g,t.next_out-g):y(n.check,o,g,t.next_out-g)),t.data_type=n.bits+(n.last?64:0)+(n.mode===q?128:0)+(n.mode===et||n.mode===V?256:0),(0===p&&0===g||e===E)&&St===A&&(St=M),St)}function d(t){if(!t||!t.state)return T;var e=t.state;return e.window&&(e.window=null),t.state=null,A}function p(t,e){var n;return t&&t.state?(n=t.state,0===(2&n.wrap)?T:(n.head=e,e.done=!1,A)):T}var g,v,m=n(52),y=n(54),_=n(55),w=n(57),b=n(58),x=0,S=1,k=2,E=4,C=5,I=6,A=0,L=1,R=2,T=-2,B=-3,O=-4,M=-5,D=8,U=1,P=2,z=3,F=4,W=5,N=6,j=7,H=8,Z=9,G=10,Y=11,q=12,K=13,X=14,V=15,$=16,J=17,Q=18,tt=19,et=20,nt=21,rt=22,it=23,ot=24,at=25,st=26,ht=27,ut=28,ct=29,lt=30,ft=31,dt=32,pt=852,gt=592,vt=15,mt=vt,yt=!0;e.inflateReset=a,e.inflateReset2=s,e.inflateResetKeep=o,e.inflateInit=u,e.inflateInit2=h,e.inflate=f,e.inflateEnd=d,e.inflateGetHeader=p,e.inflateInfo="pako inflate (from Nodeca project)"},function(t,e){"use strict";var n=30,r=12;t.exports=function(t,e){var i,o,a,s,h,u,c,l,f,d,p,g,v,m,y,_,w,b,x,S,k,E,C,I,A;i=t.state,o=t.next_in,I=t.input,a=o+(t.avail_in-5),s=t.next_out,A=t.output,h=s-(e-t.avail_out),u=s+(t.avail_out-257),c=i.dmax,l=i.wsize,f=i.whave,d=i.wnext,p=i.window,g=i.hold,v=i.bits,m=i.lencode,y=i.distcode,_=(1<<i.lenbits)-1,w=(1<<i.distbits)-1;t:do{15>v&&(g+=I[o++]<<v,v+=8,g+=I[o++]<<v,v+=8),b=m[g&_];e:for(;;){if(x=b>>>24,g>>>=x,v-=x,x=b>>>16&255,0===x)A[s++]=65535&b;else{if(!(16&x)){if(0===(64&x)){b=m[(65535&b)+(g&(1<<x)-1)];continue e}if(32&x){i.mode=r;break t}t.msg="invalid literal/length code",i.mode=n;break t}S=65535&b,x&=15,x&&(x>v&&(g+=I[o++]<<v,v+=8),S+=g&(1<<x)-1,g>>>=x,v-=x),15>v&&(g+=I[o++]<<v,v+=8,g+=I[o++]<<v,v+=8),b=y[g&w];n:for(;;){if(x=b>>>24,g>>>=x,v-=x,x=b>>>16&255,!(16&x)){if(0===(64&x)){b=y[(65535&b)+(g&(1<<x)-1)];continue n}t.msg="invalid distance code",i.mode=n;break t}if(k=65535&b,x&=15,x>v&&(g+=I[o++]<<v,v+=8,x>v&&(g+=I[o++]<<v,v+=8)),k+=g&(1<<x)-1,k>c){t.msg="invalid distance too far back",i.mode=n;break t}if(g>>>=x,v-=x,x=s-h,k>x){if(x=k-x,x>f&&i.sane){t.msg="invalid distance too far back",i.mode=n;break t}if(E=0,C=p,0===d){if(E+=l-x,S>x){S-=x;do A[s++]=p[E++];while(--x);E=s-k,C=A}}else if(x>d){if(E+=l+d-x,x-=d,S>x){S-=x;do A[s++]=p[E++];while(--x);if(E=0,S>d){x=d,S-=x;do A[s++]=p[E++];while(--x);E=s-k,C=A}}}else if(E+=d-x,S>x){S-=x;do A[s++]=p[E++];while(--x);E=s-k,C=A}for(;S>2;)A[s++]=C[E++],A[s++]=C[E++],A[s++]=C[E++],S-=3;S&&(A[s++]=C[E++],S>1&&(A[s++]=C[E++]))}else{E=s-k;do A[s++]=A[E++],A[s++]=A[E++],A[s++]=A[E++],S-=3;while(S>2);S&&(A[s++]=A[E++],S>1&&(A[s++]=A[E++]))}break}}break}}while(a>o&&u>s);S=v>>3,o-=S,v-=S<<3,g&=(1<<v)-1,t.next_in=o,t.next_out=s,t.avail_in=a>o?5+(a-o):5-(o-a),t.avail_out=u>s?257+(u-s):257-(s-u),i.hold=g,i.bits=v}},function(t,e,n){"use strict";var r=n(52),i=15,o=852,a=592,s=0,h=1,u=2,c=[3,4,5,6,7,8,9,10,11,13,15,17,19,23,27,31,35,43,51,59,67,83,99,115,131,163,195,227,258,0,0],l=[16,16,16,16,16,16,16,16,17,17,17,17,18,18,18,18,19,19,19,19,20,20,20,20,21,21,21,21,16,72,78],f=[1,2,3,4,5,7,9,13,17,25,33,49,65,97,129,193,257,385,513,769,1025,1537,2049,3073,4097,6145,8193,12289,16385,24577,0,0],d=[16,16,16,16,17,17,18,18,19,19,20,20,21,21,22,22,23,23,24,24,25,25,26,26,27,27,28,28,29,29,64,64];t.exports=function(t,e,n,p,g,v,m,y){var _,w,b,x,S,k,E,C,I,A=y.bits,L=0,R=0,T=0,B=0,O=0,M=0,D=0,U=0,P=0,z=0,F=null,W=0,N=new r.Buf16(i+1),j=new r.Buf16(i+1),H=null,Z=0;for(L=0;i>=L;L++)N[L]=0;for(R=0;p>R;R++)N[e[n+R]]++;for(O=A,B=i;B>=1&&0===N[B];B--);if(O>B&&(O=B),0===B)return g[v++]=20971520,g[v++]=20971520,y.bits=1,0;for(T=1;B>T&&0===N[T];T++);for(T>O&&(O=T),U=1,L=1;i>=L;L++)if(U<<=1,U-=N[L],0>U)return-1;if(U>0&&(t===s||1!==B))return-1;for(j[1]=0,L=1;i>L;L++)j[L+1]=j[L]+N[L];for(R=0;p>R;R++)0!==e[n+R]&&(m[j[e[n+R]]++]=R);if(t===s?(F=H=m,k=19):t===h?(F=c,W-=257,H=l,Z-=257,k=256):(F=f,H=d,k=-1),z=0,R=0,L=T,S=v,M=O,D=0,b=-1,P=1<<O,x=P-1,t===h&&P>o||t===u&&P>a)return 1;for(var G=0;;){G++,E=L-D,m[R]<k?(C=0,I=m[R]):m[R]>k?(C=H[Z+m[R]],I=F[W+m[R]]):(C=96,I=0),_=1<<L-D,w=1<<M,T=w;do w-=_,g[S+(z>>D)+w]=E<<24|C<<16|I|0;while(0!==w);for(_=1<<L-1;z&_;)_>>=1;if(0!==_?(z&=_-1,z+=_):z=0,R++,0===--N[L]){if(L===B)break;L=e[n+m[R]]}if(L>O&&(z&x)!==b){for(0===D&&(D=O),S+=T,M=L-D,U=1<<M;B>M+D&&(U-=N[M+D],!(0>=U));)M++,U<<=1;if(P+=1<<M,t===h&&P>o||t===u&&P>a)return 1;b=z&x,g[b]=O<<24|M<<16|S-v|0}}return 0!==z&&(g[S+z]=L-D<<24|64<<16|0),y.bits=O,0}},function(t,e){t.exports={Z_NO_FLUSH:0,Z_PARTIAL_FLUSH:1,Z_SYNC_FLUSH:2,Z_FULL_FLUSH:3,Z_FINISH:4,Z_BLOCK:5,Z_TREES:6,Z_OK:0,Z_STREAM_END:1,Z_NEED_DICT:2,Z_ERRNO:-1,Z_STREAM_ERROR:-2,Z_DATA_ERROR:-3,Z_BUF_ERROR:-5,Z_NO_COMPRESSION:0,Z_BEST_SPEED:1,Z_BEST_COMPRESSION:9,Z_DEFAULT_COMPRESSION:-1,Z_FILTERED:1,Z_HUFFMAN_ONLY:2,Z_RLE:3,Z_FIXED:4,Z_DEFAULT_STRATEGY:0,Z_BINARY:0,Z_TEXT:1,Z_UNKNOWN:2,Z_DEFLATED:8}},function(t,e,n){(function(t,r){function i(t,n){var r={seen:[],stylize:a};return arguments.length>=3&&(r.depth=arguments[2]),arguments.length>=4&&(r.colors=arguments[3]),g(n)?r.showHidden=n:n&&e._extend(r,n),b(r.showHidden)&&(r.showHidden=!1),b(r.depth)&&(r.depth=2),b(r.colors)&&(r.colors=!1),b(r.customInspect)&&(r.customInspect=!0),r.colors&&(r.stylize=o),h(r,t,r.depth)}function o(t,e){var n=i.styles[e];return n?"["+i.colors[n][0]+"m"+t+"["+i.colors[n][1]+"m":t}function a(t,e){return t}function s(t){var e={};return t.forEach(function(t,n){e[t]=!0}),e}function h(t,n,r){if(t.customInspect&&n&&C(n.inspect)&&n.inspect!==e.inspect&&(!n.constructor||n.constructor.prototype!==n)){var i=n.inspect(r,t);return _(i)||(i=h(t,i,r)),i}var o=u(t,n);if(o)return o;var a=Object.keys(n),g=s(a);if(t.showHidden&&(a=Object.getOwnPropertyNames(n)),E(n)&&(a.indexOf("message")>=0||a.indexOf("description")>=0))return c(n);if(0===a.length){if(C(n)){var v=n.name?": "+n.name:"";return t.stylize("[Function"+v+"]","special")}if(x(n))return t.stylize(RegExp.prototype.toString.call(n),"regexp");if(k(n))return t.stylize(Date.prototype.toString.call(n),"date");if(E(n))return c(n)}var m="",y=!1,w=["{","}"];if(p(n)&&(y=!0,w=["[","]"]),C(n)){var b=n.name?": "+n.name:"";m=" [Function"+b+"]"}if(x(n)&&(m=" "+RegExp.prototype.toString.call(n)),k(n)&&(m=" "+Date.prototype.toUTCString.call(n)),E(n)&&(m=" "+c(n)),0===a.length&&(!y||0==n.length))return w[0]+m+w[1];if(0>r)return x(n)?t.stylize(RegExp.prototype.toString.call(n),"regexp"):t.stylize("[Object]","special");t.seen.push(n);var S;return S=y?l(t,n,r,g,a):a.map(function(e){return f(t,n,r,g,e,y)}),t.seen.pop(),d(S,m,w)}function u(t,e){if(b(e))return t.stylize("undefined","undefined");if(_(e)){var n="'"+JSON.stringify(e).replace(/^"|"$/g,"").replace(/'/g,"\\'").replace(/\\"/g,'"')+"'";return t.stylize(n,"string")}return y(e)?t.stylize(""+e,"number"):g(e)?t.stylize(""+e,"boolean"):v(e)?t.stylize("null","null"):void 0}function c(t){return"["+Error.prototype.toString.call(t)+"]"}function l(t,e,n,r,i){for(var o=[],a=0,s=e.length;s>a;++a)L(e,String(a))?o.push(f(t,e,n,r,String(a),!0)):o.push("");return i.forEach(function(i){i.match(/^\d+$/)||o.push(f(t,e,n,r,i,!0))}),o}function f(t,e,n,r,i,o){var a,s,u;if(u=Object.getOwnPropertyDescriptor(e,i)||{value:e[i]},u.get?s=u.set?t.stylize("[Getter/Setter]","special"):t.stylize("[Getter]","special"):u.set&&(s=t.stylize("[Setter]","special")),L(r,i)||(a="["+i+"]"),s||(t.seen.indexOf(u.value)<0?(s=v(n)?h(t,u.value,null):h(t,u.value,n-1),s.indexOf("\n")>-1&&(s=o?s.split("\n").map(function(t){return"  "+t}).join("\n").substr(2):"\n"+s.split("\n").map(function(t){return"   "+t}).join("\n"))):s=t.stylize("[Circular]","special")),b(a)){if(o&&i.match(/^\d+$/))return s;a=JSON.stringify(""+i),a.match(/^"([a-zA-Z_][a-zA-Z_0-9]*)"$/)?(a=a.substr(1,a.length-2),a=t.stylize(a,"name")):(a=a.replace(/'/g,"\\'").replace(/\\"/g,'"').replace(/(^"|"$)/g,"'"),a=t.stylize(a,"string"))}return a+": "+s}function d(t,e,n){var r=0,i=t.reduce(function(t,e){return r++,e.indexOf("\n")>=0&&r++,t+e.replace(/\u001b\[\d\d?m/g,"").length+1},0);return i>60?n[0]+(""===e?"":e+"\n ")+" "+t.join(",\n  ")+" "+n[1]:n[0]+e+" "+t.join(", ")+" "+n[1]}function p(t){return Array.isArray(t)}function g(t){return"boolean"==typeof t}function v(t){return null===t}function m(t){return null==t}function y(t){return"number"==typeof t}function _(t){return"string"==typeof t}function w(t){return"symbol"==typeof t}function b(t){return void 0===t}function x(t){return S(t)&&"[object RegExp]"===A(t)}function S(t){return"object"==typeof t&&null!==t}function k(t){return S(t)&&"[object Date]"===A(t)}function E(t){return S(t)&&("[object Error]"===A(t)||t instanceof Error)}function C(t){return"function"==typeof t}function I(t){return null===t||"boolean"==typeof t||"number"==typeof t||"string"==typeof t||"symbol"==typeof t||"undefined"==typeof t}function A(t){return Object.prototype.toString.call(t)}function L(t,e){return Object.prototype.hasOwnProperty.call(t,e)}var R=/%[sdj%]/g;e.format=function(t){if(!_(t)){for(var e=[],n=0;n<arguments.length;n++)e.push(i(arguments[n]));return e.join(" ")}for(var n=1,r=arguments,o=r.length,a=String(t).replace(R,function(t){if("%%"===t)return"%";if(n>=o)return t;switch(t){case"%s":return String(r[n++]);case"%d":return Number(r[n++]);case"%j":try{return JSON.stringify(r[n++])}catch(e){return"[Circular]"}default:return t}}),s=r[n];o>n;s=r[++n])a+=v(s)||!S(s)?" "+s:" "+i(s);return a},e.deprecate=function(n,i){function o(){if(!a){if(r.throwDeprecation)throw new Error(i);r.traceDeprecation,a=!0}return n.apply(this,arguments)}if(b(t.process))return function(){return e.deprecate(n,i).apply(this,arguments)};if(r.noDeprecation===!0)return n;var a=!1;return o};var T,B={};e.debuglog=function(t){if(b(T)&&(T=r.env.NODE_DEBUG||""),t=t.toUpperCase(),!B[t])if(new RegExp("\\b"+t+"\\b","i").test(T)){r.pid;B[t]=function(){e.format.apply(e,arguments)}}else B[t]=function(){};return B[t]},e.inspect=i,i.colors={bold:[1,22],italic:[3,23],underline:[4,24],inverse:[7,27],white:[37,39],grey:[90,39],black:[30,39],blue:[34,39],cyan:[36,39],green:[32,39],magenta:[35,39],red:[31,39],yellow:[33,39]},i.styles={special:"cyan",number:"yellow","boolean":"yellow",undefined:"grey","null":"bold",string:"green",date:"magenta",regexp:"red"},e.isArray=p,e.isBoolean=g,e.isNull=v,e.isNullOrUndefined=m,e.isNumber=y,e.isString=_,e.isSymbol=w,e.isUndefined=b,e.isRegExp=x,e.isObject=S,e.isDate=k,e.isError=E,e.isFunction=C,e.isPrimitive=I,e.isBuffer=n(61);e.log=function(){},e.inherits=n(62),e._extend=function(t,e){if(!e||!S(e))return t;for(var n=Object.keys(e),r=n.length;r--;)t[n[r]]=e[n[r]];return t}}).call(e,function(){return this}(),n(30))},function(t,e){t.exports=function(t){return t&&"object"==typeof t&&"function"==typeof t.copy&&"function"==typeof t.fill&&"function"==typeof t.readUInt8}},function(t,e){"function"==typeof Object.create?t.exports=function(t,e){t.super_=e,t.prototype=Object.create(e.prototype,{constructor:{value:t,enumerable:!1,writable:!0,configurable:!0}})}:t.exports=function(t,e){t.super_=e;var n=function(){};n.prototype=e.prototype,t.prototype=new n,t.prototype.constructor=t}},function(t,e,n){function r(t,e){return d.isUndefined(e)?""+e:d.isNumber(e)&&!isFinite(e)?e.toString():d.isFunction(e)||d.isRegExp(e)?e.toString():e}function i(t,e){return d.isString(t)?t.length<e?t:t.slice(0,e):t}function o(t){return i(JSON.stringify(t.actual,r),128)+" "+t.operator+" "+i(JSON.stringify(t.expected,r),128)}function a(t,e,n,r,i){throw new v.AssertionError({message:n,actual:t,expected:e,operator:r,stackStartFunction:i})}function s(t,e){t||a(t,!0,e,"==",v.ok)}function h(t,e){if(t===e)return!0;if(d.isBuffer(t)&&d.isBuffer(e)){if(t.length!=e.length)return!1;for(var n=0;n<t.length;n++)if(t[n]!==e[n])return!1;return!0}return d.isDate(t)&&d.isDate(e)?t.getTime()===e.getTime():d.isRegExp(t)&&d.isRegExp(e)?t.source===e.source&&t.global===e.global&&t.multiline===e.multiline&&t.lastIndex===e.lastIndex&&t.ignoreCase===e.ignoreCase:d.isObject(t)||d.isObject(e)?c(t,e):t==e}function u(t){return"[object Arguments]"==Object.prototype.toString.call(t)}function c(t,e){if(d.isNullOrUndefined(t)||d.isNullOrUndefined(e))return!1;if(t.prototype!==e.prototype)return!1;if(d.isPrimitive(t)||d.isPrimitive(e))return t===e;var n=u(t),r=u(e);if(n&&!r||!n&&r)return!1;if(n)return t=p.call(t),e=p.call(e),h(t,e);var i,o,a=m(t),s=m(e);if(a.length!=s.length)return!1;for(a.sort(),s.sort(),o=a.length-1;o>=0;o--)if(a[o]!=s[o])return!1;for(o=a.length-1;o>=0;o--)if(i=a[o],!h(t[i],e[i]))return!1;return!0}function l(t,e){return t&&e?"[object RegExp]"==Object.prototype.toString.call(e)?e.test(t):t instanceof e?!0:e.call({},t)===!0?!0:!1:!1}function f(t,e,n,r){var i;d.isString(n)&&(r=n,n=null);try{e()}catch(o){i=o}if(r=(n&&n.name?" ("+n.name+").":".")+(r?" "+r:"."),t&&!i&&a(i,n,"Missing expected exception"+r),!t&&l(i,n)&&a(i,n,"Got unwanted exception"+r),t&&i&&n&&!l(i,n)||!t&&i)throw i}var d=n(60),p=Array.prototype.slice,g=Object.prototype.hasOwnProperty,v=t.exports=s;v.AssertionError=function(t){this.name="AssertionError",this.actual=t.actual,this.expected=t.expected,this.operator=t.operator,t.message?(this.message=t.message,this.generatedMessage=!1):(this.message=o(this),this.generatedMessage=!0);var e=t.stackStartFunction||a;if(Error.captureStackTrace)Error.captureStackTrace(this,e);else{var n=new Error;if(n.stack){var r=n.stack,i=e.name,s=r.indexOf("\n"+i);if(s>=0){var h=r.indexOf("\n",s+1);r=r.substring(h+1)}this.stack=r}}},d.inherits(v.AssertionError,Error),v.fail=a,v.ok=s,v.equal=function(t,e,n){t!=e&&a(t,e,n,"==",v.equal)},v.notEqual=function(t,e,n){t==e&&a(t,e,n,"!=",v.notEqual)},v.deepEqual=function(t,e,n){h(t,e)||a(t,e,n,"deepEqual",v.deepEqual)},v.notDeepEqual=function(t,e,n){h(t,e)&&a(t,e,n,"notDeepEqual",v.notDeepEqual)},v.strictEqual=function(t,e,n){t!==e&&a(t,e,n,"===",v.strictEqual)},v.notStrictEqual=function(t,e,n){t===e&&a(t,e,n,"!==",v.notStrictEqual)},v["throws"]=function(t,e,n){f.apply(this,[!0].concat(p.call(arguments)))},v.doesNotThrow=function(t,e){f.apply(this,[!1].concat(p.call(arguments)))},v.ifError=function(t){if(t)throw t};var m=Object.keys||function(t){var e=[];for(var n in t)g.call(t,n)&&e.push(n);return e}},function(t,e){(function(){var e;e=function(){function t(t,r){var i;this.document=t,null==r&&(r={}),this.size=r.size||"letter",this.layout=r.layout||"portrait","number"==typeof r.margin?this.margins={top:r.margin,left:r.margin,bottom:r.margin,right:r.margin}:this.margins=r.margins||e,i=Array.isArray(this.size)?this.size:n[this.size.toUpperCase()],this.width=i["portrait"===this.layout?0:1],this.height=i["portrait"===this.layout?1:0],this.content=this.document.ref(),this.resources=this.document.ref({ProcSet:["PDF","Text","ImageB","ImageC","ImageI"]}),Object.defineProperties(this,{fonts:{get:function(t){return function(){var e;return null!=(e=t.resources.data).Font?e.Font:e.Font={}}}(this)},xobjects:{get:function(t){return function(){var e;return null!=(e=t.resources.data).XObject?e.XObject:e.XObject={}}}(this)},ext_gstates:{get:function(t){return function(){var e;return null!=(e=t.resources.data).ExtGState?e.ExtGState:e.ExtGState={}}}(this)},patterns:{get:function(t){return function(){var e;return null!=(e=t.resources.data).Pattern?e.Pattern:e.Pattern={}}}(this)},annotations:{get:function(t){return function(){var e;return null!=(e=t.dictionary.data).Annots?e.Annots:e.Annots=[]}}(this)}}),this.dictionary=this.document.ref({Type:"Page",Parent:this.document._root.data.Pages,MediaBox:[0,0,this.width,this.height],Contents:this.content,Resources:this.resources})}var e,n;return t.prototype.maxY=function(){return this.height-this.margins.bottom},t.prototype.write=function(t){return this.content.write(t)},t.prototype.end=function(){return this.dictionary.end(),this.resources.end(),this.content.end()},e={top:72,left:72,bottom:72,right:72},n={"4A0":[4767.87,6740.79],"2A0":[3370.39,4767.87],A0:[2383.94,3370.39],A1:[1683.78,2383.94],A2:[1190.55,1683.78],A3:[841.89,1190.55],A4:[595.28,841.89],A5:[419.53,595.28],A6:[297.64,419.53],A7:[209.76,297.64],A8:[147.4,209.76],A9:[104.88,147.4],A10:[73.7,104.88],B0:[2834.65,4008.19],B1:[2004.09,2834.65],B2:[1417.32,2004.09],B3:[1000.63,1417.32],B4:[708.66,1000.63],B5:[498.9,708.66],B6:[354.33,498.9],B7:[249.45,354.33],B8:[175.75,249.45],B9:[124.72,175.75],B10:[87.87,124.72],C0:[2599.37,3676.54],C1:[1836.85,2599.37],C2:[1298.27,1836.85],C3:[918.43,1298.27],C4:[649.13,918.43],C5:[459.21,649.13],C6:[323.15,459.21],C7:[229.61,323.15],C8:[161.57,229.61],C9:[113.39,161.57],C10:[79.37,113.39],RA0:[2437.8,3458.27],RA1:[1729.13,2437.8],RA2:[1218.9,1729.13],RA3:[864.57,1218.9],RA4:[609.45,864.57],SRA0:[2551.18,3628.35],SRA1:[1814.17,2551.18],SRA2:[1275.59,1814.17],SRA3:[907.09,1275.59],SRA4:[637.8,907.09],EXECUTIVE:[521.86,756],FOLIO:[612,936],LEGAL:[612,1008],LETTER:[612,792],TABLOID:[792,1224]},t}(),t.exports=e}).call(this)},function(t,e,n){(function(){var e,r,i,o,a;a=n(66),e=a.PDFGradient,r=a.PDFLinearGradient,i=a.PDFRadialGradient,t.exports={initColor:function(){return this._opacityRegistry={},this._opacityCount=0,this._gradCount=0},_normalizeColor:function(t){var n,r;return t instanceof e?t:("string"==typeof t&&("#"===t.charAt(0)?(4===t.length&&(t=t.replace(/#([0-9A-F])([0-9A-F])([0-9A-F])/i,"#$1$1$2$2$3$3")),n=parseInt(t.slice(1),16),t=[n>>16,n>>8&255,255&n]):o[t]&&(t=o[t])),Array.isArray(t)?(3===t.length?t=function(){var e,n,i;for(i=[],e=0,n=t.length;n>e;e++)r=t[e],i.push(r/255);return i}():4===t.length&&(t=function(){var e,n,i;for(i=[],e=0,n=t.length;n>e;e++)r=t[e],i.push(r/100);return i}()),t):null)},_setColor:function(t,n){var r,i,o,a;return(t=this._normalizeColor(t))?(this._sMasked&&(r=this.ref({Type:"ExtGState",SMask:"None"}),r.end(),i="Gs"+ ++this._opacityCount,this.page.ext_gstates[i]=r,this.addContent("/"+i+" gs"),this._sMasked=!1),o=n?"SCN":"scn",t instanceof e?(this._setColorSpace("Pattern",n),t.apply(o)):(a=4===t.length?"DeviceCMYK":"DeviceRGB",this._setColorSpace(a,n),t=t.join(" "),this.addContent(""+t+" "+o)),!0):!1},_setColorSpace:function(t,e){var n;return n=e?"CS":"cs",this.addContent("/"+t+" "+n)},fillColor:function(t,e){var n;return null==e&&(e=1),n=this._setColor(t,!1),n&&this.fillOpacity(e),this._fillColor=[t,e],this},strokeColor:function(t,e){var n;return null==e&&(e=1),n=this._setColor(t,!0),n&&this.strokeOpacity(e),this},opacity:function(t){return this._doOpacity(t,t),this},fillOpacity:function(t){return this._doOpacity(t,null),this},strokeOpacity:function(t){return this._doOpacity(null,t),this},_doOpacity:function(t,e){var n,r,i,o,a;if(null!=t||null!=e)return null!=t&&(t=Math.max(0,Math.min(1,t))),null!=e&&(e=Math.max(0,Math.min(1,e))),i=""+t+"_"+e,this._opacityRegistry[i]?(a=this._opacityRegistry[i],n=a[0],o=a[1]):(n={Type:"ExtGState"},null!=t&&(n.ca=t),null!=e&&(n.CA=e),n=this.ref(n),n.end(),r=++this._opacityCount,o="Gs"+r,this._opacityRegistry[i]=[n,o]),this.page.ext_gstates[o]=n,this.addContent("/"+o+" gs")},linearGradient:function(t,e,n,i){return new r(this,t,e,n,i)},radialGradient:function(t,e,n,r,o,a){return new i(this,t,e,n,r,o,a)}},o={aliceblue:[240,248,255],antiquewhite:[250,235,215],aqua:[0,255,255],aquamarine:[127,255,212],azure:[240,255,255],beige:[245,245,220],bisque:[255,228,196],black:[0,0,0],blanchedalmond:[255,235,205],blue:[0,0,255],blueviolet:[138,43,226],brown:[165,42,42],burlywood:[222,184,135],cadetblue:[95,158,160],chartreuse:[127,255,0],chocolate:[210,105,30],coral:[255,127,80],cornflowerblue:[100,149,237],cornsilk:[255,248,220],crimson:[220,20,60],cyan:[0,255,255],darkblue:[0,0,139],darkcyan:[0,139,139],darkgoldenrod:[184,134,11],darkgray:[169,169,169],darkgreen:[0,100,0],darkgrey:[169,169,169],darkkhaki:[189,183,107],darkmagenta:[139,0,139],darkolivegreen:[85,107,47],darkorange:[255,140,0],darkorchid:[153,50,204],darkred:[139,0,0],darksalmon:[233,150,122],darkseagreen:[143,188,143],darkslateblue:[72,61,139],darkslategray:[47,79,79],darkslategrey:[47,79,79],darkturquoise:[0,206,209],darkviolet:[148,0,211],deeppink:[255,20,147],deepskyblue:[0,191,255],dimgray:[105,105,105],dimgrey:[105,105,105],dodgerblue:[30,144,255],firebrick:[178,34,34],floralwhite:[255,250,240],forestgreen:[34,139,34],fuchsia:[255,0,255],gainsboro:[220,220,220],ghostwhite:[248,248,255],gold:[255,215,0],goldenrod:[218,165,32],gray:[128,128,128],grey:[128,128,128],green:[0,128,0],greenyellow:[173,255,47],honeydew:[240,255,240],hotpink:[255,105,180],indianred:[205,92,92],indigo:[75,0,130],ivory:[255,255,240],khaki:[240,230,140],lavender:[230,230,250],lavenderblush:[255,240,245],lawngreen:[124,252,0],lemonchiffon:[255,250,205],lightblue:[173,216,230],lightcoral:[240,128,128],lightcyan:[224,255,255],lightgoldenrodyellow:[250,250,210],lightgray:[211,211,211],lightgreen:[144,238,144],lightgrey:[211,211,211],lightpink:[255,182,193],lightsalmon:[255,160,122],lightseagreen:[32,178,170],lightskyblue:[135,206,250],lightslategray:[119,136,153],lightslategrey:[119,136,153],lightsteelblue:[176,196,222],lightyellow:[255,255,224],lime:[0,255,0],limegreen:[50,205,50],linen:[250,240,230],magenta:[255,0,255],maroon:[128,0,0],mediumaquamarine:[102,205,170],mediumblue:[0,0,205],mediumorchid:[186,85,211],mediumpurple:[147,112,219],mediumseagreen:[60,179,113],mediumslateblue:[123,104,238],mediumspringgreen:[0,250,154],mediumturquoise:[72,209,204],mediumvioletred:[199,21,133],midnightblue:[25,25,112],mintcream:[245,255,250],mistyrose:[255,228,225],moccasin:[255,228,181],navajowhite:[255,222,173],navy:[0,0,128],oldlace:[253,245,230],olive:[128,128,0],olivedrab:[107,142,35],orange:[255,165,0],orangered:[255,69,0],orchid:[218,112,214],palegoldenrod:[238,232,170],palegreen:[152,251,152],paleturquoise:[175,238,238],palevioletred:[219,112,147],papayawhip:[255,239,213],peachpuff:[255,218,185],peru:[205,133,63],pink:[255,192,203],plum:[221,160,221],powderblue:[176,224,230],purple:[128,0,128],red:[255,0,0],rosybrown:[188,143,143],royalblue:[65,105,225],saddlebrown:[139,69,19],salmon:[250,128,114],sandybrown:[244,164,96],seagreen:[46,139,87],seashell:[255,245,238],sienna:[160,82,45],silver:[192,192,192],skyblue:[135,206,235],slateblue:[106,90,205],slategray:[112,128,144],slategrey:[112,128,144],snow:[255,250,250],springgreen:[0,255,127],steelblue:[70,130,180],tan:[210,180,140],teal:[0,128,128],thistle:[216,191,216],tomato:[255,99,71],turquoise:[64,224,208],violet:[238,130,238],wheat:[245,222,179],white:[255,255,255],whitesmoke:[245,245,245],yellow:[255,255,0],yellowgreen:[154,205,50]}}).call(this)},function(t,e){(function(){var e,n,r,i={}.hasOwnProperty,o=function(t,e){function n(){this.constructor=t}for(var r in e)i.call(e,r)&&(t[r]=e[r]);return n.prototype=e.prototype,t.prototype=new n,t.__super__=e.prototype,t};e=function(){function t(t){this.doc=t,this.stops=[],this.embedded=!1,this.transform=[1,0,0,1,0,0],this._colorSpace="DeviceRGB"}return t.prototype.stop=function(t,e,n){return null==n&&(n=1),n=Math.max(0,Math.min(1,n)),this.stops.push([t,this.doc._normalizeColor(e),n]),this},t.prototype.embed=function(){var t,e,n,r,i,o,a,s,h,u,c,l,f,d,p,g,v,m,y,_,w,b,x,S,k,E,C,I,A,L,R,T,B,O,M,D;if(!this.embedded&&0!==this.stops.length){for(this.embedded=!0,c=this.stops[this.stops.length-1],c[0]<1&&this.stops.push([1,c[1],c[2]]),t=[],r=[],A=[],u=R=0,O=this.stops.length-1;O>=0?O>R:R>O;u=O>=0?++R:--R)r.push(0,1),u+2!==this.stops.length&&t.push(this.stops[u+1][0]),i=this.doc.ref({FunctionType:2,Domain:[0,1],C0:this.stops[u+0][1],C1:this.stops[u+1][1],N:1}),A.push(i),i.end();if(1===A.length?i=A[0]:(i=this.doc.ref({FunctionType:3,Domain:[0,1],Functions:A,Bounds:t,Encode:r}),i.end()),this.id="Sh"+ ++this.doc._gradCount,l=this.doc._ctm.slice(),f=l[0],d=l[1],v=l[2],_=l[3],w=l[4],b=l[5],M=this.transform,p=M[0],g=M[1],m=M[2],y=M[3],e=M[4],n=M[5],l[0]=f*p+v*g,l[1]=d*p+_*g,l[2]=f*m+v*y,l[3]=d*m+_*y,l[4]=f*e+v*n+w,l[5]=d*e+_*n+b,C=this.shader(i),C.end(),S=this.doc.ref({Type:"Pattern",PatternType:2,Shading:C,Matrix:function(){var t,e,n;for(n=[],t=0,e=l.length;e>t;t++)L=l[t],n.push(+L.toFixed(5));return n}()}),this.doc.page.patterns[this.id]=S,S.end(),this.stops.some(function(t){return t[2]<1})){for(a=this.opacityGradient(),a._colorSpace="DeviceGray",D=this.stops,T=0,B=D.length;B>T;T++)I=D[T],a.stop(I[0],[I[2]]);a=a.embed(),s=this.doc.ref({Type:"Group",S:"Transparency",CS:"DeviceGray"}),s.end(),k=this.doc.ref({ProcSet:["PDF","Text","ImageB","ImageC","ImageI"],Shading:{Sh1:a.data.Shading}}),k.end(),o=this.doc.ref({Type:"XObject",Subtype:"Form",FormType:1,BBox:[0,0,this.doc.page.width,this.doc.page.height],Group:s,Resources:k}),o.end("/Sh1 sh"),E=this.doc.ref({Type:"Mask",S:"Luminosity",G:o}),E.end(),h=this.doc.ref({Type:"ExtGState",SMask:E}),this.opacity_id=++this.doc._opacityCount,x="Gs"+this.opacity_id,this.doc.page.ext_gstates[x]=h,h.end()}return S}},t.prototype.apply=function(t){return this.embedded||this.embed(),this.doc.addContent("/"+this.id+" "+t),this.opacity_id?(this.doc.addContent("/Gs"+this.opacity_id+" gs"),this.doc._sMasked=!0):void 0},t}(),n=function(t){function e(t,n,r,i,o){this.doc=t,this.x1=n,this.y1=r,this.x2=i,this.y2=o,e.__super__.constructor.apply(this,arguments)}return o(e,t),e.prototype.shader=function(t){return this.doc.ref({ShadingType:2,ColorSpace:this._colorSpace,Coords:[this.x1,this.y1,this.x2,this.y2],Function:t,Extend:[!0,!0]})},e.prototype.opacityGradient=function(){return new e(this.doc,this.x1,this.y1,this.x2,this.y2)},e}(e),r=function(t){function e(t,n,r,i,o,a,s){this.doc=t,this.x1=n,this.y1=r,this.r1=i,this.x2=o,this.y2=a,this.r2=s,e.__super__.constructor.apply(this,arguments)}return o(e,t),e.prototype.shader=function(t){return this.doc.ref({ShadingType:3,ColorSpace:this._colorSpace,Coords:[this.x1,this.y1,this.r1,this.x2,this.y2,this.r2],Function:t,Extend:[!0,!0]})},e.prototype.opacityGradient=function(){return new e(this.doc,this.x1,this.y1,this.r1,this.x2,this.y2,this.r2)},e}(e),t.exports={PDFGradient:e,PDFLinearGradient:n,PDFRadialGradient:r}}).call(this)},function(t,e,n){(function(){var e,r,i=[].slice;r=n(68),e=4*((Math.sqrt(2)-1)/3),t.exports={initVector:function(){return this._ctm=[1,0,0,1,0,0],this._ctmStack=[]},save:function(){return this._ctmStack.push(this._ctm.slice()),this.addContent("q")},restore:function(){return this._ctm=this._ctmStack.pop()||[1,0,0,1,0,0],this.addContent("Q")},closePath:function(){return this.addContent("h")},lineWidth:function(t){return this.addContent(""+t+" w")},_CAP_STYLES:{BUTT:0,ROUND:1,SQUARE:2},lineCap:function(t){return"string"==typeof t&&(t=this._CAP_STYLES[t.toUpperCase()]),this.addContent(""+t+" J")},_JOIN_STYLES:{MITER:0,ROUND:1,BEVEL:2},lineJoin:function(t){return"string"==typeof t&&(t=this._JOIN_STYLES[t.toUpperCase()]),this.addContent(""+t+" j")},miterLimit:function(t){return this.addContent(""+t+" M")},dash:function(t,e){var n,r,i;return null==e&&(e={}),null==t?this:(r=null!=(i=e.space)?i:t,n=e.phase||0,this.addContent("["+t+" "+r+"] "+n+" d"))},undash:function(){return this.addContent("[] 0 d")},moveTo:function(t,e){return this.addContent(""+t+" "+e+" m")},lineTo:function(t,e){return this.addContent(""+t+" "+e+" l")},bezierCurveTo:function(t,e,n,r,i,o){return this.addContent(""+t+" "+e+" "+n+" "+r+" "+i+" "+o+" c")},quadraticCurveTo:function(t,e,n,r){return this.addContent(""+t+" "+e+" "+n+" "+r+" v")},rect:function(t,e,n,r){return this.addContent(""+t+" "+e+" "+n+" "+r+" re")},roundedRect:function(t,e,n,r,i){return null==i&&(i=0),this.moveTo(t+i,e),this.lineTo(t+n-i,e),this.quadraticCurveTo(t+n,e,t+n,e+i),this.lineTo(t+n,e+r-i),this.quadraticCurveTo(t+n,e+r,t+n-i,e+r),this.lineTo(t+i,e+r),this.quadraticCurveTo(t,e+r,t,e+r-i),this.lineTo(t,e+i),this.quadraticCurveTo(t,e,t+i,e)},ellipse:function(t,n,r,i){var o,a,s,h,u,c;return null==i&&(i=r),t-=r,n-=i,o=r*e,a=i*e,s=t+2*r,u=n+2*i,h=t+r,c=n+i,this.moveTo(t,c),this.bezierCurveTo(t,c-a,h-o,n,h,n),this.bezierCurveTo(h+o,n,s,c-a,s,c),this.bezierCurveTo(s,c+a,h+o,u,h,u),this.bezierCurveTo(h-o,u,t,c+a,t,c),this.closePath()},circle:function(t,e,n){return this.ellipse(t,e,n)},polygon:function(){var t,e,n,r;for(e=1<=arguments.length?i.call(arguments,0):[],this.moveTo.apply(this,e.shift()),n=0,r=e.length;r>n;n++)t=e[n],this.lineTo.apply(this,t);return this.closePath()},path:function(t){return r.apply(this,t),this},_windingRule:function(t){return/even-?odd/.test(t)?"*":""},fill:function(t,e){return/(even-?odd)|(non-?zero)/.test(t)&&(e=t,t=null),t&&this.fillColor(t),this.addContent("f"+this._windingRule(e))},stroke:function(t){return t&&this.strokeColor(t),this.addContent("S")},fillAndStroke:function(t,e,n){var r;return null==e&&(e=t),r=/(even-?odd)|(non-?zero)/,r.test(t)&&(n=t,t=null),r.test(e)&&(n=e,e=t),t&&(this.fillColor(t),this.strokeColor(e)),this.addContent("B"+this._windingRule(n))},clip:function(t){return this.addContent("W"+this._windingRule(t)+" n")},transform:function(t,e,n,r,i,o){var a,s,h,u,c,l,f,d,p;return a=this._ctm,s=a[0],h=a[1],u=a[2],c=a[3],l=a[4],f=a[5],a[0]=s*t+u*e,a[1]=h*t+c*e,a[2]=s*n+u*r,a[3]=h*n+c*r,a[4]=s*i+u*o+l,a[5]=h*i+c*o+f,p=function(){var a,s,h,u;for(h=[t,e,n,r,i,o],u=[],a=0,s=h.length;s>a;a++)d=h[a],u.push(+d.toFixed(5));return u}().join(" "),this.addContent(""+p+" cm")},translate:function(t,e){return this.transform(1,0,0,1,t,e)},rotate:function(t,e){var n,r,i,o,a,s,h,u;return null==e&&(e={}),r=t*Math.PI/180,n=Math.cos(r),i=Math.sin(r),o=s=0,null!=e.origin&&(u=e.origin,o=u[0],s=u[1],a=o*n-s*i,h=o*i+s*n,o-=a,s-=h),this.transform(n,i,-i,n,o,s)},scale:function(t,e,n){var r,i,o;return null==e&&(e=t),null==n&&(n={}),2===arguments.length&&(e=t,n=e),r=i=0,null!=n.origin&&(o=n.origin,r=o[0],i=o[1],r-=t*r,i-=e*i),this.transform(t,0,0,e,r,i)}}}).call(this)},function(t,e){(function(){var e;e=function(){function t(){}var e,n,r,i,o,a,s,h,u,c,l,f,d;return t.apply=function(t,n){var r;return r=a(n),e(r,t)},o={A:7,a:7,C:6,c:6,H:1,h:1,L:2,l:2,M:2,m:2,Q:4,q:4,S:4,s:4,T:2,t:2,V:1,v:1,Z:0,z:0},a=function(t){var e,n,r,i,a,s,h,u,c;for(h=[],e=[],i="",a=!1,s=0,u=0,c=t.length;c>u;u++)if(n=t[u],null!=o[n])s=o[n],r&&(i.length>0&&(e[e.length]=+i),h[h.length]={cmd:r,args:e},e=[],i="",a=!1),r=n;else if(" "===n||","===n||"-"===n&&i.length>0&&"e"!==i[i.length-1]||"."===n&&a){if(0===i.length)continue;e.length===s?(h[h.length]={cmd:r,args:e},e=[+i],"M"===r&&(r="L"),"m"===r&&(r="l")):e[e.length]=+i,a="."===n,i="-"===n||"."===n?n:""}else i+=n,"."===n&&(a=!0);return i.length>0&&(e.length===s?(h[h.length]={cmd:r,args:e},e=[+i],"M"===r&&(r="L"),"m"===r&&(r="l")):e[e.length]=+i),h[h.length]={cmd:r,args:e},h},r=i=s=h=f=d=0,e=function(t,e){var n,o,a,c,l;for(r=i=s=h=f=d=0,o=a=0,c=t.length;c>a;o=++a)n=t[o],"function"==typeof u[l=n.cmd]&&u[l](e,n.args);return r=i=s=h=0},u={M:function(t,e){return r=e[0],i=e[1],s=h=null,f=r,d=i,t.moveTo(r,i)},m:function(t,e){return r+=e[0],i+=e[1],s=h=null,f=r,d=i,t.moveTo(r,i)},C:function(t,e){return r=e[4],i=e[5],s=e[2],h=e[3],t.bezierCurveTo.apply(t,e)},c:function(t,e){return t.bezierCurveTo(e[0]+r,e[1]+i,e[2]+r,e[3]+i,e[4]+r,e[5]+i),s=r+e[2],h=i+e[3],r+=e[4],i+=e[5]},S:function(t,e){return null===s&&(s=r,h=i),t.bezierCurveTo(r-(s-r),i-(h-i),e[0],e[1],e[2],e[3]),s=e[0],h=e[1],r=e[2],i=e[3]},s:function(t,e){return null===s&&(s=r,h=i),t.bezierCurveTo(r-(s-r),i-(h-i),r+e[0],i+e[1],r+e[2],i+e[3]),s=r+e[0],h=i+e[1],r+=e[2],i+=e[3]},Q:function(t,e){return s=e[0],h=e[1],r=e[2],i=e[3],t.quadraticCurveTo(e[0],e[1],r,i)},q:function(t,e){return t.quadraticCurveTo(e[0]+r,e[1]+i,e[2]+r,e[3]+i),s=r+e[0],h=i+e[1],r+=e[2],i+=e[3]},T:function(t,e){return null===s?(s=r,h=i):(s=r-(s-r),h=i-(h-i)),t.quadraticCurveTo(s,h,e[0],e[1]),s=r-(s-r),h=i-(h-i),r=e[0],i=e[1]},t:function(t,e){return null===s?(s=r,h=i):(s=r-(s-r),h=i-(h-i)),t.quadraticCurveTo(s,h,r+e[0],i+e[1]),r+=e[0],i+=e[1]},A:function(t,e){return l(t,r,i,e),r=e[5],i=e[6]},a:function(t,e){return e[5]+=r,e[6]+=i,l(t,r,i,e),r=e[5],i=e[6]},L:function(t,e){return r=e[0],i=e[1],s=h=null,t.lineTo(r,i)},l:function(t,e){return r+=e[0],i+=e[1],s=h=null,t.lineTo(r,i)},H:function(t,e){return r=e[0],s=h=null,t.lineTo(r,i)},h:function(t,e){return r+=e[0],s=h=null,t.lineTo(r,i);
},V:function(t,e){return i=e[0],s=h=null,t.lineTo(r,i)},v:function(t,e){return i+=e[0],s=h=null,t.lineTo(r,i)},Z:function(t){return t.closePath(),r=f,i=d},z:function(t){return t.closePath(),r=f,i=d}},l=function(t,e,r,i){var o,a,s,h,u,l,f,d,p,g,v,m,y;for(l=i[0],f=i[1],u=i[2],h=i[3],g=i[4],a=i[5],s=i[6],p=n(a,s,l,f,h,g,u,e,r),y=[],v=0,m=p.length;m>v;v++)d=p[v],o=c.apply(null,d),y.push(t.bezierCurveTo.apply(t,o));return y},n=function(t,e,n,r,i,o,a,u,c){var l,f,d,p,g,v,m,y,_,w,b,x,S,k,E,C,I,A,L,R,T,B,O,M,D,U;for(k=a*(Math.PI/180),S=Math.sin(k),g=Math.cos(k),n=Math.abs(n),r=Math.abs(r),s=g*(u-t)*.5+S*(c-e)*.5,h=g*(c-e)*.5-S*(u-t)*.5,y=s*s/(n*n)+h*h/(r*r),y>1&&(y=Math.sqrt(y),n*=y,r*=y),l=g/n,f=S/n,d=-S/r,p=g/r,R=l*u+f*c,O=d*u+p*c,T=l*t+f*e,M=d*t+p*e,v=(T-R)*(T-R)+(M-O)*(M-O),x=1/v-.25,0>x&&(x=0),b=Math.sqrt(x),o===i&&(b=-b),B=.5*(R+T)-b*(M-O),D=.5*(O+M)+b*(T-R),E=Math.atan2(O-D,R-B),C=Math.atan2(M-D,T-B),L=C-E,0>L&&1===o?L+=2*Math.PI:L>0&&0===o&&(L-=2*Math.PI),w=Math.ceil(Math.abs(L/(.5*Math.PI+.001))),_=[],m=U=0;w>=0?w>U:U>w;m=w>=0?++U:--U)I=E+m*L/w,A=E+(m+1)*L/w,_[m]=[B,D,I,A,n,r,S,g];return _},c=function(t,e,n,r,i,o,a,s){var h,u,c,l,f,d,p,g,v,m,y,_;return h=s*i,u=-a*o,c=a*i,l=s*o,d=.5*(r-n),f=8/3*Math.sin(.5*d)*Math.sin(.5*d)/Math.sin(d),p=t+Math.cos(n)-f*Math.sin(n),m=e+Math.sin(n)+f*Math.cos(n),v=t+Math.cos(r),_=e+Math.sin(r),g=v+f*Math.sin(r),y=_-f*Math.cos(r),[h*p+u*m,c*p+l*m,h*g+u*y,c*g+l*y,h*v+u*_,c*v+l*_]},t}(),t.exports=e}).call(this)},function(t,e,n){(function(){var e;e=n(70),t.exports={initFonts:function(){this._fontFamilies={},this._fontCount=0,this._fontSize=12,this._font=null,this._registeredFonts={}},font:function(t,n,r){var i,o,a,s;return"number"==typeof n&&(r=n,n=null),"string"==typeof t&&this._registeredFonts[t]?(i=t,s=this._registeredFonts[t],t=s.src,n=s.family):(i=n||t,"string"!=typeof i&&(i=null)),null!=r&&this.fontSize(r),(o=this._fontFamilies[i])?(this._font=o,this):(a="F"+ ++this._fontCount,this._font=new e(this,t,n,a),(o=this._fontFamilies[this._font.name])?(this._font=o,this):(i&&(this._fontFamilies[i]=this._font),this._fontFamilies[this._font.name]=this._font,this))},fontSize:function(t){return this._fontSize=t,this},currentLineHeight:function(t){return null==t&&(t=!1),this._font.lineHeight(this._fontSize,t)},registerFont:function(t,e,n){return this._registeredFonts[t]={src:e,family:n},this}}}).call(this)},function(t,e,n){(function(e,r){(function(){var i,o,a,s,h;s=n(71),i=n(87),a=n(88),h=n(44),o=function(){function t(t,r,o,h){if(this.document=t,this.id=h,"string"==typeof r){if(r in n)return this.isAFM=!0,this.font=new i(n[r]()),void this.registerAFM(r);if(/\.(ttf|ttc)$/i.test(r))this.font=s.open(r,o);else{if(!/\.dfont$/i.test(r))throw new Error("Not a supported font format or standard PDF font.");this.font=s.fromDFont(r,o)}}else if(e.isBuffer(r))this.font=s.fromBuffer(r,o);else if(r instanceof Uint8Array)this.font=s.fromBuffer(new e(r),o);else{if(!(r instanceof ArrayBuffer))throw new Error("Not a supported font format or standard PDF font.");this.font=s.fromBuffer(new e(new Uint8Array(r)),o)}this.subset=new a(this.font),this.registerTTF()}var n,o;return n={Courier:function(){return h.readFileSync(r+"/font/data/Courier.afm","utf8")},"Courier-Bold":function(){return h.readFileSync(r+"/font/data/Courier-Bold.afm","utf8")},"Courier-Oblique":function(){return h.readFileSync(r+"/font/data/Courier-Oblique.afm","utf8")},"Courier-BoldOblique":function(){return h.readFileSync(r+"/font/data/Courier-BoldOblique.afm","utf8")},Helvetica:function(){return h.readFileSync(r+"/font/data/Helvetica.afm","utf8")},"Helvetica-Bold":function(){return h.readFileSync(r+"/font/data/Helvetica-Bold.afm","utf8")},"Helvetica-Oblique":function(){return h.readFileSync(r+"/font/data/Helvetica-Oblique.afm","utf8")},"Helvetica-BoldOblique":function(){return h.readFileSync(r+"/font/data/Helvetica-BoldOblique.afm","utf8")},"Times-Roman":function(){return h.readFileSync(r+"/font/data/Times-Roman.afm","utf8")},"Times-Bold":function(){return h.readFileSync(r+"/font/data/Times-Bold.afm","utf8")},"Times-Italic":function(){return h.readFileSync(r+"/font/data/Times-Italic.afm","utf8")},"Times-BoldItalic":function(){return h.readFileSync(r+"/font/data/Times-BoldItalic.afm","utf8")},Symbol:function(){return h.readFileSync(r+"/font/data/Symbol.afm","utf8")},ZapfDingbats:function(){return h.readFileSync(r+"/font/data/ZapfDingbats.afm","utf8")}},t.prototype.use=function(t){var e;return null!=(e=this.subset)?e.use(t):void 0},t.prototype.embed=function(){return this.embedded||null==this.dictionary?void 0:(this.isAFM?this.embedAFM():this.embedTTF(),this.embedded=!0)},t.prototype.encode=function(t){var e;return this.isAFM?this.font.encodeText(t):(null!=(e=this.subset)?e.encodeText(t):void 0)||t},t.prototype.ref=function(){return null!=this.dictionary?this.dictionary:this.dictionary=this.document.ref()},t.prototype.registerTTF=function(){var t,e,n,r,i;if(this.name=this.font.name.postscriptName,this.scaleFactor=1e3/this.font.head.unitsPerEm,this.bbox=function(){var e,n,r,i;for(r=this.font.bbox,i=[],e=0,n=r.length;n>e;e++)t=r[e],i.push(Math.round(t*this.scaleFactor));return i}.call(this),this.stemV=0,this.font.post.exists?(r=this.font.post.italic_angle,e=r>>16,n=255&r,e&!0&&(e=-((65535^e)+1)),this.italicAngle=+(""+e+"."+n)):this.italicAngle=0,this.ascender=Math.round(this.font.ascender*this.scaleFactor),this.decender=Math.round(this.font.decender*this.scaleFactor),this.lineGap=Math.round(this.font.lineGap*this.scaleFactor),this.capHeight=this.font.os2.exists&&this.font.os2.capHeight||this.ascender,this.xHeight=this.font.os2.exists&&this.font.os2.xHeight||0,this.familyClass=(this.font.os2.exists&&this.font.os2.familyClass||0)>>8,this.isSerif=1===(i=this.familyClass)||2===i||3===i||4===i||5===i||7===i,this.isScript=10===this.familyClass,this.flags=0,this.font.post.isFixedPitch&&(this.flags|=1),this.isSerif&&(this.flags|=2),this.isScript&&(this.flags|=8),0!==this.italicAngle&&(this.flags|=64),this.flags|=32,!this.font.cmap.unicode)throw new Error("No unicode cmap for font")},t.prototype.embedTTF=function(){var t,e,n,r,i,a,s,h;return r=this.subset.encode(),s=this.document.ref(),s.write(r),s.data.Length1=s.uncompressedLength,s.end(),i=this.document.ref({Type:"FontDescriptor",FontName:this.subset.postscriptName,FontFile2:s,FontBBox:this.bbox,Flags:this.flags,StemV:this.stemV,ItalicAngle:this.italicAngle,Ascent:this.ascender,Descent:this.decender,CapHeight:this.capHeight,XHeight:this.xHeight}),i.end(),a=+Object.keys(this.subset.cmap)[0],t=function(){var t,e;t=this.subset.cmap,e=[];for(n in t)h=t[n],e.push(Math.round(this.font.widthOfGlyph(h)));return e}.call(this),e=this.document.ref(),e.end(o(this.subset.subset)),this.dictionary.data={Type:"Font",BaseFont:this.subset.postscriptName,Subtype:"TrueType",FontDescriptor:i,FirstChar:a,LastChar:a+t.length-1,Widths:t,Encoding:"MacRomanEncoding",ToUnicode:e},this.dictionary.end()},o=function(t){var e,n,r,i,o,a,s;for(o="/CIDInit /ProcSet findresource begin\n12 dict begin\nbegincmap\n/CIDSystemInfo <<\n  /Registry (Adobe)\n  /Ordering (UCS)\n  /Supplement 0\n>> def\n/CMapName /Adobe-Identity-UCS def\n/CMapType 2 def\n1 begincodespacerange\n<00><ff>\nendcodespacerange",n=Object.keys(t).sort(function(t,e){return t-e}),r=[],a=0,s=n.length;s>a;a++)e=n[a],r.length>=100&&(o+="\n"+r.length+" beginbfchar\n"+r.join("\n")+"\nendbfchar",r=[]),i=("0000"+t[e].toString(16)).slice(-4),e=(+e).toString(16),r.push("<"+e+"><"+i+">");return r.length&&(o+="\n"+r.length+" beginbfchar\n"+r.join("\n")+"\nendbfchar\n"),o+="endcmap\nCMapName currentdict /CMap defineresource pop\nend\nend"},t.prototype.registerAFM=function(t){var e;return this.name=t,e=this.font,this.ascender=e.ascender,this.decender=e.decender,this.bbox=e.bbox,this.lineGap=e.lineGap,e},t.prototype.embedAFM=function(){return this.dictionary.data={Type:"Font",BaseFont:this.name,Subtype:"Type1",Encoding:"WinAnsiEncoding"},this.dictionary.end()},t.prototype.widthOfString=function(t,e){var n,r,i,o,a,s;for(t=""+t,o=0,r=a=0,s=t.length;s>=0?s>a:a>s;r=s>=0?++a:--a)n=t.charCodeAt(r),o+=this.font.widthOfGlyph(this.font.characterToGlyph(n))||0;return i=e/1e3,o*i},t.prototype.lineHeight=function(t,e){var n;return null==e&&(e=!1),n=e?this.lineGap:0,(this.ascender+n-this.decender)/1e3*t},t}(),t.exports=o}).call(this)}).call(e,n(2).Buffer,"/")},function(t,e,n){(function(){var CmapTable,e,r,i,GlyfTable,HeadTable,HheaTable,HmtxTable,LocaTable,MaxpTable,NameTable,OS2Table,PostTable,o,a;a=n(44),r=n(72),e=n(73),i=n(74),NameTable=n(75),HeadTable=n(78),CmapTable=n(79),HmtxTable=n(80),HheaTable=n(81),MaxpTable=n(82),PostTable=n(83),OS2Table=n(84),LocaTable=n(85),GlyfTable=n(86),o=function(){function t(t,e){var n,i,o,a,s,h,u,c,l;if(this.rawData=t,n=this.contents=new r(this.rawData),"ttcf"===n.readString(4)){if(!e)throw new Error("Must specify a font name for TTC files.");for(h=n.readInt(),o=n.readInt(),s=[],i=u=0;o>=0?o>u:u>o;i=o>=0?++u:--u)s[i]=n.readInt();for(i=c=0,l=s.length;l>c;i=++c)if(a=s[i],n.pos=a,this.parse(),this.name.postscriptName===e)return;throw new Error("Font "+e+" not found in TTC file.")}n.pos=0,this.parse()}return t.open=function(e,n){var r;return r=a.readFileSync(e),new t(r,n)},t.fromDFont=function(n,r){var i;return i=e.open(n),new t(i.getNamedFont(r))},t.fromBuffer=function(n,r){var i,o,a;try{if(a=new t(n,r),!(a.head.exists&&a.name.exists&&a.cmap.exists||(i=new e(n),a=new t(i.getNamedFont(r)),a.head.exists&&a.name.exists&&a.cmap.exists)))throw new Error("Invalid TTF file in DFont");return a}catch(s){throw o=s,new Error("Unknown font format in buffer: "+o.message)}},t.prototype.parse=function(){return this.directory=new i(this.contents),this.head=new HeadTable(this),this.name=new NameTable(this),this.cmap=new CmapTable(this),this.hhea=new HheaTable(this),this.maxp=new MaxpTable(this),this.hmtx=new HmtxTable(this),this.post=new PostTable(this),this.os2=new OS2Table(this),this.loca=new LocaTable(this),this.glyf=new GlyfTable(this),this.ascender=this.os2.exists&&this.os2.ascender||this.hhea.ascender,this.decender=this.os2.exists&&this.os2.decender||this.hhea.decender,this.lineGap=this.os2.exists&&this.os2.lineGap||this.hhea.lineGap,this.bbox=[this.head.xMin,this.head.yMin,this.head.xMax,this.head.yMax]},t.prototype.characterToGlyph=function(t){var e;return(null!=(e=this.cmap.unicode)?e.codeMap[t]:void 0)||0},t.prototype.widthOfGlyph=function(t){var e;return e=1e3/this.head.unitsPerEm,this.hmtx.forGlyph(t).advance*e},t}(),t.exports=o}).call(this)},function(t,e){(function(){var e;e=function(){function t(t){this.data=null!=t?t:[],this.pos=0,this.length=this.data.length}return t.prototype.readByte=function(){return this.data[this.pos++]},t.prototype.writeByte=function(t){return this.data[this.pos++]=t},t.prototype.byteAt=function(t){return this.data[t]},t.prototype.readBool=function(){return!!this.readByte()},t.prototype.writeBool=function(t){return this.writeByte(t?1:0)},t.prototype.readUInt32=function(){var t,e,n,r;return t=16777216*this.readByte(),e=this.readByte()<<16,n=this.readByte()<<8,r=this.readByte(),t+e+n+r},t.prototype.writeUInt32=function(t){return this.writeByte(t>>>24&255),this.writeByte(t>>16&255),this.writeByte(t>>8&255),this.writeByte(255&t)},t.prototype.readInt32=function(){var t;return t=this.readUInt32(),t>=2147483648?t-4294967296:t},t.prototype.writeInt32=function(t){return 0>t&&(t+=4294967296),this.writeUInt32(t)},t.prototype.readUInt16=function(){var t,e;return t=this.readByte()<<8,e=this.readByte(),t|e},t.prototype.writeUInt16=function(t){return this.writeByte(t>>8&255),this.writeByte(255&t)},t.prototype.readInt16=function(){var t;return t=this.readUInt16(),t>=32768?t-65536:t},t.prototype.writeInt16=function(t){return 0>t&&(t+=65536),this.writeUInt16(t)},t.prototype.readString=function(t){var e,n,r;for(n=[],e=r=0;t>=0?t>r:r>t;e=t>=0?++r:--r)n[e]=String.fromCharCode(this.readByte());return n.join("")},t.prototype.writeString=function(t){var e,n,r,i;for(i=[],e=n=0,r=t.length;r>=0?r>n:n>r;e=r>=0?++n:--n)i.push(this.writeByte(t.charCodeAt(e)));return i},t.prototype.stringAt=function(t,e){return this.pos=t,this.readString(e)},t.prototype.readShort=function(){return this.readInt16()},t.prototype.writeShort=function(t){return this.writeInt16(t)},t.prototype.readLongLong=function(){var t,e,n,r,i,o,a,s;return t=this.readByte(),e=this.readByte(),n=this.readByte(),r=this.readByte(),i=this.readByte(),o=this.readByte(),a=this.readByte(),s=this.readByte(),128&t?-1*(72057594037927940*(255^t)+281474976710656*(255^e)+1099511627776*(255^n)+4294967296*(255^r)+16777216*(255^i)+65536*(255^o)+256*(255^a)+(255^s)+1):72057594037927940*t+281474976710656*e+1099511627776*n+4294967296*r+16777216*i+65536*o+256*a+s},t.prototype.writeLongLong=function(t){var e,n;return e=Math.floor(t/4294967296),n=4294967295&t,this.writeByte(e>>24&255),this.writeByte(e>>16&255),this.writeByte(e>>8&255),this.writeByte(255&e),this.writeByte(n>>24&255),this.writeByte(n>>16&255),this.writeByte(n>>8&255),this.writeByte(255&n)},t.prototype.readInt=function(){return this.readInt32()},t.prototype.writeInt=function(t){return this.writeInt32(t)},t.prototype.slice=function(t,e){return this.data.slice(t,e)},t.prototype.read=function(t){var e,n,r;for(e=[],n=r=0;t>=0?t>r:r>t;n=t>=0?++r:--r)e.push(this.readByte());return e},t.prototype.write=function(t){var e,n,r,i;for(i=[],n=0,r=t.length;r>n;n++)e=t[n],i.push(this.writeByte(e));return i},t}(),t.exports=e}).call(this)},function(t,e,n){(function(){var e,r,i,NameTable,o;o=n(44),r=n(72),i=n(74),NameTable=n(75),e=function(){function t(t){this.contents=new r(t),this.parse(this.contents)}return t.open=function(e){var n;return n=o.readFileSync(e),new t(n)},t.prototype.parse=function(t){var e,n,o,a,s,h,u,c,l,f,d,p,g,v,m,y,_,w,b,x,S,k,E,C,I,A,L,R,T;for(h=t.readInt(),_=t.readInt(),s=t.readInt(),y=t.readInt(),this.map={},t.pos=_+24,L=t.readShort()+_,S=t.readShort()+_,t.pos=L,w=t.readShort(),d=R=0;w>=R;d=R+=1){for(A=t.readString(4),b=t.readShort(),I=t.readShort(),this.map[A]={list:[],named:{}},C=t.pos,t.pos=L+I,g=T=0;b>=T;g=T+=1)p=t.readShort(),k=t.readShort(),e=t.readByte(),n=t.readByte()<<16,o=t.readByte()<<8,a=t.readByte(),u=h+(0|n|o|a),f=t.readUInt32(),c={id:p,attributes:e,offset:u,handle:f},E=t.pos,-1!==k&&_+y>S+k?(t.pos=S+k,v=t.readByte(),c.name=t.readString(v)):"sfnt"===A&&(t.pos=c.offset,m=t.readUInt32(),l={},l.contents=new r(t.slice(t.pos,t.pos+m)),l.directory=new i(l.contents),x=new NameTable(l),c.name=x.fontName[0].raw),t.pos=E,this.map[A].list.push(c),c.name&&(this.map[A].named[c.name]=c);t.pos=C}},t.prototype.getNamedFont=function(t){var e,n,r,i,o,a;if(e=this.contents,i=e.pos,n=null!=(a=this.map.sfnt)?a.named[t]:void 0,!n)throw new Error("Font "+t+" not found in DFont file.");return e.pos=n.offset,r=e.readUInt32(),o=e.slice(e.pos,e.pos+r),e.pos=i,o},t}(),t.exports=e}).call(this)},function(t,e,n){(function(e){(function(){var r,i,o=[].slice;r=n(72),i=function(){function t(t){var e,n,r,i;for(this.scalarType=t.readInt(),this.tableCount=t.readShort(),this.searchRange=t.readShort(),this.entrySelector=t.readShort(),this.rangeShift=t.readShort(),this.tables={},n=r=0,i=this.tableCount;i>=0?i>r:r>i;n=i>=0?++r:--r)e={tag:t.readString(4),checksum:t.readInt(),offset:t.readInt(),length:t.readInt()},this.tables[e.tag]=e}var n;return t.prototype.encode=function(t){var i,o,a,s,h,u,c,l,f,d,p,g,v,m;g=Object.keys(t).length,u=Math.log(2),f=16*Math.floor(Math.log(g)/u),s=Math.floor(f/u),l=16*g-f,o=new r,o.writeInt(this.scalarType),o.writeShort(g),o.writeShort(f),o.writeShort(s),o.writeShort(l),a=16*g,c=o.pos+a,h=null,v=[];for(m in t)for(p=t[m],o.writeString(m),o.writeInt(n(p)),o.writeInt(c),o.writeInt(p.length),v=v.concat(p),"head"===m&&(h=c),c+=p.length;c%4;)v.push(0),c++;return o.write(v),d=n(o.data),i=2981146554-d,o.pos=h+8,o.writeUInt32(i),new e(o.data)},n=function(t){var e,n,i,a,s;for(t=o.call(t);t.length%4;)t.push(0);for(i=new r(t),n=0,e=a=0,s=t.length;s>a;e=a+=4)n+=i.readUInt32();return 4294967295&n},t}(),t.exports=i}).call(this)}).call(e,n(2).Buffer)},function(t,e,n){(function(){var e,r,NameTable,i,o,a={}.hasOwnProperty,s=function(t,e){function n(){this.constructor=t}for(var r in e)a.call(e,r)&&(t[r]=e[r]);return n.prototype=e.prototype,t.prototype=new n,t.__super__=e.prototype,t};i=n(76),e=n(72),o=n(77),NameTable=function(t){function NameTable(){return NameTable.__super__.constructor.apply(this,arguments)}var n;return s(NameTable,t),NameTable.prototype.tag="name",NameTable.prototype.parse=function(t){var e,n,i,o,a,s,h,u,c,l,f,d,p;for(t.pos=this.offset,o=t.readShort(),e=t.readShort(),h=t.readShort(),n=[],a=l=0;e>=0?e>l:l>e;a=e>=0?++l:--l)n.push({platformID:t.readShort(),encodingID:t.readShort(),languageID:t.readShort(),nameID:t.readShort(),length:t.readShort(),offset:this.offset+h+t.readShort()});for(u={},a=f=0,d=n.length;d>f;a=++f)i=n[a],t.pos=i.offset,c=t.readString(i.length),s=new r(c,i),null==u[p=i.nameID]&&(u[p]=[]),u[i.nameID].push(s);return this.strings=u,this.copyright=u[0],this.fontFamily=u[1],this.fontSubfamily=u[2],this.uniqueSubfamily=u[3],this.fontName=u[4],this.version=u[5],this.postscriptName=u[6][0].raw.replace(/[\x00-\x19\x80-\xff]/g,""),this.trademark=u[7],this.manufacturer=u[8],this.designer=u[9],this.description=u[10],this.vendorUrl=u[11],this.designerUrl=u[12],this.license=u[13],this.licenseUrl=u[14],this.preferredFamily=u[15],this.preferredSubfamily=u[17],this.compatibleFull=u[18],this.sampleText=u[19]},n="AAAAAA",NameTable.prototype.encode=function(){var t,i,a,s,h,u,c,l,f,d,p,g,v,m;f={},m=this.strings;for(t in m)p=m[t],f[t]=p;h=new r(""+n+"+"+this.postscriptName,{platformID:1,encodingID:0,languageID:0}),f[6]=[h],n=o.successorOf(n),u=0;for(t in f)i=f[t],null!=i&&(u+=i.length);d=new e,c=new e,d.writeShort(0),d.writeShort(u),d.writeShort(6+12*u);for(a in f)if(i=f[a],null!=i)for(g=0,v=i.length;v>g;g++)l=i[g],d.writeShort(l.platformID),d.writeShort(l.encodingID),d.writeShort(l.languageID),d.writeShort(a),d.writeShort(l.length),d.writeShort(c.pos),c.writeString(l.raw);return s={postscriptName:h.raw,table:d.data.concat(c.data)}},NameTable}(i),t.exports=NameTable,r=function(){function t(t,e){this.raw=t,this.length=this.raw.length,this.platformID=e.platformID,this.encodingID=e.encodingID,this.languageID=e.languageID}return t}()}).call(this)},function(t,e){(function(){var e;e=function(){function t(t){var e;this.file=t,e=this.file.directory.tables[this.tag],this.exists=!!e,e&&(this.offset=e.offset,this.length=e.length,this.parse(this.file.contents))}return t.prototype.parse=function(){},t.prototype.encode=function(){},t.prototype.raw=function(){return this.exists?(this.file.contents.pos=this.offset,this.file.contents.read(this.length)):null},t}(),t.exports=e}).call(this)},function(t,e){(function(){e.successorOf=function(t){var e,n,r,i,o,a,s,h,u,c;for(n="abcdefghijklmnopqrstuvwxyz",h=n.length,c=t,i=t.length;i>=0;){if(s=t.charAt(--i),isNaN(s)){if(o=n.indexOf(s.toLowerCase()),-1===o)u=s,r=!0;else if(u=n.charAt((o+1)%h),a=s===s.toUpperCase(),a&&(u=u.toUpperCase()),r=o+1>=h,r&&0===i){e=a?"A":"a",c=e+u+c.slice(1);break}}else if(u=+s+1,r=u>9,r&&(u=0),r&&0===i){c="1"+u+c.slice(1);break}if(c=c.slice(0,i)+u+c.slice(i+1),!r)break}return c},e.invert=function(t){var e,n,r;n={};for(e in t)r=t[e],n[r]=e;return n}}).call(this)},function(t,e,n){(function(){var e,HeadTable,r,i={}.hasOwnProperty,o=function(t,e){function n(){this.constructor=t}for(var r in e)i.call(e,r)&&(t[r]=e[r]);return n.prototype=e.prototype,t.prototype=new n,t.__super__=e.prototype,t};r=n(76),e=n(72),HeadTable=function(t){function HeadTable(){return HeadTable.__super__.constructor.apply(this,arguments)}return o(HeadTable,t),HeadTable.prototype.tag="head",HeadTable.prototype.parse=function(t){return t.pos=this.offset,this.version=t.readInt(),this.revision=t.readInt(),this.checkSumAdjustment=t.readInt(),this.magicNumber=t.readInt(),this.flags=t.readShort(),this.unitsPerEm=t.readShort(),this.created=t.readLongLong(),this.modified=t.readLongLong(),this.xMin=t.readShort(),this.yMin=t.readShort(),this.xMax=t.readShort(),this.yMax=t.readShort(),this.macStyle=t.readShort(),this.lowestRecPPEM=t.readShort(),this.fontDirectionHint=t.readShort(),this.indexToLocFormat=t.readShort(),this.glyphDataFormat=t.readShort()},HeadTable.prototype.encode=function(t){var n;return n=new e,n.writeInt(this.version),n.writeInt(this.revision),n.writeInt(this.checkSumAdjustment),n.writeInt(this.magicNumber),n.writeShort(this.flags),n.writeShort(this.unitsPerEm),n.writeLongLong(this.created),n.writeLongLong(this.modified),n.writeShort(this.xMin),n.writeShort(this.yMin),n.writeShort(this.xMax),n.writeShort(this.yMax),n.writeShort(this.macStyle),n.writeShort(this.lowestRecPPEM),n.writeShort(this.fontDirectionHint),n.writeShort(t.type),n.writeShort(this.glyphDataFormat),n.data},HeadTable}(r),t.exports=HeadTable}).call(this)},function(t,e,n){(function(){var e,CmapTable,r,i,o={}.hasOwnProperty,a=function(t,e){function n(){this.constructor=t}for(var r in e)o.call(e,r)&&(t[r]=e[r]);return n.prototype=e.prototype,t.prototype=new n,t.__super__=e.prototype,t};i=n(76),r=n(72),CmapTable=function(t){function CmapTable(){return CmapTable.__super__.constructor.apply(this,arguments)}return a(CmapTable,t),CmapTable.prototype.tag="cmap",CmapTable.prototype.parse=function(t){var n,r,i,o;for(t.pos=this.offset,this.version=t.readUInt16(),i=t.readUInt16(),this.tables=[],this.unicode=null,r=o=0;i>=0?i>o:o>i;r=i>=0?++o:--o)n=new e(t,this.offset),this.tables.push(n),n.isUnicode&&null==this.unicode&&(this.unicode=n);return!0},CmapTable.encode=function(t,n){var i,o;return null==n&&(n="macroman"),i=e.encode(t,n),o=new r,o.writeUInt16(0),o.writeUInt16(1),i.table=o.data.concat(i.subtable),i},CmapTable}(i),e=function(){function t(t,e){var n,r,i,o,a,s,h,u,c,l,f,d,p,g,v,m,y,_,w;switch(this.platformID=t.readUInt16(),this.encodingID=t.readShort(),this.offset=e+t.readInt(),l=t.pos,t.pos=this.offset,this.format=t.readUInt16(),this.length=t.readUInt16(),this.language=t.readUInt16(),this.isUnicode=3===this.platformID&&1===this.encodingID&&4===this.format||0===this.platformID&&4===this.format,this.codeMap={},this.format){case 0:for(s=m=0;256>m;s=++m)this.codeMap[s]=t.readByte();break;case 4:for(d=t.readUInt16(),f=d/2,t.pos+=6,i=function(){var e,n;for(n=[],s=e=0;f>=0?f>e:e>f;s=f>=0?++e:--e)n.push(t.readUInt16());return n}(),t.pos+=2,g=function(){var e,n;for(n=[],s=e=0;f>=0?f>e:e>f;s=f>=0?++e:--e)n.push(t.readUInt16());return n}(),h=function(){var e,n;for(n=[],s=e=0;f>=0?f>e:e>f;s=f>=0?++e:--e)n.push(t.readUInt16());return n}(),u=function(){var e,n;for(n=[],s=e=0;f>=0?f>e:e>f;s=f>=0?++e:--e)n.push(t.readUInt16());return n}(),r=(this.length-t.pos+this.offset)/2,a=function(){var e,n;for(n=[],s=e=0;r>=0?r>e:e>r;s=r>=0?++e:--e)n.push(t.readUInt16());return n}(),s=y=0,w=i.length;w>y;s=++y)for(v=i[s],p=g[s],n=_=p;v>=p?v>=_:_>=v;n=v>=p?++_:--_)0===u[s]?o=n+h[s]:(c=u[s]/2+(n-p)-(f-s),o=a[c]||0,0!==o&&(o+=h[s])),this.codeMap[n]=65535&o}t.pos=l}return t.encode=function(t,e){var n,i,o,a,s,h,u,c,l,f,d,p,g,v,m,y,_,w,b,x,S,k,E,C,I,A,L,R,T,B,O,M,D,U,P,z,F,W,N,j,H,Z,G,Y,q,K,X;switch(T=new r,a=Object.keys(t).sort(function(t,e){return t-e}),e){case"macroman":for(g=0,v=function(){var t,e;for(e=[],p=t=0;256>t;p=++t)e.push(0);return e}(),y={0:0},o={},B=0,U=a.length;U>B;B++)i=a[B],null==y[Y=t[i]]&&(y[Y]=++g),o[i]={old:t[i],"new":y[t[i]]},v[i]=y[t[i]];return T.writeUInt16(1),T.writeUInt16(0),T.writeUInt32(12),T.writeUInt16(0),T.writeUInt16(262),T.writeUInt16(0),T.write(v),k={charMap:o,subtable:T.data,maxGlyphID:g+1};case"unicode":for(L=[],l=[],_=0,y={},n={},m=u=null,O=0,P=a.length;P>O;O++)i=a[O],b=t[i],null==y[b]&&(y[b]=++_),n[i]={old:b,"new":y[b]},s=y[b]-i,(null==m||s!==u)&&(m&&l.push(m),L.push(i),u=s),m=i;for(m&&l.push(m),l.push(65535),L.push(65535),C=L.length,I=2*C,E=2*Math.pow(Math.log(C)/Math.LN2,2),f=Math.log(E/2)/Math.LN2,S=2*C-E,h=[],x=[],d=[],p=M=0,z=L.length;z>M;p=++M){if(A=L[p],c=l[p],65535===A){h.push(0),x.push(0);break}if(R=n[A]["new"],A-R>=32768)for(h.push(0),x.push(2*(d.length+C-p)),i=D=A;c>=A?c>=D:D>=c;i=c>=A?++D:--D)d.push(n[i]["new"]);else h.push(R-A),x.push(0)}for(T.writeUInt16(3),T.writeUInt16(1),T.writeUInt32(12),T.writeUInt16(4),T.writeUInt16(16+8*C+2*d.length),T.writeUInt16(0),T.writeUInt16(I),T.writeUInt16(E),T.writeUInt16(f),T.writeUInt16(S),Z=0,F=l.length;F>Z;Z++)i=l[Z],T.writeUInt16(i);for(T.writeUInt16(0),G=0,W=L.length;W>G;G++)i=L[G],T.writeUInt16(i);for(q=0,N=h.length;N>q;q++)s=h[q],T.writeUInt16(s);for(K=0,j=x.length;j>K;K++)w=x[K],T.writeUInt16(w);for(X=0,H=d.length;H>X;X++)g=d[X],T.writeUInt16(g);return k={charMap:n,subtable:T.data,maxGlyphID:_+1}}},t}(),t.exports=CmapTable}).call(this)},function(t,e,n){(function(){var e,HmtxTable,r,i={}.hasOwnProperty,o=function(t,e){function n(){this.constructor=t}for(var r in e)i.call(e,r)&&(t[r]=e[r]);return n.prototype=e.prototype,t.prototype=new n,t.__super__=e.prototype,t};r=n(76),e=n(72),HmtxTable=function(t){function HmtxTable(){return HmtxTable.__super__.constructor.apply(this,arguments)}return o(HmtxTable,t),HmtxTable.prototype.tag="hmtx",HmtxTable.prototype.parse=function(t){var e,n,r,i,o,a,s,h;for(t.pos=this.offset,this.metrics=[],e=o=0,s=this.file.hhea.numberOfMetrics;s>=0?s>o:o>s;e=s>=0?++o:--o)this.metrics.push({advance:t.readUInt16(),lsb:t.readInt16()});for(r=this.file.maxp.numGlyphs-this.file.hhea.numberOfMetrics,this.leftSideBearings=function(){var n,i;for(i=[],e=n=0;r>=0?r>n:n>r;e=r>=0?++n:--n)i.push(t.readInt16());return i}(),this.widths=function(){var t,e,n,r;for(n=this.metrics,r=[],t=0,e=n.length;e>t;t++)i=n[t],r.push(i.advance);return r}.call(this),n=this.widths[this.widths.length-1],h=[],e=a=0;r>=0?r>a:a>r;e=r>=0?++a:--a)h.push(this.widths.push(n));return h},HmtxTable.prototype.forGlyph=function(t){var e;return t in this.metrics?this.metrics[t]:e={advance:this.metrics[this.metrics.length-1].advance,lsb:this.leftSideBearings[t-this.metrics.length]}},HmtxTable.prototype.encode=function(t){var n,r,i,o,a;for(i=new e,o=0,a=t.length;a>o;o++)n=t[o],r=this.forGlyph(n),i.writeUInt16(r.advance),i.writeUInt16(r.lsb);return i.data},HmtxTable}(r),t.exports=HmtxTable}).call(this)},function(t,e,n){(function(){var e,HheaTable,r,i={}.hasOwnProperty,o=function(t,e){function n(){this.constructor=t}for(var r in e)i.call(e,r)&&(t[r]=e[r]);return n.prototype=e.prototype,t.prototype=new n,t.__super__=e.prototype,t};r=n(76),e=n(72),HheaTable=function(t){function HheaTable(){return HheaTable.__super__.constructor.apply(this,arguments)}return o(HheaTable,t),HheaTable.prototype.tag="hhea",HheaTable.prototype.parse=function(t){return t.pos=this.offset,this.version=t.readInt(),this.ascender=t.readShort(),this.decender=t.readShort(),this.lineGap=t.readShort(),this.advanceWidthMax=t.readShort(),this.minLeftSideBearing=t.readShort(),this.minRightSideBearing=t.readShort(),this.xMaxExtent=t.readShort(),this.caretSlopeRise=t.readShort(),this.caretSlopeRun=t.readShort(),this.caretOffset=t.readShort(),t.pos+=8,this.metricDataFormat=t.readShort(),this.numberOfMetrics=t.readUInt16()},HheaTable.prototype.encode=function(t){var n,r,i,o;for(r=new e,r.writeInt(this.version),r.writeShort(this.ascender),r.writeShort(this.decender),r.writeShort(this.lineGap),r.writeShort(this.advanceWidthMax),r.writeShort(this.minLeftSideBearing),r.writeShort(this.minRightSideBearing),r.writeShort(this.xMaxExtent),r.writeShort(this.caretSlopeRise),r.writeShort(this.caretSlopeRun),r.writeShort(this.caretOffset),n=i=0,o=8;o>=0?o>i:i>o;n=o>=0?++i:--i)r.writeByte(0);return r.writeShort(this.metricDataFormat),r.writeUInt16(t.length),r.data},HheaTable}(r),t.exports=HheaTable}).call(this)},function(t,e,n){(function(){var e,MaxpTable,r,i={}.hasOwnProperty,o=function(t,e){function n(){this.constructor=t}for(var r in e)i.call(e,r)&&(t[r]=e[r]);return n.prototype=e.prototype,t.prototype=new n,t.__super__=e.prototype,t};r=n(76),e=n(72),MaxpTable=function(t){function MaxpTable(){return MaxpTable.__super__.constructor.apply(this,arguments)}return o(MaxpTable,t),MaxpTable.prototype.tag="maxp",MaxpTable.prototype.parse=function(t){return t.pos=this.offset,this.version=t.readInt(),this.numGlyphs=t.readUInt16(),this.maxPoints=t.readUInt16(),this.maxContours=t.readUInt16(),this.maxCompositePoints=t.readUInt16(),this.maxComponentContours=t.readUInt16(),this.maxZones=t.readUInt16(),this.maxTwilightPoints=t.readUInt16(),this.maxStorage=t.readUInt16(),this.maxFunctionDefs=t.readUInt16(),this.maxInstructionDefs=t.readUInt16(),this.maxStackElements=t.readUInt16(),this.maxSizeOfInstructions=t.readUInt16(),this.maxComponentElements=t.readUInt16(),this.maxComponentDepth=t.readUInt16()},MaxpTable.prototype.encode=function(t){var n;return n=new e,n.writeInt(this.version),n.writeUInt16(t.length),n.writeUInt16(this.maxPoints),n.writeUInt16(this.maxContours),n.writeUInt16(this.maxCompositePoints),n.writeUInt16(this.maxComponentContours),n.writeUInt16(this.maxZones),n.writeUInt16(this.maxTwilightPoints),n.writeUInt16(this.maxStorage),n.writeUInt16(this.maxFunctionDefs),n.writeUInt16(this.maxInstructionDefs),n.writeUInt16(this.maxStackElements),n.writeUInt16(this.maxSizeOfInstructions),n.writeUInt16(this.maxComponentElements),n.writeUInt16(this.maxComponentDepth),n.data},MaxpTable}(r),t.exports=MaxpTable}).call(this)},function(t,e,n){(function(){var e,PostTable,r,i={}.hasOwnProperty,o=function(t,e){function n(){this.constructor=t}for(var r in e)i.call(e,r)&&(t[r]=e[r]);return n.prototype=e.prototype,t.prototype=new n,t.__super__=e.prototype,t};r=n(76),e=n(72),PostTable=function(t){function PostTable(){return PostTable.__super__.constructor.apply(this,arguments)}var n;return o(PostTable,t),PostTable.prototype.tag="post",PostTable.prototype.parse=function(t){var e,n,r,i,o;switch(t.pos=this.offset,this.format=t.readInt(),this.italicAngle=t.readInt(),this.underlinePosition=t.readShort(),this.underlineThickness=t.readShort(),this.isFixedPitch=t.readInt(),this.minMemType42=t.readInt(),this.maxMemType42=t.readInt(),this.minMemType1=t.readInt(),this.maxMemType1=t.readInt(),this.format){case 65536:break;case 131072:for(r=t.readUInt16(),this.glyphNameIndex=[],e=i=0;r>=0?r>i:i>r;e=r>=0?++i:--i)this.glyphNameIndex.push(t.readUInt16());for(this.names=[],o=[];t.pos<this.offset+this.length;)n=t.readByte(),o.push(this.names.push(t.readString(n)));return o;case 151552:return r=t.readUInt16(),this.offsets=t.read(r);case 196608:break;case 262144:return this.map=function(){var n,r,i;for(i=[],e=n=0,r=this.file.maxp.numGlyphs;r>=0?r>n:n>r;e=r>=0?++n:--n)i.push(t.readUInt32());return i}.call(this)}},PostTable.prototype.glyphFor=function(t){var e;switch(this.format){case 65536:return n[t]||".notdef";case 131072:return e=this.glyphNameIndex[t],257>=e?n[e]:this.names[e-258]||".notdef";case 151552:return n[t+this.offsets[t]]||".notdef";case 196608:return".notdef";case 262144:return this.map[t]||65535}},PostTable.prototype.encode=function(t){var r,i,o,a,s,h,u,c,l,f,d,p,g,v,m;if(!this.exists)return null;if(h=this.raw(),196608===this.format)return h;for(l=new e(h.slice(0,32)),l.writeUInt32(131072),l.pos=32,o=[],c=[],f=0,g=t.length;g>f;f++)r=t[f],s=this.glyphFor(r),a=n.indexOf(s),-1!==a?o.push(a):(o.push(257+c.length),c.push(s));for(l.writeUInt16(Object.keys(t).length),d=0,v=o.length;v>d;d++)i=o[d],l.writeUInt16(i);for(p=0,m=c.length;m>p;p++)u=c[p],l.writeByte(u.length),l.writeString(u);return l.data},n=".notdef .null nonmarkingreturn space exclam quotedbl numbersign dollar percent\nampersand quotesingle parenleft parenright asterisk plus comma hyphen period slash\nzero one two three four five six seven eight nine colon semicolon less equal greater\nquestion at A B C D E F G H I J K L M N O P Q R S T U V W X Y Z\nbracketleft backslash bracketright asciicircum underscore grave\na b c d e f g h i j k l m n o p q r s t u v w x y z\nbraceleft bar braceright asciitilde Adieresis Aring Ccedilla Eacute Ntilde Odieresis\nUdieresis aacute agrave acircumflex adieresis atilde aring ccedilla eacute egrave\necircumflex edieresis iacute igrave icircumflex idieresis ntilde oacute ograve\nocircumflex odieresis otilde uacute ugrave ucircumflex udieresis dagger degree cent\nsterling section bullet paragraph germandbls registered copyright trademark acute\ndieresis notequal AE Oslash infinity plusminus lessequal greaterequal yen mu\npartialdiff summation product pi integral ordfeminine ordmasculine Omega ae oslash\nquestiondown exclamdown logicalnot radical florin approxequal Delta guillemotleft\nguillemotright ellipsis nonbreakingspace Agrave Atilde Otilde OE oe endash emdash\nquotedblleft quotedblright quoteleft quoteright divide lozenge ydieresis Ydieresis\nfraction currency guilsinglleft guilsinglright fi fl daggerdbl periodcentered\nquotesinglbase quotedblbase perthousand Acircumflex Ecircumflex Aacute Edieresis\nEgrave Iacute Icircumflex Idieresis Igrave Oacute Ocircumflex apple Ograve Uacute\nUcircumflex Ugrave dotlessi circumflex tilde macron breve dotaccent ring cedilla\nhungarumlaut ogonek caron Lslash lslash Scaron scaron Zcaron zcaron brokenbar Eth\neth Yacute yacute Thorn thorn minus multiply onesuperior twosuperior threesuperior\nonehalf onequarter threequarters franc Gbreve gbreve Idotaccent Scedilla scedilla\nCacute cacute Ccaron ccaron dcroat".split(/\s+/g),
PostTable}(r),t.exports=PostTable}).call(this)},function(t,e,n){(function(){var OS2Table,e,r={}.hasOwnProperty,i=function(t,e){function n(){this.constructor=t}for(var i in e)r.call(e,i)&&(t[i]=e[i]);return n.prototype=e.prototype,t.prototype=new n,t.__super__=e.prototype,t};e=n(76),OS2Table=function(t){function OS2Table(){return OS2Table.__super__.constructor.apply(this,arguments)}return i(OS2Table,t),OS2Table.prototype.tag="OS/2",OS2Table.prototype.parse=function(t){var e;return t.pos=this.offset,this.version=t.readUInt16(),this.averageCharWidth=t.readShort(),this.weightClass=t.readUInt16(),this.widthClass=t.readUInt16(),this.type=t.readShort(),this.ySubscriptXSize=t.readShort(),this.ySubscriptYSize=t.readShort(),this.ySubscriptXOffset=t.readShort(),this.ySubscriptYOffset=t.readShort(),this.ySuperscriptXSize=t.readShort(),this.ySuperscriptYSize=t.readShort(),this.ySuperscriptXOffset=t.readShort(),this.ySuperscriptYOffset=t.readShort(),this.yStrikeoutSize=t.readShort(),this.yStrikeoutPosition=t.readShort(),this.familyClass=t.readShort(),this.panose=function(){var n,r;for(r=[],e=n=0;10>n;e=++n)r.push(t.readByte());return r}(),this.charRange=function(){var n,r;for(r=[],e=n=0;4>n;e=++n)r.push(t.readInt());return r}(),this.vendorID=t.readString(4),this.selection=t.readShort(),this.firstCharIndex=t.readShort(),this.lastCharIndex=t.readShort(),this.version>0&&(this.ascent=t.readShort(),this.descent=t.readShort(),this.lineGap=t.readShort(),this.winAscent=t.readShort(),this.winDescent=t.readShort(),this.codePageRange=function(){var n,r;for(r=[],e=n=0;2>n;e=++n)r.push(t.readInt());return r}(),this.version>1)?(this.xHeight=t.readShort(),this.capHeight=t.readShort(),this.defaultChar=t.readShort(),this.breakChar=t.readShort(),this.maxContext=t.readShort()):void 0},OS2Table.prototype.encode=function(){return this.raw()},OS2Table}(e),t.exports=OS2Table}).call(this)},function(t,e,n){(function(){var e,LocaTable,r,i={}.hasOwnProperty,o=function(t,e){function n(){this.constructor=t}for(var r in e)i.call(e,r)&&(t[r]=e[r]);return n.prototype=e.prototype,t.prototype=new n,t.__super__=e.prototype,t};r=n(76),e=n(72),LocaTable=function(t){function LocaTable(){return LocaTable.__super__.constructor.apply(this,arguments)}return o(LocaTable,t),LocaTable.prototype.tag="loca",LocaTable.prototype.parse=function(t){var e,n;return t.pos=this.offset,e=this.file.head.indexToLocFormat,0===e?this.offsets=function(){var e,r,i;for(i=[],n=e=0,r=this.length;r>e;n=e+=2)i.push(2*t.readUInt16());return i}.call(this):this.offsets=function(){var e,r,i;for(i=[],n=e=0,r=this.length;r>e;n=e+=4)i.push(t.readUInt32());return i}.call(this)},LocaTable.prototype.indexOf=function(t){return this.offsets[t]},LocaTable.prototype.lengthOf=function(t){return this.offsets[t+1]-this.offsets[t]},LocaTable.prototype.encode=function(t){var n,r,i,o,a,s,h,u,c,l,f;for(o=new e,a=0,u=t.length;u>a;a++)if(r=t[a],r>65535){for(f=this.offsets,s=0,c=f.length;c>s;s++)n=f[s],o.writeUInt32(n);return i={format:1,table:o.data}}for(h=0,l=t.length;l>h;h++)n=t[h],o.writeUInt16(n/2);return i={format:0,table:o.data}},LocaTable}(r),t.exports=LocaTable}).call(this)},function(t,e,n){(function(){var e,r,GlyfTable,i,o,a={}.hasOwnProperty,s=function(t,e){function n(){this.constructor=t}for(var r in e)a.call(e,r)&&(t[r]=e[r]);return n.prototype=e.prototype,t.prototype=new n,t.__super__=e.prototype,t},h=[].slice;o=n(76),r=n(72),GlyfTable=function(t){function GlyfTable(){return GlyfTable.__super__.constructor.apply(this,arguments)}return s(GlyfTable,t),GlyfTable.prototype.tag="glyf",GlyfTable.prototype.parse=function(t){return this.cache={}},GlyfTable.prototype.glyphFor=function(t){var n,o,a,s,h,u,c,l,f,d;return t in this.cache?this.cache[t]:(s=this.file.loca,n=this.file.contents,o=s.indexOf(t),a=s.lengthOf(t),0===a?this.cache[t]=null:(n.pos=this.offset+o,u=new r(n.read(a)),h=u.readShort(),l=u.readShort(),d=u.readShort(),c=u.readShort(),f=u.readShort(),-1===h?this.cache[t]=new e(u,l,d,c,f):this.cache[t]=new i(u,h,l,d,c,f),this.cache[t]))},GlyfTable.prototype.encode=function(t,e,n){var r,i,o,a,s,h;for(a=[],o=[],s=0,h=e.length;h>s;s++)i=e[s],r=t[i],o.push(a.length),r&&(a=a.concat(r.encode(n)));return o.push(a.length),{table:a,offsets:o}},GlyfTable}(o),i=function(){function t(t,e,n,r,i,o){this.raw=t,this.numberOfContours=e,this.xMin=n,this.yMin=r,this.xMax=i,this.yMax=o,this.compound=!1}return t.prototype.encode=function(){return this.raw.data},t}(),e=function(){function t(t,r,s,h,u){var c,l;for(this.raw=t,this.xMin=r,this.yMin=s,this.xMax=h,this.yMax=u,this.compound=!0,this.glyphIDs=[],this.glyphOffsets=[],c=this.raw;;){if(l=c.readShort(),this.glyphOffsets.push(c.pos),this.glyphIDs.push(c.readShort()),!(l&n))break;l&e?c.pos+=4:c.pos+=2,l&a?c.pos+=8:l&i?c.pos+=4:l&o&&(c.pos+=2)}}var e,n,i,o,a,s;return e=1,o=8,n=32,i=64,a=128,s=256,t.prototype.encode=function(t){var e,n,i,o,a,s;for(i=new r(h.call(this.raw.data)),s=this.glyphIDs,e=o=0,a=s.length;a>o;e=++o)n=s[e],i.pos=this.glyphOffsets[e],i.writeShort(t[n]);return i.data},t}(),t.exports=GlyfTable}).call(this)},function(t,e,n){(function(){var e,r;r=n(44),e=function(){function t(t){var e,r;this.contents=t,this.attributes={},this.glyphWidths={},this.boundingBoxes={},this.parse(),this.charWidths=function(){var t,e;for(e=[],r=t=0;255>=t;r=++t)e.push(this.glyphWidths[n[r]]);return e}.call(this),this.bbox=function(){var t,n,r,i;for(r=this.attributes.FontBBox.split(/\s+/),i=[],t=0,n=r.length;n>t;t++)e=r[t],i.push(+e);return i}.call(this),this.ascender=+(this.attributes.Ascender||0),this.decender=+(this.attributes.Descender||0),this.lineGap=this.bbox[3]-this.bbox[1]-(this.ascender-this.decender)}var e,n;return t.open=function(e){return new t(r.readFileSync(e,"utf8"))},t.prototype.parse=function(){var t,e,n,r,i,o,a,s,h,u;for(o="",u=this.contents.split("\n"),s=0,h=u.length;h>s;s++)if(n=u[s],r=n.match(/^Start(\w+)/))o=r[1];else if(r=n.match(/^End(\w+)/))o="";else switch(o){case"FontMetrics":r=n.match(/(^\w+)\s+(.*)/),e=r[1],a=r[2],(t=this.attributes[e])?(Array.isArray(t)||(t=this.attributes[e]=[t]),t.push(a)):this.attributes[e]=a;break;case"CharMetrics":if(!/^CH?\s/.test(n))continue;i=n.match(/\bN\s+(\.?\w+)\s*;/)[1],this.glyphWidths[i]=+n.match(/\bWX\s+(\d+)\s*;/)[1]}},e={402:131,8211:150,8212:151,8216:145,8217:146,8218:130,8220:147,8221:148,8222:132,8224:134,8225:135,8226:149,8230:133,8364:128,8240:137,8249:139,8250:155,710:136,8482:153,338:140,339:156,732:152,352:138,353:154,376:159,381:142,382:158},t.prototype.encodeText=function(t){var n,r,i,o,a;for(i="",r=o=0,a=t.length;a>=0?a>o:o>a;r=a>=0?++o:--o)n=t.charCodeAt(r),n=e[n]||n,i+=String.fromCharCode(n);return i},t.prototype.characterToGlyph=function(t){return n[e[t]||t]},t.prototype.widthOfGlyph=function(t){return this.glyphWidths[t]},n=".notdef       .notdef        .notdef        .notdef\n.notdef       .notdef        .notdef        .notdef\n.notdef       .notdef        .notdef        .notdef\n.notdef       .notdef        .notdef        .notdef\n.notdef       .notdef        .notdef        .notdef\n.notdef       .notdef        .notdef        .notdef\n.notdef       .notdef        .notdef        .notdef\n.notdef       .notdef        .notdef        .notdef\n\nspace         exclam         quotedbl       numbersign\ndollar        percent        ampersand      quotesingle\nparenleft     parenright     asterisk       plus\ncomma         hyphen         period         slash\nzero          one            two            three\nfour          five           six            seven\neight         nine           colon          semicolon\nless          equal          greater        question\n\nat            A              B              C\nD             E              F              G\nH             I              J              K\nL             M              N              O\nP             Q              R              S\nT             U              V              W\nX             Y              Z              bracketleft\nbackslash     bracketright   asciicircum    underscore\n\ngrave         a              b              c\nd             e              f              g\nh             i              j              k\nl             m              n              o\np             q              r              s\nt             u              v              w\nx             y              z              braceleft\nbar           braceright     asciitilde     .notdef\n\nEuro          .notdef        quotesinglbase florin\nquotedblbase  ellipsis       dagger         daggerdbl\ncircumflex    perthousand    Scaron         guilsinglleft\nOE            .notdef        Zcaron         .notdef\n.notdef       quoteleft      quoteright     quotedblleft\nquotedblright bullet         endash         emdash\ntilde         trademark      scaron         guilsinglright\noe            .notdef        zcaron         ydieresis\n\nspace         exclamdown     cent           sterling\ncurrency      yen            brokenbar      section\ndieresis      copyright      ordfeminine    guillemotleft\nlogicalnot    hyphen         registered     macron\ndegree        plusminus      twosuperior    threesuperior\nacute         mu             paragraph      periodcentered\ncedilla       onesuperior    ordmasculine   guillemotright\nonequarter    onehalf        threequarters  questiondown\n\nAgrave        Aacute         Acircumflex    Atilde\nAdieresis     Aring          AE             Ccedilla\nEgrave        Eacute         Ecircumflex    Edieresis\nIgrave        Iacute         Icircumflex    Idieresis\nEth           Ntilde         Ograve         Oacute\nOcircumflex   Otilde         Odieresis      multiply\nOslash        Ugrave         Uacute         Ucircumflex\nUdieresis     Yacute         Thorn          germandbls\n\nagrave        aacute         acircumflex    atilde\nadieresis     aring          ae             ccedilla\negrave        eacute         ecircumflex    edieresis\nigrave        iacute         icircumflex    idieresis\neth           ntilde         ograve         oacute\nocircumflex   otilde         odieresis      divide\noslash        ugrave         uacute         ucircumflex\nudieresis     yacute         thorn          ydieresis".split(/\s+/),t}(),t.exports=e}).call(this)},function(t,e,n){(function(){var CmapTable,e,r,i=[].indexOf||function(t){for(var e=0,n=this.length;n>e;e++)if(e in this&&this[e]===t)return e;return-1};CmapTable=n(79),r=n(77),e=function(){function t(t){this.font=t,this.subset={},this.unicodes={},this.next=33}return t.prototype.use=function(t){var e,n,r;{if("string"!=typeof t)return this.unicodes[t]?void 0:(this.subset[this.next]=t,this.unicodes[t]=this.next++);for(e=n=0,r=t.length;r>=0?r>n:n>r;e=r>=0?++n:--n)this.use(t.charCodeAt(e))}},t.prototype.encodeText=function(t){var e,n,r,i,o;for(r="",n=i=0,o=t.length;o>=0?o>i:i>o;n=o>=0?++i:--i)e=this.unicodes[t.charCodeAt(n)],r+=String.fromCharCode(e);return r},t.prototype.generateCmap=function(){var t,e,n,r,i;r=this.font.cmap.tables[0].codeMap,t={},i=this.subset;for(e in i)n=i[e],t[e]=r[n];return t},t.prototype.glyphIDs=function(){var t,e,n,r,o,a;r=this.font.cmap.tables[0].codeMap,t=[0],a=this.subset;for(e in a)n=a[e],o=r[n],null!=o&&i.call(t,o)<0&&t.push(o);return t.sort()},t.prototype.glyphsFor=function(t){var e,n,r,i,o,a,s;for(r={},o=0,a=t.length;a>o;o++)i=t[o],r[i]=this.font.glyf.glyphFor(i);e=[];for(i in r)n=r[i],(null!=n?n.compound:void 0)&&e.push.apply(e,n.glyphIDs);if(e.length>0){s=this.glyphsFor(e);for(i in s)n=s[i],r[i]=n}return r},t.prototype.encode=function(){var t,e,n,i,o,a,s,h,u,c,l,f,d,p,g,v,m;t=CmapTable.encode(this.generateCmap(),"unicode"),i=this.glyphsFor(this.glyphIDs()),f={0:0},v=t.charMap;for(e in v)a=v[e],f[a.old]=a["new"];l=t.maxGlyphID;for(d in i)d in f||(f[d]=l++);u=r.invert(f),c=Object.keys(u).sort(function(t,e){return t-e}),p=function(){var t,e,n;for(n=[],t=0,e=c.length;e>t;t++)o=c[t],n.push(u[o]);return n}(),n=this.font.glyf.encode(i,p,f),s=this.font.loca.encode(n.offsets),h=this.font.name.encode(),this.postscriptName=h.postscriptName,this.cmap={},m=t.charMap;for(e in m)a=m[e],this.cmap[e]=a.old;return g={cmap:t.table,glyf:n.table,loca:s.table,hmtx:this.font.hmtx.encode(p),hhea:this.font.hhea.encode(p),maxp:this.font.maxp.encode(p),post:this.font.post.encode(p),name:h.table,head:this.font.head.encode(s)},this.font.os2.exists&&(g["OS/2"]=this.font.os2.raw()),this.font.directory.encode(g)},t}(),t.exports=e}).call(this)},function(t,e,n){(function(){var e;e=n(90),t.exports={initText:function(){return this.x=0,this.y=0,this._lineGap=0},lineGap:function(t){return this._lineGap=t,this},moveDown:function(t){return null==t&&(t=1),this.y+=this.currentLineHeight(!0)*t+this._lineGap,this},moveUp:function(t){return null==t&&(t=1),this.y-=this.currentLineHeight(!0)*t+this._lineGap,this},_text:function(t,n,r,i,o){var a,s,h,u,c;if(i=this._initOptions(n,r,i),t=""+t,i.wordSpacing&&(t=t.replace(/\s{2,}/g," ")),i.width)s=this._wrapper,s||(s=new e(this,i),s.on("line",o)),this._wrapper=i.continued?s:null,this._textOptions=i.continued?i:null,s.wrap(t,i);else for(c=t.split("\n"),h=0,u=c.length;u>h;h++)a=c[h],o(a,i);return this},text:function(t,e,n,r){return this._text(t,e,n,r,this._line.bind(this))},widthOfString:function(t,e){return null==e&&(e={}),this._font.widthOfString(t,this._fontSize)+(e.characterSpacing||0)*(t.length-1)},heightOfString:function(t,e){var n,r,i,o;return null==e&&(e={}),i=this.x,o=this.y,e=this._initOptions(e),e.height=1/0,r=e.lineGap||this._lineGap||0,this._text(t,this.x,this.y,e,function(t){return function(e,n){return t.y+=t.currentLineHeight(!0)+r}}(this)),n=this.y-o,this.x=i,this.y=o,n},list:function(t,n,r,i,o){var a,s,h,u,c,l,f,d;return i=this._initOptions(n,r,i),d=Math.round(this._font.ascender/1e3*this._fontSize/3),h=i.textIndent||5*d,u=i.bulletIndent||8*d,l=1,c=[],f=[],a=function(t){var e,n,r,i,o;for(o=[],e=r=0,i=t.length;i>r;e=++r)n=t[e],Array.isArray(n)?(l++,a(n),o.push(l--)):(c.push(n),o.push(f.push(l)));return o},a(t),o=new e(this,i),o.on("line",this._line.bind(this)),l=1,s=0,o.on("firstLine",function(t){return function(){var e,n;return(n=f[s++])!==l&&(e=u*(n-l),t.x+=e,o.lineWidth-=e,l=n),t.circle(t.x-h+d,t.y+d+d/2,d),t.fill()}}(this)),o.on("sectionStart",function(t){return function(){var e;return e=h+u*(l-1),t.x+=e,o.lineWidth-=e}}(this)),o.on("sectionEnd",function(t){return function(){var e;return e=h+u*(l-1),t.x-=e,o.lineWidth+=e}}(this)),o.wrap(c.join("\n"),i),this},_initOptions:function(t,e,n){var r,i,o,a;if(null==t&&(t={}),null==n&&(n={}),"object"==typeof t&&(n=t,t=null),n=function(){var t,e,r;e={};for(t in n)r=n[t],e[t]=r;return e}(),this._textOptions){a=this._textOptions;for(r in a)o=a[r],"continued"!==r&&null==n[r]&&(n[r]=o)}return null!=t&&(this.x=t),null!=e&&(this.y=e),n.lineBreak!==!1&&(i=this.page.margins,null==n.width&&(n.width=this.page.width-this.x-i.right)),n.columns||(n.columns=0),null==n.columnGap&&(n.columnGap=18),n},_line:function(t,e,n){var r;return null==e&&(e={}),this._fragment(t,this.x,this.y,e),r=e.lineGap||this._lineGap||0,n?this.y+=this.currentLineHeight(!0)+r:this.x+=this.widthOfString(t)},_fragment:function(t,e,n,r){var i,o,a,s,h,u,c,l,f,d,p,g,v,m,y,_,w,b,x;if(t=""+t,0!==t.length){if(i=r.align||"left",m=r.wordSpacing||0,o=r.characterSpacing||0,r.width)switch(i){case"right":g=this.widthOfString(t.replace(/\s+$/,""),r),e+=r.lineWidth-g;break;case"center":e+=r.lineWidth/2-r.textWidth/2;break;case"justify":y=t.trim().split(/\s+/),g=this.widthOfString(t.replace(/\s+/g,""),r),p=this.widthOfString(" ")+o,m=Math.max(0,(r.lineWidth-g)/Math.max(1,y.length-1)-p)}if(d=r.textWidth+m*(r.wordCount-1)+o*(t.length-1),r.link&&this.link(e,n,d,this.currentLineHeight(),r.link),(r.underline||r.strike)&&(this.save(),r.stroke||this.strokeColor.apply(this,this._fillColor),c=this._fontSize<10?.5:Math.floor(this._fontSize/10),this.lineWidth(c),s=r.underline?1:2,l=n+this.currentLineHeight()/s,r.underline&&(l-=c),this.moveTo(e,l),this.lineTo(e+d,l),this.stroke(),this.restore()),this.save(),this.transform(1,0,0,-1,0,this.page.height),n=this.page.height-n-this._font.ascender/1e3*this._fontSize,null==(_=this.page.fonts)[x=this._font.id]&&(_[x]=this._font.ref()),this._font.use(t),this.addContent("BT"),this.addContent(""+e+" "+n+" Td"),this.addContent("/"+this._font.id+" "+this._fontSize+" Tf"),f=r.fill&&r.stroke?2:r.stroke?1:0,f&&this.addContent(""+f+" Tr"),o&&this.addContent(""+o+" Tc"),m){for(y=t.trim().split(/\s+/),m+=this.widthOfString(" ")+o,m*=1e3/this._fontSize,a=[],w=0,b=y.length;b>w;w++)v=y[w],h=this._font.encode(v),h=function(){var t,e,n;for(n=[],u=t=0,e=h.length;e>t;u=t+=1)n.push(h.charCodeAt(u).toString(16));return n}().join(""),a.push("<"+h+"> "+-m);this.addContent("["+a.join(" ")+"] TJ")}else h=this._font.encode(t),h=function(){var t,e,n;for(n=[],u=t=0,e=h.length;e>t;u=t+=1)n.push(h.charCodeAt(u).toString(16));return n}().join(""),this.addContent("<"+h+"> Tj");return this.addContent("ET"),this.restore()}}}}).call(this)},function(t,e,n){(function(){var e,r,i,o={}.hasOwnProperty,a=function(t,e){function n(){this.constructor=t}for(var r in e)o.call(e,r)&&(t[r]=e[r]);return n.prototype=e.prototype,t.prototype=new n,t.__super__=e.prototype,t};e=n(26).EventEmitter,r=n(91),i=function(t){function e(t,e){var n;this.document=t,this.indent=e.indent||0,this.characterSpacing=e.characterSpacing||0,this.wordSpacing=0===e.wordSpacing,this.columns=e.columns||1,this.columnGap=null!=(n=e.columnGap)?n:18,this.lineWidth=(e.width-this.columnGap*(this.columns-1))/this.columns,this.spaceLeft=this.lineWidth,this.startX=this.document.x,this.startY=this.document.y,this.column=1,this.ellipsis=e.ellipsis,this.continuedX=0,null!=e.height?(this.height=e.height,this.maxY=this.startY+e.height):this.maxY=this.document.page.maxY(),this.on("firstLine",function(t){return function(e){var n;return n=t.continuedX||t.indent,t.document.x+=n,t.lineWidth-=n,t.once("line",function(){return t.document.x-=n,t.lineWidth+=n,e.continued&&!t.continuedX&&(t.continuedX=t.indent),e.continued?void 0:t.continuedX=0})}}(this)),this.on("lastLine",function(t){return function(e){var n;return n=e.align,"justify"===n&&(e.align="left"),t.lastLine=!0,t.once("line",function(){return t.document.y+=e.paragraphGap||0,e.align=n,t.lastLine=!1})}}(this))}return a(e,t),e.prototype.wordWidth=function(t){return this.document.widthOfString(t,this)+this.characterSpacing+this.wordSpacing},e.prototype.eachWord=function(t,e){var n,i,o,a,s,h,u,c,l,f;for(i=new r(t),s=null,f={};n=i.nextBreak();){if(l=t.slice((null!=s?s.position:void 0)||0,n.position),c=null!=f[l]?f[l]:f[l]=this.wordWidth(l),c>this.lineWidth+this.continuedX)for(h=s,o={};l.length;){for(a=l.length;c>this.spaceLeft;)c=this.wordWidth(l.slice(0,--a));if(o.required=a<l.length,u=e(l.slice(0,a),c,o,h),h={required:!1},l=l.slice(a),c=this.wordWidth(l),u===!1)break}else u=e(l,c,n,s);if(u===!1)break;s=n}},e.prototype.wrap=function(t,e){var n,r,i,o,a,s,h;return null!=e.indent&&(this.indent=e.indent),null!=e.characterSpacing&&(this.characterSpacing=e.characterSpacing),null!=e.wordSpacing&&(this.wordSpacing=e.wordSpacing),null!=e.ellipsis&&(this.ellipsis=e.ellipsis),o=this.document.y+this.document.currentLineHeight(!0),(this.document.y>this.maxY||o>this.maxY)&&this.nextSection(),n="",a=0,s=0,i=0,h=this.document.y,r=function(t){return function(){return e.textWidth=a+t.wordSpacing*(s-1),e.wordCount=s,e.lineWidth=t.lineWidth,h=t.document.y,t.emit("line",n,e,t),i++}}(this),this.emit("sectionStart",e,this),this.eachWord(t,function(t){return function(i,o,h,u){var c,l;if((null==u||u.required)&&(t.emit("firstLine",e,t),t.spaceLeft=t.lineWidth),o<=t.spaceLeft&&(n+=i,a+=o,s++),h.required||o>t.spaceLeft){if(h.required&&t.emit("lastLine",e,t),c=t.document.currentLineHeight(!0),null!=t.height&&t.ellipsis&&t.document.y+2*c>t.maxY&&t.column>=t.columns){for(t.ellipsis===!0&&(t.ellipsis="…"),n=n.replace(/\s+$/,""),a=t.wordWidth(n+t.ellipsis);a>t.lineWidth;)n=n.slice(0,-1).replace(/\s+$/,""),a=t.wordWidth(n+t.ellipsis);n+=t.ellipsis}return r(),t.document.y+c>t.maxY&&(l=t.nextSection(),!l)?(s=0,n="",!1):h.required?(o>t.spaceLeft&&(n=i,a=o,s=1,r()),t.spaceLeft=t.lineWidth,n="",a=0,s=0):(t.spaceLeft=t.lineWidth-o,n=i,a=o,s=1)}return t.spaceLeft-=o}}(this)),s>0&&(this.emit("lastLine",e,this),r()),this.emit("sectionEnd",e,this),e.continued===!0?(i>1&&(this.continuedX=0),this.continuedX+=e.textWidth,this.document.y=h):this.document.x=this.startX},e.prototype.nextSection=function(t){var e;if(this.emit("sectionEnd",t,this),++this.column>this.columns){if(null!=this.height)return!1;this.document.addPage(),this.column=1,this.startY=this.document.page.margins.top,this.maxY=this.document.page.maxY(),this.document.x=this.startX,this.document._fillColor&&(e=this.document).fillColor.apply(e,this.document._fillColor),this.emit("pageBreak",t,this)}else this.document.x+=this.lineWidth+this.columnGap,this.document.y=this.startY,this.emit("columnBreak",t,this);return this.emit("sectionStart",t,this),!0},e}(e),t.exports=i}).call(this)},function(t,e,n){(function(){var e,r,i,o,a,s,h,u,c,l,f,d,p,g,v,m,y,_,w,b,x,S,k,E,C,I,A,L;x=n(92),C=new x(n(93)),A=n(94),o=A.BK,c=A.CR,p=A.LF,v=A.NL,a=A.CB,i=A.BA,b=A.SP,S=A.WJ,b=A.SP,o=A.BK,p=A.LF,v=A.NL,e=A.AI,r=A.AL,_=A.SA,w=A.SG,k=A.XX,h=A.CJ,f=A.ID,m=A.NS,E=A.characterClasses,L=n(95),l=L.DI_BRK,d=L.IN_BRK,s=L.CI_BRK,u=L.CP_BRK,y=L.PR_BRK,I=L.pairTable,g=function(){function t(t){this.string=t,this.pos=0,this.lastPos=0,this.curClass=null,this.nextClass=null}var n,f,g;return t.prototype.nextCodePoint=function(){var t,e;return t=this.string.charCodeAt(this.pos++),e=this.string.charCodeAt(this.pos),t>=55296&&56319>=t&&e>=56320&&57343>=e?(this.pos++,1024*(t-55296)+(e-56320)+65536):t},f=function(t){switch(t){case e:return r;case _:case w:case k:return r;case h:return m;default:return t}},g=function(t){switch(t){case p:case v:return o;case a:return i;case b:return S;default:return t}},t.prototype.nextCharClass=function(t){return null==t&&(t=!1),f(C.get(this.nextCodePoint()))},n=function(){function t(t,e){this.position=t,this.required=null!=e?e:!1}return t}(),t.prototype.nextBreak=function(){var t,e,r;for(null==this.curClass&&(this.curClass=g(this.nextCharClass()));this.pos<this.string.length;){if(this.lastPos=this.pos,e=this.nextClass,this.nextClass=this.nextCharClass(),this.curClass===o||this.curClass===c&&this.nextClass!==p)return this.curClass=g(f(this.nextClass)),new n(this.lastPos,!0);if(t=function(){switch(this.nextClass){case b:return this.curClass;case o:case p:case v:return o;case c:return c;case a:return i}}.call(this),null==t){switch(r=!1,I[this.curClass][this.nextClass]){case l:r=!0;break;case d:r=e===b;break;case s:if(r=e===b,!r)continue;break;case u:if(e!==b)continue}if(this.curClass=this.nextClass,r)return new n(this.lastPos)}else if(this.curClass=t,this.nextClass===a)return new n(this.lastPos)}return this.pos>=this.string.length?this.lastPos<this.string.length?(this.lastPos=this.string.length,new n(this.string.length)):null:void 0},t}(),t.exports=g}).call(this)},function(t,e){var n,r=[].slice;n=function(){function t(t){var e,n;null==t&&(t={}),this.data=t.data||[],this.highStart=null!=(e=t.highStart)?e:0,this.errorValue=null!=(n=t.errorValue)?n:-1}var e,n,i,o,a,s,h,u,c,l,f,d,p,g,v,m;return d=11,g=5,p=d-g,f=65536>>d,a=1<<p,h=a-1,u=2,e=1<<g,i=e-1,l=65536>>g,c=1024>>g,s=l+c,m=s,v=32,o=m+v,n=1<<u,t.prototype.get=function(t){var e;return 0>t||t>1114111?this.errorValue:55296>t||t>56319&&65535>=t?(e=(this.data[t>>g]<<u)+(t&i),this.data[e]):65535>=t?(e=(this.data[l+(t-55296>>g)]<<u)+(t&i),this.data[e]):t<this.highStart?(e=this.data[o-f+(t>>d)],e=this.data[e+(t>>g&h)],e=(e<<u)+(t&i),this.data[e]):this.data[this.data.length-n]},t.prototype.toJSON=function(){var t;return t={data:r.call(this.data),highStart:this.highStart,errorValue:this.errorValue}},t}(),t.exports=n},function(t,e){t.exports={data:[1961,1969,1977,1985,2025,2033,2041,2049,2057,2065,2073,2081,2089,2097,2105,2113,2121,2129,2137,2145,2153,2161,2169,2177,2185,2193,2201,2209,2217,2225,2233,2241,2249,2257,2265,2273,2281,2289,2297,2305,2313,2321,2329,2337,2345,2353,2361,2369,2377,2385,2393,2401,2409,2417,2425,2433,2441,2449,2457,2465,2473,2481,2489,2497,2505,2513,2521,2529,2529,2537,2009,2545,2553,2561,2569,2577,2585,2593,2601,2609,2617,2625,2633,2641,2649,2657,2665,2673,2681,2689,2697,2705,2713,2721,2729,2737,2745,2753,2761,2769,2777,2785,2793,2801,2809,2817,2825,2833,2841,2849,2857,2865,2873,2881,2889,2009,2897,2905,2913,2009,2921,2929,2937,2945,2953,2961,2969,2009,2977,2977,2985,2993,3001,3009,3009,3009,3017,3017,3017,3025,3025,3033,3041,3041,3049,3049,3049,3049,3049,3049,3049,3049,3049,3049,3057,3065,3073,3073,3073,3081,3089,3097,3097,3097,3097,3097,3097,3097,3097,3097,3097,3097,3097,3097,3097,3097,3097,3097,3097,3097,3105,3113,3113,3121,3129,3137,3145,3153,3161,3161,3169,3177,3185,3193,3193,3193,3193,3201,3209,3209,3217,3225,3233,3241,3241,3241,3249,3257,3265,3273,3273,3281,3289,3297,2009,2009,3305,3313,3321,3329,3337,3345,3353,3361,3369,3377,3385,3393,2009,2009,3401,3409,3417,3417,3417,3417,3417,3417,3425,3425,3433,3433,3433,3433,3433,3433,3433,3433,3433,3433,3433,3433,3433,3433,3433,3441,3449,3457,3465,3473,3481,3489,3497,3505,3513,3521,3529,3537,3545,3553,3561,3569,3577,3585,3593,3601,3609,3617,3625,3625,3633,3641,3649,3649,3649,3649,3649,3657,3665,3665,3673,3681,3681,3681,3681,3689,3697,3697,3705,3713,3721,3729,3737,3745,3753,3761,3769,3777,3785,3793,3801,3809,3817,3825,3833,3841,3849,3857,3865,3873,3881,3881,3881,3881,3881,3881,3881,3881,3881,3881,3881,3881,3889,3897,3905,3913,3921,3921,3921,3921,3921,3921,3921,3921,3921,3921,3929,2009,2009,2009,2009,2009,3937,3937,3937,3937,3937,3937,3937,3945,3953,3953,3953,3961,3969,3969,3977,3985,3993,4001,2009,2009,4009,4009,4009,4009,4009,4009,4009,4009,4009,4009,4009,4009,4017,4025,4033,4041,4049,4057,4065,4073,4081,4081,4081,4081,4081,4081,4081,4089,4097,4097,4105,4113,4113,4113,4113,4113,4113,4113,4113,4113,4113,4113,4113,4113,4113,4113,4113,4113,4113,4113,4113,4113,4113,4113,4113,4113,4113,4113,4113,4113,4113,4113,4113,4113,4113,4113,4113,4113,4113,4113,4113,4113,4113,4113,4113,4113,4113,4113,4113,4113,4113,4113,4113,4113,4113,4113,4113,4113,4113,4113,4113,4113,4113,4113,4113,4113,4113,4113,4113,4113,4113,4113,4113,4113,4113,4113,4113,4113,4113,4113,4113,4113,4113,4113,4113,4113,4113,4113,4113,4113,4113,4113,4113,4113,4113,4113,4113,4113,4113,4113,4113,4113,4113,4113,4113,4113,4113,4113,4113,4113,4113,4113,4113,4113,4113,4113,4113,4113,4113,4113,4113,4113,4113,4113,4113,4113,4113,4113,4113,4113,4113,4113,4113,4113,4113,4113,4113,4113,4113,4113,4113,4113,4113,4113,4113,4113,4113,4113,4113,4113,4113,4113,4113,4113,4113,4113,4113,4113,4113,4113,4113,4113,4113,4113,4113,4113,4113,4113,4113,4113,4113,4113,4113,4113,4113,4113,4113,4113,4113,4113,4113,4113,4113,4113,4113,4113,4113,4113,4113,4113,4113,4113,4113,4113,4113,4113,4113,4113,4113,4113,4113,4113,4113,4113,4113,4113,4113,4113,4113,4113,4113,4113,4113,4113,4113,4113,4113,4113,4113,4113,4121,4121,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4129,4137,4145,4145,4145,4145,4145,4145,4145,4145,4145,4145,4145,4145,4145,4145,4145,4145,4145,4145,4145,4145,4145,4145,4145,4145,4145,4145,4145,4145,4145,4145,4145,4145,4145,4145,4145,4145,4145,4153,4161,4169,4169,4169,4169,4169,4169,4169,4169,4177,4185,4193,4201,4209,4217,4217,4225,4233,4233,4233,4233,4233,4233,4233,4233,4241,4249,4257,4265,4273,4281,4289,4297,4305,4313,4321,4329,4337,4345,4353,4361,4361,4369,4377,4385,4385,4385,4385,4393,4401,4409,4409,4409,4409,4409,4409,4417,4425,4433,4441,4449,4457,4465,4473,4481,4489,4497,4505,4513,4521,4529,4537,4545,4553,4561,4569,4577,4585,4593,4601,4609,4617,4625,4633,4641,4649,4657,4665,4673,4681,4689,4697,4705,4713,4721,4729,4737,4745,4753,4761,4769,4777,4785,4793,4801,4809,4817,4825,4833,4841,4849,4857,4865,4873,4881,4889,4897,4905,4913,4921,4929,4937,4945,4953,4961,4969,4977,4985,4993,5001,5009,5017,5025,5033,5041,5049,5057,5065,5073,5081,5089,5097,5105,5113,5121,5129,5137,5145,5153,5161,5169,5177,5185,5193,5201,5209,5217,5225,5233,5241,5249,5257,5265,5273,5281,5289,5297,5305,5313,5321,5329,5337,5345,5353,5361,5369,5377,5385,5393,5401,5409,5417,5425,5433,5441,5449,5457,5465,5473,5481,5489,5497,5505,5513,5521,5529,5537,5545,5553,5561,5569,5577,5585,5593,5601,5609,5617,5625,5633,5641,5649,5657,5665,5673,5681,5689,5697,5705,5713,5721,5729,5737,5745,5753,5761,5769,5777,5785,5793,5801,5809,5817,5825,5833,5841,5849,5857,5865,5873,5881,5889,5897,5905,5913,5921,5929,5937,5945,5953,5961,5969,5977,5985,5993,6001,6009,6017,6025,6033,6041,6049,6057,6065,6073,6081,6089,6097,6105,6113,6121,6129,6137,6145,6153,6161,6169,6177,6185,6193,6201,6209,6217,6225,6233,6241,6249,6257,6265,6273,6281,6289,6297,6305,6313,6321,6329,6337,6345,6353,6361,6369,6377,6385,6393,6401,6409,6417,6425,6433,6441,6449,6457,6465,6473,6481,6489,6497,6505,6513,6521,6529,6537,6545,6553,6561,6569,6577,6585,6593,6601,6609,6617,6625,6633,6641,6649,6657,6665,6673,6681,6689,6697,6705,6713,6721,6729,6737,6745,6753,6761,6769,6777,6785,6793,6801,6809,6817,6825,6833,6841,6849,6857,6865,6873,6881,6889,6897,6905,6913,6921,6929,6937,6945,6953,6961,6969,6977,6985,6993,7001,7009,7017,7025,7033,7041,7049,7057,7065,7073,7081,7089,7097,7105,7113,7121,7129,7137,7145,7153,7161,7169,7177,7185,7193,7201,7209,7217,7225,7233,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,7241,7241,7241,7241,7241,7241,7241,7241,7241,7241,7241,7241,7241,7241,7241,7241,7241,7241,7241,7241,7241,7241,7241,7241,7241,7241,7241,7241,7241,7241,7241,7241,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,7249,7249,7249,7249,7249,7249,7249,7249,7249,7249,7249,7249,7249,7249,7249,7249,7257,7265,7273,7281,7281,7281,7281,7281,7281,7281,7281,7281,7281,7281,7281,7281,7281,7289,7297,7305,7305,7305,7305,7313,7321,7329,7337,7345,7353,7353,7353,7361,7369,7377,7385,7393,7401,7409,7417,7425,7241,7241,7241,7241,7241,7241,7241,7241,7241,7241,7241,7241,7241,7241,7241,7241,7241,7241,7241,7241,7241,7241,7241,7241,7241,7241,7241,7241,7241,7241,7241,7241,7972,7972,8100,8164,8228,8292,8356,8420,8484,8548,8612,8676,8740,8804,8868,8932,8996,9060,9124,9188,9252,9316,9380,9444,9508,9572,9636,9700,9764,9828,9892,9956,2593,2657,2721,2529,2785,2529,2849,2913,2977,3041,3105,3169,3233,3297,2529,2529,2529,2529,2529,2529,2529,2529,3361,2529,2529,2529,3425,2529,2529,3489,3553,2529,3617,3681,3745,3809,3873,3937,4001,4065,4129,4193,4257,4321,4385,4449,4513,4577,4641,4705,4769,4833,4897,4961,5025,5089,5153,5217,5281,5345,5409,5473,5537,5601,5665,5729,5793,5857,5921,5985,6049,6113,6177,6241,6305,6369,6433,6497,6561,6625,6689,6753,6817,6881,6945,7009,7073,7137,7201,7265,7329,7393,7457,7521,7585,7649,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,2529,7713,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,7433,7433,7433,7433,7433,7433,7433,7441,7449,7457,7457,7457,7457,7457,7457,7465,2009,2009,2009,2009,7473,7473,7473,7473,7473,7473,7473,7473,7481,7489,7497,7505,7505,7505,7505,7505,7513,7521,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,7529,7529,7537,7545,7545,7545,7545,7545,7553,7561,7561,7561,7561,7561,7561,7561,7569,7577,7585,7593,7593,7593,7593,7593,7593,7601,7609,7609,7609,7609,7609,7609,7609,7609,7609,7609,7609,7609,7609,7609,7609,7609,7609,7609,7609,7609,7609,7609,7609,7609,7609,7617,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,7625,7633,7641,7649,7657,7665,7673,7681,7689,7697,7705,2009,7713,7721,7729,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,7737,7745,7753,2009,2009,2009,2009,2009,2009,2009,2009,2009,7761,7761,7761,7761,7761,7761,7761,7761,7761,7761,7761,7761,7761,7761,7761,7761,7761,7761,7761,7761,7761,7761,7761,7761,7761,7761,7761,7761,7761,7761,7761,7761,7761,7761,7761,7769,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,7777,7777,7777,7777,7777,7777,7777,7777,7777,7777,7777,7777,7777,7777,7777,7777,7777,7777,7785,7793,7801,7809,7809,7809,7809,7809,7809,7817,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7825,7833,7841,7849,2009,2009,2009,7857,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,7865,7865,7865,7865,7865,7865,7865,7865,7865,7865,7865,7873,7881,7889,7897,7897,7897,7897,7905,7913,7913,7913,7913,7913,7913,7913,7913,7913,7913,7913,7913,7913,7913,7913,7913,7913,7913,7913,7913,7913,7913,7913,7913,7913,7913,7913,7913,7913,7913,7913,7913,7913,7913,7913,7913,7913,7913,7913,7913,7913,7913,7913,7921,7929,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,7937,7937,7937,7937,7937,7937,7937,7945,2009,2009,2009,2009,2009,2009,2009,2009,7953,7953,7953,7953,7953,7953,7953,2009,7961,7969,7977,7985,7993,2009,2009,8001,8009,8009,8009,8009,8009,8009,8009,8009,8009,8009,8009,8009,8009,8017,8025,8025,8025,8025,8025,8025,8025,8033,8041,8049,8057,8065,8073,8081,8081,8081,8081,8081,8081,8081,8081,8081,8081,8081,8089,2009,8097,8097,8097,8105,2009,2009,2009,2009,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8113,8121,8129,8137,8137,8137,8137,8137,8137,8137,8137,8137,8137,8137,8137,8137,8137,8145,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,2009,67496,67496,67496,21,21,21,21,21,21,21,21,21,17,34,30,30,33,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,38,6,3,12,9,10,12,3,0,2,12,9,8,16,8,7,11,11,11,11,11,11,11,11,11,11,8,8,12,12,12,6,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,0,9,2,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,0,17,1,12,21,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,39,39,39,39,39,39,39,39,39,39,39,39,39,39,39,39,39,39,39,39,39,39,39,39,39,39,39,39,39,39,39,39,39,39,39,39,39,39,39,39,39,39,39,39,39,39,39,39,39,39,39,39,39,39,39,39,39,39,39,39,39,39,39,39,21,21,21,21,21,35,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,4,0,10,9,9,9,12,29,29,12,29,3,12,17,12,12,10,9,29,29,18,12,29,29,29,29,29,3,29,29,29,0,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,29,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,29,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,29,18,29,29,29,18,29,12,12,29,12,12,12,12,12,12,12,29,29,29,29,12,29,12,18,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,4,21,21,21,21,21,21,21,21,21,21,21,21,4,4,4,4,4,4,4,21,21,21,21,21,21,21,21,21,21,21,21,21,12,12,12,12,12,12,12,12,12,12,12,12,12,12,8,39,39,39,39,39,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,21,21,21,21,21,21,21,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,39,8,17,39,39,39,39,9,39,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,17,21,12,21,21,12,21,21,6,21,39,39,39,39,39,39,39,39,13,13,13,13,13,13,13,13,13,13,13,13,13,13,13,13,13,13,13,13,13,13,13,13,13,13,13,13,13,13,13,13,13,13,13,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,10,10,10,8,8,12,12,21,21,21,21,21,21,21,21,21,21,21,6,6,6,6,6,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,11,11,11,11,11,11,11,11,11,11,10,11,11,12,12,12,21,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,6,12,21,21,21,21,21,21,21,12,12,21,21,21,21,21,21,12,12,21,21,12,21,21,21,21,12,12,11,11,11,11,11,11,11,11,11,11,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,21,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,39,39,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,21,21,21,21,21,21,21,21,21,21,21,12,39,39,39,39,39,39,39,39,39,39,39,39,39,39,11,11,11,11,11,11,11,11,11,11,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,21,21,21,21,21,21,21,21,21,12,12,12,12,8,6,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,21,21,21,21,12,21,21,21,21,21,21,21,21,21,12,21,21,21,12,21,21,21,21,21,39,39,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,21,21,21,39,39,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,39,39,39,39,39,39,39,39,39,39,39,39,39,39,39,39,39,39,39,39,39,39,39,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,21,21,21,12,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,12,21,21,21,21,21,21,21,12,12,12,12,12,12,12,12,12,12,21,21,17,17,11,11,11,11,11,11,11,11,11,11,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,39,21,21,21,39,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,39,39,21,12,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,12,39,39,39,39,39,39,39,39,21,39,39,39,39,12,12,12,12,12,12,21,21,39,39,11,11,11,11,11,11,11,11,11,11,12,12,10,10,12,12,12,12,12,10,12,9,39,39,39,39,39,21,21,21,39,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,39,39,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,39,39,39,39,39,39,39,12,12,12,12,12,12,39,39,39,39,39,39,39,11,11,11,11,11,11,11,11,11,11,21,21,12,12,12,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,39,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,39,39,21,12,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,39,39,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,21,21,39,39,11,11,11,11,11,11,11,11,11,11,12,9,39,39,39,39,39,39,39,39,39,39,39,39,39,39,39,21,21,21,39,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,39,39,21,12,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,39,39,39,39,12,12,12,12,12,12,21,21,39,39,11,11,11,11,11,11,11,11,11,11,12,12,12,12,12,12,12,12,39,39,39,39,39,39,39,39,39,39,21,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,39,39,39,39,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,39,39,12,39,39,39,39,39,39,21,39,39,39,39,39,39,39,39,39,39,39,39,39,39,11,11,11,11,11,11,11,11,11,11,12,12,12,12,12,12,12,12,12,9,12,39,39,39,39,39,39,21,21,21,39,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,39,12,12,12,12,12,12,12,12,12,12,21,21,39,39,11,11,11,11,11,11,11,11,11,11,39,39,39,39,39,39,39,39,12,12,12,12,12,12,12,12,39,39,21,21,39,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,39,39,21,12,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,39,39,39,39,39,39,39,12,12,12,12,21,21,39,39,11,11,11,11,11,11,11,11,11,11,39,12,12,39,39,39,39,39,39,39,39,39,39,39,39,39,39,39,21,21,39,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,12,39,39,39,39,39,39,39,39,21,39,39,39,39,39,39,39,39,12,12,21,21,39,39,11,11,11,11,11,11,11,11,11,11,12,12,12,12,12,12,39,39,39,10,12,12,12,12,12,12,39,39,21,21,39,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,39,39,39,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,12,39,39,39,39,39,39,39,39,39,39,39,39,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,39,39,39,39,9,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,12,11,11,11,11,11,11,11,11,11,11,17,17,39,39,39,39,39,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,39,39,11,11,11,11,11,11,11,11,11,11,39,39,36,36,36,36,12,18,18,18,18,12,18,18,4,18,18,17,4,6,6,6,6,6,4,12,6,12,12,12,21,21,12,12,12,12,12,12,11,11,11,11,11,11,11,11,11,11,12,12,12,12,12,12,12,12,12,12,17,21,12,21,12,21,0,1,0,1,21,21,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,39,39,39,39,21,21,21,21,21,21,21,21,21,21,21,21,21,21,17,21,21,21,21,21,17,21,21,12,12,12,12,12,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,39,17,17,12,12,12,12,12,12,21,12,12,12,12,12,12,12,12,12,18,18,17,18,12,12,12,12,12,4,4,39,39,39,39,39,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,11,11,11,11,11,11,11,11,11,11,17,17,12,12,12,12,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,11,11,11,11,11,11,11,11,11,11,36,36,36,36,36,36,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,25,25,25,25,25,25,25,25,25,25,25,25,25,25,25,25,25,25,25,25,25,25,25,25,25,25,25,25,25,25,25,25,26,26,26,26,26,26,26,26,26,26,26,26,26,26,26,26,26,26,26,26,26,26,26,26,26,26,26,26,26,26,26,26,26,26,26,26,26,26,26,26,27,27,27,27,27,27,27,27,27,27,27,27,27,27,27,27,27,27,27,27,27,27,27,27,27,27,27,27,27,27,27,27,27,27,27,27,27,27,27,27,27,27,27,27,27,27,27,27,27,27,27,27,27,27,27,27,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,39,39,21,21,21,12,17,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,39,39,39,39,39,39,39,39,39,39,39,17,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,17,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,0,1,39,39,39,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,17,17,17,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,21,21,21,39,39,39,39,39,39,39,39,39,39,39,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,21,21,21,17,17,39,39,39,39,39,39,39,39,39,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,21,21,39,39,39,39,39,39,39,39,39,39,39,39,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,39,21,21,39,39,39,39,39,39,39,39,39,39,39,39,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,17,17,5,36,17,12,17,9,36,36,39,39,11,11,11,11,11,11,11,11,11,11,39,39,39,39,39,39,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,6,6,17,17,18,12,6,6,12,21,21,21,4,39,11,11,11,11,11,11,11,11,11,11,39,39,39,39,39,39,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,21,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,39,39,39,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,39,39,39,39,12,39,39,39,6,6,11,11,11,11,11,11,11,11,11,11,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,39,39,39,39,39,39,11,11,11,11,11,11,11,11,11,11,36,36,36,36,36,36,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,21,21,21,21,21,39,39,12,12,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,39,39,21,11,11,11,11,11,11,11,11,11,11,11,11,11,11,11,11,11,11,11,11,11,11,11,11,11,11,39,39,39,39,39,39,36,36,36,36,36,36,36,36,36,36,36,36,36,36,39,39,39,39,39,39,39,39,39,39,39,39,39,39,39,39,39,39,21,21,21,21,21,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,12,12,12,12,12,12,12,39,39,39,39,11,11,11,11,11,11,11,11,11,11,17,17,12,17,17,17,17,12,12,12,12,12,12,12,12,12,12,21,21,21,21,21,21,21,21,21,12,12,12,12,12,12,12,12,12,39,39,39,21,21,21,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,21,21,21,21,21,21,21,21,21,21,21,21,21,12,12,11,11,11,11,11,11,11,11,11,11,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,21,21,21,21,21,21,21,21,21,21,21,21,21,21,39,39,39,39,39,39,39,39,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,39,39,39,17,17,17,17,17,11,11,11,11,11,11,11,11,11,11,39,39,39,12,12,12,11,11,11,11,11,11,11,11,11,11,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,17,17,12,12,12,12,12,12,12,12,39,39,39,39,39,39,39,39,21,21,21,12,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,12,12,12,12,21,12,12,12,12,21,21,21,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,18,12,39,17,17,17,17,17,17,17,4,17,17,17,20,21,21,21,21,17,4,17,17,19,29,29,12,3,3,0,3,3,3,0,3,29,29,12,12,15,15,15,17,30,30,21,21,21,21,21,4,10,10,10,10,10,10,10,10,12,3,3,29,5,5,12,12,12,12,12,12,8,0,1,5,5,5,12,12,12,12,12,12,12,12,12,12,12,12,17,12,17,17,17,17,12,17,17,17,22,12,12,12,12,39,39,39,39,39,21,21,21,21,21,21,12,12,39,39,29,12,12,12,12,12,12,12,12,0,1,29,12,29,29,29,29,12,12,12,12,12,12,12,12,0,1,39,12,12,12,12,12,12,12,12,12,12,12,12,12,39,39,39,9,9,9,9,9,9,9,10,9,9,9,9,9,9,9,9,9,9,9,9,9,9,10,9,9,9,9,39,39,39,39,39,39,39,39,39,39,39,39,39,39,39,39,39,39,39,39,39,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,39,39,39,39,39,39,39,39,39,39,39,39,39,39,39,12,12,12,10,12,29,12,12,12,10,12,12,12,12,12,12,12,12,12,29,12,12,9,12,12,12,12,12,12,12,12,12,12,29,29,12,12,12,12,12,12,12,12,29,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,29,29,12,12,12,12,12,29,12,12,29,12,29,29,29,29,29,29,29,29,29,29,29,29,12,12,12,12,29,29,29,29,29,29,29,29,29,29,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,29,29,29,29,29,29,29,29,29,29,29,29,29,29,29,29,29,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,29,12,29,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,29,12,29,29,12,12,12,29,29,12,12,29,12,12,12,29,12,29,9,9,12,29,12,12,12,12,29,12,12,29,29,29,29,12,12,29,12,29,12,29,29,29,29,29,29,12,29,12,12,12,12,12,29,29,29,29,12,12,12,12,29,29,12,12,12,12,12,12,12,12,12,12,29,12,12,12,29,12,12,12,12,12,29,12,12,12,12,12,12,12,12,12,12,12,12,12,29,29,12,12,29,29,29,29,12,12,29,29,12,12,29,29,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,29,29,12,12,29,29,12,12,12,12,12,12,12,12,12,12,12,12,12,29,12,12,12,29,12,12,12,12,12,12,12,12,12,12,12,29,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,29,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,29,12,12,12,12,12,12,12,14,14,12,12,12,12,12,12,12,12,12,12,12,12,12,0,1,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,14,14,14,14,39,39,39,39,39,39,39,39,39,39,39,39,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,39,39,39,39,39,39,39,39,39,39,39,39,39,39,39,39,39,39,39,39,39,29,29,29,29,29,29,29,29,29,29,29,29,29,29,29,29,29,29,29,29,29,29,29,29,29,29,29,29,29,29,29,29,29,29,29,29,29,29,29,29,29,29,29,29,29,29,29,29,29,29,29,29,29,29,29,29,29,29,29,29,29,29,29,12,29,29,29,29,29,29,29,29,29,29,29,29,29,29,29,29,29,29,29,29,29,29,29,29,29,29,29,29,29,29,29,29,29,29,29,29,29,29,29,29,29,29,29,29,12,12,12,12,29,29,29,29,29,29,29,29,29,29,29,29,29,29,29,29,29,29,29,29,29,29,29,29,29,29,29,29,29,29,29,29,29,29,29,29,29,12,12,12,12,12,12,12,12,12,12,12,29,29,29,29,29,29,29,29,29,29,29,29,29,29,29,29,12,12,29,29,29,29,12,12,12,12,12,12,12,12,12,12,29,29,12,29,29,29,29,29,29,29,12,12,12,12,12,12,12,12,29,29,12,12,29,29,12,12,12,12,29,29,12,12,29,29,12,12,12,12,29,29,29,12,12,29,12,12,29,29,29,29,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,29,29,29,29,12,12,12,12,12,12,12,12,12,29,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,14,14,14,14,12,29,29,12,12,29,12,12,12,12,29,29,12,12,12,12,14,14,29,29,14,12,14,14,14,14,14,14,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,14,14,14,12,12,12,12,29,12,29,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,29,29,12,29,29,29,12,29,14,29,29,12,29,29,12,29,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,14,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,29,29,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,14,14,14,14,14,14,14,14,14,14,14,14,29,29,29,29,14,12,14,14,14,29,14,14,29,29,29,14,14,29,29,14,29,29,14,14,14,12,29,12,12,12,12,29,29,14,29,29,29,29,29,29,14,14,14,14,14,29,14,14,14,14,29,29,14,14,14,14,14,14,14,14,12,12,12,14,14,14,14,14,14,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,29,12,12,12,3,3,3,3,12,12,12,6,6,12,12,12,12,0,1,0,1,0,1,0,1,0,1,0,1,0,1,29,29,29,29,29,29,29,29,29,29,29,29,29,29,29,29,29,29,29,29,29,29,29,29,29,29,29,29,29,29,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,0,1,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,0,1,0,1,0,1,0,1,0,1,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,0,1,0,1,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,0,1,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,29,29,29,29,29,39,39,39,39,39,39,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,21,21,21,12,12,39,39,39,39,39,6,17,17,17,12,6,17,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,17,39,39,39,39,39,39,39,39,39,39,39,39,39,39,21,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,39,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,3,3,3,3,3,3,3,3,3,3,3,3,3,3,17,17,17,17,17,17,17,17,12,17,0,17,12,12,3,3,12,12,3,3,0,1,0,1,0,1,0,1,17,17,17,17,6,12,17,17,12,17,17,12,12,12,12,12,19,19,39,39,39,39,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,1,1,14,14,5,14,14,0,1,0,1,0,1,0,1,0,1,14,14,0,1,0,1,0,1,0,1,5,0,1,1,14,14,14,14,14,14,14,14,14,14,21,21,21,21,21,21,14,14,14,14,14,14,14,14,14,14,14,5,5,14,14,14,39,32,14,32,14,32,14,32,14,32,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,32,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,32,14,32,14,32,14,14,14,14,14,14,32,14,14,14,14,14,14,32,32,39,39,21,21,5,5,5,5,14,5,32,14,32,14,32,14,32,14,32,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,32,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,32,14,32,14,32,14,14,14,14,14,14,32,14,14,14,14,14,14,32,32,14,14,14,14,5,32,5,5,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,39,39,39,39,39,39,39,39,39,39,39,39,32,32,32,32,32,32,32,32,32,32,32,32,32,32,32,32,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,29,29,29,29,29,29,29,29,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,5,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,39,39,39,39,39,39,39,39,39,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,17,17,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,17,6,17,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,11,11,11,11,11,11,11,11,11,11,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,21,21,21,21,12,21,21,21,21,21,21,21,21,21,21,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,39,39,39,39,39,39,39,21,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,21,21,12,17,17,17,17,17,39,39,39,39,39,39,39,39,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,21,12,12,12,21,12,12,12,12,21,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,21,21,21,21,21,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,10,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,18,18,6,6,39,39,39,39,39,39,39,39,21,21,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,39,39,39,39,39,39,39,39,39,17,17,11,11,11,11,11,11,11,11,11,11,39,39,39,39,39,39,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,12,12,12,12,12,12,12,12,12,12,39,39,39,39,11,11,11,11,11,11,11,11,11,11,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,21,21,21,21,21,21,21,21,17,17,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,21,21,21,21,21,21,21,21,21,21,21,21,21,39,39,39,39,39,39,39,39,39,39,39,12,25,25,25,25,25,25,25,25,25,25,25,25,25,25,25,25,25,25,25,25,25,25,25,25,25,25,25,25,25,39,39,39,21,21,21,21,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,21,21,21,21,21,21,21,21,21,21,21,21,21,21,12,12,12,12,12,12,17,17,17,12,12,12,12,12,12,11,11,11,11,11,11,11,11,11,11,39,39,39,39,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,21,21,21,21,21,21,21,21,21,21,21,21,21,21,39,39,39,39,39,39,39,39,39,12,12,12,21,12,12,12,12,12,12,12,12,21,21,39,39,11,11,11,11,11,11,11,11,11,11,39,39,12,17,17,17,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,12,12,12,12,12,12,12,12,12,12,12,21,21,21,21,21,17,17,12,12,12,21,21,39,39,39,39,39,39,39,39,39,39,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,21,21,21,21,21,21,21,21,17,21,21,39,39,11,11,11,11,11,11,11,11,11,11,39,39,39,39,39,39,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,39,39,39,39,39,39,39,39,39,39,39,39,26,26,26,26,26,26,26,26,26,26,26,26,26,26,26,26,26,26,26,26,26,26,26,39,39,39,39,27,27,27,27,27,27,27,27,27,27,27,27,27,27,27,27,27,27,27,27,27,27,27,27,27,27,27,27,27,27,27,27,27,27,27,27,27,27,27,27,27,27,27,27,27,27,27,27,27,39,39,39,39,37,37,37,37,37,37,37,37,37,37,37,37,37,37,37,37,37,37,37,37,37,37,37,37,37,37,37,37,37,37,37,37,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,39,39,39,39,39,13,21,13,13,13,13,13,13,13,13,13,13,12,13,13,13,13,13,13,13,13,13,13,13,13,13,13,13,13,13,13,13,13,13,13,13,13,13,13,13,13,13,13,13,13,13,13,13,13,13,13,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,0,1,39,39,39,39,39,39,39,39,39,39,39,39,39,39,39,39,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,10,12,39,39,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,8,1,1,8,8,6,6,0,1,15,39,39,39,39,39,39,21,21,21,21,21,21,21,39,39,39,39,39,39,39,39,39,14,14,14,14,14,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,14,14,0,1,14,14,14,14,14,14,14,1,14,1,39,5,5,6,6,14,0,1,0,1,0,1,14,14,14,14,14,14,14,14,14,14,9,10,14,39,39,39,39,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,39,39,22,39,6,14,14,9,10,14,14,0,1,14,14,1,14,1,14,14,14,14,14,14,14,14,14,14,14,5,5,14,14,14,6,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,0,14,1,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,0,14,1,14,0,1,1,0,1,1,5,12,32,32,32,32,32,32,32,32,32,32,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,5,5,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,39,39,39,10,9,14,14,14,9,9,39,12,12,12,12,12,12,12,39,39,39,39,39,39,39,39,39,39,21,21,21,31,29,39,39,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,39,39,39,39,39,17,17,17,39,39,39,39,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,21,39,39,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,39,17,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,17,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,39,39,11,11,11,11,11,11,11,11,11,11,39,39,39,39,39,39,39,39,39,39,39,39,39,39,39,39,39,39,39,39,39,39,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,39,17,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,39,39,39,17,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,39,39,39,39,21,21,21,21,21,21,21,21,12,12,12,12,12,12,12,12,39,39,39,39,39,39,39,39,17,17,17,17,17,17,17,17,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,39,39,39,17,17,17,17,17,17,17,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,39,21,21,21,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,17,17,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,11,11,11,11,11,11,11,11,11,11,39,39,39,39,39,39,39,39,39,39,39,39,39,39,39,39,21,21,21,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,21,21,21,21,21,21,21,21,21,21,21,12,12,12,17,17,17,17,39,39,39,39,39,39,39,39,39,39,39,39,39,39,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,39,39,39,39,39,39,39,11,11,11,11,11,11,11,11,11,11,39,39,39,39,39,39,21,21,21,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,21,21,21,21,21,21,21,21,21,21,21,21,21,21,39,11,11,11,11,11,11,11,11,11,11,17,17,17,17,39,39,39,39,39,39,39,39,39,39,39,39,39,39,39,39,39,39,39,39,39,39,39,39,39,39,39,39,21,21,21,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,21,21,21,21,21,21,21,21,21,21,21,21,21,21,12,12,12,12,17,17,12,17,39,39,39,39,39,39,39,11,11,11,11,11,11,11,11,11,11,39,39,39,39,39,39,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,21,21,21,21,21,21,21,21,21,21,21,21,21,39,39,39,39,39,39,39,39,11,11,11,11,11,11,11,11,11,11,39,39,39,39,39,39,39,39,39,39,39,39,39,39,39,39,39,39,39,39,39,39,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,39,39,39,39,39,39,39,39,39,39,39,39,39,17,17,17,17,39,39,39,39,39,39,39,39,39,39,39,39,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,0,0,0,1,1,1,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,1,12,12,12,0,1,0,1,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,0,1,1,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,12,12,12,12,12,12,12,12,12,12,12,12,12,14,14,39,39,39,39,39,39,39,39,39,39,39,39,39,39,39,39,39,39,39,39,39,39,39,39,39,39,39,39,39,39,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,21,21,21,21,21,12,12,12,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,12,12,21,21,21,21,21,21,21,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,21,21,21,21,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,21,21,21,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,39,39,11,11,11,11,11,11,11,11,11,11,11,11,11,11,11,11,11,11,11,11,11,11,11,11,11,11,11,11,11,11,11,11,11,11,11,11,11,11,11,11,11,11,11,11,11,11,11,11,11,11,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,39,39,39,39,39,39,39,39,39,39,39,39,39,39,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,29,29,29,29,29,29,29,29,29,29,29,29,29,29,29,29,29,29,29,29,29,29,29,29,29,29,29,29,29,29,29,29,29,29,29,29,29,29,29,29,29,29,29,29,29,29,12,39,29,29,29,29,29,29,29,29,29,29,29,29,29,29,29,29,29,29,29,29,29,29,29,29,29,29,29,29,29,29,29,29,29,29,29,29,29,29,29,29,29,29,29,29,29,29,29,29,29,29,29,29,29,29,29,29,29,29,12,12,39,39,39,39,29,29,29,29,29,29,29,29,29,29,29,29,29,29,29,29,29,29,29,29,29,29,29,29,29,29,29,29,29,29,29,29,29,29,29,29,29,29,29,29,29,29,29,39,39,39,39,39,39,39,39,39,39,39,28,28,28,28,28,28,28,28,28,28,28,28,28,28,28,28,28,28,28,28,28,28,28,28,28,28,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,12,12,14,14,14,14,14,12,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,12,14,12,14,12,14,14,14,14,14,14,14,14,14,14,12,14,12,12,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,39,39,39,12,12,12,12,12,12,12,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,12,12,12,12,12,12,12,12,12,12,12,12,12,12,14,14,14,14,14,14,14,14,14,14,14,14,14,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,39,39,39,39,39,39,39,39,39,39,39,39,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,39,39,39,39,39,39,39,39,39,39,39,39,39,39,39,39,39,39,39,39,39,39,39,39,39,39,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,39,39,39,39,39,39,39,39,39,39,39,39,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,39,39,39,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,39,39,39,39,39,39,39,39,39,39,39,39,39,39,39,39,39,39,39,39],
highStart:919552,errorValue:0}},function(t,e){(function(){var t,n,r,i,o,a,s,h,u,c,l,f,d,p,g,v,m,y,_,w,b,x,S,k,E,C,I,A,L,R,T,B,O,M,D,U,P,z,F,W;e.OP=L=0,e.CL=u=1,e.CP=l=2,e.QU=B=3,e.GL=p=4,e.NS=I=5,e.EX=d=6,e.SY=P=7,e.IS=b=8,e.PR=T=9,e.PO=R=10,e.NU=A=11,e.AL=n=12,e.HL=m=13,e.ID=_=14,e.IN=w=15,e.HY=y=16,e.BA=i=17,e.BB=o=18,e.B2=r=19,e.ZW=W=20,e.CM=c=21,e.WJ=z=22,e.H2=g=23,e.H3=v=24,e.JL=x=25,e.JV=k=26,e.JT=S=27,e.RI=O=28,e.AI=t=29,e.BK=a=30,e.CB=s=31,e.CJ=h=32,e.CR=f=33,e.LF=E=34,e.NL=C=35,e.SA=M=36,e.SG=D=37,e.SP=U=38,e.XX=F=39}).call(this)},function(t,e){(function(){var t,n,r,i,o;e.DI_BRK=r=0,e.IN_BRK=i=1,e.CI_BRK=t=2,e.CP_BRK=n=3,e.PR_BRK=o=4,e.pairTable=[[o,o,o,o,o,o,o,o,o,o,o,o,o,o,o,o,o,o,o,o,o,n,o,o,o,o,o,o,o],[r,o,o,i,i,o,o,o,o,i,i,r,r,r,r,r,i,i,r,r,o,t,o,r,r,r,r,r,r],[r,o,o,i,i,o,o,o,o,i,i,i,i,i,r,r,i,i,r,r,o,t,o,r,r,r,r,r,r],[o,o,o,i,i,i,o,o,o,i,i,i,i,i,i,i,i,i,i,i,o,t,o,i,i,i,i,i,i],[i,o,o,i,i,i,o,o,o,i,i,i,i,i,i,i,i,i,i,i,o,t,o,i,i,i,i,i,i],[r,o,o,i,i,i,o,o,o,r,r,r,r,r,r,r,i,i,r,r,o,t,o,r,r,r,r,r,r],[r,o,o,i,i,i,o,o,o,r,r,r,r,r,r,r,i,i,r,r,o,t,o,r,r,r,r,r,r],[r,o,o,i,i,i,o,o,o,r,r,i,r,r,r,r,i,i,r,r,o,t,o,r,r,r,r,r,r],[r,o,o,i,i,i,o,o,o,r,r,i,i,i,r,r,i,i,r,r,o,t,o,r,r,r,r,r,r],[i,o,o,i,i,i,o,o,o,r,r,i,i,i,i,r,i,i,r,r,o,t,o,i,i,i,i,i,r],[i,o,o,i,i,i,o,o,o,r,r,i,i,i,r,r,i,i,r,r,o,t,o,r,r,r,r,r,r],[i,o,o,i,i,i,o,o,o,i,i,i,i,i,r,i,i,i,r,r,o,t,o,r,r,r,r,r,r],[i,o,o,i,i,i,o,o,o,r,r,i,i,i,r,i,i,i,r,r,o,t,o,r,r,r,r,r,r],[i,o,o,i,i,i,o,o,o,r,r,i,i,i,r,i,i,i,r,r,o,t,o,r,r,r,r,r,r],[r,o,o,i,i,i,o,o,o,r,i,r,r,r,r,i,i,i,r,r,o,t,o,r,r,r,r,r,r],[r,o,o,i,i,i,o,o,o,r,r,r,r,r,r,i,i,i,r,r,o,t,o,r,r,r,r,r,r],[r,o,o,i,r,i,o,o,o,r,r,i,r,r,r,r,i,i,r,r,o,t,o,r,r,r,r,r,r],[r,o,o,i,r,i,o,o,o,r,r,r,r,r,r,r,i,i,r,r,o,t,o,r,r,r,r,r,r],[i,o,o,i,i,i,o,o,o,i,i,i,i,i,i,i,i,i,i,i,o,t,o,i,i,i,i,i,i],[r,o,o,i,i,i,o,o,o,r,r,r,r,r,r,r,i,i,r,o,o,t,o,r,r,r,r,r,r],[r,r,r,r,r,r,r,r,r,r,r,r,r,r,r,r,r,r,r,r,o,r,r,r,r,r,r,r,r],[i,o,o,i,i,i,o,o,o,r,r,i,i,i,r,i,i,i,r,r,o,t,o,r,r,r,r,r,r],[i,o,o,i,i,i,o,o,o,i,i,i,i,i,i,i,i,i,i,i,o,t,o,i,i,i,i,i,i],[r,o,o,i,i,i,o,o,o,r,i,r,r,r,r,i,i,i,r,r,o,t,o,r,r,r,i,i,r],[r,o,o,i,i,i,o,o,o,r,i,r,r,r,r,i,i,i,r,r,o,t,o,r,r,r,r,i,r],[r,o,o,i,i,i,o,o,o,r,i,r,r,r,r,i,i,i,r,r,o,t,o,i,i,i,i,r,r],[r,o,o,i,i,i,o,o,o,r,i,r,r,r,r,i,i,i,r,r,o,t,o,r,r,r,i,i,r],[r,o,o,i,i,i,o,o,o,r,i,r,r,r,r,i,i,i,r,r,o,t,o,r,r,r,r,i,r],[r,o,o,i,i,i,o,o,o,r,r,r,r,r,r,r,i,i,r,r,o,t,o,r,r,r,r,r,i]]}).call(this)},function(t,e,n){(function(e){(function(){var r;r=n(97),t.exports={initImages:function(){return this._imageRegistry={},this._imageCount=0},image:function(t,n,i,o){var a,s,h,u,c,l,f,d,p,g,v,m,y,_;return null==o&&(o={}),"object"==typeof n&&(o=n,n=null),n=null!=(m=null!=n?n:o.x)?m:this.x,i=null!=(y=null!=i?i:o.y)?y:this.y,e.isBuffer(t)||(l=this._imageRegistry[t]),l||(l=r.open(t,"I"+ ++this._imageCount),l.embed(this),e.isBuffer(t)||(this._imageRegistry[t]=l)),null==(g=this.page.xobjects)[v=l.label]&&(g[v]=l.obj),d=o.width||l.width,u=o.height||l.height,o.width&&!o.height?(p=d/l.width,d=l.width*p,u=l.height*p):o.height&&!o.width?(c=u/l.height,d=l.width*c,u=l.height*c):o.scale?(d=l.width*o.scale,u=l.height*o.scale):o.fit&&(_=o.fit,h=_[0],a=_[1],s=h/a,f=l.width/l.height,f>s?(d=h,u=h/f):(u=a,d=a*f),"center"===o.align?n=n+h/2-d/2:"right"===o.align&&(n=n+h-d),"center"===o.valign?i=i+a/2-u/2:"bottom"===o.valign&&(i=i+a-u)),this.y===i&&(this.y+=u),this.save(),this.transform(d,0,0,-u,n,i+u),this.addContent("/"+l.label+" Do"),this.restore(),this}}}).call(this)}).call(e,n(2).Buffer)},function(t,e,n){(function(e){(function(){var r,i,o,a,s;s=n(44),r=n(72),i=n(98),a=n(99),o=function(){function t(){}return t.open=function(t,n){var r,o;if(e.isBuffer(t))r=t;else if(o=/^data:.+;base64,(.*)$/.exec(t))r=new e(o[1],"base64");else if(r=s.readFileSync(t),!r)return;if(255===r[0]&&216===r[1])return new i(r,n);if(137===r[0]&&"PNG"===r.toString("ascii",1,4))return new a(r,n);throw new Error("Unknown image format.")},t}(),t.exports=o}).call(this)}).call(e,n(2).Buffer)},function(t,e,n){(function(){var e,r,i=[].indexOf||function(t){for(var e=0,n=this.length;n>e;e++)if(e in this&&this[e]===t)return e;return-1};r=n(44),e=function(){function t(t,n){var r,o,a;if(this.data=t,this.label=n,65496!==this.data.readUInt16BE(0))throw"SOI not found in JPEG";for(a=2;a<this.data.length&&(o=this.data.readUInt16BE(a),a+=2,!(i.call(e,o)>=0));)a+=this.data.readUInt16BE(a);if(i.call(e,o)<0)throw"Invalid JPEG.";a+=2,this.bits=this.data[a++],this.height=this.data.readUInt16BE(a),a+=2,this.width=this.data.readUInt16BE(a),a+=2,r=this.data[a++],this.colorSpace=function(){switch(r){case 1:return"DeviceGray";case 3:return"DeviceRGB";case 4:return"DeviceCMYK"}}(),this.obj=null}var e;return e=[65472,65473,65474,65475,65477,65478,65479,65480,65481,65482,65483,65484,65485,65486,65487],t.prototype.embed=function(t){return this.obj?void 0:(this.obj=t.ref({Type:"XObject",Subtype:"Image",BitsPerComponent:this.bits,Width:this.width,Height:this.height,ColorSpace:this.colorSpace,Filter:"DCTDecode"}),"DeviceCMYK"===this.colorSpace&&(this.obj.data.Decode=[1,0,1,0,1,0,1,0]),this.obj.end(this.data),this.data=null)},t}(),t.exports=e}).call(this)},function(t,e,n){(function(e){(function(){var r,i,o;o=n(47),r=n(100),i=function(){function t(t,e){this.label=e,this.image=new r(t),this.width=this.image.width,this.height=this.image.height,this.imgData=this.image.imgData,this.obj=null}return t.prototype.embed=function(t){var n,r,i,o,a,s,h,u;if(this.document=t,!this.obj){if(this.obj=t.ref({Type:"XObject",Subtype:"Image",BitsPerComponent:this.image.bits,Width:this.width,Height:this.height,Filter:"FlateDecode"}),this.image.hasAlphaChannel||(i=t.ref({Predictor:15,Colors:this.image.colors,BitsPerComponent:this.image.bits,Columns:this.width}),this.obj.data.DecodeParms=i,i.end()),0===this.image.palette.length?this.obj.data.ColorSpace=this.image.colorSpace:(r=t.ref(),r.end(new e(this.image.palette)),this.obj.data.ColorSpace=["Indexed","DeviceRGB",this.image.palette.length/3-1,r]),this.image.transparency.grayscale)return a=this.image.transparency.greyscale,this.obj.data.Mask=[a,a];if(this.image.transparency.rgb){for(o=this.image.transparency.rgb,n=[],h=0,u=o.length;u>h;h++)s=o[h],n.push(s,s);return this.obj.data.Mask=n}return this.image.transparency.indexed?this.loadIndexedAlphaChannel():this.image.hasAlphaChannel?this.splitAlphaChannel():this.finalize()}},t.prototype.finalize=function(){var t;return this.alphaChannel&&(t=this.document.ref({Type:"XObject",Subtype:"Image",Height:this.height,Width:this.width,BitsPerComponent:8,Filter:"FlateDecode",ColorSpace:"DeviceGray",Decode:[0,1]}),t.end(this.alphaChannel),this.obj.data.SMask=t),this.obj.end(this.imgData),this.image=null,this.imgData=null},t.prototype.splitAlphaChannel=function(){return this.image.decodePixels(function(t){return function(n){var r,i,a,s,h,u,c,l,f;for(a=t.image.colors*t.image.bits/8,f=t.width*t.height,u=new e(f*a),i=new e(f),h=l=r=0,c=n.length;c>h;)u[l++]=n[h++],u[l++]=n[h++],u[l++]=n[h++],i[r++]=n[h++];return s=0,o.deflate(u,function(e,n){if(t.imgData=n,e)throw e;return 2===++s?t.finalize():void 0}),o.deflate(i,function(e,n){if(t.alphaChannel=n,e)throw e;return 2===++s?t.finalize():void 0})}}(this))},t.prototype.loadIndexedAlphaChannel=function(t){var n;return n=this.image.transparency.indexed,this.image.decodePixels(function(t){return function(r){var i,a,s,h,u;for(i=new e(t.width*t.height),a=0,s=h=0,u=r.length;u>h;s=h+=1)i[a++]=n[r[s]];return o.deflate(i,function(e,n){if(t.alphaChannel=n,e)throw e;return t.finalize()})}}(this))},t}(),t.exports=i}).call(this)}).call(e,n(2).Buffer)},function(t,e,n){(function(e){(function(){var r,i,o;i=n(44),o=n(47),t.exports=r=function(){function t(t){var n,r,i,o,a,s,h,u,c,l,f;for(this.data=t,this.pos=8,this.palette=[],this.imgData=[],this.transparency={},this.text={};;){switch(n=this.readUInt32(),s=function(){var t,e;for(e=[],i=t=0;4>t;i=++t)e.push(String.fromCharCode(this.data[this.pos++]));return e}.call(this).join("")){case"IHDR":this.width=this.readUInt32(),this.height=this.readUInt32(),this.bits=this.data[this.pos++],this.colorType=this.data[this.pos++],this.compressionMethod=this.data[this.pos++],this.filterMethod=this.data[this.pos++],this.interlaceMethod=this.data[this.pos++];break;case"PLTE":this.palette=this.read(n);break;case"IDAT":for(i=c=0;n>c;i=c+=1)this.imgData.push(this.data[this.pos++]);break;case"tRNS":switch(this.transparency={},this.colorType){case 3:if(this.transparency.indexed=this.read(n),h=255-this.transparency.indexed.length,h>0)for(i=l=0;h>=0?h>l:l>h;i=h>=0?++l:--l)this.transparency.indexed.push(255);break;case 0:this.transparency.grayscale=this.read(n)[0];break;case 2:this.transparency.rgb=this.read(n)}break;case"tEXt":u=this.read(n),o=u.indexOf(0),a=String.fromCharCode.apply(String,u.slice(0,o)),this.text[a]=String.fromCharCode.apply(String,u.slice(o+1));break;case"IEND":return this.colors=function(){switch(this.colorType){case 0:case 3:case 4:return 1;case 2:case 6:return 3}}.call(this),this.hasAlphaChannel=4===(f=this.colorType)||6===f,r=this.colors+(this.hasAlphaChannel?1:0),this.pixelBitlength=this.bits*r,this.colorSpace=function(){switch(this.colors){case 1:return"DeviceGray";case 3:return"DeviceRGB"}}.call(this),void(this.imgData=new e(this.imgData));default:this.pos+=n}if(this.pos+=4,this.pos>this.data.length)throw new Error("Incomplete or corrupt PNG file")}}return t.decode=function(e,n){return i.readFile(e,function(e,r){var i;return i=new t(r),i.decode(function(t){return n(t)})})},t.load=function(e){var n;return n=i.readFileSync(e),new t(n)},t.prototype.read=function(t){var e,n,r;for(r=[],e=n=0;t>=0?t>n:n>t;e=t>=0?++n:--n)r.push(this.data[this.pos++]);return r},t.prototype.readUInt32=function(){var t,e,n,r;return t=this.data[this.pos++]<<24,e=this.data[this.pos++]<<16,n=this.data[this.pos++]<<8,r=this.data[this.pos++],t|e|n|r},t.prototype.readUInt16=function(){var t,e;return t=this.data[this.pos++]<<8,e=this.data[this.pos++],t|e},t.prototype.decodePixels=function(t){var n=this;return o.inflate(this.imgData,function(r,i){var o,a,s,h,u,c,l,f,d,p,g,v,m,y,_,w,b,x,S,k,E,C,I;if(r)throw r;for(v=n.pixelBitlength/8,w=v*n.width,m=new e(w*n.height),c=i.length,_=0,y=0,a=0;c>y;){switch(i[y++]){case 0:for(h=S=0;w>S;h=S+=1)m[a++]=i[y++];break;case 1:for(h=k=0;w>k;h=k+=1)o=i[y++],u=v>h?0:m[a-v],m[a++]=(o+u)%256;break;case 2:for(h=E=0;w>E;h=E+=1)o=i[y++],s=(h-h%v)/v,b=_&&m[(_-1)*w+s*v+h%v],m[a++]=(b+o)%256;break;case 3:for(h=C=0;w>C;h=C+=1)o=i[y++],s=(h-h%v)/v,u=v>h?0:m[a-v],b=_&&m[(_-1)*w+s*v+h%v],m[a++]=(o+Math.floor((u+b)/2))%256;break;case 4:for(h=I=0;w>I;h=I+=1)o=i[y++],s=(h-h%v)/v,u=v>h?0:m[a-v],0===_?b=x=0:(b=m[(_-1)*w+s*v+h%v],x=s&&m[(_-1)*w+(s-1)*v+h%v]),l=u+b-x,f=Math.abs(l-u),p=Math.abs(l-b),g=Math.abs(l-x),d=p>=f&&g>=f?u:g>=p?b:x,m[a++]=(o+d)%256;break;default:throw new Error("Invalid filter algorithm: "+i[y-1])}_++}return t(m)})},t.prototype.decodePalette=function(){var t,n,r,i,o,a,s,h,u,c;for(i=this.palette,s=this.transparency.indexed||[],a=new e(s.length+i.length),o=0,r=i.length,t=0,n=h=0,u=i.length;u>h;n=h+=3)a[o++]=i[n],a[o++]=i[n+1],a[o++]=i[n+2],a[o++]=null!=(c=s[t++])?c:255;return a},t.prototype.copyToImageData=function(t,e){var n,r,i,o,a,s,h,u,c,l,f;if(r=this.colors,c=null,n=this.hasAlphaChannel,this.palette.length&&(c=null!=(f=this._decodedPalette)?f:this._decodedPalette=this.decodePalette(),r=4,n=!0),i=(null!=t?t.data:void 0)||t,u=i.length,a=c||e,o=s=0,1===r)for(;u>o;)h=c?4*e[o/4]:s,l=a[h++],i[o++]=l,i[o++]=l,i[o++]=l,i[o++]=n?a[h++]:255,s=h;else for(;u>o;)h=c?4*e[o/4]:s,i[o++]=a[h++],i[o++]=a[h++],i[o++]=a[h++],i[o++]=n?a[h++]:255,s=h},t.prototype.decode=function(t){var n,r=this;return n=new e(this.width*this.height*4),this.decodePixels(function(e){return r.copyToImageData(n,e),t(n)})},t}()}).call(this)}).call(e,n(2).Buffer)},function(t,e){(function(){t.exports={annotate:function(t,e,n,r,i){var o,a,s;i.Type="Annot",i.Rect=this._convertRect(t,e,n,r),i.Border=[0,0,0],"Link"!==i.Subtype&&null==i.C&&(i.C=this._normalizeColor(i.color||[0,0,0])),delete i.color,"string"==typeof i.Dest&&(i.Dest=new String(i.Dest));for(o in i)s=i[o],i[o[0].toUpperCase()+o.slice(1)]=s;return a=this.ref(i),this.page.annotations.push(a),a.end(),this},note:function(t,e,n,r,i,o){return null==o&&(o={}),o.Subtype="Text",o.Contents=new String(i),o.Name="Comment",null==o.color&&(o.color=[243,223,92]),this.annotate(t,e,n,r,o)},link:function(t,e,n,r,i,o){return null==o&&(o={}),o.Subtype="Link",o.A=this.ref({S:"URI",URI:new String(i)}),o.A.end(),this.annotate(t,e,n,r,o)},_markup:function(t,e,n,r,i){var o,a,s,h,u;return null==i&&(i={}),u=this._convertRect(t,e,n,r),o=u[0],s=u[1],a=u[2],h=u[3],i.QuadPoints=[o,h,a,h,o,s,a,s],i.Contents=new String,this.annotate(t,e,n,r,i)},highlight:function(t,e,n,r,i){return null==i&&(i={}),i.Subtype="Highlight",null==i.color&&(i.color=[241,238,148]),this._markup(t,e,n,r,i)},underline:function(t,e,n,r,i){return null==i&&(i={}),i.Subtype="Underline",this._markup(t,e,n,r,i)},strike:function(t,e,n,r,i){return null==i&&(i={}),i.Subtype="StrikeOut",this._markup(t,e,n,r,i)},lineAnnotation:function(t,e,n,r,i){return null==i&&(i={}),i.Subtype="Line",i.Contents=new String,i.L=[t,this.page.height-e,n,this.page.height-r],this.annotate(t,e,n,r,i)},rectAnnotation:function(t,e,n,r,i){return null==i&&(i={}),i.Subtype="Square",i.Contents=new String,this.annotate(t,e,n,r,i)},ellipseAnnotation:function(t,e,n,r,i){return null==i&&(i={}),i.Subtype="Circle",i.Contents=new String,this.annotate(t,e,n,r,i)},textAnnotation:function(t,e,n,r,i,o){return null==o&&(o={}),o.Subtype="FreeText",o.Contents=new String(i),o.DA=new String,this.annotate(t,e,n,r,o)},_convertRect:function(t,e,n,r){var i,o,a,s,h,u,c,l,f;return l=e,e+=r,c=t+n,f=this._ctm,i=f[0],o=f[1],a=f[2],s=f[3],h=f[4],u=f[5],t=i*t+a*e+h,e=o*t+s*e+u,c=i*c+a*l+h,l=o*c+s*l+u,[t,e,c,l]}}}).call(this)},function(t,e){t.exports={"4A0":[4767.87,6740.79],"2A0":[3370.39,4767.87],A0:[2383.94,3370.39],A1:[1683.78,2383.94],A2:[1190.55,1683.78],A3:[841.89,1190.55],A4:[595.28,841.89],A5:[419.53,595.28],A6:[297.64,419.53],A7:[209.76,297.64],A8:[147.4,209.76],A9:[104.88,147.4],A10:[73.7,104.88],B0:[2834.65,4008.19],B1:[2004.09,2834.65],B2:[1417.32,2004.09],B3:[1000.63,1417.32],B4:[708.66,1000.63],B5:[498.9,708.66],B6:[354.33,498.9],B7:[249.45,354.33],B8:[175.75,249.45],B9:[124.72,175.75],B10:[87.87,124.72],C0:[2599.37,3676.54],C1:[1836.85,2599.37],C2:[1298.27,1836.85],C3:[918.43,1298.27],C4:[649.13,918.43],C5:[459.21,649.13],C6:[323.15,459.21],C7:[229.61,323.15],C8:[161.57,229.61],C9:[113.39,161.57],C10:[79.37,113.39],RA0:[2437.8,3458.27],RA1:[1729.13,2437.8],RA2:[1218.9,1729.13],RA3:[864.57,1218.9],RA4:[609.45,864.57],SRA0:[2551.18,3628.35],SRA1:[1814.17,2551.18],SRA2:[1275.59,1814.17],SRA3:[907.09,1275.59],SRA4:[637.8,907.09],EXECUTIVE:[521.86,756],FOLIO:[612,936],LEGAL:[612,1008],LETTER:[612,792],TABLOID:[792,1224]}},function(t,e,n){(function(e){"use strict";function r(t,e){this.pdfDoc=t,this.imageDictionary=e||{}}var i=(n(24),n(97));r.prototype.measureImage=function(t){function n(t){var n=a.imageDictionary[t];if(!n)return t;var r=n.indexOf("base64,");if(0>r)throw"invalid image format, images dictionary should contain dataURL entries";return new e(n.substring(r+7),"base64")}var r,o,a=this;return this.pdfDoc._imageRegistry[t]?r=this.pdfDoc._imageRegistry[t]:(o="I"+ ++this.pdfDoc._imageCount,r=i.open(n(t),o),r.embed(this.pdfDoc),this.pdfDoc._imageRegistry[t]=r),{width:r.width,height:r.height}},t.exports=r}).call(e,n(2).Buffer)},function(t,e){"use strict";function n(t){for(var e=[],n=null,r=0,i=t.inlines.length;i>r;r++){var o=t.inlines[r],a=o.decoration;if(a){var s=o.decorationColor||o.color||"black",h=o.decorationStyle||"solid";a=Array.isArray(a)?a:[a];for(var u=0,c=a.length;c>u;u++){var l=a[u];n&&l===n.decoration&&h===n.decorationStyle&&s===n.decorationColor&&"lineThrough"!==l?n.inlines.push(o):(n={line:t,decoration:l,decorationColor:s,decorationStyle:h,inlines:[o]},e.push(n))}}else n=null}return e}function r(t,e,n,r){function i(){for(var e=0,n=0,r=t.inlines.length;r>n;n++){var i=t.inlines[n];e=i.fontSize>e?n:e}return t.inlines[e]}function o(){for(var e=0,n=0,r=t.inlines.length;r>n;n++)e+=t.inlines[n].width;return e}var a=t.inlines[0],s=i(),h=o(),u=t.line.getAscenderHeight(),c=s.font.ascender/1e3*s.fontSize,l=s.height,f=l-c,d=.5+.12*Math.floor(Math.max(s.fontSize-8,0)/2);switch(t.decoration){case"underline":n+=u+.45*f;break;case"overline":n+=u-.85*c;break;case"lineThrough":n+=u-.25*c;break;default:throw"Unkown decoration : "+t.decoration}if(r.save(),"double"===t.decorationStyle){var p=Math.max(.5,2*d);r.fillColor(t.decorationColor).rect(e+a.x,n-d/2,h,d/2).fill().rect(e+a.x,n+p-d/2,h,d/2).fill()}else if("dashed"===t.decorationStyle){var g=Math.ceil(h/6.8),v=e+a.x;r.rect(v,n,h,d).clip(),r.fillColor(t.decorationColor);for(var m=0;g>m;m++)r.rect(v,n-d/2,3.96,d).fill(),v+=6.8}else if("dotted"===t.decorationStyle){var y=Math.ceil(h/(3*d)),_=e+a.x;r.rect(_,n,h,d).clip(),r.fillColor(t.decorationColor);for(var w=0;y>w;w++)r.rect(_,n-d/2,d,d).fill(),_+=3*d}else if("wavy"===t.decorationStyle){var b=.7,x=1,S=Math.ceil(h/(2*b))+1,k=e+a.x-1;r.rect(e+a.x,n-x,h,n+x).clip(),r.lineWidth(.24),r.moveTo(k,n);for(var E=0;S>E;E++)r.bezierCurveTo(k+b,n-x,k+2*b,n-x,k+3*b,n).bezierCurveTo(k+4*b,n+x,k+5*b,n+x,k+6*b,n),k+=6*b;r.stroke(t.decorationColor)}else r.fillColor(t.decorationColor).rect(e+a.x,n-d/2,h,d).fill();r.restore()}function i(t,e,i,o){for(var a=n(t),s=0,h=a.length;h>s;s++)r(a[s],e,i,o)}function o(t,e,n,r){for(var i=t.getHeight(),o=0,a=t.inlines.length;a>o;o++){var s=t.inlines[o];s.background&&r.fillColor(s.background).rect(e+s.x,n,s.width,i).fill()}}t.exports={drawBackground:o,drawDecorations:i}},function(t,e,n){var r,i,o=o||function(t){"use strict";if("undefined"==typeof navigator||!/MSIE [1-9]\./.test(navigator.userAgent)){var e=t.document,n=function(){return t.URL||t.webkitURL||t},r=e.createElementNS("http://www.w3.org/1999/xhtml","a"),i="download"in r,o=function(t){var e=new MouseEvent("click");t.dispatchEvent(e)},a=t.webkitRequestFileSystem,s=t.requestFileSystem||a||t.mozRequestFileSystem,h=function(e){(t.setImmediate||t.setTimeout)(function(){throw e},0)},u="application/octet-stream",c=0,l=500,f=function(e){var r=function(){"string"==typeof e?n().revokeObjectURL(e):e.remove()};t.chrome?r():setTimeout(r,l)},d=function(t,e,n){e=[].concat(e);for(var r=e.length;r--;){var i=t["on"+e[r]];if("function"==typeof i)try{i.call(t,n||t)}catch(o){h(o)}}},p=function(t){return/^\s*(?:text\/\S*|application\/xml|\S*\/\S*\+xml)\s*;.*charset\s*=\s*utf-8/i.test(t.type)?new Blob(["\ufeff",t],{type:t.type}):t},g=function(e,h,l){l||(e=p(e));var g,v,m,y=this,_=e.type,w=!1,b=function(){d(y,"writestart progress write writeend".split(" "))},x=function(){if((w||!g)&&(g=n().createObjectURL(e)),v)v.location.href=g;else{var r=t.open(g,"_blank");void 0==r&&"undefined"!=typeof safari&&(t.location.href=g)}y.readyState=y.DONE,b(),f(g)},S=function(t){return function(){return y.readyState!==y.DONE?t.apply(this,arguments):void 0}},k={create:!0,exclusive:!1};return y.readyState=y.INIT,h||(h="download"),i?(g=n().createObjectURL(e),r.href=g,r.download=h,void setTimeout(function(){o(r),b(),f(g),y.readyState=y.DONE})):(t.chrome&&_&&_!==u&&(m=e.slice||e.webkitSlice,e=m.call(e,0,e.size,u),w=!0),a&&"download"!==h&&(h+=".download"),(_===u||a)&&(v=t),s?(c+=e.size,void s(t.TEMPORARY,c,S(function(t){t.root.getDirectory("saved",k,S(function(t){var n=function(){t.getFile(h,k,S(function(t){t.createWriter(S(function(n){n.onwriteend=function(e){v.location.href=t.toURL(),y.readyState=y.DONE,d(y,"writeend",e),f(t)},n.onerror=function(){var t=n.error;t.code!==t.ABORT_ERR&&x()},"writestart progress write abort".split(" ").forEach(function(t){n["on"+t]=y["on"+t]}),n.write(e),y.abort=function(){n.abort(),y.readyState=y.DONE},y.readyState=y.WRITING}),x)}),x)};t.getFile(h,{create:!1},S(function(t){t.remove(),n()}),S(function(t){t.code===t.NOT_FOUND_ERR?n():x()}))}),x)}),x)):void x())},v=g.prototype,m=function(t,e,n){return new g(t,e,n)};return"undefined"!=typeof navigator&&navigator.msSaveOrOpenBlob?function(t,e,n){return n||(t=p(t)),navigator.msSaveOrOpenBlob(t,e||"download")}:(v.abort=function(){var t=this;t.readyState=t.DONE,d(t,"abort")},v.readyState=v.INIT=0,v.WRITING=1,v.DONE=2,v.error=v.onwritestart=v.onprogress=v.onwrite=v.onabort=v.onerror=v.onwriteend=null,m)}}("undefined"!=typeof self&&self||"undefined"!=typeof window&&window||this.content);"undefined"!=typeof t&&t.exports?t.exports.saveAs=o:null!==n(106)&&null!=n(107)&&(r=[],i=function(){return o}.apply(e,r),!(void 0!==i&&(t.exports=i)))},function(t,e){t.exports=function(){throw new Error("define cannot be used indirect")}},function(t,e){(function(e){t.exports=e}).call(e,{})}]);
//# sourceMappingURL=js/pdfmake.min.js.map

window.pdfMake = window.pdfMake || {}; window.pdfMake.vfs = {};
if(window.ninjaFontVfs)ninjaLoadFontVfs();
function ninjaLoadFontVfs(){
  jQuery.each(window.ninjaFontVfs, function(font, files){
    jQuery.each(files, function(filename, file){
      window.pdfMake.vfs['fonts/'+font+'/'+filename] = file;
    });
  })
}
function ninjaAddVFSDoc(name,content){
  window.pdfMake.vfs['docs/'+name] = content;
  if(window.refreshPDF)refreshPDF(true);
  jQuery(document).trigger('ninjaVFSDocAdded');
}