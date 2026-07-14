package model

import "time"

// User представляет пользователя системы (ребенка или родителя).
type User struct {
	ID        int64     `json:"id"`
	Username  string    `json:"username"`
	Password  string    `json:"-"`
	Role      string    `json:"role"` // "parent" или "child"
	Balance   float64   `json:"balance"`
	CreatedAt time.Time `json:"created_at"`
}

// Task представляет задачу, которую может выполнить ребенок за вознаграждение.
type Task struct {
	ID          int64     `json:"id"`
	Title       string    `json:"title"`
	Description string    `json:"description"`
	Amount      float64   `json:"amount"`
	Type        string    `json:"type"` // "regular", "bonus"
	IsActive    bool      `json:"is_active"`
	CreatedAt   time.Time `json:"created_at"`
}

// Transaction представляет финансовую операцию (начисление или списание).
type Transaction struct {
	ID          int64     `json:"id"`
	UserID      int64     `json:"user_id"`
	Amount      float64   `json:"amount"`
	Description string    `json:"description"`
	Type        string    `json:"type"` // "income", "expense"
	CreatedAt   time.Time `json:"created_at"`
}

// Settings представляет глобальные настройки приложения.
type Settings struct {
	ID                int64   `json:"id"`
	WeeklyBonusAmount float64 `json:"weekly_bonus_amount"`
	DeductionRules    string  `json:"deduction_rules"`
}
