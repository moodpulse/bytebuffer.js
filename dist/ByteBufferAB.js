/*
 Copyright 2013-2014 Daniel Wirtz <dcode@dcode.io>

 Licensed under the Apache License, Version 2.0 (the "License");
 you may not use this file except in compliance with the License.
 You may obtain a copy of the License at

 http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 See the License for the specific language governing permissions and
 limitations under the License.
 */

/**
 * @license ByteBuffer.js (c) 2013-2014 Daniel Wirtz <dcode@dcode.io>
 * This version of ByteBuffer.js uses an ArrayBuffer (AB) as its backing buffer and is compatible with modern browsers.
 * Released under the Apache License, Version 2.0
 * see: https://github.com/dcodeIO/ByteBuffer.js for details
 */ //
(function(global) {
    "use strict";

    /**
     * @param {function(new: Long, number, number, boolean=)=} Long
     * @returns {function(new: ByteBuffer, number=, boolean=, boolean=)}}
     * @inner
     */
    function loadByteBuffer(Long) {

        /**
         * Constructs a new ByteBuffer.
         * @class The swiss army knife for binary data in JavaScript.
         * @exports ByteBuffer
         * @param {number=} capacity Initial capacity. Defaults to {@link ByteBuffer.DEFAULT_CAPACITY}.
         * @param {boolean=} littleEndian Whether to use little or big endian byte order. Defaults to
         *  {@link ByteBuffer.DEFAULT_ENDIAN}.
         * @param {boolean=} noAssert Whether to skip assertions of offsets and values. Defaults to
         *  {@link ByteBuffer.DEFAULT_NOASSERT}.
         * @expose
         */
        var ByteBuffer = function(capacity, littleEndian, noAssert) {
            if (typeof capacity     === 'undefined') capacity     = ByteBuffer.DEFAULT_CAPACITY;
            if (typeof littleEndian === 'undefined') littleEndian = ByteBuffer.DEFAULT_ENDIAN;
            if (typeof noAssert     === 'undefined') noAssert     = ByteBuffer.DEFAULT_NOASSERT;
            if (!noAssert) {
                capacity = capacity | 0;
                if (capacity < 0)
                    throw(new RangeError("Illegal capacity: 0 <= "+capacity));
                if (typeof littleEndian !== 'boolean')
                    throw(new TypeError("Illegal littleEndian: Not a boolean"));
                if (typeof noAssert !== 'boolean')
                    throw(new TypeError("Illegal noAssert: Not a boolean"));
            }

            /**
             * Backing buffer.
             * @type {!ArrayBuffer}
             * @expose
             */
            this.buffer = capacity === 0 ? EMPTY_BUFFER : new ArrayBuffer(capacity);

            /**
             * Data view to manipulate the backing buffer. Becomes `null` if the backing buffer has a capacity of `0`.
             * @type {?DataView}
             * @expose
             */
            this.view = capacity === 0 ? null : new DataView(this.buffer);

            /**
             * Absolute read/write offset.
             * @type {number}
             * @expose
             * @see ByteBuffer#flip
             * @see ByteBuffer#clear
             */
            this.offset = 0;

            /**
             * Marked offset.
             * @type {number}
             * @expose
             * @see ByteBuffer#mark
             * @see ByteBuffer#reset
             */
            this.markedOffset = -1;

            /**
             * Absolute limit of the contained data. Set to the backing buffer's capacity upon allocation.
             * @type {number}
             * @expose
             * @see ByteBuffer#flip
             * @see ByteBuffer#clear
             */
            this.limit = capacity;

            /**
             * Whether to use little endian byte order, defaults to `false` for big endian.
             * @type {boolean}
             * @expose
             */
            this.littleEndian = typeof littleEndian !== 'undefined' ? !!littleEndian : false;

            /**
             * Whether to skip assertions of offsets and values, defaults to `false`.
             * @type {boolean}
             * @expose
             */
            this.noAssert = !!noAssert;
        };

        /**
         * ByteBuffer version.
         * @type {string}
         * @const
         * @expose
         */
        ByteBuffer.VERSION = "3.0.0-pre";

        /**
         * Little endian constant that can be used instead of its boolean value. Evaluates to `true`.
         * @type {boolean}
         * @const
         * @expose
         */
        ByteBuffer.LITTLE_ENDIAN = true;

        /**
         * Big endian constant that can be used instead of its boolean value. Evaluates to `false`.
         * @type {boolean}
         * @const
         * @expose
         */
        ByteBuffer.BIG_ENDIAN = false;

        /**
         * Default initial capacity of `16`.
         * @type {number}
         * @expose
         */
        ByteBuffer.DEFAULT_CAPACITY = 16;

        /**
         * Default endianess of `false` for big endian.
         * @type {boolean}
         * @expose
         */
        ByteBuffer.DEFAULT_ENDIAN = ByteBuffer.BIG_ENDIAN;

        /**
         * Default no assertions flag of `false`.
         * @type {boolean}
         * @expose
         */
        ByteBuffer.DEFAULT_NOASSERT = false;

        /**
         * A `Long` class for representing a 64-bit two's-complement integer value. May be `null` if Long.js has not been loaded
         *  and int64 support is not available.
         * @type {?Long}
         * @const
         * @see https://github.com/dcodeIO/Long.js
         * @expose
         */
        ByteBuffer.Long = Long || null;

        // helpers

        /**
         * @type {!ArrayBuffer}
         * @inner
         */
        var EMPTY_BUFFER = new ArrayBuffer(0);

        /**
         * Allocates a new ByteBuffer backed by a buffer of the specified capacity.
         * @param {number=} capacity Initial capacity. Defaults to {@link ByteBuffer.DEFAULT_CAPACITY}.
         * @param {boolean=} littleEndian Whether to use little or big endian byte order. Defaults to
         *  {@link ByteBuffer.DEFAULT_ENDIAN}.
         * @param {boolean=} noAssert Whether to skip assertions of offsets and values. Defaults to
         *  {@link ByteBuffer.DEFAULT_NOASSERT}.
         * @returns {!ByteBuffer}
         * @expose
         */
        ByteBuffer.allocate = function(capacity, littleEndian, noAssert) {
            return new ByteBuffer(capacity, littleEndian, noAssert);
        };

        /**
         * Concatenates multiple ByteBuffers into one.
         * @param {!Array.<!ByteBuffer|!ArrayBuffer|!Uint8Array|string>} buffers Buffers to concatenate
         * @param {(string|boolean)=} encoding String encoding if `buffers` contains a string ("base64", "hex", "binary",
         *  defaults to "utf8")
         * @param {boolean=} littleEndian Whether to use little or big endian byte order for the resulting ByteBuffer. Defaults
         *  to {@link ByteBuffer.DEFAULT_ENDIAN}.
         * @param {boolean=} noAssert Whether to skip assertions of offsets and values for the resulting ByteBuffer. Defaults to
         *  {@link ByteBuffer.DEFAULT_NOASSERT}.
         * @returns {!ByteBuffer} Concatenated ByteBuffer
         * @expose
         */
        ByteBuffer.concat = function(buffers, encoding, littleEndian, noAssert) {
            if (typeof encoding === 'boolean' || typeof encoding !== 'string') {
                noAssert = littleEndian;
                littleEndian = encoding;
                encoding = undefined;
            }
            var capacity = 0;
            for (var i=0, k=buffers.length, length; i<k; ++i) {
                if (!ByteBuffer.isByteBuffer(buffers[i]))
                    buffers[i] = ByteBuffer.wrap(buffers[i], encoding);
                length = buffers[i].limit - buffers[i].offset;
                if (length > 0) capacity += length;
            }
            if (capacity === 0) return new ByteBuffer(0, littleEndian, noAssert);
            var bb = new ByteBuffer(capacity, littleEndian, noAssert),
                bi;
            var view = new Uint8Array(bb.buffer);
            i=0; while (i<k) {
                bi = buffers[i++];
                length = bi.limit - bi.offset;
                if (length <= 0) continue;
                view.set(new Uint8Array(bi.buffer).subarray(bi.offset, bi.limit), bb.offset);
                bb.offset += length;
            }
            bb.limit = bb.offset;
            bb.offset = 0;
            return bb;
        };

        /**
         * Tests if the specified type is a ByteBuffer.
         * @param {*} bb ByteBuffer to test
         * @returns {boolean} `true` if it is a ByteBuffer, otherwise `false`
         * @expose
         */
        ByteBuffer.isByteBuffer = function(bb) {
            return bb && bb instanceof ByteBuffer;
        };

        /**
         * Gets the backing buffer type.
         * @returns {Function} `Buffer` for NB builds, `ArrayBuffer` for AB builds (classes)
         * @expose
         */
        ByteBuffer.type = function() {
            return ArrayBuffer;
        };

        /**
         * Wraps a buffer or a string. Sets the allocated ByteBuffer's {@link ByteBuffer#offset} to `0` and its
         *  {@link ByteBuffer#limit} to the length of the wrapped data.
         * @param {!ByteBuffer|!ArrayBuffer|!Uint8Array|string} buffer Anything that can be wrapped
         * @param {(string|boolean)=} encoding String encoding if `buffer` is a string ("base64", "hex", "binary", defaults to
         *  "utf8")
         * @param {boolean=} littleEndian Whether to use little or big endian byte order. Defaults to
         *  {@link ByteBuffer.DEFAULT_ENDIAN}.
         * @param {boolean=} noAssert Whether to skip assertions of offsets and values. Defaults to
         *  {@link ByteBuffer.DEFAULT_NOASSERT}.
         * @returns {!ByteBuffer} A ByteBuffer wrapping `buffer`
         * @expose
         */
        ByteBuffer.wrap = function(buffer, encoding, littleEndian, noAssert) {
            if (typeof encoding !== 'string') {
                noAssert = littleEndian;
                littleEndian = encoding;
                encoding = undefined;
            }
            if (typeof buffer === 'string') {
                if (typeof encoding === 'undefined') encoding = "utf8";
                switch (encoding) {
                    case "base64":
                        return ByteBuffer.fromBase64(buffer, littleEndian);
                    case "hex":
                        return ByteBuffer.fromHex(buffer, littleEndian);
                    case "binary":
                        return ByteBuffer.fromBinary(buffer, littleEndian);
                    case "utf8":
                        return ByteBuffer.fromUTF8(buffer, littleEndian);
                    case "debug":
                        return ByteBuffer.fromDebug(buffer, littleEndian);
                    default:
                        throw(new TypeError("Unsupported encoding: "+encoding));
                }
            }
            if (buffer === null || typeof buffer !== 'object')
                throw(new TypeError("Illegal buffer: null or non-object"));
            var bb;
            if (ByteBuffer.isByteBuffer(buffer)) {
                bb = ByteBuffer.prototype.clone.call(buffer);
                bb.markedOffset = -1;
                return bb;
            }
            if (buffer instanceof Uint8Array) { // Extract ArrayBuffer from Uint8Array
                bb = new ByteBuffer(0, littleEndian, noAssert);
                if (buffer.length > 0) { // Avoid references to more than one EMPTY_BUFFER
                    bb.buffer = buffer.buffer;
                    bb.offset = buffer.byteOffset;
                    bb.limit = buffer.byteOffset + buffer.length;
                    bb.view = buffer.length > 0 ? new DataView(buffer.buffer) : null;
                }
            } else if (buffer instanceof ArrayBuffer) { // Reuse ArrayBuffer
                bb = new ByteBuffer(0, littleEndian, noAssert);
                if (buffer.byteLength > 0) {
                    bb.buffer = buffer;
                    bb.offset = 0;
                    bb.limit = buffer.byteLength;
                    bb.view = buffer.byteLength > 0 ? new DataView(buffer) : null;
                }
            } else throw(new TypeError("Illegal buffer"));
            return bb;
        };

        // types/ints/int8

        /**
         * Writes an 8bit signed integer.
         * @param {number} value Value to write
         * @param {number=} offset Offset to write to. Will use and advance {@link ByteBuffer#offset} by `1` if omitted.
         * @returns {!ByteBuffer} this
         * @expose
         */
        ByteBuffer.prototype.writeInt8 = function(value, offset) {
            // <RELATIVE>
            var relative = typeof offset === 'undefined';
            if (relative) offset = this.offset;
            // </RELATIVE>
            if (!this.noAssert) {
                // <ASSERT_INTEGER>
                if (typeof value !== 'number' || value % 1 !== 0)
                    throw(new TypeError("Illegal value: "+value+" (not an integer)"));
                value |= 0;
                // </ASSERT_INTEGER>
                // <ASSERT_OFFSET>
                if (typeof offset !== 'number' || offset % 1 !== 0)
                    throw(new TypeError("Illegal offset: "+offset+" (not an integer)"));
                offset >>>= 0;
                if (offset < 0 || offset + 0 > this.buffer.byteLength)
                    throw(new RangeError("Illegal offset: 0 <= "+offset+" (+"+0+") <= "+this.buffer.byteLength));
                // </ASSERT_OFFSET>
            }
            // <ENSURE_CAPACITY size=1>
            offset += 1;
            var capacity0 = this.buffer.byteLength;
            if (offset > capacity0)
                this.resize((capacity0 *= 2) > offset ? capacity0 : offset);
            offset -= 1;
            // </ENSURE_CAPACITY>
            this.view.setInt8(offset, value);
            // <RELATIVE size=1>
            if (relative) this.offset += 1;
            // </RELATIVE>
            return this;
        };

        /**
         * Writes an 8bit signed integer. This is an alias of {@link ByteBuffer#writeInt8}.
         * @function
         * @param {number} value Value to write
         * @param {number=} offset Offset to write to. Will use and advance {@link ByteBuffer#offset} by `1` if omitted.
         * @returns {!ByteBuffer} this
         * @expose
         */
        ByteBuffer.prototype.writeByte = ByteBuffer.prototype.writeInt8;

        /**
         * Reads an 8bit signed integer.
         * @param {number=} offset Offset to read from. Will use and advance {@link ByteBuffer#offset} by `1` if omitted.
         * @returns {number} Value read
         * @expose
         */
        ByteBuffer.prototype.readInt8 = function(offset) {
            // <RELATIVE>
            var relative = typeof offset === 'undefined';
            if (relative) offset = this.offset;
            // </RELATIVE>
            if (!this.noAssert) {
                // <ASSERT_OFFSET>
                if (typeof offset !== 'number' || offset % 1 !== 0)
                    throw(new TypeError("Illegal offset: "+offset+" (not an integer)"));
                offset >>>= 0;
                if (offset < 0 || offset + 1 > this.buffer.byteLength)
                    throw(new RangeError("Illegal offset: 0 <= "+offset+" (+"+1+") <= "+this.buffer.byteLength));
                // </ASSERT_OFFSET>
            }
            var value = this.view.getInt8(offset);
            // <RELATIVE size=1>
            if (relative) this.offset += 1;
            // </RELATIVE>
            return value;
        };

        /**
         * Reads an 8bit signed integer. This is an alias of {@link ByteBuffer#readInt8}.
         * @function
         * @param {number=} offset Offset to read from. Will use and advance {@link ByteBuffer#offset} by `1` if omitted.
         * @returns {number} Value read
         * @expose
         */
        ByteBuffer.prototype.readByte = ByteBuffer.prototype.readInt8;

        /**
         * Writes an 8bit unsigned integer.
         * @param {number} value Value to write
         * @param {number=} offset Offset to write to. Will use and advance {@link ByteBuffer#offset} by `1` if omitted.
         * @returns {!ByteBuffer} this
         * @expose
         */
        ByteBuffer.prototype.writeUint8 = function(value, offset) {
            // <RELATIVE>
            var relative = typeof offset === 'undefined';
            if (relative) offset = this.offset;
            // </RELATIVE>
            if (!this.noAssert) {
                // <ASSERT_INTEGER>
                if (typeof value !== 'number' || value % 1 !== 0)
                    throw(new TypeError("Illegal value: "+value+" (not an integer)"));
                value >>>= 0;
                // </ASSERT_INTEGER>
                // <ASSERT_OFFSET>
                if (typeof offset !== 'number' || offset % 1 !== 0)
                    throw(new TypeError("Illegal offset: "+offset+" (not an integer)"));
                offset >>>= 0;
                if (offset < 0 || offset + 0 > this.buffer.byteLength)
                    throw(new RangeError("Illegal offset: 0 <= "+offset+" (+"+0+") <= "+this.buffer.byteLength));
                // </ASSERT_OFFSET>
            }
            // <ENSURE_CAPACITY size=1>
            offset += 1;
            var capacity1 = this.buffer.byteLength;
            if (offset > capacity1)
                this.resize((capacity1 *= 2) > offset ? capacity1 : offset);
            offset -= 1;
            // </ENSURE_CAPACITY>
            this.view.setUint8(offset, value);
            // <RELATIVE size=1>
            if (relative) this.offset += 1;
            // </RELATIVE>
            return this;
        };

        /**
         * Reads an 8bit unsigned integer.
         * @param {number=} offset Offset to read from. Will use and advance {@link ByteBuffer#offset} by `1` if omitted.
         * @returns {number} Value read
         * @expose
         */
        ByteBuffer.prototype.readUint8 = function(offset) {
            // <RELATIVE>
            var relative = typeof offset === 'undefined';
            if (relative) offset = this.offset;
            // </RELATIVE>
            if (!this.noAssert) {
                // <ASSERT_OFFSET>
                if (typeof offset !== 'number' || offset % 1 !== 0)
                    throw(new TypeError("Illegal offset: "+offset+" (not an integer)"));
                offset >>>= 0;
                if (offset < 0 || offset + 1 > this.buffer.byteLength)
                    throw(new RangeError("Illegal offset: 0 <= "+offset+" (+"+1+") <= "+this.buffer.byteLength));
                // </ASSERT_OFFSET>
            }
            var value = this.view.getUint8(offset);
            // <RELATIVE size=1>
            if (relative) this.offset += 1;
            // </RELATIVE>
            return value;
        };

        // types/ints/int16

        /**
         * Writes a 16bit signed integer.
         * @param {number} value Value to write
         * @param {number=} offset Offset to write to. Will use and advance {@link ByteBuffer#offset} by `2` if omitted.
         * @throws {TypeError} If `offset` or `value` is not a valid number
         * @throws {RangeError} If `offset` is out of bounds
         * @expose
         */
        ByteBuffer.prototype.writeInt16 = function(value, offset) {
            // <RELATIVE>
            var relative = typeof offset === 'undefined';
            if (relative) offset = this.offset;
            // </RELATIVE>
            if (!this.noAssert) {
                // <ASSERT_INTEGER>
                if (typeof value !== 'number' || value % 1 !== 0)
                    throw(new TypeError("Illegal value: "+value+" (not an integer)"));
                value |= 0;
                // </ASSERT_INTEGER>
                // <ASSERT_OFFSET>
                if (typeof offset !== 'number' || offset % 1 !== 0)
                    throw(new TypeError("Illegal offset: "+offset+" (not an integer)"));
                offset >>>= 0;
                if (offset < 0 || offset + 0 > this.buffer.byteLength)
                    throw(new RangeError("Illegal offset: 0 <= "+offset+" (+"+0+") <= "+this.buffer.byteLength));
                // </ASSERT_OFFSET>
            }
            // <ENSURE_CAPACITY size=2>
            offset += 2;
            var capacity2 = this.buffer.byteLength;
            if (offset > capacity2)
                this.resize((capacity2 *= 2) > offset ? capacity2 : offset);
            offset -= 2;
            // </ENSURE_CAPACITY>
            this.view.setInt16(offset, value, this.littleEndian);
            // <RELATIVE size=2>
            if (relative) this.offset += 2;
            // </RELATIVE>
            return this;
        };

        /**
         * Writes a 16bit signed integer. This is an alias of {@link ByteBuffer#writeInt16}.
         * @function
         * @param {number} value Value to write
         * @param {number=} offset Offset to write to. Will use and advance {@link ByteBuffer#offset} by `2` if omitted.
         * @throws {TypeError} If `offset` or `value` is not a valid number
         * @throws {RangeError} If `offset` is out of bounds
         * @expose
         */
        ByteBuffer.prototype.writeShort = ByteBuffer.prototype.writeInt16;

        /**
         * Reads a 16bit signed integer.
         * @param {number=} offset Offset to read from. Will use and advance {@link ByteBuffer#offset} by `2` if omitted.
         * @returns {number} Value read
         * @throws {TypeError} If `offset` is not a valid number
         * @throws {RangeError} If `offset` is out of bounds
         * @expose
         */
        ByteBuffer.prototype.readInt16 = function(offset) {
            // <RELATIVE>
            var relative = typeof offset === 'undefined';
            if (relative) offset = this.offset;
            // </RELATIVE>
            if (!this.noAssert) {
                // <ASSERT_OFFSET>
                if (typeof offset !== 'number' || offset % 1 !== 0)
                    throw(new TypeError("Illegal offset: "+offset+" (not an integer)"));
                offset >>>= 0;
                if (offset < 0 || offset + 2 > this.buffer.byteLength)
                    throw(new RangeError("Illegal offset: 0 <= "+offset+" (+"+2+") <= "+this.buffer.byteLength));
                // </ASSERT_OFFSET>
            }
            var value = this.view.getInt16(offset, this.littleEndian);
            // <RELATIVE size=2>
            if (relative) this.offset += 2;
            // </RELATIVE>
            return value;
        };

        /**
         * Reads a 16bit signed integer. This is an alias of {@link ByteBuffer#readInt16}.
         * @function
         * @param {number=} offset Offset to read from. Will use and advance {@link ByteBuffer#offset} by `2` if omitted.
         * @returns {number} Value read
         * @throws {TypeError} If `offset` is not a valid number
         * @throws {RangeError} If `offset` is out of bounds
         * @expose
         */
        ByteBuffer.prototype.readShort = ByteBuffer.prototype.readInt16;

        /**
         * Writes a 16bit unsigned integer.
         * @param {number} value Value to write
         * @param {number=} offset Offset to write to. Will use and advance {@link ByteBuffer#offset} by `2` if omitted.
         * @throws {TypeError} If `offset` or `value` is not a valid number
         * @throws {RangeError} If `offset` is out of bounds
         * @expose
         */
        ByteBuffer.prototype.writeUint16 = function(value, offset) {
            // <RELATIVE>
            var relative = typeof offset === 'undefined';
            if (relative) offset = this.offset;
            // </RELATIVE>
            if (!this.noAssert) {
                // <ASSERT_INTEGER>
                if (typeof value !== 'number' || value % 1 !== 0)
                    throw(new TypeError("Illegal value: "+value+" (not an integer)"));
                value >>>= 0;
                // </ASSERT_INTEGER>
                // <ASSERT_OFFSET>
                if (typeof offset !== 'number' || offset % 1 !== 0)
                    throw(new TypeError("Illegal offset: "+offset+" (not an integer)"));
                offset >>>= 0;
                if (offset < 0 || offset + 0 > this.buffer.byteLength)
                    throw(new RangeError("Illegal offset: 0 <= "+offset+" (+"+0+") <= "+this.buffer.byteLength));
                // </ASSERT_OFFSET>
            }
            // <ENSURE_CAPACITY size=2>
            offset += 2;
            var capacity3 = this.buffer.byteLength;
            if (offset > capacity3)
                this.resize((capacity3 *= 2) > offset ? capacity3 : offset);
            offset -= 2;
            // </ENSURE_CAPACITY>
            this.view.setUint16(offset, value, this.littleEndian);
            // <RELATIVE size=2>
            if (relative) this.offset += 2;
            // </RELATIVE>
            return this;
        };

        /**
         * Reads a 16bit unsigned integer.
         * @param {number=} offset Offset to read from. Will use and advance {@link ByteBuffer#offset} by `2` if omitted.
         * @returns {number} Value read
         * @throws {TypeError} If `offset` is not a valid number
         * @throws {RangeError} If `offset` is out of bounds
         * @expose
         */
        ByteBuffer.prototype.readUint16 = function(offset) {
            // <RELATIVE>
            var relative = typeof offset === 'undefined';
            if (relative) offset = this.offset;
            // </RELATIVE>
            if (!this.noAssert) {
                // <ASSERT_OFFSET>
                if (typeof offset !== 'number' || offset % 1 !== 0)
                    throw(new TypeError("Illegal offset: "+offset+" (not an integer)"));
                offset >>>= 0;
                if (offset < 0 || offset + 2 > this.buffer.byteLength)
                    throw(new RangeError("Illegal offset: 0 <= "+offset+" (+"+2+") <= "+this.buffer.byteLength));
                // </ASSERT_OFFSET>
            }
            var value = this.view.getUint16(offset, this.littleEndian);
            // <RELATIVE size=2>
            if (relative) this.offset += 2;
            // </RELATIVE>
            return value;
        };

        // types/ints/int32

        /**
         * Writes a 32bit signed integer.
         * @param {number} value Value to write
         * @param {number=} offset Offset to write to. Will use and increase {@link ByteBuffer#offset} by `4` if omitted.
         * @expose
         */
        ByteBuffer.prototype.writeInt32 = function(value, offset) {
            // <RELATIVE>
            var relative = typeof offset === 'undefined';
            if (relative) offset = this.offset;
            // </RELATIVE>
            if (!this.noAssert) {
                // <ASSERT_INTEGER>
                if (typeof value !== 'number' || value % 1 !== 0)
                    throw(new TypeError("Illegal value: "+value+" (not an integer)"));
                value |= 0;
                // </ASSERT_INTEGER>
                // <ASSERT_OFFSET>
                if (typeof offset !== 'number' || offset % 1 !== 0)
                    throw(new TypeError("Illegal offset: "+offset+" (not an integer)"));
                offset >>>= 0;
                if (offset < 0 || offset + 0 > this.buffer.byteLength)
                    throw(new RangeError("Illegal offset: 0 <= "+offset+" (+"+0+") <= "+this.buffer.byteLength));
                // </ASSERT_OFFSET>
            }
            // <ENSURE_CAPACITY size=4>
            offset += 4;
            var capacity4 = this.buffer.byteLength;
            if (offset > capacity4)
                this.resize((capacity4 *= 2) > offset ? capacity4 : offset);
            offset -= 4;
            // </ENSURE_CAPACITY>
            this.view.setInt32(offset, value, this.littleEndian);
            // <RELATIVE size=4>
            if (relative) this.offset += 4;
            // </RELATIVE>
            return this;
        };

        /**
         * Writes a 32bit signed integer. This is an alias of {@link ByteBuffer#writeInt32}.
         * @param {number} value Value to write
         * @param {number=} offset Offset to write to. Will use and increase {@link ByteBuffer#offset} by `4` if omitted.
         * @expose
         */
        ByteBuffer.prototype.writeInt = ByteBuffer.prototype.writeInt32;

        /**
         * Reads a 32bit signed integer.
         * @param {number=} offset Offset to read from. Will use and increase {@link ByteBuffer#offset} by `4` if omitted.
         * @returns {number} Value read
         * @expose
         */
        ByteBuffer.prototype.readInt32 = function(offset) {
            // <RELATIVE>
            var relative = typeof offset === 'undefined';
            if (relative) offset = this.offset;
            // </RELATIVE>
            if (!this.noAssert) {
                // <ASSERT_OFFSET>
                if (typeof offset !== 'number' || offset % 1 !== 0)
                    throw(new TypeError("Illegal offset: "+offset+" (not an integer)"));
                offset >>>= 0;
                if (offset < 0 || offset + 4 > this.buffer.byteLength)
                    throw(new RangeError("Illegal offset: 0 <= "+offset+" (+"+4+") <= "+this.buffer.byteLength));
                // </ASSERT_OFFSET>
            }
            var value = this.view.getInt32(offset, this.littleEndian);
            // <RELATIVE size=4>
            if (relative) this.offset += 4;
            // </RELATIVE>
            return value;
        };

        /**
         * Reads a 32bit signed integer. This is an alias of {@link ByteBuffer#readInt32}.
         * @param {number=} offset Offset to read from. Will use and advance {@link ByteBuffer#offset} by `4` if omitted.
         * @returns {number} Value read
         * @expose
         */
        ByteBuffer.prototype.readInt = ByteBuffer.prototype.readInt32;

        /**
         * Writes a 32bit unsigned integer.
         * @param {number} value Value to write
         * @param {number=} offset Offset to write to. Will use and increase {@link ByteBuffer#offset} by `4` if omitted.
         * @expose
         */
        ByteBuffer.prototype.writeUint32 = function(value, offset) {
            // <RELATIVE>
            var relative = typeof offset === 'undefined';
            if (relative) offset = this.offset;
            // </RELATIVE>
            if (!this.noAssert) {
                // <ASSERT_INTEGER>
                if (typeof value !== 'number' || value % 1 !== 0)
                    throw(new TypeError("Illegal value: "+value+" (not an integer)"));
                value >>>= 0;
                // </ASSERT_INTEGER>
                // <ASSERT_OFFSET>
                if (typeof offset !== 'number' || offset % 1 !== 0)
                    throw(new TypeError("Illegal offset: "+offset+" (not an integer)"));
                offset >>>= 0;
                if (offset < 0 || offset + 0 > this.buffer.byteLength)
                    throw(new RangeError("Illegal offset: 0 <= "+offset+" (+"+0+") <= "+this.buffer.byteLength));
                // </ASSERT_OFFSET>
            }
            // <ENSURE_CAPACITY size=4>
            offset += 4;
            var capacity5 = this.buffer.byteLength;
            if (offset > capacity5)
                this.resize((capacity5 *= 2) > offset ? capacity5 : offset);
            offset -= 4;
            // </ENSURE_CAPACITY>
            this.view.setUint32(offset, value, this.littleEndian);
            // <RELATIVE size=4>
            if (relative) this.offset += 4;
            // </RELATIVE>
            return this;
        };

        /**
         * Reads a 32bit unsigned integer.
         * @param {number=} offset Offset to read from. Will use and increase {@link ByteBuffer#offset} by `4` if omitted.
         * @returns {number} Value read
         * @expose
         */
        ByteBuffer.prototype.readUint32 = function(offset) {
            // <RELATIVE>
            var relative = typeof offset === 'undefined';
            if (relative) offset = this.offset;
            // </RELATIVE>
            if (!this.noAssert) {
                // <ASSERT_OFFSET>
                if (typeof offset !== 'number' || offset % 1 !== 0)
                    throw(new TypeError("Illegal offset: "+offset+" (not an integer)"));
                offset >>>= 0;
                if (offset < 0 || offset + 4 > this.buffer.byteLength)
                    throw(new RangeError("Illegal offset: 0 <= "+offset+" (+"+4+") <= "+this.buffer.byteLength));
                // </ASSERT_OFFSET>
            }
            var value = this.view.getUint32(offset, this.littleEndian);
            // <RELATIVE size=4>
            if (relative) this.offset += 4;
            // </RELATIVE>
            return value;
        };

        // types/ints/int64

        if (Long) {

            /**
             * Writes a 64bit signed integer.
             * @param {number|!Long} value Value to write
             * @param {number=} offset Offset to write to. Will use and increase {@link ByteBuffer#offset} by `8` if omitted.
             * @returns {!ByteBuffer} this
             * @expose
             */
            ByteBuffer.prototype.writeInt64 = function(value, offset) {
                // <RELATIVE>
                var relative = typeof offset === 'undefined';
                if (relative) offset = this.offset;
                // </RELATIVE>
                if (!this.noAssert) {
                    // <ASSERT_LONG>
                    if (typeof value === 'number' && value % 1 === 0)
                        value |= 0;
                    else if (!(value && value instanceof Long))
                        throw(new TypeError("Illegal value: "+value+" (not an integer or Long)"));
                    // </ASSERT_LONG>
                    // <ASSERT_OFFSET>
                    if (typeof offset !== 'number' || offset % 1 !== 0)
                        throw(new TypeError("Illegal offset: "+offset+" (not an integer)"));
                    offset >>>= 0;
                    if (offset < 0 || offset + 0 > this.buffer.byteLength)
                        throw(new RangeError("Illegal offset: 0 <= "+offset+" (+"+0+") <= "+this.buffer.byteLength));
                    // </ASSERT_OFFSET>
                }
                // <LONG>
                if (typeof value === 'number')
                    value = Long.fromNumber(value);
                // </LONG>
                // <ENSURE_CAPACITY size=8>
                offset += 8;
                var capacity6 = this.buffer.byteLength;
                if (offset > capacity6)
                    this.resize((capacity6 *= 2) > offset ? capacity6 : offset);
                offset -= 8;
                // </ENSURE_CAPACITY>
                if (this.littleEndian) {
                    this.view.setInt32(offset  , value.low , true);
                    this.view.setInt32(offset+4, value.high, true);
                } else {
                    this.view.setInt32(offset  , value.high, false);
                    this.view.setInt32(offset+4, value.low , false);
                }
                // <RELATIVE size=8>
                if (relative) this.offset += 8;
                // </RELATIVE>
                return this;
            };

            /**
             * Writes a 64bit signed integer. This is an alias of {@link ByteBuffer#writeInt64}.
             * @param {number|!Long} value Value to write
             * @param {number=} offset Offset to write to. Will use and increase {@link ByteBuffer#offset} by `8` if omitted.
             * @returns {!ByteBuffer} this
             * @expose
             */
            ByteBuffer.prototype.writeLong = ByteBuffer.prototype.writeInt64;

            /**
             * Reads a 64bit signed integer.
             * @param {number=} offset Offset to read from. Will use and increase {@link ByteBuffer#offset} by `8` if omitted.
             * @returns {!Long}
             * @expose
             */
            ByteBuffer.prototype.readInt64 = function(offset) {
                // <RELATIVE>
                var relative = typeof offset === 'undefined';
                if (relative) offset = this.offset;
                // </RELATIVE>
                if (!this.noAssert) {
                    // <ASSERT_OFFSET>
                    if (typeof offset !== 'number' || offset % 1 !== 0)
                        throw(new TypeError("Illegal offset: "+offset+" (not an integer)"));
                    offset >>>= 0;
                    if (offset < 0 || offset + 8 > this.buffer.byteLength)
                        throw(new RangeError("Illegal offset: 0 <= "+offset+" (+"+8+") <= "+this.buffer.byteLength));
                    // </ASSERT_OFFSET>
                }
                var value = this.littleEndian
                    ? new Long(this.view.getInt32(offset  , true ), this.view.getInt32(offset+4, true ), false)
                    : new Long(this.view.getInt32(offset+4, false), this.view.getInt32(offset  , false), false);
                // <RELATIVE size=8>
                if (relative) this.offset += 8;
                // </RELATIVE>
                return value;
            };

            /**
             * Reads a 64bit signed integer. This is an alias of {@link ByteBuffer#readInt64}.
             * @param {number=} offset Offset to read from. Will use and increase {@link ByteBuffer#offset} by `8` if omitted.
             * @returns {!Long}
             * @expose
             */
            ByteBuffer.prototype.readLong = ByteBuffer.prototype.readInt64;

            /**
             * Writes a 64bit unsigned integer.
             * @param {number|!Long} value Value to write
             * @param {number=} offset Offset to write to. Will use and increase {@link ByteBuffer#offset} by `8` if omitted.
             * @returns {!ByteBuffer} this
             * @expose
             */
            ByteBuffer.prototype.writeUint64 = function(value, offset) {
                // <RELATIVE>
                var relative = typeof offset === 'undefined';
                if (relative) offset = this.offset;
                // </RELATIVE>
                if (!this.noAssert) {
                    // <ASSERT_LONG>
                    if (typeof value === 'number' && value % 1 === 0)
                        value |= 0;
                    else if (!(value && value instanceof Long))
                        throw(new TypeError("Illegal value: "+value+" (not an integer or Long)"));
                    // </ASSERT_LONG>
                    // <ASSERT_OFFSET>
                    if (typeof offset !== 'number' || offset % 1 !== 0)
                        throw(new TypeError("Illegal offset: "+offset+" (not an integer)"));
                    offset >>>= 0;
                    if (offset < 0 || offset + 0 > this.buffer.byteLength)
                        throw(new RangeError("Illegal offset: 0 <= "+offset+" (+"+0+") <= "+this.buffer.byteLength));
                    // </ASSERT_OFFSET>
                }
                // <LONG>
                if (typeof value === 'number')
                    value = Long.fromNumber(value);
                // </LONG>
                // <ENSURE_CAPACITY size=8>
                offset += 8;
                var capacity7 = this.buffer.byteLength;
                if (offset > capacity7)
                    this.resize((capacity7 *= 2) > offset ? capacity7 : offset);
                offset -= 8;
                // </ENSURE_CAPACITY>
                if (this.littleEndian) {
                    this.view.setInt32(offset  , value.low , true);
                    this.view.setInt32(offset+4, value.high, true);
                } else {
                    this.view.setInt32(offset  , value.high, false);
                    this.view.setInt32(offset+4, value.low , false);
                }
                // <RELATIVE size=8>
                if (relative) this.offset += 8;
                // </RELATIVE>
                return this;
            };

            /**
             * Reads a 64bit unsigned integer.
             * @param {number=} offset Offset to read from. Will use and increase {@link ByteBuffer#offset} by `8` if omitted.
             * @returns {!Long}
             * @expose
             */
            ByteBuffer.prototype.readUint64 = function(offset) {
                // <RELATIVE>
                var relative = typeof offset === 'undefined';
                if (relative) offset = this.offset;
                // </RELATIVE>
                if (!this.noAssert) {
                    // <ASSERT_OFFSET>
                    if (typeof offset !== 'number' || offset % 1 !== 0)
                        throw(new TypeError("Illegal offset: "+offset+" (not an integer)"));
                    offset >>>= 0;
                    if (offset < 0 || offset + 8 > this.buffer.byteLength)
                        throw(new RangeError("Illegal offset: 0 <= "+offset+" (+"+8+") <= "+this.buffer.byteLength));
                    // </ASSERT_OFFSET>
                }
                var value = this.littleEndian
                    ? new Long(this.view.getInt32(offset  , true ), this.view.getInt32(offset+4, true ), true)
                    : new Long(this.view.getInt32(offset+4, false), this.view.getInt32(offset  , false), true);
                // <RELATIVE size=8>
                if (relative) this.offset += 8;
                // </RELATIVE>
                return value;
            };

        } // Long


        // types/floats/float32

        /**
         * Writes a 32bit float.
         * @param {number} value Value to write
         * @param {number=} offset Offset to write to. Will use and increase {@link ByteBuffer#offset} by `4` if omitted.
         * @returns {!ByteBuffer} this
         * @expose
         */
        ByteBuffer.prototype.writeFloat32 = function(value, offset) {
            // <RELATIVE>
            var relative = typeof offset === 'undefined';
            if (relative) offset = this.offset;
            // </RELATIVE>
            if (!this.noAssert) {
                if (typeof value !== 'number')
                    throw(new TypeError("Illegal value: "+value+" (not a number)"));
                // <ASSERT_OFFSET>
                if (typeof offset !== 'number' || offset % 1 !== 0)
                    throw(new TypeError("Illegal offset: "+offset+" (not an integer)"));
                offset >>>= 0;
                if (offset < 0 || offset + 0 > this.buffer.byteLength)
                    throw(new RangeError("Illegal offset: 0 <= "+offset+" (+"+0+") <= "+this.buffer.byteLength));
                // </ASSERT_OFFSET>
            }
            // <ENSURE_CAPACITY size=4>
            offset += 4;
            var capacity8 = this.buffer.byteLength;
            if (offset > capacity8)
                this.resize((capacity8 *= 2) > offset ? capacity8 : offset);
            offset -= 4;
            // </ENSURE_CAPACITY>
            this.view.setFloat32(offset, value, this.littleEndian);
            // <RELATIVE size=4>
            if (relative) this.offset += 4;
            // </RELATIVE>
            return this;
        };

        /**
         * Writes a 32bit float. This is an alias of {@link ByteBuffer#writeFloat32}.
         * @function
         * @param {number} value Value to write
         * @param {number=} offset Offset to write to. Will use and increase {@link ByteBuffer#offset} by `4` if omitted.
         * @returns {!ByteBuffer} this
         * @expose
         */
        ByteBuffer.prototype.writeFloat = ByteBuffer.prototype.writeFloat32;

        /**
         * Reads a 32bit float.
         * @param {number=} offset Offset to read from. Will use and increase {@link ByteBuffer#offset} by `4` if omitted.
         * @returns {number}
         * @expose
         */
        ByteBuffer.prototype.readFloat32 = function(offset) {
            // <RELATIVE>
            var relative = typeof offset === 'undefined';
            if (relative) offset = this.offset;
            // </RELATIVE>
            if (!this.noAssert) {
                // <ASSERT_OFFSET>
                if (typeof offset !== 'number' || offset % 1 !== 0)
                    throw(new TypeError("Illegal offset: "+offset+" (not an integer)"));
                offset >>>= 0;
                if (offset < 0 || offset + 4 > this.buffer.byteLength)
                    throw(new RangeError("Illegal offset: 0 <= "+offset+" (+"+4+") <= "+this.buffer.byteLength));
                // </ASSERT_OFFSET>
            }
            var value = this.view.getFloat32(offset, this.littleEndian);
            // <RELATIVE size=4>
            if (relative) this.offset += 4;
            // </RELATIVE>
            return value;
        };

        /**
         * Reads a 32bit float. This is an alias of {@link ByteBuffer#readFloat32}.
         * @function
         * @param {number=} offset Offset to read from. Will use and increase {@link ByteBuffer#offset} by `4` if omitted.
         * @returns {number}
         * @expose
         */
        ByteBuffer.prototype.readFloat = ByteBuffer.prototype.readFloat32;

        // types/floats/float64

        /**
         * Writes a 64bit float.
         * @param {number} value Value to write
         * @param {number=} offset Offset to write to. Will use and increase {@link ByteBuffer#offset} by `8` if omitted.
         * @returns {!ByteBuffer} this
         * @expose
         */
        ByteBuffer.prototype.writeFloat64 = function(value, offset) {
            // <RELATIVE>
            var relative = typeof offset === 'undefined';
            if (relative) offset = this.offset;
            // </RELATIVE>
            if (!this.noAssert) {
                if (typeof value !== 'number')
                    throw(new TypeError("Illegal value: "+value+" (not a number)"));
                // <ASSERT_OFFSET>
                if (typeof offset !== 'number' || offset % 1 !== 0)
                    throw(new TypeError("Illegal offset: "+offset+" (not an integer)"));
                offset >>>= 0;
                if (offset < 0 || offset + 0 > this.buffer.byteLength)
                    throw(new RangeError("Illegal offset: 0 <= "+offset+" (+"+0+") <= "+this.buffer.byteLength));
                // </ASSERT_OFFSET>
            }
            // <ENSURE_CAPACITY size=8>
            offset += 8;
            var capacity9 = this.buffer.byteLength;
            if (offset > capacity9)
                this.resize((capacity9 *= 2) > offset ? capacity9 : offset);
            offset -= 8;
            // </ENSURE_CAPACITY>
            this.view.setFloat64(offset, value, this.littleEndian);
            // <RELATIVE size=8>
            if (relative) this.offset += 8;
            // </RELATIVE>
            return this;
        };

        /**
         * Writes a 64bit float. This is an alias of {@link ByteBuffer#writeFloat64}.
         * @function
         * @param {number} value Value to write
         * @param {number=} offset Offset to write to. Will use and increase {@link ByteBuffer#offset} by `8` if omitted.
         * @returns {!ByteBuffer} this
         * @expose
         */
        ByteBuffer.prototype.writeDouble = ByteBuffer.prototype.writeFloat64;

        /**
         * Reads a 64bit float.
         * @param {number=} offset Offset to read from. Will use and increase {@link ByteBuffer#offset} by `8` if omitted.
         * @returns {number}
         * @expose
         */
        ByteBuffer.prototype.readFloat64 = function(offset) {
            // <RELATIVE>
            var relative = typeof offset === 'undefined';
            if (relative) offset = this.offset;
            // </RELATIVE>
            if (!this.noAssert) {
                // <ASSERT_OFFSET>
                if (typeof offset !== 'number' || offset % 1 !== 0)
                    throw(new TypeError("Illegal offset: "+offset+" (not an integer)"));
                offset >>>= 0;
                if (offset < 0 || offset + 8 > this.buffer.byteLength)
                    throw(new RangeError("Illegal offset: 0 <= "+offset+" (+"+8+") <= "+this.buffer.byteLength));
                // </ASSERT_OFFSET>
            }
            var value = this.view.getFloat64(offset, this.littleEndian);
            // <RELATIVE size=8>
            if (relative) this.offset += 8;
            // </RELATIVE>
            return value;
        };

        /**
         * Reads a 64bit float. This is an alias of {@link ByteBuffer#readFloat64}.
         * @function
         * @param {number=} offset Offset to read from. Will use and increase {@link ByteBuffer#offset} by `8` if omitted.
         * @returns {number}
         * @expose
         */
        ByteBuffer.prototype.readDouble = ByteBuffer.prototype.readFloat64;


        // types/varints/varint32

        /**
         * Maximum number of bytes required to store a 32bit base 128 variable-length integer.
         * @type {number}
         * @const
         * @expose
         */
        ByteBuffer.MAX_VARINT32_BYTES = 5;

        /**
         * Calculates the actual number of bytes required to store a 32bit base 128 variable-length integer.
         * @param {number} value Value to encode
         * @returns {number} Number of bytes required. Capped to {@link ByteBuffer.MAX_VARINT32_BYTES}
         * @expose
         */
        ByteBuffer.calculateVarint32 = function(value) {
            // ref: src/google/protobuf/io/coded_stream.cc
            value = value >>> 0;
                 if (value < 1 << 7 ) return 1;
            else if (value < 1 << 14) return 2;
            else if (value < 1 << 21) return 3;
            else if (value < 1 << 28) return 4;
            else                      return 5;
        };

        /**
         * Zigzag encodes a signed 32bit integer so that it can be effectively used with varint encoding.
         * @param {number} n Signed 32bit integer
         * @returns {number} Unsigned zigzag encoded 32bit integer
         * @expose
         */
        ByteBuffer.zigZagEncode32 = function(n) {
            return (((n |= 0) << 1) ^ (n >> 31)) >>> 0; // ref: src/google/protobuf/wire_format_lite.h
        };

        /**
         * Decodes a zigzag encoded signed 32bit integer.
         * @param {number} n Unsigned zigzag encoded 32bit integer
         * @returns {number} Signed 32bit integer
         * @expose
         */
        ByteBuffer.zigZagDecode32 = function(n) {
            return ((n >>> 1) ^ -(n & 1)) | 0; // // ref: src/google/protobuf/wire_format_lite.h
        };

        /**
         * Writes a 32bit base 128 variable-length integer.
         * @param {number} value Value to write
         * @param {number=} offset Offset to write to. Will use and increase {@link ByteBuffer#offset} by the number of bytes
         *  written if omitted.
         * @returns {!ByteBuffer|number} this if `offset` is omitted, else the actual number of bytes written
         * @expose
         */
        ByteBuffer.prototype.writeVarint32 = function(value, offset) {
            // <RELATIVE>
            var relative = typeof offset === 'undefined';
            if (relative) offset = this.offset;
            // </RELATIVE>
            if (!this.noAssert) {
                // <ASSERT_INTEGER>
                if (typeof value !== 'number' || value % 1 !== 0)
                    throw(new TypeError("Illegal value: "+value+" (not an integer)"));
                value |= 0;
                // </ASSERT_INTEGER>
                // <ASSERT_OFFSET>
                if (typeof offset !== 'number' || offset % 1 !== 0)
                    throw(new TypeError("Illegal offset: "+offset+" (not an integer)"));
                offset >>>= 0;
                if (offset < 0 || offset + 0 > this.buffer.byteLength)
                    throw(new RangeError("Illegal offset: 0 <= "+offset+" (+"+0+") <= "+this.buffer.byteLength));
                // </ASSERT_OFFSET>
            }
            var size = ByteBuffer.calculateVarint32(value),
                b;
            // <ENSURE_CAPACITY size=size>
            offset += size;
            var capacity10 = this.buffer.byteLength;
            if (offset > capacity10)
                this.resize((capacity10 *= 2) > offset ? capacity10 : offset);
            offset -= size;
            // </ENSURE_CAPACITY>
            // ref: http://code.google.com/searchframe#WTeibokF6gE/trunk/src/google/protobuf/io/coded_stream.cc
            this.view.setUint8(offset, b = value | 0x80);
            value >>>= 0;
            if (value >= 1 << 7) {
                b = (value >> 7) | 0x80;
                this.view.setUint8(offset+1, b);
                if (value >= 1 << 14) {
                    b = (value >> 14) | 0x80;
                    this.view.setUint8(offset+2, b);
                    if (value >= 1 << 21) {
                        b = (value >> 21) | 0x80;
                        this.view.setUint8(offset+3, b);
                        if (value >= 1 << 28) {
                            this.view.setUint8(offset+4, (value >> 28) & 0x7F);
                            size = 5;
                        } else {
                            this.view.setUint8(offset+3, b & 0x7F);
                            size = 4;
                        }
                    } else {
                        this.view.setUint8(offset+2, b & 0x7F);
                        size = 3;
                    }
                } else {
                    this.view.setUint8(offset+1, b & 0x7F);
                    size = 2;
                }
            } else {
                this.view.setUint8(offset, b & 0x7F);
                size = 1;
            }
            if (relative) {
                this.offset += size;
                return this;
            }
            return size;
        };

        /**
         * Writes a zig-zag encoded 32bit base 128 variable-length integer.
         * @param {number} value Value to write
         * @param {number=} offset Offset to write to. Will use and increase {@link ByteBuffer#offset} by the number of bytes
         *  written if omitted.
         * @returns {!ByteBuffer|number} this if `offset` is omitted, else the actual number of bytes written
         * @expose
         */
        ByteBuffer.prototype.writeVarint32ZigZag = function(value, offset) {
            return this.writeVarint32(ByteBuffer.zigZagEncode32(value), offset);
        };

        /**
         * Reads a 32bit base 128 variable-length integer.
         * @param {number=} offset Offset to read from. Will use and increase {@link ByteBuffer#offset} by the number of bytes
         *  written if omitted.
         * @returns {number|!{value: number, length: number}} The value read if offset is omitted, else the value read
         *  and the actual number of bytes read.
         * @throws {Error} If it's not a valid varint
         * @expose
         */
        ByteBuffer.prototype.readVarint32 = function(offset) {
            // <RELATIVE>
            var relative = typeof offset === 'undefined';
            if (relative) offset = this.offset;
            // </RELATIVE>
            if (!this.noAssert) {
                // <ASSERT_OFFSET>
                if (typeof offset !== 'number' || offset % 1 !== 0)
                    throw(new TypeError("Illegal offset: "+offset+" (not an integer)"));
                offset >>>= 0;
                if (offset < 0 || offset + 1 > this.buffer.byteLength)
                    throw(new RangeError("Illegal offset: 0 <= "+offset+" (+"+1+") <= "+this.buffer.byteLength));
                // </ASSERT_OFFSET>
            }
            // ref: src/google/protobuf/io/coded_stream.cc
            var size = 0,
                value = 0 >>> 0,
                temp;
            do {
                temp = this.view.getUint8(offset+size);
                if (size < 5)
                    value |= ((temp&0x7F)<<(7*size)) >>> 0;
                ++size;
            } while ((temp & 0x80) === 0x80);
            value = value | 0; // Make sure to discard the higher order bits
            if (relative) {
                this.offset += size;
                return value;
            }
            return {
                "value": value,
                "length": size
            };
        };

        /**
         * Reads a zig-zag encoded 32bit base 128 variable-length integer.
         * @param {number=} offset Offset to read from. Will use and increase {@link ByteBuffer#offset} by the number of bytes
         *  written if omitted.
         * @returns {number|!{value: number, length: number}} The value read if offset is omitted, else the value read
         *  and the actual number of bytes read.
         * @throws {Error} If it's not a valid varint
         * @expose
         */
        ByteBuffer.prototype.readVarint32ZigZag = function(offset) {
            var val = this.readVarint32(offset);
            if (typeof val === 'object')
                val["value"] = ByteBuffer.zigZagDecode32(val["value"]);
            else
                val = ByteBuffer.zigZagDecode32(val);
            return val;
        };

        // types/varints/varint64

        if (Long) {

            /**
             * Maximum number of bytes required to store a 64bit base 128 variable-length integer.
             * @type {number}
             * @const
             * @expose
             */
            ByteBuffer.MAX_VARINT64_BYTES = 10;

            /**
             * Calculates the actual number of bytes required to store a 64bit base 128 variable-length integer.
             * @param {number|!Long} value Value to encode
             * @returns {number} Number of bytes required. Capped to {@link ByteBuffer.MAX_VARINT64_BYTES}
             * @expose
             */
            ByteBuffer.calculateVarint64 = function(value) {
                // <LONG>
                if (typeof value === 'number')
                    value = Long.fromNumber(value);
                // </LONG>
                // ref: src/google/protobuf/io/coded_stream.cc
                var part0 = value.toInt() >>> 0,
                    part1 = value.shiftRightUnsigned(28).toInt() >>> 0,
                    part2 = value.shiftRightUnsigned(56).toInt() >>> 0;
                if (part2 == 0) {
                    if (part1 == 0) {
                        if (part0 < 1 << 14)
                            return part0 < 1 << 7 ? 1 : 2;
                        else
                            return part0 < 1 << 21 ? 3 : 4;
                    } else {
                        if (part1 < 1 << 14)
                            return part1 < 1 << 7 ? 5 : 6;
                        else
                            return part1 < 1 << 21 ? 7 : 8;
                    }
                } else
                    return part2 < 1 << 7 ? 9 : 10;
            };

            /**
             * Zigzag encodes a signed 64bit integer so that it can be effectively used with varint encoding.
             * @param {number|!Long} value Signed long
             * @returns {!Long} Unsigned zigzag encoded long
             * @expose
             */
            ByteBuffer.zigZagEncode64 = function(value) {
                // <LONG unsigned=false>
                if (typeof value === 'number')
                    value = Long.fromNumber(value, false);
                else if (value.unsigned !== false) value = value.toSigned();
                // </LONG>
                // ref: src/google/protobuf/wire_format_lite.h
                return value.shiftLeft(1).xor(value.shiftRight(63)).toUnsigned();
            };

            /**
             * Decodes a zigzag encoded signed 64bit integer.
             * @param {!Long|number} value Unsigned zigzag encoded long or JavaScript number
             * @returns {!Long} Signed long
             * @expose
             */
            ByteBuffer.zigZagDecode64 = function(value) {
                // <LONG unsigned=false>
                if (typeof value === 'number')
                    value = Long.fromNumber(value, false);
                else if (value.unsigned !== false) value = value.toSigned();
                // </LONG>
                // ref: src/google/protobuf/wire_format_lite.h
                return value.shiftRightUnsigned(1).xor(value.and(Long.ONE).toSigned().negate()).toSigned();
            };

            /**
             * Writes a 64bit base 128 variable-length integer.
             * @param {number|Long} value Value to write
             * @param {number=} offset Offset to write to. Will use and increase {@link ByteBuffer#offset} by the number of bytes
             *  written if omitted.
             * @returns {!ByteBuffer|number} `this` if offset is omitted, else the actual number of bytes written.
             * @expose
             */
            ByteBuffer.prototype.writeVarint64 = function(value, offset) {
                // <RELATIVE>
                var relative = typeof offset === 'undefined';
                if (relative) offset = this.offset;
                // </RELATIVE>
                if (!this.noAssert) {
                    // <ASSERT_LONG>
                    if (typeof value === 'number' && value % 1 === 0)
                        value |= 0;
                    else if (!(value && value instanceof Long))
                        throw(new TypeError("Illegal value: "+value+" (not an integer or Long)"));
                    // </ASSERT_LONG>
                    // <ASSERT_OFFSET>
                    if (typeof offset !== 'number' || offset % 1 !== 0)
                        throw(new TypeError("Illegal offset: "+offset+" (not an integer)"));
                    offset >>>= 0;
                    if (offset < 0 || offset + 0 > this.buffer.byteLength)
                        throw(new RangeError("Illegal offset: 0 <= "+offset+" (+"+0+") <= "+this.buffer.byteLength));
                    // </ASSERT_OFFSET>
                }
                // <LONG unsigned=false>
                if (typeof value === 'number')
                    value = Long.fromNumber(value, false);
                else if (value.unsigned !== false) value = value.toSigned();
                // </LONG>
                var size = ByteBuffer.calculateVarint64(value),
                    part0 = value.toInt() >>> 0,
                    part1 = value.shiftRightUnsigned(28).toInt() >>> 0,
                    part2 = value.shiftRightUnsigned(56).toInt() >>> 0;
                // <ENSURE_CAPACITY size=size>
                offset += size;
                var capacity11 = this.buffer.byteLength;
                if (offset > capacity11)
                    this.resize((capacity11 *= 2) > offset ? capacity11 : offset);
                offset -= size;
                // </ENSURE_CAPACITY>
                switch (size) {
                    case 10: this.view.setUint8(offset+9, (part2 >>>  7) | 0x80);
                    case 9 : this.view.setUint8(offset+8, (part2       ) | 0x80);
                    case 8 : this.view.setUint8(offset+7, (part1 >>> 21) | 0x80);
                    case 7 : this.view.setUint8(offset+6, (part1 >>> 14) | 0x80);
                    case 6 : this.view.setUint8(offset+5, (part1 >>>  7) | 0x80);
                    case 5 : this.view.setUint8(offset+4, (part1       ) | 0x80);
                    case 4 : this.view.setUint8(offset+3, (part0 >>> 21) | 0x80);
                    case 3 : this.view.setUint8(offset+2, (part0 >>> 14) | 0x80);
                    case 2 : this.view.setUint8(offset+1, (part0 >>>  7) | 0x80);
                    case 1 : this.view.setUint8(offset  , (part0       ) | 0x80);
                }
                offset += size-1;
                this.view.setUint8(offset, this.view.getUint8(offset) & 0x7F);
                if (relative) {
                    this.offset += size;
                    return this;
                } else {
                    return size;
                }
            };

            /**
             * Writes a zig-zag encoded 64bit base 128 variable-length integer.
             * @param {number|Long} value Value to write
             * @param {number=} offset Offset to write to. Will use and increase {@link ByteBuffer#offset} by the number of bytes
             *  written if omitted.
             * @returns {!ByteBuffer|number} `this` if offset is omitted, else the actual number of bytes written.
             * @expose
             */
            ByteBuffer.prototype.writeVarint64ZigZag = function(value, offset) {
                return this.writeVarint64(ByteBuffer.zigZagEncode64(value), offset);
            };

            /**
             * Reads a 64bit base 128 variable-length integer. Requires Long.js.
             * @param {number=} offset Offset to read from. Will use and increase {@link ByteBuffer#offset} by the number of bytes
             *  read if omitted.
             * @returns {!Long|!{value: Long, length: number}} The value read if offset is omitted, else the value read and
             *  the actual number of bytes read.
             * @throws {Error} If it's not a valid varint
             * @expose
             */
            ByteBuffer.prototype.readVarint64 = function(offset) {
                // <RELATIVE>
                var relative = typeof offset === 'undefined';
                if (relative) offset = this.offset;
                // </RELATIVE>
                if (!this.noAssert) {
                    // <ASSERT_OFFSET>
                    if (typeof offset !== 'number' || offset % 1 !== 0)
                        throw(new TypeError("Illegal offset: "+offset+" (not an integer)"));
                    offset >>>= 0;
                    if (offset < 0 || offset + 1 > this.buffer.byteLength)
                        throw(new RangeError("Illegal offset: 0 <= "+offset+" (+"+1+") <= "+this.buffer.byteLength));
                    // </ASSERT_OFFSET>
                }
                // ref: src/google/protobuf/io/coded_stream.cc
                var start = offset,
                    part0 = 0,
                    part1 = 0,
                    part2 = 0,
                    b  = 0;
                b = this.view.getUint8(offset++); part0  = (b & 0x7F)      ; if (b & 0x80) {
                b = this.view.getUint8(offset++); part0 |= (b & 0x7F) <<  7; if (b & 0x80) {
                b = this.view.getUint8(offset++); part0 |= (b & 0x7F) << 14; if (b & 0x80) {
                b = this.view.getUint8(offset++); part0 |= (b & 0x7F) << 21; if (b & 0x80) {
                b = this.view.getUint8(offset++); part1  = (b & 0x7F)      ; if (b & 0x80) {
                b = this.view.getUint8(offset++); part1 |= (b & 0x7F) <<  7; if (b & 0x80) {
                b = this.view.getUint8(offset++); part1 |= (b & 0x7F) << 14; if (b & 0x80) {
                b = this.view.getUint8(offset++); part1 |= (b & 0x7F) << 21; if (b & 0x80) {
                b = this.view.getUint8(offset++); part2  = (b & 0x7F)      ; if (b & 0x80) {
                b = this.view.getUint8(offset++); part2 |= (b & 0x7F) <<  7; if (b & 0x80) {
                throw(new Error("Data must be corrupt: Buffer overrun")); }}}}}}}}}}
                var value = Long.from28Bits(part0, part1, part2, false);
                if (relative) {
                    this.offset = offset;
                    return value;
                } else {
                    return {
                        'value': value,
                        'length': offset-start
                    };
                }
            };

            /**
             * Reads a zig-zag encoded 64bit base 128 variable-length integer. Requires Long.js.
             * @param {number=} offset Offset to read from. Will use and increase {@link ByteBuffer#offset} by the number of bytes
             *  read if omitted.
             * @returns {!Long|!{value: Long, length: number}} The value read if offset is omitted, else the value read and
             *  the actual number of bytes read.
             * @throws {Error} If it's not a valid varint
             * @expose
             */
            ByteBuffer.prototype.readVarint64ZigZag = function(offset) {
                var val = this.readVarint64(offset);
                if (typeof val === 'object')
                    val["value"] = ByteBuffer.zigZagDecode64(val["value"]);
                else
                    val = ByteBuffer.zigZagDecode64(val);
                return val;
            };

        } // Long


        // types/strings/cstring

        /**
         * Writes a NULL-terminated UTF8 encoded string. For this to work the specified string must not contain any NULL
         *  characters itself.
         * @param {string} str String to write
         * @param {number=} offset Offset to write to. Will use and increase {@link ByteBuffer#offset} by the number of bytes
         *  contained in `str` + 1 if omitted.
         * @returns {!ByteBuffer|number} this if offset is omitted, else the actual number of bytes written
         * @expose
         */
        ByteBuffer.prototype.writeCString = function(str, offset) {
            // <RELATIVE>
            var relative = typeof offset === 'undefined';
            if (relative) offset = this.offset;
            // </RELATIVE>
            var i,
                k = str.length;
            if (!this.noAssert) {
                if (typeof str !== 'string')
                    throw(new TypeError("Illegal str: Not a string"));
                for (i=0; i<k; ++i) {
                    if (str.codePointAt(i) === 0)
                        throw(new RangeError("Illegal str: Contains NULL-characters"));
                }
                // <ASSERT_OFFSET>
                if (typeof offset !== 'number' || offset % 1 !== 0)
                    throw(new TypeError("Illegal offset: "+offset+" (not an integer)"));
                offset >>>= 0;
                if (offset < 0 || offset + 0 > this.buffer.byteLength)
                    throw(new RangeError("Illegal offset: 0 <= "+offset+" (+"+0+") <= "+this.buffer.byteLength));
                // </ASSERT_OFFSET>
            }
            var start = offset;
            // UTF8 strings do not contain zero bytes in between except for the zero character, so:
            k = utf8_calc_string(str);
            // <ENSURE_CAPACITY size=k+1>
            offset += k+1;
            var capacity12 = this.buffer.byteLength;
            if (offset > capacity12)
                this.resize((capacity12 *= 2) > offset ? capacity12 : offset);
            offset -= k+1;
            // </ENSURE_CAPACITY>
            for (i=0, k=str.length; i<k; ++i)
                offset += utf8_encode_char(str.codePointAt(i), this, offset);
            this.view.setUint8(offset++, 0);
            if (relative) {
                this.offset = offset;
                return this;
            }
            return offset - start;
        };

        /**
         * Reads a NULL-terminated UTF8 encoded string. For this to work the string read must not contain any NULL characters
         *  itself.
         * @param {number=} offset Offset to read from. Will use and increase {@link ByteBuffer#offset} by the number of bytes
         *  read if omitted.
         * @returns {string|!{string: string, length: number}} The string read if offset is omitted, else the string
         *  read and the actual number of bytes read.
         * @expose
         */
        ByteBuffer.prototype.readCString = function(offset) {
            // <RELATIVE>
            var relative = typeof offset === 'undefined';
            if (relative) offset = this.offset;
            // </RELATIVE>
            if (!this.noAssert) {
                // <ASSERT_OFFSET>
                if (typeof offset !== 'number' || offset % 1 !== 0)
                    throw(new TypeError("Illegal offset: "+offset+" (not an integer)"));
                offset >>>= 0;
                if (offset < 0 || offset + 1 > this.buffer.byteLength)
                    throw(new RangeError("Illegal offset: 0 <= "+offset+" (+"+1+") <= "+this.buffer.byteLength));
                // </ASSERT_OFFSET>
            }
            var start = offset,
                temp;
            // UTF8 strings do not contain zero bytes in between except for the zero character itself, so:
            var out = [];
            do {
                temp = utf8_decode_char(this, offset);
                offset += temp['length'];
                if (temp['codePoint'] === 0) break;
                out.push(temp['codePoint']);
            } while (true);
            if (relative) {
                this.offset = offset;
                return String.fromCodePoint.apply(String, out);
            } else {
                return {
                    "string": String.fromCodePoint.apply(String, out),
                    "length": offset - start
                };
            }
        };

        // types/strings/istring

        /**
         * Writes a length as uint32 prefixed UTF8 encoded string.
         * @param {string} str String to write
         * @param {number=} offset Offset to write to. Will use and increase {@link ByteBuffer#offset} by the number of bytes
         *  written if omitted.
         * @returns {!ByteBuffer|number} `this` if `offset` is omitted, else the actual number of bytes written
         * @expose
         * @see ByteBuffer#writeVarint32
         */
        ByteBuffer.prototype.writeIString = function(str, offset) {
            // <RELATIVE>
            var relative = typeof offset === 'undefined';
            if (relative) offset = this.offset;
            // </RELATIVE>
            if (!this.noAssert) {
                if (typeof str !== 'string')
                    throw(new TypeError("Illegal str: Not a string"));
                // <ASSERT_OFFSET>
                if (typeof offset !== 'number' || offset % 1 !== 0)
                    throw(new TypeError("Illegal offset: "+offset+" (not an integer)"));
                offset >>>= 0;
                if (offset < 0 || offset + 0 > this.buffer.byteLength)
                    throw(new RangeError("Illegal offset: 0 <= "+offset+" (+"+0+") <= "+this.buffer.byteLength));
                // </ASSERT_OFFSET>
            }
            var start = offset,
                k;
            k = utf8_calc_string(str);
            // <ENSURE_CAPACITY size=4+k>
            offset += 4+k;
            var capacity13 = this.buffer.byteLength;
            if (offset > capacity13)
                this.resize((capacity13 *= 2) > offset ? capacity13 : offset);
            offset -= 4+k;
            // </ENSURE_CAPACITY>
            this.view.setUint32(offset, k, this.littleEndian);
            offset += 4;
            k = str.length;
            for (var i=0; i<k; ++i) {
                offset += utf8_encode_char(str.codePointAt(i), this, offset);
            }
            if (relative) {
                this.offset = offset;
                return this;
            }
            return offset - start;
        };

        /**
         * Reads a length as uint32 prefixed UTF8 encoded string.
         * @param {number=} offset Offset to read from. Will use and increase {@link ByteBuffer#offset} by the number of bytes
         *  read if omitted.
         * @returns {string|!{string: string, length: number}} The string read if offset is omitted, else the string
         *  read and the actual number of bytes read.
         * @expose
         * @see ByteBuffer#readVarint32
         */
        ByteBuffer.prototype.readIString = function(offset) {
            // <RELATIVE>
            var relative = typeof offset === 'undefined';
            if (relative) offset = this.offset;
            // </RELATIVE>
            if (!this.noAssert) {
                // <ASSERT_OFFSET>
                if (typeof offset !== 'number' || offset % 1 !== 0)
                    throw(new TypeError("Illegal offset: "+offset+" (not an integer)"));
                offset >>>= 0;
                if (offset < 0 || offset + 4 > this.buffer.byteLength)
                    throw(new RangeError("Illegal offset: 0 <= "+offset+" (+"+4+") <= "+this.buffer.byteLength));
                // </ASSERT_OFFSET>
            }
            var temp = 0,
                start = offset,
                str;
            temp = this.view.getUint32(offset, this.littleEndian);
            offset += 4;
            var k = offset + temp,
                out = [];
            while (offset < k) {
                temp = utf8_decode_char(this, offset);
                offset += temp['length'];
                out.push(temp['codePoint']);
            }
            str = String.fromCodePoint.apply(String, out);
            if (relative) {
                this.offset = offset;
                return str;
            } else {
                return {
                    'string': str,
                    'length': offset - start
                };
            }
        };

        // types/strings/utf8string

        /**
         * Metrics representing number of UTF8 characters. Evaluates to `1`.
         * @type {number}
         * @const
         * @expose
         */
        ByteBuffer.METRICS_CHARS = 'c';

        /**
         * Metrics representing number of bytes. Evaluates to `2`.
         * @type {number}
         * @const
         * @expose
         */
        ByteBuffer.METRICS_BYTES = 'b';

        /**
         * Writes an UTF8 encoded string.
         * @param {string} str String to write
         * @param {number=} offset Offset to write to. Will use and increase {@link ByteBuffer#offset} if omitted.
         * @returns {!ByteBuffer|number} this if offset is omitted, else the actual number of bytes written.
         * @expose
         */
        ByteBuffer.prototype.writeUTF8String = function(str, offset) {
            // <RELATIVE>
            var relative = typeof offset === 'undefined';
            if (relative) offset = this.offset;
            // </RELATIVE>
            if (!this.noAssert) {
                // <ASSERT_OFFSET>
                if (typeof offset !== 'number' || offset % 1 !== 0)
                    throw(new TypeError("Illegal offset: "+offset+" (not an integer)"));
                offset >>>= 0;
                if (offset < 0 || offset + 0 > this.buffer.byteLength)
                    throw(new RangeError("Illegal offset: 0 <= "+offset+" (+"+0+") <= "+this.buffer.byteLength));
                // </ASSERT_OFFSET>
            }
            var k;
            var start = offset,
                i = 0, cp;
            k = utf8_calc_string(str);
            // <ENSURE_CAPACITY size=k>
            offset += k;
            var capacity14 = this.buffer.byteLength;
            if (offset > capacity14)
                this.resize((capacity14 *= 2) > offset ? capacity14 : offset);
            offset -= k;
            // </ENSURE_CAPACITY>
            while (i < str.length) {
                offset += utf8_encode_char(cp = str.codePointAt(i), this, offset);
                i += cp < 0xFFFF ? 1 : 2;
            }
            if (relative) {
                this.offset = offset;
                return this;
            }
            return offset - start;
        };

        /**
         * Writes an UTF8 encoded string. This is an alias of {@link ByteBuffer#writeUTF8String}.
         * @function
         * @param {string} str String to write
         * @param {number=} offset Offset to write to. Will use and increase {@link ByteBuffer#offset} if omitted.
         * @returns {!ByteBuffer|number} this if offset is omitted, else the actual number of bytes written.
         * @expose
         */
        ByteBuffer.prototype.writeString = ByteBuffer.prototype.writeUTF8String;

        /**
         * Calculates the number of UTF8 characters of a string. JavaScript itself uses UTF-16, so that a string's
         *  `length` property does not reflect its actual UTF8 size if it contains code points larger than 0xFFFF.
         * @function
         * @param {string} str String to calculate
         * @returns {number} Number of UTF8 characters
         * @expose
         */
        ByteBuffer.calculateUTF8Chars = function(str) {
            var i = 0, n = 0;
            while (i < str.length) {
                i += str.codePointAt(i) < 0xFFFF ? 1 : 2;
                ++n;
            }
            return n;
        };

        /**
         * Calculates the number of UTF8 bytes of a string.
         * @param {string} str String to calculate
         * @returns {number} Number of UTF8 bytes
         * @expose
         */
        ByteBuffer.calculateUTF8Bytes = function(str) {
            return utf8_calc_string(str);
        };

        /**
         * Reads an UTF8 encoded string.
         * @param {number} length Number of characters or bytes to read
         * @param {number=} metrics Metrics specifying what `n` is meant to count. Defaults to
         *  {@link ByteBuffer.METRICS_CHARS}.
         * @param {number=} offset Offset to read from. Will use and increase {@link ByteBuffer#offset} by the number of bytes
         *  read if omitted.
         * @returns {string|!{string: string, length: number}} The string read if offset is omitted, else the string
         *  read and the actual number of bytes read.
         * @expose
         */
        ByteBuffer.prototype.readUTF8String = function(length, metrics, offset) {
            if (typeof metrics === 'number') {
                offset = metrics;
                metrics = undefined;
            }
            // <RELATIVE>
            var relative = typeof offset === 'undefined';
            if (relative) offset = this.offset;
            // </RELATIVE>
            if (typeof metrics === 'undefined') metrics = ByteBuffer.METRICS_CHARS;
            if (!this.noAssert) {
                // <ASSERT_INTEGER>
                if (typeof length !== 'number' || length % 1 !== 0)
                    throw(new TypeError("Illegal length: "+length+" (not an integer)"));
                length |= 0;
                // </ASSERT_INTEGER>
                // <ASSERT_OFFSET>
                if (typeof offset !== 'number' || offset % 1 !== 0)
                    throw(new TypeError("Illegal offset: "+offset+" (not an integer)"));
                offset >>>= 0;
                if (offset < 0 || offset + 0 > this.buffer.byteLength)
                    throw(new RangeError("Illegal offset: 0 <= "+offset+" (+"+0+") <= "+this.buffer.byteLength));
                // </ASSERT_OFFSET>
            }
            var out,
                i = 0,
                start = offset,
                temp;
            if (metrics === ByteBuffer.METRICS_CHARS) { // The same for node and the browser
                out = [];
                while (i < length) {
                    temp = utf8_decode_char(this, offset);
                    offset += temp['length'];
                    out.push(temp['codePoint']);
                    ++i;
                }
                if (relative) {
                    this.offset = offset;
                    return String.fromCodePoint.apply(String, out);
                } else {
                    return {
                        "string": String.fromCodePoint.apply(String, out),
                        "length": offset - start
                    };
                }
            } else if (metrics === ByteBuffer.METRICS_BYTES) {
                if (!this.noAssert) {
                    // <ASSERT_OFFSET>
                    if (typeof offset !== 'number' || offset % 1 !== 0)
                        throw(new TypeError("Illegal offset: "+offset+" (not an integer)"));
                    offset >>>= 0;
                    if (offset < 0 || offset + length > this.buffer.byteLength)
                        throw(new RangeError("Illegal offset: 0 <= "+offset+" (+"+length+") <= "+this.buffer.byteLength));
                    // </ASSERT_OFFSET>
                }
                var k = offset + length;
                out = [];
                while (offset < k) {
                    temp = utf8_decode_char(this, offset);
                    offset += temp['length'];
                    out.push(temp['codePoint']);
                }
                if (offset !== k)
                    throw(new RangeError("Illegal range: Truncated character at "+k));
                if (relative) {
                    this.offset = offset;
                    return String.fromCodePoint.apply(String, out);
                } else {
                    return {
                        'string': String.fromCodePoint.apply(String, out),
                        'length': offset - start
                    };
                }
            } else
                throw(new TypeError("Unsupported metrics: "+metrics));
        };

        /**
         * Reads an UTF8 encoded string. This is an alias of {@link ByteBuffer#readUTF8String}.
         * @function
         * @param {number} length Number of characters or bytes to read
         * @param {number=} metrics Metrics specifying what `n` is meant to count. Defaults to
         *  {@link ByteBuffer.METRICS_CHARS}.
         * @param {number=} offset Offset to read from. Will use and increase {@link ByteBuffer#offset} by the number of bytes
         *  read if omitted.
         * @returns {string|!{string: string, length: number}} The string read if offset is omitted, else the string
         *  read and the actual number of bytes read.
         * @expose
         */
        ByteBuffer.prototype.readString = ByteBuffer.prototype.readUTF8String;

        // types/strings/vstring

        /**
         * Writes a length as varint32 prefixed UTF8 encoded string.
         * @param {string} str String to write
         * @param {number=} offset Offset to write to. Will use and increase {@link ByteBuffer#offset} by the number of bytes
         *  written if omitted.
         * @returns {!ByteBuffer|number} `this` if `offset` is omitted, else the actual number of bytes written
         * @expose
         * @see ByteBuffer#writeVarint32
         */
        ByteBuffer.prototype.writeVString = function(str, offset) {
            // <RELATIVE>
            var relative = typeof offset === 'undefined';
            if (relative) offset = this.offset;
            // </RELATIVE>
            if (!this.noAssert) {
                if (typeof str !== 'string')
                    throw(new TypeError("Illegal str: Not a string"));
                // <ASSERT_OFFSET>
                if (typeof offset !== 'number' || offset % 1 !== 0)
                    throw(new TypeError("Illegal offset: "+offset+" (not an integer)"));
                offset >>>= 0;
                if (offset < 0 || offset + 0 > this.buffer.byteLength)
                    throw(new RangeError("Illegal offset: 0 <= "+offset+" (+"+0+") <= "+this.buffer.byteLength));
                // </ASSERT_OFFSET>
            }
            var start = offset,
                k, l;
            l = ByteBuffer.calculateVarint32(k);
            k = utf8_calc_string(str);
            // <ENSURE_CAPACITY size=l+k>
            offset += l+k;
            var capacity15 = this.buffer.byteLength;
            if (offset > capacity15)
                this.resize((capacity15 *= 2) > offset ? capacity15 : offset);
            offset -= l+k;
            // </ENSURE_CAPACITY>
            offset += this.writeVarint32(k, offset);
            k = str.length;
            for (var i=0; i<k; ++i) {
                offset += utf8_encode_char(str.codePointAt(i), this, offset);
            }
            if (relative) {
                this.offset = offset;
                return this;
            }
            return offset - start;
        };

        /**
         * Reads a length as varint32 prefixed UTF8 encoded string.
         * @param {number=} offset Offset to read from. Will use and increase {@link ByteBuffer#offset} by the number of bytes
         *  read if omitted.
         * @returns {string|!{string: string, length: number}} The string read if offset is omitted, else the string
         *  read and the actual number of bytes read.
         * @expose
         * @see ByteBuffer#readVarint32
         */
        ByteBuffer.prototype.readVString = function(offset) {
            // <RELATIVE>
            var relative = typeof offset === 'undefined';
            if (relative) offset = this.offset;
            // </RELATIVE>
            if (!this.noAssert) {
                // <ASSERT_OFFSET>
                if (typeof offset !== 'number' || offset % 1 !== 0)
                    throw(new TypeError("Illegal offset: "+offset+" (not an integer)"));
                offset >>>= 0;
                if (offset < 0 || offset + 1 > this.buffer.byteLength)
                    throw(new RangeError("Illegal offset: 0 <= "+offset+" (+"+1+") <= "+this.buffer.byteLength));
                // </ASSERT_OFFSET>
            }
            var temp = this.readVarint32(offset),
                start = offset,
                str;
            offset += temp['length'];
            temp = temp['value'];
            var k = offset + temp,
                out = [];
            while (offset < k) {
                temp = utf8_decode_char(this, offset);
                offset += temp['length'];
                out.push(temp['codePoint']);
            }
            str = String.fromCodePoint.apply(String, out);
            if (relative) {
                this.offset = offset;
                return str;
            } else {
                return {
                    'string': str,
                    'length': offset - start
                };
            }
        };


        /**
         * Appends some data to this ByteBuffer. This will overwrite any contents behind the specified offset up to the appended
         *  data's length.
         * @param {!ByteBuffer|!ArrayBuffer|!Uint8Array|string} source Data to append. If `source` is a ByteBuffer, its offsets
         *  will be modified according to the performed read operation.
         * @param {(string|number)=} encoding Encoding if `data` is a string ("base64", "hex", "binary", defaults to "utf8")
         * @param {number=} offset Offset to append at. Will use and increase {@link ByteBuffer#offset} by the number of bytes
         *  read if omitted.
         * @returns {!ByteBuffer} this
         * @expose
         * @example `A relative `<01 02>03.append(<04 05>)` will result in `<01 02 04 05>, 04 05|`
         * @example `An absolute `<01 02>03.append(04 05>, 1)` will result in `<01 04>05, 04 05|`
         */
        ByteBuffer.prototype.append = function(source, encoding, offset) {
            if (typeof encoding === 'number' || typeof encoding !== 'string') {
                offset = encoding;
                encoding = undefined;
            }
            // <RELATIVE>
            var relative = typeof offset === 'undefined';
            if (relative) offset = this.offset;
            // </RELATIVE>
            if (!this.noAssert) {
                // <ASSERT_OFFSET>
                if (typeof offset !== 'number' || offset % 1 !== 0)
                    throw(new TypeError("Illegal offset: "+offset+" (not an integer)"));
                offset >>>= 0;
                if (offset < 0 || offset + 0 > this.buffer.byteLength)
                    throw(new RangeError("Illegal offset: 0 <= "+offset+" (+"+0+") <= "+this.buffer.byteLength));
                // </ASSERT_OFFSET>
            }
            if (!(source instanceof ByteBuffer))
                source = ByteBuffer.wrap(source, encoding);
            var length = source.limit - source.offset;
            if (length <= 0) return this; // Nothing to append
            // <ENSURE_CAPACITY size=length>
            offset += length;
            var capacity16 = this.buffer.byteLength;
            if (offset > capacity16)
                this.resize((capacity16 *= 2) > offset ? capacity16 : offset);
            offset -= length;
            // </ENSURE_CAPACITY>
            new Uint8Array(this.buffer, offset).set(new Uint8Array(source.buffer).subarray(source.offset, source.limit));
            source.offset += length;
            // <RELATIVE size=length>
            if (relative) this.offset += length;
            // </RELATIVE>
            return this;
        };

        /**
         * Appends this ByteBuffer's contents to another ByteBuffer. This will overwrite any contents behind the specified
         *  offset up to the length of this ByteBuffer's data.
         * @param {!ByteBuffer} target Target ByteBuffer
         * @param {number=} offset Offset to append to. Will use and increase {@link ByteBuffer#offset} by the number of bytes
         *  read if omitted.
         * @returns {!ByteBuffer} this
         * @expose
         * @see ByteBuffer#append
         */
        ByteBuffer.prototype.appendTo = function(target, offset) {
            target.append(this, offset);
            return this;
        };

        /**
         * Enables or disables assertions of argument types and offsets. Assertions are enabled by default but you can opt to
         *  disable them if your code already makes sure that everything is valid.
         * @param {boolean} assert `true` to enable assertions, otherwise `false`
         * @returns {!ByteBuffer} this
         * @expose
         */
        ByteBuffer.prototype.assert = function(assert) {
            this.noAssert = !assert;
            return this;
        };

        /**
         * Gets the capacity of this ByteBuffer's backing buffer.
         * @returns {number} Capacity of the backing buffer
         * @expose
         */
        ByteBuffer.prototype.capacity = function() {
            return this.buffer.byteLength;
        };

        /**
         * Clears this ByteBuffer's offsets by setting {@link ByteBuffer#offset} to `0` and {@link ByteBuffer#limit} to the
         *  backing buffer's capacity. Discards {@link ByteBuffer#markedOffset}.
         * @returns {!ByteBuffer} this
         * @expose
         */
        ByteBuffer.prototype.clear = function() {
            this.offset = 0;
            this.limit = this.buffer.byteLength;
            this.markedOffset = -1;
            return this;
        };

        /**
         * Creates a cloned instance of this ByteBuffer, preset with this ByteBuffer's values for {@link ByteBuffer#offset},
         *  {@link ByteBuffer#markedOffset} and {@link ByteBuffer#limit}.
         * @param {boolean=} copy Whether to copy the backing buffer or to return another view on the same, defaults to `false`
         * @returns {!ByteBuffer} Cloned instance
         * @expose
         */
        ByteBuffer.prototype.clone = function(copy) {
            var bb = new ByteBuffer(0, this.littleEndian, this.noAssert);
            if (copy) {
                var buffer = new ArrayBuffer(this.buffer.byteLength);
                new Uint8Array(buffer).set(this.buffer);
                bb.buffer = buffer;
                bb.view = new DataView(buffer);
            } else {
                bb.buffer = this.buffer;
                bb.view = this.view;
            }
            bb.offset = this.offset;
            bb.markedOffset = this.markedOffset;
            bb.limit = this.limit;
            return bb;
        };

        /**
         * Compacts this ByteBuffer to be backed by a {@link ByteBuffer#buffer} of its contents' length. Contents are the bytes
         *  between {@link ByteBuffer#offset} and {@link ByteBuffer#limit}. Will set `offset = 0` and `limit = capacity` and
         *  adapt {@link ByteBuffer#markedOffset} to the same relative position if set.
         * @param {number=} begin Offset to start at, defaults to {@link ByteBuffer#offset}
         * @param {number=} end Offset to end at, defaults to {@link ByteBuffer#limit}
         * @returns {!ByteBuffer} this
         * @expose
         */
        ByteBuffer.prototype.compact = function(begin, end) {
            if (typeof begin === 'undefined') begin = this.offset;
            if (typeof end === 'undefined') end = this.limit;
            if (!this.noAssert) {
                // <ASSERT_RANGE>
                if (typeof begin !== 'number' || begin % 1 !== 0)
                    throw(new TypeError("Illegal begin: Not an integer"));
                begin >>>= 0;
                if (typeof end !== 'number' || end % 1 !== 0)
                    throw(new TypeError("Illegal end: Not an integer"));
                end >>>= 0;
                if (begin < 0 || begin > end || end > this.buffer.byteLength)
                    throw(new RangeError("Illegal range: 0 <= "+begin+" <= "+end+" <= "+this.buffer.byteLength));
                // </ASSERT_RANGE>
            }
            if (begin === 0 && end === this.buffer.byteLength)
                return this; // Already compacted
            var len = end - begin;
            if (len === 0) {
                this.buffer = EMPTY_BUFFER;
                this.view = null;
                if (this.markedOffset >= 0) this.markedOffset -= begin;
                this.offset = 0;
                this.limit = 0;
                return this;
            }
            var buffer = new ArrayBuffer(len);
            new Uint8Array(buffer).set(new Uint8Array(this.buffer).subarray(begin, end));
            this.buffer = buffer;
            this.view = new DataView(buffer);
            if (this.markedOffset >= 0) this.markedOffset -= begin;
            this.offset = 0;
            this.limit = len;
            return this;
        };

        /**
         * Creates a copy of this ByteBuffer's contents. Contents are the bytes between {@link ByteBuffer#offset} and
         *  {@link ByteBuffer#limit}.
         * @param {number=} begin Begin offset, defaults to {@link ByteBuffer#offset}.
         * @param {number=} end End offset, defaults to {@link ByteBuffer#limit}.
         * @returns {!ByteBuffer} Copy
         * @expose
         */
        ByteBuffer.prototype.copy = function(begin, end) {
            if (typeof begin === 'undefined') begin = this.offset;
            if (typeof end === 'undefined') end = this.limit;
            if (!this.noAssert) {
                // <ASSERT_RANGE>
                if (typeof begin !== 'number' || begin % 1 !== 0)
                    throw(new TypeError("Illegal begin: Not an integer"));
                begin >>>= 0;
                if (typeof end !== 'number' || end % 1 !== 0)
                    throw(new TypeError("Illegal end: Not an integer"));
                end >>>= 0;
                if (begin < 0 || begin > end || end > this.buffer.byteLength)
                    throw(new RangeError("Illegal range: 0 <= "+begin+" <= "+end+" <= "+this.buffer.byteLength));
                // </ASSERT_RANGE>
            }
            if (begin === end)
                return new ByteBuffer(0, this.littleEndian, this.noAssert);
            var capacity = end - begin,
                bb = new ByteBuffer(capacity, this.littleEndian, this.noAssert);
            bb.offset = 0;
            bb.limit = capacity;
            if (bb.markedOffset >= 0) bb.markedOffset -= begin;
            this.copyTo(bb, 0, begin, end);
            return bb;
        };

        /**
         * Copies this ByteBuffer's contents to another ByteBuffer. Contents are the bytes between {@link ByteBuffer#offset} and
         *  {@link ByteBuffer#limit}.
         * @param {!ByteBuffer} target Target ByteBuffer
         * @param {number=} targetOffset Offset to copy to. Will use and increase the target's {@link ByteBuffer#offset}
         *  by the number of bytes copied if omitted.
         * @param {number=} sourceOffset Offset to start copying from. Will use and increase {@link ByteBuffer#offset} by the
         *  number of bytes copied if omitted.
         * @param {number=} sourceLimit Offset to end copying from, defaults to {@link ByteBuffer#limit}
         * @returns {!ByteBuffer} this
         * @expose
         */
        ByteBuffer.prototype.copyTo = function(target, targetOffset, sourceOffset, sourceLimit) {
            var relative,
                targetRelative;
            if (!this.noAssert) {
                if (!ByteBuffer.isByteBuffer(target))
                    throw(new TypeError("Illegal target: Not a ByteBuffer"));
            }
            targetOffset = (targetRelative = typeof targetOffset === 'undefined') ? target.offset : targetOffset | 0;
            sourceOffset = (relative = typeof sourceOffset === 'undefined') ? this.offset : sourceOffset | 0;
            sourceLimit = typeof sourceLimit === 'undefined' ? this.limit : sourceLimit | 0;

            if (targetOffset < 0 || targetOffset > target.buffer.byteLength)
                throw(new RangeError("Illegal target range: 0 <= "+targetOffset+" <= "+target.buffer.byteLength));
            if (sourceOffset < 0 || sourceLimit > this.buffer.byteLength)
                throw(new RangeError("Illegal source range: 0 <= "+sourceOffset+" <= "+this.buffer.byteLength));

            var len = sourceLimit - sourceOffset;
            if (len === 0)
                return target; // Nothing to copy

            target.ensureCapacity(targetOffset + len);

            new Uint8Array(target.buffer).set(new Uint8Array(this.buffer).subarray(sourceOffset, sourceLimit), targetOffset);

            if (relative) this.offset += len;
            if (targetRelative) target.offset += len;

            return this;
        };

        /**
         * Makes sure that this ByteBuffer is backed by a {@link ByteBuffer#buffer} of at least the specified capacity. If the
         *  current capacity is exceeded, it will be doubled. If double the current capacity is less than the required capacity,
         *  the required capacity will be used instead.
         * @param {number} capacity Required capacity
         * @returns {!ByteBuffer} this
         * @expose
         */
        ByteBuffer.prototype.ensureCapacity = function(capacity) {
            var current = this.buffer.byteLength;
            if (current < capacity)
                return this.resize((current *= 2) > capacity ? current : capacity);
            return this;
        };

        /**
         * Overwrites this ByteBuffer's contents with the specified value. Contents are the bytes between
         *  {@link ByteBuffer#offset} and {@link ByteBuffer#limit}.
         * @param {number|string} value Byte value to fill with. If given as a string, the first character is used.
         * @param {number=} begin Begin offset, defaults to {@link ByteBuffer#offset}.
         * @param {number=} end End offset, defaults to {@link ByteBuffer#limit}.
         * @returns {!ByteBuffer} this
         * @expose
         * @example `someByteBuffer.clear().fill(0)` fills the entire backing buffer with zeroes
         */
        ByteBuffer.prototype.fill = function(value, begin, end) {
            if (typeof value === 'string' && value.length > 0)
                value = value.charCodeAt(0);
            if (typeof begin === 'undefined') begin = this.offset;
            if (typeof end === 'undefined') end = this.limit;
            if (!this.noAssert) {
                // <ASSERT_INTEGER>
                if (typeof value !== 'number' || value % 1 !== 0)
                    throw(new TypeError("Illegal value: "+value+" (not an integer)"));
                value |= 0;
                // </ASSERT_INTEGER>
                // <ASSERT_RANGE>
                if (typeof begin !== 'number' || begin % 1 !== 0)
                    throw(new TypeError("Illegal begin: Not an integer"));
                begin >>>= 0;
                if (typeof end !== 'number' || end % 1 !== 0)
                    throw(new TypeError("Illegal end: Not an integer"));
                end >>>= 0;
                if (begin < 0 || begin > end || end > this.buffer.byteLength)
                    throw(new RangeError("Illegal range: 0 <= "+begin+" <= "+end+" <= "+this.buffer.byteLength));
                // </ASSERT_RANGE>
            }
            if (begin >= end) return this; // Nothing to fill
            while (begin < end) this.view.setUint8(begin++, value);
            return this;
        };

        /**
         * Makes this ByteBuffer ready for a new sequence of write or relative read operations. Sets `limit = offset` and
         *  `offset = 0`. Make sure always to flip a ByteBuffer when all relative read or write operations are complete.
         * @returns {!ByteBuffer} this
         * @expose
         */
        ByteBuffer.prototype.flip = function() {
            this.limit = this.offset;
            this.offset = 0;
            return this;
        };
        /**
         * Marks an offset on this ByteBuffer to be used later.
         * @param {number=} offset Offset to mark. Defaults to {@link ByteBuffer#offset}.
         * @returns {!ByteBuffer} this
         * @throws {TypeError} If `offset` is not a valid number
         * @throws {RangeError} If `offset` is out of bounds
         * @see ByteBuffer#reset
         * @expose
         */
        ByteBuffer.prototype.mark = function(offset) {
            offset = typeof offset === 'undefined' ? this.offset : offset;
            if (!this.noAssert) {
                // <ASSERT_OFFSET>
                if (typeof offset !== 'number' || offset % 1 !== 0)
                    throw(new TypeError("Illegal offset: "+offset+" (not an integer)"));
                offset >>>= 0;
                if (offset < 0 || offset + 0 > this.buffer.byteLength)
                    throw(new RangeError("Illegal offset: 0 <= "+offset+" (+"+0+") <= "+this.buffer.byteLength));
                // </ASSERT_OFFSET>
            }
            this.markedOffset = offset;
            return this;
        };
        /**
         * Sets the byte order.
         * @param {boolean} littleEndian `true` for little endian byte order, `false` for big endian
         * @returns {!ByteBuffer} this
         * @expose
         */
        ByteBuffer.prototype.order = function(littleEndian) {
            if (!this.noAssert) {
                if (typeof littleEndian !== 'boolean')
                    throw(new TypeError("Illegal littleEndian: Not a boolean"));
            }
            this.littleEndian = !!littleEndian;
            return this;
        };

        /**
         * Switches (to) little endian byte order.
         * @param {boolean=} littleEndian Defaults to `true`, otherwise uses big endian
         * @returns {!ByteBuffer} this
         * @expose
         */
        ByteBuffer.prototype.LE = function(littleEndian) {
            this.littleEndian = typeof littleEndian !== 'undefined' ? !!littleEndian : true;
            return this;
        };

        /**
         * Switches (to) big endian byte order.
         * @param {boolean=} bigEndian Defaults to `true`, otherwise uses little endian
         * @returns {!ByteBuffer} this
         * @expose
         */
        ByteBuffer.prototype.BE = function(bigEndian) {
            this.littleEndian = typeof bigEndian !== 'undefined' ? !bigEndian : false;
            return this;
        };
        /**
         * Prepends some data to this ByteBuffer. This will overwrite any contents before the specified offset up to the
         *  prepended data's length. If there is not enough space available before the specified `offset`, the backing buffer
         *  will be resized and its contents moved accordingly.
         * @param {!ByteBuffer|string|!ArrayBuffer} source Data to prepend. If `source` is a ByteBuffer, its offset will be
         *  modified according to the performed read operation.
         * @param {(string|number)=} encoding Encoding if `data` is a string ("base64", "hex", "binary", defaults to "utf8")
         * @param {number=} offset Offset to prepend at. Will use and decrease {@link ByteBuffer#offset} by the number of bytes
         *  prepended if omitted.
         * @returns {!ByteBuffer} this
         * @expose
         * @example A relative `00<01 02 03>.prepend(<04 05>)` results in `<04 05 01 02 03>, 04 05|`
         * @example An absolute `00<01 02 03>.prepend(<04 05>, 2)` results in `04<05 02 03>, 04 05|`
         */
        ByteBuffer.prototype.prepend = function(source, encoding, offset) {
            if (typeof encoding === 'number' || typeof encoding !== 'string') {
                offset = encoding;
                encoding = undefined;
            }
            // <RELATIVE>
            var relative = typeof offset === 'undefined';
            if (relative) offset = this.offset;
            // </RELATIVE>
            if (!this.noAssert) {
                // <ASSERT_OFFSET>
                if (typeof offset !== 'number' || offset % 1 !== 0)
                    throw(new TypeError("Illegal offset: "+offset+" (not an integer)"));
                offset >>>= 0;
                if (offset < 0 || offset + 0 > this.buffer.byteLength)
                    throw(new RangeError("Illegal offset: 0 <= "+offset+" (+"+0+") <= "+this.buffer.byteLength));
                // </ASSERT_OFFSET>
            }
            if (!(source instanceof ByteBuffer))
                source = ByteBuffer.wrap(source, encoding);
            var len = source.limit - source.offset;
            if (len <= 0) return this; // Nothing to prepend
            var diff = len - offset;
            var arrayView;
            if (diff > 0) { // Not enough space before offset, so resize + move
                var buffer = new ArrayBuffer(this.buffer.byteLength + diff);
                arrayView = new Uint8Array(buffer);
                arrayView.set(new Uint8Array(this.buffer).subarray(offset, this.buffer.byteLength), len);
                this.buffer = buffer;
                this.view = new DataView(buffer);
                this.offset += diff;
                if (this.markedOffset >= 0) this.markedOffset += diff;
                this.limit += diff;
                offset += diff;
            } else {
                arrayView = new Uint8Array(this.buffer);
            }
            arrayView.set(new Uint8Array(source.buffer).subarray(source.offset, source.limit), offset - len);
            source.offset = source.limit;
            if (relative)
                this.offset -= len;
            return this;
        };

        /**
         * Prepends this ByteBuffer to another ByteBuffer. This will overwrite any contents before the specified offset up to the
         *  prepended data's length. If there is not enough space available before the specified `offset`, the backing buffer
         *  will be resized and its contents moved accordingly.
         * @param {!ByteBuffer} target Target ByteBuffer
         * @param {number=} offset Offset to prepend at. Will use and decrease {@link ByteBuffer#offset} by the number of bytes
         *  prepended if omitted.
         * @returns {!ByteBuffer} this
         * @expose
         * @see ByteBuffer#prepend
         */
        ByteBuffer.prototype.prependTo = function(target, offset) {
            target.prepend(this, offset);
            return this;
        };
        /**
         * Prints debug information about this ByteBuffer's contents.
         * @param {function(string)=} out Output function to call, defaults to console.log
         * @expose
         */
        ByteBuffer.prototype.printDebug = function(out) {
            if (typeof out !== 'function') out = console.log.bind(console);
            out(
                this.toString()+"\n"+
                "-------------------------------------------------------------------\n"+
                this.toDebug(/* columns */ true)
            );
        };

        /**
         * Gets the number of remaining readable bytes. Contents are the bytes between {@link ByteBuffer#offset} and
         *  {@link ByteBuffer#limit}, so this returns `limit - offset`.
         * @returns {number} Remaining readable bytes. May be negative if `offset > limit`.
         * @expose
         */
        ByteBuffer.prototype.remaining = function() {
            return this.limit - this.offset;
        };
        /**
         * Resets this ByteBuffer's {@link ByteBuffer#offset}. If an offset has been marked through {@link ByteBuffer#mark}
         *  before, `offset` will be set to {@link ByteBuffer#markedOffset}, which will then be discarded. If no offset has been
         *  marked, sets `offset = 0`.
         * @returns {!ByteBuffer} this
         * @see ByteBuffer#mark
         * @expose
         */
        ByteBuffer.prototype.reset = function() {
            if (this.markedOffset >= 0) {
                this.offset = this.markedOffset;
                this.markedOffset = -1;
            } else {
                this.offset = 0;
            }
            return this;
        };
        /**
         * Resizes this ByteBuffer to be backed by a buffer of at least the given capacity. Will do nothing if already that
         *  large or larger.
         * @param {number} capacity Capacity required
         * @returns {!ByteBuffer} this
         * @throws {TypeError} If `capacity` is not a number
         * @throws {RangeError} If `capacity < 0`
         * @expose
         */
        ByteBuffer.prototype.resize = function(capacity) {
            if (!this.noAssert) {
                // <ASSERT_INTEGER>
                if (typeof capacity !== 'number' || capacity % 1 !== 0)
                    throw(new TypeError("Illegal capacity: "+capacity+" (not an integer)"));
                capacity |= 0;
                // </ASSERT_INTEGER>
                if (capacity < 0)
                    throw(new RangeError("Illegal capacity: 0 <= "+capacity));
            }
            if (this.buffer.byteLength < capacity) {
                var buffer = new ArrayBuffer(capacity);
                new Uint8Array(buffer).set(new Uint8Array(this.buffer));
                this.buffer = buffer;
                this.view = new DataView(buffer);
            }
            return this;
        };
        /**
         * Reverses this ByteBuffer's contents.
         * @param {number=} begin Offset to start at, defaults to {@link ByteBuffer#offset}
         * @param {number=} end Offset to end at, defaults to {@link ByteBuffer#limit}
         * @returns {!ByteBuffer} this
         * @expose
         */
        ByteBuffer.prototype.reverse = function(begin, end) {
            if (typeof begin === 'undefined') begin = this.offset;
            if (typeof end === 'undefined') end = this.limit;
            if (!this.noAssert) {
                // <ASSERT_RANGE>
                if (typeof begin !== 'number' || begin % 1 !== 0)
                    throw(new TypeError("Illegal begin: Not an integer"));
                begin >>>= 0;
                if (typeof end !== 'number' || end % 1 !== 0)
                    throw(new TypeError("Illegal end: Not an integer"));
                end >>>= 0;
                if (begin < 0 || begin > end || end > this.buffer.byteLength)
                    throw(new RangeError("Illegal range: 0 <= "+begin+" <= "+end+" <= "+this.buffer.byteLength));
                // </ASSERT_RANGE>
            }
            if (begin === end)
                return this; // Nothing to reverse
            Array.prototype.reverse.call(new Uint8Array(this.buffer).subarray(begin, end));
            this.view = new DataView(this.buffer); // FIXME: Why exactly is this necessary?
            return this;
        };
        /**
         * Skips the next `length` bytes. This will just advance
         * @param {number} length Number of bytes to skip. May also be negative to move the offset back.
         * @returns {!ByteBuffer} this
         * @expose
         */
        ByteBuffer.prototype.skip = function(length) {
            if (!this.noAssert) {
                // <ASSERT_INTEGER>
                if (typeof length !== 'number' || length % 1 !== 0)
                    throw(new TypeError("Illegal length: "+length+" (not an integer)"));
                length |= 0;
                // </ASSERT_INTEGER>
            }
            var offset = this.offset + length;
            if (!this.noAssert) {
                if (offset < 0 || offset > this.buffer.byteLength)
                    throw(new RangeError("Illegal length: 0 <= "+this.offset+" + "+length+" <= "+this.buffer.byteLength));
            }
            this.offset = offset;
            return this;
        };

        /**
         * Slices this ByteBuffer by creating a cloned instance with `offset = begin` and `limit = end`.
         * @param {number=} begin Begin offset, defaults to {@link ByteBuffer#offset}.
         * @param {number=} end End offset, defaults to {@link ByteBuffer#limit}.
         * @returns {!ByteBuffer} Clone of this ByteBuffer with slicing applied, backed by the same {@link ByteBuffer#buffer}
         * @expose
         */
        ByteBuffer.prototype.slice = function(begin, end) {
            if (typeof begin === 'undefined') begin = this.offset;
            if (typeof end === 'undefined') end = this.limit;
            if (!this.noAssert) {
                // <ASSERT_RANGE>
                if (typeof begin !== 'number' || begin % 1 !== 0)
                    throw(new TypeError("Illegal begin: Not an integer"));
                begin >>>= 0;
                if (typeof end !== 'number' || end % 1 !== 0)
                    throw(new TypeError("Illegal end: Not an integer"));
                end >>>= 0;
                if (begin < 0 || begin > end || end > this.buffer.byteLength)
                    throw(new RangeError("Illegal range: 0 <= "+begin+" <= "+end+" <= "+this.buffer.byteLength));
                // </ASSERT_RANGE>
            }
            var bb = this.clone();
            bb.offset = begin;
            bb.limit = end;
            return bb;
        };
        /**
         * Returns a copy of the backing buffer that contains this ByteBuffer's contents. Contents are the bytes between
         *  {@link ByteBuffer#offset} and {@link ByteBuffer#limit}. Will transparently {@link ByteBuffer#flip} this
         *  ByteBuffer if `offset > limit` but the actual offsets remain untouched.
         * @param {boolean=} forceCopy If `true` returns a copy, otherwise returns a view referencing the same memory if
         *  possible. Defaults to `false`
         * @returns {!ArrayBuffer} Contents as an ArrayBuffer
         * @expose
         */
        ByteBuffer.prototype.toBuffer = function(forceCopy) {
            var offset = this.offset,
                limit = this.limit;
            if (offset > limit) {
                var t = offset;
                offset = limit;
                limit = t;
            }
            if (!this.noAssert) {
                // <ASSERT_RANGE>
                if (typeof offset !== 'number' || offset % 1 !== 0)
                    throw(new TypeError("Illegal offset: Not an integer"));
                offset >>>= 0;
                if (typeof limit !== 'number' || limit % 1 !== 0)
                    throw(new TypeError("Illegal limit: Not an integer"));
                limit >>>= 0;
                if (offset < 0 || offset > limit || limit > this.buffer.byteLength)
                    throw(new RangeError("Illegal range: 0 <= "+offset+" <= "+limit+" <= "+this.buffer.byteLength));
                // </ASSERT_RANGE>
            }
            // NOTE: It's not possible to have another ArrayBuffer reference the same memory as the backing buffer. This is
            // possible with Uint8Array#subarray only, but we have to return an ArrayBuffer by contract. So:
            if (!forceCopy && offset === 0 && limit === this.buffer.byteLength) {
                return this.buffer;
            }
            if (offset === limit) {
                return EMPTY_BUFFER;
            }
            var buffer = new ArrayBuffer(limit - offset);
            new Uint8Array(buffer).set(new Uint8Array(this.buffer).subarray(offset, limit), 0);
            return buffer;
        };

        /**
         * Returns a raw buffer compacted to contain this ByteBuffer's contents. Contents are the bytes between
         *  {@link ByteBuffer#offset} and {@link ByteBuffer#limit}. Will transparently {@link ByteBuffer#flip} this
         *  ByteBuffer if `offset > limit` but the actual offsets remain untouched. This is an alias of
         *  {@link ByteBuffer#toBuffer}.
         * @function
         * @param {boolean=} forceCopy If `true` returns a copy, otherwise returns a view referencing the same memory.
         *  Defaults to `false`
         * @returns {!ArrayBuffer} Contents as an ArrayBuffer
         * @expose
         */
        ByteBuffer.prototype.toArrayBuffer = ByteBuffer.prototype.toBuffer;


        /**
         * Converts the ByteBuffer's contents to a string.
         * @param {string=} encoding Output encoding. Returns an informative string representation if omitted but also allows
         *  direct conversion to "utf8", "hex", "base64" and "binary" encoding. "debug" returns a hex representation with
         *  highlighted offsets.
         * @returns {string} String representation
         * @throws {Error} If `encoding` is invalid
         * @expose
         */
        ByteBuffer.prototype.toString = function(encoding) {
            if (typeof encoding === 'undefined')
                return "ByteBufferAB(offset="+this.offset+",markedOffset="+this.markedOffset+",limit="+this.limit+",capacity="+this.capacity()+")";
            switch (encoding) {
                case "utf8":
                    return this.toUTF8();
                case "base64":
                    return this.toBase64();
                case "hex":
                    return this.toHex();
                case "binary":
                    return this.toBinary();
                case "debug":
                    return this.toDebug();
                case "columns":
                    return this.toColumns();
                default:
                    throw(new Error("Unsupported encoding: "+encoding));
            }
        };

        // encodings/base64

        /**
         * Base64 alphabet.
         * @type {string}
         * @inner
         */
        var B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
        B64 = B64+""; // Prevent CC from inlining this

        /**
         * Encodes this ByteBuffer's contents to a base64 encoded string.
         * @param {number=} begin Offset to begin at, defaults to {@link ByteBuffer#offset}.
         * @param {number=} end Offset to end at, defaults to {@link ByteBuffer#limit}.
         * @returns {string} Base64 encoded string
         * @expose
         */
        ByteBuffer.prototype.toBase64 = function(begin, end) {
            if (typeof begin === 'undefined') begin = this.offset;
            if (typeof end === 'undefined') end = this.limit;
            if (!this.noAssert) {
                // <ASSERT_RANGE>
                if (typeof begin !== 'number' || begin % 1 !== 0)
                    throw(new TypeError("Illegal begin: Not an integer"));
                begin >>>= 0;
                if (typeof end !== 'number' || end % 1 !== 0)
                    throw(new TypeError("Illegal end: Not an integer"));
                end >>>= 0;
                if (begin < 0 || begin > end || end > this.buffer.byteLength)
                    throw(new RangeError("Illegal range: 0 <= "+begin+" <= "+end+" <= "+this.buffer.byteLength));
                // </ASSERT_RANGE>
            }
            if (begin === end) return "";
            var b1, b2, b3,     // input bytes
                h2, h3,         // has input?
                o1, o2, o3, o4, // output bytes
                out = "";       // output
            while (begin < end) {
                b1 = this.view.getUint8(begin++);
                b2 = (h2 = begin < end) ? this.view.getUint8(begin++) : 0;
                b3 = (h3 = begin < end) ? this.view.getUint8(begin++) : 0;
                o1 =                       b1 >> 2;
                o2 = ((b1 & 0x03) << 4) | (b2 >> 4);
                o3 = ((b2 & 0x0F) << 2) | (b3 >> 6);
                o4 =   b3 & 0x3F;
                if (!h3) {
                    o4 = 64;
                    if (!h2) o3 = 64;
                }
                out += B64.charAt(o1) + B64.charAt(o2) + B64.charAt(o3) + B64.charAt(o4);
            }
            return out;
        };

        /**
         * Decodes a base64 encoded string to a ByteBuffer.
         * @param {string} str String to decode
         * @param {boolean=} littleEndian Whether to use little or big endian byte order. Defaults to
         *  {@link ByteBuffer.DEFAULT_ENDIAN}.
         * @param {boolean=} noAssert Whether to skip assertions of offsets and values. Defaults to
         *  {@link ByteBuffer.DEFAULT_NOASSERT}.
         * @returns {!ByteBuffer} ByteBuffer
         * @expose
         */
        ByteBuffer.fromBase64 = function(str, littleEndian, noAssert) {
            if (!noAssert) {
                if (typeof str !== 'string')
                    throw(new TypeError("Illegal str: Not a string"));
                if (str.length % 4 !== 0)
                    throw(new TypeError("Illegal str: Length not a multiple of 4"));
            }
            var len = str.length,
                suffix = 0,
                i, j;
            for (i=str.length-1; i>=0; --i) {
                if (str.charAt(i) === '=') suffix++;
                else break;
            }
            if (suffix > 2)
                throw(new TypeError("Illegal str: Suffix is too large"));
            if (len === 0)
                return new ByteBuffer(0, littleEndian, noAssert);
            var b1, b2, b3, b4, // input bytes
                h2, h3, h4,     // has input?
                bb = new ByteBuffer(len/4*3-suffix, littleEndian, noAssert);
            for (i=0, j=0; i<len; ) {
                b1 =                  B64.indexOf(str.charAt(i++));
                b2 = (h2 = i < len) ? B64.indexOf(str.charAt(i++)) : 0;
                b3 = (h3 = i < len) ? B64.indexOf(str.charAt(i++)) : 0;
                b4 = (h4 = i < len) ? B64.indexOf(str.charAt(i++)) : 0;
                if (!noAssert) {
                    if (b1 < 0 || b2 < 0 || b3 < 0 || b4 < 0)
                        throw(new TypeError("Illegal str: Contains non-base64 characters"));
                }
                bb.view.setUint8(j++, (b1 << 2) | (b2 >> 4));
                if (b3 !== 64) {
                    bb.view.setUint8(j++, ((b2 << 4) & 0xF0) | (b3 >> 2), j);
                    if (b4 !== 64) {
                        bb.view.setUint8(j++, ((b3 << 6) & 0xC0) | b4);
                    }
                }
            }
            bb.limit = j;
            return bb;
        };

        /**
         * Encodes a binary string to base64 like `window.btoa` does.
         * @param {string} str Binary string
         * @returns {string} Base64 encoded string
         * @see https://developer.mozilla.org/en-US/docs/Web/API/Window.btoa
         * @expose
         */
        ByteBuffer.btoa = function(str) {
            return ByteBuffer.fromBinary(str).toBase64();
        };

        /**
         * Decodes a base64 encoded string to binary like `window.atob` does.
         * @param {string} b64 Base64 encoded string
         * @returns {string} Binary string
         * @see https://developer.mozilla.org/en-US/docs/Web/API/Window.atob
         * @expose
         */
        ByteBuffer.atob = function(b64) {
            return ByteBuffer.fromBase64(b64).toBinary();
        };

        // encodings/binary

        /**
         * Encodes this ByteBuffer to a binary encoded string, that is using only characters 0x00-0xFF as bytes.
         * @param {number=} begin Offset to begin at. Defaults to {@link ByteBuffer#offset}.
         * @param {number=} end Offset to end at. Defaults to {@link ByteBuffer#limit}.
         * @returns {string} Binary encoded string
         * @throws {RangeError} If `offset > limit`
         * @expose
         */
        ByteBuffer.prototype.toBinary = function(begin, end) {
            begin = typeof begin === 'undefined' ? this.offset : begin;
            end = typeof end === 'undefined' ? this.limit : end;
            if (!this.noAssert) {
                // <ASSERT_RANGE>
                if (typeof begin !== 'number' || begin % 1 !== 0)
                    throw(new TypeError("Illegal begin: Not an integer"));
                begin >>>= 0;
                if (typeof end !== 'number' || end % 1 !== 0)
                    throw(new TypeError("Illegal end: Not an integer"));
                end >>>= 0;
                if (begin < 0 || begin > end || end > this.buffer.byteLength)
                    throw(new RangeError("Illegal range: 0 <= "+begin+" <= "+end+" <= "+this.buffer.byteLength));
                // </ASSERT_RANGE>
            }
            if (begin === end) return "";
            var out = [];
            while (begin < end)
                out.push(this.view.getUint8(begin++));
            return String.fromCharCode.apply(String, out);
        };

        /**
         * Decodes a binary encoded string, that is using only characters 0x00-0xFF as bytes, to a ByteBuffer.
         * @param {string} str String to decode
         * @param {boolean=} littleEndian Whether to use little or big endian byte order. Defaults to
         *  {@link ByteBuffer.DEFAULT_ENDIAN}.
         * @param {boolean=} noAssert Whether to skip assertions of offsets and values. Defaults to
         *  {@link ByteBuffer.DEFAULT_NOASSERT}.
         * @returns {!ByteBuffer} ByteBuffer
         * @expose
         */
        ByteBuffer.fromBinary = function(str, littleEndian, noAssert) {
            if (!noAssert) {
                if (typeof str !== 'string')
                    throw(new TypeError("Illegal str: Not a string"));
            }
            var i = 0, k = str.length, charCode,
                bb = new ByteBuffer(k, littleEndian, noAssert);
            while (i<k) {
                charCode = str.charCodeAt(i);
                if (!noAssert && charCode > 255)
                    throw(new TypeError("Illegal charCode at "+i+": 0 <= "+charCode+" <= 255"));
                bb.view.setUint8(i++, charCode);
            }
            bb.limit = k;
            return bb;
        };

        // encodings/debug

        /**
         * Encodes this ByteBuffer to a hex encoded string with marked offsets. Offset symbols are:
         * * `<` : offset,
         * * `'` : markedOffset,
         * * `>` : limit,
         * * `|` : offset and limit,
         * * `[` : offset and markedOffset,
         * * `]` : markedOffset and limit,
         * * `!` : offset, markedOffset and limit
         * @param {boolean=} columns If `true` returns two columns hex + ascii, defaults to `false`
         * @returns {string|!Array.<string>} Debug string or array of lines if `asArray = true`
         * @expose
         * @example `>00'01 02<03` contains four bytes with `limit=0, markedOffset=1, offset=3`
         * @example `00[01 02 03>` contains four bytes with `offset=markedOffset=1, limit=4`
         * @example `00|01 02 03` contains four bytes with `offset=limit=1, markedOffset=-1`
         * @example `|` contains zero bytes with `offset=limit=0, markedOffset=-1`
         */
        ByteBuffer.prototype.toDebug = function(columns) {
            var i = -1,
                k = this.buffer.byteLength,
                b,
                hex = "",
                asc = "",
                out = "";
            while (i<k) {
                if (i !== -1) {
                    b = this.view.getUint8(i);
                    if (b < 0x10) hex += "0"+b.toString(16).toUpperCase();
                    else hex += b.toString(16).toUpperCase();
                    if (columns) {
                        asc += b > 32 && b < 127 ? String.fromCodePoint(b) : '.';
                    }
                }
                ++i;
                if (columns) {
                    if (i > 0 && i % 16 === 0 && i !== k) {
                        while (hex.length < 3*16+3) hex += " ";
                        out += hex+asc+"\n";
                        hex = asc = "";
                    }
                }
                if (i === this.offset && i === this.limit)
                    hex += i === this.markedOffset ? "!" : "|";
                else if (i === this.offset)
                    hex += i === this.markedOffset ? "[" : "<";
                else if (i === this.limit)
                    hex += i === this.markedOffset ? "]" : ">";
                else
                    hex += i === this.markedOffset ? "'" : (columns || (i !== 0 && i !== k) ? " " : "");
            }
            if (columns && hex !== " ") {
                while (hex.length < 3*16+3) hex += " ";
                out += hex+asc+"\n";
            }
            return columns ? out : hex;
        };

        /**
         * Decodes a hex encoded string with marked offsets to a ByteBuffer.
         * @param {string} str Debug string to decode (not be generated with `columns = true`)
         * @param {boolean=} littleEndian Whether to use little or big endian byte order. Defaults to
         *  {@link ByteBuffer.DEFAULT_ENDIAN}.
         * @param {boolean=} noAssert Whether to skip assertions of offsets and values. Defaults to
         *  {@link ByteBuffer.DEFAULT_NOASSERT}.
         * @returns {!ByteBuffer} ByteBuffer
         * @expose
         * @see ByteBuffer#toDebug
         */
        ByteBuffer.fromDebug = function(str, littleEndian, noAssert) {
            var k = str.length,
                bb = new ByteBuffer(((k+1)/3)|0, littleEndian, noAssert);
            var i = 0, j = 0, ch, b,
                rs = false, // Require symbol next
                ho = false, hm = false, hl = false, // Already has offset, markedOffset, limit?
                fail = false;
            while (i<k) {
                switch (ch = str.charAt(i++)) {
                    case '!':
                        if (!noAssert) {
                            if (ho || hm || hl) {
                                fail = true; break;
                            }
                            ho = hm = hl = true;
                        }
                        bb.offset = bb.markedOffset = bb.limit = j;
                        rs = false;
                        break;
                    case '|':
                        if (!noAssert) {
                            if (ho || hl) {
                                fail = true; break;
                            }
                            ho = hl = true;
                        }
                        bb.offset = bb.limit = j;
                        rs = false;
                        break;
                    case '[':
                        if (!noAssert) {
                            if (ho || hm) {
                                fail = true; break;
                            }
                            ho = hm = true;
                        }
                        bb.offset = bb.markedOffset = j;
                        rs = false;
                        break;
                    case '<':
                        if (!noAssert) {
                            if (ho) {
                                fail = true; break;
                            }
                            ho = true;
                        }
                        bb.offset = j;
                        rs = false;
                        break;
                    case ']':
                        if (!noAssert) {
                            if (hl || hm) {
                                fail = true; break;
                            }
                            hl = hm = true;
                        }
                        bb.limit = bb.markedOffset = j;
                        rs = false;
                        break;
                    case '>':
                        if (!noAssert) {
                            if (hl) {
                                fail = true; break;
                            }
                            hl = true;
                        }
                        bb.limit = j;
                        rs = false;
                        break;
                    case "'":
                        if (!noAssert) {
                            if (hm) {
                                fail = true; break;
                            }
                            hm = true;
                        }
                        bb.markedOffset = j;
                        rs = false;
                        break;
                    case ' ':
                        rs = false;
                        break;
                    default:
                        if (!noAssert) {
                            if (rs) {
                                fail = true; break;
                            }
                        }
                        b = parseInt(ch+str.charAt(i++), 16);
                        if (!noAssert) {
                            if (isNaN(b) || b < 0 || b > 255)
                                throw(new TypeError("Illegal str: Not a debug encoded string"));
                        }
                        bb.view.setUint8(j++, b);
                        rs = true;
                }
                if (fail)
                    throw(new TypeError("Illegal str: Invalid symbol at "+i));
            }
            if (!noAssert) {
                if (!ho || !hl)
                    throw(new TypeError("Illegal str: Missing offset or limit"));
                if (j<bb.buffer.byteLength)
                    throw(new TypeError("Illegal str: Not a debug encoded string (is it hex?) "+j+" < "+k));
            }
            return bb;
        };

        // encodings/hex

        /**
         * Encodes this ByteBuffer's contents to a hex encoded string.
         * @param {number=} begin Offset to begin at. Defaults to {@link ByteBuffer#offset}.
         * @param {number=} end Offset to end at. Defaults to {@link ByteBuffer#limit}.
         * @returns {string} Hex encoded string
         * @expose
         */
        ByteBuffer.prototype.toHex = function(begin, end) {
            begin = typeof begin === 'undefined' ? this.offset : begin;
            end = typeof end === 'undefined' ? this.limit : end;
            if (!this.noAssert) {
                // <ASSERT_RANGE>
                if (typeof begin !== 'number' || begin % 1 !== 0)
                    throw(new TypeError("Illegal begin: Not an integer"));
                begin >>>= 0;
                if (typeof end !== 'number' || end % 1 !== 0)
                    throw(new TypeError("Illegal end: Not an integer"));
                end >>>= 0;
                if (begin < 0 || begin > end || end > this.buffer.byteLength)
                    throw(new RangeError("Illegal range: 0 <= "+begin+" <= "+end+" <= "+this.buffer.byteLength));
                // </ASSERT_RANGE>
            }
            var out = new Array(end - begin),
                b;
            while (begin < end) {
                b = this.view.getUint8(begin++);
                if (b < 0x10) out.push("0", b.toString(16));
                else out.push(b.toString(16));
            }
            return out.join('');
        };

        /**
         * Decodes a hex encoded string to a ByteBuffer.
         * @param {string} str String to decode
         * @param {boolean=} littleEndian Whether to use little or big endian byte order. Defaults to
         *  {@link ByteBuffer.DEFAULT_ENDIAN}.
         * @param {boolean=} noAssert Whether to skip assertions of offsets and values. Defaults to
         *  {@link ByteBuffer.DEFAULT_NOASSERT}.
         * @returns {!ByteBuffer} ByteBuffer
         * @expose
         */
        ByteBuffer.fromHex = function(str, littleEndian, noAssert) {
            if (!noAssert) {
                if (typeof str !== 'string')
                    throw(new TypeError("Illegal str: Not a string"));
                if (str.length % 2 !== 0)
                    throw(new TypeError("Illegal str: Length not a multiple of 2"));
            }
            var k = str.length,
                bb = new ByteBuffer((k / 2) | 0, littleEndian),
                b;
            for (var i=0, j=0; i<k; i+=2) {
                b = parseInt(str.substring(i, i+2), 16);
                if (!noAssert) {
                    if (!isFinite(b) || b < 0 || b > 255)
                        throw(new TypeError("Illegal str: Contains non-hex characters"));
                }
                bb.view.setUint8(j++, b);
            }
            bb.limit = j;
            return bb;
        };

        // encodings/utf8/codepoint

        // ref: http://mths.be/fromcodepoint v0.1.0 by @mathias
        if (!String.fromCodePoint) {
            (function () {
                var defineProperty = (function () {
                    // IE 8 only supports `Object.defineProperty` on DOM elements
                    try {
                        var object = {};
                        var $defineProperty = Object.defineProperty;
                        var result = $defineProperty(object, object, object) && $defineProperty;
                    } catch (error) {
                    }
                    return result;
                }());
                var stringFromCharCode = String.fromCharCode;
                var floor = Math.floor;
                var fromCodePoint = function () {
                    var MAX_SIZE = 0x4000;
                    var codeUnits = [];
                    var highSurrogate;
                    var lowSurrogate;
                    var index = -1;
                    var length = arguments.length;
                    if (!length)
                        return '';
                    var result = '';
                    while (++index < length) {
                        var codePoint = Number(arguments[index]);
                        if (
                            !isFinite(codePoint) || // `NaN`, `+Infinity`, or `-Infinity`
                                codePoint < 0 || // not a valid Unicode code point
                                codePoint > 0x10FFFF || // not a valid Unicode code point
                                floor(codePoint) != codePoint // not an integer
                            ) {
                            throw RangeError('Invalid code point: ' + codePoint);
                        }
                        if (codePoint <= 0xFFFF) { // BMP code point
                            codeUnits.push(codePoint);
                        } else { // Astral code point; split in surrogate halves
                            // http://mathiasbynens.be/notes/javascript-encoding#surrogate-formulae
                            codePoint -= 0x10000;
                            highSurrogate = (codePoint >> 10) + 0xD800;
                            lowSurrogate = (codePoint % 0x400) + 0xDC00;
                            codeUnits.push(highSurrogate, lowSurrogate);
                        }
                        if (index + 1 == length || codeUnits.length > MAX_SIZE) {
                            result += stringFromCharCode.apply(null, codeUnits);
                            codeUnits.length = 0;
                        }
                    }
                    return result;
                };
                if (defineProperty) {
                    defineProperty(String, 'fromCodePoint', {
                        'value': fromCodePoint,
                        'configurable': true,
                        'writable': true
                    });
                } else {
                    String["fromCodePoint"] = fromCodePoint;
                }
            }());
        }

        // ref: http://mths.be/codepointat v0.1.0 by @mathias
        if (!String.prototype.codePointAt) {
            (function() {
                'use strict'; // needed to support `apply`/`call` with `undefined`/`null`
                var codePointAt = function(position) {
                    if (this == null) {
                        throw TypeError();
                    }
                    var string = String(this);
                    var size = string.length;
                    // `ToInteger`
                    var index = position ? Number(position) : 0;
                    if (index != index) { // better `isNaN`
                        index = 0;
                    }
                    // Account for out-of-bounds indices:
                    if (index < 0 || index >= size) {
                        return undefined;
                    }
                    // Get the first code unit
                    var first = string.charCodeAt(index);
                    var second;
                    if ( // check if it’s the start of a surrogate pair
                        first >= 0xD800 && first <= 0xDBFF && // high surrogate
                            size > index + 1 // there is a next code unit
                        ) {
                        second = string.charCodeAt(index + 1);
                        if (second >= 0xDC00 && second <= 0xDFFF) { // low surrogate
                            // http://mathiasbynens.be/notes/javascript-encoding#surrogate-formulae
                            return (first - 0xD800) * 0x400 + second - 0xDC00 + 0x10000;
                        }
                    }
                    return first;
                };
                if (Object.defineProperty) {
                    Object.defineProperty(String.prototype, 'codePointAt', {
                        'value': codePointAt,
                        'configurable': true,
                        'writable': true
                    });
                } else {
                    String.prototype["codePointAt"] = codePointAt;
                }
            }());
        }

        // encodings/utf8/native

        /**
         * Decodes a single UTF8 character from the specified ByteBuffer. The ByteBuffer's offsets remain untouched.
         * @param {!ByteBuffer} bb ByteBuffer to decode from
         * @param {number} offset Offset to start at
         * @returns {!{codePoint: number, length: number}} Decoded char code and the number of bytes read
         * @inner
         * @see http://en.wikipedia.org/wiki/UTF-8#Description
         */
        function utf8_decode_char(bb, offset) {
            var start = offset,
                a, b, c, d, e, f,
                codePoint;
            a = bb.view.getUint8(offset++);
            if ((a&0x80) === 0) {
                codePoint = a;
            } else if ((a&0xE0) === 0xC0) {
                b = bb.view.getUint8(offset++);
                codePoint = ((a&0x1F)<<6) | (b&0x3F);
            } else if ((a&0xF0) === 0xE0) {
                b = bb.view.getUint8(offset++);
                c = bb.view.getUint8(offset++);
                codePoint = ((a&0x0F)<<12) | ((b&0x3F)<<6) | (c&0x3F);
            } else if ((a&0xF8) === 0xF0) {
                b = bb.view.getUint8(offset++);
                c = bb.view.getUint8(offset++);
                d = bb.view.getUint8(offset++);
                codePoint = ((a&0x07)<<18) | ((b&0x3F)<<12) | ((c&0x3F)<<6) | (d&0x3F);
            } else
                throw(new RangeError("Illegal code point at offset "+offset+": 0x"+a.toString(16)));
            return {
                'codePoint': codePoint,
                'length': offset - start
            };
        }

        /**
         * Calculates the actual number of bytes required to encode the specified char code.
         * @param {number} codePoint Code point to encode
         * @returns {number} Number of bytes required to encode the specified code point
         * @inner
         * @see http://en.wikipedia.org/wiki/UTF-8#Description
         */
        function utf8_calc_char(codePoint) {
            if (codePoint < 0)
                throw(new RangeError("Illegal code point: -0x"+(-codePoint).toString(16)));
            if      (codePoint <       0x80) return 1;
            else if (codePoint <      0x800) return 2;
            else if (codePoint <    0x10000) return 3;
            else if (codePoint <   0x110000) return 4;
            else throw(new RangeError("Illegal code point: 0x"+codePoint.toString(16)));
        }

        /**
         * Calculates the number of bytes required to store an UTF8 encoded string.
         * @param {string} str String to calculate
         * @returns {number} Number of bytes required
         * @inner
         */
        function utf8_calc_string(str) {
            var i = 0, cp, n = 0;
            while (i < str.length) {
                n += utf8_calc_char(cp = str.codePointAt(i));
                i += cp < 0xFFFF ? 1 : 2;
            }
            return n;
        }

        /**
         * Encodes a single UTF8 character to the specified ByteBuffer backed by an ArrayBuffer. The ByteBuffer's offsets are
         *  not modified.
         * @param {number} codePoint Code point to encode
         * @param {!ByteBuffer} bb ByteBuffer to encode to
         * @param {number} offset Offset to write to
         * @returns {number} Number of bytes written
         * @inner
         * @see http://en.wikipedia.org/wiki/UTF-8#Description
         */
        function utf8_encode_char(codePoint, bb, offset) {
            var start = offset;
            if (codePoint < 0)
                throw(new RangeError("Illegal code point: -0x"+(-codePoint).toString(16)));
            if (codePoint < 0x80) {
                bb.view.setUint8(offset++,   codePoint     &0x7F)      ;
            } else if (codePoint < 0x800) {
                bb.view.setUint8(offset++, ((codePoint>>6 )&0x1F)|0xC0);
                bb.view.setUint8(offset++, ( codePoint     &0x3F)|0x80);
            } else if (codePoint < 0x10000) {
                bb.view.setUint8(offset++, ((codePoint>>12)&0x0F)|0xE0);
                bb.view.setUint8(offset++, ((codePoint>>6 )&0x3F)|0x80);
                bb.view.setUint8(offset++, ( codePoint     &0x3F)|0x80);
            } else if (codePoint < 0x110000) {
                bb.view.setUint8(offset++, ((codePoint>>18)&0x07)|0xF0);
                bb.view.setUint8(offset++, ((codePoint>>12)&0x3F)|0x80);
                bb.view.setUint8(offset++, ((codePoint>>6 )&0x3F)|0x80);
                bb.view.setUint8(offset++, ( codePoint     &0x3F)|0x80);
            } else
                throw(new RangeError("Illegal code point: 0x"+codePoint.toString(16)));
            return offset - start;
        }


        // encodings/utf8

        /**
         * Encodes this ByteBuffer's contents between {@link ByteBuffer#offset} and {@link ByteBuffer#limit} to an UTF8 encoded
         *  string.
         * @returns {string} Hex encoded string
         * @throws {RangeError} If `offset > limit`
         * @expose
         */
        ByteBuffer.prototype.toUTF8 = function(begin, end) {
            if (typeof begin === 'undefined') begin = this.offset;
            if (typeof end === 'undefined') end = this.limit;
            if (!this.noAssert) {
                // <ASSERT_RANGE>
                if (typeof begin !== 'number' || begin % 1 !== 0)
                    throw(new TypeError("Illegal begin: Not an integer"));
                begin >>>= 0;
                if (typeof end !== 'number' || end % 1 !== 0)
                    throw(new TypeError("Illegal end: Not an integer"));
                end >>>= 0;
                if (begin < 0 || begin > end || end > this.buffer.byteLength)
                    throw(new RangeError("Illegal range: 0 <= "+begin+" <= "+end+" <= "+this.buffer.byteLength));
                // </ASSERT_RANGE>
            }
            var out = [], temp;
            while (begin < end) {
                temp = utf8_decode_char(this, begin);
                out.push(temp['codePoint']);
                begin += temp['length'];
            }
            if (!this.noAssert) {
                if (begin !== end)
                    throw(new RangeError("Illegal range: Truncated data"));
            }
            return String.fromCodePoint.apply(String, out);
        };

        /**
         * Decodes an UTF8 encoded string to a ByteBuffer.
         * @param {string} str String to decode
         * @param {boolean=} littleEndian Whether to use little or big endian byte order. Defaults to
         *  {@link ByteBuffer.DEFAULT_ENDIAN}.
         * @param {boolean=} noAssert Whether to skip assertions of offsets and values. Defaults to
         *  {@link ByteBuffer.DEFAULT_NOASSERT}.
         * @returns {!ByteBuffer} ByteBuffer
         * @expose
         */
        ByteBuffer.fromUTF8 = function(str, littleEndian, noAssert) {
            if (!noAssert) {
                if (typeof str !== 'string')
                    throw(new TypeError("Illegal str: Not a string"));
            }
            var bb = new ByteBuffer(utf8_calc_string(str), littleEndian, noAssert);
            for (var i=0, j=0, k=str.length; i<k; ++i) {
                j += utf8_encode_char(str.codePointAt(i), bb, j);
            }
            bb.limit = j;
            return bb;
        };


        return ByteBuffer;
    }

    // Enable module loading if available
    if (typeof module != 'undefined' && module["exports"]) { // CommonJS
        module["exports"] = loadByteBuffer(require("long"));
    } else if (typeof define !== 'undefined' && define["amd"]) { // AMD
        define("ByteBuffer", ["Math/Long"], function(Long) { return loadByteBuffer(Long); });
    } else { // Shim
        if (!global["dcodeIO"]) global["dcodeIO"] = {};
        global["dcodeIO"]["ByteBuffer"] = loadByteBuffer(global["dcodeIO"]["Long"]);
    }

})(this);
