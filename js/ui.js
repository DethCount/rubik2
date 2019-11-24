class LubrikUI {
    constructor(lubrik, element) {
        this.lubrik = lubrik;
        this.element = element;
        this.mouse = undefined;
    }

    start() {
        this.mouse = new LubrikMouse(this.lubrik);
        this.element.on('contextmenu', this.contextMenu.bind(this));
        this.element.on('mouseenter', this.mouseEnter.bind(this));
    }

    stop() {
        //this.element.off('click', this.click.bind(this));
        this.element.off('contextmenu', this.contextMenu.bind(this));
        this.element.removeProp('draggable');
        this.element.off('dragstart', this.dragStart.bind(this));
        this.element.off('dragend', this.dragEnd.bind(this));
        this.element.off('mouseenter', this.mouseEnter.bind(this));
        this.element.off('keyup', this.keyUp.bind(this));
        this.mouse = undefined;
    }

    positionFromEvent(event) {
        // let targetPos = $(event.currentTarget).position();
        var normalizedScreenPos =  new Vector2(
            2 * (Math.max(0, Math.min(event.offsetX, event.currentTarget.clientWidth))  / event.currentTarget.clientWidth) - 1,
            -(2 * (Math.max(0, Math.min(event.offsetY, event.currentTarget.clientHeight)) / event.currentTarget.clientHeight) - 1)
        );

        return this.lubrik.unprojectionMatrix.multiply(normalizedScreenPos.toVector3(0));
    }

    mouseDown(event) {
        console.log('mouseDown', event);
    }

    click(event) {
        console.log('click', event);
    }

    dragStart(event) {
        this.dragStartEvent = event;
        this.dragStart = this.positionFromEvent(event);
        this.dragButtons = event.buttons;
    }

    drag(event) {
        console.log(event);
    }

    dragEnd(event) {
        var x = event.pageX - $(event.currentTarget).offset().left
        var y = event.pageY - $(event.currentTarget).offset().top

        console.log(x,
            y,
            event.clientX + ' ' + event.clientY + ' / ' +
            event.offsetX + ' ' + event.offsetY + ' / ' +
            event.screenX + ' ' + event.screenY + ' / ' +
            event.pageX + ' ' + event.pageY
        );
        let p = new Vector2(
            2 * (Math.max(0, Math.min(this.dragStartEvent.offsetX + event.offsetX, event.currentTarget.clientWidth))  / event.currentTarget.clientWidth) - 1,
            -(2 * (Math.max(0, Math.min(event.offsetY, event.currentTarget.clientHeight)) / event.currentTarget.clientHeight) - 1)
        );
        this.mouse.drag(this.dragStart, p, this.dragButtons);
        console.log('dragEnd', p);
        this.dragStart = undefined;
        this.dragStartEvent = undefined;
        this.dragButtons = undefined;
    }

    contextMenu(event) {
        event.preventDefault();
        return false;
    }

    mouseEnter(event) {
        // console.log('enter');
        this.mouse.in();
        this.mouseOverActive = true;
        this.lubrik.pointer.show();
        this.updateMouse(event);

        this.element
            .off('mousedown')
            .off('mouseleave')
            .off('mouseup')
            .off('mousemove')
            .on('mousedown', this.mouseDown.bind(this))
            .on('mouseleave', this.mouseLeave.bind(this))
            .on('mouseup', this.mouseUp.bind(this))
            .on('mousemove', this.mouseMove.bind(this));
    }

    updateMouse(event) {
        // console.log('updateMouse', event.clientX, event.clientY);
        let p = this.positionFromEvent(event);

        this.mouse.update(p, event.buttons);
    }

    mouseDown(event) {
        this.updateMouse(event);
    }

    mouseUp(event) {
        this.updateMouse(event);
        this.mouse.drag();
        this.mouse.out();
    }

    mouseMove(event) {
        // console.warn('mousemove', this.mouseMoveActive, event.clientX, event.clientY);
        this.lubrik.pointer.update(this.positionFromEvent(event));
    }

    mouseLeave() {
        // console.warn('leave');
        this.mouseOverActive = false;
        this.lubrik.pointer.hide();

        this.element
            .off('mousedown')
            .off('mouseleave')
            .off('mouseup')
            .off('mousemove')
            .data('last-mouse-position-x', undefined)
            .data('last-mouse-position-y', undefined);

        this.mouse.out();
    }

    keyUp(event) {

    }

    keyDown(event) {

    }

    update(t, dt) {

    }
}

class LubrikMouse {
    constructor(lubrik, position, lastPosition, keys) {
        this.lubrik = lubrik;
        this.position = position || new Vector2();
        this.lastPosition = lastPosition || new Vector2();
        this.keys = keys || 0;
    }

    update(position, keys) {
        this.lastPosition = this.position instanceof Vector2 ? this.position.clone() : undefined;
        this.position = position.clone();
        this.keys |= keys;
        // console.log(this, keys);
    }

    in() {
    }

    out() {
        this.position = undefined;
        this.lastPosition = undefined;
        this.keys = 0;
    }

    drag() {
        if (!(this.position instanceof Vector2 && this.lastPosition instanceof Vector2)) {
            return;
        }
        console.log('drag', this.lastPosition, this.position, this.position.sub(this.lastPosition));

        let startPlace = this.lubrik.getPlaceFromViewportPosition(this.lastPosition);
        console.log('startPlace', this.lastPosition, startPlace);
        if (!(startPlace instanceof Vector3)) {
            return;
        }

        let endPlace = this.lubrik.getPlaceFromViewportPosition(this.position);
        console.log('endPlace', this.position, endPlace);

        if(!(endPlace instanceof Vector3)) {
            return;
        }

        let direction = endPlace.sub(startPlace).toMask();
        console.log(direction);
        if (direction.length() != 1) {
            console.log('cheater');
            return;
        }

        this.lubrik.addTimedAction(new Action(startPlace, direction, Math.PI / 2), 300);
    }
}
