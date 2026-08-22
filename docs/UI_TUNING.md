# UI tuning tools

## Dialog speaker name tuner

Open `tools/dialog-name-tuner.html` from the deployed site to visually adjust the field-dialog speaker-name badge.

The tool outputs JSON with this fixed format identifier:

```json
{
  "format": "spell-operator/dialog-name-style@1",
  "target": ".dialog-name",
  "coordinateOrigin": "field-dialog-top-left",
  "desktop": {
    "left": 167,
    "top": 12,
    "width": "auto",
    "height": "auto",
    "minWidth": 92,
    "fontSize": 16,
    "fontWeight": 900,
    "lineHeight": 1.25,
    "paddingX": 40,
    "paddingY": 3,
    "backgroundColor": "#ffe8a3",
    "backgroundOpacity": 100,
    "textColor": "#202128",
    "borderWidth": 0,
    "borderColor": "#555d6a",
    "borderRadius": 30
  }
}
```

The JSON above is the current applied desktop speaker-name style as confirmed on 2026-08-22.

When the user pastes a payload whose `format` is `spell-operator/dialog-name-style@1`, treat it as an explicit request to apply those values to the desktop `.dialog-name` styling in `css/dialog-portrait-layout-v3.css`.

- Numeric dimensions are CSS pixels unless noted otherwise.
- `width` / `height` may be `"auto"`.
- `backgroundOpacity` is a percentage from `0` through `100`.
- `left` / `top` use the field dialogue window's top-left as the coordinate origin.
- Preserve mobile overrides unless the user separately supplies mobile values.
