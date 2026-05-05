class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        this.gameId = null;
        this.playerId = null;
        this.maze = null;
        this.players = {};
        this.powerups = [];
        this.finished = false;
        this.winner = null;
        this.matchmaking = false;
        
        this.playerName = '';
        this.playerColor = '#FF0000';
        this.selectedSize = 'medium';
        this.selectedShape = 'square';
        this.cellSize = 12;
        this.hasWinnerSkin = this.getCookie('mazeRacerWinnerSkin') === 'true';
        
        this.keys = {};
        this.setupInputHandlers();
        this.setupNetworkHandlers();
        this.gameRunning = false;
        
        this.setupUIHandlers();
        this.generateNewMaze();
    }
    
    setupUIHandlers() {
        document.getElementById('playBtn').addEventListener('click', () => this.ready());
        document.getElementById('backBtn').addEventListener('click', () => this.back());
        document.getElementById('playAgainBtn').addEventListener('click', () => location.reload());
        
        document.querySelectorAll('.size-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.size-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.selectedSize = e.target.dataset.size;
                this.generateNewMaze();
                this.updateChoices();
            });
        });
        
        document.querySelectorAll('.shape-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.shape-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.selectedShape = e.target.dataset.shape;
                this.generateNewMaze();
                this.updateChoices();
            });
        });

        document.getElementById('playerName').addEventListener('input', () => this.updateChoices());
        this.updateChoices();
    }
    
    setupInputHandlers() {
        window.addEventListener('keydown', (e) => {
            this.keys[e.key.toLowerCase()] = true;
            if(['arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'w', 'a', 's', 'd'].includes(e.key.toLowerCase())) {
                e.preventDefault();
            }
        });
        
        window.addEventListener('keyup', (e) => {
            this.keys[e.key.toLowerCase()] = false;
        });
    }
    
    setupNetworkHandlers() {
        network.on('matched', (data) => {
            this.gameId = data.gameId;
            this.playerId = data.playerId;
            this.maze = data.state.maze;
            this.players = data.state.players;
            this.powerups = data.state.powerups;
            
            this.updateCanvasSize();
            this.startRacing();
            this.updateChoices();
        });
        
        network.on('gameStateUpdate', (data) => {
            this.players = data.players;
            this.powerups = data.powerups;
            this.finished = data.completed;
            this.winner = data.winner;
            
            if (this.finished && this.winner) {
                this.showGameOver();
            }
        });
        
        network.on('waiting', (data) => {
            document.getElementById('status').textContent = 'Waiting for opponent';
        });

        network.on('leftQueue', () => {
            if (!this.gameRunning) {
                document.getElementById('status').textContent = '';
            }
        });
    }
    
    generateNewMaze() {
        const { Maze, MazeSize } = window.mazeGenerator || {};
        if (!Maze) return;
        
        const sizeValue = MazeSize[this.selectedSize.toUpperCase()];
        this.maze = new Maze(sizeValue, this.selectedShape);
        this.updateCanvasSize();
        this.render();
    }
    
    updateCanvasSize() {
        if (!this.maze) return;
        const size = this.maze.size;
        this.cellSize = this.getCellSize(size);
        this.canvas.width = size * this.cellSize;
        this.canvas.height = size * this.cellSize;
        this.canvas.style.width = `${this.canvas.width}px`;
        this.canvas.style.height = `${this.canvas.height}px`;
        this.ctx.imageSmoothingEnabled = false;
    }

    getCellSize(size) {
        if (size <= 30) return 16;
        if (size <= 50) return 12;
        return 7;
    }
    
    ready() {
        this.playerName = document.getElementById('playerName').value || 'Player';
        this.playerColor = window.selectedColor || '#FF0000';
        this.matchmaking = true;
        
        document.getElementById('playBtn').style.display = 'none';
        document.getElementById('backBtn').style.display = 'block';
        document.getElementById('status').textContent = 'Ready';
        this.updateChoices();
        
        network.joinQueue(this.playerName, this.playerColor, this.selectedSize, this.selectedShape);
    }
    
    back() {
        this.matchmaking = false;
        network.leaveQueue();
        document.getElementById('playBtn').style.display = 'block';
        document.getElementById('backBtn').style.display = 'none';
        document.getElementById('status').textContent = '';
        this.updateChoices();
        this.generateNewMaze();
    }
    
    startRacing() {
        document.getElementById('playBtn').style.display = 'none';
        document.getElementById('backBtn').style.display = 'none';
        document.getElementById('status').textContent = 'Race started';
        this.matchmaking = false;
        this.gameRunning = true;
        this.gameLoop();
    }

    updateChoices() {
        const choices = document.getElementById('choices');
        if (!choices) return;

        const ownName = document.getElementById('playerName').value || 'Player';
        const ownColor = window.selectedColor || this.playerColor;

        if (this.gameRunning && Object.keys(this.players).length > 0) {
            choices.innerHTML = Object.values(this.players).map(player => `
                <div class="choice-row">
                    <span class="color-dot" style="background:${player.color}"></span>
                    <span>${this.escapeHtml(player.name)}</span>
                    <span>${this.escapeHtml(player.size)}</span>
                    <span>${this.escapeHtml(player.shape)}</span>
                </div>
            `).join('');
            return;
        }

        choices.innerHTML = `
            <div class="choice-row">
                <span class="color-dot" style="background:${ownColor}"></span>
                <span>${this.escapeHtml(ownName)}</span>
                <span>${this.selectedSize}</span>
                <span>${this.selectedShape}</span>
            </div>
        `;
    }

    escapeHtml(value) {
        return String(value).replace(/[&<>"']/g, char => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        })[char]);
    }
    
    showGameOver() {
        const winnerPlayer = this.players[this.winner];
        const isWinner = this.winner === this.playerId;

        if (isWinner) {
            this.hasWinnerSkin = true;
            this.setCookie('mazeRacerWinnerSkin', 'true', 365);
        }
        
        document.getElementById('resultText').textContent = isWinner ? 'You Won!' : `${winnerPlayer.name} Won!`;
        document.getElementById('timeText').textContent = `Time: ${winnerPlayer.finishTime.toFixed(2)}s`;
        document.getElementById('gameOverlay').style.display = 'flex';
        
        this.gameRunning = false;
    }
    
    gameLoop = () => {
        if (!this.gameRunning) return;
        
        this.updatePlayerInput();
        this.render();
        requestAnimationFrame(this.gameLoop);
    }
    
    updatePlayerInput() {
        if (!this.players[this.playerId] || this.finished) return;
        
        const player = this.players[this.playerId];
        let newX = player.x;
        let newY = player.y;
        
        const moveSpeed = 0.13;
        const speedMult = player.speedBoost ? 1.5 : 1.0;
        const actualSpeed = moveSpeed * speedMult;
        
        if (this.keys['w'] || this.keys['arrowup']) newY -= actualSpeed;
        if (this.keys['s'] || this.keys['arrowdown']) newY += actualSpeed;
        if (this.keys['a'] || this.keys['arrowleft']) newX -= actualSpeed;
        if (this.keys['d'] || this.keys['arrowright']) newX += actualSpeed;
        
        if (newX !== player.x || newY !== player.y) {
            network.sendMove(newX, newY);
        }
        
        const endX = this.maze.end[0];
        const endY = this.maze.end[1];
        const distance = Math.sqrt((newX - endX) ** 2 + (newY - endY) ** 2);
        
        if (distance < 1.0 && !this.finished) {
            network.sendFinish();
        }
    }
    
    render() {
        this.ctx.fillStyle = '#ffffff';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        if (!this.maze) return;
        
        this.renderMaze();
        this.renderPathHint();
        this.renderFinish();
        this.renderPowerups();
        this.renderPlayers();
    }
    
    renderMaze() {
        const grid = this.maze.grid;
        const size = this.maze.size;
        const pixelSize = this.cellSize;
        
        this.ctx.fillStyle = '#333333';
        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                if (grid[y][x] === 1) {
                    this.ctx.fillRect(x * pixelSize, y * pixelSize, pixelSize, pixelSize);
                }
            }
        }
    }

    renderPathHint() {
        const currentPlayer = this.players[this.playerId];
        if (!currentPlayer || !currentPlayer.showPath) return;

        const path = this.findShortestPath(
            Math.round(currentPlayer.x),
            Math.round(currentPlayer.y),
            this.maze.end[0],
            this.maze.end[1]
        );

        if (path.length === 0) return;

        const pixelSize = this.cellSize;
        this.ctx.fillStyle = '#5fd36a';

        for (const [x, y] of path) {
            this.ctx.fillRect(
                x * pixelSize,
                y * pixelSize,
                pixelSize,
                pixelSize
            );
        }
    }

    findShortestPath(startX, startY, endX, endY) {
        const grid = this.maze.grid;
        const size = this.maze.size;

        if (!this.isOpenCell(startX, startY) || !this.isOpenCell(endX, endY)) {
            return [];
        }

        const queue = [[startX, startY]];
        const visited = Array(size).fill(null).map(() => Array(size).fill(false));
        const previous = new Map();
        visited[startY][startX] = true;

        for (let i = 0; i < queue.length; i++) {
            const [x, y] = queue[i];
            if (x === endX && y === endY) break;

            for (const [dx, dy] of [[0, -1], [1, 0], [0, 1], [-1, 0]]) {
                const nextX = x + dx;
                const nextY = y + dy;

                if (
                    nextX < 0 || nextX >= size ||
                    nextY < 0 || nextY >= size ||
                    visited[nextY][nextX] ||
                    grid[nextY][nextX] !== 0
                ) {
                    continue;
                }

                visited[nextY][nextX] = true;
                previous.set(`${nextX},${nextY}`, [x, y]);
                queue.push([nextX, nextY]);
            }
        }

        if (!visited[endY][endX]) return [];

        const path = [];
        let current = [endX, endY];

        while (current) {
            path.push(current);
            if (current[0] === startX && current[1] === startY) break;
            current = previous.get(`${current[0]},${current[1]}`);
        }

        return path.reverse();
    }

    isOpenCell(x, y) {
        return (
            this.maze &&
            x >= 0 &&
            x < this.maze.size &&
            y >= 0 &&
            y < this.maze.size &&
            this.maze.grid[y][x] === 0
        );
    }
    
    renderFinish() {
        const pixelSize = this.cellSize;
        const endX = this.maze.end[0];
        const endY = this.maze.end[1];
        
        this.ctx.fillStyle = '#FFD700';
        this.ctx.fillRect(endX * pixelSize, endY * pixelSize, pixelSize, pixelSize);
        
        this.ctx.fillStyle = '#FFA500';
        for (let i = 0; i < 2; i++) {
            for (let j = 0; j < 2; j++) {
                if ((i + j) % 2 === 0) {
                    this.ctx.fillRect(
                        endX * pixelSize + i * pixelSize / 2,
                        endY * pixelSize + j * pixelSize / 2,
                        pixelSize / 2,
                        pixelSize / 2
                    );
                }
            }
        }
    }
    
    renderPowerups() {
        const pixelSize = this.cellSize;
        for (const powerup of this.powerups) {
            let color;
            switch (powerup.type) {
                case 'freeze': color = '#00CCFF'; break;
                case 'speed': color = '#FF00FF'; break;
                case 'sight': color = '#00FF00'; break;
                default: color = '#FFFF00';
            }
            
            const angle = (Date.now() / 20) % (Math.PI * 2);
            const size = pixelSize / 2;
            
            this.ctx.save();
            this.ctx.translate((powerup.x + 0.5) * pixelSize, (powerup.y + 0.5) * pixelSize);
            this.ctx.rotate(angle);
            
            this.ctx.fillStyle = color;
            this.drawStar(0, 0, 5, size * 0.6, size * 0.3);
            
            this.ctx.restore();
        }
    }
    
    drawStar(cx, cy, spikes, outerRadius, innerRadius) {
        let rot = Math.PI / 2 * 3;
        let step = Math.PI / spikes;
        
        this.ctx.beginPath();
        this.ctx.moveTo(cx, cy - outerRadius);
        
        for (let i = 0; i < spikes; i++) {
            this.ctx.lineTo(cx + Math.cos(rot) * outerRadius, cy + Math.sin(rot) * outerRadius);
            rot += step;
            this.ctx.lineTo(cx + Math.cos(rot) * innerRadius, cy + Math.sin(rot) * innerRadius);
            rot += step;
        }
        
        this.ctx.lineTo(cx, cy - outerRadius);
        this.ctx.closePath();
        this.ctx.fill();
    }
    
    renderPlayers() {
        const pixelSize = this.cellSize;
        const playerIds = Object.keys(this.players);

        if (playerIds.length === 0) {
            this.drawPlayer(1, 1, window.selectedColor || this.playerColor, this.selectedShape, pixelSize, false, this.hasWinnerSkin);
            return;
        }
        
        for (const playerId of playerIds) {
            const player = this.players[playerId];
            const isCurrentPlayer = playerId === this.playerId;
            
            if (!isCurrentPlayer) {
                this.drawPlayer(player.x, player.y, player.color, player.shape, pixelSize, true, false);
            }
        }
        
        const currentPlayer = this.players[this.playerId];
        if (!currentPlayer) return;

        this.ctx.globalAlpha = currentPlayer.frozen ? 0.5 : 1.0;
        this.drawPlayer(currentPlayer.x, currentPlayer.y, currentPlayer.color, currentPlayer.shape, pixelSize, false, this.hasWinnerSkin);
        this.ctx.globalAlpha = 1.0;
        
        const left = Math.round(currentPlayer.x * pixelSize);
        const top = Math.round(currentPlayer.y * pixelSize);

        this.ctx.strokeStyle = '#333333';
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(left + 0.5, top + 0.5, pixelSize - 1, pixelSize - 1);
    }

    drawPlayer(x, y, color, shape, pixelSize, ghost, crowned) {
        const left = Math.round(x * pixelSize);
        const top = Math.round(y * pixelSize);
        const centerX = left + pixelSize / 2;
        const centerY = top + pixelSize / 2;
        const inset = Math.max(2, Math.round(pixelSize * 0.18));

        this.ctx.save();
        this.ctx.globalAlpha *= ghost ? 0.42 : 1;
        this.ctx.fillStyle = color;
        this.ctx.beginPath();

        if (shape === 'circle') {
            this.ctx.arc(centerX, centerY, Math.max(2, Math.floor(pixelSize * 0.38)), 0, Math.PI * 2);
        } else if (shape === 'triangle') {
            this.ctx.moveTo(centerX, top + inset);
            this.ctx.lineTo(left + pixelSize - inset, top + pixelSize - inset);
            this.ctx.lineTo(left + inset, top + pixelSize - inset);
            this.ctx.closePath();
        } else {
            this.ctx.rect(left + inset, top + inset, pixelSize - inset * 2, pixelSize - inset * 2);
        }

        this.ctx.fill();
        if (crowned) {
            this.drawCrown(left, top, pixelSize);
        }
        this.ctx.restore();
    }

    drawCrown(left, top, pixelSize) {
        const crownWidth = Math.max(8, Math.round(pixelSize * 0.7));
        const crownHeight = Math.max(5, Math.round(pixelSize * 0.32));
        const crownLeft = Math.round(left + (pixelSize - crownWidth) / 2);
        const crownTop = Math.round(top - crownHeight * 0.55);
        const baseY = crownTop + crownHeight;

        this.ctx.fillStyle = '#f5c542';
        this.ctx.strokeStyle = '#333333';
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        this.ctx.moveTo(crownLeft, baseY);
        this.ctx.lineTo(crownLeft, crownTop + crownHeight * 0.38);
        this.ctx.lineTo(crownLeft + crownWidth * 0.25, crownTop);
        this.ctx.lineTo(crownLeft + crownWidth * 0.5, crownTop + crownHeight * 0.38);
        this.ctx.lineTo(crownLeft + crownWidth * 0.75, crownTop);
        this.ctx.lineTo(crownLeft + crownWidth, crownTop + crownHeight * 0.38);
        this.ctx.lineTo(crownLeft + crownWidth, baseY);
        this.ctx.closePath();
        this.ctx.fill();
        this.ctx.stroke();
    }

    setCookie(name, value, days) {
        const expires = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toUTCString();
        document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
    }

    getCookie(name) {
        return document.cookie
            .split('; ')
            .find(row => row.startsWith(`${name}=`))
            ?.split('=')[1] || '';
    }
}

let game = null;

window.addEventListener('DOMContentLoaded', async () => {
    setupColorPicker();
    
    try {
        await network.connect();
        game = new Game();
    } catch (error) {
        console.error('Failed to connect:', error);
        alert('Cannot connect to server');
    }
});

function setupColorPicker() {
    const colors = [
        '#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF',
        '#FF6600', '#FF0066', '#00FF66', '#0066FF', '#6600FF', '#66FF00',
        '#FF3333', '#33FF33', '#3333FF', '#FFCC00', '#FF00CC', '#00CCFF',
        '#FF9900', '#00FF99', '#9900FF'
    ];
    
    const colorGrid = document.getElementById('colorGrid');
    window.selectedColor = colors[0];
    
    colors.forEach(color => {
        const btn = document.createElement('button');
        btn.className = 'color-btn';
        btn.style.backgroundColor = color;
        btn.addEventListener('click', () => {
            document.querySelectorAll('.color-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            window.selectedColor = color;
            if (game && !game.gameRunning) {
                game.playerColor = color;
                game.updateChoices();
                game.render();
            }
        });
        
        if (color === colors[0]) btn.classList.add('active');
        colorGrid.appendChild(btn);
    });
}

// Maze generator (simple version without backend)
class Maze {
    constructor(size, shape) {
        this.size = size;
        this.shape = shape;
        this.grid = this.generateMaze();
        this.start = [1, 1];
        this.end = this.findEnd();
    }
    
    generateMaze() {
        const size = this.size;
        const maze = Array(size).fill(null).map(() => Array(size).fill(1));

        const stack = [[1, 1]];
        maze[1][1] = 0;

        while (stack.length > 0) {
            const [x, y] = stack[stack.length - 1];
            const dirs = [[0, -2], [2, 0], [0, 2], [-2, 0]];
            dirs.sort(() => Math.random() - 0.5);
            let carved = false;

            for (const [dx, dy] of dirs) {
                const nx = x + dx, ny = y + dy;
                if (nx > 0 && nx < size - 1 && ny > 0 && ny < size - 1 && maze[ny][nx] === 1) {
                    maze[y + dy / 2][x + dx / 2] = 0;
                    maze[ny][nx] = 0;
                    stack.push([nx, ny]);
                    carved = true;
                    break;
                }
            }

            if (!carved) stack.pop();
        }

        return maze;
    }

    findEnd() {
        for (let y = this.size - 2; y > 0; y--) {
            for (let x = this.size - 2; x > 0; x--) {
                if (this.grid[y][x] === 0) return [x, y];
            }
        }
        return this.start;
    }
}

const MazeSize = {
    SMALL: 21,
    MEDIUM: 31,
    LARGE: 41
};

window.mazeGenerator = { Maze, MazeSize };
