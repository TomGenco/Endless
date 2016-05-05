"use strict";

function Endless() {
  var Game = {
    Settings: {
      animations: true,
      columns: 5,
      dotColors: 5,
      hueShift: 60,
      rows: 5,
      vibrate: true
    },

    screens: {},
    score: 0,
    playing: false,
    paused: false,

    play: function() {
      if (!Game.playing) {
        Game.updateScore();
        Game.playing = true;
        Game.screens.playing.show();
        Game.screens.main.overlay = true;
      }
      Game.paused = false;
      Game.screens.main.hide();
    },

    updateScore: function() {
      for (var i = 0; i < Grid.dotSelection.length; i++)
        Game.score += Grid.dotSelection[i].points;
      if (Game.playing) {
        Game.screens.playing.contents.score.text = Game.score;
        if (Game.Settings.animations && Grid.dotSelectionHue != null) {
          Game.screens.playing.contents.score.hue = Grid.dotSelectionHue + Game.Settings.hueShift % 360;
          Game.screens.playing.contents.score.lightness = 60;
          Game.screens.playing.contents.score.transition = new Transition(
            Game.screens.playing.contents.score,
            "lightness", 60, 100, 800, 0);
          Game.screens.playing.contents.score.transition.start();
          }
      }
      localStorage.setItem("Endless--score", Game.score);
      localStorage.setItem("Endless--lastTwoHues", JSON.stringify(Grid.lastTwoHues));
    },

    updateScoreIndicator: function() {
      var possibleScore = 0;
      for (var i = 0; i < Grid.dotSelection.length; i++)
        possibleScore += Grid.dotSelection[i].points;

      if (possibleScore > 3) {
        Game.screens.playing.contents.scoreIndicator.text = "+" + possibleScore;
        Game.screens.playing.contents.scoreIndicator.visible = true;
        Game.screens.playing.contents.scoreIndicator.hue = Grid.dotSelectionHue + Game.Settings.hueShift % 360;
        Game.screens.playing.contents.scoreIndicator.saturation = 60;
        Game.screens.playing.contents.scoreIndicator.lightness = 60;
      } else {
        Game.screens.playing.contents.scoreIndicator.visible = false;
      }
    }
  }

  var Util = {
    loadDataFromStorage: function() {
      for (var i = 0; i < localStorage.length; i++)
        if (/^Endless--/.test(localStorage.key(i))) {
          if (localStorage.key(i) == "Endless--score") {
            Game.score = parseFloat(localStorage.getItem("Endless--score"));
            Game.updateScore();
            continue;
          } else if (localStorage.key(i) == "Endless--grid") {
            Grid.importing = true;
            continue;
          } else if (localStorage.key(i) == "Endless--lastTwoHues") {
            Grid.lastTwoHues = JSON.parse(localStorage.getItem("Endless--lastTwoHues"));
            continue;
          }
          var value = localStorage.getItem(localStorage.key(i));
          switch (value) {
            case "true":
            value = true;
            break;
            case "false":
            value = false;
            break;
            case "null":
            value = null;
            break;
            default:
            value = isNaN(parseFloat(value)) ? value : parseFloat(value);
          }
          try {
            settings.set([localStorage.key(i).substr(9)], value);
          } catch (e) {
            console.warn("Setting \"" + localStorage.key(i).substr(9) + "\" from Local Storage doesn't exist");
          }
        }
    },

    saveDataToStorage: function() {
      for (var setting in Game.Settings)
        localStorage.setItem("Endless--" + setting, Game.Setting[setting]);
    },

    clearStorage: function() {;
      var reallyWannaDoThat = confirm("Do you really want to reset settings and score?");
      if (reallyWannaDoThat) {
        for (var i = 0; i < localStorage.length; i++)
          if (/^Endless--/.test(localStorage.key(i))) {
            localStorage.removeItem(localStorage.key(i));
            i--;
          }
        location.reload();
      }
    },

    vibrate: function(time) {
      if (!Game.Settings.vibrate)
        return;
      else if (navigator.vibrate)
        navigator.vibrate(time);
      else if (navigator.mozVibrate)
        navigator.mozVibrate(time);
      else if (navigator.webkitVibrate)
        navigator.webkitVibrate(time);
      else return false;
      return true;
    }
  }

  var EventHandlers = {
    mouseX: null, mouseY: null, textObjectMouseover: null, dotMouseover: null,

    init: function() {
      Graphics.canvas.addEventListener("mousedown", EventHandlers.MouseDown, false);
      Graphics.canvas.addEventListener("mouseup", EventHandlers.MouseUp, false);
      Graphics.canvas.addEventListener("mousemove", EventHandlers.MouseMove, false);
      Graphics.canvas.addEventListener("mouseout", EventHandlers.Blur, false);
      Graphics.canvas.addEventListener("blur", EventHandlers.Blur, false);
      Graphics.canvas.addEventListener("touchstart", EventHandlers.TouchStart, false);
      Graphics.canvas.addEventListener("touchend", EventHandlers.TouchEnd, false);
      Graphics.canvas.addEventListener("touchmove", EventHandlers.TouchMove, false);
      Graphics.canvas.addEventListener("touchcancel", EventHandlers.TouchCancel, false);
      window.onresize = function() {
        Graphics.updateCanvasSize();
        for (var screen in Game.screens)
          Game.screens[screen].onResize();
      }
    },

    MouseDown: function(event) {
      if (!Graphics.ready)
        return;

      if (event.button != 0)
        Grid.cancelSelection();
      else if (EventHandlers.textObjectMouseover && EventHandlers.textObjectMouseover.activate)
        EventHandlers.textObjectMouseover.activate();
      else if (EventHandlers.dotMouseover && !Grid.dotSelection[0] && Game.playing && !Game.paused)
        Grid.startSelection(EventHandlers.dotMouseover);
    },

    MouseUp: function(event) {
      if (!Graphics.ready)
        return;

      if ((event.button == 0 || event instanceof TouchEvent) && Grid.selectingDots)
        Grid.endSelection();
    },

    MouseMove: function(event) {
      if (!Graphics.ready)
        return;

      if (Grid.selectingDots)
        EventHandlers.mouseX = event.clientX, EventHandlers.mouseY = event.clientY;

      if (EventHandlers.textObjectMouseover = TextObject.searchAtPosition(event.clientX, event.clientY)) {
        EventHandlers.dotMouseover = null;
        if (EventHandlers.textObjectMouseover.activate)
          Graphics.canvas.style.cursor = "pointer";
        if (Grid.selectingDots)
          Grid.cancelSelection();
      } else if ((EventHandlers.dotMouseover = Grid.searchAtPosition(event.clientX, event.clientY)) && Game.playing && !Game.paused) {
        EventHandlers.textObjectMouseover = null;
        Graphics.canvas.style.cursor = "pointer";
        if (Grid.selectingDots)
          Grid.handleDotMouseover(EventHandlers.dotMouseover);
      } else {
        Graphics.canvas.removeAttribute("style");
      }
    },

    TouchStart: function(event) {
      event.stopPropagation();
      if (!Graphics.ready)
        return;

      var x, y;
      for (var i = 0; i < event.changedTouches.length; i++)
        if (event.changedTouches[i].identifier == 0)
          x = event.changedTouches[i].pageX, y = event.changedTouches[i].pageY;
      if (x == undefined)
        return;

      var textObject;
      if ((textObject = TextObject.searchAtPosition(x, y)) && textObject.activate) {
        event.preventDefault();
        textObject.activate();
      } else if (Game.playing && !Game.screens.main.visible) {
        event.preventDefault();
        if (Grid.dotSelection[0] = Grid.searchAtPosition(x, y))
          Grid.startSelection(Grid.dotSelection[0]);
      }
    },

    TouchEnd: function(event) {
      event.stopPropagation();
      if (!Graphics.ready)
        return;

      for (var i = 0; i < event.changedTouches.length; i++)
        if (event.changedTouches[i].identifier == 0)
          EventHandlers.MouseUp(event);
    },

    TouchMove: function(event) {
      if (!Graphics.ready)
        return;

      var x, y;
      for (var i = 0; i < event.changedTouches.length; i++)
        if (event.changedTouches[i].identifier == 0)
          x = event.changedTouches[i].pageX, y = event.changedTouches[i].pageY;
      if (x == undefined)
        return;

      if (Grid.selectingDots) {
        if (TextObject.searchAtPosition(x, y)) {
          Grid.cancelSelection();
          return;
        }
        EventHandlers.mouseX = x, EventHandlers.mouseY = y;
        if (EventHandlers.dotMouseover = Grid.searchAtPosition(x, y)) {
          event.preventDefault();
          Grid.handleDotMouseover(EventHandlers.dotMouseover);
        }
      }
    },

    TouchCancel: function(event) {
      if (!Graphics.ready)
        return;

      for (var i = 0; i < event.changedTouches.length; i++)
        if (event.changedTouches[i].identifier == 0 && Grid.selectingDots)
          Grid.cancelSelection();
    },

    Blur: function () {
      if (!Graphics.ready)
        return;

      if (Grid.selectingDots)
        Grid.cancelSelection();
    }
  };

  var Graphics = {
    ready: false,
    canvas: null,
    ctx: null,
    dotSize: 0,

    init: function() {
      Graphics.canvas = document.getElementsByTagName("canvas")[0];
      Graphics.ctx = Graphics.canvas.getContext("2d");
      Graphics.updateCanvasSize();
      Grid.calculateDimensions();
      Grid.generateDots();

      WebFont.load({
        google: {
          families: ["Josefin Sans:300"]
        },
        active: function () {
          var main =    Game.screens.main =    new Screen(),
              playing = Game.screens.playing = new Screen();

          main.add([
            "title",      new TextObject("endless",      0.5, 0.35,    0,  0, 120),
            "subtitle",   new TextObject("by Tom Genco", 0.5, 0.40,    0, 50,  25),
            "play",       new TextObject("Play",         0.4, 0.60, -100, 40,  50, Game.play),
            "reset",      new TextObject("Reset",        0.6, 0.60,  100, 40,  50, Util.clearStorage),
            "siteLink",   new TextObject("tomgenco.com",   0,    1,   15, -5,  30, function() { window.location.href = "http://tomgenco.com"; }),
            "sourceLink", new TextObject("Source code",    1,    1,  -15, -5,  30, function() { window.location.href = "http://github.com/TomGenco/Endless"; })
          ]);
          playing.add([
            "score",          new TextObject(Game.score,   0,    0,    15,  0, 50),
            "scoreIndicator", new TextObject("hi",         0,    0.07, 15, 70, 50),
            "menu",           new TextObject("Menu",       1,    0,   -15,  0, 50),
            "grid",           Grid
          ]);

          playing.contents.scoreIndicator.visible = false;
          playing.contents.menu.activate = function() { Game.paused = true, main.show(); };

          if (Game.Settings.animations) {
            var i = 0;
            for (var object in main.contents)
              main.contents[object].transition = new Transition(main.contents[object], "opacity", 0, 1, 2000, i++ * 250);

            playing.contents.menu.transition =  new Transition(playing.contents.menu,  "fixedOffsetY", -128, 10, 1000, 100, "logistic");
            playing.contents.score.transition = new Transition(playing.contents.score, "fixedOffsetY", -128, 10, 1000, 150, "logistic");
          }
          main.show();
          requestAnimationFrame(Graphics.draw);
          Graphics.ready = true;
          document.getElementsByTagName("h1")[0].style.display = "none";
        }
      });
    },

    updateCanvasSize: function() {
      Graphics.canvas.setAttribute("width", window.innerWidth);
      Graphics.canvas.setAttribute("height", window.innerHeight);
    },

    // Calls each drawing function every frame, if needed.
    draw: function() {
      Graphics.ctx.clearRect(0,0,Graphics.canvas.width,Graphics.canvas.height);

      if (Game.screens.playing.visible)
        Game.screens.playing.draw();
      if (Game.screens.main.visible)
        Game.screens.main.draw();

      requestAnimationFrame(Graphics.draw);
    }
  }

  function Screen() {
    this.contents    = {};
    this.initialized = false
    this.visible     = false;
    this.overlay     = false;

    this.add = function(name, object) {
      if (Array.isArray(arguments[0])) {
        for (var i = 0; i < arguments[0].length; i+=2)
          this.add(arguments[0][i], arguments[0][i + 1]);
        return;
      }

      if (!object.draw)
        console.error(name + " needs a draw function.");
      else
        this.contents[name] = object;
    }

    this.draw = function() {
      if (this.overlay) {
        Graphics.ctx.fillStyle = "rgba(20,20,20,.75)";
        Graphics.ctx.fillRect(0, 0, Graphics.canvas.width, Graphics.canvas.height);
      }

      for (var object in this.contents)
        if (this.contents[object].visible)
          this.contents[object].draw();
    }

    this.initialize = function() {
      if (Game.Settings.animations)
        for (var object in this.contents)
          if (this.contents[object].visible && !this.contents[object].transition.started)
            this.contents[object].transition.start();
      this.initialized = true;
    }

    this.onResize = function () {
      for (var object in this.contents)
        if (this.contents[object].calculateDimensions)
          this.contents[object].calculateDimensions();
    }

    this.show = function() {
      if (!this.initialized)
        this.initialize();
      this.visible = true;
    }

    this.hide = function() {
      this.visible = false;
    }
  }

  var Grid = {
    gridX: null, gridY: null,
    width: null, height: null,
    visible: true,
    importing: false,
    dots: [],
    selectingDots: false,
    dotSelection: [],
    dotSelectionHue: 100,
    lastTwoHues: [],

    transition: {
      started: false,
      start: function() {
        for (var i = 0; i < Grid.dots.length; i++)
          for (var j = 0; j < Grid.dots[i].length; j++)
            if (Grid.dots[i][j] && Game.Settings.animations)
              Grid.dots[i][j].transition.start();
      }
    },

    generateDots: function() {
      var delay = 0, updateDelay;
      if (Grid.importing)
        var importedGrid = Grid.importFromJSON();
      for (var col = 0; col < Game.Settings.columns; col++) {
        if (Grid.dots[col] == undefined)
          Grid.dots[col] = [];
        updateDelay = false;
        for (var row = 0; row < Game.Settings.rows; row++)
          if (!Grid.dots[col][row]) {
            if (Grid.importing && importedGrid[col] && importedGrid[col][row]) {
              switch (importedGrid[col][row].type) {
                default:
                case "ColorDot":
                  Grid.dots[col][row] = new ColorDot(col, row,
                    Grid.gridX + Graphics.dotSize / 2 + col * Graphics.dotSize * 2,
                    Grid.gridY + Graphics.dotSize / 2 + row * Graphics.dotSize * 2);
                  Grid.dots[col][row].hue = importedGrid[col][row].hue;
                  break;
                case "SuperDot":
                  Grid.dots[col][row] = new SuperDot(col, row,
                    Grid.gridX + Graphics.dotSize / 2 + col * Graphics.dotSize * 2,
                    Grid.gridY + Graphics.dotSize / 2 + row * Graphics.dotSize * 2);
                  break;
              }
            } else {
              if (Math.floor(Math.random() * 12) == 0)
                Grid.dots[col][row] = new SuperDot(col, row,
                  Grid.gridX + Graphics.dotSize / 2 + col * Graphics.dotSize * 2,
                  Grid.gridY + Graphics.dotSize / 2 + row * Graphics.dotSize * 2);
              else
                Grid.dots[col][row] = new ColorDot(col, row,
                  Grid.gridX + Graphics.dotSize / 2 + col * Graphics.dotSize * 2,
                  Grid.gridY + Graphics.dotSize / 2 + row * Graphics.dotSize * 2);
            }
            if (Game.Settings.animations)
              Grid.dots[col][row].transition = new Transition(
                Grid.dots[col][row],
                "y",
                -Graphics.dotSize / 2 - Graphics.dotSize / 2 * (Game.Settings.rows - 1 - row),
                Grid.dots[col][row].y,
                500 + delay * 100, 0, "logistic"
              );
            if (!updateDelay)
              updateDelay = true;
          }
        if (updateDelay)
          delay++;
      }
      if (Grid.importing)
        Grid.importing = false;
      Grid.exportToJSON();
    },

    fillNulls: function() {
      // Iterate through each spot in Grid.dots[][], from the bottom to top
      for (var row = Grid.dots[0].length - 1; row >= 0; row--)
        for (var col = 0; col < Grid.dots.length; col++)
          // If that spot is null, try to pull the next non-null dot above it
          if (Grid.dots[col][row] == null) {
            var countNulls = 0;
            // Count how many nulls there are from this position upward
            while (row - countNulls >= 0)
              if (Grid.dots[col][row - countNulls] == null)
                countNulls++;
              else break;
            // If there is a dot above this position, drop it into it's new spot
            if (row - countNulls >= 0) {
              Grid.dots[col][row] = Grid.dots[col][row - countNulls];
              Grid.dots[col][row - countNulls] = null;
              Grid.dots[col][row].row = row;
              if (Game.Settings.animations) {
                Grid.dots[col][row].transition = new Transition(
                  Grid.dots[col][row],
                  "y",
                  Grid.gridY + Graphics.dotSize / 2 + (row - countNulls) * Graphics.dotSize * 2,
                  Grid.gridY + Graphics.dotSize / 2 + row * Graphics.dotSize * 2,
                  400, 0, "logistic");
                Grid.dots[col][row].draw.finished = false;
                Grid.dots[col][row].transition.start();
              } else {
                Grid.dots[col][row].y = Grid.gridY + Graphics.dotSize / 2 + row * Graphics.dotSize * 2;
              }
            }
          }

      Grid.generateDots();
      Grid.transition.start();
    },

    draw: function() {
      // Run each dot's transitions if needed
      for (var i = 0; i < Grid.dots.length; i++)
        for (var j = 0; j < Grid.dots[i].length; j++)
          if (Grid.dots[i][j]) {
            if (Game.Settings.animations && Grid.dots[i][j].transition)
              Grid.dots[i][j].transition.update();
            Grid.dots[i][j].draw();
          }

      if (Grid.selectingDots)
        Grid.drawSelectionLine();
    },

    drawSelectionLine: function() {
      Graphics.ctx.lineWidth = Graphics.dotSize / 3;
      Graphics.ctx.lineJoin = "round";
      Graphics.ctx.beginPath();
      Graphics.ctx.moveTo(Grid.dotSelection[0].x, Grid.dotSelection[0].y);
      for (var i = 1; i < Grid.dotSelection.length; i++) {
        var gradient = Graphics.ctx.createLinearGradient(Grid.dotSelection[i-1].x, Grid.dotSelection[i-1].y, Grid.dotSelection[i].x, Grid.dotSelection[i].y);
        gradient.addColorStop(0.2, Grid.dotSelection[i-1].getColor());
        gradient.addColorStop(0.8, Grid.dotSelection[i].getColor());
        Graphics.ctx.lineTo(Grid.dotSelection[i].x, Grid.dotSelection[i].y)
        Graphics.ctx.strokeStyle = gradient;
        Graphics.ctx.stroke();
        Graphics.ctx.beginPath();
        Graphics.ctx.moveTo(Grid.dotSelection[i].x, Grid.dotSelection[i].y);
      }
      Graphics.ctx.lineTo(EventHandlers.mouseX, EventHandlers.mouseY);
      Graphics.ctx.strokeStyle = Grid.dotSelection[Grid.dotSelection.length - 1].getColor();
      Graphics.ctx.stroke();
    },

    calculateDimensions: function() {
      // This will need some work (what if grid isn't a square?)
      Graphics.dotSize = (Math.min(Graphics.canvas.height, Graphics.canvas.width)) /
        (Math.max(Game.Settings.rows, Game.Settings.columns) * 2.3);

      Grid.width = Game.Settings.columns * Graphics.dotSize * 2 - Graphics.dotSize;
      Grid.height = Game.Settings.rows * Graphics.dotSize * 2 - Graphics.dotSize;
      Grid.gridX = window.innerWidth / 2 - Grid.width / 2;
      Grid.gridY = window.innerHeight / 2 - Grid.height / 2;

      this.calculateDotPositions();
    },

    calculateDotPositions: function() {
      for (var col = 0; col < Grid.dots.length; col++)
        for (var row = 0; row < Grid.dots[col].length; row++) {
          Grid.dots[col][row].x = Grid.gridX + Graphics.dotSize / 2 + col * Graphics.dotSize * 2;
          Grid.dots[col][row].y = Grid.gridY + Graphics.dotSize / 2 + row * Graphics.dotSize * 2;
          if (Game.Settings.animations)
            if (Grid.dots[col][row].transition.started) {
              Grid.dots[col][row].transition.endVal = Grid.gridY + Graphics.dotSize / 2 + row * Graphics.dotSize * 2;
              Grid.dots[col][row].transition.finished = true;
            } else {
              Grid.dots[col][row].transition.endVal = Grid.gridY + Graphics.dotSize / 2 + row * Graphics.dotSize * 2;
              Grid.dots[col][row].transition.distance = Grid.dots[col][row].transition.endVal - Grid.dots[col][row].transition.startVal;
            }
        }
    },

    searchAtPosition: function(mouseX, mouseY) {
      var gridPosX = mouseX - Grid.gridX + Graphics.dotSize / 2,
          gridPosY = mouseY - Grid.gridY + Graphics.dotSize / 2;

      if (gridPosX > 0 && gridPosX < Grid.width  + Graphics.dotSize &&
          gridPosY > 0 && gridPosY < Grid.height + Graphics.dotSize) {
        var dot = Grid.dots[
           Math.floor(gridPosX / ((Grid.width  + Graphics.dotSize) / Game.Settings.columns))]
          [Math.floor(gridPosY / ((Grid.height + Graphics.dotSize) / Game.Settings.rows))
        ];

        if (dot && Math.sqrt(Math.pow(dot.x - mouseX, 2) + Math.pow(dot.y - mouseY, 2)) < Graphics.dotSize / 2 * 1.75)
          return dot;
      }
      return false;
    },

    cleanUp: function() {
      // Remove any dot that shouldn't exist
      for (var col = dots.length - 1; col >= 0; col--)
        if (col >= Game.Settings.columns)
          dots.pop();
        else
          for (var row = Grid.dots[col].length - 1; row >= Game.Settings.rows; row--)
            Grid.dots[col].pop();

      Grid.generateDots();
    },

    importFromJSON: function(gridString) {
      return JSON.parse(localStorage.getItem("Endless--grid"));
    },

    exportToJSON: function() {
      var grid = [];
      for (var col = 0; col < Grid.dots.length; col++) {
        grid[col] = [];
        for (var row = 0; row < Grid.dots[0].length; row++)
          grid[col][row] = {
            type: Grid.dots[col][row].__proto__.constructor.name,
            hue: Grid.dots[col][row].hue
          };
      }
      localStorage.setItem("Endless--grid", JSON.stringify(grid));
    },

    startSelection: function(dot) {
      EventHandlers.mouseX = undefined;
      EventHandlers.mouseY = undefined;
      Grid.selectingDots = true;
      Grid.dotSelection[0] = dot;
      Grid.dotSelectionHue = dot.hue;
      dot.selected = true;
      if (Game.Settings.vibrate)
        Util.vibrate(30);
    },

    endSelection: function() {
      Grid.selectingDots = false;
      if (Grid.dotSelection.length > 1) {
        if (Grid.dotSelectionHue != null) {
          Grid.lastTwoHues[1] = Grid.lastTwoHues[0];
          Grid.lastTwoHues[0] = Grid.dotSelectionHue;
        }
        var dotsCleared = 0;
        for (var i = 0; i < Grid.dotSelection.length; i++) {
          Grid.dots[Grid.dotSelection[i].col][Grid.dotSelection[i].row] = null;
          dotsCleared++;
        }
        Game.updateScore();
        Grid.dotSelectionHue = null;
        Grid.fillNulls();
        Util.vibrate([30, 60, 30]);
      } else
        Grid.dotSelection[0].selected = false;
      Grid.dotSelection = [];
      Game.updateScoreIndicator();
    },

    cancelSelection: function() {
      Grid.selectingDots = false;
      for (var i = 0; i < Grid.dotSelection.length; i++)
        Grid.dotSelection[i].selected = false;
      Grid.dotSelection = [];
      Game.updateScoreIndicator();
    },

    handleDotMouseover: function(dot) {
      if (dot == Grid.dotSelection[Grid.dotSelection.length - 2]) {
        Grid.dotSelection.pop().selected = false;
        Game.updateScoreIndicator();
      } else if (Grid.dotSelection[Grid.dotSelection.length - 1].canConnectTo(dot)) {
        dot.selected = true;
        Grid.dotSelection.push(dot);
        Game.updateScoreIndicator();
        if (Game.Settings.vibrate)
          Util.vibrate(20);
      }
    }

  }

  function Dot(column, row, x, y) {
    this.col = column;
    this.row = row;
    this.x = x;
    this.y = y;
    this.points = 2;
    this.transition;
    this.selected = false;

    this.draw = function() {
      Graphics.ctx.fillStyle = "white";
      Graphics.ctx.beginPath();
      Graphics.ctx.arc(this.x, this.y, Graphics.dotSize / 2, 0, Math.PI * 2, false);
      Graphics.ctx.fill();
    };

    this.canConnectTo = function(dot) {
      return false;
    };

    this.getColor = function() {
      return "white";
    }
  }

  function ColorDot(column, row, x, y) {
    Dot.call(this, column, row, x, y);

    while (true) {
      this.hue = Math.floor(Math.random() * Game.Settings.dotColors) * (360 / Math.floor(Game.Settings.dotColors));
      if (Game.Settings.dotColors < 3 ||
        (this.hue != Grid.lastTwoHues[0] &&
         this.hue != Grid.lastTwoHues[1]))
         break;
    }

    ColorDot.prototype = Object.create(Dot.prototype);
    ColorDot.prototype.constructor = ColorDot;


    this.draw = function() {
      Graphics.ctx.fillStyle = "hsla(" +
        (this.hue + Game.Settings.hueShift % 360) + ", " + // Hue
        (this.selected? "100%" : "60%") + ", " +               // Saturation
        (this.selected? "50%"  : "60%") + ", " +               // Lightness
         "1)";                                   // Alpha (opacity)
      Graphics.ctx.beginPath();
      Graphics.ctx.arc(this.x, this.y, Graphics.dotSize / 2, 0, Math.PI * 2, false);
      Graphics.ctx.fill();
    };

    this.canConnectTo = function(dot) {
      if (dot && (this.hue == dot.hue || dot instanceof SuperDot) && !dot.selected &&
          Math.abs(dot.col - this.col) < 2 && Math.abs(dot.row - this.row) < 2) {
        if (dot.hue == null)
          Grid.dotSelectionHue = undefined;
        else
          Grid.dotSelectionHue = dot.hue;
        return true;
      }
    };

    this.getColor = function() {
      return "hsla(" + (this.hue + Game.Settings.hueShift % 360) + ", 100%, 50%, 1)";
    };
  }

  function SuperDot(column, row, x, y) {
    Dot.call(this, column, row, x, y);

    this.points = 10;

    this.draw = function() {
      Graphics.ctx.fillStyle = "white";
      Graphics.ctx.beginPath();
      Graphics.ctx.arc(this.x, this.y, Graphics.dotSize / 2, 0, Math.PI * 2, false);
      Graphics.ctx.fill();
    };

    this.canConnectTo = function(dot) {
      if (dot && !dot.selected && Math.abs(dot.col - this.col) < 2 && Math.abs(dot.row - this.row) < 2) {
        if (dot.hue == null)
          Grid.dotSelectionHue = undefined;
        else
          Grid.dotSelectionHue = dot.hue;
        return true;
      }
    };
  }

  SuperDot.prototype = Object.create(Dot.prototype);
  SuperDot.prototype.constructor = SuperDot;

  function TextObject(text, relativeX, relativeY, fixedOffsetX, fixedOffsetY, textSize, activate) {
    this.fixedOffsetX = fixedOffsetX;
    this.fixedOffsetY = fixedOffsetY;
    this.activate = activate;
    this.opacity = 1;
    this.transition;
    this.visible = true
    this.text = text;
    this.textSize = textSize;
    this.hue = 0;
    this.saturation = 100;
    this.lightness = 100;
    var fontSize, width, height, align, baseline, screenX, screenY;

    this.inRange = function(mouseX, mouseY) {
      return mouseX > screenX && mouseX < screenX + width &&
             mouseY > (screenY - fontSize / 10) && mouseY < screenY + height;
    }

    this.draw = function() {
      if (this.transition)
        this.transition.update();

      Graphics.ctx.textAlign = align;
      Graphics.ctx.textBaseline = baseline;
      Graphics.ctx.font = fontSize + "px Josefin Sans";
      Graphics.ctx.globalAlpha = this.opacity;
      Graphics.ctx.fillStyle = "hsl(" + this.hue + "," + this.saturation + "%," + this.lightness + "%)";
      Graphics.ctx.fillText(this.text, relativeX * Graphics.canvas.width + this.fixedOffsetX, relativeY * Graphics.canvas.height + this.fixedOffsetY);
      // Graphics.ctx.strokeRect(screenX, screenY - fontSize / 10, width, height + fontSize / 10); // (click detection rectangle)
      // Graphics.ctx.strokeRect(screenX, screenY, width, height); // (canvas update detection rectangle)
    };

    this.calculateDimensions = function() {
      fontSize = textSize * (Graphics.canvas.height / 980 + 1);
      Graphics.ctx.font = fontSize + "px Josefin Sans";
      width    = Graphics.ctx.measureText(text).width;
      height   = fontSize;
      align    = relativeX == 0 ? "left" : relativeX == 1 ? "right" : "center";
      baseline = relativeY == 0 ? "top" : relativeY == 1 ? "bottom" : "middle";

      switch (align) {
        case "center":
          screenX = relativeX * Graphics.canvas.width + fixedOffsetX - width / 2;
          break;
        case "left":
          screenX = relativeX * Graphics.canvas.width + fixedOffsetX;
          break;
        case "right":
          screenX = relativeX * Graphics.canvas.width + fixedOffsetX - width;
          break;
      }

      switch (baseline) {
        case "middle":
          screenY = relativeY * Graphics.canvas.height + fixedOffsetY - height / 2;
          break;
        case "top":
          screenY = relativeY * Graphics.canvas.height + fixedOffsetY;
          break;
        case "bottom":
          screenY = relativeY * Graphics.canvas.height + fixedOffsetY - height;
          break;
      }
    };
    this.calculateDimensions();

    TextObject.searchAtPosition = function(mouseX, mouseY) {
      for (var screen in Game.screens)
        for (var object in Game.screens[screen].contents)
          if (Game.screens[screen].contents[object] instanceof TextObject && Game.screens[screen].contents[object].inRange(mouseX, mouseY) &&
              Game.screens[screen].visible)
            return Game.screens[screen].contents[object];
    };
  }

  function Transition(object, property, startVal, endVal, duration, delay, motionType, callback) {
    this.object = object;
    this.startVal = startVal;
    this.endVal = endVal;
    this.duration = duration;
    this.delay = delay;
    this.property = property;
    this.motionType = motionType || "linear";
    this.finished = false;
    this.started = false;
    this.initTime = null;
    this.delta = null;
    this.distance = this.endVal - this.startVal;
    this.callback = callback;

    Object.defineProperty(this, "value", {
      get: function() {
        var value;
        if (this.finished)
          return this.endVal;
        else if (!this.started)
          return this.startVal;
        else {
          this.delta = Date.now() - this.delay - this.initTime;
          if (this.delta < 0)
            return this.startVal;

          switch (this.motionType) {
            default:
              console.error("Invalid motion type");
            case "linear":
              value = (this.delta / this.duration) * this.distance + this.startVal;
              return value > this.endVal ? this.endVal : value;
            case "logistic":
              return  1 / (1 + Math.pow(Math.E, -15 * (this.delta / this.duration - 0.5))) * this.distance + this.startVal;
          }
        }
      }
    });

    this.start = function() {
      if (this.started)
        return;
      this.started = true;
      this.finished = false;
      var that = this;
      setTimeout(function() {
        // Checks if this transition has been replaced before it's finished
        if (that == that.object.transition) {
          that.finished = true;
          that.object[that.property] = that.endVal;
          if (that.callback)
            that.callback();
        }
      }, that.delay + that.duration);
      this.initTime = Date.now();
    };

    this.update = function() {
      if (!this.finished)
        this.object[this.property] = this.value;
    }
  }

  Util.loadDataFromStorage();
  Graphics.init();
  EventHandlers.init();

}

Endless();
