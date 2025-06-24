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
	//app.Static("/static", "./static")

	// Configura la carpeta de vistas para que Fiber busque correctamente los archivos
	engine.Reload(true) // Habilita recarga en desarrollo
	engine.AddFunc("asset", func(name string) string { return "/static/" + name })

	fmt.Println("Portal escuchando en :8080")
	log.Fatal(app.Listen(":8080"))
}

func loginGetHandler(c *fiber.Ctx) error {
	errorMsg := ""
	if c.Query("error") == "1" {
		errorMsg = "Usuario o contraseña incorrectos. Intenta de nuevo."
	}
	return c.Render("login", fiber.Map{"Error": errorMsg})
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
		return c.Status(500).SendString("Error interno: " + err.Error())
	}
	if resp.Code != radius.CodeAccessAccept {
		fmt.Printf("[RADIUS DENY] Usuario: %s, Código: %v\n", username, resp.Code)
		return c.Redirect("/?error=1")
	}

	return c.Redirect("/bienvenida?user=" + username + "&tiempo=2")
}

func bienvenidaHandler(c *fiber.Ctx) error {
	user := c.Query("user")
	tiempo := c.Query("tiempo")
	data := fiber.Map{"Username": user, "TiempoPermitido": tiempo}
	return c.Render("bienvenida", data)
}
