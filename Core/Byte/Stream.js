'use strict';

class Stream {
  constructor(data = null) {
    this._buf = data ? Buffer.from(data) : Buffer.alloc(0);
    this._offset = 0;
    this._bitOffset = 0;
  }

  // ── Readers ──────────────────────────────────────────────────────────────

  readInt() {
    this._bitOffset = 0;
    const v = this._buf.readInt32BE(this._offset);
    this._offset += 4;
    return v;
  }

  readShort() {
    this._bitOffset = 0;
    const v = this._buf.readInt16BE(this._offset);
    this._offset += 2;
    return v;
  }

  readString() {
    const len = this.readInt();
    if (len <= 0 || len >= 90_000) return '';
    const s = this._buf.slice(this._offset, this._offset + len).toString('utf8');
    this._offset += len;
    return s;
  }

  readVInt() {
    this._bitOffset = 0;
    let b = this._buf[this._offset++];

    const a1 = (b & 0x40) >>> 6;
    const a2 = (b & 0x80) >>> 7;
    const s  = (b << 1) & 0x7e;
    b = s | (a2 << 7) | a1;

    let result = b & 0x7f;
    let shift  = 7;

    while (b & 0x80) {
      if (shift > 28) break;
      b = this._buf[this._offset++];
      result |= (b & 0x7f) << shift;
      shift += 7;
    }

    // Sign-extend to 32-bit signed, then zigzag-decode
    result = result | 0;
    return (result >>> 1) ^ -(result & 1);
  }

  readBoolean() { return this.readVInt() >= 1; }

  readLogicLong() { return [this.readVInt(), this.readVInt()]; }
  readLong()      { return [this.readInt(),  this.readInt()];  }

  readDataReference() {
    const a = this.readVInt();
    return [a, a === 0 ? 0 : this.readVInt()];
  }

  // ── Writers ──────────────────────────────────────────────────────────────

  writeByte(value) {
    this._bitOffset = 0;
    const b = Buffer.alloc(1);
    b[0] = value & 0xff;
    this._buf = Buffer.concat([this._buf, b]);
    this._offset++;
  }

  writeShort(value) {
    this._bitOffset = 0;
    const b = Buffer.alloc(2);
    b.writeInt16BE(value);
    this._buf = Buffer.concat([this._buf, b]);
    this._offset += 2;
  }

  writeInt(value) {
    this._bitOffset = 0;
    const b = Buffer.alloc(4);
    b.writeInt32BE(value);
    this._buf = Buffer.concat([this._buf, b]);
    this._offset += 4;
  }

  writeVInt(value) {
    this._bitOffset = 0;
    let v = value >>> 0;               // treat as u32

    const flippedSigned = value ^ (value >> 31);
    let flipped = flippedSigned >>> 0;

    let temp = ((v >>> 25) & 0x40) | (v & 0x3f);
    v >>= 6;
    flipped >>= 6;

    if (flipped === 0) { this.writeByte(temp); return; }

    this.writeByte(temp | 0x80);
    flipped >>>= 7;

    let r = flipped !== 0 ? 0x80 : 0;
    this.writeByte((v & 0x7f) | r);
    v >>>= 7;

    while (flipped !== 0) {
      flipped >>>= 7;
      r = flipped !== 0 ? 0x80 : 0;
      this.writeByte((v & 0x7f) | r);
      v >>>= 7;
    }
  }

  writeBoolean(value) {
    if (this._bitOffset === 0) {
      this._buf = Buffer.concat([this._buf, Buffer.alloc(1)]);
      this._offset++;
    }
    if (value) {
      this._buf[this._offset - 1] |= (1 << this._bitOffset);
    }
    this._bitOffset = (this._bitOffset + 1) & 7;
  }

  writeString(value) {
    if (value === null || value === undefined) { this.writeInt(-1); return; }
    const buf = Buffer.from(value, 'utf8');
    if (buf.length > 90_000) { this.writeInt(-1); return; }
    this.writeInt(buf.length);
    this._buf = Buffer.concat([this._buf, buf]);
    this._offset += buf.length;
  }

  writeStringVInt(value) {
    if (value === null || value === undefined) { this.writeVInt(0); return; }
    const buf = Buffer.from(value, 'utf8');
    this.writeVInt(buf.length);
    this._buf = Buffer.concat([this._buf, buf]);
    this._offset += buf.length;
  }

  writeLong(v1, v2)      { this.writeInt(v1);  this.writeInt(v2);  }
  writeLongLong(value)   {
    this.writeInt(Number(BigInt(value) >> 32n) | 0);
    this.writeInt(Number(BigInt(value) & 0xffffffffn) | 0);
  }
  writeLogicLong(v1, v2) { this.writeVInt(v1); this.writeVInt(v2); }

  writeDataReference(v1, v2) {
    if (v1 < 1) { this.writeVInt(0); }
    else        { this.writeVInt(v1); this.writeVInt(v2); }
  }

  writeShortString(value) {
    if (value === null || value === undefined) { this.writeVInt(0); return; }
    const buf = Buffer.from(value, 'utf8');
    this.writeVInt(buf.length);
    this._buf = Buffer.concat([this._buf, buf]);
    this._offset += buf.length;
  }

  writeBytes(data) {
    if (data === null || data === undefined) { this.writeInt(-1); return; }
    this.writeInt(data.length);
    this._buf = Buffer.concat([this._buf, data]);
    this._offset += data.length;
  }

  writeHex(hex) {
    if (hex.length % 2 !== 0) throw new Error('OddHexLength');
    const bytes = Buffer.from(hex, 'hex');
    this._buf = Buffer.concat([this._buf, bytes]);
    this._offset += bytes.length;
  }

  // ── Raw buffer ────────────────────────────────────────────────────────────

  toBuffer() { return this._buf; }
}

module.exports = { Stream };
