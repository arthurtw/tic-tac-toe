/*
 * Copyright 2016 Arthur Liao
 * MIT License
 *
 * Tic-tac-toe
 * RICH player: tic-tac-toe
 */

window.onload = function () { new Game().init(); }

function Game(elem) {
  this.elem = elem || document.body.firstElementChild;
  this.ctx = this.elem.getContext('2d');
  if (!this.ctx) throw 'Canvas getContext("2d") is null';
}

var MarkBlank = 0, MarkO = 1, MarkX = 2;
var MarkLookup = {'o': MarkO, 'O': MarkO, 'x': MarkX, 'X': MarkX};

Game.prototype.init = function () {
  if (window.parent === window) {
    document.body.innerHTML = '<h2>Tic-tac-toe</h2>';
    return;
  }
  this.nextPlay = MarkBlank;
  this.board = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
  this.lastX = -1;
  this.lastY = -1;
  this.maximized = false;
  this.delayResize = true;
  
  RICH.init(function (result) {
    this.param = result.item;
    this.param.data.toLowerCase().trim().split(/\n/).map(function (row, y) {
      row.match(/[.ox]/ig).forEach(function (mark, x) {
        this.board[x][y] = MarkLookup[mark] || MarkBlank;
      }.bind(this));
    }.bind(this));
    this.drawBoard();
    if (this.param.play && !this.checkWinner()) { // a playable game
      this.elem.onmousemove = this.elem.onmouseout = this.onMouseMove.bind(this);
      this.elem.onclick = this.onClick.bind(this);
      this.nextPlay = MarkLookup[this.param.play] || MarkO;
    }
    if (this.param.height) {
      this.delayResize = false;
      RICH.send({command: 'screen', height: this.param.height});
    }
    window.onresize = this.onResize.bind(this);
    window.onkeyup = this.onKeyUp.bind(this);
  }.bind(this));
}

Game.prototype.drawMark = function (x, y, mark, light) {
  // Draw a (light) mark on the board
  var alpha = light ? 0.3 : 1;
  this.ctx.lineWidth = Math.max(3, Math.floor(this.unit / 10));
  this.ctx.beginPath();
  if (mark === MarkO) {
    this.ctx.strokeStyle = 'rgba(212, 63, 63, ' + alpha + ')';
    this.ctx.arc((x + 0.5) * this.unit, (y + 0.5) * this.unit, this.unit * 0.32, 0, 2 * Math.PI);
  } else if (mark === MarkX) {
    this.ctx.strokeStyle = 'rgba(106, 154, 31, ' + alpha + ')';;
    this.ctx.moveTo((x + 0.2) * this.unit, (y + 0.2) * this.unit);
    this.ctx.lineTo((x + 0.8) * this.unit, (y + 0.8) * this.unit);
    this.ctx.moveTo((x + 0.2) * this.unit, (y + 0.8) * this.unit);
    this.ctx.lineTo((x + 0.8) * this.unit, (y + 0.2) * this.unit);
  }
  this.ctx.stroke();
}

Game.prototype.erase = function (x, y, gray) {
  this.ctx.fillStyle = gray ? '#ccc' : '#fff';
  this.ctx.fillRect((x + 0.07) * this.unit, (y + 0.07) * this.unit, 0.86 * this.unit, 0.86 * this.unit);
}

Game.prototype.drawBoard = function () {
  this.elem.width = window.innerWidth;
  this.elem.height = window.innerHeight;
  this.offsetLeft = this.elem.offsetLeft;
  this.offsetTop = this.elem.offsetTop;

  var canvas = this.ctx.canvas;
  var sideLength = Math.min(canvas.width, canvas.height);
  this.landscape = canvas.width >= canvas.height;
  if (this.param.maxbutton) {
    if (Math.abs(canvas.width - canvas.height) < 60) sideLength -= 60 - Math.abs(canvas.width - canvas.height);
    this.maxButtonX = this.landscape ? sideLength + 20 : 5;
    this.maxButtonY = this.landscape ? 5 : sideLength + 20;
  }
  this.unit = Math.floor(sideLength / 3);

  // Draw the board
  this.ctx.lineWidth = Math.max(1, Math.floor(this.unit / 20));
  this.ctx.strokeStyle = '#888';
  this.ctx.beginPath();
  for (var i = 1; i < 3; i++) {
    this.ctx.moveTo(0, i * this.unit);
    this.ctx.lineTo(sideLength - 1, i * this.unit);
    this.ctx.moveTo(i * this.unit, 0);
    this.ctx.lineTo(i * this.unit, sideLength - 1);
  }
  this.ctx.stroke();

  // Draw the marks
  this.board.map(function (row, x) {
    row.forEach(function (mark, y) {
      this.drawMark(x, y, this.board[x][y]);
    }.bind(this));
  }.bind(this));
  this.checkWinner();

  // Draw the maximize (full-screen) or restore button
  if (this.maxButtonX) {
    this.ctx.strokeStyle = '#bbc';
    this.ctx.lineWidth = 4;
    if (this.maximized) {
      this.ctx.strokeRect(this.maxButtonX - 2, this.maxButtonY - 2, 12, 12);
      this.ctx.strokeRect(this.maxButtonX - 2, this.maxButtonY + 24, 12, 12);
      this.ctx.strokeRect(this.maxButtonX + 24, this.maxButtonY - 2, 12, 12);
      this.ctx.strokeRect(this.maxButtonX + 24, this.maxButtonY + 24, 12, 12);
      this.ctx.strokeStyle = '#fff';
      this.ctx.strokeRect(this.maxButtonX - 2, this.maxButtonY - 2, 38, 38);
    } else {
      this.ctx.strokeRect(this.maxButtonX, this.maxButtonY, 30, 30);
      this.ctx.clearRect(this.maxButtonX + 10, this.maxButtonY - 2, 10, 34);
      this.ctx.clearRect(this.maxButtonX - 2, this.maxButtonY + 10, 34, 10);
    }
  }
}

Game.prototype.onResize = function (e) {
  if (this.timer) {
    clearTimeout(this.timer);
  }
  this.timer = setTimeout(function () {
    this.drawBoard();
    this.timer = null;
  }.bind(this), this.delayResize ? 300 : 0);
  this.delayResize = true;
}

Game.prototype.getXY = function (mouseX, mouseY) {
  var x = (mouseX - this.offsetLeft) / this.unit;
  var y = (mouseY - this.offsetTop) / this.unit;
  var dx = x - Math.floor(x);
  var dy = y - Math.floor(y);
  if (x < 0 || x >= 3 || y < 0 || y >= 3 || dx < 0.05 || dx > 0.95 || dy < 0.05 || dy > 0.95) {
    x = y = -1;
  }
  return [Math.floor(x), Math.floor(y)];
}

Game.prototype.onMouseMove = function (e) {
  var xy = this.getXY(e.clientX, e.clientY);
  var x = xy[0], y = xy[1];
  if (x === this.lastX && y === this.lastY) return; // inside the same cell
  if (this.lastX >= 0 && this.lastY >= 0 && !this.board[this.lastX][this.lastY]) {
    this.erase(this.lastX, this.lastY);
  }
  if (x >= 0 && y >= 0 && !this.board[x][y]) {
    this.drawMark(x, y, this.nextPlay, true);
  }
  this.lastX = x;
  this.lastY = y;
}

Game.prototype.toggleFullScreen = function () {
  this.maximized = !this.maximized;
  this.delayResize = false;
  RICH.send({command: 'screen', state: this.maximized ? 'full' : 'normal'});
}

Game.prototype.onClick = function (e) {
  var xy = this.getXY(e.clientX, e.clientY);
  var x = xy[0], y = xy[1];
  if (x >= 0 && y >= 0 && !this.board[x][y] && this.nextPlay) {
    // Place a mark
    this.drawMark(x, y, this.nextPlay);
    this.board[x][y] = this.nextPlay;
    this.nextPlay = MarkO + MarkX - this.nextPlay;
    if (this.checkWinner()) { // someone won
      this.nextPlay = MarkBlank;
    }
  } else if (this.maxButtonX &&
      e.clientX >= this.maxButtonX && e.clientX <= this.maxButtonX + 30 &&
      e.clientY >= this.maxButtonY && e.clientY <= this.maxButtonY + 30) {
    this.toggleFullScreen();
  }
}

Game.prototype.onKeyUp = function (e) {
  if (this.maximized && e.keyCode === 27) {
    this.toggleFullScreen();
  }
}

Game.prototype.checkWinner = function () {
  var board = this.board;
  var oneRow = null;

  // Check diagonal rows
  if (board[0][0] && board[0][0] === board[1][1] && board[0][0] === board[2][2]) {
    oneRow = [[0, 0], [1, 1], [2, 2]];
  } else if (board[2][0] && board[2][0] === board[1][1] && board[2][0] === board[0][2]) {
    oneRow = [[2, 0], [1, 1], [0, 2]];
  }
  // Check vertical and horizontal rows
  for (var i = 0; i < 3 && !oneRow; i++) {
    if (board[i][0] && board[i][0] === board[i][1] && board[i][0] === board[i][2]) {
      oneRow = [[i, 0], [i, 1], [i, 2]];
    } else if (board[0][i] && board[0][i] === board[1][i] && board[0][i] === board[2][i]) {
      oneRow = [[0, i], [1, i], [2, i]];
    }
  }

  if (oneRow) {
    // Highlight 3 marks in a row
    oneRow.forEach(function (xy) {
      var x = xy[0], y = xy[1];
      this.erase(x, y, true);
      this.drawMark(x, y, board[x][y]);
    }.bind(this));
    return true;
  }
  return false;
}

