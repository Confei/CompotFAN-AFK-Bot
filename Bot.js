const mineflayer = require('mineflayer');
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder');

// --- НАСТРОЙКИ БОТА (ТОЛЬКО ЭТО МОЖНО МЕНЯТЬ) ---
const botOptions = {
    host: 'CompotFAN.aternos.me', // АДРЕС ТВОЕГО СЕРВЕРА
    port: 19212,                  // ПОРТ ТВОЕГО СЕРВЕРА
    username: 'CompotAFK',        // НИК БОТА В ИГРЕ
    version: '1.21.11'            // ВЕРСИЯ ТВОЕГО СЕРВЕРА MINECRAFT
};
// --- КОНЕЦ НАСТРОЕК ---

let bot;
let activityInterval; // Переменная для сохранения нашего цикла активности

function createBot() {
    // Останавливаем старый цикл, если он был, чтобы не создавать дубли
    if (activityInterval) {
        clearInterval(activityInterval);
        activityInterval = null;
    }

    bot = mineflayer.createBot(botOptions);
    bot.loadPlugin(pathfinder);

    bot.on('spawn', () => {
        console.log('Бот CompotAFK успешно зашел на сервер!');
        
        // Ждем 5 секунд после захода, чтобы мир вокруг бота прогрузился
        // Только после этого начинаем проверять день/ночь
        setTimeout(() => {
            if (activityInterval) clearInterval(activityInterval); // Убеждаемся, что старый интервал остановлен
            
            activityInterval = setInterval(() => {
                if (!bot || !bot.entity) { // Если бота нет или он умер/кикнут, останавливаем цикл
                    clearInterval(activityInterval);
                    activityInterval = null;
                    return;
                }

                const time = bot.time.timeOfDay;
                const isNight = time >= 12541 && time <= 23458; // Minecraft время ночи

                if (isNight) {
                    // Ночь: ищем кровать и ложимся спать
                    bot.setControlState('jump', false); // Выключаем прыжки, если они были
                    const bed = bot.findBlock({ matching: (b) => b.name.includes('bed'), maxDistance: 32 });
                    if (bed && !bot.isSleeping) {
                        bot.pathfinder.setGoal(new goals.GoalGetToBlock(bed.position.x, bed.position.y, bed.position.z));
                        bot.once('goal_reached', () => {
                            bot.sleep(bed).catch(err => console.log('Не смог лечь спать:', err.message));
                        });
                    } else if (!bed && !bot.isSleeping) {
                        console.log('Ночь, но кроватей рядом нет. Просто прыгаю.');
                        bot.setControlState('jump', true); // Если кровати нет, все равно прыгаем
                        setTimeout(() => bot.setControlState('jump', false), 500);
                    }
                } else {
                    // День: просыпаемся, если спали, и прыгаем
                    if (bot.isSleeping) {
                        bot.wake().catch(err => console.log('Не смог проснуться:', err.message));
                    }
                    bot.setControlState('jump', true);
                    setTimeout(() => bot.setControlState('jump', false), 500);
                }
            }, 5000); // Проверка каждые 5 секунд
        }, 5000); // Задержка 5 секунд при первом спавне
    });

    // Автоматический перезаход при отключении или кике
    bot.on('end', (reason) => {
        console.log(`Бот отключился по причине: ${reason}. Перезапуск через 15 секунд...`);
        if (bot) bot.end(); // Убедимся, что бот полностью завершен
        setTimeout(createBot, 15000);
    });

    bot.on('kicked', (reason) => {
        console.log(`Бот был кикнут: ${reason}. Перезапуск через 30 секунд...`);
        if (bot) bot.end();
        setTimeout(createBot, 30000);
    });

    bot.on('error', (err) => console.error('Ошибка бота:', err));
}

// Запускаем бота первый раз
createBot();
