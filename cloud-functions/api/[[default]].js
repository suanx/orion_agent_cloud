// ⚠️ 本文件由 `npm run build` 生成（源入口 src/entry/api.ts），请勿手改；
// 改动请编辑 src/ 与构建脚本后重新构建并提交。
// 平台约束见 scripts/build-edgeone.mjs 头注释：函数必须自包含，
// 平台源码自动构建不处理 npm 依赖（2026-10-10 探针实测）。
// createRequire：ESM 产物里被内联的 CJS 依赖（ws 等）仍会 require('events')
// 等 node 内建，esbuild 默认抛 'Dynamic require is not supported' → 必须注入。
import { createRequire as __cr } from "node:module";
const require = __cr(import.meta.url);
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
  get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
}) : x)(function(x) {
  if (typeof require !== "undefined") return require.apply(this, arguments);
  throw Error('Dynamic require of "' + x + '" is not supported');
});
var __commonJS = (cb, mod) => function __require2() {
  try {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  } catch (e) {
    throw mod = 0, e;
  }
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// node_modules/ws/lib/constants.js
var require_constants = __commonJS({
  "node_modules/ws/lib/constants.js"(exports, module) {
    "use strict";
    var BINARY_TYPES = ["nodebuffer", "arraybuffer", "fragments"];
    var hasBlob = typeof Blob !== "undefined";
    if (hasBlob) BINARY_TYPES.push("blob");
    module.exports = {
      BINARY_TYPES,
      CLOSE_TIMEOUT: 3e4,
      EMPTY_BUFFER: Buffer.alloc(0),
      GUID: "258EAFA5-E914-47DA-95CA-C5AB0DC85B11",
      hasBlob,
      kForOnEventAttribute: /* @__PURE__ */ Symbol("kIsForOnEventAttribute"),
      kListener: /* @__PURE__ */ Symbol("kListener"),
      kStatusCode: /* @__PURE__ */ Symbol("status-code"),
      kWebSocket: /* @__PURE__ */ Symbol("websocket"),
      NOOP: () => {
      }
    };
  }
});

// node_modules/ws/lib/buffer-util.js
var require_buffer_util = __commonJS({
  "node_modules/ws/lib/buffer-util.js"(exports, module) {
    "use strict";
    var { EMPTY_BUFFER } = require_constants();
    var FastBuffer = Buffer[Symbol.species];
    function concat(list, totalLength) {
      if (list.length === 0) return EMPTY_BUFFER;
      if (list.length === 1) return list[0];
      const target = Buffer.allocUnsafe(totalLength);
      let offset = 0;
      for (let i = 0; i < list.length; i++) {
        const buf = list[i];
        target.set(buf, offset);
        offset += buf.length;
      }
      if (offset < totalLength) {
        return new FastBuffer(target.buffer, target.byteOffset, offset);
      }
      return target;
    }
    function _mask(source, mask, output, offset, length) {
      for (let i = 0; i < length; i++) {
        output[offset + i] = source[i] ^ mask[i & 3];
      }
    }
    function _unmask(buffer, mask) {
      for (let i = 0; i < buffer.length; i++) {
        buffer[i] ^= mask[i & 3];
      }
    }
    function toArrayBuffer(buf) {
      if (buf.length === buf.buffer.byteLength) {
        return buf.buffer;
      }
      return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.length);
    }
    function toBuffer(data) {
      toBuffer.readOnly = true;
      if (Buffer.isBuffer(data)) return data;
      let buf;
      if (data instanceof ArrayBuffer) {
        buf = new FastBuffer(data);
      } else if (ArrayBuffer.isView(data)) {
        buf = new FastBuffer(data.buffer, data.byteOffset, data.byteLength);
      } else {
        buf = Buffer.from(data);
        toBuffer.readOnly = false;
      }
      return buf;
    }
    module.exports = {
      concat,
      mask: _mask,
      toArrayBuffer,
      toBuffer,
      unmask: _unmask
    };
    if (!process.env.WS_NO_BUFFER_UTIL) {
      try {
        const bufferUtil = __require("bufferutil");
        module.exports.mask = function(source, mask, output, offset, length) {
          if (length < 48) _mask(source, mask, output, offset, length);
          else bufferUtil.mask(source, mask, output, offset, length);
        };
        module.exports.unmask = function(buffer, mask) {
          if (buffer.length < 32) _unmask(buffer, mask);
          else bufferUtil.unmask(buffer, mask);
        };
      } catch (e) {
      }
    }
  }
});

// node_modules/ws/lib/limiter.js
var require_limiter = __commonJS({
  "node_modules/ws/lib/limiter.js"(exports, module) {
    "use strict";
    var kDone = /* @__PURE__ */ Symbol("kDone");
    var kRun = /* @__PURE__ */ Symbol("kRun");
    var Limiter = class {
      /**
       * Creates a new `Limiter`.
       *
       * @param {Number} [concurrency=Infinity] The maximum number of jobs allowed
       *     to run concurrently
       */
      constructor(concurrency) {
        this[kDone] = () => {
          this.pending--;
          this[kRun]();
        };
        this.concurrency = concurrency || Infinity;
        this.jobs = [];
        this.pending = 0;
      }
      /**
       * Adds a job to the queue.
       *
       * @param {Function} job The job to run
       * @public
       */
      add(job) {
        this.jobs.push(job);
        this[kRun]();
      }
      /**
       * Removes a job from the queue and runs it if possible.
       *
       * @private
       */
      [kRun]() {
        if (this.pending === this.concurrency) return;
        if (this.jobs.length) {
          const job = this.jobs.shift();
          this.pending++;
          job(this[kDone]);
        }
      }
    };
    module.exports = Limiter;
  }
});

// node_modules/ws/lib/permessage-deflate.js
var require_permessage_deflate = __commonJS({
  "node_modules/ws/lib/permessage-deflate.js"(exports, module) {
    "use strict";
    var zlib = __require("zlib");
    var bufferUtil = require_buffer_util();
    var Limiter = require_limiter();
    var { kStatusCode } = require_constants();
    var FastBuffer = Buffer[Symbol.species];
    var TRAILER = Buffer.from([0, 0, 255, 255]);
    var kPerMessageDeflate = /* @__PURE__ */ Symbol("permessage-deflate");
    var kTotalLength = /* @__PURE__ */ Symbol("total-length");
    var kCallback = /* @__PURE__ */ Symbol("callback");
    var kBuffers = /* @__PURE__ */ Symbol("buffers");
    var kError = /* @__PURE__ */ Symbol("error");
    var zlibLimiter;
    var PerMessageDeflate2 = class {
      /**
       * Creates a PerMessageDeflate instance.
       *
       * @param {Object} [options] Configuration options
       * @param {(Boolean|Number)} [options.clientMaxWindowBits] Advertise support
       *     for, or request, a custom client window size
       * @param {Boolean} [options.clientNoContextTakeover=false] Advertise/
       *     acknowledge disabling of client context takeover
       * @param {Number} [options.concurrencyLimit=10] The number of concurrent
       *     calls to zlib
       * @param {Boolean} [options.isServer=false] Create the instance in either
       *     server or client mode
       * @param {Number} [options.maxPayload=0] The maximum allowed message length
       * @param {(Boolean|Number)} [options.serverMaxWindowBits] Request/confirm the
       *     use of a custom server window size
       * @param {Boolean} [options.serverNoContextTakeover=false] Request/accept
       *     disabling of server context takeover
       * @param {Number} [options.threshold=1024] Size (in bytes) below which
       *     messages should not be compressed if context takeover is disabled
       * @param {Object} [options.zlibDeflateOptions] Options to pass to zlib on
       *     deflate
       * @param {Object} [options.zlibInflateOptions] Options to pass to zlib on
       *     inflate
       */
      constructor(options) {
        this._options = options || {};
        this._threshold = this._options.threshold !== void 0 ? this._options.threshold : 1024;
        this._maxPayload = this._options.maxPayload | 0;
        this._isServer = !!this._options.isServer;
        this._deflate = null;
        this._inflate = null;
        this.params = null;
        if (!zlibLimiter) {
          const concurrency = this._options.concurrencyLimit !== void 0 ? this._options.concurrencyLimit : 10;
          zlibLimiter = new Limiter(concurrency);
        }
      }
      /**
       * @type {String}
       */
      static get extensionName() {
        return "permessage-deflate";
      }
      /**
       * Create an extension negotiation offer.
       *
       * @return {Object} Extension parameters
       * @public
       */
      offer() {
        const params = {};
        if (this._options.serverNoContextTakeover) {
          params.server_no_context_takeover = true;
        }
        if (this._options.clientNoContextTakeover) {
          params.client_no_context_takeover = true;
        }
        if (this._options.serverMaxWindowBits) {
          params.server_max_window_bits = this._options.serverMaxWindowBits;
        }
        if (this._options.clientMaxWindowBits) {
          params.client_max_window_bits = this._options.clientMaxWindowBits;
        } else if (this._options.clientMaxWindowBits == null) {
          params.client_max_window_bits = true;
        }
        return params;
      }
      /**
       * Accept an extension negotiation offer/response.
       *
       * @param {Array} configurations The extension negotiation offers/reponse
       * @return {Object} Accepted configuration
       * @public
       */
      accept(configurations) {
        configurations = this.normalizeParams(configurations);
        this.params = this._isServer ? this.acceptAsServer(configurations) : this.acceptAsClient(configurations);
        return this.params;
      }
      /**
       * Releases all resources used by the extension.
       *
       * @public
       */
      cleanup() {
        if (this._inflate) {
          this._inflate.close();
          this._inflate = null;
        }
        if (this._deflate) {
          const callback = this._deflate[kCallback];
          this._deflate.close();
          this._deflate = null;
          if (callback) {
            callback(
              new Error(
                "The deflate stream was closed while data was being processed"
              )
            );
          }
        }
      }
      /**
       *  Accept an extension negotiation offer.
       *
       * @param {Array} offers The extension negotiation offers
       * @return {Object} Accepted configuration
       * @private
       */
      acceptAsServer(offers) {
        const opts = this._options;
        const accepted = offers.find((params) => {
          if (opts.serverNoContextTakeover === false && params.server_no_context_takeover || params.server_max_window_bits && (opts.serverMaxWindowBits === false || typeof opts.serverMaxWindowBits === "number" && opts.serverMaxWindowBits > params.server_max_window_bits) || typeof opts.clientMaxWindowBits === "number" && (typeof params.client_max_window_bits === "number" ? opts.clientMaxWindowBits > params.client_max_window_bits : !params.client_max_window_bits)) {
            return false;
          }
          return true;
        });
        if (!accepted) {
          throw new Error("None of the extension offers can be accepted");
        }
        if (opts.serverNoContextTakeover) {
          accepted.server_no_context_takeover = true;
        }
        if (opts.clientNoContextTakeover) {
          accepted.client_no_context_takeover = true;
        }
        if (typeof opts.serverMaxWindowBits === "number") {
          accepted.server_max_window_bits = opts.serverMaxWindowBits;
        }
        if (typeof opts.clientMaxWindowBits === "number") {
          accepted.client_max_window_bits = opts.clientMaxWindowBits;
        } else if (accepted.client_max_window_bits === true || opts.clientMaxWindowBits === false) {
          delete accepted.client_max_window_bits;
        }
        return accepted;
      }
      /**
       * Accept the extension negotiation response.
       *
       * @param {Array} response The extension negotiation response
       * @return {Object} Accepted configuration
       * @private
       */
      acceptAsClient(response) {
        const params = response[0];
        if (this._options.clientNoContextTakeover === false && params.client_no_context_takeover) {
          throw new Error('Unexpected parameter "client_no_context_takeover"');
        }
        if (!params.client_max_window_bits) {
          if (typeof this._options.clientMaxWindowBits === "number") {
            params.client_max_window_bits = this._options.clientMaxWindowBits;
          }
        } else if (this._options.clientMaxWindowBits === false || typeof this._options.clientMaxWindowBits === "number" && params.client_max_window_bits > this._options.clientMaxWindowBits) {
          throw new Error(
            'Unexpected or invalid parameter "client_max_window_bits"'
          );
        }
        return params;
      }
      /**
       * Normalize parameters.
       *
       * @param {Array} configurations The extension negotiation offers/reponse
       * @return {Array} The offers/response with normalized parameters
       * @private
       */
      normalizeParams(configurations) {
        configurations.forEach((params) => {
          Object.keys(params).forEach((key) => {
            let value = params[key];
            if (value.length > 1) {
              throw new Error(`Parameter "${key}" must have only a single value`);
            }
            value = value[0];
            if (key === "client_max_window_bits") {
              if (value !== true) {
                const num = +value;
                if (!Number.isInteger(num) || num < 8 || num > 15) {
                  throw new TypeError(
                    `Invalid value for parameter "${key}": ${value}`
                  );
                }
                value = num;
              } else if (!this._isServer) {
                throw new TypeError(
                  `Invalid value for parameter "${key}": ${value}`
                );
              }
            } else if (key === "server_max_window_bits") {
              const num = +value;
              if (!Number.isInteger(num) || num < 8 || num > 15) {
                throw new TypeError(
                  `Invalid value for parameter "${key}": ${value}`
                );
              }
              value = num;
            } else if (key === "client_no_context_takeover" || key === "server_no_context_takeover") {
              if (value !== true) {
                throw new TypeError(
                  `Invalid value for parameter "${key}": ${value}`
                );
              }
            } else {
              throw new Error(`Unknown parameter "${key}"`);
            }
            params[key] = value;
          });
        });
        return configurations;
      }
      /**
       * Decompress data. Concurrency limited.
       *
       * @param {Buffer} data Compressed data
       * @param {Boolean} fin Specifies whether or not this is the last fragment
       * @param {Function} callback Callback
       * @public
       */
      decompress(data, fin, callback) {
        zlibLimiter.add((done) => {
          this._decompress(data, fin, (err, result) => {
            done();
            callback(err, result);
          });
        });
      }
      /**
       * Compress data. Concurrency limited.
       *
       * @param {(Buffer|String)} data Data to compress
       * @param {Boolean} fin Specifies whether or not this is the last fragment
       * @param {Function} callback Callback
       * @public
       */
      compress(data, fin, callback) {
        zlibLimiter.add((done) => {
          this._compress(data, fin, (err, result) => {
            done();
            callback(err, result);
          });
        });
      }
      /**
       * Decompress data.
       *
       * @param {Buffer} data Compressed data
       * @param {Boolean} fin Specifies whether or not this is the last fragment
       * @param {Function} callback Callback
       * @private
       */
      _decompress(data, fin, callback) {
        const endpoint = this._isServer ? "client" : "server";
        if (!this._inflate) {
          const key = `${endpoint}_max_window_bits`;
          const windowBits = typeof this.params[key] !== "number" ? zlib.Z_DEFAULT_WINDOWBITS : this.params[key];
          this._inflate = zlib.createInflateRaw({
            ...this._options.zlibInflateOptions,
            windowBits
          });
          this._inflate[kPerMessageDeflate] = this;
          this._inflate[kTotalLength] = 0;
          this._inflate[kBuffers] = [];
          this._inflate.on("error", inflateOnError);
          this._inflate.on("data", inflateOnData);
        }
        this._inflate[kCallback] = callback;
        this._inflate.write(data);
        if (fin) this._inflate.write(TRAILER);
        this._inflate.flush(() => {
          const err = this._inflate[kError];
          if (err) {
            this._inflate.close();
            this._inflate = null;
            callback(err);
            return;
          }
          const data2 = bufferUtil.concat(
            this._inflate[kBuffers],
            this._inflate[kTotalLength]
          );
          if (this._inflate._readableState.endEmitted) {
            this._inflate.close();
            this._inflate = null;
          } else {
            this._inflate[kTotalLength] = 0;
            this._inflate[kBuffers] = [];
            if (fin && this.params[`${endpoint}_no_context_takeover`]) {
              this._inflate.reset();
            }
          }
          callback(null, data2);
        });
      }
      /**
       * Compress data.
       *
       * @param {(Buffer|String)} data Data to compress
       * @param {Boolean} fin Specifies whether or not this is the last fragment
       * @param {Function} callback Callback
       * @private
       */
      _compress(data, fin, callback) {
        const endpoint = this._isServer ? "server" : "client";
        if (!this._deflate) {
          const key = `${endpoint}_max_window_bits`;
          const windowBits = typeof this.params[key] !== "number" ? zlib.Z_DEFAULT_WINDOWBITS : this.params[key];
          this._deflate = zlib.createDeflateRaw({
            ...this._options.zlibDeflateOptions,
            windowBits
          });
          this._deflate[kTotalLength] = 0;
          this._deflate[kBuffers] = [];
          this._deflate.on("data", deflateOnData);
        }
        this._deflate[kCallback] = callback;
        this._deflate.write(data);
        this._deflate.flush(zlib.Z_SYNC_FLUSH, () => {
          if (!this._deflate) {
            return;
          }
          let data2 = bufferUtil.concat(
            this._deflate[kBuffers],
            this._deflate[kTotalLength]
          );
          if (fin) {
            data2 = new FastBuffer(data2.buffer, data2.byteOffset, data2.length - 4);
          }
          this._deflate[kCallback] = null;
          this._deflate[kTotalLength] = 0;
          this._deflate[kBuffers] = [];
          if (fin && this.params[`${endpoint}_no_context_takeover`]) {
            this._deflate.reset();
          }
          callback(null, data2);
        });
      }
    };
    module.exports = PerMessageDeflate2;
    function deflateOnData(chunk2) {
      this[kBuffers].push(chunk2);
      this[kTotalLength] += chunk2.length;
    }
    function inflateOnData(chunk2) {
      this[kTotalLength] += chunk2.length;
      if (this[kPerMessageDeflate]._maxPayload < 1 || this[kTotalLength] <= this[kPerMessageDeflate]._maxPayload) {
        this[kBuffers].push(chunk2);
        return;
      }
      this[kError] = new RangeError("Max payload size exceeded");
      this[kError].code = "WS_ERR_UNSUPPORTED_MESSAGE_LENGTH";
      this[kError][kStatusCode] = 1009;
      this.removeListener("data", inflateOnData);
      this.reset();
    }
    function inflateOnError(err) {
      this[kPerMessageDeflate]._inflate = null;
      if (this[kError]) {
        this[kCallback](this[kError]);
        return;
      }
      err[kStatusCode] = 1007;
      this[kCallback](err);
    }
  }
});

// node_modules/ws/lib/validation.js
var require_validation = __commonJS({
  "node_modules/ws/lib/validation.js"(exports, module) {
    "use strict";
    var { isUtf8 } = __require("buffer");
    var { hasBlob } = require_constants();
    var tokenChars = [
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      // 0 - 15
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      // 16 - 31
      0,
      1,
      0,
      1,
      1,
      1,
      1,
      1,
      0,
      0,
      1,
      1,
      0,
      1,
      1,
      0,
      // 32 - 47
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      0,
      0,
      0,
      0,
      0,
      0,
      // 48 - 63
      0,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      // 64 - 79
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      0,
      0,
      0,
      1,
      1,
      // 80 - 95
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      // 96 - 111
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      0,
      1,
      0,
      1,
      0
      // 112 - 127
    ];
    function isValidStatusCode(code) {
      return code >= 1e3 && code <= 1014 && code !== 1004 && code !== 1005 && code !== 1006 || code >= 3e3 && code <= 4999;
    }
    function _isValidUTF8(buf) {
      const len = buf.length;
      let i = 0;
      while (i < len) {
        if ((buf[i] & 128) === 0) {
          i++;
        } else if ((buf[i] & 224) === 192) {
          if (i + 1 === len || (buf[i + 1] & 192) !== 128 || (buf[i] & 254) === 192) {
            return false;
          }
          i += 2;
        } else if ((buf[i] & 240) === 224) {
          if (i + 2 >= len || (buf[i + 1] & 192) !== 128 || (buf[i + 2] & 192) !== 128 || buf[i] === 224 && (buf[i + 1] & 224) === 128 || // Overlong
          buf[i] === 237 && (buf[i + 1] & 224) === 160) {
            return false;
          }
          i += 3;
        } else if ((buf[i] & 248) === 240) {
          if (i + 3 >= len || (buf[i + 1] & 192) !== 128 || (buf[i + 2] & 192) !== 128 || (buf[i + 3] & 192) !== 128 || buf[i] === 240 && (buf[i + 1] & 240) === 128 || // Overlong
          buf[i] === 244 && buf[i + 1] > 143 || buf[i] > 244) {
            return false;
          }
          i += 4;
        } else {
          return false;
        }
      }
      return true;
    }
    function isBlob(value) {
      return hasBlob && typeof value === "object" && typeof value.arrayBuffer === "function" && typeof value.type === "string" && typeof value.stream === "function" && (value[Symbol.toStringTag] === "Blob" || value[Symbol.toStringTag] === "File");
    }
    module.exports = {
      isBlob,
      isValidStatusCode,
      isValidUTF8: _isValidUTF8,
      tokenChars
    };
    if (isUtf8) {
      module.exports.isValidUTF8 = function(buf) {
        return buf.length < 24 ? _isValidUTF8(buf) : isUtf8(buf);
      };
    } else if (!process.env.WS_NO_UTF_8_VALIDATE) {
      try {
        const isValidUTF8 = __require("utf-8-validate");
        module.exports.isValidUTF8 = function(buf) {
          return buf.length < 32 ? _isValidUTF8(buf) : isValidUTF8(buf);
        };
      } catch (e) {
      }
    }
  }
});

// node_modules/ws/lib/receiver.js
var require_receiver = __commonJS({
  "node_modules/ws/lib/receiver.js"(exports, module) {
    "use strict";
    var { Writable } = __require("stream");
    var PerMessageDeflate2 = require_permessage_deflate();
    var {
      BINARY_TYPES,
      EMPTY_BUFFER,
      kStatusCode,
      kWebSocket
    } = require_constants();
    var { concat, toArrayBuffer, unmask } = require_buffer_util();
    var { isValidStatusCode, isValidUTF8 } = require_validation();
    var FastBuffer = Buffer[Symbol.species];
    var GET_INFO = 0;
    var GET_PAYLOAD_LENGTH_16 = 1;
    var GET_PAYLOAD_LENGTH_64 = 2;
    var GET_MASK = 3;
    var GET_DATA = 4;
    var INFLATING = 5;
    var DEFER_EVENT = 6;
    var Receiver2 = class extends Writable {
      /**
       * Creates a Receiver instance.
       *
       * @param {Object} [options] Options object
       * @param {Boolean} [options.allowSynchronousEvents=true] Specifies whether
       *     any of the `'message'`, `'ping'`, and `'pong'` events can be emitted
       *     multiple times in the same tick
       * @param {String} [options.binaryType=nodebuffer] The type for binary data
       * @param {Object} [options.extensions] An object containing the negotiated
       *     extensions
       * @param {Boolean} [options.isServer=false] Specifies whether to operate in
       *     client or server mode
       * @param {Number} [options.maxBufferedChunks=0] The maximum number of
       *     buffered data chunks
       * @param {Number} [options.maxFragments=0] The maximum number of message
       *     fragments
       * @param {Number} [options.maxPayload=0] The maximum allowed message length
       * @param {Boolean} [options.skipUTF8Validation=false] Specifies whether or
       *     not to skip UTF-8 validation for text and close messages
       */
      constructor(options = {}) {
        super();
        this._allowSynchronousEvents = options.allowSynchronousEvents !== void 0 ? options.allowSynchronousEvents : true;
        this._binaryType = options.binaryType || BINARY_TYPES[0];
        this._extensions = options.extensions || {};
        this._isServer = !!options.isServer;
        this._maxBufferedChunks = options.maxBufferedChunks | 0;
        this._maxFragments = options.maxFragments | 0;
        this._maxPayload = options.maxPayload | 0;
        this._skipUTF8Validation = !!options.skipUTF8Validation;
        this[kWebSocket] = void 0;
        this._bufferedBytes = 0;
        this._buffers = [];
        this._compressed = false;
        this._payloadLength = 0;
        this._mask = void 0;
        this._fragmented = 0;
        this._masked = false;
        this._fin = false;
        this._opcode = 0;
        this._totalPayloadLength = 0;
        this._messageLength = 0;
        this._numFragments = 0;
        this._fragments = [];
        this._errored = false;
        this._loop = false;
        this._state = GET_INFO;
      }
      /**
       * Implements `Writable.prototype._write()`.
       *
       * @param {Buffer} chunk The chunk of data to write
       * @param {String} encoding The character encoding of `chunk`
       * @param {Function} cb Callback
       * @private
       */
      _write(chunk2, encoding, cb) {
        if (this._opcode === 8 && this._state == GET_INFO) return cb();
        if (this._maxBufferedChunks > 0 && this._buffers.length >= this._maxBufferedChunks) {
          cb(
            this.createError(
              RangeError,
              "Too many buffered chunks",
              false,
              1008,
              "WS_ERR_TOO_MANY_BUFFERED_PARTS"
            )
          );
          return;
        }
        this._bufferedBytes += chunk2.length;
        this._buffers.push(chunk2);
        this.startLoop(cb);
      }
      /**
       * Consumes `n` bytes from the buffered data.
       *
       * @param {Number} n The number of bytes to consume
       * @return {Buffer} The consumed bytes
       * @private
       */
      consume(n) {
        this._bufferedBytes -= n;
        if (n === this._buffers[0].length) return this._buffers.shift();
        if (n < this._buffers[0].length) {
          const buf = this._buffers[0];
          this._buffers[0] = new FastBuffer(
            buf.buffer,
            buf.byteOffset + n,
            buf.length - n
          );
          return new FastBuffer(buf.buffer, buf.byteOffset, n);
        }
        const dst = Buffer.allocUnsafe(n);
        do {
          const buf = this._buffers[0];
          const offset = dst.length - n;
          if (n >= buf.length) {
            dst.set(this._buffers.shift(), offset);
          } else {
            dst.set(new Uint8Array(buf.buffer, buf.byteOffset, n), offset);
            this._buffers[0] = new FastBuffer(
              buf.buffer,
              buf.byteOffset + n,
              buf.length - n
            );
          }
          n -= buf.length;
        } while (n > 0);
        return dst;
      }
      /**
       * Starts the parsing loop.
       *
       * @param {Function} cb Callback
       * @private
       */
      startLoop(cb) {
        this._loop = true;
        do {
          switch (this._state) {
            case GET_INFO:
              this.getInfo(cb);
              break;
            case GET_PAYLOAD_LENGTH_16:
              this.getPayloadLength16(cb);
              break;
            case GET_PAYLOAD_LENGTH_64:
              this.getPayloadLength64(cb);
              break;
            case GET_MASK:
              this.getMask();
              break;
            case GET_DATA:
              this.getData(cb);
              break;
            case INFLATING:
            case DEFER_EVENT:
              this._loop = false;
              return;
          }
        } while (this._loop);
        if (!this._errored) cb();
      }
      /**
       * Reads the first two bytes of a frame.
       *
       * @param {Function} cb Callback
       * @private
       */
      getInfo(cb) {
        if (this._bufferedBytes < 2) {
          this._loop = false;
          return;
        }
        const buf = this.consume(2);
        if ((buf[0] & 48) !== 0) {
          const error = this.createError(
            RangeError,
            "RSV2 and RSV3 must be clear",
            true,
            1002,
            "WS_ERR_UNEXPECTED_RSV_2_3"
          );
          cb(error);
          return;
        }
        const compressed = (buf[0] & 64) === 64;
        if (compressed && !this._extensions[PerMessageDeflate2.extensionName]) {
          const error = this.createError(
            RangeError,
            "RSV1 must be clear",
            true,
            1002,
            "WS_ERR_UNEXPECTED_RSV_1"
          );
          cb(error);
          return;
        }
        this._fin = (buf[0] & 128) === 128;
        this._opcode = buf[0] & 15;
        this._payloadLength = buf[1] & 127;
        if (this._opcode === 0) {
          if (compressed) {
            const error = this.createError(
              RangeError,
              "RSV1 must be clear",
              true,
              1002,
              "WS_ERR_UNEXPECTED_RSV_1"
            );
            cb(error);
            return;
          }
          if (!this._fragmented) {
            const error = this.createError(
              RangeError,
              "invalid opcode 0",
              true,
              1002,
              "WS_ERR_INVALID_OPCODE"
            );
            cb(error);
            return;
          }
          this._opcode = this._fragmented;
        } else if (this._opcode === 1 || this._opcode === 2) {
          if (this._fragmented) {
            const error = this.createError(
              RangeError,
              `invalid opcode ${this._opcode}`,
              true,
              1002,
              "WS_ERR_INVALID_OPCODE"
            );
            cb(error);
            return;
          }
          this._compressed = compressed;
        } else if (this._opcode > 7 && this._opcode < 11) {
          if (!this._fin) {
            const error = this.createError(
              RangeError,
              "FIN must be set",
              true,
              1002,
              "WS_ERR_EXPECTED_FIN"
            );
            cb(error);
            return;
          }
          if (compressed) {
            const error = this.createError(
              RangeError,
              "RSV1 must be clear",
              true,
              1002,
              "WS_ERR_UNEXPECTED_RSV_1"
            );
            cb(error);
            return;
          }
          if (this._payloadLength > 125 || this._opcode === 8 && this._payloadLength === 1) {
            const error = this.createError(
              RangeError,
              `invalid payload length ${this._payloadLength}`,
              true,
              1002,
              "WS_ERR_INVALID_CONTROL_PAYLOAD_LENGTH"
            );
            cb(error);
            return;
          }
        } else {
          const error = this.createError(
            RangeError,
            `invalid opcode ${this._opcode}`,
            true,
            1002,
            "WS_ERR_INVALID_OPCODE"
          );
          cb(error);
          return;
        }
        if (!this._fin && !this._fragmented) this._fragmented = this._opcode;
        this._masked = (buf[1] & 128) === 128;
        if (this._isServer) {
          if (!this._masked) {
            const error = this.createError(
              RangeError,
              "MASK must be set",
              true,
              1002,
              "WS_ERR_EXPECTED_MASK"
            );
            cb(error);
            return;
          }
        } else if (this._masked) {
          const error = this.createError(
            RangeError,
            "MASK must be clear",
            true,
            1002,
            "WS_ERR_UNEXPECTED_MASK"
          );
          cb(error);
          return;
        }
        if (this._payloadLength === 126) this._state = GET_PAYLOAD_LENGTH_16;
        else if (this._payloadLength === 127) this._state = GET_PAYLOAD_LENGTH_64;
        else this.haveLength(cb);
      }
      /**
       * Gets extended payload length (7+16).
       *
       * @param {Function} cb Callback
       * @private
       */
      getPayloadLength16(cb) {
        if (this._bufferedBytes < 2) {
          this._loop = false;
          return;
        }
        this._payloadLength = this.consume(2).readUInt16BE(0);
        this.haveLength(cb);
      }
      /**
       * Gets extended payload length (7+64).
       *
       * @param {Function} cb Callback
       * @private
       */
      getPayloadLength64(cb) {
        if (this._bufferedBytes < 8) {
          this._loop = false;
          return;
        }
        const buf = this.consume(8);
        const num = buf.readUInt32BE(0);
        if (num > Math.pow(2, 53 - 32) - 1) {
          const error = this.createError(
            RangeError,
            "Unsupported WebSocket frame: payload length > 2^53 - 1",
            false,
            1009,
            "WS_ERR_UNSUPPORTED_DATA_PAYLOAD_LENGTH"
          );
          cb(error);
          return;
        }
        this._payloadLength = num * Math.pow(2, 32) + buf.readUInt32BE(4);
        this.haveLength(cb);
      }
      /**
       * Payload length has been read.
       *
       * @param {Function} cb Callback
       * @private
       */
      haveLength(cb) {
        if (this._payloadLength && this._opcode < 8) {
          this._totalPayloadLength += this._payloadLength;
          if (this._totalPayloadLength > this._maxPayload && this._maxPayload > 0) {
            const error = this.createError(
              RangeError,
              "Max payload size exceeded",
              false,
              1009,
              "WS_ERR_UNSUPPORTED_MESSAGE_LENGTH"
            );
            cb(error);
            return;
          }
        }
        if (this._masked) this._state = GET_MASK;
        else this._state = GET_DATA;
      }
      /**
       * Reads mask bytes.
       *
       * @private
       */
      getMask() {
        if (this._bufferedBytes < 4) {
          this._loop = false;
          return;
        }
        this._mask = this.consume(4);
        this._state = GET_DATA;
      }
      /**
       * Reads data bytes.
       *
       * @param {Function} cb Callback
       * @private
       */
      getData(cb) {
        let data = EMPTY_BUFFER;
        if (this._payloadLength) {
          if (this._bufferedBytes < this._payloadLength) {
            this._loop = false;
            return;
          }
          data = this.consume(this._payloadLength);
          if (this._masked && (this._mask[0] | this._mask[1] | this._mask[2] | this._mask[3]) !== 0) {
            unmask(data, this._mask);
          }
        }
        if (this._opcode > 7) {
          this.controlMessage(data, cb);
          return;
        }
        if (this._maxFragments > 0 && ++this._numFragments > this._maxFragments) {
          const error = this.createError(
            RangeError,
            "Too many message fragments",
            false,
            1008,
            "WS_ERR_TOO_MANY_BUFFERED_PARTS"
          );
          cb(error);
          return;
        }
        if (this._compressed) {
          this._state = INFLATING;
          this.decompress(data, cb);
          return;
        }
        if (data.length) {
          this._messageLength = this._totalPayloadLength;
          this._fragments.push(data);
        }
        this.dataMessage(cb);
      }
      /**
       * Decompresses data.
       *
       * @param {Buffer} data Compressed data
       * @param {Function} cb Callback
       * @private
       */
      decompress(data, cb) {
        const perMessageDeflate = this._extensions[PerMessageDeflate2.extensionName];
        perMessageDeflate.decompress(data, this._fin, (err, buf) => {
          if (err) return cb(err);
          if (buf.length) {
            this._messageLength += buf.length;
            if (this._messageLength > this._maxPayload && this._maxPayload > 0) {
              const error = this.createError(
                RangeError,
                "Max payload size exceeded",
                false,
                1009,
                "WS_ERR_UNSUPPORTED_MESSAGE_LENGTH"
              );
              cb(error);
              return;
            }
            this._fragments.push(buf);
          }
          this.dataMessage(cb);
          if (this._state === GET_INFO) this.startLoop(cb);
        });
      }
      /**
       * Handles a data message.
       *
       * @param {Function} cb Callback
       * @private
       */
      dataMessage(cb) {
        if (!this._fin) {
          this._state = GET_INFO;
          return;
        }
        const messageLength = this._messageLength;
        const fragments = this._fragments;
        this._totalPayloadLength = 0;
        this._messageLength = 0;
        this._fragmented = 0;
        this._numFragments = 0;
        this._fragments = [];
        if (this._opcode === 2) {
          let data;
          if (this._binaryType === "nodebuffer") {
            data = concat(fragments, messageLength);
          } else if (this._binaryType === "arraybuffer") {
            data = toArrayBuffer(concat(fragments, messageLength));
          } else if (this._binaryType === "blob") {
            data = new Blob(fragments);
          } else {
            data = fragments;
          }
          if (this._allowSynchronousEvents) {
            this.emit("message", data, true);
            this._state = GET_INFO;
          } else {
            this._state = DEFER_EVENT;
            setImmediate(() => {
              this.emit("message", data, true);
              this._state = GET_INFO;
              this.startLoop(cb);
            });
          }
        } else {
          const buf = concat(fragments, messageLength);
          if (!this._skipUTF8Validation && !isValidUTF8(buf)) {
            const error = this.createError(
              Error,
              "invalid UTF-8 sequence",
              true,
              1007,
              "WS_ERR_INVALID_UTF8"
            );
            cb(error);
            return;
          }
          if (this._state === INFLATING || this._allowSynchronousEvents) {
            this.emit("message", buf, false);
            this._state = GET_INFO;
          } else {
            this._state = DEFER_EVENT;
            setImmediate(() => {
              this.emit("message", buf, false);
              this._state = GET_INFO;
              this.startLoop(cb);
            });
          }
        }
      }
      /**
       * Handles a control message.
       *
       * @param {Buffer} data Data to handle
       * @return {(Error|RangeError|undefined)} A possible error
       * @private
       */
      controlMessage(data, cb) {
        if (this._opcode === 8) {
          if (data.length === 0) {
            this._loop = false;
            this.emit("conclude", 1005, EMPTY_BUFFER);
            this.end();
          } else {
            const code = data.readUInt16BE(0);
            if (!isValidStatusCode(code)) {
              const error = this.createError(
                RangeError,
                `invalid status code ${code}`,
                true,
                1002,
                "WS_ERR_INVALID_CLOSE_CODE"
              );
              cb(error);
              return;
            }
            const buf = new FastBuffer(
              data.buffer,
              data.byteOffset + 2,
              data.length - 2
            );
            if (!this._skipUTF8Validation && !isValidUTF8(buf)) {
              const error = this.createError(
                Error,
                "invalid UTF-8 sequence",
                true,
                1007,
                "WS_ERR_INVALID_UTF8"
              );
              cb(error);
              return;
            }
            this._loop = false;
            this.emit("conclude", code, buf);
            this.end();
          }
          this._state = GET_INFO;
          return;
        }
        if (this._allowSynchronousEvents) {
          this.emit(this._opcode === 9 ? "ping" : "pong", data);
          this._state = GET_INFO;
        } else {
          this._state = DEFER_EVENT;
          setImmediate(() => {
            this.emit(this._opcode === 9 ? "ping" : "pong", data);
            this._state = GET_INFO;
            this.startLoop(cb);
          });
        }
      }
      /**
       * Builds an error object.
       *
       * @param {function(new:Error|RangeError)} ErrorCtor The error constructor
       * @param {String} message The error message
       * @param {Boolean} prefix Specifies whether or not to add a default prefix to
       *     `message`
       * @param {Number} statusCode The status code
       * @param {String} errorCode The exposed error code
       * @return {(Error|RangeError)} The error
       * @private
       */
      createError(ErrorCtor, message, prefix, statusCode, errorCode) {
        this._loop = false;
        this._errored = true;
        const err = new ErrorCtor(
          prefix ? `Invalid WebSocket frame: ${message}` : message
        );
        Error.captureStackTrace(err, this.createError);
        err.code = errorCode;
        err[kStatusCode] = statusCode;
        return err;
      }
    };
    module.exports = Receiver2;
  }
});

// node_modules/ws/lib/sender.js
var require_sender = __commonJS({
  "node_modules/ws/lib/sender.js"(exports, module) {
    "use strict";
    var { Duplex } = __require("stream");
    var { randomFillSync } = __require("crypto");
    var {
      types: { isUint8Array }
    } = __require("util");
    var PerMessageDeflate2 = require_permessage_deflate();
    var { EMPTY_BUFFER, kWebSocket, NOOP } = require_constants();
    var { isBlob, isValidStatusCode } = require_validation();
    var { mask: applyMask, toBuffer } = require_buffer_util();
    var kByteLength = /* @__PURE__ */ Symbol("kByteLength");
    var maskBuffer = Buffer.alloc(4);
    var RANDOM_POOL_SIZE = 8 * 1024;
    var randomPool;
    var randomPoolPointer = RANDOM_POOL_SIZE;
    var DEFAULT = 0;
    var DEFLATING = 1;
    var GET_BLOB_DATA = 2;
    var Sender2 = class _Sender {
      /**
       * Creates a Sender instance.
       *
       * @param {Duplex} socket The connection socket
       * @param {Object} [extensions] An object containing the negotiated extensions
       * @param {Function} [generateMask] The function used to generate the masking
       *     key
       */
      constructor(socket, extensions, generateMask) {
        this._extensions = extensions || {};
        if (generateMask) {
          this._generateMask = generateMask;
          this._maskBuffer = Buffer.alloc(4);
        }
        this._socket = socket;
        this._firstFragment = true;
        this._compress = false;
        this._bufferedBytes = 0;
        this._queue = [];
        this._state = DEFAULT;
        this.onerror = NOOP;
        this[kWebSocket] = void 0;
      }
      /**
       * Frames a piece of data according to the HyBi WebSocket protocol.
       *
       * @param {(Buffer|String)} data The data to frame
       * @param {Object} options Options object
       * @param {Boolean} [options.fin=false] Specifies whether or not to set the
       *     FIN bit
       * @param {Function} [options.generateMask] The function used to generate the
       *     masking key
       * @param {Boolean} [options.mask=false] Specifies whether or not to mask
       *     `data`
       * @param {Buffer} [options.maskBuffer] The buffer used to store the masking
       *     key
       * @param {Number} options.opcode The opcode
       * @param {Boolean} [options.readOnly=false] Specifies whether `data` can be
       *     modified
       * @param {Boolean} [options.rsv1=false] Specifies whether or not to set the
       *     RSV1 bit
       * @return {(Buffer|String)[]} The framed data
       * @public
       */
      static frame(data, options) {
        let mask;
        let merge = false;
        let offset = 2;
        let skipMasking = false;
        if (options.mask) {
          mask = options.maskBuffer || maskBuffer;
          if (options.generateMask) {
            options.generateMask(mask);
          } else {
            if (randomPoolPointer === RANDOM_POOL_SIZE) {
              if (randomPool === void 0) {
                randomPool = Buffer.alloc(RANDOM_POOL_SIZE);
              }
              randomFillSync(randomPool, 0, RANDOM_POOL_SIZE);
              randomPoolPointer = 0;
            }
            mask[0] = randomPool[randomPoolPointer++];
            mask[1] = randomPool[randomPoolPointer++];
            mask[2] = randomPool[randomPoolPointer++];
            mask[3] = randomPool[randomPoolPointer++];
          }
          skipMasking = (mask[0] | mask[1] | mask[2] | mask[3]) === 0;
          offset = 6;
        }
        let dataLength;
        if (typeof data === "string") {
          if ((!options.mask || skipMasking) && options[kByteLength] !== void 0) {
            dataLength = options[kByteLength];
          } else {
            data = Buffer.from(data);
            dataLength = data.length;
          }
        } else {
          dataLength = data.length;
          merge = options.mask && options.readOnly && !skipMasking;
        }
        let payloadLength = dataLength;
        if (dataLength >= 65536) {
          offset += 8;
          payloadLength = 127;
        } else if (dataLength > 125) {
          offset += 2;
          payloadLength = 126;
        }
        const target = Buffer.allocUnsafe(merge ? dataLength + offset : offset);
        target[0] = options.fin ? options.opcode | 128 : options.opcode;
        if (options.rsv1) target[0] |= 64;
        target[1] = payloadLength;
        if (payloadLength === 126) {
          target.writeUInt16BE(dataLength, 2);
        } else if (payloadLength === 127) {
          target[2] = target[3] = 0;
          target.writeUIntBE(dataLength, 4, 6);
        }
        if (!options.mask) return [target, data];
        target[1] |= 128;
        target[offset - 4] = mask[0];
        target[offset - 3] = mask[1];
        target[offset - 2] = mask[2];
        target[offset - 1] = mask[3];
        if (skipMasking) return [target, data];
        if (merge) {
          applyMask(data, mask, target, offset, dataLength);
          return [target];
        }
        applyMask(data, mask, data, 0, dataLength);
        return [target, data];
      }
      /**
       * Sends a close message to the other peer.
       *
       * @param {Number} [code] The status code component of the body
       * @param {(String|Buffer)} [data] The message component of the body
       * @param {Boolean} [mask=false] Specifies whether or not to mask the message
       * @param {Function} [cb] Callback
       * @public
       */
      close(code, data, mask, cb) {
        let buf;
        if (code === void 0) {
          buf = EMPTY_BUFFER;
        } else if (typeof code !== "number" || !isValidStatusCode(code)) {
          throw new TypeError("First argument must be a valid error code number");
        } else if (data === void 0 || !data.length) {
          buf = Buffer.allocUnsafe(2);
          buf.writeUInt16BE(code, 0);
        } else {
          const length = Buffer.byteLength(data);
          if (length > 123) {
            throw new RangeError("The message must not be greater than 123 bytes");
          }
          buf = Buffer.allocUnsafe(2 + length);
          buf.writeUInt16BE(code, 0);
          if (typeof data === "string") {
            buf.write(data, 2);
          } else if (isUint8Array(data)) {
            buf.set(data, 2);
          } else {
            throw new TypeError("Second argument must be a string or a Uint8Array");
          }
        }
        const options = {
          [kByteLength]: buf.length,
          fin: true,
          generateMask: this._generateMask,
          mask,
          maskBuffer: this._maskBuffer,
          opcode: 8,
          readOnly: false,
          rsv1: false
        };
        if (this._state !== DEFAULT) {
          this.enqueue([this.dispatch, buf, false, options, cb]);
        } else {
          this.sendFrame(_Sender.frame(buf, options), cb);
        }
      }
      /**
       * Sends a ping message to the other peer.
       *
       * @param {*} data The message to send
       * @param {Boolean} [mask=false] Specifies whether or not to mask `data`
       * @param {Function} [cb] Callback
       * @public
       */
      ping(data, mask, cb) {
        let byteLength;
        let readOnly;
        if (typeof data === "string") {
          byteLength = Buffer.byteLength(data);
          readOnly = false;
        } else if (isBlob(data)) {
          byteLength = data.size;
          readOnly = false;
        } else {
          data = toBuffer(data);
          byteLength = data.length;
          readOnly = toBuffer.readOnly;
        }
        if (byteLength > 125) {
          throw new RangeError("The data size must not be greater than 125 bytes");
        }
        const options = {
          [kByteLength]: byteLength,
          fin: true,
          generateMask: this._generateMask,
          mask,
          maskBuffer: this._maskBuffer,
          opcode: 9,
          readOnly,
          rsv1: false
        };
        if (isBlob(data)) {
          if (this._state !== DEFAULT) {
            this.enqueue([this.getBlobData, data, false, options, cb]);
          } else {
            this.getBlobData(data, false, options, cb);
          }
        } else if (this._state !== DEFAULT) {
          this.enqueue([this.dispatch, data, false, options, cb]);
        } else {
          this.sendFrame(_Sender.frame(data, options), cb);
        }
      }
      /**
       * Sends a pong message to the other peer.
       *
       * @param {*} data The message to send
       * @param {Boolean} [mask=false] Specifies whether or not to mask `data`
       * @param {Function} [cb] Callback
       * @public
       */
      pong(data, mask, cb) {
        let byteLength;
        let readOnly;
        if (typeof data === "string") {
          byteLength = Buffer.byteLength(data);
          readOnly = false;
        } else if (isBlob(data)) {
          byteLength = data.size;
          readOnly = false;
        } else {
          data = toBuffer(data);
          byteLength = data.length;
          readOnly = toBuffer.readOnly;
        }
        if (byteLength > 125) {
          throw new RangeError("The data size must not be greater than 125 bytes");
        }
        const options = {
          [kByteLength]: byteLength,
          fin: true,
          generateMask: this._generateMask,
          mask,
          maskBuffer: this._maskBuffer,
          opcode: 10,
          readOnly,
          rsv1: false
        };
        if (isBlob(data)) {
          if (this._state !== DEFAULT) {
            this.enqueue([this.getBlobData, data, false, options, cb]);
          } else {
            this.getBlobData(data, false, options, cb);
          }
        } else if (this._state !== DEFAULT) {
          this.enqueue([this.dispatch, data, false, options, cb]);
        } else {
          this.sendFrame(_Sender.frame(data, options), cb);
        }
      }
      /**
       * Sends a data message to the other peer.
       *
       * @param {*} data The message to send
       * @param {Object} options Options object
       * @param {Boolean} [options.binary=false] Specifies whether `data` is binary
       *     or text
       * @param {Boolean} [options.compress=false] Specifies whether or not to
       *     compress `data`
       * @param {Boolean} [options.fin=false] Specifies whether the fragment is the
       *     last one
       * @param {Boolean} [options.mask=false] Specifies whether or not to mask
       *     `data`
       * @param {Function} [cb] Callback
       * @public
       */
      send(data, options, cb) {
        const perMessageDeflate = this._extensions[PerMessageDeflate2.extensionName];
        let opcode = options.binary ? 2 : 1;
        let rsv1 = options.compress;
        let byteLength;
        let readOnly;
        if (typeof data === "string") {
          byteLength = Buffer.byteLength(data);
          readOnly = false;
        } else if (isBlob(data)) {
          byteLength = data.size;
          readOnly = false;
        } else {
          data = toBuffer(data);
          byteLength = data.length;
          readOnly = toBuffer.readOnly;
        }
        if (this._firstFragment) {
          this._firstFragment = false;
          if (rsv1 && perMessageDeflate && perMessageDeflate.params[perMessageDeflate._isServer ? "server_no_context_takeover" : "client_no_context_takeover"]) {
            rsv1 = byteLength >= perMessageDeflate._threshold;
          }
          this._compress = rsv1;
        } else {
          rsv1 = false;
          opcode = 0;
        }
        if (options.fin) this._firstFragment = true;
        const opts = {
          [kByteLength]: byteLength,
          fin: options.fin,
          generateMask: this._generateMask,
          mask: options.mask,
          maskBuffer: this._maskBuffer,
          opcode,
          readOnly,
          rsv1
        };
        if (isBlob(data)) {
          if (this._state !== DEFAULT) {
            this.enqueue([this.getBlobData, data, this._compress, opts, cb]);
          } else {
            this.getBlobData(data, this._compress, opts, cb);
          }
        } else if (this._state !== DEFAULT) {
          this.enqueue([this.dispatch, data, this._compress, opts, cb]);
        } else {
          this.dispatch(data, this._compress, opts, cb);
        }
      }
      /**
       * Gets the contents of a blob as binary data.
       *
       * @param {Blob} blob The blob
       * @param {Boolean} [compress=false] Specifies whether or not to compress
       *     the data
       * @param {Object} options Options object
       * @param {Boolean} [options.fin=false] Specifies whether or not to set the
       *     FIN bit
       * @param {Function} [options.generateMask] The function used to generate the
       *     masking key
       * @param {Boolean} [options.mask=false] Specifies whether or not to mask
       *     `data`
       * @param {Buffer} [options.maskBuffer] The buffer used to store the masking
       *     key
       * @param {Number} options.opcode The opcode
       * @param {Boolean} [options.readOnly=false] Specifies whether `data` can be
       *     modified
       * @param {Boolean} [options.rsv1=false] Specifies whether or not to set the
       *     RSV1 bit
       * @param {Function} [cb] Callback
       * @private
       */
      getBlobData(blob, compress, options, cb) {
        this._bufferedBytes += options[kByteLength];
        this._state = GET_BLOB_DATA;
        blob.arrayBuffer().then((arrayBuffer) => {
          if (this._socket.destroyed) {
            const err = new Error(
              "The socket was closed while the blob was being read"
            );
            process.nextTick(callCallbacks, this, err, cb);
            return;
          }
          this._bufferedBytes -= options[kByteLength];
          const data = toBuffer(arrayBuffer);
          if (!compress) {
            this._state = DEFAULT;
            this.sendFrame(_Sender.frame(data, options), cb);
            this.dequeue();
          } else {
            this.dispatch(data, compress, options, cb);
          }
        }).catch((err) => {
          process.nextTick(onError, this, err, cb);
        });
      }
      /**
       * Dispatches a message.
       *
       * @param {(Buffer|String)} data The message to send
       * @param {Boolean} [compress=false] Specifies whether or not to compress
       *     `data`
       * @param {Object} options Options object
       * @param {Boolean} [options.fin=false] Specifies whether or not to set the
       *     FIN bit
       * @param {Function} [options.generateMask] The function used to generate the
       *     masking key
       * @param {Boolean} [options.mask=false] Specifies whether or not to mask
       *     `data`
       * @param {Buffer} [options.maskBuffer] The buffer used to store the masking
       *     key
       * @param {Number} options.opcode The opcode
       * @param {Boolean} [options.readOnly=false] Specifies whether `data` can be
       *     modified
       * @param {Boolean} [options.rsv1=false] Specifies whether or not to set the
       *     RSV1 bit
       * @param {Function} [cb] Callback
       * @private
       */
      dispatch(data, compress, options, cb) {
        if (!compress) {
          this.sendFrame(_Sender.frame(data, options), cb);
          return;
        }
        const perMessageDeflate = this._extensions[PerMessageDeflate2.extensionName];
        this._bufferedBytes += options[kByteLength];
        this._state = DEFLATING;
        perMessageDeflate.compress(data, options.fin, (_, buf) => {
          if (this._socket.destroyed) {
            const err = new Error(
              "The socket was closed while data was being compressed"
            );
            callCallbacks(this, err, cb);
            return;
          }
          this._bufferedBytes -= options[kByteLength];
          this._state = DEFAULT;
          options.readOnly = false;
          this.sendFrame(_Sender.frame(buf, options), cb);
          this.dequeue();
        });
      }
      /**
       * Executes queued send operations.
       *
       * @private
       */
      dequeue() {
        while (this._state === DEFAULT && this._queue.length) {
          const params = this._queue.shift();
          this._bufferedBytes -= params[3][kByteLength];
          Reflect.apply(params[0], this, params.slice(1));
        }
      }
      /**
       * Enqueues a send operation.
       *
       * @param {Array} params Send operation parameters.
       * @private
       */
      enqueue(params) {
        this._bufferedBytes += params[3][kByteLength];
        this._queue.push(params);
      }
      /**
       * Sends a frame.
       *
       * @param {(Buffer | String)[]} list The frame to send
       * @param {Function} [cb] Callback
       * @private
       */
      sendFrame(list, cb) {
        if (list.length === 2) {
          this._socket.cork();
          this._socket.write(list[0]);
          this._socket.write(list[1], cb);
          this._socket.uncork();
        } else {
          this._socket.write(list[0], cb);
        }
      }
    };
    module.exports = Sender2;
    function callCallbacks(sender, err, cb) {
      if (typeof cb === "function") cb(err);
      for (let i = 0; i < sender._queue.length; i++) {
        const params = sender._queue[i];
        const callback = params[params.length - 1];
        if (typeof callback === "function") callback(err);
      }
    }
    function onError(sender, err, cb) {
      callCallbacks(sender, err, cb);
      sender.onerror(err);
    }
  }
});

// node_modules/ws/lib/event-target.js
var require_event_target = __commonJS({
  "node_modules/ws/lib/event-target.js"(exports, module) {
    "use strict";
    var { kForOnEventAttribute, kListener } = require_constants();
    var kCode = /* @__PURE__ */ Symbol("kCode");
    var kData = /* @__PURE__ */ Symbol("kData");
    var kError = /* @__PURE__ */ Symbol("kError");
    var kMessage = /* @__PURE__ */ Symbol("kMessage");
    var kReason = /* @__PURE__ */ Symbol("kReason");
    var kTarget = /* @__PURE__ */ Symbol("kTarget");
    var kType = /* @__PURE__ */ Symbol("kType");
    var kWasClean = /* @__PURE__ */ Symbol("kWasClean");
    var Event = class {
      /**
       * Create a new `Event`.
       *
       * @param {String} type The name of the event
       * @throws {TypeError} If the `type` argument is not specified
       */
      constructor(type) {
        this[kTarget] = null;
        this[kType] = type;
      }
      /**
       * @type {*}
       */
      get target() {
        return this[kTarget];
      }
      /**
       * @type {String}
       */
      get type() {
        return this[kType];
      }
    };
    Object.defineProperty(Event.prototype, "target", { enumerable: true });
    Object.defineProperty(Event.prototype, "type", { enumerable: true });
    var CloseEvent = class extends Event {
      /**
       * Create a new `CloseEvent`.
       *
       * @param {String} type The name of the event
       * @param {Object} [options] A dictionary object that allows for setting
       *     attributes via object members of the same name
       * @param {Number} [options.code=0] The status code explaining why the
       *     connection was closed
       * @param {String} [options.reason=''] A human-readable string explaining why
       *     the connection was closed
       * @param {Boolean} [options.wasClean=false] Indicates whether or not the
       *     connection was cleanly closed
       */
      constructor(type, options = {}) {
        super(type);
        this[kCode] = options.code === void 0 ? 0 : options.code;
        this[kReason] = options.reason === void 0 ? "" : options.reason;
        this[kWasClean] = options.wasClean === void 0 ? false : options.wasClean;
      }
      /**
       * @type {Number}
       */
      get code() {
        return this[kCode];
      }
      /**
       * @type {String}
       */
      get reason() {
        return this[kReason];
      }
      /**
       * @type {Boolean}
       */
      get wasClean() {
        return this[kWasClean];
      }
    };
    Object.defineProperty(CloseEvent.prototype, "code", { enumerable: true });
    Object.defineProperty(CloseEvent.prototype, "reason", { enumerable: true });
    Object.defineProperty(CloseEvent.prototype, "wasClean", { enumerable: true });
    var ErrorEvent = class extends Event {
      /**
       * Create a new `ErrorEvent`.
       *
       * @param {String} type The name of the event
       * @param {Object} [options] A dictionary object that allows for setting
       *     attributes via object members of the same name
       * @param {*} [options.error=null] The error that generated this event
       * @param {String} [options.message=''] The error message
       */
      constructor(type, options = {}) {
        super(type);
        this[kError] = options.error === void 0 ? null : options.error;
        this[kMessage] = options.message === void 0 ? "" : options.message;
      }
      /**
       * @type {*}
       */
      get error() {
        return this[kError];
      }
      /**
       * @type {String}
       */
      get message() {
        return this[kMessage];
      }
    };
    Object.defineProperty(ErrorEvent.prototype, "error", { enumerable: true });
    Object.defineProperty(ErrorEvent.prototype, "message", { enumerable: true });
    var MessageEvent = class extends Event {
      /**
       * Create a new `MessageEvent`.
       *
       * @param {String} type The name of the event
       * @param {Object} [options] A dictionary object that allows for setting
       *     attributes via object members of the same name
       * @param {*} [options.data=null] The message content
       */
      constructor(type, options = {}) {
        super(type);
        this[kData] = options.data === void 0 ? null : options.data;
      }
      /**
       * @type {*}
       */
      get data() {
        return this[kData];
      }
    };
    Object.defineProperty(MessageEvent.prototype, "data", { enumerable: true });
    var EventTarget = {
      /**
       * Register an event listener.
       *
       * @param {String} type A string representing the event type to listen for
       * @param {(Function|Object)} handler The listener to add
       * @param {Object} [options] An options object specifies characteristics about
       *     the event listener
       * @param {Boolean} [options.once=false] A `Boolean` indicating that the
       *     listener should be invoked at most once after being added. If `true`,
       *     the listener would be automatically removed when invoked.
       * @public
       */
      addEventListener(type, handler, options = {}) {
        for (const listener of this.listeners(type)) {
          if (!options[kForOnEventAttribute] && listener[kListener] === handler && !listener[kForOnEventAttribute]) {
            return;
          }
        }
        let wrapper;
        if (type === "message") {
          wrapper = function onMessage(data, isBinary) {
            const event = new MessageEvent("message", {
              data: isBinary ? data : data.toString()
            });
            event[kTarget] = this;
            callListener(handler, this, event);
          };
        } else if (type === "close") {
          wrapper = function onClose(code, message) {
            const event = new CloseEvent("close", {
              code,
              reason: message.toString(),
              wasClean: this._closeFrameReceived && this._closeFrameSent
            });
            event[kTarget] = this;
            callListener(handler, this, event);
          };
        } else if (type === "error") {
          wrapper = function onError(error) {
            const event = new ErrorEvent("error", {
              error,
              message: error.message
            });
            event[kTarget] = this;
            callListener(handler, this, event);
          };
        } else if (type === "open") {
          wrapper = function onOpen() {
            const event = new Event("open");
            event[kTarget] = this;
            callListener(handler, this, event);
          };
        } else {
          return;
        }
        wrapper[kForOnEventAttribute] = !!options[kForOnEventAttribute];
        wrapper[kListener] = handler;
        if (options.once) {
          this.once(type, wrapper);
        } else {
          this.on(type, wrapper);
        }
      },
      /**
       * Remove an event listener.
       *
       * @param {String} type A string representing the event type to remove
       * @param {(Function|Object)} handler The listener to remove
       * @public
       */
      removeEventListener(type, handler) {
        for (const listener of this.listeners(type)) {
          if (listener[kListener] === handler && !listener[kForOnEventAttribute]) {
            this.removeListener(type, listener);
            break;
          }
        }
      }
    };
    module.exports = {
      CloseEvent,
      ErrorEvent,
      Event,
      EventTarget,
      MessageEvent
    };
    function callListener(listener, thisArg, event) {
      if (typeof listener === "object" && listener.handleEvent) {
        listener.handleEvent.call(listener, event);
      } else {
        listener.call(thisArg, event);
      }
    }
  }
});

// node_modules/ws/lib/extension.js
var require_extension = __commonJS({
  "node_modules/ws/lib/extension.js"(exports, module) {
    "use strict";
    var { tokenChars } = require_validation();
    function push(dest, name, elem) {
      if (dest[name] === void 0) dest[name] = [elem];
      else dest[name].push(elem);
    }
    function parse(header) {
      const offers = /* @__PURE__ */ Object.create(null);
      let params = /* @__PURE__ */ Object.create(null);
      let mustUnescape = false;
      let isEscaping = false;
      let inQuotes = false;
      let extensionName;
      let paramName;
      let start = -1;
      let code = -1;
      let end = -1;
      let i = 0;
      for (; i < header.length; i++) {
        code = header.charCodeAt(i);
        if (extensionName === void 0) {
          if (end === -1 && tokenChars[code] === 1) {
            if (start === -1) start = i;
          } else if (i !== 0 && (code === 32 || code === 9)) {
            if (end === -1 && start !== -1) end = i;
          } else if (code === 59 || code === 44) {
            if (start === -1) {
              throw new SyntaxError(`Unexpected character at index ${i}`);
            }
            if (end === -1) end = i;
            const name = header.slice(start, end);
            if (code === 44) {
              push(offers, name, params);
              params = /* @__PURE__ */ Object.create(null);
            } else {
              extensionName = name;
            }
            start = end = -1;
          } else {
            throw new SyntaxError(`Unexpected character at index ${i}`);
          }
        } else if (paramName === void 0) {
          if (end === -1 && tokenChars[code] === 1) {
            if (start === -1) start = i;
          } else if (code === 32 || code === 9) {
            if (end === -1 && start !== -1) end = i;
          } else if (code === 59 || code === 44) {
            if (start === -1) {
              throw new SyntaxError(`Unexpected character at index ${i}`);
            }
            if (end === -1) end = i;
            push(params, header.slice(start, end), true);
            if (code === 44) {
              push(offers, extensionName, params);
              params = /* @__PURE__ */ Object.create(null);
              extensionName = void 0;
            }
            start = end = -1;
          } else if (code === 61 && start !== -1 && end === -1) {
            paramName = header.slice(start, i);
            start = end = -1;
          } else {
            throw new SyntaxError(`Unexpected character at index ${i}`);
          }
        } else {
          if (isEscaping) {
            if (tokenChars[code] !== 1) {
              throw new SyntaxError(`Unexpected character at index ${i}`);
            }
            if (start === -1) start = i;
            else if (!mustUnescape) mustUnescape = true;
            isEscaping = false;
          } else if (inQuotes) {
            if (tokenChars[code] === 1) {
              if (start === -1) start = i;
            } else if (code === 34 && start !== -1) {
              inQuotes = false;
              end = i;
            } else if (code === 92) {
              isEscaping = true;
            } else {
              throw new SyntaxError(`Unexpected character at index ${i}`);
            }
          } else if (code === 34 && header.charCodeAt(i - 1) === 61) {
            inQuotes = true;
          } else if (end === -1 && tokenChars[code] === 1) {
            if (start === -1) start = i;
          } else if (start !== -1 && (code === 32 || code === 9)) {
            if (end === -1) end = i;
          } else if (code === 59 || code === 44) {
            if (start === -1) {
              throw new SyntaxError(`Unexpected character at index ${i}`);
            }
            if (end === -1) end = i;
            let value = header.slice(start, end);
            if (mustUnescape) {
              value = value.replace(/\\/g, "");
              mustUnescape = false;
            }
            push(params, paramName, value);
            if (code === 44) {
              push(offers, extensionName, params);
              params = /* @__PURE__ */ Object.create(null);
              extensionName = void 0;
            }
            paramName = void 0;
            start = end = -1;
          } else {
            throw new SyntaxError(`Unexpected character at index ${i}`);
          }
        }
      }
      if (start === -1 || inQuotes || code === 32 || code === 9) {
        throw new SyntaxError("Unexpected end of input");
      }
      if (end === -1) end = i;
      const token = header.slice(start, end);
      if (extensionName === void 0) {
        push(offers, token, params);
      } else {
        if (paramName === void 0) {
          push(params, token, true);
        } else if (mustUnescape) {
          push(params, paramName, token.replace(/\\/g, ""));
        } else {
          push(params, paramName, token);
        }
        push(offers, extensionName, params);
      }
      return offers;
    }
    function format(extensions) {
      return Object.keys(extensions).map((extension2) => {
        let configurations = extensions[extension2];
        if (!Array.isArray(configurations)) configurations = [configurations];
        return configurations.map((params) => {
          return [extension2].concat(
            Object.keys(params).map((k) => {
              let values = params[k];
              if (!Array.isArray(values)) values = [values];
              return values.map((v) => v === true ? k : `${k}=${v}`).join("; ");
            })
          ).join("; ");
        }).join(", ");
      }).join(", ");
    }
    module.exports = { format, parse };
  }
});

// node_modules/ws/lib/websocket.js
var require_websocket = __commonJS({
  "node_modules/ws/lib/websocket.js"(exports, module) {
    "use strict";
    var EventEmitter = __require("events");
    var https = __require("https");
    var http = __require("http");
    var net = __require("net");
    var tls = __require("tls");
    var { randomBytes, createHash } = __require("crypto");
    var { Duplex, Readable } = __require("stream");
    var { URL: URL2 } = __require("url");
    var PerMessageDeflate2 = require_permessage_deflate();
    var Receiver2 = require_receiver();
    var Sender2 = require_sender();
    var { isBlob } = require_validation();
    var {
      BINARY_TYPES,
      CLOSE_TIMEOUT,
      EMPTY_BUFFER,
      GUID,
      kForOnEventAttribute,
      kListener,
      kStatusCode,
      kWebSocket,
      NOOP
    } = require_constants();
    var {
      EventTarget: { addEventListener: addEventListener2, removeEventListener }
    } = require_event_target();
    var { format, parse } = require_extension();
    var { toBuffer } = require_buffer_util();
    var kAborted = /* @__PURE__ */ Symbol("kAborted");
    var protocolVersions = [8, 13];
    var readyStates = ["CONNECTING", "OPEN", "CLOSING", "CLOSED"];
    var subprotocolRegex = /^[!#$%&'*+\-.0-9A-Z^_`|a-z~]+$/;
    var WebSocket2 = class _WebSocket extends EventEmitter {
      /**
       * Create a new `WebSocket`.
       *
       * @param {(String|URL)} address The URL to which to connect
       * @param {(String|String[])} [protocols] The subprotocols
       * @param {Object} [options] Connection options
       */
      constructor(address, protocols, options) {
        super();
        this._binaryType = BINARY_TYPES[0];
        this._closeCode = 1006;
        this._closeFrameReceived = false;
        this._closeFrameSent = false;
        this._closeMessage = EMPTY_BUFFER;
        this._closeTimer = null;
        this._errorEmitted = false;
        this._extensions = {};
        this._paused = false;
        this._protocol = "";
        this._readyState = _WebSocket.CONNECTING;
        this._receiver = null;
        this._sender = null;
        this._socket = null;
        if (address !== null) {
          this._bufferedAmount = 0;
          this._isServer = false;
          this._redirects = 0;
          if (protocols === void 0) {
            if (!options || options.protocols === void 0) {
              protocols = [];
            } else if (Array.isArray(options.protocols)) {
              protocols = options.protocols;
            } else {
              protocols = [options.protocols];
            }
          } else if (!Array.isArray(protocols)) {
            if (typeof protocols === "object" && protocols !== null) {
              options = protocols;
              if (options.protocols === void 0) {
                protocols = [];
              } else if (Array.isArray(options.protocols)) {
                protocols = options.protocols;
              } else {
                protocols = [options.protocols];
              }
            } else {
              protocols = [protocols];
            }
          }
          initAsClient(this, address, protocols, options);
        } else {
          this._autoPong = options.autoPong;
          this._closeTimeout = options.closeTimeout;
          this._isServer = true;
        }
      }
      /**
       * For historical reasons, the custom "nodebuffer" type is used by the default
       * instead of "blob".
       *
       * @type {String}
       */
      get binaryType() {
        return this._binaryType;
      }
      set binaryType(type) {
        if (!BINARY_TYPES.includes(type)) return;
        this._binaryType = type;
        if (this._receiver) this._receiver._binaryType = type;
      }
      /**
       * @type {Number}
       */
      get bufferedAmount() {
        if (!this._socket) return this._bufferedAmount;
        return this._socket._writableState.length + this._sender._bufferedBytes;
      }
      /**
       * @type {String}
       */
      get extensions() {
        return Object.keys(this._extensions).join();
      }
      /**
       * @type {Boolean}
       */
      get isPaused() {
        return this._paused;
      }
      /**
       * @type {Function}
       */
      /* istanbul ignore next */
      get onclose() {
        return null;
      }
      /**
       * @type {Function}
       */
      /* istanbul ignore next */
      get onerror() {
        return null;
      }
      /**
       * @type {Function}
       */
      /* istanbul ignore next */
      get onopen() {
        return null;
      }
      /**
       * @type {Function}
       */
      /* istanbul ignore next */
      get onmessage() {
        return null;
      }
      /**
       * @type {String}
       */
      get protocol() {
        return this._protocol;
      }
      /**
       * @type {Number}
       */
      get readyState() {
        return this._readyState;
      }
      /**
       * @type {String}
       */
      get url() {
        return this._url;
      }
      /**
       * Set up the socket and the internal resources.
       *
       * @param {Duplex} socket The network socket between the server and client
       * @param {Buffer} head The first packet of the upgraded stream
       * @param {Object} options Options object
       * @param {Boolean} [options.allowSynchronousEvents=false] Specifies whether
       *     any of the `'message'`, `'ping'`, and `'pong'` events can be emitted
       *     multiple times in the same tick
       * @param {Function} [options.generateMask] The function used to generate the
       *     masking key
       * @param {Number} [options.maxBufferedChunks=0] The maximum number of
       *     buffered data chunks
       * @param {Number} [options.maxFragments=0] The maximum number of message
       *     fragments
       * @param {Number} [options.maxPayload=0] The maximum allowed message size
       * @param {Boolean} [options.skipUTF8Validation=false] Specifies whether or
       *     not to skip UTF-8 validation for text and close messages
       * @private
       */
      setSocket(socket, head, options) {
        const receiver = new Receiver2({
          allowSynchronousEvents: options.allowSynchronousEvents,
          binaryType: this.binaryType,
          extensions: this._extensions,
          isServer: this._isServer,
          maxBufferedChunks: options.maxBufferedChunks,
          maxFragments: options.maxFragments,
          maxPayload: options.maxPayload,
          skipUTF8Validation: options.skipUTF8Validation
        });
        const sender = new Sender2(socket, this._extensions, options.generateMask);
        this._receiver = receiver;
        this._sender = sender;
        this._socket = socket;
        receiver[kWebSocket] = this;
        sender[kWebSocket] = this;
        socket[kWebSocket] = this;
        receiver.on("conclude", receiverOnConclude);
        receiver.on("drain", receiverOnDrain);
        receiver.on("error", receiverOnError);
        receiver.on("message", receiverOnMessage);
        receiver.on("ping", receiverOnPing);
        receiver.on("pong", receiverOnPong);
        sender.onerror = senderOnError;
        if (socket.setTimeout) socket.setTimeout(0);
        if (socket.setNoDelay) socket.setNoDelay();
        if (head.length > 0) socket.unshift(head);
        socket.on("close", socketOnClose);
        socket.on("data", socketOnData);
        socket.on("end", socketOnEnd);
        socket.on("error", socketOnError);
        this._readyState = _WebSocket.OPEN;
        this.emit("open");
      }
      /**
       * Emit the `'close'` event.
       *
       * @private
       */
      emitClose() {
        if (!this._socket) {
          this._readyState = _WebSocket.CLOSED;
          this.emit("close", this._closeCode, this._closeMessage);
          return;
        }
        if (this._extensions[PerMessageDeflate2.extensionName]) {
          this._extensions[PerMessageDeflate2.extensionName].cleanup();
        }
        this._receiver.removeAllListeners();
        this._readyState = _WebSocket.CLOSED;
        this.emit("close", this._closeCode, this._closeMessage);
      }
      /**
       * Start a closing handshake.
       *
       *          +----------+   +-----------+   +----------+
       *     - - -|ws.close()|-->|close frame|-->|ws.close()|- - -
       *    |     +----------+   +-----------+   +----------+     |
       *          +----------+   +-----------+         |
       * CLOSING  |ws.close()|<--|close frame|<--+-----+       CLOSING
       *          +----------+   +-----------+   |
       *    |           |                        |   +---+        |
       *                +------------------------+-->|fin| - - - -
       *    |         +---+                      |   +---+
       *     - - - - -|fin|<---------------------+
       *              +---+
       *
       * @param {Number} [code] Status code explaining why the connection is closing
       * @param {(String|Buffer)} [data] The reason why the connection is
       *     closing
       * @public
       */
      close(code, data) {
        if (this.readyState === _WebSocket.CLOSED) return;
        if (this.readyState === _WebSocket.CONNECTING) {
          const msg = "WebSocket was closed before the connection was established";
          abortHandshake(this, this._req, msg);
          return;
        }
        if (this.readyState === _WebSocket.CLOSING) {
          if (this._closeFrameSent && (this._closeFrameReceived || this._receiver._writableState.errorEmitted)) {
            this._socket.end();
          }
          return;
        }
        this._sender.close(code, data, !this._isServer, (err) => {
          if (err) return;
          this._closeFrameSent = true;
          if (this._closeFrameReceived || this._receiver._writableState.errorEmitted) {
            this._socket.end();
          }
        });
        this._readyState = _WebSocket.CLOSING;
        setCloseTimer(this);
      }
      /**
       * Pause the socket.
       *
       * @public
       */
      pause() {
        if (this.readyState === _WebSocket.CONNECTING || this.readyState === _WebSocket.CLOSED) {
          return;
        }
        this._paused = true;
        this._socket.pause();
      }
      /**
       * Send a ping.
       *
       * @param {*} [data] The data to send
       * @param {Boolean} [mask] Indicates whether or not to mask `data`
       * @param {Function} [cb] Callback which is executed when the ping is sent
       * @public
       */
      ping(data, mask, cb) {
        if (this.readyState === _WebSocket.CONNECTING) {
          throw new Error("WebSocket is not open: readyState 0 (CONNECTING)");
        }
        if (typeof data === "function") {
          cb = data;
          data = mask = void 0;
        } else if (typeof mask === "function") {
          cb = mask;
          mask = void 0;
        }
        if (typeof data === "number") data = data.toString();
        if (this.readyState !== _WebSocket.OPEN) {
          sendAfterClose(this, data, cb);
          return;
        }
        if (mask === void 0) mask = !this._isServer;
        this._sender.ping(data || EMPTY_BUFFER, mask, cb);
      }
      /**
       * Send a pong.
       *
       * @param {*} [data] The data to send
       * @param {Boolean} [mask] Indicates whether or not to mask `data`
       * @param {Function} [cb] Callback which is executed when the pong is sent
       * @public
       */
      pong(data, mask, cb) {
        if (this.readyState === _WebSocket.CONNECTING) {
          throw new Error("WebSocket is not open: readyState 0 (CONNECTING)");
        }
        if (typeof data === "function") {
          cb = data;
          data = mask = void 0;
        } else if (typeof mask === "function") {
          cb = mask;
          mask = void 0;
        }
        if (typeof data === "number") data = data.toString();
        if (this.readyState !== _WebSocket.OPEN) {
          sendAfterClose(this, data, cb);
          return;
        }
        if (mask === void 0) mask = !this._isServer;
        this._sender.pong(data || EMPTY_BUFFER, mask, cb);
      }
      /**
       * Resume the socket.
       *
       * @public
       */
      resume() {
        if (this.readyState === _WebSocket.CONNECTING || this.readyState === _WebSocket.CLOSED) {
          return;
        }
        this._paused = false;
        if (!this._receiver._writableState.needDrain) this._socket.resume();
      }
      /**
       * Send a data message.
       *
       * @param {*} data The message to send
       * @param {Object} [options] Options object
       * @param {Boolean} [options.binary] Specifies whether `data` is binary or
       *     text
       * @param {Boolean} [options.compress] Specifies whether or not to compress
       *     `data`
       * @param {Boolean} [options.fin=true] Specifies whether the fragment is the
       *     last one
       * @param {Boolean} [options.mask] Specifies whether or not to mask `data`
       * @param {Function} [cb] Callback which is executed when data is written out
       * @public
       */
      send(data, options, cb) {
        if (this.readyState === _WebSocket.CONNECTING) {
          throw new Error("WebSocket is not open: readyState 0 (CONNECTING)");
        }
        if (typeof options === "function") {
          cb = options;
          options = {};
        }
        if (typeof data === "number") data = data.toString();
        if (this.readyState !== _WebSocket.OPEN) {
          sendAfterClose(this, data, cb);
          return;
        }
        const opts = {
          binary: typeof data !== "string",
          mask: !this._isServer,
          compress: true,
          fin: true,
          ...options
        };
        if (!this._extensions[PerMessageDeflate2.extensionName]) {
          opts.compress = false;
        }
        this._sender.send(data || EMPTY_BUFFER, opts, cb);
      }
      /**
       * Forcibly close the connection.
       *
       * @public
       */
      terminate() {
        if (this.readyState === _WebSocket.CLOSED) return;
        if (this.readyState === _WebSocket.CONNECTING) {
          const msg = "WebSocket was closed before the connection was established";
          abortHandshake(this, this._req, msg);
          return;
        }
        if (this._socket) {
          this._readyState = _WebSocket.CLOSING;
          this._socket.destroy();
        }
      }
    };
    Object.defineProperty(WebSocket2, "CONNECTING", {
      enumerable: true,
      value: readyStates.indexOf("CONNECTING")
    });
    Object.defineProperty(WebSocket2.prototype, "CONNECTING", {
      enumerable: true,
      value: readyStates.indexOf("CONNECTING")
    });
    Object.defineProperty(WebSocket2, "OPEN", {
      enumerable: true,
      value: readyStates.indexOf("OPEN")
    });
    Object.defineProperty(WebSocket2.prototype, "OPEN", {
      enumerable: true,
      value: readyStates.indexOf("OPEN")
    });
    Object.defineProperty(WebSocket2, "CLOSING", {
      enumerable: true,
      value: readyStates.indexOf("CLOSING")
    });
    Object.defineProperty(WebSocket2.prototype, "CLOSING", {
      enumerable: true,
      value: readyStates.indexOf("CLOSING")
    });
    Object.defineProperty(WebSocket2, "CLOSED", {
      enumerable: true,
      value: readyStates.indexOf("CLOSED")
    });
    Object.defineProperty(WebSocket2.prototype, "CLOSED", {
      enumerable: true,
      value: readyStates.indexOf("CLOSED")
    });
    [
      "binaryType",
      "bufferedAmount",
      "extensions",
      "isPaused",
      "protocol",
      "readyState",
      "url"
    ].forEach((property) => {
      Object.defineProperty(WebSocket2.prototype, property, { enumerable: true });
    });
    ["open", "error", "close", "message"].forEach((method) => {
      Object.defineProperty(WebSocket2.prototype, `on${method}`, {
        enumerable: true,
        get() {
          for (const listener of this.listeners(method)) {
            if (listener[kForOnEventAttribute]) return listener[kListener];
          }
          return null;
        },
        set(handler) {
          for (const listener of this.listeners(method)) {
            if (listener[kForOnEventAttribute]) {
              this.removeListener(method, listener);
              break;
            }
          }
          if (typeof handler !== "function") return;
          this.addEventListener(method, handler, {
            [kForOnEventAttribute]: true
          });
        }
      });
    });
    WebSocket2.prototype.addEventListener = addEventListener2;
    WebSocket2.prototype.removeEventListener = removeEventListener;
    module.exports = WebSocket2;
    function initAsClient(websocket, address, protocols, options) {
      const opts = {
        allowSynchronousEvents: true,
        autoPong: true,
        closeTimeout: CLOSE_TIMEOUT,
        protocolVersion: protocolVersions[1],
        maxBufferedChunks: 256 * 1024,
        maxFragments: 16 * 1024,
        maxPayload: 100 * 1024 * 1024,
        skipUTF8Validation: false,
        perMessageDeflate: true,
        followRedirects: false,
        maxRedirects: 10,
        ...options,
        socketPath: void 0,
        hostname: void 0,
        protocol: void 0,
        protocols: void 0,
        timeout: void 0,
        method: "GET",
        host: void 0,
        path: void 0,
        port: void 0
      };
      websocket._autoPong = opts.autoPong;
      websocket._closeTimeout = opts.closeTimeout;
      if (!protocolVersions.includes(opts.protocolVersion)) {
        throw new RangeError(
          `Unsupported protocol version: ${opts.protocolVersion} (supported versions: ${protocolVersions.join(", ")})`
        );
      }
      let parsedUrl;
      if (address instanceof URL2) {
        parsedUrl = address;
      } else {
        try {
          parsedUrl = new URL2(address);
        } catch {
          throw new SyntaxError(`Invalid URL: ${address}`);
        }
      }
      if (parsedUrl.protocol === "http:") {
        parsedUrl.protocol = "ws:";
      } else if (parsedUrl.protocol === "https:") {
        parsedUrl.protocol = "wss:";
      }
      websocket._url = parsedUrl.href;
      const isSecure = parsedUrl.protocol === "wss:";
      const isIpcUrl = parsedUrl.protocol === "ws+unix:";
      let invalidUrlMessage;
      if (parsedUrl.protocol !== "ws:" && !isSecure && !isIpcUrl) {
        invalidUrlMessage = `The URL's protocol must be one of "ws:", "wss:", "http:", "https:", or "ws+unix:"`;
      } else if (isIpcUrl && !parsedUrl.pathname) {
        invalidUrlMessage = "The URL's pathname is empty";
      } else if (parsedUrl.hash) {
        invalidUrlMessage = "The URL contains a fragment identifier";
      }
      if (invalidUrlMessage) {
        const err = new SyntaxError(invalidUrlMessage);
        if (websocket._redirects === 0) {
          throw err;
        } else {
          emitErrorAndClose(websocket, err);
          return;
        }
      }
      const defaultPort = isSecure ? 443 : 80;
      const key = randomBytes(16).toString("base64");
      const request = isSecure ? https.request : http.request;
      const protocolSet = /* @__PURE__ */ new Set();
      let perMessageDeflate;
      opts.createConnection = opts.createConnection || (isSecure ? tlsConnect : netConnect);
      opts.defaultPort = opts.defaultPort || defaultPort;
      opts.port = parsedUrl.port || defaultPort;
      opts.host = parsedUrl.hostname.startsWith("[") ? parsedUrl.hostname.slice(1, -1) : parsedUrl.hostname;
      opts.headers = {
        ...opts.headers,
        "Sec-WebSocket-Version": opts.protocolVersion,
        "Sec-WebSocket-Key": key,
        Connection: "Upgrade",
        Upgrade: "websocket"
      };
      opts.path = parsedUrl.pathname + parsedUrl.search;
      opts.timeout = opts.handshakeTimeout;
      if (opts.perMessageDeflate) {
        perMessageDeflate = new PerMessageDeflate2({
          ...opts.perMessageDeflate,
          isServer: false,
          maxPayload: opts.maxPayload
        });
        opts.headers["Sec-WebSocket-Extensions"] = format({
          [PerMessageDeflate2.extensionName]: perMessageDeflate.offer()
        });
      }
      if (protocols.length) {
        for (const protocol of protocols) {
          if (typeof protocol !== "string" || !subprotocolRegex.test(protocol) || protocolSet.has(protocol)) {
            throw new SyntaxError(
              "An invalid or duplicated subprotocol was specified"
            );
          }
          protocolSet.add(protocol);
        }
        opts.headers["Sec-WebSocket-Protocol"] = protocols.join(",");
      }
      if (opts.origin) {
        if (opts.protocolVersion < 13) {
          opts.headers["Sec-WebSocket-Origin"] = opts.origin;
        } else {
          opts.headers.Origin = opts.origin;
        }
      }
      if (parsedUrl.username || parsedUrl.password) {
        opts.auth = `${parsedUrl.username}:${parsedUrl.password}`;
      }
      if (isIpcUrl) {
        const parts = opts.path.split(":");
        opts.socketPath = parts[0];
        opts.path = parts[1];
      }
      let req;
      if (opts.followRedirects) {
        if (websocket._redirects === 0) {
          websocket._originalIpc = isIpcUrl;
          websocket._originalSecure = isSecure;
          websocket._originalHostOrSocketPath = isIpcUrl ? opts.socketPath : parsedUrl.host;
          const headers = options && options.headers;
          options = { ...options, headers: {} };
          if (headers) {
            for (const [key2, value] of Object.entries(headers)) {
              options.headers[key2.toLowerCase()] = value;
            }
          }
        } else if (websocket.listenerCount("redirect") === 0) {
          const isSameHost = isIpcUrl ? websocket._originalIpc ? opts.socketPath === websocket._originalHostOrSocketPath : false : websocket._originalIpc ? false : parsedUrl.host === websocket._originalHostOrSocketPath;
          if (!isSameHost || websocket._originalSecure && !isSecure) {
            delete opts.headers.authorization;
            delete opts.headers.cookie;
            if (!isSameHost) delete opts.headers.host;
            opts.auth = void 0;
          }
        }
        if (opts.auth && !options.headers.authorization) {
          options.headers.authorization = "Basic " + Buffer.from(opts.auth).toString("base64");
        }
        req = websocket._req = request(opts);
        if (websocket._redirects) {
          websocket.emit("redirect", websocket.url, req);
        }
      } else {
        req = websocket._req = request(opts);
      }
      if (opts.timeout) {
        req.on("timeout", () => {
          abortHandshake(websocket, req, "Opening handshake has timed out");
        });
      }
      req.on("error", (err) => {
        if (req === null || req[kAborted]) return;
        req = websocket._req = null;
        emitErrorAndClose(websocket, err);
      });
      req.on("response", (res) => {
        const location = res.headers.location;
        const statusCode = res.statusCode;
        if (location && opts.followRedirects && statusCode >= 300 && statusCode < 400) {
          if (++websocket._redirects > opts.maxRedirects) {
            abortHandshake(websocket, req, "Maximum redirects exceeded");
            return;
          }
          req.abort();
          let addr;
          try {
            addr = new URL2(location, address);
          } catch (e) {
            const err = new SyntaxError(`Invalid URL: ${location}`);
            emitErrorAndClose(websocket, err);
            return;
          }
          initAsClient(websocket, addr, protocols, options);
        } else if (!websocket.emit("unexpected-response", req, res)) {
          abortHandshake(
            websocket,
            req,
            `Unexpected server response: ${res.statusCode}`
          );
        }
      });
      req.on("upgrade", (res, socket, head) => {
        websocket.emit("upgrade", res);
        if (websocket.readyState !== WebSocket2.CONNECTING) return;
        req = websocket._req = null;
        const upgrade = res.headers.upgrade;
        if (upgrade === void 0 || upgrade.toLowerCase() !== "websocket") {
          abortHandshake(websocket, socket, "Invalid Upgrade header");
          return;
        }
        const digest = createHash("sha1").update(key + GUID).digest("base64");
        if (res.headers["sec-websocket-accept"] !== digest) {
          abortHandshake(websocket, socket, "Invalid Sec-WebSocket-Accept header");
          return;
        }
        const serverProt = res.headers["sec-websocket-protocol"];
        let protError;
        if (serverProt !== void 0) {
          if (!protocolSet.size) {
            protError = "Server sent a subprotocol but none was requested";
          } else if (!protocolSet.has(serverProt)) {
            protError = "Server sent an invalid subprotocol";
          }
        } else if (protocolSet.size) {
          protError = "Server sent no subprotocol";
        }
        if (protError) {
          abortHandshake(websocket, socket, protError);
          return;
        }
        if (serverProt) websocket._protocol = serverProt;
        const secWebSocketExtensions = res.headers["sec-websocket-extensions"];
        if (secWebSocketExtensions !== void 0) {
          if (!perMessageDeflate) {
            const message = "Server sent a Sec-WebSocket-Extensions header but no extension was requested";
            abortHandshake(websocket, socket, message);
            return;
          }
          let extensions;
          try {
            extensions = parse(secWebSocketExtensions);
          } catch (err) {
            const message = "Invalid Sec-WebSocket-Extensions header";
            abortHandshake(websocket, socket, message);
            return;
          }
          const extensionNames = Object.keys(extensions);
          if (extensionNames.length !== 1 || extensionNames[0] !== PerMessageDeflate2.extensionName) {
            const message = "Server indicated an extension that was not requested";
            abortHandshake(websocket, socket, message);
            return;
          }
          try {
            perMessageDeflate.accept(extensions[PerMessageDeflate2.extensionName]);
          } catch (err) {
            const message = "Invalid Sec-WebSocket-Extensions header";
            abortHandshake(websocket, socket, message);
            return;
          }
          websocket._extensions[PerMessageDeflate2.extensionName] = perMessageDeflate;
        }
        websocket.setSocket(socket, head, {
          allowSynchronousEvents: opts.allowSynchronousEvents,
          generateMask: opts.generateMask,
          maxBufferedChunks: opts.maxBufferedChunks,
          maxFragments: opts.maxFragments,
          maxPayload: opts.maxPayload,
          skipUTF8Validation: opts.skipUTF8Validation
        });
      });
      if (opts.finishRequest) {
        opts.finishRequest(req, websocket);
      } else {
        req.end();
      }
    }
    function emitErrorAndClose(websocket, err) {
      websocket._readyState = WebSocket2.CLOSING;
      websocket._errorEmitted = true;
      websocket.emit("error", err);
      websocket.emitClose();
    }
    function netConnect(options) {
      options.path = options.socketPath;
      return net.connect(options);
    }
    function tlsConnect(options) {
      options.path = void 0;
      if (!options.servername && options.servername !== "") {
        options.servername = net.isIP(options.host) ? "" : options.host;
      }
      return tls.connect(options);
    }
    function abortHandshake(websocket, stream, message) {
      websocket._readyState = WebSocket2.CLOSING;
      const err = new Error(message);
      Error.captureStackTrace(err, abortHandshake);
      if (stream.setHeader) {
        stream[kAborted] = true;
        stream.abort();
        if (stream.socket && !stream.socket.destroyed) {
          stream.socket.destroy();
        }
        process.nextTick(emitErrorAndClose, websocket, err);
      } else {
        stream.destroy(err);
        stream.once("error", websocket.emit.bind(websocket, "error"));
        stream.once("close", websocket.emitClose.bind(websocket));
      }
    }
    function sendAfterClose(websocket, data, cb) {
      if (data) {
        const length = isBlob(data) ? data.size : toBuffer(data).length;
        if (websocket._socket) websocket._sender._bufferedBytes += length;
        else websocket._bufferedAmount += length;
      }
      if (cb) {
        const err = new Error(
          `WebSocket is not open: readyState ${websocket.readyState} (${readyStates[websocket.readyState]})`
        );
        process.nextTick(cb, err);
      }
    }
    function receiverOnConclude(code, reason) {
      const websocket = this[kWebSocket];
      websocket._closeFrameReceived = true;
      websocket._closeMessage = reason;
      websocket._closeCode = code;
      if (websocket._socket[kWebSocket] === void 0) return;
      websocket._socket.removeListener("data", socketOnData);
      process.nextTick(resume, websocket._socket);
      if (code === 1005) websocket.close();
      else websocket.close(code, reason);
    }
    function receiverOnDrain() {
      const websocket = this[kWebSocket];
      if (!websocket.isPaused) websocket._socket.resume();
    }
    function receiverOnError(err) {
      const websocket = this[kWebSocket];
      if (websocket._socket[kWebSocket] !== void 0) {
        websocket._socket.removeListener("data", socketOnData);
        process.nextTick(resume, websocket._socket);
        websocket.close(err[kStatusCode]);
      }
      if (!websocket._errorEmitted) {
        websocket._errorEmitted = true;
        websocket.emit("error", err);
      }
    }
    function receiverOnFinish() {
      this[kWebSocket].emitClose();
    }
    function receiverOnMessage(data, isBinary) {
      this[kWebSocket].emit("message", data, isBinary);
    }
    function receiverOnPing(data) {
      const websocket = this[kWebSocket];
      if (websocket._autoPong) websocket.pong(data, !this._isServer, NOOP);
      websocket.emit("ping", data);
    }
    function receiverOnPong(data) {
      this[kWebSocket].emit("pong", data);
    }
    function resume(stream) {
      stream.resume();
    }
    function senderOnError(err) {
      const websocket = this[kWebSocket];
      if (websocket.readyState === WebSocket2.CLOSED) return;
      if (websocket.readyState === WebSocket2.OPEN) {
        websocket._readyState = WebSocket2.CLOSING;
        setCloseTimer(websocket);
      }
      this._socket.end();
      if (!websocket._errorEmitted) {
        websocket._errorEmitted = true;
        websocket.emit("error", err);
      }
    }
    function setCloseTimer(websocket) {
      websocket._closeTimer = setTimeout(
        websocket._socket.destroy.bind(websocket._socket),
        websocket._closeTimeout
      );
    }
    function socketOnClose() {
      const websocket = this[kWebSocket];
      this.removeListener("close", socketOnClose);
      this.removeListener("data", socketOnData);
      this.removeListener("end", socketOnEnd);
      websocket._readyState = WebSocket2.CLOSING;
      if (!this._readableState.endEmitted && !websocket._closeFrameReceived && !websocket._receiver._writableState.errorEmitted && this._readableState.length !== 0) {
        const chunk2 = this.read(this._readableState.length);
        websocket._receiver.write(chunk2);
      }
      websocket._receiver.end();
      this[kWebSocket] = void 0;
      clearTimeout(websocket._closeTimer);
      if (websocket._receiver._writableState.finished || websocket._receiver._writableState.errorEmitted) {
        websocket.emitClose();
      } else {
        websocket._receiver.on("error", receiverOnFinish);
        websocket._receiver.on("finish", receiverOnFinish);
      }
    }
    function socketOnData(chunk2) {
      if (!this[kWebSocket]._receiver.write(chunk2)) {
        this.pause();
      }
    }
    function socketOnEnd() {
      const websocket = this[kWebSocket];
      websocket._readyState = WebSocket2.CLOSING;
      websocket._receiver.end();
      this.end();
    }
    function socketOnError() {
      const websocket = this[kWebSocket];
      this.removeListener("error", socketOnError);
      this.on("error", NOOP);
      if (websocket) {
        websocket._readyState = WebSocket2.CLOSING;
        this.destroy();
      }
    }
  }
});

// node_modules/ws/lib/stream.js
var require_stream = __commonJS({
  "node_modules/ws/lib/stream.js"(exports, module) {
    "use strict";
    var WebSocket2 = require_websocket();
    var { Duplex } = __require("stream");
    function emitClose(stream) {
      stream.emit("close");
    }
    function duplexOnEnd() {
      if (!this.destroyed && this._writableState.finished) {
        this.destroy();
      }
    }
    function duplexOnError(err) {
      this.removeListener("error", duplexOnError);
      this.destroy();
      if (this.listenerCount("error") === 0) {
        this.emit("error", err);
      }
    }
    function createWebSocketStream2(ws, options) {
      let terminateOnDestroy = true;
      const duplex = new Duplex({
        ...options,
        autoDestroy: false,
        emitClose: false,
        objectMode: false,
        writableObjectMode: false
      });
      ws.on("message", function message(msg, isBinary) {
        const data = !isBinary && duplex._readableState.objectMode ? msg.toString() : msg;
        if (!duplex.push(data)) ws.pause();
      });
      ws.once("error", function error(err) {
        if (duplex.destroyed) return;
        terminateOnDestroy = false;
        duplex.destroy(err);
      });
      ws.once("close", function close() {
        if (duplex.destroyed) return;
        duplex.push(null);
      });
      duplex._destroy = function(err, callback) {
        if (ws.readyState === ws.CLOSED) {
          callback(err);
          process.nextTick(emitClose, duplex);
          return;
        }
        let called = false;
        ws.once("error", function error(err2) {
          called = true;
          callback(err2);
        });
        ws.once("close", function close() {
          if (!called) callback(err);
          process.nextTick(emitClose, duplex);
        });
        if (terminateOnDestroy) ws.terminate();
      };
      duplex._final = function(callback) {
        if (ws.readyState === ws.CONNECTING) {
          ws.once("open", function open() {
            duplex._final(callback);
          });
          return;
        }
        if (ws._socket === null) return;
        if (ws._socket._writableState.finished) {
          callback();
          if (duplex._readableState.endEmitted) duplex.destroy();
        } else {
          ws._socket.once("finish", function finish() {
            callback();
          });
          ws.close();
        }
      };
      duplex._read = function() {
        if (ws.isPaused) ws.resume();
      };
      duplex._write = function(chunk2, encoding, callback) {
        if (ws.readyState === ws.CONNECTING) {
          ws.once("open", function open() {
            duplex._write(chunk2, encoding, callback);
          });
          return;
        }
        ws.send(chunk2, callback);
      };
      duplex.on("end", duplexOnEnd);
      duplex.on("error", duplexOnError);
      return duplex;
    }
    module.exports = createWebSocketStream2;
  }
});

// node_modules/ws/lib/subprotocol.js
var require_subprotocol = __commonJS({
  "node_modules/ws/lib/subprotocol.js"(exports, module) {
    "use strict";
    var { tokenChars } = require_validation();
    function parse(header) {
      const protocols = /* @__PURE__ */ new Set();
      let start = -1;
      let end = -1;
      let i = 0;
      for (i; i < header.length; i++) {
        const code = header.charCodeAt(i);
        if (end === -1 && tokenChars[code] === 1) {
          if (start === -1) start = i;
        } else if (i !== 0 && (code === 32 || code === 9)) {
          if (end === -1 && start !== -1) end = i;
        } else if (code === 44) {
          if (start === -1) {
            throw new SyntaxError(`Unexpected character at index ${i}`);
          }
          if (end === -1) end = i;
          const protocol2 = header.slice(start, end);
          if (protocols.has(protocol2)) {
            throw new SyntaxError(`The "${protocol2}" subprotocol is duplicated`);
          }
          protocols.add(protocol2);
          start = end = -1;
        } else {
          throw new SyntaxError(`Unexpected character at index ${i}`);
        }
      }
      if (start === -1 || end !== -1) {
        throw new SyntaxError("Unexpected end of input");
      }
      const protocol = header.slice(start, i);
      if (protocols.has(protocol)) {
        throw new SyntaxError(`The "${protocol}" subprotocol is duplicated`);
      }
      protocols.add(protocol);
      return protocols;
    }
    module.exports = { parse };
  }
});

// node_modules/ws/lib/websocket-server.js
var require_websocket_server = __commonJS({
  "node_modules/ws/lib/websocket-server.js"(exports, module) {
    "use strict";
    var EventEmitter = __require("events");
    var http = __require("http");
    var { Duplex } = __require("stream");
    var { createHash } = __require("crypto");
    var extension2 = require_extension();
    var PerMessageDeflate2 = require_permessage_deflate();
    var subprotocol2 = require_subprotocol();
    var WebSocket2 = require_websocket();
    var { CLOSE_TIMEOUT, GUID, kWebSocket } = require_constants();
    var keyRegex = /^[+/0-9A-Za-z]{22}==$/;
    var RUNNING = 0;
    var CLOSING = 1;
    var CLOSED = 2;
    var WebSocketServer2 = class extends EventEmitter {
      /**
       * Create a `WebSocketServer` instance.
       *
       * @param {Object} options Configuration options
       * @param {Boolean} [options.allowSynchronousEvents=true] Specifies whether
       *     any of the `'message'`, `'ping'`, and `'pong'` events can be emitted
       *     multiple times in the same tick
       * @param {Boolean} [options.autoPong=true] Specifies whether or not to
       *     automatically send a pong in response to a ping
       * @param {Number} [options.backlog=511] The maximum length of the queue of
       *     pending connections
       * @param {Boolean} [options.clientTracking=true] Specifies whether or not to
       *     track clients
       * @param {Number} [options.closeTimeout=30000] Duration in milliseconds to
       *     wait for the closing handshake to finish after `websocket.close()` is
       *     called
       * @param {Function} [options.handleProtocols] A hook to handle protocols
       * @param {String} [options.host] The hostname where to bind the server
       * @param {Number} [options.maxBufferedChunks=262144] The maximum number of
       *     buffered data chunks
       * @param {Number} [options.maxFragments=16384] The maximum number of message
       *     fragments
       * @param {Number} [options.maxPayload=104857600] The maximum allowed message
       *     size
       * @param {Boolean} [options.noServer=false] Enable no server mode
       * @param {String} [options.path] Accept only connections matching this path
       * @param {(Boolean|Object)} [options.perMessageDeflate=false] Enable/disable
       *     permessage-deflate
       * @param {Number} [options.port] The port where to bind the server
       * @param {(http.Server|https.Server)} [options.server] A pre-created HTTP/S
       *     server to use
       * @param {Boolean} [options.skipUTF8Validation=false] Specifies whether or
       *     not to skip UTF-8 validation for text and close messages
       * @param {Function} [options.verifyClient] A hook to reject connections
       * @param {Function} [options.WebSocket=WebSocket] Specifies the `WebSocket`
       *     class to use. It must be the `WebSocket` class or class that extends it
       * @param {Function} [callback] A listener for the `listening` event
       */
      constructor(options, callback) {
        super();
        options = {
          allowSynchronousEvents: true,
          autoPong: true,
          maxBufferedChunks: 256 * 1024,
          maxFragments: 16 * 1024,
          maxPayload: 100 * 1024 * 1024,
          skipUTF8Validation: false,
          perMessageDeflate: false,
          handleProtocols: null,
          clientTracking: true,
          closeTimeout: CLOSE_TIMEOUT,
          verifyClient: null,
          noServer: false,
          backlog: null,
          // use default (511 as implemented in net.js)
          server: null,
          host: null,
          path: null,
          port: null,
          WebSocket: WebSocket2,
          ...options
        };
        if (options.port == null && !options.server && !options.noServer || options.port != null && (options.server || options.noServer) || options.server && options.noServer) {
          throw new TypeError(
            'One and only one of the "port", "server", or "noServer" options must be specified'
          );
        }
        if (options.port != null) {
          this._server = http.createServer((req, res) => {
            const body = http.STATUS_CODES[426];
            res.writeHead(426, {
              "Content-Length": body.length,
              "Content-Type": "text/plain"
            });
            res.end(body);
          });
          this._server.listen(
            options.port,
            options.host,
            options.backlog,
            callback
          );
        } else if (options.server) {
          this._server = options.server;
        }
        if (this._server) {
          const emitConnection = this.emit.bind(this, "connection");
          this._removeListeners = addListeners(this._server, {
            listening: this.emit.bind(this, "listening"),
            error: this.emit.bind(this, "error"),
            upgrade: (req, socket, head) => {
              this.handleUpgrade(req, socket, head, emitConnection);
            }
          });
        }
        if (options.perMessageDeflate === true) options.perMessageDeflate = {};
        if (options.clientTracking) {
          this.clients = /* @__PURE__ */ new Set();
          this._shouldEmitClose = false;
        }
        this.options = options;
        this._state = RUNNING;
      }
      /**
       * Returns the bound address, the address family name, and port of the server
       * as reported by the operating system if listening on an IP socket.
       * If the server is listening on a pipe or UNIX domain socket, the name is
       * returned as a string.
       *
       * @return {(Object|String|null)} The address of the server
       * @public
       */
      address() {
        if (this.options.noServer) {
          throw new Error('The server is operating in "noServer" mode');
        }
        if (!this._server) return null;
        return this._server.address();
      }
      /**
       * Stop the server from accepting new connections and emit the `'close'` event
       * when all existing connections are closed.
       *
       * @param {Function} [cb] A one-time listener for the `'close'` event
       * @public
       */
      close(cb) {
        if (this._state === CLOSED) {
          if (cb) {
            this.once("close", () => {
              cb(new Error("The server is not running"));
            });
          }
          process.nextTick(emitClose, this);
          return;
        }
        if (cb) this.once("close", cb);
        if (this._state === CLOSING) return;
        this._state = CLOSING;
        if (this.options.noServer || this.options.server) {
          if (this._server) {
            this._removeListeners();
            this._removeListeners = this._server = null;
          }
          if (this.clients) {
            if (!this.clients.size) {
              process.nextTick(emitClose, this);
            } else {
              this._shouldEmitClose = true;
            }
          } else {
            process.nextTick(emitClose, this);
          }
        } else {
          const server = this._server;
          this._removeListeners();
          this._removeListeners = this._server = null;
          server.close(() => {
            emitClose(this);
          });
        }
      }
      /**
       * See if a given request should be handled by this server instance.
       *
       * @param {http.IncomingMessage} req Request object to inspect
       * @return {Boolean} `true` if the request is valid, else `false`
       * @public
       */
      shouldHandle(req) {
        if (this.options.path) {
          const index = req.url.indexOf("?");
          const pathname = index !== -1 ? req.url.slice(0, index) : req.url;
          if (pathname !== this.options.path) return false;
        }
        return true;
      }
      /**
       * Handle a HTTP Upgrade request.
       *
       * @param {http.IncomingMessage} req The request object
       * @param {Duplex} socket The network socket between the server and client
       * @param {Buffer} head The first packet of the upgraded stream
       * @param {Function} cb Callback
       * @public
       */
      handleUpgrade(req, socket, head, cb) {
        socket.on("error", socketOnError);
        const key = req.headers["sec-websocket-key"];
        const upgrade = req.headers.upgrade;
        const version2 = +req.headers["sec-websocket-version"];
        if (req.method !== "GET") {
          const message = "Invalid HTTP method";
          abortHandshakeOrEmitwsClientError(this, req, socket, 405, message);
          return;
        }
        if (upgrade === void 0 || upgrade.toLowerCase() !== "websocket") {
          const message = "Invalid Upgrade header";
          abortHandshakeOrEmitwsClientError(this, req, socket, 400, message);
          return;
        }
        if (key === void 0 || !keyRegex.test(key)) {
          const message = "Missing or invalid Sec-WebSocket-Key header";
          abortHandshakeOrEmitwsClientError(this, req, socket, 400, message);
          return;
        }
        if (version2 !== 13 && version2 !== 8) {
          const message = "Missing or invalid Sec-WebSocket-Version header";
          abortHandshakeOrEmitwsClientError(this, req, socket, 400, message, {
            "Sec-WebSocket-Version": "13, 8"
          });
          return;
        }
        if (!this.shouldHandle(req)) {
          abortHandshake(socket, 400);
          return;
        }
        const secWebSocketProtocol = req.headers["sec-websocket-protocol"];
        let protocols = /* @__PURE__ */ new Set();
        if (secWebSocketProtocol !== void 0) {
          try {
            protocols = subprotocol2.parse(secWebSocketProtocol);
          } catch (err) {
            const message = "Invalid Sec-WebSocket-Protocol header";
            abortHandshakeOrEmitwsClientError(this, req, socket, 400, message);
            return;
          }
        }
        const secWebSocketExtensions = req.headers["sec-websocket-extensions"];
        const extensions = {};
        if (this.options.perMessageDeflate && secWebSocketExtensions !== void 0) {
          const perMessageDeflate = new PerMessageDeflate2({
            ...this.options.perMessageDeflate,
            isServer: true,
            maxPayload: this.options.maxPayload
          });
          try {
            const offers = extension2.parse(secWebSocketExtensions);
            if (offers[PerMessageDeflate2.extensionName]) {
              perMessageDeflate.accept(offers[PerMessageDeflate2.extensionName]);
              extensions[PerMessageDeflate2.extensionName] = perMessageDeflate;
            }
          } catch (err) {
            const message = "Invalid or unacceptable Sec-WebSocket-Extensions header";
            abortHandshakeOrEmitwsClientError(this, req, socket, 400, message);
            return;
          }
        }
        if (this.options.verifyClient) {
          const info = {
            origin: req.headers[`${version2 === 8 ? "sec-websocket-origin" : "origin"}`],
            secure: !!(req.socket.authorized || req.socket.encrypted),
            req
          };
          if (this.options.verifyClient.length === 2) {
            this.options.verifyClient(info, (verified, code, message, headers) => {
              if (!verified) {
                return abortHandshake(socket, code || 401, message, headers);
              }
              this.completeUpgrade(
                extensions,
                key,
                protocols,
                req,
                socket,
                head,
                cb
              );
            });
            return;
          }
          if (!this.options.verifyClient(info)) return abortHandshake(socket, 401);
        }
        this.completeUpgrade(extensions, key, protocols, req, socket, head, cb);
      }
      /**
       * Upgrade the connection to WebSocket.
       *
       * @param {Object} extensions The accepted extensions
       * @param {String} key The value of the `Sec-WebSocket-Key` header
       * @param {Set} protocols The subprotocols
       * @param {http.IncomingMessage} req The request object
       * @param {Duplex} socket The network socket between the server and client
       * @param {Buffer} head The first packet of the upgraded stream
       * @param {Function} cb Callback
       * @throws {Error} If called more than once with the same socket
       * @private
       */
      completeUpgrade(extensions, key, protocols, req, socket, head, cb) {
        if (!socket.readable || !socket.writable) return socket.destroy();
        if (socket[kWebSocket]) {
          throw new Error(
            "server.handleUpgrade() was called more than once with the same socket, possibly due to a misconfiguration"
          );
        }
        if (this._state > RUNNING) return abortHandshake(socket, 503);
        const digest = createHash("sha1").update(key + GUID).digest("base64");
        const headers = [
          "HTTP/1.1 101 Switching Protocols",
          "Upgrade: websocket",
          "Connection: Upgrade",
          `Sec-WebSocket-Accept: ${digest}`
        ];
        const ws = new this.options.WebSocket(null, void 0, this.options);
        if (protocols.size) {
          const protocol = this.options.handleProtocols ? this.options.handleProtocols(protocols, req) : protocols.values().next().value;
          if (protocol) {
            headers.push(`Sec-WebSocket-Protocol: ${protocol}`);
            ws._protocol = protocol;
          }
        }
        if (extensions[PerMessageDeflate2.extensionName]) {
          const params = extensions[PerMessageDeflate2.extensionName].params;
          const value = extension2.format({
            [PerMessageDeflate2.extensionName]: [params]
          });
          headers.push(`Sec-WebSocket-Extensions: ${value}`);
          ws._extensions = extensions;
        }
        this.emit("headers", headers, req);
        socket.write(headers.concat("\r\n").join("\r\n"));
        socket.removeListener("error", socketOnError);
        ws.setSocket(socket, head, {
          allowSynchronousEvents: this.options.allowSynchronousEvents,
          maxBufferedChunks: this.options.maxBufferedChunks,
          maxFragments: this.options.maxFragments,
          maxPayload: this.options.maxPayload,
          skipUTF8Validation: this.options.skipUTF8Validation
        });
        if (this.clients) {
          this.clients.add(ws);
          ws.on("close", () => {
            this.clients.delete(ws);
            if (this._shouldEmitClose && !this.clients.size) {
              process.nextTick(emitClose, this);
            }
          });
        }
        cb(ws, req);
      }
    };
    module.exports = WebSocketServer2;
    function addListeners(server, map) {
      for (const event of Object.keys(map)) server.on(event, map[event]);
      return function removeListeners() {
        for (const event of Object.keys(map)) {
          server.removeListener(event, map[event]);
        }
      };
    }
    function emitClose(server) {
      server._state = CLOSED;
      server.emit("close");
    }
    function socketOnError() {
      this.destroy();
    }
    function abortHandshake(socket, code, message, headers) {
      message = message || http.STATUS_CODES[code];
      headers = {
        Connection: "close",
        "Content-Type": "text/html",
        "Content-Length": Buffer.byteLength(message),
        ...headers
      };
      socket.once("finish", socket.destroy);
      socket.end(
        `HTTP/1.1 ${code} ${http.STATUS_CODES[code]}\r
` + Object.keys(headers).map((h) => `${h}: ${headers[h]}`).join("\r\n") + "\r\n\r\n" + message
      );
    }
    function abortHandshakeOrEmitwsClientError(server, req, socket, code, message, headers) {
      if (server.listenerCount("wsClientError")) {
        const err = new Error(message);
        Error.captureStackTrace(err, abortHandshakeOrEmitwsClientError);
        server.emit("wsClientError", err, socket, req);
      } else {
        abortHandshake(socket, code, message, headers);
      }
    }
  }
});

// node_modules/promise-limit/index.js
var require_promise_limit = __commonJS({
  "node_modules/promise-limit/index.js"(exports, module) {
    function limiter(count) {
      var outstanding = 0;
      var jobs = [];
      function remove() {
        outstanding--;
        if (outstanding < count) {
          dequeue();
        }
      }
      function dequeue() {
        var job = jobs.shift();
        semaphore.queue = jobs.length;
        if (job) {
          run(job.fn).then(job.resolve).catch(job.reject);
        }
      }
      function queue(fn) {
        return new Promise(function(resolve, reject) {
          jobs.push({ fn, resolve, reject });
          semaphore.queue = jobs.length;
        });
      }
      function run(fn) {
        outstanding++;
        try {
          return Promise.resolve(fn()).then(function(result) {
            remove();
            return result;
          }, function(error) {
            remove();
            throw error;
          });
        } catch (err) {
          remove();
          return Promise.reject(err);
        }
      }
      var semaphore = function(fn) {
        if (outstanding >= count) {
          return queue(fn);
        } else {
          return run(fn);
        }
      };
      return semaphore;
    }
    function map(items, mapper) {
      var failed = false;
      var limit = this;
      return Promise.all(items.map(function() {
        var args = arguments;
        return limit(function() {
          if (!failed) {
            return mapper.apply(void 0, args).catch(function(e) {
              failed = true;
              throw e;
            });
          }
        });
      }));
    }
    function addExtras(fn) {
      fn.queue = 0;
      fn.map = map;
      return fn;
    }
    module.exports = function(count) {
      if (count) {
        return addExtras(limiter(count));
      } else {
        return addExtras(function(fn) {
          return fn();
        });
      }
    };
  }
});

// node_modules/hono/dist/request/constants.js
var GET_MATCH_RESULT = /* @__PURE__ */ Symbol();

// node_modules/hono/dist/utils/buffer.js
var bufferToFormData = (arrayBuffer, contentType) => {
  return new Response(arrayBuffer, { headers: { "Content-Type": contentType.replace(/^[^;]+/, (mediaType) => mediaType.toLowerCase()) } }).formData();
};

// node_modules/hono/dist/utils/body.js
var MAX_NESTED_OBJECTS = 1e4;
var isRawRequest = (request) => "headers" in request;
var parseBody = async (request, options = /* @__PURE__ */ Object.create(null)) => {
  const { all = false, dot = false } = options;
  const mediaType = (isRawRequest(request) ? request.headers : request.raw.headers).get("Content-Type")?.split(";")[0].trim().toLowerCase();
  if (mediaType === "multipart/form-data" || mediaType === "application/x-www-form-urlencoded") return parseFormData(request, {
    all,
    dot
  });
  return {};
};
async function parseFormData(request, options) {
  if (!isRawRequest(request) && request.bodyCache.formData) return convertFormDataToBodyData(await request.bodyCache.formData, options);
  const headers = isRawRequest(request) ? request.headers : request.raw.headers;
  const arrayBuffer = await request.arrayBuffer();
  const formDataPromise = bufferToFormData(arrayBuffer, headers.get("Content-Type") || "");
  if (!isRawRequest(request)) request.bodyCache.formData = formDataPromise;
  const formData = await formDataPromise;
  if (formData) return convertFormDataToBodyData(formData, options);
  return {};
}
function convertFormDataToBodyData(formData, options) {
  const form = /* @__PURE__ */ Object.create(null);
  const nestingState = { count: 0 };
  formData.forEach((value, key) => {
    if (!(options.all || key.endsWith("[]"))) form[key] = value;
    else handleParsingAllValues(form, key, value);
  });
  if (options.dot) Object.entries(form).forEach(([key, value]) => {
    if (key.includes(".")) {
      handleParsingNestedValues(form, key, value, nestingState);
      delete form[key];
    }
  });
  return form;
}
var handleParsingAllValues = (form, key, value) => {
  if (form[key] !== void 0) {
    if (Array.isArray(form[key])) form[key].push(value);
    else form[key] = [form[key], value];
  } else if (!key.endsWith("[]")) form[key] = value;
  else form[key] = [value];
};
var handleParsingNestedValues = (form, key, value, state) => {
  if (/(?:^|\.)__proto__\./.test(key)) return;
  let nestedForm = form;
  const keys = key.split(".", 34);
  if (keys.length > 33) throwNestingLimitExceeded();
  keys.forEach((key2, index) => {
    if (index === keys.length - 1) nestedForm[key2] = value;
    else {
      if (!nestedForm[key2] || typeof nestedForm[key2] !== "object" || Array.isArray(nestedForm[key2]) || nestedForm[key2] instanceof File) {
        if (state.count++ >= MAX_NESTED_OBJECTS) throwNestingLimitExceeded();
        nestedForm[key2] = /* @__PURE__ */ Object.create(null);
      }
      nestedForm = nestedForm[key2];
    }
  });
};
var throwNestingLimitExceeded = () => {
  throw new Error("Nesting limit exceeded");
};

// node_modules/hono/dist/utils/url.js
var splitPath = (path) => {
  const paths = path.split("/");
  if (paths[0] === "") paths.shift();
  return paths;
};
var splitRoutingPath = (routePath) => {
  const { groups, path } = extractGroupsFromPath(routePath);
  const paths = splitPath(path);
  return replaceGroupMarks(paths, groups);
};
var extractGroupsFromPath = (path) => {
  const groups = [];
  path = path.replace(/\{[^}]+\}/g, (match2, index) => {
    const mark = `@${index}`;
    groups.push([mark, match2]);
    return mark;
  });
  return {
    groups,
    path
  };
};
var replaceGroupMarks = (paths, groups) => {
  for (let i = groups.length - 1; i >= 0; i--) {
    const [mark] = groups[i];
    for (let j = paths.length - 1; j >= 0; j--) if (paths[j].includes(mark)) {
      paths[j] = paths[j].replace(mark, groups[i][1]);
      break;
    }
  }
  return paths;
};
var patternCache = {};
var getPattern = (label, next) => {
  if (label === "*") return "*";
  const match2 = label.match(/^\:([^\{\}]+)(?:\{(.+)\})?$/);
  if (match2) {
    const cacheKey = `${label}#${next}`;
    if (!patternCache[cacheKey]) {
      if (match2[2]) patternCache[cacheKey] = next && next[0] !== ":" && next[0] !== "*" ? [
        cacheKey,
        match2[1],
        new RegExp(`^${match2[2]}(?=/${next})`)
      ] : [
        label,
        match2[1],
        new RegExp(`^${match2[2]}$`)
      ];
      else patternCache[cacheKey] = [
        label,
        match2[1],
        true
      ];
    }
    return patternCache[cacheKey];
  }
  return null;
};
var tryDecode = (str, decoder) => {
  try {
    return decoder(str);
  } catch {
    return str.replace(/(?:%[0-9A-Fa-f]{2})+/g, (match2) => {
      try {
        return decoder(match2);
      } catch {
        return match2;
      }
    });
  }
};
var tryDecodeURI = (str) => tryDecode(str, decodeURI);
var getPath = (request) => {
  const url = request.url;
  const start = url.indexOf("/", url.indexOf(":") + 4);
  let i = start;
  for (; i < url.length; i++) {
    const charCode = url.charCodeAt(i);
    if (charCode === 37) {
      const queryIndex = url.indexOf("?", i);
      const hashIndex = url.indexOf("#", i);
      const end = queryIndex === -1 ? hashIndex === -1 ? void 0 : hashIndex : hashIndex === -1 ? queryIndex : Math.min(queryIndex, hashIndex);
      const path = url.slice(start, end);
      return tryDecodeURI(path.includes("%25") ? path.replace(/%25/g, "%2525") : path);
    } else if (charCode === 63 || charCode === 35) break;
  }
  return url.slice(start, i);
};
var getPathNoStrict = (request) => {
  const result = getPath(request);
  return result.length > 1 && result.at(-1) === "/" ? result.slice(0, -1) : result;
};
var mergePath = (base, sub, ...rest) => {
  if (rest.length) sub = mergePath(sub, ...rest);
  return `${base?.[0] === "/" ? "" : "/"}${base}${sub === "/" ? "" : `${base?.at(-1) === "/" ? "" : "/"}${sub?.[0] === "/" ? sub.slice(1) : sub}`}`;
};
var checkOptionalParameter = (path) => {
  if (path.charCodeAt(path.length - 1) !== 63 || !path.includes(":")) return null;
  const segments = path.split("/");
  const results = [];
  let basePath = "";
  segments.forEach((segment) => {
    if (segment !== "" && !/\:/.test(segment)) basePath += "/" + segment;
    else if (/\:/.test(segment)) {
      if (segment.charCodeAt(segment.length - 1) === 63) {
        if (results.length === 0 && basePath === "") results.push("/");
        else results.push(basePath);
        const optionalSegment = segment.slice(0, -1);
        basePath += "/" + optionalSegment;
        results.push(basePath);
      } else basePath += "/" + segment;
    }
  });
  return results.filter((v, i, a) => a.indexOf(v) === i);
};
var tryDecodeURIComponent = (str) => str.indexOf("%") !== -1 ? tryDecode(str, decodeURIComponent_) : str;
var _decodeURI = (value) => {
  if (value.indexOf("+") !== -1) value = value.replace(/\+/g, " ");
  return tryDecodeURIComponent(value);
};
var _getQueryParam = (url, key, multiple) => {
  const hashIndex = url.indexOf("#", 8);
  if (hashIndex !== -1) url = url.slice(0, hashIndex);
  let encoded;
  if (!multiple && key && key.indexOf("%") === -1 && key.indexOf("+") === -1) {
    let keyIndex2 = url.indexOf("?", 8);
    if (keyIndex2 === -1) return;
    if (!url.startsWith(key, keyIndex2 + 1)) keyIndex2 = url.indexOf(`&${key}`, keyIndex2 + 1);
    while (keyIndex2 !== -1) {
      const trailingKeyCode = url.charCodeAt(keyIndex2 + key.length + 1);
      if (trailingKeyCode === 61) {
        const valueIndex = keyIndex2 + key.length + 2;
        const endIndex = url.indexOf("&", valueIndex);
        return _decodeURI(url.slice(valueIndex, endIndex === -1 ? void 0 : endIndex));
      } else if (trailingKeyCode == 38 || isNaN(trailingKeyCode)) return "";
      keyIndex2 = url.indexOf(`&${key}`, keyIndex2 + 1);
    }
    encoded = /[%+]/.test(url);
    if (!encoded) return;
  }
  const results = /* @__PURE__ */ Object.create(null);
  encoded ??= /[%+]/.test(url);
  let keyIndex = url.indexOf("?", 8);
  while (keyIndex !== -1) {
    const nextKeyIndex = url.indexOf("&", keyIndex + 1);
    let valueIndex = url.indexOf("=", keyIndex);
    if (valueIndex > nextKeyIndex && nextKeyIndex !== -1) valueIndex = -1;
    let name = url.slice(keyIndex + 1, valueIndex === -1 ? nextKeyIndex === -1 ? void 0 : nextKeyIndex : valueIndex);
    if (encoded) name = _decodeURI(name);
    keyIndex = nextKeyIndex;
    if (name === "") continue;
    let value;
    if (valueIndex === -1) value = "";
    else {
      value = url.slice(valueIndex + 1, nextKeyIndex === -1 ? void 0 : nextKeyIndex);
      if (encoded) value = _decodeURI(value);
    }
    if (multiple) {
      if (!(results[name] && Array.isArray(results[name]))) results[name] = [];
      results[name].push(value);
    } else results[name] ??= value;
  }
  return key ? results[key] : results;
};
var getQueryParam = _getQueryParam;
var getQueryParams = (url, key) => {
  return _getQueryParam(url, key, true);
};
var decodeURIComponent_ = decodeURIComponent;

// node_modules/hono/dist/request.js
var HonoRequest = class {
  /**
  * `.raw` can get the raw Request object.
  *
  * @see {@link https://hono.dev/docs/api/request#raw}
  *
  * @example
  * ```ts
  * // For Cloudflare Workers
  * app.post('/', async (c) => {
  *   const metadata = c.req.raw.cf?.hostMetadata?
  *   ...
  * })
  * ```
  */
  raw;
  #validatedData;
  #matchResult;
  routeIndex = 0;
  /**
  * `.path` can get the pathname of the request.
  *
  * @see {@link https://hono.dev/docs/api/request#path}
  *
  * @example
  * ```ts
  * app.get('/about/me', (c) => {
  *   const pathname = c.req.path // `/about/me`
  * })
  * ```
  */
  path;
  bodyCache = {};
  constructor(request, path = "/", matchResult = [[]]) {
    this.raw = request;
    this.path = path;
    this.#matchResult = matchResult;
  }
  param(key) {
    return key ? this.#getDecodedParam(key) : this.#getAllDecodedParams();
  }
  #getDecodedParam(key) {
    const paramKey = this.#matchResult[0][this.routeIndex]?.[1][key];
    const param = this.#getParamValue(paramKey);
    return param && tryDecodeURIComponent(param);
  }
  #getAllDecodedParams() {
    const decoded = {};
    const keys = Object.keys(this.#matchResult[0][this.routeIndex]?.[1] ?? {});
    for (const key of keys) {
      const value = this.#getParamValue(this.#matchResult[0][this.routeIndex][1][key]);
      if (value !== void 0) decoded[key] = tryDecodeURIComponent(value);
    }
    return decoded;
  }
  #getParamValue(paramKey) {
    return this.#matchResult[1] ? this.#matchResult[1][paramKey] : paramKey;
  }
  query(key) {
    return getQueryParam(this.url, key);
  }
  queries(key) {
    return getQueryParams(this.url, key);
  }
  header(name) {
    if (name) return this.raw.headers.get(name) ?? void 0;
    const headerData = /* @__PURE__ */ Object.create(null);
    this.raw.headers.forEach((value, key) => {
      headerData[key] = value;
    });
    return headerData;
  }
  async parseBody(options) {
    return parseBody(this, options);
  }
  #cachedBody = (key) => {
    const { bodyCache, raw: raw2 } = this;
    const cachedBody = bodyCache[key];
    if (cachedBody) return cachedBody;
    for (const anyCachedKey in bodyCache) return bodyCache[anyCachedKey].then((body) => {
      if (anyCachedKey === "json") body = JSON.stringify(body);
      const contentType = anyCachedKey === "formData" ? void 0 : raw2.headers.get("content-type");
      return new Response(body, { headers: contentType ? { "Content-Type": contentType } : void 0 })[key]();
    });
    return bodyCache[key] = raw2[key]();
  };
  /**
  * `.json()` can parse Request body of type `application/json`
  *
  * @see {@link https://hono.dev/docs/api/request#json}
  *
  * @example
  * ```ts
  * app.post('/entry', async (c) => {
  *   const body = await c.req.json()
  * })
  * ```
  */
  json() {
    return this.#cachedBody("text").then((text) => JSON.parse(text));
  }
  /**
  * `.text()` can parse Request body of type `text/plain`
  *
  * @see {@link https://hono.dev/docs/api/request#text}
  *
  * @example
  * ```ts
  * app.post('/entry', async (c) => {
  *   const body = await c.req.text()
  * })
  * ```
  */
  text() {
    return this.#cachedBody("text");
  }
  /**
  * `.arrayBuffer()` parse Request body as an `ArrayBuffer`
  *
  * @see {@link https://hono.dev/docs/api/request#arraybuffer}
  *
  * @example
  * ```ts
  * app.post('/entry', async (c) => {
  *   const body = await c.req.arrayBuffer()
  * })
  * ```
  */
  arrayBuffer() {
    return this.#cachedBody("arrayBuffer");
  }
  /**
  * `.bytes()` parses the request body as a `Uint8Array`.
  *
  * @see {@link https://hono.dev/docs/api/request#bytes}
  *
  * @example
  * ```ts
  * app.post('/entry', async (c) => {
  *   const body = await c.req.bytes()
  * })
  * ```
  */
  bytes() {
    return this.#cachedBody("arrayBuffer").then((buffer) => new Uint8Array(buffer));
  }
  /**
  * Parses the request body as a `Blob`.
  * @example
  * ```ts
  * app.post('/entry', async (c) => {
  *   const body = await c.req.blob();
  * });
  * ```
  * @see https://hono.dev/docs/api/request#blob
  */
  blob() {
    return this.#cachedBody("blob");
  }
  /**
  * Parses the request body as `FormData`.
  * @example
  * ```ts
  * app.post('/entry', async (c) => {
  *   const body = await c.req.formData();
  * });
  * ```
  * @see https://hono.dev/docs/api/request#formdata
  */
  formData() {
    return this.#cachedBody("formData");
  }
  /**
  * Adds validated data to the request.
  *
  * @param target - The target of the validation.
  * @param data - The validated data to add.
  */
  addValidatedData(target, data) {
    (this.#validatedData ??= {})[target] = data;
  }
  valid(target) {
    return this.#validatedData?.[target];
  }
  /**
  * `.url` can get the request url strings.
  *
  * @see {@link https://hono.dev/docs/api/request#url}
  *
  * @example
  * ```ts
  * app.get('/about/me', (c) => {
  *   const url = c.req.url // `http://localhost:8787/about/me`
  *   ...
  * })
  * ```
  */
  get url() {
    return this.raw.url;
  }
  /**
  * `.method` can get the method name of the request.
  *
  * @see {@link https://hono.dev/docs/api/request#method}
  *
  * @example
  * ```ts
  * app.get('/about/me', (c) => {
  *   const method = c.req.method // `GET`
  * })
  * ```
  */
  get method() {
    return this.raw.method;
  }
  get [GET_MATCH_RESULT]() {
    return this.#matchResult;
  }
  /**
  * `.matchedRoutes` can return a matched route in the handler
  *
  * @deprecated
  *
  * Use matchedRoutes helper defined in "hono/route" instead.
  *
  * @see {@link https://hono.dev/docs/api/request#matchedroutes}
  *
  * @example
  * ```ts
  * app.use('*', async function logger(c, next) {
  *   await next()
  *   c.req.matchedRoutes.forEach(({ handler, method, path }, i) => {
  *     const name = handler.name || (handler.length < 2 ? '[handler]' : '[middleware]')
  *     console.log(
  *       method,
  *       ' ',
  *       path,
  *       ' '.repeat(Math.max(10 - path.length, 0)),
  *       name,
  *       i === c.req.routeIndex ? '<- respond from here' : ''
  *     )
  *   })
  * })
  * ```
  */
  get matchedRoutes() {
    return this.#matchResult[0].map(([[, route]]) => route);
  }
  /**
  * `.routePath` can retrieve the path registered within the handler
  *
  * @deprecated
  *
  * Use routePath helper defined in "hono/route" instead.
  *
  * @see {@link https://hono.dev/docs/api/request#routepath}
  *
  * @example
  * ```ts
  * app.get('/posts/:id', (c) => {
  *   return c.json({ path: c.req.routePath })
  * })
  * ```
  */
  get routePath() {
    return this.#matchResult[0].map(([[, route]]) => route)[this.routeIndex].path;
  }
};

// node_modules/hono/dist/utils/html.js
var HtmlEscapedCallbackPhase = {
  Stringify: 1,
  BeforeStream: 2,
  Stream: 3
};
var raw = (value, callbacks) => {
  const escapedString = new String(value);
  escapedString.isEscaped = true;
  escapedString.callbacks = callbacks;
  return escapedString;
};
var resolveCallback = async (str, phase, preserveCallbacks, context, buffer) => {
  if (typeof str === "object" && !(str instanceof String)) {
    if (!(str instanceof Promise)) str = str.toString();
    if (str instanceof Promise) str = await str;
  }
  const callbacks = str.callbacks;
  if (!callbacks?.length) return Promise.resolve(str);
  if (buffer) buffer[0] += str;
  else buffer = [str];
  const resStr = Promise.all(callbacks.map((c) => c({
    phase,
    buffer,
    context
  }))).then((res) => Promise.all(res.filter(Boolean).map((str2) => resolveCallback(str2, phase, false, context, buffer))).then(() => buffer[0]));
  if (preserveCallbacks) return raw(await resStr, callbacks);
  else return resStr;
};

// node_modules/hono/dist/context.js
var TEXT_PLAIN = "text/plain; charset=UTF-8";
var setDefaultContentType = (contentType, headers) => {
  return {
    "Content-Type": contentType,
    ...headers
  };
};
var createResponseInstance = (body, init) => new Response(body, init);
var Context = class {
  #rawRequest;
  #req;
  /**
  * `.env` can get bindings (environment variables, secrets, KV namespaces, D1 database, R2 bucket etc.) in Cloudflare Workers.
  *
  * @see {@link https://hono.dev/docs/api/context#env}
  *
  * @example
  * ```ts
  * // Environment object for Cloudflare Workers
  * app.get('*', async c => {
  *   const counter = c.env.COUNTER
  * })
  * ```
  */
  env = {};
  #var;
  finalized = false;
  /**
  * `.error` can get the error object from the middleware if the Handler throws an error.
  *
  * @see {@link https://hono.dev/docs/api/context#error}
  *
  * @example
  * ```ts
  * app.use('*', async (c, next) => {
  *   await next()
  *   if (c.error) {
  *     // do something...
  *   }
  * })
  * ```
  */
  error;
  #status;
  #executionCtx;
  #res;
  #layout;
  #renderer;
  #notFoundHandler;
  #preparedHeaders;
  #matchResult;
  #path;
  /**
  * Creates an instance of the Context class.
  *
  * @param req - The Request object.
  * @param options - Optional configuration options for the context.
  */
  constructor(req, options) {
    this.#rawRequest = req;
    if (options) {
      this.#executionCtx = options.executionCtx;
      this.env = options.env;
      this.#notFoundHandler = options.notFoundHandler;
      this.#path = options.path;
      this.#matchResult = options.matchResult;
    }
  }
  /**
  * `.req` is the instance of {@link HonoRequest}.
  */
  get req() {
    this.#req ??= new HonoRequest(this.#rawRequest, this.#path, this.#matchResult);
    return this.#req;
  }
  /**
  * @see {@link https://hono.dev/docs/api/context#event}
  * The FetchEvent associated with the current request.
  *
  * @throws Will throw an error if the context does not have a FetchEvent.
  */
  get event() {
    if (this.#executionCtx && "respondWith" in this.#executionCtx) return this.#executionCtx;
    else throw Error("This context has no FetchEvent");
  }
  /**
  * @see {@link https://hono.dev/docs/api/context#executionctx}
  * The ExecutionContext associated with the current request.
  *
  * @throws Will throw an error if the context does not have an ExecutionContext.
  */
  get executionCtx() {
    if (this.#executionCtx) return this.#executionCtx;
    else throw Error("This context has no ExecutionContext");
  }
  /**
  * @see {@link https://hono.dev/docs/api/context#res}
  * The Response object for the current request.
  */
  get res() {
    return this.#res ||= createResponseInstance(null, { headers: this.#preparedHeaders ??= new Headers() });
  }
  /**
  * Sets the Response object for the current request.
  *
  * @param _res - The Response object to set.
  */
  set res(_res) {
    if (this.#res && _res) {
      _res = createResponseInstance(_res.body, _res);
      for (const [k, v] of this.#res.headers.entries()) {
        if (k === "content-type") continue;
        if (k === "set-cookie") {
          const cookies = this.#res.headers.getSetCookie();
          _res.headers.delete("set-cookie");
          for (const cookie of cookies) _res.headers.append("set-cookie", cookie);
        } else _res.headers.set(k, v);
      }
    }
    this.#res = _res;
    this.finalized = true;
  }
  /**
  * `.render()` can create a response within a layout.
  *
  * @see {@link https://hono.dev/docs/api/context#render-setrenderer}
  *
  * @example
  * ```ts
  * app.get('/', (c) => {
  *   return c.render('Hello!')
  * })
  * ```
  */
  render = (...args) => {
    this.#renderer ??= (content) => this.html(content);
    return this.#renderer(...args);
  };
  /**
  * Sets the layout for the response.
  *
  * @param layout - The layout to set.
  * @returns The layout function.
  */
  setLayout = (layout) => this.#layout = layout;
  /**
  * Gets the current layout for the response.
  *
  * @returns The current layout function.
  */
  getLayout = () => this.#layout;
  /**
  * `.setRenderer()` can set the layout in the custom middleware.
  *
  * @see {@link https://hono.dev/docs/api/context#render-setrenderer}
  *
  * @example
  * ```tsx
  * app.use('*', async (c, next) => {
  *   c.setRenderer((content) => {
  *     return c.html(
  *       <html>
  *         <body>
  *           <p>{content}</p>
  *         </body>
  *       </html>
  *     )
  *   })
  *   await next()
  * })
  * ```
  */
  setRenderer = (renderer) => {
    this.#renderer = renderer;
  };
  /**
  * `.header()` can set headers.
  *
  * @see {@link https://hono.dev/docs/api/context#header}
  *
  * @example
  * ```ts
  * app.get('/welcome', (c) => {
  *   // Set headers
  *   c.header('X-Message', 'Hello!')
  *   c.header('Content-Type', 'text/plain')
  *
  *   // Append multiple headers using the append option (e.g. Vary)
  *   c.header('Vary', 'Accept-Encoding', { append: true })
  *   c.header('Vary', 'User-Agent', { append: true })
  *
  *   return c.body('Thank you for coming')
  * })
  * ```
  */
  header = (name, value, options) => {
    if (this.finalized) this.#res = createResponseInstance(this.#res.body, this.#res);
    const headers = this.#res ? this.#res.headers : this.#preparedHeaders ??= new Headers();
    if (value === void 0) headers.delete(name);
    else if (options?.append) headers.append(name, value);
    else headers.set(name, value);
  };
  status = (status) => {
    this.#status = status;
  };
  /**
  * `.set()` can set the value specified by the key.
  *
  * @see {@link https://hono.dev/docs/api/context#set-get}
  *
  * @example
  * ```ts
  * app.use('*', async (c, next) => {
  *   c.set('message', 'Hono is hot!!')
  *   await next()
  * })
  * ```
  */
  set = (key, value) => {
    this.#var ??= /* @__PURE__ */ new Map();
    this.#var.set(key, value);
  };
  /**
  * `.get()` can use the value specified by the key.
  *
  * @see {@link https://hono.dev/docs/api/context#set-get}
  *
  * @example
  * ```ts
  * app.get('/', (c) => {
  *   const message = c.get('message')
  *   return c.text(`The message is "${message}"`)
  * })
  * ```
  */
  get = (key) => {
    return this.#var ? this.#var.get(key) : void 0;
  };
  /**
  * `.var` can access the value of a variable.
  *
  * @see {@link https://hono.dev/docs/api/context#var}
  *
  * @example
  * ```ts
  * const result = c.var.client.oneMethod()
  * ```
  */
  get var() {
    if (!this.#var) return {};
    return Object.fromEntries(this.#var);
  }
  #newResponse(data, arg, headers) {
    let responseHeaders = this.#res ? new Headers(this.#res.headers) : this.#preparedHeaders;
    if (typeof arg === "object" && arg.headers) {
      responseHeaders ??= new Headers();
      for (const [key, value] of new Headers(arg.headers)) if (key === "set-cookie") responseHeaders.append(key, value);
      else responseHeaders.set(key, value);
    }
    if (headers) {
      if (!responseHeaders) {
        let count = 0;
        for (const k in headers) if (++count > 1 || typeof headers[k] !== "string") {
          responseHeaders = new Headers();
          break;
        }
      }
      if (responseHeaders) for (const k in headers) {
        const v = headers[k];
        if (typeof v === "string") responseHeaders.set(k, v);
        else {
          responseHeaders.delete(k);
          for (const v2 of v) responseHeaders.append(k, v2);
        }
      }
    }
    const status = typeof arg === "number" ? arg : arg?.status ?? this.#status;
    return createResponseInstance(data, {
      status,
      headers: responseHeaders ?? headers
    });
  }
  newResponse = (...args) => this.#newResponse(...args);
  /**
  * `.body()` can return the HTTP response.
  * You can set headers with `.header()` and set HTTP status code with `.status`.
  * This can also be set in `.text()`, `.json()` and so on.
  *
  * @see {@link https://hono.dev/docs/api/context#body}
  *
  * @example
  * ```ts
  * app.get('/welcome', (c) => {
  *   // Set headers
  *   c.header('X-Message', 'Hello!')
  *   c.header('Content-Type', 'text/plain')
  *   // Set HTTP status code
  *   c.status(201)
  *
  *   // Return the response body
  *   return c.body('Thank you for coming')
  * })
  * ```
  */
  body = (data, arg, headers) => this.#newResponse(data, arg, headers);
  /**
  * `.text()` can render text as `Content-Type:text/plain`.
  *
  * @see {@link https://hono.dev/docs/api/context#text}
  *
  * @example
  * ```ts
  * app.get('/say', (c) => {
  *   return c.text('Hello!')
  * })
  * ```
  */
  text = (text, arg, headers) => {
    return !this.#preparedHeaders && !this.#status && !arg && !headers && !this.finalized ? new Response(text) : this.#newResponse(text, arg, setDefaultContentType(TEXT_PLAIN, headers));
  };
  /**
  * `.json()` can render JSON as `Content-Type:application/json`.
  *
  * @see {@link https://hono.dev/docs/api/context#json}
  *
  * @example
  * ```ts
  * app.get('/api', (c) => {
  *   return c.json({ message: 'Hello!' })
  * })
  * ```
  */
  json = (object2, arg, headers) => {
    return this.#newResponse(JSON.stringify(object2), arg, setDefaultContentType("application/json", headers));
  };
  html = (html, arg, headers) => {
    const res = (html2) => this.#newResponse(html2, arg, setDefaultContentType("text/html; charset=UTF-8", headers));
    return typeof html === "object" ? resolveCallback(html, HtmlEscapedCallbackPhase.Stringify, false, {}).then(res) : res(html);
  };
  /**
  * `.redirect()` can Redirect, default status code is 302.
  *
  * @see {@link https://hono.dev/docs/api/context#redirect}
  *
  * @example
  * ```ts
  * app.get('/redirect', (c) => {
  *   return c.redirect('/')
  * })
  * app.get('/redirect-permanently', (c) => {
  *   return c.redirect('/', 301)
  * })
  * ```
  */
  redirect = (location, status) => {
    const locationString = String(location);
    this.header("Location", !/[^\x00-\xFF]/.test(locationString) ? locationString : encodeURI(locationString));
    return this.newResponse(null, status ?? 302);
  };
  /**
  * `.notFound()` can return the Not Found Response.
  *
  * @see {@link https://hono.dev/docs/api/context#notfound}
  *
  * @example
  * ```ts
  * app.get('/notfound', (c) => {
  *   return c.notFound()
  * })
  * ```
  */
  notFound = () => {
    this.#notFoundHandler ??= () => createResponseInstance();
    return this.#notFoundHandler(this);
  };
};

// node_modules/hono/dist/compose.js
var compose = (middleware, onError, onNotFound) => {
  return (context, next) => {
    let index = -1;
    return dispatch(0);
    async function dispatch(i) {
      if (i <= index) throw new Error("next() called multiple times");
      index = i;
      let res;
      let isError = false;
      let handler;
      if (middleware[i]) {
        handler = middleware[i][0][0];
        context.req.routeIndex = i;
      } else handler = i === middleware.length && next || void 0;
      if (handler) try {
        res = await handler(context, () => dispatch(i + 1));
      } catch (err) {
        if (err instanceof Error && onError) {
          context.error = err;
          res = await onError(err, context);
          isError = true;
        } else throw err;
      }
      else if (context.finalized === false && onNotFound) res = await onNotFound(context);
      if (res && (context.finalized === false || isError)) context.res = res;
      return context;
    }
  };
};

// node_modules/hono/dist/router.js
var METHODS = [
  "get",
  "post",
  "put",
  "delete",
  "options",
  "patch",
  "query"
];
var MESSAGE_MATCHER_IS_ALREADY_BUILT = "Can not add a route since the matcher is already built.";
var UnsupportedPathError = class extends Error {
};

// node_modules/hono/dist/utils/constants.js
var COMPOSED_HANDLER = "__COMPOSED_HANDLER";

// node_modules/hono/dist/hono-base.js
var notFoundHandler = (c) => {
  return c.text("404 Not Found", 404);
};
var errorHandler = (err, c) => {
  if ("getResponse" in err) {
    const res = err.getResponse();
    return c.newResponse(res.body, res);
  }
  console.error(err);
  return c.text("Internal Server Error", 500);
};
var Hono = class Hono2 {
  get;
  post;
  put;
  delete;
  options;
  patch;
  query;
  all;
  on;
  use;
  router;
  getPath;
  _basePath = "/";
  #path = "/";
  routes = [];
  constructor(options = {}) {
    [...METHODS, "all"].forEach((method) => {
      this[method] = (args1, ...args) => {
        const methodName = method.toUpperCase();
        if (typeof args1 === "string") this.#path = args1;
        else this.#addRoute(methodName, this.#path, args1);
        args.forEach((handler) => {
          this.#addRoute(methodName, this.#path, handler);
        });
        return this;
      };
    });
    this.on = (method, path, ...handlers) => {
      for (const p of [path].flat()) {
        this.#path = p;
        for (const m of [method].flat()) {
          const methodName = m.toUpperCase();
          for (const handler of handlers) this.#addRoute(methodName, this.#path, handler);
        }
      }
      return this;
    };
    this.use = (arg1, ...handlers) => {
      if (typeof arg1 === "string") this.#path = arg1;
      else {
        this.#path = "*";
        handlers.unshift(arg1);
      }
      handlers.forEach((handler) => {
        this.#addRoute("ALL", this.#path, handler);
      });
      return this;
    };
    const { strict, ...optionsWithoutStrict } = options;
    Object.assign(this, optionsWithoutStrict);
    this.getPath = strict ?? true ? options.getPath ?? getPath : getPathNoStrict;
  }
  #clone() {
    const clone = new Hono2({
      router: this.router,
      getPath: this.getPath
    });
    clone.errorHandler = this.errorHandler;
    clone.#notFoundHandler = this.#notFoundHandler;
    clone.routes = this.routes;
    return clone;
  }
  #notFoundHandler = notFoundHandler;
  errorHandler = errorHandler;
  /**
  * `.route()` allows grouping other Hono instance in routes.
  *
  * @see {@link https://hono.dev/docs/api/routing#grouping}
  *
  * @param {string} path - base Path
  * @param {Hono} app - other Hono instance
  * @returns {Hono} routed Hono instance
  *
  * @example
  * ```ts
  * const app = new Hono()
  * const app2 = new Hono()
  *
  * app2.get("/user", (c) => c.text("user"))
  * app.route("/api", app2) // GET /api/user
  * ```
  */
  route(path, app2) {
    const subApp = this.basePath(path);
    app2.routes.map((r) => {
      let handler;
      if (app2.errorHandler === errorHandler) handler = r.handler;
      else {
        handler = async (c, next) => (await compose([], app2.errorHandler)(c, () => r.handler(c, next))).res;
        handler[COMPOSED_HANDLER] = r.handler;
      }
      subApp.#addRoute(r.method, r.path, handler, r.basePath);
    });
    return this;
  }
  /**
  * `.basePath()` allows base paths to be specified.
  *
  * @see {@link https://hono.dev/docs/api/routing#base-path}
  *
  * @param {string} path - base Path
  * @returns {Hono} changed Hono instance
  *
  * @example
  * ```ts
  * const api = new Hono().basePath('/api')
  * ```
  */
  basePath(path) {
    const subApp = this.#clone();
    subApp._basePath = mergePath(this._basePath, path);
    return subApp;
  }
  /**
  * `.onError()` handles an error and returns a customized Response.
  *
  * @see {@link https://hono.dev/docs/api/hono#error-handling}
  *
  * @param {ErrorHandler} handler - request Handler for error
  * @returns {Hono} changed Hono instance
  *
  * @example
  * ```ts
  * app.onError((err, c) => {
  *   console.error(`${err}`)
  *   return c.text('Custom Error Message', 500)
  * })
  * ```
  */
  onError = (handler) => {
    this.errorHandler = handler;
    return this;
  };
  /**
  * `.notFound()` allows you to customize a Not Found Response.
  *
  * @see {@link https://hono.dev/docs/api/hono#not-found}
  *
  * @param {NotFoundHandler} handler - request handler for not-found
  * @returns {Hono} changed Hono instance
  *
  * @example
  * ```ts
  * app.notFound((c) => {
  *   return c.text('Custom 404 Message', 404)
  * })
  * ```
  */
  notFound = (handler) => {
    this.#notFoundHandler = handler;
    return this;
  };
  /**
  * `.mount()` allows you to mount applications built with other frameworks into your Hono application.
  *
  * @deprecated Use `mount()` from `hono/mount` instead. `.mount()` will be removed in v5.
  *
  * @see {@link https://hono.dev/docs/api/hono#mount}
  *
  * @param {string} path - base Path
  * @param {Function} applicationHandler - other Request Handler
  * @param {MountOptions} [options] - options of `.mount()`
  * @returns {Hono} mounted Hono instance
  *
  * @example
  * ```ts
  * import { Router as IttyRouter } from 'itty-router'
  * import { Hono } from 'hono'
  * // Create itty-router application
  * const ittyRouter = IttyRouter()
  * // GET /itty-router/hello
  * ittyRouter.get('/hello', () => new Response('Hello from itty-router'))
  *
  * const app = new Hono()
  * app.mount('/itty-router', ittyRouter.handle)
  * ```
  *
  * @example
  * ```ts
  * const app = new Hono()
  * // Send the request to another application without modification.
  * app.mount('/app', anotherApp, {
  *   replaceRequest: (req) => req,
  * })
  * ```
  */
  mount(path, applicationHandler, options) {
    let replaceRequest;
    let optionHandler;
    if (options) {
      if (typeof options === "function") optionHandler = options;
      else {
        optionHandler = options.optionHandler;
        if (options.replaceRequest === false) replaceRequest = (request) => request;
        else replaceRequest = options.replaceRequest;
      }
    }
    const getOptions = optionHandler ? (c) => {
      const options2 = optionHandler(c);
      return Array.isArray(options2) ? options2 : [options2];
    } : (c) => {
      let executionContext = void 0;
      try {
        executionContext = c.executionCtx;
      } catch {
      }
      return [c.env, executionContext];
    };
    replaceRequest ||= (() => {
      const mergedPath = mergePath(this._basePath, path);
      const pathPrefixLength = mergedPath === "/" ? 0 : mergedPath.length;
      return (request) => {
        const url = new URL(request.url);
        url.pathname = this.getPath(request).slice(pathPrefixLength) || "/";
        return new Request(url, request);
      };
    })();
    const handler = async (c, next) => {
      const res = await applicationHandler(replaceRequest(c.req.raw), ...getOptions(c));
      if (res) return res;
      await next();
    };
    this.#addRoute("ALL", mergePath(path, "*"), handler);
    return this;
  }
  #addRoute(method, path, handler, baseRoutePath) {
    path = mergePath(this._basePath, path);
    const r = {
      basePath: baseRoutePath !== void 0 ? mergePath(this._basePath, baseRoutePath) : this._basePath,
      path,
      method,
      handler
    };
    this.router.add(method, path, [handler, r]);
    this.routes.push(r);
  }
  #handleError(err, c) {
    if (err instanceof Error) return this.errorHandler(err, c);
    throw err;
  }
  #dispatch(request, executionCtx, env, method) {
    if (method === "HEAD") return (async () => new Response(null, await this.#dispatch(request, executionCtx, env, "GET")))();
    const path = this.getPath(request, { env });
    const matchResult = this.router.match(method, path);
    const c = new Context(request, {
      path,
      matchResult,
      env,
      executionCtx,
      notFoundHandler: this.#notFoundHandler
    });
    if (matchResult[0].length === 1) {
      let res;
      try {
        res = matchResult[0][0][0][0](c, async () => {
          c.res = await this.#notFoundHandler(c);
        });
      } catch (err) {
        return this.#handleError(err, c);
      }
      return res instanceof Promise ? res.then((resolved) => resolved || (c.finalized ? c.res : this.#notFoundHandler(c))).catch((err) => this.#handleError(err, c)) : res ?? this.#notFoundHandler(c);
    }
    const composed = compose(matchResult[0], this.errorHandler, this.#notFoundHandler);
    return (async () => {
      try {
        const context = await composed(c);
        if (!context.finalized) throw new Error("Context is not finalized. Did you forget to return a Response object or `await next()`?");
        return context.res;
      } catch (err) {
        return this.#handleError(err, c);
      }
    })();
  }
  /**
  * `.fetch()` will be entry point of your app.
  *
  * @see {@link https://hono.dev/docs/api/hono#fetch}
  *
  * @param {Request} request - request Object of request
  * @param {Env} env - env Object
  * @param {ExecutionContext} executionCtx - context of execution
  * @returns {Response | Promise<Response>} response of request
  *
  */
  fetch = (request, ...rest) => {
    return this.#dispatch(request, rest[1], rest[0], request.method);
  };
  /**
  * `.request()` is a useful method for testing.
  * You can pass a URL or pathname to send a GET request.
  * app will return a Response object.
  * ```ts
  * test('GET /hello is ok', async () => {
  *   const res = await app.request('/hello')
  *   expect(res.status).toBe(200)
  * })
  * ```
  * @see https://hono.dev/docs/api/hono#request
  */
  request = (input, requestInit, Env, executionCtx) => {
    if (input instanceof Request) return this.fetch(requestInit ? new Request(input, requestInit) : input, Env, executionCtx);
    input = input.toString();
    return this.fetch(new Request(/^https?:\/\//.test(input) ? input : `http://localhost${mergePath("/", input)}`, requestInit), Env, executionCtx);
  };
  /**
  * `.fire()` automatically adds a global fetch event listener.
  * This can be useful for environments that adhere to the Service Worker API, such as non-ES module Cloudflare Workers.
  * @deprecated
  * Use `fire` from `hono/service-worker` instead.
  * ```ts
  * import { Hono } from 'hono'
  * import { fire } from 'hono/service-worker'
  *
  * const app = new Hono()
  * // ...
  * fire(app)
  * ```
  * @see https://hono.dev/docs/api/hono#fire
  * @see https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API
  * @see https://developers.cloudflare.com/workers/reference/migrate-to-module-workers/
  */
  fire = () => {
    addEventListener("fetch", (event) => {
      event.respondWith(this.#dispatch(event.request, event, void 0, event.request.method));
    });
  };
};

// node_modules/hono/dist/router/utils.js
var createNullObject = () => /* @__PURE__ */ Object.create(null);

// node_modules/hono/dist/router/reg-exp-router/matcher.js
var emptyParam = [];
function match(method, path) {
  const matchers = this.buildAllMatchers();
  const match2 = ((method2, path2) => {
    const matcher = matchers[method2] || matchers["ALL"];
    const staticMatch = matcher[2][path2];
    if (staticMatch) return staticMatch;
    const match3 = path2.match(matcher[0]);
    if (!match3) return [[], emptyParam];
    const index = match3.indexOf("", 1);
    return [matcher[1][index], match3];
  });
  this.match = match2;
  return match2(method, path);
}

// node_modules/hono/dist/router/reg-exp-router/node.js
var LABEL_REG_EXP_STR = "[^/]+";
var TAIL_WILDCARD_REG_EXP_STR = "(?:|/.*)";
var PATH_ERROR = /* @__PURE__ */ Symbol();
var regExpMetaChars = /* @__PURE__ */ new Set(".\\+*[^]$()");
function compareKey(a, b) {
  if (a.length === 1) return b.length === 1 ? a < b ? -1 : 1 : -1;
  if (b.length === 1) return 1;
  if (a === ".*" || a === "(?:|/.*)") return b === "(?:|/.*)" ? -1 : 1;
  else if (b === ".*" || b === "(?:|/.*)") return -1;
  if (a === "[^/]+") return 1;
  else if (b === "[^/]+") return -1;
  return a.length === b.length ? a < b ? -1 : 1 : b.length - a.length;
}
var Node = class Node2 {
  #index;
  #varIndex;
  #children = createNullObject();
  insert(tokens, index, paramMap, context, isStatic) {
    let node = this;
    for (let i = 0, len = tokens.length; i < len; i++) {
      const token = tokens[i];
      const pattern = token.length === 1 ? token === "*" ? i === len - 1 ? [
        "",
        "",
        ".*"
      ] : [
        "",
        "",
        LABEL_REG_EXP_STR
      ] : null : token === "/*" ? [
        "",
        "",
        TAIL_WILDCARD_REG_EXP_STR
      ] : token.match(/^\:([^\{\}]+)(?:\{(.+)\})?$/);
      let nextNode;
      if (pattern) {
        const name = pattern[1];
        let regexpStr = pattern[2] || "[^/]+";
        if (name && pattern[2]) {
          if (regexpStr === ".*") throw PATH_ERROR;
          regexpStr = regexpStr.replace(/^\((?!\?:)(?=[^)]+\)$)/, "(?:");
          if (/\((?!\?:)/.test(regexpStr)) throw PATH_ERROR;
          if (regexpStr.length === 1 && regExpMetaChars.has(regexpStr)) throw PATH_ERROR;
        }
        nextNode = node.#children[regexpStr];
        if (!nextNode) {
          if (regexpStr !== ".*" && regexpStr !== "(?:|/.*)") {
            for (const k in node.#children) if ((regexpStr.length > 1 || k.length > 1) && k !== ".*" && k !== "(?:|/.*)") throw PATH_ERROR;
          }
          nextNode = node.#children[regexpStr] = new Node2();
        }
        if (name !== "") {
          nextNode.#varIndex ??= context.varIndex++;
          paramMap.push([name, nextNode.#varIndex]);
        }
      } else {
        nextNode = node.#children[token];
        if (!nextNode) {
          for (const k in node.#children) if (k.length > 1 && k !== ".*" && k !== "(?:|/.*)") throw PATH_ERROR;
          nextNode = node.#children[token] = new Node2();
        }
      }
      node = nextNode;
    }
    if (node.#index !== void 0) throw PATH_ERROR;
    node.#index = isStatic ? -1 : index;
  }
  buildRegExpStr() {
    const strList = Object.keys(this.#children).sort(compareKey).map((k) => {
      const c = this.#children[k];
      const childStr = c.buildRegExpStr();
      return childStr === "" ? "" : (typeof c.#varIndex === "number" ? `(${k})@${c.#varIndex}` : regExpMetaChars.has(k) ? `\\${k}` : k) + childStr;
    }).filter(Boolean);
    if (typeof this.#index === "number" && this.#index !== -1) strList.unshift(`#${this.#index}`);
    if (strList.length === 0) return "";
    if (strList.length === 1) return strList[0];
    return "(?:" + strList.join("|") + ")";
  }
};

// node_modules/hono/dist/router/reg-exp-router/trie.js
var Trie = class {
  #context = { varIndex: 0 };
  #root = new Node();
  #index = 0;
  paths = createNullObject();
  insert(path, isStatic) {
    if (isStatic) {
      this.#root.insert(path.split(""), 0, [], this.#context, true);
      return;
    }
    const paramAssoc = [];
    const groups = [];
    let markedPath = path;
    for (let i = 0; ; ) {
      let replaced = false;
      markedPath = markedPath.replace(/\{[^}]+\}/g, (m) => {
        const mark = `@\\${i}`;
        groups[i] = [mark, m];
        i++;
        replaced = true;
        return mark;
      });
      if (!replaced) break;
    }
    const tokens = markedPath.match(/(?::[^\/]+)|(?:\/\*$)|./g) || [];
    for (let i = groups.length - 1; i >= 0; i--) {
      const [mark] = groups[i];
      for (let j = tokens.length - 1; j >= 0; j--) if (tokens[j].indexOf(mark) !== -1) {
        tokens[j] = tokens[j].replace(mark, groups[i][1]);
        break;
      }
    }
    this.#root.insert(tokens, this.#index, paramAssoc, this.#context, false);
    this.paths[path] = [this.#index++, paramAssoc];
  }
  buildRegExp() {
    let regexp = this.#root.buildRegExpStr();
    if (regexp === "") return [
      /^$/,
      [],
      []
    ];
    let captureIndex = 0;
    const indexReplacementMap = [];
    const paramReplacementMap = [];
    regexp = regexp.replace(/#(\d+)|@(\d+)|\.\*\$/g, (_, handlerIndex, paramIndex) => {
      if (handlerIndex !== void 0) {
        indexReplacementMap[++captureIndex] = Number(handlerIndex);
        return "$()";
      }
      if (paramIndex !== void 0) {
        paramReplacementMap[Number(paramIndex)] = ++captureIndex;
        return "";
      }
      return "";
    });
    return [
      new RegExp(`^${regexp}`),
      indexReplacementMap,
      paramReplacementMap
    ];
  }
};

// node_modules/hono/dist/router/reg-exp-router/router.js
var wildcardRegExpCache = createNullObject();
function buildWildcardRegExp(path) {
  return wildcardRegExpCache[path] ??= new RegExp(`^${path.replace(/\/:[^/{}]+(?:\{\[\^\/]\+})?(?=[/{]|$)|\/?\*$|([.\\+*[^\]$()?{}|])/g, (match2, metaChar) => metaChar ? `\\${metaChar}` : match2 === "/*" ? TAIL_WILDCARD_REG_EXP_STR : match2 === "*" ? ".*" : `/:${LABEL_REG_EXP_STR}`)}$`);
}
function findMiddleware(middleware, path) {
  for (const k of Object.keys(middleware).sort((a, b) => b.length - a.length)) if (buildWildcardRegExp(k).test(path)) return [...middleware[k]];
}
var RegExpRouter = class {
  name = "RegExpRouter";
  #middleware;
  #routes;
  #tries;
  constructor() {
    this.#middleware = { ["ALL"]: createNullObject() };
    this.#routes = { ["ALL"]: createNullObject() };
    this.#tries = { ["ALL"]: new Trie() };
  }
  #insertPath(method, path) {
    try {
      this.#tries[method].insert(path, !/\*|\/:/.test(path));
    } catch (e) {
      throw e === PATH_ERROR ? new UnsupportedPathError(path) : e;
    }
  }
  add(method, path, handler) {
    const middleware = this.#middleware;
    const routes = this.#routes;
    if (!middleware) throw new Error(MESSAGE_MATCHER_IS_ALREADY_BUILT);
    if (!middleware[method]) {
      this.#tries[method] = new Trie();
      for (const handlerMap of [middleware, routes]) {
        handlerMap[method] = createNullObject();
        for (const p in handlerMap["ALL"]) {
          handlerMap[method][p] = [...handlerMap["ALL"][p]];
          this.#insertPath(method, p);
        }
      }
    }
    if (path === "/*") path = "*";
    const methods = method === "ALL" ? Object.keys(middleware) : [method];
    if (/\*$/.test(path)) {
      const re = buildWildcardRegExp(path);
      for (const m of methods) if (!middleware[m][path]) {
        this.#insertPath(m, path);
        middleware[m][path] = findMiddleware(middleware[m], path) || findMiddleware(middleware["ALL"], path) || [];
      }
      for (const handlerMap of [middleware, routes]) for (const m of methods) for (const p in handlerMap[m]) re.test(p) && handlerMap[m][p].push([handler, path]);
      return;
    }
    const paths = checkOptionalParameter(path) || [path];
    for (const path2 of paths) for (const m of methods) {
      if (!routes[m][path2]) {
        this.#insertPath(m, path2);
        routes[m][path2] = findMiddleware(middleware[m], path2) || findMiddleware(middleware["ALL"], path2) || [];
      }
      routes[m][path2].push([handler, path2]);
    }
  }
  match = match;
  buildAllMatchers() {
    const matchers = createNullObject();
    for (const method of Object.keys(this.#routes)) matchers[method] = this.#buildMatcher(method);
    this.#middleware = this.#routes = this.#tries = void 0;
    wildcardRegExpCache = createNullObject();
    return matchers;
  }
  #buildMatcher(method) {
    const middleware = this.#middleware[method];
    const routes = this.#routes[method];
    const trie = this.#tries[method];
    const staticMap = createNullObject();
    const handlerData = [];
    const [regexp, indexReplacementMap, paramReplacementMap] = trie.buildRegExp();
    for (const r of [middleware, routes]) for (const path in r) {
      const handlers = r[path];
      const pathData = trie.paths[path];
      if (!pathData) {
        staticMap[path] = [handlers.map(([h]) => [h, createNullObject()]), emptyParam];
        continue;
      }
      handlerData[pathData[0]] = handlers.map(([h, handlerPath]) => [h, trie.paths[handlerPath][1].reduceRight((map, [key], i) => {
        map[key] = paramReplacementMap[pathData[1][i][1]];
        return map;
      }, createNullObject())]);
    }
    return [
      regexp,
      indexReplacementMap.map((i) => handlerData[i]),
      staticMap
    ];
  }
};

// node_modules/hono/dist/router/smart-router/router.js
var SmartRouter = class {
  name = "SmartRouter";
  #routers = [];
  #routes = [];
  constructor(init) {
    this.#routers = init.routers;
  }
  add(method, path, handler) {
    if (!this.#routes) throw new Error(MESSAGE_MATCHER_IS_ALREADY_BUILT);
    this.#routes.push([
      method,
      path,
      handler
    ]);
  }
  match(method, path) {
    if (!this.#routes) throw new Error("Fatal error");
    const routers = this.#routers;
    const routes = this.#routes;
    const len = routers.length;
    let i = 0;
    let res;
    for (; i < len; i++) {
      const router = routers[i];
      try {
        for (let i2 = 0, len2 = routes.length; i2 < len2; i2++) router.add(...routes[i2]);
        res = router.match(method, path);
      } catch (e) {
        if (e instanceof UnsupportedPathError) continue;
        throw e;
      }
      this.match = router.match.bind(router);
      this.#routers = [router];
      this.#routes = void 0;
      break;
    }
    if (i === len) throw new Error("Fatal error");
    this.name = `SmartRouter + ${this.activeRouter.name}`;
    return res;
  }
  get activeRouter() {
    if (this.#routes || this.#routers.length !== 1) throw new Error("No active router has been determined yet.");
    return this.#routers[0];
  }
};

// node_modules/hono/dist/router/trie-router/node.js
var emptyParams = createNullObject();
var order = 0;
var Node3 = class Node4 {
  #methods = [];
  #children = createNullObject();
  #patterns = [];
  #pattern;
  #params = emptyParams;
  insert(method, path, handler) {
    let curNode = this;
    const parts = splitRoutingPath(path);
    const possibleKeys = /* @__PURE__ */ new Set();
    let i = 0;
    for (const p of parts) {
      const nextP = parts[++i];
      const pattern = getPattern(p, nextP) || (nextP === void 0 && p && p.indexOf("*") === p.length - 1 ? p : null);
      const isParam = Array.isArray(pattern);
      const key = isParam ? pattern[0] : pattern || p;
      const child = curNode.#children[key] ||= new Node4();
      if (pattern && !child.#pattern) {
        child.#pattern = pattern;
        curNode.#patterns.push(child);
      }
      curNode = child;
      if (isParam) possibleKeys.add(pattern[1]);
    }
    curNode.#methods.push({ [method]: {
      handler,
      possibleKeys: [...possibleKeys],
      score: ++order
    } });
  }
  #pushHandlerSets(handlerSets, node, method, nodeParams, params) {
    for (let i = 0, len = node.#methods.length; i < len; i++) {
      const m = node.#methods[i];
      const handlerSet = m[method] || m["ALL"];
      if (handlerSet) {
        handlerSet.params = createNullObject();
        handlerSets.push(handlerSet);
        for (let i2 = 0, len2 = handlerSet.possibleKeys.length; i2 < len2; i2++) {
          const key = handlerSet.possibleKeys[i2];
          handlerSet.params[key] = params?.[key] && !i2 ? params[key] : nodeParams[key] ?? params?.[key];
        }
      }
    }
  }
  search(method, path) {
    const handlerSets = [];
    this.#params = emptyParams;
    let curNodes = [this];
    const parts = splitPath(path);
    const curNodesQueue = [];
    const len = parts.length;
    let partOffsets = null;
    for (let i = 0; i < len; i++) {
      const part = parts[i];
      const isLast = i === len - 1;
      const tempNodes = [];
      for (let j = 0, len2 = curNodes.length; j < len2; j++) {
        const node = curNodes[j];
        const nextNode = node.#children[part];
        if (nextNode) {
          nextNode.#params = node.#params;
          if (isLast) {
            if (nextNode.#children["*"]) this.#pushHandlerSets(handlerSets, nextNode.#children["*"], method, node.#params);
            this.#pushHandlerSets(handlerSets, nextNode, method, node.#params);
          } else tempNodes.push(nextNode);
        }
        for (const child of node.#patterns) {
          const pattern = child.#pattern;
          const params = node.#params === emptyParams ? {} : { ...node.#params };
          if (typeof pattern === "string") {
            if (pattern === "*" || part.startsWith(pattern.slice(0, -1))) {
              this.#pushHandlerSets(handlerSets, child, method, node.#params);
              if (pattern === "*") {
                child.#params = params;
                tempNodes.push(child);
              }
            }
            continue;
          }
          const [, name, matcher] = pattern;
          if (!part && matcher === true) continue;
          if (matcher !== true) {
            if (!partOffsets) {
              partOffsets = [];
              let offset = path[0] === "/" ? 1 : 0;
              for (let p = 0; p < len; p++) {
                partOffsets[p] = offset;
                offset += parts[p].length + 1;
              }
            }
            const restPathString = path.slice(partOffsets[i]);
            const m = matcher.exec(restPathString);
            if (m) {
              params[name] = m[0];
              this.#pushHandlerSets(handlerSets, child, method, node.#params, params);
              if (m[0].length === restPathString.length && child.#children["*"]) this.#pushHandlerSets(handlerSets, child.#children["*"], method, node.#params, params);
              for (const _ in child.#children) {
                child.#params = params;
                const componentCount = m[0].match(/\//g)?.length ?? 0;
                (curNodesQueue[componentCount] ||= []).push(child);
                break;
              }
              continue;
            }
          }
          if (matcher === true || matcher.test(part)) {
            params[name] = part;
            if (isLast) {
              this.#pushHandlerSets(handlerSets, child, method, params, node.#params);
              if (child.#children["*"]) this.#pushHandlerSets(handlerSets, child.#children["*"], method, params, node.#params);
            } else {
              child.#params = params;
              tempNodes.push(child);
            }
          }
        }
      }
      const shifted = curNodesQueue.shift();
      curNodes = shifted ? tempNodes.concat(shifted) : tempNodes;
    }
    if (handlerSets[1]) handlerSets.sort((a, b) => {
      return a.score - b.score;
    });
    return [handlerSets.map(({ handler, params }) => [handler, params])];
  }
};

// node_modules/hono/dist/router/trie-router/router.js
var TrieRouter = class {
  name = "TrieRouter";
  #node = new Node3();
  add(method, path, handler) {
    for (const result of checkOptionalParameter(path) || [path]) this.#node.insert(method, result, handler);
  }
  match(method, path) {
    return this.#node.search(method, path);
  }
};

// node_modules/hono/dist/hono.js
var Hono3 = class extends Hono {
  /**
  * Creates an instance of the Hono class.
  *
  * @param options - Optional configuration options for the Hono instance.
  */
  constructor(options = {}) {
    super(options);
    this.router = options.router ?? new SmartRouter({ routers: [new RegExpRouter(), new TrieRouter()] });
  }
};

// node_modules/@libsql/core/lib-esm/api.js
var LibsqlError = class extends Error {
  /** Machine-readable error code. */
  code;
  /** Raw numeric error code */
  rawCode;
  constructor(message, code, rawCode, cause) {
    if (code !== void 0) {
      message = `${code}: ${message}`;
    }
    super(message, { cause });
    this.code = code;
    this.rawCode = rawCode;
    this.name = "LibsqlError";
  }
};

// node_modules/@libsql/core/lib-esm/uri.js
function parseUri(text) {
  const match2 = URI_RE.exec(text);
  if (match2 === null) {
    throw new LibsqlError(`The URL '${text}' is not in a valid format`, "URL_INVALID");
  }
  const groups = match2.groups;
  const scheme = groups["scheme"];
  const authority = groups["authority"] !== void 0 ? parseAuthority(groups["authority"]) : void 0;
  const path = percentDecode(groups["path"]);
  const query = groups["query"] !== void 0 ? parseQuery(groups["query"]) : void 0;
  const fragment = groups["fragment"] !== void 0 ? percentDecode(groups["fragment"]) : void 0;
  return { scheme, authority, path, query, fragment };
}
var URI_RE = (() => {
  const SCHEME = "(?<scheme>[A-Za-z][A-Za-z.+-]*)";
  const AUTHORITY = "(?<authority>[^/?#]*)";
  const PATH = "(?<path>[^?#]*)";
  const QUERY = "(?<query>[^#]*)";
  const FRAGMENT = "(?<fragment>.*)";
  return new RegExp(`^${SCHEME}:(//${AUTHORITY})?${PATH}(\\?${QUERY})?(#${FRAGMENT})?$`, "su");
})();
function parseAuthority(text) {
  const match2 = AUTHORITY_RE.exec(text);
  if (match2 === null) {
    throw new LibsqlError("The authority part of the URL is not in a valid format", "URL_INVALID");
  }
  const groups = match2.groups;
  const host = percentDecode(groups["host_br"] ?? groups["host"]);
  const port = groups["port"] ? parseInt(groups["port"], 10) : void 0;
  const userinfo = groups["username"] !== void 0 ? {
    username: percentDecode(groups["username"]),
    password: groups["password"] !== void 0 ? percentDecode(groups["password"]) : void 0
  } : void 0;
  return { host, port, userinfo };
}
var AUTHORITY_RE = (() => {
  return new RegExp(`^((?<username>[^:]*)(:(?<password>.*))?@)?((?<host>[^:\\[\\]]*)|(\\[(?<host_br>[^\\[\\]]*)\\]))(:(?<port>[0-9]*))?$`, "su");
})();
function parseQuery(text) {
  const sequences = text.split("&");
  const pairs = [];
  for (const sequence of sequences) {
    if (sequence === "") {
      continue;
    }
    let key;
    let value;
    const splitIdx = sequence.indexOf("=");
    if (splitIdx < 0) {
      key = sequence;
      value = "";
    } else {
      key = sequence.substring(0, splitIdx);
      value = sequence.substring(splitIdx + 1);
    }
    pairs.push({
      key: percentDecode(key.replaceAll("+", " ")),
      value: percentDecode(value.replaceAll("+", " "))
    });
  }
  return { pairs };
}
function percentDecode(text) {
  try {
    return decodeURIComponent(text);
  } catch (e) {
    if (e instanceof URIError) {
      throw new LibsqlError(`URL component has invalid percent encoding: ${e}`, "URL_INVALID", void 0, e);
    }
    throw e;
  }
}
function encodeBaseUrl(scheme, authority, path) {
  if (authority === void 0) {
    throw new LibsqlError(`URL with scheme ${JSON.stringify(scheme + ":")} requires authority (the "//" part)`, "URL_INVALID");
  }
  const schemeText = `${scheme}:`;
  const hostText = encodeHost(authority.host);
  const portText = encodePort(authority.port);
  const userinfoText = encodeUserinfo(authority.userinfo);
  const authorityText = `//${userinfoText}${hostText}${portText}`;
  let pathText = path.split("/").map(encodeURIComponent).join("/");
  if (pathText !== "" && !pathText.startsWith("/")) {
    pathText = "/" + pathText;
  }
  return new URL(`${schemeText}${authorityText}${pathText}`);
}
function encodeHost(host) {
  return host.includes(":") ? `[${encodeURI(host)}]` : encodeURI(host);
}
function encodePort(port) {
  return port !== void 0 ? `:${port}` : "";
}
function encodeUserinfo(userinfo) {
  if (userinfo === void 0) {
    return "";
  }
  const usernameText = encodeURIComponent(userinfo.username);
  const passwordText = userinfo.password !== void 0 ? `:${encodeURIComponent(userinfo.password)}` : "";
  return `${usernameText}${passwordText}@`;
}

// node_modules/js-base64/base64.mjs
var version = "3.9.4";
var VERSION = version;
var _TD = typeof TextDecoder === "function" ? new TextDecoder("utf-8", { ignoreBOM: true }) : void 0;
var _TE = typeof TextEncoder === "function" ? new TextEncoder() : void 0;
var b64ch = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
var b64chs = Array.prototype.slice.call(b64ch);
var b64tab = ((a) => {
  let tab = {};
  a.forEach((c, i) => tab[c] = i);
  return tab;
})(b64chs);
var b64re = /^(?:[A-Za-z\d+\/]{4})*?(?:[A-Za-z\d+\/]{2}(?:==)?|[A-Za-z\d+\/]{3}=?)?$/;
var _fromCC = String.fromCharCode.bind(String);
var _U8Afrom = typeof Uint8Array.from === "function" ? Uint8Array.from.bind(Uint8Array) : (it) => new Uint8Array(Array.prototype.slice.call(it, 0));
var _mkUriSafe = (src) => src.replace(/=/g, "").replace(/[+\/]/g, (m0) => m0 == "+" ? "-" : "_");
var _tidyB64 = (s) => s.replace(/[^A-Za-z0-9\+\/]/g, "");
var btoaPolyfill = (bin) => {
  let u32, c0, c1, c2, asc = "";
  const pad = bin.length % 3;
  for (let i = 0; i < bin.length; ) {
    if ((c0 = bin.charCodeAt(i++)) > 255 || (c1 = bin.charCodeAt(i++)) > 255 || (c2 = bin.charCodeAt(i++)) > 255)
      throw new TypeError("invalid character found");
    u32 = c0 << 16 | c1 << 8 | c2;
    asc += b64chs[u32 >> 18 & 63] + b64chs[u32 >> 12 & 63] + b64chs[u32 >> 6 & 63] + b64chs[u32 & 63];
  }
  return pad ? asc.slice(0, pad - 3) + "===".substring(pad) : asc;
};
var _btoa = typeof btoa === "function" ? (bin) => btoa(bin) : btoaPolyfill;
var _fromUint8Array = typeof Uint8Array.prototype.toBase64 === "function" ? (u8a) => u8a.toBase64() : (u8a) => {
  const maxargs = 4096;
  let strs = [];
  for (let i = 0, l = u8a.length; i < l; i += maxargs) {
    strs.push(_fromCC.apply(null, u8a.subarray(i, i + maxargs)));
  }
  return _btoa(strs.join(""));
};
var fromUint8Array = (u8a, urlsafe = false) => urlsafe ? _mkUriSafe(_fromUint8Array(u8a)) : _fromUint8Array(u8a);
var cb_utob = (c) => {
  if (c.length < 2) {
    var cc = c.charCodeAt(0);
    return cc < 128 ? c : cc < 2048 ? _fromCC(192 | cc >>> 6) + _fromCC(128 | cc & 63) : _fromCC(224 | cc >>> 12 & 15) + _fromCC(128 | cc >>> 6 & 63) + _fromCC(128 | cc & 63);
  } else {
    var cc = 65536 + (c.charCodeAt(0) - 55296) * 1024 + (c.charCodeAt(1) - 56320);
    return _fromCC(240 | cc >>> 18 & 7) + _fromCC(128 | cc >>> 12 & 63) + _fromCC(128 | cc >>> 6 & 63) + _fromCC(128 | cc & 63);
  }
};
var re_utob = /[\uD800-\uDBFF][\uDC00-\uDFFF]|[^\x00-\x7F]/g;
var utob = (u) => u.replace(re_utob, cb_utob);
var _encode = _TE ? (s) => _fromUint8Array(_TE.encode(s)) : (s) => _btoa(utob(s));
var encode = (src, urlsafe = false) => urlsafe ? _mkUriSafe(_encode(src)) : _encode(src);
var encodeURI2 = (src) => encode(src, true);
var re_btou = /[\xC0-\xDF][\x80-\xBF]|[\xE0-\xEF][\x80-\xBF]{2}|[\xF0-\xF7][\x80-\xBF]{3}/g;
var cb_btou = (cccc) => {
  switch (cccc.length) {
    case 4:
      var cp = (7 & cccc.charCodeAt(0)) << 18 | (63 & cccc.charCodeAt(1)) << 12 | (63 & cccc.charCodeAt(2)) << 6 | 63 & cccc.charCodeAt(3), offset = cp - 65536;
      return _fromCC((offset >>> 10) + 55296) + _fromCC((offset & 1023) + 56320);
    case 3:
      return _fromCC((15 & cccc.charCodeAt(0)) << 12 | (63 & cccc.charCodeAt(1)) << 6 | 63 & cccc.charCodeAt(2));
    default:
      return _fromCC((31 & cccc.charCodeAt(0)) << 6 | 63 & cccc.charCodeAt(1));
  }
};
var btou = (b) => b.replace(re_btou, cb_btou);
var atobPolyfill = (asc) => {
  asc = asc.replace(/\s+/g, "");
  if (!b64re.test(asc))
    throw new TypeError("malformed base64.");
  asc += "==".slice(2 - (asc.length & 3));
  let u24, r1, r2;
  let binArray = [];
  for (let i = 0; i < asc.length; ) {
    u24 = b64tab[asc.charAt(i++)] << 18 | b64tab[asc.charAt(i++)] << 12 | (r1 = b64tab[asc.charAt(i++)]) << 6 | (r2 = b64tab[asc.charAt(i++)]);
    if (r1 === 64) {
      binArray.push(_fromCC(u24 >> 16 & 255));
    } else if (r2 === 64) {
      binArray.push(_fromCC(u24 >> 16 & 255, u24 >> 8 & 255));
    } else {
      binArray.push(_fromCC(u24 >> 16 & 255, u24 >> 8 & 255, u24 & 255));
    }
  }
  return binArray.join("");
};
var _atob = typeof atob === "function" ? (asc) => atob(_tidyB64(asc)) : atobPolyfill;
var _toUint8Array = typeof Uint8Array.fromBase64 === "function" ? (a) => Uint8Array.fromBase64(a) : (a) => _U8Afrom(_atob(a).split("").map((c) => c.charCodeAt(0)));
var toUint8Array = (a) => _toUint8Array(_unURI(a));
var _decode = _TD ? (a) => _TD.decode(_toUint8Array(a)) : (a) => btou(_atob(a));
var _unURI = (a) => _tidyB64(a.replace(/[-_]/g, (m0) => m0 == "-" ? "+" : "/"));
var decode = (src) => _decode(_unURI(src));
var isValid = (src) => {
  if (typeof src !== "string")
    return false;
  const s = src.replace(/\s+/g, "").replace(/={0,2}$/, "");
  return !/[^\s0-9a-zA-Z\+/]/.test(s) || !/[^\s0-9a-zA-Z\-_]/.test(s);
};
var _noEnum = (v) => {
  return {
    value: v,
    enumerable: false,
    writable: true,
    configurable: true
  };
};
var extendString = function() {
  const _add = (name, body) => Object.defineProperty(String.prototype, name, _noEnum(body));
  _add("fromBase64", function() {
    return decode(this);
  });
  _add("toBase64", function(urlsafe) {
    return encode(this, urlsafe);
  });
  _add("toBase64URI", function() {
    return encode(this, true);
  });
  _add("toBase64URL", function() {
    return encode(this, true);
  });
  _add("toUint8Array", function() {
    return toUint8Array(this);
  });
};
var extendUint8Array = function() {
  const _add = (name, body) => Object.defineProperty(Uint8Array.prototype, name, _noEnum(body));
  _add("toBase64", function(urlsafe) {
    return fromUint8Array(this, urlsafe);
  });
  _add("toBase64URI", function() {
    return fromUint8Array(this, true);
  });
  _add("toBase64URL", function() {
    return fromUint8Array(this, true);
  });
};
var extendBuiltins = () => {
  extendString();
  extendUint8Array();
};
var gBase64 = {
  version,
  VERSION,
  atob: _atob,
  atobPolyfill,
  btoa: _btoa,
  btoaPolyfill,
  fromBase64: decode,
  toBase64: encode,
  encode,
  encodeURI: encodeURI2,
  encodeURL: encodeURI2,
  utob,
  btou,
  decode,
  isValid,
  fromUint8Array,
  toUint8Array,
  extendString,
  extendUint8Array,
  extendBuiltins
};

// node_modules/@libsql/core/lib-esm/util.js
var supportedUrlLink = "https://github.com/libsql/libsql-client-ts#supported-urls";
function transactionModeToBegin(mode) {
  if (mode === "write") {
    return "BEGIN IMMEDIATE";
  } else if (mode === "read") {
    return "BEGIN TRANSACTION READONLY";
  } else if (mode === "deferred") {
    return "BEGIN DEFERRED";
  } else {
    throw RangeError('Unknown transaction mode, supported values are "write", "read" and "deferred"');
  }
}
var ResultSetImpl = class {
  columns;
  columnTypes;
  rows;
  rowsAffected;
  lastInsertRowid;
  constructor(columns, columnTypes, rows, rowsAffected, lastInsertRowid) {
    this.columns = columns;
    this.columnTypes = columnTypes;
    this.rows = rows;
    this.rowsAffected = rowsAffected;
    this.lastInsertRowid = lastInsertRowid;
  }
  toJSON() {
    return {
      columns: this.columns,
      columnTypes: this.columnTypes,
      rows: this.rows.map(rowToJson),
      rowsAffected: this.rowsAffected,
      lastInsertRowid: this.lastInsertRowid !== void 0 ? "" + this.lastInsertRowid : null
    };
  }
};
function rowToJson(row) {
  return Array.prototype.map.call(row, valueToJson);
}
function valueToJson(value) {
  if (typeof value === "bigint") {
    return "" + value;
  } else if (value instanceof ArrayBuffer) {
    return gBase64.fromUint8Array(new Uint8Array(value));
  } else {
    return value;
  }
}

// node_modules/@libsql/core/lib-esm/config.js
var inMemoryMode = ":memory:";
function expandConfig(config, preferHttp) {
  if (typeof config !== "object") {
    throw new TypeError(`Expected client configuration as object, got ${typeof config}`);
  }
  let { url, authToken, tls, intMode, concurrency } = config;
  concurrency = Math.max(0, concurrency || 20);
  intMode ??= "number";
  let connectionQueryParams = [];
  if (url === inMemoryMode) {
    url = "file::memory:";
  }
  const uri = parseUri(url);
  const originalUriScheme = uri.scheme.toLowerCase();
  const isInMemoryMode = originalUriScheme === "file" && uri.path === inMemoryMode && uri.authority === void 0;
  let queryParamsDef;
  if (isInMemoryMode) {
    queryParamsDef = {
      cache: {
        values: ["shared", "private"],
        update: (key, value) => connectionQueryParams.push(`${key}=${value}`)
      }
    };
  } else {
    queryParamsDef = {
      tls: {
        values: ["0", "1"],
        update: (_, value) => tls = value === "1"
      },
      authToken: {
        update: (_, value) => authToken = value
      }
    };
  }
  for (const { key, value } of uri.query?.pairs ?? []) {
    if (!Object.hasOwn(queryParamsDef, key)) {
      throw new LibsqlError(`Unsupported URL query parameter ${JSON.stringify(key)}`, "URL_PARAM_NOT_SUPPORTED");
    }
    const queryParamDef = queryParamsDef[key];
    if (queryParamDef.values !== void 0 && !queryParamDef.values.includes(value)) {
      throw new LibsqlError(`Unknown value for the "${key}" query argument: ${JSON.stringify(value)}. Supported values are: [${queryParamDef.values.map((x) => '"' + x + '"').join(", ")}]`, "URL_INVALID");
    }
    if (queryParamDef.update !== void 0) {
      queryParamDef?.update(key, value);
    }
  }
  const connectionQueryParamsString = connectionQueryParams.length === 0 ? "" : `?${connectionQueryParams.join("&")}`;
  const path = uri.path + connectionQueryParamsString;
  let scheme;
  if (originalUriScheme === "libsql") {
    if (tls === false) {
      if (uri.authority?.port === void 0) {
        throw new LibsqlError('A "libsql:" URL with ?tls=0 must specify an explicit port', "URL_INVALID");
      }
      scheme = preferHttp ? "http" : "ws";
    } else {
      scheme = preferHttp ? "https" : "wss";
    }
  } else {
    scheme = originalUriScheme;
  }
  if (scheme === "http" || scheme === "ws") {
    tls ??= false;
  } else {
    tls ??= true;
  }
  if (scheme !== "http" && scheme !== "ws" && scheme !== "https" && scheme !== "wss" && scheme !== "file") {
    throw new LibsqlError(`The client supports only "libsql:", "wss:", "ws:", "https:", "http:" and "file:" URLs, got ${JSON.stringify(uri.scheme + ":")}. For more information, please read ${supportedUrlLink}`, "URL_SCHEME_NOT_SUPPORTED");
  }
  if (intMode !== "number" && intMode !== "bigint" && intMode !== "string") {
    throw new TypeError(`Invalid value for intMode, expected "number", "bigint" or "string", got ${JSON.stringify(intMode)}`);
  }
  if (uri.fragment !== void 0) {
    throw new LibsqlError(`URL fragments are not supported: ${JSON.stringify("#" + uri.fragment)}`, "URL_INVALID");
  }
  if (isInMemoryMode) {
    return {
      scheme: "file",
      tls: false,
      path,
      intMode,
      concurrency,
      syncUrl: config.syncUrl,
      syncInterval: config.syncInterval,
      readYourWrites: config.readYourWrites,
      offline: config.offline,
      fetch: config.fetch,
      authToken: void 0,
      encryptionKey: void 0,
      authority: void 0
    };
  }
  return {
    scheme,
    tls,
    authority: uri.authority,
    path,
    authToken,
    intMode,
    concurrency,
    encryptionKey: config.encryptionKey,
    syncUrl: config.syncUrl,
    syncInterval: config.syncInterval,
    readYourWrites: config.readYourWrites,
    offline: config.offline,
    fetch: config.fetch
  };
}

// node_modules/ws/wrapper.mjs
var import_stream = __toESM(require_stream(), 1);
var import_extension = __toESM(require_extension(), 1);
var import_permessage_deflate = __toESM(require_permessage_deflate(), 1);
var import_receiver = __toESM(require_receiver(), 1);
var import_sender = __toESM(require_sender(), 1);
var import_subprotocol = __toESM(require_subprotocol(), 1);
var import_websocket = __toESM(require_websocket(), 1);
var import_websocket_server = __toESM(require_websocket_server(), 1);

// node_modules/@libsql/hrana-client/lib-esm/client.js
var Client = class {
  /** @private */
  constructor() {
    this.intMode = "number";
  }
  /** Representation of integers returned from the database. See {@link IntMode}.
   *
   * This value is inherited by {@link Stream} objects created with {@link openStream}, but you can
   * override the integer mode for every stream by setting {@link Stream.intMode} on the stream.
   */
  intMode;
};

// node_modules/@libsql/hrana-client/lib-esm/errors.js
var ClientError = class extends Error {
  /** @private */
  constructor(message) {
    super(message);
    this.name = "ClientError";
  }
};
var ProtoError = class extends ClientError {
  /** @private */
  constructor(message) {
    super(message);
    this.name = "ProtoError";
  }
};
var ResponseError = class extends ClientError {
  code;
  /** @internal */
  proto;
  /** @private */
  constructor(message, protoError) {
    super(message);
    this.name = "ResponseError";
    this.code = protoError.code;
    this.proto = protoError;
    this.stack = void 0;
  }
};
var ClosedError = class extends ClientError {
  /** @private */
  constructor(message, cause) {
    if (cause !== void 0) {
      super(`${message}: ${cause}`);
      this.cause = cause;
    } else {
      super(message);
    }
    this.name = "ClosedError";
  }
};
var WebSocketUnsupportedError = class extends ClientError {
  /** @private */
  constructor(message) {
    super(message);
    this.name = "WebSocketUnsupportedError";
  }
};
var WebSocketError = class extends ClientError {
  /** @private */
  constructor(message) {
    super(message);
    this.name = "WebSocketError";
  }
};
var HttpServerError = class extends ClientError {
  status;
  /** @private */
  constructor(message, status) {
    super(message);
    this.status = status;
    this.name = "HttpServerError";
  }
};
var ProtocolVersionError = class extends ClientError {
  /** @private */
  constructor(message) {
    super(message);
    this.name = "ProtocolVersionError";
  }
};
var InternalError = class extends ClientError {
  /** @private */
  constructor(message) {
    super(message);
    this.name = "InternalError";
  }
};
var MisuseError = class extends ClientError {
  /** @private */
  constructor(message) {
    super(message);
    this.name = "MisuseError";
  }
};

// node_modules/@libsql/hrana-client/lib-esm/encoding/json/decode.js
function string(value) {
  if (typeof value === "string") {
    return value;
  }
  throw typeError(value, "string");
}
function stringOpt(value) {
  if (value === null || value === void 0) {
    return void 0;
  } else if (typeof value === "string") {
    return value;
  }
  throw typeError(value, "string or null");
}
function number(value) {
  if (typeof value === "number") {
    return value;
  }
  throw typeError(value, "number");
}
function boolean(value) {
  if (typeof value === "boolean") {
    return value;
  }
  throw typeError(value, "boolean");
}
function array(value) {
  if (Array.isArray(value)) {
    return value;
  }
  throw typeError(value, "array");
}
function object(value) {
  if (value !== null && typeof value === "object" && !Array.isArray(value)) {
    return value;
  }
  throw typeError(value, "object");
}
function arrayObjectsMap(value, fun) {
  return array(value).map((elemValue) => fun(object(elemValue)));
}
function typeError(value, expected) {
  if (value === void 0) {
    return new ProtoError(`Expected ${expected}, but the property was missing`);
  }
  let received = typeof value;
  if (value === null) {
    received = "null";
  } else if (Array.isArray(value)) {
    received = "array";
  }
  return new ProtoError(`Expected ${expected}, received ${received}`);
}
function readJsonObject(value, fun) {
  return fun(object(value));
}

// node_modules/@libsql/hrana-client/lib-esm/encoding/json/encode.js
var ObjectWriter = class {
  #output;
  #isFirst;
  constructor(output) {
    this.#output = output;
    this.#isFirst = false;
  }
  begin() {
    this.#output.push("{");
    this.#isFirst = true;
  }
  end() {
    this.#output.push("}");
    this.#isFirst = false;
  }
  #key(name) {
    if (this.#isFirst) {
      this.#output.push('"');
      this.#isFirst = false;
    } else {
      this.#output.push(',"');
    }
    this.#output.push(name);
    this.#output.push('":');
  }
  string(name, value) {
    this.#key(name);
    this.#output.push(JSON.stringify(value));
  }
  stringRaw(name, value) {
    this.#key(name);
    this.#output.push('"');
    this.#output.push(value);
    this.#output.push('"');
  }
  number(name, value) {
    this.#key(name);
    this.#output.push("" + value);
  }
  boolean(name, value) {
    this.#key(name);
    this.#output.push(value ? "true" : "false");
  }
  object(name, value, valueFun) {
    this.#key(name);
    this.begin();
    valueFun(this, value);
    this.end();
  }
  arrayObjects(name, values, valueFun) {
    this.#key(name);
    this.#output.push("[");
    for (let i = 0; i < values.length; ++i) {
      if (i !== 0) {
        this.#output.push(",");
      }
      this.begin();
      valueFun(this, values[i]);
      this.end();
    }
    this.#output.push("]");
  }
};
function writeJsonObject(value, fun) {
  const output = [];
  const writer = new ObjectWriter(output);
  writer.begin();
  fun(writer, value);
  writer.end();
  return output.join("");
}

// node_modules/@libsql/hrana-client/lib-esm/encoding/protobuf/util.js
var VARINT = 0;
var FIXED_64 = 1;
var LENGTH_DELIMITED = 2;
var FIXED_32 = 5;

// node_modules/@libsql/hrana-client/lib-esm/encoding/protobuf/decode.js
var MessageReader = class {
  #array;
  #view;
  #pos;
  constructor(array2) {
    this.#array = array2;
    this.#view = new DataView(array2.buffer, array2.byteOffset, array2.byteLength);
    this.#pos = 0;
  }
  varint() {
    let value = 0;
    for (let shift = 0; ; shift += 7) {
      const byte = this.#array[this.#pos++];
      value |= (byte & 127) << shift;
      if (!(byte & 128)) {
        break;
      }
    }
    return value;
  }
  varintBig() {
    let value = 0n;
    for (let shift = 0n; ; shift += 7n) {
      const byte = this.#array[this.#pos++];
      value |= BigInt(byte & 127) << shift;
      if (!(byte & 128)) {
        break;
      }
    }
    return value;
  }
  bytes(length) {
    const array2 = new Uint8Array(this.#array.buffer, this.#array.byteOffset + this.#pos, length);
    this.#pos += length;
    return array2;
  }
  double() {
    const value = this.#view.getFloat64(this.#pos, true);
    this.#pos += 8;
    return value;
  }
  skipVarint() {
    for (; ; ) {
      const byte = this.#array[this.#pos++];
      if (!(byte & 128)) {
        break;
      }
    }
  }
  skip(count) {
    this.#pos += count;
  }
  eof() {
    return this.#pos >= this.#array.byteLength;
  }
};
var FieldReader = class {
  #reader;
  #wireType;
  constructor(reader) {
    this.#reader = reader;
    this.#wireType = -1;
  }
  setup(wireType) {
    this.#wireType = wireType;
  }
  #expect(expectedWireType) {
    if (this.#wireType !== expectedWireType) {
      throw new ProtoError(`Expected wire type ${expectedWireType}, got ${this.#wireType}`);
    }
    this.#wireType = -1;
  }
  bytes() {
    this.#expect(LENGTH_DELIMITED);
    const length = this.#reader.varint();
    return this.#reader.bytes(length);
  }
  string() {
    return new TextDecoder().decode(this.bytes());
  }
  message(def) {
    return readProtobufMessage(this.bytes(), def);
  }
  int32() {
    this.#expect(VARINT);
    return this.#reader.varint();
  }
  uint32() {
    return this.int32();
  }
  bool() {
    return this.int32() !== 0;
  }
  uint64() {
    this.#expect(VARINT);
    return this.#reader.varintBig();
  }
  sint64() {
    const value = this.uint64();
    return value >> 1n ^ -(value & 1n);
  }
  double() {
    this.#expect(FIXED_64);
    return this.#reader.double();
  }
  maybeSkip() {
    if (this.#wireType < 0) {
      return;
    } else if (this.#wireType === VARINT) {
      this.#reader.skipVarint();
    } else if (this.#wireType === FIXED_64) {
      this.#reader.skip(8);
    } else if (this.#wireType === LENGTH_DELIMITED) {
      const length = this.#reader.varint();
      this.#reader.skip(length);
    } else if (this.#wireType === FIXED_32) {
      this.#reader.skip(4);
    } else {
      throw new ProtoError(`Unexpected wire type ${this.#wireType}`);
    }
    this.#wireType = -1;
  }
};
function readProtobufMessage(data, def) {
  const msgReader = new MessageReader(data);
  const fieldReader = new FieldReader(msgReader);
  let value = def.default();
  while (!msgReader.eof()) {
    const key = msgReader.varint();
    const tag = key >> 3;
    const wireType = key & 7;
    fieldReader.setup(wireType);
    const tagFun = def[tag];
    if (tagFun !== void 0) {
      const returnedValue = tagFun(fieldReader, value);
      if (returnedValue !== void 0) {
        value = returnedValue;
      }
    }
    fieldReader.maybeSkip();
  }
  return value;
}

// node_modules/@libsql/hrana-client/lib-esm/encoding/protobuf/encode.js
var MessageWriter = class _MessageWriter {
  #buf;
  #array;
  #view;
  #pos;
  constructor() {
    this.#buf = new ArrayBuffer(256);
    this.#array = new Uint8Array(this.#buf);
    this.#view = new DataView(this.#buf);
    this.#pos = 0;
  }
  #ensure(extra) {
    if (this.#pos + extra <= this.#buf.byteLength) {
      return;
    }
    let newCap = this.#buf.byteLength;
    while (newCap < this.#pos + extra) {
      newCap *= 2;
    }
    const newBuf = new ArrayBuffer(newCap);
    const newArray = new Uint8Array(newBuf);
    const newView = new DataView(newBuf);
    newArray.set(new Uint8Array(this.#buf, 0, this.#pos));
    this.#buf = newBuf;
    this.#array = newArray;
    this.#view = newView;
  }
  #varint(value) {
    this.#ensure(5);
    value = 0 | value;
    do {
      let byte = value & 127;
      value >>>= 7;
      byte |= value ? 128 : 0;
      this.#array[this.#pos++] = byte;
    } while (value);
  }
  #varintBig(value) {
    this.#ensure(10);
    value = value & 0xffffffffffffffffn;
    do {
      let byte = Number(value & 0x7fn);
      value >>= 7n;
      byte |= value ? 128 : 0;
      this.#array[this.#pos++] = byte;
    } while (value);
  }
  #tag(tag, wireType) {
    this.#varint(tag << 3 | wireType);
  }
  bytes(tag, value) {
    this.#tag(tag, LENGTH_DELIMITED);
    this.#varint(value.byteLength);
    this.#ensure(value.byteLength);
    this.#array.set(value, this.#pos);
    this.#pos += value.byteLength;
  }
  string(tag, value) {
    this.bytes(tag, new TextEncoder().encode(value));
  }
  message(tag, value, fun) {
    const writer = new _MessageWriter();
    fun(writer, value);
    this.bytes(tag, writer.data());
  }
  int32(tag, value) {
    this.#tag(tag, VARINT);
    this.#varint(value);
  }
  uint32(tag, value) {
    this.int32(tag, value);
  }
  bool(tag, value) {
    this.int32(tag, value ? 1 : 0);
  }
  sint64(tag, value) {
    this.#tag(tag, VARINT);
    this.#varintBig(value << 1n ^ value >> 63n);
  }
  double(tag, value) {
    this.#tag(tag, FIXED_64);
    this.#ensure(8);
    this.#view.setFloat64(this.#pos, value, true);
    this.#pos += 8;
  }
  data() {
    return new Uint8Array(this.#buf, 0, this.#pos);
  }
};
function writeProtobufMessage(value, fun) {
  const w = new MessageWriter();
  fun(w, value);
  return w.data();
}

// node_modules/@libsql/hrana-client/lib-esm/id_alloc.js
var IdAlloc = class {
  // Set of all allocated ids
  #usedIds;
  // Set of all free ids lower than `#usedIds.size`
  #freeIds;
  constructor() {
    this.#usedIds = /* @__PURE__ */ new Set();
    this.#freeIds = /* @__PURE__ */ new Set();
  }
  // Returns an id that was free, and marks it as used.
  alloc() {
    for (const freeId2 of this.#freeIds) {
      this.#freeIds.delete(freeId2);
      this.#usedIds.add(freeId2);
      if (!this.#usedIds.has(this.#usedIds.size - 1)) {
        this.#freeIds.add(this.#usedIds.size - 1);
      }
      return freeId2;
    }
    const freeId = this.#usedIds.size;
    this.#usedIds.add(freeId);
    return freeId;
  }
  free(id) {
    if (!this.#usedIds.delete(id)) {
      throw new InternalError("Freeing an id that is not allocated");
    }
    this.#freeIds.delete(this.#usedIds.size);
    if (id < this.#usedIds.size) {
      this.#freeIds.add(id);
    }
  }
};

// node_modules/@libsql/hrana-client/lib-esm/util.js
function impossible(value, message) {
  throw new InternalError(message);
}

// node_modules/@libsql/hrana-client/lib-esm/value.js
function valueToProto(value) {
  if (value === null) {
    return null;
  } else if (typeof value === "string") {
    return value;
  } else if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new RangeError("Only finite numbers (not Infinity or NaN) can be passed as arguments");
    }
    return value;
  } else if (typeof value === "bigint") {
    if (value < minInteger || value > maxInteger) {
      throw new RangeError("This bigint value is too large to be represented as a 64-bit integer and passed as argument");
    }
    return value;
  } else if (typeof value === "boolean") {
    return value ? 1n : 0n;
  } else if (value instanceof ArrayBuffer) {
    return new Uint8Array(value);
  } else if (value instanceof Uint8Array) {
    return value;
  } else if (value instanceof Date) {
    return +value.valueOf();
  } else if (typeof value === "object") {
    return "" + value.toString();
  } else {
    throw new TypeError("Unsupported type of value");
  }
}
var minInteger = -9223372036854775808n;
var maxInteger = 9223372036854775807n;
function valueFromProto(value, intMode) {
  if (value === null) {
    return null;
  } else if (typeof value === "number") {
    return value;
  } else if (typeof value === "string") {
    return value;
  } else if (typeof value === "bigint") {
    if (intMode === "number") {
      const num = Number(value);
      if (!Number.isSafeInteger(num)) {
        throw new RangeError("Received integer which is too large to be safely represented as a JavaScript number");
      }
      return num;
    } else if (intMode === "bigint") {
      return value;
    } else if (intMode === "string") {
      return "" + value;
    } else {
      throw new MisuseError("Invalid value for IntMode");
    }
  } else if (value instanceof Uint8Array) {
    return value.slice().buffer;
  } else if (value === void 0) {
    throw new ProtoError("Received unrecognized type of Value");
  } else {
    throw impossible(value, "Impossible type of Value");
  }
}

// node_modules/@libsql/hrana-client/lib-esm/result.js
function stmtResultFromProto(result) {
  return {
    affectedRowCount: result.affectedRowCount,
    lastInsertRowid: result.lastInsertRowid,
    columnNames: result.cols.map((col) => col.name),
    columnDecltypes: result.cols.map((col) => col.decltype)
  };
}
function rowsResultFromProto(result, intMode) {
  const stmtResult = stmtResultFromProto(result);
  const rows = result.rows.map((row) => rowFromProto(stmtResult.columnNames, row, intMode));
  return { ...stmtResult, rows };
}
function rowResultFromProto(result, intMode) {
  const stmtResult = stmtResultFromProto(result);
  let row;
  if (result.rows.length > 0) {
    row = rowFromProto(stmtResult.columnNames, result.rows[0], intMode);
  }
  return { ...stmtResult, row };
}
function valueResultFromProto(result, intMode) {
  const stmtResult = stmtResultFromProto(result);
  let value;
  if (result.rows.length > 0 && stmtResult.columnNames.length > 0) {
    value = valueFromProto(result.rows[0][0], intMode);
  }
  return { ...stmtResult, value };
}
function rowFromProto(colNames, values, intMode) {
  const row = {};
  Object.defineProperty(row, "length", { value: values.length });
  for (let i = 0; i < values.length; ++i) {
    const value = valueFromProto(values[i], intMode);
    Object.defineProperty(row, i, { value });
    const colName = colNames[i];
    if (colName !== void 0 && !Object.hasOwn(row, colName)) {
      Object.defineProperty(row, colName, { value, enumerable: true, configurable: true, writable: true });
    }
  }
  return row;
}
function errorFromProto(error) {
  return new ResponseError(error.message, error);
}

// node_modules/@libsql/hrana-client/lib-esm/sql.js
var Sql = class {
  #owner;
  #sqlId;
  #closed;
  /** @private */
  constructor(owner, sqlId) {
    this.#owner = owner;
    this.#sqlId = sqlId;
    this.#closed = void 0;
  }
  /** @private */
  _getSqlId(owner) {
    if (this.#owner !== owner) {
      throw new MisuseError("Attempted to use SQL text opened with other object");
    } else if (this.#closed !== void 0) {
      throw new ClosedError("SQL text is closed", this.#closed);
    }
    return this.#sqlId;
  }
  /** Remove the SQL text from the server, releasing resouces. */
  close() {
    this._setClosed(new ClientError("SQL text was manually closed"));
  }
  /** @private */
  _setClosed(error) {
    if (this.#closed === void 0) {
      this.#closed = error;
      this.#owner._closeSql(this.#sqlId);
    }
  }
  /** True if the SQL text is closed (removed from the server). */
  get closed() {
    return this.#closed !== void 0;
  }
};
function sqlToProto(owner, sql) {
  if (sql instanceof Sql) {
    return { sqlId: sql._getSqlId(owner) };
  } else {
    return { sql: "" + sql };
  }
}

// node_modules/@libsql/hrana-client/lib-esm/queue.js
var Queue = class {
  #pushStack;
  #shiftStack;
  constructor() {
    this.#pushStack = [];
    this.#shiftStack = [];
  }
  get length() {
    return this.#pushStack.length + this.#shiftStack.length;
  }
  push(elem) {
    this.#pushStack.push(elem);
  }
  shift() {
    if (this.#shiftStack.length === 0 && this.#pushStack.length > 0) {
      this.#shiftStack = this.#pushStack.reverse();
      this.#pushStack = [];
    }
    return this.#shiftStack.pop();
  }
  first() {
    return this.#shiftStack.length !== 0 ? this.#shiftStack[this.#shiftStack.length - 1] : this.#pushStack[0];
  }
};

// node_modules/@libsql/hrana-client/lib-esm/stmt.js
var Stmt = class {
  /** The SQL statement text. */
  sql;
  /** @private */
  _args;
  /** @private */
  _namedArgs;
  /** Initialize the statement with given SQL text. */
  constructor(sql) {
    this.sql = sql;
    this._args = [];
    this._namedArgs = /* @__PURE__ */ new Map();
  }
  /** Binds positional parameters from the given `values`. All previous positional bindings are cleared. */
  bindIndexes(values) {
    this._args.length = 0;
    for (const value of values) {
      this._args.push(valueToProto(value));
    }
    return this;
  }
  /** Binds a parameter by a 1-based index. */
  bindIndex(index, value) {
    if (index !== (index | 0) || index <= 0) {
      throw new RangeError("Index of a positional argument must be positive integer");
    }
    while (this._args.length < index) {
      this._args.push(null);
    }
    this._args[index - 1] = valueToProto(value);
    return this;
  }
  /** Binds a parameter by name. */
  bindName(name, value) {
    this._namedArgs.set(name, valueToProto(value));
    return this;
  }
  /** Clears all bindings. */
  unbindAll() {
    this._args.length = 0;
    this._namedArgs.clear();
    return this;
  }
};
function stmtToProto(sqlOwner, stmt, wantRows) {
  let inSql;
  let args = [];
  let namedArgs = [];
  if (stmt instanceof Stmt) {
    inSql = stmt.sql;
    args = stmt._args;
    for (const [name, value] of stmt._namedArgs.entries()) {
      namedArgs.push({ name, value });
    }
  } else if (Array.isArray(stmt)) {
    inSql = stmt[0];
    if (Array.isArray(stmt[1])) {
      args = stmt[1].map((arg) => valueToProto(arg));
    } else {
      namedArgs = Object.entries(stmt[1]).map(([name, value]) => {
        return { name, value: valueToProto(value) };
      });
    }
  } else {
    inSql = stmt;
  }
  const { sql, sqlId } = sqlToProto(sqlOwner, inSql);
  return { sql, sqlId, args, namedArgs, wantRows };
}

// node_modules/@libsql/hrana-client/lib-esm/batch.js
var Batch = class {
  /** @private */
  _stream;
  #useCursor;
  /** @private */
  _steps;
  #executed;
  /** @private */
  constructor(stream, useCursor) {
    this._stream = stream;
    this.#useCursor = useCursor;
    this._steps = [];
    this.#executed = false;
  }
  /** Return a builder for adding a step to the batch. */
  step() {
    return new BatchStep(this);
  }
  /** Execute the batch. */
  execute() {
    if (this.#executed) {
      throw new MisuseError("This batch has already been executed");
    }
    this.#executed = true;
    const batch = {
      steps: this._steps.map((step) => step.proto)
    };
    if (this.#useCursor) {
      return executeCursor(this._stream, this._steps, batch);
    } else {
      return executeRegular(this._stream, this._steps, batch);
    }
  }
};
function executeRegular(stream, steps, batch) {
  return stream._batch(batch).then((result) => {
    for (let step = 0; step < steps.length; ++step) {
      const stepResult = result.stepResults.get(step);
      const stepError = result.stepErrors.get(step);
      steps[step].callback(stepResult, stepError);
    }
  });
}
async function executeCursor(stream, steps, batch) {
  const cursor = await stream._openCursor(batch);
  try {
    let nextStep = 0;
    let beginEntry = void 0;
    let rows = [];
    for (; ; ) {
      const entry = await cursor.next();
      if (entry === void 0) {
        break;
      }
      if (entry.type === "step_begin") {
        if (entry.step < nextStep || entry.step >= steps.length) {
          throw new ProtoError("Server produced StepBeginEntry for unexpected step");
        } else if (beginEntry !== void 0) {
          throw new ProtoError("Server produced StepBeginEntry before terminating previous step");
        }
        for (let step = nextStep; step < entry.step; ++step) {
          steps[step].callback(void 0, void 0);
        }
        nextStep = entry.step + 1;
        beginEntry = entry;
        rows = [];
      } else if (entry.type === "step_end") {
        if (beginEntry === void 0) {
          throw new ProtoError("Server produced StepEndEntry but no step is active");
        }
        const stmtResult = {
          cols: beginEntry.cols,
          rows,
          affectedRowCount: entry.affectedRowCount,
          lastInsertRowid: entry.lastInsertRowid
        };
        steps[beginEntry.step].callback(stmtResult, void 0);
        beginEntry = void 0;
        rows = [];
      } else if (entry.type === "step_error") {
        if (beginEntry === void 0) {
          if (entry.step >= steps.length) {
            throw new ProtoError("Server produced StepErrorEntry for unexpected step");
          }
          for (let step = nextStep; step < entry.step; ++step) {
            steps[step].callback(void 0, void 0);
          }
        } else {
          if (entry.step !== beginEntry.step) {
            throw new ProtoError("Server produced StepErrorEntry for unexpected step");
          }
          beginEntry = void 0;
          rows = [];
        }
        steps[entry.step].callback(void 0, entry.error);
        nextStep = entry.step + 1;
      } else if (entry.type === "row") {
        if (beginEntry === void 0) {
          throw new ProtoError("Server produced RowEntry but no step is active");
        }
        rows.push(entry.row);
      } else if (entry.type === "error") {
        throw errorFromProto(entry.error);
      } else if (entry.type === "none") {
        throw new ProtoError("Server produced unrecognized CursorEntry");
      } else {
        throw impossible(entry, "Impossible CursorEntry");
      }
    }
    if (beginEntry !== void 0) {
      throw new ProtoError("Server closed Cursor before terminating active step");
    }
    for (let step = nextStep; step < steps.length; ++step) {
      steps[step].callback(void 0, void 0);
    }
  } finally {
    cursor.close();
  }
}
var BatchStep = class {
  /** @private */
  _batch;
  #conds;
  /** @private */
  _index;
  /** @private */
  constructor(batch) {
    this._batch = batch;
    this.#conds = [];
    this._index = void 0;
  }
  /** Add the condition that needs to be satisfied to execute the statement. If you use this method multiple
   * times, we join the conditions with a logical AND. */
  condition(cond) {
    this.#conds.push(cond._proto);
    return this;
  }
  /** Add a statement that returns rows. */
  query(stmt) {
    return this.#add(stmt, true, rowsResultFromProto);
  }
  /** Add a statement that returns at most a single row. */
  queryRow(stmt) {
    return this.#add(stmt, true, rowResultFromProto);
  }
  /** Add a statement that returns at most a single value. */
  queryValue(stmt) {
    return this.#add(stmt, true, valueResultFromProto);
  }
  /** Add a statement without returning rows. */
  run(stmt) {
    return this.#add(stmt, false, stmtResultFromProto);
  }
  #add(inStmt, wantRows, fromProto) {
    if (this._index !== void 0) {
      throw new MisuseError("This BatchStep has already been added to the batch");
    }
    const stmt = stmtToProto(this._batch._stream._sqlOwner(), inStmt, wantRows);
    let condition;
    if (this.#conds.length === 0) {
      condition = void 0;
    } else if (this.#conds.length === 1) {
      condition = this.#conds[0];
    } else {
      condition = { type: "and", conds: this.#conds.slice() };
    }
    const proto = { stmt, condition };
    return new Promise((outputCallback, errorCallback) => {
      const callback = (stepResult, stepError) => {
        if (stepResult !== void 0 && stepError !== void 0) {
          errorCallback(new ProtoError("Server returned both result and error"));
        } else if (stepError !== void 0) {
          errorCallback(errorFromProto(stepError));
        } else if (stepResult !== void 0) {
          outputCallback(fromProto(stepResult, this._batch._stream.intMode));
        } else {
          outputCallback(void 0);
        }
      };
      this._index = this._batch._steps.length;
      this._batch._steps.push({ proto, callback });
    });
  }
};
var BatchCond = class _BatchCond {
  /** @private */
  _batch;
  /** @private */
  _proto;
  /** @private */
  constructor(batch, proto) {
    this._batch = batch;
    this._proto = proto;
  }
  /** Create a condition that evaluates to true when the given step executes successfully.
   *
   * If the given step fails error or is skipped because its condition evaluated to false, this
   * condition evaluates to false.
   */
  static ok(step) {
    return new _BatchCond(step._batch, { type: "ok", step: stepIndex(step) });
  }
  /** Create a condition that evaluates to true when the given step fails.
   *
   * If the given step succeeds or is skipped because its condition evaluated to false, this condition
   * evaluates to false.
   */
  static error(step) {
    return new _BatchCond(step._batch, { type: "error", step: stepIndex(step) });
  }
  /** Create a condition that is a logical negation of another condition.
   */
  static not(cond) {
    return new _BatchCond(cond._batch, { type: "not", cond: cond._proto });
  }
  /** Create a condition that is a logical AND of other conditions.
   */
  static and(batch, conds) {
    for (const cond of conds) {
      checkCondBatch(batch, cond);
    }
    return new _BatchCond(batch, { type: "and", conds: conds.map((e) => e._proto) });
  }
  /** Create a condition that is a logical OR of other conditions.
   */
  static or(batch, conds) {
    for (const cond of conds) {
      checkCondBatch(batch, cond);
    }
    return new _BatchCond(batch, { type: "or", conds: conds.map((e) => e._proto) });
  }
  /** Create a condition that evaluates to true when the SQL connection is in autocommit mode (not inside an
   * explicit transaction). This requires protocol version 3 or higher.
   */
  static isAutocommit(batch) {
    batch._stream.client()._ensureVersion(3, "BatchCond.isAutocommit()");
    return new _BatchCond(batch, { type: "is_autocommit" });
  }
};
function stepIndex(step) {
  if (step._index === void 0) {
    throw new MisuseError("Cannot add a condition referencing a step that has not been added to the batch");
  }
  return step._index;
}
function checkCondBatch(expectedBatch, cond) {
  if (cond._batch !== expectedBatch) {
    throw new MisuseError("Cannot mix BatchCond objects for different Batch objects");
  }
}

// node_modules/@libsql/hrana-client/lib-esm/describe.js
function describeResultFromProto(result) {
  return {
    paramNames: result.params.map((p) => p.name),
    columns: result.cols,
    isExplain: result.isExplain,
    isReadonly: result.isReadonly
  };
}

// node_modules/@libsql/hrana-client/lib-esm/stream.js
var Stream = class {
  /** @private */
  constructor(intMode) {
    this.intMode = intMode;
  }
  /** Execute a statement and return rows. */
  query(stmt) {
    return this.#execute(stmt, true, rowsResultFromProto);
  }
  /** Execute a statement and return at most a single row. */
  queryRow(stmt) {
    return this.#execute(stmt, true, rowResultFromProto);
  }
  /** Execute a statement and return at most a single value. */
  queryValue(stmt) {
    return this.#execute(stmt, true, valueResultFromProto);
  }
  /** Execute a statement without returning rows. */
  run(stmt) {
    return this.#execute(stmt, false, stmtResultFromProto);
  }
  #execute(inStmt, wantRows, fromProto) {
    const stmt = stmtToProto(this._sqlOwner(), inStmt, wantRows);
    return this._execute(stmt).then((r) => fromProto(r, this.intMode));
  }
  /** Return a builder for creating and executing a batch.
   *
   * If `useCursor` is true, the batch will be executed using a Hrana cursor, which will stream results from
   * the server to the client, which consumes less memory on the server. This requires protocol version 3 or
   * higher.
   */
  batch(useCursor = false) {
    return new Batch(this, useCursor);
  }
  /** Parse and analyze a statement. This requires protocol version 2 or higher. */
  describe(inSql) {
    const protoSql = sqlToProto(this._sqlOwner(), inSql);
    return this._describe(protoSql).then(describeResultFromProto);
  }
  /** Execute a sequence of statements separated by semicolons. This requires protocol version 2 or higher.
   * */
  sequence(inSql) {
    const protoSql = sqlToProto(this._sqlOwner(), inSql);
    return this._sequence(protoSql);
  }
  /** Representation of integers returned from the database. See {@link IntMode}.
   *
   * This value affects the results of all operations on this stream.
   */
  intMode;
};

// node_modules/@libsql/hrana-client/lib-esm/cursor.js
var Cursor = class {
};

// node_modules/@libsql/hrana-client/lib-esm/ws/cursor.js
var fetchChunkSize = 1e3;
var fetchQueueSize = 10;
var WsCursor = class extends Cursor {
  #client;
  #stream;
  #cursorId;
  #entryQueue;
  #fetchQueue;
  #closed;
  #done;
  /** @private */
  constructor(client, stream, cursorId) {
    super();
    this.#client = client;
    this.#stream = stream;
    this.#cursorId = cursorId;
    this.#entryQueue = new Queue();
    this.#fetchQueue = new Queue();
    this.#closed = void 0;
    this.#done = false;
  }
  /** Fetch the next entry from the cursor. */
  async next() {
    for (; ; ) {
      if (this.#closed !== void 0) {
        throw new ClosedError("Cursor is closed", this.#closed);
      }
      while (!this.#done && this.#fetchQueue.length < fetchQueueSize) {
        this.#fetchQueue.push(this.#fetch());
      }
      const entry = this.#entryQueue.shift();
      if (this.#done || entry !== void 0) {
        return entry;
      }
      await this.#fetchQueue.shift().then((response) => {
        if (response === void 0) {
          return;
        }
        for (const entry2 of response.entries) {
          this.#entryQueue.push(entry2);
        }
        this.#done ||= response.done;
      });
    }
  }
  #fetch() {
    return this.#stream._sendCursorRequest(this, {
      type: "fetch_cursor",
      cursorId: this.#cursorId,
      maxCount: fetchChunkSize
    }).then((resp) => resp, (error) => {
      this._setClosed(error);
      return void 0;
    });
  }
  /** @private */
  _setClosed(error) {
    if (this.#closed !== void 0) {
      return;
    }
    this.#closed = error;
    this.#stream._sendCursorRequest(this, {
      type: "close_cursor",
      cursorId: this.#cursorId
    }).catch(() => void 0);
    this.#stream._cursorClosed(this);
  }
  /** Close the cursor. */
  close() {
    this._setClosed(new ClientError("Cursor was manually closed"));
  }
  /** True if the cursor is closed. */
  get closed() {
    return this.#closed !== void 0;
  }
};

// node_modules/@libsql/hrana-client/lib-esm/ws/stream.js
var WsStream = class _WsStream extends Stream {
  #client;
  #streamId;
  #queue;
  #cursor;
  #closing;
  #closed;
  /** @private */
  static open(client) {
    const streamId = client._streamIdAlloc.alloc();
    const stream = new _WsStream(client, streamId);
    const responseCallback = () => void 0;
    const errorCallback = (e) => stream.#setClosed(e);
    const request = { type: "open_stream", streamId };
    client._sendRequest(request, { responseCallback, errorCallback });
    return stream;
  }
  /** @private */
  constructor(client, streamId) {
    super(client.intMode);
    this.#client = client;
    this.#streamId = streamId;
    this.#queue = new Queue();
    this.#cursor = void 0;
    this.#closing = false;
    this.#closed = void 0;
  }
  /** Get the {@link WsClient} object that this stream belongs to. */
  client() {
    return this.#client;
  }
  /** @private */
  _sqlOwner() {
    return this.#client;
  }
  /** @private */
  _execute(stmt) {
    return this.#sendStreamRequest({
      type: "execute",
      streamId: this.#streamId,
      stmt
    }).then((response) => {
      return response.result;
    });
  }
  /** @private */
  _batch(batch) {
    return this.#sendStreamRequest({
      type: "batch",
      streamId: this.#streamId,
      batch
    }).then((response) => {
      return response.result;
    });
  }
  /** @private */
  _describe(protoSql) {
    this.#client._ensureVersion(2, "describe()");
    return this.#sendStreamRequest({
      type: "describe",
      streamId: this.#streamId,
      sql: protoSql.sql,
      sqlId: protoSql.sqlId
    }).then((response) => {
      return response.result;
    });
  }
  /** @private */
  _sequence(protoSql) {
    this.#client._ensureVersion(2, "sequence()");
    return this.#sendStreamRequest({
      type: "sequence",
      streamId: this.#streamId,
      sql: protoSql.sql,
      sqlId: protoSql.sqlId
    }).then((_response) => {
      return void 0;
    });
  }
  /** Check whether the SQL connection underlying this stream is in autocommit state (i.e., outside of an
   * explicit transaction). This requires protocol version 3 or higher.
   */
  getAutocommit() {
    this.#client._ensureVersion(3, "getAutocommit()");
    return this.#sendStreamRequest({
      type: "get_autocommit",
      streamId: this.#streamId
    }).then((response) => {
      return response.isAutocommit;
    });
  }
  #sendStreamRequest(request) {
    return new Promise((responseCallback, errorCallback) => {
      this.#pushToQueue({ type: "request", request, responseCallback, errorCallback });
    });
  }
  /** @private */
  _openCursor(batch) {
    this.#client._ensureVersion(3, "cursor");
    return new Promise((cursorCallback, errorCallback) => {
      this.#pushToQueue({ type: "cursor", batch, cursorCallback, errorCallback });
    });
  }
  /** @private */
  _sendCursorRequest(cursor, request) {
    if (cursor !== this.#cursor) {
      throw new InternalError("Cursor not associated with the stream attempted to execute a request");
    }
    return new Promise((responseCallback, errorCallback) => {
      if (this.#closed !== void 0) {
        errorCallback(new ClosedError("Stream is closed", this.#closed));
      } else {
        this.#client._sendRequest(request, { responseCallback, errorCallback });
      }
    });
  }
  /** @private */
  _cursorClosed(cursor) {
    if (cursor !== this.#cursor) {
      throw new InternalError("Cursor was closed, but it was not associated with the stream");
    }
    this.#cursor = void 0;
    this.#flushQueue();
  }
  #pushToQueue(entry) {
    if (this.#closed !== void 0) {
      entry.errorCallback(new ClosedError("Stream is closed", this.#closed));
    } else if (this.#closing) {
      entry.errorCallback(new ClosedError("Stream is closing", void 0));
    } else {
      this.#queue.push(entry);
      this.#flushQueue();
    }
  }
  #flushQueue() {
    for (; ; ) {
      const entry = this.#queue.first();
      if (entry === void 0 && this.#cursor === void 0 && this.#closing) {
        this.#setClosed(new ClientError("Stream was gracefully closed"));
        break;
      } else if (entry?.type === "request" && this.#cursor === void 0) {
        const { request, responseCallback, errorCallback } = entry;
        this.#queue.shift();
        this.#client._sendRequest(request, { responseCallback, errorCallback });
      } else if (entry?.type === "cursor" && this.#cursor === void 0) {
        const { batch, cursorCallback } = entry;
        this.#queue.shift();
        const cursorId = this.#client._cursorIdAlloc.alloc();
        const cursor = new WsCursor(this.#client, this, cursorId);
        const request = {
          type: "open_cursor",
          streamId: this.#streamId,
          cursorId,
          batch
        };
        const responseCallback = () => void 0;
        const errorCallback = (e) => cursor._setClosed(e);
        this.#client._sendRequest(request, { responseCallback, errorCallback });
        this.#cursor = cursor;
        cursorCallback(cursor);
      } else {
        break;
      }
    }
  }
  #setClosed(error) {
    if (this.#closed !== void 0) {
      return;
    }
    this.#closed = error;
    if (this.#cursor !== void 0) {
      this.#cursor._setClosed(error);
    }
    for (; ; ) {
      const entry = this.#queue.shift();
      if (entry !== void 0) {
        entry.errorCallback(error);
      } else {
        break;
      }
    }
    const request = { type: "close_stream", streamId: this.#streamId };
    const responseCallback = () => this.#client._streamIdAlloc.free(this.#streamId);
    const errorCallback = () => void 0;
    this.#client._sendRequest(request, { responseCallback, errorCallback });
  }
  /** Immediately close the stream. */
  close() {
    this.#setClosed(new ClientError("Stream was manually closed"));
  }
  /** Gracefully close the stream. */
  closeGracefully() {
    this.#closing = true;
    this.#flushQueue();
  }
  /** True if the stream is closed or closing. */
  get closed() {
    return this.#closed !== void 0 || this.#closing;
  }
};

// node_modules/@libsql/hrana-client/lib-esm/shared/json_encode.js
function Stmt2(w, msg) {
  if (msg.sql !== void 0) {
    w.string("sql", msg.sql);
  }
  if (msg.sqlId !== void 0) {
    w.number("sql_id", msg.sqlId);
  }
  w.arrayObjects("args", msg.args, Value);
  w.arrayObjects("named_args", msg.namedArgs, NamedArg);
  w.boolean("want_rows", msg.wantRows);
}
function NamedArg(w, msg) {
  w.string("name", msg.name);
  w.object("value", msg.value, Value);
}
function Batch2(w, msg) {
  w.arrayObjects("steps", msg.steps, BatchStep2);
}
function BatchStep2(w, msg) {
  if (msg.condition !== void 0) {
    w.object("condition", msg.condition, BatchCond2);
  }
  w.object("stmt", msg.stmt, Stmt2);
}
function BatchCond2(w, msg) {
  w.stringRaw("type", msg.type);
  if (msg.type === "ok" || msg.type === "error") {
    w.number("step", msg.step);
  } else if (msg.type === "not") {
    w.object("cond", msg.cond, BatchCond2);
  } else if (msg.type === "and" || msg.type === "or") {
    w.arrayObjects("conds", msg.conds, BatchCond2);
  } else if (msg.type === "is_autocommit") {
  } else {
    throw impossible(msg, "Impossible type of BatchCond");
  }
}
function Value(w, msg) {
  if (msg === null) {
    w.stringRaw("type", "null");
  } else if (typeof msg === "bigint") {
    w.stringRaw("type", "integer");
    w.stringRaw("value", "" + msg);
  } else if (typeof msg === "number") {
    w.stringRaw("type", "float");
    w.number("value", msg);
  } else if (typeof msg === "string") {
    w.stringRaw("type", "text");
    w.string("value", msg);
  } else if (msg instanceof Uint8Array) {
    w.stringRaw("type", "blob");
    w.stringRaw("base64", gBase64.fromUint8Array(msg));
  } else if (msg === void 0) {
  } else {
    throw impossible(msg, "Impossible type of Value");
  }
}

// node_modules/@libsql/hrana-client/lib-esm/ws/json_encode.js
function ClientMsg(w, msg) {
  w.stringRaw("type", msg.type);
  if (msg.type === "hello") {
    if (msg.jwt !== void 0) {
      w.string("jwt", msg.jwt);
    }
  } else if (msg.type === "request") {
    w.number("request_id", msg.requestId);
    w.object("request", msg.request, Request2);
  } else {
    throw impossible(msg, "Impossible type of ClientMsg");
  }
}
function Request2(w, msg) {
  w.stringRaw("type", msg.type);
  if (msg.type === "open_stream") {
    w.number("stream_id", msg.streamId);
  } else if (msg.type === "close_stream") {
    w.number("stream_id", msg.streamId);
  } else if (msg.type === "execute") {
    w.number("stream_id", msg.streamId);
    w.object("stmt", msg.stmt, Stmt2);
  } else if (msg.type === "batch") {
    w.number("stream_id", msg.streamId);
    w.object("batch", msg.batch, Batch2);
  } else if (msg.type === "open_cursor") {
    w.number("stream_id", msg.streamId);
    w.number("cursor_id", msg.cursorId);
    w.object("batch", msg.batch, Batch2);
  } else if (msg.type === "close_cursor") {
    w.number("cursor_id", msg.cursorId);
  } else if (msg.type === "fetch_cursor") {
    w.number("cursor_id", msg.cursorId);
    w.number("max_count", msg.maxCount);
  } else if (msg.type === "sequence") {
    w.number("stream_id", msg.streamId);
    if (msg.sql !== void 0) {
      w.string("sql", msg.sql);
    }
    if (msg.sqlId !== void 0) {
      w.number("sql_id", msg.sqlId);
    }
  } else if (msg.type === "describe") {
    w.number("stream_id", msg.streamId);
    if (msg.sql !== void 0) {
      w.string("sql", msg.sql);
    }
    if (msg.sqlId !== void 0) {
      w.number("sql_id", msg.sqlId);
    }
  } else if (msg.type === "store_sql") {
    w.number("sql_id", msg.sqlId);
    w.string("sql", msg.sql);
  } else if (msg.type === "close_sql") {
    w.number("sql_id", msg.sqlId);
  } else if (msg.type === "get_autocommit") {
    w.number("stream_id", msg.streamId);
  } else {
    throw impossible(msg, "Impossible type of Request");
  }
}

// node_modules/@libsql/hrana-client/lib-esm/shared/protobuf_encode.js
function Stmt3(w, msg) {
  if (msg.sql !== void 0) {
    w.string(1, msg.sql);
  }
  if (msg.sqlId !== void 0) {
    w.int32(2, msg.sqlId);
  }
  for (const arg of msg.args) {
    w.message(3, arg, Value2);
  }
  for (const arg of msg.namedArgs) {
    w.message(4, arg, NamedArg2);
  }
  w.bool(5, msg.wantRows);
}
function NamedArg2(w, msg) {
  w.string(1, msg.name);
  w.message(2, msg.value, Value2);
}
function Batch3(w, msg) {
  for (const step of msg.steps) {
    w.message(1, step, BatchStep3);
  }
}
function BatchStep3(w, msg) {
  if (msg.condition !== void 0) {
    w.message(1, msg.condition, BatchCond3);
  }
  w.message(2, msg.stmt, Stmt3);
}
function BatchCond3(w, msg) {
  if (msg.type === "ok") {
    w.uint32(1, msg.step);
  } else if (msg.type === "error") {
    w.uint32(2, msg.step);
  } else if (msg.type === "not") {
    w.message(3, msg.cond, BatchCond3);
  } else if (msg.type === "and") {
    w.message(4, msg.conds, BatchCondList);
  } else if (msg.type === "or") {
    w.message(5, msg.conds, BatchCondList);
  } else if (msg.type === "is_autocommit") {
    w.message(6, void 0, Empty);
  } else {
    throw impossible(msg, "Impossible type of BatchCond");
  }
}
function BatchCondList(w, msg) {
  for (const cond of msg) {
    w.message(1, cond, BatchCond3);
  }
}
function Value2(w, msg) {
  if (msg === null) {
    w.message(1, void 0, Empty);
  } else if (typeof msg === "bigint") {
    w.sint64(2, msg);
  } else if (typeof msg === "number") {
    w.double(3, msg);
  } else if (typeof msg === "string") {
    w.string(4, msg);
  } else if (msg instanceof Uint8Array) {
    w.bytes(5, msg);
  } else if (msg === void 0) {
  } else {
    throw impossible(msg, "Impossible type of Value");
  }
}
function Empty(_w, _msg) {
}

// node_modules/@libsql/hrana-client/lib-esm/ws/protobuf_encode.js
function ClientMsg2(w, msg) {
  if (msg.type === "hello") {
    w.message(1, msg, HelloMsg);
  } else if (msg.type === "request") {
    w.message(2, msg, RequestMsg);
  } else {
    throw impossible(msg, "Impossible type of ClientMsg");
  }
}
function HelloMsg(w, msg) {
  if (msg.jwt !== void 0) {
    w.string(1, msg.jwt);
  }
}
function RequestMsg(w, msg) {
  w.int32(1, msg.requestId);
  const request = msg.request;
  if (request.type === "open_stream") {
    w.message(2, request, OpenStreamReq);
  } else if (request.type === "close_stream") {
    w.message(3, request, CloseStreamReq);
  } else if (request.type === "execute") {
    w.message(4, request, ExecuteReq);
  } else if (request.type === "batch") {
    w.message(5, request, BatchReq);
  } else if (request.type === "open_cursor") {
    w.message(6, request, OpenCursorReq);
  } else if (request.type === "close_cursor") {
    w.message(7, request, CloseCursorReq);
  } else if (request.type === "fetch_cursor") {
    w.message(8, request, FetchCursorReq);
  } else if (request.type === "sequence") {
    w.message(9, request, SequenceReq);
  } else if (request.type === "describe") {
    w.message(10, request, DescribeReq);
  } else if (request.type === "store_sql") {
    w.message(11, request, StoreSqlReq);
  } else if (request.type === "close_sql") {
    w.message(12, request, CloseSqlReq);
  } else if (request.type === "get_autocommit") {
    w.message(13, request, GetAutocommitReq);
  } else {
    throw impossible(request, "Impossible type of Request");
  }
}
function OpenStreamReq(w, msg) {
  w.int32(1, msg.streamId);
}
function CloseStreamReq(w, msg) {
  w.int32(1, msg.streamId);
}
function ExecuteReq(w, msg) {
  w.int32(1, msg.streamId);
  w.message(2, msg.stmt, Stmt3);
}
function BatchReq(w, msg) {
  w.int32(1, msg.streamId);
  w.message(2, msg.batch, Batch3);
}
function OpenCursorReq(w, msg) {
  w.int32(1, msg.streamId);
  w.int32(2, msg.cursorId);
  w.message(3, msg.batch, Batch3);
}
function CloseCursorReq(w, msg) {
  w.int32(1, msg.cursorId);
}
function FetchCursorReq(w, msg) {
  w.int32(1, msg.cursorId);
  w.uint32(2, msg.maxCount);
}
function SequenceReq(w, msg) {
  w.int32(1, msg.streamId);
  if (msg.sql !== void 0) {
    w.string(2, msg.sql);
  }
  if (msg.sqlId !== void 0) {
    w.int32(3, msg.sqlId);
  }
}
function DescribeReq(w, msg) {
  w.int32(1, msg.streamId);
  if (msg.sql !== void 0) {
    w.string(2, msg.sql);
  }
  if (msg.sqlId !== void 0) {
    w.int32(3, msg.sqlId);
  }
}
function StoreSqlReq(w, msg) {
  w.int32(1, msg.sqlId);
  w.string(2, msg.sql);
}
function CloseSqlReq(w, msg) {
  w.int32(1, msg.sqlId);
}
function GetAutocommitReq(w, msg) {
  w.int32(1, msg.streamId);
}

// node_modules/@libsql/hrana-client/lib-esm/shared/json_decode.js
function Error2(obj) {
  const message = string(obj["message"]);
  const code = stringOpt(obj["code"]);
  return { message, code };
}
function StmtResult(obj) {
  const cols = arrayObjectsMap(obj["cols"], Col);
  const rows = array(obj["rows"]).map((rowObj) => arrayObjectsMap(rowObj, Value3));
  const affectedRowCount = number(obj["affected_row_count"]);
  const lastInsertRowidStr = stringOpt(obj["last_insert_rowid"]);
  const lastInsertRowid = lastInsertRowidStr !== void 0 ? BigInt(lastInsertRowidStr) : void 0;
  return { cols, rows, affectedRowCount, lastInsertRowid };
}
function Col(obj) {
  const name = stringOpt(obj["name"]);
  const decltype = stringOpt(obj["decltype"]);
  return { name, decltype };
}
function BatchResult(obj) {
  const stepResults = /* @__PURE__ */ new Map();
  array(obj["step_results"]).forEach((value, i) => {
    if (value !== null) {
      stepResults.set(i, StmtResult(object(value)));
    }
  });
  const stepErrors = /* @__PURE__ */ new Map();
  array(obj["step_errors"]).forEach((value, i) => {
    if (value !== null) {
      stepErrors.set(i, Error2(object(value)));
    }
  });
  return { stepResults, stepErrors };
}
function CursorEntry(obj) {
  const type = string(obj["type"]);
  if (type === "step_begin") {
    const step = number(obj["step"]);
    const cols = arrayObjectsMap(obj["cols"], Col);
    return { type: "step_begin", step, cols };
  } else if (type === "step_end") {
    const affectedRowCount = number(obj["affected_row_count"]);
    const lastInsertRowidStr = stringOpt(obj["last_insert_rowid"]);
    const lastInsertRowid = lastInsertRowidStr !== void 0 ? BigInt(lastInsertRowidStr) : void 0;
    return { type: "step_end", affectedRowCount, lastInsertRowid };
  } else if (type === "step_error") {
    const step = number(obj["step"]);
    const error = Error2(object(obj["error"]));
    return { type: "step_error", step, error };
  } else if (type === "row") {
    const row = arrayObjectsMap(obj["row"], Value3);
    return { type: "row", row };
  } else if (type === "error") {
    const error = Error2(object(obj["error"]));
    return { type: "error", error };
  } else {
    throw new ProtoError("Unexpected type of CursorEntry");
  }
}
function DescribeResult(obj) {
  const params = arrayObjectsMap(obj["params"], DescribeParam);
  const cols = arrayObjectsMap(obj["cols"], DescribeCol);
  const isExplain = boolean(obj["is_explain"]);
  const isReadonly = boolean(obj["is_readonly"]);
  return { params, cols, isExplain, isReadonly };
}
function DescribeParam(obj) {
  const name = stringOpt(obj["name"]);
  return { name };
}
function DescribeCol(obj) {
  const name = string(obj["name"]);
  const decltype = stringOpt(obj["decltype"]);
  return { name, decltype };
}
function Value3(obj) {
  const type = string(obj["type"]);
  if (type === "null") {
    return null;
  } else if (type === "integer") {
    const value = string(obj["value"]);
    return BigInt(value);
  } else if (type === "float") {
    return number(obj["value"]);
  } else if (type === "text") {
    return string(obj["value"]);
  } else if (type === "blob") {
    return gBase64.toUint8Array(string(obj["base64"]));
  } else {
    throw new ProtoError("Unexpected type of Value");
  }
}

// node_modules/@libsql/hrana-client/lib-esm/ws/json_decode.js
function ServerMsg(obj) {
  const type = string(obj["type"]);
  if (type === "hello_ok") {
    return { type: "hello_ok" };
  } else if (type === "hello_error") {
    const error = Error2(object(obj["error"]));
    return { type: "hello_error", error };
  } else if (type === "response_ok") {
    const requestId = number(obj["request_id"]);
    const response = Response2(object(obj["response"]));
    return { type: "response_ok", requestId, response };
  } else if (type === "response_error") {
    const requestId = number(obj["request_id"]);
    const error = Error2(object(obj["error"]));
    return { type: "response_error", requestId, error };
  } else {
    throw new ProtoError("Unexpected type of ServerMsg");
  }
}
function Response2(obj) {
  const type = string(obj["type"]);
  if (type === "open_stream") {
    return { type: "open_stream" };
  } else if (type === "close_stream") {
    return { type: "close_stream" };
  } else if (type === "execute") {
    const result = StmtResult(object(obj["result"]));
    return { type: "execute", result };
  } else if (type === "batch") {
    const result = BatchResult(object(obj["result"]));
    return { type: "batch", result };
  } else if (type === "open_cursor") {
    return { type: "open_cursor" };
  } else if (type === "close_cursor") {
    return { type: "close_cursor" };
  } else if (type === "fetch_cursor") {
    const entries = arrayObjectsMap(obj["entries"], CursorEntry);
    const done = boolean(obj["done"]);
    return { type: "fetch_cursor", entries, done };
  } else if (type === "sequence") {
    return { type: "sequence" };
  } else if (type === "describe") {
    const result = DescribeResult(object(obj["result"]));
    return { type: "describe", result };
  } else if (type === "store_sql") {
    return { type: "store_sql" };
  } else if (type === "close_sql") {
    return { type: "close_sql" };
  } else if (type === "get_autocommit") {
    const isAutocommit = boolean(obj["is_autocommit"]);
    return { type: "get_autocommit", isAutocommit };
  } else {
    throw new ProtoError("Unexpected type of Response");
  }
}

// node_modules/@libsql/hrana-client/lib-esm/shared/protobuf_decode.js
var Error3 = {
  default() {
    return { message: "", code: void 0 };
  },
  1(r, msg) {
    msg.message = r.string();
  },
  2(r, msg) {
    msg.code = r.string();
  }
};
var StmtResult2 = {
  default() {
    return {
      cols: [],
      rows: [],
      affectedRowCount: 0,
      lastInsertRowid: void 0
    };
  },
  1(r, msg) {
    msg.cols.push(r.message(Col2));
  },
  2(r, msg) {
    msg.rows.push(r.message(Row));
  },
  3(r, msg) {
    msg.affectedRowCount = Number(r.uint64());
  },
  4(r, msg) {
    msg.lastInsertRowid = r.sint64();
  }
};
var Col2 = {
  default() {
    return { name: void 0, decltype: void 0 };
  },
  1(r, msg) {
    msg.name = r.string();
  },
  2(r, msg) {
    msg.decltype = r.string();
  }
};
var Row = {
  default() {
    return [];
  },
  1(r, msg) {
    msg.push(r.message(Value4));
  }
};
var BatchResult2 = {
  default() {
    return { stepResults: /* @__PURE__ */ new Map(), stepErrors: /* @__PURE__ */ new Map() };
  },
  1(r, msg) {
    const [key, value] = r.message(BatchResultStepResult);
    msg.stepResults.set(key, value);
  },
  2(r, msg) {
    const [key, value] = r.message(BatchResultStepError);
    msg.stepErrors.set(key, value);
  }
};
var BatchResultStepResult = {
  default() {
    return [0, StmtResult2.default()];
  },
  1(r, msg) {
    msg[0] = r.uint32();
  },
  2(r, msg) {
    msg[1] = r.message(StmtResult2);
  }
};
var BatchResultStepError = {
  default() {
    return [0, Error3.default()];
  },
  1(r, msg) {
    msg[0] = r.uint32();
  },
  2(r, msg) {
    msg[1] = r.message(Error3);
  }
};
var CursorEntry2 = {
  default() {
    return { type: "none" };
  },
  1(r) {
    return r.message(StepBeginEntry);
  },
  2(r) {
    return r.message(StepEndEntry);
  },
  3(r) {
    return r.message(StepErrorEntry);
  },
  4(r) {
    return { type: "row", row: r.message(Row) };
  },
  5(r) {
    return { type: "error", error: r.message(Error3) };
  }
};
var StepBeginEntry = {
  default() {
    return { type: "step_begin", step: 0, cols: [] };
  },
  1(r, msg) {
    msg.step = r.uint32();
  },
  2(r, msg) {
    msg.cols.push(r.message(Col2));
  }
};
var StepEndEntry = {
  default() {
    return {
      type: "step_end",
      affectedRowCount: 0,
      lastInsertRowid: void 0
    };
  },
  1(r, msg) {
    msg.affectedRowCount = r.uint32();
  },
  2(r, msg) {
    msg.lastInsertRowid = r.uint64();
  }
};
var StepErrorEntry = {
  default() {
    return {
      type: "step_error",
      step: 0,
      error: Error3.default()
    };
  },
  1(r, msg) {
    msg.step = r.uint32();
  },
  2(r, msg) {
    msg.error = r.message(Error3);
  }
};
var DescribeResult2 = {
  default() {
    return {
      params: [],
      cols: [],
      isExplain: false,
      isReadonly: false
    };
  },
  1(r, msg) {
    msg.params.push(r.message(DescribeParam2));
  },
  2(r, msg) {
    msg.cols.push(r.message(DescribeCol2));
  },
  3(r, msg) {
    msg.isExplain = r.bool();
  },
  4(r, msg) {
    msg.isReadonly = r.bool();
  }
};
var DescribeParam2 = {
  default() {
    return { name: void 0 };
  },
  1(r, msg) {
    msg.name = r.string();
  }
};
var DescribeCol2 = {
  default() {
    return { name: "", decltype: void 0 };
  },
  1(r, msg) {
    msg.name = r.string();
  },
  2(r, msg) {
    msg.decltype = r.string();
  }
};
var Value4 = {
  default() {
    return void 0;
  },
  1(r) {
    return null;
  },
  2(r) {
    return r.sint64();
  },
  3(r) {
    return r.double();
  },
  4(r) {
    return r.string();
  },
  5(r) {
    return r.bytes();
  }
};

// node_modules/@libsql/hrana-client/lib-esm/ws/protobuf_decode.js
var ServerMsg2 = {
  default() {
    return { type: "none" };
  },
  1(r) {
    return { type: "hello_ok" };
  },
  2(r) {
    return r.message(HelloErrorMsg);
  },
  3(r) {
    return r.message(ResponseOkMsg);
  },
  4(r) {
    return r.message(ResponseErrorMsg);
  }
};
var HelloErrorMsg = {
  default() {
    return { type: "hello_error", error: Error3.default() };
  },
  1(r, msg) {
    msg.error = r.message(Error3);
  }
};
var ResponseErrorMsg = {
  default() {
    return { type: "response_error", requestId: 0, error: Error3.default() };
  },
  1(r, msg) {
    msg.requestId = r.int32();
  },
  2(r, msg) {
    msg.error = r.message(Error3);
  }
};
var ResponseOkMsg = {
  default() {
    return {
      type: "response_ok",
      requestId: 0,
      response: { type: "none" }
    };
  },
  1(r, msg) {
    msg.requestId = r.int32();
  },
  2(r, msg) {
    msg.response = { type: "open_stream" };
  },
  3(r, msg) {
    msg.response = { type: "close_stream" };
  },
  4(r, msg) {
    msg.response = r.message(ExecuteResp);
  },
  5(r, msg) {
    msg.response = r.message(BatchResp);
  },
  6(r, msg) {
    msg.response = { type: "open_cursor" };
  },
  7(r, msg) {
    msg.response = { type: "close_cursor" };
  },
  8(r, msg) {
    msg.response = r.message(FetchCursorResp);
  },
  9(r, msg) {
    msg.response = { type: "sequence" };
  },
  10(r, msg) {
    msg.response = r.message(DescribeResp);
  },
  11(r, msg) {
    msg.response = { type: "store_sql" };
  },
  12(r, msg) {
    msg.response = { type: "close_sql" };
  },
  13(r, msg) {
    msg.response = r.message(GetAutocommitResp);
  }
};
var ExecuteResp = {
  default() {
    return { type: "execute", result: StmtResult2.default() };
  },
  1(r, msg) {
    msg.result = r.message(StmtResult2);
  }
};
var BatchResp = {
  default() {
    return { type: "batch", result: BatchResult2.default() };
  },
  1(r, msg) {
    msg.result = r.message(BatchResult2);
  }
};
var FetchCursorResp = {
  default() {
    return { type: "fetch_cursor", entries: [], done: false };
  },
  1(r, msg) {
    msg.entries.push(r.message(CursorEntry2));
  },
  2(r, msg) {
    msg.done = r.bool();
  }
};
var DescribeResp = {
  default() {
    return { type: "describe", result: DescribeResult2.default() };
  },
  1(r, msg) {
    msg.result = r.message(DescribeResult2);
  }
};
var GetAutocommitResp = {
  default() {
    return { type: "get_autocommit", isAutocommit: false };
  },
  1(r, msg) {
    msg.isAutocommit = r.bool();
  }
};

// node_modules/@libsql/hrana-client/lib-esm/ws/client.js
var subprotocolsV2 = /* @__PURE__ */ new Map([
  ["hrana2", { version: 2, encoding: "json" }],
  ["hrana1", { version: 1, encoding: "json" }]
]);
var subprotocolsV3 = /* @__PURE__ */ new Map([
  ["hrana3-protobuf", { version: 3, encoding: "protobuf" }],
  ["hrana3", { version: 3, encoding: "json" }],
  ["hrana2", { version: 2, encoding: "json" }],
  ["hrana1", { version: 1, encoding: "json" }]
]);
var WsClient = class extends Client {
  #socket;
  // List of callbacks that we queue until the socket transitions from the CONNECTING to the OPEN state.
  #openCallbacks;
  // Have we already transitioned from CONNECTING to OPEN and fired the callbacks in #openCallbacks?
  #opened;
  // Stores the error that caused us to close the client (and the socket). If we are not closed, this is
  // `undefined`.
  #closed;
  // Have we received a response to our "hello" from the server?
  #recvdHello;
  // Subprotocol negotiated with the server. It is only available after the socket transitions to the OPEN
  // state.
  #subprotocol;
  // Has the `getVersion()` function been called? This is only used to validate that the API is used
  // correctly.
  #getVersionCalled;
  // A map from request id to the responses that we expect to receive from the server.
  #responseMap;
  // An allocator of request ids.
  #requestIdAlloc;
  // An allocator of stream ids.
  /** @private */
  _streamIdAlloc;
  // An allocator of cursor ids.
  /** @private */
  _cursorIdAlloc;
  // An allocator of SQL text ids.
  #sqlIdAlloc;
  /** @private */
  constructor(socket, jwt) {
    super();
    this.#socket = socket;
    this.#openCallbacks = [];
    this.#opened = false;
    this.#closed = void 0;
    this.#recvdHello = false;
    this.#subprotocol = void 0;
    this.#getVersionCalled = false;
    this.#responseMap = /* @__PURE__ */ new Map();
    this.#requestIdAlloc = new IdAlloc();
    this._streamIdAlloc = new IdAlloc();
    this._cursorIdAlloc = new IdAlloc();
    this.#sqlIdAlloc = new IdAlloc();
    this.#socket.binaryType = "arraybuffer";
    this.#socket.addEventListener("open", () => this.#onSocketOpen());
    this.#socket.addEventListener("close", (event) => this.#onSocketClose(event));
    this.#socket.addEventListener("error", (event) => this.#onSocketError(event));
    this.#socket.addEventListener("message", (event) => this.#onSocketMessage(event));
    this.#send({ type: "hello", jwt });
  }
  // Send (or enqueue to send) a message to the server.
  #send(msg) {
    if (this.#closed !== void 0) {
      throw new InternalError("Trying to send a message on a closed client");
    }
    if (this.#opened) {
      this.#sendToSocket(msg);
    } else {
      const openCallback = () => this.#sendToSocket(msg);
      const errorCallback = () => void 0;
      this.#openCallbacks.push({ openCallback, errorCallback });
    }
  }
  // The socket transitioned from CONNECTING to OPEN
  #onSocketOpen() {
    const protocol = this.#socket.protocol;
    if (protocol === void 0) {
      this.#setClosed(new ClientError("The `WebSocket.protocol` property is undefined. This most likely means that the WebSocket implementation provided by the environment is broken. If you are using Miniflare 2, please update to Miniflare 3, which fixes this problem."));
      return;
    } else if (protocol === "") {
      this.#subprotocol = { version: 1, encoding: "json" };
    } else {
      this.#subprotocol = subprotocolsV3.get(protocol);
      if (this.#subprotocol === void 0) {
        this.#setClosed(new ProtoError(`Unrecognized WebSocket subprotocol: ${JSON.stringify(protocol)}`));
        return;
      }
    }
    for (const callbacks of this.#openCallbacks) {
      callbacks.openCallback();
    }
    this.#openCallbacks.length = 0;
    this.#opened = true;
  }
  #sendToSocket(msg) {
    const encoding = this.#subprotocol.encoding;
    if (encoding === "json") {
      const jsonMsg = writeJsonObject(msg, ClientMsg);
      this.#socket.send(jsonMsg);
    } else if (encoding === "protobuf") {
      const protobufMsg = writeProtobufMessage(msg, ClientMsg2);
      this.#socket.send(protobufMsg);
    } else {
      throw impossible(encoding, "Impossible encoding");
    }
  }
  /** Get the protocol version negotiated with the server, possibly waiting until the socket is open. */
  getVersion() {
    return new Promise((versionCallback, errorCallback) => {
      this.#getVersionCalled = true;
      if (this.#closed !== void 0) {
        errorCallback(this.#closed);
      } else if (!this.#opened) {
        const openCallback = () => versionCallback(this.#subprotocol.version);
        this.#openCallbacks.push({ openCallback, errorCallback });
      } else {
        versionCallback(this.#subprotocol.version);
      }
    });
  }
  // Make sure that the negotiated version is at least `minVersion`.
  /** @private */
  _ensureVersion(minVersion, feature) {
    if (this.#subprotocol === void 0 || !this.#getVersionCalled) {
      throw new ProtocolVersionError(`${feature} is supported only on protocol version ${minVersion} and higher, but the version supported by the WebSocket server is not yet known. Use Client.getVersion() to wait until the version is available.`);
    } else if (this.#subprotocol.version < minVersion) {
      throw new ProtocolVersionError(`${feature} is supported on protocol version ${minVersion} and higher, but the WebSocket server only supports version ${this.#subprotocol.version}`);
    }
  }
  // Send a request to the server and invoke a callback when we get the response.
  /** @private */
  _sendRequest(request, callbacks) {
    if (this.#closed !== void 0) {
      callbacks.errorCallback(new ClosedError("Client is closed", this.#closed));
      return;
    }
    const requestId = this.#requestIdAlloc.alloc();
    this.#responseMap.set(requestId, { ...callbacks, type: request.type });
    this.#send({ type: "request", requestId, request });
  }
  // The socket encountered an error.
  #onSocketError(event) {
    const eventMessage = event.message;
    const message = eventMessage ?? "WebSocket was closed due to an error";
    this.#setClosed(new WebSocketError(message));
  }
  // The socket was closed.
  #onSocketClose(event) {
    let message = `WebSocket was closed with code ${event.code}`;
    if (event.reason) {
      message += `: ${event.reason}`;
    }
    this.#setClosed(new WebSocketError(message));
  }
  // Close the client with the given error.
  #setClosed(error) {
    if (this.#closed !== void 0) {
      return;
    }
    this.#closed = error;
    for (const callbacks of this.#openCallbacks) {
      callbacks.errorCallback(error);
    }
    this.#openCallbacks.length = 0;
    for (const [requestId, responseState] of this.#responseMap.entries()) {
      responseState.errorCallback(error);
      this.#requestIdAlloc.free(requestId);
    }
    this.#responseMap.clear();
    this.#socket.close();
  }
  // We received a message from the socket.
  #onSocketMessage(event) {
    if (this.#closed !== void 0) {
      return;
    }
    try {
      let msg;
      const encoding = this.#subprotocol.encoding;
      if (encoding === "json") {
        if (typeof event.data !== "string") {
          this.#socket.close(3003, "Only text messages are accepted with JSON encoding");
          this.#setClosed(new ProtoError("Received non-text message from server with JSON encoding"));
          return;
        }
        msg = readJsonObject(JSON.parse(event.data), ServerMsg);
      } else if (encoding === "protobuf") {
        if (!(event.data instanceof ArrayBuffer)) {
          this.#socket.close(3003, "Only binary messages are accepted with Protobuf encoding");
          this.#setClosed(new ProtoError("Received non-binary message from server with Protobuf encoding"));
          return;
        }
        msg = readProtobufMessage(new Uint8Array(event.data), ServerMsg2);
      } else {
        throw impossible(encoding, "Impossible encoding");
      }
      this.#handleMsg(msg);
    } catch (e) {
      this.#socket.close(3007, "Could not handle message");
      this.#setClosed(e);
    }
  }
  // Handle a message from the server.
  #handleMsg(msg) {
    if (msg.type === "none") {
      throw new ProtoError("Received an unrecognized ServerMsg");
    } else if (msg.type === "hello_ok" || msg.type === "hello_error") {
      if (this.#recvdHello) {
        throw new ProtoError("Received a duplicated hello response");
      }
      this.#recvdHello = true;
      if (msg.type === "hello_error") {
        throw errorFromProto(msg.error);
      }
      return;
    } else if (!this.#recvdHello) {
      throw new ProtoError("Received a non-hello message before a hello response");
    }
    if (msg.type === "response_ok") {
      const requestId = msg.requestId;
      const responseState = this.#responseMap.get(requestId);
      this.#responseMap.delete(requestId);
      if (responseState === void 0) {
        throw new ProtoError("Received unexpected OK response");
      }
      this.#requestIdAlloc.free(requestId);
      try {
        if (responseState.type !== msg.response.type) {
          console.dir({ responseState, msg });
          throw new ProtoError("Received unexpected type of response");
        }
        responseState.responseCallback(msg.response);
      } catch (e) {
        responseState.errorCallback(e);
        throw e;
      }
    } else if (msg.type === "response_error") {
      const requestId = msg.requestId;
      const responseState = this.#responseMap.get(requestId);
      this.#responseMap.delete(requestId);
      if (responseState === void 0) {
        throw new ProtoError("Received unexpected error response");
      }
      this.#requestIdAlloc.free(requestId);
      responseState.errorCallback(errorFromProto(msg.error));
    } else {
      throw impossible(msg, "Impossible ServerMsg type");
    }
  }
  /** Open a {@link WsStream}, a stream for executing SQL statements. */
  openStream() {
    return WsStream.open(this);
  }
  /** Cache a SQL text on the server. This requires protocol version 2 or higher. */
  storeSql(sql) {
    this._ensureVersion(2, "storeSql()");
    const sqlId = this.#sqlIdAlloc.alloc();
    const sqlObj = new Sql(this, sqlId);
    const responseCallback = () => void 0;
    const errorCallback = (e) => sqlObj._setClosed(e);
    const request = { type: "store_sql", sqlId, sql };
    this._sendRequest(request, { responseCallback, errorCallback });
    return sqlObj;
  }
  /** @private */
  _closeSql(sqlId) {
    if (this.#closed !== void 0) {
      return;
    }
    const responseCallback = () => this.#sqlIdAlloc.free(sqlId);
    const errorCallback = (e) => this.#setClosed(e);
    const request = { type: "close_sql", sqlId };
    this._sendRequest(request, { responseCallback, errorCallback });
  }
  /** Close the client and the WebSocket. */
  close() {
    this.#setClosed(new ClientError("Client was manually closed"));
  }
  /** True if the client is closed. */
  get closed() {
    return this.#closed !== void 0;
  }
};

// node_modules/@libsql/isomorphic-fetch/node.js
var _Request = Request;
var _Headers = Headers;
var _fetch = fetch;

// node_modules/@libsql/hrana-client/lib-esm/queue_microtask.js
var _queueMicrotask;
if (typeof queueMicrotask !== "undefined") {
  _queueMicrotask = queueMicrotask;
} else {
  const resolved = Promise.resolve();
  _queueMicrotask = (callback) => {
    resolved.then(callback);
  };
}

// node_modules/@libsql/hrana-client/lib-esm/byte_queue.js
var ByteQueue = class {
  #array;
  #shiftPos;
  #pushPos;
  constructor(initialCap) {
    this.#array = new Uint8Array(new ArrayBuffer(initialCap));
    this.#shiftPos = 0;
    this.#pushPos = 0;
  }
  get length() {
    return this.#pushPos - this.#shiftPos;
  }
  data() {
    return this.#array.slice(this.#shiftPos, this.#pushPos);
  }
  push(chunk2) {
    this.#ensurePush(chunk2.byteLength);
    this.#array.set(chunk2, this.#pushPos);
    this.#pushPos += chunk2.byteLength;
  }
  #ensurePush(pushLength) {
    if (this.#pushPos + pushLength <= this.#array.byteLength) {
      return;
    }
    const filledLength = this.#pushPos - this.#shiftPos;
    if (filledLength + pushLength <= this.#array.byteLength && 2 * this.#pushPos >= this.#array.byteLength) {
      this.#array.copyWithin(0, this.#shiftPos, this.#pushPos);
    } else {
      let newCap = this.#array.byteLength;
      do {
        newCap *= 2;
      } while (filledLength + pushLength > newCap);
      const newArray = new Uint8Array(new ArrayBuffer(newCap));
      newArray.set(this.#array.slice(this.#shiftPos, this.#pushPos), 0);
      this.#array = newArray;
    }
    this.#pushPos = filledLength;
    this.#shiftPos = 0;
  }
  shift(length) {
    this.#shiftPos += length;
  }
};

// node_modules/@libsql/hrana-client/lib-esm/http/json_decode.js
function PipelineRespBody(obj) {
  const baton = stringOpt(obj["baton"]);
  const baseUrl = stringOpt(obj["base_url"]);
  const results = arrayObjectsMap(obj["results"], StreamResult);
  return { baton, baseUrl, results };
}
function StreamResult(obj) {
  const type = string(obj["type"]);
  if (type === "ok") {
    const response = StreamResponse(object(obj["response"]));
    return { type: "ok", response };
  } else if (type === "error") {
    const error = Error2(object(obj["error"]));
    return { type: "error", error };
  } else {
    throw new ProtoError("Unexpected type of StreamResult");
  }
}
function StreamResponse(obj) {
  const type = string(obj["type"]);
  if (type === "close") {
    return { type: "close" };
  } else if (type === "execute") {
    const result = StmtResult(object(obj["result"]));
    return { type: "execute", result };
  } else if (type === "batch") {
    const result = BatchResult(object(obj["result"]));
    return { type: "batch", result };
  } else if (type === "sequence") {
    return { type: "sequence" };
  } else if (type === "describe") {
    const result = DescribeResult(object(obj["result"]));
    return { type: "describe", result };
  } else if (type === "store_sql") {
    return { type: "store_sql" };
  } else if (type === "close_sql") {
    return { type: "close_sql" };
  } else if (type === "get_autocommit") {
    const isAutocommit = boolean(obj["is_autocommit"]);
    return { type: "get_autocommit", isAutocommit };
  } else {
    throw new ProtoError("Unexpected type of StreamResponse");
  }
}
function CursorRespBody(obj) {
  const baton = stringOpt(obj["baton"]);
  const baseUrl = stringOpt(obj["base_url"]);
  return { baton, baseUrl };
}

// node_modules/@libsql/hrana-client/lib-esm/http/protobuf_decode.js
var PipelineRespBody2 = {
  default() {
    return { baton: void 0, baseUrl: void 0, results: [] };
  },
  1(r, msg) {
    msg.baton = r.string();
  },
  2(r, msg) {
    msg.baseUrl = r.string();
  },
  3(r, msg) {
    msg.results.push(r.message(StreamResult2));
  }
};
var StreamResult2 = {
  default() {
    return { type: "none" };
  },
  1(r) {
    return { type: "ok", response: r.message(StreamResponse2) };
  },
  2(r) {
    return { type: "error", error: r.message(Error3) };
  }
};
var StreamResponse2 = {
  default() {
    return { type: "none" };
  },
  1(r) {
    return { type: "close" };
  },
  2(r) {
    return r.message(ExecuteStreamResp);
  },
  3(r) {
    return r.message(BatchStreamResp);
  },
  4(r) {
    return { type: "sequence" };
  },
  5(r) {
    return r.message(DescribeStreamResp);
  },
  6(r) {
    return { type: "store_sql" };
  },
  7(r) {
    return { type: "close_sql" };
  },
  8(r) {
    return r.message(GetAutocommitStreamResp);
  }
};
var ExecuteStreamResp = {
  default() {
    return { type: "execute", result: StmtResult2.default() };
  },
  1(r, msg) {
    msg.result = r.message(StmtResult2);
  }
};
var BatchStreamResp = {
  default() {
    return { type: "batch", result: BatchResult2.default() };
  },
  1(r, msg) {
    msg.result = r.message(BatchResult2);
  }
};
var DescribeStreamResp = {
  default() {
    return { type: "describe", result: DescribeResult2.default() };
  },
  1(r, msg) {
    msg.result = r.message(DescribeResult2);
  }
};
var GetAutocommitStreamResp = {
  default() {
    return { type: "get_autocommit", isAutocommit: false };
  },
  1(r, msg) {
    msg.isAutocommit = r.bool();
  }
};
var CursorRespBody2 = {
  default() {
    return { baton: void 0, baseUrl: void 0 };
  },
  1(r, msg) {
    msg.baton = r.string();
  },
  2(r, msg) {
    msg.baseUrl = r.string();
  }
};

// node_modules/@libsql/hrana-client/lib-esm/http/cursor.js
var HttpCursor = class extends Cursor {
  #stream;
  #encoding;
  #reader;
  #queue;
  #closed;
  #done;
  /** @private */
  constructor(stream, encoding) {
    super();
    this.#stream = stream;
    this.#encoding = encoding;
    this.#reader = void 0;
    this.#queue = new ByteQueue(16 * 1024);
    this.#closed = void 0;
    this.#done = false;
  }
  async open(response) {
    if (response.body === null) {
      throw new ProtoError("No response body for cursor request");
    }
    this.#reader = response.body.getReader();
    const respBody = await this.#nextItem(CursorRespBody, CursorRespBody2);
    if (respBody === void 0) {
      throw new ProtoError("Empty response to cursor request");
    }
    return respBody;
  }
  /** Fetch the next entry from the cursor. */
  next() {
    return this.#nextItem(CursorEntry, CursorEntry2);
  }
  /** Close the cursor. */
  close() {
    this._setClosed(new ClientError("Cursor was manually closed"));
  }
  /** @private */
  _setClosed(error) {
    if (this.#closed !== void 0) {
      return;
    }
    this.#closed = error;
    this.#stream._cursorClosed(this);
    if (this.#reader !== void 0) {
      this.#reader.cancel();
    }
  }
  /** True if the cursor is closed. */
  get closed() {
    return this.#closed !== void 0;
  }
  async #nextItem(jsonFun, protobufDef) {
    for (; ; ) {
      if (this.#done) {
        return void 0;
      } else if (this.#closed !== void 0) {
        throw new ClosedError("Cursor is closed", this.#closed);
      }
      if (this.#encoding === "json") {
        const jsonData = this.#parseItemJson();
        if (jsonData !== void 0) {
          const jsonText = new TextDecoder().decode(jsonData);
          const jsonValue = JSON.parse(jsonText);
          return readJsonObject(jsonValue, jsonFun);
        }
      } else if (this.#encoding === "protobuf") {
        const protobufData = this.#parseItemProtobuf();
        if (protobufData !== void 0) {
          return readProtobufMessage(protobufData, protobufDef);
        }
      } else {
        throw impossible(this.#encoding, "Impossible encoding");
      }
      if (this.#reader === void 0) {
        throw new InternalError("Attempted to read from HTTP cursor before it was opened");
      }
      const { value, done } = await this.#reader.read();
      if (done && this.#queue.length === 0) {
        this.#done = true;
      } else if (done) {
        throw new ProtoError("Unexpected end of cursor stream");
      } else {
        this.#queue.push(value);
      }
    }
  }
  #parseItemJson() {
    const data = this.#queue.data();
    const newlineByte = 10;
    const newlinePos = data.indexOf(newlineByte);
    if (newlinePos < 0) {
      return void 0;
    }
    const jsonData = data.slice(0, newlinePos);
    this.#queue.shift(newlinePos + 1);
    return jsonData;
  }
  #parseItemProtobuf() {
    const data = this.#queue.data();
    let varintValue = 0;
    let varintLength = 0;
    for (; ; ) {
      if (varintLength >= data.byteLength) {
        return void 0;
      }
      const byte = data[varintLength];
      varintValue |= (byte & 127) << 7 * varintLength;
      varintLength += 1;
      if (!(byte & 128)) {
        break;
      }
    }
    if (data.byteLength < varintLength + varintValue) {
      return void 0;
    }
    const protobufData = data.slice(varintLength, varintLength + varintValue);
    this.#queue.shift(varintLength + varintValue);
    return protobufData;
  }
};

// node_modules/@libsql/hrana-client/lib-esm/http/json_encode.js
function PipelineReqBody(w, msg) {
  if (msg.baton !== void 0) {
    w.string("baton", msg.baton);
  }
  w.arrayObjects("requests", msg.requests, StreamRequest);
}
function StreamRequest(w, msg) {
  w.stringRaw("type", msg.type);
  if (msg.type === "close") {
  } else if (msg.type === "execute") {
    w.object("stmt", msg.stmt, Stmt2);
  } else if (msg.type === "batch") {
    w.object("batch", msg.batch, Batch2);
  } else if (msg.type === "sequence") {
    if (msg.sql !== void 0) {
      w.string("sql", msg.sql);
    }
    if (msg.sqlId !== void 0) {
      w.number("sql_id", msg.sqlId);
    }
  } else if (msg.type === "describe") {
    if (msg.sql !== void 0) {
      w.string("sql", msg.sql);
    }
    if (msg.sqlId !== void 0) {
      w.number("sql_id", msg.sqlId);
    }
  } else if (msg.type === "store_sql") {
    w.number("sql_id", msg.sqlId);
    w.string("sql", msg.sql);
  } else if (msg.type === "close_sql") {
    w.number("sql_id", msg.sqlId);
  } else if (msg.type === "get_autocommit") {
  } else {
    throw impossible(msg, "Impossible type of StreamRequest");
  }
}
function CursorReqBody(w, msg) {
  if (msg.baton !== void 0) {
    w.string("baton", msg.baton);
  }
  w.object("batch", msg.batch, Batch2);
}

// node_modules/@libsql/hrana-client/lib-esm/http/protobuf_encode.js
function PipelineReqBody2(w, msg) {
  if (msg.baton !== void 0) {
    w.string(1, msg.baton);
  }
  for (const req of msg.requests) {
    w.message(2, req, StreamRequest2);
  }
}
function StreamRequest2(w, msg) {
  if (msg.type === "close") {
    w.message(1, msg, CloseStreamReq2);
  } else if (msg.type === "execute") {
    w.message(2, msg, ExecuteStreamReq);
  } else if (msg.type === "batch") {
    w.message(3, msg, BatchStreamReq);
  } else if (msg.type === "sequence") {
    w.message(4, msg, SequenceStreamReq);
  } else if (msg.type === "describe") {
    w.message(5, msg, DescribeStreamReq);
  } else if (msg.type === "store_sql") {
    w.message(6, msg, StoreSqlStreamReq);
  } else if (msg.type === "close_sql") {
    w.message(7, msg, CloseSqlStreamReq);
  } else if (msg.type === "get_autocommit") {
    w.message(8, msg, GetAutocommitStreamReq);
  } else {
    throw impossible(msg, "Impossible type of StreamRequest");
  }
}
function CloseStreamReq2(_w, _msg) {
}
function ExecuteStreamReq(w, msg) {
  w.message(1, msg.stmt, Stmt3);
}
function BatchStreamReq(w, msg) {
  w.message(1, msg.batch, Batch3);
}
function SequenceStreamReq(w, msg) {
  if (msg.sql !== void 0) {
    w.string(1, msg.sql);
  }
  if (msg.sqlId !== void 0) {
    w.int32(2, msg.sqlId);
  }
}
function DescribeStreamReq(w, msg) {
  if (msg.sql !== void 0) {
    w.string(1, msg.sql);
  }
  if (msg.sqlId !== void 0) {
    w.int32(2, msg.sqlId);
  }
}
function StoreSqlStreamReq(w, msg) {
  w.int32(1, msg.sqlId);
  w.string(2, msg.sql);
}
function CloseSqlStreamReq(w, msg) {
  w.int32(1, msg.sqlId);
}
function GetAutocommitStreamReq(_w, _msg) {
}
function CursorReqBody2(w, msg) {
  if (msg.baton !== void 0) {
    w.string(1, msg.baton);
  }
  w.message(2, msg.batch, Batch3);
}

// node_modules/@libsql/hrana-client/lib-esm/http/stream.js
var HttpStream = class extends Stream {
  #client;
  #baseUrl;
  #jwt;
  #fetch;
  #baton;
  #queue;
  #flushing;
  #cursor;
  #closing;
  #closeQueued;
  #closed;
  #sqlIdAlloc;
  /** @private */
  constructor(client, baseUrl, jwt, customFetch) {
    super(client.intMode);
    this.#client = client;
    this.#baseUrl = baseUrl.toString();
    this.#jwt = jwt;
    this.#fetch = customFetch;
    this.#baton = void 0;
    this.#queue = new Queue();
    this.#flushing = false;
    this.#closing = false;
    this.#closeQueued = false;
    this.#closed = void 0;
    this.#sqlIdAlloc = new IdAlloc();
  }
  /** Get the {@link HttpClient} object that this stream belongs to. */
  client() {
    return this.#client;
  }
  /** @private */
  _sqlOwner() {
    return this;
  }
  /** Cache a SQL text on the server. */
  storeSql(sql) {
    const sqlId = this.#sqlIdAlloc.alloc();
    this.#sendStreamRequest({ type: "store_sql", sqlId, sql }).then(() => void 0, (error) => this._setClosed(error));
    return new Sql(this, sqlId);
  }
  /** @private */
  _closeSql(sqlId) {
    if (this.#closed !== void 0) {
      return;
    }
    this.#sendStreamRequest({ type: "close_sql", sqlId }).then(() => this.#sqlIdAlloc.free(sqlId), (error) => this._setClosed(error));
  }
  /** @private */
  _execute(stmt) {
    return this.#sendStreamRequest({ type: "execute", stmt }).then((response) => {
      return response.result;
    });
  }
  /** @private */
  _batch(batch) {
    return this.#sendStreamRequest({ type: "batch", batch }).then((response) => {
      return response.result;
    });
  }
  /** @private */
  _describe(protoSql) {
    return this.#sendStreamRequest({
      type: "describe",
      sql: protoSql.sql,
      sqlId: protoSql.sqlId
    }).then((response) => {
      return response.result;
    });
  }
  /** @private */
  _sequence(protoSql) {
    return this.#sendStreamRequest({
      type: "sequence",
      sql: protoSql.sql,
      sqlId: protoSql.sqlId
    }).then((_response) => {
      return void 0;
    });
  }
  /** Check whether the SQL connection underlying this stream is in autocommit state (i.e., outside of an
   * explicit transaction). This requires protocol version 3 or higher.
   */
  getAutocommit() {
    this.#client._ensureVersion(3, "getAutocommit()");
    return this.#sendStreamRequest({
      type: "get_autocommit"
    }).then((response) => {
      return response.isAutocommit;
    });
  }
  #sendStreamRequest(request) {
    return new Promise((responseCallback, errorCallback) => {
      this.#pushToQueue({ type: "pipeline", request, responseCallback, errorCallback });
    });
  }
  /** @private */
  _openCursor(batch) {
    return new Promise((cursorCallback, errorCallback) => {
      this.#pushToQueue({ type: "cursor", batch, cursorCallback, errorCallback });
    });
  }
  /** @private */
  _cursorClosed(cursor) {
    if (cursor !== this.#cursor) {
      throw new InternalError("Cursor was closed, but it was not associated with the stream");
    }
    this.#cursor = void 0;
    _queueMicrotask(() => this.#flushQueue());
  }
  /** Immediately close the stream. */
  close() {
    this._setClosed(new ClientError("Stream was manually closed"));
  }
  /** Gracefully close the stream. */
  closeGracefully() {
    this.#closing = true;
    _queueMicrotask(() => this.#flushQueue());
  }
  /** True if the stream is closed. */
  get closed() {
    return this.#closed !== void 0 || this.#closing;
  }
  /** @private */
  _setClosed(error) {
    if (this.#closed !== void 0) {
      return;
    }
    this.#closed = error;
    if (this.#cursor !== void 0) {
      this.#cursor._setClosed(error);
    }
    this.#client._streamClosed(this);
    for (; ; ) {
      const entry = this.#queue.shift();
      if (entry !== void 0) {
        entry.errorCallback(error);
      } else {
        break;
      }
    }
    if ((this.#baton !== void 0 || this.#flushing) && !this.#closeQueued) {
      this.#queue.push({
        type: "pipeline",
        request: { type: "close" },
        responseCallback: () => void 0,
        errorCallback: () => void 0
      });
      this.#closeQueued = true;
      _queueMicrotask(() => this.#flushQueue());
    }
  }
  #pushToQueue(entry) {
    if (this.#closed !== void 0) {
      throw new ClosedError("Stream is closed", this.#closed);
    } else if (this.#closing) {
      throw new ClosedError("Stream is closing", void 0);
    } else {
      this.#queue.push(entry);
      _queueMicrotask(() => this.#flushQueue());
    }
  }
  #flushQueue() {
    if (this.#flushing || this.#cursor !== void 0) {
      return;
    }
    if (this.#closing && this.#queue.length === 0) {
      this._setClosed(new ClientError("Stream was gracefully closed"));
      return;
    }
    const endpoint = this.#client._endpoint;
    if (endpoint === void 0) {
      this.#client._endpointPromise.then(() => this.#flushQueue(), (error) => this._setClosed(error));
      return;
    }
    const firstEntry = this.#queue.shift();
    if (firstEntry === void 0) {
      return;
    } else if (firstEntry.type === "pipeline") {
      const pipeline = [firstEntry];
      for (; ; ) {
        const entry = this.#queue.first();
        if (entry !== void 0 && entry.type === "pipeline") {
          pipeline.push(entry);
          this.#queue.shift();
        } else if (entry === void 0 && this.#closing && !this.#closeQueued) {
          pipeline.push({
            type: "pipeline",
            request: { type: "close" },
            responseCallback: () => void 0,
            errorCallback: () => void 0
          });
          this.#closeQueued = true;
          break;
        } else {
          break;
        }
      }
      this.#flushPipeline(endpoint, pipeline);
    } else if (firstEntry.type === "cursor") {
      this.#flushCursor(endpoint, firstEntry);
    } else {
      throw impossible(firstEntry, "Impossible type of QueueEntry");
    }
  }
  #flushPipeline(endpoint, pipeline) {
    this.#flush(() => this.#createPipelineRequest(pipeline, endpoint), (resp) => decodePipelineResponse(resp, endpoint.encoding), (respBody) => respBody.baton, (respBody) => respBody.baseUrl, (respBody) => handlePipelineResponse(pipeline, respBody), (error) => pipeline.forEach((entry) => entry.errorCallback(error)));
  }
  #flushCursor(endpoint, entry) {
    const cursor = new HttpCursor(this, endpoint.encoding);
    this.#cursor = cursor;
    this.#flush(() => this.#createCursorRequest(entry, endpoint), (resp) => cursor.open(resp), (respBody) => respBody.baton, (respBody) => respBody.baseUrl, (_respBody) => entry.cursorCallback(cursor), (error) => entry.errorCallback(error));
  }
  #flush(createRequest, decodeResponse, getBaton, getBaseUrl, handleResponse, handleError) {
    let promise;
    try {
      const request = createRequest();
      const fetch2 = this.#fetch;
      promise = fetch2(request);
    } catch (error) {
      promise = Promise.reject(error);
    }
    this.#flushing = true;
    promise.then((resp) => {
      if (!resp.ok) {
        return errorFromResponse(resp).then((error) => {
          throw error;
        });
      }
      return decodeResponse(resp);
    }).then((r) => {
      this.#baton = getBaton(r);
      this.#baseUrl = getBaseUrl(r) ?? this.#baseUrl;
      handleResponse(r);
    }).catch((error) => {
      this._setClosed(error);
      handleError(error);
    }).finally(() => {
      this.#flushing = false;
      this.#flushQueue();
    });
  }
  #createPipelineRequest(pipeline, endpoint) {
    return this.#createRequest(new URL(endpoint.pipelinePath, this.#baseUrl), {
      baton: this.#baton,
      requests: pipeline.map((entry) => entry.request)
    }, endpoint.encoding, PipelineReqBody, PipelineReqBody2);
  }
  #createCursorRequest(entry, endpoint) {
    if (endpoint.cursorPath === void 0) {
      throw new ProtocolVersionError(`Cursors are supported only on protocol version 3 and higher, but the HTTP server only supports version ${endpoint.version}.`);
    }
    return this.#createRequest(new URL(endpoint.cursorPath, this.#baseUrl), {
      baton: this.#baton,
      batch: entry.batch
    }, endpoint.encoding, CursorReqBody, CursorReqBody2);
  }
  #createRequest(url, reqBody, encoding, jsonFun, protobufFun) {
    let bodyData;
    let contentType;
    if (encoding === "json") {
      bodyData = writeJsonObject(reqBody, jsonFun);
      contentType = "application/json";
    } else if (encoding === "protobuf") {
      bodyData = writeProtobufMessage(reqBody, protobufFun);
      contentType = "application/x-protobuf";
    } else {
      throw impossible(encoding, "Impossible encoding");
    }
    const headers = new _Headers();
    headers.set("content-type", contentType);
    if (this.#jwt !== void 0) {
      headers.set("authorization", `Bearer ${this.#jwt}`);
    }
    return new _Request(url.toString(), { method: "POST", headers, body: bodyData });
  }
};
function handlePipelineResponse(pipeline, respBody) {
  if (respBody.results.length !== pipeline.length) {
    throw new ProtoError("Server returned unexpected number of pipeline results");
  }
  for (let i = 0; i < pipeline.length; ++i) {
    const result = respBody.results[i];
    const entry = pipeline[i];
    if (result.type === "ok") {
      if (result.response.type !== entry.request.type) {
        throw new ProtoError("Received unexpected type of response");
      }
      entry.responseCallback(result.response);
    } else if (result.type === "error") {
      entry.errorCallback(errorFromProto(result.error));
    } else if (result.type === "none") {
      throw new ProtoError("Received unrecognized type of StreamResult");
    } else {
      throw impossible(result, "Received impossible type of StreamResult");
    }
  }
}
async function decodePipelineResponse(resp, encoding) {
  if (encoding === "json") {
    const respJson = await resp.json();
    return readJsonObject(respJson, PipelineRespBody);
  }
  if (encoding === "protobuf") {
    const respData = await resp.arrayBuffer();
    return readProtobufMessage(new Uint8Array(respData), PipelineRespBody2);
  }
  await resp.body?.cancel();
  throw impossible(encoding, "Impossible encoding");
}
async function errorFromResponse(resp) {
  const respType = resp.headers.get("content-type") ?? "text/plain";
  let message = `Server returned HTTP status ${resp.status}`;
  if (respType === "application/json") {
    const respBody = await resp.json();
    if ("message" in respBody) {
      return errorFromProto(respBody);
    }
    return new HttpServerError(message, resp.status);
  }
  if (respType === "text/plain") {
    const respBody = (await resp.text()).trim();
    if (respBody !== "") {
      message += `: ${respBody}`;
    }
    return new HttpServerError(message, resp.status);
  }
  await resp.body?.cancel();
  return new HttpServerError(message, resp.status);
}

// node_modules/@libsql/hrana-client/lib-esm/http/client.js
var checkEndpoints = [
  {
    versionPath: "v3-protobuf",
    pipelinePath: "v3-protobuf/pipeline",
    cursorPath: "v3-protobuf/cursor",
    version: 3,
    encoding: "protobuf"
  }
  /*
  {
      versionPath: "v3",
      pipelinePath: "v3/pipeline",
      cursorPath: "v3/cursor",
      version: 3,
      encoding: "json",
  },
  */
];
var fallbackEndpoint = {
  versionPath: "v2",
  pipelinePath: "v2/pipeline",
  cursorPath: void 0,
  version: 2,
  encoding: "json"
};
var HttpClient = class extends Client {
  #url;
  #jwt;
  #fetch;
  #closed;
  #streams;
  /** @private */
  _endpointPromise;
  /** @private */
  _endpoint;
  /** @private */
  constructor(url, jwt, customFetch, protocolVersion = 2) {
    super();
    this.#url = url;
    this.#jwt = jwt;
    this.#fetch = customFetch ?? _fetch;
    this.#closed = void 0;
    this.#streams = /* @__PURE__ */ new Set();
    if (protocolVersion == 3) {
      this._endpointPromise = findEndpoint(this.#fetch, this.#url);
      this._endpointPromise.then((endpoint) => this._endpoint = endpoint, (error) => this.#setClosed(error));
    } else {
      this._endpointPromise = Promise.resolve(fallbackEndpoint);
      this._endpointPromise.then((endpoint) => this._endpoint = endpoint, (error) => this.#setClosed(error));
    }
  }
  /** Get the protocol version supported by the server. */
  async getVersion() {
    if (this._endpoint !== void 0) {
      return this._endpoint.version;
    }
    return (await this._endpointPromise).version;
  }
  // Make sure that the negotiated version is at least `minVersion`.
  /** @private */
  _ensureVersion(minVersion, feature) {
    if (minVersion <= fallbackEndpoint.version) {
      return;
    } else if (this._endpoint === void 0) {
      throw new ProtocolVersionError(`${feature} is supported only on protocol version ${minVersion} and higher, but the version supported by the HTTP server is not yet known. Use Client.getVersion() to wait until the version is available.`);
    } else if (this._endpoint.version < minVersion) {
      throw new ProtocolVersionError(`${feature} is supported only on protocol version ${minVersion} and higher, but the HTTP server only supports version ${this._endpoint.version}.`);
    }
  }
  /** Open a {@link HttpStream}, a stream for executing SQL statements. */
  openStream() {
    if (this.#closed !== void 0) {
      throw new ClosedError("Client is closed", this.#closed);
    }
    const stream = new HttpStream(this, this.#url, this.#jwt, this.#fetch);
    this.#streams.add(stream);
    return stream;
  }
  /** @private */
  _streamClosed(stream) {
    this.#streams.delete(stream);
  }
  /** Close the client and all its streams. */
  close() {
    this.#setClosed(new ClientError("Client was manually closed"));
  }
  /** True if the client is closed. */
  get closed() {
    return this.#closed !== void 0;
  }
  #setClosed(error) {
    if (this.#closed !== void 0) {
      return;
    }
    this.#closed = error;
    for (const stream of Array.from(this.#streams)) {
      stream._setClosed(new ClosedError("Client was closed", error));
    }
  }
};
async function findEndpoint(customFetch, clientUrl) {
  const fetch2 = customFetch;
  for (const endpoint of checkEndpoints) {
    const url = new URL(endpoint.versionPath, clientUrl);
    const request = new _Request(url.toString(), { method: "GET" });
    const response = await fetch2(request);
    await response.arrayBuffer();
    if (response.ok) {
      return endpoint;
    }
  }
  return fallbackEndpoint;
}

// node_modules/@libsql/hrana-client/lib-esm/index.js
function openWs(url, jwt, protocolVersion = 2) {
  if (typeof import_websocket.default === "undefined") {
    throw new WebSocketUnsupportedError("WebSockets are not supported in this environment");
  }
  var subprotocols = void 0;
  if (protocolVersion == 3) {
    subprotocols = Array.from(subprotocolsV3.keys());
  } else {
    subprotocols = Array.from(subprotocolsV2.keys());
  }
  const socket = new import_websocket.default(url, subprotocols);
  return new WsClient(socket, jwt);
}
function openHttp(url, jwt, customFetch, protocolVersion = 2) {
  return new HttpClient(url instanceof URL ? url : new URL(url), jwt, customFetch, protocolVersion);
}

// node_modules/@libsql/client/lib-esm/hrana.js
var HranaTransaction = class {
  #mode;
  #version;
  // Promise that is resolved when the BEGIN statement completes, or `undefined` if we haven't executed the
  // BEGIN statement yet.
  #started;
  /** @private */
  constructor(mode, version2) {
    this.#mode = mode;
    this.#version = version2;
    this.#started = void 0;
  }
  execute(stmt) {
    return this.batch([stmt]).then((results) => results[0]);
  }
  async batch(stmts) {
    const stream = this._getStream();
    if (stream.closed) {
      throw new LibsqlError("Cannot execute statements because the transaction is closed", "TRANSACTION_CLOSED");
    }
    try {
      const hranaStmts = stmts.map(stmtToHrana);
      let rowsPromises;
      if (this.#started === void 0) {
        this._getSqlCache().apply(hranaStmts);
        const batch = stream.batch(this.#version >= 3);
        const beginStep = batch.step();
        const beginPromise = beginStep.run(transactionModeToBegin(this.#mode));
        let lastStep = beginStep;
        rowsPromises = hranaStmts.map((hranaStmt) => {
          const stmtStep = batch.step().condition(BatchCond.ok(lastStep));
          if (this.#version >= 3) {
            stmtStep.condition(BatchCond.not(BatchCond.isAutocommit(batch)));
          }
          const rowsPromise = stmtStep.query(hranaStmt);
          rowsPromise.catch(() => void 0);
          lastStep = stmtStep;
          return rowsPromise;
        });
        this.#started = batch.execute().then(() => beginPromise).then(() => void 0);
        try {
          await this.#started;
        } catch (e) {
          this.close();
          throw e;
        }
      } else {
        if (this.#version < 3) {
          await this.#started;
        } else {
        }
        this._getSqlCache().apply(hranaStmts);
        const batch = stream.batch(this.#version >= 3);
        let lastStep = void 0;
        rowsPromises = hranaStmts.map((hranaStmt) => {
          const stmtStep = batch.step();
          if (lastStep !== void 0) {
            stmtStep.condition(BatchCond.ok(lastStep));
          }
          if (this.#version >= 3) {
            stmtStep.condition(BatchCond.not(BatchCond.isAutocommit(batch)));
          }
          const rowsPromise = stmtStep.query(hranaStmt);
          rowsPromise.catch(() => void 0);
          lastStep = stmtStep;
          return rowsPromise;
        });
        await batch.execute();
      }
      const resultSets = [];
      for (const rowsPromise of rowsPromises) {
        const rows = await rowsPromise;
        if (rows === void 0) {
          throw new LibsqlError("Statement in a transaction was not executed, probably because the transaction has been rolled back", "TRANSACTION_CLOSED");
        }
        resultSets.push(resultSetFromHrana(rows));
      }
      return resultSets;
    } catch (e) {
      throw mapHranaError(e);
    }
  }
  async executeMultiple(sql) {
    const stream = this._getStream();
    if (stream.closed) {
      throw new LibsqlError("Cannot execute statements because the transaction is closed", "TRANSACTION_CLOSED");
    }
    try {
      if (this.#started === void 0) {
        this.#started = stream.run(transactionModeToBegin(this.#mode)).then(() => void 0);
        try {
          await this.#started;
        } catch (e) {
          this.close();
          throw e;
        }
      } else {
        await this.#started;
      }
      await stream.sequence(sql);
    } catch (e) {
      throw mapHranaError(e);
    }
  }
  async rollback() {
    try {
      const stream = this._getStream();
      if (stream.closed) {
        return;
      }
      if (this.#started !== void 0) {
      } else {
        return;
      }
      const promise = stream.run("ROLLBACK").catch((e) => {
        throw mapHranaError(e);
      });
      stream.closeGracefully();
      await promise;
    } catch (e) {
      throw mapHranaError(e);
    } finally {
      this.close();
    }
  }
  async commit() {
    try {
      const stream = this._getStream();
      if (stream.closed) {
        throw new LibsqlError("Cannot commit the transaction because it is already closed", "TRANSACTION_CLOSED");
      }
      if (this.#started !== void 0) {
        await this.#started;
      } else {
        return;
      }
      const promise = stream.run("COMMIT").catch((e) => {
        throw mapHranaError(e);
      });
      stream.closeGracefully();
      await promise;
    } catch (e) {
      throw mapHranaError(e);
    } finally {
      this.close();
    }
  }
};
async function executeHranaBatch(mode, version2, batch, hranaStmts, disableForeignKeys = false) {
  if (disableForeignKeys) {
    batch.step().run("PRAGMA foreign_keys=off");
  }
  const beginStep = batch.step();
  const beginPromise = beginStep.run(transactionModeToBegin(mode));
  let lastStep = beginStep;
  const stmtPromises = hranaStmts.map((hranaStmt) => {
    const stmtStep = batch.step().condition(BatchCond.ok(lastStep));
    if (version2 >= 3) {
      stmtStep.condition(BatchCond.not(BatchCond.isAutocommit(batch)));
    }
    const stmtPromise = stmtStep.query(hranaStmt);
    lastStep = stmtStep;
    return stmtPromise;
  });
  const commitStep = batch.step().condition(BatchCond.ok(lastStep));
  if (version2 >= 3) {
    commitStep.condition(BatchCond.not(BatchCond.isAutocommit(batch)));
  }
  const commitPromise = commitStep.run("COMMIT");
  const rollbackStep = batch.step().condition(BatchCond.not(BatchCond.ok(commitStep)));
  rollbackStep.run("ROLLBACK").catch((_) => void 0);
  if (disableForeignKeys) {
    batch.step().run("PRAGMA foreign_keys=on");
  }
  await batch.execute();
  const resultSets = [];
  await beginPromise;
  for (const stmtPromise of stmtPromises) {
    const hranaRows = await stmtPromise;
    if (hranaRows === void 0) {
      throw new LibsqlError("Statement in a batch was not executed, probably because the transaction has been rolled back", "TRANSACTION_CLOSED");
    }
    resultSets.push(resultSetFromHrana(hranaRows));
  }
  await commitPromise;
  return resultSets;
}
function stmtToHrana(stmt) {
  let sql;
  let args;
  if (Array.isArray(stmt)) {
    [sql, args] = stmt;
  } else if (typeof stmt === "string") {
    sql = stmt;
  } else {
    sql = stmt.sql;
    args = stmt.args;
  }
  const hranaStmt = new Stmt(sql);
  if (args) {
    if (Array.isArray(args)) {
      hranaStmt.bindIndexes(args);
    } else {
      for (const [key, value] of Object.entries(args)) {
        hranaStmt.bindName(key, value);
      }
    }
  }
  return hranaStmt;
}
function resultSetFromHrana(hranaRows) {
  const columns = hranaRows.columnNames.map((c) => c ?? "");
  const columnTypes = hranaRows.columnDecltypes.map((c) => c ?? "");
  const rows = hranaRows.rows;
  const rowsAffected = hranaRows.affectedRowCount;
  const lastInsertRowid = hranaRows.lastInsertRowid !== void 0 ? hranaRows.lastInsertRowid : void 0;
  return new ResultSetImpl(columns, columnTypes, rows, rowsAffected, lastInsertRowid);
}
function mapHranaError(e) {
  if (e instanceof ClientError) {
    const code = mapHranaErrorCode(e);
    return new LibsqlError(e.message, code, void 0, e);
  }
  return e;
}
function mapHranaErrorCode(e) {
  if (e instanceof ResponseError && e.code !== void 0) {
    return e.code;
  } else if (e instanceof ProtoError) {
    return "HRANA_PROTO_ERROR";
  } else if (e instanceof ClosedError) {
    return e.cause instanceof ClientError ? mapHranaErrorCode(e.cause) : "HRANA_CLOSED_ERROR";
  } else if (e instanceof WebSocketError) {
    return "HRANA_WEBSOCKET_ERROR";
  } else if (e instanceof HttpServerError) {
    return "SERVER_ERROR";
  } else if (e instanceof ProtocolVersionError) {
    return "PROTOCOL_VERSION_ERROR";
  } else if (e instanceof InternalError) {
    return "INTERNAL_ERROR";
  } else {
    return "UNKNOWN";
  }
}

// node_modules/@libsql/client/lib-esm/sql_cache.js
var SqlCache = class {
  #owner;
  #sqls;
  capacity;
  constructor(owner, capacity) {
    this.#owner = owner;
    this.#sqls = new Lru();
    this.capacity = capacity;
  }
  // Replaces SQL strings with cached `hrana.Sql` objects in the statements in `hranaStmts`. After this
  // function returns, we guarantee that all `hranaStmts` refer to valid (not closed) `hrana.Sql` objects,
  // but _we may invalidate any other `hrana.Sql` objects_ (by closing them, thus removing them from the
  // server).
  //
  // In practice, this means that after calling this function, you can use the statements only up to the
  // first `await`, because concurrent code may also use the cache and invalidate those statements.
  apply(hranaStmts) {
    if (this.capacity <= 0) {
      return;
    }
    const usedSqlObjs = /* @__PURE__ */ new Set();
    for (const hranaStmt of hranaStmts) {
      if (typeof hranaStmt.sql !== "string") {
        continue;
      }
      const sqlText = hranaStmt.sql;
      if (sqlText.length >= 5e3) {
        continue;
      }
      let sqlObj = this.#sqls.get(sqlText);
      if (sqlObj === void 0) {
        while (this.#sqls.size + 1 > this.capacity) {
          const [evictSqlText, evictSqlObj] = this.#sqls.peekLru();
          if (usedSqlObjs.has(evictSqlObj)) {
            break;
          }
          evictSqlObj.close();
          this.#sqls.delete(evictSqlText);
        }
        if (this.#sqls.size + 1 <= this.capacity) {
          sqlObj = this.#owner.storeSql(sqlText);
          this.#sqls.set(sqlText, sqlObj);
        }
      }
      if (sqlObj !== void 0) {
        hranaStmt.sql = sqlObj;
        usedSqlObjs.add(sqlObj);
      }
    }
  }
};
var Lru = class {
  // This maps keys to the cache values. The entries are ordered by their last use (entires that were used
  // most recently are at the end).
  #cache;
  constructor() {
    this.#cache = /* @__PURE__ */ new Map();
  }
  get(key) {
    const value = this.#cache.get(key);
    if (value !== void 0) {
      this.#cache.delete(key);
      this.#cache.set(key, value);
    }
    return value;
  }
  set(key, value) {
    this.#cache.set(key, value);
  }
  peekLru() {
    for (const entry of this.#cache.entries()) {
      return entry;
    }
    return void 0;
  }
  delete(key) {
    this.#cache.delete(key);
  }
  get size() {
    return this.#cache.size;
  }
};

// node_modules/@libsql/client/lib-esm/ws.js
var import_promise_limit = __toESM(require_promise_limit(), 1);
function _createClient(config) {
  if (config.scheme !== "wss" && config.scheme !== "ws") {
    throw new LibsqlError(`The WebSocket client supports only "libsql:", "wss:" and "ws:" URLs, got ${JSON.stringify(config.scheme + ":")}. For more information, please read ${supportedUrlLink}`, "URL_SCHEME_NOT_SUPPORTED");
  }
  if (config.encryptionKey !== void 0) {
    throw new LibsqlError("Encryption key is not supported by the remote client.", "ENCRYPTION_KEY_NOT_SUPPORTED");
  }
  if (config.scheme === "ws" && config.tls) {
    throw new LibsqlError(`A "ws:" URL cannot opt into TLS by using ?tls=1`, "URL_INVALID");
  } else if (config.scheme === "wss" && !config.tls) {
    throw new LibsqlError(`A "wss:" URL cannot opt out of TLS by using ?tls=0`, "URL_INVALID");
  }
  const url = encodeBaseUrl(config.scheme, config.authority, config.path);
  let client;
  try {
    client = openWs(url, config.authToken);
  } catch (e) {
    if (e instanceof WebSocketUnsupportedError) {
      const suggestedScheme = config.scheme === "wss" ? "https" : "http";
      const suggestedUrl = encodeBaseUrl(suggestedScheme, config.authority, config.path);
      throw new LibsqlError(`This environment does not support WebSockets, please switch to the HTTP client by using a "${suggestedScheme}:" URL (${JSON.stringify(suggestedUrl)}). For more information, please read ${supportedUrlLink}`, "WEBSOCKETS_NOT_SUPPORTED");
    }
    throw mapHranaError(e);
  }
  return new WsClient2(client, url, config.authToken, config.intMode, config.concurrency);
}
var maxConnAgeMillis = 60 * 1e3;
var sqlCacheCapacity = 100;
var WsClient2 = class {
  #url;
  #authToken;
  #intMode;
  // State of the current connection. The `hrana.WsClient` inside may be closed at any moment due to an
  // asynchronous error.
  #connState;
  // If defined, this is a connection that will be used in the future, once it is ready.
  #futureConnState;
  closed;
  protocol;
  #isSchemaDatabase;
  #promiseLimitFunction;
  /** @private */
  constructor(client, url, authToken, intMode, concurrency) {
    this.#url = url;
    this.#authToken = authToken;
    this.#intMode = intMode;
    this.#connState = this.#openConn(client);
    this.#futureConnState = void 0;
    this.closed = false;
    this.protocol = "ws";
    this.#promiseLimitFunction = (0, import_promise_limit.default)(concurrency);
  }
  async limit(fn) {
    return this.#promiseLimitFunction(fn);
  }
  async execute(stmtOrSql, args) {
    let stmt;
    if (typeof stmtOrSql === "string") {
      stmt = {
        sql: stmtOrSql,
        args: args || []
      };
    } else {
      stmt = stmtOrSql;
    }
    return this.limit(async () => {
      const streamState = await this.#openStream();
      try {
        const hranaStmt = stmtToHrana(stmt);
        streamState.conn.sqlCache.apply([hranaStmt]);
        const hranaRowsPromise = streamState.stream.query(hranaStmt);
        streamState.stream.closeGracefully();
        const hranaRowsResult = await hranaRowsPromise;
        return resultSetFromHrana(hranaRowsResult);
      } catch (e) {
        throw mapHranaError(e);
      } finally {
        this._closeStream(streamState);
      }
    });
  }
  async batch(stmts, mode = "deferred") {
    return this.limit(async () => {
      const streamState = await this.#openStream();
      try {
        const normalizedStmts = stmts.map((stmt) => {
          if (Array.isArray(stmt)) {
            return {
              sql: stmt[0],
              args: stmt[1] || []
            };
          }
          return stmt;
        });
        const hranaStmts = normalizedStmts.map(stmtToHrana);
        const version2 = await streamState.conn.client.getVersion();
        streamState.conn.sqlCache.apply(hranaStmts);
        const batch = streamState.stream.batch(version2 >= 3);
        const resultsPromise = executeHranaBatch(mode, version2, batch, hranaStmts);
        const results = await resultsPromise;
        return results;
      } catch (e) {
        throw mapHranaError(e);
      } finally {
        this._closeStream(streamState);
      }
    });
  }
  async migrate(stmts) {
    return this.limit(async () => {
      const streamState = await this.#openStream();
      try {
        const hranaStmts = stmts.map(stmtToHrana);
        const version2 = await streamState.conn.client.getVersion();
        const batch = streamState.stream.batch(version2 >= 3);
        const resultsPromise = executeHranaBatch("deferred", version2, batch, hranaStmts, true);
        const results = await resultsPromise;
        return results;
      } catch (e) {
        throw mapHranaError(e);
      } finally {
        this._closeStream(streamState);
      }
    });
  }
  async transaction(mode = "write") {
    return this.limit(async () => {
      const streamState = await this.#openStream();
      try {
        const version2 = await streamState.conn.client.getVersion();
        return new WsTransaction(this, streamState, mode, version2);
      } catch (e) {
        this._closeStream(streamState);
        throw mapHranaError(e);
      }
    });
  }
  async executeMultiple(sql) {
    return this.limit(async () => {
      const streamState = await this.#openStream();
      try {
        const promise = streamState.stream.sequence(sql);
        streamState.stream.closeGracefully();
        await promise;
      } catch (e) {
        throw mapHranaError(e);
      } finally {
        this._closeStream(streamState);
      }
    });
  }
  sync() {
    throw new LibsqlError("sync not supported in ws mode", "SYNC_NOT_SUPPORTED");
  }
  async #openStream() {
    if (this.closed) {
      throw new LibsqlError("The client is closed", "CLIENT_CLOSED");
    }
    const now = /* @__PURE__ */ new Date();
    const ageMillis = now.valueOf() - this.#connState.openTime.valueOf();
    if (ageMillis > maxConnAgeMillis && this.#futureConnState === void 0) {
      const futureConnState = this.#openConn();
      this.#futureConnState = futureConnState;
      futureConnState.client.getVersion().then((_version) => {
        if (this.#connState !== futureConnState) {
          if (this.#connState.streamStates.size === 0) {
            this.#connState.client.close();
          } else {
          }
        }
        this.#connState = futureConnState;
        this.#futureConnState = void 0;
      }, (_e) => {
        this.#futureConnState = void 0;
      });
    }
    if (this.#connState.client.closed) {
      try {
        if (this.#futureConnState !== void 0) {
          this.#connState = this.#futureConnState;
        } else {
          this.#connState = this.#openConn();
        }
      } catch (e) {
        throw mapHranaError(e);
      }
    }
    const connState = this.#connState;
    try {
      if (connState.useSqlCache === void 0) {
        connState.useSqlCache = await connState.client.getVersion() >= 2;
        if (connState.useSqlCache) {
          connState.sqlCache.capacity = sqlCacheCapacity;
        }
      }
      const stream = connState.client.openStream();
      stream.intMode = this.#intMode;
      const streamState = { conn: connState, stream };
      connState.streamStates.add(streamState);
      return streamState;
    } catch (e) {
      throw mapHranaError(e);
    }
  }
  #openConn(client) {
    try {
      client ??= openWs(this.#url, this.#authToken);
      return {
        client,
        useSqlCache: void 0,
        sqlCache: new SqlCache(client, 0),
        openTime: /* @__PURE__ */ new Date(),
        streamStates: /* @__PURE__ */ new Set()
      };
    } catch (e) {
      throw mapHranaError(e);
    }
  }
  async reconnect() {
    try {
      for (const st of Array.from(this.#connState.streamStates)) {
        try {
          st.stream.close();
        } catch {
        }
      }
      this.#connState.client.close();
    } catch {
    }
    if (this.#futureConnState) {
      try {
        this.#futureConnState.client.close();
      } catch {
      }
      this.#futureConnState = void 0;
    }
    const next = this.#openConn();
    const version2 = await next.client.getVersion();
    next.useSqlCache = version2 >= 2;
    if (next.useSqlCache) {
      next.sqlCache.capacity = sqlCacheCapacity;
    }
    this.#connState = next;
    this.closed = false;
  }
  _closeStream(streamState) {
    streamState.stream.close();
    const connState = streamState.conn;
    connState.streamStates.delete(streamState);
    if (connState.streamStates.size === 0 && connState !== this.#connState) {
      connState.client.close();
    }
  }
  close() {
    this.#connState.client.close();
    this.closed = true;
    if (this.#futureConnState) {
      try {
        this.#futureConnState.client.close();
      } catch {
      }
      this.#futureConnState = void 0;
    }
    this.closed = true;
  }
};
var WsTransaction = class extends HranaTransaction {
  #client;
  #streamState;
  /** @private */
  constructor(client, state, mode, version2) {
    super(mode, version2);
    this.#client = client;
    this.#streamState = state;
  }
  /** @private */
  _getStream() {
    return this.#streamState.stream;
  }
  /** @private */
  _getSqlCache() {
    return this.#streamState.conn.sqlCache;
  }
  close() {
    this.#client._closeStream(this.#streamState);
  }
  get closed() {
    return this.#streamState.stream.closed;
  }
};

// node_modules/@libsql/client/lib-esm/http.js
var import_promise_limit2 = __toESM(require_promise_limit(), 1);
function _createClient2(config) {
  if (config.scheme !== "https" && config.scheme !== "http") {
    throw new LibsqlError(`The HTTP client supports only "libsql:", "https:" and "http:" URLs, got ${JSON.stringify(config.scheme + ":")}. For more information, please read ${supportedUrlLink}`, "URL_SCHEME_NOT_SUPPORTED");
  }
  if (config.encryptionKey !== void 0) {
    throw new LibsqlError("Encryption key is not supported by the remote client.", "ENCRYPTION_KEY_NOT_SUPPORTED");
  }
  if (config.scheme === "http" && config.tls) {
    throw new LibsqlError(`A "http:" URL cannot opt into TLS by using ?tls=1`, "URL_INVALID");
  } else if (config.scheme === "https" && !config.tls) {
    throw new LibsqlError(`A "https:" URL cannot opt out of TLS by using ?tls=0`, "URL_INVALID");
  }
  const url = encodeBaseUrl(config.scheme, config.authority, config.path);
  return new HttpClient2(url, config.authToken, config.intMode, config.fetch, config.concurrency);
}
var sqlCacheCapacity2 = 30;
var HttpClient2 = class {
  #client;
  protocol;
  #url;
  #intMode;
  #customFetch;
  #concurrency;
  #authToken;
  #promiseLimitFunction;
  /** @private */
  constructor(url, authToken, intMode, customFetch, concurrency) {
    this.#url = url;
    this.#authToken = authToken;
    this.#intMode = intMode;
    this.#customFetch = customFetch;
    this.#concurrency = concurrency;
    this.#client = openHttp(this.#url, this.#authToken, this.#customFetch);
    this.#client.intMode = this.#intMode;
    this.protocol = "http";
    this.#promiseLimitFunction = (0, import_promise_limit2.default)(this.#concurrency);
  }
  async limit(fn) {
    return this.#promiseLimitFunction(fn);
  }
  async execute(stmtOrSql, args) {
    let stmt;
    if (typeof stmtOrSql === "string") {
      stmt = {
        sql: stmtOrSql,
        args: args || []
      };
    } else {
      stmt = stmtOrSql;
    }
    return this.limit(async () => {
      try {
        const hranaStmt = stmtToHrana(stmt);
        let rowsPromise;
        const stream = this.#client.openStream();
        try {
          rowsPromise = stream.query(hranaStmt);
        } finally {
          stream.closeGracefully();
        }
        const rowsResult = await rowsPromise;
        return resultSetFromHrana(rowsResult);
      } catch (e) {
        throw mapHranaError(e);
      }
    });
  }
  async batch(stmts, mode = "deferred") {
    return this.limit(async () => {
      try {
        const normalizedStmts = stmts.map((stmt) => {
          if (Array.isArray(stmt)) {
            return {
              sql: stmt[0],
              args: stmt[1] || []
            };
          }
          return stmt;
        });
        const hranaStmts = normalizedStmts.map(stmtToHrana);
        const version2 = await this.#client.getVersion();
        let resultsPromise;
        const stream = this.#client.openStream();
        try {
          const sqlCache = new SqlCache(stream, sqlCacheCapacity2);
          sqlCache.apply(hranaStmts);
          const batch = stream.batch(false);
          resultsPromise = executeHranaBatch(mode, version2, batch, hranaStmts);
        } finally {
          stream.closeGracefully();
        }
        const results = await resultsPromise;
        return results;
      } catch (e) {
        throw mapHranaError(e);
      }
    });
  }
  async migrate(stmts) {
    return this.limit(async () => {
      try {
        const hranaStmts = stmts.map(stmtToHrana);
        const version2 = await this.#client.getVersion();
        let resultsPromise;
        const stream = this.#client.openStream();
        try {
          const batch = stream.batch(false);
          resultsPromise = executeHranaBatch("deferred", version2, batch, hranaStmts, true);
        } finally {
          stream.closeGracefully();
        }
        const results = await resultsPromise;
        return results;
      } catch (e) {
        throw mapHranaError(e);
      }
    });
  }
  async transaction(mode = "write") {
    return this.limit(async () => {
      try {
        const version2 = await this.#client.getVersion();
        return new HttpTransaction(this.#client.openStream(), mode, version2);
      } catch (e) {
        throw mapHranaError(e);
      }
    });
  }
  async executeMultiple(sql) {
    return this.limit(async () => {
      try {
        let promise;
        const stream = this.#client.openStream();
        try {
          promise = stream.sequence(sql);
        } finally {
          stream.closeGracefully();
        }
        await promise;
      } catch (e) {
        throw mapHranaError(e);
      }
    });
  }
  sync() {
    throw new LibsqlError("sync not supported in http mode", "SYNC_NOT_SUPPORTED");
  }
  close() {
    this.#client.close();
  }
  async reconnect() {
    try {
      if (!this.closed) {
        this.#client.close();
      }
    } finally {
      this.#client = openHttp(this.#url, this.#authToken, this.#customFetch);
      this.#client.intMode = this.#intMode;
    }
  }
  get closed() {
    return this.#client.closed;
  }
};
var HttpTransaction = class extends HranaTransaction {
  #stream;
  #sqlCache;
  /** @private */
  constructor(stream, mode, version2) {
    super(mode, version2);
    this.#stream = stream;
    this.#sqlCache = new SqlCache(stream, sqlCacheCapacity2);
  }
  /** @private */
  _getStream() {
    return this.#stream;
  }
  /** @private */
  _getSqlCache() {
    return this.#sqlCache;
  }
  close() {
    this.#stream.close();
  }
  get closed() {
    return this.#stream.closed;
  }
};

// node_modules/@libsql/client/lib-esm/web.js
function createClient(config) {
  return _createClient3(expandConfig(config, true));
}
function _createClient3(config) {
  if (config.scheme === "ws" || config.scheme === "wss") {
    return _createClient(config);
  } else if (config.scheme === "http" || config.scheme === "https") {
    return _createClient2(config);
  } else {
    throw new LibsqlError(`The client that uses Web standard APIs supports only "libsql:", "wss:", "ws:", "https:" and "http:" URLs, got ${JSON.stringify(config.scheme + ":")}. For more information, please read ${supportedUrlLink}`, "URL_SCHEME_NOT_SUPPORTED");
  }
}

// src/db/client.ts
async function getDb(env) {
  const url = env.TURSO_DATABASE_URL;
  if (!url) {
    throw new Error("TURSO_DATABASE_URL \u672A\u914D\u7F6E");
  }
  if (!env.TURSO_AUTH_TOKEN) {
    throw new Error("TURSO_AUTH_TOKEN \u672A\u914D\u7F6E");
  }
  if (url.startsWith("file:")) {
    throw new Error(
      "\u751F\u4EA7\u73AF\u5883\u7981\u6B62\u4F7F\u7528 file: \u672C\u5730\u6570\u636E\u5E93\uFF08\u672C\u5730\u5F00\u53D1\u8BF7\u7528 scripts/dev-server.mjs\uFF09"
    );
  }
  return createClient({
    url,
    authToken: env.TURSO_AUTH_TOKEN || void 0
  });
}

// src/utils/errors.ts
var ApiError = class extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
  status;
  code;
};
var errors = {
  badRequest: (msg, code = "bad_request") => new ApiError(400, code, msg),
  unauthorized: (msg = "\u672A\u767B\u5F55\u6216\u4EE4\u724C\u65E0\u6548", code = "unauthorized") => new ApiError(401, code, msg),
  forbidden: (msg = "\u65E0\u6743\u9650", code = "forbidden") => new ApiError(403, code, msg),
  notFound: (msg = "\u8D44\u6E90\u4E0D\u5B58\u5728", code = "not_found") => new ApiError(404, code, msg),
  conflict: (msg, code = "conflict") => new ApiError(409, code, msg),
  quota: (msg, code = "quota_exceeded") => new ApiError(429, code, msg),
  internal: (msg = "\u670D\u52A1\u5668\u5185\u90E8\u9519\u8BEF") => new ApiError(500, "internal", msg)
};

// src/utils/password.ts
var ITER_PREFERRED = 12e4;
var CANDIDATES = [
  { iterations: ITER_PREFERRED, hash: "SHA-256" },
  { iterations: ITER_PREFERRED, hash: { name: "SHA-256" } },
  { iterations: 1e4, hash: "SHA-256" },
  { iterations: 1e4, hash: { name: "SHA-256" } },
  { iterations: 1e3, hash: "SHA-256" },
  { iterations: 1e3, hash: { name: "SHA-256" } }
];
var SALT_BYTES = 16;
var KEY_BITS = 256;
var encoder = new TextEncoder();
async function deriveBits(password, salt, iterations, hash) {
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt,
      iterations,
      hash
    },
    keyMaterial,
    KEY_BITS
  );
  let hexOut = "";
  for (const b of new Uint8Array(bits)) hexOut += b.toString(16).padStart(2, "0");
  return hexOut;
}
async function deriveWithFallback(password, salt) {
  let lastErr = null;
  for (const c of CANDIDATES) {
    try {
      const hash = await deriveBits(password, salt, c.iterations, c.hash);
      if (c.iterations !== ITER_PREFERRED || typeof c.hash !== "string") {
        console.log(
          `[auth] PBKDF2 \u964D\u7EA7\u751F\u6548: iterations=${c.iterations} hash=${typeof c.hash === "string" ? c.hash : "object"}`
        );
      }
      return { hash, iterations: c.iterations };
    } catch (e) {
      lastErr = e;
    }
  }
  throw new Error(
    `\u5BC6\u7801\u54C8\u5E0C\u5931\u8D25(PBKDF2 \u5019\u9009\u5168\u90E8\u4E0D\u53EF\u7528): ${lastErr instanceof Error ? `${lastErr.name}: ${lastErr.message}` : String(lastErr)}`
  );
}
async function hashPassword(password) {
  const salt = new Uint8Array(SALT_BYTES);
  crypto.getRandomValues(salt);
  let saltHex = "";
  for (const b of salt) saltHex += b.toString(16).padStart(2, "0");
  const { hash, iterations } = await deriveWithFallback(password, salt);
  return `pbkdf2$${iterations}$${saltHex}$${hash}`;
}
async function verifyPassword(password, stored) {
  const parts = stored.split("$");
  if (parts.length !== 4 || parts[0] !== "pbkdf2") return false;
  const iterations = Number(parts[1]);
  const saltHex = parts[2];
  const expect = parts[3];
  if (!Number.isFinite(iterations) || iterations < 1 || !saltHex || !expect) return false;
  const salt = new Uint8Array(saltHex.length / 2);
  for (let i = 0; i < salt.length; i++) {
    salt[i] = parseInt(saltHex.slice(i * 2, i * 2 + 2), 16);
  }
  const forms = ["SHA-256", { name: "SHA-256" }];
  for (const form of forms) {
    let hash;
    try {
      hash = await deriveBits(password, salt, iterations, form);
    } catch {
      continue;
    }
    if (hash.length !== expect.length) return false;
    let diff = 0;
    for (let i = 0; i < hash.length; i++) diff |= hash.charCodeAt(i) ^ expect.charCodeAt(i);
    return diff === 0;
  }
  return false;
}
function validatePassword(password) {
  if (typeof password !== "string" || password.length < 8) return "\u5BC6\u7801\u81F3\u5C11 8 \u4F4D";
  if (password.length > 72) return "\u5BC6\u7801\u6700\u957F 72 \u4F4D";
  if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) return "\u5BC6\u7801\u9700\u540C\u65F6\u5305\u542B\u5B57\u6BCD\u4E0E\u6570\u5B57";
  return null;
}
function validateEmail(email) {
  if (typeof email !== "string" || email.length < 3 || email.length > 254) return "\u90AE\u7BB1\u683C\u5F0F\u4E0D\u6B63\u786E";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "\u90AE\u7BB1\u683C\u5F0F\u4E0D\u6B63\u786E";
  return null;
}

// src/utils/crypto.ts
async function sha256Hex(input) {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return hex(digest);
}
function hex(buf) {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let out = "";
  for (const b of bytes) out += b.toString(16).padStart(2, "0");
  return out;
}
function randomToken() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return hex(bytes);
}
function uuid() {
  return crypto.randomUUID();
}
function nowMs() {
  return Date.now();
}

// src/utils/register-policy.ts
var DEFAULT_REGISTER_EMAIL_DOMAINS = [
  "qq.com",
  "189.cn",
  "139.com",
  "163.com",
  "126.com"
];
function registerEmailDomains(override) {
  const raw2 = String(override ?? "").trim();
  if (!raw2) return DEFAULT_REGISTER_EMAIL_DOMAINS;
  const list = raw2.split(",").map((s) => s.trim().toLowerCase().replace(/^@+/, "")).filter((s) => s.length > 0 && s.includes("."));
  return list.length > 0 ? list : DEFAULT_REGISTER_EMAIL_DOMAINS;
}
function validateRegisterEmail(email, envDomains) {
  const at = email.lastIndexOf("@");
  if (at <= 0 || at === email.length - 1) return "\u90AE\u7BB1\u683C\u5F0F\u4E0D\u6B63\u786E";
  const domain = email.slice(at + 1).toLowerCase();
  const allowed = registerEmailDomains(envDomains);
  if (!allowed.includes(domain)) {
    return `\u90AE\u7BB1\u4E0D\u652F\u6301\uFF0C\u4EC5\u652F\u6301\u4EE5\u4E0B\u90AE\u7BB1\u6CE8\u518C\uFF1A${allowed.join("\u3001")}`;
  }
  return null;
}
var USERNAME_PREFIX = "agent-";
var USERNAME_DIGITS = 5;
function generateUsername() {
  const span = 10 ** USERNAME_DIGITS;
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  const n = buf[0] % span;
  return `${USERNAME_PREFIX}${String(n).padStart(USERNAME_DIGITS, "0")}`;
}
var USERNAME_MAX_ATTEMPTS = 12;

// src/services/username.ts
async function allocateUsername(db) {
  for (let i = 0; i < USERNAME_MAX_ATTEMPTS; i++) {
    const candidate = generateUsername();
    const hit = await db.execute({
      sql: "SELECT 1 FROM users WHERE username = ?",
      args: [candidate]
    });
    if (hit.rows.length === 0) return candidate;
  }
  throw errors.internal("\u8D26\u53F7\u540D\u751F\u6210\u5931\u8D25\uFF0C\u8BF7\u7A0D\u540E\u91CD\u8BD5");
}
async function loadOrBackfillUsername(db, userId) {
  try {
    const r = await db.execute({
      sql: "SELECT username FROM users WHERE id = ?",
      args: [userId]
    });
    const current = String(r.rows[0]?.username ?? "").trim();
    if (current) return current;
    const fresh = await allocateUsername(db);
    await db.execute({
      sql: "UPDATE users SET username = ?, updated_at = ? WHERE id = ?",
      args: [fresh, nowMs(), userId]
    });
    return fresh;
  } catch {
    return "";
  }
}
async function peekUsername(db, userId) {
  try {
    const r = await db.execute({
      sql: "SELECT username FROM users WHERE id = ?",
      args: [userId]
    });
    return String(r.rows[0]?.username ?? "").trim();
  } catch {
    return "";
  }
}

// src/utils/jwt.ts
var encoder2 = new TextEncoder();
function b64urlEncode(bytes) {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function b64urlDecode(input) {
  try {
    const pad = input.length % 4 === 0 ? "" : "=".repeat(4 - input.length % 4);
    const bin = atob(input.replace(/-/g, "+").replace(/_/g, "/") + pad);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes;
  } catch {
    return null;
  }
}
async function hmacKey(secret) {
  return crypto.subtle.importKey(
    "raw",
    encoder2.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}
async function signJwt(payload, secret) {
  const header = b64urlEncode(encoder2.encode(JSON.stringify({ alg: "HS256", typ: "JWT" })));
  const full = { ...payload, iat: Math.floor(Date.now() / 1e3) };
  const body = b64urlEncode(encoder2.encode(JSON.stringify(full)));
  const key = await hmacKey(secret);
  const sig = await crypto.subtle.sign("HMAC", key, encoder2.encode(`${header}.${body}`));
  return `${header}.${body}.${b64urlEncode(new Uint8Array(sig))}`;
}
async function verifyJwt(token, secret) {
  const parts = token.split(".");
  if (parts.length !== 3) return { ok: false, reason: "malformed" };
  const [header, body, sig] = parts;
  const key = await hmacKey(secret);
  const sigBytes = b64urlDecode(sig);
  if (!sigBytes) return { ok: false, reason: "malformed" };
  const valid = await crypto.subtle.verify(
    "HMAC",
    key,
    sigBytes,
    encoder2.encode(`${header}.${body}`)
  );
  if (!valid) return { ok: false, reason: "bad_signature" };
  let payload;
  try {
    const bodyBytes = b64urlDecode(body);
    if (!bodyBytes) return { ok: false, reason: "malformed" };
    payload = JSON.parse(new TextDecoder().decode(bodyBytes));
  } catch {
    return { ok: false, reason: "malformed" };
  }
  if (typeof payload.exp !== "number" || payload.exp * 1e3 < Date.now()) {
    return { ok: false, reason: "expired" };
  }
  return { ok: true, payload };
}
function accessTokenTtlSeconds() {
  return 2 * 60 * 60;
}

// src/plans.ts
var PLANS = ["free", "trial", "pro", "lifetime"];
var PLAN_LIMITS = {
  free: {
    relay_search: 20,
    relay_fetch: 20,
    task_run: 3,
    max_devices: 1,
    max_tasks: 1,
    backup_bytes: 5 * 1024 * 1024,
    // 云备份 5MB
    sync_rows: 2e3
    // 同步行数
  },
  trial: {
    relay_search: 100,
    relay_fetch: 100,
    task_run: 10,
    max_devices: 2,
    max_tasks: 5,
    backup_bytes: 20 * 1024 * 1024,
    // 20MB
    sync_rows: 1e4
  },
  pro: {
    relay_search: 500,
    relay_fetch: 500,
    task_run: 60,
    max_devices: 3,
    max_tasks: 20,
    backup_bytes: 100 * 1024 * 1024,
    // 100MB
    sync_rows: 5e4
  },
  lifetime: {
    relay_search: 500,
    relay_fetch: 500,
    task_run: 60,
    max_devices: 3,
    max_tasks: 20,
    backup_bytes: 500 * 1024 * 1024,
    // 500MB
    sync_rows: 2e5
  }
};
var WEEKLY_LIMITS = {
  free: {
    ai_chat: 100,
    // 免费版：每周 100 轮云端模型对话
    agent_run: 20
    // 云端 Agent：每周 20 次（Agent 单次成本远高于普通对话）
  },
  pro: {
    ai_chat: 1e3,
    // 专业版：每周 1000 轮
    agent_run: 200
  },
  lifetime: {
    ai_chat: 2e4,
    // 永久版：每周 20000 轮
    agent_run: 2e3
  }
};
var PLAN_LABELS = {
  free: "\u514D\u8D39\u7248",
  pro: "\u4E13\u4E1A\u7248",
  lifetime: "\u6C38\u4E45\u7248"
};
function weeklyTierOf(plan) {
  if (plan === "pro" || plan === "lifetime") return plan;
  return "free";
}
function parseLimitsOverride(raw2) {
  if (!raw2) return null;
  try {
    const parsed = JSON.parse(raw2);
    if (typeof parsed !== "object" || parsed === null) return null;
    return parsed;
  } catch {
    return null;
  }
}
function limitFor(plan, feature, override) {
  const limits = override?.[plan] ?? PLAN_LIMITS[plan];
  return limits[feature] ?? 0;
}
function assertPlan(plan) {
  if (!PLANS.includes(plan)) {
    throw errors.internal(`\u672A\u77E5\u5957\u9910: ${plan}`);
  }
  return plan;
}
function quotaDate(now = /* @__PURE__ */ new Date()) {
  const cst = new Date(now.getTime() + 8 * 3600 * 1e3);
  return cst.toISOString().slice(0, 10);
}
function weekStartDate(now = /* @__PURE__ */ new Date()) {
  const cst = new Date(now.getTime() + 8 * 3600 * 1e3);
  const dow = (cst.getUTCDay() + 6) % 7;
  cst.setUTCDate(cst.getUTCDate() - dow);
  return cst.toISOString().slice(0, 10);
}
function msUntilWeekReset(now = /* @__PURE__ */ new Date()) {
  const cst = new Date(now.getTime() + 8 * 3600 * 1e3);
  const dow = (cst.getUTCDay() + 6) % 7;
  const next = Date.UTC(
    cst.getUTCFullYear(),
    cst.getUTCMonth(),
    cst.getUTCDate() - dow + 7
  );
  return next - cst.getTime();
}
function nextDailyRun(scheduleHour, scheduleMinute, now = /* @__PURE__ */ new Date()) {
  const cst = new Date(now.getTime() + 8 * 3600 * 1e3);
  cst.setUTCHours(scheduleHour, scheduleMinute, 0, 0);
  let next = cst.getTime() - 8 * 3600 * 1e3;
  if (next <= now.getTime()) next += 24 * 3600 * 1e3;
  return next;
}

// src/middleware/auth.ts
function bearer(c) {
  const h = c.req.header("authorization");
  if (!h) return null;
  const m = /^Bearer\s+(.+)$/i.exec(h.trim());
  return m ? m[1].trim() : null;
}
async function userRow(db, userId) {
  const r = await db.execute({
    sql: "SELECT id, plan, plan_expires_at, status FROM users WHERE id = ?",
    args: [userId]
  });
  return r.rows[0] ?? null;
}
function effectivePlan(plan, expiresAt) {
  if (expiresAt === null) return plan;
  return expiresAt > nowMs() ? plan : "free";
}
async function requireAuth(c, next) {
  let token = bearer(c);
  if (!token && c.req.path.includes("/mcp")) {
    token = c.req.query("token") ?? null;
  }
  if (!token) throw errors.unauthorized();
  const db = c.get("db");
  const env = c.env;
  let user;
  if (token.startsWith("dt_")) {
    const hash = await sha256Hex(token);
    const r = await db.execute({
      sql: `SELECT s.user_id, s.device_id, u.plan, u.plan_expires_at, u.status
            FROM sessions s JOIN users u ON u.id = s.user_id
            WHERE s.token_hash = ? AND s.kind = 'device' AND s.revoked = 0`,
      args: [hash]
    });
    const row = r.rows[0];
    if (!row) throw errors.unauthorized("\u8BBE\u5907\u4EE4\u724C\u65E0\u6548\u6216\u5DF2\u540A\u9500");
    if (String(row.status) !== "active") throw errors.forbidden("\u8D26\u53F7\u5DF2\u88AB\u7981\u7528");
    user = {
      userId: String(row.user_id),
      plan: effectivePlan(String(row.plan), row.plan_expires_at),
      deviceId: String(row.device_id),
      kind: "device",
      planExpiresAt: row.plan_expires_at ?? null
    };
    await db.execute({
      sql: "UPDATE sessions SET last_used_at = ? WHERE token_hash = ?",
      args: [nowMs(), hash]
    });
  } else {
    const result = await verifyJwt(token, env.JWT_SECRET);
    if (!result.ok) {
      throw errors.unauthorized(
        result.reason === "expired" ? "\u767B\u5F55\u5DF2\u8FC7\u671F, \u8BF7\u91CD\u65B0\u767B\u5F55" : "\u4EE4\u724C\u65E0\u6548"
      );
    }
    const row = await userRow(db, result.payload.sub);
    if (!row) throw errors.unauthorized("\u8D26\u53F7\u4E0D\u5B58\u5728");
    if (String(row.status) !== "active") throw errors.forbidden("\u8D26\u53F7\u5DF2\u88AB\u7981\u7528");
    user = {
      userId: result.payload.sub,
      plan: effectivePlan(String(row.plan), row.plan_expires_at ?? null),
      deviceId: result.payload.did ?? "",
      kind: "jwt",
      planExpiresAt: row.plan_expires_at ?? null
    };
  }
  assertPlan(user.plan);
  c.set("user", user);
  await next();
}
async function requireAdmin(c, next) {
  const token = bearer(c);
  if (!token || token !== c.env.ADMIN_TOKEN) {
    throw errors.unauthorized("\u7BA1\u7406\u5458\u4EE4\u724C\u65E0\u6548");
  }
  await next();
}

// src/services/audit.ts
async function audit(db, userId, action, detail, ip) {
  await db.execute({
    sql: "INSERT INTO audit_log (user_id, action, detail, ip, at) VALUES (?, ?, ?, ?, ?)",
    args: [userId, action, detail, ip, Date.now()]
  });
}

// src/routes/auth.ts
var authRoutes = new Hono3();
var REFRESH_TTL = 30 * 24 * 3600 * 1e3;
async function issueTokens(env, userId, plan, planExpiresAt, deviceId) {
  const accessToken = await signJwt(
    { sub: userId, plan, exp: Math.floor(nowMs() / 1e3) + accessTokenTtlSeconds(), did: deviceId },
    env.JWT_SECRET
  );
  return { accessToken, expiresIn: accessTokenTtlSeconds(), plan, planExpiresAt };
}
async function createSession(db, userId, deviceId, deviceName, kind) {
  const raw2 = kind === "device" ? `dt_${randomToken()}` : `rt_${randomToken()}`;
  const hash = await sha256Hex(raw2);
  await db.execute({
    sql: `INSERT INTO sessions (token_hash, user_id, kind, device_id, device_name, expires_at, created_at, last_used_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [hash, userId, kind, deviceId, deviceName, kind === "device" ? null : nowMs() + REFRESH_TTL, nowMs(), nowMs()]
  });
  if (kind === "refresh") {
    await db.execute({
      sql: "UPDATE sessions SET revoked = 1 WHERE user_id = ? AND device_id = ? AND kind = 'refresh' AND token_hash != ?",
      args: [userId, deviceId, hash]
    });
  }
  return raw2;
}
async function touchDevice(db, userId, plan, deviceId, deviceName) {
  const existing = await db.execute({
    sql: "SELECT 1 FROM devices WHERE user_id = ? AND device_id = ?",
    args: [userId, deviceId]
  });
  if (existing.rows.length === 0) {
    const MAX_DEVICES = { free: 1, trial: 2, pro: 3, lifetime: 3 };
    const count = await db.execute({
      sql: "SELECT COUNT(*) AS n FROM devices WHERE user_id = ?",
      args: [userId]
    });
    if (Number(count.rows[0]?.n ?? 0) >= (MAX_DEVICES[plan] ?? 1)) {
      throw errors.forbidden(
        `\u5F53\u524D\u5957\u9910\u6700\u591A\u7ED1\u5B9A ${MAX_DEVICES[plan] ?? 1} \u53F0\u8BBE\u5907, \u8BF7\u5148\u89E3\u7ED1\u65E7\u8BBE\u5907\u6216\u5347\u7EA7\u5957\u9910`
      );
    }
  }
  await db.execute({
    sql: `INSERT INTO devices (user_id, device_id, device_name, activated_at, last_seen_at)
          VALUES (?, ?, ?, ?, ?)
          ON CONFLICT(user_id, device_id) DO UPDATE SET last_seen_at = excluded.last_seen_at`,
    args: [userId, deviceId, deviceName, nowMs(), nowMs()]
  });
}
function planExpiry(plan, licenseExpiry) {
  return plan === "lifetime" ? null : licenseExpiry;
}
function missingUsernameColumn(e) {
  const msg = e instanceof Error ? e.message : String(e);
  return msg.includes("no such column") && msg.includes("username");
}
authRoutes.post("/register", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const email = String(body.email ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");
  const deviceId = String(body.deviceId ?? "").trim();
  const deviceName = String(body.deviceName ?? "").slice(0, 100);
  const emailErr = validateEmail(email);
  if (emailErr) throw errors.badRequest(emailErr);
  const domainErr = validateRegisterEmail(email, c.env.REGISTER_EMAIL_DOMAINS);
  if (domainErr) throw errors.badRequest(domainErr, "email_domain_not_allowed");
  const pwdErr = validatePassword(password);
  if (pwdErr) throw errors.badRequest(pwdErr);
  if (!deviceId) throw errors.badRequest("\u7F3A\u5C11 deviceId");
  const db = c.get("db");
  const exists = await db.execute({ sql: "SELECT id FROM users WHERE email = ?", args: [email] });
  if (exists.rows.length > 0) throw errors.conflict("\u8BE5\u90AE\u7BB1\u5DF2\u6CE8\u518C");
  const userId = `u_${uuid()}`;
  const username = await allocateUsername(db);
  const passwordHash = await hashPassword(password);
  try {
    await db.execute({
      sql: `INSERT INTO users (id, username, email, password_hash, plan, plan_expires_at, status, created_at, updated_at)
            VALUES (?, ?, ?, ?, 'free', NULL, 'active', ?, ?)`,
      args: [userId, username, email, passwordHash, nowMs(), nowMs()]
    });
  } catch (e) {
    if (missingUsernameColumn(e)) {
      throw errors.internal("\u6570\u636E\u5E93\u7ED3\u6784\u672A\u5347\u7EA7\uFF0C\u8BF7\u5148\u6267\u884C node scripts/migrate.mjs");
    }
    throw e;
  }
  await touchDevice(db, userId, "free", deviceId, deviceName);
  const refreshToken = await createSession(db, userId, deviceId, deviceName, "refresh");
  await audit(db, userId, "register", `${username} ${email}`, c.req.header("cf-connecting-ip") ?? "");
  const pair = await issueTokens(c.env, userId, "free", null, deviceId);
  return c.json({ ...pair, refreshToken, userId, username });
});
authRoutes.post("/login", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const email = String(body.email ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");
  const deviceId = String(body.deviceId ?? "").trim();
  const deviceName = String(body.deviceName ?? "").slice(0, 100);
  if (!email || !password || !deviceId) throw errors.badRequest("\u7F3A\u5C11 email/password/deviceId");
  const db = c.get("db");
  const r = await db.execute({
    sql: "SELECT id, password_hash, plan, plan_expires_at, status FROM users WHERE email = ?",
    args: [email]
  });
  const row = r.rows[0];
  if (!row || !await verifyPassword(password, String(row.password_hash))) {
    throw errors.unauthorized("\u90AE\u7BB1\u6216\u5BC6\u7801\u9519\u8BEF");
  }
  if (String(row.status) !== "active") throw errors.forbidden("\u8D26\u53F7\u5DF2\u88AB\u7981\u7528");
  const userId = String(row.id);
  const username = await loadOrBackfillUsername(db, userId);
  await touchDevice(db, userId, String(row.plan), deviceId, deviceName);
  const refreshToken = await createSession(db, userId, deviceId, deviceName, "refresh");
  await audit(db, userId, "login", deviceId, c.req.header("cf-connecting-ip") ?? "");
  const pair = await issueTokens(c.env, userId, String(row.plan), planExpiry(String(row.plan), row.plan_expires_at), deviceId);
  return c.json({ ...pair, refreshToken, userId, username });
});
authRoutes.post("/refresh", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const refreshToken = String(body.refreshToken ?? "");
  if (!refreshToken.startsWith("rt_")) throw errors.unauthorized("\u4EE4\u724C\u683C\u5F0F\u9519\u8BEF");
  const db = c.get("db");
  const hash = await sha256Hex(refreshToken);
  const r = await db.execute({
    sql: `SELECT s.user_id, s.device_id, s.device_name, s.expires_at, u.plan, u.plan_expires_at, u.status
          FROM sessions s JOIN users u ON u.id = s.user_id
          WHERE s.token_hash = ? AND s.kind = 'refresh' AND s.revoked = 0`,
    args: [hash]
  });
  const row = r.rows[0];
  if (!row) throw errors.unauthorized("\u5237\u65B0\u4EE4\u724C\u65E0\u6548");
  if (row.expires_at !== null && Number(row.expires_at) < nowMs()) {
    throw errors.unauthorized("\u5237\u65B0\u4EE4\u724C\u5DF2\u8FC7\u671F, \u8BF7\u91CD\u65B0\u767B\u5F55");
  }
  if (String(row.status) !== "active") throw errors.forbidden("\u8D26\u53F7\u5DF2\u88AB\u7981\u7528");
  const userId = String(row.user_id);
  const deviceId = String(row.device_id);
  await db.execute({ sql: "UPDATE sessions SET revoked = 1 WHERE token_hash = ?", args: [hash] });
  const newRefresh = await createSession(db, userId, deviceId, String(row.device_name), "refresh");
  const plan = String(row.plan);
  const pair = await issueTokens(c.env, userId, plan, planExpiry(plan, row.plan_expires_at), deviceId);
  return c.json({ ...pair, refreshToken: newRefresh, userId });
});
authRoutes.post("/logout", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const refreshToken = String(body.refreshToken ?? "");
  if (refreshToken.startsWith("rt_")) {
    const db = c.get("db");
    await db.execute({
      sql: "UPDATE sessions SET revoked = 1 WHERE token_hash = ? AND kind = 'refresh'",
      args: [await sha256Hex(refreshToken)]
    });
  }
  return c.json({ ok: true });
});
authRoutes.get("/devices", requireAuth, async (c) => {
  const db = c.get("db");
  const r = await db.execute({
    sql: `SELECT d.device_id, d.device_name, d.activated_at, d.last_seen_at,
                 (SELECT COUNT(*) FROM sessions s WHERE s.user_id = d.user_id AND s.device_id = d.device_id AND s.revoked = 0) AS active_sessions
          FROM devices d WHERE d.user_id = ? ORDER BY d.activated_at`,
    args: [c.get("user").userId]
  });
  return c.json({
    devices: r.rows.map((row) => ({
      deviceId: row.device_id,
      deviceName: row.device_name,
      activatedAt: row.activated_at,
      lastSeenAt: row.last_seen_at,
      activeSessions: Number(row.active_sessions),
      current: row.device_id === c.get("user").deviceId
    }))
  });
});
authRoutes.delete("/devices/:deviceId", requireAuth, async (c) => {
  const target = String(c.req.param("deviceId") ?? "");
  const user = c.get("user");
  if (target === user.deviceId && user.kind === "jwt") {
    throw errors.badRequest("\u4E0D\u80FD\u89E3\u7ED1\u5F53\u524D\u8BBE\u5907, \u8BF7\u5148\u7528\u76EE\u6807\u8BBE\u5907\u64CD\u4F5C\u6216\u8D70\u6362\u673A\u6D41\u7A0B");
  }
  const db = c.get("db");
  const r = await db.execute({
    sql: "DELETE FROM devices WHERE user_id = ? AND device_id = ?",
    args: [user.userId, target]
  });
  if (r.rowsAffected === 0) throw errors.notFound("\u8BBE\u5907\u4E0D\u5B58\u5728");
  await db.execute({
    sql: "UPDATE sessions SET revoked = 1 WHERE user_id = ? AND device_id = ?",
    args: [user.userId, target]
  });
  await audit(db, user.userId, "unbind", target, c.req.header("cf-connecting-ip") ?? "");
  return c.json({ ok: true });
});
authRoutes.post("/device-token", requireAuth, async (c) => {
  const user = c.get("user");
  const body = await c.req.json().catch(() => ({}));
  const deviceId = String(body.deviceId ?? user.deviceId ?? "").trim();
  if (!deviceId) throw errors.badRequest("\u7F3A\u5C11 deviceId");
  const db = c.get("db");
  const token = await createSession(db, user.userId, deviceId, String(body.deviceName ?? ""), "device");
  await audit(db, user.userId, "device_token_issued", deviceId, "");
  return c.json({ deviceToken: token, note: "\u8BF7\u59A5\u5584\u4FDD\u5B58, \u4EC5\u53EF\u5728\u8BBE\u5907\u7BA1\u7406\u4E2D\u540A\u9500" });
});

// src/services/quota.ts
async function consumeQuota(db, userId, plan, feature, override) {
  const limit = limitFor(plan, feature, override);
  const date = quotaDate();
  const current = await db.execute({
    sql: "SELECT count FROM usage_daily WHERE user_id = ? AND date = ? AND feature = ?",
    args: [userId, date, feature]
  });
  const used = Number(current.rows[0]?.count ?? 0);
  if (limit <= 0 || used >= limit) {
    throw errors.quota(`\u300C${feature}\u300D\u4ECA\u65E5\u989D\u5EA6\u5DF2\u7528\u5C3D (${used}/${limit})`);
  }
  await db.execute({
    sql: `INSERT INTO usage_daily (user_id, date, feature, count) VALUES (?, ?, ?, 1)
          ON CONFLICT(user_id, date, feature) DO UPDATE SET count = count + 1`,
    args: [userId, date, feature]
  });
  return { used: used + 1, limit };
}
async function getUsage(db, userId, feature) {
  const r = await db.execute({
    sql: "SELECT count FROM usage_daily WHERE user_id = ? AND date = ? AND feature = ?",
    args: [userId, quotaDate(), feature]
  });
  return Number(r.rows[0]?.count ?? 0);
}
async function getWeeklyUsage(db, userId, feature) {
  const r = await db.execute({
    sql: "SELECT count FROM usage_weekly WHERE user_id = ? AND week_start = ? AND feature = ?",
    args: [userId, weekStartDate(), feature]
  });
  return Number(r.rows[0]?.count ?? 0);
}
async function weeklyQuotaState(db, userId, plan, feature) {
  const tier = weeklyTierOf(plan);
  const limit = WEEKLY_LIMITS[tier][feature] ?? 0;
  const used = await getWeeklyUsage(db, userId, feature);
  return {
    tier,
    used,
    limit,
    remaining: Math.max(0, limit - used),
    weekStart: weekStartDate(),
    resetInMs: msUntilWeekReset()
  };
}
async function consumeWeeklyQuota(db, userId, plan, feature) {
  const tier = weeklyTierOf(plan);
  const limit = WEEKLY_LIMITS[tier][feature] ?? 0;
  if (limit <= 0) {
    throw errors.quota(`\u5F53\u524D\u5957\u9910\u4E0D\u652F\u6301\u300C${feature}\u300D`);
  }
  const week = weekStartDate();
  const current = await getWeeklyUsage(db, userId, feature);
  if (current >= limit) {
    throw errors.quota(`\u672C\u5468\u989D\u5EA6\u5DF2\u7528\u5C3D (${current}/${limit}), \u4E0B\u5468\u4E00 00:00 \u81EA\u52A8\u91CD\u7F6E`);
  }
  const r = await db.execute({
    sql: `INSERT INTO usage_weekly (user_id, week_start, feature, count) VALUES (?, ?, ?, 1)
          ON CONFLICT(user_id, week_start, feature) DO UPDATE SET count = count + 1
          RETURNING count`,
    args: [userId, week, feature]
  });
  const used = Number(r.rows[0]?.count ?? current + 1);
  return { used, limit };
}

// src/routes/license.ts
var licenseRoutes = new Hono3();
licenseRoutes.post("/activate", async (c) => {
  return c.json(
    {
      error: {
        code: "license_removed",
        message: "\u5361\u5BC6\u6FC0\u6D3B\u5DF2\u4E0B\u7EBF\uFF1A\u6388\u6743\u6539\u7531\u7BA1\u7406\u53F0\u76F4\u63A5\u4E3A\u8D26\u53F7\u8BBE\u7F6E\u5957\u9910"
      }
    },
    410
  );
});
licenseRoutes.get("/status", requireAuth, async (c) => {
  const user = c.get("user");
  const db = c.get("db");
  const usage = {
    relay_search: await getUsage(db, user.userId, "relay_search"),
    relay_fetch: await getUsage(db, user.userId, "relay_fetch"),
    task_run: await getUsage(db, user.userId, "task_run")
  };
  const ai = await weeklyQuotaState(db, user.userId, user.plan, "ai_chat");
  return c.json({
    userId: user.userId,
    // 账号名 agent-<5位数字>；老用户还没回填时为空串，App 侧回落显示 userId
    username: await peekUsername(db, user.userId),
    plan: user.plan,
    planExpiresAt: user.planExpiresAt,
    usageToday: usage,
    // 云端模型周额度（每周一 00:00 UTC+8 自动归零）
    aiQuota: {
      tier: ai.tier,
      tierLabel: PLAN_LABELS[ai.tier],
      used: ai.used,
      limit: ai.limit,
      remaining: ai.remaining,
      weekStart: ai.weekStart,
      resetInMs: ai.resetInMs
    },
    licenses: []
    // 卡密已下线, 字段保留以兼容旧版 App
  });
});

// src/services/search.ts
function decodeEntities(s) {
  return s.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#x27;|&#39;/g, "'").replace(/&nbsp;/g, " ");
}
function stripTags(s) {
  return decodeEntities(s.replace(/<[^>]*>/g, "")).replace(/\s+/g, " ").trim();
}
function extractDdgUrl(href) {
  const m = /[?&]uddg=([^&]+)/.exec(href);
  if (m) {
    try {
      return decodeURIComponent(m[1]);
    } catch {
      return href;
    }
  }
  if (href.startsWith("//")) return `https:${href}`;
  return href;
}
function parseDuckDuckGoHtml(html, maxResults = 8) {
  const titleRe = /<a[^>]+class="[^"]*result__a[^"]*"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g;
  const snippetRe = /<a[^>]+class="[^"]*result__snippet[^"]*"[^>]*>([\s\S]*?)<\/a>/g;
  const titles = [];
  let m;
  while ((m = titleRe.exec(html)) !== null) {
    titles.push({ pos: m.index, url: extractDdgUrl(m[1]), title: stripTags(m[2]) });
  }
  const snippets = [];
  while ((m = snippetRe.exec(html)) !== null) {
    snippets.push({ pos: m.index, text: stripTags(m[1]) });
  }
  const results = [];
  for (let i = 0; i < titles.length && results.length < maxResults; i++) {
    if (!titles[i].title) continue;
    const upper = i + 1 < titles.length ? titles[i + 1].pos : Infinity;
    const own = snippets.find((s) => s.pos > titles[i].pos && s.pos < upper);
    results.push({ title: titles[i].title, url: titles[i].url, snippet: own ? own.text : "" });
  }
  return results;
}
var duckDuckGoBackend = {
  name: "duckduckgo",
  async search(query, maxResults) {
    const resp = await fetch("https://html.duckduckgo.com/html/", {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
        "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
      },
      body: new URLSearchParams({ q: query }).toString()
    });
    if (!resp.ok) throw new Error(`DuckDuckGo HTTP ${resp.status}`);
    return parseDuckDuckGoHtml(await resp.text(), maxResults);
  }
};
function serperBackend(apiKey) {
  return {
    name: "serper",
    async search(query, maxResults) {
      const resp = await fetch("https://google.serper.dev/search", {
        method: "POST",
        headers: { "X-API-KEY": apiKey, "content-type": "application/json" },
        body: JSON.stringify({ q: query, num: maxResults })
      });
      if (!resp.ok) throw new Error(`Serper HTTP ${resp.status}`);
      const data = await resp.json();
      return (data.organic ?? []).slice(0, maxResults).map((o) => ({
        title: o.title,
        url: o.link,
        snippet: o.snippet ?? ""
      }));
    }
  };
}
function bochaBackend(apiKey) {
  return {
    name: "bocha",
    async search(query, maxResults) {
      const resp = await fetch("https://api.bochaai.com/v1/web-search", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
        body: JSON.stringify({ query, count: maxResults, summary: true })
      });
      if (!resp.ok) throw new Error(`\u535A\u67E5 HTTP ${resp.status}`);
      const data = await resp.json();
      return (data.data?.webPages?.value ?? []).slice(0, maxResults).map((o) => ({
        title: o.name,
        url: o.url,
        snippet: o.summary ?? o.snippet ?? ""
      }));
    }
  };
}
function pickBackend(env) {
  switch (env.SEARCH_PROVIDER) {
    case "serper":
      if (!env.SERPER_API_KEY) throw new Error("SERPER_API_KEY \u672A\u914D\u7F6E");
      return serperBackend(env.SERPER_API_KEY);
    case "bocha":
      if (!env.BOCHA_API_KEY) throw new Error("BOCHA_API_KEY \u672A\u914D\u7F6E");
      return bochaBackend(env.BOCHA_API_KEY);
    default:
      return duckDuckGoBackend;
  }
}
function formatResults(results) {
  if (results.length === 0) return "\u672A\u627E\u5230\u76F8\u5173\u7ED3\u679C\u3002";
  return results.map((r, i) => `${i + 1}. ${r.title}
   ${r.url}${r.snippet ? `
   ${r.snippet}` : ""}`).join("\n\n");
}

// src/services/fetcher.ts
var MAX_BODY_BYTES = 2 * 1024 * 1024;
var MAX_TEXT_CHARS = 8e3;
var BLOCKED_HOSTNAME_RE = /^(localhost|.*\.local|.*\.internal|metadata\.google\.internal|169\.254\..*|127\.\d+\.\d+\.\d+|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+|\[?::1\]?)$/i;
function isBlockedHost(hostname) {
  return BLOCKED_HOSTNAME_RE.test(hostname);
}
function validateTargetUrl(raw2) {
  let url;
  try {
    url = new URL(raw2);
  } catch {
    throw new Error("URL \u683C\u5F0F\u4E0D\u6B63\u786E");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("\u4EC5\u652F\u6301 http/https");
  }
  if (isBlockedHost(url.hostname)) {
    throw new Error("\u4E0D\u5141\u8BB8\u8BBF\u95EE\u5185\u7F51/\u73AF\u56DE\u5730\u5740");
  }
  return url;
}
function stripHtml(html) {
  return html.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<noscript[\s\S]*?<\/noscript>/gi, " ").replace(/<!--[\s\S]*?-->/g, " ").replace(/<\/(p|div|li|h[1-6]|tr|br)>/gi, "\n").replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#x27;|&#39;/g, "'").replace(/[ \t]+/g, " ").replace(/\n\s*\n\s*\n+/g, "\n\n").trim();
}
async function fetchPage(rawUrl) {
  const url = validateTargetUrl(rawUrl);
  const resp = await fetch(url, {
    headers: {
      "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
      accept: "text/html,application/xhtml+xml,text/plain,application/json;q=0.9,*/*;q=0.5"
    },
    redirect: "follow"
  });
  if (!resp.ok) throw new Error(`\u76EE\u6807\u7AD9\u70B9\u8FD4\u56DE HTTP ${resp.status}`);
  const contentType = resp.headers.get("content-type") ?? "";
  const buf = await resp.arrayBuffer();
  if (buf.byteLength > MAX_BODY_BYTES) throw new Error("\u54CD\u5E94\u4F53\u8D85\u8FC7 2MB \u4E0A\u9650");
  const text = new TextDecoder().decode(buf);
  if (contentType.includes("application/json")) {
    const body2 = text.length > MAX_TEXT_CHARS ? text.slice(0, MAX_TEXT_CHARS) : text;
    return { url: resp.url || url.toString(), title: url.hostname, content: body2, truncated: text.length > MAX_TEXT_CHARS };
  }
  if (contentType.includes("text/plain")) {
    const body2 = text.length > MAX_TEXT_CHARS ? text.slice(0, MAX_TEXT_CHARS) : text;
    return { url: resp.url || url.toString(), title: url.hostname, content: body2, truncated: text.length > MAX_TEXT_CHARS };
  }
  const titleMatch = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(text);
  const content = stripHtml(text);
  const body = content.length > MAX_TEXT_CHARS ? content.slice(0, MAX_TEXT_CHARS) : content;
  return {
    url: resp.url || url.toString(),
    title: titleMatch ? titleMatch[1].trim() : url.hostname,
    content: body,
    truncated: content.length > MAX_TEXT_CHARS
  };
}

// src/routes/relay.ts
var relayRoutes = new Hono3();
relayRoutes.get("/search", requireAuth, async (c) => {
  const user = c.get("user");
  const query = c.req.query("q")?.trim();
  if (!query) throw errors.badRequest("\u7F3A\u5C11 q \u53C2\u6570");
  const max = Math.min(Math.max(Number(c.req.query("max") ?? 8), 1), 20);
  const override = parseLimitsOverride(c.env.PLAN_LIMITS_OVERRIDE);
  const { used, limit } = await consumeQuota(
    c.get("db"),
    user.userId,
    user.plan,
    "relay_search",
    override
  );
  try {
    const backend = pickBackend(c.env);
    const results = await backend.search(query, max);
    return c.json({ provider: backend.name, results, formatted: formatResults(results), usage: { used, limit } });
  } catch (e) {
    throw errors.internal(`\u641C\u7D22\u5931\u8D25: ${e instanceof Error ? e.message : String(e)}`);
  }
});
relayRoutes.get("/fetch", requireAuth, async (c) => {
  const user = c.get("user");
  const url = c.req.query("url")?.trim();
  if (!url) throw errors.badRequest("\u7F3A\u5C11 url \u53C2\u6570");
  const override = parseLimitsOverride(c.env.PLAN_LIMITS_OVERRIDE);
  const { used, limit } = await consumeQuota(
    c.get("db"),
    user.userId,
    user.plan,
    "relay_fetch",
    override
  );
  try {
    const page = await fetchPage(url);
    return c.json({ ...page, usage: { used, limit } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("\u4E0D\u5141\u8BB8") || msg.includes("\u4EC5\u652F\u6301") || msg.includes("\u683C\u5F0F")) {
      throw errors.badRequest(msg);
    }
    throw errors.internal(`\u6293\u53D6\u5931\u8D25: ${msg}`);
  }
});

// src/services/task_runner.ts
async function findDueTasks(db, now = nowMs()) {
  const r = await db.execute({
    sql: `SELECT id, user_id, name, prompt, schedule_type, schedule_hour, schedule_minute, next_run_at
          FROM cloud_tasks
          WHERE enabled = 1 AND schedule_type = 'daily' AND next_run_at IS NOT NULL AND next_run_at <= ?
          LIMIT 50`,
    args: [now]
  });
  return r.rows;
}
async function callLlm(env, prompt) {
  const { CLOUD_LLM_BASE_URL, CLOUD_LLM_API_KEY, CLOUD_LLM_MODEL } = env;
  if (!CLOUD_LLM_BASE_URL || !CLOUD_LLM_API_KEY || !CLOUD_LLM_MODEL) {
    throw new Error("CLOUD_LLM_* \u73AF\u5883\u53D8\u91CF\u672A\u914D\u7F6E, \u65E0\u6CD5\u6267\u884C\u4E91\u7AEF\u4EFB\u52A1");
  }
  const base = CLOUD_LLM_BASE_URL.replace(/\/+$/, "");
  const resp = await fetch(`${base}/chat/completions`, {
    method: "POST",
    headers: { authorization: `Bearer ${CLOUD_LLM_API_KEY}`, "content-type": "application/json" },
    body: JSON.stringify({
      model: CLOUD_LLM_MODEL,
      messages: [
        { role: "system", content: "\u4F60\u662F orion_agent \u7684\u4E91\u7AEF\u5B9A\u65F6\u4EFB\u52A1\u6267\u884C\u5668\u3002\u76F4\u63A5\u5B8C\u6210\u4EFB\u52A1\u5E76\u8F93\u51FA\u7ED3\u679C\u6B63\u6587, \u4E0D\u8981\u5BD2\u6684\u3002" },
        { role: "user", content: prompt }
      ],
      max_tokens: 2e3
    })
  });
  if (!resp.ok) {
    const body = await resp.text().catch(() => "");
    throw new Error(`LLM HTTP ${resp.status}: ${body.slice(0, 300)}`);
  }
  const data = await resp.json();
  return data.choices?.[0]?.message?.content ?? "";
}
function computeNextRun(task, now = nowMs()) {
  if (task.schedule_type !== "daily") return null;
  return nextDailyRun(task.schedule_hour, task.schedule_minute, new Date(now));
}
async function executeTask(db, env, task, now = nowMs()) {
  const runId = `r_${uuid()}`;
  await db.execute({
    sql: "INSERT INTO task_runs (id, task_id, user_id, started_at, status) VALUES (?, ?, ?, ?, 'running')",
    args: [runId, task.id, task.user_id, now]
  });
  try {
    const result = await callLlm(env, task.prompt);
    await db.execute({
      sql: "UPDATE task_runs SET finished_at = ?, status = 'ok', result = ? WHERE id = ?",
      args: [Date.now(), result, runId]
    });
    await db.execute({ sql: "UPDATE cloud_tasks SET last_status = 'ok', last_run_at = ? WHERE id = ?", args: [now, task.id] });
    return { runId, result };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await db.execute({
      sql: "UPDATE task_runs SET finished_at = ?, status = 'error', result = ? WHERE id = ?",
      args: [Date.now(), `\u6267\u884C\u5931\u8D25: ${msg}`, runId]
    });
    await db.execute({ sql: "UPDATE cloud_tasks SET last_status = 'error' WHERE id = ?", args: [task.id] });
    throw e;
  }
}
async function runDueTasks(db, env, now = nowMs()) {
  const due = await findDueTasks(db, now);
  let ok = 0;
  let failed = 0;
  for (const task of due) {
    const next = computeNextRun(task, now);
    const claim = await db.execute({
      sql: `UPDATE cloud_tasks SET next_run_at = ?, last_run_at = ?, last_status = 'running'
            WHERE id = ? AND next_run_at = ?`,
      args: [next, now, task.id, task.next_run_at]
    });
    if (claim.rowsAffected === 0) continue;
    try {
      await executeTask(db, env, task, now);
      ok++;
    } catch {
      failed++;
    }
  }
  return { ran: due.length, ok, failed };
}

// src/routes/tasks.ts
var taskRoutes = new Hono3();
var MAX_TASKS_BY_PLAN = { free: 1, trial: 5, pro: 20, lifetime: 20 };
taskRoutes.get("/", requireAuth, async (c) => {
  const db = c.get("db");
  const r = await db.execute({
    sql: `SELECT id, name, prompt, schedule_type, schedule_hour, schedule_minute, enabled,
                 next_run_at, last_run_at, last_status, created_at
          FROM cloud_tasks WHERE user_id = ? ORDER BY created_at DESC`,
    args: [c.get("user").userId]
  });
  return c.json({ tasks: r.rows });
});
taskRoutes.post("/", requireAuth, async (c) => {
  const user = c.get("user");
  const body = await c.req.json().catch(() => ({}));
  const name = String(body.name ?? "").trim().slice(0, 100);
  const prompt = String(body.prompt ?? "").trim().slice(0, 8e3);
  const scheduleType = body.scheduleType === "manual" ? "manual" : "daily";
  const hour = Math.min(Math.max(Number(body.scheduleHour ?? 8), 0), 23);
  const minute = Math.min(Math.max(Number(body.scheduleMinute ?? 0), 0), 59);
  if (!name || !prompt) throw errors.badRequest("\u7F3A\u5C11 name/prompt");
  const db = c.get("db");
  const count = await db.execute({
    sql: "SELECT COUNT(*) AS n FROM cloud_tasks WHERE user_id = ?",
    args: [user.userId]
  });
  const maxTasks = MAX_TASKS_BY_PLAN[user.plan] ?? 1;
  if (Number(count.rows[0]?.n ?? 0) >= maxTasks) {
    throw errors.quota(`\u5F53\u524D\u5957\u9910\u6700\u591A ${maxTasks} \u4E2A\u4E91\u7AEF\u4EFB\u52A1, \u8BF7\u5347\u7EA7\u6216\u5220\u9664\u65E7\u4EFB\u52A1`);
  }
  const id = `t_${uuid()}`;
  const nextRun = scheduleType === "daily" ? nextDailyRun(hour, minute) : null;
  await db.execute({
    sql: `INSERT INTO cloud_tasks (id, user_id, name, prompt, schedule_type, schedule_hour, schedule_minute, enabled, next_run_at, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
    args: [id, user.userId, name, prompt, scheduleType, hour, minute, nextRun, nowMs()]
  });
  return c.json({ ok: true, id, nextRunAt: nextRun });
});
taskRoutes.delete("/:id", requireAuth, async (c) => {
  const db = c.get("db");
  const r = await db.execute({
    sql: "DELETE FROM cloud_tasks WHERE id = ? AND user_id = ?",
    args: [String(c.req.param("id") ?? ""), c.get("user").userId]
  });
  if (r.rowsAffected === 0) throw errors.notFound("\u4EFB\u52A1\u4E0D\u5B58\u5728");
  await db.execute({
    sql: "DELETE FROM task_runs WHERE task_id = ? AND user_id = ?",
    args: [String(c.req.param("id") ?? ""), c.get("user").userId]
  });
  return c.json({ ok: true });
});
taskRoutes.patch("/:id", requireAuth, async (c) => {
  const body = await c.req.json().catch(() => ({}));
  if (typeof body.enabled !== "boolean") throw errors.badRequest("\u4EC5\u652F\u6301\u66F4\u65B0 enabled \u5B57\u6BB5");
  const user = c.get("user");
  const db = c.get("db");
  const id = String(c.req.param("id") ?? "");
  if (!body.enabled) {
    const r = await db.execute({
      sql: "UPDATE cloud_tasks SET enabled = 0 WHERE id = ? AND user_id = ?",
      args: [id, user.userId]
    });
    if (r.rowsAffected === 0) throw errors.notFound("\u4EFB\u52A1\u4E0D\u5B58\u5728");
    return c.json({ ok: true });
  }
  const task = await db.execute({
    sql: "SELECT schedule_hour, schedule_minute, schedule_type FROM cloud_tasks WHERE id = ? AND user_id = ?",
    args: [id, user.userId]
  });
  const row = task.rows[0];
  if (!row) throw errors.notFound("\u4EFB\u52A1\u4E0D\u5B58\u5728");
  const nextRun = String(row.schedule_type) === "daily" ? nextDailyRun(Number(row.schedule_hour), Number(row.schedule_minute)) : null;
  await db.execute({
    sql: "UPDATE cloud_tasks SET enabled = 1, next_run_at = ? WHERE id = ? AND user_id = ?",
    args: [nextRun, id, user.userId]
  });
  return c.json({ ok: true, nextRunAt: nextRun });
});
taskRoutes.get("/results", requireAuth, async (c) => {
  const after = Number(c.req.query("after") ?? 0);
  const db = c.get("db");
  const r = await db.execute({
    sql: `SELECT r.id, r.task_id, t.name AS task_name, r.started_at, r.finished_at, r.status, r.result
          FROM task_runs r JOIN cloud_tasks t ON t.id = r.task_id
          WHERE r.user_id = ? AND r.started_at > ? AND r.status != 'running'
          ORDER BY r.started_at DESC LIMIT 100`,
    args: [c.get("user").userId, after]
  });
  return c.json({
    results: r.rows.map((row) => ({
      id: row.id,
      taskId: row.task_id,
      taskName: row.task_name,
      startedAt: row.started_at,
      finishedAt: row.finished_at,
      status: row.status,
      result: row.result
    })),
    serverTime: nowMs()
  });
});
taskRoutes.post("/run-due", requireAdmin, async (c) => {
  const db = c.get("db");
  const stats = await runDueTasks(db, c.env);
  return c.json({ ok: true, ran: stats.ran, succeeded: stats.ok, failed: stats.failed });
});
taskRoutes.post("/:id/run", requireAuth, async (c) => {
  const user = c.get("user");
  const db = c.get("db");
  const override = parseLimitsOverride(c.env.PLAN_LIMITS_OVERRIDE);
  await consumeQuota(db, user.userId, user.plan, "task_run", override);
  const task = await db.execute({
    sql: "SELECT id, user_id, name, prompt FROM cloud_tasks WHERE id = ? AND user_id = ?",
    args: [String(c.req.param("id") ?? ""), user.userId]
  });
  const row = task.rows[0];
  if (!row) throw errors.notFound("\u4EFB\u52A1\u4E0D\u5B58\u5728");
  try {
    const { result } = await executeTask(db, c.env, {
      id: String(row.id),
      user_id: String(row.user_id),
      name: String(row.name),
      prompt: String(row.prompt)
    });
    return c.json({ ok: true, result });
  } catch (e) {
    throw errors.internal(`\u4EFB\u52A1\u6267\u884C\u5931\u8D25: ${e instanceof Error ? e.message : String(e)}`);
  }
});

// src/routes/update.ts
var updateRoutes = new Hono3();
function versionParts(v) {
  return v.split(".").map((n) => Number(n) || 0);
}
function isNewer(candidate, current) {
  const a = versionParts(candidate);
  const b = versionParts(current);
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const diff = (a[i] ?? 0) - (b[i] ?? 0);
    if (diff !== 0) return diff > 0;
  }
  return false;
}
updateRoutes.get("/check", async (c) => {
  const env = c.env;
  const platform = c.req.query("platform") ?? "android";
  const current = c.req.query("current") ?? "0.0.0";
  if (platform !== "android") {
    return c.json({ platform, supported: false, latest: current, updateAvailable: false });
  }
  const latest = env.UPDATE_LATEST_VERSION ?? "";
  if (!latest) {
    return c.json({
      platform,
      supported: true,
      latest: current,
      current,
      updateAvailable: false,
      forceUpdate: false,
      configured: false,
      hint: "UPDATE_LATEST_VERSION \u672A\u914D\u7F6E(EdgeOne \u73AF\u5883\u53D8\u91CF)"
    });
  }
  const updateAvailable = isNewer(latest, current);
  const minSupported = env.UPDATE_MIN_VERSION ?? "0.0.0";
  const forceFlag = env.UPDATE_FORCE_UPDATE === "true";
  const forceUpdate = updateAvailable && (forceFlag || isNewer(minSupported, current));
  return c.json({
    platform,
    supported: true,
    latest,
    current,
    minSupported,
    forceUpdate,
    updateAvailable,
    notes: env.UPDATE_NOTES ?? "",
    apkUrl: env.UPDATE_APK_URL ?? ""
  });
});

// src/routes/announcement.ts
var announcementRoutes = new Hono3();
function versionParts2(v) {
  return v.split(".").map((n) => Number(n) || 0);
}
function versionAtLeast(a, b) {
  if (!b) return true;
  const pa = versionParts2(a);
  const pb = versionParts2(b);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (diff < 0) return false;
  }
  return true;
}
function versionAtMost(a, b) {
  if (!b) return true;
  const pa = versionParts2(a);
  const pb = versionParts2(b);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (diff > 0) return false;
  }
  return true;
}
announcementRoutes.get("/", async (c) => {
  const platform = c.req.query("platform") ?? "android";
  const version2 = c.req.query("version") ?? "0.0.0";
  if (platform !== "android") {
    return c.json({ announcement: null });
  }
  const db = c.get("db");
  const r = await db.execute({
    sql: `SELECT id, title, content, min_version, max_version, updated_at
          FROM announcements
          WHERE enabled = 1
          ORDER BY updated_at DESC
          LIMIT 20`
  });
  for (const row of r.rows) {
    const min = String(row.min_version ?? "");
    const max = String(row.max_version ?? "");
    if (versionAtLeast(version2, min) && versionAtMost(version2, max)) {
      return c.json({
        announcement: {
          id: String(row.id),
          title: String(row.title),
          content: String(row.content),
          updatedAt: Number(row.updated_at)
        }
      });
    }
  }
  return c.json({ announcement: null });
});

// src/routes/backup.ts
var backupRoutes = new Hono3();
var MAX_PAYLOAD_CHARS = 2 * 1024 * 1024 * 2;
var NONCE_RE = /^[A-Za-z0-9+/=_-]{8,64}$/;
function checkTableName(name) {
  if (!/^[a-zA-Z0-9_]{1,32}$/.test(name)) {
    throw errors.badRequest("\u8868\u540D\u975E\u6CD5(\u4EC5\u5B57\u6BCD/\u6570\u5B57/\u4E0B\u5212\u7EBF, \u226432 \u5B57\u7B26)");
  }
  return name;
}
function checkCipher(payload, nonce) {
  const p = String(payload ?? "");
  const n = String(nonce ?? "");
  if (!p) throw errors.badRequest("\u7F3A\u5C11 payload(\u5BC6\u6587)");
  if (p.length > MAX_PAYLOAD_CHARS) throw errors.badRequest("\u5355\u4E2A\u5FEB\u7167\u8FC7\u5927(\u4E0A\u9650\u7EA6 1.5MB \u660E\u6587)");
  if (!/^[A-Za-z0-9+/=_-]+={0,2}$/.test(p)) throw errors.badRequest("payload \u5FC5\u987B\u662F base64");
  if (!NONCE_RE.test(n)) throw errors.badRequest("nonce \u975E\u6CD5(base64, 12 \u5B57\u8282)");
  return { payload: p, nonce: n };
}
async function backupBytes(db, userId) {
  const r = await db.execute({
    sql: "SELECT coalesce(sum(length(payload_encrypted)), 0) AS b FROM backup_blobs WHERE user_id = ?",
    args: [userId]
  });
  return Number(r.rows[0]?.b ?? 0);
}
function backupLimit(c) {
  return limitFor(
    c.plan,
    "backup_bytes",
    parseLimitsOverride(c.env.PLAN_LIMITS_OVERRIDE)
  );
}
backupRoutes.get("/usage", requireAuth, async (c) => {
  const user = c.get("user");
  const db = c.get("db");
  const used = await backupBytes(db, user.userId);
  return c.json({ bytes: used, limit: backupLimit({ plan: user.plan, env: c.env }) });
});
backupRoutes.get("/", requireAuth, async (c) => {
  const user = c.get("user");
  const db = c.get("db");
  const r = await db.execute({
    sql: `SELECT table_name, device_id, length(payload_encrypted) AS size, uploaded_at
          FROM backup_blobs WHERE user_id = ?
          ORDER BY table_name, uploaded_at DESC`,
    args: [user.userId]
  });
  const latest = /* @__PURE__ */ new Map();
  for (const row of r.rows) {
    const t = String(row.table_name);
    if (!latest.has(t)) {
      latest.set(t, {
        table: t,
        deviceId: String(row.device_id ?? ""),
        size: Number(row.size ?? 0),
        uploadedAt: Number(row.uploaded_at ?? 0)
      });
    }
  }
  const used = await backupBytes(db, user.userId);
  return c.json({
    blobs: [...latest.values()],
    bytes: used,
    limit: backupLimit({ plan: user.plan, env: c.env })
  });
});
backupRoutes.put("/:table", requireAuth, async (c) => {
  const user = c.get("user");
  const db = c.get("db");
  const table = checkTableName(c.req.param("table") ?? "");
  const body = await c.req.json().catch(() => ({}));
  const { payload, nonce } = checkCipher(body.payload, body.nonce);
  const now = Date.now();
  const updatedAt = Number(body.updatedAt ?? now);
  if (!Number.isFinite(updatedAt) || updatedAt <= 0) throw errors.badRequest("updatedAt \u975E\u6CD5");
  const old = await db.execute({
    sql: "SELECT length(payload_encrypted) AS s FROM backup_blobs WHERE user_id = ? AND device_id = ? AND table_name = ?",
    args: [user.userId, user.deviceId, table]
  });
  const oldSize = Number(old.rows[0]?.s ?? 0);
  const used = await backupBytes(db, user.userId);
  const limit = backupLimit({ plan: user.plan, env: c.env });
  const next = used - oldSize + payload.length;
  if (limit > 0 && next > limit) {
    throw errors.quota(`\u4E91\u5907\u4EFD\u7A7A\u95F4\u4E0D\u8DB3 (${fmtMb(next)}/${fmtMb(limit)}), \u8BF7\u5148\u5220\u9664\u65E7\u5907\u4EFD`);
  }
  await db.execute({
    sql: `INSERT INTO backup_blobs (user_id, device_id, table_name, payload_encrypted, uploaded_at)
          VALUES (?, ?, ?, ?, ?)
          ON CONFLICT(user_id, device_id, table_name)
          DO UPDATE SET payload_encrypted = excluded.payload_encrypted, uploaded_at = excluded.uploaded_at`,
    args: [user.userId, user.deviceId, table, `${nonce}.${payload}`, updatedAt]
  });
  return c.json({ ok: true, table, size: payload.length, bytes: next, limit });
});
backupRoutes.get("/:table", requireAuth, async (c) => {
  const user = c.get("user");
  const db = c.get("db");
  const table = checkTableName(c.req.param("table") ?? "");
  const r = await db.execute({
    sql: `SELECT device_id, payload_encrypted, uploaded_at FROM backup_blobs
          WHERE user_id = ? AND table_name = ? ORDER BY uploaded_at DESC LIMIT 1`,
    args: [user.userId, table]
  });
  const row = r.rows[0];
  if (!row) throw errors.notFound("\u4E91\u7AEF\u6CA1\u6709\u8BE5\u8868\u7684\u5907\u4EFD");
  const raw2 = String(row.payload_encrypted);
  const dot = raw2.indexOf(".");
  return c.json({
    table,
    deviceId: String(row.device_id ?? ""),
    nonce: dot > 0 ? raw2.slice(0, dot) : "",
    payload: dot > 0 ? raw2.slice(dot + 1) : raw2,
    uploadedAt: Number(row.uploaded_at ?? 0)
  });
});
backupRoutes.delete("/:table", requireAuth, async (c) => {
  const user = c.get("user");
  const db = c.get("db");
  const table = checkTableName(c.req.param("table") ?? "");
  await db.execute({
    sql: "DELETE FROM backup_blobs WHERE user_id = ? AND table_name = ?",
    args: [user.userId, table]
  });
  return c.json({ ok: true, table, bytes: await backupBytes(db, user.userId) });
});
backupRoutes.delete("/", requireAuth, async (c) => {
  const user = c.get("user");
  const db = c.get("db");
  await db.execute({ sql: "DELETE FROM backup_blobs WHERE user_id = ?", args: [user.userId] });
  return c.json({ ok: true, bytes: 0 });
});
function fmtMb(bytes) {
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
}

// src/routes/sync.ts
var syncRoutes = new Hono3();
var MAX_ROWS_PER_PUSH = 200;
var MAX_PAYLOAD_CHARS2 = 2 * 1024 * 1024 * 2;
var MAX_PULL = 500;
function rowLimit(c) {
  return limitFor(c.plan, "sync_rows", parseLimitsOverride(c.env.PLAN_LIMITS_OVERRIDE));
}
async function syncStats(db, userId) {
  const r = await db.execute({
    sql: `SELECT count(*) AS n, count(DISTINCT table_name) AS t,
                 coalesce(sum(length(payload_encrypted)), 0) AS b
          FROM sync_state WHERE user_id = ? AND tombstone = 0`,
    args: [userId]
  });
  return {
    rows: Number(r.rows[0]?.n ?? 0),
    tables: Number(r.rows[0]?.t ?? 0),
    bytes: Number(r.rows[0]?.b ?? 0)
  };
}
syncRoutes.post("/push", requireAuth, async (c) => {
  const user = c.get("user");
  const db = c.get("db");
  const body = await c.req.json().catch(() => ({}));
  const rowsIn = Array.isArray(body.rows) ? body.rows : [];
  if (rowsIn.length === 0) throw errors.badRequest("\u7F3A\u5C11 rows");
  if (rowsIn.length > MAX_ROWS_PER_PUSH) {
    throw errors.badRequest(`\u5355\u6B21\u6700\u591A\u63A8\u9001 ${MAX_ROWS_PER_PUSH} \u884C`);
  }
  const limit = rowLimit({ plan: user.plan, env: c.env });
  let accepted = 0;
  let skipped = 0;
  for (const raw2 of rowsIn) {
    const table = checkTableName(String(raw2.table ?? ""));
    const rowId = String(raw2.rowId ?? "").trim();
    if (!rowId || rowId.length > 128) {
      skipped++;
      continue;
    }
    const updatedAt = Number(raw2.updatedAt ?? 0);
    if (!Number.isFinite(updatedAt) || updatedAt <= 0) {
      skipped++;
      continue;
    }
    const tombstone = raw2.tombstone === true ? 1 : 0;
    let cipher = null;
    let nonce = "";
    if (!tombstone) {
      try {
        const c1 = checkCipher(raw2.payload, raw2.nonce);
        cipher = `${c1.nonce}.${c1.payload}`;
        nonce = c1.nonce;
      } catch {
        skipped++;
        continue;
      }
    }
    if (cipher && cipher.length > MAX_PAYLOAD_CHARS2) {
      skipped++;
      continue;
    }
    await db.execute({
      sql: `INSERT INTO sync_state
              (user_id, table_name, row_id, updated_at, tombstone, device_id, payload_encrypted, nonce)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(user_id, table_name, row_id) DO UPDATE SET
              updated_at = excluded.updated_at,
              tombstone  = excluded.tombstone,
              device_id  = excluded.device_id,
              payload_encrypted = excluded.payload_encrypted,
              nonce      = excluded.nonce
            WHERE excluded.updated_at >= sync_state.updated_at`,
      args: [user.userId, table, rowId, updatedAt, tombstone, user.deviceId, cipher, nonce]
    });
    accepted++;
  }
  const stats = await syncStats(db, user.userId);
  if (limit > 0 && stats.rows > limit) {
    throw errors.quota(`\u540C\u6B65\u884C\u6570\u8D85\u51FA\u5957\u9910\u4E0A\u9650 (${stats.rows}/${limit})`);
  }
  return c.json({ ok: true, accepted, skipped, serverTime: Date.now(), stats });
});
syncRoutes.get("/pull", requireAuth, async (c) => {
  const user = c.get("user");
  const db = c.get("db");
  const since = Number(c.req.query("since") ?? 0);
  if (!Number.isFinite(since) || since < 0) throw errors.badRequest("since \u975E\u6CD5");
  const limit = Math.min(Number(c.req.query("limit") ?? 200) || 200, MAX_PULL);
  const tables = (c.req.query("tables") ?? "").split(",").map((t) => t.trim()).filter(Boolean).map(checkTableName);
  if (tables.length > 8) throw errors.badRequest("tables \u6700\u591A 8 \u5F20");
  const where = ["user_id = ?", "updated_at > ?"];
  const args = [user.userId, since];
  if (tables.length) {
    where.push(`table_name IN (${tables.map(() => "?").join(",")})`);
    args.push(...tables);
  }
  const r = await db.execute({
    sql: `SELECT table_name, row_id, updated_at, tombstone, device_id, payload_encrypted
          FROM sync_state WHERE ${where.join(" AND ")}
          ORDER BY updated_at ASC LIMIT ?`,
    args: [...args, limit]
  });
  return c.json({
    serverTime: Date.now(),
    rows: r.rows.map((row) => {
      const raw2 = String(row.payload_encrypted ?? "");
      const dot = raw2.indexOf(".");
      return {
        table: String(row.table_name),
        rowId: String(row.row_id),
        updatedAt: Number(row.updated_at),
        tombstone: Number(row.tombstone) === 1,
        deviceId: String(row.device_id ?? ""),
        nonce: dot > 0 ? raw2.slice(0, dot) : "",
        payload: dot > 0 ? raw2.slice(dot + 1) : ""
      };
    })
  });
});
syncRoutes.get("/changes", requireAuth, async (c) => {
  const user = c.get("user");
  const db = c.get("db");
  const since = Number(c.req.query("since") ?? 0);
  if (!Number.isFinite(since) || since < 0) throw errors.badRequest("since \u975E\u6CD5");
  const r = await db.execute({
    sql: `SELECT table_name, row_id, updated_at, tombstone, device_id
          FROM sync_state WHERE user_id = ? AND updated_at > ?
          ORDER BY updated_at ASC LIMIT ?`,
    args: [user.userId, since, MAX_PULL]
  });
  return c.json({
    serverTime: Date.now(),
    changes: r.rows.map((row) => ({
      table: String(row.table_name),
      rowId: String(row.row_id),
      updatedAt: Number(row.updated_at),
      tombstone: Number(row.tombstone) === 1,
      deviceId: String(row.device_id ?? "")
    }))
  });
});
syncRoutes.get("/stats", requireAuth, async (c) => {
  const user = c.get("user");
  const db = c.get("db");
  const stats = await syncStats(db, user.userId);
  return c.json({ ...stats, rowLimit: rowLimit({ plan: user.plan, env: c.env }) });
});
syncRoutes.delete("/rows", requireAuth, async (c) => {
  const user = c.get("user");
  const db = c.get("db");
  const table = checkTableName(c.req.query("table") ?? "");
  const rowId = c.req.query("rowId");
  if (rowId) {
    await db.execute({
      sql: "DELETE FROM sync_state WHERE user_id = ? AND table_name = ? AND row_id = ?",
      args: [user.userId, table, rowId]
    });
  } else {
    await db.execute({
      sql: "DELETE FROM sync_state WHERE user_id = ? AND table_name = ?",
      args: [user.userId, table]
    });
  }
  return c.json({ ok: true, ...await syncStats(db, user.userId) });
});

// src/routes/mcp.ts
var mcpRoutes = new Hono3();
var PROTOCOL_VERSION = "2024-11-05";
function jsonRpcResult(id, result) {
  return Response.json({ jsonrpc: "2.0", id, result });
}
function jsonRpcError(id, code, message) {
  return Response.json({ jsonrpc: "2.0", id, error: { code, message } });
}
var TOOLS = [
  {
    name: "cloud_search",
    description: "\u901A\u8FC7\u4E91\u7AEF\u4E2D\u7EE7\u8FDB\u884C\u8054\u7F51\u641C\u7D22(\u56FD\u5185\u7F51\u7EDC\u53EF\u8FBE)\u3002\u8FD4\u56DE\u6807\u9898\u3001\u94FE\u63A5\u4E0E\u6458\u8981\u3002",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "\u641C\u7D22\u5173\u952E\u8BCD" },
        max_results: { type: "number", description: "\u7ED3\u679C\u6570\u91CF, \u9ED8\u8BA4 8, \u4E0A\u9650 20" }
      },
      required: ["query"]
    }
  },
  {
    name: "cloud_fetch",
    description: "\u6293\u53D6\u7F51\u9875\u5E76\u63D0\u53D6\u6B63\u6587(\u7ECF\u4E91\u7AEF\u4EE3\u7406, \u81EA\u5E26 SSRF \u9632\u62A4\u4E0E 2MB \u4E0A\u9650)\u3002",
    inputSchema: {
      type: "object",
      properties: { url: { type: "string", description: "\u5B8C\u6574\u7684 http/https URL" } },
      required: ["url"]
    }
  },
  {
    name: "cloud_schedule_task",
    description: "\u521B\u5EFA\u4E91\u7AEF\u5B9A\u65F6\u4EFB\u52A1: \u6BCF\u5929 UTC+8 \u6307\u5B9A\u65F6\u523B\u7531\u670D\u52A1\u7AEF\u8C03\u7528 LLM \u6267\u884C\u63D0\u793A\u8BCD, \u7528\u6237\u5728 App \u6253\u5F00\u65F6\u53EF\u62C9\u53D6\u7ED3\u679C\u3002",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: "\u4EFB\u52A1\u540D\u79F0" },
        prompt: { type: "string", description: "\u4EFB\u52A1\u63D0\u793A\u8BCD" },
        schedule_hour: { type: "number", description: "\u5C0F\u65F6 (UTC+8, 0-23), \u9ED8\u8BA4 8" },
        schedule_minute: { type: "number", description: "\u5206\u949F (0-59), \u9ED8\u8BA4 0" }
      },
      required: ["name", "prompt"]
    }
  },
  {
    name: "cloud_list_tasks",
    description: "\u5217\u51FA\u6211\u7684\u4E91\u7AEF\u5B9A\u65F6\u4EFB\u52A1\u53CA\u6700\u8FD1\u6267\u884C\u72B6\u6001\u3002",
    inputSchema: { type: "object", properties: {} }
  }
];
async function toolCall(c, name, args) {
  const user = c.get("user");
  const db = c.get("db");
  const override = parseLimitsOverride(c.env.PLAN_LIMITS_OVERRIDE);
  const text = (t) => ({ content: [{ type: "text", text: t }] });
  try {
    switch (name) {
      case "cloud_search": {
        const query = String(args.query ?? "").trim();
        if (!query) return text("\u9519\u8BEF: query \u4E0D\u80FD\u4E3A\u7A7A");
        const max = Math.min(Math.max(Number(args.max_results ?? 8), 1), 20);
        await consumeQuota(db, user.userId, user.plan, "relay_search", override);
        const backend = pickBackend(c.env);
        const results = await backend.search(query, max);
        return text(`[${backend.name} \u641C\u7D22] ${query}

${formatResults(results)}`);
      }
      case "cloud_fetch": {
        const url = String(args.url ?? "").trim();
        if (!url) return text("\u9519\u8BEF: url \u4E0D\u80FD\u4E3A\u7A7A");
        await consumeQuota(db, user.userId, user.plan, "relay_fetch", override);
        const page = await fetchPage(url);
        return text(`# ${page.title}
\u6765\u6E90: ${page.url}

${page.content}${page.truncated ? "\n\n(\u5185\u5BB9\u5DF2\u622A\u65AD)" : ""}`);
      }
      case "cloud_schedule_task": {
        const tname = String(args.name ?? "").trim().slice(0, 100);
        const prompt = String(args.prompt ?? "").trim().slice(0, 8e3);
        if (!tname || !prompt) return text("\u9519\u8BEF: name/prompt \u4E0D\u80FD\u4E3A\u7A7A");
        const hour = Math.min(Math.max(Number(args.schedule_hour ?? 8), 0), 23);
        const minute = Math.min(Math.max(Number(args.schedule_minute ?? 0), 0), 59);
        const count = await db.execute({
          sql: "SELECT COUNT(*) AS n FROM cloud_tasks WHERE user_id = ?",
          args: [user.userId]
        });
        const MAX_TASKS = { free: 1, trial: 5, pro: 20, lifetime: 20 };
        if (Number(count.rows[0]?.n ?? 0) >= (MAX_TASKS[user.plan] ?? 1)) {
          return text(`\u9519\u8BEF: \u5F53\u524D\u5957\u9910(${user.plan})\u4E91\u7AEF\u4EFB\u52A1\u6570\u91CF\u5DF2\u8FBE\u4E0A\u9650, \u8BF7\u5347\u7EA7\u5957\u9910`);
        }
        const nextRun = nextDailyRun(hour, minute);
        await db.execute({
          sql: `INSERT INTO cloud_tasks (id, user_id, name, prompt, schedule_type, schedule_hour, schedule_minute, enabled, next_run_at, created_at)
                VALUES (?, ?, ?, ?, 'daily', ?, ?, 1, ?, ?)`,
          args: [`t_${uuid()}`, user.userId, tname, prompt, hour, minute, nextRun, nowMs()]
        });
        const at = nextRun ? new Date(nextRun).toISOString() : "\u4E0D\u8C03\u5EA6";
        return text(`\u5DF2\u521B\u5EFA\u4E91\u7AEF\u5B9A\u65F6\u4EFB\u52A1\u300C${tname}\u300D, \u6BCF\u65E5 UTC+8 ${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")} \u6267\u884C(\u4E0B\u6B21: ${at})\u3002`);
      }
      case "cloud_list_tasks": {
        const r = await db.execute({
          sql: `SELECT name, schedule_hour, schedule_minute, enabled, last_status, last_run_at
                FROM cloud_tasks WHERE user_id = ? ORDER BY created_at DESC LIMIT 50`,
          args: [user.userId]
        });
        if (r.rows.length === 0) return text("\u6682\u65E0\u4E91\u7AEF\u5B9A\u65F6\u4EFB\u52A1\u3002");
        return text(
          r.rows.map(
            (t) => `\u300C${t.name}\u300D\u6BCF\u65E5 ${String(t.schedule_hour).padStart(2, "0")}:${String(t.schedule_minute).padStart(2, "0")} | ${t.enabled ? "\u542F\u7528" : "\u505C\u7528"} | \u4E0A\u6B21: ${t.last_status ?? "\u672A\u8FD0\u884C"}`
          ).join("\n")
        );
      }
      default:
        return { ...text(`\u672A\u77E5\u5DE5\u5177: ${name}`), isError: true };
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (e instanceof ApiError && e.status === 429) {
      return text(`\u9519\u8BEF: ${msg}`);
    }
    return { ...text(`\u9519\u8BEF: ${msg}`), isError: true };
  }
}
mcpRoutes.post("/", requireAuth, async (c) => {
  const body = await c.req.json().catch(() => null);
  if (!body || body.jsonrpc !== "2.0" || typeof body.method !== "string") {
    return jsonRpcError(null, -32600, "Invalid Request");
  }
  const id = body.id ?? null;
  switch (body.method) {
    case "initialize":
      return jsonRpcResult(id, {
        protocolVersion: PROTOCOL_VERSION,
        capabilities: { tools: {} },
        serverInfo: { name: "orion-cloud", version: "0.1.0" }
      });
    case "notifications/initialized":
      return new Response(null, { status: 202 });
    case "tools/list":
      return jsonRpcResult(id, { tools: TOOLS });
    case "tools/call": {
      const params = body.params ?? {};
      const name = String(params.name ?? "");
      const args = params.arguments ?? {};
      const result = await toolCall(c, name, args);
      return jsonRpcResult(id, result);
    }
    case "ping":
      return jsonRpcResult(id, {});
    default:
      return jsonRpcError(id, -32601, `Method not found: ${body.method}`);
  }
});
mcpRoutes.get("/", requireAuth, (c) => c.json({ server: "orion-cloud", protocolVersion: PROTOCOL_VERSION, transport: "streamable-http" }));

// src/services/account_plans.ts
var ACCOUNT_PLANS = ["free", "trial", "pro", "lifetime"];
var RANK = { free: 0, trial: 1, pro: 2, lifetime: 3 };
function validateAccountPlan(plan) {
  if (!ACCOUNT_PLANS.includes(plan)) {
    throw errors.badRequest(`plan \u5FC5\u987B\u662F ${ACCOUNT_PLANS.join("/")}`);
  }
  return plan;
}
function applyPlanGrant(currentPlan, currentExpiresAt, plan, durationDays, mode, now = nowMs()) {
  if (plan === "free") return { plan: "free", expiresAt: null };
  if (plan === "lifetime") return { plan: "lifetime", expiresAt: null };
  if (durationDays <= 0) {
    throw errors.badRequest("\u975E\u6C38\u4E45\u5957\u9910\u5FC5\u987B\u6307\u5B9A durationDays (> 0)");
  }
  const durationMs = durationDays * 24 * 3600 * 1e3;
  if (mode === "set") {
    return { plan, expiresAt: now + durationMs };
  }
  const notExpired = currentExpiresAt !== null && currentExpiresAt > now;
  if (notExpired && currentPlan === plan) {
    return { plan, expiresAt: currentExpiresAt + durationMs };
  }
  if (notExpired && (RANK[currentPlan] ?? 0) > (RANK[plan] ?? 0)) {
    return { plan: currentPlan, expiresAt: currentExpiresAt + durationMs };
  }
  return { plan, expiresAt: now + durationMs };
}

// src/services/user_admin.ts
var CASCADE_TABLES = [
  { table: "task_runs", label: "\u4EFB\u52A1\u6267\u884C\u8BB0\u5F55" },
  { table: "cloud_tasks", label: "\u4E91\u7AEF\u4EFB\u52A1" },
  { table: "kb_chunks", label: "\u77E5\u8BC6\u5E93\u5206\u5757" },
  { table: "kb_documents", label: "\u77E5\u8BC6\u5E93\u6587\u6863" },
  { table: "sync_state", label: "\u591A\u7AEF\u540C\u6B65\u884C" },
  { table: "backup_blobs", label: "\u4E91\u5907\u4EFD\u6570\u636E" },
  { table: "share_links", label: "\u5206\u4EAB\u94FE\u63A5" },
  { table: "usage_daily", label: "\u6BCF\u65E5\u7528\u91CF" },
  { table: "usage_weekly", label: "\u6BCF\u5468\u7528\u91CF" },
  { table: "agent_sessions", label: "Agent \u4F1A\u8BDD\u6620\u5C04" },
  { table: "agent_instances", label: "Agent \u5B9E\u4F8B\u6388\u6743" },
  { table: "devices", label: "\u8BBE\u5907" },
  // licenses 特殊处理（见下）：列名是 bound_user_id 而非 user_id，
  // 且卡密是发卡库存资产 —— 删用户应解绑归还库存，而不是删行。
  { table: "licenses", label: "\u5361\u5BC6\u8BB0\u5F55", column: "bound_user_id", unbind: true },
  { table: "sessions", label: "\u767B\u5F55\u4F1A\u8BDD" },
  { table: "audit_log", label: "\u5BA1\u8BA1\u65E5\u5FD7\uFF08\u8BE5\u7528\u6237\u76F8\u5173\u884C\uFF09" }
];
function buildCleanupStatements(uid, keepAudit) {
  const stmts = [];
  for (const { table, label, column = "user_id", unbind } of CASCADE_TABLES) {
    if (keepAudit && table === "audit_log") continue;
    stmts.push(
      unbind ? {
        // unbind 表（licenses）：解绑归还库存而非删行
        sql: `UPDATE ${table} SET ${column} = NULL, bound_at = NULL, status = 'unused' WHERE ${column} = ?`,
        args: [uid],
        table,
        label
      } : {
        sql: `DELETE FROM ${table} WHERE ${column} = ?`,
        args: [uid],
        table,
        label
      }
    );
  }
  if (keepAudit) {
    stmts.push({
      sql: "UPDATE audit_log SET user_id = NULL WHERE user_id = ?",
      args: [uid],
      table: "audit_log",
      label: "\u5BA1\u8BA1\u65E5\u5FD7\uFF08\u5DF2\u4FDD\u7559\uFF0C\u4EC5\u89E3\u9664\u5173\u8054\uFF09"
    });
  }
  stmts.push({
    sql: "DELETE FROM users WHERE id = ?",
    args: [uid],
    table: "users",
    label: "\u7528\u6237"
  });
  return stmts;
}
async function deleteUser(db, userId, opts = {}) {
  const uid = String(userId ?? "").trim();
  if (!uid) throw errors.badRequest("userId \u4E0D\u80FD\u4E3A\u7A7A");
  const found = await db.execute({
    sql: "SELECT id, email FROM users WHERE id = ?",
    args: [uid]
  });
  if (!found.rows[0]) throw errors.notFound("\u7528\u6237\u4E0D\u5B58\u5728");
  const email = String(found.rows[0].email ?? "");
  const removed = {};
  const failed = [];
  const stmts = buildCleanupStatements(uid, opts.keepAudit !== false);
  try {
    const results = await db.batch(
      stmts.map((s) => ({ sql: s.sql, args: s.args })),
      "write"
    );
    for (let i = 0; i < stmts.length; i++) {
      const n = results[i]?.rowsAffected ?? 0;
      if (n > 0) removed[stmts[i].table] = n;
    }
    return { userId: uid, email, removed, failed };
  } catch (e) {
    failed.push(
      `\u6279\u91CF\u6E05\u7406\u5931\u8D25\uFF0C\u5DF2\u56DE\u9000\u9010\u8868\u6E05\u7406\uFF1A${e instanceof Error ? e.message : String(e)}`
    );
    for (const k of Object.keys(removed)) delete removed[k];
  }
  for (const { sql, args, table, label } of stmts) {
    try {
      const r = await db.execute({ sql, args });
      if (r.rowsAffected > 0) removed[table] = r.rowsAffected;
    } catch (e) {
      failed.push(`${label}(${table}): ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  return { userId: uid, email, removed, failed };
}
async function previewDeleteUser(db, userId) {
  const uid = String(userId ?? "").trim();
  if (!uid) throw errors.badRequest("userId \u4E0D\u80FD\u4E3A\u7A7A");
  const found = await db.execute({
    sql: "SELECT email FROM users WHERE id = ?",
    args: [uid]
  });
  if (!found.rows[0]) throw errors.notFound("\u7528\u6237\u4E0D\u5B58\u5728");
  const counts = {};
  let total = 0;
  const items = CASCADE_TABLES.map(({ table, label, column = "user_id" }) => ({
    table,
    label,
    column
  }));
  try {
    const sql = "SELECT " + items.map((it, i) => `(SELECT COUNT(*) FROM ${it.table} WHERE ${it.column} = ?) AS c${i}`).join(", ");
    const r = await db.execute({ sql, args: items.map(() => uid) });
    const row = r.rows[0];
    if (row) {
      for (let i = 0; i < items.length; i++) {
        const n = Number(row[`c${i}`] ?? 0);
        if (n > 0) {
          counts[items[i].label] = n;
          total += n;
        }
      }
      return { email: String(found.rows[0].email ?? ""), counts, total };
    }
  } catch {
    for (const k of Object.keys(counts)) delete counts[k];
    total = 0;
  }
  for (const { table, label, column = "user_id" } of items) {
    try {
      const r = await db.execute({
        sql: `SELECT COUNT(*) AS n FROM ${table} WHERE ${column} = ?`,
        args: [uid]
      });
      const n = Number(r.rows[0]?.n ?? 0);
      if (n > 0) {
        counts[label] = n;
        total += n;
      }
    } catch {
    }
  }
  return { email: String(found.rows[0].email ?? ""), counts, total };
}

// src/services/agent_instances.ts
var encPrefix = "v1:";
async function deriveKey(secret) {
  const raw2 = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(`orion_agent_llm_provider_key:${secret}`)
  );
  return crypto.subtle.importKey("raw", raw2, { name: "AES-GCM" }, false, [
    "encrypt",
    "decrypt"
  ]);
}
async function encryptSecret(secret, plain) {
  const key = await deriveKey(secret);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(plain))
  );
  const joined = new Uint8Array(iv.length + ct.length);
  joined.set(iv, 0);
  joined.set(ct, iv.length);
  return `${encPrefix}${hex(joined)}`;
}
async function decryptSecret(secret, enc) {
  if (!enc.startsWith(encPrefix)) {
    throw errors.internal("\u5B9E\u4F8B\u5BC6\u94A5\u683C\u5F0F\u4E0D\u6B63\u786E");
  }
  const h = enc.slice(encPrefix.length);
  const joined = new Uint8Array(h.length / 2);
  for (let i = 0; i < joined.length; i++) {
    joined[i] = parseInt(h.slice(i * 2, i * 2 + 2), 16);
  }
  if (joined.length < 13) throw errors.internal("\u5B9E\u4F8B\u5BC6\u94A5\u5BC6\u6587\u957F\u5EA6\u5F02\u5E38");
  try {
    const pt = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: joined.slice(0, 12) },
      await deriveKey(secret),
      joined.slice(12)
    );
    return new TextDecoder().decode(pt);
  } catch {
    throw errors.internal("\u5B9E\u4F8B\u5BC6\u94A5\u89E3\u5BC6\u5931\u8D25\uFF1AJWT_SECRET \u53EF\u80FD\u5DF2\u53D8\u66F4\uFF0C\u9700\u91CD\u65B0\u5F55\u5165");
  }
}
function normalizeBaseUrl(raw2) {
  const b = raw2.trim().replace(/\/+$/, "");
  let parsed;
  try {
    parsed = new URL(b);
  } catch {
    throw errors.badRequest("\u5B9E\u4F8B\u5730\u5740\u4E0D\u5408\u6CD5\uFF0C\u9700\u5F62\u5982 https://your-forge.example.com");
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    throw errors.badRequest("\u5B9E\u4F8B\u5730\u5740\u5FC5\u987B\u4EE5 http(s):// \u5F00\u5934");
  }
  return b;
}
async function getInstance(db, userId) {
  const r = await db.execute({
    sql: `SELECT user_id, base_url, api_key_enc, enabled, label
          FROM agent_instances WHERE user_id = ?`,
    args: [userId]
  });
  return r.rows[0] ?? null;
}
async function listAgentInstances(db) {
  const r = await db.execute(
    `SELECT a.user_id, a.base_url, a.api_key_enc, a.enabled, a.label,
            u.email, u.plan
     FROM agent_instances a LEFT JOIN users u ON u.id = a.user_id
     ORDER BY a.updated_at DESC`
  );
  return r.rows;
}
async function upsertAgentInstance(db, secret, input) {
  const userId = input.userId.trim();
  if (!userId) throw errors.badRequest("userId \u4E0D\u80FD\u4E3A\u7A7A");
  const u = await db.execute({ sql: "SELECT id FROM users WHERE id = ?", args: [userId] });
  if (u.rows.length === 0) throw errors.notFound("\u7528\u6237\u4E0D\u5B58\u5728");
  const existing = await getInstance(db, userId);
  const label = (input.label ?? "").trim() || "\u4E91\u7AEF Agent";
  if (existing) {
    const enc = input.apiKey?.trim() ? await encryptSecret(secret, input.apiKey.trim()) : existing.api_key_enc;
    await db.execute({
      sql: `UPDATE agent_instances
            SET base_url = ?, api_key_enc = ?, enabled = ?, label = ?, updated_at = ?
            WHERE user_id = ?`,
      args: [
        normalizeBaseUrl(input.baseUrl),
        enc,
        input.enabled === false ? 0 : 1,
        label,
        nowMs(),
        userId
      ]
    });
    return;
  }
  if (!input.apiKey?.trim()) {
    throw errors.badRequest("\u65B0\u5EFA\u5B9E\u4F8B\u5FC5\u987B\u586B\u5199 API Key");
  }
  await db.execute({
    sql: `INSERT INTO agent_instances
          (user_id, base_url, api_key_enc, enabled, label, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)`,
    args: [
      userId,
      normalizeBaseUrl(input.baseUrl),
      await encryptSecret(secret, input.apiKey.trim()),
      input.enabled === false ? 0 : 1,
      label,
      nowMs(),
      nowMs()
    ]
  });
}
async function deleteAgentInstance(db, userId) {
  const r = await db.execute({ sql: "DELETE FROM agent_instances WHERE user_id = ?", args: [userId] });
  if (Number(r.rowsAffected ?? 0) === 0) throw errors.notFound("\u672A\u627E\u5230\u8BE5\u7528\u6237\u7684\u5B9E\u4F8B\u6388\u6743");
  await db.execute({ sql: "DELETE FROM agent_sessions WHERE user_id = ?", args: [userId] });
}
function toPublicAgentInfo(row, apiBase3) {
  const base = apiBase3.replace(/\/+$/, "");
  return {
    enabled: !!row && row.enabled === 1,
    label: row?.label ?? "\u4E91\u7AEF Agent",
    chatUrl: `${base}/api/agent/chat`,
    // App 侧只暴露一个虚拟模型名；真实模型由 Agent 实例内部决定
    model: "agent"
  };
}
async function requireInstance(db, userId) {
  const row = await getInstance(db, userId);
  if (!row) throw errors.forbidden("\u5C1A\u672A\u5F00\u901A\u4E91\u7AEF Agent");
  if (row.enabled !== 1) throw errors.forbidden("\u4E91\u7AEF Agent \u5DF2\u88AB\u505C\u7528");
  return row;
}
async function getAgentSession(db, userId, appSessionId) {
  const r = await db.execute({
    sql: `SELECT remote_session, remote_chat FROM agent_sessions
          WHERE user_id = ? AND app_session_id = ?`,
    args: [userId, appSessionId]
  });
  return r.rows[0] ?? null;
}
async function saveAgentSession(db, userId, appSessionId, remoteSession, remoteChat) {
  await db.execute({
    sql: `INSERT INTO agent_sessions
          (user_id, app_session_id, remote_session, remote_chat, updated_at)
          VALUES (?, ?, ?, ?, ?)
          ON CONFLICT(user_id, app_session_id)
          DO UPDATE SET remote_session = excluded.remote_session,
                        remote_chat = excluded.remote_chat,
                        updated_at = excluded.updated_at`,
    args: [userId, appSessionId, remoteSession, remoteChat, nowMs()]
  });
}
async function clearAgentSession(db, userId, appSessionId) {
  await db.execute({
    sql: "DELETE FROM agent_sessions WHERE user_id = ? AND app_session_id = ?",
    args: [userId, appSessionId]
  });
}

// src/services/ai_providers.ts
var encPrefix2 = "v1:";
async function deriveKey2(secret) {
  const raw2 = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(`orion_agent_llm_provider_key:${secret}`)
  );
  return crypto.subtle.importKey("raw", raw2, { name: "AES-GCM" }, false, [
    "encrypt",
    "decrypt"
  ]);
}
async function encryptApiKey(secret, plain) {
  const key = await deriveKey2(secret);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = new TextEncoder().encode(plain);
  const ct = new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, data)
  );
  const joined = new Uint8Array(iv.length + ct.length);
  joined.set(iv, 0);
  joined.set(ct, iv.length);
  return `${encPrefix2}${hex(joined)}`;
}
async function decryptApiKey(secret, enc) {
  if (!enc.startsWith(encPrefix2)) {
    throw errors.internal("\u4F9B\u5E94\u5546\u5BC6\u94A5\u683C\u5F0F\u4E0D\u6B63\u786E(\u7F3A\u5C11 v1: \u524D\u7F00)");
  }
  const joined = hexToBytes(enc.slice(encPrefix2.length));
  if (joined.length < 13) throw errors.internal("\u4F9B\u5E94\u5546\u5BC6\u94A5\u5BC6\u6587\u957F\u5EA6\u5F02\u5E38");
  const iv = joined.slice(0, 12);
  const ct = joined.slice(12);
  const key = await deriveKey2(secret);
  try {
    const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ct);
    return new TextDecoder().decode(pt);
  } catch {
    throw errors.internal("\u4F9B\u5E94\u5546\u5BC6\u94A5\u89E3\u5BC6\u5931\u8D25\uFF1AJWT_SECRET \u53EF\u80FD\u5DF2\u53D8\u66F4\uFF0C\u9700\u91CD\u65B0\u5F55\u5165 Key");
  }
}
function hexToBytes(h) {
  const out = new Uint8Array(h.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(h.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}
function parseModels(raw2) {
  try {
    const parsed = JSON.parse(raw2);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (m) => !!m && typeof m.name === "string" && m.name.trim() !== ""
    );
  } catch {
    return [];
  }
}
function toPublicProvider(row, apiBase3) {
  return {
    id: row.id,
    name: row.name,
    chatUrl: `${apiBase3.replace(/\/+$/, "")}/api/ai/chat`,
    models: parseModels(row.models)
  };
}
async function listProviders(db) {
  const r = await db.execute({
    sql: `SELECT id, name, base_url, api_key_enc, models, enabled, sort
          FROM llm_providers ORDER BY sort ASC, created_at ASC`
  });
  return r.rows;
}
async function listEnabledProviders(db) {
  const r = await db.execute({
    sql: `SELECT id, name, base_url, api_key_enc, models, enabled, sort
          FROM llm_providers WHERE enabled = 1 ORDER BY sort ASC, created_at ASC`
  });
  return r.rows;
}
async function getProvider(db, id) {
  const r = await db.execute({
    sql: `SELECT id, name, base_url, api_key_enc, models, enabled, sort
          FROM llm_providers WHERE id = ?`,
    args: [id]
  });
  return r.rows[0] ?? null;
}
function normalizeBaseUrl2(raw2) {
  const b = raw2.trim().replace(/\/+$/, "");
  if (!/^https?:\/\//i.test(b)) {
    throw errors.badRequest("base_url \u5FC5\u987B\u4EE5 http(s):// \u5F00\u5934");
  }
  return b;
}
function validateModels(models) {
  if (!Array.isArray(models) || models.length === 0) {
    throw errors.badRequest("\u81F3\u5C11\u914D\u7F6E\u4E00\u4E2A\u6A21\u578B");
  }
  return models.map((m) => ({
    name: String(m.name).trim(),
    label: m.label ? String(m.label).trim() : void 0,
    kind: m.kind === "embedding" ? "embedding" : "chat",
    contextWindow: Number(m.contextWindow) || 0,
    maxOutputTokens: Number(m.maxOutputTokens) || 0
  }));
}
async function createProvider(db, secret, input) {
  const name = input.name.trim();
  if (!name) throw errors.badRequest("\u4F9B\u5E94\u5546\u540D\u79F0\u4E0D\u80FD\u4E3A\u7A7A");
  if (!input.apiKey?.trim()) throw errors.badRequest("\u65B0\u5EFA\u4F9B\u5E94\u5546\u5FC5\u987B\u586B\u5199 API Key");
  const id = `p_${uuid()}`;
  const ts = nowMs();
  await db.execute({
    sql: `INSERT INTO llm_providers
          (id, name, base_url, api_key_enc, models, enabled, sort, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      id,
      name,
      normalizeBaseUrl2(input.baseUrl),
      await encryptApiKey(secret, input.apiKey.trim()),
      JSON.stringify(validateModels(input.models)),
      input.enabled ? 1 : 0,
      Number(input.sort) || 0,
      ts,
      ts
    ]
  });
  return id;
}
async function updateProvider(db, secret, id, input) {
  const existing = await getProvider(db, id);
  if (!existing) throw errors.notFound("\u4F9B\u5E94\u5546\u4E0D\u5B58\u5728");
  const name = input.name.trim();
  if (!name) throw errors.badRequest("\u4F9B\u5E94\u5546\u540D\u79F0\u4E0D\u80FD\u4E3A\u7A7A");
  const enc = input.apiKey?.trim() ? await encryptApiKey(secret, input.apiKey.trim()) : existing.api_key_enc;
  await db.execute({
    sql: `UPDATE llm_providers
          SET name = ?, base_url = ?, api_key_enc = ?, models = ?, enabled = ?, sort = ?, updated_at = ?
          WHERE id = ?`,
    args: [
      name,
      normalizeBaseUrl2(input.baseUrl),
      enc,
      JSON.stringify(validateModels(input.models)),
      input.enabled ? 1 : 0,
      input.sort === void 0 ? existing.sort : Number(input.sort) || 0,
      nowMs(),
      id
    ]
  });
}
async function deleteProvider(db, id) {
  const r = await db.execute({
    sql: "DELETE FROM llm_providers WHERE id = ?",
    args: [id]
  });
  if (Number(r.rowsAffected ?? 0) === 0) {
    throw errors.notFound("\u4F9B\u5E94\u5546\u4E0D\u5B58\u5728");
  }
}
async function resolveProviderForChat(db, secret, providerId, model) {
  const rows = providerId ? [await getProvider(db, providerId)].filter((r) => !!r) : await listEnabledProviders(db);
  if (rows.length === 0) {
    throw errors.internal("\u540E\u7AEF\u5C1A\u672A\u914D\u7F6E\u53EF\u7528\u7684 AI \u6A21\u578B\u4F9B\u5E94\u5546");
  }
  const row = rows[0];
  const models = parseModels(row.models);
  const chosen = models.find((m) => m.name === model) ?? // 没指定或指定的不存在 → 退回第一个聊天模型
  models.find((m) => m.kind !== "embedding");
  if (!chosen) {
    throw errors.badRequest(`\u4F9B\u5E94\u5546\u300C${row.name}\u300D\u672A\u914D\u7F6E\u53EF\u7528\u6A21\u578B`);
  }
  return {
    row,
    apiKey: await decryptApiKey(secret, row.api_key_enc),
    baseUrl: normalizeBaseUrl2(row.base_url),
    model: chosen.name
  };
}

// src/routes/admin.ts
var adminRoutes = new Hono3();
adminRoutes.use("*", requireAdmin);
adminRoutes.get("/users", async (c) => {
  const db = c.get("db");
  const base = `FROM users u ORDER BY u.created_at DESC LIMIT 500`;
  const withCount = (cols) => `SELECT ${cols}, (SELECT COUNT(*) FROM devices d WHERE d.user_id = u.id) AS device_count ${base}`;
  let r;
  try {
    r = await db.execute({
      sql: withCount("u.id, u.username, u.email, u.plan, u.plan_expires_at, u.status, u.created_at")
    });
  } catch {
    r = await db.execute({
      sql: withCount("u.id, NULL AS username, u.email, u.plan, u.plan_expires_at, u.status, u.created_at")
    });
  }
  return c.json({ users: r.rows });
});
adminRoutes.post("/users/:id/:action{ban|unban}", async (c) => {
  const id = c.req.param("id");
  const ban = c.req.param("action") === "ban";
  const db = c.get("db");
  const r = await db.execute({
    sql: "UPDATE users SET status = ?, updated_at = ? WHERE id = ?",
    args: [ban ? "banned" : "active", nowMs(), id]
  });
  if (r.rowsAffected === 0) throw errors.notFound("\u7528\u6237\u4E0D\u5B58\u5728");
  if (ban) {
    await db.execute({ sql: "UPDATE sessions SET revoked = 1 WHERE user_id = ?", args: [id] });
  }
  await audit(db, id, ban ? "banned" : "unbanned", "", "");
  return c.json({ ok: true });
});
adminRoutes.post("/users/:id/plan", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json().catch(() => ({}));
  const plan = validateAccountPlan(String(body.plan ?? ""));
  const durationDays = Number(body.durationDays ?? 0);
  const mode = body.mode === "extend" ? "extend" : "set";
  const db = c.get("db");
  const cur = await db.execute({
    sql: "SELECT plan, plan_expires_at FROM users WHERE id = ?",
    args: [id]
  });
  const row = cur.rows[0];
  if (!row) throw errors.notFound("\u7528\u6237\u4E0D\u5B58\u5728");
  const applied = applyPlanGrant(
    String(row.plan ?? "free"),
    row.plan_expires_at ?? null,
    plan,
    durationDays,
    mode
  );
  await db.execute({
    sql: "UPDATE users SET plan = ?, plan_expires_at = ?, updated_at = ? WHERE id = ?",
    args: [applied.plan, applied.expiresAt, nowMs(), id]
  });
  await audit(db, id, "plan_grant", `${mode} ${plan} ${durationDays}d`, c.req.header("cf-connecting-ip") ?? "");
  return c.json({
    ok: true,
    plan: applied.plan,
    planExpiresAt: applied.expiresAt,
    message: applied.expiresAt === null ? applied.plan === "free" ? "\u5DF2\u64A4\u9500\u6388\u6743\uFF08free\uFF09" : "\u5DF2\u8BBE\u4E3A\u6C38\u4E45\u6388\u6743" : `\u5DF2\u6388\u6743\u81F3 ${new Date(applied.expiresAt).toISOString()}`
  });
});
adminRoutes.get("/announcements", async (c) => {
  const db = c.get("db");
  const r = await db.execute(
    "SELECT id, title, content, enabled, min_version, max_version, created_at, updated_at FROM announcements ORDER BY updated_at DESC LIMIT 200"
  );
  return c.json({ announcements: r.rows });
});
adminRoutes.post("/announcements", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const title = String(body.title ?? "").trim();
  const content = String(body.content ?? "").trim();
  if (!title || !content) throw errors.badRequest("title \u4E0E content \u4E0D\u80FD\u4E3A\u7A7A");
  const minVersion = String(body.minVersion ?? "").trim();
  const maxVersion = String(body.maxVersion ?? "").trim();
  const enabled = body.enabled === false ? 0 : 1;
  const db = c.get("db");
  const now = nowMs();
  if (body.id) {
    const r = await db.execute({
      sql: `UPDATE announcements SET title = ?, content = ?, enabled = ?, min_version = ?, max_version = ?, updated_at = ?
            WHERE id = ?`,
      args: [title, content, enabled, minVersion, maxVersion, now, String(body.id)]
    });
    if (r.rowsAffected === 0) throw errors.notFound("\u516C\u544A\u4E0D\u5B58\u5728");
    await audit(db, null, "announcement_update", String(body.id), "");
    return c.json({ ok: true, id: String(body.id) });
  }
  const id = `a_${crypto.randomUUID()}`;
  await db.execute({
    sql: "INSERT INTO announcements (id, title, content, enabled, min_version, max_version, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    args: [id, title, content, enabled, minVersion, maxVersion, now, now]
  });
  await audit(db, null, "announcement_create", id, "");
  return c.json({ ok: true, id });
});
adminRoutes.post("/announcements/:id/toggle", async (c) => {
  const id = c.req.param("id");
  const db = c.get("db");
  await db.execute({
    sql: "UPDATE announcements SET enabled = CASE WHEN enabled = 1 THEN 0 ELSE 1 END, updated_at = ? WHERE id = ?",
    args: [nowMs(), id]
  });
  await audit(db, null, "announcement_toggle", id, "");
  return c.json({ ok: true });
});
adminRoutes.delete("/announcements/:id", async (c) => {
  const id = c.req.param("id");
  const db = c.get("db");
  await db.execute({ sql: "DELETE FROM announcements WHERE id = ?", args: [id] });
  await audit(db, null, "announcement_delete", id, "");
  return c.json({ ok: true });
});
adminRoutes.get("/usage", async (c) => {
  const uid = c.req.query("uid");
  const date = c.req.query("date");
  const db = c.get("db");
  if (uid) {
    const r2 = await db.execute({
      sql: "SELECT date, feature, count FROM usage_daily WHERE user_id = ? ORDER BY date DESC LIMIT 200",
      args: [uid]
    });
    return c.json({ usage: r2.rows });
  }
  const r = date ? await db.execute({ sql: "SELECT user_id, feature, count FROM usage_daily WHERE date = ?", args: [date] }) : await db.execute({ sql: "SELECT user_id, date, feature, count FROM usage_daily ORDER BY date DESC LIMIT 500" });
  return c.json({ usage: r.rows });
});
adminRoutes.get("/audit", async (c) => {
  const db = c.get("db");
  const r = await db.execute({
    sql: "SELECT user_id, action, detail, ip, at FROM audit_log ORDER BY at DESC LIMIT 500"
  });
  return c.json({ audit: r.rows });
});
adminRoutes.get("/providers", async (c) => {
  const db = c.get("db");
  const rows = await listProviders(db);
  return c.json({
    providers: rows.map((r) => ({
      id: r.id,
      name: r.name,
      baseUrl: r.base_url,
      models: JSON.parse(r.models || "[]"),
      enabled: !!r.enabled,
      sort: r.sort,
      // 只给"已配置"这一事实, 不泄露任何 Key 片段
      keyState: "\u5DF2\u914D\u7F6E"
    }))
  });
});
adminRoutes.post("/providers", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const input = {
    name: String(body.name ?? ""),
    baseUrl: String(body.baseUrl ?? ""),
    apiKey: String(body.apiKey ?? ""),
    models: Array.isArray(body.models) ? body.models : [],
    enabled: body.enabled !== false,
    sort: Number(body.sort) || 0
  };
  const db = c.get("db");
  if (body.id) {
    const id2 = String(body.id);
    await updateProvider(db, c.env.JWT_SECRET, id2, input);
    await audit(db, null, "provider_update", id2, input.name);
    return c.json({ ok: true, id: id2 });
  }
  const id = await createProvider(db, c.env.JWT_SECRET, input);
  await audit(db, null, "provider_create", id, input.name);
  return c.json({ ok: true, id });
});
adminRoutes.delete("/providers/:id", async (c) => {
  const id = c.req.param("id");
  await deleteProvider(c.get("db"), id);
  await audit(c.get("db"), null, "provider_delete", id, "");
  return c.json({ ok: true });
});
adminRoutes.get("/weekly-usage", async (c) => {
  const db = c.get("db");
  const week = weekStartDate();
  const r = await db.execute({
    sql: `SELECT user_id, week_start, feature, count FROM usage_weekly
          WHERE week_start = ? ORDER BY count DESC LIMIT 500`,
    args: [week]
  });
  return c.json({ weekStart: week, usage: r.rows });
});
adminRoutes.get("/agent-instances", async (c) => {
  const rows = await listAgentInstances(c.get("db"));
  return c.json({
    instances: rows.map((r) => ({
      userId: r.user_id,
      email: r.email,
      plan: r.plan,
      baseUrl: r.base_url,
      enabled: !!r.enabled,
      label: r.label,
      keyConfigured: !!r.api_key_enc
    }))
  });
});
adminRoutes.post("/agent-instances", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const userId = String(body.userId ?? "").trim();
  if (!userId) throw errors.badRequest("userId \u4E0D\u80FD\u4E3A\u7A7A");
  const baseUrl = String(body.baseUrl ?? "").trim();
  if (!baseUrl) throw errors.badRequest("\u5B9E\u4F8B\u5730\u5740\u4E0D\u80FD\u4E3A\u7A7A");
  const db = c.get("db");
  const existed = await getInstance(db, userId);
  await upsertAgentInstance(db, c.env.JWT_SECRET, {
    userId,
    baseUrl,
    // 编辑时留空 = 不改动已有 Key
    apiKey: String(body.apiKey ?? ""),
    enabled: body.enabled !== false,
    label: String(body.label ?? "")
  });
  await audit(
    db,
    null,
    existed ? "agent_instance_update" : "agent_instance_create",
    userId,
    baseUrl
  );
  return c.json({ ok: true, userId });
});
adminRoutes.delete("/agent-instances/:userId", async (c) => {
  const userId = c.req.param("userId");
  await deleteAgentInstance(c.get("db"), userId);
  await audit(c.get("db"), null, "agent_instance_delete", userId, "");
  return c.json({ ok: true });
});
adminRoutes.get("/users/:id/delete-preview", async (c) => {
  const id = c.req.param("id");
  const info = await previewDeleteUser(c.get("db"), id);
  return c.json(info);
});
adminRoutes.delete("/users/:id", async (c) => {
  const id = c.req.param("id");
  const db = c.get("db");
  const keepAudit = c.req.query("keepAudit") !== "0";
  const report = await deleteUser(db, id, { keepAudit });
  await audit(
    db,
    null,
    "user_delete",
    id,
    `${report.email} \u5DF2\u5220\u9664\uFF0C\u6E05\u7406 ${Object.keys(report.removed).length} \u5F20\u8868` + (report.failed.length ? `\uFF0C\u5931\u8D25: ${report.failed.join("; ")}` : "")
  );
  return c.json({ ok: true, ...report });
});

// src/routes/ai.ts
var aiRoutes = new Hono3();
function apiBase(c) {
  const origin = c.req.header("origin") ?? c.req.header("referer");
  if (origin) {
    try {
      return new URL(origin).origin;
    } catch {
    }
  }
  try {
    return new URL(c.req.url).origin;
  } catch {
  }
  return c.env.PUBLIC_BASE_URL || "";
}
aiRoutes.get("/providers", requireAuth, async (c) => {
  const rows = await listEnabledProviders(c.get("db"));
  const base = apiBase(c);
  return c.json({
    providers: rows.map((r) => toPublicProvider(r, base)),
    // 没有配置供应商时也要能正常返回, App 端据此隐藏「云端模型」分组
    available: rows.length > 0
  });
});
aiRoutes.get("/usage", requireAuth, async (c) => {
  const user = c.get("user");
  const state = await weeklyQuotaState(c.get("db"), user.userId, user.plan, "ai_chat");
  return c.json({
    tier: state.tier,
    tierLabel: PLAN_LABELS[state.tier],
    used: state.used,
    limit: state.limit,
    remaining: state.remaining,
    weekStart: state.weekStart,
    resetInMs: state.resetInMs
  });
});
aiRoutes.post("/chat", requireAuth, async (c) => {
  const user = c.get("user");
  const db = c.get("db");
  let body;
  try {
    body = await c.req.json();
  } catch {
    throw errors.badRequest("\u8BF7\u6C42\u4F53\u4E0D\u662F\u5408\u6CD5 JSON");
  }
  const messages = body.messages;
  if (!Array.isArray(messages) || messages.length === 0) {
    throw errors.badRequest("messages \u4E0D\u80FD\u4E3A\u7A7A");
  }
  const quota = await consumeWeeklyQuota(db, user.userId, user.plan, "ai_chat");
  const providerId = typeof body.providerId === "string" ? body.providerId : void 0;
  const requestedModel = typeof body.model === "string" ? body.model : "";
  const resolved = await resolveProviderForChat(
    db,
    c.env.JWT_SECRET,
    providerId,
    requestedModel
  );
  const upstream = { ...body, model: resolved.model };
  delete upstream.providerId;
  upstream.stream = body.stream === true;
  if (upstream.stream === false) delete upstream.stream_options;
  let resp;
  try {
    resp = await fetch(`${resolved.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${resolved.apiKey}`,
        "content-type": "application/json",
        accept: upstream.stream ? "text/event-stream" : "application/json"
      },
      body: JSON.stringify(upstream)
    });
  } catch (e) {
    throw new ApiError(
      502,
      "upstream_unreachable",
      `\u4E0A\u6E38\u6A21\u578B\u4E0D\u53EF\u8FBE: ${e instanceof Error ? e.message : String(e)}`
    );
  }
  if (!resp.ok) {
    const detail = await resp.text().catch(() => "");
    throw new ApiError(
      resp.status === 429 ? 429 : 502,
      "upstream_error",
      `\u4E0A\u6E38\u6A21\u578B\u8FD4\u56DE ${resp.status}: ${detail.slice(0, 300)}`
    );
  }
  const headers = {
    "content-type": resp.headers.get("content-type") ?? "application/json",
    "cache-control": "no-cache",
    // App 端靠这个头把本次消耗同步进额度展示
    "x-orion-quota-used": String(quota.used),
    "x-orion-quota-limit": String(quota.limit),
    "x-orion-model": resolved.model,
    "x-orion-provider": resolved.row.name
  };
  if (upstream.stream === true) {
    return new Response(resp.body, { status: 200, headers });
  }
  const json = await resp.json().catch(() => ({}));
  return new Response(JSON.stringify(json), { status: 200, headers });
});

// src/services/agent_stream.ts
var DONE = "data: [DONE]\n\n";
function sse(payload) {
  return `data: ${JSON.stringify(payload)}

`;
}
function chunk(delta, finishReason) {
  return sse({
    id: "orion-agent",
    object: "chat.completion.chunk",
    created: Math.floor(Date.now() / 1e3),
    model: "agent",
    choices: [{ index: 0, delta, finish_reason: finishReason }]
  });
}
function chunkToDelta(raw2) {
  let event;
  try {
    event = JSON.parse(raw2);
  } catch {
    return null;
  }
  if (!event || typeof event.type !== "string") return null;
  switch (event.type) {
    case "text-delta": {
      const text = event.delta ?? event.text ?? "";
      if (!text) return null;
      return { content: text };
    }
    case "reasoning-delta": {
      const text = event.delta ?? event.text ?? "";
      if (!text) return null;
      return { reasoning_content: text };
    }
    case "tool-input-available": {
      return null;
    }
    // 工具审批请求：App 场景下 orion-forge 已被配置为自动放行（见
    // /api/agent/chat 的 agentOptions.toolApproval），理论上不会到这里。
    // 万一实例配置有变而真的发出来了，转成正文提示——让用户知道
    // "Agent 在等一个没人点的确认"，好过流静默停住看不出原因。
    case "tool-approval-request": {
      const name = event.toolName || "\u67D0\u4E2A\u64CD\u4F5C";
      return {
        content: `

\u26A0\uFE0F Agent \u8BF7\u6C42\u786E\u8BA4\u300C${name}\u300D\uFF0C\u4F46\u5F53\u524D\u8C03\u7528\u65B9\u65E0\u6CD5\u5E94\u7B54\u5BA1\u6279\uFF0C\u5DF2\u8DF3\u8FC7\u3002`
      };
    }
    // 客户端主动中断 / 正常结束 / 出错：delta 为空，终止语义见
    // terminalOf()——abort 不能转成 stop，否则 App 会把「被取消」误认
    // 为「正常结束」。
    case "abort":
    case "finish":
      return null;
    case "tool-output-available":
    case "tool-input-start":
    case "tool-input-delta":
    case "tool-output-error":
    case "tool-input-error":
    case "tool-output-denied":
    // 文本与思考的起止边界：App 只关心增量内容，起止本身无意义
    case "text-start":
    case "text-end":
    case "reasoning-start":
    case "reasoning-end":
    // 元数据（模型 id、耗时等）：App 从响应头拿，不从流里读
    case "message-metadata":
    case "start":
    case "start-step":
    case "finish-step":
      return null;
    // App 侧不需要这些中间态
    // source-url / source-document（引用来源）：App 无对应展示位，
    // 丢弃即可。若日后要显示引用，需在 App 侧加事件类型。
    case "error": {
      const msg = event.errorText || "Agent \u6267\u884C\u51FA\u9519";
      return { content: `

\u26A0\uFE0F ${msg}` };
    }
    default:
      return null;
  }
}
function terminalOf(raw2) {
  let event;
  try {
    event = JSON.parse(raw2);
  } catch {
    return null;
  }
  if (!event || typeof event.type !== "string") return null;
  if (event.type === "finish") return "stop";
  if (event.type === "error") return "stop";
  if (event.type === "abort") return "done";
  return null;
}
function convertChunk(raw2) {
  const delta = chunkToDelta(raw2);
  const terminal = terminalOf(raw2);
  const out = [];
  if (delta && Object.keys(delta).length > 0) out.push(chunk(delta, null));
  if (terminal === "stop") {
    out.push(chunk({}, "stop"), DONE);
  } else if (terminal === "done") {
    out.push(DONE);
  }
  return out;
}
function convertStream(upstream, options = {}) {
  const encoder3 = new TextEncoder();
  const decoder = new TextDecoder();
  let buffer = "";
  let finished = false;
  let consumedChunks = 0;
  const reader = upstream.getReader();
  let pendingRead = null;
  const KEEPALIVE_MS = 12e3;
  const KEEPALIVE_FRAME = encoder3.encode(": keepalive\n\n");
  const TOTAL_DEADLINE_MS = 105e3;
  const startedAt = Date.now();
  const drainBuffer = (controller) => {
    let sawDone = false;
    let idx;
    while ((idx = buffer.indexOf("\n\n")) !== -1) {
      const rawEvent = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 2);
      for (const line of rawEvent.split("\n")) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data:")) continue;
        const payload = trimmed.slice(5).trim();
        if (!payload || payload === "[DONE]") continue;
        consumedChunks += 1;
        const out = convertChunk(payload);
        for (const piece of out) controller.enqueue(encoder3.encode(piece));
        if (out.some((p) => p.includes("[DONE]"))) sawDone = true;
      }
    }
    return sawDone;
  };
  const pump = async (controller) => {
    const finishStream = () => {
      finished = true;
      try {
        controller.enqueue(encoder3.encode(DONE));
        controller.close();
      } catch {
      }
    };
    try {
      for (; ; ) {
        if (finished) return;
        if (Date.now() - startedAt > TOTAL_DEADLINE_MS) {
          void reader.cancel("relay total deadline reached").catch(() => {
          });
          try {
            if (options.taskId) {
              controller.enqueue(
                encoder3.encode(
                  chunk(
                    {
                      task_fallback: {
                        taskId: options.taskId,
                        from: consumedChunks
                      }
                    },
                    "task_fallback"
                  )
                )
              );
            } else {
              controller.enqueue(
                encoder3.encode(
                  chunk(
                    {
                      content: "\n\n\u26A0\uFE0F \u4E91\u7AEF Agent \u54CD\u5E94\u8D85\u65F6\uFF1A105 \u79D2\u5185\u672A\u5B8C\u6210\u672C\u6B21\u4EFB\u52A1\uFF0C\u8FDE\u63A5\u5DF2\u4E3B\u52A8\u5173\u95ED\uFF08\u907F\u514D\u5E73\u53F0\u5F3A\u6740\u5BFC\u81F4\u8BF7\u6C42\u5931\u8D25\uFF09\u3002\u6A21\u578B\u7F51\u5173\u53EF\u80FD\u6392\u961F\uFF0C\u8BF7\u7A0D\u540E\u91CD\u8BD5\u3002"
                    },
                    "stop"
                  )
                )
              );
            }
          } catch {
            return;
          }
          finishStream();
          return;
        }
        if (!pendingRead) pendingRead = reader.read();
        let timer;
        const idle = new Promise((resolve) => {
          timer = setTimeout(() => resolve("idle"), KEEPALIVE_MS);
        });
        const raced = await Promise.race([pendingRead, idle]);
        clearTimeout(timer);
        if (finished) return;
        if (raced === "idle") {
          try {
            controller.enqueue(KEEPALIVE_FRAME);
          } catch {
            return;
          }
          continue;
        }
        pendingRead = null;
        const { done, value } = raced;
        if (done) {
          const tail = buffer.trim();
          if (tail.startsWith("data:")) {
            const payload = tail.slice(5).trim();
            if (payload && payload !== "[DONE]") {
              for (const piece of convertChunk(payload)) {
                controller.enqueue(encoder3.encode(piece));
              }
            }
          }
          finishStream();
          return;
        }
        buffer += decoder.decode(value, { stream: true });
        if (drainBuffer(controller)) {
          void reader.cancel("upstream done").catch(() => {
          });
          finishStream();
          return;
        }
      }
    } catch (e) {
      if (finished) return;
      const msg = e instanceof Error ? e.message : String(e);
      finished = true;
      try {
        controller.enqueue(
          encoder3.encode(chunk({ content: `

\u26A0\uFE0F Agent \u8FDE\u63A5\u4E2D\u65AD\uFF1A${msg}` }, "stop"))
        );
        controller.enqueue(encoder3.encode(DONE));
        controller.close();
      } catch {
      }
    }
  };
  return new ReadableStream({
    start(controller) {
      void pump(controller);
    },
    cancel(reason) {
      finished = true;
      pendingRead = null;
      return reader.cancel(reason);
    }
  });
}

// src/services/agent_tasks.ts
function mapRunStatus(runStatus) {
  switch (runStatus) {
    case "completed":
      return "done";
    case "failed":
      return "failed";
    case "cancelled":
      return "stopped";
    default:
      return "running";
  }
}
async function upsertTask(db, task) {
  const now = nowMs();
  await db.execute({
    sql: `INSERT INTO agent_tasks
            (task_id, user_id, chat_id, app_session_id, status, cursor, created_at, updated_at)
          VALUES (?, ?, ?, ?, 'running', 0, ?, ?)
          ON CONFLICT(task_id) DO UPDATE SET
            chat_id = excluded.chat_id,
            app_session_id = excluded.app_session_id,
            updated_at = excluded.updated_at`,
    args: [task.taskId, task.userId, task.chatId, task.appSessionId, now, now]
  });
}
async function getTask(db, taskId) {
  const r = await db.execute({
    sql: `SELECT task_id, user_id, chat_id, app_session_id, status, cursor, error,
                 created_at, updated_at, finished_at
          FROM agent_tasks WHERE task_id = ?`,
    args: [taskId]
  });
  const row = r.rows[0];
  return row ?? null;
}
async function advanceTask(db, taskId, patch) {
  const now = nowMs();
  const terminal = patch.status !== "running";
  await db.execute({
    sql: `UPDATE agent_tasks
          SET cursor = ?, status = ?, error = ?, updated_at = ?,
              finished_at = CASE WHEN ? THEN ? ELSE finished_at END
          WHERE task_id = ?`,
    args: [
      patch.cursor,
      patch.status,
      patch.error ?? null,
      now,
      terminal ? 1 : 0,
      now,
      taskId
    ]
  });
}
async function listActiveTasks(db, userId, limit = 20) {
  const r = await db.execute({
    sql: `SELECT task_id, user_id, chat_id, app_session_id, status, cursor, error,
                 created_at, updated_at, finished_at
          FROM agent_tasks
          WHERE user_id = ? AND status = 'running'
          ORDER BY updated_at DESC LIMIT ?`,
    args: [userId, limit]
  });
  return r.rows;
}

// src/routes/agent.ts
var statusOfRun = mapRunStatus;
var agentRoutes = new Hono3();
function apiBase2(c) {
  const origin = c.req.header("origin") ?? c.req.header("referer");
  if (origin) {
    try {
      return new URL(origin).origin;
    } catch {
    }
  }
  try {
    return new URL(c.req.url).origin;
  } catch {
  }
  return c.env.PUBLIC_BASE_URL || "";
}
agentRoutes.get("/info", requireAuth, async (c) => {
  const user = c.get("user");
  const instance = await getInstance(c.get("db"), user.userId);
  return c.json(toPublicAgentInfo(instance && instance.enabled === 1 ? instance : null, apiBase2(c)));
});
agentRoutes.post("/chat", requireAuth, async (c) => {
  const user = c.get("user");
  const db = c.get("db");
  const instance = await requireInstance(db, user.userId);
  let body;
  try {
    body = await c.req.json();
  } catch {
    throw errors.badRequest("\u8BF7\u6C42\u4F53\u4E0D\u662F\u5408\u6CD5 JSON");
  }
  if (!Array.isArray(body.messages) || body.messages.length === 0) {
    throw errors.badRequest("messages \u4E0D\u80FD\u4E3A\u7A7A");
  }
  const appSessionId = String(body.appSessionId ?? "").trim();
  const mapped = appSessionId ? await getAgentSession(db, user.userId, appSessionId) : null;
  const quota = await consumeWeeklyQuota(db, user.userId, user.plan, "agent_run");
  const apiKey = await decryptSecret(c.env.JWT_SECRET, instance.api_key_enc);
  const remoteBase = instance.base_url.replace(/\/+$/, "");
  const payload = {
    messages: body.messages
  };
  if (mapped) {
    payload.sessionId = mapped.remote_session;
    payload.chatId = mapped.remote_chat;
  }
  const requestedModel = typeof body.modelId === "string" ? body.modelId.trim() : "";
  if (requestedModel) payload.modelId = requestedModel;
  if (typeof body.max_tokens === "number" && body.max_tokens > 0) {
    payload.max_tokens = Math.floor(body.max_tokens);
  }
  let resp;
  try {
    resp = await fetch(`${remoteBase}/api/agent/chat`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
        accept: "text/event-stream"
      },
      body: JSON.stringify(payload)
    });
  } catch (e) {
    throw new ApiError(
      502,
      "agent_unreachable",
      `\u65E0\u6CD5\u8FDE\u63A5 Agent \u5B9E\u4F8B\uFF1A${e instanceof Error ? e.message : String(e)}`
    );
  }
  if (!resp.ok) {
    const detail = await resp.text().catch(() => "");
    throw new ApiError(
      resp.status === 401 || resp.status === 403 ? 502 : resp.status === 429 ? 429 : 502,
      "agent_error",
      `Agent \u5B9E\u4F8B\u8FD4\u56DE ${resp.status}\uFF1A${detail.slice(0, 300)}`
    );
  }
  const remoteSession = resp.headers.get("x-session-id");
  const remoteChat = resp.headers.get("x-chat-id");
  if (appSessionId && remoteSession && remoteChat) {
    await saveAgentSession(db, user.userId, appSessionId, remoteSession, remoteChat);
  }
  if (!resp.body) {
    throw errors.internal("Agent \u5B9E\u4F8B\u672A\u8FD4\u56DE\u6D41");
  }
  const runId = resp.headers.get("x-workflow-run-id");
  if (runId && appSessionId) {
    await upsertTask(db, {
      taskId: runId,
      userId: user.userId,
      chatId: remoteChat ?? "",
      appSessionId
    });
  }
  return new Response(convertStream(resp.body, { taskId: runId ?? void 0 }), {
    status: 200,
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache",
      "x-orion-agent-model": "agent",
      // App 端靠这两个头把本次消耗同步进额度卡片
      "x-orion-quota-used": String(quota.used),
      "x-orion-quota-limit": String(quota.limit),
      // 任务 id：App 拿它在流被截断/退后台后继续轮询
      ...runId ? { "x-orion-task-id": runId } : {}
    }
  });
});
async function agentCreds(c) {
  const user = c.get("user");
  const instance = await requireInstance(c.get("db"), user.userId);
  const apiKey = await decryptSecret(c.env.JWT_SECRET, instance.api_key_enc);
  return { base: instance.base_url.replace(/\/+$/, ""), key: apiKey };
}
agentRoutes.post("/tasks", requireAuth, async (c) => {
  const user = c.get("user");
  const db = c.get("db");
  let body;
  try {
    body = await c.req.json();
  } catch {
    throw errors.badRequest("\u8BF7\u6C42\u4F53\u4E0D\u662F\u5408\u6CD5 JSON");
  }
  if (!Array.isArray(body.messages) || body.messages.length === 0) {
    throw errors.badRequest("messages \u4E0D\u80FD\u4E3A\u7A7A");
  }
  const appSessionId = String(body.appSessionId ?? "").trim();
  if (!appSessionId) throw errors.badRequest("appSessionId \u4E0D\u80FD\u4E3A\u7A7A");
  const mapped = await getAgentSession(db, user.userId, appSessionId);
  const quota = await consumeWeeklyQuota(db, user.userId, user.plan, "agent_run");
  const { base, key } = await agentCreds(c);
  const payload = { messages: body.messages };
  if (mapped) {
    payload.sessionId = mapped.remote_session;
    payload.chatId = mapped.remote_chat;
  }
  const requestedModel = typeof body.modelId === "string" ? body.modelId.trim() : "";
  if (requestedModel) payload.modelId = requestedModel;
  if (typeof body.max_tokens === "number" && body.max_tokens > 0) {
    payload.max_tokens = Math.floor(body.max_tokens);
  }
  let resp;
  try {
    resp = await fetch(`${base}/api/agent/chat`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${key}`,
        "content-type": "application/json",
        accept: "text/event-stream"
      },
      body: JSON.stringify(payload)
    });
  } catch (e) {
    throw new ApiError(
      502,
      "agent_unreachable",
      `\u65E0\u6CD5\u8FDE\u63A5 Agent \u5B9E\u4F8B\uFF1A${e instanceof Error ? e.message : String(e)}`
    );
  }
  if (!resp.ok) {
    const detail = await resp.text().catch(() => "");
    throw new ApiError(
      resp.status === 401 || resp.status === 403 ? 502 : resp.status === 429 ? 429 : 502,
      "agent_error",
      `Agent \u5B9E\u4F8B\u8FD4\u56DE ${resp.status}\uFF1A${detail.slice(0, 300)}`
    );
  }
  const remoteSession = resp.headers.get("x-session-id");
  const remoteChat = resp.headers.get("x-chat-id");
  if (remoteSession && remoteChat) {
    await saveAgentSession(db, user.userId, appSessionId, remoteSession, remoteChat);
  }
  const taskId = resp.headers.get("x-workflow-run-id");
  if (!taskId) {
    return new Response(convertStream(resp.body), {
      status: 200,
      headers: {
        "content-type": "text/event-stream; charset=utf-8",
        "cache-control": "no-cache",
        "x-orion-quota-used": String(quota.used),
        "x-orion-quota-limit": String(quota.limit)
      }
    });
  }
  try {
    await resp.body?.cancel();
  } catch {
  }
  await upsertTask(db, {
    taskId,
    userId: user.userId,
    chatId: remoteChat ?? "",
    appSessionId
  });
  return c.json({
    taskId,
    chatId: remoteChat ?? "",
    sessionId: remoteSession ?? "",
    status: "running",
    used: quota.used,
    limit: quota.limit
  });
});
agentRoutes.get("/tasks/:id/status", requireAuth, async (c) => {
  const user = c.get("user");
  const db = c.get("db");
  const taskId = String(c.req.param("id") ?? "").trim();
  if (!taskId) throw errors.badRequest("\u7F3A\u5C11\u4EFB\u52A1 id");
  const task = await getTask(db, taskId);
  if (!task || task.user_id !== user.userId) throw errors.notFound("\u4EFB\u52A1\u4E0D\u5B58\u5728");
  const rawFrom = Number.parseInt(String(c.req.query("from") ?? "0"), 10);
  const from = Number.isFinite(rawFrom) && rawFrom > 0 ? rawFrom : 0;
  const rawFollow = Number.parseInt(String(c.req.query("follow") ?? "0"), 10);
  const follow = Number.isFinite(rawFollow) && rawFollow > 0 ? Math.min(rawFollow, 8e3) : 0;
  const { base, key } = await agentCreds(c);
  const url = `${base}/api/agent/streams/${encodeURIComponent(taskId)}?from=${from}&follow=${follow}`;
  let resp;
  try {
    resp = await fetch(url, {
      headers: { authorization: `Bearer ${key}`, accept: "application/json" }
    });
  } catch (e) {
    throw new ApiError(
      502,
      "agent_unreachable",
      `\u65E0\u6CD5\u8FDE\u63A5 Agent \u5B9E\u4F8B\uFF1A${e instanceof Error ? e.message : String(e)}`
    );
  }
  if (!resp.ok) {
    const detail = await resp.text().catch(() => "");
    throw new ApiError(
      resp.status === 401 || resp.status === 403 ? 502 : 502,
      "agent_error",
      `Agent \u5B9E\u4F8B\u8FD4\u56DE ${resp.status}\uFF1A${detail.slice(0, 300)}`
    );
  }
  const data = await resp.json();
  const runStatus = data.status ?? "running";
  const taskStatus = statusOfRun(runStatus);
  const total = typeof data.total === "number" ? data.total : from;
  const deltas = [];
  for (const chunk2 of data.chunks ?? []) {
    const delta = chunkToDelta(JSON.stringify(chunk2));
    if (delta) deltas.push(delta);
  }
  await advanceTask(db, taskId, {
    cursor: total,
    status: taskStatus,
    error: taskStatus === "failed" ? "forge run failed" : null
  });
  return c.json({
    taskId,
    status: taskStatus,
    runStatus,
    from,
    total,
    deltas
  });
});
agentRoutes.get("/tasks", requireAuth, async (c) => {
  const user = c.get("user");
  const db = c.get("db");
  const tasks = await listActiveTasks(db, user.userId);
  return c.json({
    tasks: tasks.map((t) => ({
      taskId: t.task_id,
      appSessionId: t.app_session_id,
      chatId: t.chat_id,
      status: t.status,
      cursor: t.cursor,
      updatedAt: t.updated_at
    }))
  });
});
agentRoutes.post("/tasks/:id/stop", requireAuth, async (c) => {
  const user = c.get("user");
  const db = c.get("db");
  const taskId = String(c.req.param("id") ?? "").trim();
  if (!taskId) throw errors.badRequest("\u7F3A\u5C11\u4EFB\u52A1 id");
  const task = await getTask(db, taskId);
  if (!task || task.user_id !== user.userId) throw errors.notFound("\u4EFB\u52A1\u4E0D\u5B58\u5728");
  const { base, key } = await agentCreds(c);
  try {
    await fetch(`${base}/api/agent/streams/${encodeURIComponent(taskId)}/cancel`, {
      method: "POST",
      headers: { authorization: `Bearer ${key}`, accept: "application/json" }
    });
  } catch {
  }
  await advanceTask(db, taskId, { cursor: task.cursor, status: "stopped" });
  return c.json({ ok: true, taskId, status: "stopped" });
});
agentRoutes.post("/session/reset", requireAuth, async (c) => {
  const user = c.get("user");
  let body;
  try {
    body = await c.req.json();
  } catch {
    throw errors.badRequest("\u8BF7\u6C42\u4F53\u4E0D\u662F\u5408\u6CD5 JSON");
  }
  const appSessionId = String(body.appSessionId ?? "").trim();
  if (!appSessionId) throw errors.badRequest("appSessionId \u4E0D\u80FD\u4E3A\u7A7A");
  await clearAgentSession(c.get("db"), user.userId, appSessionId);
  return c.json({ ok: true });
});
async function instanceTarget(c) {
  const user = c.get("user");
  const instance = await requireInstance(c.get("db"), user.userId);
  const apiKey = await decryptSecret(c.env.JWT_SECRET, instance.api_key_enc);
  return {
    base: instance.base_url.replace(/\/+$/, ""),
    key: apiKey
  };
}
async function remoteSessionOf(db, userId, appSessionId) {
  const mapped = await getAgentSession(db, userId, appSessionId);
  return mapped?.remote_session ?? null;
}
agentRoutes.get("/files", requireAuth, async (c) => {
  const user = c.get("user");
  const db = c.get("db");
  const appSessionId = String(c.req.query("appSessionId") ?? "").trim();
  if (!appSessionId) throw errors.badRequest("\u7F3A\u5C11 appSessionId");
  const remoteSession = await remoteSessionOf(db, user.userId, appSessionId);
  if (!remoteSession) throw errors.notFound("\u8BE5\u4F1A\u8BDD\u5C1A\u672A\u4EA7\u751F\u8FDC\u7AEF Agent \u4F1A\u8BDD\uFF0C\u8BF7\u5148\u53D1\u9001\u4E00\u6761\u6D88\u606F");
  const { base, key } = await instanceTarget(c);
  return proxyInstance(`${base}/api/sessions/${encodeURIComponent(remoteSession)}/files`, key);
});
agentRoutes.get("/file", requireAuth, async (c) => {
  const user = c.get("user");
  const db = c.get("db");
  const appSessionId = String(c.req.query("appSessionId") ?? "").trim();
  const path = String(c.req.query("path") ?? "").trim();
  if (!appSessionId) throw errors.badRequest("\u7F3A\u5C11 appSessionId");
  if (!path) throw errors.badRequest("\u7F3A\u5C11 path");
  const remoteSession = await remoteSessionOf(db, user.userId, appSessionId);
  if (!remoteSession) throw errors.notFound("\u8BE5\u4F1A\u8BDD\u5C1A\u672A\u4EA7\u751F\u8FDC\u7AEF Agent \u4F1A\u8BDD\uFF0C\u8BF7\u5148\u53D1\u9001\u4E00\u6761\u6D88\u606F");
  const { base, key } = await instanceTarget(c);
  const target = `${base}/api/sessions/${encodeURIComponent(remoteSession)}/files/content?path=${encodeURIComponent(path)}`;
  return proxyInstance(target, key);
});
agentRoutes.post("/dev-server", requireAuth, async (c) => {
  const user = c.get("user");
  const db = c.get("db");
  const appSessionId = String(c.req.query("appSessionId") ?? "").trim();
  if (!appSessionId) throw errors.badRequest("\u7F3A\u5C11 appSessionId");
  const remoteSession = await remoteSessionOf(db, user.userId, appSessionId);
  if (!remoteSession) throw errors.notFound("\u8BE5\u4F1A\u8BDD\u5C1A\u672A\u4EA7\u751F\u8FDC\u7AEF Agent \u4F1A\u8BDD\uFF0C\u8BF7\u5148\u53D1\u9001\u4E00\u6761\u6D88\u606F");
  const { base, key } = await instanceTarget(c);
  return proxyInstance(
    `${base}/api/sessions/${encodeURIComponent(remoteSession)}/dev-server`,
    key,
    "POST"
  );
});
agentRoutes.delete("/dev-server", requireAuth, async (c) => {
  const user = c.get("user");
  const db = c.get("db");
  const appSessionId = String(c.req.query("appSessionId") ?? "").trim();
  if (!appSessionId) throw errors.badRequest("\u7F3A\u5C11 appSessionId");
  const remoteSession = await remoteSessionOf(db, user.userId, appSessionId);
  if (!remoteSession) throw errors.notFound("\u8BE5\u4F1A\u8BDD\u5C1A\u672A\u4EA7\u751F\u8FDC\u7AEF Agent \u4F1A\u8BDD\uFF0C\u8BF7\u5148\u53D1\u9001\u4E00\u6761\u6D88\u606F");
  const { base, key } = await instanceTarget(c);
  return proxyInstance(
    `${base}/api/sessions/${encodeURIComponent(remoteSession)}/dev-server`,
    key,
    "DELETE"
  );
});
async function proxyInstance(target, key, method = "GET") {
  let resp;
  try {
    resp = await fetch(target, {
      method,
      headers: { authorization: `Bearer ${key}`, accept: "application/json" }
    });
  } catch (e) {
    throw new ApiError(
      502,
      "agent_unreachable",
      `\u65E0\u6CD5\u8FDE\u63A5 Agent \u5B9E\u4F8B\uFF1A${e instanceof Error ? e.message : String(e)}`
    );
  }
  const text = await resp.text();
  if (!resp.ok) {
    if (resp.status === 401 || resp.status === 403) {
      throw new ApiError(502, "agent_error", "Agent \u5B9E\u4F8B\u9274\u6743\u5931\u8D25\uFF0C\u8BF7\u68C0\u67E5\u8BE5\u5B9E\u4F8B\u7684 API Key \u662F\u5426\u5DF2\u66F4\u6362");
    }
    return new Response(text, {
      status: resp.status,
      headers: { "content-type": resp.headers.get("content-type") ?? "application/json" }
    });
  }
  return new Response(text, {
    status: 200,
    headers: {
      "content-type": resp.headers.get("content-type") ?? "application/json",
      "cache-control": "no-store"
    }
  });
}

// src/ui/admin_html.ts
function adminHtml() {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
<meta name="theme-color" content="#ffffff">
<title>Orion Cloud \u7BA1\u7406\u53F0</title>
<style>
/* ============================================================
   Orion Cloud \u7BA1\u7406\u53F0 \u2014\u2014 \u53CC\u4E3B\u9898\u6DB2\u6001\u73BB\u7483
   \u4E3B\u9898\u53EA\u6709\u4E24\u5957: light(\u7EAF\u767D) / dark(\u6DF1\u8272), \u5747\u4E3A\u5355\u8272\u7CFB\u3002
   \u4EFB\u4F55\u989C\u8272\u90FD\u4ECE CSS \u53D8\u91CF\u53D6, \u6362\u4E3B\u9898\u53EA\u6362\u53D8\u91CF\u3001\u4E0D\u52A8\u7ED3\u6784\u3002
   ============================================================ */

/* ---------- \u4E3B\u9898\u53D8\u91CF ---------- */
:root, :root[data-theme="light"] {
  color-scheme: light;
  --page:#ffffff;
  --text:#0d1524; --text-dim:#5f6b7e; --text-faint:#8b97a8;

  --glass:rgba(255,255,255,.60);      /* \u5E38\u89C4\u73BB\u7483\u9762\u677F */
  --glass-2:rgba(255,255,255,.80);    /* \u66F4\u5B9E\u7684\u73BB\u7483: \u62BD\u5C49 / \u5361\u7247 / \u5F39\u5C42 */
  --glass-3:rgba(255,255,255,.46);    /* \u66F4\u865A\u7684\u73BB\u7483: \u8868\u5934 / \u5438\u9876\u6761 */
  --border:rgba(13,21,36,.10);
  --border-strong:rgba(13,21,36,.20);
  --input:rgba(255,255,255,.74);
  --hover:rgba(13,21,36,.055);
  --stripe:rgba(13,21,36,.028);

  --primary:#0d1524; --on-primary:#ffffff;
  --danger:#dc2626; --danger-ink:#b91c1c; --on-danger:#ffffff;
  --ok:#047857; --ok-ink:#047857;

  --blob1:rgba(13,21,36,.075); --blob2:rgba(13,21,36,.055); --blob3:rgba(13,21,36,.045);
  --shadow:0 18px 50px rgba(13,21,36,.10), 0 2px 6px rgba(13,21,36,.05);
  --shadow-sm:0 5px 16px rgba(13,21,36,.07);
  --grain:rgba(255,255,255,.85);      /* \u73BB\u7483\u9876\u90E8\u9AD8\u5149 */
  --scrim:rgba(4,8,15,.45);
}
:root[data-theme="dark"] {
  color-scheme: dark;
  --page:#05070c;
  --text:#e9eef6; --text-dim:#97a3b4; --text-faint:#6f7b8c;

  --glass:rgba(255,255,255,.055);
  --glass-2:rgba(255,255,255,.085);
  --glass-3:rgba(255,255,255,.05);
  --border:rgba(255,255,255,.11);
  --border-strong:rgba(255,255,255,.24);
  --input:rgba(255,255,255,.065);
  --hover:rgba(255,255,255,.075);
  --stripe:rgba(255,255,255,.03);

  --primary:#f2f6fb; --on-primary:#0a0f18;
  --danger:#e5484d; --danger-ink:#fca5a5; --on-danger:#ffffff;
  --ok:#34d399; --ok-ink:#6ee7b7;

  --blob1:rgba(255,255,255,.085); --blob2:rgba(255,255,255,.06); --blob3:rgba(255,255,255,.045);
  --shadow:0 18px 50px rgba(0,0,0,.55), 0 2px 6px rgba(0,0,0,.35);
  --shadow-sm:0 5px 16px rgba(0,0,0,.4);
  --grain:rgba(255,255,255,.16);
  --scrim:rgba(0,0,0,.55);
}

* { margin:0; padding:0; box-sizing:border-box; }
html { -webkit-text-size-adjust:100%; }
body {
  min-height:100vh; font-family:"PingFang SC","HarmonyOS Sans SC","Microsoft YaHei",-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;
  background:var(--page); color:var(--text); overflow-x:hidden;
  line-height:1.55; letter-spacing:.1px;
  -webkit-font-smoothing:antialiased; -moz-osx-font-smoothing:grayscale;
}
button { cursor:pointer; font-family:inherit; }
::selection { background:color-mix(in srgb, var(--text) 20%, transparent); }

/* ---- \u80CC\u666F\u6DB2\u6001\u5149\u6591(\u6781\u4F4E\u9971\u548C, \u7EAF\u767D/\u6DF1\u8272\u89C2\u611F\u4E0D\u53D8) ---- */
.blob { position:fixed; border-radius:50%; filter:blur(90px); z-index:-1;
  pointer-events:none; animation:drift 26s ease-in-out infinite alternate; }
.blob.b1 { width:46vw; height:46vw; background:var(--blob1); top:-18vw; left:-10vw; }
.blob.b2 { width:38vw; height:38vw; background:var(--blob2); bottom:-16vw; right:-8vw; animation-delay:-9s; }
.blob.b3 { width:28vw; height:28vw; background:var(--blob3); top:32vh; left:58vw; animation-delay:-17s; }
@keyframes drift { from { transform:translate(0,0) scale(1); } to { transform:translate(5vw,4vh) scale(1.14); } }

/* ---- \u78E8\u7802\u73BB\u7483(\u6DB2\u6001\u73BB\u7483) ---- */
.glass {
  background:var(--glass);
  backdrop-filter:blur(30px) saturate(1.7);
  -webkit-backdrop-filter:blur(30px) saturate(1.7);
  border:1px solid var(--border);
  border-radius:22px;
  box-shadow:var(--shadow), inset 0 1px 0 var(--grain);
}
/* \u5355\u8272\u6E10\u53D8\u6587\u5B57: \u6DF1\u2192\u6D45, \u4E0D\u5F15\u5165\u4EFB\u4F55\u5F69\u8272 */
.grad-text { background:linear-gradient(120deg, var(--text), var(--text-dim));
  -webkit-background-clip:text; background-clip:text; color:transparent; }

/* ---- \u6309\u94AE ---- */
.btn {
  border:none; border-radius:13px; padding:9px 18px; font-size:14px; font-weight:650;
  color:var(--on-primary); background:var(--primary); box-shadow:var(--shadow-sm);
  transition:transform .15s, box-shadow .15s, opacity .15s, background .15s;
  min-height:38px;
}
.btn:hover { transform:translateY(-1px); }
.btn:active { transform:translateY(0); }
.btn:disabled { opacity:.5; transform:none; }
.btn.ghost {
  background:var(--glass-2); color:var(--text); border:1px solid var(--border);
  backdrop-filter:blur(18px); -webkit-backdrop-filter:blur(18px); box-shadow:none;
}
.btn.ghost:hover { background:var(--hover); transform:translateY(-1px); }
.btn.danger { background:var(--danger); color:var(--on-danger); }
.btn.danger-soft {
  background:color-mix(in srgb, var(--danger) 12%, transparent);
  color:var(--danger-ink); border:1px solid color-mix(in srgb, var(--danger) 32%, transparent);
  padding:5px 12px; font-size:12px; border-radius:10px; min-height:32px; box-shadow:none;
}
.btn.danger-soft:hover { background:color-mix(in srgb, var(--danger) 20%, transparent); transform:none; box-shadow:none; }
.btn.icon { padding:8px 13px; font-size:16px; line-height:1; border-radius:12px; }

/* ---- \u8868\u5355\u63A7\u4EF6 ---- */
input, select, textarea {
  background:var(--input); border:1px solid var(--border); border-radius:13px;
  padding:10px 14px; color:var(--text); font-size:14px; outline:none; font-family:inherit;
  backdrop-filter:blur(14px); -webkit-backdrop-filter:blur(14px);
  transition:border-color .18s, box-shadow .18s, background .18s;
}
input::placeholder, textarea::placeholder { color:var(--text-faint); }
input:focus, select:focus, textarea:focus {
  border-color:var(--border-strong);
  box-shadow:0 0 0 3px color-mix(in srgb, var(--text) 14%, transparent);
}
select option { color:#0d1524; background:#ffffff; }
:root[data-theme="dark"] select option { color:#e9eef6; background:#10151d; }
textarea { resize:vertical; font-family:inherit; line-height:1.6; }
input[type="checkbox"] { width:auto; accent-color:var(--primary); padding:0; }

/* ---- \u8868\u683C: \u684C\u9762\u6A2A\u6392(\u53EF\u6A2A\u5411\u6EDA\u52A8), \u6587\u672C\u6309\u8BCD\u6298\u884C\u800C\u975E\u786C\u62C6\u5B57\u7B26 ---- */
table { width:100%; border-collapse:separate; border-spacing:0; font-size:13.5px; }
th { text-align:left; padding:12px 14px; color:var(--text-dim); font-weight:650;
  font-size:12.5px; letter-spacing:.4px; white-space:nowrap;
  border-bottom:1px solid var(--border); }
td { padding:11px 14px; border-bottom:1px solid var(--border);
  overflow-wrap:anywhere; vertical-align:middle; line-height:1.55; }
tbody tr:last-child td { border-bottom:none; }
tbody tr:nth-child(even) td { background:var(--stripe); }
tbody tr:hover td { background:var(--hover); }
.scroll-x { overflow-x:auto; -webkit-overflow-scrolling:touch; }
.scroll-x::-webkit-scrollbar, #drawer::-webkit-scrollbar { height:8px; width:8px; }
.scroll-x::-webkit-scrollbar-thumb, #drawer::-webkit-scrollbar-thumb {
  background:color-mix(in srgb, var(--text) 22%, transparent); border-radius:99px; }

.badge { display:inline-block; padding:3px 10px; border-radius:999px; font-size:12px;
  font-weight:650; letter-spacing:.2px; border:1px solid transparent; }
.badge.used { background:var(--hover); color:var(--text); border-color:var(--border); }
.badge.unused { background:color-mix(in srgb, var(--ok) 15%, transparent);
  color:var(--ok-ink); border-color:color-mix(in srgb, var(--ok) 32%, transparent); }
.badge.revoked, .badge.banned, .badge.error {
  background:color-mix(in srgb, var(--danger) 13%, transparent);
  color:var(--danger-ink); border-color:color-mix(in srgb, var(--danger) 34%, transparent); }
.mono { font-family:ui-monospace,SFMono-Regular,Consolas,monospace; letter-spacing:-.1px; }
.dim { color:var(--text-dim); }

/* ---- \u5DE6\u4FA7\u62BD\u5C49 ---- */
#drawer {
  position:fixed; left:0; top:0; bottom:0; width:244px; z-index:40;
  display:none;                                   /* \u672A\u767B\u5F55\u4E0D\u5C55\u793A\u5BFC\u822A */
  background:var(--glass-2);
  backdrop-filter:blur(34px) saturate(1.8); -webkit-backdrop-filter:blur(34px) saturate(1.8);
  border-right:1px solid var(--border);
  box-shadow:var(--shadow);
  padding:18px 14px calc(16px + env(safe-area-inset-bottom));
  flex-direction:column; overflow-y:auto; overscroll-behavior:contain;
  transition:margin-left .28s cubic-bezier(.4,0,.2,1), transform .28s cubic-bezier(.4,0,.2,1);
}
body.authed #drawer { display:flex; }
#drawer .brand { display:flex; align-items:center; gap:9px; padding:2px 8px 14px;
  font-size:17px; font-weight:900; letter-spacing:.5px; white-space:nowrap; }
.grp { font-size:10.5px; letter-spacing:2.4px; color:var(--text-faint);
  font-weight:800; margin:16px 10px 7px; }
.nav-item {
  display:flex; align-items:center; gap:11px; width:100%; min-height:44px;
  border:none; background:transparent; color:var(--text);
  font-size:14px; font-weight:600; padding:11px 13px; border-radius:14px;
  text-align:left; white-space:nowrap;
  transition:background .18s, color .18s, box-shadow .18s;
}
.nav-item:hover { background:var(--hover); }
.nav-item.active { color:var(--on-primary); background:var(--primary); box-shadow:var(--shadow-sm); }
.ic { width:18px; height:18px; flex:none; display:inline-block;
  fill:none; stroke:currentColor; stroke-width:1.8; stroke-linecap:round; stroke-linejoin:round; }
.nav-item .ic { width:18px; height:18px; }
#drawer .foot { margin-top:auto; padding-top:16px; border-top:1px solid var(--border);
  display:flex; gap:8px; }
#drawer .foot .btn { flex:1; padding:8px 10px; font-size:13px; min-height:40px;
  display:inline-flex; align-items:center; justify-content:center; gap:5px; }

/* \u684C\u9762\u6298\u53E0 */
body.collapsed #drawer { margin-left:-244px; }
body.collapsed #app { margin-left:0; }
#mask { position:fixed; inset:0; background:var(--scrim); z-index:35; display:none;
  backdrop-filter:blur(3px); -webkit-backdrop-filter:blur(3px); }
body.drawer-open #mask { display:block; }

/* ---- \u4E3B\u533A ---- */
#app { display:none; margin-left:244px; transition:margin-left .28s cubic-bezier(.4,0,.2,1); }
#app .inner { max-width:1440px; margin:0 auto; padding:0 28px 72px; }
header.top {
  position:sticky; top:0; z-index:20;
  display:flex; align-items:center; gap:10px; flex-wrap:wrap;
  padding:16px 0 15px; margin-bottom:8px;
  background:linear-gradient(180deg, var(--page) 74%, transparent);
}
header.top::after {
  content:''; position:absolute; left:0; right:0; bottom:0; height:1px;
  background:linear-gradient(90deg, var(--border), transparent 72%);
}
header.top h1 { font-size:20px; font-weight:800; letter-spacing:.3px; }
header.top .spacer { flex:1; }
section.view { display:none; }
section.view.active { display:block; }

/* \u7EDF\u8BA1\u5361\u7247 */
.grid.cards { display:grid; grid-template-columns:repeat(auto-fit,minmax(176px,1fr));
  gap:16px; margin-bottom:20px; }
.stat { padding:16px 18px 18px; position:relative; overflow:hidden; border-radius:20px; }
.stat .num { font-size:32px; font-weight:800; margin-top:2px; letter-spacing:-.5px;
  line-height:1.15; font-variant-numeric:tabular-nums; }
.stat .lbl { font-size:12.5px; color:var(--text-dim); letter-spacing:.3px; }
.stat::after {
  content:''; position:absolute; right:-30px; top:-30px; width:104px; height:104px;
  border-radius:50%; pointer-events:none;
  background:radial-gradient(circle, color-mix(in srgb, var(--text) 13%, transparent), transparent 72%);
}

/* \u9762\u677F */
.panel { padding:0; margin-bottom:20px; border-radius:20px; overflow:hidden;
  transition:box-shadow .2s; }
.panel:hover { box-shadow:0 14px 40px color-mix(in srgb, var(--text) 8%, transparent); }
.panel h2 {
  display:flex; align-items:center; gap:8px; flex-wrap:wrap; row-gap:8px;
  margin:0; padding:16px 20px 14px; border-bottom:1px solid var(--border);
  font-size:15.5px; font-weight:700;
}
.panel h2 .ic { width:17px; height:17px; }
.panel h2 .btn { margin-left:auto; padding:5px 13px; font-size:12.5px; min-height:32px; }
.panel > .row, .panel > .scroll-x, .panel > .note { margin-left:20px; margin-right:20px; }
.panel > .row:first-of-type { margin-top:16px; }
.panel > .row:last-child { margin-bottom:20px; }
.panel > .scroll-x:last-child, .panel > .note:last-child { margin-bottom:20px; }
.note { font-size:12.5px; line-height:1.8; }
.panel > .note { margin-top:16px; }

.row { display:flex; gap:12px; flex-wrap:wrap; align-items:center; margin-bottom:14px; }
.row > input, .row > select, .row > textarea { flex:1 1 auto; min-width:150px; }
.row > span, .row > label { font-size:13px; color:var(--text-dim); }
.row > label { display:flex; align-items:center; gap:6px; }
.empty { text-align:center; padding:30px 20px; color:var(--text-dim); font-size:14px; }

.grid.duo { display:block; }
@media (min-width:1100px) {
  .grid.duo { display:grid; grid-template-columns:1fr 1fr; gap:20px; align-items:start; }
  .grid.duo > .panel { margin-bottom:0; }
}

/* ---- Toast ---- */
#toast {
  position:fixed; left:50%; z-index:99; max-width:calc(100vw - 32px);
  bottom:calc(26px + env(safe-area-inset-bottom));
  transform:translateX(-50%) translateY(90px); opacity:0;
  padding:11px 22px; font-size:14px; font-weight:650; text-align:center;
  color:var(--on-primary); background:var(--primary);
  border-radius:999px; box-shadow:var(--shadow);
  transition:transform .3s, opacity .3s; word-break:break-word;
}
#toast.show { transform:translateX(-50%) translateY(0); opacity:1; }

/* ---- \u767B\u5F55 ---- */
#login { display:none; min-height:100vh; min-height:100dvh;
  align-items:center; justify-content:center; padding:24px; }
#login .box { width:min(420px,100%); padding:38px 32px; text-align:center; border-radius:26px; }
#login h1 { font-size:23px; font-weight:800; margin:16px 0 6px; }
#login p { color:var(--text-dim); font-size:13px; margin-bottom:22px; }
#login input { width:100%; margin-bottom:14px; text-align:center; }
#login .btn { width:100%; padding:12px; min-height:46px; letter-spacing:4px; }

/* ---- \u4E3B\u9898\u5207\u6362\u6309\u94AE ---- */
.ic-moon { display:none; }
:root[data-theme="dark"] .ic-moon { display:inline-block; }
:root[data-theme="dark"] .ic-sun { display:none; }

/* ---- \u4E8C\u6B21\u786E\u8BA4\u5F39\u7A97 ---- */
#confirm { display:none; position:fixed; inset:0; z-index:120;
  align-items:center; justify-content:center; padding:20px;
  background:var(--scrim); backdrop-filter:blur(6px); -webkit-backdrop-filter:blur(6px); }
#confirm.show { display:flex; }
#confirm .box { width:min(440px,100%); padding:26px 24px 20px; border-radius:22px; }
#confirm h3 { font-size:17px; font-weight:800; margin:0 0 10px; display:flex; align-items:center; gap:8px; }
#confirm p { font-size:13.5px; line-height:1.7; color:var(--text-dim); margin:0 0 12px; }
#confirm .impact {
  max-height:200px; overflow:auto; margin-bottom:16px; padding:12px 14px; border-radius:14px;
  background:var(--hover); font-size:13px; line-height:1.8;
}
#confirm .impact b { font-weight:700; }
#confirm .impact .n { float:right; color:var(--danger-ink); font-weight:700; }
#confirm .acts { display:flex; gap:10px; justify-content:flex-end; }
#confirm .acts .btn { min-width:96px; }

/* ============================================================
   \u54CD\u5E94\u5F0F: \u79FB\u52A8\u7AEF\u9002\u914D
   \u2264900px  \u62BD\u5C49\u6539\u4E3A\u6D6E\u51FA\u5F0F(\u906E\u7F69 + \u4FA7\u6ED1)
   \u2264760px  \u8868\u683C\u8F6C\u5361\u7247\u3001\u8868\u5355\u7EB5\u5411\u5806\u53E0\u3001\u5F39\u7A97\u53D8\u5E95\u90E8\u9762\u677F
   ============================================================ */
@media (max-width:900px) {
  #drawer { transform:translateX(-102%); box-shadow:0 0 60px rgba(0,0,0,.35); }
  body.drawer-open #drawer { transform:translateX(0); }
  /* \u8986\u76D6\u684C\u9762\u6298\u53E0\u6001\u7684\u8D1F margin(\u7279\u5F02\u6027\u76F8\u540C, \u9760\u540E\u58F0\u660E\u751F\u6548) */
  body.collapsed #drawer { margin-left:0; }
  #app, body.collapsed #app { margin-left:0; }
}

@media (max-width:760px) {
  #app .inner { padding:0 14px calc(60px + env(safe-area-inset-bottom)); }
  header.top { padding:12px 0 12px; margin-bottom:6px; gap:8px; }
  header.top h1 { font-size:17px; }
  .btn { min-height:42px; padding:9px 15px; }
  .btn.danger-soft { min-height:40px; }   /* \u8986\u76D6\u684C\u9762 32px, \u4FDD\u8BC1\u89E6\u63A7\u591F\u5927 */

  /* \u7EDF\u8BA1\u5361\u7247: \u4E24\u5217 */
  .grid.cards { grid-template-columns:repeat(2,minmax(0,1fr)); gap:10px; }
  .stat { padding:13px 14px 14px; border-radius:16px; }
  .stat .num { font-size:25px; }
  .stat .lbl { font-size:11.5px; }

  /* \u9762\u677F\u4E0E\u8868\u5355 */
  .panel h2 { padding:14px 15px 12px; font-size:14.5px; }
  .panel > .row, .panel > .scroll-x, .panel > .note { margin-left:15px; margin-right:15px; }
  .row { flex-direction:column; align-items:stretch; gap:10px; }
  .row > input, .row > select, .row > textarea {
    flex:0 0 auto !important; width:100% !important; min-width:0 !important; }
  .row > label { justify-content:flex-start; }

  /* \u8868\u683C \u2192 \u5361\u7247: \u8868\u5934\u9690\u85CF, \u6BCF\u884C\u4E00\u5F20\u73BB\u7483\u5361, \u5355\u5143\u683C\u6807\u7B7E\u7F6E\u9876 */
  .scroll-x { overflow-x:visible; }
  .scroll-x table, .scroll-x tbody, .scroll-x tr { display:block; width:100%; }
  .scroll-x thead, .scroll-x tr.hrow { display:none; }   /* \u8868\u5934\u884C\u4E0D\u53C2\u4E0E\u5361\u7247 */
  .scroll-x tbody tr {
    border:1px solid var(--border); border-radius:16px; overflow:hidden;
    margin-bottom:12px; padding:4px 0; background:var(--glass-2);
    box-shadow:var(--shadow-sm); transition:border-color .18s;
  }
  .scroll-x tbody tr:hover { border-color:var(--border-strong); }
  .scroll-x tbody tr:last-child { margin-bottom:0; }
  .scroll-x td {
    display:flex; flex-direction:column; align-items:stretch; gap:5px;
    width:100%; padding:9px 15px; text-align:left;
    background:transparent !important;             /* \u5173\u6389\u684C\u9762\u6591\u9A6C\u7EB9/\u60AC\u505C\u5E95\u8272 */
    border-bottom:1px solid var(--border);
  }
  .scroll-x td[data-label]::before {
    content:attr(data-label); color:var(--text-dim);
    font-size:11.5px; font-weight:700; letter-spacing:.5px;
  }
  .scroll-x td:last-child { border-bottom:none; }
  .scroll-x td.empty { display:block; text-align:center; padding:26px 16px; background:transparent !important; }
  /* \u64CD\u4F5C\u5217: \u6CA1\u6709\u8868\u5934\u6587\u5B57, \u6A2A\u6392\u6309\u94AE\u94FA\u6EE1\u53EF\u70B9\u533A\u57DF */
  .scroll-x td:not(.empty):not([data-label]) {
    flex-direction:row; flex-wrap:wrap; gap:8px; align-items:center; padding-top:5px; }
  .scroll-x td:not(.empty):not([data-label]) > .btn { flex:1 1 92px; min-height:42px; }
  /* \u8868\u5355\u7EC4(\u5982\u6388\u6743\u5957\u9910\u4E09\u4EF6\u5957)\u94FA\u6EE1\u4E00\u884C */
  .scroll-x td > div { width:100%; }
  .scroll-x td > div > select, .scroll-x td > div > input {
    flex:1 1 92px !important; width:auto !important; min-width:0; }
  .scroll-x td > div > .btn { flex:1 1 92px; }

  /* \u7834\u574F\u6027\u64CD\u4F5C\u5F39\u7A97 \u2192 \u5E95\u90E8\u9762\u677F */
  #confirm { align-items:flex-end; padding:0; }
  #confirm .box { width:100%; border-radius:24px 24px 0 0;
    padding:24px 18px calc(18px + env(safe-area-inset-bottom)); }
  #confirm .acts .btn { flex:1; min-width:0; }

  /* \u8F93\u5165\u6846\u5B57\u53F7 \u226516px, \u9632\u6B62 iOS \u805A\u7126\u81EA\u52A8\u653E\u5927\u3002
     \u8868\u683C\u5361\u91CC\u7684\u63A7\u4EF6\u5E26\u7740\u884C\u5185\u5C0F\u5B57\u53F7, \u5FC5\u987B\u7528 !important \u8986\u76D6\u3002 */
  input, select, textarea { font-size:16px !important; padding:11px 14px !important; }
  .scroll-x input, .scroll-x select { padding:10px 12px !important; }
  .scroll-x .btn { font-size:13.5px !important; }
  #login .box { padding:32px 22px; }
  #login h1 { font-size:21px; }
  #toast { font-size:13.5px; padding:10px 18px; }
}
</style>
</head>
<body>
<svg style="display:none" aria-hidden="true">
  <symbol id="i-home" viewBox="0 0 24 24"><path d="M3 10.5 12 3l9 7.5"/><path d="M5.5 9.5V20a1 1 0 0 0 1 1H10v-5.5h4V21h3.5a1 1 0 0 0 1-1V9.5"/></symbol>
  <symbol id="i-key" viewBox="0 0 24 24"><circle cx="8" cy="15" r="4"/><path d="m11 12 8-8"/><path d="m15.5 6.5 2.5 2.5"/><path d="m18 4 2 2"/></symbol>
  <symbol id="i-users" viewBox="0 0 24 24"><circle cx="9" cy="8" r="3.5"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><path d="M16 5.2a3.5 3.5 0 0 1 0 5.6"/><path d="M17.5 14.3c1.8.9 3 2.7 3 4.7"/></symbol>
  <symbol id="i-chart" viewBox="0 0 24 24"><path d="M4 20V10"/><path d="M10 20V4"/><path d="M16 20v-7"/><path d="M21 20H3"/></symbol>
  <symbol id="i-shield" viewBox="0 0 24 24"><path d="M12 3 5 6v5.5c0 4.2 2.9 7.6 7 9.5 4.1-1.9 7-5.3 7-9.5V6l-7-3Z"/><path d="m9 12 2 2 4-4"/></symbol>
  <symbol id="i-menu" viewBox="0 0 24 24"><path d="M4 7h16"/><path d="M4 12h16"/><path d="M4 17h16"/></symbol>
  <symbol id="i-sun" viewBox="0 0 24 24"><circle cx="12" cy="12" r="4.2"/><path d="M12 2.6v2.2M12 19.2v2.2M2.6 12h2.2M19.2 12h2.2M5.2 5.2l1.6 1.6M17.2 17.2l1.6 1.6M18.8 5.2l-1.6 1.6M6.8 17.2l-1.6 1.6"/></symbol>
  <symbol id="i-moon" viewBox="0 0 24 24"><path d="M20.5 14.8A8.7 8.7 0 0 1 9.2 3.5a8.8 8.8 0 1 0 11.3 11.3Z" fill="currentColor" stroke="none"/></symbol>
  <symbol id="i-pin" viewBox="0 0 24 24"><path d="M12 21s7-5.6 7-11a7 7 0 1 0-14 0c0 5.4 7 11 7 11Z"/><circle cx="12" cy="10" r="2.5"/></symbol>
  <symbol id="i-list" viewBox="0 0 24 24"><path d="M8 6h13"/><path d="M8 12h13"/><path d="M8 18h13"/><path d="M3.5 6h.01"/><path d="M3.5 12h.01"/><path d="M3.5 18h.01"/></symbol>
  <symbol id="i-mega" viewBox="0 0 24 24"><path d="m3 11 14-6v14L3 13v-2Z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/><path d="M17 9.5a4 4 0 0 1 0 5"/></symbol>
  <symbol id="i-diamond" viewBox="0 0 24 24"><path d="m12 3 8 9-8 9-8-9 8-9Z"/></symbol>
</svg>
<div class="blob b1"></div><div class="blob b2"></div><div class="blob b3"></div>

<!-- \u767B\u5F55 -->
<div id="login">
  <div class="box glass">
    <div style="display:flex; align-items:center; justify-content:center; gap:10px;">
      <svg class="ic" style="width:32px; height:32px; stroke-width:1.6;" aria-hidden="true"><use href="#i-diamond"></use></svg>
      <span class="grad-text" style="font-size:34px; font-weight:900; letter-spacing:1px;">Orion Cloud</span>
    </div>
    <h1>\u7BA1\u7406\u53F0</h1>
    <p>\u8F93\u5165\u7BA1\u7406\u4EE4\u724C\uFF08ADMIN_TOKEN\uFF09\u8FDB\u5165</p>
    <input id="tk" type="password" placeholder="ADMIN_TOKEN" autocomplete="current-password">
    <button class="btn" onclick="doLogin()">\u8FDB \u5165</button>
    <div id="loginErr" class="dim" style="margin-top:12px; font-size:13px; min-height:18px; color:var(--danger-ink);"></div>
  </div>
</div>

<!-- \u5DE6\u4FA7\u62BD\u5C49(\u529F\u80FD\u5206\u7C7B\u5BFC\u822A) -->
<div id="mask" onclick="toggleDrawer()"></div>
<aside id="drawer">
  <div class="brand"><svg class="ic" style="width:20px; height:20px;" aria-hidden="true"><use href="#i-diamond"></use></svg> Orion Cloud</div>

  <div class="grp">\u6982 \u89C8</div>
  <button class="nav-item active" data-v="dash" onclick="show('dash')"><svg class="ic" aria-hidden="true"><use href="#i-home"></use></svg> \u9996\u9875</button>

  <div class="grp">\u6388\u6743\u7BA1\u7406</div>
  <button class="nav-item" data-v="grant" onclick="show('grant')"><svg class="ic" aria-hidden="true"><use href="#i-key"></use></svg> \u8D26\u53F7\u6388\u6743</button>
  <button class="nav-item" data-v="ann" onclick="show('ann')"><svg class="ic" aria-hidden="true"><use href="#i-mega"></use></svg> \u516C\u544A\u7BA1\u7406</button>

  <div class="grp">AI \u6A21\u578B</div>
  <button class="nav-item" data-v="prov" onclick="show('prov')"><svg class="ic" aria-hidden="true"><use href="#i-diamond"></use></svg> \u4F9B\u5E94\u5546\u914D\u7F6E</button>
  <button class="nav-item" data-v="inst" onclick="show('inst')"><svg class="ic" aria-hidden="true"><use href="#i-diamond"></use></svg> Agent \u5B9E\u4F8B\u6388\u6743</button>

  <div class="grp">\u7528\u6237\u7BA1\u7406</div>
  <button class="nav-item" data-v="usr" onclick="show('usr')"><svg class="ic" aria-hidden="true"><use href="#i-users"></use></svg> \u7528\u6237\u5217\u8868</button>

  <div class="grp">\u8FD0\u8425\u76D1\u63A7</div>
  <button class="nav-item" data-v="usage" onclick="show('usage')"><svg class="ic" aria-hidden="true"><use href="#i-chart"></use></svg> \u7528\u91CF\u7EDF\u8BA1</button>
  <button class="nav-item" data-v="audit" onclick="show('audit')"><svg class="ic" aria-hidden="true"><use href="#i-shield"></use></svg> \u5BA1\u8BA1\u65E5\u5FD7</button>

  <div class="foot">
    <button class="btn ghost" onclick="toggleTheme()" title="\u7EAF\u767D / \u6DF1\u8272 \u5207\u6362">
      <svg class="ic ic-sun" style="width:15px; height:15px;" aria-hidden="true"><use href="#i-sun"></use></svg>
      <svg class="ic ic-moon" style="width:15px; height:15px;" aria-hidden="true"><use href="#i-moon"></use></svg>
      \u5916\u89C2
    </button>
    <button class="btn ghost" onclick="doLogout()">\u9000\u51FA</button>
  </div>
</aside>

<!-- \u4E3B\u754C\u9762 -->
<div id="app">
 <div class="inner">
  <header class="top">
    <button class="btn ghost icon" onclick="toggleDrawer()" title="\u5C55\u5F00/\u6536\u8D77\u5BFC\u822A" aria-label="\u5C55\u5F00/\u6536\u8D77\u5BFC\u822A"><svg class="ic" style="width:17px; height:17px;" aria-hidden="true"><use href="#i-menu"></use></svg></button>
    <h1 id="pageTitle">\u9996\u9875</h1>
    <div class="spacer"></div>
    <button class="btn ghost icon" id="themeBtn" onclick="toggleTheme()" title="\u7EAF\u767D / \u6DF1\u8272 \u5207\u6362" aria-label="\u5207\u6362\u7EAF\u767D\u6216\u6DF1\u8272\u4E3B\u9898">
      <svg class="ic ic-sun" style="width:17px; height:17px;" aria-hidden="true"><use href="#i-sun"></use></svg>
      <svg class="ic ic-moon" style="width:17px; height:17px;" aria-hidden="true"><use href="#i-moon"></use></svg>
    </button>
  </header>

  <section id="v-dash" class="view active">
    <div class="grid cards">
      <div class="stat glass"><div class="lbl">\u6CE8\u518C\u7528\u6237</div><div class="num grad-text" id="sUsers">-</div></div>
      <div class="stat glass"><div class="lbl">\u6D3B\u8DC3(\u672A\u5C01\u7981)</div><div class="num grad-text" id="sActive">-</div></div>
      <div class="stat glass"><div class="lbl">\u4ED8\u8D39\u8D26\u53F7</div><div class="num grad-text" id="sPro">-</div></div>
      <div class="stat glass"><div class="lbl">\u8BD5\u7528\u8D26\u53F7</div><div class="num grad-text" id="sTrial">-</div></div>
      <div class="stat glass"><div class="lbl">\u4ECA\u65E5\u4E2D\u7EE7\u8BF7\u6C42</div><div class="num grad-text" id="sUsage">-</div></div>
    </div>
    <div class="panel glass">
      <h2><svg class="ic" aria-hidden="true"><use href="#i-pin"></use></svg> \u6982\u89C8</h2>
      <div class="dim note" id="dashNote">\u52A0\u8F7D\u4E2D...</div>
    </div>
  </section>

  <section id="v-grant" class="view">
    <div class="panel glass">
      <h2><svg class="ic" aria-hidden="true"><use href="#i-key"></use></svg> \u8D26\u53F7\u6388\u6743 <button class="btn ghost" onclick="loadGrant()">\u5237\u65B0</button></h2>
      <div class="dim note">
        \u76F4\u63A5\u4E3A\u8D26\u53F7\u8BBE\u7F6E\u5957\u9910\uFF08\u5361\u5BC6\u5DF2\u4E0B\u7EBF\uFF09\u3002\u6A21\u5F0F\uFF1A<b>\u8BBE\u7F6E</b> = \u4ECE\u73B0\u5728\u8D77\u7B97\uFF1B<b>\u987A\u5EF6</b> = \u5728\u73B0\u6709\u5230\u671F\u65F6\u95F4\u4E0A\u53E0\u52A0\uFF08\u66F4\u9AD8\u5957\u9910\u672A\u8FC7\u671F\u65F6\u4FDD\u7559\u9AD8\u5957\u9910\u4EC5\u987A\u5EF6\uFF09\u3002
        free = \u64A4\u9500\u6388\u6743\u3002
      </div>
      <div class="scroll-x"><table id="grantTable"></table></div>
    </div>
  </section>

  <section id="v-usr" class="view">
    <div class="panel glass">
      <h2><svg class="ic" aria-hidden="true"><use href="#i-users"></use></svg> \u7528\u6237\u5217\u8868 <button class="btn ghost" onclick="loadUsers()">\u5237\u65B0</button></h2>
      <div class="scroll-x"><table id="usrTable"></table></div>
    </div>
  </section>

  <section id="v-usage" class="view">
    <div class="panel glass">
      <h2><svg class="ic" aria-hidden="true"><use href="#i-chart"></use></svg> \u7528\u91CF\u7EDF\u8BA1 <span class="dim" style="font-size:12px; font-weight:400;">(\u6BCF\u65E5, UTC+8)</span></h2>
      <div class="scroll-x"><table id="usageTable"></table></div>
    </div>
  </section>

  <section id="v-audit" class="view">
    <div class="panel glass">
      <h2><svg class="ic" aria-hidden="true"><use href="#i-shield"></use></svg> \u5BA1\u8BA1\u65E5\u5FD7 <button class="btn ghost" onclick="loadAudit()">\u5237\u65B0</button></h2>
      <div class="scroll-x"><table id="auditTable"></table></div>
    </div>
  </section>

  <section id="v-ann" class="view">
    <div class="panel glass">
      <h2><svg class="ic" aria-hidden="true"><use href="#i-mega"></use></svg> \u53D1\u5E03/\u7F16\u8F91\u516C\u544A</h2>
      <div class="row"><input id="annTitle" placeholder="\u516C\u544A\u6807\u9898"></div>
      <div class="row"><textarea id="annContent" rows="5" placeholder="\u516C\u544A\u6B63\u6587\uFF08App \u5185\u5F39\u7A97\u5C55\u793A\uFF09" style="width:100%; min-width:220px;"></textarea></div>
      <div class="row">
        <span class="dim">\u7248\u672C\u8303\u56F4\uFF08\u7559\u7A7A = \u5168\u90E8\u7248\u672C\uFF09\uFF1A</span>
        <input id="annMin" placeholder="\u6700\u4F4E\u7248\u672C \u5982 0.2.33">
        <input id="annMax" placeholder="\u6700\u9AD8\u7248\u672C \u5982 0.2.40">
        <label><input type="checkbox" id="annEnabled" checked> \u542F\u7528</label>
      </div>
      <div class="row">
        <button class="btn" onclick="saveAnnouncement()">\u53D1\u5E03</button>
        <button class="btn ghost" onclick="resetAnnForm()">\u6E05\u7A7A\u8868\u5355</button>
        <span class="dim" id="annEditing" style="font-size:12px;"></span>
      </div>
    </div>
    <div class="panel glass">
      <h2><svg class="ic" aria-hidden="true"><use href="#i-list"></use></svg> \u516C\u544A\u5217\u8868 <button class="btn ghost" onclick="loadAnnouncements()">\u5237\u65B0</button></h2>
      <div class="scroll-x"><table id="annTable"></table></div>
    </div>
  </section>

  <section id="v-prov" class="view">
    <div class="panel glass">
      <h2><svg class="ic" aria-hidden="true"><use href="#i-diamond"></use></svg> \u65B0\u5EFA/\u7F16\u8F91 AI \u6A21\u578B\u4F9B\u5E94\u5546</h2>
      <div class="row">
        <input id="pvName" placeholder="\u5C55\u793A\u540D\uFF0C\u5982 \u5B98\u65B9\u4E2D\u8F6C" style="flex:1; min-width:180px;">
        <input id="pvBase" placeholder="\u4E0A\u6E38\u6839\u5730\u5740\uFF0C\u5982 https://api.example.com/v1" style="flex:2; min-width:260px;">
      </div>
      <div class="row">
        <input id="pvKey" type="password" placeholder="API Key\uFF08\u7F16\u8F91\u65F6\u7559\u7A7A = \u4E0D\u6539\u52A8\u5DF2\u6709 Key\uFF09" style="flex:1; min-width:220px;">
        <input id="pvSort" type="number" placeholder="\u6392\u5E8F\uFF08\u5C0F\u7684\u4F18\u5148\uFF09" style="width:150px;" value="0">
      </div>
      <div class="row">
        <textarea id="pvModels" rows="4" placeholder='\u6A21\u578B\u5217\u8868(JSON \u6570\u7EC4)\uFF0C\u5982 [{"name":"gpt-4o-mini","label":"GPT-4o mini","contextWindow":128000}]' style="width:100%; min-width:220px;"></textarea>
      </div>
      <div class="row">
        <button class="btn" onclick="saveProvider()">\u4FDD\u5B58</button>
        <button class="btn ghost" onclick="resetProviderForm()">\u6E05\u7A7A\u8868\u5355</button>
        <label><input type="checkbox" id="pvEnabled" checked> \u542F\u7528\uFF08\u505C\u7528\u540E App \u7AEF\u4E0D\u518D\u663E\u793A\u4E91\u7AEF\u6A21\u578B\uFF09</label>
        <span class="dim" id="pvEditing" style="font-size:12px;"></span>
      </div>
      <p class="dim note">
        API Key \u7528 JWT_SECRET \u6D3E\u751F\u5BC6\u94A5\u52A0\u5BC6\u540E\u5B58\u5E93\uFF0C\u6C38\u4E0D\u56DE\u4F20\u7ED9 App\uFF1B\u66F4\u6362 JWT_SECRET \u4F1A\u5BFC\u81F4\u5DF2\u5B58 Key \u65E0\u6CD5\u89E3\u5BC6\uFF0C\u9700\u91CD\u65B0\u5F55\u5165\u3002<br>
        \u8BA1\u8D39\u53E3\u5F84\uFF1A\u4E00\u8F6E\u5BF9\u8BDD = \u4E00\u6B21\u8BF7\u6C42\uFF08\u65E0\u8BBA\u8BE5\u8F6E\u5DE5\u5177\u8C03\u7528\u591A\u5C11\u6B21\uFF09\uFF0C\u6D88\u8017 1 \u70B9\u5468\u989D\u5EA6\u3002\u989D\u5EA6\u6BCF\u5468\u4E00 00:00\uFF08UTC+8\uFF09\u81EA\u52A8\u5F52\u96F6\u3002
      </p>
    </div>
    <div class="panel glass">
      <h2><svg class="ic" aria-hidden="true"><use href="#i-list"></use></svg> \u5DF2\u914D\u7F6E\u4F9B\u5E94\u5546 <button class="btn ghost" onclick="loadProviders()">\u5237\u65B0</button></h2>
      <div class="scroll-x"><table id="pvTable"></table></div>
    </div>
    <div class="panel glass">
      <h2><svg class="ic" aria-hidden="true"><use href="#i-chart"></use></svg> \u672C\u5468\u4E91\u7AEF\u989D\u5EA6\u7528\u91CF <button class="btn ghost" onclick="loadWeeklyUsage()">\u5237\u65B0</button></h2>
      <div class="scroll-x"><table id="pvUsageTable"></table></div>
    </div>
  </section>

  <section id="v-inst" class="view">
    <div class="panel glass">
      <h2><svg class="ic" aria-hidden="true"><use href="#i-diamond"></use></svg> \u5F00\u901A/\u7F16\u8F91\u7528\u6237 Agent \u5B9E\u4F8B</h2>
      <div class="row">
        <input id="aiUserId" placeholder="\u7528\u6237 ID\uFF08\u7BA1\u7406\u53F0\u7528\u6237\u5217\u8868\u53EF\u590D\u5236\uFF0C\u5982 u_xxxx\uFF09" style="flex:2; min-width:260px;">
        <input id="aiLabel" placeholder="App \u5185\u663E\u793A\u540D\uFF08\u9ED8\u8BA4\u300C\u4E91\u7AEF Agent\u300D\uFF09" style="flex:1; min-width:180px;">
      </div>
      <div class="row">
        <input id="aiBaseUrl" placeholder="\u5B9E\u4F8B\u5730\u5740\uFF0C\u5982 https://my-forge.example.com\uFF08\u4E0D\u542B /api\uFF09" style="flex:2; min-width:260px;">
      </div>
      <div class="row">
        <input id="aiApiKey" type="password" placeholder="API Key\uFF08\u8BE5\u5B9E\u4F8B\u7684 AGENT_API_KEY\uFF1B\u7F16\u8F91\u65F6\u7559\u7A7A = \u4E0D\u6539\u52A8\uFF09" style="flex:1; min-width:260px;">
        <label><input type="checkbox" id="aiEnabled" checked> \u542F\u7528\uFF08\u505C\u7528\u540E\u8BE5\u7528\u6237 App \u5185\u5165\u53E3\u6D88\u5931\uFF09</label>
      </div>
      <div class="row">
        <button class="btn" onclick="saveAgentInstance()">\u4FDD\u5B58\u6388\u6743</button>
        <button class="btn ghost" onclick="clearAgentInstanceForm()">\u6E05\u7A7A\u8868\u5355</button>
      </div>
      <p class="dim note">
        \u7528\u6237\u81EA\u884C\u90E8\u7F72 orion-forge \u540E\uFF0C\u628A\u5B83\u7684\u5730\u5740\u4E0E AGENT_API_KEY \u586B\u5728\u8FD9\u91CC\u5373\u53EF\u5F00\u901A\u3002<br>
        App \u7AEF<b>\u4E0D\u63D0\u4F9B\u4EFB\u4F55\u586B\u5199\u5165\u53E3</b>\uFF0C\u4E5F\u770B\u4E0D\u5230\u8FD9\u4E2A\u5730\u5740\u4E0E\u5BC6\u94A5\u2014\u2014\u53EA\u77E5\u9053\u81EA\u5DF1\u6709\u300C\u4E91\u7AEF Agent\u300D\u53EF\u7528\u3002\u672A\u5F00\u901A\u7684\u7528\u6237\u4E0D\u663E\u793A\u4EFB\u4F55\u5165\u53E3\u3002
      </p>
    </div>
    <div class="panel glass">
      <h2><svg class="ic" aria-hidden="true"><use href="#i-list"></use></svg> \u5DF2\u6388\u6743\u5B9E\u4F8B <button class="btn ghost" onclick="loadAgentInstances()">\u5237\u65B0</button></h2>
      <div class="scroll-x"><table id="aiTable"></table></div>
    </div>
  </section>
 </div>
</div>
<div id="toast"></div>

<!-- \u7834\u574F\u6027\u64CD\u4F5C\u4E8C\u6B21\u786E\u8BA4\uFF08\u5220\u9664\u7528\u6237\u7B49\uFF09\u3002\u5185\u5BB9\u7531 confirmDeleteUser \u586B\u3002 -->
<div id="confirm">
  <div class="box glass">
    <h3><svg class="ic" aria-hidden="true" style="width:19px;height:19px;vertical-align:-4px;"><use href="#i-shield"></use></svg><span id="cfTitle">\u786E\u8BA4\u5220\u9664</span></h3>
    <p id="cfDesc"></p>
    <div class="impact" id="cfImpact"></div>
    <div class="acts">
      <button class="btn ghost" id="cfCancel">\u53D6\u6D88</button>
      <button class="btn danger" id="cfOk">\u786E\u8BA4\u5220\u9664</button>
    </div>
  </div>
</div>

<script>
// EdgeOne \u90E8\u7F72\u65F6\u51FD\u6570\u6302\u5728 /api/* \u4E0B(\u524D\u7F00 /api); \u672C\u5730 dev \u76F4\u63A5\u662F\u6839\u8DEF\u5F84\u3002
var APIBASE = (location.pathname.indexOf('/api') === 0 ? '/api' : '') + '/admin';
var TOKEN = localStorage.getItem('orion_admin_token') || '';
var VIEW_META = { dash:'\u9996\u9875', grant:'\u8D26\u53F7\u6388\u6743', ann:'\u516C\u544A\u7BA1\u7406', prov:'\u4F9B\u5E94\u5546\u914D\u7F6E', inst:'Agent \u5B9E\u4F8B\u6388\u6743', usr:'\u7528\u6237\u5217\u8868', usage:'\u7528\u91CF\u7EDF\u8BA1', audit:'\u5BA1\u8BA1\u65E5\u5FD7' };
// \u62BD\u5C49\u6D6E\u51FA\u65AD\u70B9, \u5FC5\u987B\u4E0E CSS @media (max-width:900px) \u4FDD\u6301\u4E00\u81F4
var MOBILE_W = 900;

/**
 * \u7EDF\u4E00\u7684\u63A5\u53E3\u8C03\u7528\u3002
 *
 * \u26A0\uFE0F \u8D85\u65F6\u4FDD\u62A4\uFF082026-10-11 \u7BA1\u7406\u53F0\u300C\u5220\u9664\u5361\u6B7B\u300D\u4FEE\u590D\uFF09\uFF1A
 * \u7BA1\u7406\u53F0\u6240\u6709\u8BF7\u6C42\u4E0E App \u7684\u4E91\u7AEF Agent \u957F\u6D41\u5171\u7528\u540C\u4E00\u4E2A\u4E91\u51FD\u6570\uFF0C\u7E41\u5FD9\u65F6\u8BF7\u6C42\u4F1A
 * \u6392\u961F\uFF1B\u800C fetch \u9ED8\u8BA4**\u6C38\u4E0D\u8D85\u65F6** \u2014\u2014 \u8BF7\u6C42\u4E00\u6302\u8D77\uFF0C\u754C\u9762\u5C31\u6C38\u8FDC\u505C\u5728\u4E0A\u4E00\u4E2A
 * \u72B6\u6001\uFF08\u6309\u94AE\u7981\u7528\u3001toast \u4E0D\u6D88\u5931\u3001\u5217\u8868\u7A7A\u767D\uFF09\uFF0C\u7528\u6237\u53EA\u80FD\u5F3A\u5236\u5237\u65B0\u3002\u8FD9\u91CC\u7ED9\u6BCF\u4E2A
 * \u8BF7\u6C42\u5957\u4E0A AbortController\uFF0C\u8D85\u65F6\u540E\u629B\u51FA\u53EF\u8BFB\u9519\u8BEF\uFF0C\u754C\u9762\u603B\u80FD\u6062\u590D\u53EF\u64CD\u4F5C\u3002
 *
 * @param opts.timeout \u8D85\u65F6\u6BEB\u79D2\u6570\uFF0C\u9ED8\u8BA4 20s\uFF1B\u5220\u9664\u7B49\u91CD\u64CD\u4F5C\u53EF\u4F20\u66F4\u957F\u3002
 */
function api(path, opts) {
  opts = opts || {};
  var timeout = opts.timeout || 20000;
  opts.headers = Object.assign({'Authorization': 'Bearer ' + TOKEN}, opts.headers || {});
  if (opts.body && typeof opts.body !== 'string') { opts.body = JSON.stringify(opts.body); opts.headers['Content-Type'] = 'application/json'; }

  var ctrl = (typeof AbortController !== 'undefined') ? new AbortController() : null;
  var timer = null;
  if (ctrl) {
    opts.signal = ctrl.signal;
    timer = setTimeout(function() { try { ctrl.abort(); } catch (e) {} }, timeout);
  }
  var clear = function() { if (timer) { clearTimeout(timer); timer = null; } };

  return fetch(APIBASE + path, opts).then(function(r) {
    clear();
    if (r.status === 401) { doLogout(true); throw new Error('\u4EE4\u724C\u65E0\u6548'); }
    return r.json();
  }, function(e) { clear(); throw e; }).catch(function(e) {
    clear();
    if (e && e.name === 'AbortError') {
      throw new Error('\u8BF7\u6C42\u8D85\u65F6\uFF08' + Math.round(timeout / 1000) + ' \u79D2\u65E0\u54CD\u5E94\uFF09\uFF0C\u8BF7\u91CD\u8BD5');
    }
    throw e;
  });
}

/**
 * \u5E26\u8D85\u65F6\u7684 fetch \u4FE1\u53F7\uFF08\u4F9B\u767B\u5F55\u6821\u9A8C\u7B49\u4E0D\u8D70 api() \u7684\u8BF7\u6C42\u4F7F\u7528\uFF09\u3002
 *
 * \u9875\u9762\u521D\u59CB\u5316\u90A3\u6B21 fetch('/users') \u6B64\u524D\u662F\u88F8 fetch \u2014\u2014 \u8BF7\u6C42\u4E00\u6302\u8D77\u5C31\u65E2\u4E0D
 * \u8FDB\u5165\u5E94\u7528\u4E5F\u4E0D\u63D0\u793A\u9519\u8BEF\uFF0C\u7BA1\u7406\u5458\u5F3A\u5236\u5237\u65B0\u540E\u53EA\u80FD\u505C\u5728\u767B\u5F55\u9875\u5E72\u7B49\uFF0C\u6B63\u662F
 * \u300C\u5237\u65B0\u540E\u7528\u6237\u9875\u9762\u51FA\u4E0D\u6765\u300D\u7684\u6210\u56E0\u3002\u8FD9\u91CC\u8BA9\u5B83\u6700\u591A\u7B49 ms \u6BEB\u79D2\u3002
 */
function timeoutSignal(ms) {
  if (typeof AbortController === 'undefined') {
    return { signal: undefined, clear: function () {} };
  }
  var ctrl = new AbortController();
  var timer = setTimeout(function () { try { ctrl.abort(); } catch (e) {} }, ms);
  return { signal: ctrl.signal, clear: function () { clearTimeout(timer); } };
}

/**
 * \u8868\u683C\u52A0\u8F7D\u6001\u5360\u4F4D\u3002
 *
 * \u4E4B\u524D\u5217\u8868\u5728\u8BF7\u6C42\u671F\u95F4\u4FDD\u6301\u4E0A\u4E00\u6B21\u7684\u5185\u5BB9\uFF08\u9996\u6B21\u8FDB\u5165\u5219\u662F\u7A7A\u767D\uFF09\uFF0C\u7BA1\u7406\u5458\u70B9\u300C\u5237\u65B0\u300D
 * \u6216\u5220\u9664\u540E\u770B\u4E0D\u51FA\u5230\u5E95\u5728\u4E0D\u5728\u52A0\u8F7D\uFF0C\u5BB9\u6613\u5224\u5B9A\u4E3A\u5361\u6B7B\u3002\u73B0\u5728\u5148\u843D\u4E00\u884C\u660E\u786E\u7684
 * \u300C\u52A0\u8F7D\u4E2D\u2026\u300D\uFF0C\u8BF7\u6C42\u65E0\u8BBA\u6210\u529F\u5931\u8D25\u90FD\u4F1A\u8986\u76D6\u5B83\u3002
 */
function renderLoading(id, cols) {
  var el = document.getElementById(id);
  if (el) el.innerHTML = '<tr><td colspan="' + cols + '" class="empty">\u52A0\u8F7D\u4E2D\u2026</td></tr>';
}
function toast(msg) {
  var t = document.getElementById('toast');
  t.textContent = msg; t.classList.add('show');
  setTimeout(function(){ t.classList.remove('show'); }, 2200);
}
function esc(s) { var d = document.createElement('div'); d.textContent = s == null ? '' : String(s); return d.innerHTML; }
function fmtTime(ms) { if (!ms) return '\u2014'; var d = new Date(Number(ms)); return d.toLocaleString('zh-CN', {hour12:false}); }

/**
 * \u6E32\u67D3\u8868\u683C\u5E76\u6309\u8868\u5934\u7ED9\u6BCF\u4E2A td \u6253\u4E0A data-label\u3002
 * \u79FB\u52A8\u7AEF(\u2264760px)\u8868\u683C\u8F6C\u5361\u7247\u540E, \u5355\u5143\u683C\u9760 data-label \u663E\u793A\u5217\u540D;
 * \u684C\u9762\u7AEF\u4E0D\u53D7\u5F71\u54CD(\u6807\u7B7E\u53EA\u5728\u5A92\u4F53\u67E5\u8BE2\u91CC\u51FA\u73B0)\u3002
 * colspan \u7684\u7A7A\u6001\u884C\u3001\u7A7A\u8868\u5934\u5217\u4E0D\u6253\u6807\u7B7E\u3002
 */
function renderTable(id, html) {
  var el = document.getElementById(id);
  el.innerHTML = html;
  var trs = el.querySelectorAll('tr');
  if (!trs.length) return;
  var heads = trs[0].querySelectorAll('th');
  if (!heads.length) return;
  // \u8868\u5934\u884C\u6CA1\u6709\u7528 thead \u5305\u88F9, \u53EA\u662F\u4E00\u6761\u666E\u901A\u9996\u884C; \u79FB\u52A8\u7AEF\u5361\u7247\u5316\u65F6
  // \u53EA\u628A thead \u8BBE\u4E3A display:none \u85CF\u4E0D\u6389\u5B83, \u8FD9\u91CC\u6253\u6807\u8BB0\u4EA4\u7ED9 CSS \u5904\u7406\u3002
  trs[0].classList.add('hrow');
  var labels = [];
  for (var i = 0; i < heads.length; i++) labels.push(heads[i].textContent.trim());
  for (var r = 1; r < trs.length; r++) {
    var tds = trs[r].querySelectorAll('td');
    for (var c = 0; c < tds.length && c < labels.length; c++) {
      if (!labels[c] || tds[c].getAttribute('colspan')) continue;
      tds[c].setAttribute('data-label', labels[c]);
    }
  }
}

// ---------- \u4E3B\u9898: \u53EA\u6709\u7EAF\u767D / \u6DF1\u8272\u4E24\u5957 ----------
function setTheme(t) {
  var v = t === 'dark' ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', v);
  localStorage.setItem('orion_admin_theme', v);
  var meta = document.querySelector('meta[name="theme-color"]');
  if (meta && meta.setAttribute) meta.setAttribute('content', v === 'dark' ? '#05070c' : '#ffffff');
}
function toggleTheme() {
  var isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  setTheme(isDark ? 'light' : 'dark');
  toast(isDark ? '\u5DF2\u5207\u6362\u5230\u7EAF\u767D\u6A21\u5F0F' : '\u5DF2\u5207\u6362\u5230\u6DF1\u8272\u6A21\u5F0F');
}
function currentTheme() {
  var t = document.documentElement.getAttribute('data-theme');
  return t === 'dark' ? 'dark' : 'light';
}

// ---------- \u62BD\u5C49: \u684C\u9762\u6298\u53E0 / \u79FB\u52A8\u7AEF\u6D6E\u51FA ----------
function toggleDrawer() {
  if (window.innerWidth <= MOBILE_W) document.body.classList.toggle('drawer-open');
  else document.body.classList.toggle('collapsed');
}
function closeDrawerIfMobile() {
  if (window.innerWidth <= MOBILE_W) document.body.classList.remove('drawer-open');
}

// ---------- \u767B\u5F55 ----------
function doLogin() {
  var v = document.getElementById('tk').value.trim();
  if (!v) return;
  TOKEN = v;
  var err = document.getElementById('loginErr');
  err.textContent = '\u9A8C\u8BC1\u4E2D\u2026';
  var ts = timeoutSignal(15000);
  fetch(APIBASE + '/users', {headers: {'Authorization': 'Bearer ' + TOKEN}, signal: ts.signal})
    .then(function(r) {
      ts.clear();
      if (r.status === 401) { err.textContent = '\u4EE4\u724C\u65E0\u6548'; return null; }
      if (!r.ok) { err.textContent = '\u670D\u52A1\u5F02\u5E38 (' + r.status + ')'; return null; }
      err.textContent = '';
      localStorage.setItem('orion_admin_token', TOKEN);
      enterApp(); return null;
    })
    .catch(function(e) {
      ts.clear();
      err.textContent = (e && e.name === 'AbortError') ? '\u8FDE\u63A5\u8D85\u65F6\uFF0C\u8BF7\u91CD\u8BD5' : '\u7F51\u7EDC\u9519\u8BEF';
    });
}
function doLogout(silent) {
  TOKEN = ''; localStorage.removeItem('orion_admin_token');
  document.body.classList.remove('authed', 'drawer-open');
  document.getElementById('app').style.display = 'none';
  document.getElementById('login').style.display = 'flex';
  if (silent !== true) toast('\u5DF2\u9000\u51FA');
}

// ---------- \u89C6\u56FE\u5207\u6362 ----------
function show(v) {
  var items = document.querySelectorAll('.nav-item');
  for (var i = 0; i < items.length; i++) items[i].classList.toggle('active', items[i].getAttribute('data-v') === v);
  var views = document.querySelectorAll('section.view');
  for (var j = 0; j < views.length; j++) views[j].classList.toggle('active', views[j].id === 'v-' + v);
  document.getElementById('pageTitle').textContent = VIEW_META[v] || '';
  closeDrawerIfMobile();
  if (v === 'dash') loadDashboard();
  if (v === 'grant') loadGrant();
  if (v === 'ann') loadAnnouncements();
  if (v === 'prov') { loadProviders(); loadWeeklyUsage(); }
  if (v === 'inst') loadAgentInstances();
  if (v === 'usr') loadUsers();
  if (v === 'usage') loadUsage();
  if (v === 'audit') loadAudit();
}
function enterApp() {
  document.body.classList.add('authed');
  document.getElementById('login').style.display = 'none';
  document.getElementById('app').style.display = 'block';
  show('dash');
}

// ---------- \u9996\u9875 ----------
function loadDashboard() {
  Promise.all([api('/users'), api('/usage')]).then(function(rs) {
    var users = rs[0].users || [], usage = rs[1].usage || [];
    var banned = 0;
    for (var j = 0; j < users.length; j++) if (users[j].status === 'banned') banned++;
    var today = new Date(Date.now() + 8*3600*1000).toISOString().slice(0,10);
    var totalReq = 0;
    for (var k = 0; k < usage.length; k++) if (usage[k].date === today) totalReq += Number(usage[k].count) || 0;
    var pro = 0, trial = 0;
    for (var m = 0; m < users.length; m++) {
      if (users[m].plan === 'pro' || users[m].plan === 'lifetime') pro++;
      if (users[m].plan === 'trial') trial++;
    }
    document.getElementById('sUsers').textContent = users.length;
    document.getElementById('sActive').textContent = users.length - banned;
    document.getElementById('sPro').textContent = pro;
    document.getElementById('sTrial').textContent = trial;
    document.getElementById('sUsage').textContent = totalReq;
    document.getElementById('dashNote').innerHTML =
      '\u5171 <b>' + users.length + '</b> \u4F4D\u7528\u6237\uFF1A\u4ED8\u8D39 ' + pro + ' \xB7 \u8BD5\u7528 ' + trial + ' \xB7 \u5C01\u7981 ' + banned +
      '<br>\u6388\u6743\u65B9\u5F0F\uFF1A\u7BA1\u7406\u53F0\u76F4\u63A5\u4E3A\u8D26\u53F7\u8BBE\u7F6E\u5957\u9910\uFF08\u5361\u5BC6\u5DF2\u4E0B\u7EBF\uFF09<br>\u4ECA\u65E5\u4E2D\u7EE7\u8BF7\u6C42\uFF1A' + totalReq + ' \u6B21\uFF08UTC+8 ' + today + '\uFF09';
  }).catch(function(e) { if (TOKEN) toast('\u52A0\u8F7D\u5931\u8D25: ' + e.message); });
}

// ---------- \u8D26\u53F7\u6388\u6743 ----------
function loadGrant() {
  api('/users').then(function(r) {
    var rows = r.users || [];
    var html = '<tr><th>\u90AE\u7BB1</th><th>\u5F53\u524D\u5957\u9910</th><th>\u5230\u671F</th><th>\u6388\u6743\u64CD\u4F5C</th><th></th></tr>';
    if (!rows.length) html += '<tr><td colspan="5" class="empty">\u65E0\u7528\u6237</td></tr>';
    for (var i = 0; i < rows.length; i++) {
      var u = rows[i];
      var uid = esc(u.id);
      var exp = u.plan_expires_at ? new Date(Number(u.plan_expires_at)).toLocaleString('zh-CN', {hour12:false}) : (u.plan === 'lifetime' ? '\u6C38\u4E45' : '\u2014');
      html += '<tr><td>' + esc(u.email) + '</td>'
        + '<td><span class="badge used">' + esc(u.plan) + '</span></td><td class="dim">' + exp + '</td>'
        + '<td><div style="display:flex; gap:6px; flex-wrap:wrap; align-items:center;">'
        + '<select id="gp-' + uid + '" style="width:110px; padding:6px 8px; font-size:13px;">'
        + '<option value="free">free \u64A4\u9500</option><option value="trial">trial \u8BD5\u7528</option><option value="pro">pro \u4E13\u4E1A</option><option value="lifetime">lifetime \u6C38\u4E45</option></select>'
        + '<input id="gd-' + uid + '" type="number" value="30" min="1" style="width:74px; padding:6px 8px; font-size:13px;" title="\u5929\u6570">'
        + '<select id="gm-' + uid + '" style="width:88px; padding:6px 8px; font-size:13px;">'
        + '<option value="set">\u8BBE\u7F6E</option><option value="extend">\u987A\u5EF6</option></select>'
        + '<button class="btn" style="padding:6px 14px; font-size:12px;" onclick="setPlan(\\'' + uid + '\\')">\u5E94\u7528</button>'
        + '</div></td>'
        + '<td><button class="btn ' + (u.status === 'banned' ? '' : 'danger') + '" style="padding:4px 12px; font-size:12px;" onclick="setBan(\\'' + uid + '\\',' + (u.status === 'banned') + ')">' + (u.status === 'banned' ? '\u89E3\u5C01' : '\u5C01\u7981') + '</button></td></tr>';
    }
    renderTable('grantTable', html);
  }).catch(function(e) { if (TOKEN) toast('\u52A0\u8F7D\u5931\u8D25: ' + e.message); });
}
function setPlan(id) {
  var body = {
    plan: document.getElementById('gp-' + id).value,
    durationDays: Number(document.getElementById('gd-' + id).value) || 0,
    mode: document.getElementById('gm-' + id).value
  };
  api('/users/' + encodeURIComponent(id) + '/plan', {method:'POST', body: body}).then(function(r) {
    toast(r.message || '\u5DF2\u66F4\u65B0'); loadGrant();
  }).catch(function(e) { toast('\u6388\u6743\u5931\u8D25: ' + e.message); });
}

// ---------- \u7528\u6237 Agent \u5B9E\u4F8B\u6388\u6743\uFF08orion-forge\uFF09----------
function clearAgentInstanceForm() {
  document.getElementById('aiUserId').value = '';
  document.getElementById('aiLabel').value = '';
  document.getElementById('aiBaseUrl').value = '';
  document.getElementById('aiApiKey').value = '';
  document.getElementById('aiEnabled').checked = true;
}
function loadAgentInstances() {
  renderLoading('aiTable', 7);
  api('/agent-instances').then(function(r) {
    var rows = r.instances || [];
    var html = '<tr><th>\u7528\u6237</th><th>\u90AE\u7BB1</th><th>\u5B9E\u4F8B\u5730\u5740</th><th>\u663E\u793A\u540D</th><th>Key</th><th>\u72B6\u6001</th><th></th></tr>';
    if (!rows.length) html += '<tr><td colspan="7" class="empty">\u5C1A\u672A\u7ED9\u4EFB\u4F55\u7528\u6237\u5F00\u901A \u2014\u2014 App \u7AEF\u4E0D\u663E\u793A\u4EFB\u4F55\u5165\u53E3</td></tr>';
    for (var i = 0; i < rows.length; i++) {
      var a = rows[i];
      html += '<tr><td class="dim">' + esc(a.userId) + '</td>'
        + '<td>' + esc(a.email || '\u2014') + '</td>'
        + '<td class="dim" style="max-width:240px;">' + esc(a.baseUrl) + '</td>'
        + '<td>' + esc(a.label || '\u4E91\u7AEF Agent') + '</td>'
        + '<td class="dim">' + (a.keyConfigured ? '\u5DF2\u914D\u7F6E' : '\u2014') + '</td>'
        + '<td><span class="badge ' + (a.enabled ? 'unused' : 'revoked') + '">' + (a.enabled ? '\u5DF2\u5F00\u901A' : '\u5DF2\u505C\u7528') + '</span></td>'
        + '<td style="white-space:nowrap;">'
        + '<button class="btn ghost" style="padding:4px 10px; font-size:12px;" onclick="editAgentInstance(\\'' + esc(a.userId) + '\\')">\u7F16\u8F91</button> '
        + '<button class="btn danger" style="padding:4px 10px; font-size:12px;" onclick="deleteAgentInstance(\\'' + esc(a.userId) + '\\')">\u5220\u9664</button></td></tr>';
    }
    renderTable('aiTable', html);
  }).catch(function(e) { if (TOKEN) toast('\u52A0\u8F7D\u5931\u8D25: ' + e.message); });
}
function saveAgentInstance() {
  var body = {
    userId: document.getElementById('aiUserId').value.trim(),
    baseUrl: document.getElementById('aiBaseUrl').value.trim(),
    apiKey: document.getElementById('aiApiKey').value.trim(),
    label: document.getElementById('aiLabel').value.trim(),
    enabled: document.getElementById('aiEnabled').checked
  };
  if (!body.userId || !body.baseUrl) { toast('\u7528\u6237 ID \u4E0E\u5B9E\u4F8B\u5730\u5740\u4E0D\u80FD\u4E3A\u7A7A'); return; }
  // \u4E0D\u5728\u524D\u7AEF\u5224\u65AD Key \u662F\u5426\u5FC5\u586B\uFF1A\u65B0\u5EFA\u65F6\u540E\u7AEF\u4F1A\u62D2\uFF08"\u65B0\u5EFA\u5B9E\u4F8B\u5FC5\u987B\u586B\u5199 API Key"\uFF09\uFF0C
  // \u7F16\u8F91\u65F6\u7559\u7A7A\u8868\u793A\u4E0D\u6539\u3002\u524D\u7AEF\u786C\u5224\u53CD\u800C\u9700\u8981\u7F13\u5B58\u72B6\u6001\uFF0C\u5F92\u589E\u590D\u6742\u5EA6\u3002
  api('/agent-instances', {method:'POST', body: body}).then(function() {
    toast('\u5DF2\u4FDD\u5B58\u6388\u6743');
    clearAgentInstanceForm(); loadAgentInstances();
  }).catch(function(e) { toast('\u4FDD\u5B58\u5931\u8D25: ' + e.message); });
}
function editAgentInstance(userId) {
  api('/agent-instances').then(function(r) {
    var rows = r.instances || [];
    for (var i = 0; i < rows.length; i++) {
      if (rows[i].userId === userId) {
        document.getElementById('aiUserId').value = rows[i].userId;
        document.getElementById('aiBaseUrl').value = rows[i].baseUrl;
        document.getElementById('aiLabel').value = rows[i].label || '';
        document.getElementById('aiEnabled').checked = !!rows[i].enabled;
        // Key \u4E0D\u56DE\u663E\uFF0C\u7559\u7A7A\u5373\u4E0D\u6539
        document.getElementById('aiApiKey').value = '';
        window.scrollTo(0, 0);
        return;
      }
    }
  }).catch(function(e) { toast('\u52A0\u8F7D\u5931\u8D25: ' + e.message); });
}
function deleteAgentInstance(userId) {
  if (!window.confirm('\u786E\u8BA4\u5220\u9664\u8BE5\u7528\u6237\u7684 Agent \u6388\u6743\uFF1FApp \u5185\u7684\u5165\u53E3\u4F1A\u7ACB\u5373\u6D88\u5931\u3002')) return;
  // \u8D85\u65F6\u7ED9\u5230 30s\uFF1A\u4E91\u51FD\u6570\u7E41\u5FD9\u65F6\u8BF7\u6C42\u4F1A\u6392\u961F\uFF0C\u4F46\u4E0D\u80FD\u8BA9\u5B83\u65E0\u9650\u6302\u8D77\u3002
  api('/agent-instances/' + encodeURIComponent(userId), {method:'DELETE', timeout:30000}).then(function() {
    toast('\u5DF2\u5220\u9664\u6388\u6743');
    // \u5237\u65B0\u5931\u8D25\u4E5F\u8981\u6709\u53CD\u9988\uFF1A\u5217\u8868\u81EA\u8EAB\u7684 catch \u4F1A toast\uFF0C\u8FD9\u91CC\u4E0D\u518D\u4E8C\u6B21\u63D0\u793A\u3002
    loadAgentInstances();
  }).catch(function(e) { toast('\u5220\u9664\u5931\u8D25: ' + e.message); });
}

// ---------- AI \u6A21\u578B\u4F9B\u5E94\u5546 ----------
var editingProviderId = '';
function resetProviderForm() {
  editingProviderId = '';
  document.getElementById('pvName').value = '';
  document.getElementById('pvBase').value = '';
  document.getElementById('pvKey').value = '';
  document.getElementById('pvSort').value = '0';
  document.getElementById('pvModels').value = '';
  document.getElementById('pvEnabled').checked = true;
  document.getElementById('pvEditing').textContent = '';
}
function parseModelsInput(raw) {
  var s = (raw || '').trim();
  if (!s) return [];
  var parsed = JSON.parse(s);          // \u8BED\u6CD5\u9519\u4F1A\u629B, \u7531\u8C03\u7528\u65B9 catch
  if (!Array.isArray(parsed)) throw new Error('\u6A21\u578B\u5217\u8868\u5FC5\u987B\u662F JSON \u6570\u7EC4');
  for (var i = 0; i < parsed.length; i++) {
    if (!parsed[i] || !parsed[i].name) throw new Error('\u7B2C ' + (i + 1) + ' \u4E2A\u6A21\u578B\u7F3A\u5C11 name \u5B57\u6BB5');
  }
  return parsed;
}
function loadProviders() {
  api('/providers').then(function(r) {
    var rows = r.providers || [];
    var html = '<tr><th>\u540D\u79F0</th><th>\u4E0A\u6E38\u5730\u5740</th><th>\u6A21\u578B</th><th>Key</th><th>\u6392\u5E8F</th><th>\u72B6\u6001</th><th></th></tr>';
    if (!rows.length) html += '<tr><td colspan="7" class="empty">\u6682\u65E0\u4F9B\u5E94\u5546 \u2014\u2014 App \u7AEF\u4E0D\u4F1A\u663E\u793A\u4E91\u7AEF\u6A21\u578B</td></tr>';
    for (var i = 0; i < rows.length; i++) {
      var p = rows[i];
      var ms = p.models || [];
      var names = [];
      for (var j = 0; j < ms.length; j++) names.push(ms[j].label || ms[j].name);
      html += '<tr><td><b>' + esc(p.name) + '</b></td>'
        + '<td class="dim" style="max-width:280px;">' + esc(p.baseUrl) + '</td>'
        + '<td class="dim" style="max-width:260px;">' + esc(names.join(', ') || '\u2014') + '</td>'
        + '<td class="dim">' + esc(p.keyState || '\u5DF2\u914D\u7F6E') + '</td>'
        + '<td class="dim">' + esc(String(p.sort)) + '</td>'
        + '<td><span class="badge ' + (p.enabled ? 'unused' : 'revoked') + '">' + (p.enabled ? '\u542F\u7528\u4E2D' : '\u5DF2\u505C\u7528') + '</span></td>'
        + '<td style="white-space:nowrap;">'
        + '<button class="btn ghost" style="padding:4px 10px; font-size:12px;" onclick="editProvider(\\'' + esc(p.id) + '\\')">\u7F16\u8F91</button> '
        + '<button class="btn ghost" style="padding:4px 10px; font-size:12px;" onclick="toggleProvider(\\'' + esc(p.id) + '\\')">' + (p.enabled ? '\u505C\u7528' : '\u542F\u7528') + '</button> '
        + '<button class="btn danger" style="padding:4px 10px; font-size:12px;" onclick="deleteProvider(\\'' + esc(p.id) + '\\')">\u5220\u9664</button></td></tr>';
    }
    renderTable('pvTable', html);
  }).catch(function(e) { if (TOKEN) toast('\u52A0\u8F7D\u5931\u8D25: ' + e.message); });
}
function saveProvider() {
  var body = {
    name: document.getElementById('pvName').value.trim(),
    baseUrl: document.getElementById('pvBase').value.trim(),
    apiKey: document.getElementById('pvKey').value.trim(),
    sort: Number(document.getElementById('pvSort').value) || 0,
    enabled: document.getElementById('pvEnabled').checked
  };
  if (!body.name || !body.baseUrl) { toast('\u540D\u79F0\u4E0E\u4E0A\u6E38\u5730\u5740\u4E0D\u80FD\u4E3A\u7A7A'); return; }
  if (!editingProviderId && !body.apiKey) { toast('\u65B0\u5EFA\u65F6 API Key \u4E0D\u80FD\u4E3A\u7A7A'); return; }
  try {
    body.models = parseModelsInput(document.getElementById('pvModels').value);
  } catch (e) {
    toast('\u6A21\u578B\u5217\u8868\u683C\u5F0F\u9519\u8BEF: ' + e.message); return;
  }
  if (!body.models.length) { toast('\u81F3\u5C11\u914D\u7F6E\u4E00\u4E2A\u6A21\u578B'); return; }
  if (editingProviderId) body.id = editingProviderId;
  api('/providers', {method:'POST', body: body}).then(function() {
    toast(editingProviderId ? '\u4F9B\u5E94\u5546\u5DF2\u66F4\u65B0' : '\u4F9B\u5E94\u5546\u5DF2\u521B\u5EFA');
    resetProviderForm(); loadProviders();
  }).catch(function(e) { toast('\u4FDD\u5B58\u5931\u8D25: ' + e.message); });
}
function editProvider(id) {
  api('/providers').then(function(r) {
    var rows = r.providers || [];
    for (var i = 0; i < rows.length; i++) {
      if (rows[i].id === id) {
        editingProviderId = id;
        document.getElementById('pvName').value = rows[i].name;
        document.getElementById('pvBase').value = rows[i].baseUrl;
        // Key \u4E0D\u56DE\u663E, \u7559\u7A7A\u8868\u793A\u4E0D\u6539\u52A8
        document.getElementById('pvKey').value = '';
        document.getElementById('pvSort').value = String(rows[i].sort);
        document.getElementById('pvModels').value = JSON.stringify(rows[i].models || [], null, 2);
        document.getElementById('pvEnabled').checked = !!rows[i].enabled;
        document.getElementById('pvEditing').textContent = '\u6B63\u5728\u7F16\u8F91: ' + rows[i].name + '\uFF08Key \u7559\u7A7A\u5373\u4E0D\u6539\u52A8\uFF09';
        window.scrollTo(0, 0);
        return;
      }
    }
  }).catch(function(e) { toast('\u52A0\u8F7D\u5931\u8D25: ' + e.message); });
}
function toggleProvider(id) {
  api('/providers').then(function(r) {
    var rows = r.providers || [];
    for (var i = 0; i < rows.length; i++) {
      if (rows[i].id !== id) continue;
      var body = {
        id: id,
        name: rows[i].name,
        baseUrl: rows[i].baseUrl,
        apiKey: '',                 // \u4E0D\u6539\u52A8\u5DF2\u6709 Key
        models: rows[i].models || [],
        enabled: !rows[i].enabled,
        sort: rows[i].sort
      };
      return api('/providers', {method:'POST', body: body}).then(function() {
        toast(body.enabled ? '\u5DF2\u542F\u7528' : '\u5DF2\u505C\u7528'); loadProviders();
      }).catch(function(e) { toast('\u64CD\u4F5C\u5931\u8D25: ' + e.message); });
    }
  }).catch(function(e) { toast('\u52A0\u8F7D\u5931\u8D25: ' + e.message); });
}
function deleteProvider(id) {
  if (!window.confirm('\u786E\u8BA4\u5220\u9664\u8BE5\u4F9B\u5E94\u5546\uFF1FApp \u7AEF\u5C06\u4E0D\u518D\u663E\u793A\u5176\u4E91\u7AEF\u6A21\u578B\u3002')) return;
  api('/providers/' + encodeURIComponent(id), {method:'DELETE'}).then(function() {
    toast('\u5DF2\u5220\u9664');
    if (editingProviderId === id) resetProviderForm();
    loadProviders();
  }).catch(function(e) { toast('\u5220\u9664\u5931\u8D25: ' + e.message); });
}
function loadWeeklyUsage() {
  api('/weekly-usage').then(function(r) {
    var rows = r.usage || [];
    var html = '<tr><th>\u7528\u6237</th><th>\u529F\u80FD</th><th>\u672C\u5468\u7528\u91CF</th><th>\u5468\u8D77\u59CB</th></tr>';
    if (!rows.length) html += '<tr><td colspan="4" class="empty">\u672C\u5468\u6682\u65E0\u7528\u91CF</td></tr>';
    for (var i = 0; i < rows.length; i++) {
      var u = rows[i];
      html += '<tr><td class="dim">' + esc(u.user_id) + '</td>'
        + '<td>' + esc(u.feature) + '</td>'
        + '<td><b>' + esc(String(u.count)) + '</b></td>'
        + '<td class="dim">' + esc(u.week_start) + '</td></tr>';
    }
    renderTable('pvUsageTable', html);
  }).catch(function(e) { if (TOKEN) toast('\u52A0\u8F7D\u5931\u8D25: ' + e.message); });
}

// ---------- \u516C\u544A ----------
var editingAnnId = '';
function loadAnnouncements() {
  api('/announcements').then(function(r) {
    var rows = r.announcements || [];
    var html = '<tr><th>\u6807\u9898</th><th>\u5185\u5BB9</th><th>\u7248\u672C\u8303\u56F4</th><th>\u72B6\u6001</th><th>\u66F4\u65B0</th><th></th></tr>';
    if (!rows.length) html += '<tr><td colspan="6" class="empty">\u6682\u65E0\u516C\u544A</td></tr>';
    for (var i = 0; i < rows.length; i++) {
      var a = rows[i];
      var range = (a.min_version ? '\u2265' + a.min_version : '') + (a.max_version ? ' \u2264' + a.max_version : '') || '\u5168\u90E8\u7248\u672C';
      html += '<tr><td><b>' + esc(a.title) + '</b></td><td class="dim" style="max-width:260px;">' + esc(String(a.content).slice(0, 60)) + (String(a.content).length > 60 ? '\u2026' : '') + '</td>'
        + '<td class="dim">' + esc(range) + '</td>'
        + '<td><span class="badge ' + (a.enabled ? 'unused' : 'revoked') + '">' + (a.enabled ? '\u542F\u7528\u4E2D' : '\u5DF2\u505C\u7528') + '</span></td>'
        + '<td class="dim">' + fmtTime(a.updated_at) + '</td>'
        + '<td style="white-space:nowrap;">'
        + '<button class="btn ghost" style="padding:4px 10px; font-size:12px;" onclick="editAnnouncement(\\'' + esc(a.id) + '\\')">\u7F16\u8F91</button> '
        + '<button class="btn ghost" style="padding:4px 10px; font-size:12px;" onclick="toggleAnnouncement(\\'' + esc(a.id) + '\\')">' + (a.enabled ? '\u505C\u7528' : '\u542F\u7528') + '</button> '
        + '<button class="btn danger" style="padding:4px 10px; font-size:12px;" onclick="deleteAnnouncement(\\'' + esc(a.id) + '\\')">\u5220\u9664</button></td></tr>';
    }
    renderTable('annTable', html);
  }).catch(function(e) { if (TOKEN) toast('\u52A0\u8F7D\u5931\u8D25: ' + e.message); });
}
function saveAnnouncement() {
  var body = {
    title: document.getElementById('annTitle').value.trim(),
    content: document.getElementById('annContent').value.trim(),
    minVersion: document.getElementById('annMin').value.trim(),
    maxVersion: document.getElementById('annMax').value.trim(),
    enabled: document.getElementById('annEnabled').checked
  };
  if (!body.title || !body.content) { toast('\u6807\u9898\u4E0E\u6B63\u6587\u4E0D\u80FD\u4E3A\u7A7A'); return; }
  if (editingAnnId) body.id = editingAnnId;
  api('/announcements', {method:'POST', body: body}).then(function() {
    toast(editingAnnId ? '\u516C\u544A\u5DF2\u66F4\u65B0' : '\u516C\u544A\u5DF2\u53D1\u5E03');
    resetAnnForm(); loadAnnouncements();
  }).catch(function(e) { toast('\u4FDD\u5B58\u5931\u8D25: ' + e.message); });
}
function editAnnouncement(id) {
  api('/announcements').then(function(r) {
    var rows = r.announcements || [];
    for (var i = 0; i < rows.length; i++) {
      if (rows[i].id === id) {
        editingAnnId = id;
        document.getElementById('annTitle').value = rows[i].title;
        document.getElementById('annContent').value = rows[i].content;
        document.getElementById('annMin').value = rows[i].min_version || '';
        document.getElementById('annMax').value = rows[i].max_version || '';
        document.getElementById('annEnabled').checked = !!rows[i].enabled;
        document.getElementById('annEditing').textContent = '\u6B63\u5728\u7F16\u8F91: ' + id;
        window.scrollTo(0, 0);
        return;
      }
    }
  }).catch(function(e) { toast('\u52A0\u8F7D\u5931\u8D25: ' + e.message); });
}
function resetAnnForm() {
  editingAnnId = '';
  document.getElementById('annTitle').value = '';
  document.getElementById('annContent').value = '';
  document.getElementById('annMin').value = '';
  document.getElementById('annMax').value = '';
  document.getElementById('annEnabled').checked = true;
  document.getElementById('annEditing').textContent = '';
}
function toggleAnnouncement(id) {
  api('/announcements/' + encodeURIComponent(id) + '/toggle', {method:'POST'}).then(function() {
    toast('\u5DF2\u5207\u6362\u72B6\u6001'); loadAnnouncements();
  }).catch(function(e) { toast('\u64CD\u4F5C\u5931\u8D25: ' + e.message); });
}
function deleteAnnouncement(id) {
  if (!confirm('\u786E\u5B9A\u5220\u9664\u8BE5\u516C\u544A\uFF1F')) return;
  api('/announcements/' + encodeURIComponent(id), {method:'DELETE'}).then(function() {
    toast('\u5DF2\u5220\u9664'); loadAnnouncements();
  }).catch(function(e) { toast('\u5220\u9664\u5931\u8D25: ' + e.message); });
}

// ---------- \u7528\u6237 ----------
function loadUsers() {
  renderLoading('usrTable', 8);
  api('/users').then(function(r) {
    var rows = r.users || [];
    var html = '<tr><th>\u8D26\u53F7\u540D</th><th>\u90AE\u7BB1</th><th>\u5957\u9910</th><th>\u5230\u671F</th><th>\u8BBE\u5907</th><th>\u72B6\u6001</th><th>\u6CE8\u518C</th><th style="text-align:right;">\u64CD\u4F5C</th></tr>';
    if (!rows.length) html += '<tr><td colspan="8" class="empty">\u65E0\u7528\u6237</td></tr>';
    for (var i = 0; i < rows.length; i++) {
      var u = rows[i];
      var exp = u.plan_expires_at ? new Date(Number(u.plan_expires_at)).toLocaleDateString('zh-CN') : (u.plan === 'lifetime' ? '\u6C38\u4E45' : '\u2014');
      // \u8001\u7528\u6237\u8FD8\u6CA1\u56DE\u586B\u8D26\u53F7\u540D\u65F6\u663E\u793A \u2014\uFF08\u9996\u6B21\u767B\u5F55\u4F1A\u81EA\u52A8\u8865\u53D1\uFF09
      var uname = u.username ? '<span class="mono">' + esc(u.username) + '</span>' : '<span class="dim">\u2014</span>';
      html += '<tr><td>' + uname + '</td>'
        + '<td>' + esc(u.email) + '</td>'
        + '<td>' + esc(u.plan) + '</td><td>' + exp + '</td><td>' + esc(u.device_count) + '</td>'
        + '<td>' + (u.status === 'banned' ? '<span class="badge banned">banned</span>' : '<span class="badge unused">active</span>') + '</td>'
        + '<td class="dim">' + fmtTime(u.created_at) + '</td>'
        + '<td style="text-align:right; white-space:nowrap;">'
        + '<button class="btn ' + (u.status === 'banned' ? '' : 'danger') + '" style="padding:4px 12px; font-size:12px;" onclick="setBan(\\'' + esc(u.id) + '\\',' + (u.status === 'banned') + ')">' + (u.status === 'banned' ? '\u89E3\u5C01' : '\u5C01\u7981') + '</button> '
        + '<button class="btn danger-soft" onclick="confirmDeleteUser(\\'' + esc(u.id) + '\\',\\'' + esc(u.email) + '\\')">\u5220\u9664</button>'
        + '</td></tr>';
    }
    renderTable('usrTable', html);
  }).catch(function(e) { if (TOKEN) toast('\u52A0\u8F7D\u5931\u8D25: ' + e.message); });
}
function setBan(id, banned) {
  api('/users/' + encodeURIComponent(id) + '/' + (banned ? 'unban' : 'ban'), {method:'POST'}).then(function() {
    toast(banned ? '\u5DF2\u89E3\u5C01' : '\u5DF2\u5C01\u7981'); loadUsers();
  }).catch(function(e) { toast('\u64CD\u4F5C\u5931\u8D25: ' + e.message); });
}

// ---------- \u5220\u9664\u7528\u6237\uFF08\u7834\u574F\u6027\u64CD\u4F5C\uFF0C\u4E24\u6B65\u786E\u8BA4\uFF09----------
// \u5173\u95ED\u786E\u8BA4\u6846\u65F6\u8BB0\u4F4F\u300C\u5F85\u5220 id\u300D\uFF0C\u7531 confirmDeleteUserOk \u771F\u6B63\u6267\u884C\u3002
var _pendingDeleteId = '';

/**
 * \u6253\u5F00\u5220\u9664\u786E\u8BA4\u6846\uFF0C\u5E76\u5148\u62C9\u53D6\u300C\u4F1A\u6CE2\u53CA\u54EA\u4E9B\u6570\u636E\u300D\u5C55\u793A\u7ED9\u7BA1\u7406\u5458\u3002
 *
 * \u4E0D\u76F4\u63A5\u5220\u7684\u539F\u56E0\uFF1A\u5220\u7528\u6237\u4F1A\u8FDE\u5E26\u6E05\u6389\u4E91\u5907\u4EFD\u3001\u540C\u6B65\u6570\u636E\u3001Agent \u6388\u6743\u7B49
 * \u5341\u51E0\u5F20\u8868\u7684\u5185\u5BB9\uFF08\u4E0D\u53EF\u6062\u590D\uFF09\u3002\u7BA1\u7406\u5458\u5FC5\u987B\u5148\u770B\u5230\u5177\u4F53\u6761\u6570\u518D\u51B3\u5B9A\u3002
 */
function confirmDeleteUser(id, email) {
  _pendingDeleteId = id;
  document.getElementById('cfTitle').textContent = '\u5220\u9664\u7528\u6237';
  document.getElementById('cfDesc').textContent =
    '\u5C06\u6C38\u4E45\u5220\u9664 ' + email + '\uFF0C\u5E76\u6E05\u7406\u5176\u5168\u90E8\u5173\u8054\u6570\u636E\u3002\u6B64\u64CD\u4F5C\u4E0D\u53EF\u6062\u590D\u3002';
  document.getElementById('cfImpact').textContent = '\u6B63\u5728\u7EDF\u8BA1\u2026';
  document.getElementById('confirm').classList.add('show');
  api('/users/' + encodeURIComponent(id) + '/delete-preview', {timeout:15000}).then(function(r) {
    // \u7EDF\u8BA1\u8BF7\u6C42\u8FD4\u56DE\u65F6\u53EF\u80FD\u5DF2\u7ECF\u6362\u4E86\u522B\u7684\u7528\u6237\uFF0C\u522B\u8986\u76D6\u65B0\u5F39\u7A97\u7684\u5185\u5BB9
    if (_pendingDeleteId !== id) return;
    var counts = r.counts || {};
    var keys = Object.keys(counts);
    if (!keys.length) {
      document.getElementById('cfImpact').textContent = '\u8BE5\u7528\u6237\u6CA1\u6709\u4EFB\u4F55\u5173\u8054\u6570\u636E\u3002';
      return;
    }
    var html = '';
    for (var i = 0; i < keys.length; i++) {
      html += '<div>' + esc(keys[i]) + '<span class="n">' + esc(counts[keys[i]]) + ' \u6761</span></div>';
    }
    html += '<div style="margin-top:8px;padding-top:8px;border-top:1px solid var(--border);">'
          + '\u5408\u8BA1<b>' + esc(r.total || 0) + '</b> \u6761'
          + '<span style="float:right;color:var(--text-dim);font-size:12px;">\u5BA1\u8BA1\u65E5\u5FD7\u5C06\u4FDD\u7559</span></div>';
    document.getElementById('cfImpact').innerHTML = html;
  }).catch(function(e) {
    if (_pendingDeleteId !== id) return;
    document.getElementById('cfImpact').textContent = '\u7EDF\u8BA1\u5931\u8D25\uFF1A' + e.message;
  });
}

/** \u786E\u8BA4\u6846\u70B9\u300C\u786E\u8BA4\u5220\u9664\u300D\u3002 */
function confirmDeleteUserOk() {
  var id = _pendingDeleteId;
  if (!id) return;
  var btn = document.getElementById('cfOk');
  btn.disabled = true; btn.textContent = '\u5220\u9664\u4E2D\u2026';
  // \u8D85\u65F6\u7ED9\u5230 30s\uFF1A\u6E05\u7406\u6D89\u53CA\u591A\u5F20\u8868\uFF0C\u4E14\u4E91\u51FD\u6570\u7E41\u5FD9\u65F6\u4F1A\u6392\u961F\uFF0C\u4F46\u4E0D\u80FD\u65E0\u9650\u6302\u8D77
  // \u2014\u2014 \u6302\u8D77\u4F1A\u8BA9\u6309\u94AE\u6C38\u8FDC\u505C\u5728\u300C\u5220\u9664\u4E2D\u2026\u300D\uFF08\u6B64\u524D\u7BA1\u7406\u53F0\u300C\u5361\u6B7B\u300D\u7684\u76F4\u63A5\u89C2\u611F\uFF09\u3002
  api('/users/' + encodeURIComponent(id), {method:'DELETE', timeout:30000}).then(function(r) {
    closeConfirm();
    var n = r.removed ? Object.keys(r.removed).length : 0;
    toast('\u5DF2\u5220\u9664\uFF0C\u6E05\u7406 ' + n + ' \u5F20\u8868');
    if (r.failed && r.failed.length) toast('\u90E8\u5206\u8868\u6E05\u7406\u5931\u8D25\uFF0C\u8BF7\u68C0\u67E5: ' + r.failed.join('; '));
    loadUsers();
  }).catch(function(e) {
    // \u65E0\u8BBA\u8D85\u65F6\u8FD8\u662F\u4E1A\u52A1\u5931\u8D25\uFF0C\u90FD\u628A\u786E\u8BA4\u6846\u4E0E\u6309\u94AE\u6062\u590D\uFF0C\u754C\u9762\u4E0D\u80FD\u7559\u5728\u6B7B\u72B6\u6001\u3002
    btn.disabled = false; btn.textContent = '\u786E\u8BA4\u5220\u9664';
    toast('\u5220\u9664\u5931\u8D25: ' + e.message);
  });
}

/** \u5173\u95ED\u786E\u8BA4\u6846\u3002 */
function closeConfirm() {
  _pendingDeleteId = '';
  document.getElementById('confirm').classList.remove('show');
  var btn = document.getElementById('cfOk');
  if (btn) { btn.disabled = false; btn.textContent = '\u786E\u8BA4\u5220\u9664'; }
}

// ---------- \u7528\u91CF ----------
function loadUsage() {
  renderLoading('usageTable', 4);
  api('/usage').then(function(r) {
    var rows = r.usage || [];
    var html = '<tr><th>\u65E5\u671F</th><th>\u7528\u6237</th><th>\u529F\u80FD</th><th>\u6B21\u6570</th></tr>';
    if (!rows.length) html += '<tr><td colspan="4" class="empty">\u6682\u65E0\u6570\u636E</td></tr>';
    for (var i = 0; i < rows.length; i++) {
      html += '<tr><td>' + esc(rows[i].date || '') + '</td><td class="mono dim">' + esc(String(rows[i].user_id || '').slice(0, 14)) + '\u2026</td><td>' + esc(rows[i].feature) + '</td><td><b>' + esc(rows[i].count) + '</b></td></tr>';
    }
    renderTable('usageTable', html);
  }).catch(function(e) { if (TOKEN) toast('\u52A0\u8F7D\u5931\u8D25: ' + e.message); });
}

// ---------- \u5BA1\u8BA1 ----------
function loadAudit() {
  renderLoading('auditTable', 5);
  api('/audit').then(function(r) {
    var rows = r.audit || [];
    var html = '<tr><th>\u65F6\u95F4</th><th>\u52A8\u4F5C</th><th>\u7528\u6237</th><th>\u8BE6\u60C5</th><th>IP</th></tr>';
    if (!rows.length) html += '<tr><td colspan="5" class="empty">\u6682\u65E0\u8BB0\u5F55</td></tr>';
    for (var i = 0; i < rows.length; i++) {
      html += '<tr><td class="dim">' + fmtTime(rows[i].at) + '</td><td><span class="badge used">' + esc(rows[i].action) + '</span></td><td class="mono dim">' + esc(String(rows[i].user_id || '\u2014').slice(0, 14)) + '</td><td>' + esc(rows[i].detail || '') + '</td><td class="dim">' + esc(rows[i].ip || '') + '</td></tr>';
    }
    renderTable('auditTable', html);
  }).catch(function(e) { if (TOKEN) toast('\u52A0\u8F7D\u5931\u8D25: ' + e.message); });
}

// ---------- \u542F\u52A8 ----------
(function init() {
  // \u9996\u6B21\u8BBF\u95EE\u8DDF\u968F\u7CFB\u7EDF\u6DF1\u6D45\u8272, \u4E4B\u540E\u4EE5\u7528\u6237\u9009\u62E9\u4E3A\u51C6\u3002
  // \u517C\u5BB9\u65E7\u7248\u9057\u7559\u7684 5 \u5957\u5F69\u8272\u4E3B\u9898\u503C(aurora/violet/...) \u2014\u2014 \u4E00\u5F8B\u56DE\u843D\u5230\u7EAF\u767D\u3002
  var t = localStorage.getItem('orion_admin_theme');
  if (t !== 'dark' && t !== 'light') {
    t = (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) ? 'dark' : 'light';
  }
  setTheme(t);
  if (TOKEN) {
    // \u81EA\u52A8\u767B\u5F55\u6821\u9A8C\u540C\u6837\u9700\u8981\u8D85\u65F6\uFF1A\u6302\u8D77\u65F6\u4E0D\u80FD\u65E2\u8FDB\u4E0D\u53BB\u53C8\u4E0D\u62A5\u9519\uFF08\u89C1 timeoutSignal \u6CE8\u91CA\uFF09
    var ts = timeoutSignal(15000);
    fetch(APIBASE + '/users', {headers: {'Authorization': 'Bearer ' + TOKEN}, signal: ts.signal})
      .then(function(r) { ts.clear(); if (r.ok) enterApp(); else doLogout(true); })
      .catch(function() { ts.clear(); doLogout(true); });
  } else {
    document.getElementById('login').style.display = 'flex';
  }
  document.getElementById('tk').addEventListener('keydown', function(e) { if (e.key === 'Enter') doLogin(); });

  // \u5220\u9664\u786E\u8BA4\u6846\uFF1A\u53D6\u6D88 / \u786E\u8BA4 / \u70B9\u906E\u7F69 / ESC
  // \u7528 addEventListener \u800C\u975E\u5185\u8054 onclick \u2014\u2014 TS \u6A21\u677F\u91CC\u7684 onclick \u9700\u8981
  // \u9010\u5C42\u8F6C\u4E49\u5355\u5F15\u53F7\uFF08\u4E0A\u6B21\u7BA1\u7406\u53F0\u6309\u94AE\u5168\u762B\u5C31\u662F\u8FD9\u91CC\u5C11\u8F6C\u4E49\u4E86\u4E00\u5C42\uFF09\u3002
  document.getElementById('cfCancel').addEventListener('click', closeConfirm);
  document.getElementById('cfOk').addEventListener('click', confirmDeleteUserOk);
  document.getElementById('confirm').addEventListener('click', function(e) {
    if (e.target === this) closeConfirm();   // \u70B9\u906E\u7F69\u7A7A\u767D\u5904
  });
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && document.getElementById('confirm').classList.contains('show')) {
      closeConfirm();
    }
    // \u79FB\u52A8\u7AEF\u62BD\u5C49: ESC \u5173\u95ED
    if (e.key === 'Escape' && document.body.classList.contains('drawer-open')) {
      document.body.classList.remove('drawer-open');
    }
  });
})();
</script>
</body>
</html>`;
}

// src/index.ts
var app = new Hono3().basePath("/api");
app.use("*", async (c, next) => {
  if (c.req.path.startsWith("/api/update")) return next();
  c.set("db", await getDb(c.env));
  await next();
});
app.get(
  "/",
  (c) => c.json({
    service: "orion-backend",
    version: "0.1.0",
    endpoints: [
      "/api/auth",
      "/api/license",
      "/api/relay",
      "/api/tasks",
      "/api/mcp",
      "/api/update",
      "/api/announcement",
      "/api/backup",
      "/api/sync",
      "/api/admin"
    ]
  })
);
app.get(
  "/admin",
  (c) => c.html(adminHtml(), 200, {
    "cache-control": "no-store"
  })
);
app.route("/auth", authRoutes);
app.route("/license", licenseRoutes);
app.route("/relay", relayRoutes);
app.route("/tasks", taskRoutes);
app.route("/update", updateRoutes);
app.route("/announcement", announcementRoutes);
app.route("/backup", backupRoutes);
app.route("/sync", syncRoutes);
app.route("/mcp", mcpRoutes);
app.route("/ai", aiRoutes);
app.route("/agent", agentRoutes);
app.route("/admin", adminRoutes);
app.get("/health", requireAuth, (c) => c.json({ ok: true, user: c.get("user").userId, plan: c.get("user").plan }));
app.notFound((c) => {
  const e = errors.notFound("\u7AEF\u70B9\u4E0D\u5B58\u5728");
  return c.json({ error: { code: e.code, message: e.message } }, 404);
});
app.onError((err, c) => {
  if (err instanceof ApiError) {
    return c.json({ error: { code: err.code, message: err.message } }, err.status);
  }
  console.error("[orion-backend] unhandled:", err);
  const e = errors.internal();
  if (c.env.DEBUG_ERRORS === "true") {
    return c.json(
      {
        error: {
          code: e.code,
          message: `${err.name}: ${err.message}`,
          stack: String(err.stack ?? "").split("\n").slice(0, 4).join(" | ")
        }
      },
      500
    );
  }
  return c.json({ error: { code: e.code, message: e.message } }, 500);
});
var index_default = app;

// src/entry/api.ts
var edgeCtx = (context) => ({
  waitUntil: (context.waitUntil ?? (() => {
  })).bind(context),
  passThroughOnException: (context.passThroughOnException ?? (() => {
  })).bind(context),
  props: {}
});
var onRequest = async (context) => {
  try {
    return await index_default.fetch(context.request, context.env, edgeCtx(context));
  } catch (e) {
    const msg = e instanceof Error ? `${e.name}: ${e.message}
${e.stack ?? ""}` : String(e);
    return new Response(JSON.stringify({ moduleError: msg }, null, 2), {
      status: 500,
      headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }
    });
  }
};
var api_default = onRequest;
export {
  api_default as default,
  onRequest
};
