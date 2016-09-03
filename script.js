var board = null;
var dotSelections = [];
var drawList = [];
var drawTable = [[], [], []];
var drawing = true;
var mouseX = null;
var mouseY = null;

const canvas = document.getElementsByTagName("canvas")[0];
const context = canvas.getContext("2d");

// --------------------------- Classes

class Dot {
  constructor(board, row, col) {
    addToDrawList(this, 1);

    this.size = board.dotSize;
    this.board = board;
    this.row = row;
    this.col = col;
    this.selected = false;
    this.animations = {};

    this.calculatePosition();
  }

  draw() {
    for (let i in this.animations)
      if (this.animations[i].finished)
        delete this.animations[i];
      else this.animations[i].update()

    context.beginPath();
    context.arc(this.x, this.y, this.size / 2, 0, 2 * Math.PI);
    context.fill();
  }

  calculatePosition() {
    this.x = this.board.x + this.size + this.size * this.col * 2;
    this.y = this.board.y + this.size + this.size * this.row * 2;
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

  destroy() {
    this.animations["size"] = new Animation(this, "size", this.size, 0, 250, 0, function() {
      removeFromDrawList(this);
    });
  }

  resize() {
    this.size = this.board.dotSize;
    this.calculatePosition();
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
    addToDrawList(this, 2);

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
    let dot;
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
      if (!this.dots[i - 1].connection(this.dots[i]) || !inRange(this.dots[i - 1], this.dots[i]))
        return false;
    return true;
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

  gravity() {
    for (let col = 0; col < this.dots.length; col++)
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
    let delay = 0, updateDelay;
    for (let col = 0; col < this.dots.length; col++) {
      updateDelay = false;
      for (let row = 0; row < this.dots[col].length; row++)
        if (this.dots[col][row] == null) {
          updateDelay = true;
          this.dots[col][row] = new ColorDot(this, row, col, randomColor());
          this.dots[col][row].animations["y"] = (new Animation(this.dots[col][row], 'y',
            -(this.height + this.y) + this.dots[col][row].y + this.dotSize / 2,
            this.dots[col][row].y, 700, 75 * delay, null));
        }
      if (updateDelay)
        delay++;
    }
  }

  draw() {
    context.fillStyle = "#333";
    context.fillRect(
      this.x, this.y,
      this.width, this.height
    );
  }

  resize() {
    this.calculateDimensions();
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
    this.callback = callback ? callback.bind(this.object) : null;
    this.distance = this.endVal - this.startVal;
    this.started = false;
    this.finished = false;
    this.startTime = null;
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
    for (let i = 0; i < drawTable.length; i++)
      for (var j = 0; j < drawTable[i].length; j++)
        drawTable[i][j].draw();

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

function inRange(dot1, dot2) {
  return Math.abs(dot1.row - dot2.row) <= 1 && Math.abs(dot1.col - dot2.col) <= 1;
}

function startMove(id, x, y) {
  if (dotSelections[id].dots.length == 0 &&
     (dot = board.dotAtPosition(x, y)) && !dot.selected)
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
    for (dot in dotSelections[id].dots) {
      board.dots[dotSelections[id].dots[dot].col][dotSelections[id].dots[dot].row].destroy();
      board.dots[dotSelections[id].dots[dot].col][dotSelections[id].dots[dot].row] = null;
    }
  dotSelections[id].end();
  board.gravity();
  board.fill();
  for (let ds = 0; ds < dotSelections.length; ds++)
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
  for (var i = 0; i < drawList.length; i++)
    drawList[i].resize();
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

  board = new Board(3, 3);
  board.fill();

  loadingText(false);
}

setup();
draw();
