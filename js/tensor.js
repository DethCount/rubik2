Math.cospi = function(angle) {
  let c = Math.cos(Math.PI * angle);

  if (c < 1e-15 && c > -1e-15) {
    return 0;
  }

  return c;
};

Math.sinpi = function(angle) {
  let s = Math.sin(Math.PI * angle);

  if (s < 1e-15 && s > -1e-15) {
    return 0;
  }

  return s;
};

class OutOfTensorBoundsException extends Error {
  constructor(tensor, dim, index, message) {
    super(message);

    this.tensor = tensor.clone();
    this.dim = dim;
    this.index = index;
  }
}

class Tensor {
  constructor(size, elements) {
    this.size = size || [];
    this.elements = [];
    for (let idx = 0; idx < this.size[0]; idx++) {
      if (elements && elements[idx] !== undefined && elements[idx] instanceof Tensor) {
        this.elements[idx] = elements[idx].clone();
        continue;
      }


      if (this.size.length == 1 && this.size[0] == 1) {
        this.elements[0] = undefined === elements || undefined === elements[0]
          ? undefined
          : elements[0];
        continue;
      }

      this.elements[idx] = new Tensor(
        (this.size.length > 1) ? this.size.slice(1) : [1],
        elements && elements[idx] !== undefined ? elements[idx] : undefined
      );

    }

    this.size[0] = this.elements.length;
  }

  clone() {
    return new Tensor(this.size, this.elements);
  }

  isVoid() {
    return this.size.length == 1 && this.size[0] === 0;
  }

  isScalar() {
    return this.size.length === this.size.reduce((s1, s2) => s1 + s2);
  }

  isVector2() {
    return this.size.length == 1 && this.size[0] === 2;
  }

  isVector3() {
    return this.size.length == 1 && this.size[0] === 3;
  }

  isVector4() {
    return this.size.length == 1 && this.size[0] === 4;
  }

  isSquaredMatrix() {
    return this.size.length == 2 && this.size[0] === this.size[1];
  }

  isMatrix2() {
    return this.size.length == 2 && this.size[0] === 2 && this.size[1] === 2;
  }

  isMatrix3() {
    return this.size.length == 2 && this.size[0] === 3 && this.size[1] === 3;
  }

  isMatrix4() {
    return this.size.length == 2 && this.size[0] === 4 && this.size[1] === 4;
  }

  getValueAt(...coords) {
    if (coords.length > this.size.length) {
      throw new OutOfTensorBoundsException(this, coords.length - 1, undefined);
    }

    if(coords.length > 0 && this.size.length > 0 && coords[0] >= this.size[0]) {
      throw new OutOfTensorBoundsException(this, 0, coords[0]);
    }

    if (!isNaN(coords[0])) {
      return coords.length === 1
        ? (this.elements[coords[0]] instanceof Tensor
          ? this.elements[coords[0]]
          : new Tensor([1], this.elements[coords[0]])
        )
        : (
          (undefined === this.elements[coords[0]])
            ? undefined
            : this.elements[coords[0]].getValueAt.call(this, coords.slice(1))
        );
    }

    let values = [];
    for (let s = 0; s < this.size[0]; s++) {
      if (this.size.length > 1) {
        values.push(this.elements[s].getValueAt.call(this, coords.slice(1)));
      }
    }

    return values.length > 0
      ? new Tensor([values.length].concat(values[0].size), values)
      : new Tensor([0]);
  }

  get x() {
    return this.getValueAt(0);
  }

  get y() {
    return this.getValueAt(1);
  }

  get z() {
    return this.getValueAt(2);
  }

  get w() {
    return this.getValueAt(3);
  }

  add(t) {
    if (undefined === t) {
      throw new Error('Missing argument t');
    }

    let addMap = (t) => {
        return (v) => {
          if (!isNaN(v)) {
            return v + t;
          }
          if (v instanceof Tensor) {
            return v.add(t);
          }
        };
    };

    if (!isNaN(t)) {
      this.elements = this.elements.map(addMap(t));

      return this;
    }

    if (!(t instanceof Tensor)) {
      throw new Error('Argument t must be a Tensor or a Number');
    }

    if (t.isScalar()) {
      this.elements = this.elements.map(addMap(t.elements[0]));

      return this;
    }

    if (t.size[0] !== this.size[0]) {
      throw new OutOfTensorBoundsException(this, 0, undefined);
    }
  }
}

/*
let minor = (i, j) => {
    let matrix = new Matrix3();
    let midx = 0;
    let mjdx = 0;
    for (let row = 0; row < this.size; row++) {
        if (i === row) {
          continue;
        }

      for (let col = 0; col < 4; col++) {
        if (j === col) {
          continue;
        }

        mjdx++;
        matrix[matrix.axisName(midx)][matrix.axisName(mjdx)] = this[this.axisName(row)][this.axisName(col)];
      }
      midx++;
    }

    return matrix;
  }
}
//*/

class Vector2 {
  constructor(x, y, nullable) {
    this.x = x === undefined ? (nullable ? null : 0) : x;
    this.y = y === undefined ? (nullable ? null : 0) : y;
    this.nullable = !!nullable;
  }

  add(t) {
    if (!isNaN(t)) {
      return new this.constructor(
        this.x + t,
        this.y + t
      );
    } else if (t instanceof Vector2) {
      return new this.constructor(
        this.x + t.x,
        this.y + t.y
      );
    }

    throw new Error('Not implemented add by ' + t.constructor.name);
  }

  sub(t) {
    if (!isNaN(t)) {
      return new this.constructor(
        this.x - t,
        this.y - t
      );
    } else if (t instanceof Vector2) {
      return new this.constructor(
        this.x - t.x,
        this.y - t.y
      );
    }

    throw new Error('Not implemented sub by ' + t.constructor.name);
  }

  multiply(t) {
    if (!isNaN(t)) {
      return new this.constructor(
        this.x * t,
        this.y * t
      );
    } else if (t instanceof Vector2) {
      return new this.constructor(
        this.x * t.x,
        this.y * t.y
      );
    }

    throw new Error('Not implemented multiply by ' + t.constructor.name);
  }

  divide(t) {
    if (!isNaN(t)) {
      return new this.constructor(
        this.x / t,
        this.y / t
      );
    } else if (t instanceof Vector2) {
      return new this.constructor(
        this.x / t.x,
        this.y / t.y
      );
    }

    throw new Error('Not implemented divide by ' + t.constructor.name);
  }

  math(fn) {
    return new this.constructor(
      Math[fn](this.x),
      Math[fn](this.y),
      this.nullable
    );
  }

  toVector3(z) {
    return new Vector3(
      this.x,
      this.y,
      z,
      this.nullable
    );
  }

  replace(v1, v2) {
    return new this.constructor(
      this.x === v1 ? v2 : this.x,
      this.y === v1 ? v2 : this.y,
      this.nullable || v2 === null
    );
  }

  toMask() {
    return new this.constructor(
      this.x === 0 ? null : 1,
      this.y === 0 ? null : 1,
      true
    );
  }

  clone() {
    return new this.constructor(
      this.x,
      this.y,
      this.nullable
    );
  }
}

class Vector3 {
  constructor(x, y, z, nullable) {
    if (typeof x == typeof true) {
      nullable = x;
      x = undefined;
    }

    this.x = x === undefined ? (nullable ? null : 0) : x;
    this.y = y === undefined ? (nullable ? null : 0) : y;
    this.z = z === undefined ? (nullable ? null : 0) : z;
    this.nullable = !!nullable;
  }

  clone() {
    return new this.constructor(this.x, this.y, this.z, this.nullable);
  }

  applyQuaternion(q) {
    var x = this.x, y = this.y, z = this.z;
    var qx = q.x,
        qy = q.y,
        qz = q.z,
        qw = q.w;

    // calculate quat * vector

    var ix =  qw * x + qy * z - qz * y;
    var iy =  qw * y + qz * x - qx * z;
    var iz =  qw * z + qx * y - qy * x;
    var iw = -qx * x - qy * y - qz * z;

    // calculate result * inverse quat

    return new this.constructor(
      ix * qw + iw * - qx + iy * - qz - iz * - qy,
      iy * qw + iw * - qy + iz * - qx - ix * - qz,
      iz * qw + iw * - qz + ix * - qy - iy * - qx
    );
  }

  toMask() {
    return new this.constructor(
      this.x === 0 ? null : 1,
      this.y === 0 ? null : 1,
      this.z === 0 ? null : 1,
      true
    );
  }

  toVector4(w) {
    return new Vector4(this.x, this.y, this.z, w, this.nullable);
  }

  toArray() {
    return [this.x*1, this.y*1, this.z*1];
  }

  add(t) {
    if (!isNaN(t)) {
      return new this.constructor(this.x + t, this.y + t, this.z + t);
    }
    if (t instanceof Vector3) {
      return new this.constructor(this.x + t.x, this.y + t.y, this.z + t.z);
    }
    throw new Error('Not implemented add a ' + t.constructor.name);
  }

  sub(t) {
    if (!isNaN(t)) {
      return new this.constructor(this.x - t, this.y - t, this.z - t);
    }
    if (t instanceof Vector3) {
      return new this.constructor(this.x - t.x, this.y - t.y, this.z - t.z);
    }

    throw new Error('Not implemented substract a ' + t.constructor.name);
  }

  multiply(t) {
    if (!isNaN(t)) {
      return new this.constructor(
        this.x * t,
        this.y * t,
        this.z * t
      );
    } else if (t instanceof Vector3) {
      return new this.constructor(
        this.x * t.x,
        this.y * t.y,
        this.z * t.z
      );
    }

    throw new Error('Not implemented multiply by ' + t.constructor.name);
  }

  divide(t) {
    if (!isNaN(t)) {
      return new this.constructor(this.x / t, this.y / t, this.z / t);
    } else if(t instanceof Vector3) {
      return new this.constructor(
        this.x / t.x,
        this.y / t.y,
        this.z / t.z
      );
    }

    throw new Error('not implemented divide by ' + t.constructor.name);
  }

  mod(v) {
    return new this.constructor(
      this.x % v,
      this.y % v,
      this.z % v
    );
  }

  math(functionName) {
    let func = Math[functionName];
    return new this.constructor(
      func(this.x),
      func(this.y),
      func(this.z)
    );
  }

  /*
   * (new Vector3(-1.5, 0, 1.5)).math('round') -> new Vector3(-1, 0, 2)
   * (new Vector3(-1.5, 0, 1.5)).symround() -> new Vector3(-2, 0, 2)
   */
  symround() {
    return new this.constructor(
      Math.sign(this.x) * Math.round(Math.abs(this.x)),
      Math.sign(this.y) * Math.round(Math.abs(this.y)),
      Math.sign(this.z) * Math.round(Math.abs(this.z))
    );
  }

  replace(v1, v2) {
    return new this.constructor(
      this.x === v1 ? v2 : this.x,
      this.y === v1 ? v2 : this.y,
      this.z === v1 ? v2 : this.z,
      this.nullable || v2 === null
    );
  }

  lengthSquared() {
    return this.x * this.x + this.y * this.y + this.z * this.z;
  }

  length() {
    return Math.sqrt(this.lengthSquared());
  }

  normalize() {
    return this.divide(this.length());
  }

  mask(v) {
    return new this.constructor(
      v.x === null ? null : this.x * v.x,
      v.y === null ? null : this.y * v.y,
      v.z === null ? null : this.z * v.z
    );
  }

  equals(t) {
    if (!t instanceof Vector3) {
      return false;
    }

    return this.x == t.x && this.y == t.y && this.z == t.z && this.nullable == t.nullable;
  }
}

class Vector4 {
  constructor(x, y, z, w, nullable) {
    if (typeof x == typeof true) {
      nullable = x;
      x = undefined;
    }

    this.x = x === undefined ? (nullable ? null : 0) : x;
    this.y = y === undefined ? (nullable ? null : 0) : y;
    this.z = z === undefined ? (nullable ? null : 0) : z;
    this.w = w === undefined ? (nullable ? null : 0) : w;
    this.nullable = !!nullable;
  }

  clone() {
    return new this.constructor(this.x, this.y, this.z, this.w, this.nullable);
  }

  add(t) {
    if (!isNaN(t)) {
      return new this.constructor(
        this.x + t,
        this.y + t,
        this.z + t,
        this.w + t
      );
    } else if (t instanceof Vector4) {
      return new this.constructor(
        this.x + t.x,
        this.y + t.y,
        this.z + t.z,
        this.w + t.w
      );
    }

    throw new Error('Not implemented add  by ' + t.constructor.name);
  }

  sub(t) {
    if (!isNaN(t)) {
      return new this.constructor(
        this.x - t,
        this.y - t,
        this.z - t,
        this.w - t
      );
    } else if (t instanceof Vector4) {
      return new this.constructor(
        this.x - t.x,
        this.y - t.y,
        this.z - t.z,
        this.w - t.w,
      );
    }

    throw new Error('Not implemented sub  by ' + t.constructor.name);
  }

  multiply(t) {
    if (!isNaN(t)) {
      return new this.constructor(
        this.x * t,
        this.y * t,
        this.z * t,
        this.w * t
      );
    } else if (t instanceof Vector4) {
      return new this.constructor(
        this.x * t.x,
        this.y * t.y,
        this.z * t.z,
        this.w * t.w,
      );
    }

    throw new Error('Not implemented multiply  by ' + t.constructor.name);
  }

  divide(t) {
    if (!isNaN(t)) {
      return new this.constructor(
        this.x / t,
        this.y / t,
        this.z / t,
        this.w / t
      );
    } else if (t instanceof Vector4) {
      return new this.constructor(
        this.x / t.x,
        this.y / t.y,
        this.z / t.z,
        this.w / t.w,
      );
    }

    throw new Error('Not implemented divide by ' + t.constructor.name);
  }

  equals(t) {
    if (!t instanceof Vector4) {
      return false;
    }

    return this.x == t.x && this.y == t.y && this.z == t.z && this.w == t.w && this.nullable == t.nullable;
  }

  applyQuaternion(q) {
    return this.toVector3().applyQuaternion(q).toVector4(this.w);
  }

  toVector3() {
    return new Vector3(this.x, this.y, this.z, this.nullable);
  }

  toArray() {
    return [this.x, this.y, this.z, this.w];
  }

  replace(v1, v2) {
    return new this.constructor(
      this.x === v1 ? v2 : this.x,
      this.y === v1 ? v2 : this.y,
      this.z === v1 ? v2 : this.z,
      this.w === v1 ? v2 : this.w,
      this.nullable || v2 === null
    );
  }

  toMask() {
    return new this.constructor(
      this.x === 0 ? null : 1,
      this.y === 0 ? null : 1,
      this.z === 0 ? null : 1,
      this.w === 0 ? null : 1,
      true
    );
  }
}

class Quaternion extends Vector4 {
  toMatrix3() {
    return [
      1 - 2 * this.y * this.y - 2 * this.z * this.z,
      2 * this.x * this.y - 2 * this.z * this.w,
      2 * this.x * this.z + 2 * this.y * this.w,

      2 * this.x * this.y + 2 * this.z * this.w,
      1 - 2 * this.x * this.x - 2 * this.z * this.z,
      2 * this.y * this.z - 2 * this.x * this.w,

      2 * this.x * this.z - 2 * this.y * this.w,
      2 * this.y * this.z + 2 * this.x * this.w,
      1 - 2 * this.x * this.x - 2 * this.y * this.y
    ];
  }

  toMatrix4() {
    return new Matrix4(
      new Vector4(
        1 - 2 * this.y * this.y - 2 * this.z * this.z,
        2 * this.x * this.y - 2 * this.z * this.w,
        2 * this.x * this.z + 2 * this.y * this.w,
        0
      ),
      new Vector4(
        2 * this.x * this.y + 2 * this.z * this.w,
        1 - 2 * this.x * this.x - 2 * this.z * this.z,
        2 * this.y * this.z - 2 * this.x * this.w,
        0
      ),
      new Vector4(
        2 * this.x * this.z - 2 * this.y * this.w,
        2 * this.y * this.z + 2 * this.x * this.w,
        1 - 2 * this.x * this.x - 2 * this.y * this.y,
        0
      ),
      new Vector4(0, 0, 0, 1)
    );
  }

  conjugate() {
    return new this.constructor(
      -this.x,
      -this.y,
      -this.z,
      this.w,
      this.nullable
    );
  }

  multiply(t) {
    if (t instanceof Quaternion) {
      return new this.constructor(
        this.w * t.w - this.x * t.x - this.y * t.y - this.z * t.z,
        this.w * t.x + this.x * t.w + this.y * t.z - this.z * t.y,
        this.w * t.y - this.x * t.z + this.y * t.w + this.z * t.x,
        this.w * t.z + this.x * t.y - this.y * t.x + this.z * t.w
      );
    }

    return super.multiply(t);
  }

  normalize() {
    let v = (new Vector3(this.x, this.y, this.z)).normalize();

    return new this.constructor(v.x, v.y, v.z, this.w);
  }


  equals(t) {
    if (!t instanceof Quaternion) {
      return false;
    }

    return parent.equals(t);
  }
}

Quaternion.fromAxisAngle = (axis, angleInPiRadians, normalize) => {
  if (normalize !== false) {
    axis = axis.normalize();
  }

  let halfAngle = angleInPiRadians/2;
  let sHalfAngle = Math.sinpi(halfAngle);

  return new Quaternion(
    axis.x * sHalfAngle,
    axis.y * sHalfAngle,
    axis.z * sHalfAngle,
    Math.cospi(halfAngle)
  );
}

class Matrix3 {
  constructor(xRow, yRow, zRow, nullable) {
    if (typeof xRow == typeof true) {
      nullable = x;
      x = undefined;
    }

    this.x = xRow instanceof Vector3 ? xRow.clone() : new Vector3(nullable);
    this.y = yRow instanceof Vector3 ? yRow.clone() : new Vector3(nullable);
    this.z = zRow instanceof Vector3 ? zRow.clone() : new Vector3(nullable);
    this.nullable = !!nullable;
  }

  add(t) {
    let result = new this.constructor();
    if (!isNaN(t)) {
      result.x = this.x.add(t);
      result.y = this.y.add(t);
      result.z = this.z.add(t);
    } else {
      result.x = this.x.add(t.x);
      result.y = this.y.add(t.y);
      result.z = this.z.add(t.z);
    }

    return result;
  }

  multiply(t) {
    // return this.transmultiply(t);

    if (!isNaN(t)) {
      return new this.constructor(
        this.x.multiply(t),
        this.y.multiply(t),
        this.z.multiply(t),
        this.w.multiply(t)
      );
    } else if (t instanceof Vector3) {
      return new Vector3(
        this.x.x * t.x + this.x.y * t.y + this.x.z * t.z,
        this.y.x * t.y + this.y.y * t.y + this.y.z * t.z,
        this.z.x * t.z + this.z.y * t.y + this.z.z * t.z,
        this.nullable
      );
    } else if (t instanceof Matrix3) {
      return new this.constructor(
        new Vector3(
          t.x.x * this.x.x + t.y.x * this.x.y + t.z.x * this.x.z,
          t.x.y * this.x.x + t.y.y * this.x.y + t.z.y * this.x.z,
          t.x.z * this.x.x + t.y.z * this.x.y + t.z.z * this.x.z,
          this.nullable
        ),
        new Vector3(
          t.x.x * this.y.x + t.y.x * this.y.y + t.z.x * this.y.z,
          t.x.y * this.y.x + t.y.y * this.y.y + t.z.y * this.y.z,
          t.x.z * this.y.x + t.y.z * this.y.y + t.z.z * this.y.z,
          this.nullable
        ),
        new Vector3(
          t.x.x * this.z.x + t.y.x * this.z.y + t.z.x * this.z.z,
          t.x.y * this.z.x + t.y.y * this.z.y + t.z.y * this.z.z,
          t.x.z * this.z.x + t.y.z * this.z.y + t.z.z * this.z.z,
          this.nullable
        ),
        this.nullable
      );
    }

    throw new Error('Not implemented multiply by ' + t.constructor.name);
  }

  transmultiply(t) {
    if (!isNaN(t)) {
      return new this.constructor(
        this.x.multiply(t),
        this.y.multiply(t),
        this.z.multiply(t),
        this.nullable
      );
    } else if (t instanceof Vector3) {
      return new Vector3(
        this.x.x * t.x + this.y.x * t.y + this.z.x * t.z,
        this.x.y * t.y + this.y.y * t.y + this.z.y * t.z,
        this.x.z * t.z + this.y.z * t.y + this.z.z * t.z,
        this.nullable
      );
    } else if (t instanceof Matrix3) {
      return new this.constructor(
        new Vector3(
          t.x.x * this.x.x + t.x.y * this.y.x + t.x.z * this.z.x,
          t.x.x * this.x.y + t.x.y * this.y.y + t.x.z * this.z.x,
          t.x.x * this.x.z + t.x.y * this.y.z + t.x.z * this.z.z,
          this.nullable
        ),
        new Vector3(
          t.y.x * this.x.x + t.y.y * this.y.x + t.y.z * this.z.x,
          t.y.x * this.x.y + t.y.y * this.y.y + t.y.z * this.z.y,
          t.y.x * this.x.z + t.y.y * this.y.z + t.y.z * this.z.z,
          this.nullable
        ),
        new Vector3(
          t.z.x * this.x.x + t.z.y * this.y.x + t.z.z * this.z.x,
          t.z.x * this.x.y + t.z.y * this.y.y + t.z.z * this.z.y,
          t.z.x * this.x.z + t.z.y * this.y.z + t.z.z * this.z.z,
          this.nullable
        ),
        this.nullable
      );
    }

    throw new Error('Not implemented multiply by ' + t.constructor.name);
  }

  transpose() {
    return new this.constructor(
      new Vector3(this.x.x, this.y.x, this.z.x, this.nullable),
      new Vector3(this.x.y, this.y.y, this.z.y, this.nullable),
      new Vector3(this.x.z, this.y.z, this.z.z, this.nullable),
      this.nullable
    );
  }

  determinant() {
    return this.x.x * this.y.y * this.z.z
      + this.x.y * this.y.z * this.z.x
      + this.x.z * this.y.x * this.z.y
      - this.x.z * this.y.y * this.z.x
      - this.x.x * this.y.z * this.z.y
      - this.x.y * this.y.x * this.z.z;
  }

  toMatrix4(wCol) {
    return new Matrix4(
      this.x.toVector4(),
      this.y.toVector4(),
      this.z.toVector4(),
      wCol,
      this.nullable
    );
  }

  equals(t) {
    if (!t instanceof Matrix3) {
      return false;
    }

    return this.x.equals(t.x) && this.y.equals(t.y) && this.z.equals(t.z) && this.nullable == t.nullable;
  }
}

class Matrix4 {
  constructor(xRow, yRow, zRow, wRow, nullable) {
    if (typeof x == typeof true) {
      nullable = x;
      x = undefined;
    }

    this.x = xRow instanceof Vector4 ? xRow.clone() : new Vector4(nullable);
    this.y = yRow instanceof Vector4 ? yRow.clone() : new Vector4(nullable);
    this.z = zRow instanceof Vector4 ? zRow.clone() : new Vector4(nullable);
    this.w = wRow instanceof Vector4 ? wRow.clone() : new Vector4(nullable);

    this.nullable = !!nullable;
  }

  add(t) {
    let result = new this.constructor();
    if (!isNaN(t)) {
      result.x = this.x.add(t);
      result.y = this.y.add(t);
      result.z = this.z.add(t);
      result.w = this.w.add(t);
    } else {
      result.x = this.x.add(t.x);
      result.y = this.y.add(t.y);
      result.z = this.z.add(t.z);
      result.w = this.w.add(t.w);
    }

    return result;
  }

  multiply(t) {
    // return this.transmultiply(t);

    if (!isNaN(t)) {
      return new this.constructor(
        this.x.multiply(t),
        this.y.multiply(t),
        this.z.multiply(t),
        this.w.multiply(t)
      );
    } else if (t instanceof Vector3) {
      let w = 1 / (this.w.x * t.x + this.w.y * t.y + this.w.z * t.z + this.w.w);

      return new Vector3(
        (this.x.x * t.x + this.x.y * t.y + this.x.z * t.z) * w,
        (this.y.x * t.y + this.y.y * t.y + this.y.z * t.z) * w,
        (this.z.x * t.z + this.z.y * t.y + this.z.z * t.z) * w,
        this.nullable
      );
    } else if (t instanceof Vector4) {
      return new Vector4(
        this.x.x * t.x + this.x.y * t.y + this.x.z * t.z + this.x.w * t.w,
        this.y.x * t.y + this.y.y * t.y + this.y.z * t.z + this.y.w * t.w,
        this.z.x * t.z + this.z.y * t.y + this.z.z * t.z + this.z.w * t.w,
        this.w.x * t.w + this.w.y * t.y + this.w.z * t.z + this.w.w * t.w,
        this.nullable
      );
    } else if (t instanceof Matrix4) {
      return new this.constructor(
        new Vector4(
          t.x.x * this.x.x + t.y.x * this.x.y + t.z.x * this.x.z + t.w.x * this.x.w,
          t.x.y * this.x.x + t.y.y * this.x.y + t.z.y * this.x.z + t.w.y * this.x.w,
          t.x.z * this.x.x + t.y.z * this.x.y + t.z.z * this.x.z + t.w.z * this.x.w,
          t.x.w * this.x.x + t.y.w * this.x.y + t.z.w * this.x.z + t.w.w * this.x.w,
          this.nullable
        ),
        new Vector4(
          t.x.x * this.y.x + t.y.x * this.y.y + t.z.x * this.y.z + t.w.x * this.y.w,
          t.x.y * this.y.x + t.y.y * this.y.y + t.z.y * this.y.z + t.w.y * this.y.w,
          t.x.z * this.y.x + t.y.z * this.y.y + t.z.z * this.y.z + t.w.z * this.y.w,
          t.x.w * this.y.x + t.y.w * this.y.y + t.z.w * this.y.z + t.w.w * this.y.w,
          this.nullable
        ),
        new Vector4(
          t.x.x * this.z.x + t.y.x * this.z.y + t.z.x * this.z.z + t.w.x * this.z.w,
          t.x.y * this.z.x + t.y.y * this.z.y + t.z.y * this.z.z + t.w.y * this.z.w,
          t.x.z * this.z.x + t.y.z * this.z.y + t.z.z * this.z.z + t.w.z * this.z.w,
          t.x.w * this.z.x + t.y.w * this.z.y + t.z.w * this.z.z + t.w.w * this.z.w,
          this.nullable
        ),
        new Vector4(
          t.x.x * this.w.x + t.y.x * this.w.y + t.z.x * this.w.z + t.w.x * this.w.w,
          t.x.y * this.w.x + t.y.y * this.w.y + t.z.y * this.w.z + t.w.y * this.w.w,
          t.x.z * this.w.x + t.y.z * this.w.y + t.z.z * this.w.z + t.w.z * this.w.w,
          t.x.w * this.w.x + t.y.w * this.w.y + t.z.w * this.w.z + t.w.w * this.w.w,
          this.nullable
        )
      );
    }

    throw new Error('Not implemented multiply by ' + t.constructor.name);
  }

  transmultiply(t) {
    if (!isNaN(t)) {
      return new this.constructor(
        this.x.multiply(t),
        this.y.multiply(t),
        this.z.multiply(t),
        this.w.multiply(t)
      );
    } else if (t instanceof Vector3) {
      let w = 1 / (this.x.w * t.x + this.y.w * t.y + this.z.w * t.z + this.w.w);

      return new Vector3(
        (this.x.x * t.x + this.y.x * t.y + this.z.x * t.z) * w,
        (this.x.y * t.y + this.y.y * t.y + this.z.y * t.z) * w,
        (this.x.z * t.z + this.y.z * t.y + this.z.z * t.z) * w,
        this.nullable
      );
    } else if (t instanceof Vector4) {
      return new Vector4(
        this.x.x * t.x + this.x.y * t.y + this.x.z * t.z + this.x.w * t.w,
        this.y.x * t.y + this.y.y * t.y + this.y.z * t.z + this.y.w * t.w,
        this.z.x * t.z + this.z.y * t.y + this.z.z * t.z + this.z.w * t.w,
        this.w.x * t.w + this.w.y * t.y + this.w.z * t.z + this.w.w * t.w,
        this.nullable
      );
    } else if (t instanceof Matrix4) {
      return new this.constructor(
        new Vector4(
          t.x.x * this.x.x + t.x.y * this.y.x + t.x.z * this.z.x + t.x.w * this.w.x,
          t.x.x * this.x.y + t.x.y * this.y.y + t.x.z * this.z.x + t.x.w * this.w.y,
          t.x.x * this.x.z + t.x.y * this.y.z + t.x.z * this.z.z + t.x.w * this.w.z,
          t.x.x * this.x.w + t.x.y * this.y.w + t.x.z * this.z.w + t.x.w * this.w.w,
          this.nullable
        ),
        new Vector4(
          t.y.x * this.x.x + t.y.y * this.y.x + t.y.z * this.z.x + t.y.w * this.w.x,
          t.y.x * this.x.y + t.y.y * this.y.y + t.y.z * this.z.y + t.y.w * this.w.y,
          t.y.x * this.x.z + t.y.y * this.y.z + t.y.z * this.z.z + t.y.w * this.w.z,
          t.y.x * this.x.w + t.y.y * this.y.w + t.y.z * this.z.w + t.y.w * this.w.w,
          this.nullable
        ),
        new Vector4(
          t.z.x * this.x.x + t.z.y * this.y.x + t.z.z * this.z.x + t.z.w * this.w.x,
          t.z.x * this.x.y + t.z.y * this.y.y + t.z.z * this.z.y + t.z.w * this.w.y,
          t.z.x * this.x.z + t.z.y * this.y.z + t.z.z * this.z.z + t.z.w * this.w.z,
          t.z.x * this.x.w + t.z.y * this.y.w + t.z.z * this.z.w + t.z.w * this.w.w,
          this.nullable
        ),
        new Vector4(
          t.w.x * this.x.x + t.w.y * this.y.x + t.w.z * this.z.x + t.w.w * this.w.x,
          t.w.x * this.x.y + t.w.y * this.y.y + t.w.z * this.z.y + t.w.w * this.w.y,
          t.w.x * this.x.z + t.w.y * this.y.z + t.w.z * this.z.z + t.w.w * this.w.z,
          t.w.x * this.x.w + t.w.y * this.y.w + t.w.z * this.z.w + t.w.w * this.w.w,
          this.nullable
        )
      );
    }

    throw new Error('Not implemented multiply by ' + t.constructor.name);
  }

  equals(t) {
    if (!t instanceof Matrix4) {
      return false;
    }

    return this.x.equals(t.x)
      && this.y.equals(t.y)
      && this.z.equals(t.z)
      && this.w.equals(t.w)
      && this.nullable == t.nullable;
  }

  transpose() {
    return new this.constructor(
      new Vector4(this.x.x, this.y.x, this.z.x, this.w.x, this.nullable),
      new Vector4(this.x.y, this.y.y, this.z.y, this.w.y, this.nullable),
      new Vector4(this.x.z, this.y.z, this.z.z, this.w.z, this.nullable),
      new Vector4(this.x.w, this.y.w, this.z.w, this.w.w, this.nullable),
      this.nullable
    );
  }

  translate(v3) {
    //console.log('translate', this.clone(), v3.clone());
    //console.log(this.clone(), Matrix4.transtranslation(v3), this.transmultiply(Matrix4.transtranslation(v3)), this.transmultiply(Matrix4.transtranslation(v3)).transmultiply(new Vector3(0, 0, 0)));
    //console.log(this.transpose(), Matrix4.translation(v3), this.multiply(Matrix4.transtranslation(v3)), this.multiply(Matrix4.transtranslation(v3)).multiply(new Vector3(0, 0, 0)));

    //return this.transmultiply(Matrix4.transtranslation(v3));
    // return this.transpose().multiply(Matrix4.translation(v3)).transpose();
    return this.multiply(Matrix4.translation(v3));
  }

  xRotate(angleInRadians) {
    return this.multiply(Matrix4.xRotation(angleInRadians));
  }

  yRotate(angleInRadians) {
    return this.multiply(Matrix4.yRotation(angleInRadians));
  }

  zRotate(angleInRadians) {
    return this.multiply(Matrix4.zRotation(angleInRadians));
  }

  wRotate(angleInRadians) {
    return this.multiply(Matrix4.wRotation(angleInRadians));
  }

  scale(v) {
    return this.multiply(Matrix4.scaling(v));
  }

  /**
   * Diagonales vers bas droite - diagonales vers bas gauche
   */
  determinant() {
    return this.x.x * this.y.y * this.z.z * this.w.w
      + this.x.y * this.y.z * this.z.w * this.w.x
      + this.x.z * this.y.x * this.z.x * this.w.y
      + this.x.w * this.y.x * this.z.y * this.w.z
      - this.x.w * this.y.z * this.z.y * this.w.x
      - this.x.x * this.y.w * this.z.z * this.w.y
      - this.x.y * this.y.x * this.z.w * this.w.z
      - this.x.z * this.y.y * this.z.x * this.w.w
  }

  comatrix() {
    var detxx = (
        new Matrix3(
          new Vector3(this.y.y, this.y.z, this.y.w),
          new Vector3(this.z.y, this.z.z, this.z.w),
          new Vector3(this.w.y, this.w.z, this.w.w)
        )
      )
        .determinant();
    var detxy = (
      new Matrix3(
        new Vector3(this.y.x, this.y.z, this.y.w),
        new Vector3(this.z.x, this.z.z, this.z.w),
        new Vector3(this.w.x, this.w.z, this.w.w)
      )
    )
      .determinant();
    var detxz = (
      new Matrix3(
        new Vector3(this.y.x, this.y.y, this.y.w),
        new Vector3(this.z.x, this.z.y, this.z.w),
        new Vector3(this.w.x, this.w.y, this.w.w)
      )
    )
      .determinant();
    var detxw = (
      new Matrix3(
        new Vector3(this.y.x, this.y.y, this.y.z),
        new Vector3(this.z.x, this.z.y, this.z.z),
        new Vector3(this.w.x, this.w.y, this.w.z)
      )
    )
      .determinant();



    var detyx = (
      new Matrix3(
        new Vector3(this.x.y, this.x.z, this.x.w),
        new Vector3(this.z.y, this.z.z, this.z.w),
        new Vector3(this.w.y, this.w.z, this.w.w)
      )
    )
      .determinant();
    var detyy = (
      new Matrix3(
        new Vector3(this.x.x, this.x.z, this.x.w),
        new Vector3(this.z.x, this.z.z, this.z.w),
        new Vector3(this.w.x, this.w.z, this.w.w)
      )
    )
      .determinant();
    var detyz = (
      new Matrix3(
        new Vector3(this.x.x, this.x.y, this.x.w),
        new Vector3(this.z.x, this.z.y, this.z.w),
        new Vector3(this.w.x, this.w.y, this.w.w)
      )
    )
      .determinant();
    var detyw = (
      new Matrix3(
        new Vector3(this.x.x, this.x.y, this.x.z),
        new Vector3(this.z.x, this.z.y, this.z.z),
        new Vector3(this.w.x, this.w.y, this.w.z)
      )
    )
      .determinant();

    var detzx = (
      new Matrix3(
        new Vector3(this.x.y, this.x.z, this.x.w),
        new Vector3(this.y.y, this.y.z, this.y.w),
        new Vector3(this.w.y, this.w.z, this.w.w)
      )
    )
      .determinant();
    var detzy = (
      new Matrix3(
        new Vector3(this.x.x, this.x.z, this.x.w),
        new Vector3(this.y.x, this.y.z, this.y.w),
        new Vector3(this.w.x, this.w.z, this.w.w)
      )
    )
      .determinant();
    var detzz = (
      new Matrix3(
        new Vector3(this.x.x, this.x.y, this.x.w),
        new Vector3(this.y.x, this.y.y, this.y.w),
        new Vector3(this.w.x, this.w.y, this.w.w)
      )
    )
      .determinant();
    var detzw = (
      new Matrix3(
        new Vector3(this.x.x, this.x.y, this.x.z),
        new Vector3(this.y.x, this.y.y, this.y.z),
        new Vector3(this.w.x, this.w.y, this.w.z)
      )
    )
      .determinant();



    var detwx = (
      new Matrix3(
        new Vector3(this.x.y, this.x.z, this.x.w),
        new Vector3(this.y.y, this.y.z, this.y.w),
        new Vector3(this.z.y, this.z.z, this.z.w)
      )
    )
      .determinant();
    var detwy = (
      new Matrix3(
        new Vector3(this.x.x, this.x.z, this.x.w),
        new Vector3(this.y.x, this.y.z, this.y.w),
        new Vector3(this.z.x, this.z.z, this.z.w)
      )
    )
      .determinant();
    var detwz = (
      new Matrix3(
        new Vector3(this.x.x, this.x.y, this.x.w),
        new Vector3(this.y.x, this.y.y, this.y.w),
        new Vector3(this.z.x, this.z.y, this.z.w)
      )
    )
      .determinant();
    var detww = (
      new Matrix3(
        new Vector3(this.x.x, this.x.y, this.x.z),
        new Vector3(this.y.x, this.y.y, this.y.z),
        new Vector3(this.z.x, this.z.y, this.z.z)
      )
    )
      .determinant();

    return new Matrix4(
      new Vector4(detxx, detxy, detxz, detxw),
      new Vector4(detyx, detyy, detyz, detyw),
      new Vector4(detzx, detzy, detzz, detzw),
      new Vector4(detwx, detwy, detwz, detww)
    );
  }

  inverse() {
    //return this.comatrix().multiply(1/this.determinant());

    var tmp_0  = this.z.z * this.w.w;
    var tmp_1  = this.w.z * this.z.w;
    var tmp_2  = this.y.z * this.w.w;
    var tmp_3  = this.w.z * this.y.w;
    var tmp_4  = this.y.z * this.z.w;
    var tmp_5  = this.z.z * this.y.w;
    var tmp_6  = this.x.z * this.w.w;
    var tmp_7  = this.w.z * this.x.w;
    var tmp_8  = this.x.z * this.z.w;
    var tmp_9  = this.z.z * this.x.w;
    var tmp_10 = this.x.z * this.y.w;
    var tmp_11 = this.y.z * this.x.w;
    var tmp_12 = this.z.x * this.w.y;
    var tmp_13 = this.w.x * this.z.y;
    var tmp_14 = this.y.x * this.w.y;
    var tmp_15 = this.w.x * this.y.y;
    var tmp_16 = this.y.x * this.z.y;
    var tmp_17 = this.z.x * this.y.y;
    var tmp_18 = this.x.x * this.w.y;
    var tmp_19 = this.w.x * this.x.y;
    var tmp_20 = this.x.x * this.z.y;
    var tmp_21 = this.z.x * this.x.y;
    var tmp_22 = this.x.x * this.y.y;
    var tmp_23 = this.y.x * this.x.y;

    var t0 = (tmp_0 * this.y.y + tmp_3 * this.z.y + tmp_4 * this.w.y) -
             (tmp_1 * this.y.y + tmp_2 * this.z.y + tmp_5 * this.w.y);
    var t1 = (tmp_1 * this.x.y + tmp_6 * this.z.y + tmp_9 * this.w.y) -
             (tmp_0 * this.x.y + tmp_7 * this.z.y + tmp_8 * this.w.y);
    var t2 = (tmp_2 * this.x.y + tmp_7 * this.y.y + tmp_10 * this.w.y) -
             (tmp_3 * this.x.y + tmp_6 * this.y.y + tmp_11 * this.w.y);
    var t3 = (tmp_5 * this.x.y + tmp_8 * this.y.y + tmp_11 * this.z.y) -
             (tmp_4 * this.x.y + tmp_9 * this.y.y + tmp_10 * this.z.y);

    var d = 1.0 / (this.x.x * t0 + this.y.x * t1 + this.z.x * t2 + this.w.x * t3);
    console.log(this, 1/d, this.determinant());

    return new this.constructor(
      new Vector4(
        d * t0,
        d * t1,
        d * t2,
        d * t3
      ),
      new Vector4(
        d * ((tmp_1 * this.y.x + tmp_2 * this.z.x + tmp_5 * this.w.x) -
             (tmp_0 * this.y.x + tmp_3 * this.z.x + tmp_4 * this.w.x)),
        d * ((tmp_0 * this.x.x + tmp_7 * this.z.x + tmp_8 * this.w.x) -
             (tmp_1 * this.x.x + tmp_6 * this.z.x + tmp_9 * this.w.x)),
        d * ((tmp_3 * this.x.x + tmp_6 * this.y.x + tmp_11 * this.w.x) -
             (tmp_2 * this.x.x + tmp_7 * this.y.x + tmp_10 * this.w.x)),
        d * ((tmp_4 * this.x.x + tmp_9 * this.y.x + tmp_10 * this.z.x) -
             (tmp_5 * this.x.x + tmp_8 * this.y.x + tmp_11 * this.z.x))
      ),
      new Vector4(
        d * ((tmp_12 * this.y.w + tmp_15 * this.z.w + tmp_16 * this.w.w) -
             (tmp_13 * this.y.w + tmp_14 * this.z.w + tmp_17 * this.w.w)),
        d * ((tmp_13 * this.x.w + tmp_18 * this.z.w + tmp_21 * this.w.w) -
             (tmp_12 * this.x.w + tmp_19 * this.z.w + tmp_20 * this.w.w)),
        d * ((tmp_14 * this.x.w + tmp_19 * this.y.w + tmp_22 * this.w.w) -
             (tmp_15 * this.x.w + tmp_18 * this.y.w + tmp_23 * this.w.w)),
        d * ((tmp_17 * this.x.w + tmp_20 * this.y.w + tmp_23 * this.z.w) -
             (tmp_16 * this.x.w + tmp_21 * this.y.w + tmp_22 * this.z.w))
      ),
      new Vector4(
        d * ((tmp_14 * this.z.z + tmp_17 * this.w.z + tmp_13 * this.y.z) -
             (tmp_16 * this.w.z + tmp_12 * this.y.z + tmp_15 * this.z.z)),
        d * ((tmp_20 * this.w.z + tmp_12 * this.x.z + tmp_19 * this.z.z) -
             (tmp_18 * this.z.z + tmp_21 * this.w.z + tmp_13 * this.x.z)),
        d * ((tmp_18 * this.y.z + tmp_23 * this.w.z + tmp_15 * this.x.z) -
             (tmp_22 * this.w.z + tmp_14 * this.x.z + tmp_19 * this.y.z)),
        d * ((tmp_22 * this.z.z + tmp_16 * this.x.z + tmp_21 * this.y.z) -
             (tmp_20 * this.y.z + tmp_23 * this.z.z + tmp_17 * this.x.z))
      )
    );
  }

  clone() {
    return new this.constructor(this.x, this.y, this.z, this.w);
  }

  toArray() {
    return [
      this.x.x, this.x.y, this.x.z, this.x.w,
      this.y.x, this.y.y, this.y.z, this.y.w,
      this.z.x, this.z.y, this.z.z, this.z.w,
      this.w.x, this.w.y, this.w.z, this.w.w,
    ];
  }
}

Matrix4.perspective = (fieldOfViewInRadians, aspect, near, far) => {
  var f = Math.tan(Math.PI * 0.5 - 0.5 * fieldOfViewInRadians);
  var rangeInv = 1.0 / (near - far);

  return new Matrix4(
    new Vector4(f / aspect, 0, 0, 0),
    new Vector4(0, f, 0, 0),
    new Vector4(0, 0, (near + far) * rangeInv, -1),
    new Vector4(0, 0, near * far * rangeInv * 2, 0)
  );
};

Matrix4.projection = (width, height, depth) => {
  // Note: This matrix flips the Y axis so 0 is at the top.
  return new Matrix4(
    new Vector4(2 / width, 0, 0, 0),
    new Vector4(0, -2 / height, 0, 0),
    new Vector4(0, 0, 2 / depth, 0),
    new Vector4(-1, 1, 0, 1)
  );
};

Matrix4.translation = (v3) => {
  return new Matrix4(
     new Vector4(1, 0, 0, v3.x),
     new Vector4(0, 1, 0, v3.y),
     new Vector4(0, 0, 1, v3.z),
     new Vector4(0, 0, 0, 1)
  );
};

Matrix4.transtranslation = (v3) => {
  return Matrix4.translation(v3).transpose();
};

Matrix4.xRotation = (angleInPiRadians) => {
  var c = Math.cospi(angleInPiRadians);
  var s = Math.sinpi(angleInPiRadians);

  return new Matrix4(
    new Vector4(1, 0, 0, 0),
    new Vector4(0, c, s, 0),
    new Vector4(0, -s, c, 0),
    new Vector4(0, 0, 0, 1)
  );
};

Matrix4.yRotation = (angleInPiRadians) => {
  var c = Math.cospi(angleInPiRadians);
  var s = Math.sinpi(angleInPiRadians);

  return new Matrix4(
    new Vector4(c, 0, -s, 0),
    new Vector4(0, 1, 0, 0),
    new Vector4(s, 0, c, 0),
    new Vector4(0, 0, 0, 1)
  );
};

Matrix4.zRotation = (angleInPiRadians) => {
  var c = Math.cospi(angleInPiRadians);
  var s = Math.sinpi(angleInPiRadians);

  return new Matrix4(
    new Vector4(c, s, 0, 0),
    new Vector4(-s, c, 0, 0),
    new Vector4(0, 0, 1, 0),
    new Vector4(0, 0, 0, 1),
  );
};

Matrix4.xyRotation = (angleInPiRadians) => {
  var c = Math.cospi(angleInPiRadians);
  var s = Math.sinpi(angleInPiRadians);

  return new Matrix4(
    new Vector4(1, 0, 0, 0),
    new Vector4(0, 1, 0, 0),
    new Vector4(0, 0, c, s),
    new Vector4(0, 0, -s, c),
  );
};

Matrix4.xzRotation = (angleInPiRadians) => {
  var c = Math.cospi(angleInPiRadians);
  var s = Math.sinpi(angleInPiRadians);

  return new Matrix4(
    new Vector4(1, 0, 0, 0),
    new Vector4(0, c, 0, s),
    new Vector4(0, 0, 1, 0),
    new Vector4(0, -s, 0, c),
  );
};

Matrix4.yzRotation = (angleInPiRadians) => {
  var c = Math.cospi(angleInPiRadians);
  var s = Math.sinpi(angleInPiRadians);

  return new Matrix4(
    new Vector4(c, 0, 0, s),
    new Vector4(0, 1, 0, 0),
    new Vector4(0, 0, 1, 0),
    new Vector4(-s, 0, 0, c),
  );
};


Matrix4.rotation = (anglesInPiRadians, order) => {
  order = order || 'xyz';

  let rot;
  for (let axis of order) {
    if (anglesInPiRadians[axis] == 0) {
      continue;
    }
    rot = rot === undefined
      ? Matrix4[axis+'Rotation'](anglesInPiRadians[axis])
      : rot.multiply(Matrix4[axis+'Rotation'](anglesInPiRadians[axis]).transpose());
  }

  return rot === undefined ? Identity(4, 4) : rot;
};

Matrix4.scaling = (v) => {
  return new Matrix4(
    new Vector4(v.x, 0,  0,  0),
    new Vector4(0, v.y,  0,  0),
    new Vector4(0,  0, v.z,  0),
    new Vector4(0,  0,  0,  v instanceof Vector4 ? v.w : 1)
  );
};

Identity = (rows, cols) => {
  rows = rows === undefined ? 1 : +rows;
  cols = cols === undefined ? 1 : +cols;

  switch(cols) {
    case 1:
      switch (rows) {
        case 1: return 1;
        case 2: return new Vector2(1, 1);
        case 3: return new Vector3(1, 1, 1);
        case 4: return new Vector4(1, 1, 1, 1);
      }
    case 3:
      switch (rows) {
        case 3: return new Matrix3(
          new Vector3(1, 0, 0),
          new Vector3(0, 1, 0),
          new Vector3(0, 0, 1)
        );
      }
    case 4:
      switch (rows) {
        case 4: return new Matrix4(
            new Vector4(1, 0, 0, 0),
            new Vector4(0, 1, 0, 0),
            new Vector4(0, 0, 1, 0),
            new Vector4(0, 0, 0, 1)
          );
      }
  }

  throw new Error('Not implemented identity ' + rows + 'x' + cols);
};
