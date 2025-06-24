package main

import (
	"context"
	"fmt"
	"log"
	"os"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/template/html/v2"
	"layeh.com/radius"
	"layeh.com/radius/rfc2865"
)

type WelcomeData struct {
	Username        string
	TiempoPermitido int
}

func main() {
	engine := html.New("./static", ".html")
	app := fiber.New(fiber.Config{
		Views: engine,
	})

	app.Get("/", loginGetHandler)
	app.Post("/", loginPostHandler)
	app.Get("/bienvenida", bienvenidaHandler)
	app.Static("/static", "./static")

	fmt.Println("Portal escuchando en :8080")
	log.Fatal(app.Listen(":8080"))
}

func loginGetHandler(c *fiber.Ctx) error {
	errorMsg := ""
	if c.Query("error") == "1" {
		errorMsg = "Usuario o contraseña incorrectos. Intenta de nuevo."
	}
	return c.Render("static/login.html", fiber.Map{"Error": errorMsg})
}

func loginPostHandler(c *fiber.Ctx) error {
	username := c.FormValue("username")
	password := c.FormValue("password")

	radiusHost := os.Getenv("RADIUS_HOST")
	if radiusHost == "" {
		radiusHost = "localhost:1812"
	}
	secret := os.Getenv("RADIUS_SECRET")
	if secret == "" {
		secret = "testing123"
	}

	packet := radius.New(radius.CodeAccessRequest, []byte(secret))
	rfc2865.UserName_SetString(packet, username)
	rfc2865.UserPassword_SetString(packet, password)

	ctx := context.Background()
	resp, err := radius.Exchange(ctx, packet, radiusHost)
	if err != nil || resp.Code != radius.CodeAccessAccept {
		return c.Redirect("/?error=1")
	}

	return c.Redirect("/bienvenida?user=" + username + "&tiempo=2")
}

func bienvenidaHandler(c *fiber.Ctx) error {
	user := c.Query("user")
	tiempo := c.Query("tiempo")
	data := fiber.Map{"Username": user, "TiempoPermitido": tiempo}
	return c.Render("static/bienvenida.html", data)
}
