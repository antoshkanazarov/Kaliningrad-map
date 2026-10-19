# Kaliningrad-map
An interactive, mobile-friendly map of 10 must-visit places in Kaliningrad and the surrounding region, with search, filters, and links to maps.

## Локальный запуск

Зависимости и сборка не нужны. Из корня репозитория:

```sh
python3 -m http.server 8000 --bind 127.0.0.1
```

Страница находится в `index.html`, фотографии — в `assets/images`, стили — в
`assets/css`, скрипты — в `assets/js`. При публикации загружайте весь репозиторий,
включая `assets`; относительные пути подходят для GitHub Pages.

Leaflet хранится локально; подложка Esri требует подключения к интернету.
Фотографии карточек загружаются отложенно. Клавиша `/` переводит фокус в поиск,
`Escape` очищает запрос. Поиск учитывает название, описание и адрес; слова запроса
могут идти в любом порядке. Маршрут и посещённые места сохраняются в браузере.
