/**
 * Snake Game - Jogo da Cobrinha
 * Implementação completa em JavaScript ES6
 */

// ===== CONFIGURAÇÕES DO JOGO =====
const GAME_CONFIG = {
    CANVAS_SIZE: 600,
    GRID_SIZE: 20,
    INITIAL_SPEED: {
        easy: 200,   // Intervalo maior = mais lento
        medium: 100, // Intervalo médio
        hard: 60     // Intervalo menor = mais rápido
    },
    SPEED_INCREASE: 10, // 0.05s = 50ms
    POINTS_PER_LEVEL: {
        easy: 1,
        medium: 2,
        hard: 3
    },
    FOOD_TIMEOUT: 9000, // 9 segundos
    ENERGY_DURATION: 9000, // 9 segundos
    INITIAL_LIVES: 3
};

// ===== CLASSE PRINCIPAL DO JOGO =====
class SnakeGame {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.currentScreen = 'menu';
        this.gameState = 'stopped'; // stopped, playing, paused, gameover
        this.currentLevel = 'easy';
        this.score = 0;
        this.lives = GAME_CONFIG.INITIAL_LIVES;
        this.speed = GAME_CONFIG.INITIAL_SPEED.easy;
        this.energy = 100;
        this.energyTimer = null;
        this.foodTimer = null;
        this.gameLoop = null;
        
        // Inicializar componentes
        this.snake = new Snake();
        this.food = new Food();
        this.inputHandler = new InputHandler(this);
        this.soundManager = new SoundManager();
        this.recordsManager = new RecordsManager();
        this.themeManager = new ThemeManager();
        
        this.init();
    }

    init() {
        this.setupCanvas();
        this.bindEvents();
        this.showScreen('menu');
        this.updateHUD();
    }

    setupCanvas() {
        const size = Math.min(window.innerWidth * 0.9, window.innerHeight * 0.6, GAME_CONFIG.CANVAS_SIZE);
        this.canvas.width = size;
        this.canvas.height = size;
        this.gridSize = size / (GAME_CONFIG.CANVAS_SIZE / GAME_CONFIG.GRID_SIZE);
    }

    bindEvents() {
        // Botões do menu
        document.querySelectorAll('[data-level]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.startGame(e.target.dataset.level);
            });
        });

        // Botões de controle
        document.getElementById('pause-btn').addEventListener('click', () => this.togglePause());
        document.getElementById('menu-btn').addEventListener('click', () => this.showMenu());
        document.getElementById('restart-btn').addEventListener('click', () => this.restartGame());
        document.getElementById('main-menu-btn').addEventListener('click', () => this.showMenu());
        document.getElementById('resume-btn').addEventListener('click', () => this.togglePause());
        document.getElementById('pause-menu-btn').addEventListener('click', () => this.showMenu());

        // Recordes
        document.getElementById('records-btn').addEventListener('click', () => this.showRecords());
        document.getElementById('view-records-btn').addEventListener('click', () => this.showRecords());
        document.getElementById('back-to-menu-btn').addEventListener('click', () => this.showMenu());
        document.getElementById('clear-records-btn').addEventListener('click', () => this.clearRecords());

        // Controles mobile
        document.querySelectorAll('.control-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.inputHandler.handleMobileInput(e.target.dataset.direction);
            });
        });

        // Redimensionamento
        window.addEventListener('resize', () => this.setupCanvas());
    }

    startGame(level) {
        this.currentLevel = level;
        this.score = 0;
        this.lives = GAME_CONFIG.INITIAL_LIVES;
        this.speed = GAME_CONFIG.INITIAL_SPEED[level];
        this.energy = 100;
        this.gameState = 'playing';
        
        this.snake.reset();
        this.food.generate(this.snake.body, this.gridSize);
        this.startEnergyTimer();
        this.startFoodTimer();
        this.showScreen('game');
        this.updateHUD();
        this.gameLoop = setInterval(() => this.update(), this.speed);
    }

    update() {
        if (this.gameState !== 'playing') return;

        this.snake.move();
        
        // Verificar colisões
        if (this.checkCollisions()) {
            this.handleCollision();
            return;
        }

        // Verificar se comeu a comida
        if (this.snake.head.x === this.food.x && this.snake.head.y === this.food.y) {
            this.eatFood();
        }

        this.draw();
        this.updateHUD();
    }

    checkCollisions() {
        const head = this.snake.head;
        const gridCount = GAME_CONFIG.CANVAS_SIZE / GAME_CONFIG.GRID_SIZE;

        // Colisão com paredes
        if (head.x < 0 || head.x >= gridCount || head.y < 0 || head.y >= gridCount) {
            return true;
        }

        // Colisão com o próprio corpo
        for (let i = 1; i < this.snake.body.length; i++) {
            if (head.x === this.snake.body[i].x && head.y === this.snake.body[i].y) {
                return true;
            }
        }

        return false;
    }

    handleCollision() {
        this.loseLife();
    }

    eatFood() {
        this.snake.grow();
        this.score += GAME_CONFIG.POINTS_PER_LEVEL[this.currentLevel];
        this.increaseSpeed();
        this.restoreEnergy();
        this.food.generate(this.snake.body, this.gridSize);
        this.resetFoodTimer();
        this.soundManager.playEat();
    }

    increaseSpeed() {
        this.speed = Math.max(50, this.speed - GAME_CONFIG.SPEED_INCREASE);
        clearInterval(this.gameLoop);
        this.gameLoop = setInterval(() => this.update(), this.speed);
    }

    loseLife() {
        this.lives--;
        this.soundManager.playLifeLost();
        this.updateHUD();

        if (this.lives <= 0) {
            this.gameOver();
        } else {
            // Resetar posição da cobra
            this.snake.reset();
            this.restoreEnergy();
        }
    }

    restoreEnergy() {
        this.energy = 100;
        this.startEnergyTimer();
    }

    startEnergyTimer() {
        clearInterval(this.energyTimer);
        const startTime = Date.now();
        let lowEnergySoundPlayed = false;
        
        this.energyTimer = setInterval(() => {
            const elapsed = Date.now() - startTime;
            this.energy = Math.max(0, 100 - (elapsed / GAME_CONFIG.ENERGY_DURATION) * 100);
            
            if (this.energy <= 20) {
                document.getElementById('energy-bar').classList.add('low');
                if (this.energy <= 10 && this.energy > 0 && !lowEnergySoundPlayed) {
                    this.soundManager.playEnergyLow();
                    lowEnergySoundPlayed = true;
                }
            } else {
                document.getElementById('energy-bar').classList.remove('low');
                lowEnergySoundPlayed = false;
            }
            
            if (this.energy <= 0) {
                clearInterval(this.energyTimer);
                this.loseLife();
            }
        }, 100);
    }

    startFoodTimer() {
        clearTimeout(this.foodTimer);
        this.foodTimer = setTimeout(() => {
            this.food.generate(this.snake.body, this.gridSize);
            this.startFoodTimer();
        }, GAME_CONFIG.FOOD_TIMEOUT);
    }

    resetFoodTimer() {
        clearTimeout(this.foodTimer);
        this.startFoodTimer();
    }

    draw() {
        // Limpar canvas
        this.ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--game-bg');
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Desenhar grade
        this.drawGrid();

        // Desenhar comida
        this.food.draw(this.ctx, this.gridSize);

        // Desenhar cobra
        this.snake.draw(this.ctx, this.gridSize);
    }

    drawGrid() {
        this.ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--grid-color');
        this.ctx.lineWidth = 1;

        for (let i = 0; i <= this.canvas.width; i += this.gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(i, 0);
            this.ctx.lineTo(i, this.canvas.height);
            this.ctx.stroke();
        }

        for (let i = 0; i <= this.canvas.height; i += this.gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, i);
            this.ctx.lineTo(this.canvas.width, i);
            this.ctx.stroke();
        }
    }

    updateHUD() {
        document.getElementById('score').textContent = this.score;
        document.getElementById('speed').textContent = `${(GAME_CONFIG.INITIAL_SPEED[this.currentLevel] / this.speed).toFixed(1)}x`;
        
        // Atualizar vidas
        const hearts = document.querySelectorAll('.heart');
        hearts.forEach((heart, index) => {
            heart.classList.toggle('lost', index >= this.lives);
        });

        // Atualizar barra de energia
        document.getElementById('energy-bar').style.width = `${this.energy}%`;
    }

    togglePause() {
        if (this.gameState === 'playing') {
            this.gameState = 'paused';
            clearInterval(this.gameLoop);
            clearInterval(this.energyTimer);
            clearTimeout(this.foodTimer);
            
            // Salvar estado da energia para continuar de onde parou
            this.pausedEnergyTime = Date.now();
            this.showScreen('pause');
        } else if (this.gameState === 'paused') {
            this.gameState = 'playing';
            this.gameLoop = setInterval(() => this.update(), this.speed);
            
            // Restaurar timer de energia considerando o tempo pausado
            this.resumeEnergyTimer();
            this.startFoodTimer();
            this.showScreen('game');
        }
    }

    resumeEnergyTimer() {
        clearInterval(this.energyTimer);
        const remainingTime = (this.energy / 100) * GAME_CONFIG.ENERGY_DURATION;
        const startTime = Date.now() - (GAME_CONFIG.ENERGY_DURATION - remainingTime);
        let lowEnergySoundPlayed = this.energy <= 10;
        
        this.energyTimer = setInterval(() => {
            const elapsed = Date.now() - startTime;
            this.energy = Math.max(0, 100 - (elapsed / GAME_CONFIG.ENERGY_DURATION) * 100);
            
            if (this.energy <= 20) {
                document.getElementById('energy-bar').classList.add('low');
                if (this.energy <= 10 && this.energy > 0 && !lowEnergySoundPlayed) {
                    this.soundManager.playEnergyLow();
                    lowEnergySoundPlayed = true;
                }
            } else {
                document.getElementById('energy-bar').classList.remove('low');
                lowEnergySoundPlayed = false;
            }
            
            if (this.energy <= 0) {
                clearInterval(this.energyTimer);
                this.loseLife();
            }
        }, 100);
    }

    gameOver() {
        this.gameState = 'gameover';
        clearInterval(this.gameLoop);
        clearInterval(this.energyTimer);
        clearTimeout(this.foodTimer);

        // Atualizar estatísticas finais
        document.getElementById('final-score').textContent = this.score;
        document.getElementById('final-level').textContent = this.getLevelName();
        document.getElementById('final-speed').textContent = `${(GAME_CONFIG.INITIAL_SPEED[this.currentLevel] / this.speed).toFixed(1)}x`;

        // Verificar se é um novo recorde
        if (this.recordsManager.isNewRecord(this.score)) {
            // Salvar recorde automaticamente com nome padrão
            const playerName = 'Jogador'; // Nome padrão para o recorde
            this.recordsManager.addRecord({
                name: playerName,
                score: this.score,
                level: this.currentLevel,
                speed: (GAME_CONFIG.INITIAL_SPEED[this.currentLevel] / this.speed).toFixed(1),
                date: new Date().toLocaleString('pt-BR')
            });
            // Opcional: Adicionar uma pequena notificação visual ou sonora de que o recorde foi salvo.
            // Por enquanto, ele será salvo silenciosamente.
        }

        this.showScreen('gameover');
    }

    restartGame() {
        this.startGame(this.currentLevel);
    }

    showMenu() {
        this.gameState = 'stopped';
        clearInterval(this.gameLoop);
        clearInterval(this.energyTimer);
        clearTimeout(this.foodTimer);
        this.showScreen('menu');
    }

    showRecords() {
        this.recordsManager.displayRecords();
        this.showScreen('records');
    }

    clearRecords() {
        if (confirm('Tem certeza que deseja limpar todos os recordes?')) {
            this.recordsManager.clearRecords();
            this.recordsManager.displayRecords();
        }
    }

    showScreen(screenName) {
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
        });
        document.getElementById(`${screenName}-screen`).classList.add('active');
        this.currentScreen = screenName;
    }

    getLevelName() {
        const names = { easy: 'Fácil', medium: 'Médio', hard: 'Difícil' };
        return names[this.currentLevel];
    }
}

// ===== CLASSE DA COBRA =====
class Snake {
    constructor() {
        this.reset();
    }

    reset() {
        const center = Math.floor((GAME_CONFIG.CANVAS_SIZE / GAME_CONFIG.GRID_SIZE) / 2);
        this.body = [
            { x: center, y: center },
            { x: center - 1, y: center },
            { x: center - 2, y: center }
        ];
        this.direction = { x: 1, y: 0 };
        this.nextDirection = { x: 1, y: 0 };
    }

    get head() {
        return this.body[0];
    }

    move() {
        // Atualizar direção (evita giros de 180°)
        if (this.nextDirection.x !== -this.direction.x || this.nextDirection.y !== -this.direction.y) {
            this.direction = { ...this.nextDirection };
        }

        // Mover cabeça
        const head = {
            x: this.head.x + this.direction.x,
            y: this.head.y + this.direction.y
        };

        this.body.unshift(head);
        this.body.pop();
    }

    grow() {
        const tail = this.body[this.body.length - 1];
        this.body.push({ ...tail });
    }

    changeDirection(newDirection) {
        // Evitar giros de 180°
        if (newDirection.x !== -this.direction.x || newDirection.y !== -this.direction.y) {
            this.nextDirection = newDirection;
        }
    }

    draw(ctx, gridSize) {
        const snakeColor = getComputedStyle(document.documentElement).getPropertyValue('--snake-color');
        
        this.body.forEach((segment, index) => {
            ctx.fillStyle = index === 0 ? snakeColor : snakeColor + '80';
            ctx.fillRect(
                segment.x * gridSize + 1,
                segment.y * gridSize + 1,
                gridSize - 2,
                gridSize - 2
            );

            // Adicionar brilho na cabeça
            if (index === 0) {
                ctx.fillStyle = snakeColor + '40';
                ctx.fillRect(
                    segment.x * gridSize + 3,
                    segment.y * gridSize + 3,
                    gridSize - 6,
                    gridSize - 6
                );
            }
        });
    }
}

// ===== CLASSE DA COMIDA =====
class Food {
    constructor() {
        this.x = 0;
        this.y = 0;
    }

    generate(snakeBody, gridSize) {
        const gridCount = GAME_CONFIG.CANVAS_SIZE / GAME_CONFIG.GRID_SIZE;
        let validPosition = false;

        while (!validPosition) {
            this.x = Math.floor(Math.random() * gridCount);
            this.y = Math.floor(Math.random() * gridCount);

            // Verificar se não está sobre a cobra
            validPosition = !snakeBody.some(segment => 
                segment.x === this.x && segment.y === this.y
            );
        }
    }

    draw(ctx, gridSize) {
        const foodColor = getComputedStyle(document.documentElement).getPropertyValue('--food-color');
        
        // Desenhar comida com efeito pulsante
        const time = Date.now() * 0.005;
        const pulse = Math.sin(time) * 0.1 + 0.9;
        const size = gridSize * pulse;
        const offset = (gridSize - size) / 2;

        ctx.fillStyle = foodColor;
        ctx.fillRect(
            this.x * gridSize + offset,
            this.y * gridSize + offset,
            size,
            size
        );

        // Adicionar brilho
        ctx.fillStyle = foodColor + '60';
        ctx.fillRect(
            this.x * gridSize + offset + 2,
            this.y * gridSize + offset + 2,
            size - 4,
            size - 4
        );
    }
}

// ===== CLASSE DE CONTROLES =====
class InputHandler {
    constructor(game) {
        this.game = game;
        this.bindKeyboard();
    }

    bindKeyboard() {
        document.addEventListener('keydown', (e) => {
            if (this.game.gameState !== 'playing') return;

            const directions = {
                'ArrowUp': { x: 0, y: -1 },
                'ArrowDown': { x: 0, y: 1 },
                'ArrowLeft': { x: -1, y: 0 },
                'ArrowRight': { x: 1, y: 0 },
                'KeyW': { x: 0, y: -1 },
                'KeyS': { x: 0, y: 1 },
                'KeyA': { x: -1, y: 0 },
                'KeyD': { x: 1, y: 0 }
            };

            if (directions[e.code]) {
                e.preventDefault();
                this.game.snake.changeDirection(directions[e.code]);
            }

            // Pausar com espaço
            if (e.code === 'Space') {
                e.preventDefault();
                this.game.togglePause();
            }
        });
    }

    handleMobileInput(direction) {
        if (this.game.gameState !== 'playing') return;

        const directions = {
            'up': { x: 0, y: -1 },
            'down': { x: 0, y: 1 },
            'left': { x: -1, y: 0 },
            'right': { x: 1, y: 0 }
        };

        if (directions[direction]) {
            this.game.snake.changeDirection(directions[direction]);
        }
    }
}

// ===== CLASSE DE SONS =====
class SoundManager {
    constructor() {
        this.eatSound = document.getElementById('eat-sound');
        this.energyLowSound = document.getElementById('energy-low-sound');
        this.lifeLostSound = document.getElementById('life-lost-sound');
        this.enabled = true;
    }

    playEat() {
        if (this.enabled) {
            this.eatSound.currentTime = 0;
            this.eatSound.play().catch(() => {});
        }
    }

    playEnergyLow() {
        if (this.enabled) {
            this.energyLowSound.currentTime = 0;
            this.energyLowSound.play().catch(() => {});
        }
    }

    playLifeLost() {
        if (this.enabled) {
            this.lifeLostSound.currentTime = 0;
            this.lifeLostSound.play().catch(() => {});
        }
    }
}

// ===== CLASSE DE RECORDES =====
class RecordsManager {
    constructor() {
        this.storageKey = 'snake-game-records';
        this.maxRecords = 10;
    }

    getRecords() {
        try {
            return JSON.parse(localStorage.getItem(this.storageKey)) || [];
        } catch {
            return [];
        }
    }

    addRecord(record) {
        const records = this.getRecords();
        records.push(record);
        records.sort((a, b) => b.score - a.score);
        records.splice(this.maxRecords);
        localStorage.setItem(this.storageKey, JSON.stringify(records));
    }

    isNewRecord(score) {
        const records = this.getRecords();
        return records.length < this.maxRecords || score > records[records.length - 1]?.score || 0;
    }

    clearRecords() {
        localStorage.removeItem(this.storageKey);
    }

    displayRecords() {
        const records = this.getRecords();
        const container = document.getElementById('records-list');
        
        if (records.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: var(--text-secondary);">Nenhum recorde ainda. Jogue para criar o primeiro!</p>';
            return;
        }

        container.innerHTML = records.map((record, index) => `
            <div class="record-item">
                <div class="record-rank">#${index + 1}</div>
                <div class="record-info">
                    <div class="record-name">${record.name}</div>
                    <div class="record-details">${this.getLevelName(record.level)} • ${record.speed}x • ${record.date}</div>
                </div>
                <div class="record-score">${record.score}</div>
            </div>
        `).join('');
    }

    getLevelName(level) {
        const names = { easy: 'Fácil', medium: 'Médio', hard: 'Difícil' };
        return names[level];
    }
}

// ===== CLASSE DE GERENCIAMENTO DE TEMA =====
class ThemeManager {
    constructor() {
        this.currentTheme = localStorage.getItem('snake-game-theme') || 'light';
        this.applyTheme();
        this.bindEvents();
    }

    bindEvents() {
        document.querySelectorAll('.theme-btn').forEach(btn => {
            btn.addEventListener('click', () => this.toggleTheme());
        });
    }

    toggleTheme() {
        this.currentTheme = this.currentTheme === 'light' ? 'dark' : 'light';
        this.applyTheme();
        localStorage.setItem('snake-game-theme', this.currentTheme);
    }

    applyTheme() {
        document.documentElement.setAttribute('data-theme', this.currentTheme);
        document.querySelectorAll('.theme-btn').forEach(btn => {
            btn.textContent = this.currentTheme === 'light' ? '🌙' : '☀️';
        });
    }
}

// ===== INICIALIZAÇÃO =====
document.addEventListener('DOMContentLoaded', () => {
    new SnakeGame();
});
