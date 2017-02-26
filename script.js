var debug = true;
var board = null;
var selections = [];
var drawList = [];
var drawTable = [[], [], []];
var drawing = true;
var mouseX = null;
var mouseY = null;

const canvas = document.getElementsByTagName("canvas")[0];
const context = canvas.getContext("2d");
const boardColor = "#333";
const backgroundColor = "#292929";

// --------------------------- Classes

class Thing {
  constructor(board, row, col) {
    addToDrawList(this, 1);

    this.size = board.thingSize;
    this.enabled = true;
    this.board = board;
    this.row = row;
    this.col = col;
    this.selected = false;
    this.animations = {};

    this.board.things[this.col][this.row] = this;
    this.calculatePosition();
  }

  draw() {
    for (let i in this.animations)
      if (this.animations[i].finished)
        delete this.animations[i];
      else this.animations[i].update()

  }

  drawInfo() {
    context.fillStyle = "white";
    context.fillText("(" + this.col + ", " + this.row + ")", this.x + this.size / 2, this.y - this.size / 2);
    context.fillText("x: " + Math.floor(this.x) + ", y: " + Math.floor(this.y), this.x + this.size / 2, this.y - this.size / 2 + 12);
    context.fillText("size: " + Math.floor(this.size), this.x + this.size / 2, this.y - this.size / 2 + 24);
    context.fillText(this.selected ? "selected" : !this.enabled ? "disabled" : "", this.x + this.size / 2, this.y - this.size / 2 + 48);

  }

  calculatePosition() {
    this.x = this.board.x + this.size + this.size * this.col * 2;
    this.y = this.board.y + this.size + this.size * this.row * 2;
  }

  connection(thing) {
    return false;
  }

  moveTo(row, col) {
    this.board.things[col][row] = this;
    this.board.things[this.col][this.row] = null;
    this.row = row;
    this.col = col;

    let oldY = this.y;
    this.calculatePosition();
    new Animation(this, "y", oldY, this.y, 400, 0, null);
  }

  destroy() {
    new Animation(this, "size", this.size, 0, 250, 0, removeFromDrawList.bind(this, this));
  }

  resize() {
    this.size = this.board.thingSize;
    this.calculatePosition();
  }
}

class Dot extends Thing {
  draw() {
    super.draw();

    context.beginPath();
    context.arc(this.x, this.y, this.size / 2, 0, 2 * Math.PI);
    context.fill();
  }

  connection(thing) {
    return !thing.selected && inRange(this, thing);
  }
}

class ColorDot extends Dot {
  constructor(board, row, col, color) {
    super(board, row, col);
    this.color = color;
  }

  draw() {
    context.fillStyle = this.color;
    super.draw();
  }

  drawInfo() {
    super.drawInfo();
    context.fillText("color: " + this.color, this.x + this.size / 2, this.y - this.size / 2 + 36);
  }

  connection(thing) {
    return super.connection(thing) && this.color == thing.color || thing instanceof SuperDot;
  }
}

class SuperDot extends Dot {
  draw() {
    context.fillStyle = "white";
    super.draw();
  }

  connection(thing) {
    return true;
  }
}

class Ring extends Thing {
  constructor(board, row, col, color) {
    super(board, row, col);
  }

  draw() {
    super.draw();

    context.lineWidth = this.size / 10;
    context.beginPath();
    context.arc(this.x, this.y, this.size / 2.25, 0, 2 * Math.PI);
    context.stroke();
  }

  connection(thing) {
    if (thing.selected)
      for (var i = 0; i < selections.length; i++)
        for (var j = 0; j < selections[i].things.length; j++)
          if (thing == selections[i].things[j] &&
              (this == selections[i].things[j - 1] ||
              this == selections[i].things[j + 1]))
            return false;
    return inRange(this, thing);
  }
}

class ColorRing extends Ring {
  constructor(board, row, col, color) {
    super(board, row, col);
    this.color = color;
  }

  draw() {
    context.strokeStyle = this.color;
    super.draw();
  }

  drawInfo() {
    super.drawInfo();
    let re = //
    context.fillText("hue: " + this.color.match(/\d+/), this.x + this.size / 2, this.y - this.size / 2 + 36);
  }

  connection(thing) {
    return super.connection(thing) && (thing != this && this.color == thing.color) || thing instanceof SuperDot;
  }
}

class Selection {
  constructor(id) {
    addToDrawList(this, 2);

    this.id = id;
    this.things = [];
    this.color = "white";
    this.x = null;
    this.y = null;
  }

  add(thing) {
    thing.selected = true;
    this.color = thing.color;
    this.things.push(thing);
  }

  remove() {
    this.things.pop().selected = false;
  }

  end() {
    let thing;
    while ((thing = this.things.pop()) !== undefined)
      thing.selected = false;
      selections[this.id] = undefined;
      removeFromDrawList(this);
  }

  draw() {
    if (this.things.length == 0)
      return;

    context.strokeStyle = this.color;
    context.lineCap = "round";
    context.lineWidth = this.things[0].board.thingSize / 1.5;
    context.lineJoin = "round";
    context.beginPath();
    context.moveTo(this.things[0].x, this.things[0].y);
    for (let i = 0; i < this.things.length; i++)
      context.lineTo(this.things[i].x, this.things[i].y);
    if (this.y !== null && this.x !== null)
      context.lineTo(this.x, this.y);
    context.stroke();
  }

  get last() {
    return this.things[this.things.length - 1];
  }

  validate() {
    for (var i = 1; i < this.things.length; i++)
      if (this.things[i - 1].connection(this, this.things[i]))
        return true;
    return false;
  }

  resize() {
    return;
  }
}

class Board {
  constructor(rows, cols) {
    addToDrawList(this, 0);

    this.rows = rows;
    this.cols = cols;
    this.things = [];
    for (let col = 0; col < this.cols; col++) {
      this.things[col] = [];
      for (let row = 0; row < this.rows; row++)
        this.things[col][row] = null;
    }
    this.animations = [];

    this.calculateDimensions()
  }

  calculateDimensions() {
    this.thingSize = Math.min(canvas.width / (this.cols * 2), canvas.height / (this.rows * 2));
    this.width = this.cols * this.thingSize * 2;
    this.height = this.rows * this.thingSize * 2;
    this.x = canvas.width / 2 - this.width / 2;
    this.y = canvas.height / 2 - this.height / 2;
  }

  gravity(row, col) {
    for (let row2 = row - 1; row2 >= 0; row2--)
      if (this.things[col][row2] != null) {
        this.things[col][row2].moveTo(row, col);
        return;
      }
  }

  fill(col) {
    for (var row = 0; row < this.things[col].length; row++) {
      if (this.things[col][row] == null) {
        let thing = new ColorRing(this, row, col, randomColor());
        new Animation(thing, "y", -(this.height + this.y) + thing.y + thing.size / 2,
            thing.y, 700, 0, null);
      } else return;
    }
  }

  draw() {
    context.fillStyle = boardColor;
    context.fillRect(
      this.x, this.y,
      this.width, this.height
    );
  }

  drawInfo() {
    context.fillStyle = "white";
    context.fillText("dimensions: " + this.cols + "x" + this.rows, 2, 10);
    context.fillText("thingSize: " + Math.floor(this.thingSize), 2, 22);
    context.fillText("width: " + Math.floor(this.width), 2, 34);
    context.fillText("height: " + Math.floor(this.height), 2, 46);
    context.fillText("x: " + Math.floor(this.x) + ", y: " + Math.floor(this.y), 2, 58);

  }

  resize() {
    this.calculateDimensions();
  }

  atPosition(x, y) {
    return x > this.x && x < this.x + this.width &&
           y > this.y && y < this.y + this.height;
  }

  thingAtPosition(x, y) {
    if (!this.atPosition(x, y))
      return false;
    let col = Math.floor((x - this.x) / (this.thingSize * 2));
    let row = Math.floor((y - this.y) / (this.thingSize * 2));
    let thing = this.things[col][row];
    let a = x - thing.x;
    let b = y - thing.y;
    if ((Math.sqrt(Math.pow(a, 2) + Math.pow(b, 2))) <= this.thingSize * 0.75)
      return thing;
    else return false;
  }
}

class Animation {
  constructor(object, property, startVal, endVal, duration, delay, callback) {
    if (object.animations[property] != undefined && object.animations[property].started && !object.animations[property].finished) {
      let old = object.animations[property];
      let progress = (Date.now() - old.startTime) / old.duration;
      this.started = true;
      this.startTime = Date.now() - progress * this.duration;
    } else {
      this.started = false;
      this.startTime = null;
    }
    this.object = object;
    this.property = property;
    this.startVal = startVal;
    this.endVal = endVal;
    this.duration = duration;
    this.delay = delay;
    this.callback = callback ? callback.bind(this.object) : null;
    this.distance = this.endVal - this.startVal;
    this.started = false;
    this.finished = false;

    this.object.animations[this.property] = this;
  }

  start() {
    this.started = true;
    this.startTime = Date.now() + this.delay;
    setTimeout(this.finish.bind(this), this.delay + this.duration);
  }

  update() {
    if (this.started == false)
      this.start();
    if (this.startTime > Date.now())
      this.object[this.property] = this.startVal;
    else if (this.startTime + this.duration < Date.now()) {
      this.finished = true;
      this.object[this.property] = this.endVal;
    } else
      // this.object[this.property] = this.startVal + (Date.now() - this.startTime) / this.duration * this.distance;
      this.object[this.property] = this.startVal + this.distance / (1 + Math.pow(Math.E, -15 * ((Date.now() - this.startTime) / this.duration - 0.5)));
  }

  finish() {
    if (this.callback != null) {
      this.callback();
    }
  }
}

// --------------------------- Functions

function loadingText(show) {
  const body = document.getElementsByTagName("body")[0];
  if (show) {
    if (document.getElementsByTagName("h1").length > 0)
      return;
    const header = document.createElement("h1");
    const text = document.createTextNode("Loading...");
    header.appendChild(text);
    body.appendChild(header);
  } else body.removeChild(document.getElementsByTagName("h1")[0]);
}

function setCanvasSize() {
  canvas.height = window.innerHeight;
  canvas.width = window.innerWidth;
}

function setupEventHandlers() {
  window.addEventListener("resize", resize);;

  canvas.addEventListener("mousedown", mousedown);
  canvas.addEventListener("mouseup", mouseup);
  canvas.addEventListener("mousemove", mousemove);
  canvas.addEventListener("touchstart", touchstart);
  canvas.addEventListener("touchstart", touchstart);
  canvas.addEventListener("touchend", touchend);
  canvas.addEventListener("touchend", touchend);
  canvas.addEventListener("touchmove", touchmove);
  canvas.addEventListener("touchcancel", touchcancel);
}

function drawBackground() {
  context.fillStyle = backgroundColor;
  context.fillRect(0, 0, canvas.width, canvas.height);
}

function randomColor() {
  return "hsla(" + (Math.floor(Math.random() * 5) * 72 + 60) + ",60%,60%,1)";
}

function draw() {
  drawBackground();

  if (drawing) {
    for (let i = 0; i < drawTable.length; i++)
      for (var j = 0; j < drawTable[i].length; j++)
        drawTable[i][j].draw();
    if (debug) {
      for (let i = 0; i < drawTable.length; i++)
        for (var j = 0; j < drawTable[i].length; j++)
          if (drawTable[i][j].drawInfo)
            drawTable[i][j].drawInfo()


    }
  }

  window.requestAnimationFrame(draw);
}

function removeUndefineds(list) {
  for (let i = 0; i < list.length; i++) {
    if (list[i] == undefined) {
      let j = i + 1;
      while (true)
        if (list[j] != undefined) {
          list[i] = list[j];
          list[j] = undefined;
          break;
        } else if (++j >= list.length) {
          list.length = i;
          return list;
        }
    }
  }
  return list;
}

function cleanUpDrawList() {
  drawList = removeUndefineds(drawList);
  for (var i = 0; i < drawTable.length; i++)
    drawTable[i] = removeUndefineds(drawTable[i]);
}

function addToDrawList(thing, level) {
  drawList.push(thing);
  drawTable[level].push(thing);
}

function removeFromDrawList(thing) {
  for (var i = 0; i < drawList.length; i++)
    if (drawList[i] == thing) {
      drawList[i] = undefined;
      break;
    }
  for (var i = 0; i < drawTable.length; i++)
    for (var j = 0; j < drawTable[i].length; j++)
      if (drawTable[i][j] == thing) {
        drawTable[i][j] = undefined;
        break;
      }

  cleanUpDrawList();
  return;
}

function inRange(thing1, thing2) {
  return Math.abs(thing1.row - thing2.row) <= 1 && Math.abs(thing1.col - thing2.col) <= 1;
}

function startMove(id, x, y) {
  if (selections[id] == undefined &&
     (thing = board.thingAtPosition(x, y)) && !thing.selected && thing.enabled) {
    selections[id] = new Selection(id);
    selections[id].add(thing);
  }
}

function move(id, x, y) {
  if (selections[id] == undefined)
    return;
  selections[id].x = x;
  selections[id].y = y;
  if (selections[id].things.length > 0 && (thing = board.thingAtPosition(x, y)))
    if (thing == selections[id].things[selections[id].things.length - 2])
      selections[id].remove();
    else if (selections[id].last.connection(thing) && thing.enabled)
      selections[id].add(thing);
}

function endMove(id, x, y) {
  if (selections[id] == undefined)
    return;
  if (selections[id].things.length > 1)
    for (let i = 0; i < selections[id].things.length; i++) {
      let thing = selections[id].things[i];
      thing.enabled = false;
      setTimeout(function () {
        if (thing == board.things[thing.col][thing.row])
         board.things[thing.col][thing.row] = null;
        thing.destroy();
      }, i * 25);
    }
  selections[id].end();
  for (let ds = 0; ds < selections.length; ds++)
    if (selections[ds] != null && !selections[ds].validate())
      selections[ds].end();
}

function cancelMove(id, x, y) {
  for (var i = 0; i < selections.length; i++)
    selections[i].end();
}

function tick() {
  let flag;
  for (var col = 0; col < board.things.length; col++) {
    flag = false;
    for (var row = board.things[col].length - 1; row >= 0; row--)
      if (board.things[col][row] == null) {
        flag = true;
        board.gravity(row, col);
      }
    if (flag)
      board.fill(col);
  }
}

// --------------------------- Event Handlers

function resize(event) {
  setCanvasSize();
  for (var i = 0; i < drawList.length; i++)
    drawList[i].resize();
}

function mousedown(event) {
  startMove(0, event.pageX, event.pageY);
}

function mouseup(event) {
  endMove(0, event.pageX, event.pageY);
}

function mousemove(event) {
  move(0, event.pageX, event.pageY);
}

function touchstart(event) {
  event.preventDefault();
  for (let i = 0; i < event.changedTouches.length; i++) {
    let touch = event.changedTouches[i];
    startMove(touch.identifier, touch.pageX, touch.pageY);
  }
}

function touchmove(event) {
  event.preventDefault();
  for (let i = 0; i < event.changedTouches.length; i++) {
    let touch = event.changedTouches[i];
    move(touch.identifier, touch.pageX, touch.pageY);
  }
}

function touchend(event) {
  event.preventDefault();
  for (let i = 0; i < event.changedTouches.length; i++) {
    let touch = event.changedTouches[i];
    endMove(touch.identifier, touch.pageX, touch.pageY);
  }
}

function touchcancel(event) {
  for (let i = 0; i < event.changedTouches.length; i++) {
    let touch = event.changedTouches[i];
    cancelMove(touch.identifier, touch.pageX, touch.pageY);
  }
}

// --------------------------- Main

function setup() {
  loadingText(true);
  setCanvasSize();
  setupEventHandlers();

  board = new Board(6, 5);
  window.requestAnimationFrame(draw);
  var ticker = setInterval(tick, 80);

  loadingText(false);
}

setup();
