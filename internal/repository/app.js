const API_URL = 'http://localhost:8080/api';

// --- Инициализация при загрузке страницы ---
document.addEventListener('DOMContentLoaded', () => {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js').catch(err => console.error("Service Worker registration failed:", err));
    }
    route();
});

// --- Роутинг ---
function route() {
    const path = window.location.pathname;
    const token = localStorage.getItem('token');

    if (path.includes('login.html') || path === '/') {
        // Если есть токен, перенаправляем на главную, иначе показываем логин
        if (token) {
            window.location.href = '/index.html';
        } else {
            initLoginPage();
        }
    } else {
        if (!token) {
            window.location.href = '/login.html';
            return;
        }
        if (path.includes('index.html')) {
            initTasksPage();
        } else if (path.includes('wallet.html')) {
            initWalletPage();
        } else if (path.includes('settings.html')) {
            initSettingsPage();
        }
    }
}

// --- Утилиты ---
function getUser() {
    return JSON.parse(localStorage.getItem('user'));
}

function getToken() {
    return localStorage.getItem('token');
}

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login.html';
}

async function apiFetch(endpoint, options = {}) {
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers,
    };
    const token = getToken();
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    try {
        const response = await fetch(`${API_URL}${endpoint}`, { ...options, headers });
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || `HTTP error! status: ${response.status}`);
        }
        return data;
    } catch (error) {
        console.error(`API Fetch Error (${endpoint}):`, error);
        throw error;
    }
}

// --- Страница входа/регистрации ---
function initLoginPage() {
    const form = document.getElementById('auth-form');
    const toggleLink = document.getElementById('toggle-link');
    const formTitle = document.getElementById('form-title');
    const toggleText = document.getElementById('toggle-text');
    const submitBtn = document.getElementById('submit-btn');
    const roleSelection = document.getElementById('role-selection');
    const roleButtons = document.querySelectorAll('.role-btn');
    const roleInput = document.getElementById('role');

    let isLogin = true;

    toggleLink.addEventListener('click', (e) => {
        e.preventDefault();
        isLogin = !isLogin;
        formTitle.textContent = isLogin ? 'Вход в аккаунт' : 'Создание аккаунта';
        submitBtn.textContent = isLogin ? 'Войти' : 'Зарегистрироваться';
        toggleText.textContent = isLogin ? 'Нет аккаунта?' : 'Уже есть аккаунт?';
        toggleLink.textContent = isLogin ? 'Регистрация' : 'Войти';
        roleSelection.classList.toggle('hidden', isLogin);
    });

    roleButtons.forEach(button => {
        button.addEventListener('click', () => {
            roleButtons.forEach(btn => btn.classList.remove('selected'));
            button.classList.add('selected');
            roleInput.value = button.dataset.role;
        });
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = e.target.username.value;
        const password = e.target.password.value;

        try {
            if (isLogin) {
                const data = await apiFetch('/login', {
                    method: 'POST',
                    body: JSON.stringify({ username, password }),
                });
                localStorage.setItem('token', data.token);
                localStorage.setItem('user', JSON.stringify(data));
                window.location.href = '/index.html';
            } else {
                if (!roleInput.value) {
                    alert('Пожалуйста, выберите вашу роль.');
                    return;
                }
                await apiFetch('/register', {
                    method: 'POST',
                    body: JSON.stringify({ username, password, role: roleInput.value }),
                });
                alert('Регистрация прошла успешно! Теперь вы можете войти.');
                toggleLink.click(); // Переключаем обратно на логин
            }
        } catch (error) {
            alert(`Ошибка: ${error.message}`);
        }
    });
}

// --- Страница заданий ---
async function initTasksPage() {
    const user = getUser();
    if (!user) return;

    document.getElementById('username-display').textContent = user.username;
    loadBalance();

    const addTaskBtn = document.getElementById('add-task-btn');
    const taskModal = document.getElementById('task-modal');
    const taskForm = document.getElementById('task-form');
    const cancelTaskBtn = document.getElementById('cancel-task-btn');

    if (user.role === 'parent') {
        addTaskBtn.classList.remove('hidden');
        addTaskBtn.addEventListener('click', openTaskModal);
        cancelTaskBtn.addEventListener('click', closeTaskModal);
        taskForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const title = document.getElementById('task-title').value;
            const amount = parseFloat(document.getElementById('task-amount').value);
            const type = document.getElementById('task-type').value;
            createTask(title, amount, type);
        });
    } 

    loadTasks();
}

async function loadTasks() {
    const tasksContainer = document.getElementById('tasks-container');
    const user = getUser();
    try {
        console.log('Загрузка заданий...');
        const tasks = await apiFetch('/tasks');
        tasksContainer.innerHTML = '';
        const activeTasks = tasks.filter(t => t.is_active);

        if (activeTasks.length > 0) {
            activeTasks.forEach(task => {
                const taskCard = document.createElement('div');
                taskCard.className = 'task-card';
                taskCard.id = `task-${task.id}`;
                const isReward = task.type === 'reward' || task.amount >= 0;
                const amountColor = isReward ? 'text-success' : 'text-warning';
                const amountSign = isReward ? '+' : '';

                taskCard.innerHTML = `
                    <div class="flex items-center space-x-3">
                        <span class="text-2xl">📝</span>
                        <div>
                            <h3 class="font-bold">${task.title}</h3>
                            <p class="text-gray-500 text-sm">${task.description || ' '}</p>
                        </div>
                    </div>
                    <div class="text-right">
                        <p class="font-bold text-lg ${amountColor}">${amountSign}${task.amount} ₽</p>
                        ${user.role === 'child' ? 
                            `<button class="btn btn-complete mt-1" data-task-id="${task.id}">✓ Выполнить</button>` :
                            `<button class="text-red-500 text-xs font-semibold mt-1" onclick="deleteTask(${task.id})">Удалить</button>`
                        }
                    </div>
                `;
                tasksContainer.appendChild(taskCard);
            });
            document.querySelectorAll('.btn-complete').forEach(b => b.addEventListener('click', completeTask));
        } else {
            tasksContainer.innerHTML = '<p class="text-gray-500 text-center py-8">Нет доступных заданий. Ура!</p>';
        }
    } catch (error) {
        console.error('Ошибка при загрузке заданий:', error);
        tasksContainer.innerHTML = `<div class="text-center py-8 text-red-500">
            <p>Не удалось загрузить задания.</p><p class="text-sm">${error.message}</p>
            </div>`;
    }
}

async function completeTask(e) {
    const taskId = e.target.dataset.taskId;
    if (!confirm('Вы уверены, что выполнили это задание?')) return;

    try {
        const result = await apiFetch(`/tasks/complete/${taskId}`, { method: 'POST' });
        alert(`Задание выполнено! +${result.amount_added} ₽`);

        const card = document.getElementById(`task-${taskId}`);
        card.classList.add('task-completed-animation');
        card.addEventListener('animationend', () => {
            card.remove();
            loadBalance();
            if (document.getElementById('tasks-container').children.length <= 1) { // Учитываем p если он есть
                document.getElementById('tasks-container').innerHTML = '<p class="text-gray-500 text-center">Нет доступных заданий. Ура!</p>';
            }
        });
    } catch (error) {
        alert(`Ошибка: ${error.message}`);
    }
}

async function loadBalance() {
    try {
        const data = await apiFetch('/balance');
        const user = getUser();
        user.balance = data.balance;
        localStorage.setItem('user', JSON.stringify(user));
        
        const balanceDisplay = document.getElementById('balance-display');
        if (balanceDisplay) {
            balanceDisplay.textContent = `💰 ${data.balance.toFixed(2)} ₽`;
        }
        const walletBalance = document.getElementById('wallet-balance');
        if (walletBalance) {
            walletBalance.textContent = `${data.balance.toFixed(2)} ₽`;
        }
    } catch (error) {
        console.error('Ошибка обновления баланса:', error);
    }
}

// --- Страница кошелька ---
async function initWalletPage() {
    const user = getUser();
    if (!user) return;

    loadBalance();

    const historyContainer = document.getElementById('transactions-history');
    try {
        const transactions = await apiFetch(`/transactions?user_id=${user.user_id}`);
        historyContainer.innerHTML = '';
        if (transactions && transactions.length > 0) {
            transactions.forEach(tx => {
                const isIncome = tx.type === 'income';
                const txCard = document.createElement('div');
                txCard.className = 'transaction-card';
                txCard.innerHTML = `
                    <div class="flex items-center space-x-4">
                        <span class="text-2xl">${isIncome ? '🎉' : '🛍️'}</span>
                        <div>
                            <p class="font-bold">${tx.description}</p>
                            <p class="text-sm text-gray-500">${new Date(tx.created_at).toLocaleString('ru-RU')}</p>
                        </div>
                    </div>
                    <p class="font-bold text-lg ${isIncome ? 'text-success' : 'text-warning'}">
                        ${isIncome ? '+' : '-'}${tx.amount.toFixed(2)} ₽
                    </p>
                `;
                historyContainer.appendChild(txCard);
            });
        } else {
            historyContainer.innerHTML = '<p class="text-gray-500 text-center py-8">История операций пуста.</p>';
        }
    } catch (error) {
        console.error('Ошибка загрузки транзакций:', error);
        historyContainer.innerHTML = `<div class="text-center py-8 text-red-500">
            <p>Не удалось загрузить историю.</p><p class="text-sm">${error.message}</p>
            </div>`;
    }

    document.getElementById('purchase-btn').addEventListener('click', () => {
        const amount = prompt("На какую сумму покупка?");
        const description = prompt("Что вы купили?");
        if (amount && description && !isNaN(parseFloat(amount))) {
            makePurchase(parseFloat(amount), description);
        } else if (amount || description) {
            alert("Пожалуйста, введите корректные данные.");
        }
    });
}

async function makePurchase(amount, description) {
    try {
        const result = await apiFetch('/purchase', {
            method: 'POST',
            body: JSON.stringify({ amount, description }),
        });
        alert(`Покупка совершена! Новый баланс: ${result.new_balance.toFixed(2)} ₽`);
        location.reload(); // Перезагружаем страницу для обновления истории и баланса
    } catch (error) {
        alert(`Ошибка: ${error.message}`);
    }
}

// --- Управление задачами (для родителей) ---

function openTaskModal() {
    document.getElementById('task-modal').classList.remove('hidden');
}

function closeTaskModal() {
    document.getElementById('task-modal').classList.add('hidden');
    document.getElementById('task-form').reset();
}

async function createTask(title, amount, type) {
    // Для удержаний сумма должна быть отрицательной
    const finalAmount = type === 'deduction' ? -Math.abs(amount) : Math.abs(amount);

    try {
        await apiFetch('/tasks', {
            method: 'POST',
            body: JSON.stringify({ title, description: `Тип: ${type}`, amount: finalAmount, type }),
        });
        alert('✅ Задание успешно создано!');
        closeTaskModal();
        loadTasks(); // Обновляем список заданий
    } catch (error) {
        console.error('Ошибка создания задания:', error);
        alert(`❌ Ошибка создания задания: ${error.message}`);
    }
}

async function deleteTask(taskId) {
    if (!confirm('Вы уверены, что хотите удалить это задание?')) return;

    try {
        await apiFetch(`/tasks/${taskId}`, { method: 'DELETE' });
        alert('🗑️ Задание удалено.');
        const taskCard = document.getElementById(`task-${taskId}`);
        if (taskCard) {
            taskCard.remove();
        }
    } catch (error) {
        console.error('Ошибка удаления задания:', error);
        alert(`❌ Ошибка удаления задания: ${error.message}`);
    }
}

// --- Страница настроек ---
function initSettingsPage() {
    const user = getUser();
    if (!user || user.role !== 'parent') {
        alert('Доступ запрещен.');
        window.location.href = '/index.html';
        return;
    }
    // Логика для загрузки и сохранения настроек будет здесь
    document.getElementById('save-settings-btn').addEventListener('click', () => {
        alert('Функционал сохранения настроек в разработке.');
    });
}