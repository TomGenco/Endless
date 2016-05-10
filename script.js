"use strict";

function Endless() {
  var Settings = {
    animations: true,
    vibrate: true
  };

  var Game = {
    screen: null,
    mode: null,
    score: 0,
    playing: false,
    paused: false,

    modes: {
      endless: {
        settings: {
          columns: 5,
          dotColors: 5,
          hueShift: 60,
          rows: 6,
        },
        screen: undefined,
        score: 0,
        topMenuBar: undefined,
        grid: undefined,
        textMouseover: undefined,
        dotMouseover: undefined,
        mouseX: undefined, mouseY: undefined,

        mouseDown: function(event) {
          if (event.button != 0)
            this.grid.cancelSelection();
          else if (this.textMouseover && this.textMouseover.activate)
            this.textMouseover.activate();
          else if (this.dotMouseover && !this.grid.dotSelection[0])
            this.grid.startSelection(this.dotMouseover);
        },

        mouseUp: function(event) {
          if (event.button == 0 && this.grid.selectingDots)
            this.grid.endSelection();
        },

        mouseMove: function(event) {
          if (this.grid.selectingDots) {
            if (event.clientY < this.topMenuBar.height)
              this.grid.cancelSelection();
            this.mouseX = event.clientX - Graphics.canvas.offsetLeft, this.mouseY = event.clientY;
          }

          if (this.textMouseover = Text.searchAtPosition(event.clientX - Graphics.canvas.offsetLeft, event.clientY)) {
            this.dotMouseover = null;
            if (this.textMouseover.activate)
              Graphics.canvas.style.cursor = "pointer";
          } else if (this.dotMouseover = this.grid.searchAtPosition(event.clientX - Graphics.canvas.offsetLeft, event.clientY)) {
            this.textMouseover = null;
            Graphics.canvas.style.cursor = "pointer";
            if (this.grid.selectingDots)
              this.grid.handleDotMouseover(this.dotMouseover);
          } else
            Graphics.canvas.style.cursor = "";
        },

        touchStart: function(event, x, y) {
          event.preventDefault();

          var text, dot;
          if ((text = Text.searchAtPosition(x, y)) && text.activate)
            text.activate();
          else if (dot = this.grid.searchAtPosition(x, y))
            this.grid.startSelection(dot);
        },

        touchEnd: function(event, x, y) {
          if (this.grid.selectingDots)
            this.grid.endSelection();
        },

        touchMove: function(event, x, y) {
          if (this.grid.selectingDots) {
            if (y < this.topMenuBar.height)
              this.grid.cancelSelection();
            else {
              this.mouseX = x, this.mouseY = y;
              if (this.dotMouseover = this.grid.searchAtPosition(x, y)) {
                event.preventDefault();
                this.grid.handleDotMouseover(this.dotMouseover);
              }
            }
          }
        },

        touchCancel: function(event, x, y) {
          if (this.grid.selectingDots)
            this.grid.cancelSelection();
        },

        blur: function(event) {
          if (this.grid.selectingDots)
            this.grid.cancelSelection();
        },

        updateScore: function() {
          for (var i = 0; i < this.grid.dotSelection.length; i++)
            this.score += this.grid.dotSelection[i].points;
          if (Game.playing) {
            this.topMenuBar.contents.score.setText(this.score);
            if (Settings.animations && this.grid.dotSelectionHue != null) {
              this.topMenuBar.contents.score.hue = this.grid.dotSelectionHue + this.settings.hueShift % 360;
              this.topMenuBar.contents.score.lightness = 100;
              this.topMenuBar.contents.score.transition = new Transition(
                this.topMenuBar.contents.score,
                "lightness", 60, 800, 0);
              this.topMenuBar.contents.score.transition.start();
              }
          }
          localStorage.setItem("Endless.endless.score", this.score);
          localStorage.setItem("Endless.endless.lastTwoHues", JSON.stringify(this.grid.lastTwoHues));
        },

        updateScoreIndicator: function() {
          var possibleScore = 0;
          for (var i = 0; i < this.grid.dotSelection.length; i++)
            possibleScore += this.grid.dotSelection[i].points;

          if (possibleScore > 3) {
            this.topMenuBar.contents.scoreIndicator.setText("+" + possibleScore);
            this.topMenuBar.contents.scoreIndicator.visible = true;
            this.topMenuBar.contents.scoreIndicator.hue = this.grid.dotSelectionHue + this.settings.hueShift % 360;
            this.topMenuBar.contents.scoreIndicator.saturation = 60;
            this.topMenuBar.contents.scoreIndicator.lightness = 60;
          } else
            this.topMenuBar.contents.scoreIndicator.visible = false;
        },

        setupGraphics: function() {
          this.screen = new Screen();

          this.score = parseFloat(localStorage.getItem("Endless.endless.score"));
          if (!this.score)
            this.score = 0;

          this.topMenuBar = new MenuBar(this.screen,
            "score",          new Text(this.score, 0.01, 0.005, "left",  "top", 35),
            "scoreIndicator", new Text("",         0,    0.005, "left",  "top", 35),
            "menu",           new Text("Menu",     0.99, 0.005, "right", "top", 35, Game.pause)
          );
          this.topMenuBar.contents.scoreIndicator.putAfter(this.topMenuBar.contents.score);

          this.grid = new Grid(this, "endless", this.settings.columns, this.settings.rows, 1);

          this.screen.add("topMenuBar", this.topMenuBar, "grid", this.grid);
        },

        setupTransitions: function() {
          if (Settings.animations) {
            this.topMenuBar.contents.menu.transition =  new Transition(this.topMenuBar.contents.menu,  "y", -this.topMenuBar.height, 1000, 100, "logistic");
            this.topMenuBar.contents.score.transition = new Transition(this.topMenuBar.contents.score, "y", -this.topMenuBar.height, 1000, 100, "logistic");
            this.topMenuBar.transition =                new Transition(this.topMenuBar,                "y", -this.topMenuBar.height, 1000, 100, "logistic");
          }
        }
      }
    },

    play: function() {
      if (!Game.playing) {
        Game.playing = true;
        Game.mode.screen.show();
        Game.screen.overlay = true;
      }
      Game.paused = false;
      Game.screen.hide();
    },

    pause: function() {
      Game.paused = true;
      Game.screen.show();
    },
  };

  var Util = {
    loadDataFromStorage: function() {
      for (var i = 0; i < localStorage.length; i++) {
        if ((localStorage.key(i)) == "Endless--score")
          localStorage.setItem("Endless.endless.score", localStorage.getItem("Endless--score"));
        if (/^Endless\./.test(localStorage.key(i))) {
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
            Settings[localStorage.key(i).substr(9)] = value;
          } catch (e) {
            console.warn("Setting \"" + localStorage.key(i).substr(9) + "\" from Local Storage doesn't exist");
          }
        }
      }
    },

    saveDataToStorage: function() {
      for (var setting in Game.Settings)
        localStorage.setItem("Endless." + setting, Game.Setting[setting]);
    },

    clearStorage: function() {;
      if (confirm("Do you really want to reset settings and score?")) {
        for (var i = 0; i < localStorage.length; i++)
          if (/^Endless/.test(localStorage.key(i))) {
            localStorage.removeItem(localStorage.key(i));
            i--;
          }
        location.reload();
      }
    },

    vibrate: function(time) {
      if (!Settings.vibrate)
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
  };

  var EventHandlers = {
    mouseX: null, mouseY: null, textMouseover: null,

    setup: function() {
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
        Game.screen.onResize();
        // TODO: only resize the current one, and make sure the others do only when they need to
        for (var mode in Game.modes)
          Game.modes[mode].screen.onResize();
      });
    },

    MouseDown: function(event) {
      if (!Graphics.ready)
        return;

      if (Game.screen.visible) {
        if (event.button == 0 && EventHandlers.textMouseover && EventHandlers.textMouseover.activate)
          EventHandlers.textMouseover.activate();
      } else if (Game.mode)
        Game.mode.mouseDown(event);
    },

    MouseUp: function(event) {
      if (!Graphics.ready)
        return;

      if (!Game.screen.visible && Game.mode)
        Game.mode.mouseUp(event);
    },

    MouseMove: function(event) {
      if (!Graphics.ready)
        return;

      if (Game.screen.visible) {
        if ((EventHandlers.textMouseover = Text.searchAtPosition(event.clientX - Graphics.canvas.offsetLeft, event.clientY)) &&
            EventHandlers.textMouseover.activate)
          Graphics.canvas.style.cursor = "pointer";
        else
          Graphics.canvas.style.cursor = "";
      } else if (Game.mode)
        Game.mode.mouseMove(event);
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

      if (Game.screen.visible) {
        var text;

        if ((text = Text.searchAtPosition(x, y)) && text.activate) {
          event.preventDefault();
          text.activate();
        }
      } else if (Game.mode)
        Game.mode.touchStart(event, x, y);
    },

    TouchEnd: function(event) {
      event.stopPropagation();
      if (!Graphics.ready)
        return;

      for (var i = 0; i < event.changedTouches.length; i++)
        if (event.changedTouches[i].identifier == 0 && Game.mode)
          Game.mode.touchEnd(event);
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

      if (!Game.screen.visible && Game.mode)
        Game.mode.touchMove(event, x, y);
    },

    TouchCancel: function(event) {
      if (!Graphics.ready)
        return;

      for (var i = 0; i < event.changedTouches.length; i++)
        if (event.changedTouches[i].identifier == 0 && Game.mode)
          Game.mode.touchCancel(event)
    },

    Blur: function () {
      if (!Graphics.ready)
        return;

      if (!Game.screen.visible && Game.mode)
        Game.mode.blur(event);
    }
  };

  var Graphics = {
    ready: false,
    canvas: null,
    ctx: null,

    setup: function() {
      Graphics.canvas = document.getElementsByTagName("canvas")[0];
      Graphics.ctx = Graphics.canvas.getContext("2d");
      Graphics.updateCanvasSize();

      for (var mode in Game.modes)
        Game.modes[mode].setupGraphics();

      Game.screen = new Screen();
      Game.screen.add(
        "title",      new Text("endless",       0.5,   0.3, "center", "middle",  100),
        "subtitle",   new Text("by Tom Genco",  0.5,     0, "center", "top"   ,   25),
        "play",       new Text("Play",          0.3,   0.7, "center", "middle",   35, Game.play),
        "reset",      new Text("Reset",         0.7,   0.7, "center", "middle",   35, Util.clearStorage),
        "siteLink",   new Text("tomgenco.com", 0.02, 0.995, "left",   "bottom",   25, function() { window.location.href = "http://tomgenco.com"; }),
        "sourceLink", new Text("Source code",  0.98, 0.995, "right",  "bottom",   25, function() { window.location.href = "http://github.com/TomGenco/Endless"; })
      );
      Game.screen.contents.subtitle.putBelow(Game.screen.contents.title);

      if (Settings.animations) {
        var i = 0;
        for (var object in Game.screen.contents)
          Game.screen.contents[object].transition = new Transition(Game.screen.contents[object], "opacity", 0, 2000, i++ * 250);
      }

      document.getElementsByTagName("h1")[0].innerHTML = "Loading Font";
      WebFont.load({
        google: {
          families: ["Josefin Sans:300"]
        },
        active: function () {
          Game.screen.onResize();
          for (var mode in Game.modes) {
            Game.modes[mode].screen.onResize();
            Game.modes[mode].setupTransitions();
          }
          Game.screen.show();
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

      for (var modes in Game.modes)
        if (Game.modes[modes].screen.visible)
          Game.modes[modes].screen.draw();
      if (Game.screen.visible)
        Game.screen.draw();

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
      if (Settings.animations)
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

  function Grid(gameMode, name, cols, rows, dotSizeRatio, colors) {
    this.gameMode = gameMode,
    this.cols = cols,
    this.rows = rows,
    this.dotSizeRatio = dotSizeRatio,
    this.colors = colors,
    this.visible = true,
    this.selectingDots,
    this.dotSelection = [],
    this.dotSelectionHue,
    this.lastTwoHues = [];
    var importedGrid = JSON.parse(localStorage.getItem("Endless." + name + ".grid")), imported = false;
    var lastTwoHues = JSON.parse(localStorage.getItem("Endless." + name + ".lastTwoHues"))
    if (lastTwoHues != null)
      this.lastTwoHues = lastTwoHues;

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
      localStorage.setItem("Endless." + name + ".grid", JSON.stringify(importedGrid));
    };

    this.calculateDimensions = function() {
      this.dotSize = this.dotSizeRatio * Math.min(
        Graphics.canvas.width / (cols * 2),
       (Graphics.canvas.height - gameMode.topMenuBar.height) / (rows * 2));

      this.width = cols * this.dotSize * 2 - this.dotSize;
      this.height = rows * this.dotSize * 2 - this.dotSize;
      this.x = Graphics.canvas.width / 2 - this.width / 2;
      this.y = Graphics.canvas.height / 2 - this.height / 2 + (gameMode.topMenuBar.height / 2);

      if (this.dots)
        this.calculateDotPositions();
    };
    this.calculateDimensions();

    this.calculateDotPositions = function() {
      for (var col = 0; col < this.dots.length; col++)
        for (var row = 0; row < this.dots[col].length; row++) {
          this.dots[col][row].x = this.x + this.dotSize / 2 + col * this.dotSize * 2;
          this.dots[col][row].y = this.y + this.dotSize / 2 + row * this.dotSize * 2;
          if (this.dots[col][row].transition) {
            this.dots[col][row].transition.endVal = this.y + this.dotSize / 2 + row * this.dotSize * 2;
            this.dots[col][row].transition.distance = this.dots[col][row].transition.endVal - this.dots[col][row].transition.startVal;
          }
        }
    };

    this.generateDots = function() {
      if (!this.dots)
        this.dots = [];
      if (Settings.animations)
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
            if (Settings.animations) {
              this.dots[col][row].transition = new Transition(
                this.dots[col][row], 'y',
                -this.dotSize / 2 - this.dotSize / 2 * (this.rows - 1 - row),
                500, delay * 50, "logistic");
              updateDelay = true;
            }
          }
        if (Settings.animations && updateDelay) {
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
      // Iterate through each spot in this.grid.dots[][], from the bottom to top
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
              if (Settings.animations)
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
            if (Settings.animations && this.dots[i][j].transition) {
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
      Graphics.ctx.lineTo(this.gameMode.mouseX, this.gameMode.mouseY);
      Graphics.ctx.strokeStyle = this.dotSelection[this.dotSelection.length - 1].getColor();
      Graphics.ctx.stroke();
    };

    this.searchAtPosition = function(mouseX, mouseY) {
      var gridPosX = mouseX - this.x + this.dotSize / 2,
          gridPosY = mouseY - this.y + this.dotSize / 2;

      if (gridPosX > 0 && gridPosX < this.width  + this.dotSize &&
          gridPosY > 0 && gridPosY < this.height + this.dotSize) {
        var dot = this.dots[
           Math.floor(gridPosX / ((this.width  + this.dotSize) / this.cols))]
          [Math.floor(gridPosY / ((this.height + this.dotSize) / this.rows))
        ];

        if (dot && Math.sqrt(Math.pow(dot.x - mouseX, 2) + Math.pow(dot.y - mouseY, 2)) < this.dotSize / 2 * 1.75)
          return dot;
      }
      return false;
    };

    this.cleanUp = function() {
      // Remove any dot that shouldn't exist
      for (var col = dots.length - 1; col >= 0; col--)
        if (col >= this.cols)
          dots.pop();
        else
          for (var row = this.dots[col].length - 1; row >= this.rows; row--)
            this.dots[col].pop();

      this.generateDots();
    };

    this.startSelection = function(dot) {
      this.gameMode.topMenuBar.contents.menu.setText("Cancel");
      this.gameMode.mouseX = undefined;
      this.gameMode.mouseY = undefined;
      this.selectingDots = true;
      this.dotSelection[0] = dot;
      this.dotSelectionHue = dot.hue;
      dot.selected = true;
      Util.vibrate(30);
    };

    this.endSelection = function() {
      this.gameMode.topMenuBar.contents.menu.setText("Menu");
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
        this.gameMode.updateScore();
        this.dotSelectionHue = null;
        this.fillNulls();
        Util.vibrate([50, 100, 50]);
      } else
        this.dotSelection[0].selected = false;
      this.dotSelection = [];
      this.gameMode.updateScoreIndicator();
    };

    this.cancelSelection = function() {
      this.gameMode.topMenuBar.contents.menu.setText("Menu");
      this.selectingDots = false;
      for (var i = 0; i < this.dotSelection.length; i++)
        this.dotSelection[i].selected = false;
      this.dotSelection = [];
      this.gameMode.updateScoreIndicator();
    };

    this.handleDotMouseover = function(dot) {
      if (dot == this.dotSelection[this.dotSelection.length - 2]) {
        this.dotSelection.pop().selected = false;
        this.dotSelectionHue = this.dotSelection[this.dotSelection.length - 1].hue;
        this.gameMode.updateScoreIndicator();
      } else if (this.dotSelection[this.dotSelection.length - 1].canConnectTo(dot)) {
        dot.selected = true;
        this.dotSelection.push(dot);
        this.gameMode.updateScoreIndicator();
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
      this.hue = Math.floor(Math.random() * grid.gameMode.settings.dotColors) * (360 / Math.floor(grid.gameMode.settings.dotColors));
      if (grid.gameMode.settings.dotColors < 3 ||
        (this.hue != grid.lastTwoHues[0] &&
         this.hue != grid.lastTwoHues[1]))
         break;
    }

    ColorDot.prototype = Object.create(Dot.prototype);
    ColorDot.prototype.constructor = ColorDot;


    this.draw = function() {
      Graphics.ctx.fillStyle = "hsla(" +
        (this.hue + grid.gameMode.settings.hueShift % 360) + ", " + // Hue
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
      return "hsla(" + (this.hue + grid.gameMode.settings.hueShift % 360) + ", 100%, 50%, 1)";
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

  function Text(text, x, y, align, baseline, textSize, activate) {
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

      switch (align) {
        case "left":
          this.x = x * Graphics.canvas.width;
          break;
        case "right":
          this.x = x * Graphics.canvas.width - this.width;
          break;
        default:
          this.x = x * Graphics.canvas.width - this.width / 2;
          break;
      }

      switch (baseline) {
        case "top":
          this.y = y * Graphics.canvas.height;
          break;
        case "bottom":
          this.y = y * Graphics.canvas.height - this.height;
          break;
        default:
          this.y = y * Graphics.canvas.height - this.height / 2;
          break;
      }

      if (this.isBelow)
        this.y += this.isBelow.y + this.isBelow.height - .2 * this.isBelow.height;
      else if (this.isAfter)
        this.x += this.isAfter.x + this.isAfter.width;
    };

    this.setText = function (newText) {
      text = newText;
      this.calculateDimensions();
    };

    this.putBelow = function(text) {
      this.isBelow = text;
      this.calculateDimensions();
    };

    this.putAfter = function(text) {
      this.isAfter = text;
      this.calculateDimensions();
    }

    Text.searchAtPosition = function(mouseX, mouseY) {
      if (Game.screen.visible) {
        for (var i = 0; i < Game.screen.interactive.length; i++)
          if (Game.screen.interactive[i].inRange(mouseX, mouseY))
            return Game.screen.interactive[i];
      } else
        for (var mode in Game.modes)
          if (Game.modes[mode].screen.visible)
            for (var i = 0; i < Game.modes[mode].screen.interactive.length; i++)
              if (Game.modes[mode].screen.interactive[i].inRange(mouseX, mouseY))
                return Game.modes[mode].screen.interactive[i];
    };
  }

  function MenuBar() {
    this.contents = {};
    this.visible = true;
    this.color = "#222";
    this.height = 0;
    this.y = 0;
    this.transition;

    for (var i = 1; i < arguments.length; i+=2) {
      this.contents[arguments[i]] = arguments[i + 1];
      if (arguments[i + 1].height + arguments[i + 1].y > this.height)
        this.height = arguments[i + 1].height + arguments[i + 1].y;
      if (arguments[i + 1].activate)
        arguments[0].interactive.push(arguments[i + 1]);
    }

    this.calculateDimensions = function() {
      this.height = 0;
      for (var text in this.contents) {
        this.contents[text].calculateDimensions();
        if (this.contents[text].height + this.contents[text].y > this.height)
          this.height = this.contents[text].height + this.contents[text].y;
      }
    }

    this.draw = function() {
      if (this.transition)
        this.transition.update();

      Graphics.ctx.fillStyle = this.color;
      Graphics.ctx.fillRect(0, 0, Graphics.canvas.width, this.y + this.height)

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
    this.started = false;
    this.initTime = null;
    this.delta = null;
    this.distance = this.endVal - this.startVal;
    this.callback = callback;

    Object.defineProperty(this, "value", {
      get: function() {
        var value;
        if (!this.started)
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
      var that = this;
      setTimeout(function() {
        // Checks if this transition has been replaced before it's finished
        if (that == that.object.transition) {
          that.object[that.property] = that.endVal;
          if (that.callback)
            that.callback();
          delete that.object.transition;
        }
      }, that.delay + that.duration);
      this.initTime = Date.now();
    };

    this.update = function() {
      this.object[this.property] = this.value;
    }
  }

  Util.loadDataFromStorage();
  Graphics.setup();
  EventHandlers.setup();
  Game.mode = Game.modes.endless;
}

Endless();
