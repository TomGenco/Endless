"use strict";

function Endless() {
  var Game = {
    Settings: {
      animations: true,
      columns: 5,
      dotColors: 5,
      hueShift: 60,
      rows: 6,
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
      for (var i = 0; i < Game.screens.playing.contents.grid.dotSelection.length; i++)
        Game.score += Game.screens.playing.contents.grid.dotSelection[i].points;
      if (Game.playing) {
        Graphics.topMenuBar.contents.score.setText(Game.score);
        if (Game.Settings.animations && Game.screens.playing.contents.grid.dotSelectionHue != null) {
          Graphics.topMenuBar.contents.score.hue = Game.screens.playing.contents.grid.dotSelectionHue + Game.Settings.hueShift % 360;
          Graphics.topMenuBar.contents.score.lightness = 100;
          Graphics.topMenuBar.contents.score.transition = new Transition(
            Graphics.topMenuBar.contents.score,
            "lightness", 60, 800, 0);
          Graphics.topMenuBar.contents.score.transition.start();
          }
      }
      localStorage.setItem("Endless--score", Game.score);
      localStorage.setItem("Endless--lastTwoHues", JSON.stringify(Game.screens.playing.contents.grid.lastTwoHues));
    },

    updateScoreIndicator: function() {
      var possibleScore = 0;
      for (var i = 0; i < Game.screens.playing.contents.grid.dotSelection.length; i++)
        possibleScore += Game.screens.playing.contents.grid.dotSelection[i].points;

      if (possibleScore > 3) {
        Graphics.topMenuBar.contents.scoreIndicator.setText("+" + possibleScore);
        Graphics.topMenuBar.contents.scoreIndicator.visible = true;
        Graphics.topMenuBar.contents.scoreIndicator.hue = Game.screens.playing.contents.grid.dotSelectionHue + Game.Settings.hueShift % 360;
        Graphics.topMenuBar.contents.scoreIndicator.saturation = 60;
        Graphics.topMenuBar.contents.scoreIndicator.lightness = 60;
      } else {
        Graphics.topMenuBar.contents.scoreIndicator.visible = false;
      }
    }
  }

  var Util = {
    loadDataFromStorage: function() {
      for (var i = 0; i < localStorage.length; i++)
        if (/^Endless--/.test(localStorage.key(i))) {
          if (localStorage.key(i) == "Endless--score") {
            Game.score = parseFloat(localStorage.getItem("Endless--score"));
            if (Game.screens.playing)
              Game.updateScore();
            continue;
          } else if (/^Endless--grid_/.test(localStorage.key(i))) {
            continue;
          } else if (localStorage.key(i) == "Endless--lastTwoHues") {
            //Game.screens.playing.contents.grid.lastTwoHues = JSON.parse(localStorage.getItem("Endless--lastTwoHues"));
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
      window.addEventListener("mousedown", EventHandlers.MouseDown, false);
      window.addEventListener("mouseup", EventHandlers.MouseUp, false);
      window.addEventListener("mousemove", EventHandlers.MouseMove, false);
      window.addEventListener("blur", EventHandlers.Blur, false);
      window.addEventListener("touchstart", EventHandlers.TouchStart, false);
      window.addEventListener("touchend", EventHandlers.TouchEnd, false);
      window.addEventListener("touchmove", EventHandlers.TouchMove, false);
      window.addEventListener("touchcancel", EventHandlers.TouchCancel, false);
      window.addEventListener("resize", function() {
        Graphics.updateCanvasSize();
        for (var screen in Game.screens)
          Game.screens[screen].onResize();
      });
    },

    MouseDown: function(event) {
      if (!Graphics.ready)
        return;

      if (event.button != 0)
        Game.screens.playing.contents.grid.cancelSelection();
      else if (EventHandlers.textObjectMouseover && EventHandlers.textObjectMouseover.activate)
        EventHandlers.textObjectMouseover.activate();
      else if (EventHandlers.dotMouseover && !Game.screens.playing.contents.grid.dotSelection[0] && Game.playing && !Game.paused)
        Game.screens.playing.contents.grid.startSelection(EventHandlers.dotMouseover);
    },

    MouseUp: function(event) {
      if (!Graphics.ready)
        return;

      if ((event.button == 0 || event instanceof TouchEvent) && Game.screens.playing.contents.grid.selectingDots)
        Game.screens.playing.contents.grid.endSelection();
    },

    MouseMove: function(event) {
      if (!Graphics.ready)
        return;

      if (Game.screens.playing.contents.grid.selectingDots)
        EventHandlers.mouseX = event.clientX - Graphics.canvas.offsetLeft, EventHandlers.mouseY = event.clientY;

      if (EventHandlers.textObjectMouseover = TextObject.searchAtPosition(event.clientX - Graphics.canvas.offsetLeft, event.clientY)) {
        EventHandlers.dotMouseover = null;
        if (EventHandlers.textObjectMouseover.activate)
          Graphics.canvas.style.cursor = "pointer";
        if (Game.screens.playing.contents.grid.selectingDots)
          Game.screens.playing.contents.grid.cancelSelection();
      } else if ((EventHandlers.dotMouseover = Game.screens.playing.contents.grid.searchAtPosition(event.clientX - Graphics.canvas.offsetLeft, event.clientY)) && Game.playing && !Game.paused) {
        EventHandlers.textObjectMouseover = null;
        Graphics.canvas.style.cursor = "pointer";
        if (Game.screens.playing.contents.grid.selectingDots)
          Game.screens.playing.contents.grid.handleDotMouseover(EventHandlers.dotMouseover);
      } else {
        Graphics.canvas.style.cursor = "";
      }
    },

    TouchStart: function(event) {
      event.stopPropagation();
      if (!Graphics.ready)
        return;

      var x, y;
      for (var i = 0; i < event.changedTouches.length; i++)
        if (event.changedTouches[i].identifier == 0)
          x = event.changedTouches[i].pageX - Graphics.canvas.offsetLeft, y = event.changedTouches[i].pageY;
      if (x == undefined)
        return;

      var textObject;
      if ((textObject = TextObject.searchAtPosition(x, y)) && textObject.activate) {
        event.preventDefault();
        textObject.activate();
      } else if (Game.playing && !Game.screens.main.visible) {
        event.preventDefault();
        if (Game.screens.playing.contents.grid.dotSelection[0] = Game.screens.playing.contents.grid.searchAtPosition(x, y))
          Game.screens.playing.contents.grid.startSelection(Game.screens.playing.contents.grid.dotSelection[0]);
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
          x = event.changedTouches[i].pageX - Graphics.canvas.offsetLeft, y = event.changedTouches[i].pageY;
      if (x == undefined)
        return;

      if (Game.screens.playing.contents.grid.selectingDots) {
        if (TextObject.searchAtPosition(x, y)) {
          Game.screens.playing.contents.grid.cancelSelection();
          return;
        }
        EventHandlers.mouseX = x, EventHandlers.mouseY = y;
        if (EventHandlers.dotMouseover = Game.screens.playing.contents.grid.searchAtPosition(x, y)) {
          event.preventDefault();
          Game.screens.playing.contents.grid.handleDotMouseover(EventHandlers.dotMouseover);
        }
      }
    },

    TouchCancel: function(event) {
      if (!Graphics.ready)
        return;

      for (var i = 0; i < event.changedTouches.length; i++)
        if (event.changedTouches[i].identifier == 0 && Game.screens.playing.contents.grid.selectingDots)
          Game.screens.playing.contents.grid.cancelSelection();
    },

    Blur: function () {
      if (!Graphics.ready)
        return;

      if (Game.screens.playing.contents.grid.selectingDots)
        Game.screens.playing.contents.grid.cancelSelection();
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

      WebFont.load({
        google: {
          families: ["Josefin Sans:300"]
        },
        active: function () {
          var main =    Game.screens.main =    new Screen(),
              playing = Game.screens.playing = new Screen();

          Graphics.topMenuBar = new MenuBar(playing,
            "score",          "left",  new TextObject(Game.score, 0, 0,  10, 10, 35),
            "scoreIndicator", "left",  new TextObject("",         0, 0,  10, 10, 35),
            "menu",           "right", new TextObject("Menu",     1, 0, -10, 10, 35, function() { Game.paused = true, main.show(); })
          );

          main.add(
            "title",      new TextObject("endless",      0.5, 0.30,    0,  0, 100),
            "subtitle",   new TextObject("by Tom Genco", 0.5,    0,    0,  0,  25),
            "play",       new TextObject("Play",         0.3, 0.7, 0, 0,  35, Game.play),
            "reset",      new TextObject("Reset",        0.7, 0.7,  0, 0,  35, Util.clearStorage),
            "siteLink",   new TextObject("tomgenco.com",   0,    1,   5, 0,  25, function() { window.location.href = "http://tomgenco.com"; }),
            "sourceLink", new TextObject("Source code",    1,    1,  -5, 0,  25, function() { window.location.href = "http://github.com/TomGenco/Endless"; })
          );
          playing.add(
            "topMenuBar", Graphics.topMenuBar,
            "grid",       new Grid("endless", Game.Settings.columns, Game.Settings.rows, 1)
          );

          main.contents.subtitle.putBelow(main.contents.title);
          Graphics.topMenuBar.contents.scoreIndicator.putAfter(Graphics.topMenuBar.contents.score);

          if (Game.Settings.animations) {
            var i = 0;
            for (var object in main.contents)
              main.contents[object].transition = new Transition(main.contents[object], "opacity", 0, 2000, i++ * 250);

            Graphics.topMenuBar.contents.menu.transition =  new Transition(Graphics.topMenuBar.contents.menu,  "y", -128, 1000, 100, "logistic");
            Graphics.topMenuBar.contents.score.transition = new Transition(Graphics.topMenuBar.contents.score, "y", -128, 1000, 150, "logistic");
          }

          main.show();
          requestAnimationFrame(Graphics.draw);
          Graphics.ready = true;
          document.getElementsByTagName("h1")[0].style.display = "none";
        }
      });
    },

    updateCanvasSize: function() {
      Graphics.canvas.setAttribute("height", window.innerHeight);
      if (window.innerWidth > window.innerHeight) {
        var canvasWidth = Math.min(window.innerHeight, 980);
        Graphics.canvas.setAttribute("width", canvasWidth);
        Graphics.canvas.style["margin-left"] = ((window.innerWidth - canvasWidth) / 2) + "px";
      } else {
        Graphics.canvas.setAttribute("width", window.innerWidth);
        Graphics.canvas.style["margin-left"] = 0;
      }
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
    this.interactive = [];
    this.initialized = false
    this.visible     = false;
    this.overlay     = false;

    this.add = function() {
      for (var i = 0; i < arguments.length; i+=2) {
        this.contents[arguments[i]] = arguments[i + 1];
        if (arguments[i + 1].activate)
          this.interactive.push(arguments[i + 1]);
      }
    }

    this.draw = function() {
      if (this.overlay) {
        Graphics.ctx.fillStyle = "rgba(20,20,20,.8)";
        Graphics.ctx.fillRect(0, 0, Graphics.canvas.width, Graphics.canvas.height);
      }

      for (var object in this.contents)
        if (this.contents[object].visible)
          this.contents[object].draw();
    }

    this.initialize = function() {
      if (Game.Settings.animations)
        for (var object in this.contents)
          if (this.contents[object].visible && this.contents[object].transition && !this.contents[object].transition.started)
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

  function Grid(name, cols, rows, dotSizeRatio, colors) {
    this.cols = cols,
    this.rows = rows,
    this.colors = colors,
    this.visible = true,
    this.selectingDots,
    this.dotSelection = [],
    this.dotSelectionHue,
    this.lastTwoHues = [];
    var importedGrid = JSON.parse(localStorage.getItem("Endless--grid_" + name)), imported = false;

    this.exportToJSON = function() {
      importedGrid = [];
      for (var col = 0; col < this.dots.length; col++) {
        importedGrid[col] = [];
        for (var row = 0; row < this.dots[0].length; row++)
          importedGrid[col][row] = {
            type: this.dots[col][row].__proto__.constructor.name,
            hue: this.dots[col][row].hue
          };
      }
      localStorage.setItem("Endless--grid_" + name, JSON.stringify(importedGrid));
    };

    this.calculateDimensions = function() {
      this.dotSize = dotSizeRatio * Math.min(
        Graphics.canvas.width / (cols * 2),
       (Graphics.canvas.height - Graphics.topMenuBar.height) / (rows * 2));

      this.width = cols * this.dotSize * 2 - this.dotSize;
      this.height = rows * this.dotSize * 2 - this.dotSize;
      this.x = Graphics.canvas.width / 2 - this.width / 2;
      this.y = Graphics.canvas.height / 2 - this.height / 2 + (Graphics.topMenuBar.height / 2);

      if (this.dots)
        this.calculateDotPositions();
    };
    this.calculateDimensions();

    this.calculateDotPositions = function() {
      for (var col = 0; col < this.dots.length; col++)
        for (var row = 0; row < this.dots[col].length; row++) {
          this.dots[col][row].x = this.x + this.dotSize / 2 + col * this.dotSize * 2;
          this.dots[col][row].y = this.y + this.dotSize / 2 + row * this.dotSize * 2;
          if (Game.Settings.animations)
            if (this.dots[col][row].transition.started) {
              this.dots[col][row].transition.endVal = this.y + this.dotSize / 2 + row * this.dotSize * 2;
              this.dots[col][row].transition.finished = true;
            } else {
              this.dots[col][row].transition.endVal = this.y + this.dotSize / 2 + row * this.dotSize * 2;
              this.dots[col][row].transition.distance = this.dots[col][row].transition.endVal - this.dots[col][row].transition.startVal;
            }
        }
    };

    this.generateDots = function() {
      if (!this.dots)
        this.dots = [];
      if (Game.Settings.animations)
        var delay = 0, updateDelay = false;

      for (var col = 0; col < cols; col++) {
        if (!this.dots[col])
          this.dots[col] = [];
        updateDelay = false;
        for (var row = 0; row < rows; row++)
          if (!this.dots[col][row]) {
            if (!imported && importedGrid && importedGrid[col] && importedGrid[col][row]) {
              if (importedGrid[col][row].type == "SuperDot")
                this.dots[col][row] = new SuperDot(this, col, row);
              else {
                this.dots[col][row] = new ColorDot(this, col, row);
                this.dots[col][row].hue = importedGrid[col][row].hue;
              }
            } else {
              if (Math.floor(Math.random() * 20) == 0)
                this.dots[col][row] = new SuperDot(this, col, row);
              else
                this.dots[col][row] = new ColorDot(this, col, row);
            }
            if (Game.Settings.animations) {
              this.dots[col][row].transition = new Transition(
                this.dots[col][row], 'y',
                -this.dotSize / 2 - this.dotSize / 2 * (Game.Settings.rows - 1 - row),
                500, delay * 50, "logistic");
              updateDelay = true;
            }
          }
        if (Game.Settings.animations && updateDelay) {
          delay++;
          updateDelay = false;
        }
      }
      if (imported)
        this.exportToJSON();
      else
        imported = true;

      this.calculateDotPositions();
    };
    this.generateDots();

    this.fillNulls = function() {
      // Iterate through each spot in Game.screens.playing.contents.grid.dots[][], from the bottom to top
      for (var row = this.dots[0].length - 1; row >= 0; row--)
        for (var col = 0; col < this.dots.length; col++)
          // If that spot is null, try to pull the next non-null dot above it
          if (this.dots[col][row] == null) {
            var countNulls = 0;
            // Count how many nulls there are from this position upward
            while (row - countNulls >= 0)
              if (this.dots[col][row - countNulls] == null)
                countNulls++;
              else break;
            // If there is a dot above this position, drop it into it's new spot
            if (row - countNulls >= 0) {
              this.dots[col][row] = this.dots[col][row - countNulls];
              this.dots[col][row - countNulls] = null;
              this.dots[col][row].row = row;
              this.dots[col][row].y = this.y + this.dotSize / 2 + row * this.dotSize * 2;
              if (Game.Settings.animations)
                this.dots[col][row].transition = new Transition(
                  this.dots[col][row],
                  "y",
                  this.y + this.dotSize / 2 + (row - countNulls) * this.dotSize * 2,
                  400, 0, "logistic");
            }
          }

      this.generateDots();
    };

    this.draw = function() {
      for (var i = 0; i < this.dots.length; i++)
        for (var j = 0; j < this.dots[i].length; j++)
          if (this.dots[i][j]) {
            if (Game.Settings.animations && this.dots[i][j].transition) {
              if (!this.dots[i][j].transition.started)
                this.dots[i][j].transition.start();
              this.dots[i][j].transition.update();
            }
            this.dots[i][j].draw();
          }

      if (this.selectingDots)
        this.drawSelectionLine();
    };

    this.drawSelectionLine = function() {
      Graphics.ctx.lineWidth = this.dotSize / 3;
      Graphics.ctx.lineJoin = "round";
      Graphics.ctx.beginPath();
      Graphics.ctx.moveTo(this.dotSelection[0].x, this.dotSelection[0].y);
      for (var i = 1; i < this.dotSelection.length; i++) {
        var gradient = Graphics.ctx.createLinearGradient(this.dotSelection[i-1].x, this.dotSelection[i-1].y, this.dotSelection[i].x, this.dotSelection[i].y);
        gradient.addColorStop(0.2, this.dotSelection[i-1].getColor());
        gradient.addColorStop(0.8, this.dotSelection[i].getColor());
        Graphics.ctx.lineTo(this.dotSelection[i].x, this.dotSelection[i].y)
        Graphics.ctx.strokeStyle = gradient;
        Graphics.ctx.stroke();
        Graphics.ctx.beginPath();
        Graphics.ctx.moveTo(this.dotSelection[i].x, this.dotSelection[i].y);
      }
      Graphics.ctx.lineTo(EventHandlers.mouseX, EventHandlers.mouseY);
      Graphics.ctx.strokeStyle = this.dotSelection[this.dotSelection.length - 1].getColor();
      Graphics.ctx.stroke();
    };

    this.searchAtPosition = function(mouseX, mouseY) {
      var gridPosX = mouseX - this.x + this.dotSize / 2,
          gridPosY = mouseY - this.y + this.dotSize / 2;

      if (gridPosX > 0 && gridPosX < this.width  + this.dotSize &&
          gridPosY > 0 && gridPosY < this.height + this.dotSize) {
        var dot = this.dots[
           Math.floor(gridPosX / ((this.width  + this.dotSize) / Game.Settings.columns))]
          [Math.floor(gridPosY / ((this.height + this.dotSize) / Game.Settings.rows))
        ];

        if (dot && Math.sqrt(Math.pow(dot.x - mouseX, 2) + Math.pow(dot.y - mouseY, 2)) < this.dotSize / 2 * 1.75)
          return dot;
      }
      return false;
    };

    this.cleanUp = function() {
      // Remove any dot that shouldn't exist
      for (var col = dots.length - 1; col >= 0; col--)
        if (col >= Game.Settings.columns)
          dots.pop();
        else
          for (var row = this.dots[col].length - 1; row >= Game.Settings.rows; row--)
            this.dots[col].pop();

      this.generateDots();
    };

    this.startSelection = function(dot) {
      EventHandlers.mouseX = undefined;
      EventHandlers.mouseY = undefined;
      this.selectingDots = true;
      this.dotSelection[0] = dot;
      this.dotSelectionHue = dot.hue;
      dot.selected = true;
      if (Game.Settings.vibrate)
        Util.vibrate(30);
    };

    this.endSelection = function() {
      this.selectingDots = false;
      if (this.dotSelection.length > 1) {
        if (this.dotSelectionHue != null) {
          this.lastTwoHues[1] = this.lastTwoHues[0];
          this.lastTwoHues[0] = this.dotSelectionHue;
        }
        var dotsCleared = 0;
        for (var i = 0; i < this.dotSelection.length; i++) {
          this.dots[this.dotSelection[i].col][this.dotSelection[i].row] = null;
          dotsCleared++;
        }
        Game.updateScore();
        this.dotSelectionHue = null;
        this.fillNulls();
        Util.vibrate([30, 60, 30]);
      } else
        this.dotSelection[0].selected = false;
      this.dotSelection = [];
      Game.updateScoreIndicator();
    };

    this.cancelSelection = function() {
      this.selectingDots = false;
      for (var i = 0; i < this.dotSelection.length; i++)
        this.dotSelection[i].selected = false;
      this.dotSelection = [];
      Game.updateScoreIndicator();
    };

    this.handleDotMouseover = function(dot) {
      if (dot == this.dotSelection[this.dotSelection.length - 2]) {
        this.dotSelection.pop().selected = false;
        this.dotSelectionHue = this.dotSelection[this.dotSelection.length - 1].hue;
        Game.updateScoreIndicator();
      } else if (this.dotSelection[this.dotSelection.length - 1].canConnectTo(dot)) {
        dot.selected = true;
        this.dotSelection.push(dot);
        Game.updateScoreIndicator();
        if (Game.Settings.vibrate)
          Util.vibrate(20);
      }
    };
  }

  function Dot(grid, column, row, x, y) {
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
      Graphics.ctx.arc(this.x, this.y, grid.dotSize / 2, 0, Math.PI * 2, false);
      Graphics.ctx.fill();
    };

    this.canConnectTo = function(dot) {
      return false;
    };

    this.getColor = function() {
      return "white";
    }
  }

  function ColorDot(grid, column, row, x, y) {
    Dot.call(this, grid, column, row, x, y);

    while (true) {
      this.hue = Math.floor(Math.random() * Game.Settings.dotColors) * (360 / Math.floor(Game.Settings.dotColors));
      if (Game.Settings.dotColors < 3 ||
        (this.hue != grid.lastTwoHues[0] &&
         this.hue != grid.lastTwoHues[1]))
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
      Graphics.ctx.arc(this.x, this.y, grid.dotSize / 2, 0, Math.PI * 2, false);
      Graphics.ctx.fill();
    };

    this.canConnectTo = function(dot) {
      if (dot && (this.hue == dot.hue || dot instanceof SuperDot) && !dot.selected &&
          Math.abs(dot.col - this.col) < 2 && Math.abs(dot.row - this.row) < 2) {
        if (dot.hue == null)
          grid.dotSelectionHue = undefined;
        else
          grid.dotSelectionHue = dot.hue;
        return true;
      }
    };

    this.getColor = function() {
      return "hsla(" + (this.hue + Game.Settings.hueShift % 360) + ", 100%, 50%, 1)";
    };
  }

  function SuperDot(grid, column, row, x, y) {
    Dot.call(this, grid, column, row, x, y);

    this.points = 10;

    this.draw = function() {
      Graphics.ctx.fillStyle = "white";
      Graphics.ctx.beginPath();
      Graphics.ctx.arc(this.x, this.y, grid.dotSize / 2, 0, Math.PI * 2, false);
      Graphics.ctx.fill();
    };

    this.canConnectTo = function(dot) {
      if (dot && !dot.selected && Math.abs(dot.col - this.col) < 2 && Math.abs(dot.row - this.row) < 2) {
        if (dot.hue == null)
          grid.dotSelectionHue = undefined;
        else
          grid.dotSelectionHue = dot.hue;
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
    this.hue = 0;
    this.saturation = 100;
    this.lightness = 100;
    this.x;
    this.y;
    this.width;
    this.height;
    this.isBelow;
    this.isAfter;

    this.inRange = function(mouseX, mouseY) {
      return mouseX > this.x && mouseX < this.x + this.width &&
             mouseY > (this.y - this.height / 10) && mouseY < this.y + this.height;
    }

    this.draw = function() {
      if (this.transition)
        this.transition.update();

      Graphics.ctx.textBaseline = "top";
      Graphics.ctx.font = this.height + "px Josefin Sans";
      Graphics.ctx.globalAlpha = this.opacity;
      Graphics.ctx.fillStyle = "hsl(" + this.hue + "," + this.saturation + "%," + this.lightness + "%)";
      Graphics.ctx.fillText(text, this.x, this.y);
      //Graphics.ctx.strokeRect(this.x, this.y - this.height / 10, this.width, this.height + this.height / 10); // (click detection rectangle)
      //Graphics.ctx.strokeRect(this.x, this.y, this.width, this.height); // (canvas update detection rectangle)
    };

    this.calculateDimensions = function() {
      this.height = textSize * Graphics.canvas.width / 300;
      Graphics.ctx.font = this.height + "px Josefin Sans";
      this.width  = Graphics.ctx.measureText(text).width;

      switch (relativeX) {
        case 0:
          this.x = relativeX * Graphics.canvas.width + fixedOffsetX;
          break;
        case 1:
          this.x = relativeX * Graphics.canvas.width + fixedOffsetX - this.width;
          break;
        default:
          this.x = relativeX * Graphics.canvas.width + fixedOffsetX - this.width / 2;
          break;
      }

      switch (relativeY) {
        case 0:
          this.y = relativeY * Graphics.canvas.height + fixedOffsetY;
          break;
        case 1:
          this.y = relativeY * Graphics.canvas.height + fixedOffsetY - this.height;
          break;
        default:
          this.y = relativeY * Graphics.canvas.height + fixedOffsetY - this.height / 2;
          break;
      }

      if (this.isBelow)
        this.y += this.isBelow.y + this.isBelow.height - .2 * this.isBelow.height;
      else if (this.isAfter)
        this.x += this.isAfter.x + this.isAfter.width;
    };
    this.calculateDimensions();

    this.setText = function (newText) {
      text = newText;
      this.calculateDimensions();
    };

    this.putBelow = function(textObject) {
      this.isBelow = textObject;
      this.calculateDimensions();
    };

    this.putAfter = function(textObject) {
      this.isAfter = textObject;
      this.calculateDimensions();
    }

    TextObject.searchAtPosition = function(mouseX, mouseY) {
      for (var screen in Game.screens)
        if (Game.screens[screen].visible)
          for (var i = 0; i < Game.screens[screen].interactive.length; i++)
            if (Game.screens[screen].interactive[i].inRange(mouseX, mouseY))
              return Game.screens[screen].interactive[i];
    };
  }

  function MenuBar(screen) {
    this.contents = {};
    this.visible = true;
    this.color = "#222";
    this.height = 0;

    for (var i = 1; i < arguments.length; i+=3) {
      this.contents[arguments[i]] = arguments[i + 2];
      if (arguments[i + 2].height + arguments[i + 2].y > this.height)
        this.height = arguments[i + 2].height + arguments[i + 2].y;
      if (arguments[i + 2].activate)
        screen.interactive.push(arguments[i + 2]);
    }

    this.calculateDimensions = function() {
      this.height = 0;
      for (var textObject in this.contents) {
        this.contents[textObject].calculateDimensions();
        if (this.contents[textObject].height + this.contents[textObject].y > this.height)
          this.height = this.contents[textObject].height + this.contents[textObject].y;
      }
    }

    this.draw = function() {
      Graphics.ctx.fillStyle = this.color;
      Graphics.ctx.fillRect(0,0,Graphics.canvas.width,this.height)

      for (var object in this.contents) {
        if (this.contents[object].transition && !this.contents[object].transition.started)
          this.contents[object].transition.start();
        if (this.contents[object].visible)
          this.contents[object].draw();
        }
    };
  }

  function Transition(object, property, startVal, duration, delay, motionType, callback) {
    this.object = object;
    this.startVal = startVal;
    this.endVal = object[property];
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
