var board = null;
var dotSelections = [];
var drawList = [];
var drawing = true;
var mouseX = null;
var mouseY = null;

const canvas = document.getElementsByTagName("canvas")[0];
const context = canvas.getContext("2d");

// --------------------------- Classes

class Dot {
  constructor(board, row, col) {
    this.board = board;
    this.row = row;
    this.col = col;
    this.selected = false;
    this.animations = {};

    this.calculatePosition();
  }

  draw() {
    context.beginPath();
    context.arc(this.x, this.y, this.board.dotSize / 2, 0, 2 * Math.PI);
    context.fill();
  }

  calculatePosition() {
    this.x = this.board.x + this.board.dotSize + this.board.dotSize * this.col * 2;
    this.y = this.board.y + this.board.dotSize + this.board.dotSize * this.row * 2;
  }

  connection(dot) {
    return true;
  }

  moveTo(col, row) {
    this.board.dots[col][row] = this;
    this.board.dots[this.col][this.row] = null;
    this.row = row;
    this.col = col;

    let oldY = this.y;
    this.calculatePosition();
    this.animations["y"] = new Animation(this, "y", oldY, this.y, 400, 0, null);
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

  connection(dot) {
    return this.color == dot.color;
  }
}

class DotSelection {
  constructor() {
    this.dots = [];
    this.color = "white";
    this.x = null;
    this.y = null;
  }

  add(dot) {
    dot.selected = true;
    this.color = dot.color;
    this.dots.push(dot);
  }

  remove() {
    this.dots.pop().selected = false;
  }

  end() {
    while ((dot = this.dots.pop()) !== undefined)
      dot.selected = false;
  }

  draw() {
    if (this.dots.length == 0)
      return;

    context.strokeStyle = this.color;
    context.lineCap = "round";
    context.lineWidth = this.dots[0].board.dotSize / 2;
    context.lineJoin = "round";
    context.beginPath();
    context.moveTo(this.dots[0].x, this.dots[0].y);
    for (let i in this.dots) {
      context.lineTo(this.dots[i].x, this.dots[i].y);
    }
    if (this.y !== null && this.x !== null)
      context.lineTo(this.x, this.y);
    context.stroke();
  }

  get last() {
    return this.dots[this.dots.length - 1];
  }

  validate() {
    for (var i = 1; i < this.dots.length; i++)
      if (!this.dots[i - 1].connection(this.dots[i]))
        return false;
    return true;
  }
}

class Board {
  constructor(rows, cols) {
    drawList.push(this);

    this.rows = rows;
    this.cols = cols;
    this.dots = [];
    for (let col = 0; col < this.cols; col++) {
      this.dots[col] = [];
      for (let row = 0; row < this.rows; row++)
        this.dots[col][row] = null;
    }
    this.animations = [];

    this.calculateDimensions()
  }

  calculateDimensions() {
    this.dotSize = Math.min(canvas.width / (this.cols * 2), canvas.height / (this.rows * 2));
    this.width = this.cols * this.dotSize * 2;
    this.height = this.rows * this.dotSize * 2;
    this.x = canvas.width / 2 - this.width / 2;
    this.y = canvas.height / 2 - this.height / 2;
  }

  calculateDotPositions() {
    for (let col in this.dots)
      for (let row in this.dots[col])
        this.dots[col][row].calculatePosition();
  }

  gravity() {
    for (let col in this.dots)
      for (let row = this.dots[col].length - 1; row >= 0; row--)
        if (this.dots[col][row] == null) {
          for (let row2 = row - 1; row2 >= 0; row2--) {
            if (this.dots[col][row2] != null) {
              this.dots[col][row2].moveTo(col, row);
              break;
            }
          }
        }
  }

  fill() {
    for (let col in this.dots)
      for (let row in this.dots[col])
        if (this.dots[col][row] == null) {
          this.dots[col][row] = new ColorDot(this, row, col, randomColor());
          this.dots[col][row].animations["y"] = (new Animation(this.dots[col][row], 'y',
            -(this.height + this.y) + this.dots[col][row].y + this.dotSize / 2,
            this.dots[col][row].y, 700, 75 * col, null));
        }
  }

  draw() {
    context.fillStyle = "#333";
    context.fillRect(
      this.x, this.y,
      this.width, this.height
    );

    for (let col in this.dots)
      for (let row in this.dots[col]) {
        let dot = this.dots[col][row];
        if (dot !== null) {
          for (let i in dot.animations)
            if (dot.animations[i].finished)
              delete dot.animations[i];
            else dot.animations[i].update()
          dot.draw();
        }
      }

    for (let ds in dotSelections)
      dotSelections[ds].draw();
  }

  resize() {
    this.calculateDimensions();
    this.calculateDotPositions();
  }

  atPosition(x, y) {
    return x > this.x && x < this.x + this.width &&
           y > this.y && y < this.y + this.height;
  }

  dotAtPosition(x, y) {
    if (!this.atPosition(x, y))
      return false;
    let col = Math.floor((x - this.x) / (this.dotSize * 2));
    let row = Math.floor((y - this.y) / (this.dotSize * 2));
    let dot = this.dots[col][row];
    let a = x - dot.x;
    let b = y - dot.y;
    if ((Math.sqrt(Math.pow(a, 2) + Math.pow(b, 2))) <= this.dotSize * 0.75)
      return dot;
    else return false;
  }
}

class Animation {
  constructor(object, property, startVal, endVal, duration, delay, callback) {
    this.object = object;
    this.property = property;
    this.startVal = startVal;
    this.endVal = endVal;
    this.duration = duration;
    this.delay = delay;
    this.callback = callback;
    this.distance = this.endVal - this.startVal;
    this.started = false;
    this.finished = false;
    this.startTime = null;
  }

  start() {
    this.started = true;
    this.startTime = Date.now() + this.delay;
    setTimeout(this.finish, this.delay + this.duration);
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
    if (this.callback)
      this.callback();
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
    header.style = "position:fixed;top: 5px;left: 5px;margin: 0;color:white";
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
  context.fillStyle = "#292929";
  context.fillRect(0, 0, canvas.width, canvas.height);
}

function randomColor() {
  return "hsla(" + (Math.floor(Math.random() * 5) * 72 + 60) + ",60%,60%,1)";
}

function draw() {
  drawBackground();

  if (drawing)
    for (let drawable in drawList)
      drawList[drawable].draw();

  window.requestAnimationFrame(draw);
}

function inRange(dot1, dot2) {
  return Math.abs(dot1.row - dot2.row) <= 1 && Math.abs(dot1.col - dot2.col) <= 1;
}

function startMove(id, x, y) {
  if (dot = board.dotAtPosition(x, y) && !dot.selected)
    dotSelections[id].add(dot);
}

function move(id, x, y) {
  dotSelections[id].x = x;
  dotSelections[id].y = y;
  if (dotSelections[id].dots.length > 0 && (dot = board.dotAtPosition(x, y)))
    if (!dot.selected && inRange(dotSelections[id].last, dot) && dotSelections[id].last.connection(dot))
      dotSelections[id].add(dot);
    else if (dot == dotSelections[id].dots[dotSelections[id].dots.length - 2])
      dotSelections[id].remove();
}

function endMove(id, x, y) {
  dotSelections[id].x = null;
  dotSelections[id].y = null;
  if (dotSelections[id].dots.length > 1)
    for (dot in dotSelections[id].dots)
      board.dots[dotSelections[id].dots[dot].col][dotSelections[id].dots[dot].row] = null;
  dotSelections[id].end();
  board.gravity();
  board.fill();
  for (let ds in dotSelections)
  if (!dotSelections[ds].validate()) {
    dotSelections[ds].x = null;
    dotSelections[ds].y = null;
    dotSelections[ds].end();
  }
}

function cancelMove(id, x, y) {
  dotSelections[id].x = null;
  dotSelections[id].y = null;
  dotSelections[id].end();
}

// --------------------------- Event Handlers

function resize(event) {
  setCanvasSize();
  for (let drawable in drawList)
    drawList[drawable].resize();
}

function mousedown(event) {
  if (dotSelections[0] == undefined)
    dotSelections[0] = new DotSelection();
  startMove(0, event.pageX, event.pageY);
}

function mouseup(event) {
  if (dotSelections[0] == undefined)
    dotSelections[0] = new DotSelection();
  endMove(0, event.pageX, event.pageY);
}

function mousemove(event) {
  if (dotSelections[0] == undefined)
    dotSelections[0] = new DotSelection();
  move(0, event.pageX, event.pageY);
}

function touchstart(event) {
  event.preventDefault();
  for (let i = 0; i < event.changedTouches.length; i++) {
    let touch = event.changedTouches[i];
    if (dotSelections[touch.identifier] == undefined)
      dotSelections[touch.identifier] = new DotSelection();
    startMove(touch.identifier, touch.pageX, touch.pageY);
  }
}

function touchmove(event) {
  event.preventDefault();
  for (let i = 0; i < event.changedTouches.length; i++) {
    let touch = event.changedTouches[i];
    if (dotSelections[touch.identifier] == undefined)
      dotSelections[touch.identifier] = new DotSelection();
    move(touch.identifier, touch.pageX, touch.pageY);
  }
}

function touchend(event) {
  event.preventDefault();
  for (let i = 0; i < event.changedTouches.length; i++) {
    let touch = event.changedTouches[i];
    if (dotSelections[touch.identifier] == undefined)
      dotSelections[touch.identifier] = new DotSelection();
    endMove(touch.identifier, touch.pageX, touch.pageY);
  }
}

function touchcancel(event) {
  event.preventDefault();
  for (let i = 0; i < event.changedTouches.length; i++) {
    let touch = event.changedTouches[i];
    if (dotSelections[touch.identifier] == undefined)
      dotSelections[touch.identifier] = new DotSelection();
    cancelMove(touch.identifier, touch.pageX, touch.pageY);
  }
}

// --------------------------- Main

function setup() {
  loadingText(true);
  setCanvasSize();
  setupEventHandlers();

  board = new Board(6, 5);
  board.fill();

  loadingText(false);
}

setup();
draw();
