package main

import (
	"fmt"
	"html/template"
	"log"
	"net/http"
	"os"
)

type WelcomeData struct {
	Username string
	TiempoPermitido int
}

func main() {
	http.HandleFunc("/", loginHandler)
	http.HandleFunc("/bienvenida", bienvenidaHandler)
	fs := http.FileServer(http.Dir("./static"))
	http.Handle("/static/", http.StripPrefix("/static/", fs))
	fmt.Println("Portal escuchando en :8080")
	log.Fatal(http.ListenAndServe(":8080", nil))
}

func loginHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method == http.MethodGet {
		tmpl, _ := template.ParseFiles("static/login.html")
		tmpl.Execute(w, nil)
		return
	}
	// Aquí se validaría contra FreeRadius (pendiente de implementar)
	username := r.FormValue("username")
	password := r.FormValue("password")
	// Simulación de validación exitosa
	if username == "demo" && password == "demo123" {
		http.Redirect(w, r, "/bienvenida?user=demo&tiempo=2", http.StatusSeeOther)
		return
	}
	http.Redirect(w, r, "/?error=1", http.StatusSeeOther)
}

func bienvenidaHandler(w http.ResponseWriter, r *http.Request) {
	user := r.URL.Query().Get("user")
	tiempo := r.URL.Query().Get("tiempo")
	data := WelcomeData{Username: user, TiempoPermitido: 2}
	if t, ok := os.LookupEnv("TIEMPO_PERMITIDO"); ok {
		fmt.Sscanf(t, "%d", &data.TiempoPermitido)
	}
	tmpl, _ := template.ParseFiles("static/bienvenida.html")
	tmpl.Execute(w, data)
}
