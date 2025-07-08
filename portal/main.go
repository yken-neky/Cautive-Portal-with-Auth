package main

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"os"
	"sync"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/websocket/v2"
	"layeh.com/radius"
	"layeh.com/radius/rfc2865"

	_ "github.com/go-sql-driver/mysql"
)

var wsConnections = make(map[string]*websocket.Conn)
var wsConnectionsMutex = &sync.Mutex{}

func main() {
	app := fiber.New()

	// Habilitar CORS para permitir peticiones desde el frontend
	app.Use(cors.New(cors.Config{
		AllowOrigins: "*",
		AllowMethods: "GET,POST,OPTIONS",
		AllowHeaders: "*",
	}))

	app.Post("/login_auth", loginPostHandler)

	// WebSocket endpoint para actualizar tiempo (dinámico por usuario)
	app.Use("/ws/update_time", func(c *fiber.Ctx) error {
		if websocket.IsWebSocketUpgrade(c) {
			return c.Next()
		}
		return fiber.ErrUpgradeRequired
	})
	app.Get("/ws/update_time", websocket.New(updateTimeWSHandler))
	app.Get("/ws/update_time/:username", websocket.New(updateTimeWSHandler))

	// Endpoint correcto para logout (ya existe)
	app.Get("/logout", logoutHandler)

	// Nuevo endpoint para obtener el tiempo real restante desde la base de datos
	app.Get("/get_tiempo_restante", getTiempoRestanteHandler)
	// Endpoint REST para obtener el tiempo real por username en la ruta
	app.Get("/get_tiempo_restante/:username", getTiempoRestanteHandler)

	log.Fatal(app.Listen(":8080"))
}

func loginPostHandler(c *fiber.Ctx) error {
	username := c.FormValue("username")
	password := c.FormValue("password")

	// Verificar si el usuario ya tiene una sesión activa y si no ha expirado
	dbUser := os.Getenv("MYSQL_USER")
	dbPass := os.Getenv("MYSQL_PASSWORD")
	dbHost := os.Getenv("MYSQL_HOST")
	if dbHost == "" {
		dbHost = "mysql"
	}
	dbName := os.Getenv("MYSQL_DATABASE")
	if dbName == "" {
		dbName = "dulceria_macam"
	}
	dsn := fmt.Sprintf("%s:%s@tcp(%s:3306)/%s", dbUser, dbPass, dbHost, dbName)
	if dbUser != "" && dbPass != "" {
		db, err := sql.Open("mysql", dsn)
		if err == nil {
			defer db.Close()
			var isActive bool
			var expiracion sql.NullString
			err = db.QueryRow("SELECT isactive, expiracion FROM usuarios WHERE TRIM(username) = TRIM(?)", username).Scan(&isActive, &expiracion)
			if err == nil {
				if isActive {
					return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
						"success": false,
						"error":   "Ya existe una sesión activa para este usuario.",
					})
				}
				if expiracion.Valid {
					exp, err := time.Parse("2006-01-02 15:04:05", expiracion.String)
					if err == nil && time.Now().After(exp) {
						return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
							"success": false,
							"error":   "La cuenta ha expirado. Contacte al administrador.",
						})
					}
				}
			}
		}
	}

	radiusHost := os.Getenv("RADIUS_HOST")
	if radiusHost == "" {
		radiusHost = "freeradius"
	}
	radiusPort := os.Getenv("RADIUS_PORT")
	if radiusPort == "" {
		radiusPort = "1812"
	}
	address := fmt.Sprintf("%s:%s", radiusHost, radiusPort)
	secret := os.Getenv("RADIUS_SECRET")
	if secret == "" {
		secret = "testing123"
	}

	packet := radius.New(radius.CodeAccessRequest, []byte(secret))
	rfc2865.UserName_SetString(packet, username)
	rfc2865.UserPassword_SetString(packet, password)

	ctx := context.Background()
	resp, err := radius.Exchange(ctx, packet, address)
	if err != nil {
		fmt.Printf("[RADIUS ERROR] %v\n", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"error":   "Error interno: " + err.Error(),
		})
	}
	if resp.Code != radius.CodeAccessAccept {
		fmt.Printf("[RADIUS DENY] Usuario: %s, Código: %v\n", username, resp.Code)
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"success": false,
			"error":   "Usuario o contraseña incorrectos",
		})
	}

	// Consultar el tiempo_permitido del usuario en la base de datos
	// Ahora el tiempo está en segundos
	var tiempo sql.NullInt64
	tiempoDisponible := int64(0)
	if dbUser != "" && dbPass != "" {
		db, err := sql.Open("mysql", dsn)
		if err == nil {
			defer db.Close()
			// Usar TRIM en la consulta para evitar problemas de espacios
			err = db.QueryRow("SELECT tiempo_permitido FROM usuarios WHERE TRIM(username) = TRIM(?)", username).Scan(&tiempo)
			if err != nil {
				fmt.Printf("[DB ERROR] Usuario: %s, Error: %v\n", username, err)
				return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
					"success": false,
					"error":   "Error al consultar la base de datos: " + err.Error(),
				})
			}
			if tiempo.Valid {
				tiempoDisponible = tiempo.Int64 // ya está en segundos
			}
		}
	}

	// Después de autenticar y antes de responder OK, marcar isactive=1
	if dbUser != "" && dbPass != "" {
		db, err := sql.Open("mysql", dsn)
		if err == nil {
			defer db.Close()
			_, _ = db.Exec("UPDATE usuarios SET isactive=1 WHERE TRIM(username) = TRIM(?)", username)
		}
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"success": true,
		"user":    username,
		"tiempo":  tiempoDisponible,
	})
}

// Handler WebSocket para actualizar tiempo restante
func updateTimeWSHandler(c *websocket.Conn) {
	type TiempoMsg struct {
		Username string `json:"username"`
		Tiempo   int    `json:"tiempo"`
	}
	timeout := 10 * time.Second
	for {
		c.SetReadDeadline(time.Now().Add(timeout))
		_, msg, err := c.ReadMessage()
		if err != nil {
			// Solo loguear si es un error inesperado, no si es cierre normal
			if !websocket.IsCloseError(err, websocket.CloseNormalClosure, websocket.CloseGoingAway) {
				fmt.Printf("[WS ERROR] Error leyendo JSON o timeout: %v\n", err)
			}
			break
		}
		var data TiempoMsg
		if err := json.Unmarshal(msg, &data); err != nil {
			fmt.Printf("[WS ERROR] JSON inválido: %v\n", err)
			continue
		}
		fmt.Printf("[WS] Recibido: username=%s, tiempo=%d\n", data.Username, data.Tiempo)
		// Actualizar tiempo en la base de datos
		dbUser := os.Getenv("MYSQL_USER")
		dbPass := os.Getenv("MYSQL_PASSWORD")
		dbHost := os.Getenv("MYSQL_HOST")
		if dbHost == "" {
			dbHost = "mysql"
		}
		dbName := os.Getenv("MYSQL_DATABASE")
		if dbName == "" {
			dbName = "dulceria_macam"
		}
		dsn := fmt.Sprintf("%s:%s@tcp(%s:3306)/%s", dbUser, dbPass, dbHost, dbName)
		if dbUser != "" && dbPass != "" {
			db, err := sql.Open("mysql", dsn)
			if err == nil {
				defer db.Close()
				_, err = db.Exec("UPDATE usuarios SET tiempo_permitido = ? WHERE TRIM(username) = TRIM(?)", data.Tiempo, data.Username)
				if err != nil {
					fmt.Printf("[WS DB ERROR] Usuario: %s, Error: %v\n", data.Username, err)
					continue
				}
			}
		}
	}
}

// Handler para cerrar sesión y desconectar WebSocket
func logoutHandler(c *fiber.Ctx) error {
	username := c.Query("username")
	if username == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"success": false, "error": "Username requerido"})
	}
	wsConnectionsMutex.Lock()
	if conn, ok := wsConnections[username]; ok {
		conn.WriteMessage(websocket.CloseMessage, websocket.FormatCloseMessage(websocket.CloseNormalClosure, "Logout solicitado"))
		conn.Close()
		delete(wsConnections, username)
	}
	wsConnectionsMutex.Unlock()
	// Marcar isactive=0 al hacer logout
	dbUser := os.Getenv("MYSQL_USER")
	dbPass := os.Getenv("MYSQL_PASSWORD")
	dbHost := os.Getenv("MYSQL_HOST")
	if dbHost == "" {
		dbHost = "mysql"
	}
	dbName := os.Getenv("MYSQL_DATABASE")
	if dbName == "" {
		dbName = "dulceria_macam"
	}
	dsn := fmt.Sprintf("%s:%s@tcp(%s:3306)/%s", dbUser, dbPass, dbHost, dbName)
	if dbUser != "" && dbPass != "" {
		db, err := sql.Open("mysql", dsn)
		if err == nil {
			defer db.Close()
			_, _ = db.Exec("UPDATE usuarios SET isactive=0 WHERE TRIM(username) = TRIM(?)", username)
		}
	}
	return c.Status(fiber.StatusOK).JSON(fiber.Map{"success": true, "message": "Desconectado con éxito"})
}

// Nuevo endpoint para obtener el tiempo real restante desde la base de datos (por username en la ruta)
func getTiempoRestanteHandler(c *fiber.Ctx) error {
	username := c.Params("username")
	if username == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"success": false, "error": "Username requerido"})
	}
	dbUser := os.Getenv("MYSQL_USER")
	dbPass := os.Getenv("MYSQL_PASSWORD")
	dbHost := os.Getenv("MYSQL_HOST")
	if dbHost == "" {
		dbHost = "mysql"
	}
	dbName := os.Getenv("MYSQL_DATABASE")
	if dbName == "" {
		dbName = "dulceria_macam"
	}
	dsn := fmt.Sprintf("%s:%s@tcp(%s:3306)/%s", dbUser, dbPass, dbHost, dbName)
	var tiempo sql.NullInt64
	tiempoDisponible := int64(0)
	if dbUser != "" && dbPass != "" {
		db, err := sql.Open("mysql", dsn)
		if err == nil {
			defer db.Close()
			err = db.QueryRow("SELECT tiempo_permitido FROM usuarios WHERE TRIM(username) = TRIM(?)", username).Scan(&tiempo)
			if err == nil && tiempo.Valid {
				tiempoDisponible = tiempo.Int64
			}
		}
	}
	return c.Status(fiber.StatusOK).JSON(fiber.Map{"success": true, "user": username, "tiempo": tiempoDisponible})
}
