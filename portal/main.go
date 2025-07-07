package main

import (
	"context"
	"database/sql"
	"fmt"
	"log"
	"os"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"layeh.com/radius"
	"layeh.com/radius/rfc2865"

	_ "github.com/go-sql-driver/mysql"
)

func main() {
	app := fiber.New()

	// Habilitar CORS para permitir peticiones desde el frontend
	app.Use(cors.New(cors.Config{
		AllowOrigins: "*",
		AllowMethods: "GET,POST,OPTIONS",
		AllowHeaders: "*",
	}))

	app.Post("/login_auth", loginPostHandler)

	log.Fatal(app.Listen(":8080"))
}

func loginPostHandler(c *fiber.Ctx) error {
	username := c.FormValue("username")
	password := c.FormValue("password")

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
	var tiempo sql.NullInt64
	tiempoDisponible := int64(0)
	dsn := fmt.Sprintf("%s:%s@tcp(%s:3306)/%s", dbUser, dbPass, dbHost, dbName)
	// Depuración: imprimir username y DSN
	fmt.Printf("[DEBUG] Username recibido: '%s'\n", username)
	fmt.Printf("[DEBUG] DSN: %s\n", dsn)
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
				tiempoDisponible = tiempo.Int64
			}
		}
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"success": true,
		"user":    username,
		"tiempo":  tiempoDisponible,
	})
}
