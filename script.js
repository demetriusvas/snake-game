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
        hard: 80     // Intervalo menor = mais rápido
    },
    SPEED_INCREASE: 5, // Diminui o intervalo em 5ms por comida (aumento de velocidade mais suave)
    POINTS_PER_LEVEL: {
        easy: 1,
        medium: 2,
        hard: 3
    },
    FOOD_TIMEOUT: 10000, // 9 segundos
    ENERGY_DURATION: 10000, // 9 segundos
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
            // Usar 'touchstart' para melhor responsividade em dispositivos de toque
            // e 'mousedown' para cliques com mouse (ex: testes no desktop).
            const handleControlPress = (e) => {
                // Previne o comportamento padrão do navegador (como zoom por toque, seleção de texto ou disparo de evento 'click' subsequente)
                e.preventDefault(); 
                // Usa e.currentTarget para garantir que estamos pegando o 'data-direction' do botão ao qual o listener foi anexado
                this.inputHandler.handleMobileInput(e.currentTarget.dataset.direction);
            };
            btn.addEventListener('touchstart', handleControlPress, { passive: false }); // passive: false é necessário para que preventDefault() funcione em touchstart
            btn.addEventListener('mousedown', handleControlPress); // Para interações com o mouse
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
        document.getElementById('new-record-display').classList.add('hidden'); // Esconder msg de recorde anterior
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
        // this.increaseSpeed(); // Velocidade não aumenta mais ao comer
        this.restoreEnergy();
        this.food.generate(this.snake.body, this.gridSize);
        this.resetFoodTimer();
        this.soundManager.playEat();
    }
/*
    increaseSpeed() {
        this.speed = Math.max(50, this.speed - GAME_CONFIG.SPEED_INCREASE);
        clearInterval(this.gameLoop);
        this.gameLoop = setInterval(() => this.update(), this.speed);
    }
*/
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
        const energyBarElement = document.getElementById('energy-bar');
        energyBarElement.style.width = `${this.energy}%`;
        energyBarElement.style.backgroundColor = this._getEnergyColor(this.energy);
    }

    togglePause() {
        // Salvar o tempo de início da energia antes de pausar para cálculo correto ao resumir
        if (this.gameState === 'playing') {
            this.pausedEnergyStartTime = Date.now() - ((100 - this.energy) / 100) * GAME_CONFIG.ENERGY_DURATION;
        }




        if (this.gameState === 'playing') {
            this.gameState = 'paused';
            clearInterval(this.gameLoop);
            clearInterval(this.energyTimer);
            clearTimeout(this.foodTimer);
            
            // Salvar estado da energia para continuar de onde parou
            // this.pausedEnergyTime = Date.now(); // Lógica antiga, substituída/complementada acima
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
        // Usar o tempo de início salvo para garantir a continuidade correta
        const startTime = this.pausedEnergyStartTime || (Date.now() - ((100 - this.energy) / 100) * GAME_CONFIG.ENERGY_DURATION);
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
        this.soundManager.playGameOver(); // Tocar som de Game Over
        clearTimeout(this.foodTimer);

        // Atualizar estatísticas finais
        document.getElementById('final-score').textContent = this.score;
        document.getElementById('final-level').textContent = this.getLevelName();
        document.getElementById('final-speed').textContent = `${(GAME_CONFIG.INITIAL_SPEED[this.currentLevel] / this.speed).toFixed(1)}x`;

        // Verificar se é um novo recorde
        if (this.recordsManager.isNewRecord(this.score)) {
            // Salvar recorde automaticamente com nome padrão
            const newRecordData = {
                name: 'Jogador', // Nome padrão para o recorde
                score: this.score,
                level: this.currentLevel,
                speed: (GAME_CONFIG.INITIAL_SPEED[this.currentLevel] / this.speed).toFixed(1),
                date: new Date().toLocaleString('pt-BR'),
            };
            this.recordsManager.addRecord(newRecordData);
            
            // Atrasar o som de novo recorde e as celebrações
            setTimeout(() => {
                this.soundManager.playNewRecord(); // Tocar som de novo recorde

                // Calcular e mostrar a posição do recorde
                const updatedRecords = this.recordsManager.getRecords();
                const newRecordRank = updatedRecords.findIndex(r => 
                    r.score === newRecordData.score && 
                    r.name === newRecordData.name && 
                    r.date === newRecordData.date // Garante que é o recorde exato que acabamos de adicionar
                ) + 1;

                if (newRecordRank > 0) {
                    const newRecordDisplay = document.getElementById('new-record-display');
                    newRecordDisplay.textContent = `🎉 Novo Recorde! Você ficou em #${newRecordRank}! 🎉`;
                    newRecordDisplay.classList.remove('hidden');
                }

                // Avisar com confetes
                if (typeof confetti === 'function') {
                    confetti({
                        particleCount: 150,
                        spread: 100,
                        origin: { y: 0.6 },
                        zIndex: 10000 
                    });
                }
            }, 1000); // 1000 milissegundos = 1 segundo de atraso
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
        document.getElementById('new-record-display').classList.add('hidden'); // Esconder msg de recorde
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

    _getEnergyColor(percentage) {
        // Hue vai de 0 (vermelho) a 120 (verde)
        const hue = (percentage / 100) * 120;
        return `hsl(${hue}, 100%, 50%)`; // Cores vibrantes com 100% de saturação
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

    // Método auxiliar para desenhar retângulos com cantos arredondados
    _drawRoundedRect(ctx, x, y, width, height, radius) {
        if (typeof radius === 'undefined') {
            radius = 5;
        }
        if (width < 2 * radius) radius = width / 2;
        if (height < 2 * radius) radius = height / 2;
        
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.arcTo(x + width, y, x + width, y + height, radius);
        ctx.arcTo(x + width, y + height, x, y + height, radius);
        ctx.arcTo(x, y + height, x, y, radius);
        ctx.arcTo(x, y, x + width, y, radius);
        ctx.closePath();
        ctx.fill();
    }

    draw(ctx, gridSize) {
        const snakeColor = getComputedStyle(document.documentElement).getPropertyValue('--snake-color');
        const cornerRadius = gridSize * 0.2; // Raio para os cantos arredondados

        this.body.forEach((segment, index) => {
            const segX = segment.x * gridSize;
            const segY = segment.y * gridSize;
            const segSize = gridSize;

            // Deixar um pequeno espaço para a grade
            const itemPadding = 1; 
            const itemX = segX + itemPadding;
            const itemY = segY + itemPadding;
            const itemSize = segSize - (itemPadding * 2);

            ctx.fillStyle = index === 0 ? snakeColor : snakeColor + '80';
            this._drawRoundedRect(ctx, itemX, itemY, itemSize, itemSize, cornerRadius);

            // Adicionar brilho na cabeça
            if (index === 0) {
                const shinePadding = itemPadding + gridSize * 0.1;
                const shineX = segX + shinePadding;
                const shineY = segY + shinePadding;
                const shineSize = segSize - (shinePadding * 2);
                const shineRadius = shineSize * 0.2;

                ctx.fillStyle = snakeColor + '40';
                this._drawRoundedRect(ctx, shineX, shineY, shineSize, shineSize, shineRadius);
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

    // Método auxiliar para desenhar retângulos com cantos arredondados
    _drawRoundedRect(ctx, x, y, width, height, radius) {
        if (typeof radius === 'undefined') {
            radius = 5;
        }
        if (width < 2 * radius) radius = width / 2;
        if (height < 2 * radius) radius = height / 2;

        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.arcTo(x + width, y, x + width, y + height, radius);
        ctx.arcTo(x + width, y + height, x, y + height, radius);
        ctx.arcTo(x, y + height, x, y, radius);
        ctx.arcTo(x, y, x + width, y, radius);
        ctx.closePath();
        ctx.fill();
    }

    draw(ctx, gridSize) {
        const foodColor = getComputedStyle(document.documentElement).getPropertyValue('--food-color');
        const foodBaseX = this.x * gridSize;
        const foodBaseY = this.y * gridSize;
        
        // Desenhar comida com efeito pulsante
        const time = Date.now() * 0.005;
        const pulseFactor = Math.sin(time) * 0.1 + 0.9; // Fator de pulsação (0.9 a 1.0)
        
        // Tamanho do item, considerando um pequeno padding para a grade e a pulsação
        const maxItemSize = gridSize - 2; 
        const currentItemSize = maxItemSize * pulseFactor;
        const itemOffset = (gridSize - currentItemSize) / 2; // Centraliza o item pulsante na célula

        const itemX = foodBaseX + itemOffset;
        const itemY = foodBaseY + itemOffset;
        const cornerRadius = currentItemSize * 0.25; // Raio proporcional ao tamanho atual

        ctx.fillStyle = foodColor;
        this._drawRoundedRect(ctx, itemX, itemY, currentItemSize, currentItemSize, cornerRadius);

        // Adicionar brilho
        const shineSize = currentItemSize * 0.6; // Brilho um pouco menor
        const shineOffset = (currentItemSize - shineSize) / 2; // Centraliza o brilho
        ctx.fillStyle = foodColor + '80'; // Um pouco mais opaco para o brilho
        this._drawRoundedRect(ctx, itemX + shineOffset, itemY + shineOffset, shineSize, shineSize, shineSize * 0.25);
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
        this.newRecordSound = document.getElementById('new-record-sound'); // Adicionado para consistência com melhorias anteriores
        this.gameOverSound = document.getElementById('game-over-sound');
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

    // Adicionado para consistência com melhorias anteriores, caso sejam aplicadas
    playNewRecord() { 
        if (this.enabled && this.newRecordSound) {
            this.newRecordSound.currentTime = 0;
            this.newRecordSound.play().catch(() => {});
        }
    }

    playGameOver() {
        if (this.enabled && this.gameOverSound) {
            this.gameOverSound.currentTime = 0;
            this.gameOverSound.play().catch(() => {});
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
