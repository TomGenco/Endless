// Script for Endless by Tom Genco

// Things you might want to change
var rows = 20,
    cols = 30,
    dotSize = 20,
    hueShift = 0, // Set colors to 1 to see what this is
    colors = 2, // A number between 1 and 360 inclusive
    backgroundColor = "black";

// Things you might not want to change
var canvas = $("canvas")[0], ctx = canvas.getContext("2d"), cursorX, cursorY,
  grid, gridWidth, gridHeight, setupTime, delta, square = false,
  initialized = true, playing = false, mouseDown = false, selection = [];

canvas.onmousemove = function(e) {
  cursorX = e.clientX;
  cursorY = e.clientY;
  var thisDot;
  if (playing) {
    var thisDot;
    if (thisDot = onADot(e.clientX, e.clientY)) {
      canvas.style.cursor = "pointer";
      if (mouseDown && selection[0] !== undefined) {
        if (selection.length > 1 && thisDot.row == selection[selection.length - 2].row && thisDot.col == selection[selection.length - 2].col) {
          console.log(selection);
          selection[selection.length - 2].disconnectFrom(selection[selection.length - 1]);
        }
        else if ((direction = selection[selection.length - 1].canConnectTo(thisDot, false)) != null) {
          selection[selection.length - 1].connectTo(thisDot, direction);
        }
      }
    } else
      canvas.removeAttribute("style");
  }
  else
    if (initialized && e.clientX > centerX - 50 && e.clientX < centerX + 50
        && e.clientY > (centerY * 1.25) - 25 && e.clientY < (centerY * 1.25) + 25)
      canvas.style.cursor = "pointer";
    else
      canvas.removeAttribute("style");
}

canvas.onmousedown = function(e) {
  mouseDown = true;
  if (playing && onADot(e.clientX, e.clientY))
    selection[0] = grid.dots[posXToCol(e.clientX)][posYToRow(e.clientY)];
  else
    if (initialized && !playing && e.clientX > centerX - 50 && e.clientX < centerX + 50
        && e.clientY > (centerY * 1.25) - 25 && e.clientY < (centerY * 1.25) + 25) {
      canvas.removeAttribute("style");
      setupGame();
    }
};

canvas.onmouseup = function() {
  mouseDown = false;
  for (var i = 0; i < selection.length; i++) {
    selection[i].connected.left = false;
    selection[i].connected.right = false;
    selection[i].connected.top = false;
    selection[i].connected.bottom = false;
    selection[i].selected = false;
    square = false;
  }
  selection = [];
};

function setup() {
  setupCanvas();
  window.onresize = setupCanvas;
  setupTime = Date.now();
  requestAnimationFrame(draw);
}

function setupCanvas() {
  $("canvas").attr("width", window.innerWidth);
  $("canvas").attr("height", window.innerHeight);

  centerX = canvas.width / 2;
  centerY = canvas.height / 2;
}

function setupGame() {
  grid = new Grid(generateDotArray(cols, rows));
  playing = true;
}

function draw() {
  ctx.fillStyle = backgroundColor;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  if (square) {
    ctx.fillStyle = "hsla(" + selection[0].hue + ", 100%, 50%, .25)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  if (!initialized) {
    // delta is the time elapsed in seconds
    delta = (Date.now() - setupTime) / 1000;
    if (delta < .5)
      ;
    else if (delta < 1.5)
      drawGameTitle(delta - .5, 0);
    else if (delta < 3)
      drawGameTitle(1, 0);
    else if (delta < 4)
      drawGameTitle(1, delta - 3);
    else if (delta < 5)
      drawGameTitle(1, 1);
    else if (delta < 6) {
      drawGameTitle(1, 1);
      drawButtons(delta - 5);
    } else {
      drawGameTitle(1, 1);
      drawButtons(1);
      initialized = true;
    }
  } else if (!playing) {
    drawGameTitle(1, 1);
    drawButtons(1);
  } else {
    grid.draw();
  }

  for (var i = 1; i < selection.length; i++) {
    ctx.strokeStyle = "hsl(" + selection[0].hue + ", 100%, 50%)";
    ctx.lineWidth = dotSize * .5;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(selection[i - 1].x, selection[i - 1].y);
    ctx.lineTo(selection[i].x, selection[i].y);
    ctx.stroke();
  }

  if (selection.length) {
    ctx.strokeStyle = "hsl(" + selection[0].hue + ", 100%, 50%)";
    ctx.lineWidth = dotSize * .5;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(selection[selection.length - 1].x, selection[selection.length - 1].y);
    ctx.lineTo(cursorX, cursorY);
    ctx.stroke();
  }

  requestAnimationFrame(draw);
}

function onADot(posX, posY) {
  if (posX > centerX - gridWidth / 2 && posX < centerX + gridWidth / 2
      && posY > centerY - gridHeight / 2 && posY < centerY + gridHeight / 2
      && (posX - (centerX - gridWidth / 2)) % (dotSize * 2) < dotSize
      && (posY - (centerY - gridHeight / 2)) % (dotSize * 2) < dotSize)
    return grid.dots[posXToCol(posX)][posYToRow(posY)];
  else
    return false;
}

function posXToCol(posX) {
  return Math.floor((posX - (centerX - gridWidth / 2)) / (dotSize * 2));
}

function posYToRow(posY) {
  return Math.floor((posY - (centerY - gridHeight / 2)) / (dotSize * 2));
}

function generateDotArray(cols, rows) {
  var dotArray = [];

  for (var x = 0; x < cols; x++)
    dotArray[x] = [];
  for (var x = 0; x < cols; x++)
    for (var y = 0; y < rows; y++)
      dotArray[x][y] = new Dot((Math.floor(Math.random() * colors) * (360 / colors) + hueShift) % 360);

  return dotArray;
}

function drawGameTitle(tOpacity, sOpacity) {
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  ctx.font = "128px sans-serif";
  ctx.fillStyle = "rgba(255, 255, 255, " + tOpacity + ")";
  ctx.lineWidth = 8;
  ctx.strokeStyle = "rgba(0, 0, 0, " + tOpacity + ")";
  ctx.strokeText("Endless", centerX, centerY / 2);
  ctx.fillText("Endless", centerX, centerY / 2);

  if (sOpacity != 0) {
    ctx.font = "32px sans-serif";
    ctx.fillStyle = "rgba(255, 255, 255, " + sOpacity + ")";
    ctx.lineWidth = 4;
    ctx.strokeStyle = "rgba(0, 0, 0, " + sOpacity + ")";
    ctx.strokeText("By Tom Genco", centerX + 118, (centerY / 2) + 64)
    ctx.fillText("By Tom Genco", centerX + 118, (centerY / 2) + 64);
  }
}

function drawButtons(opacity) {
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  ctx.font = "48px sans-serif";
  ctx.fillStyle = "rgba(255, 255, 255, " + opacity + ")";
  ctx.lineWidth = 6;
  ctx.strokeStyle = "rgba(0, 0, 0, " + opacity + ")";
  ctx.strokeText("Play", centerX, centerY * 1.25);
  ctx.fillText("Play", centerX, centerY * 1.25);
}

function Dot(hue) {
  this.hue = hue;
  this.x;
  this.y;
  this.col;
  this.row;
  this.connected = {
    top: false,
    left: false,
    right: false,
    bottom: false
  };
}

Dot.prototype.canConnectTo = function(dot, disconnecting) {
  if (dot.hue != this.hue)
    return null;
  console.log(this.row, this.col, dot.row, dot.col);
  if (dot.col - this.col == 1 && dot.row == this.row && disconnecting ? true : !dot.connected.left)
    return 0;
  else if (dot.col - this.col == -1 && dot.row == this.row && disconnecting ? true : !dot.connected.right)
    return 1;
  else if (dot.row - this.row == 1 && dot.col == this.col && disconnecting ? true : !dot.connected.top)
    return 2;
  else if (dot.row - this.row == -1 && dot.col == this.col && disconnecting ? true : !dot.connected.bottom)
    return 3;
  else return null;
};

Dot.prototype.connectTo = function(dot, direction) {
  selection[selection.length] = dot;
  if (dot.selected)
    square = true;
  switch (direction) {
    case 0:
      this.connected.right = true;
      dot.connected.left = true;
      this.selected = true;
      dot.selected = true;
      break;
    case 1:
      this.connected.left = true;
      dot.connected.right = true;
      this.selected = true;
      dot.selected = true;
      break;
    case 2:
      this.connected.bottom = true;
      dot.connected.top = true;
      this.selected = true;
      dot.selected = true;
      break;
    case 3:
      this.connected.top = true;
      dot.connected.bottom = true;
      this.selected = true;
      dot.selected = true;
      break;
  }
};

Dot.prototype.disconnectFrom = function(dot) {
  var direction = this.canConnectTo(dot, true);
  console.log(this, dot, direction);
  switch (direction) {
    case 0:
      dot.connected.left = false;
      this.connected.right = false;
      break;
    case 1:
      dot.connected.right = false;
      this.connected.left = false;
      break;
    case 2:
      dot.connected.top = false;
      this.connected.bottom = false;
      break;
    case 3:
      dot.connected.bottom = false;
      this.connected.top = false;
      break;
    default:
      console.error("dot is not adjacent to other dot");
      break;
  }

  if (dot.connected.left == false && dot.connected.right == false &&
      dot.connected.top == false && dot.connected.bottom == false)
    dot.selected = false;
  selection.length--;
};

function Grid(dots) {
  for (var i = 0; i < dots.length; i++) {
    for (var j = 0; j < dots[i].length; j++) {
      dots[i][j].col = i;
      dots[i][j].row = j;
    }
  }

  this.dots = dots;
}

Grid.prototype.draw = function() {
  gridWidth = (cols * dotSize * 2) - dotSize;
  gridHeight = (rows * dotSize * 2) - dotSize;

  for (var x = 0; x < this.dots.length; x++)
    for (var y = 0; y < this.dots[x].length; y++) {
      this.dots[x][y].x = centerX - (gridWidth / 2) + (x * dotSize * 2) + dotSize / 2;
      this.dots[x][y].y = centerY - (gridHeight / 2) + (y * dotSize * 2) + dotSize / 2;

      ctx.fillStyle = "hsl(" + this.dots[x][y].hue + ", 100%, 50%)";
      ctx.beginPath();
      ctx.arc(this.dots[x][y].x, this.dots[x][y].y, dotSize / 2, 0, Math.PI * 2, false);
      ctx.fill();
    }
};

setup();
