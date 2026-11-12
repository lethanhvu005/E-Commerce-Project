try {
  document.documentElement.dataset.theme =
    localStorage.getItem("nexa-cobalt-theme") || "dark";
} catch (e) {
  document.documentElement.dataset.theme = "dark";
}
