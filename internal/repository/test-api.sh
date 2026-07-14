#!/bin/bash

# Скрипт для тестирования API KidMoney.
#
# Перед запуском убедитесь, что у вас установлен 'jq' для парсинга JSON.
# macOS: brew install jq
# Debian/Ubuntu: sudo apt-get install jq
#
# Также убедитесь, что Go-сервер запущен:
# cd backend
# go run main.go

BASE_URL="http://localhost:8080/api"

# Используем уникальные имена пользователей для каждого запуска, чтобы избежать конфликтов
PARENT_USERNAME="parent_$(date +%s)"
CHILD_USERNAME="child_$(date +%s)"

echo "---"
echo "### 1. Регистрация родителя ($PARENT_USERNAME)"
curl -s -X POST "$BASE_URL/register" \
-H "Content-Type: application/json" \
-d '{
  "username": "'$PARENT_USERNAME'",
  "password": "password123",
  "role": "parent"
}' | jq .
sleep 1

echo "---"
echo "### 2. Регистрация ребёнка ($CHILD_USERNAME)"
curl -s -X POST "$BASE_URL/register" \
-H "Content-Type: application/json" \
-d '{
  "username": "'$CHILD_USERNAME'",
  "password": "password456",
  "role": "child"
}' | jq .
sleep 1

echo "---"
echo "### 3. Вход родителя и сохранение токена"
PARENT_LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/login" \
-H "Content-Type: application/json" \
-d '{
  "username": "'$PARENT_USERNAME'",
  "password": "password123"
}')
PARENT_TOKEN=$(echo $PARENT_LOGIN_RESPONSE | jq -r .token)
echo "Токен родителя получен."
sleep 1

echo "---"
echo "### 4. Вход ребёнка и сохранение токена"
CHILD_LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/login" \
-H "Content-Type: application/json" \
-d '{
  "username": "'$CHILD_USERNAME'",
  "password": "password456"
}')
CHILD_TOKEN=$(echo $CHILD_LOGIN_RESPONSE | jq -r .token)
CHILD_ID=$(echo $CHILD_LOGIN_RESPONSE | jq -r .user_id)
echo "Токен и ID ребёнка ($CHILD_ID) получены."
sleep 1

echo "---"
echo "### 5. Создать задание 'Заправить постель' (50)"
curl -s -X POST "$BASE_URL/tasks" \
-H "Authorization: Bearer $PARENT_TOKEN" \
-H "Content-Type: application/json" \
-d '{"title": "Заправить постель", "description": "Каждое утро", "amount": 50, "type": "regular"}' | jq .
sleep 1

echo "---"
echo "### 6. Создать задание 'Убрать после еды' (30)"
curl -s -X POST "$BASE_URL/tasks" \
-H "Authorization: Bearer $PARENT_TOKEN" \
-H "Content-Type: application/json" \
-d '{"title": "Убрать после еды", "description": "Помыть за собой тарелку", "amount": 30, "type": "regular"}' | jq .
sleep 1

echo "---"
echo "### 7. Получить список заданий"
curl -s -X GET "$BASE_URL/tasks" -H "Authorization: Bearer $CHILD_TOKEN" | jq .
sleep 1

echo "---"
echo "### 8. Ребёнок выполняет задание (ID 1)"
curl -s -X POST "$BASE_URL/tasks/complete/1" -H "Authorization: Bearer $CHILD_TOKEN" | jq .
sleep 1

echo "---"
echo "### 9. Проверить баланс ребёнка (ID $CHILD_ID)"
curl -s -X GET "$BASE_URL/balance?user_id=$CHILD_ID" -H "Authorization: Bearer $PARENT_TOKEN" | jq .
sleep 1

echo "---"
echo "### 10. Получить историю транзакций ребёнка (ID $CHILD_ID)"
curl -s -X GET "$BASE_URL/transactions?user_id=$CHILD_ID" -H "Authorization: Bearer $PARENT_TOKEN" | jq .
sleep 1

echo "---"
echo "### 11. Ребёнок делает покупку 'Мороженое' (25)"
curl -s -X POST "$BASE_URL/purchase" \
-H "Authorization: Bearer $CHILD_TOKEN" \
-H "Content-Type: application/json" \
-d '{"amount": 25, "description": "Покупка: Мороженое"}' | jq .
sleep 1

echo "---"
echo "### 12. Родитель делает удержание 'Разбил чашку' (100)"
curl -s -X POST "$BASE_URL/deduction" \
-H "Authorization: Bearer $PARENT_TOKEN" \
-H "Content-Type: application/json" \
-d '{"user_id": '$CHILD_ID', "amount": 100, "description": "Удержание: разбил чашку"}' | jq .
sleep 1

echo "---"
echo "### 13. Попытка начислить бонус недели"
curl -s -X POST "$BASE_URL/weekly-bonus" -H "Authorization: Bearer $PARENT_TOKEN" | jq .

echo "---"
echo "Тестирование завершено."