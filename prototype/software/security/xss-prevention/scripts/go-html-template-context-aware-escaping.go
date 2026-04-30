package main

import (
    "html/template"  // NOT text/template -- html/template auto-escapes
    "net/http"
)

// html/template provides context-aware auto-escaping:
// - HTML body: encodes < > & " '
// - href/src attributes: validates URL scheme
// - <script> blocks: JS-escapes values
// - CSS contexts: CSS-escapes values

var tmpl = template.Must(template.New("page").Parse(`
<!DOCTYPE html>
<html>
<body>
  <h1>Hello, {{.Name}}</h1>           <!-- HTML-escaped -->
  <a href="{{.URL}}">Profile</a>       <!-- URL validated -->
  <script>var user = {{.JSONData}};</script> <!-- JS-escaped -->
</body>
</html>
`))

func handler(w http.ResponseWriter, r *http.Request) {
    data := struct {
        Name     string
        URL      string
        JSONData string
    }{
        Name:     r.URL.Query().Get("name"),
        URL:      "/users/" + r.URL.Query().Get("id"),
        JSONData: `"` + template.JSEscapeString(r.URL.Query().Get("name")) + `"`,
    }
    tmpl.Execute(w, data)
}
