package repository

import (
	"database/sql"
	"log"

	_ "github.com/mattn/go-sqlite3"
)

var DB *sql.DB

// InitDB инициализирует соединение с базой данных и создает таблицы.
func InitDB(dataSourceName string) {
	var err error
	DB, err = sql.Open("sqlite3", dataSourceName)
	if err != nil {
		log.Fatalf("Ошибка при подключении к базе данных: %v", err)
	}

	if err = DB.Ping(); err != nil {
		log.Fatalf("Ошибка при проверке соединения с базой данных: %v", err)
	}

	log.Println("База данных успешно подключена.")
	createTables()
}

// createTables создает таблицы в базе данных, если они не существуют.
func createTables() {
	createUserTable := `
	CREATE TABLE IF NOT EXISTS users (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		username TEXT NOT NULL UNIQUE,
		password TEXT NOT NULL,
		role TEXT NOT NULL,
		balance REAL NOT NULL DEFAULT 0.0,
		created_at DATETIME NOT NULL
	);`

	createTaskTable := `
	CREATE TABLE IF NOT EXISTS tasks (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		title TEXT NOT NULL,
		description TEXT,
		amount REAL NOT NULL,
		type TEXT NOT NULL,
		is_active BOOLEAN NOT NULL DEFAULT TRUE,
		created_at DATETIME NOT NULL
	);`

	createTransactionTable := `
	CREATE TABLE IF NOT EXISTS transactions (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		user_id INTEGER NOT NULL,
		amount REAL NOT NULL,
		description TEXT,
		type TEXT NOT NULL,
		created_at DATETIME NOT NULL,
		FOREIGN KEY(user_id) REFERENCES users(id)
	);`

	tables := []string{createUserTable, createTaskTable, createTransactionTable}
	for _, table := range tables {
		if _, err := DB.Exec(table); err != nil {
			log.Fatalf("Ошибка при создании таблицы: %v", err)
		}
	}
	log.Println("Таблицы успешно созданы или уже существуют.")
}
