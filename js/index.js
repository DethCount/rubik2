class LubriksCube {
    constructor(position, size, padding, viewProjectionMatrix, unprojectionMatrix) {
        this.position = position || new Vector3();
        this.size = (size instanceof Vector3)
            ? size
            : (
                (isNaN(size) || size === undefined)
                    ? new Vector3(3, 3, 3)
                    : new Vector3(size, size, size)
            );
        this.padding = padding;
        this.cubes = {};
        this.actionStack = [];
        this.actionStackLocked = false;
        this.viewProjectionMatrix = viewProjectionMatrix || Identity(4, 4);
        this.unprojectionMatrix = unprojectionMatrix || Identity(4, 4);

        this.pointer = new Pointer(this.position);
    }

    addCube(cube) {
        this.cubes[cube.id] = cube;

        return this;
    }

    getCubes() {
        let c = {};

        for (let cube of this.cubes) {
            let cub = cube.clone();
            c[cub.id] = cub;
        }

        return c;
    }

    getPlaces() {
        let c = [];

        for (let cube of this.cubes) {
            c.push(cube.place.clone());
        }

        return c;
    }

    getLine(place, direction) {
        let line;
        if (undefined === direction) {
            line = place.clone();
        } else {
            line = place.mask(direction);
        }

        let cubes = [];
        for (let cubeIdx in this.cubes) {
            if ((this.cubes[cubeIdx].place.x === line.x || line.x === null)
                && (this.cubes[cubeIdx].place.y === line.y || line.y === null)
                && (this.cubes[cubeIdx].place.z === line.z || line.z === null)
            ) {
                cubes.push(cubeIdx);
            }
        }

        return cubes;
    }

    addTimedAction(action, duration) {
        this.actionStack.unshift({'action': action, 'duration': duration});
        this.stoppedChangingAt = undefined;
        // console.log(this.actionStack[0]);

        return this;
    }

    getPlaceFromViewportPosition(position) {
        // console.log(this.viewProjectionMatrix, this.unprojectionMatrix);
        let worldPos = this.unprojectionMatrix.multiply(
            position.toVector3()
        );

        console.log('worldPos', position, worldPos);

        for(let cubeIdx of this.getLine(new Vector3(null, null, this.size.divide(-2).math('round').z, true))) {
            let bottomLeft = this.cubes[cubeIdx].position
                .sub(this.cubes[cubeIdx].size
                    .divide(2)
                );
            let topRight = bottomLeft.add(
                new Vector3(
                    this.cubes[cubeIdx].size.x,
                    this.cubes[cubeIdx].size.y,
                    0
                )
            );

            console.log(bottomLeft, topRight, worldPos);
        }

        return worldPos.divide(this.size).math('round');
    }

    getGridIncrement() {
        return (new Vector3(2, 2, 2)).divide(this.size);
    }

    update(t, dt) {
        let idx = this.actionStack.length - 1;
        if (idx < 0 || this.actionStackLocked) {
            return this;
        }

        this.actionStackLocked = true;

        let trackedAction = this.actionStack[idx];

        if (!trackedAction.hasOwnProperty('startedAt')) {
            trackedAction.startedAt = t;
            trackedAction.lastViewed = t;
            trackedAction.totalAngle = 0;
        }

        let actionT = t - trackedAction.startedAt;
        let actionDt = t - trackedAction.lastViewed;

        if (actionDt > 0) {
            if (t - trackedAction.startedAt >= trackedAction.duration) {
                if (!trackedAction.unprepared) {
                    this.unprepareAction(trackedAction.action);
                    trackedAction.unprepared = true;
                    trackedAction.lastViewed = t;
                    this.actionStackLocked = false;

                    return this;
                }
            } else {
                trackedAction.totalAngle = this.doAction(trackedAction, trackedAction.duration, actionT, actionDt);
            }
        } else {
            this.prepareAction(trackedAction.action);
        }

        trackedAction.lastViewed = t;

        if (trackedAction.unprepared) {
            this.actionStack.pop();
            if (this.actionStack.length == 0) {
                this.stoppedChangingAt = t;
            }
        }

        this.actionStackLocked = false;

        return this;
    }

    render(gl, program, viewProjectionMatrix, unprojectionMatrix, t, dt) {
        this.viewProjectionMatrix = viewProjectionMatrix;
        this.unprojectionMatrix = unprojectionMatrix;

        //*
        for (let cubeIdx in this.cubes) {
            this.cubes[cubeIdx].render(gl, program, viewProjectionMatrix, unprojectionMatrix, t, dt);
        }
        //*/

        //this.pointer.render(gl, program, viewProjectionMatrix, unprojectionMatrix, t, dt);
    }

    prepareAction(action) {
        //console.log('prepareAction');
        action.line = this.getLine(action.place, action.cubeMask);
        // console.log(action.line);

        if (action.duration <= 0) {
            return;
        }

        for (let cubeIdx of action.line) {
            this.cubes[cubeIdx].matrixSnapshot = this.cubes[cubeIdx].matrix.clone();
            this.cubes[cubeIdx].placeSnapshot = this.cubes[cubeIdx].place.clone();
        }
    }

    unprepareAction(action) {
        let rot = Matrix4.rotation(action.direction.multiply(action.angle));
        // console.log(rot, rot.transpose());

        for (let cubeIdx of action.line) {
            /*
            console.log(
                'unprepareAction',
                this.cubes[cubeIdx].id,
                this.cubes[cubeIdx].placeSnapshot,
                this.cubes[cubeIdx].place,
                this.cubes[cubeIdx].matrix,
                this.cubes[cubeIdx].matrixSnapshot,
                rot.transpose(),
                this.cubes[cubeIdx].matrixSnapshot
                    .multiply(rot.transpose())
            );
            //*/

            this.cubes[cubeIdx].matrix = this.cubes[cubeIdx].matrixSnapshot
                .multiply(rot.transpose());

            this.cubes[cubeIdx].place = rot
                .multiply(this.cubes[cubeIdx].placeSnapshot)
                    .multiply(2)
                    .symround()
                    .multiply(0.5);

            delete this.cubes[cubeIdx].matrixSnapshot;
            delete this.cubes[cubeIdx].placeSnapshot;

        }
    }

    doAction(trackedAction, duration, t, dt, angle, final) {
        // console.warn('doAction', arguments);
        if (angle === undefined) {
            angle = trackedAction.action.angle;
        }

        if (duration > 0) {
            angle *= t/duration;
        }

        // console.log(trackedAction.action.direction, angle, t, dt, duration);
        let rot = Matrix4.rotation(trackedAction.action.direction.multiply(angle));
        let trot = rot.transpose();
        let halfSize = this.size.divide(2);
        let shifting = this.size.mod(2).sub(1).sub(halfSize);

        for (let cubeIdx of trackedAction.action.line) {
            this.cubes[cubeIdx].matrix = this.cubes[cubeIdx].matrixSnapshot.multiply(trot);
            this.cubes[cubeIdx].place = rot.multiply(this.cubes[cubeIdx].placeSnapshot);
        }

        return angle;
    }

    shuffle(it, actionDuration) {
        let minPlaces = (new Vector3(0,0,0)).sub(this.size.multiply(0.5)).add(0.5);
        let angles = [/*-1, -0.5, */0.5/*, 1*/];

        for (let i = 0; i < it; i++) {
            let direction = Math.round(Math.random() * 2);

            let place = new Vector3(
                direction == 0 ? Math.round(Math.random() * (this.size.x - 1)) + minPlaces.x : 0,
                direction == 1 ? Math.round(Math.random() * (this.size.y - 1)) + minPlaces.y : 0,
                direction == 2 ? Math.round(Math.random() * (this.size.z - 1)) + minPlaces.z : 0
            );

            let mask = new Vector3(
                direction == 0 ? 1 : null,
                direction == 1 ? 1 : null,
                direction == 2 ? 1 : null
            );

            let rotationAxis = new Vector3(
                direction == 0 ? 1 : 0,
                direction == 1 ? 1 : 0,
                direction == 2 ? 1 : 0
            );

            let angle = angles[Math.round(Math.random() * (angles.length - 1))];

            console.log(place, mask, rotationAxis, angle);

            this.addTimedAction(
                new Action(
                    place,
                    mask,
                    rotationAxis,
                    angle
                ),
                actionDuration || 300
            );
        }
    }
}

LubriksCube.create = (position, size, padding, quaternion) => {
    padding = padding || 0.05;
    let lubrik = new LubriksCube(position, size, padding);

    let inc = lubrik.getGridIncrement();
    let halfInc = inc.divide(2);
    let cubeSize = inc.sub(2 * padding);
    // console.log(inc, halfInc, cubeSize);
    let halfSize = new Vector3(0.5, 0.5, 0.5);
    let bottomLeft = position.sub(halfSize);

    for (let x = 0; x < lubrik.size.x; x++) {
        for (let y = 0; y < lubrik.size.y; y++) {
            for (let z = 0; z < lubrik.size.z; z++) {
                let place = new Vector3(x, y, z);
                let p = place.multiply(inc).add(halfInc).sub(1);
                place = place.sub(lubrik.size.multiply(0.5)).add(0.5);
                let c = new Cube(place, p, cubeSize, quaternion);
                // console.log(c);
                lubrik.addCube(c);
            }
        }
    }

    // console.log(lubrik.getCubes(), lubrik.getPlaces());

    return lubrik;
}

class Cube {
    constructor(place, position, size, quaternion, matrix, visible) {
        this.place = place instanceof Vector3 ? place.clone() : new Vector3();
        this.id = this.place.x + ',' + this.place.y + ',' + this.place.z;
        this.position = position instanceof Vector3 ? position.clone() : new Vector3();
        this.matrix = matrix instanceof Matrix4 ? matrix.clone() : Identity(4, 4);
        this.size = (size instanceof Vector3)
            ? size.clone()
            : (
                (isNaN(size) || size === undefined)
                    ? new Vector3(1, 1, 1)
                    : new Vector3(size, size, size)
            );
        this.quaternion = quaternion instanceof Quaternion ? quaternion.clone() : new Quaternion(0, 0, 0, 1);
        this.visible = visible !== false;
    }

    clone() {
        return new this.constructor(
            this.place,
            this.position,
            this.size,
            this.quaternion,
            this.matrix
        );
    }

    render(gl, program, viewProjectionMatrix, t, dt) {
        if (!this.visible
            /*
            || this.matrix.equals(Identity(4, 4))
            //*/
        ) {
            return;
        }

        // console.log(this.position.clone(), this.matrix.clone(), this.place.clone(), this.id);

        gl.useProgram(program);

        let positionData = gl.createBuffer(),
            positionLocation = gl.getAttribLocation(program, 'a_position'),
            matrixLocation = gl.getUniformLocation(program, 'u_matrix'),
            projLocation = gl.getUniformLocation(program, 'u_proj');

        this.vertices = this.createVertices();
        /*
        //this.place = this.place.applyQuaternion(this.quaternion);
        //this.position = this.position.applyQuaternion(this.quaternion);

        for (let idx in this.vertices) {
            // console.log('aaa', this.vertices[idx], this.quaternion);
            //this.vertices[idx] = this.vertices[idx].applyQuaternion(this.quaternion);
            //console.log('bbb', this.vertices[idx], this.quaternion);
        }

        // this.quaternion = this.quaternion.multiply(this.quaternion);

        // this.quaternion = new Quaternion(0, 0, 0, 1);
        //*/

        // Bind existing attribute data
        gl.bindBuffer(gl.ARRAY_BUFFER, positionData);
        gl.bufferData(
            gl.ARRAY_BUFFER,
            this.getVertices(),
            gl.STATIC_DRAW
        );
        gl.enableVertexAttribArray(positionLocation);
        gl.vertexAttribPointer(positionLocation, 3, gl.FLOAT, false, 0, 0);

        let colorData = gl.createBuffer(),
            colorLocation = gl.getAttribLocation(program, 'a_color');

        // Bind existing attribute data
        gl.bindBuffer(gl.ARRAY_BUFFER, colorData);
        gl.bufferData(
            gl.ARRAY_BUFFER,
            this.getColors(),
            gl.STATIC_DRAW
        );
        gl.enableVertexAttribArray(colorLocation);
        gl.vertexAttribPointer(colorLocation, 4, gl.FLOAT, false, 0, 0);

        gl.uniformMatrix4fv(matrixLocation, false, this.matrix.toArray());

        // transpose view projection matrix : column-matrix expected in webgl, row-matrices in js
        gl.uniformMatrix4fv(projLocation, false, viewProjectionMatrix.transpose().toArray());

        gl.drawArrays(gl.TRIANGLES, 0, 3 * 12);
    }

    createVertices() {
        let halfSize = this.size.divide(2);
        let bbl = this.position.sub(halfSize);
        let ftr = this.position.add(halfSize);

        return [
            new Vector3(bbl.x, ftr.y, ftr.z),
            new Vector3(bbl.x, ftr.y, bbl.z),
            new Vector3(ftr.x, ftr.y, bbl.z),

            new Vector3(ftr.x, ftr.y, bbl.z),
            new Vector3(ftr.x, ftr.y, ftr.z),
            new Vector3(bbl.x, ftr.y, ftr.z),

            // bottom face
            new Vector3(bbl.x, bbl.y, ftr.z),
            new Vector3(bbl.x, bbl.y, bbl.z),
            new Vector3(ftr.x, bbl.y, bbl.z),

            new Vector3(ftr.x, bbl.y, bbl.z),
            new Vector3(ftr.x, bbl.y, ftr.z),
            new Vector3(bbl.x, bbl.y, ftr.z),

            // left face
            new Vector3(bbl.x, bbl.y, bbl.z),
            new Vector3(bbl.x, ftr.y, bbl.z),
            new Vector3(bbl.x, ftr.y, ftr.z),

            new Vector3(bbl.x, ftr.y, ftr.z),
            new Vector3(bbl.x, bbl.y, ftr.z),
            new Vector3(bbl.x, bbl.y, bbl.z),

            // right face
            new Vector3(ftr.x, bbl.y, bbl.z),
            new Vector3(ftr.x, ftr.y, bbl.z),
            new Vector3(ftr.x, ftr.y, ftr.z),

            new Vector3(ftr.x, ftr.y, ftr.z),
            new Vector3(ftr.x, bbl.y, ftr.z),
            new Vector3(ftr.x, bbl.y, bbl.z),

            // back face
            new Vector3(bbl.x, bbl.y, bbl.z),
            new Vector3(bbl.x, ftr.y, bbl.z),
            new Vector3(ftr.x, ftr.y, bbl.z),

            new Vector3(ftr.x, ftr.y, bbl.z),
            new Vector3(ftr.x, bbl.y, bbl.z),
            new Vector3(bbl.x, bbl.y, bbl.z),

            // front face
            new Vector3(bbl.x, bbl.y, ftr.z),
            new Vector3(bbl.x, ftr.y, ftr.z),
            new Vector3(ftr.x, ftr.y, ftr.z),

            new Vector3(ftr.x, ftr.y, ftr.z),
            new Vector3(ftr.x, bbl.y, ftr.z),
            new Vector3(bbl.x, bbl.y, ftr.z)
        ];
    }

    getVertices() {
        let data = [];
        for (let idx in this.vertices) {
            data.push(this.vertices[idx].x, this.vertices[idx].y, this.vertices[idx].z);
        }

        return new Float32Array(data);
    }

    getColors() {
        return new Float32Array([
            // top
            1, 1, 0, 1,
            1, 1, 0, 1,
            1, 1, 0, 1,

            1, 1, 0, 1,
            1, 1, 0, 1,
            1, 1, 0, 1,

            // bottom
            0.9, 0.9, 0.9, 1,
            0.9, 0.9, 0.9, 1,
            0.9, 0.9, 0.9, 1,

            0.9, 0.9, 0.9, 1,
            0.9, 0.9, 0.9, 1,
            0.9, 0.9, 0.9, 1,

            // left
            1, 0, 0, 1,
            1, 0, 0, 1,
            1, 0, 0, 1,

            1, 0, 0, 1,
            1, 0, 0, 1,
            1, 0, 0, 1,

            // right
            1, 0.5, 0, 1,
            1, 0.5, 0, 1,
            1, 0.5, 0, 1,

            1, 0.5, 0, 1,
            1, 0.5, 0, 1,
            1, 0.5, 0, 1,

            // back
            0, 0, 1, 1,
            0, 0, 1, 1,
            0, 0, 1, 1,

            0, 0, 1, 1,
            0, 0, 1, 1,
            0, 0, 1, 1,

            // front
            0, 1, 0, 1,
            0, 1, 0, 1,
            0, 1, 0, 1,

            0, 1, 0, 1,
            0, 1, 0, 1,
            0, 1, 0, 1
        ]);
    }

    getClickableZone() {
        return [this.position.sub(this.size.divide(2)), this.position.add(this.size)];
    }
};

class Pointer {
    constructor(position, size, quaternion, matrix) {
        this.position = position instanceof Vector3 ? position.clone() : new Vector3();
        this.matrix = matrix instanceof Matrix4 ? matrix.clone() : Matrix4.scaling(new Vector3(1, 1, 1));
        this.size = (size instanceof Vector3)
            ? size.clone()
            : (
                (isNaN(size) || size === undefined)
                    ? new Vector3(1, 1, 0)
                    : new Vector3(size, size, size)
            );
        this.quaternion = quaternion instanceof Quaternion ? quaternion.clone() : new Quaternion(0, 0, 0, 1);
        //this.vertices = this.createVertices();

        this.visible = true;
    }

    show() {
        this.visible = true;
    }

    hide() {
        this.visible = false;
    }

    update(position) {
        console.warn('update pointer', position.clone());
        this.position = position.clone();

        return this;
    }

    applyQuaternion(q) {
        this.position = this.position.applyQuaternion(q);

        for (let idx in this.vertices) {
            this.vertices[idx] = this.vertices[idx].applyQuaternion(q);
        }

        // this.quaternion = this.quaternion.multiply(q);

        return this;
    }

    clone() {
        return new this.constructor(
            this.position,
            this.size,
            this.quaternion,
            this.matrix
        );
    }

    render(gl, program, viewProjectionMatrix, t, dt) {
        if (!this.visible) {
            return;
        }

        gl.useProgram(program);

        let positionData = gl.createBuffer(),
            positionLocation = gl.getAttribLocation(program, 'a_position'),
            matrixLocation = gl.getUniformLocation(program, 'u_matrix'),
            projLocation = gl.getUniformLocation(program, 'u_proj');

        this.vertices = this.createVertices();
        //this.applyQuaternion(this.quaternion);

        // Bind existing attribute data
        gl.bindBuffer(gl.ARRAY_BUFFER, positionData);
        gl.bufferData(
            gl.ARRAY_BUFFER,
            this.getVertices(),
            gl.STATIC_DRAW
        );
        gl.enableVertexAttribArray(positionLocation);
        gl.vertexAttribPointer(positionLocation, 3, gl.FLOAT, false, 0, 0);

        let colorData = gl.createBuffer(),
            colorLocation = gl.getAttribLocation(program, 'a_color');

        // Bind existing attribute data
        gl.bindBuffer(gl.ARRAY_BUFFER, colorData);
        gl.bufferData(
            gl.ARRAY_BUFFER,
            this.getColors(),
            gl.STATIC_DRAW
        );
        gl.enableVertexAttribArray(colorLocation);
        gl.vertexAttribPointer(colorLocation, 4, gl.FLOAT, false, 0, 0);

        gl.uniformMatrix4fv(matrixLocation, false, Identity(4, 4).toArray());
        gl.uniformMatrix4fv(projLocation, false, viewProjectionMatrix.transpose().toArray());

        gl.drawArrays(gl.TRIANGLES, 0, 3 * 2);
    }

    createVertices() {
        let halfSize = this.size.divide(2).math('round');
        let bbl = this.position.sub(halfSize);
        let ftr = this.position.add(halfSize);

        let bbl2 = bbl.add(new Vector3(0, 0, 10));
        let ftr2 = ftr.add(new Vector3(0, 0, 10));

        return [
            // front face
            new Vector3(bbl.x, bbl.y, ftr.z),
            new Vector3(bbl.x, ftr.y, ftr.z),
            new Vector3(ftr.x, ftr.y, ftr.z),

            new Vector3(ftr2.x, ftr2.y, ftr2.z),
            new Vector3(ftr2.x, bbl2.y, ftr2.z),
            new Vector3(bbl2.x, bbl2.y, ftr2.z)
        ];
    }

    getVertices() {
        let data = [];
        for (let idx in this.vertices) {
            data.push(this.vertices[idx].x, this.vertices[idx].y, this.vertices[idx].z);
        }

        return new Float32Array(data);
    }

    getColors() {
        return new Float32Array([
            0, 0, 0, 1,
            0, 0, 0, 1,
            0, 0, 0, 1,

            1, 0, 0, 1,
            1, 0, 0, 1,
            1, 0, 0, 1,
        ]);
    }
}

class Action {
    constructor(place, cubeMask, direction, angleInPiRadians) {
        this.place = place || new Vector3();
        this.cubeMask = cubeMask || Identity(3, 1);
        this.direction = direction || new Vector3();
        this.angle = angleInPiRadians || 0;
    }
}

$(() => {
    let $body = $('body');
    let $canvas = $('<canvas></canvas>')
        .attr('width', $body.innerWidth())
        .attr('height', $body.innerHeight())
        .appendTo($body);

    let canvas = $canvas.get(0);
    let gl = canvas.getContext('webgl2', {preserveDrawingBuffer: true});

    let vertexShaderStr = `
    uniform mat4 u_matrix;
    uniform mat4 u_proj;

    attribute vec3 a_position;
    attribute vec4 a_color;

    varying vec4 v_color;

    void main () {
        gl_Position = u_proj * (u_matrix * vec4(a_position, 1.0));
        v_color = a_color;
    }
    `;

    let fragmentShaderStr = `
    precision highp float;

    varying vec4 v_color;

    void main () {
        gl_FragColor = v_color;
    }
    `;

    let program = gl.createProgram();

    let vertexShader = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vertexShader, vertexShaderStr);
    gl.compileShader(vertexShader);

    let fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fragmentShader, fragmentShaderStr);
    gl.compileShader(fragmentShader);

    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);

    gl.linkProgram(program);

    let glLog = () => {
        return gl.getProgramInfoLog(program) + '\n\n'
            + 'Vertex shader:' + gl.getShaderInfoLog(vertexShader) + '\n\n'
            + 'Fragment shader:' + gl.getShaderInfoLog(fragmentShader) + '\n\n';
    }

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        throw 'Could not compile WebGL program. \n\n'
            + glLog();
    }
    // turn on depth testing
    gl.enable(gl.DEPTH_TEST);

    // tell webgl to cull faces
    //gl.enable(gl.CULL_FACE);
    //gl.cullFace(gl.BACK);

    /**/

    let fieldOfViewRadians = Math.PI / 3;
    // let cameraRotation = 0;
    let cameraRotation = Math.PI / 2;
    let cameraPosition = new Vector3(0, 0, 5);
    var aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
    var zNear = 1;
    var zFar = 100;
    var projectionMatrix = Matrix4.perspective(fieldOfViewRadians, aspect, zNear, zFar);

    let cameraMatrix, viewProjectionMatrix, unprojectionMatrix;

    let update = (t, dt) => {
        cameraRotation += 0; //Math.PI / 60;
        // console.log(cameraRotation);
        cameraMatrix = Quaternion
            .fromAxisAngle(new Vector3(0, 0, 1), cameraRotation)
            .toMatrix4()
            .translate(cameraPosition);

        // Make a view matrix from the camera matrix.
        console.log(cameraMatrix);
        var viewMatrix = cameraMatrix.inverse();
        console.log(viewMatrix);


        // create a viewProjection matrix. This will both apply perspective
        // AND move the world so that the camera is effectively the origin
        viewProjectionMatrix = projectionMatrix.multiply(viewMatrix);


        unprojectionMatrix = projectionMatrix.inverse();

        // let test = projectionMatrix.multiply(Identity(4, 1));
        // let untest = unprojectionMatrix.multiply(test);
        // console.log(test, untest, projectionMatrix,unprojectionMatrix);

        /*
        // Set the matrix.
        let cubePosition = new Vector3(0, 0, 0);
        matrix = viewProjectionMatrix.translate(cubePosition);
        // console.log(matrix);
        */
    };

    let render = (t, dt) => {
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

        // Clear the canvas AND the depth buffer.
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT | gl.STENCIL_BUFFER_BIT);
    };

    let lubrik = LubriksCube.create(new Vector3(), new Vector3(4, 4, 4), 0.05);
    window.lubrik = lubrik;
    let lubrikUI = new LubrikUI(lubrik, $canvas).start();

    let animate = (gl, program, lastT) => {
        let t = (new Date).getTime();
        let dt = lastT ? t - lastT : 0;

        if (lastT === undefined/* || lubrik.actionStack.length === 0*/) {
            lubrik.shuffle(1, 100);

            // lubrik.addTimedAction(new Action(new Vector3(-0.5, 0, 0), new Vector3(1, null, null, true), new Vector3(1, 0, 0), 1), 300);
            // lubrik.addTimedAction(new Action(new Vector3(0, -0.5, 0), new Vector3(null, 1, null, true), new Vector3(0, 1, 0), 1), 300);
            // lubrik.addTimedAction(new Action(new Vector3(0, 0, -0.5), new Vector3(null, null, 1, true), new Vector3(0, 0, 1), 1), 300);

            // lubrik.addTimedAction(new Action(new Vector3(0, 0, -0.5), new Vector3(null, null, 1, true), new Vector3(0, 0, 1), 1), 300);
            // lubrik.addTimedAction(new Action(new Vector3(-1.5, 0, 0), new Vector3(1, null, null, true), new Vector3(1, 0, 0), 1), 300);
            // lubrik.addTimedAction(new Action(new Vector3(0, -0.5, 0), new Vector3(null, 1, null, true), new Vector3(0, 1, 0), 1), 300);

            //lubrik.addTimedAction(new Action(new Vector3(0, 0, -0.5), new Vector3(null, null, 1, true), new Vector3(0, 0, 1), -0.5), 3000);
            //lubrik.addTimedAction(new Action(new Vector3(-1.5, 0, 0), new Vector3(1, null, null, true), new Vector3(1, 0, 0), -0.5), 3000);
            //lubrik.addTimedAction(new Action(new Vector3(0, -0.5, 0), new Vector3(null, 1, null, true), new Vector3(0, 1, 0), -0.5), 3000);
        }

        update(t, dt);
        lubrik.update(t, dt);

        // if (lubrik.stoppedChangingAt === undefined || lubrik.stoppedChangingAt >= t) {
            render(gl, program, viewProjectionMatrix, unprojectionMatrix, t, dt);
            lubrik.render(gl, program, viewProjectionMatrix, unprojectionMatrix, t, dt);
        //}

        requestAnimationFrame(() => animate(gl, program, t));
    };

    animate(gl, program);
});
