# HTML5 & CSS Requirements Checklist

## ✅ Global Requirements

### 1) HTML5 Structure
- ✅ **<!DOCTYPE html>** - Line 1 of index.html
- ✅ **Semantic sections:**
  - `<header>` - Not used (menu in nav instead)
  - `<nav>` - Line 28 (navigation menu)
  - `<main>` - Line 40 (main content wrapper)
  - `<section>` - Lines 220, 227, 270+ (about-us, canvas, location sections)
  - `<footer>` - Line 289 (copyright footer)
- ✅ **Meaningful alt text** - Line 106: "Science Fair Banner showing students presenting their innovative projects"
- ✅ **<figure><figcaption>** - Lines 105-108 (banner image with caption)

### 2) Forms (HTML5 inputs)
✅ **Form with HTML5 inputs** - Lines 175-189
- `<input type="email">` - Project Creator Email (Line 178)
- `<input type="url">` - Project Demo URL (Line 181)
- `<input type="date">` - Submission Date (Line 184)
- `<input type="color">` - Project Color (Line 187)
- `<button type="submit">` - Submit button (Line 189)

### 3) Media — Mandatory

#### Video (15–45s introduction)
✅ **Self-recorded video with controls** - Lines 125-131
- `<video controls>` with poster attribute
- Two sources: `.mp4` (Line 126) and `.webm` (Line 127)
- Poster image: `poster="assets/imgs/webtech-poster.jpg"`
- `<track kind="captions">` for accessibility (Line 128)
- Fallback text: "Your browser does not support the video tag"
- ❌ **No autoplay** (correctly omitted)

#### Audio (10–30s voice-over)
✅ **Audio clip with controls** - Lines 111-116
- `<audio controls>` element
- Two sources: `.mp3` (Line 112) and `.ogg` (Line 113)
- `<track kind="captions">` in .vtt format (Line 114)
- Text summary: Line 117 - "Welcome message introducing the Science Fair..."

### 4) Optional HTML5 APIs

#### Canvas
✅ **Canvas element** - Lines 221-223
- Canvas with fallback text
- JavaScript drawing (Lines 234-245):
  - Filled rectangle with gradient color (#667eea)
  - Text overlay: "Science Fair 2025"

#### Geolocation
✅ **Geolocation API** - Lines 227-230, 248-267
- Button to trigger geolocation
- Displays latitude/longitude text on page
- Error handling included

---

## ✅ CSS Requirements

### 5) CSS — Association & Core Techniques

#### Three Association Methods:
1. ✅ **External CSS** - Line 7: `<link rel="stylesheet" href="css/style.css">`
2. ✅ **Embedded <style> block** - Lines 9-24: Canvas and audio styling
3. ✅ **Inline style** - Line 107: `style="color: #667eea; font-weight: 600; margin-top: 10px; text-align: center;"`

#### Selectors (in style.css):
- ✅ **Universal selector (*)** - Lines 2-6: Reset styles
- ✅ **Type selectors** - body (Line 9), img (Line 459), a (Line 467)
- ✅ **Class selectors** - .menu, .header-section, .video-item, etc.
- ✅ **ID selector** - #about-us (Line 338), #demo (Line 427), #myCanvas (embedded)
- ✅ **Descendant selector** - `.dropdown-content a` (Line 67)
- ✅ **Child selector** - `nav > ul > li` (Line 479)
- ✅ **Grouped selector** - `h1, h2, h3` (Line 82), `a:hover, a:focus` (Line 473)

#### Backgrounds:
- ✅ **background-color** - Line 12: `background-color: #667eea;`
- ✅ **background-image** - Line 11: `background-image: url('https://www.transparenttextures.com/patterns/asfalt-light.png');`
- ✅ **background properties:**
  - `background-attachment: fixed;` (Line 13)
  - `background-repeat: repeat;` (Line 14)
  - `background-position: center;` (Line 15)

#### Typography:
- ✅ **Font stack** - Line 10: `'Segoe UI', Tahoma, Geneva, Verdana, sans-serif`
- ✅ **font-size** - Line 10: `16px`
- ✅ **line-height** - Line 10: `1.6`
- ✅ **Font shorthand** - Line 10: `font: 400 16px/1.6 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;`
  - Format: font-weight font-size/line-height font-family

#### Text Properties (at least two):
- ✅ **letter-spacing** - Line 17: `letter-spacing: 0.3px;`
- ✅ **word-spacing** - Line 18: `word-spacing: 2px;`
- ✅ **text-align** - Multiple uses (e.g., Line 98: `text-align: center;`)
- ✅ **text-transform** - Line 196: `text-transform: uppercase;`

#### Box Model:
- ✅ **Margin** - Line 90: `margin: 20px auto 40px;` (shorthand: top right/left bottom)
- ✅ **Padding** - Line 91: `padding: 40px 20px;` (shorthand: vertical horizontal)
- ✅ **Border** - Line 462: `border: 3px solid #e9ecef;` (shorthand)
- ✅ **Multiple components with box model:**
  - main element (Lines 88-95)
  - form element (Lines 286-310)
  - .video-item (Lines 233-244)

#### Images & Links:
- ✅ **Image styling** - Lines 459-464:
  - `border: 3px solid #e9ecef;`
  - `border-radius: 8px;`
  - `max-width: 100%;`
  - `height: auto;`
- ✅ **Link states** - Lines 467-476:
  - Default: `color: #667eea;`
  - `:hover` state: `color: #764ba2; text-decoration: underline;`
  - `:focus` state: Same as hover

---

## 📋 Summary

**All requirements have been successfully implemented:**
- ✅ HTML5 semantic structure with proper DOCTYPE
- ✅ Form with 4 HTML5 input types (email, url, date, color)
- ✅ Video with controls, 2 sources, poster, captions, no autoplay
- ✅ Audio with controls, 2 sources, captions, text summary
- ✅ Canvas API with visual drawing
- ✅ Geolocation API displaying coordinates
- ✅ Three CSS association methods (external, embedded, inline)
- ✅ All required CSS selectors (universal, type, class, id, descendant, child, grouped)
- ✅ Background color and image with properties
- ✅ Proper font stack and font shorthand
- ✅ Multiple text properties (letter-spacing, word-spacing, text-align, text-transform)
- ✅ Box model demonstrated with shorthand notation
- ✅ Image and link styling with hover/focus states

**The code is professional, accessible, and meets all specified requirements.**
